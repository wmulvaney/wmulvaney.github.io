/* ============================================================
   SLEEPER — game engine
   Owns the save state, the day loop, training math, the game
   sim, and career progression (youth → HS → college → pro).
   Sleep & recovery are the master multipliers on everything.
   ============================================================ */

import {
  ATTRS, PHYS_KEYS, YOUTH_SPORTS, SPORTS, DRILLS, ERAS, ERA_INFO,
  COACHES, FACILITIES, GEAR, SERVICES, COLLEGES, PRO_LEAGUE,
  CHOICE_EVENTS, OPPONENTS, RIVAL_NAMES, MATE_NAMES, BADGES, CONTRACT_OFFERS,
} from './data.js';
import {
  simulateNight, computeRecovery, recoveryMult,
  ENERGY_CAP, energyFromSleep, regenPerMinute,
} from './sleep.js';

const SAVE_KEY = 'sleeper.save.v1';
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
  try {
    if (S?.meta) S.meta.updated = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) { /* storage full/blocked */ }
}
export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) S = JSON.parse(raw);
  } catch (e) { S = null; }
  migrate();
  return S;
}
export function resetGame() { S = null; localStorage.removeItem(SAVE_KEY); }
export const exportSave = () => JSON.stringify(S, null, 2);
export function importSave(json) {
  const parsed = JSON.parse(json);
  if (!parsed || !parsed.athlete || !parsed.meta) throw new Error('Not a SLEEPER save file');
  S = parsed; save();
}

export function createGame({ name, youthSports, provider, look }) {
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
      look: look || null,
      attrs, caps, growthBonus: grow,
      energy: 8,
      fatigue: 10, morale: 70, form: 60, reputation: 0,
      injury: null,
      habit: 0, // sleep hygiene drift −20..+20
      retired: false,
    },
    rp: 30,
    sleep: { provider: provider || 'demo', history: [], streak: 0, pendingMod: 0, importQueue: [] },
    today: { recovery: 70, sleepScore: 75, trained: [], gamePlayed: false, regen: regenPerMinute(75), energyAt: Date.now() },
    owned: { coaches: {}, facility: 0, gear: {} },
    season: { games: 0, wins: 0, losses: 0, statA: 0, statB: 0, statC: 0, lastResult: null, perfSum: 0 },
    career: { games: 0, wins: 0, statA: 0, statB: 0, statC: 0, seasons: [], trophies: [], awards: [] },
    journal: [],
    pendingDecision: null,
    rival: { name: pick(RIVAL_NAMES), w: 0, l: 0 },
    team: null,
    badges: [],
    feed: [],
    records: { highA: 0, highB: 0, highC: 0, winStreak: 0, curStreak: 0, bestSleepStreak: 0 },
    achievements: [],
    goals: null,
    goalNews: [],
    tutorial: 0,
    settings: { sound: true, notify: false },
    sync: { url: '', token: '', lastDate: '', status: '' },
  };
  S.goals = newGoals();
  initSeasonTable();
  newTeam();
  logJournal(`${name}'s story begins in the backyard, age 8. Three sports, endless summer.`, true);
  logJournal(`A kid named ${S.rival.name} from across town plays all the same sports. You two are going to see a lot of each other.`, true);
  save();
  return S;
}

/* Older saves gain the new systems on load */
function migrate() {
  if (!S) return;
  if (!S.rival) S.rival = { name: pick(RIVAL_NAMES), w: 0, l: 0 };
  if (!S.goals) S.goals = newGoals();
  if (!S.goalNews) S.goalNews = [];
  if (S.tutorial === undefined) S.tutorial = -1; // existing players skip the intro
  if (!S.settings) S.settings = { sound: true, notify: false };
  if (!S.sync) S.sync = { url: '', token: '', lastDate: '', status: '' };
  if (!S.season.table) initSeasonTable();
  if (!S.athlete.look) S.athlete.look = null;
  if (!S.team) newTeam();
  if (!S.badges) S.badges = [];
  if (!S.feed) S.feed = [];
  if (!S.records) S.records = { highA: 0, highB: 0, highC: 0, winStreak: 0, curStreak: 0, bestSleepStreak: 0 };
  if (!S.achievements) S.achievements = [];
  delete S.pendingGame; // never resume a half-played game across loads
}

export function logJournal(text, milestone = false) {
  S.journal.unshift({ day: S.athlete.day, age: S.athlete.age, era: S.athlete.era, text, milestone });
  if (S.journal.length > 400) S.journal.length = 400;
}

/* ---------------- Derived values ---------------- */
export function gearBonuses() {
  let sleep = 0, recovery = 0;
  for (const g of GEAR) {
    if (S.owned.gear[g.id]) {
      sleep += g.sleep || 0; recovery += g.recovery || 0;
    }
  }
  const sc = S.owned.coaches['c_sleep'] || 0;
  if (sc > 0) recovery += COACHES.find((c) => c.id === 'c_sleep').tiers[sc - 1].bonus;
  return { sleep, recovery };
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
  const rpEarn = rpGain(Math.floor(night.score / 10) + (S.sleep.streak >= 7 ? 6 : S.sleep.streak >= 3 ? 2 : 0));
  S.rp += rpEarn;
  a.energy = energyFromSleep(night.score);
  a.form = Math.round(clamp(a.form * 0.7 + recovery * 0.3, 0, 100));
  a.morale = clamp(a.morale + (58 - a.morale) * 0.05, 0, 100); // drift back to baseline

  goalProgress('sleep', night.score);
  goalProgress('streak', S.sleep.streak);
  if (S.records) {
    S.records.bestSleepStreak = Math.max(S.records.bestSleepStreak, S.sleep.streak);
    if (S.sleep.streak === 7) feedPost(`${a.name}'s secret? Seven straight elite nights of sleep. The recovery game is real.`, 1);
  }
  checkAchievements();
  night.day = a.day; night.recovery = recovery; night.rpEarn = rpEarn;
  S.sleep.history.push(night);
  if (S.sleep.history.length > 60) S.sleep.history.shift();
  S.today = { recovery, sleepScore: night.score, trained: [], gamePlayed: false, rpEarn, regen: regenPerMinute(night.score), energyAt: Date.now() };

  // Injury countdown
  if (a.injury) {
    a.injury.daysLeft -= 1;
    if (a.injury.daysLeft <= 0) {
      logJournal(`Back from the ${a.injury.name}. Feels good to move again.`);
      a.injury = null;
      a.rustGames = 1;
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

  // Fresh coach goals every 7 game days
  if (S.goals && a.day - S.goals.setDay >= 7) {
    const cleared = S.goals.items.filter((g) => g.done).length;
    S.goals = newGoals();
    S.goals.setDay = a.day;
    if (cleared) logJournal(`New week, new goals from coach (${cleared}/3 cleared last week).`);
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
  initSeasonTable();
  newTeam();
  if (newEra === 'hs') {
    S.pendingDecision = { type: 'sport' };
    morning.push({ type: 'decision', decision: 'sport' });
    logJournal('First day of high school. Time to choose a path.', true);
    logJournal(`${S.rival.name} enrolled across town at your future rivals. Of course.`, true);
  } else if (newEra === 'college') {
    const offers = generateOffers();
    S.pendingDecision = { type: 'college', offers };
    morning.push({ type: 'decision', decision: 'college' });
    logJournal('Senior season is over. Offer letters are on the kitchen table.', true);
    feedPost(`Recruiting: where will ${S.athlete.name} land? ${starRating()}-star prospect down to final offers.`, 1);
  } else if (newEra === 'pro') {
    const result = runDraft();
    morning.push({ type: 'draft', result });
    const ahead = S.rival.w >= S.rival.l;
    logJournal(`${S.rival.name} ${ahead ? 'went one pick before you. One.' : 'slipped to the second round. You noticed.'}`, true);
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
    locked: d.era > eraIdx || d.fac > S.owned.facility,
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

/* Energy refills through the real day; faster after better nights. */
export function syncEnergy() {
  if (!S || S.athlete.retired || !S.today.energyAt) return;
  const now = Date.now();
  const mins = Math.max(0, (now - S.today.energyAt) / 60000);
  S.today.energyAt = now;
  if (mins === 0 || S.athlete.energy >= ENERGY_CAP) return;
  const before = S.athlete.energy;
  S.athlete.energy = Math.min(ENERGY_CAP, S.athlete.energy + mins * (S.today.regen || 0.2) * (hasBadge('smooth') ? 1.15 : 1));
  if (Math.floor(S.athlete.energy) !== Math.floor(before)) save();
}

/* One attribute gain with every modifier applied (recovery, facility,
   morale, age curve, childhood growth bonuses, potential cap, coaches). */
function applyGain(k, base) {
  const a = S.athlete;
  const rMult = recoveryMult(S.today.recovery);
  const fMult = 1 + FACILITIES[S.owned.facility].mult;
  const moraleMult = 0.9 + (a.morale / 100) * 0.2;
  const isSkill = !PHYS_KEYS.includes(k);
  // Golden age of skill learning: kids learn skills fast, adults slower
  const ageCurve = isSkill
    ? (a.age < 15 ? 1.3 : a.age < 22 ? 1.1 : a.age < 28 ? 0.9 : 0.7)
    : (a.age < 12 ? 0.8 : a.age < 27 ? 1.1 : 0.75);
  const growth = 1 + (a.growthBonus[k] || 0);
  const cap = a.caps[k];
  const capMult = Math.max(0.05, 1 - Math.pow(a.attrs[k] / cap, 3));
  let g = base * rMult * fMult * moraleMult * ageCurve * growth * capMult * coachMultFor(k);
  g = Math.round(g * 10) / 10;
  if (g > 0) a.attrs[k] = clamp(a.attrs[k] + g, 1, cap);
  return g;
}

export function train(drillId) {
  syncEnergy();
  const a = S.athlete;
  const d = DRILLS.find((x) => x.id === drillId);
  if (!d) return { error: 'Unknown drill' };
  if (a.energy < d.energy) return { error: 'Not enough energy today.' };
  if (a.injury && d.intensity > 1) return { error: `Injured (${a.injury.name}) — only light work allowed.` };

  const posCoach = S.owned.coaches['c_position'] || 0;
  const posMult = d.pos && posCoach ? 1 + COACHES.find((c) => c.id === 'c_position').tiers[posCoach - 1].mult : 1;
  const gains = {};
  for (const [k, base] of Object.entries(d.targets)) {
    const g = applyGain(k, base * posMult);
    if (g > 0) gains[k] = g;
  }

  a.energy -= d.energy;
  goalProgress('drill');
  a.fatigue = clamp(a.fatigue + d.intensity * (hasBadge('motor') ? 1.75 : 2.2), 0, 100);
  if (d.recovery) a.fatigue = clamp(a.fatigue - d.recovery, 0, 100);
  S.today.trained.push(d.id);

  // Injury roll: intensity × fatigue × poor recovery
  let injury = null;
  const risk = d.intensity * (a.fatigue / 130) * (1 - S.today.recovery / 130) * 0.05 * (hasBadge('ironbody') ? 0.6 : 1);
  if (Math.random() < risk) {
    injury = { name: pick(['ankle sprain', 'hamstring strain', 'shin splints', 'shoulder tweak', 'knee tendinitis']), daysLeft: irnd(2, 6) };
    a.injury = injury;
    a.morale = clamp(a.morale - 8, 0, 100);
    logJournal(`Went down in training — ${injury.name}. ${injury.daysLeft} days out. Poor recovery catches up with you.`);
  }

  checkBadges();
  checkAchievements();
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
    if (S.today.trained.length >= 3) break; // auto-train keeps a sane daily volume
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

/* ---------------- Live games ----------------
   Two phases so halftime is a real decision:
   startGame() -> halftime score + situation
   finishGame(choice) -> second half, final result, all bookkeeping.
   playGame() wraps both for quick-sim.                          */
function scorePair(sport, edge, scale = 1) {
  if (sport === 'soccer') {
    const them = Math.max(0, Math.round(rnd(0, 1.4) * scale));
    return [Math.max(0, them + Math.round(edge / 10)), them];
  }
  if (sport === 'football') {
    const them = Math.round((10 + rnd(0, 10)) * scale);
    return [Math.max(0, them + Math.round(edge * 0.45 * scale)), them];
  }
  const them = Math.round((26 + rnd(0, 8)) * scale);
  return [Math.max(0, them + Math.round(edge * 0.55 * scale)), them];
}

export function startGame(meterBonus = 0) {
  syncEnergy();
  const a = S.athlete;
  if (S.pendingGame) delete S.pendingGame;
  if (!isGameDay()) return { error: 'No game scheduled today.' };
  let playingHurt = false;
  if (a.injury) {
    if (a.injury.daysLeft > 2) return { error: 'You’re injured — no game today.' };
    playingHurt = true; // cleared for limited minutes
  }
  if (a.energy < 2) return { error: 'Too exhausted to play (need 2 energy).' };

  a.energy -= 2;
  const rivalGame = Math.random() < 0.24;
  const isYouth = a.era === 'youth';
  const sport = isYouth ? pick(a.youthSports.filter((x) => SPORTS[x])) || 'basketball' : a.mainSport;
  const spec = SPORTS[sport];
  const weights = !isYouth && a.position ? spec.positions[a.position].weights : spec.baseWeights;
  const rating = computeRating(weights);

  const energyPct = clamp((a.energy + 2) / 10, 0, 1);
  const recovery = S.today.recovery;
  let perf = rating
    * (0.82 + 0.28 * (recovery / 100))
    * (0.97 + a.form / 1500)
    * (1 - a.fatigue / 450)
    * (0.97 + energyPct * 0.06)
    + rnd(-6, 6)
    + meterBonus;
  if (playingHurt) perf -= 8;
  if (a.rustGames > 0) perf -= 5;

  const opp = oppRating() + (rivalGame ? 3 : 0);
  const team = teamStrength();
  const halfEdge = (perf * 0.55 + team * 0.45 - opp) * 0.5;
  const half = scorePair(sport, halfEdge, 0.48);
  const opponent = nextOpponent();

  S.pendingGame = { sport, perf, team, opp, rivalGame, playingHurt, half, opponent, meterBonus };
  save();
  return {
    sport, opponent, rivalGame, playingHurt,
    half: { you: half[0], them: half[1] },
    labels: spec.statLabels,
    rivalName: rivalGame ? S.rival.name : null,
    bestMate: S.team.mates[0].name,
    chemistry: S.team.chemistry,
  };
}

export function finishGame(choice = 'trust') {
  const g = S.pendingGame;
  if (!g) return { error: 'No game in progress.' };
  delete S.pendingGame;
  const a = S.athlete;
  const spec = SPORTS[g.sport];

  let { perf, team, opp } = g;
  if (choice === 'takeover') { perf += 4; a.fatigue = clamp(a.fatigue + 4, 0, 100); }
  else if (choice === 'trust') { team += 4; bumpChemistry(2); }
  else if (choice === 'lockdown') { opp -= 4; }

  const total = perf * 0.55 + team * 0.45;
  const winProb = 1 / (1 + Math.exp(-(total - opp) / 7));
  const win = Math.random() < winProb;
  const isYouth = a.era === 'youth';
  const bias = (!isYouth && a.position) ? spec.positions[a.position].statBias : { a: 1, b: 1, c: 1 };
  const line = statLine(g.sport, perf, bias);

  // final score built on the halftime score
  const secondEdge = (total - opp) * 0.55;
  const second = scorePair(g.sport, secondEdge, 0.52);
  let you = g.half[0] + second[0], them = g.half[1] + second[1];
  if (win && you <= them) you = them + (g.sport === 'soccer' ? 1 : irnd(1, 4));
  if (!win && you >= them) them = you + (g.sport === 'soccer' ? 1 : irnd(1, 3));

  // bookkeeping
  S.season.games += 1;
  S.season[win ? 'wins' : 'losses'] += 1;
  S.season.statA += line.a; S.season.statB += line.b; S.season.statC += line.c;
  S.career.games += 1; if (win) S.career.wins += 1;
  S.career.statA += line.a; S.career.statB += line.b; S.career.statC += line.c;
  a.fatigue = clamp(a.fatigue + (hasBadge('motor') ? 5.6 : 7), 0, 100);
  a.form = clamp(a.form + (win ? 4 : -3), 0, 100);
  a.morale = clamp(a.morale + (win ? 5 : -2), 0, 100);
  a.reputation += win ? 2 : 1;
  bumpChemistry(win ? 2 : -1);
  const rpWin = rpGain(win ? irnd(8, 16) : irnd(2, 6));
  S.rp += rpWin;
  S.today.gamePlayed = true;

  // records
  const R = S.records;
  R.highA = Math.max(R.highA, line.a); R.highB = Math.max(R.highB, line.b); R.highC = Math.max(R.highC, line.c);
  R.curStreak = win ? R.curStreak + 1 : 0;
  R.winStreak = Math.max(R.winStreak, R.curStreak);

  if (g.rivalGame) { if (win) S.rival.w++; else S.rival.l++; }
  tickSeasonTable(win);
  goalProgress('win', win ? 1 : 0);

  // playing hurt can aggravate; rust burns off
  let aggravated = false;
  if (g.playingHurt && a.injury && Math.random() < 0.18) {
    a.injury.daysLeft += 3;
    aggravated = true;
  }
  if (a.rustGames > 0) a.rustGames--;

  const carried = team > perf + 5 && win;
  const star = perf > opp + 10;
  const mate = pick(S.team.mates).name;

  if (star) feedPost(`${line.a} ${spec.statLabels.a} for ${S.athlete.name} against ${g.opponent}. Different gravity.`, 1);
  else if (win && g.rivalGame) feedPost(`${S.athlete.name} gets the better of ${S.rival.name} this time. ${S.rival.w}–${S.rival.l} all-time.`, 1);
  else if (!win && g.rivalGame) feedPost(`${S.rival.name} again. Some matchups just hurt.`, 0);
  else if (carried) feedPost(`${mate} carried the load tonight — that locker room believes in each other.`, 0);

  checkBadges();
  checkAchievements();

  const result = {
    win, sport: g.sport, perf: Math.round(perf), opp: Math.round(opp), line,
    labels: spec.statLabels, opponent: g.opponent, rp: rpWin, star,
    rival: g.rivalGame ? { name: S.rival.name, w: S.rival.w, l: S.rival.l, won: win } : null,
    meterBonus: g.meterBonus, choice, carried, mate,
    score: { you, them, half: { you: g.half[0], them: g.half[1] } },
    playingHurt: g.playingHurt, aggravated, rust: a.rustGames > 0,
  };
  S.season.lastResult = result;
  S.season.perfSum = (S.season.perfSum || 0) + perf;

  logJournal(`${win ? 'W' : 'L'} ${you}–${them} vs ${g.opponent}${g.rivalGame ? ` (${S.rival.name} on the other side)` : ''} — ${lineText(g.sport, line, spec.statLabels)}.`);
  save();
  return result;
}

export function playGame(meterBonus = 0) {
  const started = startGame(meterBonus);
  if (started.error) return started;
  return finishGame('trust');
}

/* ---------------- Injury rehab ---------------- */
export function rehab() {
  syncEnergy();
  const a = S.athlete;
  if (!a.injury) return { error: 'Nothing to rehab — you’re healthy.' };
  if (S.today.rehabbed) return { error: 'One rehab session per day.' };
  if (a.energy < 2) return { error: 'Not enough energy (needs 2).' };
  a.energy -= 2;
  S.today.rehabbed = true;
  a.injury.daysLeft = Math.max(0, a.injury.daysLeft - 1);
  a.fatigue = clamp(a.fatigue - 4, 0, 100);
  let cleared = false;
  if (a.injury.daysLeft === 0) {
    logJournal(`Rehab done — the ${a.injury.name} is behind you. Expect a little rust.`);
    a.injury = null;
    a.rustGames = 1;
    cleared = true;
  }
  save();
  return { cleared, daysLeft: a.injury?.daysLeft ?? 0 };
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
  S.season = { games: 0, wins: 0, losses: 0, statA: 0, statB: 0, statC: 0, lastResult: null, perfSum: 0 };
  initSeasonTable();
}

function endOfSeason(morning) {
  const a = S.athlete;
  const s = S.season;
  if (s.games === 0) { resetSeason(); return; }
  const avgPerf = (s.perfSum || 0) / s.games;
  const winPct = s.wins / s.games;
  let trophy = null, award = null;

  // Playoffs: good record earns a shot (not in youth)
  let bracket = null;
  if (a.era !== 'youth' && winPct >= 0.55) {
    let alive = true; const rounds = a.era === 'pro' ? 3 : 2; let won = 0;
    bracket = [];
    const roundNames = a.era === 'pro' ? ['Semifinal', 'Conference Final', 'Championship'] : ['Semifinal', 'Final'];
    for (let i = 0; i < rounds && alive; i++) {
      const perf = computeRating() * (0.8 + 0.3 * Math.random()) + avgPerf * 0.2;
      const opp = oppRating() + 6 + i * 4;
      alive = perf + rnd(-5, 8) > opp;
      bracket.push({ round: roundNames[i], opponent: nextOpponent(), win: alive });
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

  const table = standings();
  const place = table.findIndex((r) => r.you) + 1;
  morning.push({
    type: 'season', record: `${s.wins}–${s.losses}`, trophy, award,
    perGame: Math.round(perGame * 10) / 10,
    bracket, place, teams: table.length,
  });

  // Pro contract & retirement checks
  if (a.era === 'pro') {
    const proYears = S.career.seasons.filter((x) => x.era === 'pro').length;
    S.rp += 120 + Math.round(avgPerf); // salary
    if (proYears >= 3 && (proYears - 3) % 3 === 0 && a.age < 33) {
      const mult = (S.proveIt && avgPerf > 60 ? 1.6 : 1) * (avgPerf > 70 ? 1.2 : avgPerf > 55 ? 1 : 0.7);
      delete S.proveIt;
      S.pendingDecision = { type: 'contract', mult: Math.round(mult * 100) / 100 };
      morning.push({ type: 'decision', decision: 'contract' });
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

export function chooseContract(offerId) {
  const d = S.pendingDecision;
  if (!d || d.type !== 'contract') return { error: 'No contract on the table.' };
  const offer = CONTRACT_OFFERS.find((o) => o.id === offerId);
  if (!offer) return { error: 'Unknown offer.' };
  const rp = rpGain(Math.round(offer.rp * (d.mult || 1)));
  S.rp += rp;
  if (offer.chem) bumpChemistry(offer.chem);
  if (offer.mates) for (const m of S.team.mates) m.rating += offer.mates;
  if (offer.morale) S.athlete.morale = clamp(S.athlete.morale + offer.morale, 0, 100);
  if (offer.proveIt) S.proveIt = true;
  S.pendingDecision = null;
  logJournal(`Signed: ${offer.label} (+${rp} RP).`, true);
  feedPost(offer.id === 'max' ? `${S.athlete.name} gets the bag. Every dollar earned.` : offer.id === 'friendly' ? `${S.athlete.name} leaves money on the table to chase a ring. Respect.` : `${S.athlete.name} bets on ${S.athlete.name.split(' ')[0]}. Bold.`, 1);
  save();
  return { rp, offer };
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
  feedPost(`${a.name} calls it a career. ${legacy.title}. Thank you for the memories.`, 1);
  try {
    const hall = hallList();
    hall.unshift({
      name: a.name, look: a.look, title: legacy.title, pts: legacy.pts,
      trophies: S.career.trophies.length, awards: S.career.awards.length,
      games: S.career.games, wins: S.career.wins,
      draft: a.draft, rival: { ...S.rival }, records: { ...S.records },
      sport: a.mainSport, position: a.position, retiredAge: a.age, ts: Date.now(),
    });
    localStorage.setItem(HALL_KEY, JSON.stringify(hall.slice(0, 12)));
  } catch (e) { /* storage full */ }
  save();
  return legacy;
}

const HALL_KEY = 'sleeper.hall.v1';
export function hallList() {
  try { return JSON.parse(localStorage.getItem(HALL_KEY)) || []; } catch (e) { return []; }
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

/* ---------------- Teammates & chemistry ----------------
   A small squad shares the floor with you. Chemistry (0-100) rises
   with wins and pickup runs, and boosts the TEAM side of the sim —
   some nights they carry you.                                    */
function newTeam() {
  const base = { youth: 22, hs: 40, college: 56, pro: 68 }[S.athlete.era];
  const names = [...MATE_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
  S.team = {
    mates: names.map((n) => ({ name: n, rating: Math.round(base + rnd(-6, 8)) })),
    chemistry: 40,
  };
}

function teamStrength() {
  if (!S.team) newTeam();
  const avg = S.team.mates.reduce((x, m) => x + m.rating, 0) / S.team.mates.length;
  return avg * (0.92 + (S.team.chemistry / 100) * 0.16);
}

function bumpChemistry(n) {
  if (S.team) S.team.chemistry = clamp(S.team.chemistry + n, 0, 100);
}

/* ---------------- Badges ---------------- */
export function earnedBadges() {
  return BADGES.filter((b) => b.test(S.athlete.attrs));
}
export function hasBadge(id) {
  return BADGES.some((b) => b.id === id && b.test(S.athlete.attrs));
}
function checkBadges() {
  for (const b of earnedBadges()) {
    if (!S.badges.includes(b.id)) {
      S.badges.push(b.id);
      S.goalNews.push(`Badge earned: ${b.ico} ${b.name} — ${b.desc}`);
      feedPost(`${S.athlete.name} is different lately. Scouts are whispering about the ${b.name.toLowerCase()}.`, 1);
    }
  }
}
function rpGain(n) {
  return Math.round(n * (hasBadge('professor') ? 1.1 : 1));
}

/* ---------------- The Feed ----------------
   A local-media/social feed reacting to your career. Shown on the
   house TV and at the media desk.                                */
function feedPost(text, hot = 0) {
  const likes = irnd(3, 15) + Math.round(S.athlete.reputation * (0.5 + hot)) + (hot ? irnd(20, 80) : 0);
  S.feed.unshift({ day: S.athlete.day, age: S.athlete.age, text, likes });
  if (S.feed.length > 30) S.feed.length = 30;
}

/* ---------------- Records & achievements ---------------- */
const ACHIEVEMENTS = [
  { id: 'first_w', name: 'First win', test: () => S.career.wins >= 1 },
  { id: 'ten_w', name: '10 career wins', test: () => S.career.wins >= 10 },
  { id: 'fifty_w', name: '50 career wins', test: () => S.career.wins >= 50 },
  { id: 'streak5', name: '5-game win streak', test: () => S.records.winStreak >= 5 },
  { id: 'sleep7', name: '7-night sleep streak', test: () => S.records.bestSleepStreak >= 7 },
  { id: 'sleep21', name: '21-night sleep streak', test: () => S.records.bestSleepStreak >= 21 },
  { id: 'rich', name: '5,000 RP banked', test: () => S.rp >= 5000 },
  { id: 'maxed', name: 'A skill at 90+', test: () => Object.values(S.athlete.attrs).some((v) => v >= 90) },
];
function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!S.achievements.includes(a.id) && a.test()) {
      S.achievements.push(a.id);
      S.rp += 25;
      S.goalNews.push(`Achievement: ${a.name} (+25 RP)`);
    }
  }
}

/* ---------------- Weekly coach goals ----------------
   Three rotating objectives per game-week; each pays RP, and
   clearing all three pays a bonus. Progress hooks live in
   advanceDay / playGame / train / playPickup.               */
const GOAL_TEMPLATES = [
  { id: 'sleep80', text: 'Post two 80+ sleep scores', target: 2, rp: 30, on: 'sleep', test: (v) => v >= 80 },
  { id: 'sleep70', text: 'Post three 70+ sleep scores', target: 3, rp: 25, on: 'sleep', test: (v) => v >= 70 },
  { id: 'win1', text: 'Win a game', target: 1, rp: 30, on: 'win' },
  { id: 'train4', text: 'Finish four training drills', target: 4, rp: 25, on: 'drill' },
  { id: 'pickup2', text: 'Play two pickup runs', target: 2, rp: 25, on: 'pickup' },
  { id: 'streak3', text: 'Hold a 3-night sleep streak', target: 3, rp: 35, on: 'streak', test: (v) => v >= 3, absolute: true },
];

function newGoals() {
  const picks = [...GOAL_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    setDay: S ? S.athlete.day : 1,
    items: picks.map((g) => ({ ...g, progress: 0, done: false })),
  };
}

function goalProgress(kind, value = 1) {
  if (!S.goals) return;
  for (const g of S.goals.items) {
    if (g.done || g.on !== kind) continue;
    if (g.test) {
      if (g.absolute) g.progress = g.test(value) ? g.target : g.progress;
      else if (g.test(value)) g.progress += 1;
    } else {
      g.progress += value;
    }
    if (g.progress >= g.target) {
      g.done = true;
      S.rp += g.rp;
      S.goalNews.push(`Goal complete: ${g.text} (+${g.rp} RP)`);
      logJournal(`Coach's goal cleared — ${g.text}.`);
    }
  }
  if (S.goals.items.every((g) => g.done) && !S.goals.bonusPaid) {
    S.goals.bonusPaid = true;
    S.rp += 40;
    S.goalNews.push('All three goals cleared — coach bonus +40 RP');
  }
}

export function consumeGoalNews() {
  const news = S?.goalNews || [];
  if (S) S.goalNews = [];
  return news;
}

/* ---------------- Season standings ----------------
   Five named opponents track a record alongside yours, so the
   season is a table you climb rather than a lonely win count. */
function initSeasonTable() {
  const era = S.athlete.era;
  const names = [...OPPONENTS[era]].sort(() => Math.random() - 0.5).slice(0, 5);
  S.season.table = names.map((n) => ({ name: n, w: 0, l: 0 }));
}

function tickSeasonTable(playerWon) {
  if (!S.season.table) initSeasonTable();
  // opponents play each other; two random rows get a result
  const rows = S.season.table;
  const i = Math.floor(Math.random() * rows.length);
  let j = Math.floor(Math.random() * rows.length);
  if (j === i) j = (j + 1) % rows.length;
  if (Math.random() < 0.5) { rows[i].w++; rows[j].l++; } else { rows[j].w++; rows[i].l++; }
  void playerWon;
}

export function standings() {
  const rows = [...(S.season.table || []), { name: 'You', w: S.season.wins, l: S.season.losses, you: true }];
  return rows.sort((a, b) => b.w - a.w || a.l - b.l);
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
export function setSetting(key, value) { S.settings[key] = value; save(); }
export function setSync(url, token) { S.sync.url = url.trim(); S.sync.token = token.trim(); S.sync.status = ''; save(); }
export function noteSync(status, lastDate) {
  S.sync.status = status;
  if (lastDate) S.sync.lastDate = lastDate;
  save();
}
export function queueImportedNights(nights) {
  S.sleep.importQueue.push(...nights);
  save();
}

/* ---------------- Pickup games ----------------
   Spend energy on an unscheduled run at the court/park. Skills grow
   (recovery still multiplies everything), morale rises, fatigue and a
   little injury risk come along. Youth sports without a skill tree
   (track, swimming, ...) train their physical growth attributes.     */
export function playPickup(sportId, size = 'quick') {
  syncEnergy();
  const a = S.athlete;
  const cost = size === 'full' ? 10 : 5;
  if (a.retired) return { error: 'Career over.' };
  if (a.injury) return { error: `Injured (${a.injury.name}) — no pickup runs.` };
  if (a.energy < cost) return { error: `Not enough energy (needs ${cost}).` };

  a.energy -= cost;
  const intensity = size === 'full' ? 2.2 : 1;
  const spec = SPORTS[sportId];
  const gains = {};

  if (spec) {
    // 2 random sport skills + 1 physical attribute get live-play reps
    const skills = [...spec.skills].sort(() => Math.random() - 0.5).slice(0, 2);
    const phys = pick(['spd', 'agi', 'end', 'cor']);
    for (const k of skills) { const g = applyGain(k, 0.55 * intensity); if (g > 0) gains[k] = g; }
    const gp = applyGain(phys, 0.35 * intensity); if (gp > 0) gains[phys] = gp;
  } else {
    // pure-athletics youth sport: train its growth attributes directly
    const grow = YOUTH_SPORTS[sportId]?.grow || { end: 0.1 };
    for (const k of Object.keys(grow)) { const g = applyGain(k, 0.5 * intensity); if (g > 0) gains[k] = g; }
  }

  // ball sports get a scoreline; athletics sports are a session, not a game
  let win = null, my = 0, their = 0;
  if (spec) {
    const edge = (S.today.recovery - 55) / 180 + (a.morale - 50) / 400 + (hasBadge('breakaway') ? 0.08 : 0);
    win = Math.random() < 0.5 + edge;
    my = size === 'full' ? irnd(15, 21) : irnd(9, 11);
    their = win ? my - irnd(2, 6) : my + irnd(1, 4);
  }
  goalProgress('pickup');
  a.fatigue = clamp(a.fatigue + (size === 'full' ? 11 : 6), 0, 100);
  a.morale = clamp(a.morale + (size === 'full' ? 7 : 4) + (win ? 2 : 0), 0, 100);
  const rp = rpGain(irnd(2, 5) + (win ? 3 : 0));
  S.rp += rp;
  bumpChemistry(1);
  checkBadges();

  // playing tired on bad sleep can bite
  let injury = null;
  const risk = intensity * (a.fatigue / 130) * (1 - S.today.recovery / 130) * 0.05;
  if (Math.random() < risk) {
    injury = { name: pick(['rolled ankle', 'tweaked hamstring', 'jammed finger']), daysLeft: irnd(1, 4) };
    a.injury = injury;
    a.morale = clamp(a.morale - 6, 0, 100);
  }

  const name = spec ? spec.name : YOUTH_SPORTS[sportId]?.name || 'sports';
  const where = a.era === 'youth' ? 'park' : 'stadium';
  logJournal(spec
    ? `${size === 'full' ? 'Full run' : 'Pickup'} at the ${where} — ${win ? `won ${my}–${their}` : `lost ${their}–${my}`} playing ${name}.${injury ? ` Came home with a ${injury.name}.` : ''}`
    : `${name} session at the ${where}.${injury ? ` Came home with a ${injury.name}.` : ''}`);
  save();
  return { session: !spec, win, my, their, gains, rp, injury, sport: sportId, sportName: name, cost };
}
