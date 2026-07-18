/* ============================================================
   RISE — game engine
   Owns the save state, the day loop, training math, the game
   sim, and career progression (youth → HS → college → pro).
   Sleep & recovery are the master multipliers on everything.
   ============================================================ */

import {
  ATTRS, PHYS_KEYS, YOUTH_SPORTS, SPORTS, DRILLS, ERAS, ERA_INFO,
  COACHES, FACILITIES, GEAR, SERVICES, COLLEGES, PRO_LEAGUE,
  CHOICE_EVENTS, OPPONENTS,
} from './data.js';
import {
  simulateNight, computeRecovery, recoveryMult, energyFromRecovery, describeScore,
} from './sleep.js';

const SAVE_KEY = 'rise.save.v1';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const irnd = (lo, hi) => Math.round(rnd(lo, hi));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const YEAR_DAYS = { youth: 12, hs: 16, college: 16, pro: 20 };
export const eraOfAge = (age) => (age < 14 ? 'youth' : age < 18 ? 'hs' : age < 22 ? 'college' : 'pro');

/* ---------------- State ---------------- */
let S = null;

export const getState = () => S;

export function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage full/blocked */ }
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = JSON.parse(raw);
  } catch (e) { S = null; }
  return S;
}
export function resetGame() { S = null; localStorage.removeItem(SAVE_KEY); }
export const exportSave = () => JSON.stringify(S, null, 2);
export function importSave(json) {
  const parsed = JSON.parse(json);
  if (!parsed || !parsed.athlete || !parsed.meta) throw new Error('Not a RISE save file');
  S = parsed; save();
}

export function createGame({ name, youthSports, provider }) {
  const attrs = {};
  const caps = {};
  for (const k of Object.keys(ATTRS)) {
    const isPhys = PHYS_KEYS.includes(k);
    attrs[k] = isPhys ? irnd(16, 28) : irnd(6, 12);
    caps[k] = irnd(58, 92); // hidden potential
  }
  // Talent floor: everyone gets a couple of standout potentials
  const lucky = Object.keys(ATTRS).sort(() => Math.random() - 0.5).slice(0, 4);
  for (const k of lucky) caps[k] = irnd(88, 99);
  // Youth sport head starts
  const grow = {};
  for (const ys of youthSports) {
    for (const [k, v] of Object.entries(YOUTH_SPORTS[ys].grow)) {
      grow[k] = (grow[k] || 0) + v;
      attrs[k] += 3;
    }
    if (SPORTS[ys]) for (const sk of SPORTS[ys].skills) attrs[sk] = irnd(12, 18);
  }

  S = {
    meta: { version: 1, created: Date.now(), name },
    athlete: {
      name, age: 8, dayOfYear: 1, day: 1,
      era: 'youth',
      youthSports, mainSport: null, position: null, college: null, proTeam: null, draft: null,
      attrs, caps, growthBonus: grow,
      energy: 8, maxEnergyBonus: 0,
      fatigue: 10, morale: 70, form: 60, reputation: 0,
      injury: null,
      habit: 0, // sleep hygiene drift −20..+20
      retired: false,
    },
    rp: 30,
    sleep: { provider: provider || 'demo', history: [], streak: 0, pendingMod: 0, importQueue: [] },
    today: { recovery: 70, sleepScore: 75, trained: [], gamePlayed: false, sessionsMax: 3 },
    owned: { coaches: {}, facility: 0, gear: {} },
    season: { games: 0, wins: 0, losses: 0, statA: 0, statB: 0, statC: 0, playoffs: null, lastResult: null },
    career: { games: 0, wins: 0, statA: 0, statB: 0, statC: 0, seasons: [], trophies: [], awards: [] },
    journal: [],
    pendingDecision: null,
    pendingEvents: [],
  };
  logJournal(`${name}'s story begins in the backyard, age 8. Three sports, endless summer.`, true);
  save();
  return S;
}

export function logJournal(text, milestone = false) {
  S.journal.unshift({ day: S.athlete.day, age: S.athlete.age, era: S.athlete.era, text, milestone });
  if (S.journal.length > 400) S.journal.length = 400;
}

/* ---------------- Derived values ---------------- */
export function gearBonuses() {
  let sleep = 0, recovery = 0, energy = 0;
  for (const g of GEAR) {
    if (S.owned.gear[g.id]) {
      sleep += g.sleep || 0; recovery += g.recovery || 0; energy += g.energy || 0;
    }
  }
  const sc = S.owned.coaches['c_sleep'] || 0;
  if (sc > 0) recovery += COACHES.find((c) => c.id === 'c_sleep').tiers[sc - 1].bonus;
  return { sleep, recovery, energy };
}

export function activeWeights() {
  const a = S.athlete;
  if (a.mainSport && a.position) return SPORTS[a.mainSport].positions[a.position].weights;
  if (a.mainSport) return SPORTS[a.mainSport].baseWeights;
  return null;
}

export function computeRating(weights) {
  const w = weights || activeWeights();
  const a = S.athlete.attrs;
  if (!w) { // youth: blended athleticism
    return Math.round(PHYS_KEYS.reduce((s, k) => s + a[k], 0) / PHYS_KEYS.length * 1.35);
  }
  let r = 0;
  for (const [k, v] of Object.entries(w)) r += (a[k] || 0) * v;
  return Math.round(r);
}

export function starRating() {
  // Recruiting stars from rating relative to age expectations
  const r = computeRating();
  const expect = 20 + (S.athlete.age - 8) * 3.2;
  const diff = r - expect;
  return clamp(Math.round(2.5 + diff / 7), 1, 5);
}

/* ---------------- Day cycle ----------------
   advanceDay(nightOverride):
   - resolves the night (provider), computes recovery/energy/RP
   - ages the athlete, fires era transitions & scheduled events
   Returns { night, morning: [events...] } for the UI.            */
export function advanceDay(nightOverride) {
  const a = S.athlete;
  if (a.retired) return { error: 'Career over. Start a new one!' };
  if (S.pendingDecision) return { error: 'You have a decision to make first.' };

  const gear = gearBonuses();
  let night = nightOverride;
  if (!night) {
    if (S.sleep.provider === 'import' && S.sleep.importQueue.length) {
      night = S.sleep.importQueue.shift();
      night.bonus = (night.bonus || 0) + gear.sleep;
      night.score = clamp(night.score + gear.sleep, 5, 100);
    } else if (S.sleep.provider === 'demo' || S.sleep.provider === 'import') {
      night = simulateNight({
        age: a.age, era: a.era, sleepMod: S.sleep.pendingMod,
        gearSleepBonus: gear.sleep, habit: a.habit,
      });
    } else {
      return { error: 'Log last night’s sleep first.' };
    }
  } else {
    night.bonus = (night.bonus || 0) + gear.sleep;
    night.score = clamp(night.score + gear.sleep, 5, 100);
  }
  S.sleep.pendingMod = 0;

  // Streak: 70+ scores build a streak (compounding RP)
  S.sleep.streak = night.score >= 70 ? S.sleep.streak + 1 : 0;

  // Recovery & the day's resources
  const recovery = computeRecovery({
    score: night.score, fatigue: a.fatigue, gearRecoveryBonus: gear.recovery, streak: S.sleep.streak,
  });
  a.fatigue = clamp(a.fatigue - recovery / 8 + 2, 0, 100);
  const rpEarn = Math.floor(night.score / 10) + (S.sleep.streak >= 7 ? 6 : S.sleep.streak >= 3 ? 2 : 0);
  S.rp += rpEarn;
  a.energy = energyFromRecovery(recovery) + gear.energy;
  a.form = Math.round(clamp(a.form * 0.7 + recovery * 0.3, 0, 100));
  a.morale = clamp(a.morale + (58 - a.morale) * 0.05, 0, 100); // drift back to baseline

  night.day = a.day; night.recovery = recovery; night.rpEarn = rpEarn;
  S.sleep.history.push(night);
  if (S.sleep.history.length > 60) S.sleep.history.shift();
  S.today = { recovery, sleepScore: night.score, trained: [], gamePlayed: false, sessionsMax: 3, rpEarn };

  // Injury countdown
  if (a.injury) {
    a.injury.daysLeft -= 1;
    if (a.injury.daysLeft <= 0) {
      logJournal(`Back from the ${a.injury.name}. Feels good to move again.`);
      a.injury = null;
    }
  }

  // Advance the calendar
  a.day += 1;
  a.dayOfYear += 1;
  const yearLen = YEAR_DAYS[a.era];
  const morning = [];

  if (a.dayOfYear > yearLen) {
    a.dayOfYear = 1;
    endOfSeason(morning);
    a.age += 1;
    birthdayGrowth(morning);
    const newEra = eraOfAge(a.age);
    if (newEra !== a.era) eraTransition(newEra, morning);
  }

  // Scheduled + random events for the new day
  if (!S.pendingDecision) {
    if (isGameDay() && !a.injury) {
      morning.push({ type: 'gameday', opponent: nextOpponent() });
    } else if (a.injury && isGameDay()) {
      morning.push({ type: 'info', ico: '🤕', title: 'Sidelined', text: `You watch from the bench — the ${a.injury.name} needs ${a.injury.daysLeft} more day(s).` });
    }
    maybeChoiceEvent(morning);
  }

  S.pendingEvents = morning;
  save();
  return { night, recovery, rpEarn, morning };
}

function birthdayGrowth(morning) {
  const a = S.athlete;
  // Natural growth: kids get free physical development, teens get strength
  if (a.age <= 16) {
    for (const k of PHYS_KEYS) a.attrs[k] = clamp(a.attrs[k] + rnd(0.5, 1.5), 1, a.caps[k]);
  }
  if (a.age === 12 || a.age === 15) {
    for (const k of ['spd', 'str']) a.caps[k] = clamp(a.caps[k] + irnd(1, 4), 1, 99);
    morning.push({ type: 'info', ico: '📏', title: 'Growth Spurt!', text: 'You shot up over the summer. Coaches are looking at you differently.' });
    logJournal('Hit a growth spurt. New shoes. Again.', true);
  }
  // Aging curve: decline after 27, softened by sleep habits
  if (a.age >= 28) {
    const recent = S.sleep.history.slice(-15);
    const avgSleep = recent.length ? recent.reduce((s, n) => s + n.score, 0) / recent.length : 60;
    const shield = clamp(avgSleep / 100, 0.4, 1); // great sleep = slower decline
    const decay = (a.age - 26) * 0.55 * (1.35 - shield);
    for (const k of ['spd', 'agi', 'end']) a.attrs[k] = clamp(a.attrs[k] - decay, 20, 99);
    a.attrs.str = clamp(a.attrs.str - decay * 0.4, 20, 99);
    if (decay > 1.6) morning.push({ type: 'info', ico: '⏳', title: 'Father Time', text: 'Another birthday. Recovery matters more than ever now — elite sleep is what keeps veterans in the league.' });
  }
  morning.push({ type: 'info', ico: '🎂', title: `Age ${a.age}`, text: ageFlavor(a.age) });
}

function ageFlavor(age) {
  if (age < 14) return 'Another year of backyard battles and rec leagues.';
  if (age < 18) return `${4 - (17 - age)}${['st', 'nd', 'rd', 'th'][clamp(3 - (17 - age), 0, 3)]} year of high school. Every game counts more now.`;
  if (age < 22) return 'A new college season. Scouts in the stands.';
  return 'A new professional season begins.';
}

/* ---------------- Era transitions ---------------- */
function eraTransition(newEra, morning) {
  const a = S.athlete;
  a.era = newEra;
  resetSeason();
  if (newEra === 'hs') {
    S.pendingDecision = { type: 'sport' };
    morning.push({ type: 'decision', decision: 'sport' });
    logJournal('First day of high school. Time to choose a path.', true);
  } else if (newEra === 'college') {
    const offers = generateOffers();
    S.pendingDecision = { type: 'college', offers };
    morning.push({ type: 'decision', decision: 'college' });
    logJournal('Senior season is over. Offer letters are on the kitchen table.', true);
  } else if (newEra === 'pro') {
    const result = runDraft();
    morning.push({ type: 'draft', result });
  }
}

function generateOffers() {
  const stars = starRating();
  const offers = [];
  if (stars >= 4) offers.push({ ...pick(COLLEGES.power), tier: 'power', pitch: 'Chase championships with the best facilities in the country. You’ll have to earn minutes.' });
  if (stars >= 3) offers.push({ ...pick(COLLEGES.mid), tier: 'mid', pitch: 'Start from day one in a real conference. A fair trade of spotlight for reps.' });
  offers.push({ ...pick(COLLEGES.small), tier: 'small', pitch: 'Small stage, huge role. The ball is in your hands every possession.' });
  return offers;
}

export function chooseSport(sportId) {
  const a = S.athlete;
  if (!SPORTS[sportId]) throw new Error('bad sport');
  a.mainSport = sportId;
  S.pendingDecision = null;
  // Specialization boost: focused practice from here on
  for (const sk of SPORTS[sportId].skills) a.attrs[sk] = clamp(a.attrs[sk] + 4, 1, 99);
  logJournal(`Committed to ${SPORTS[sportId].name}. The other sports become memories — and motor skills.`, true);
  save();
}

export function chooseCollege(offerIdx) {
  const a = S.athlete;
  const offer = S.pendingDecision.offers[offerIdx];
  a.college = offer;
  S.pendingDecision = { type: 'position' };
  logJournal(`Signed with ${offer.name}. ${offer.style}.`, true);
  save();
  return offer;
}

export function choosePosition(posId) {
  const a = S.athlete;
  const sport = SPORTS[a.mainSport];
  if (!sport.positions[posId]) throw new Error('bad position');
  a.position = posId;
  S.pendingDecision = null;
  logJournal(`Locked in at ${sport.positions[posId].name}. Now the real specialization begins.`, true);
  save();
}

function runDraft() {
  const a = S.athlete;
  const league = PRO_LEAGUE[a.mainSport];
  // Draft stock: college production + rating + prestige of program
  const prestige = a.college?.tier === 'power' ? 1.15 : a.college?.tier === 'mid' ? 1.0 : 0.88;
  const collegeSeasons = S.career.seasons.filter((s) => s.era === 'college');
  const avgPerf = collegeSeasons.length
    ? collegeSeasons.reduce((s, x) => s + x.avgPerf, 0) / collegeSeasons.length : 45;
  const stock = computeRating() * 0.6 + avgPerf * 0.5 * prestige + S.career.trophies.length * 4;
  let round, pickNo;
  if (stock >= 78) { round = 1; pickNo = irnd(1, 5); }
  else if (stock >= 68) { round = 1; pickNo = irnd(6, 20); }
  else if (stock >= 58) { round = 2; pickNo = irnd(1, 20); }
  else { round = 0; pickNo = 0; }
  const team = pick(league.teams);
  a.proTeam = team;
  a.draft = { round, pickNo, team };
  S.rp += round === 1 ? 400 : round === 2 ? 200 : 60;
  if (round >= 1) {
    logJournal(`Drafted round ${round}, pick ${pickNo} by the ${team}. Phone hasn’t stopped buzzing.`, true);
  } else {
    logJournal(`Undrafted — but the ${team} called with a training-camp invite. Chip, meet shoulder.`, true);
  }
  return { round, pickNo, team, league: league.league };
}

/* ---------------- Training ---------------- */
export function availableDrills() {
  const a = S.athlete;
  const eraIdx = ERAS.indexOf(a.era);
  return DRILLS.filter((d) => {
    if (d.sport) {
      if (a.era === 'youth') { if (!a.youthSports.includes(d.sport)) return false; }
      else if (a.mainSport !== d.sport) return false;
    }
    if (d.pos && d.pos !== a.position) return false;
    return true;
  }).map((d) => ({
    ...d,
    locked: ERAS.indexOf(ERAS[d.era]) > eraIdx || d.fac > S.owned.facility
      || (d.era > eraIdx),
    lockReason: d.era > eraIdx ? `Unlocks in ${ERA_INFO[ERAS[d.era]].name}` : d.fac > S.owned.facility ? `Needs ${FACILITIES[d.fac].name}` : null,
  }));
}

export function coachMultFor(attrKey) {
  const a = S.athlete;
  let mult = 1;
  for (const c of COACHES) {
    const tier = S.owned.coaches[c.id] || 0;
    if (!tier) continue;
    const t = c.tiers[tier - 1];
    if (Array.isArray(c.attrs) && c.attrs.includes(attrKey)) mult += t.mult;
    else if (c.attrs === 'sport' && a.mainSport && SPORTS[a.mainSport].skills.includes(attrKey)) mult += t.mult;
    else if (c.attrs === 'sport' && !a.mainSport && !PHYS_KEYS.includes(attrKey)) mult += t.mult * 0.5;
  }
  return mult;
}

export function train(drillId) {
  const a = S.athlete;
  const d = DRILLS.find((x) => x.id === drillId);
  if (!d) return { error: 'Unknown drill' };
  if (S.today.trained.length >= S.today.sessionsMax) return { error: 'No sessions left today. Sleep on it.' };
  if (a.energy < d.energy) return { error: 'Not enough energy today.' };
  if (a.injury && d.intensity > 1) return { error: `Injured (${a.injury.name}) — only light work allowed.` };

  const recovery = S.today.recovery;
  const rMult = recoveryMult(recovery);
  const fMult = 1 + FACILITIES[S.owned.facility].mult;
  const posCoach = S.owned.coaches['c_position'] || 0;
  const posMult = d.pos && posCoach ? 1 + COACHES.find((c) => c.id === 'c_position').tiers[posCoach - 1].mult : 1;
  const moraleMult = 0.9 + (a.morale / 100) * 0.2;
  // Golden age of skill learning: kids learn skills fast, adults slower
  const gains = {};
  for (const [k, base] of Object.entries(d.targets)) {
    const isSkill = !PHYS_KEYS.includes(k);
    const ageCurve = isSkill
      ? (a.age < 15 ? 1.3 : a.age < 22 ? 1.1 : a.age < 28 ? 0.9 : 0.7)
      : (a.age < 12 ? 0.8 : a.age < 27 ? 1.1 : 0.75);
    const growth = 1 + (a.growthBonus[k] || 0);
    const cap = a.caps[k];
    const capMult = Math.max(0.05, 1 - Math.pow(a.attrs[k] / cap, 3));
    let g = base * rMult * fMult * posMult * moraleMult * ageCurve * growth * capMult * coachMultFor(k);
    g = Math.round(g * 10) / 10;
    if (g > 0) { a.attrs[k] = clamp(a.attrs[k] + g, 1, cap); gains[k] = g; }
  }

  a.energy -= d.energy;
  a.fatigue = clamp(a.fatigue + d.intensity * 2.2, 0, 100);
  if (d.recovery) a.fatigue = clamp(a.fatigue - d.recovery, 0, 100);
  S.today.trained.push(d.id);

  // Injury roll: intensity × fatigue × poor recovery
  let injury = null;
  const risk = d.intensity * (a.fatigue / 130) * (1 - recovery / 130) * 0.05;
  if (Math.random() < risk) {
    injury = { name: pick(['ankle sprain', 'hamstring strain', 'shin splints', 'shoulder tweak', 'knee tendinitis']), daysLeft: irnd(2, 6) };
    a.injury = injury;
    a.morale = clamp(a.morale - 8, 0, 100);
    logJournal(`Went down in training — ${injury.name}. ${injury.daysLeft} days out. Poor recovery catches up with you.`);
  }

  save();
  return { gains, injury, drill: d };
}

/* Recommended plan: best expected value per energy for current build */
export function recommendDrills() {
  const w = activeWeights() || Object.fromEntries(PHYS_KEYS.map((k) => [k, 1 / 6]));
  const avail = availableDrills().filter((d) => !d.locked);
  const scored = avail.map((d) => {
    let v = 0;
    for (const [k, base] of Object.entries(d.targets)) {
      const capMult = Math.max(0.05, 1 - Math.pow(S.athlete.attrs[k] / S.athlete.caps[k], 3));
      v += base * (w[k] || 0.02) * capMult;
    }
    return { d, v: v / d.energy };
  }).sort((x, y) => y.v - x.v);
  return scored.map((x) => x.d);
}

export function autoTrain() {
  const plan = recommendDrills();
  const results = [];
  for (const d of plan) {
    if (S.today.trained.length >= S.today.sessionsMax) break;
    if (S.athlete.energy < d.energy) continue;
    if (S.athlete.injury && d.intensity > 1) continue;
    if (S.athlete.fatigue > 68 && d.intensity >= 2) continue; // protect the body when running hot
    if (S.athlete.fatigue > 88) break;
    const r = train(d.id);
    if (!r.error) results.push(r);
    if (r.injury) break;
  }
  return results;
}

/* ---------------- Competition ---------------- */
export function isGameDay() {
  const a = S.athlete;
  if (S.today.gamePlayed) return false;
  const d = a.dayOfYear;
  if (a.era === 'youth') return [3, 6, 9, 12].includes(d);
  if (a.era === 'hs' || a.era === 'college') return [4, 7, 10, 13, 16].includes(d);
  return [3, 5, 7, 9, 11, 13, 15, 17, 19].includes(d);
}

export function nextOpponent() {
  return pick(OPPONENTS[S.athlete.era]);
}

function oppRating() {
  const a = S.athlete;
  const base = { youth: 20, hs: 38, college: 53, pro: 64 }[a.era];
  const ramp = a.dayOfYear * 0.35 + (a.age - { youth: 8, hs: 14, college: 18, pro: 22 }[a.era]) * 0.8;
  const collegeMod = a.era === 'college' && a.college?.tier === 'power' ? 4 : 0;
  return base + ramp + collegeMod + rnd(-4, 4);
}

export function playGame() {
  const a = S.athlete;
  if (!isGameDay()) return { error: 'No game scheduled today.' };
  if (a.injury) return { error: 'You’re injured — no game today.' };
  if (a.energy < 2) return { error: 'Too exhausted to play (need 2 energy).' };

  a.energy -= 2;
  const isYouth = a.era === 'youth';
  const sport = isYouth ? pick(a.youthSports.filter((s) => SPORTS[s])) || 'basketball' : a.mainSport;
  const spec = SPORTS[sport];
  const weights = !isYouth && a.position ? spec.positions[a.position].weights : spec.baseWeights;
  const rating = computeRating(weights);

  const energyPct = clamp((a.energy + 2) / 10, 0, 1);
  const recovery = S.today.recovery;
  const perf = rating
    * (0.82 + 0.28 * (recovery / 100))
    * (0.97 + a.form / 1500)
    * (1 - a.fatigue / 450)
    * (0.97 + energyPct * 0.06)
    + rnd(-6, 6);

  const opp = oppRating();
  const winProb = 1 / (1 + Math.exp(-(perf - opp) / 7));
  const win = Math.random() < winProb;
  const bias = (!isYouth && a.position) ? spec.positions[a.position].statBias : { a: 1, b: 1, c: 1 };
  const line = statLine(sport, perf, bias);

  S.season.games += 1;
  S.season[win ? 'wins' : 'losses'] += 1;
  S.season.statA += line.a; S.season.statB += line.b; S.season.statC += line.c;
  S.career.games += 1; if (win) S.career.wins += 1;
  S.career.statA += line.a; S.career.statB += line.b; S.career.statC += line.c;
  a.fatigue = clamp(a.fatigue + 7, 0, 100);
  a.form = clamp(a.form + (win ? 4 : -3), 0, 100);
  a.morale = clamp(a.morale + (win ? 5 : -2), 0, 100);
  a.reputation += win ? 2 : 1;
  const rpWin = win ? irnd(8, 16) : irnd(2, 6);
  S.rp += rpWin;
  S.today.gamePlayed = true;

  const opponent = nextOpponent();
  const result = {
    win, sport, perf: Math.round(perf), opp: Math.round(opp), line,
    labels: spec.statLabels, opponent, rp: rpWin,
    star: perf > opp + 10,
  };
  S.season.lastResult = result;
  S.season.perfSum = (S.season.perfSum || 0) + perf;

  logJournal(`${win ? 'W' : 'L'} vs ${opponent} — ${lineText(sport, line, spec.statLabels)}.`);
  save();
  return result;
}

function statLine(sport, perf, bias) {
  const p = clamp(perf, 5, 110) / 100;
  if (sport === 'basketball') {
    return {
      a: Math.max(0, Math.round(p * 26 * bias.a + rnd(-4, 5))),
      b: Math.max(0, Math.round(p * 10 * bias.b + rnd(-2, 3))),
      c: Math.max(0, Math.round(p * 9 * bias.c + rnd(-2, 3))),
    };
  }
  if (sport === 'soccer') {
    const g = p * 1.6 * bias.a + rnd(-0.9, 0.6);
    const as = p * 1.3 * bias.b + rnd(-0.7, 0.5);
    return {
      a: Math.max(0, Math.round(g)),
      b: Math.max(0, Math.round(as)),
      c: Math.round(clamp(5 + p * 4.5 * bias.c + rnd(-0.6, 0.6), 4, 10) * 10) / 10, // match rating
    };
  }
  // football (also fallback for non-main youth sports)
  return {
    a: Math.max(0, Math.round(p * 110 * bias.a + rnd(-15, 20))),
    b: Math.max(0, Math.round(p * 1.8 * bias.b + rnd(-0.8, 0.6))),
    c: Math.round(clamp(p * 100 * bias.c, 10, 118)),
  };
}

export function lineText(sport, line, labels) {
  return `${line.a} ${labels.a}, ${line.b} ${labels.b}, ${line.c} ${labels.c}`;
}

/* ---------------- Season wrap ---------------- */
function resetSeason() {
  S.season = { games: 0, wins: 0, losses: 0, statA: 0, statB: 0, statC: 0, playoffs: null, lastResult: null, perfSum: 0 };
}

function endOfSeason(morning) {
  const a = S.athlete;
  const s = S.season;
  if (s.games === 0) { resetSeason(); return; }
  const avgPerf = (s.perfSum || 0) / s.games;
  const winPct = s.wins / s.games;
  let trophy = null, award = null;

  // Playoffs: good record earns a shot (not in youth)
  if (a.era !== 'youth' && winPct >= 0.55) {
    let alive = true; const rounds = a.era === 'pro' ? 3 : 2; let won = 0;
    for (let i = 0; i < rounds && alive; i++) {
      const perf = computeRating() * (0.8 + 0.3 * Math.random()) + avgPerf * 0.2;
      const opp = oppRating() + 6 + i * 4;
      alive = perf + rnd(-5, 8) > opp;
      if (alive) won++;
    }
    if (alive) {
      trophy = a.era === 'hs' ? 'State Championship' : a.era === 'college' ? 'National Championship' : 'League Championship';
      S.career.trophies.push({ name: trophy, age: a.age });
      S.rp += 150;
      a.morale = clamp(a.morale + 15, 0, 100);
      logJournal(`🏆 ${trophy}! Confetti everywhere. Nobody sleeps tonight (worth it).`, true);
    } else {
      logJournal(`Playoff run ended after ${won} round(s). Fuel for the offseason.`);
    }
  }

  // Awards from production
  const perGame = s.statA / s.games;
  if (avgPerf > oppExpectation(a) + 5) {
    award = a.era === 'hs' ? 'All-State' : a.era === 'college' ? 'All-American' : 'All-League';
    S.career.awards.push({ name: award, age: a.age });
    S.rp += 80;
    logJournal(`Named ${award}. The work in the dark is showing up in the light.`, true);
  }

  S.career.seasons.push({
    era: a.era, age: a.age, games: s.games, wins: s.wins, losses: s.losses,
    statA: s.statA, statB: s.statB, statC: s.statC, avgPerf: Math.round(avgPerf),
    trophy, award, sport: a.mainSport,
  });

  morning.push({
    type: 'season', record: `${s.wins}–${s.losses}`, trophy, award,
    perGame: Math.round(perGame * 10) / 10,
  });

  // Pro contract & retirement checks
  if (a.era === 'pro') {
    const proYears = S.career.seasons.filter((x) => x.era === 'pro').length;
    S.rp += 120 + Math.round(avgPerf); // salary
    if (proYears >= 3 && (proYears - 3) % 3 === 0 && a.age < 33) {
      const value = avgPerf > 70 ? 'max' : avgPerf > 55 ? 'solid' : 'minimum';
      S.rp += value === 'max' ? 600 : value === 'solid' ? 300 : 100;
      logJournal(`Signed a new ${value} contract. Security for the family.`, true);
    }
    if (a.age >= 34 || (a.age >= 30 && computeRating() < 55)) {
      S.pendingDecision = { type: 'retire' };
      morning.push({ type: 'decision', decision: 'retire' });
    }
  }
  resetSeason();
}

function oppExpectation(a) {
  return { youth: 25, hs: 43, college: 58, pro: 70 }[a.era];
}

export function retire(confirm) {
  const a = S.athlete;
  if (!confirm) { // play one more year
    S.pendingDecision = null;
    logJournal('One more year. The fire still burns.', true);
    save();
    return null;
  }
  a.retired = true;
  S.pendingDecision = null;
  const legacy = legacyScore();
  logJournal(`Retired at ${a.age}. ${legacy.title}. What a ride.`, true);
  save();
  return legacy;
}

export function legacyScore() {
  const c = S.career;
  const pts = c.wins * 2 + c.trophies.length * 120 + c.awards.length * 60
    + (S.athlete.draft?.round === 1 ? 80 : 0) + Math.round(c.statA / 10);
  let title = 'Journeyman';
  if (pts > 1400) title = 'Hall of Famer';
  else if (pts > 900) title = 'Franchise Legend';
  else if (pts > 550) title = 'All-League Regular';
  else if (pts > 300) title = 'Solid Pro';
  return { pts, title, trophies: c.trophies, awards: c.awards };
}

/* ---------------- Economy ---------------- */
export function buyCoach(id) {
  const c = COACHES.find((x) => x.id === id);
  const cur = S.owned.coaches[id] || 0;
  if (cur >= c.tiers.length) return { error: 'Maxed out.' };
  const t = c.tiers[cur];
  if (S.rp < t.cost) return { error: 'Not enough RP.' };
  S.rp -= t.cost;
  S.owned.coaches[id] = cur + 1;
  logJournal(`Hired ${c.name}${cur ? ` (tier ${cur + 1})` : ''}. Investment in the craft.`);
  save();
  return { ok: true };
}

export function buyFacility() {
  const next = FACILITIES[S.owned.facility + 1];
  if (!next) return { error: 'You already train at the best lab there is.' };
  if (S.rp < next.cost) return { error: 'Not enough RP.' };
  S.rp -= next.cost;
  S.owned.facility += 1;
  logJournal(`Now training at ${next.name}.`, true);
  save();
  return { ok: true };
}

export function buyGear(id) {
  const g = GEAR.find((x) => x.id === id);
  if (S.owned.gear[id]) return { error: 'Already owned.' };
  if (S.rp < g.cost) return { error: 'Not enough RP.' };
  S.rp -= g.cost;
  S.owned.gear[id] = true;
  logJournal(`Picked up: ${g.name}.`);
  save();
  return { ok: true };
}

export function useService(id) {
  const sv = SERVICES.find((x) => x.id === id);
  if (S.rp < sv.cost) return { error: 'Not enough RP.' };
  const a = S.athlete;
  if (sv.effect === 'energy') a.energy += sv.amount;
  if (sv.effect === 'fatigue') a.fatigue = clamp(a.fatigue - sv.amount, 0, 100);
  if (sv.effect === 'injury') {
    if (!a.injury) return { error: 'You’re healthy — save it for when it hurts.' };
    a.injury.daysLeft = Math.max(0, a.injury.daysLeft - sv.amount);
    if (a.injury.daysLeft === 0) a.injury = null;
  }
  S.rp -= sv.cost;
  save();
  return { ok: true };
}

/* ---------------- Choice events ---------------- */
function maybeChoiceEvent(morning) {
  if (Math.random() > 0.30) return;
  const pool = CHOICE_EVENTS[S.athlete.era];
  const ev = pick(pool);
  morning.push({ type: 'choice', event: ev });
}

export function resolveChoice(ev, key) {
  const opt = ev[key];
  if (!opt) return;
  const a = S.athlete;
  a.morale = clamp(a.morale + (opt.morale || 0), 0, 100);
  S.sleep.pendingMod = (S.sleep.pendingMod || 0) + (opt.sleepMod || 0);
  // Habits drift with repeated choices
  a.habit = clamp(a.habit + (opt.sleepMod >= 0 ? 1.2 : -1.2), -20, 20);
  if (opt.rp) S.rp += opt.rp;
  if (opt.rep) a.reputation += opt.rep;
  logJournal(`${ev.title}: ${opt.label}.`);
  save();
}

/* ---------------- Sleep provider management ---------------- */
export function setProvider(p) { S.sleep.provider = p; save(); }
export function queueImportedNights(nights) {
  S.sleep.importQueue.push(...nights);
  save();
}
export { describeScore };
