/* ============================================================
   SLEEPER — UI layer (world-first)
   The 3D world map IS the game screen. HUD chips float over it,
   buildings open sliding panels, and menus never replace the
   world — they slide over it.
   ============================================================ */

import {
  ATTRS, PHYS_KEYS, YOUTH_SPORTS, SPORTS, ERA_INFO, ERAS,
  COACHES, FACILITIES, GEAR, SERVICES, CONTRACT_OFFERS,
} from './data.js';
import { PROVIDERS, parseSleepCSV, describeScore, scoreNight } from './sleep.js';
import * as E from './engine.js';
import * as W from './world.js';
import { sfx, buzz, setSoundEnabled } from './sound.js';
import { sceneArt, vignette } from './scenes.js';

const $app = () => document.getElementById('app');
const $modal = () => document.getElementById('modal-root');
let onboarding = { step: 0, name: '', picks: [], provider: 'demo', look: { skin: 0xc98e5a, hair: 0x2a1e14, jersey: 0xe25c4a, number: 23 } };
const SKIN_TONES = [0xf2cfa8, 0xc98e5a, 0x9c6a3f, 0x5f4028];
const HAIR_COLORS = [0x2a1e14, 0x0e0c0a, 0x7a4b21, 0xb8b0a4];
const JERSEY_COLORS = [0xe25c4a, 0x3a6fd8, 0x2f9e57, 0xf2c14e, 0x8a5ad8, 0x22283b];
let panelOpen = null;
let worldReady = false;
let busy = false; // guards the sleep/walk flows

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
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
      </svg>
      <div class="ring-center"><b>${value}</b><span>${sub}</span></div>
    </div>
    <div class="ring-label">${label}</div>
  </div>`;
}

function energyPips(energy) {
  const whole = Math.floor(energy);
  let out = '<span class="energy-pips">';
  for (let i = 0; i < 10; i++) out += `<i class="${i < whole ? 'on' : ''}"></i>`;
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

/* ---------------- onboarding (unchanged flow) ---------------- */
function renderOnboarding() {
  document.body.className = 'era-youth';
  hideWorld();
  const ob = onboarding;
  const steps = [obIntro, obName, obLook, obSports];
  $app().style.display = '';
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
      <div class="row" style="border:none;background:none;padding:6px 0"><div class="row-ico">🗺️</div><div class="row-main"><b>Your world</b><span class="sub">A living 3D island — home, gym, stadium. It grows as you do.</span></div></div>
      <div class="row" style="border:none;background:none;padding:6px 0"><div class="row-ico">🌙</div><div class="row-main"><b>Sleep → Recovery</b><span class="sub">Great nights make every drill worth up to 3× more.</span></div></div>
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

function swatches(colors, key, selected) {
  return `<div class="swatch-row">${colors.map((c) => `
    <button class="swatch ${selected === c ? 'on' : ''}" data-action="ob-look" data-key="${key}" data-val="${c}"
      style="background:#${c.toString(16).padStart(6, '0')}"></button>`).join('')}</div>`;
}

function obLook() {
  const L = onboarding.look;
  return `
    ${obProgress(2)}
    <div>
      <p class="ob-kicker">Your athlete</p>
      <h1>Make them yours.</h1>
    </div>
    <div class="card">
      <p class="small muted mb-8">Skin</p>
      ${swatches(SKIN_TONES, 'skin', L.skin)}
      <p class="small muted mb-8 mt-12">Hair</p>
      ${swatches(HAIR_COLORS, 'hair', L.hair)}
      <p class="small muted mb-8 mt-12">Jersey</p>
      ${swatches(JERSEY_COLORS, 'jersey', L.jersey)}
      <div class="field mt-12" style="max-width:130px">
        <label>Number</label>
        <input id="ob-num" type="number" min="0" max="99" value="${L.number}">
      </div>
    </div>
    <button class="btn primary block" data-action="ob-look-next">Looks right</button>`;
}

function obSports() {
  const picks = onboarding.picks;
  return `
    ${obProgress(3)}
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
    <button class="btn primary block" data-action="ob-start" ${picks.length === 3 && picks.some((p) => YOUTH_SPORTS[p].main) ? '' : 'disabled'}>
      ${picks.length}/3 selected — Start my career
    </button>`;
}

/* ---------------- world shell + HUD ---------------- */
const isTouch = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

function ensureWorld() {
  $app().style.display = 'none';
  if (document.getElementById('world-wrap')) {
    document.getElementById('world-wrap').style.display = '';
    document.getElementById('hud').style.display = '';
    const joy = document.getElementById('joystick');
    if (joy) joy.style.display = isTouch() ? 'block' : '';
    return;
  }
  const wrap = document.createElement('div');
  wrap.id = 'world-wrap';
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div class="hud-top">
      <div class="hud-chip hud-id"></div>
      <div class="hud-chip hud-rp"></div>
    </div>
    <div class="hud-stats"></div>
    <div class="hud-banner"></div>
    <div class="hud-bottom">
      <div class="hud-hint"></div>
      <div class="hud-prompt"></div>
      <div class="hud-context"></div>
    </div>`;
  const joy = document.createElement('div');
  joy.id = 'joystick';
  joy.innerHTML = '<div class="joy-base"><div class="joy-knob"></div></div>';
  const fadeEl = document.createElement('div');
  fadeEl.id = 'scene-fade';
  const panelRoot = document.createElement('div');
  panelRoot.id = 'panel-root';
  document.body.append(wrap, hud, joy, fadeEl, panelRoot);
  // CSS shows the joystick via pointer:coarse; some in-app browsers misreport
  // that, so force it whenever the device can actually touch.
  if (isTouch()) joy.style.display = 'block';
  W.initWorld(wrap, { onEnter: enterBuildingFlow, onInteract: handleInteract, onPrompt });
  attachJoystick(joy);
  worldReady = true;
}

function attachJoystick(joy) {
  const base = joy.querySelector('.joy-base');
  const knob = joy.querySelector('.joy-knob');
  const MAX = 38;
  let pid = null;
  const setKnob = (x, y) => { knob.style.transform = `translate(${x}px, ${y}px)`; };
  base.addEventListener('pointerdown', (e) => {
    pid = e.pointerId;
    base.setPointerCapture(pid);
    e.preventDefault();
  });
  base.addEventListener('pointermove', (e) => {
    if (pid === null || e.pointerId !== pid) return;
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > MAX) { dx = dx / len * MAX; dy = dy / len * MAX; }
    setKnob(dx, dy);
    W.setMoveInput(dx / MAX, dy / MAX);
  });
  const release = () => { pid = null; setKnob(0, 0); W.setMoveInput(0, 0); };
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
}

function fade(show) {
  const f = document.getElementById('scene-fade');
  if (!f) return Promise.resolve();
  f.style.opacity = show ? '1' : '0';
  return new Promise((r) => setTimeout(r, 300));
}

async function leaveInterior() {
  if (!worldReady || !W.inInterior()) return;
  await fade(true);
  W.exitInterior();
  updateHUD();
  await fade(false);
}

function hideWorld() {
  const w = document.getElementById('world-wrap');
  if (w) { w.style.display = 'none'; document.getElementById('hud').style.display = 'none'; }
  const joy = document.getElementById('joystick');
  if (joy) joy.style.display = 'none';
  closePanel(false);
}

const PANEL_META = {
  sleep:    { title: 'Sleep Tracker', ico: '⌚' },
  train:    { title: 'Training Plan', ico: '📋' },
  drills:   { title: 'Drills', ico: '🏋️' },
  season:   { title: 'Season & Career', ico: '📊' },
  gear:     { title: 'Recovery Gear', ico: '🛌' },
  staff:    { title: 'Staff & Facility', ico: '🧑\u200d🏫' },
  services: { title: 'Recovery Services', ico: '💆' },
  journal:  { title: 'Career Story', ico: '📖' },
  settings: { title: 'Settings', ico: '⚙️' },
};
let drillCtx = null; // { keys, title, ico } for the filtered drill panel

async function enterBuildingFlow(id) {
  if (busy) return;
  const S = E.getState();
  if (!S || S.pendingDecision) { if (S?.pendingDecision) openDecision(); return; }
  busy = true;
  try {
    await fade(true);
    W.enterInterior(id);
    updateHUD();
    await fade(false);
  } finally { busy = false; }
}

/* Objects in the rooms are the menus */
function handleInteract(iid) {
  const S = E.getState();
  if (!S || busy) return;
  if (iid.startsWith('pickup:')) { openBallModal(iid.slice(7)); return; }
  switch (iid) {
    case 'bed': sleepFlow(); break;
    case 'nightstand': openPanel('sleep'); break;
    case 'tv': case 'deskj': openPanel('journal'); break;
    case 'dresser': openPanel('settings'); break;
    case 'bench': openDrillPanel(['str', 'end'], 'Weights & Conditioning', '🏋️'); break;
    case 'cardio': openDrillPanel(['spd', 'agi'], 'Speed & Agility', '⚡'); break;
    case 'mat': openDrillPanel(['cor', 'end'], 'Mobility Corner', '🧘'); break;
    case 'screen': case 'board': openDrillPanel(['iq'], 'Film & Study', '🎬'); break;
    case 'clipboard': openPanel('train'); break;
    case 'ball': openBallModal(S.athlete.mainSport); break;
    case 'scoreboard': openPanel('season'); break;
    case 'shelf': openPanel('gear'); break;
    case 'counter': openPanel('staff'); break;
    case 'massage': openPanel('services'); break;
  }
}

/* Floating "+1.0 Speed" text over the world while the character works */
function gainPop(gains) {
  Object.entries(gains || {}).slice(0, 4).forEach(([k, v], i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'attr-delta-pop';
      el.textContent = `${ATTRS[k].name} +${v}`;
      el.style.left = `calc(50% + ${i % 2 ? 30 : -80}px)`;
      el.style.top = '19%';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1150);
    }, i * 240);
  });
}

/* Which animation fits a drill */
function poseForDrill(d) {
  const keys = Object.keys(d.targets);
  if (keys.some((k) => !PHYS_KEYS.includes(k))) return 'dribble';
  if (keys.includes('str')) return 'lift';
  if (keys.includes('spd') || keys.includes('agi') || keys.includes('end')) return 'sprint';
  if (keys.includes('iq')) return 'sit';
  return 'stretch';
}

/* The run-chooser: official game, pickup runs for energy, or practice */
function openBallModal(sportId) {
  const S = E.getState();
  const spec = SPORTS[sportId];
  const meta = spec || YOUTH_SPORTS[sportId] || { name: 'Ball', ico: '🏀' };
  const gameday = E.isGameDay() && !S.athlete.injury && (!S.athlete.mainSport || sportId === S.athlete.mainSport);
  const verb = spec ? 'run' : 'session';
  showModal(`
    <p class="modal-kicker">${meta.ico} ${esc(meta.name)}</p>
    <h2>${gameday ? 'Game day' : spec ? 'Pickup run' : 'Open session'}</h2>
    <p class="modal-body">Live reps build ${spec ? 'game skills' : 'athleticism'} and morale. Recovery multiplies the gains — and playing tired risks injury.</p>
    <div class="modal-actions">
      ${gameday ? `<button class="btn primary" data-action="play-game-modal">Play today's game</button>` : ''}
      <button class="choice-btn" data-action="pickup" data-id="${sportId}" data-size="quick" ${S.athlete.energy < 5 ? 'disabled style="opacity:.4"' : ''}>
        <b>Quick ${verb} · ⚡5</b><span>About an hour of work.</span>
      </button>
      <button class="choice-btn" data-action="pickup" data-id="${sportId}" data-size="full" ${S.athlete.energy < 10 ? 'disabled style="opacity:.4"' : ''}>
        <b>Full ${verb} · ⚡10</b><span>The whole afternoon. Double the reps, double the fatigue.</span>
      </button>
      ${spec ? `<button class="choice-btn" data-action="practice-drills" data-id="${sportId}">
        <b>Practice drills</b><span>Structured work on specific skills.</span>
      </button>` : ''}
    </div>`);
}

function showPickupResult(r) {
  const meta = SPORTS[r.sport] || YOUTH_SPORTS[r.sport] || { ico: '🎽' };
  const where = E.getState().athlete.era === 'youth' ? 'the park' : 'the stadium';
  const gainRows = Object.entries(r.gains)
    .map(([k, v]) => `<div class="gain-row"><span>${ATTRS[k].ico} ${ATTRS[k].name}</span><b>+${v}</b></div>`)
    .join('') || '<p class="small muted">Nothing stuck today.</p>';
  showModal(`
    <p class="modal-kicker">${meta.ico} ${esc(r.sportName)} · ${where}</p>
    <h2>${r.session ? 'Session complete' : r.win ? `Won ${r.my}–${r.their}` : `Lost ${r.their}–${r.my}`}</h2>
    <div class="gain-list">${gainRows}</div>
    <p class="small muted mt-8">+${r.rp} ✦ RP · morale up · −${r.cost} energy${r.injury ? `<br><b style="color:var(--red)">${r.injury.name} — out ${r.injury.daysLeft} day(s)</b>` : ''}</p>
    <button class="btn primary block mt-12" data-action="close-modal">Done</button>`, { dismissable: false });
}

function openDrillPanel(keys, title, ico) {
  drillCtx = { keys, title, ico };
  openPanel('drills');
}

const TUTORIAL_STEPS = [
  { hint: 'Coach: head to The Park and play something', done: 'That’s it — live reps build you fastest.' },
  { hint: 'Coach: hit the Gym and run one drill', done: 'Good work. Drills target exactly what you pick.' },
  { hint: 'Coach: now go home and sleep — that’s your superpower', done: null },
];
function tut(step) {
  const S = E.getState();
  if (!S || S.tutorial !== step) return;
  S.tutorial = step + 1;
  E.save();
  const done = TUTORIAL_STEPS[step].done;
  if (done) toast(done, 'good', '🧢');
  if (S.tutorial >= TUTORIAL_STEPS.length) {
    S.tutorial = -1;
    E.save();
    queueModals([() => showModal(`
      <p class="modal-kicker">🧢 Coach</p>
      <h2>You know the loop now.</h2>
      <p class="modal-body">Sleep fills your energy — and it refills faster all day after a good night. Spend it on drills, pickup runs and games. Check my weekly goals at the stadium scoreboard. The rest is on you, kid.</p>
      <button class="btn primary block" data-action="close-modal">Got it</button>`, { dismissable: false })]);
  }
  updateHUD();
}

let promptUI = null;
function onPrompt(info) {
  promptUI = info;
  const el = document.querySelector('#hud .hud-prompt');
  if (el) el.innerHTML = info
    ? `<button class="hud-banner-btn gold" data-action="prompt-trigger">${info.ico} ${esc(info.label)}</button>`
    : '';
}

function updateHUD() {
  const S = E.getState();
  if (!S) return;
  E.syncEnergy();
  const a = S.athlete;
  const hud = document.getElementById('hud');
  if (!hud) return;
  const era = ERA_INFO[a.era];
  const d = describeScore(S.today.sleepScore);
  const gameDay = E.isGameDay() && (!a.injury || a.injury.daysLeft <= 2);

  hud.querySelector('.hud-id').innerHTML = `
    <span class="hud-era">${era.ico}</span>
    <span><b>${esc(a.name)}</b><small>Age ${a.age} · ${era.name} · ⭐${E.computeRating()}</small></span>`;
  hud.querySelector('.hud-rp').innerHTML = `<span class="rp-chip">✦ ${S.rp}</span>`;

  hud.querySelector('.hud-stats').innerHTML = `
    <span class="hud-stat" title="Sleep score">💤 <b>${S.today.sleepScore}</b></span>
    <span class="hud-stat" title="Recovery">💚 <b>${S.today.recovery}%</b></span>
    <span class="hud-stat" title="Energy">⚡ ${energyPips(a.energy)}</span>
    ${S.sleep.streak >= 2 ? `<span class="hud-stat">🔥 <b>${S.sleep.streak}</b></span>` : ''}
    ${a.injury ? `<span class="hud-stat bad">🤕 <b>${a.injury.daysLeft}d</b></span>` : ''}`;

  const inside = worldReady ? W.inInterior() : null;
  const banner = hud.querySelector('.hud-banner');
  if (S.tutorial >= 0 && S.tutorial < TUTORIAL_STEPS.length && !S.pendingDecision) {
    banner.innerHTML = `<button class="hud-banner-btn" data-action="noop">${esc(TUTORIAL_STEPS[S.tutorial].hint)}</button>`;
  } else if (S.pendingDecision) {
    banner.innerHTML = `<button class="hud-banner-btn" data-action="open-decision">⚡ Decision time — tap to choose</button>`;
  } else if (gameDay && !inside) {
    banner.innerHTML = `<button class="hud-banner-btn gold" data-action="goto-game">Game day vs ${esc(E.nextOpponent())}${a.injury ? ' — play hurt?' : ''} — tap to play</button>`;
  } else {
    banner.innerHTML = '';
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  hud.querySelector('.hud-hint').textContent = inside
    ? (coarse ? 'Walk up to things to use them' : 'WASD / arrows to move · E to use · walk up to things')
    : (coarse ? 'Walk to a building to enter · drag to look around' : 'WASD / arrows to move · walk into a building to enter');
  hud.querySelector('.hud-context').innerHTML = inside
    ? '<button class="hud-cta" data-action="leave-interior">← Island</button>' : '';
}

/* ---------------- panels ---------------- */
function openPanel(id) {
  panelOpen = id;
  if (worldReady) W.setPanelShift(true);
  renderPanel();
  updateHUD();
}
function closePanel(rerender = true) {
  panelOpen = null;
  if (worldReady) W.setPanelShift(false);
  const pr = document.getElementById('panel-root');
  if (pr) pr.innerHTML = '';
  if (rerender && E.getState() && !E.getState().athlete.retired) updateHUD();
}
function renderPanel() {
  if (!panelOpen) return;
  const meta = panelOpen === 'drills' && drillCtx
    ? { title: drillCtx.title, ico: drillCtx.ico }
    : PANEL_META[panelOpen];
  const content = {
    sleep: tabSleep, train: tabTrain, drills: tabDrills, season: tabSeason,
    gear: tabGear, staff: tabStaff, services: tabServices,
    journal: tabJournal, settings: tabSettings,
  }[panelOpen]();
  document.getElementById('panel-root').innerHTML = `
    <div class="panel-backdrop" data-action="close-panel">
      <div class="panel">
        <div class="panel-head">
          <b>${meta.ico} ${meta.title}</b>
          <button class="panel-close" data-action="close-panel" aria-label="Close">✕</button>
        </div>
        <div class="panel-body stack">${content}</div>
      </div>
    </div>`;
}

/* ---------------- SLEEP panel ---------------- */
function tabSleep() {
  const S = E.getState();
  const hist = S.sleep.history.slice(-14);
  const last = hist[hist.length - 1];
  const gear = E.gearBonuses();
  const provider = PROVIDERS[S.sleep.provider];

  return `
    <div class="card" style="border-color:color-mix(in srgb, var(--accent) 45%, transparent)">
      <p class="small muted mb-8">End the day: your athlete gets in bed, and tonight's sleep sets tomorrow's energy, training power, and RP.</p>
      <button class="btn primary block" data-action="next-day">🌙 Sleep → Next day</button>
      ${S.sleep.provider === 'demo' ? '<button class="btn ghost block small mt-8" data-action="sim-week">⏩ Quick-sim 7 days (auto train & play)</button>' : ''}
    </div>

    <div class="card">
      <div class="card-title"><h3>Last night</h3>
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
      </div>` : '<p class="muted small">No nights recorded yet — hit Sleep to start.</p>'}
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
      <div class="card-title"><h3>Auto-sync</h3><span class="hint">${S.sync.status ? esc(S.sync.status) : 'not connected'}</span></div>
      <p class="small muted mb-8">Point SLEEPER at a companion sync server and real nights flow in automatically — zero input. (Server setup lives in the repo: <b>sleeper-sync-worker</b>.)</p>
      <div class="field"><label>Server URL</label><input id="sync-url" type="url" placeholder="https://your-worker.workers.dev" value="${esc(S.sync.url)}"></div>
      <div class="field"><label>Access token</label><input id="sync-token" type="password" placeholder="token" value="${esc(S.sync.token)}"></div>
      <button class="btn block" data-action="sync-connect">${S.sync.url ? 'Save & sync now' : 'Connect'}</button>
    </div>

    <div class="card">
      <div class="card-title"><h3>Sleep boosts active</h3></div>
      <p class="small muted">Gear & staff: <b class="spark">+${gear.sleep}</b> sleep score · <b class="spark">+${gear.recovery}</b> recovery · <b class="spark">+${gear.energy}</b> energy.
      ${S.athlete.habit !== 0 ? `<br>Lifestyle habits: <b style="color:${S.athlete.habit > 0 ? 'var(--green)' : 'var(--red)'}">${S.athlete.habit > 0 ? '+' : ''}${Math.round(S.athlete.habit)}</b> to nightly baseline (built by your story choices).` : ''}</p>
    </div>

    <div class="card">
      <div class="card-title"><h3>Why it matters</h3></div>
      <p class="small muted">
        Energy comes from sleep alone: the score fills your morning tank and sets how fast it refills through the day (an elite night refills ~5× faster than a rough one).<br>
        Training gains scale <b>0.4× to 1.5×</b> with recovery.<br>
        Game performance uses recovery, fatigue and energy.<br>
        Poor recovery + high fatigue = <b style="color:var(--red)">injury risk</b>.<br>
        70+ scores build a streak: 3+ nights = bonus RP, 7+ = big bonus.<br>
        After age 27, elite sleep literally slows your decline.
      </p>
    </div>`;
}

function drillGridHtml(drills, recommended, a) {
  return `
    <div class="drill-grid">
      ${drills.map((d) => {
        const cantAfford = a.energy < d.energy || (a.injury && d.intensity > 1);
        return `
        <div class="drill ${d.locked || cantAfford ? 'disabled' : ''}" data-action="train" data-id="${d.id}">
          <span class="d-ico">${d.ico}</span>
          ${d.locked ? `<span class="d-lock">🔒</span>` : `<span class="d-cost">${'⚡'.repeat(d.energy)}</span>`}
          <b>${recommended.includes(d.id) && !d.locked ? '⭐ ' : ''}${d.name}</b>
          <span class="d-targets">${Object.entries(d.targets).map(([k, v]) => `${ATTRS[k].name} +${v}`).join(' · ')}</span>
          <span class="d-targets faint">${d.locked ? d.lockReason : d.desc}</span>
        </div>`;
      }).join('')}
    </div>`;
}

function sessionLineHtml(S, a) {
  return `
    <div class="card">
      <div class="card-title"><h3>Today</h3>
        <span class="hint">⚡${Math.floor(a.energy)} energy · ${energyPips(a.energy)}</span>
      </div>
      <p class="small muted">Recovery multiplier: <b style="color:var(--green)">×${(0.4 + S.today.recovery / 100 * 1.1).toFixed(2)}</b>
        · Facility: <b>${FACILITIES[S.owned.facility].name}</b>
        ${a.injury ? ` · <b style="color:var(--red)">🤕 ${a.injury.name} — light work only</b>` : ''}</p>
    </div>`;
}

/* Filtered drills — opened by walking up to equipment */
function tabDrills() {
  const S = E.getState();
  const a = S.athlete;
  const keys = new Set(drillCtx?.keys || []);
  const drills = E.availableDrills().filter((d) => Object.keys(d.targets).some((k) => keys.has(k)));
  const recommended = E.recommendDrills().slice(0, 3).map((d) => d.id);
  const relevant = [...keys].filter((k) => ATTRS[k]);
  return `
    ${sessionLineHtml(S, a)}
    <div class="card">
      ${relevant.map((k) => bar(ATTRS[k].name, a.attrs[k], a.caps[k], ATTRS[k].ico)).join('')}
    </div>
    <div class="card">
      <div class="card-title"><h3>Drills here</h3><span class="hint">⭐ = best value for your build</span></div>
      ${drillGridHtml(drills, recommended, a)}
    </div>`;
}

/* ---------------- TRAIN panel ---------------- */
function tabTrain() {
  const S = E.getState();
  const a = S.athlete;
  const drills = E.availableDrills();
  const recommended = E.recommendDrills().slice(0, 3).map((d) => d.id);

  const physBars = PHYS_KEYS.map((k) => bar(ATTRS[k].name, a.attrs[k], a.caps[k], ATTRS[k].ico)).join('');
  const sportsCards = a.youthSports.map((sid) => {
    const ys = YOUTH_SPORTS[sid];
    const spec = SPORTS[sid];
    const tag = a.mainSport === sid ? '<span class="tag accent">MAIN</span>'
      : a.mainSport && spec ? '<span class="tag">CHILDHOOD</span>'
      : !spec ? '<span class="tag gold">CROSS-TRAIN</span>' : '';
    const body = spec
      ? spec.skills.map((k) => bar(ATTRS[k].name, a.attrs[k], a.caps[k], ATTRS[k].ico)).join('')
      : `<p class="small muted">${Object.entries(ys.grow).map(([k, v]) => `+${Math.round(v * 100)}% ${ATTRS[k].name} growth`).join(' · ')}<br><span class="faint xs">Motor patterns from ${ys.name} boost every relevant session, forever.</span></p>`;
    return `
      <div class="card">
        <div class="card-title"><h3>${ys.ico} ${ys.name}</h3>${tag}</div>
        ${body}
      </div>`;
  }).join('');

  return `
    ${sessionLineHtml(S, a)}
    <div class="card">
      <div class="card-title"><h3>Badges</h3><span class="hint">passive perks</span></div>
      ${E.earnedBadges().length
        ? E.earnedBadges().map((b) => `<div class="goal-row done"><span class="g-check">✓</span><span class="g-text"><b>${b.ico} ${b.name}</b> — ${b.desc}</span></div>`).join('')
        : '<p class="small muted">Push a skill past its threshold to unlock passive perks (Shooting 75 → Deadeye, Endurance 75 → Motor, Strength 70 → Iron Body…).</p>'}
    </div>
    ${goalsCard(S)}
    <div class="card">
      <button class="btn block" data-action="auto-train" ${a.energy < 1 ? 'disabled' : ''}>Auto-train (best value)</button>
    </div>

    <div class="card">
      <div class="card-title"><h3>Athleticism</h3><span class="hint">grey = potential</span></div>
      ${physBars}
    </div>
    ${sportsCards}

    <div class="card">
      <div class="card-title"><h3>All drills</h3><span class="hint">⭐ = best value for your build</span></div>
      ${drillGridHtml(drills, recommended, a)}
    </div>`;
}

function goalsCard(S) {
  if (!S.goals) return '';
  return `
    <div class="card">
      <div class="card-title"><h3>Coach's goals</h3><span class="hint">reset weekly</span></div>
      ${S.goals.items.map((g) => `
        <div class="goal-row ${g.done ? 'done' : ''}">
          <span class="g-check">${g.done ? '✓' : ''}</span>
          <span class="g-text">${esc(g.text)}</span>
          <span class="g-rp">${g.done ? 'paid' : `${Math.min(g.progress, g.target)}/${g.target} · +${g.rp}✦`}</span>
        </div>`).join('')}
    </div>`;
}

/* ---------------- SEASON panel ---------------- */
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
      <div class="card-title"><h3>${ERA_INFO[a.era].name} — Age ${a.age}</h3>
        <span class="tag ${g.wins >= g.losses ? 'green' : 'red'}">${g.wins}–${g.losses}</span>
      </div>
      <div style="display:flex; gap:7px; align-items:center; flex-wrap:wrap">
        ${gameDays.map((d) => {
          const past = d < a.dayOfYear || (d === a.dayOfYear && S.today.gamePlayed);
          const isNext = !past && d === Math.min(...gameDays.filter((x) => x >= a.dayOfYear));
          return `<span class="schedule-dot ${isNext ? 'next' : ''}" title="Day ${d}"></span>`;
        }).join('')}
        <span class="xs faint">day ${a.dayOfYear} of ${yearLen}</span>
      </div>
      ${E.isGameDay() && (!a.injury || a.injury.daysLeft <= 2) ? `<button class="btn primary block mt-12" data-action="play-game">${a.injury ? `Play hurt vs ${esc(E.nextOpponent())} (risky)` : `Play today's game vs ${esc(E.nextOpponent())}`}</button>` : ''}
      ${a.injury ? `
        <div class="row mt-12" style="border-color:rgba(251,113,133,.35)">
          <div class="row-ico">🩹</div>
          <div class="row-main"><b>${esc(a.injury.name)}</b><span class="sub">${a.injury.daysLeft} day(s) left. Rehab shaves a day; expect one rusty game back.</span></div>
          <div class="row-side"><button class="btn small ${a.energy >= 2 && !S.today.rehabbed ? 'primary' : ''}" data-action="rehab" ${a.energy >= 2 && !S.today.rehabbed ? '' : 'disabled'}>Rehab ⚡2</button></div>
        </div>` : ''}
      ${a.rustGames > 0 ? '<p class="small mt-8" style="color:var(--gold)">Shaking off rust — next game comes with a small penalty.</p>' : ''}
    </div>

    <div class="card">
      <div class="card-title"><h3>Locker room</h3><span class="hint">chemistry ${S.team ? S.team.chemistry : 0}/100</span></div>
      ${(S.team?.mates || []).map((m) => `
        <div class="table-row"><span>·</span><span>${esc(m.name)}</span><b>${m.rating}</b><b></b></div>`).join('')}
      <p class="xs faint mt-8">Chemistry grows with wins and pickup runs — a connected team wins games your stat line doesn't.</p>
    </div>

    ${goalsCard(S)}

    <div class="card">
      <div class="card-title"><h3>Standings</h3><span class="hint">${ERA_INFO[a.era].name}</span></div>
      <div class="table-row head"><span>#</span><span>Team</span><b>W</b><b>L</b></div>
      ${E.standings().map((r, i) => `
        <div class="table-row ${r.you ? 'you' : ''}"><span>${i + 1}</span><span>${esc(r.name)}</span><b>${r.w}</b><b>${r.l}</b></div>`).join('')}
    </div>

    <div class="card">
      <div class="card-title"><h3>Rivalry</h3><span class="hint">since age 8</span></div>
      <div class="boxline">
        <div><b>${S.rival.w}</b><span>You</span></div>
        <div><b>—</b><span>vs</span></div>
        <div><b>${S.rival.l}</b><span>${esc(S.rival.name.split(' ')[0])}</span></div>
      </div>
      <p class="xs faint center">${esc(S.rival.name)} keeps showing up in the biggest games. ${S.rival.w > S.rival.l ? 'You own the matchup — for now.' : S.rival.w < S.rival.l ? 'They own the matchup. Fix that.' : 'Dead even. Someone has to break it.'}</p>
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
      <div class="card-title"><h3>Records</h3><span class="hint">career highs</span></div>
      <div class="boxline">
        <div><b>${S.records.highA}</b><span>${labels.a}</span></div>
        <div><b>${S.records.highB}</b><span>${labels.b}</span></div>
        <div><b>${S.records.highC}</b><span>${labels.c}</span></div>
        <div><b>${S.records.winStreak}</b><span>Streak</span></div>
      </div>
      <p class="xs faint center">Best sleep streak: ${S.records.bestSleepStreak} nights</p>
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

/* ---------------- SHOP panels (counter / shelf / massage table) ---------------- */
function rpHeader(S) {
  return `
    <div class="card" style="display:flex; justify-content:space-between; align-items:center">
      <div><h3 style="font-size:16px">Rest Points</h3><p class="xs faint">Earned every night you sleep well — and every win.</p></div>
      <span class="rp-chip" style="font-size:17px">✦ ${S.rp}</span>
    </div>`;
}

function tabGear() {
  const S = E.getState();
  const eraIdx = ERAS.indexOf(S.athlete.era);
  return `
    ${rpHeader(S)}
    <div class="card">
      <div class="card-title"><h3>Recovery gear</h3><span class="hint">passive — and it appears in your house</span></div>
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
    </div>`;
}

function tabStaff() {
  const S = E.getState();
  const eraIdx = ERAS.indexOf(S.athlete.era);
  const fac = FACILITIES[S.owned.facility];
  const nextFac = FACILITIES[S.owned.facility + 1];
  return `
    ${rpHeader(S)}
    <div class="card">
      <div class="card-title"><h3>Gym building</h3><span class="tag accent">${fac.ico} ${fac.name}</span></div>
      ${nextFac ? `
        <div class="row">
          <div class="row-ico">${nextFac.ico}</div>
          <div class="row-main"><b>${nextFac.name}</b><span class="sub">${nextFac.desc} (+${Math.round(nextFac.mult * 100)}% all gains) — upgrades the gym on your island!</span></div>
          <div class="row-side">
            <button class="btn small ${S.rp >= nextFac.cost ? 'primary' : ''}" data-action="buy-facility" ${S.rp >= nextFac.cost ? '' : 'disabled'}>✦ ${nextFac.cost}</button>
          </div>
        </div>` : '<p class="small muted">You train at the best lab in the world. 🧪</p>'}
    </div>
    <div class="card">
      <div class="card-title"><h3>Coaching staff</h3><span class="hint">tiers stack</span></div>
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
    </div>`;
}

function tabServices() {
  const S = E.getState();
  return `
    ${rpHeader(S)}
    <div class="card">
      <div class="card-title"><h3>One-time boosts</h3></div>
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

/* ---------------- JOURNAL panel ---------------- */
function tabJournal() {
  const S = E.getState();
  return `
    <div class="card">
      <div class="card-title"><h3>The Feed</h3><span class="hint">what the town is saying</span></div>
      ${(S.feed || []).slice(0, 12).map((p) => `
        <div class="feed-post">
          <p>${esc(p.text)}</p>
          <span class="xs faint">age ${p.age} · ♥ ${p.likes}</span>
        </div>`).join('') || '<p class="small muted">Nothing yet — go make some noise.</p>'}
    </div>

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

`;
}

/* ---------------- SETTINGS panel (the dresser) ---------------- */
function tabSettings() {
  const S = E.getState();
  return `
    <div class="card">
      <div class="card-title"><h3>Sound & alerts</h3></div>
      <div class="row selectable" data-action="toggle-sound">
        <div class="row-ico">${S.settings.sound ? '🔊' : '🔇'}</div>
        <div class="row-main"><b>Sound & haptics</b><span class="sub">Game effects and vibration.</span></div>
        <span class="tag ${S.settings.sound ? 'green' : ''}">${S.settings.sound ? 'ON' : 'OFF'}</span>
      </div>
      <div class="row selectable mt-8" data-action="toggle-notify">
        <div class="row-ico">🔔</div>
        <div class="row-main"><b>Notifications</b><span class="sub">Alert when your energy tank is full (while the app is in the background).</span></div>
        <span class="tag ${S.settings.notify ? 'green' : ''}">${S.settings.notify ? 'ON' : 'OFF'}</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title"><h3>Save</h3></div>
      <div class="grid-2">
        <button class="btn small" data-action="export-save">⬇️ Export save</button>
        <button class="btn small" data-action="import-save">⬆️ Import save</button>
      </div>
      ${S.sync?.url ? `
      <div class="grid-2 mt-8">
        <button class="btn small" data-action="cloud-push">☁️ Push to cloud</button>
        <button class="btn small" data-action="cloud-pull">☁️ Pull from cloud</button>
      </div>
      <p class="xs faint mt-8">Cloud save uses your sync server — one career across phone and desktop.</p>`
      : '<p class="xs faint mt-8">Connect a sync server (Home → nightstand) to enable cloud saves across devices.</p>'}
      <button class="btn small danger block mt-8" data-action="reset-confirm">🗑️ Reset career</button>
    </div>
    <div class="card">
      <div class="card-title"><h3>Controls</h3></div>
      <p class="small muted">Move with the joystick (or WASD / arrow keys). Walk up to anything and a prompt appears — tap it, or press E. Drag empty space to look around, pinch or scroll to zoom.</p>
      <p class="xs faint mt-8">SLEEPER v2.0 · an installable web app — use your browser's "Add to Home Screen" / "Install" to get the mobile & desktop app. Saves live on this device.</p>
    </div>`;
}

/* ---------------- retired overlay ---------------- */
function renderRetired() {
  hideWorld();
  document.body.className = 'era-pro';
  const S = E.getState();
  const legacy = E.legacyScore();
  $app().style.display = '';
  $app().innerHTML = `
    <div class="stack" style="padding-top:16px">
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
        <button class="btn block" data-action="career-card">Download career card</button>
        <button class="btn primary block mt-8" data-action="new-career">Start a new career</button>
      </div>
      <div class="card">
        <div class="card-title"><h3>Hall of Legacies</h3><span class="hint">every career on this device</span></div>
        ${E.hallList().map((h) => `
          <div class="journal-item">
            <span class="j-day">${esc(h.title)}</span>
            <span class="j-text milestone">${esc(h.name)} — ${h.wins}W · ${h.trophies}🏆 · ${h.awards} award${h.awards === 1 ? '' : 's'} · legacy ${h.pts}${h.draft?.round ? ` · R${h.draft.round} pick` : ''}</span>
          </div>`).join('') || '<p class="small muted">This career will be the first inductee.</p>'}
      </div>
    </div>`;
}

/* Render a shareable career-card PNG and download it */
function downloadCareerCard() {
  const S = E.getState();
  const legacy = E.legacyScore();
  const c = document.createElement('canvas');
  c.width = 800; c.height = 460;
  const g = c.getContext('2d');
  g.fillStyle = '#0b101f'; g.fillRect(0, 0, 800, 460);
  g.strokeStyle = '#ffd166'; g.lineWidth = 6; g.strokeRect(14, 14, 772, 432);
  g.fillStyle = '#ffd166'; g.font = '700 22px system-ui';
  g.fillText('SLEEPER · CAREER CARD', 40, 60);
  g.fillStyle = '#eef2ff'; g.font = '800 52px system-ui';
  g.fillText(`${S.athlete.look?.number != null ? '#' + S.athlete.look.number + ' ' : ''}${S.athlete.name}`, 40, 125);
  g.fillStyle = '#9aa5c4'; g.font = '600 26px system-ui';
  const pos = S.athlete.position ? SPORTS[S.athlete.mainSport].positions[S.athlete.position].name : '';
  g.fillText(`${SPORTS[S.athlete.mainSport]?.name || ''} ${pos} · retired at ${S.athlete.age}`, 40, 165);
  g.fillStyle = '#eef2ff'; g.font = '800 34px system-ui';
  g.fillText(legacy.title, 40, 225);
  g.font = '600 24px system-ui'; g.fillStyle = '#9aa5c4';
  const lines = [
    `${S.career.wins} career wins · ${S.career.trophies.length} titles · ${S.career.awards.length} awards`,
    S.athlete.draft ? (S.athlete.draft.round ? `Draft: Round ${S.athlete.draft.round}, pick ${S.athlete.draft.pickNo} — ${S.athlete.draft.team}` : 'Undrafted — earned everything') : '',
    `vs ${S.rival.name}: ${S.rival.w}–${S.rival.l} lifetime`,
    `Best sleep streak: ${S.records.bestSleepStreak} nights`,
  ].filter(Boolean);
  lines.forEach((l, i) => g.fillText(l, 40, 275 + i * 38));
  g.fillStyle = '#22d3ee'; g.font = '700 20px system-ui';
  g.fillText('Sleep. Recover. Become.', 40, 430);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `sleeper-career-${S.athlete.name.replace(/\s+/g, '-')}.png`;
  a.click();
}

/* ---------------- main render ---------------- */
export function render() {
  const S = E.getState();
  if (!S) { renderOnboarding(); return; }
  for (const news of E.consumeGoalNews()) { toast(news, 'good', '🧢'); sfx('gain'); }
  if (S.athlete.retired) { renderRetired(); return; }
  document.body.className = `era-${S.athlete.era}`;
  ensureWorld();
  W.syncWorld(S);
  updateHUD();
  if (panelOpen) renderPanel();
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
            <button class="choice-btn" data-action="choice" data-key="${k}">
              <b>${esc(e[k].label)}</b><span>${esc(e[k].sub)}</span>
            </button>`).join('')}
        </div>`, { dismissable: false });
      pendingChoiceEvent = e;
    } else if (ev.type === 'gameday') {
      showModal(`
        <p class="modal-kicker">🏟️ Game day</p>
        <h2>vs ${esc(ev.opponent)}</h2>
        <p class="modal-body">Tonight's opponent is warming up at the stadium. Train light, manage energy, and show up ready.</p>
        <div class="modal-actions">
          <button class="btn primary" data-action="play-game-modal">Head to the stadium</button>
          <button class="btn ghost" data-action="close-modal">Train first</button>
        </div>`);
    } else if (ev.type === 'season') {
      showModal(`
        ${ev.trophy ? `<div class="modal-art">${vignette('trophy')}</div>` : ''}
        <p class="modal-kicker">📊 Season complete</p>
        <h2>${ev.record}${ev.place ? ` · ${ev.place}${['st', 'nd', 'rd'][ev.place - 1] || 'th'} of ${ev.teams}` : ''}</h2>
        ${ev.bracket ? `
        <div class="gain-list">
          ${ev.bracket.map((b) => `
            <div class="gain-row"><span>${esc(b.round)} vs ${esc(b.opponent)}</span><b style="color:${b.win ? 'var(--green)' : 'var(--red)'}">${b.win ? 'W' : 'L'}</b></div>`).join('')}
        </div>` : '<p class="small muted">Missed the playoffs — better sleep, better seasons.</p>'}
        <p class="modal-body">${ev.trophy ? `${ev.trophy}! ` : ''}${ev.award ? `Named ${ev.award}. ` : ''}Averaged ${ev.perGame} per game.</p>
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
  } else if (d.type === 'contract') {
    showModal(`
      <p class="modal-kicker">🖊️ Contract talks</p>
      <h2>Three offers on the table.</h2>
      <p class="modal-body">Your agent slides the folder across. ${d.mult > 1.3 ? 'The prove-it bet paid off — these numbers are inflated in your favor.' : d.mult < 0.9 ? 'The market cooled after a quiet stretch.' : 'Fair market, solid leverage.'}</p>
      <div class="modal-actions">
        ${CONTRACT_OFFERS.map((o) => `
          <button class="choice-btn" data-action="choose-contract" data-id="${o.id}">
            <b>${o.label} · +${Math.round(o.rp * (d.mult || 1))} ✦</b><span>${o.sub}</span>
          </button>`).join('')}
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
function openImport() {
  showModal(`
    <p class="modal-kicker">📥 Device import</p>
    <h2>Paste CSV export</h2>
    <p class="modal-body">Header row + one row per night. Recognized columns: date, hours/duration, efficiency, deep, rem, resting_hr, score. Example:\n\ndate,hours,efficiency,deep,rem,score\n2026-07-01,7.6,91,18,22,84</p>
    <div class="field"><textarea id="imp-csv" rows="6" placeholder="date,hours,efficiency,deep,rem&#10;2026-07-01,7.6,0.91,0.18,0.22"></textarea></div>
    <button class="btn primary block" data-action="import-csv">Queue nights</button>
  `);
}

/* ---------------- shot meter ----------------
   A timing bar before every official game: your key skill widens
   the sweet spot, your tap adds up to +7 to the performance sim.
   Three attempts, averaged. Skippable (bonus 0).               */
function meterLabels(sport) {
  return sport === 'soccer' ? 'Penalty kick' : sport === 'football' ? 'Two-minute drill' : 'Free throws';
}
function keySkillValue(S) {
  const a = S.athlete;
  const sport = a.mainSport || a.youthSports.find((x) => SPORTS[x]) || 'basketball';
  const key = sport === 'soccer' ? 'strike' : sport === 'football' ? (a.position === 'qb' ? 'arm' : 'hands') : 'shoot';
  return a.attrs[key] || 20;
}
function runShotMeter() {
  const S = E.getState();
  const zone = 8 + Math.min(24, keySkillValue(S) / 4); // sweet-spot half-width, % of bar
  const sport = S.athlete.mainSport || 'basketball';
  return new Promise((resolve) => {
    let attempt = 0, results = [], pos = 0, dir = 1, raf = null, done = false;
    const root = document.createElement('div');
    root.id = 'meter';
    root.innerHTML = `
      <div class="meter-box">
        <p class="modal-kicker">${SPORTS[sport]?.ico || '🏀'} ${meterLabels(sport)}</p>
        <h2 class="meter-count">1 / 3</h2>
        <div class="meter-bar">
          <div class="meter-zone" style="left:${50 - zone}%; width:${zone * 2}%"></div>
          <div class="meter-mark"></div>
        </div>
        <p class="small muted center mt-8">Tap when the marker is in the zone</p>
        <button class="btn ghost small block mt-8" data-meter="skip">Skip warmup</button>
      </div>`;
    document.body.appendChild(root);
    const mark = root.querySelector('.meter-mark');
    const count = root.querySelector('.meter-count');
    const speed = 1.7;
    let last = performance.now();
    const step = (now) => {
      const dt = (now - last) / 1000; last = now;
      pos += dir * speed * dt * 100;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      mark.style.left = pos + '%';
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const finish = () => {
      done = true;
      cancelAnimationFrame(raf);
      root.remove();
      const avg = results.length ? results.reduce((x, y) => x + y, 0) / results.length : 0;
      resolve(Math.round(avg * 7 * 10) / 10); // 0..+7 perf bonus
    };
    const tap = (ev) => {
      if (ev.target.dataset?.meter === 'skip') { results = []; finish(); return; }
      const dist = Math.abs(pos - 50);
      const quality = Math.max(0, 1 - dist / (zone * 1.6));
      results.push(quality);
      sfx(quality > 0.75 ? 'swish' : 'meterTick');
      mark.classList.add(quality > 0.75 ? 'hit' : 'miss');
      setTimeout(() => mark.classList.remove('hit', 'miss'), 180);
      attempt++;
      if (attempt >= 3) setTimeout(finish, 220);
      else count.textContent = `${attempt + 1} / 3`;
    };
    root.addEventListener('pointerdown', tap);
    const keyTap = (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); tap(ev); }
      if (done) window.removeEventListener('keydown', keyTap);
    };
    window.addEventListener('keydown', keyTap);
  });
}

/* ---------------- device auto-sync ----------------
   Pull normalized nights from the companion server; each becomes
   the next in-game night. Silent when unconfigured.            */
async function fetchSyncNights(verbose = false) {
  const S = E.getState();
  if (!S || !S.sync?.url) return;
  try {
    const url = `${S.sync.url.replace(/\/$/, '')}/nights${S.sync.lastDate ? `?since=${encodeURIComponent(S.sync.lastDate)}` : ''}`;
    const res = await fetch(url, { headers: S.sync.token ? { Authorization: `Bearer ${S.sync.token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const nights = (data.nights || []).map((n) => ({
      date: n.date || null,
      hours: n.hours ?? 7.5,
      efficiency: n.efficiency > 1.5 ? n.efficiency / 100 : (n.efficiency ?? 0.88),
      deepPct: n.deep > 1.5 ? n.deep / 100 : (n.deep ?? 0.15),
      remPct: n.rem > 1.5 ? n.rem / 100 : (n.rem ?? 0.18),
      consistency: 0.75,
      restingHR: n.restingHR ?? null,
      ageHint: S.athlete.age,
      score: n.score ?? undefined,
      source: 'sync',
    }));
    for (const n of nights) if (n.score === undefined || isNaN(n.score)) n.score = scoreNight(n);
    if (nights.length) {
      E.queueImportedNights(nights);
      E.setProvider('import');
      const last = nights[nights.length - 1].date || new Date().toISOString().slice(0, 10);
      E.noteSync(`synced ${nights.length} night(s)`, last);
      if (verbose) toast(`Synced ${nights.length} night(s) from your device`, 'good', '⌚');
    } else {
      E.noteSync('up to date', null);
      if (verbose) toast('Sync connected — no new nights yet', 'good', '⌚');
    }
  } catch (err) {
    E.noteSync(`error: ${err.message}`, null);
    if (verbose) toast(`Sync failed: ${err.message}`, 'bad', '⚠️');
  }
}

/* ---------------- native app bridge ---------------- */
/* The Flutter shell (sleeper_flutter/) injects real sleep from Apple
   Health / Health Connect here. Same normalization as worker sync. */
window.__sleeperNative = {
  lastSyncDate() { return E.getState()?.sync?.lastDate || ''; },
  pushNights(raw) {
    const S = E.getState();
    if (!S?.athlete) return 0;
    const seen = S.sync?.lastDate || '';
    const nights = (raw || [])
      .filter((n) => n && n.date && (!seen || n.date > seen))
      .map((n) => ({
        date: n.date,
        hours: n.hours ?? 7.5,
        efficiency: n.efficiency > 1.5 ? n.efficiency / 100 : (n.efficiency ?? 0.88),
        deepPct: n.deep > 1.5 ? n.deep / 100 : (n.deep ?? 0.15),
        remPct: n.rem > 1.5 ? n.rem / 100 : (n.rem ?? 0.18),
        consistency: 0.75,
        restingHR: n.restingHR ?? null,
        ageHint: S.athlete.age,
        score: n.score ?? undefined,
        source: 'health',
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const n of nights) if (n.score === undefined || isNaN(n.score)) n.score = scoreNight(n);
    if (!nights.length) { E.noteSync('health: up to date', null); return 0; }
    E.queueImportedNights(nights);
    E.setProvider('import');
    E.noteSync(`health: ${nights.length} night(s)`, nights[nights.length - 1].date);
    toast(`Synced ${nights.length} night(s) from Health`, 'good', '⌚');
    return nights.length;
  },
};

/* ---------------- cloud save ---------------- */
async function cloudPush(verbose = false) {
  const S = E.getState();
  if (!S?.sync?.url) return;
  try {
    const res = await fetch(`${S.sync.url.replace(/\/$/, '')}/save`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${S.sync.token}`, 'content-type': 'application/json' },
      body: E.exportSave(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (verbose) toast('Career pushed to the cloud', 'good', '☁️');
  } catch (err) {
    if (verbose) toast(`Cloud push failed: ${err.message}`, 'bad', '⚠️');
  }
}

async function cloudPull(verbose = false) {
  const S = E.getState();
  if (!S?.sync?.url) return;
  try {
    const res = await fetch(`${S.sync.url.replace(/\/$/, '')}/save`, {
      headers: { Authorization: `Bearer ${S.sync.token}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json();
    if (!remote?.athlete) { if (verbose) toast('No cloud save yet — push one first.', '', '☁️'); return; }
    if (!verbose && remote.meta?.updated <= (S.meta?.updated || 0)) return; // auto mode: only newer
    E.importSave(JSON.stringify(remote));
    toast('Cloud save loaded', 'good', '☁️');
    render();
  } catch (err) {
    if (verbose) toast(`Cloud pull failed: ${err.message}`, 'bad', '⚠️');
  }
}

/* ---------------- the sleep flow (walk home → night → morning) ---------------- */
async function sleepFlow(night) {
  const S = E.getState();
  if (busy) return;
  if (S.pendingDecision) { openDecision(); return; }
  busy = true;
  closePanel(false);
  try {
    // head home and get in bed
    if (worldReady && W.inInterior() !== 'house') {
      if (W.inInterior()) { await fade(true); W.exitInterior(); await fade(false); }
      await W.walkTo('house');
      await fade(true); W.enterInterior('house'); updateHUD(); await fade(false);
    }
    const res = night ? E.advanceDay(night) : E.advanceDay();
    if (res.error) { toast(res.error, 'bad', '⚠️'); return; }
    sfx('sleep');
    if (worldReady) {
      W.setSleeping(true);
      await W.nightTransition(); // resolves at deepest night
      W.setSleeping(false);
      // wake up back out on the island as dawn breaks
      await fade(true); W.exitInterior(); await fade(false);
    }
    updateHUD();
    queueModals([() => showMorningReport(res), ...eventModalFns(res.morning)]);
    tut(2);
    cloudPush();
  } finally {
    busy = false;
  }
}

async function gameFlow() {
  const S = E.getState();
  if (busy) return;
  busy = true;
  closePanel(false);
  try {
    // take the court
    if (worldReady && W.inInterior() !== 'stadium') {
      if (W.inInterior()) { await fade(true); W.exitInterior(); await fade(false); }
      await W.walkTo('stadium');
      await fade(true); W.enterInterior('stadium'); updateHUD(); await fade(false);
    }
    const bonus = await runShotMeter();
    const h = E.startGame(bonus);
    if (h.error) { toast(h.error, 'bad', '⚠️'); return; }
    if (worldReady) await W.playAction('dribble', 1.6);
    sfx('whistle');
    updateHUD();
    const lead = h.half.you - h.half.them;
    showModal(`
      <p class="modal-kicker">${SPORTS[h.sport].ico} Halftime vs ${esc(h.opponent)}</p>
      <h2>${h.half.you}–${h.half.them} ${lead > 0 ? '— you’re up' : lead < 0 ? '— you’re down' : '— all tied'}</h2>
      ${h.rivalName ? `<p class="small" style="color:var(--gold)">${esc(h.rivalName)} is on the other side tonight.</p>` : ''}
      ${h.playingHurt ? '<p class="small" style="color:var(--red)">You’re playing hurt — one wrong step could aggravate it.</p>' : ''}
      <p class="modal-body">Coach looks at you in the locker room. What’s the second half?</p>
      <div class="modal-actions">
        <button class="choice-btn" data-action="half-choice" data-id="takeover"><b>Take over</b><span>Put the team on your back. More shots, more fatigue.</span></button>
        <button class="choice-btn" data-action="half-choice" data-id="trust"><b>Trust the room</b><span>Move the ball through ${esc(h.bestMate)} — chemistry grows either way.</span></button>
        <button class="choice-btn" data-action="half-choice" data-id="lockdown"><b>Lock in on defense</b><span>Make ${esc(h.opponent)} earn every point.</span></button>
      </div>`, { dismissable: false });
  } finally {
    busy = false;
  }
}

function tickerLines(g) {
  const half = `Half: ${g.score.half.you}–${g.score.half.them}.`;
  const choiceLine = g.choice === 'takeover'
    ? 'You wave everyone off and start hunting your spot.'
    : g.choice === 'lockdown'
      ? `The second half turns into a rock fight — ${esc(g.opponent)} can’t breathe.`
      : `${esc(g.mate)} gets cooking as the ball starts moving.`;
  const swing = g.win
    ? (g.carried ? `${esc(g.mate)} takes over late and slams the door.` : 'You close it out yourself down the stretch.')
    : 'It slips away in the final minutes.';
  const rival = g.rival ? `${esc(g.rival.name)} ${g.rival.won ? 'walks off pointing at your bench.' : 'has nothing to say this time.'}` : null;
  return [half, choiceLine, swing, rival].filter(Boolean);
}

function showGameResult(g) {
  sfx(g.win ? 'win' : 'loss');
  buzz(g.win ? [30, 40, 60] : 60);
  if (g.win && worldReady) W.shakeCelebrate();
  updateHUD();
  showModal(`
    <p class="modal-kicker">${g.win ? 'Final' : 'Final'} vs ${esc(g.opponent)}</p>
    <h2>${g.win ? 'W' : 'L'} ${g.score.you}–${g.score.them}</h2>
    <div class="ticker">${tickerLines(g).map((l, i) => `<p class="ticker-line" style="animation-delay:${0.3 + i * 0.7}s">${l}</p>`).join('')}</div>
    <div class="boxline">
      <div><b>${g.line.a}</b><span>${g.labels.a}</span></div>
      <div><b>${g.line.b}</b><span>${g.labels.b}</span></div>
      <div><b>${g.line.c}</b><span>${g.labels.c}</span></div>
      <div><b>+${g.rp}✦</b><span>RP</span></div>
    </div>
    ${g.star ? '<p class="small" style="color:var(--green)">Best player on the floor tonight.</p>' : ''}
    ${g.aggravated ? '<p class="small" style="color:var(--red)">You aggravated the injury — extra days on the shelf.</p>' : ''}
    ${g.meterBonus > 3 ? `<p class="small" style="color:var(--green)">Warmup was dialed in: +${g.meterBonus} to your night.</p>` : ''}
    <button class="btn primary block mt-12" data-action="close-modal">Continue</button>`, { dismissable: false });
}

/* ---------------- actions ---------------- */
function handleAction(el, e) {
  const S = E.getState();
  const act = el.dataset.action;
  const id = el.dataset.id;

  switch (act) {
    case 'close-backdrop': if (e && e.target === el) closeModal(); break;
    case 'close-modal': closeModal(); break;

    /* onboarding */
    case 'ob-next': onboarding.step = 1; renderOnboarding(); break;
    case 'ob-name-next': {
      const v = document.getElementById('ob-name').value.trim();
      if (!v) { toast('Give your athlete a name!', 'bad', '✏️'); return; }
      onboarding.name = v; onboarding.step = 2; renderOnboarding(); break;
    }
    case 'ob-look': {
      onboarding.look[el.dataset.key] = +el.dataset.val;
      renderOnboarding(); break;
    }
    case 'ob-look-next': {
      onboarding.look.number = Math.max(0, Math.min(99, +document.getElementById('ob-num').value || 0));
      onboarding.step = 3; renderOnboarding(); break;
    }
    case 'ob-pick': {
      const i = onboarding.picks.indexOf(id);
      if (i >= 0) onboarding.picks.splice(i, 1);
      else if (onboarding.picks.length < 3) onboarding.picks.push(id);
      else toast('Three sports max — swap one out.', '', '⚖️');
      renderOnboarding(); break;
    }
    case 'ob-start': {
      E.createGame({ name: onboarding.name, youthSports: onboarding.picks, provider: onboarding.provider, look: onboarding.look });
      render();
      queueModals([() => showModal(`
        <p class="modal-kicker">🧢 Coach</p>
        <h2>Welcome to the island, ${esc(onboarding.name.split(' ')[0])}.</h2>
        <p class="modal-body">Everything here runs on your sleep — good nights fill your energy and make every rep count more. Let me show you around. First: head to The Park and play something.</p>
        <button class="btn primary block" data-action="close-modal">Let's go</button>`, { dismissable: false })]);
      break;
    }

    /* navigation */
    case 'close-panel': if (!e || e.target === el || el.classList.contains('panel-close')) closePanel(); break;
    case 'leave-interior': closePanel(false); leaveInterior(); break;
    case 'prompt-trigger': if (worldReady) W.triggerPrompt(); break;
    case 'goto-game': gameFlow(); break;

    /* day loop */
    case 'next-day': {
      if (S.pendingDecision) { openDecision(); return; }
      sleepFlow();
      break;
    }
    case 'sim-week': {
      if (busy) return;
      let days = 0;
      const summary = { games: 0, wins: 0, rp0: S.rp };
      while (days < 7) {
        if (S.pendingDecision) break;
        const res = E.advanceDay();
        if (res.error) break;
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
      if (worldReady) W.playAction(poseForDrill(r.drill), 1.7);
      sfx('gain');
      gainPop(r.gains);
      if (r.injury) { sfx('injury'); toast(`Injury: ${r.injury.name} — out ${r.injury.daysLeft} days`, 'bad', '🤕'); }
      tut(1);
      render(); break;
    }
    case 'auto-train': {
      const rs = E.autoTrain();
      if (!rs.length) { toast('Out of energy — sleep to recharge.', 'bad', '😴'); return; }
      if (worldReady && rs.length) W.playAction(poseForDrill(rs[0].drill), 1.7);
      const total = {};
      for (const r of rs) for (const [k, v] of Object.entries(r.gains)) total[k] = Math.round(((total[k] || 0) + v) * 10) / 10;
      gainPop(total);
      if (rs.some((r) => r.injury)) toast('Picked up a knock in training.', 'bad', '🤕');
      render(); break;
    }
    case 'play-game': gameFlow(); break;
    case 'rehab': {
      const r = E.rehab();
      if (r.error) { toast(r.error, 'bad', '🩹'); return; }
      if (worldReady) W.playAction('stretch', 1.6);
      toast(r.cleared ? 'Cleared to play — expect a little rust.' : `Rehab done — ${r.daysLeft} day(s) left.`, 'good', '🩹');
      render(); break;
    }
    case 'half-choice': {
      const g = E.finishGame(id);
      $modal().innerHTML = '';
      if (g.error) { toast(g.error, 'bad', '⚠️'); return; }
      queueModals([() => showGameResult(g)]);
      break;
    }
    case 'pickup': {
      const r = E.playPickup(id, el.dataset.size);
      if (r.error) { toast(r.error, 'bad', '⚠️'); return; }
      $modal().innerHTML = '';
      updateHUD();
      (async () => {
        if (worldReady) {
          closePanel(false);
          sfx('bounce');
          await W.playAction(r.session ? 'sprint' : 'dribble', 2.0);
          if (r.win) { W.shakeCelebrate(); sfx('win'); buzz([30, 40, 60]); }
          else if (r.win === false) sfx('loss');
        }
        gainPop(r.gains);
        queueModals([() => showPickupResult(r)]);
        tut(0);
      })();
      break;
    }
    case 'practice-drills': {
      $modal().innerHTML = '';
      const spec = SPORTS[id];
      if (spec) openDrillPanel(spec.skills, `${spec.name} Practice`, spec.ico);
      break;
    }
    case 'play-game-modal': $modal().innerHTML = ''; gameFlow(); break;

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
      openDecision();
      break;
    }
    case 'choose-position': {
      E.choosePosition(id);
      const p = SPORTS[E.getState().athlete.mainSport].positions[id];
      toast(`You're a ${p.name} now`, 'good', p.ico);
      closeModal(); break;
    }
    case 'choose-contract': {
      const r = E.chooseContract(id);
      if (r.error) { toast(r.error, 'bad', '🖊️'); return; }
      sfx('buy'); buzz(30);
      toast(`Signed: ${r.offer.label} (+${r.rp} RP)`, 'good', '🖊️');
      closeModal(); break;
    }
    case 'retire-yes': E.retire(true); closeModal(); break;
    case 'retire-no': E.retire(false); closeModal(); break;
    case 'career-card': downloadCareerCard(); break;
    case 'new-career': {
      E.resetGame();
      onboarding = { step: 0, name: '', picks: [], provider: 'demo' };
      render(); break;
    }

    /* economy */
    case 'buy-coach': { const r = E.buyCoach(id); if (r.error) toast(r.error, 'bad', '✦'); else { sfx('buy'); buzz(25); toast('Staff upgraded', 'good', '🧑‍🏫'); } render(); break; }
    case 'buy-facility': { const r = E.buyFacility(); if (r.error) toast(r.error, 'bad', '✦'); else { sfx('buy'); buzz(25); toast('Your gym just got bigger — check the island', 'good', '🏟️'); } render(); break; }
    case 'buy-gear': { const r = E.buyGear(id); if (r.error) toast(r.error, 'bad', '✦'); else { sfx('buy'); buzz(25); toast('Gear acquired — your house is upgrading', 'good', '📦'); } render(); break; }
    case 'use-service': { const r = E.useService(id); r.error ? toast(r.error, 'bad', '✦') : toast('Feeling fresher already.', 'good', '💆'); render(); break; }

    /* sleep providers */
    case 'set-provider': E.setProvider(id); toast(`Sleep source: ${PROVIDERS[id].name}`, 'good', PROVIDERS[id].ico); render(); break;
    case 'open-import': openImport(); break;
    case 'cloud-push': cloudPush(true); break;
    case 'cloud-pull': cloudPull(true); break;
    case 'sync-connect': {
      E.setSync(document.getElementById('sync-url').value, document.getElementById('sync-token').value);
      fetchSyncNights(true);
      renderPanel(); break;
    }
    case 'import-csv': {
      const txt = document.getElementById('imp-csv').value;
      const r = parseSleepCSV(txt, S.athlete.age);
      if (r.error) { toast(r.error, 'bad', '⚠️'); return; }
      E.queueImportedNights(r.nights);
      toast(`Queued ${r.nights.length} night(s) — each Sleep uses one`, 'good', '📥');
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
          catch (err) { toast('Not a valid SLEEPER save.', 'bad', '⚠️'); }
        });
      };
      inp.click(); break;
    }
    case 'toggle-sound': {
      E.setSetting('sound', !S.settings.sound);
      setSoundEnabled(S.settings.sound);
      if (S.settings.sound) sfx('click');
      renderPanel(); break;
    }
    case 'toggle-notify': {
      if (!S.settings.notify && 'Notification' in window) {
        Notification.requestPermission().then((perm) => {
          E.setSetting('notify', perm === 'granted');
          if (perm !== 'granted') toast('Notifications blocked by the browser.', 'bad', '🔕');
          renderPanel();
        });
      } else {
        E.setSetting('notify', false);
        renderPanel();
      }
      break;
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
      closePanel(false);
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
  const S = E.getState();
  if (S && S.pendingDecision) setTimeout(openDecision, 500);
  let notifiedFull = false;
  setInterval(() => {
    const st = E.getState();
    if (!st || st.athlete.retired) return;
    E.syncEnergy();
    const full = st.athlete.energy >= 9.99;
    if (full && !notifiedFull && st.settings.notify && document.hidden && Notification.permission === 'granted') {
      try { new Notification('SLEEPER', { body: 'Energy tank full — time to train.', icon: 'icons/icon-192.png' }); } catch (err) { /* SW-only platforms */ }
    }
    notifiedFull = full;
    if (!document.hidden && document.getElementById('hud')) {
      updateHUD();
      if (panelOpen === 'train' || panelOpen === 'drills') renderPanel();
    }
  }, 20000);
  setInterval(fetchSyncNights, 10 * 60 * 1000);
  fetchSyncNights();
  cloudPull();
  if (E.getState()) setSoundEnabled(E.getState().settings.sound);
  // QA hook: lets automated tests drive canvas-only interactions
  window.__sleeper = {
    openBuilding: enterBuildingFlow,
    interact: handleInteract,
    act: (action, id) => handleAction({ dataset: { action, id }, classList: { contains: () => true } }, null),
  };
}
