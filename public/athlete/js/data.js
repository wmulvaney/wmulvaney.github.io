/* ============================================================
   SLEEPER — game content database
   Sports, positions, attributes, drills, shop, story events.
   Everything the player picks here changes real math in engine.js.
   ============================================================ */

export const ATTRS = {
  // Physical core (every sport uses these)
  spd: { name: 'Speed',        group: 'physical', ico: '⚡' },
  str: { name: 'Strength',     group: 'physical', ico: '🏋️' },
  end: { name: 'Endurance',    group: 'physical', ico: '🫁' },
  agi: { name: 'Agility',      group: 'physical', ico: '🌀' },
  cor: { name: 'Coordination', group: 'physical', ico: '🎯' },
  iq:  { name: 'Game IQ',      group: 'mental',   ico: '🧠' },
  // Basketball
  shoot:  { name: 'Shooting',      group: 'basketball', ico: '🏀' },
  handle: { name: 'Ball-Handling', group: 'basketball', ico: '🤹' },
  playmk: { name: 'Playmaking',    group: 'basketball', ico: '👁️' },
  finish: { name: 'Finishing',     group: 'basketball', ico: '💥' },
  perim:  { name: 'Perimeter D',   group: 'basketball', ico: '🛡️' },
  board:  { name: 'Rebounding',    group: 'basketball', ico: '🪝' },
  // Soccer
  strike:  { name: 'Finishing',   group: 'soccer', ico: '🥅' },
  dribble: { name: 'Dribbling',   group: 'soccer', ico: '👟' },
  pass:    { name: 'Passing',     group: 'soccer', ico: '📐' },
  tackle:  { name: 'Tackling',    group: 'soccer', ico: '🛑' },
  vision:  { name: 'Vision',      group: 'soccer', ico: '🔭' },
  gk:      { name: 'Goalkeeping', group: 'soccer', ico: '🧤' },
  // Football
  arm:    { name: 'Arm Talent',    group: 'football', ico: '🚀' },
  hands:  { name: 'Hands',         group: 'football', ico: '🙌' },
  routes: { name: 'Route Running', group: 'football', ico: '🧭' },
  carry:  { name: 'Ball Carrying', group: 'football', ico: '🏃' },
  cover:  { name: 'Coverage',      group: 'football', ico: '🕸️' },
  hit:    { name: 'Tackling',      group: 'football', ico: '💢' },
};

export const PHYS_KEYS = ['spd', 'str', 'end', 'agi', 'cor', 'iq'];

/* ---------- Youth sports (pick 3 at age 8) ----------
   Each grants permanent growth-rate bonuses ("motor patterns you build
   as a kid never leave you") + small starting attribute boosts.       */
export const YOUTH_SPORTS = {
  basketball: { name: 'Basketball', ico: '🏀', main: true,
    grow: { agi: 0.12, cor: 0.12, spd: 0.06 },
    blurb: 'Footwork, touch and spatial feel. A main-sport path.' },
  soccer: { name: 'Soccer', ico: '⚽', main: true,
    grow: { end: 0.14, agi: 0.10, spd: 0.06 },
    blurb: 'Endless running builds an engine that lasts. A main-sport path.' },
  football: { name: 'Football', ico: '🏈', main: true,
    grow: { str: 0.12, spd: 0.10, iq: 0.06 },
    blurb: 'Physicality and scheme-reading. A main-sport path.' },
  baseball: { name: 'Baseball', ico: '⚾', main: false,
    grow: { cor: 0.16, iq: 0.08 },
    blurb: 'Hand-eye coordination like nothing else.' },
  track: { name: 'Track & Field', ico: '🏃', main: false,
    grow: { spd: 0.16, end: 0.08 },
    blurb: 'Pure speed development. Scouts notice fast kids.' },
  swimming: { name: 'Swimming', ico: '🏊', main: false,
    grow: { end: 0.12, str: 0.08, cor: 0.04 },
    blurb: 'Full-body conditioning, zero joint wear.' },
  tennis: { name: 'Tennis', ico: '🎾', main: false,
    grow: { agi: 0.12, cor: 0.10 },
    blurb: 'Lateral quickness and racquet-sport reactions.' },
  martial: { name: 'Martial Arts', ico: '🥋', main: false,
    grow: { str: 0.08, iq: 0.10, agi: 0.06 },
    blurb: 'Discipline, balance, and body control.' },
};

/* ---------- Main sports ---------- */
export const SPORTS = {
  basketball: {
    name: 'Basketball', ico: '🏀',
    skills: ['shoot', 'handle', 'playmk', 'finish', 'perim', 'board'],
    // Weights used before a position is chosen (balanced blend)
    baseWeights: { shoot: .13, handle: .11, playmk: .10, finish: .10, perim: .09, board: .07, spd: .09, agi: .09, str: .06, end: .06, cor: .05, iq: .05 },
    statLabels: { a: 'PTS', b: 'REB', c: 'AST' },
    teamNames: { hs: 'Ridgeview High', college: null, pro: null },
    positions: {
      pg:   { name: 'Point Guard', ico: '🎮',
        blurb: 'The floor general. Handle, vision, and pace win you games.',
        weights: { handle: .16, playmk: .17, shoot: .13, spd: .12, iq: .13, perim: .08, agi: .08, finish: .05, end: .05, cor: .03 },
        statBias: { a: 0.85, b: 0.45, c: 1.7 } },
      wing: { name: 'Wing', ico: '🗡️',
        blurb: 'Three-and-D scorer. Buckets on one end, stops on the other.',
        weights: { shoot: .17, perim: .13, finish: .12, agi: .11, spd: .10, handle: .09, iq: .09, str: .07, board: .07, end: .05 },
        statBias: { a: 1.2, b: 0.8, c: 0.7 } },
      big:  { name: 'Big', ico: '🗼',
        blurb: 'Own the paint. Rebounds, rim protection, interior scoring.',
        weights: { finish: .15, board: .17, str: .15, perim: .07, iq: .10, agi: .08, end: .08, shoot: .07, cor: .08, spd: .05 },
        statBias: { a: 1.0, b: 1.7, c: 0.4 } },
    },
  },
  soccer: {
    name: 'Soccer', ico: '⚽',
    skills: ['strike', 'dribble', 'pass', 'tackle', 'vision', 'gk'],
    baseWeights: { strike: .11, dribble: .11, pass: .11, tackle: .08, vision: .09, spd: .11, end: .12, agi: .10, str: .05, cor: .06, iq: .06 },
    statLabels: { a: 'GLS', b: 'AST', c: 'RATE' },
    positions: {
      st:  { name: 'Striker', ico: '🎯',
        blurb: 'Live for goals. Movement, first touch, and cold finishing.',
        weights: { strike: .19, dribble: .13, spd: .14, agi: .11, cor: .10, vision: .08, iq: .09, end: .09, str: .05, pass: .02 },
        statBias: { a: 1.8, b: 0.6, c: 1.0 } },
      mid: { name: 'Midfielder', ico: '🧭',
        blurb: 'The engine room. See everything, touch everything, run forever.',
        weights: { pass: .17, vision: .15, end: .14, dribble: .11, iq: .12, tackle: .07, agi: .09, strike: .07, spd: .06, cor: .02 },
        statBias: { a: 0.7, b: 1.6, c: 1.0 } },
      def: { name: 'Defender', ico: '🧱',
        blurb: 'The last wall. Timing, positioning, and physical duels.',
        weights: { tackle: .19, iq: .14, str: .13, spd: .12, vision: .09, end: .10, agi: .09, pass: .10, cor: .04 },
        statBias: { a: 0.2, b: 0.5, c: 1.15 } },
      gk:  { name: 'Goalkeeper', ico: '🧤',
        blurb: 'One mistake matters. Reflexes, command, and nerve.',
        weights: { gk: .25, agi: .15, cor: .14, iq: .13, str: .09, vision: .08, pass: .08, spd: .04, end: .04 },
        statBias: { a: 0.05, b: 0.2, c: 1.3 } },
    },
  },
  football: {
    name: 'Football', ico: '🏈',
    skills: ['arm', 'hands', 'routes', 'carry', 'cover', 'hit'],
    baseWeights: { arm: .07, hands: .09, routes: .08, carry: .09, cover: .07, hit: .07, spd: .13, str: .12, agi: .10, end: .07, cor: .05, iq: .06 },
    statLabels: { a: 'YDS', b: 'TD', c: 'RATE' },
    positions: {
      qb: { name: 'Quarterback', ico: '🎙️',
        blurb: 'The most demanding job in sports. Arm, mind, and poise.',
        weights: { arm: .23, iq: .19, cor: .13, agi: .09, spd: .08, str: .07, carry: .08, hands: .04, end: .05, routes: .04 },
        statBias: { a: 2.6, b: 1.6, c: 1.0 } },
      wr: { name: 'Wide Receiver', ico: '🕊️',
        blurb: 'Win your matchup. Routes, hands, and vertical speed.',
        weights: { hands: .19, routes: .19, spd: .16, agi: .13, cor: .10, iq: .07, end: .06, str: .06, carry: .04 },
        statBias: { a: 1.0, b: 0.9, c: 1.0 } },
      rb: { name: 'Running Back', ico: '🐎',
        blurb: 'Vision and violence. Make the first man miss, punish the second.',
        weights: { carry: .19, spd: .15, agi: .15, str: .14, cor: .09, hands: .08, iq: .08, end: .09, routes: .03 },
        statBias: { a: 1.15, b: 1.1, c: 1.0 } },
      db: { name: 'Defensive Back', ico: '🦅',
        blurb: 'The island. Mirror elite athletes and erase them.',
        weights: { cover: .21, spd: .17, agi: .13, iq: .12, hit: .10, hands: .08, end: .08, cor: .07, str: .04 },
        statBias: { a: 0.55, b: 0.35, c: 1.1 } },
    },
  },
};

/* ---------- Drills ----------
   fac = minimum facility tier, era = minimum era index,
   pos = restricted to a position, sport = restricted to sport,
   intensity feeds fatigue & injury risk.                       */
export const ERAS = ['youth', 'hs', 'college', 'pro'];
export const ERA_INFO = {
  youth:   { name: 'Backyard Days',   sub: 'Ages 8–13',  ico: '🌇' },
  hs:      { name: 'Friday Nights',   sub: 'Ages 14–17', ico: '🏟️' },
  college: { name: 'The Big Stage',   sub: 'Ages 18–21', ico: '🎓' },
  pro:     { name: 'The Show',        sub: 'Age 22+',    ico: '🏆' },
};

export const DRILLS = [
  // --- Physical (all sports) ---
  { id: 'sprints',  name: 'Sprint Work',      ico: '⚡', targets: { spd: 1.0, agi: 0.3 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Hill sprints and acceleration mechanics.' },
  { id: 'plyo',     name: 'Plyometrics',      ico: '🦘', targets: { agi: 0.9, spd: 0.4 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Jump training and explosive movement.' },
  { id: 'endur',    name: 'Conditioning',     ico: '🫁', targets: { end: 1.0 }, energy: 2, intensity: 2, era: 0, fac: 0, desc: 'Tempo runs and interval work.' },
  { id: 'balance',  name: 'Balance & Motor',  ico: '🤸', targets: { cor: 1.0, agi: 0.3 }, energy: 1, intensity: 1, era: 0, fac: 0, desc: 'Body control circuits. Gold for young athletes.' },
  { id: 'weights',  name: 'Weight Room',      ico: '🏋️', targets: { str: 1.1 }, energy: 3, intensity: 4, era: 1, fac: 1, desc: 'Progressive strength training. (Unlocks at 14 — growth plates first.)' },
  { id: 'film',     name: 'Film Study',       ico: '🎬', targets: { iq: 1.0 }, energy: 1, intensity: 0, era: 1, fac: 0, desc: 'Watch tape. See the game before it happens.' },
  { id: 'yoga',     name: 'Mobility & Yoga',  ico: '🧘', targets: { cor: 0.5, end: 0.3 }, energy: 1, intensity: 0, era: 1, fac: 0, recovery: 6, desc: 'Active recovery. Restores a little freshness.' },

  // --- Basketball ---
  { id: 'bb_spot',    name: 'Spot Shooting',   ico: '🏀', sport: 'basketball', targets: { shoot: 1.0 }, energy: 2, intensity: 1, era: 0, fac: 0, desc: '500 makes. Form is forever.' },
  { id: 'bb_handle',  name: 'Handle Circuit',  ico: '🤹', sport: 'basketball', targets: { handle: 1.0, cor: 0.2 }, energy: 2, intensity: 2, era: 0, fac: 0, desc: 'Two-ball drills, cone work, live moves.' },
  { id: 'bb_finish',  name: 'Rim Finishing',   ico: '💥', sport: 'basketball', targets: { finish: 1.0, str: 0.15 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Contact layups, floaters, euro steps.' },
  { id: 'bb_pass',    name: 'Read & React',    ico: '👁️', sport: 'basketball', targets: { playmk: 1.0, iq: 0.25 }, energy: 2, intensity: 2, era: 1, fac: 1, desc: 'Live-action decision reps with a squad.' },
  { id: 'bb_defense', name: 'Defensive Slides',ico: '🛡️', sport: 'basketball', targets: { perim: 1.0, agi: 0.25 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Closeouts, slides, and containment.' },
  { id: 'bb_board',   name: 'Glass Work',      ico: '🪝', sport: 'basketball', targets: { board: 1.0, str: 0.2 }, energy: 2, intensity: 3, era: 1, fac: 1, desc: 'Box-out battles and tip drills.' },
  // Basketball position labs (college+)
  { id: 'bb_pnr',   name: 'Pick & Roll Lab',  ico: '♟️', sport: 'basketball', pos: 'pg',   targets: { playmk: 1.3, iq: 0.4 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'PG only: manipulate two defenders at once.' },
  { id: 'bb_moves', name: 'Iso Scoring Lab',  ico: '🗡️', sport: 'basketball', pos: 'wing', targets: { shoot: 0.8, finish: 0.8 }, energy: 3, intensity: 3, era: 2, fac: 2, desc: 'Wing only: shot creation off the dribble.' },
  { id: 'bb_post',  name: 'Post Craft Lab',   ico: '🗼', sport: 'basketball', pos: 'big',  targets: { finish: 0.9, board: 0.7, str: 0.3 }, energy: 3, intensity: 3, era: 2, fac: 2, desc: 'Big only: seals, drop steps, rim protection timing.' },

  // --- Soccer ---
  { id: 'sc_finish',  name: 'Finishing Reps',  ico: '🥅', sport: 'soccer', targets: { strike: 1.0 }, energy: 2, intensity: 2, era: 0, fac: 0, desc: 'Both feet, all angles, keeper in goal.' },
  { id: 'sc_touch',   name: 'First Touch',     ico: '👟', sport: 'soccer', targets: { dribble: 1.0, cor: 0.2 }, energy: 2, intensity: 2, era: 0, fac: 0, desc: 'Wall work, juggling, tight-space control.' },
  { id: 'sc_pass',    name: 'Passing Patterns',ico: '📐', sport: 'soccer', targets: { pass: 1.0, vision: 0.25 }, energy: 2, intensity: 1, era: 0, fac: 0, desc: 'Rondos and switch-of-play reps.' },
  { id: 'sc_defend',  name: 'Defending 1v1',   ico: '🛑', sport: 'soccer', targets: { tackle: 1.0, iq: 0.2 }, energy: 2, intensity: 3, era: 1, fac: 0, desc: 'Jockeying, timing, and duels.' },
  { id: 'sc_scan',    name: 'Scanning Drills', ico: '🔭', sport: 'soccer', targets: { vision: 1.0, iq: 0.25 }, energy: 2, intensity: 1, era: 1, fac: 1, desc: 'Shoulder checks and live small-sided play.' },
  { id: 'sc_keeper',  name: 'Keeper Session',  ico: '🧤', sport: 'soccer', targets: { gk: 1.1, agi: 0.2 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Shot stopping, footwork, and distribution.' },
  // Soccer position labs
  { id: 'sc_move',   name: 'Movement Lab',    ico: '🎯', sport: 'soccer', pos: 'st',  targets: { strike: 1.2, iq: 0.4 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'ST only: runs off the last defender, near-post darts.' },
  { id: 'sc_tempo',  name: 'Tempo Control Lab',ico: '🧭', sport: 'soccer', pos: 'mid', targets: { pass: 0.9, vision: 0.9 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'MID only: dictate rhythm under press.' },
  { id: 'sc_line',   name: 'Back-Line Lab',   ico: '🧱', sport: 'soccer', pos: 'def', targets: { tackle: 1.0, iq: 0.7 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'DEF only: line control, covering, and traps.' },
  { id: 'sc_shotstop',name: 'Shot-Stopping Lab',ico: '🧤', sport: 'soccer', pos: 'gk', targets: { gk: 1.4, cor: 0.3 }, energy: 3, intensity: 3, era: 2, fac: 2, desc: 'GK only: reaction saves and 1v1 situations.' },

  // --- Football ---
  { id: 'fb_throw',   name: 'Throwing Session',ico: '🚀', sport: 'football', targets: { arm: 1.0, cor: 0.2 }, energy: 2, intensity: 2, era: 0, fac: 0, desc: 'Mechanics, velocity, and touch.' },
  { id: 'fb_catch',   name: 'Hands Circuit',   ico: '🙌', sport: 'football', targets: { hands: 1.0, cor: 0.25 }, energy: 2, intensity: 1, era: 0, fac: 0, desc: 'Jugs machine, contested grabs, tracking.' },
  { id: 'fb_routes',  name: 'Route Tree',      ico: '🧭', sport: 'football', targets: { routes: 1.0, agi: 0.2 }, energy: 2, intensity: 2, era: 1, fac: 0, desc: 'Stems, breaks, and releases.' },
  { id: 'fb_carry',   name: 'Ball Security',   ico: '🏃', sport: 'football', targets: { carry: 1.0, str: 0.15 }, energy: 2, intensity: 3, era: 0, fac: 0, desc: 'Gauntlet runs and open-field vision.' },
  { id: 'fb_cover',   name: 'Coverage Drills', ico: '🕸️', sport: 'football', targets: { cover: 1.0, agi: 0.25 }, energy: 2, intensity: 3, era: 1, fac: 0, desc: 'Backpedal, flip hips, drive on the ball.' },
  { id: 'fb_tackle',  name: 'Tackling Form',   ico: '💢', sport: 'football', targets: { hit: 1.0, str: 0.2 }, energy: 2, intensity: 4, era: 1, fac: 1, desc: 'Angles, leverage, and safe contact.' },
  // Football position labs
  { id: 'fb_progress',name: 'Progression Lab', ico: '🎙️', sport: 'football', pos: 'qb', targets: { iq: 0.9, arm: 0.8 }, energy: 3, intensity: 1, era: 2, fac: 2, desc: 'QB only: full-field reads vs disguised coverage.' },
  { id: 'fb_release', name: 'Release Lab',     ico: '🕊️', sport: 'football', pos: 'wr', targets: { routes: 1.1, hands: 0.6 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'WR only: beat press, stack DBs, finish deep.' },
  { id: 'fb_vision',  name: 'Vision Lab',      ico: '🐎', sport: 'football', pos: 'rb', targets: { carry: 1.1, iq: 0.6 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'RB only: zone reads, cutback lanes, pass pro.' },
  { id: 'fb_island',  name: 'Island Lab',      ico: '🦅', sport: 'football', pos: 'db', targets: { cover: 1.1, iq: 0.6 }, energy: 3, intensity: 2, era: 2, fac: 2, desc: 'DB only: man technique vs elite route runners.' },
];

/* ---------- Shop: coaches ----------
   mult applies to matching drill targets; tiers stack (tier = level owned). */
export const COACHES = [
  { id: 'c_speed',   name: 'Speed Coach',      ico: '⚡', attrs: ['spd', 'agi'], desc: 'Track-style sprint mechanics work.', era: 0,
    tiers: [{ cost: 60, mult: .15 }, { cost: 180, mult: .30 }, { cost: 420, mult: .50 }] },
  { id: 'c_strength',name: 'Strength Coach',   ico: '🏋️', attrs: ['str', 'end'], desc: 'Programming, periodization, lifting form.', era: 1,
    tiers: [{ cost: 70, mult: .15 }, { cost: 200, mult: .30 }, { cost: 450, mult: .50 }] },
  { id: 'c_skills',  name: 'Skills Trainer',   ico: '🎯', attrs: 'sport', desc: 'Private sessions in your main sport.', era: 0,
    tiers: [{ cost: 80, mult: .15 }, { cost: 240, mult: .30 }, { cost: 520, mult: .50 }] },
  { id: 'c_mental',  name: 'Mind Coach',       ico: '🧠', attrs: ['iq', 'cor'], desc: 'Film habits, visualization, focus.', era: 1,
    tiers: [{ cost: 60, mult: .15 }, { cost: 170, mult: .30 }, { cost: 400, mult: .50 }] },
  { id: 'c_position',name: 'Position Coach',   ico: '♟️', attrs: 'position', desc: 'Unlocks the full value of position labs.', era: 2,
    tiers: [{ cost: 300, mult: .25 }, { cost: 600, mult: .45 }, { cost: 1000, mult: .70 }] },
  { id: 'c_sleep',   name: 'Sleep Specialist', ico: '🌙', attrs: 'recovery', desc: '+4 recovery per night, per tier. The pros all have one.', era: 1,
    tiers: [{ cost: 150, bonus: 4 }, { cost: 350, bonus: 8 }, { cost: 700, bonus: 12 }] },
];

/* ---------- Shop: facilities (single upgrading track) ---------- */
export const FACILITIES = [
  { tier: 0, name: 'The Backyard',        ico: '🌳', cost: 0,    mult: 0,   desc: 'A hoop, a wall, a patch of grass. Where it all starts.' },
  { tier: 1, name: 'Community Gym',       ico: '🏫', cost: 120,  mult: .08, desc: 'Real courts, a small weight room. Unlocks team drills.', era: 0 },
  { tier: 2, name: 'Performance Center',  ico: '🏢', cost: 500,  mult: .18, desc: 'Turf, racks, shooting machines. Unlocks position labs.', era: 1 },
  { tier: 3, name: 'Elite Training Lab',  ico: '🧪', cost: 1400, mult: .30, desc: 'Force plates, motion capture, altitude room. Best gains in the game.', era: 2 },
];

/* ---------- Shop: recovery gear (passive) & services (consumable) ---------- */
export const GEAR = [
  { id: 'g_roller',  name: 'Foam Roller',        ico: '🧻', cost: 40,  recovery: 2, era: 0, desc: '+2 recovery every night.' },
  { id: 'g_curtain', name: 'Blackout Curtains',  ico: '🪟', cost: 80,  sleep: 3, era: 0, desc: '+3 to every sleep score. Darkness is a weapon.' },
  { id: 'g_gun',     name: 'Massage Gun',        ico: '🔫', cost: 160, recovery: 4, era: 1, desc: '+4 recovery every night.' },
  { id: 'g_matt',    name: 'Performance Mattress', ico: '🛏️', cost: 300, sleep: 5, era: 1, desc: '+5 to every sleep score.' },
  { id: 'g_nutrition', name: 'Nutrition Plan',   ico: '🥗', cost: 260, energy: 1, era: 1, desc: '+1 max energy every day.' },
  { id: 'g_icebath', name: 'Cold Plunge',        ico: '🧊', cost: 500, recovery: 6, era: 2, desc: '+6 recovery every night. Hurts so good.' },
  { id: 'g_chef',    name: 'Personal Chef',      ico: '👨‍🍳', cost: 900, energy: 2, era: 3, desc: '+2 max energy every day. Fuel like a pro.' },
];

export const SERVICES = [
  { id: 's_massage', name: 'Massage Session', ico: '💆', cost: 25, effect: 'energy', amount: 3, desc: 'Restore 3 energy right now.' },
  { id: 's_spa',     name: 'Recovery Day',    ico: '🛁', cost: 40, effect: 'fatigue', amount: 25, desc: 'Clear 25 fatigue.' },
  { id: 's_physio',  name: 'Physio Session',  ico: '🩹', cost: 60, effect: 'injury', amount: 2, desc: 'Shave 2 days off an injury.' },
];

/* ---------- College programs (offer tiers) ---------- */
export const COLLEGES = {
  power: [
    { id: 'bayview', name: 'Bayview State', ico: '🌊', style: 'National powerhouse' },
    { id: 'granite', name: 'Granite Tech', ico: '⛰️', style: 'National powerhouse' },
  ],
  mid: [
    { id: 'lakeshore', name: 'Lakeshore University', ico: '🏞️', style: 'Solid conference program' },
    { id: 'redmesa', name: 'Red Mesa State', ico: '🏜️', style: 'Solid conference program' },
  ],
  small: [
    { id: 'hollow', name: 'Pine Hollow College', ico: '🌲', style: 'Small school' },
  ],
};

/* Pro league naming per sport */
export const PRO_LEAGUE = {
  basketball: { league: 'the NBL', draft: 'NBL Draft', teams: ['Meridian Comets', 'Harbor City Kings', 'Ashland Wolves', 'Solano Heat'] },
  soccer: { league: 'the Premier Division', draft: 'Pro Signing Day', teams: ['Atlético Costa', 'Northgate FC', 'Union Verde', 'Real Aviara'] },
  football: { league: 'the NFA', draft: 'NFA Draft', teams: ['Ironport Chargers', 'Summit Stags', 'Delta Hawks', 'Capital Guardians'] },
};

/* ---------- Story choice events ----------
   Randomly drawn; sleepMod applies to that night's sleep in the demo sim
   (and morale/energy always apply). This is where life vs. discipline plays out. */
export const CHOICE_EVENTS = {
  youth: [
    { id: 'sleepover', title: 'Sleepover Invite', ico: '🎮',
      text: 'Your best friend invites you to a sleepover. You know there will be video games until 3am.',
      a: { label: 'Go and stay up', sub: 'Fun! +8 morale, but tonight’s sleep will be rough', morale: 8, sleepMod: -30 },
      b: { label: 'Go, but crash at 10', sub: 'Balanced: +4 morale, small sleep hit', morale: 4, sleepMod: -8 },
      c: { label: 'Skip it and rest', sub: 'Discipline: −4 morale, perfect night', morale: -4, sleepMod: +8 } },
    { id: 'latecartoons', title: 'One More Episode…', ico: '📺',
      text: 'It’s 9:30pm and the next episode auto-plays in 5… 4… 3…',
      a: { label: 'Binge the season', sub: '+5 morale, big sleep hit', morale: 5, sleepMod: -22 },
      b: { label: 'Turn it off', sub: 'Future you says thanks', morale: -2, sleepMod: +6 } },
    { id: 'sugar', title: 'Birthday Party Sugar Rush', ico: '🧁',
      text: 'Cake, soda, and candy at 7pm. Your legs are already vibrating.',
      a: { label: 'Load up', sub: '+4 morale, wired at bedtime', morale: 4, sleepMod: -14 },
      b: { label: 'One slice, water after', sub: 'Sensible kid', morale: 1, sleepMod: 0 } },
  ],
  hs: [
    { id: 'party', title: 'Friday Party', ico: '🎉',
      text: 'The whole school will be there. Kickoff is tomorrow at noon.',
      a: { label: 'Stay out late', sub: '+10 morale, brutal night before a game', morale: 10, sleepMod: -35 },
      b: { label: 'Show face, leave by 11', sub: '+5 morale, minor hit', morale: 5, sleepMod: -10 },
      c: { label: 'Skip — game tomorrow', sub: '−5 morale, locked in', morale: -5, sleepMod: +8 } },
    { id: 'ranked', title: 'Ranked Grind', ico: '🎮',
      text: 'Your duo is online and you’re one win from promotion. It’s 11pm.',
      a: { label: 'One more game (×5)', sub: '+6 morale, screens until 2am', morale: 6, sleepMod: -25 },
      b: { label: 'Log off', sub: 'The rank will be there tomorrow', morale: -2, sleepMod: +6 } },
    { id: 'cram', title: 'Chemistry Final', ico: '📚',
      text: 'You put it off. The final is tomorrow morning.',
      a: { label: 'All-nighter', sub: 'Save the GPA, wreck the night', morale: -2, sleepMod: -30 },
      b: { label: 'Study 90 min, sleep', sub: 'Trust spaced repetition', morale: 0, sleepMod: -5 } },
  ],
  college: [
    { id: 'initiation', title: 'Team Night Out', ico: '🍕',
      text: 'Upperclassmen are taking the freshmen out. Bonding matters… so does tomorrow’s 6am lift.',
      a: { label: 'Full send', sub: '+10 morale, destroyed tomorrow', morale: 10, sleepMod: -32 },
      b: { label: 'Dinner only', sub: '+5 morale, in bed by 12', morale: 5, sleepMod: -8 },
      c: { label: 'Rain check', sub: '−6 morale with the squad', morale: -6, sleepMod: +8 } },
    { id: 'roadtrip', title: 'Away Game Red-Eye', ico: '✈️',
      text: 'The bus gets back at 2am. Classes at 9.',
      a: { label: 'Sleep on the bus', sub: 'Neck pillow hero', morale: 0, sleepMod: -12 },
      b: { label: 'Stay up with teammates', sub: '+4 morale, zombie mode', morale: 4, sleepMod: -24 } },
    { id: 'media', title: 'Local Media Feature', ico: '📸',
      text: 'A reporter wants a late-evening interview for a feature story.',
      a: { label: 'Do it', sub: '+rep, slightly late night', morale: 4, sleepMod: -8, rep: 6 },
      b: { label: 'Decline politely', sub: 'Sleep is the story', morale: -1, sleepMod: +4 } },
  ],
  pro: [
    { id: 'nightlife', title: 'City Nightlife', ico: '🌃',
      text: 'Big win tonight. Teammates are heading out to celebrate downtown.',
      a: { label: 'Celebrate properly', sub: '+10 morale, rough recovery', morale: 10, sleepMod: -30 },
      b: { label: 'One toast, then home', sub: '+5 morale, pro habits', morale: 5, sleepMod: -8 },
      c: { label: 'Straight to the recovery room', sub: 'Machine-like', morale: -3, sleepMod: +8 } },
    { id: 'sponsor', title: 'Sponsor Event', ico: '🤝',
      text: 'A brand wants you at a late launch party. Good money, bad timing.',
      a: { label: 'Attend', sub: '+120 RP, late night', morale: 3, sleepMod: -18, rp: 120 },
      b: { label: 'Send regrets', sub: 'Protect the routine', morale: 0, sleepMod: +4 } },
    { id: 'timezone', title: 'Coast-to-Coast Trip', ico: '🛫',
      text: 'Three time zones in three days. Your body clock is filing a complaint.',
      a: { label: 'Push through, no naps', sub: 'Grind culture', morale: 0, sleepMod: -20 },
      b: { label: 'Strategic naps + light discipline', sub: 'Sleep science', morale: 0, sleepMod: -6 } },
  ],
};

/* Flavor opponents per era */
export const OPPONENTS = {
  youth: ['Maple Street Tigers', 'Eastside Rockets', 'Parkdale Panthers', 'River Rats', 'Sunset Sharks'],
  hs: ['Central Catholic', 'Westfield Warriors', 'North Ridge', 'Franklin Prep', 'Oakmont', 'St. Aloysius', 'Harbor High'],
  college: ['Tidewater A&M', 'Mount Union', 'Carver State', 'Blue Ridge U', 'Pacifica', 'Fort Sumner', 'Ironwood'],
  pro: ['Meridian Comets', 'Harbor City Kings', 'Ashland Wolves', 'Solano Heat', 'Ironport Chargers', 'Summit Stags', 'Northgate FC', 'Union Verde'],
};

