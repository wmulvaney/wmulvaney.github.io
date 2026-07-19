/* ============================================================
   SLEEPER sync worker — Cloudflare Worker
   Bridges a real sleep tracker (Oura or Whoop) to the SLEEPER
   app so nights flow in with zero manual input.

   Endpoints:
     GET  /auth/oura      → start Oura OAuth (redirects)
     GET  /auth/whoop     → start Whoop OAuth (redirects)
     GET  /auth/callback  → OAuth redirect target (stores tokens in KV)
     GET  /nights?since=YYYY-MM-DD
           Authorization: Bearer <APP_TOKEN>
           → { nights: [{ date, hours, efficiency, deep, rem, score, restingHR }] }

   Setup: see README.md next to this file.
   ============================================================ */

const PROVIDERS = {
  oura: {
    authUrl: 'https://cloud.ouraring.com/oauth/authorize',
    tokenUrl: 'https://api.ouraring.com/oauth/token',
    scope: 'daily sleep',
  },
  whoop: {
    authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
    scope: 'read:sleep offline',
  },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      if (url.pathname === '/auth/oura' || url.pathname === '/auth/whoop') {
        return startAuth(url.pathname.split('/')[2], url, env);
      }
      if (url.pathname === '/auth/callback') {
        return await finishAuth(url, env);
      }
      if (url.pathname === '/nights') {
        return await nights(request, url, env);
      }
      if (url.pathname === '/save') {
        requireAppToken(request, env);
        if (request.method === 'PUT') {
          const body = await request.text();
          if (body.length > 400_000) return json({ error: 'save too large' }, 413);
          await env.TOKENS.put('save', body);
          return json({ ok: true });
        }
        const raw = await env.TOKENS.get('save');
        return new Response(raw || 'null', { headers: { 'content-type': 'application/json', ...cors } });
      }
      return json({ ok: true, service: 'sleeper-sync', endpoints: ['/auth/oura', '/auth/whoop', '/nights', '/save'] });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...cors },
  });
}

function requireAppToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${env.APP_TOKEN}`) throw new Error('bad token');
}

function startAuth(provider, url, env) {
  const p = PROVIDERS[provider];
  const clientId = provider === 'oura' ? env.OURA_CLIENT_ID : env.WHOOP_CLIENT_ID;
  const redirect = `${url.origin}/auth/callback`;
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirect,
    scope: p.scope,
    state: provider,
  });
  return Response.redirect(`${p.authUrl}?${q}`, 302);
}

async function finishAuth(url, env) {
  const provider = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const p = PROVIDERS[provider];
  if (!p || !code) throw new Error('bad callback');
  const clientId = provider === 'oura' ? env.OURA_CLIENT_ID : env.WHOOP_CLIENT_ID;
  const secret = provider === 'oura' ? env.OURA_CLIENT_SECRET : env.WHOOP_CLIENT_SECRET;
  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: secret,
      redirect_uri: `${url.origin}/auth/callback`,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const tokens = await res.json();
  await env.TOKENS.put(provider, JSON.stringify(tokens));
  return new Response('Connected. You can close this tab — SLEEPER will sync automatically.', { headers: cors });
}

async function providerToken(provider, env) {
  const raw = await env.TOKENS.get(provider);
  if (!raw) return null;
  const tokens = JSON.parse(raw);
  // refresh if the provider gave us a refresh token (both do)
  if (tokens.refresh_token) {
    const p = PROVIDERS[provider];
    const clientId = provider === 'oura' ? env.OURA_CLIENT_ID : env.WHOOP_CLIENT_ID;
    const secret = provider === 'oura' ? env.OURA_CLIENT_SECRET : env.WHOOP_CLIENT_SECRET;
    const res = await fetch(p.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
        client_id: clientId,
        client_secret: secret,
      }),
    });
    if (res.ok) {
      const fresh = await res.json();
      if (!fresh.refresh_token) fresh.refresh_token = tokens.refresh_token;
      await env.TOKENS.put(provider, JSON.stringify(fresh));
      return fresh.access_token;
    }
  }
  return tokens.access_token;
}

async function nights(request, url, env) {
  requireAppToken(request, env);
  const since = url.searchParams.get('since') || new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);

  const ouraToken = await providerToken('oura', env);
  if (ouraToken) return json({ nights: await ouraNights(ouraToken, since) });
  const whoopToken = await providerToken('whoop', env);
  if (whoopToken) return json({ nights: await whoopNights(whoopToken, since) });
  return json({ nights: [], note: 'no provider connected — visit /auth/oura or /auth/whoop' });
}

async function ouraNights(token, since) {
  const res = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${since}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`oura ${res.status}`);
  const daily = (await res.json()).data || [];
  const detail = await fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${since}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => (r.ok ? r.json() : { data: [] }));
  const byDay = {};
  for (const d of detail.data || []) byDay[d.day] = d;
  return daily.map((d) => {
    const x = byDay[d.day] || {};
    const total = x.total_sleep_duration || 0;
    return {
      date: d.day,
      score: d.score,
      hours: total ? Math.round(total / 360) / 10 : undefined,
      efficiency: x.efficiency ? x.efficiency / 100 : undefined,
      deep: total && x.deep_sleep_duration ? x.deep_sleep_duration / total : undefined,
      rem: total && x.rem_sleep_duration ? x.rem_sleep_duration / total : undefined,
      restingHR: x.lowest_heart_rate,
    };
  });
}

async function whoopNights(token, since) {
  const res = await fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${since}T00:00:00Z&limit=25`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`whoop ${res.status}`);
  const records = (await res.json()).records || [];
  return records
    .filter((r) => !r.nap)
    .map((r) => {
      const s = r.score || {};
      const stage = s.stage_summary || {};
      const totalMs = (stage.total_light_sleep_time_milli || 0) + (stage.total_slow_wave_sleep_time_milli || 0) + (stage.total_rem_sleep_time_milli || 0);
      return {
        date: (r.end || '').slice(0, 10),
        score: s.sleep_performance_percentage,
        hours: totalMs ? Math.round(totalMs / 360000) / 10 : undefined,
        efficiency: s.sleep_efficiency_percentage ? s.sleep_efficiency_percentage / 100 : undefined,
        deep: totalMs && stage.total_slow_wave_sleep_time_milli ? stage.total_slow_wave_sleep_time_milli / totalMs : undefined,
        rem: totalMs && stage.total_rem_sleep_time_milli ? stage.total_rem_sleep_time_milli / totalMs : undefined,
      };
    });
}
