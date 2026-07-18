/* ============================================================
   SLEEPER — sleep engine
   A night of sleep is normalized to:
     { hours, efficiency (0-1), deepPct, remPct, consistency (0-1),
       restingHR, source }
   score() converts a night into a 0-100 Sleep Score.
   Providers produce nights:
     - demo: simulated wearable (affected by story choices & gear)
     - manual: morning log form
     - import: CSV rows from a real device export (Whoop/Oura/Fitbit style)
   ============================================================ */

export const PROVIDERS = {
  demo:   { name: 'Sleeper Band (simulated)', ico: '⌚', desc: 'A simulated sleep wearable. Life events and habits move the numbers — great for playing through a career fast.' },
  manual: { name: 'Morning Log', ico: '📝', desc: 'Log bedtime, wake time and how you feel each morning. Works with any tracker on your nightstand.' },
  import: { name: 'Device Import (CSV)', ico: '📥', desc: 'Paste a CSV export from Whoop, Oura, Fitbit or Apple Health. Each row becomes one night.' },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Scoring ----------
   Weighted model loosely based on consumer sleep-score methodology:
   duration 35%, efficiency 20%, deep 15%, REM 15%, consistency 15%. */
export function scoreNight(n) {
  const durIdeal = n.ageHint && n.ageHint < 14 ? 9.5 : n.ageHint && n.ageHint < 18 ? 9 : 8;
  const durScore = clamp(1 - Math.abs(n.hours - durIdeal) / durIdeal * 2.2, 0, 1);
  const effScore = clamp((n.efficiency - 0.6) / 0.35, 0, 1);
  const deepScore = clamp(n.deepPct / 0.20, 0, 1);
  const remScore = clamp(n.remPct / 0.22, 0, 1);
  const conScore = clamp(n.consistency, 0, 1);
  let s = 100 * (0.35 * durScore + 0.20 * effScore + 0.15 * deepScore + 0.15 * remScore + 0.15 * conScore);
  if (n.bonus) s += n.bonus; // gear like blackout curtains / mattress
  return Math.round(clamp(s, 5, 100));
}

export function describeScore(s) {
  if (s >= 85) return { label: 'Elite', tone: 'green', line: 'Recovery machine. Everything trains better today.' };
  if (s >= 70) return { label: 'Solid', tone: 'green', line: 'Good night. Your body is ready to work.' };
  if (s >= 55) return { label: 'Okay', tone: 'gold', line: 'Serviceable, but gains will be dampened.' };
  if (s >= 40) return { label: 'Poor', tone: 'red', line: 'Rough night. Go easy — injury risk is up.' };
  return { label: 'Wrecked', tone: 'red', line: 'Your body is running on fumes. Hard training is a gamble.' };
}

/* ---------- Demo provider ----------
   Simulates a night using the athlete's "sleep hygiene" trajectory:
   a slow random walk + one-off modifiers from story choices (sleepMod),
   era pressure (college/pro travel), and gear bonuses.               */
export function simulateNight({ age, era, sleepMod = 0, gearSleepBonus = 0, habit = 0, rand = Math.random }) {
  // habit: -20..+20 persistent hygiene drift, moved by choices over time
  const base = era === 'youth' ? 78 : era === 'hs' ? 72 : era === 'college' ? 68 : 70;
  const target = clamp(base + habit + sleepMod, 15, 97);
  const noise = (rand() - 0.5) * 18;
  const q = clamp(target + noise, 10, 100) / 100;

  const idealH = age < 14 ? 9.5 : age < 18 ? 9 : 8;
  const hours = clamp(idealH * (0.62 + 0.45 * q) + (rand() - 0.5) * 0.6, 3.5, 11);
  const night = {
    hours: Math.round(hours * 10) / 10,
    efficiency: clamp(0.72 + 0.24 * q + (rand() - 0.5) * 0.05, 0.55, 0.99),
    deepPct: clamp(0.10 + 0.13 * q + (rand() - 0.5) * 0.04, 0.04, 0.28),
    remPct: clamp(0.12 + 0.13 * q + (rand() - 0.5) * 0.04, 0.05, 0.30),
    consistency: clamp(0.45 + 0.55 * q + (rand() - 0.5) * 0.15, 0.1, 1),
    restingHR: Math.round(clamp(68 - 16 * q + (rand() - 0.5) * 6, 42, 84)),
    bonus: gearSleepBonus,
    ageHint: age,
    source: 'demo',
  };
  night.score = scoreNight(night);
  return night;
}

/* ---------- Manual provider ---------- */
export function nightFromManual({ bedtime, waketime, quality, wakeups, age }) {
  // bedtime/waketime: "HH:MM" strings
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let dur = toMin(waketime) - toMin(bedtime);
  if (dur <= 0) dur += 24 * 60;
  const hours = dur / 60;
  const q = clamp((quality - 1) / 4, 0, 1); // 1-5 stars
  const wk = clamp(wakeups ?? 0, 0, 9);
  // Bedtime consistency proxy: earlier & conventional bedtimes score higher
  const bt = toMin(bedtime);
  const late = bt > 3 * 60 && bt < 12 * 60 ? 0.2 : bt >= 12 * 60 && bt <= 21.5 * 60 ? 0.9 : bt <= 23.5 * 60 || bt <= 60 ? 0.8 : 0.45;
  const night = {
    hours: Math.round(hours * 10) / 10,
    efficiency: clamp(0.95 - wk * 0.04 - (1 - q) * 0.1, 0.5, 0.98),
    deepPct: 0.10 + 0.10 * q,
    remPct: 0.12 + 0.10 * q,
    consistency: late,
    restingHR: null,
    ageHint: age,
    source: 'manual',
  };
  night.score = scoreNight(night);
  return night;
}

/* ---------- CSV import ----------
   Accepts flexible headers. Recognized (case-insensitive):
   date, hours|duration|sleep_hours|asleep, efficiency, deep|deep_pct,
   rem|rem_pct, hr|resting_hr|rhr, score (used directly if present)   */
export function parseSleepCSV(text, age) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { error: 'Need a header row plus at least one data row.' };
  const heads = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = (...names) => heads.findIndex((h) => names.some((n) => h.includes(n)));
  const iDate = idx('date', 'day');
  const iHours = idx('hour', 'duration', 'asleep', 'time in bed');
  const iEff = idx('efficiency');
  const iDeep = idx('deep');
  const iRem = idx('rem');
  const iHr = idx('resting_hr', 'rhr', 'heart');
  const iScore = idx('score');
  if (iHours < 0 && iScore < 0) return { error: 'Could not find an hours/duration or score column.' };

  const nights = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((c) => c.trim());
    const num = (i) => (i >= 0 && cells[i] !== '' ? parseFloat(cells[i]) : NaN);
    let hours = num(iHours);
    if (hours > 30) hours = hours / 60; // minutes → hours
    const effRaw = num(iEff);
    const deepRaw = num(iDeep);
    const remRaw = num(iRem);
    const night = {
      date: iDate >= 0 ? cells[iDate] : null,
      hours: isNaN(hours) ? 7.5 : hours,
      efficiency: isNaN(effRaw) ? 0.88 : effRaw > 1.5 ? effRaw / 100 : effRaw,
      deepPct: isNaN(deepRaw) ? 0.15 : deepRaw > 1.5 ? deepRaw / 100 : deepRaw,
      remPct: isNaN(remRaw) ? 0.18 : remRaw > 1.5 ? remRaw / 100 : remRaw,
      consistency: 0.75,
      restingHR: isNaN(num(iHr)) ? null : num(iHr),
      ageHint: age,
      source: 'import',
    };
    const direct = num(iScore);
    night.score = !isNaN(direct) ? Math.round(clamp(direct, 5, 100)) : scoreNight(night);
    nights.push(night);
  }
  return { nights };
}

/* ---------- Recovery ----------
   Recovery (0-100) = tonight's sleep vs accumulated fatigue + passive gear.
   This is the master multiplier for everything in the game.           */
export function computeRecovery({ score, fatigue = 0, gearRecoveryBonus = 0, streak = 0 }) {
  let r = score - fatigue * 0.45 + gearRecoveryBonus + Math.min(streak, 7) * 1.2;
  return Math.round(clamp(r, 5, 100));
}

/* Training effectiveness multiplier from recovery: 0.4× to 1.5× */
export const recoveryMult = (recovery) => 0.4 + (recovery / 100) * 1.1;

/* Energy for the day from recovery (plus gear bonuses added by engine) */
export const energyFromRecovery = (recovery) => Math.max(2, Math.round(2 + recovery / 12));
