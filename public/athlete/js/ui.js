/* ============================================================
   SLEEPER — UI layer
   Renders all screens into #app, modals into #modal-root.
   Event delegation via [data-action] attributes.
   ============================================================ */

import {
  ATTRS, PHYS_KEYS, YOUTH_SPORTS, SPORTS, ERA_INFO, ERAS,
  COACHES, FACILITIES, GEAR, SERVICES,
} from './data.js';
import { PROVIDERS, nightFromManual, parseSleepCSV, describeScore } from './sleep.js';
import * as E from './engine.js';
import { sceneArt, vignette } from './scenes.js';

const $app = () => document.getElementById('app');
const $modal = () => document.getElementById('modal-root');
let currentTab = 'home';
let onboarding = { step: 0, name: '', picks: [], provider: 'demo' };

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, tone = '', ico = '✨') {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `<span class="t-ico">${ico}</span><span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
}

function ring(value, max, label, sub, color) {
  const r = 38, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value / max)));
  return `
  <div class="ring-wrap">
    <div class="ring">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle class="ring-track" cx="46" cy="46" r="${r}" fill="none" stroke-width="8"/>
        <circle class="ring-val" cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="8"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
          style="filter: drop-shadow(0 0 6px ${color}66)"/>
      </svg>
      <div class="ring-center"><b>${value}</b><span>${sub}</span></div>
    </div>
    <div class="ring-label">${label}</div>
  </div>`;
}

function energyPips(energy) {
  const max = Math.max(energy, 10);
  let out = '<span class="energy-pips">';
  for (let i = 0; i < Math.min(max, 14); i++) out += `<i class="${i < energy ? 'on' : ''}"></i>`;
  return out + '</span>';
}

function bar(name, val, cap, ico = '') {
  const pct = Math.min(100, (val / 99) * 100);
  const capPct = Math.min(100, (cap / 99) * 100);
  return `
  <div class="bar-row">
    <span class="bar-name">${ico} ${esc(name)}</span>
    <div class="bar">
      <i class="cap" style="width:${capPct}%"></i>
      <i style="width:${pct}%"></i>
    </div>
    <span class="bar-num">${Math.round(val)}</span>
  </div>`;
}

function starsHtml(n) {
  return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

/* ---------------- modal system ---------------- */
let modalQueue = [];
export function showModal(html, opts = {}) {
  $modal().innerHTML = `
    <div class="modal-backdrop" ${opts.dismissable === false ? '' : 'data-action="close-backdrop"'}>
      <div class="modal">${html}</div>
    </div>`;
}
export function closeModal() {
  $modal().innerHTML = '';
  if (modalQueue.length) {
    const next = modalQueue.shift();
    next();
  } else {
    render();
  }
}
function queueModals(fns) {
  modalQueue.push(...fns);
  if ($modal().innerHTML === '') closeModal();
}

/* ---------------- onboarding ---------------- */
function renderOnboarding() {
  document.body.className = 'era-youth';
  const ob = onboarding;
  const steps = [obIntro, obName, obSports, obDevice];
  $app().innerHTML = `<div class="onboard">${steps[ob.step]()}</div>`;
}

function obProgress(n) {
  return `<div class="ob-progress">${[0, 1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</div>`;
}

function obIntro() {
  return `
    ${obProgress(0)}
    <div>
      <p class="ob-kicker">A career in your hands</p>
      <h1>Every legend started as a kid who loved to play.</h1>
      <p class="ob-lede mt-8">SLEEPER is a life-of-an-athlete story game with one twist: <b>your sleep is the engine.</b>
      Every night of real rest becomes energy, training power, and Rest Points. Sleep like a pro, become a pro.</p>
    </div>
    <div class="card">
      <div class="row" style="border:none;background:none;padding:6px 0"><div class="row-ico">🌙</div><div class="row-main"><b>Sleep → Recovery</b><span class="sub">Great nights make every drill worth up to 3× more.</span></div></div>
      <div class="row" style="border:none;background:none;padding:6px 0"><div class="row-ico">🏋️</div><div class="row-main"><b>Train → Specialize</b><span class="sub">Pick sports, then one sport, then a position. Choices change the math.</span></div></div>
      <div class="row" style="border:none;background:none;padding:6px 0"><div class="row-ico">🏆</div><div class="row-main"><b>Compete → Rise</b><span class="sub">Backyard → varsity → college → the draft → a legacy.</span></div></div>
    </div>
    <button class="btn primary block" data-action="ob-next">Begin the story</button>`;
}

function obName() {
  return `
    ${obProgress(1)}
    <div>
      <p class="ob-kicker">Chapter one</p>
      <h1>Age 8. A backyard. A dream.</h1>
      <p class="ob-lede mt-8">What's your athlete's name?</p>
    </div>
    <div class="field">
      <label>Name</label>
      <input id="ob-name" type="text" maxlength="20" placeholder="e.g. Jordan Reyes" value="${esc(onboarding.name)}" autocomplete="off" />
    </div>
    <button class="btn primary block" data-action="ob-name-next">That's me</button>`;
}

function obSports() {
  const picks = onboarding.picks;
  return `
    ${obProgress(2)}
    <div>
      <p class="ob-kicker">Multi-sport kid</p>
      <h1>Pick 3 sports to grow up playing.</h1>
      <p class="ob-lede mt-8">Childhood sports permanently shape how your body develops — the skills transfer forever.
      <b>At least one</b> must be a main-sport path (🏀 ⚽ 🏈): that's the career you can go pro in later.</p>
    </div>
    <div class="pick-grid">
      ${Object.entries(YOUTH_SPORTS).map(([id, s]) => `
        <div class="pick ${picks.includes(id) ? 'selected' : ''}" data-action="ob-pick" data-id="${id}">
          ${s.main ? '<span class="p-badge">Career path</span>' : ''}
          <span class="p-ico">${s.ico}</span>
          <b>${s.name}</b>
          <span class="p-sub">${s.blurb}</span>
          <span class="p-sub" style="color:var(--green)">${Object.entries(s.grow).map(([k, v]) => `+${Math.round(v * 100)}% ${ATTRS[k].name}`).join(' · ')}</span>
        </div>`).join('')}
    </div>
    <button class="btn primary block" data-action="ob-sports-next" ${picks.length === 3 && picks.some((p) => YOUTH_SPORTS[p].main) ? '' : 'disabled'}>
      ${picks.length}/3 selected — Let's play
    </button>`;
}

function obDevice() {
  return `
    ${obProgress(3)}
    <div>
      <p class="ob-kicker">The secret weapon</p>
      <h1>Connect your sleep.</h1>
      <p class="ob-lede mt-8">Choose how SLEEPER reads your nights. You can switch anytime in the Sleep tab.</p>
    </div>
    <div class="stack">
      ${Object.entries(PROVIDERS).map(([id, p]) => `
        <div class="row selectable ${onboarding.provider === id ? 'selected' : ''}" data-action="ob-provider" data-id="${id}">
          <div class="row-ico">${p.ico}</div>
          <div class="row-main"><b>${p.name}</b><span class="sub">${p.desc}</span></div>
          ${onboarding.provider === id ? '<span class="tag accent">✓</span>' : ''}
        </div>`).join('')}
    </div>
    <button class="btn primary block" data-action="ob-start">Start my career 🌅</button>`;
}

/* ---------------- main shell ---------------- */
const TABS = [
  { id: 'home', label: 'Home', ico: '🏠' },
  { id: 'sleep', label: 'Sleep', ico: '🌙' },
  { id: 'train', label: 'Train', ico: '🏋️' },
  { id: 'season', label: 'Season', ico: '📅' },
  { id: 'club', label: 'Club', ico: '🛒' },
  { id: 'journal', label: 'Journal', ico: '📖' },
];

export function render() {
  const S = E.getState();
  if (!S) { renderOnboarding(); return; }
  document.body.className = `era-${S.athlete.era}`;
  const decisionDot = S.pendingDecision ? 'home' : null;
  const gameDot = E.isGameDay() && !S.athlete.injury ? 'season' : null;

  const content = {
    home: tabHome, sleep: tabSleep, train: tabTrain,
    season: tabSeason, club: tabClub, journal: tabJournal,
  }[currentTab]();

  $app().innerHTML = `
    <div class="app-grid">
      <nav class="tabbar">
        <div class="tabbar-brand"><span style="font-size:20px">🌙</span><strong>SLEEPER</strong></div>
        ${TABS.map((t) => `
          <button class="tab ${currentTab === t.id ? 'active' : ''}" data-action="tab" data-id="${t.id}">
            <span class="tab-ico">${t.ico}</span><span>${t.label}</span>
            ${(decisionDot === t.id || gameDot === t.id) ? '<span class="tab-dot"></span>' : ''}
          </button>`).join('')}
      </nav>
      <main class="stack">${content}</main>
    </div>`;
}

/* ---------------- HOME ---------------- */
function tabHome() {
  const S = E.getState();
  const a = S.athlete;
  const era = ERA_INFO[a.era];
  const rating = E.computeRating();
  const last = S.sleep.history[S.sleep.history.length - 1];
  const desc = describeScore(S.today.sleepScore);

  if (a.retired) return retiredHome();

  const roleLine = a.position
    ? `${SPORTS[a.mainSport].positions[a.position].name} · ${a.proTeam || a.college?.name || SPORTS[a.mainSport].name}`
    : a.mainSport
      ? `${SPORTS[a.mainSport].name}${a.college ? ' · ' + a.college.name : ''}`
      : a.youthSports.map((s) => YOUTH_SPORTS[s].ico).join(' ');

  const eraIdx = ERAS.indexOf(a.era);

  return `
    <section class="scene-hero">
      ${sceneArt(a.era)}
      <div class="scene-fade"></div>
      <div class="hero-topline">
        <span class="tag">${era.ico} ${era.name}</span>
        <span class="rp-chip">✦ ${S.rp} RP</span>
      </div>
      <div class="hero-content">
        <div class="hero-name">${esc(a.name)}</div>
        <div class="hero-sub">Age ${a.age} · ${roleLine}</div>
        <div class="hero-stats">
          <div class="hero-stat"><b>${rating}</b><span>Rating</span></div>
          <div class="hero-stat"><b>${a.era === 'hs' ? starsHtml(E.starRating()) : Math.round(a.form)}</b><span>${a.era === 'hs' ? 'Recruiting' : 'Form'}</span></div>
          <div class="hero-stat"><b>${Math.round(a.morale)}</b><span>Morale</span></div>
          <div class="hero-stat"><b>Day ${a.dayOfYear}<span class="faint">/${E.YEAR_DAYS[a.era]}</span></b><span>Season</span></div>
        </div>
      </div>
    </section>

    <div class="card">
      <div class="timeline">
        ${[['youth', 'Backyard'], ['hs', 'Varsity'], ['college', 'College'], ['pro', 'Pro']].map(([e, lab], i) => `
          <div class="tl-node ${i < eraIdx ? 'done' : i === eraIdx ? 'now' : ''}">
            <div class="tl-dot">${ERA_INFO[e].ico}</div><span class="tl-lab">${lab}</span>
          </div>${i < 3 ? `<div class="tl-line ${i < eraIdx ? 'done' : ''}"></div>` : ''}`).join('')}
      </div>
    </div>

    ${S.pendingDecision ? `
      <div class="card" style="border-color:var(--accent)">
        <div class="card-title"><h3>⚡ Decision time</h3></div>
        <p class="muted small mb-12">${decisionTeaser(S.pendingDecision.type)}</p>
        <button class="btn primary block" data-action="open-decision">Make the call</button>
      </div>` : ''}

    <div class="card">
      <div class="card-title"><h3>Today</h3><span class="hint">${desc.label} night — ${desc.line}</span></div>
      <div class="rings-row">
        ${ring(S.today.sleepScore, 100, 'Sleep', 'score', 'var(--ring-sleep)')}
        ${ring(S.today.recovery, 100, 'Recovery', '%', 'var(--ring-recovery)')}
        ${ring(a.energy, 12, 'Energy', 'today', 'var(--ring-energy)')}
      </div>
      <div class="divider"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">
        <div class="small muted">
          ${a.injury ? `🤕 <b style="color:var(--red)">${a.injury.name}</b> — ${a.injury.daysLeft}d left` : `Sessions left: <b>${S.today.sessionsMax - S.today.trained.length}</b>`}
          · Fatigue <b>${Math.round(a.fatigue)}</b>
          · Streak <b>${S.sleep.streak}🔥</b>
        </div>
        ${energyPips(a.energy)}
      </div>
    </div>

    ${E.isGameDay() && !a.injury ? `
      <div class="card" style="border-color:rgba(255,209,102,.4)">
        <div class="card-title"><h3>🏟️ Game day</h3><span class="tag gold">vs ${esc(E.nextOpponent())}</span></div>
        <p class="muted small mb-12">Play before the day ends — energy and recovery decide how you perform.</p>
        <button class="btn primary block" data-action="play-game">Tip off</button>
      </div>` : ''}

    <div class="grid-2">
      <button class="btn primary" data-action="next-day" style="padding:16px">🌙 Sleep → Next day</button>
      <button class="btn" data-action="goto-train" style="padding:16px">🏋️ Train (${S.today.sessionsMax - S.today.trained.length} left)</button>
    </div>
    ${S.sleep.provider === 'demo' ? `<button class="btn ghost block small" data-action="sim-week">⏩ Quick-sim 7 days (auto train & play)</button>` : ''}
  `;
}

function decisionTeaser(type) {
  return {
    sport: 'High school is here. Three sports got you this far — now one gets everything you have.',
    college: 'The offer letters are in. Where you go changes how you develop.',
    position: 'Your coach wants to know: what position do you want to master?',
    retire: 'The body is asking questions. Is it time to hang them up?',
  }[type];
}

function retiredHome() {
  const S = E.getState();
  const legacy = E.legacyScore();
  return `
    <section class="scene-hero">
      ${sceneArt('pro')}
      <div class="scene-fade"></div>
      <div class="hero-content">
        <div class="hero-name">${esc(S.athlete.name)}</div>
        <div class="hero-sub">Retired · ${legacy.title}</div>
        <div class="hero-stats">
          <div class="hero-stat"><b>${legacy.pts}</b><span>Legacy</span></div>
          <div class="hero-stat"><b>${S.career.games}</b><span>Games</span></div>
          <div class="hero-stat"><b>${S.career.trophies.length}</b><span>Titles</span></div>
          <div class="hero-stat"><b>${S.career.awards.length}</b><span>Awards</span></div>
        </div>
      </div>
    </section>
    <div class="card center">
      <h3 style="font-size:20px">🏛️ ${legacy.title}</h3>
      <p class="muted small mt-8">${S.career.trophies.map((t) => `🏆 ${t.name} (${t.age})`).join('<br>') || 'No titles — but a career nobody can take away.'}</p>
      <div class="divider"></div>
      <button class="btn primary block" data-action="new-career">Start a new career</button>
    </div>`;
}

/* ---------------- SLEEP ---------------- */
function tabSleep() {
  const S = E.getState();
  const hist = S.sleep.history.slice(-14);
  const last = hist[hist.length - 1];
  const gear = E.gearBonuses();
  const provider = PROVIDERS[S.sleep.provider];

  return `
    <div class="card">
      <div class="card-title"><h3>🌙 Last night</h3>
        <span class="tag ${last && last.score >= 70 ? 'green' : last && last.score >= 55 ? 'gold' : 'red'}">${last ? describeScore(last.score).label : '—'}</span>
      </div>
      ${last ? `
      <div class="rings-row mb-12">
        ${ring(last.score, 100, 'Sleep score', 'of 100', 'var(--ring-sleep)')}
        ${ring(last.recovery ?? S.today.recovery, 100, 'Recovery', '%', 'var(--ring-recovery)')}
      </div>
      <div class="sleep-detail-grid">
        <div class="sleep-cell"><b>${last.hours}h</b><span>Time asleep</span></div>
        <div class="sleep-cell"><b>${Math.round(last.efficiency * 100)}%</b><span>Efficiency</span></div>
        <div class="sleep-cell"><b>${Math.round(last.deepPct * 100)}%</b><span>Deep</span></div>
        <div class="sleep-cell"><b>${Math.round(last.remPct * 100)}%</b><span>REM</span></div>
        ${last.restingHR ? `<div class="sleep-cell"><b>${last.restingHR}</b><span>Resting HR</span></div>` : ''}
        <div class="sleep-cell"><b>+${last.rpEarn ?? 0} ✦</b><span>RP earned</span></div>
      </div>` : '<p class="muted small">No nights recorded yet. Hit "Sleep → Next day" on Home.</p>'}
    </div>

    <div class="card">
      <div class="card-title"><h3>Last 14 nights</h3><span class="hint">streak ${S.sleep.streak}🔥</span></div>
      <div class="sleep-chart">
        ${hist.map((n) => `
          <div class="sc-col">
            <div class="sc-bar ${n.score < 55 ? 'low' : n.score < 70 ? 'mid' : ''}" style="height:${Math.max(5, n.score)}%" title="${n.score}"></div>
            <span class="sc-lab">${n.score}</span>
          </div>`).join('') || '<p class="muted small">Nothing yet.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>Device</h3><span class="tag accent">${provider.ico} ${provider.name}</span></div>
      <div class="stack">
        ${Object.entries(PROVIDERS).map(([id, p]) => `
          <div class="row selectable ${S.sleep.provider === id ? 'selected' : ''}" data-action="set-provider" data-id="${id}">
            <div class="row-ico">${p.ico}</div>
            <div class="row-main"><b>${p.name}</b><span class="sub">${p.desc}</span></div>
          </div>`).join('')}
      </div>
      ${S.sleep.provider === 'import' ? `
        <button class="btn block mt-12" data-action="open-import">📥 Import nights (CSV) — ${S.sleep.importQueue.length} queued</button>` : ''}
    </div>

    <div class="card">
      <div class="card-title"><h3>Sleep boosts active</h3></div>
      <p class="small muted">Gear & staff: <b class="spark">+${gear.sleep}</b> sleep score · <b class="spark">+${gear.recovery}</b> recovery · <b class="spark">+${gear.energy}</b> energy.
      ${S.athlete.habit !== 0 ? `<br>Lifestyle habits: <b style="color:${S.athlete.habit > 0 ? 'var(--green)' : 'var(--red)'}">${S.athlete.habit > 0 ? '+' : ''}${Math.round(S.athlete.habit)}</b> to nightly baseline (built by your story choices).` : ''}</p>
    </div>

    <div class="card">
      <div class="card-title"><h3>Why it matters</h3></div>
      <p class="small muted">
        Training gains scale <b>0.4× to 1.5×</b> with recovery.<br>
        Game performance uses recovery, fatigue and energy.<br>
        Poor recovery + high fatigue = <b style="color:var(--red)">injury risk</b>.<br>
        70+ scores build a streak: 3+ nights = bonus RP, 7+ = big bonus.<br>
        After age 27, elite sleep literally slows your decline.
      </p>
    </div>`;
}

/* ---------------- TRAIN ---------------- */
function tabTrain() {
  const S = E.getState();
  const a = S.athlete;
  const drills = E.availableDrills();
  const recommended = E.recommendDrills().slice(0, 3).map((d) => d.id);
  const sessionsLeft = S.today.sessionsMax - S.today.trained.length;

  const physBars = PHYS_KEYS.map((k) => bar(ATTRS[k].name, a.attrs[k], a.caps[k], ATTRS[k].ico)).join('');
  const skillKeys = a.mainSport ? SPORTS[a.mainSport].skills
    : [...new Set(a.youthSports.filter((s) => SPORTS[s]).flatMap((s) => SPORTS[s].skills))];
  const skillBars = skillKeys.map((k) => bar(ATTRS[k].name, a.attrs[k], a.caps[k], ATTRS[k].ico)).join('');

  return `
    <div class="card">
      <div class="card-title"><h3>🏋️ Training</h3>
        <span class="hint">${sessionsLeft} session${sessionsLeft === 1 ? '' : 's'} left · ${energyPips(a.energy)}</span>
      </div>
      <p class="small muted">Recovery multiplier today: <b style="color:var(--green)">×${(0.4 + S.today.recovery / 100 * 1.1).toFixed(2)}</b>
        · Facility: <b>${FACILITIES[S.owned.facility].name}</b>
        ${a.injury ? ` · <b style="color:var(--red)">🤕 ${a.injury.name} — light work only</b>` : ''}</p>
      <div class="grid-2 mt-12">
        <button class="btn" data-action="auto-train" ${sessionsLeft === 0 ? 'disabled' : ''}>🤖 Auto-train (best value)</button>
        <button class="btn ghost" data-action="goto-club">Upgrade facility →</button>
      </div>
    </div>

    <div class="cols-2">
      <div class="card">
        <div class="card-title"><h3>Athleticism</h3><span class="hint">grey = potential</span></div>
        ${physBars}
      </div>
      <div class="card">
        <div class="card-title"><h3>${a.mainSport ? SPORTS[a.mainSport].name + ' skills' : 'Sport skills'}</h3></div>
        ${skillBars || '<p class="muted small">Pick sports first.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>Drills</h3><span class="hint">⭐ = best value for your build</span></div>
      <div class="drill-grid">
        ${drills.map((d) => {
          const cantAfford = a.energy < d.energy || sessionsLeft === 0 || (a.injury && d.intensity > 1);
          return `
          <div class="drill ${d.locked || cantAfford ? 'disabled' : ''}" data-action="train" data-id="${d.id}">
            <span class="d-ico">${d.ico}</span>
            ${d.locked ? `<span class="d-lock">🔒</span>` : `<span class="d-cost">${'⚡'.repeat(d.energy)}</span>`}
            <b>${recommended.includes(d.id) && !d.locked ? '⭐ ' : ''}${d.name}</b>
            <span class="d-targets">${Object.entries(d.targets).map(([k, v]) => `${ATTRS[k].name} +${v}`).join(' · ')}</span>
            <span class="d-targets faint">${d.locked ? d.lockReason : d.desc}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

/* ---------------- SEASON ---------------- */
function tabSeason() {
  const S = E.getState();
  const a = S.athlete;
  const sp = a.mainSport ? SPORTS[a.mainSport] : null;
  const labels = sp ? sp.statLabels : { a: 'PTS', b: 'REB', c: 'AST' };
  const yearLen = E.YEAR_DAYS[a.era];
  const gameDays = a.era === 'youth' ? [3, 6, 9, 12] : a.era === 'pro' ? [3, 5, 7, 9, 11, 13, 15, 17, 19] : [4, 7, 10, 13, 16];
  const g = S.season;
  const lastR = g.lastResult;

  return `
    <div class="card">
      <div class="card-title"><h3>📅 ${ERA_INFO[a.era].name} — Age ${a.age}</h3>
        <span class="tag ${g.wins >= g.losses ? 'green' : 'red'}">${g.wins}–${g.losses}</span>
      </div>
      <div style="display:flex; gap:7px; align-items:center; flex-wrap:wrap">
        ${gameDays.map((d) => {
          const past = d < a.dayOfYear || (d === a.dayOfYear && S.today.gamePlayed);
          const isNext = !past && d === Math.min(...gameDays.filter((x) => x >= a.dayOfYear));
          return `<span class="schedule-dot ${past ? (Math.random() < 0 ? '' : '') : ''} ${isNext ? 'next' : past ? (g.games ? 'win' : '') : ''}"
            title="Day ${d}"></span>`;
        }).join('')}
        <span class="xs faint">day ${a.dayOfYear} of ${yearLen}</span>
      </div>
      ${E.isGameDay() && !a.injury ? `<button class="btn primary block mt-12" data-action="play-game">🏟️ Play today's game vs ${esc(E.nextOpponent())}</button>` : ''}
      ${a.injury ? `<p class="small mt-8" style="color:var(--red)">🤕 Out ${a.injury.daysLeft} more day(s) — ${a.injury.name}</p>` : ''}
    </div>

    ${lastR ? `
    <div class="card">
      <div class="card-title"><h3>Last game</h3><span class="hint">vs ${esc(lastR.opponent)}</span></div>
      <div class="result-banner ${lastR.win ? 'win' : 'loss'}">${lastR.win ? 'WIN' : 'LOSS'}${lastR.star ? ' ⭐' : ''}</div>
      <div class="boxline">
        <div><b>${lastR.line.a}</b><span>${lastR.labels.a}</span></div>
        <div><b>${lastR.line.b}</b><span>${lastR.labels.b}</span></div>
        <div><b>${lastR.line.c}</b><span>${lastR.labels.c}</span></div>
        <div><b>+${lastR.rp}✦</b><span>RP</span></div>
      </div>
    </div>` : ''}

    ${a.era === 'hs' ? `
    <div class="card">
      <div class="card-title"><h3>🎓 Recruiting</h3>${starsHtml(E.starRating())}</div>
      <p class="small muted">Scouts project you as a ${E.starRating()}-star recruit. Big games and a rising rating open bigger college doors senior year.</p>
    </div>` : ''}

    ${a.draft ? `
    <div class="card">
      <div class="card-title"><h3>🎟️ Draft</h3></div>
      <p class="small muted">${a.draft.round ? `Round ${a.draft.round}, pick ${a.draft.pickNo}` : 'Undrafted free agent'} — ${esc(a.draft.team)}</p>
    </div>` : ''}

    <div class="card">
      <div class="card-title"><h3>Season stats</h3></div>
      <div class="boxline">
        <div><b>${g.games ? (g.statA / g.games).toFixed(1) : '0'}</b><span>${labels.a}/G</span></div>
        <div><b>${g.games ? (g.statB / g.games).toFixed(1) : '0'}</b><span>${labels.b}/G</span></div>
        <div><b>${g.games ? (g.statC / g.games).toFixed(1) : '0'}</b><span>${labels.c}/G</span></div>
        <div><b>${g.games}</b><span>GP</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>Career</h3><span class="hint">${S.career.games} games</span></div>
      <div class="boxline">
        <div><b>${S.career.wins}</b><span>Wins</span></div>
        <div><b>${S.career.statA}</b><span>${labels.a}</span></div>
        <div><b>${S.career.trophies.length}</b><span>🏆</span></div>
        <div><b>${S.career.awards.length}</b><span>Awards</span></div>
      </div>
      ${S.career.seasons.length ? `
      <div class="divider"></div>
      ${S.career.seasons.slice(-6).reverse().map((s) => `
        <div class="journal-item">
          <span class="j-day">Age ${s.age}<br><span class="faint">${ERA_INFO[s.era].name}</span></span>
          <span class="j-text ${s.trophy || s.award ? 'milestone' : ''}">${s.wins}–${s.losses}${s.sport ? ` · ${SPORTS[s.sport].ico}` : ''} · ${(s.statA / Math.max(1, s.games)).toFixed(1)}/g
          ${s.trophy ? ` · 🏆 ${s.trophy}` : ''}${s.award ? ` · ${s.award}` : ''}</span>
        </div>`).join('')}` : ''}
    </div>`;
}

/* ---------------- CLUB (shop) ---------------- */
function tabClub() {
  const S = E.getState();
  const a = S.athlete;
  const eraIdx = ERAS.indexOf(a.era);
  const fac = FACILITIES[S.owned.facility];
  const nextFac = FACILITIES[S.owned.facility + 1];

  return `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center">
      <div><h3 style="font-size:16px">Rest Points</h3><p class="xs faint">Earned every night you sleep well — and every win.</p></div>
      <span class="rp-chip" style="font-size:17px">✦ ${S.rp}</span>
    </div>

    <div class="card">
      <div class="card-title"><h3>🏟️ Facility</h3><span class="tag accent">${fac.ico} ${fac.name}</span></div>
      ${nextFac ? `
        <div class="row">
          <div class="row-ico">${nextFac.ico}</div>
          <div class="row-main"><b>${nextFac.name}</b><span class="sub">${nextFac.desc} (+${Math.round(nextFac.mult * 100)}% all gains)</span></div>
          <div class="row-side">
            <button class="btn small ${S.rp >= nextFac.cost ? 'primary' : ''}" data-action="buy-facility" ${S.rp >= nextFac.cost ? '' : 'disabled'}>✦ ${nextFac.cost}</button>
          </div>
        </div>` : '<p class="small muted">You train at the best lab in the world. 🧪</p>'}
    </div>

    <div class="card">
      <div class="card-title"><h3>🧑‍🏫 Coaching staff</h3><span class="hint">tiers stack</span></div>
      <div class="stack">
        ${COACHES.map((c) => {
          const tier = S.owned.coaches[c.id] || 0;
          const next = c.tiers[tier];
          const lockedEra = c.era > eraIdx;
          return `
          <div class="row ${lockedEra ? 'locked' : ''}">
            <div class="row-ico">${c.ico}</div>
            <div class="row-main">
              <b>${c.name} ${tier ? `<span class="tag accent">T${tier}</span>` : ''}</b>
              <span class="sub">${c.desc}${lockedEra ? ` · unlocks in ${ERA_INFO[ERAS[c.era]].name}` : ''}</span>
            </div>
            <div class="row-side">
              ${next && !lockedEra
                ? `<button class="btn small ${S.rp >= next.cost ? 'primary' : ''}" data-action="buy-coach" data-id="${c.id}" ${S.rp >= next.cost ? '' : 'disabled'}>✦ ${next.cost}</button>`
                : next ? `<span class="xs faint">🔒</span>` : '<span class="tag green">MAX</span>'}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>🛌 Recovery gear</h3><span class="hint">passive, permanent</span></div>
      <div class="stack">
        ${GEAR.map((g) => {
          const owned = S.owned.gear[g.id];
          const lockedEra = (g.era || 0) > eraIdx;
          return `
          <div class="row ${lockedEra && !owned ? 'locked' : ''}">
            <div class="row-ico">${g.ico}</div>
            <div class="row-main"><b>${g.name}</b><span class="sub">${g.desc}${lockedEra && !owned ? ` · unlocks in ${ERA_INFO[ERAS[g.era]].name}` : ''}</span></div>
            <div class="row-side">
              ${owned ? '<span class="tag green">OWNED</span>'
                : lockedEra ? '<span class="xs faint">🔒</span>'
                : `<button class="btn small ${S.rp >= g.cost ? 'primary' : ''}" data-action="buy-gear" data-id="${g.id}" ${S.rp >= g.cost ? '' : 'disabled'}>✦ ${g.cost}</button>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><h3>💆 Services</h3><span class="hint">one-time boosts</span></div>
      <div class="stack">
        ${SERVICES.map((sv) => `
          <div class="row">
            <div class="row-ico">${sv.ico}</div>
            <div class="row-main"><b>${sv.name}</b><span class="sub">${sv.desc}</span></div>
            <div class="row-side">
              <button class="btn small ${S.rp >= sv.cost ? 'primary' : ''}" data-action="use-service" data-id="${sv.id}" ${S.rp >= sv.cost ? '' : 'disabled'}>✦ ${sv.cost}</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ---------------- JOURNAL ---------------- */
function tabJournal() {
  const S = E.getState();
  return `
    <div class="card">
      <div class="card-title"><h3>📖 ${esc(S.athlete.name)}'s story</h3><span class="hint">day ${S.athlete.day}</span></div>
      ${S.journal.slice(0, 40).map((j) => `
        <div class="journal-item">
          <span class="j-day">Age ${j.age}<br><span class="faint">day ${j.day}</span></span>
          <span class="j-text ${j.milestone ? 'milestone' : ''}">${esc(j.text)}</span>
        </div>`).join('') || '<p class="muted small">The story starts tonight.</p>'}
    </div>

    <div class="card">
      <div class="card-title"><h3>🏆 Trophy case</h3></div>
      <p class="small muted">
        ${S.career.trophies.map((t) => `🏆 ${esc(t.name)} — age ${t.age}`).join('<br>') || 'Empty… for now.'}
        ${S.career.awards.length ? '<br>' + S.career.awards.map((t) => `🎖️ ${esc(t.name)} — age ${t.age}`).join('<br>') : ''}
      </p>
    </div>

    <div class="card">
      <div class="card-title"><h3>⚙️ Settings</h3></div>
      <div class="grid-2">
        <button class="btn small" data-action="export-save">⬇️ Export save</button>
        <button class="btn small" data-action="import-save">⬆️ Import save</button>
      </div>
      <button class="btn small danger block mt-8" data-action="reset-confirm">🗑️ Reset career</button>
      <p class="xs faint mt-8">SLEEPER v1.0 · an installable web app — use your browser's “Add to Home Screen” / “Install” to get the mobile & desktop app. Saves live on this device.</p>
    </div>`;
}

/* ---------------- morning flow ---------------- */
function showMorningReport(res) {
  const night = res.night;
  const d = describeScore(night.score);
  showModal(`
    <p class="modal-kicker">☀️ Morning report</p>
    <h2>${d.label} night</h2>
    <div class="rings-row mt-12 mb-12">
      ${ring(night.score, 100, 'Sleep', 'score', 'var(--ring-sleep)')}
      ${ring(res.recovery, 100, 'Recovery', '%', 'var(--ring-recovery)')}
    </div>
    <div class="sleep-detail-grid">
      <div class="sleep-cell"><b>${night.hours}h</b><span>Asleep</span></div>
      <div class="sleep-cell"><b>+${res.rpEarn} ✦</b><span>RP earned</span></div>
    </div>
    <p class="modal-body">${d.line}</p>
    <button class="btn primary block" data-action="close-modal">Start the day</button>
  `, { dismissable: false });
}

function eventModalFns(events) {
  return events.map((ev) => () => {
    if (ev.type === 'info') {
      showModal(`
        <p class="modal-kicker">${ev.ico || 'ℹ️'} Life update</p>
        <h2>${esc(ev.title)}</h2>
        <p class="modal-body">${esc(ev.text)}</p>
        <button class="btn primary block" data-action="close-modal">OK</button>`);
    } else if (ev.type === 'choice') {
      const e = ev.event;
      const opts = ['a', 'b', 'c'].filter((k) => e[k]);
      showModal(`
        <p class="modal-kicker">${e.ico} Crossroads</p>
        <h2>${esc(e.title)}</h2>
        <p class="modal-body">${esc(e.text)}</p>
        <div class="modal-actions">
          ${opts.map((k) => `
            <button class="choice-btn" data-action="choice" data-key="${k}" data-ev="${esc(e.id)}">
              <b>${esc(e[k].label)}</b><span>${esc(e[k].sub)}</span>
            </button>`).join('')}
        </div>`, { dismissable: false });
      pendingChoiceEvent = e;
    } else if (ev.type === 'gameday') {
      showModal(`
        <p class="modal-kicker">🏟️ Game day</p>
        <h2>vs ${esc(ev.opponent)}</h2>
        <p class="modal-body">Tonight's opponent is warming up. Train light, manage energy, and show up ready.</p>
        <div class="modal-actions">
          <button class="btn primary" data-action="play-game-modal">Play now</button>
          <button class="btn ghost" data-action="close-modal">Train first</button>
        </div>`);
    } else if (ev.type === 'season') {
      showModal(`
        ${ev.trophy ? `<div class="modal-art">${vignette('trophy')}</div>` : ''}
        <p class="modal-kicker">📊 Season complete</p>
        <h2>${ev.record} record</h2>
        <p class="modal-body">${ev.trophy ? `🏆 ${ev.trophy}! ` : ''}${ev.award ? `🎖️ Named ${ev.award}. ` : ''}Averaged ${ev.perGame} per game.</p>
        <button class="btn primary block" data-action="close-modal">Next season</button>`, { dismissable: false });
    } else if (ev.type === 'decision') {
      openDecision();
    } else if (ev.type === 'draft') {
      const r = ev.result;
      showModal(`
        <div class="modal-art">${vignette('draft')}</div>
        <p class="modal-kicker">🎟️ ${r.league}</p>
        <h2>${r.round ? `Round ${r.round}, Pick ${r.pickNo}` : 'Undrafted…'}</h2>
        <p class="modal-body">${r.round
          ? `"With the ${r.pickNo}${['st', 'nd', 'rd'][r.pickNo - 1] || 'th'} pick, the ${r.team} select… ${esc(E.getState().athlete.name)}." Your phone explodes. Your mom is crying. You made it.`
          : `Your name was never called. But the ${r.team} offer a camp invite — plenty of legends started exactly here.`}</p>
        <button class="btn primary block" data-action="close-modal">Welcome to the show</button>`, { dismissable: false });
    }
  });
}

let pendingChoiceEvent = null;

/* ---------------- decisions ---------------- */
function openDecision() {
  const S = E.getState();
  const d = S.pendingDecision;
  if (!d) { closeModal(); return; }
  if (d.type === 'sport') {
    const options = S.athlete.youthSports.filter((s) => SPORTS[s]);
    showModal(`
      <p class="modal-kicker">🎯 The choice</p>
      <h2>One sport. Everything you've got.</h2>
      <p class="modal-body">Coach pulled you aside: "You can't ride three horses forever, kid." Your youth skills carry over — pick the career.</p>
      <div class="pick-grid">
        ${options.map((s) => `
          <div class="pick" data-action="choose-sport" data-id="${s}">
            <span class="p-ico">${SPORTS[s].ico}</span><b>${SPORTS[s].name}</b>
            <span class="p-sub">${Object.values(SPORTS[s].positions).map((p) => p.name).join(' · ')}</span>
          </div>`).join('')}
      </div>`, { dismissable: false });
  } else if (d.type === 'college') {
    showModal(`
      <p class="modal-kicker">🎓 Offer letters</p>
      <h2>Where do you play next?</h2>
      <p class="modal-body">Programs develop players differently — powerhouses bring tougher opponents and brighter spotlights; small schools hand you the keys.</p>
      <div class="modal-actions">
        ${d.offers.map((o, i) => `
          <button class="choice-btn" data-action="choose-college" data-id="${i}">
            <b>${o.ico} ${esc(o.name)} <span class="xs faint">· ${esc(o.style)}</span></b>
            <span>${esc(o.pitch)}</span>
          </button>`).join('')}
      </div>`, { dismissable: false });
  } else if (d.type === 'position') {
    const sport = SPORTS[E.getState().athlete.mainSport];
    showModal(`
      <p class="modal-kicker">♟️ Specialize</p>
      <h2>Pick your position.</h2>
      <p class="modal-body">This changes which attributes drive your rating, your stat lines, and which elite position labs you can unlock.</p>
      <div class="pick-grid">
        ${Object.entries(sport.positions).map(([id, p]) => `
          <div class="pick" data-action="choose-position" data-id="${id}">
            <span class="p-ico">${p.ico}</span><b>${p.name}</b>
            <span class="p-sub">${p.blurb}</span>
            <span class="p-sub" style="color:var(--green)">Key: ${Object.entries(p.weights).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => ATTRS[k].name).join(', ')}</span>
          </div>`).join('')}
      </div>`, { dismissable: false });
  } else if (d.type === 'retire') {
    showModal(`
      <p class="modal-kicker">⏳ The question</p>
      <h2>Hang them up?</h2>
      <p class="modal-body">The recovery takes longer. The kids are faster. But you can still play… Retire now, or run it back one more year?</p>
      <div class="modal-actions">
        <button class="btn primary" data-action="retire-yes">Retire a legend</button>
        <button class="btn ghost" data-action="retire-no">One more year</button>
      </div>`, { dismissable: false });
  }
}

/* ---------------- sleep input modals ---------------- */
function openManualLog() {
  showModal(`
    <p class="modal-kicker">📝 Morning log</p>
    <h2>How did you sleep?</h2>
    <div class="field-inline mt-12">
      <div class="field"><label>Bedtime</label><input id="ml-bed" type="time" value="22:30"></div>
      <div class="field"><label>Wake time</label><input id="ml-wake" type="time" value="07:00"></div>
    </div>
    <div class="field"><label>Quality (1–5): <b id="ml-qv">3</b></label>
      <input id="ml-q" type="range" min="1" max="5" value="3" oninput="document.getElementById('ml-qv').textContent=this.value"></div>
    <div class="field"><label>Times you woke up</label><input id="ml-wk" type="number" min="0" max="9" value="1"></div>
    <button class="btn primary block" data-action="manual-submit">Log & start the day</button>
  `, { dismissable: true });
}

function openImport() {
  showModal(`
    <p class="modal-kicker">📥 Device import</p>
    <h2>Paste CSV export</h2>
    <p class="modal-body">Header row + one row per night. Recognized columns: date, hours/duration, efficiency, deep, rem, resting_hr, score. Example:\n\ndate,hours,efficiency,deep,rem,score\n2026-07-01,7.6,91,18,22,84</p>
    <div class="field"><textarea id="imp-csv" rows="6" placeholder="date,hours,efficiency,deep,rem&#10;2026-07-01,7.6,0.91,0.18,0.22"></textarea></div>
    <button class="btn primary block" data-action="import-csv">Queue nights</button>
  `);
}

/* ---------------- actions ---------------- */
function handleAction(el, e) {
  const S = E.getState();
  const act = el.dataset.action;
  const id = el.dataset.id;

  switch (act) {
    case 'close-backdrop': if (e && e.target === el) closeModal(); break;
    /* onboarding */
    case 'ob-next': onboarding.step = 1; renderOnboarding(); break;
    case 'ob-name-next': {
      const v = document.getElementById('ob-name').value.trim();
      if (!v) { toast('Give your athlete a name!', 'bad', '✏️'); return; }
      onboarding.name = v; onboarding.step = 2; renderOnboarding(); break;
    }
    case 'ob-pick': {
      const i = onboarding.picks.indexOf(id);
      if (i >= 0) onboarding.picks.splice(i, 1);
      else if (onboarding.picks.length < 3) onboarding.picks.push(id);
      else toast('Three sports max — swap one out.', '', '⚖️');
      renderOnboarding(); break;
    }
    case 'ob-sports-next': onboarding.step = 3; renderOnboarding(); break;
    case 'ob-provider': onboarding.provider = id; renderOnboarding(); break;
    case 'ob-start': {
      E.createGame({ name: onboarding.name, youthSports: onboarding.picks, provider: onboarding.provider });
      toast(`Welcome to the backyard, ${onboarding.name}!`, 'good', '🌅');
      render(); break;
    }

    /* navigation */
    case 'tab': currentTab = id; render(); break;
    case 'goto-train': currentTab = 'train'; render(); break;
    case 'goto-club': currentTab = 'club'; render(); break;
    case 'close-modal': closeModal(); break;

    /* day loop */
    case 'next-day': {
      if (S.pendingDecision) { openDecision(); return; }
      if (S.sleep.provider === 'manual') { openManualLog(); return; }
      const res = E.advanceDay();
      if (res.error) { toast(res.error, 'bad', '⚠️'); return; }
      render();
      queueModals([() => showMorningReport(res), ...eventModalFns(res.morning)]);
      break;
    }
    case 'manual-submit': {
      const night = nightFromManual({
        bedtime: document.getElementById('ml-bed').value || '23:00',
        waketime: document.getElementById('ml-wake').value || '07:00',
        quality: +document.getElementById('ml-q').value,
        wakeups: +document.getElementById('ml-wk').value,
        age: S.athlete.age,
      });
      $modal().innerHTML = '';
      const res = E.advanceDay(night);
      if (res.error) { toast(res.error, 'bad', '⚠️'); return; }
      render();
      queueModals([() => showMorningReport(res), ...eventModalFns(res.morning)]);
      break;
    }
    case 'sim-week': {
      let days = 0;
      const summary = { games: 0, wins: 0, rp0: S.rp };
      while (days < 7) {
        if (S.pendingDecision) break;
        const res = E.advanceDay();
        if (res.error) break;
        // auto-resolve choices toward discipline
        for (const ev of res.morning) {
          if (ev.type === 'choice') {
            const keys = ['a', 'b', 'c'].filter((k) => ev.event[k]);
            const best = keys.sort((x, y) => (ev.event[y].sleepMod || 0) - (ev.event[x].sleepMod || 0))[0];
            E.resolveChoice(ev.event, best);
          }
        }
        if (E.isGameDay() && !S.athlete.injury && S.athlete.energy >= 2) {
          const g = E.playGame();
          if (!g.error) { summary.games++; if (g.win) summary.wins++; }
        }
        E.autoTrain();
        days++;
      }
      render();
      toast(`Simmed ${days} days — ${summary.wins}/${summary.games} games won, +${S.rp - summary.rp0} RP`, 'good', '⏩');
      if (S.pendingDecision) openDecision();
      break;
    }

    /* training & games */
    case 'train': {
      const r = E.train(id);
      if (r.error) { toast(r.error, 'bad', '⚠️'); return; }
      const gainTxt = Object.entries(r.gains).map(([k, v]) => `${ATTRS[k].name} +${v}`).join(', ');
      toast(gainTxt || 'Session done.', 'good', r.drill.ico);
      if (r.injury) toast(`Injury! ${r.injury.name} — out ${r.injury.daysLeft} days`, 'bad', '🤕');
      render(); break;
    }
    case 'auto-train': {
      const rs = E.autoTrain();
      if (!rs.length) { toast('No energy or sessions left.', 'bad', '😴'); return; }
      toast(`Trained: ${rs.map((r) => r.drill.name).join(', ')}`, 'good', '🤖');
      if (rs.some((r) => r.injury)) toast('Picked up a knock in training!', 'bad', '🤕');
      render(); break;
    }
    case 'play-game':
    case 'play-game-modal': {
      if (act === 'play-game-modal') $modal().innerHTML = '';
      const g = E.playGame();
      if (g.error) { toast(g.error, 'bad', '⚠️'); return; }
      render();
      const S2 = E.getState();
      queueModals([() => showModal(`
        <p class="modal-kicker">${g.win ? '🎉 Final' : '📉 Final'}</p>
        <h2 class="${g.win ? '' : ''}">${g.win ? 'W' : 'L'} vs ${esc(g.opponent)}</h2>
        <div class="result-banner ${g.win ? 'win' : 'loss'}">${g.win ? 'VICTORY' : 'DEFEAT'}${g.star ? ' ⭐' : ''}</div>
        <div class="boxline">
          <div><b>${g.line.a}</b><span>${g.labels.a}</span></div>
          <div><b>${g.line.b}</b><span>${g.labels.b}</span></div>
          <div><b>${g.line.c}</b><span>${g.labels.c}</span></div>
          <div><b>+${g.rp}✦</b><span>RP</span></div>
        </div>
        <p class="modal-body">${g.star ? 'You were the best player on the floor. People noticed.' : g.win ? 'Winning fixes everything.' : 'Sleep on it — literally. Tomorrow is another rep.'}</p>
        <button class="btn primary block" data-action="close-modal">Continue</button>`, { dismissable: false })]);
      break;
    }

    /* choices & decisions */
    case 'choice': {
      if (pendingChoiceEvent) E.resolveChoice(pendingChoiceEvent, el.dataset.key);
      pendingChoiceEvent = null;
      closeModal(); break;
    }
    case 'open-decision': openDecision(); break;
    case 'choose-sport': E.chooseSport(id); toast(`Committed to ${SPORTS[id].name}!`, 'good', SPORTS[id].ico); closeModal(); break;
    case 'choose-college': {
      const offer = E.chooseCollege(+id);
      toast(`Signed with ${offer.name}!`, 'good', '🎓');
      openDecision(); // straight into position choice
      break;
    }
    case 'choose-position': {
      E.choosePosition(id);
      const p = SPORTS[E.getState().athlete.mainSport].positions[id];
      toast(`You're a ${p.name} now`, 'good', p.ico);
      closeModal(); break;
    }
    case 'retire-yes': {
      E.retire(true); closeModal(); break;
    }
    case 'retire-no': E.retire(false); closeModal(); break;
    case 'new-career': E.resetGame(); onboarding = { step: 0, name: '', picks: [], provider: 'demo' }; render(); break;

    /* economy */
    case 'buy-coach': { const r = E.buyCoach(id); r.error ? toast(r.error, 'bad', '✦') : toast('Staff upgraded!', 'good', '🧑‍🏫'); render(); break; }
    case 'buy-facility': { const r = E.buyFacility(); r.error ? toast(r.error, 'bad', '✦') : toast('New facility unlocked!', 'good', '🏟️'); render(); break; }
    case 'buy-gear': { const r = E.buyGear(id); r.error ? toast(r.error, 'bad', '✦') : toast('Gear acquired!', 'good', '📦'); render(); break; }
    case 'use-service': { const r = E.useService(id); r.error ? toast(r.error, 'bad', '✦') : toast('Feeling fresher already.', 'good', '💆'); render(); break; }

    /* sleep providers */
    case 'set-provider': E.setProvider(id); toast(`Sleep source: ${PROVIDERS[id].name}`, 'good', PROVIDERS[id].ico); render(); break;
    case 'open-import': openImport(); break;
    case 'import-csv': {
      const txt = document.getElementById('imp-csv').value;
      const r = parseSleepCSV(txt, S.athlete.age);
      if (r.error) { toast(r.error, 'bad', '⚠️'); return; }
      E.queueImportedNights(r.nights);
      toast(`Queued ${r.nights.length} night(s) — each "Next day" uses one`, 'good', '📥');
      closeModal(); break;
    }

    /* settings */
    case 'export-save': {
      const blob = new Blob([E.exportSave()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement('a');
      aEl.href = url; aEl.download = `sleeper-save-${S.athlete.name.replace(/\s+/g, '-')}.json`;
      aEl.click(); URL.revokeObjectURL(url);
      break;
    }
    case 'import-save': {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files[0]; if (!f) return;
        f.text().then((t) => {
          try { E.importSave(t); toast('Save loaded!', 'good', '💾'); render(); }
          catch (e) { toast('Not a valid SLEEPER save.', 'bad', '⚠️'); }
        });
      };
      inp.click(); break;
    }
    case 'reset-confirm': {
      showModal(`
        <p class="modal-kicker">🗑️ Danger zone</p>
        <h2>Delete this career?</h2>
        <p class="modal-body">${esc(S.athlete.name)}'s entire story — attributes, trophies, journal — will be gone forever.</p>
        <div class="modal-actions">
          <button class="btn danger" data-action="reset-yes">Delete forever</button>
          <button class="btn ghost" data-action="close-modal">Keep playing</button>
        </div>`);
      break;
    }
    case 'reset-yes': {
      E.resetGame(); $modal().innerHTML = ''; modalQueue = [];
      onboarding = { step: 0, name: '', picks: [], provider: 'demo' };
      render(); break;
    }
  }
}

/* ---------------- init ---------------- */
export function init() {
  E.load();
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el && el.dataset.action) handleAction(el, e);
  });
  render();
  // Resume into any pending decision
  const S = E.getState();
  if (S && S.pendingDecision) setTimeout(openDecision, 400);
}
