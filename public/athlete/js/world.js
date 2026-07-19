/* ============================================================
   SLEEPER — 3D world map (three.js, low-poly island)
   The main game screen: an island neighborhood that grows with
   your career. Buildings are real places — tap one to walk
   there and open its screen. Everything upgrades visually:
   house (recovery gear), gym (facility tier), stadium (era).
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';
import { YOUTH_SPORTS } from './data.js';

/* ---------------- module state ---------------- */
let renderer, scene, camera, raycaster, clock;
let container;
let worldGroup = null, character = null, charState = null;
let buildings = {}; // id -> { group, door: Vector3, label }
let clouds = [], stars = null, moonSprite = null, flags = [];
let orbit = { theta: -Math.PI / 4, phi: 0.95, radius: 30, min: 14, max: 60, target: new THREE.Vector3(0, 1, 0) };
let islandR = 15;
let dayNight = { t: 0 }; // 0 = day, 1 = night
let lights = {};
let lastHash = '';
let hovered = null;
let running = false;
let panelShift = 0, panelOpenFlag = false; // frames the scene above an open panel
let onEnterCb = null, onInteractCb = null, onPromptCb = null;
let moveInput = { x: 0, y: 0 };          // screen-space input from joystick/keys
const keys = {};
let currentPrompt = null;                 // { kind:'building'|'object', id, label, ico }
let enterArmed = {};                      // building id -> re-armed after walking away
let promptClock = 0;

const ERA_CFG = {
  youth:   { R: 15, sky: 0x8ec8ef, grass: 0x8cc36c, accent: 0xfb923c },
  hs:      { R: 19, sky: 0x86bce8, grass: 0x84bd68, accent: 0x22d3ee },
  college: { R: 23, sky: 0x7fb2e4, grass: 0x7db763, accent: 0xa78bfa },
  pro:     { R: 27, sky: 0x77a9e0, grass: 0x76b05e, accent: 0xffd166 },
};

const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

/* ---------------- materials ---------------- */
const MAT = {};
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0.02, ...opts });
  return MAT[key];
}

function box(w, h, d, color, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cone(r, h, seg, color, opts) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
/* Gable roof: 4-sided cone rotated 45°, squashed */
function roof(w, h, d, color) {
  const m = cone(Math.SQRT1_2, 1, 4, color);
  m.scale.set(w, h, d);
  m.rotation.y = Math.PI / 4;
  return m;
}

/* ---------------- label sprites ---------------- */
function labelSprite(text, emoji, accentHex) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 148;
  const g = c.getContext('2d');
  const r = 56;
  g.fillStyle = 'rgba(9,13,26,0.88)';
  g.beginPath(); g.roundRect(8, 8, 496, 132, r); g.fill();
  g.strokeStyle = `#${accentHex.toString(16).padStart(6, '0')}`;
  g.lineWidth = 5; g.beginPath(); g.roundRect(10, 10, 492, 128, r - 2); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#eef2ff';
  let size = 58;
  const line = `${emoji} ${text}`;
  do { g.font = `700 ${size}px system-ui, sans-serif`; size -= 3; }
  while (g.measureText(line).width > 460 && size > 26);
  g.fillText(line, 256, 80);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sp.scale.set(2.7, 0.78, 1);
  return sp;
}

/* ---------------- nature ---------------- */
function tree(scale = 1, dark = false) {
  const g = new THREE.Group();
  const trunk = cyl(0.12, 0.16, 0.7, 5, 0x8a5a33); trunk.position.y = 0.35;
  const f1 = cone(0.62, 1.1, 6, dark ? 0x3c7d4f : 0x4f9d5f); f1.position.y = 1.2;
  const f2 = cone(0.45, 0.85, 6, dark ? 0x468b58 : 0x5cab6b); f2.position.y = 1.85;
  g.add(trunk, f1, f2);
  g.scale.setScalar(scale);
  return g;
}
function rock(scale = 1) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3), mat(0x9aa3ab));
  m.castShadow = true; m.receiveShadow = true;
  m.scale.set(scale, scale * 0.7, scale);
  return m;
}
function bush() {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34), mat(0x63a862));
  m.castShadow = true; m.position.y = 0.22;
  return m;
}
function grassTuft(seedR) {
  // darker grass blotch — breaks up the flat green
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + seedR() * 0.6, 0.6 + seedR() * 0.6, 0.04, 7), mat(seedR() > 0.5 ? 0x7fb761 : 0x93c375));
  m.receiveShadow = true; m.position.y = 0.025;
  return m;
}
function flowerPatch(seedR) {
  const g = new THREE.Group();
  const colors = [0xf2c14e, 0xe8739e, 0xf2f2f2, 0xba7bd8];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat(colors[Math.floor(seedR() * colors.length)]));
    f.position.set((seedR() - 0.5) * 0.7, 0.12, (seedR() - 0.5) * 0.7);
    const stem = cyl(0.015, 0.015, 0.12, 4, 0x4f9d5f);
    stem.position.set(f.position.x, 0.05, f.position.z);
    g.add(f, stem);
  }
  return g;
}
function cloud(seedR) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const n = 3 + Math.floor(seedR() * 3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + seedR() * 0.7, 0), m);
    s.position.set(i * 0.9 - n * 0.45, (seedR() - 0.5) * 0.3, (seedR() - 0.5) * 0.6);
    g.add(s);
  }
  return g;
}

/* ---------------- buildings ---------------- */
function houseBuilding(level, era) {
  // level 0-3: cottage → starter home → two-story → (pro) modern mansion
  const g = new THREE.Group();
  const mansion = era === 'pro' && level >= 2;
  const wall = mansion ? 0xe8e2d6 : 0xf3e5cd;
  const roofC = mansion ? 0x3b4252 : 0xd96f4e;
  if (mansion) {
    const main = box(4.6, 2.2, 3.2, wall); main.position.y = 1.1;
    const wing = box(2.6, 1.6, 2.6, 0xd8d2c4); wing.position.set(2.8, 0.8, 0.2);
    const top = box(4.8, 0.25, 3.4, roofC); top.position.y = 2.32;
    const top2 = box(2.8, 0.2, 2.8, roofC); top2.position.set(2.8, 1.7, 0.2);
    const glass = box(1.8, 1.4, 0.1, 0x9fd0e8, { roughness: 0.3, metalness: 0.4 }); glass.position.set(-0.6, 0.9, 1.66);
    const door = box(0.8, 1.3, 0.1, 0x6b4b2a); door.position.set(1.0, 0.65, 1.66);
    const pool = cyl(1.1, 1.1, 0.18, 10, 0x5cc4e8, { roughness: 0.2 }); pool.position.set(-0.6, 0.09, 3.1);
    const poolRim = cyl(1.25, 1.25, 0.1, 10, 0xd9d2c2); poolRim.position.set(-0.6, 0.05, 3.1);
    g.add(main, wing, top, top2, glass, door, poolRim, pool);
  } else {
    const w = 2.6 + level * 0.35, d = 2.2 + level * 0.2;
    const main = box(w, 1.6, d, wall); main.position.y = 0.8;
    const rf = roof(w + 0.5, 1.1, d + 0.5, roofC); rf.position.y = 2.15;
    const door = box(0.7, 1.1, 0.08, 0x8a5a33); door.position.set(0.4, 0.55, d / 2 + 0.03);
    g.add(main, rf, door);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xbfe3f2, flatShading: true, roughness: 0.4, emissive: 0x000000 });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.08), winMat); w1.position.set(-0.6, 0.95, d / 2 + 0.03);
    g.add(w1);
    g.userData.windows = [w1];
    if (level >= 1) { // porch
      const porch = box(1.4, 0.12, 0.9, 0xc9a06a); porch.position.set(0.4, 0.06, d / 2 + 0.5);
      const p1 = cyl(0.06, 0.06, 0.9, 5, 0xc9a06a); p1.position.set(-0.2, 0.45, d / 2 + 0.85);
      const p2 = p1.clone(); p2.position.x = 1.0;
      const pr = box(1.4, 0.1, 1.0, 0xd96f4e); pr.position.set(0.4, 0.95, d / 2 + 0.45);
      g.add(porch, p1, p2, pr);
    }
    if (level >= 2) { // second story
      const up = box(w - 0.6, 1.1, d - 0.5, wall); up.position.y = 2.1;
      const rf2 = roof(w - 0.2, 0.9, d - 0.1, roofC); rf2.position.y = 3.05;
      rf.visible = false;
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.08), winMat); w2.position.set(0.1, 2.15, (d - 0.5) / 2 + 1.28);
      g.userData.windows.push(w2);
      g.add(up, rf2, w2);
    }
  }
  // chimney smoke handled globally; add chimney
  if (!mansion) { const ch = box(0.3, 0.7, 0.3, 0xb85c40); ch.position.set(-0.8, 2.4, -0.3); g.add(ch); }
  return g;
}

function gymBuilding(tier) {
  const g = new THREE.Group();
  if (tier <= 0) {
    // backyard weights: bench + barbell + rack
    const pad = cyl(1.6, 1.7, 0.12, 8, 0xc9c2b2); pad.position.y = 0.06;
    const bench = box(1.1, 0.18, 0.42, 0x8a4a3a); bench.position.y = 0.42;
    const legs = box(0.9, 0.35, 0.3, 0x5a5a5a); legs.position.y = 0.18;
    const bar = cyl(0.035, 0.035, 1.7, 6, 0xb9bec7); bar.rotation.z = Math.PI / 2; bar.position.y = 0.75;
    const pl1 = cyl(0.22, 0.22, 0.1, 10, 0x2b2f38); pl1.rotation.z = Math.PI / 2; pl1.position.set(-0.75, 0.75, 0);
    const pl2 = pl1.clone(); pl2.position.x = 0.75;
    const rack1 = box(0.08, 0.8, 0.08, 0x5a5a5a); rack1.position.set(-0.45, 0.4, 0);
    const rack2 = rack1.clone(); rack2.position.x = 0.45;
    g.add(pad, bench, legs, rack1, rack2, bar, pl1, pl2);
  } else if (tier === 1) {
    const main = box(3.2, 1.8, 2.6, 0x9db1de); main.position.y = 0.9;
    const rf = box(3.5, 0.22, 2.9, 0x4b5a7a); rf.position.y = 1.9;
    const door = box(0.9, 1.2, 0.08, 0x33415e); door.position.set(0, 0.6, 1.34);
    const sign = box(1.6, 0.5, 0.1, 0xf2f2f2); sign.position.set(0, 1.45, 1.36);
    g.add(main, rf, door, sign);
  } else if (tier === 2) {
    const main = box(4.2, 2.3, 3.2, 0x8ea3d8); main.position.y = 1.15;
    const glassM = new THREE.MeshStandardMaterial({ color: 0x9fd0e8, flatShading: true, roughness: 0.25, metalness: 0.4 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 0.1), glassM); glass.position.set(0, 1.0, 1.66);
    const rf = box(4.5, 0.25, 3.5, 0x38415c); rf.position.y = 2.42;
    const tower = box(1.2, 3.0, 1.2, 0x7288c2); tower.position.set(1.9, 1.5, -0.8);
    g.add(main, glass, rf, tower);
  } else {
    // elite lab: sleek dark, emissive accent strips
    const main = box(4.8, 2.5, 3.6, 0x2b3247, { roughness: 0.5 }); main.position.y = 1.25;
    const rf = box(5.1, 0.22, 3.9, 0x1c2233); rf.position.y = 2.6;
    const stripM = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.4, flatShading: true });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.08, 0.08), stripM); s1.position.set(0, 2.45, 1.83);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 0.08), stripM); s2.position.set(-2.42, 1.25, 1.83);
    const glassM = new THREE.MeshStandardMaterial({ color: 0x8fd8ea, flatShading: true, roughness: 0.15, metalness: 0.5 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 0.1), glassM); glass.position.set(0, 1.1, 1.86);
    const wing = box(2.2, 1.4, 2.4, 0x39415c); wing.position.set(3.2, 0.7, -0.4);
    g.add(main, rf, s1, s2, glass, wing);
  }
  return g;
}

function stadiumBuilding(era, sport) {
  const g = new THREE.Group();
  const fieldColor = sport === 'basketball' ? 0xcf9455 : 0x63b058;
  if (era === 'youth') {
    const field = box(4.4, 0.1, 3.0, fieldColor); field.position.y = 0.05;
    if (sport === 'basketball' || !sport) {
      const pole = cyl(0.07, 0.07, 1.8, 6, 0x5a5a5a); pole.position.set(1.9, 0.9, 0);
      const board = box(0.7, 0.5, 0.06, 0xf2f2f2); board.position.set(1.9, 1.7, 0);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), mat(0xe8503a)); rim.rotation.x = Math.PI / 2; rim.position.set(1.72, 1.52, 0);
      g.add(pole, board, rim);
    } else {
      const gp = box(0.08, 0.7, 1.4, 0xf2f2f2); gp.position.set(2.1, 0.35, 0); g.add(gp);
    }
    const lines = box(4.4, 0.02, 0.06, 0xffffff); lines.position.y = 0.11; g.add(lines);
    g.add(field);
  } else {
    const big = era === 'pro' ? 1.5 : era === 'college' ? 1.2 : 1.0;
    const field = box(6 * big, 0.1, 3.8 * big, fieldColor); field.position.y = 0.05;
    g.add(field);
    // bleachers on both long sides
    for (const side of [-1, 1]) {
      for (let t = 0; t < (era === 'hs' ? 2 : 3); t++) {
        const b = box(6 * big + t * 0.0, 0.35, 0.55, era === 'pro' ? 0x3a4258 : 0x6f7d99);
        b.position.set(0, 0.2 + t * 0.34, side * (2.1 * big + t * 0.5));
        g.add(b);
      }
    }
    // floodlights
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const pole = cyl(0.08, 0.1, 3.4, 6, 0x4a5164); pole.position.set(sx * 3.2 * big, 1.7, sz * 2.6 * big);
      const lampM = new THREE.MeshStandardMaterial({ color: 0xfff6cf, emissive: 0xfff2b0, emissiveIntensity: 0.9, flatShading: true });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.15), lampM);
      lamp.position.set(sx * 3.2 * big, 3.5, sz * 2.6 * big);
      lamp.lookAt(0, 0.5, 0);
      g.add(pole, lamp);
    }
    if (era === 'college' || era === 'pro') {
      // end stands
      for (const side of [-1, 1]) {
        const b = box(0.55, 0.8, 3.8 * big, era === 'pro' ? 0x3a4258 : 0x6f7d99);
        b.position.set(side * 3.3 * big, 0.4, 0); g.add(b);
      }
    }
    if (era === 'pro') {
      // halo roof ring + jumbotron
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.16, 8, 40), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.8, flatShading: true }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 3.6; ring.scale.set(1.15, 0.8, 1);
      const jumbo = box(1.6, 0.9, 0.2, 0x10162a, { emissive: 0x2b74d8, emissiveIntensity: 0.7 });
      jumbo.position.set(0, 2.6, 0);
      g.add(ring, jumbo);
    }
  }
  return g;
}

function shopBuilding() {
  const g = new THREE.Group();
  const main = box(2.6, 1.5, 2.2, 0xf0dcc0); main.position.y = 0.75;
  const rf = box(2.8, 0.18, 2.4, 0x8a5a33); rf.position.y = 1.6;
  // striped awning
  for (let i = 0; i < 5; i++) {
    const strip = box(0.5, 0.08, 0.8, i % 2 ? 0xf2f2f2 : 0xe25c4a);
    strip.position.set(-1.0 + i * 0.5, 1.18, 1.45);
    strip.rotation.x = -0.35;
    g.add(strip);
  }
  const door = box(0.7, 1.0, 0.08, 0x6b4b2a); door.position.set(0.55, 0.5, 1.12);
  const win = box(0.9, 0.6, 0.08, 0xbfe3f2, { roughness: 0.35 }); win.position.set(-0.55, 0.7, 1.12);
  const sign = box(1.3, 0.4, 0.12, 0x10162a, { emissive: 0xffd166, emissiveIntensity: 0.35 }); sign.position.set(0, 1.85, 1.0);
  g.add(main, rf, door, win, sign);
  return g;
}

function schoolBuilding(era) {
  const g = new THREE.Group();
  if (era === 'pro') {
    // media / HQ tower
    const t1 = box(1.8, 4.2, 1.8, 0x39415c, { roughness: 0.5 }); t1.position.y = 2.1;
    const winM = new THREE.MeshStandardMaterial({ color: 0x9fd0e8, emissive: 0x3a7bd5, emissiveIntensity: 0.4, flatShading: true, roughness: 0.3 });
    for (let f = 0; f < 5; f++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.06), winM);
      w.position.set(0, 0.8 + f * 0.75, 0.94); g.add(w);
    }
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd9d9d9));
    dish.rotation.x = Math.PI; dish.position.set(0.5, 4.4, 0.3);
    g.add(t1, dish);
  } else {
    const wide = era === 'college' ? 4.4 : 3.4;
    const main = box(wide, 1.7, 2.4, era === 'college' ? 0xc7a97e : 0xd9a066); main.position.y = 0.85;
    const rf = roof(wide + 0.4, 1.0, 2.8, 0x9c4a3a); rf.position.y = 2.2;
    const door = box(0.8, 1.15, 0.08, 0x6b4b2a); door.position.set(0, 0.58, 1.24);
    g.add(main, rf, door);
    if (era === 'college') {
      const towerB = box(1.0, 2.8, 1.0, 0xc7a97e); towerB.position.set(-2.2, 1.4, 0);
      const towerR = roof(1.3, 0.8, 1.3, 0x9c4a3a); towerR.position.set(-2.2, 3.2, 0);
      const clock = cyl(0.28, 0.28, 0.08, 12, 0xf2ecd8); clock.rotation.x = Math.PI / 2; clock.position.set(-2.2, 2.5, 0.55);
      g.add(towerB, towerR, clock);
    }
    // flag pole
    const pole = cyl(0.04, 0.04, 2.2, 5, 0xb9bec7); pole.position.set(wide / 2 + 0.6, 1.1, 0.8);
    const flag = box(0.65, 0.4, 0.04, 0xe25c4a); flag.position.set(wide / 2 + 0.95, 1.95, 0.8);
    flags.push(flag);
    g.add(pole, flag);
  }
  return g;
}

/* ---------------- character ---------------- */
function buildCharacter(accent) {
  const g = new THREE.Group();
  const skin = 0xc98e5a, dark = 0x22283b;
  const jersey = new THREE.MeshStandardMaterial({ color: accent, flatShading: true, roughness: 0.8 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), jersey);
  body.position.y = 0.72; body.castShadow = true;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mat(skin));
  head.position.y = 1.14; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), mat(0x2a1e14));
  hair.position.y = 1.17;

  const mkLimb = (isLeg, side) => {
    const pivot = new THREE.Group();
    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(isLeg ? 0.07 : 0.055, isLeg ? 0.06 : 0.05, isLeg ? 0.42 : 0.38, 6),
      isLeg ? mat(dark) : jersey
    );
    limb.position.y = isLeg ? -0.21 : -0.19;
    limb.castShadow = true;
    if (!isLeg) {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(skin));
      hand.position.y = -0.4; pivot.add(hand);
    } else {
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), mat(0xf2f2f2));
      shoe.position.set(0, -0.44, 0.05); shoe.castShadow = true; pivot.add(shoe);
    }
    pivot.add(limb);
    pivot.position.set(side * (isLeg ? 0.1 : 0.26), isLeg ? 0.47 : 0.95, 0);
    return pivot;
  };
  const legL = mkLimb(true, -1), legR = mkLimb(true, 1);
  const armL = mkLimb(false, -1), armR = mkLimb(false, 1);

  // little basketball in hand for flavor
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xe8763c));
  ball.position.set(0.34, 0.5, 0.12); ball.castShadow = true;

  g.add(body, head, hair, legL, legR, armL, armR, ball);
  g.userData = { legL, legR, armL, armR, body, head, ball };
  g.scale.setScalar(1.2);
  return g;
}

/* ---------------- world construction ---------------- */
function buildWorld(state) {
  const a = state.athlete;
  const era = a.retired ? 'pro' : a.era;
  const cfg = ERA_CFG[era];
  const R = cfg.R;
  const seed = rng(1337 + R * 7);

  if (worldGroup) { scene.remove(worldGroup); disposeGroup(worldGroup); }
  worldGroup = new THREE.Group();
  buildings = {}; flags = [];

  // island
  const island = cyl(R, R + 2, 2.4, 10, cfg.grass);
  island.position.y = -1.2;
  island.receiveShadow = true;
  const under = cyl(R + 2, R - 3, 3.4, 10, 0x8a6a48);
  under.position.y = -4.0;
  worldGroup.add(island, under);

  // plaza + fountain centerpiece
  const plaza = cyl(2.4, 2.6, 0.14, 8, 0xdccba2); plaza.position.y = 0.07; plaza.receiveShadow = true;
  const fRim = cyl(0.85, 0.95, 0.3, 8, 0xb8ab8e); fRim.position.y = 0.28;
  const fWater = cyl(0.7, 0.7, 0.08, 8, 0x5cc4e8, { roughness: 0.15, metalness: 0.3 }); fWater.position.y = 0.42;
  const fSpire = cyl(0.1, 0.16, 0.7, 6, 0xb8ab8e); fSpire.position.y = 0.75;
  const fTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0x5cc4e8, { roughness: 0.2 })); fTop.position.y = 1.15; fTop.castShadow = true;
  worldGroup.add(plaza, fRim, fWater, fSpire, fTop);

  const slots = {
    house:   new THREE.Vector3(-R * 0.52, 0, -R * 0.30),
    gym:     new THREE.Vector3(R * 0.52, 0, -R * 0.28),
    stadium: new THREE.Vector3(0, 0, R * 0.48),
    shop:    new THREE.Vector3(-R * 0.55, 0, R * 0.22),
    school:  new THREE.Vector3(R * 0.55, 0, R * 0.20),
  };

  const defs = [
    { id: 'house', label: 'Home', emoji: '🏠', build: () => houseBuilding(houseLevel(state), era) },
    { id: 'gym', label: gymName(state), emoji: '🏋️', build: () => gymBuilding(state.owned.facility) },
    { id: 'stadium', label: stadiumName(era), emoji: '🏟️', build: () => stadiumBuilding(era, a.mainSport) },
    { id: 'shop', label: 'Club Shop', emoji: '🛒', build: () => shopBuilding() },
    { id: 'school', label: era === 'pro' ? 'Media HQ' : era === 'college' ? 'Campus' : 'School', emoji: era === 'pro' ? '📺' : '🏫', build: () => schoolBuilding(era) },
  ];

  for (const d of defs) {
    const grp = d.build();
    grp.scale.setScalar(1.25);
    const pos = slots[d.id];
    grp.position.copy(pos);
    grp.lookAt(0, 0, 0); // entrances (built at +z) face the plaza
    grp.traverse((o) => { if (o.isMesh) { o.userData.buildingId = d.id; } });
    const lbl = labelSprite(d.label, d.emoji, cfg.accent);
    const bounds = new THREE.Box3().setFromObject(grp);
    lbl.position.set(pos.x, bounds.max.y + 1.0, pos.z);
    worldGroup.add(grp, lbl);
    const door = pos.clone().multiplyScalar((pos.length() - 3.3) / pos.length());
    buildings[d.id] = { group: grp, door, label: d.label, baseY: grp.position.y, sprite: lbl };

    // path to plaza
    const dir = pos.clone().normalize();
    const len = pos.length() - 3.4;
    const path = box(0.9, 0.06, len, 0xdccba2);
    path.position.copy(dir.clone().multiplyScalar(2.2 + len / 2));
    path.position.y = 0.03;
    path.lookAt(new THREE.Vector3(0, 0.03, 0));
    path.receiveShadow = true; path.castShadow = false;
    worldGroup.add(path);
  }

  // nature scatter (deterministic)
  const nNature = Math.floor(R * 3.2);
  for (let i = 0; i < nNature; i++) {
    const ang = seed() * Math.PI * 2;
    const rad = R * (0.3 + seed() * 0.62);
    const p = new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
    // keep clear of buildings & paths
    if (Object.values(slots).some((s) => s.distanceTo(p) < 4.2)) continue;
    if (Math.abs(p.x) < 1.4 || Math.abs(p.z) < 1.4) continue;
    const roll = seed();
    const item =
      roll < 0.42 ? tree(0.8 + seed() * 0.8, seed() > 0.6)
      : roll < 0.58 ? bush()
      : roll < 0.68 ? rock(0.6 + seed() * 0.7)
      : roll < 0.86 ? grassTuft(seed)
      : flowerPatch(seed);
    item.position.set(p.x, 0, p.z);
    item.rotation.y = seed() * Math.PI * 2;
    worldGroup.add(item);
  }

  // era flavor extras
  if (era !== 'youth') {
    // billboard celebrating the athlete
    const bb = new THREE.Group();
    const p1 = cyl(0.08, 0.08, 2.2, 6, 0x4a5164); p1.position.y = 1.1;
    const face = box(2.6, 1.3, 0.1, 0x10162a, { emissive: cfg.accent, emissiveIntensity: 0.25 });
    face.position.y = 2.6;
    bb.add(p1, face);
    bb.position.set(R * 0.1, 0, -R * 0.62);
    bb.lookAt(0, 1, 0);
    worldGroup.add(bb);
  }
  if (era === 'pro') {
    // skyline backdrop towers on the north rim, windows lit
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffe9a3, emissive: 0xffd166, emissiveIntensity: 0.5, flatShading: true });
    for (let i = 0; i < 6; i++) {
      const h = 3 + seed() * 4;
      const w = 1.2 + seed();
      const t = box(w, h, 1.2 + seed(), 0x39415c, { roughness: 0.6 });
      const ang = Math.PI * (1.15 + i * 0.12);
      t.position.set(Math.cos(ang) * (R * 0.82), h / 2, Math.sin(ang) * (R * 0.82));
      worldGroup.add(t);
      // lit windows on the face looking back at the island
      const toCenter = t.position.clone().setY(0).normalize().negate();
      const floors = Math.floor(h / 0.9);
      for (let f = 0; f < floors; f++) {
        if (seed() < 0.35) continue;
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.22, 0.06), winMat);
        win.position.copy(t.position).addScaledVector(toCenter, 0.72);
        win.position.y = 0.7 + f * 0.9;
        win.rotation.y = Math.atan2(toCenter.x, toCenter.z);
        worldGroup.add(win);
      }
    }
  }

  // clouds: high above, drifting past the island rim
  for (const c of clouds) scene.remove(c);
  clouds = [];
  for (let i = 0; i < 7; i++) {
    const c = cloud(seed);
    const ang = seed() * Math.PI * 2;
    const rad = R * (2.0 + seed() * 1.4);
    c.position.set(Math.cos(ang) * rad, 22 + seed() * 9, Math.sin(ang) * rad);
    c.scale.setScalar(0.9 + seed() * 0.7);
    c.userData.speed = 0.3 + seed() * 0.35;
    clouds.push(c);
    scene.add(c);
  }

  scene.add(worldGroup);

  // sky & fog per era
  scene.background = new THREE.Color(cfg.sky);
  scene.fog = new THREE.Fog(cfg.sky, R * 3, R * 8);
  islandR = R;
  fitCamera(true);

  // character
  if (!character) {
    character = buildCharacter(cfg.accent);
    scene.add(character);
    character.position.set(0, 0, 3.4); // start at the plaza
    charState = { mode: 'idle', target: null, resolve: null, t: 0 };
  } else {
    // recolor jersey to era accent
    character.userData.body.material = new THREE.MeshStandardMaterial({ color: cfg.accent, flatShading: true, roughness: 0.8 });
    character.userData.armL.children.find((c) => c.geometry?.type === 'CylinderGeometry').material = character.userData.body.material;
    character.userData.armR.children.find((c) => c.geometry?.type === 'CylinderGeometry').material = character.userData.body.material;
  }
}

function houseLevel(state) {
  const gearCount = Object.keys(state.owned.gear).length;
  return gearCount >= 5 ? 3 : gearCount >= 3 ? 2 : gearCount >= 1 ? 1 : 0;
}
function gymName(state) {
  return ['Backyard Setup', 'Community Gym', 'Performance Center', 'Elite Lab'][state.owned.facility] || 'Gym';
}
function stadiumName(era) {
  return { youth: 'The Park', hs: 'High School Stadium', college: 'College Arena', pro: 'Pro Stadium' }[era];
}

function worldHash(state) {
  const a = state.athlete;
  return [a.retired ? 'pro' : a.era, state.owned.facility, houseLevel(state), a.mainSport].join('|');
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material?.map) o.material.map.dispose();
  });
}

/* ---------------- public API ---------------- */
export function initWorld(el, { onEnter, onInteract, onPrompt } = {}) {
  container = el;
  onEnterCb = onEnter; onInteractCb = onInteract; onPromptCb = onPrompt;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();

  lights.hemi = new THREE.HemisphereLight(0xdfeaff, 0x9a8f70, 0.85);
  lights.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  lights.sun.position.set(18, 26, 10);
  lights.sun.castShadow = true;
  lights.sun.shadow.mapSize.set(2048, 2048);
  const sc = 34;
  Object.assign(lights.sun.shadow.camera, { left: -sc, right: sc, top: sc, bottom: -sc, far: 90 });
  lights.sun.shadow.bias = -0.0004;
  scene.add(lights.hemi, lights.sun);

  // stars & moon (hidden by day)
  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 260; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(140);
    v.y = Math.abs(v.y) + 12;
    pts.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xeef2ff, size: 0.5, transparent: true, opacity: 0 }));
  scene.add(stars);

  const moonC = document.createElement('canvas'); moonC.width = moonC.height = 128;
  const mg = moonC.getContext('2d');
  mg.fillStyle = '#ffe9a3'; mg.beginPath(); mg.arc(64, 64, 44, 0, 7); mg.fill();
  mg.globalCompositeOperation = 'destination-out';
  mg.beginPath(); mg.arc(84, 46, 38, 0, 7); mg.fill();
  moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(moonC), transparent: true, opacity: 0 }));
  moonSprite.scale.set(6, 6, 1);
  moonSprite.position.set(-30, 34, -40);
  scene.add(moonSprite);

  // soft sun glow, opposite the moon
  const sunC = document.createElement('canvas'); sunC.width = sunC.height = 256;
  const sg = sunC.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,244,214,1)');
  grad.addColorStop(0.35, 'rgba(255,224,150,0.55)');
  grad.addColorStop(1, 'rgba(255,224,150,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
  lights.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunC), transparent: true, opacity: 0.95 }));
  lights.sunSprite.scale.set(22, 22, 1);
  lights.sunSprite.position.set(46, 60, 26);
  scene.add(lights.sunSprite);

  attachControls();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  running = true;
  loop();
}

export function syncWorld(state) {
  if (!renderer) return;
  lastState = state;
  const h = worldHash(state);
  if (h !== lastHash) {
    lastHash = h;
    buildWorld(state);
    if (interior) worldGroup.visible = false; // stay inside if a rebuild happens mid-visit
  }
}

export function walkTo(id) {
  const b = buildings[id];
  if (!b || !character || interior) return Promise.resolve();
  return new Promise((res) => {
    if (charState.resolve) charState.resolve();
    charState = { mode: 'walking', target: b.door.clone(), resolve: res, pose: 'dribble' };
  });
}

/* Night wave: darken, resolve at full night, then dawn back. */
export function nightTransition() {
  return new Promise((resolve) => {
    dayNight.anim = { phase: 'down', t: 0, resolve };
  });
}

export function shakeCelebrate() {
  if (!character) return;
  charState.celebrate = 1.2;
}

/* ---------------- controls ---------------- */
function attachControls() {
  let down = null, moved = false, pinch0 = 0;
  const el = renderer.domElement;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, theta: orbit.theta, phi: orbit.phi };
    moved = false;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!down) {
      hoverCheck(e);
      return;
    }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 7) moved = true;
    orbit.theta = down.theta - dx * 0.0055;
    orbit.phi = Math.max(0.55, Math.min(1.25, down.phi - dy * 0.004));
  });
  el.addEventListener('pointerup', (e) => {
    if (down && !moved) clickCheck(e);
    down = null;
  });
  el.addEventListener('pointercancel', () => { down = null; });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.radius = Math.max(orbit.min, Math.min(orbit.max, orbit.radius * (1 + e.deltaY * 0.0011)));
  }, { passive: false });

  // keyboard: arrows / WASD to move, E or Enter to use the nearby thing
  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    keys[e.key.toLowerCase()] = true;
    if ((e.key === 'e' || e.key === 'Enter') && !document.querySelector('.modal') && !document.querySelector('.panel')) {
      triggerPrompt();
    }
    if (e.key.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // pinch zoom
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinch0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinch0) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      orbit.radius = Math.max(orbit.min, Math.min(orbit.max, orbit.radius * (pinch0 / d)));
      pinch0 = d;
      down = null;
    }
  }, { passive: true });
}

function pointerRay(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(p, camera);
  return raycaster.intersectObjects(worldGroup ? worldGroup.children : [], true);
}

function findBuildingHit(hits) {
  for (const h of hits) {
    if (h.object.userData.buildingId) return h.object.userData.buildingId;
  }
  return null;
}

function hoverCheck(e) {
  if (interior) {
    const hit = raycastGroup(e, interior.group).find((h) => h.object.userData.interactId);
    renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    return;
  }
  const id = findBuildingHit(pointerRay(e));
  renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
  if (hovered && hovered !== id) {
    const b = buildings[hovered];
    if (b) b.group.scale.setScalar(1);
  }
  if (id) {
    buildings[id].group.scale.setScalar(1.04);
  }
  hovered = id;
}

function clickCheck(e) {
  if (interior) {
    // tap an object in the room: walk over, then use it
    const hits = raycastGroup(e, interior.group);
    for (const h of hits) {
      const iid = h.object.userData.interactId;
      if (iid) {
        const info = (interior.group.userData.interacts || []).find((x) => x.id === iid);
        if (info && onInteractCb) walkToPoint(info.point).then(() => onInteractCb(iid));
        return;
      }
    }
    return;
  }
  const id = findBuildingHit(pointerRay(e));
  if (id && onEnterCb) {
    const b = buildings[id];
    b.bounce = 1;
    enterArmed[id] = false;
    walkTo(id).then(() => onEnterCb(id));
  }
}

function raycastGroup(e, group) {
  const rect = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  raycaster.setFromCamera(p, camera);
  return raycaster.intersectObjects(group.children, true);
}

function walkToPoint(p) {
  if (!character) return Promise.resolve();
  return new Promise((res) => {
    if (charState.resolve) charState.resolve();
    charState = { mode: 'walking', target: p.clone().setY(0), resolve: res, pose: charState?.pose };
  });
}

/* ---------------- frame loop ---------------- */
function resize() {
  if (!container || !renderer) return;
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  fitCamera(false);
}

/* Frame the island for the current viewport; portrait needs a wider
   lens and more distance since the island is round but the screen isn't. */
function fitCamera(snap) {
  if (!camera) return;
  const portrait = camera.aspect < 1;
  camera.fov = portrait ? 58 : 48;
  camera.updateProjectionMatrix();
  orbit.min = islandR * 1.1;
  orbit.max = islandR * 3.4;
  if (snap) {
    orbit.radius = islandR * (portrait ? 2.3 : 1.6);
    orbit.phi = portrait ? 0.9 : 1.0;
  }
  orbit.radius = Math.max(orbit.min, Math.min(orbit.max, orbit.radius));
}

const DAY = { sky: new THREE.Color(0x86bce8), sun: 1.6, hemi: 0.85 };
const NIGHT = { sky: new THREE.Color(0x0d1230), sun: 0.06, hemi: 0.22 };

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // camera orbit (looking slightly below the target lifts the subject
  // into the visible top half of the screen while a panel is open)
  const { theta, phi, radius, target } = orbit;
  const wantShift = panelOpenFlag && camera.aspect < 1 ? -radius * 0.3 : 0;
  panelShift += (wantShift - panelShift) * Math.min(1, dt * 7);
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.cos(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(target.x, target.y + panelShift, target.z);

  // clouds drift
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (worldGroup && c.position.x > 60) c.position.x = -60;
  }
  // flags wave
  for (const f of flags) f.rotation.y = Math.sin(t * 3) * 0.25;

  // building bounce feedback
  for (const b of Object.values(buildings)) {
    if (b.bounce > 0) {
      b.bounce = Math.max(0, b.bounce - dt * 3);
      const s = 1 + Math.sin((1 - b.bounce) * Math.PI) * 0.06;
      b.group.scale.setScalar(s);
    }
  }

  // direct control: joystick vector + keys, camera-relative
  if (character && charState && charState.mode !== 'walking' && !panelOpenFlag) {
    let ix = moveInput.x, iy = moveInput.y;
    if (keys['arrowup'] || keys['w']) iy -= 1;
    if (keys['arrowdown'] || keys['s']) iy += 1;
    if (keys['arrowleft'] || keys['a']) ix -= 1;
    if (keys['arrowright'] || keys['d']) ix += 1;
    const mag = Math.min(1, Math.hypot(ix, iy));
    if (mag > 0.12 && !document.querySelector('#modal-root .modal')) {
      const fx = -Math.cos(orbit.theta), fz = -Math.sin(orbit.theta); // camera forward on the ground
      const rx = -fz, rz = fx;                                        // camera right
      const dir = new THREE.Vector3(rx * ix - fx * iy, 0, rz * ix - fz * iy).normalize();
      const speed = 5.2 * mag;
      character.position.addScaledVector(dir, speed * dt);
      // clamp to the walkable area
      if (interior) {
        const b = interior.group.userData.bounds || { x: 6, z: 5 };
        character.position.x = Math.max(-b.x, Math.min(b.x, character.position.x));
        character.position.z = Math.max(-b.z, Math.min(b.z, character.position.z));
      } else {
        const maxR = islandR - 1.6;
        const len = Math.hypot(character.position.x, character.position.z);
        if (len > maxR) character.position.multiplyScalar(maxR / len);
      }
      const targetRot = Math.atan2(dir.x, dir.z);
      const dlt = ((targetRot - character.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      character.rotation.y += dlt * 0.25;
      const u2 = character.userData;
      const w = t * 11;
      u2.legL.rotation.x = Math.sin(w) * 0.7 * mag;
      u2.legR.rotation.x = -Math.sin(w) * 0.7 * mag;
      u2.armL.rotation.x = -Math.sin(w) * 0.55 * mag;
      u2.armR.rotation.x = Math.sin(w) * 0.55 * mag;
      character.position.y = Math.abs(Math.sin(w)) * 0.05 * mag;
      charState.pose = 'moving';
    } else if (charState.pose === 'moving') {
      charState.pose = 'idle';
    }
  }

  // proximity prompts + auto-enter (checked a few times a second)
  promptClock += dt;
  if (promptClock > 0.15 && character && charState && charState.mode !== 'walking') {
    promptClock = 0;
    let best = null;
    if (interior) {
      for (const it of interior.group.userData.interacts || []) {
        const d2 = it.point.distanceTo(character.position);
        if (d2 < it.r && (!best || d2 < best.d)) best = { kind: 'object', id: it.id, label: it.label, ico: it.ico, d: d2 };
      }
    } else {
      for (const [bid, b] of Object.entries(buildings)) {
        const d2 = b.door.distanceTo(character.position);
        if (d2 > 2.8) enterArmed[bid] = true;
        if (d2 < 2.4 && (!best || d2 < best.d)) best = { kind: 'building', id: bid, label: `Enter ${b.label}`, ico: '🚪', d: d2 };
        if (d2 < 1.35 && enterArmed[bid] === true && charState.pose === 'moving' && onEnterCb) {
          enterArmed[bid] = false;
          onEnterCb(bid);
        }
      }
    }
    if (panelOpenFlag) best = null;
    const changed = (best?.id || null) !== (currentPrompt?.id || null) || (best?.kind !== currentPrompt?.kind);
    if (changed) {
      currentPrompt = best;
      if (onPromptCb) onPromptCb(best ? { id: best.id, kind: best.kind, label: best.label, ico: best.ico } : null);
    }
  }

  // character
  if (character && charState) {
    const u = character.userData;
    if (charState.mode === 'walking' && charState.target) {
      const pos = character.position;
      const dir = charState.target.clone().sub(pos); dir.y = 0;
      const dist = dir.length();
      if (dist < 0.15) {
        charState.mode = 'idle';
        const r = charState.resolve; charState.resolve = null;
        if (r) r();
      } else {
        dir.normalize();
        const speed = 5.5;
        pos.addScaledVector(dir, Math.min(dist, speed * dt));
        const targetRot = Math.atan2(dir.x, dir.z);
        const delta = ((targetRot - character.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        character.rotation.y += delta * 0.22;
        // walk cycle
        const w = t * 11;
        u.legL.rotation.x = Math.sin(w) * 0.7;
        u.legR.rotation.x = -Math.sin(w) * 0.7;
        u.armL.rotation.x = -Math.sin(w) * 0.55;
        u.armR.rotation.x = Math.sin(w) * 0.55;
        character.position.y = Math.abs(Math.sin(w)) * 0.05;
      }
    } else {
      if (charState.action) {
        charState.action.t -= dt;
        if (charState.action.t <= 0) {
          const done = charState.action.resolve;
          charState.action = null;
          if (done) done();
        }
      }
      const pose = charState.action?.pose || charState.pose || 'dribble';
      if (pose === 'dribble') {
        u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
        u.armL.rotation.x *= 0.85;
        u.armR.rotation.x = Math.sin(t * 6) * 0.18 - 0.15;
        character.position.y = Math.sin(t * 2) * 0.015;
        u.ball.position.y = 0.14 + Math.abs(Math.sin(t * 6)) * 0.42;
      } else if (pose === 'lift') {
        const pump = Math.PI * 0.85 + Math.sin(t * 3.2) * 0.38;
        u.armL.rotation.x = pump; u.armR.rotation.x = pump;
        u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
        character.position.y = Math.max(0, -Math.sin(t * 3.2)) * 0.05;
      } else if (pose === 'sit') {
        u.legL.rotation.x = -1.35; u.legR.rotation.x = -1.35;
        u.armL.rotation.x = -0.35; u.armR.rotation.x = -0.35 + Math.sin(t * 1.6) * 0.06;
        character.position.y = 0.18 + Math.sin(t * 2) * 0.01;
      } else if (pose === 'sprint') {
        const w = t * 13;
        u.legL.rotation.x = Math.sin(w) * 0.9;
        u.legR.rotation.x = -Math.sin(w) * 0.9;
        u.armL.rotation.x = -Math.sin(w) * 0.7;
        u.armR.rotation.x = Math.sin(w) * 0.7;
        character.position.y = Math.abs(Math.sin(w)) * 0.07;
      } else if (pose === 'stretch') {
        const reach = Math.PI * 0.8 + Math.sin(t * 1.6) * 0.35;
        u.armL.rotation.x = reach; u.armR.rotation.x = reach;
        u.legL.rotation.x = 0; u.legR.rotation.x = 0;
        character.position.y = Math.max(0, Math.sin(t * 1.6)) * 0.04;
      } else if (pose === 'sleep') {
        u.legL.rotation.x = 0.15; u.legR.rotation.x = 0.15;
        u.armL.rotation.x = 0.2; u.armR.rotation.x = 0.2;
        u.body.scale.setScalar(1 + Math.sin(t * 1.4) * 0.03);
      } else { // idle
        u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
        u.armL.rotation.x *= 0.85; u.armR.rotation.x *= 0.85;
        character.position.y = Math.sin(t * 2) * 0.015;
      }
    }
    if (charState.celebrate > 0) {
      charState.celebrate -= dt;
      character.position.y = Math.abs(Math.sin(t * 9)) * 0.35;
      u.armL.rotation.x = Math.PI * 0.9; u.armR.rotation.x = Math.PI * 0.9;
    }
  }

  // day/night animation
  if (dayNight.anim) {
    const an = dayNight.anim;
    an.t += dt / 1.1; // each phase ~1.1s
    if (an.phase === 'down') {
      dayNight.t = Math.min(1, an.t);
      if (an.t >= 1) {
        an.phase = 'hold'; an.t = 0;
        if (an.resolve) { an.resolve(); an.resolve = null; }
      }
    } else if (an.phase === 'hold') {
      if (an.t >= 0.6) { an.phase = 'up'; an.t = 0; }
    } else {
      dayNight.t = Math.max(0, 1 - an.t);
      if (an.t >= 1) dayNight.anim = null;
    }
    applyDayNight();
  }

  renderer.render(scene, camera);
}

function applyDayNight() {
  const k = dayNight.t;
  lights.sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * k;
  lights.hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * k;
  stars.material.opacity = k * 0.9;
  moonSprite.material.opacity = k;
  if (lights.sunSprite) lights.sunSprite.material.opacity = (1 - k) * 0.95;

  if (interior && interior.group.userData.indoor) {
    // indoors: dim the room lamp, cool the walls, moonlight through the window
    scene.background = new THREE.Color(ROOM_BG).lerp(new THREE.Color(0x05070f), k * 0.85);
    const lamp = interior.group.userData.lamp;
    if (lamp) lamp.intensity = lamp.userData.base * (1 - k * 0.82);
    const amb = interior.group.userData.amb;
    if (amb) amb.intensity = amb.userData.base * (1 - k * 0.6);
    const win = interior.group.userData.window;
    if (win) {
      win.material.color = new THREE.Color(0x8fc8e8).lerp(new THREE.Color(0x1a2452), k);
      win.material.emissiveIntensity = 0.25 + k * 0.3;
    }
    return;
  }

  const sky = DAY.sky.clone().lerp(NIGHT.sky, k);
  scene.background = sky;
  if (scene.fog) scene.fog.color = sky;
  // house windows glow at night
  const house = buildings.house;
  if (house?.group.userData.windows) {
    for (const w of house.group.userData.windows) {
      w.material.emissive = new THREE.Color(0xffd166);
      w.material.emissiveIntensity = k * 1.4;
    }
  }
}

export function disposeWorld() {
  running = false;
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
    renderer = null;
  }
  character = null; worldGroup = null; lastHash = '';
}

/* ============================================================
   Interiors — entering a building swaps the island for a real
   place: an equipped gym, your sport's court/pitch/field, a
   furnished bedroom, a classroom, a stocked shop. What's inside
   reflects your save: facility tier fills the gym, owned gear
   furnishes the house, era rebuilds the school, your sport
   decides the playing surface.
   ============================================================ */

let interior = null;        // { id, group }
let savedView = null;       // orbit + fog to restore on exit
let lastState = null;       // most recent game state (set by syncWorld)

const ROOM_BG = 0x141a2c;

function roomShell(w, h, d, floorC, wallC, trimC = 0x2a3148) {
  const g = new THREE.Group();
  g.userData.bounds = { x: w / 2 - 0.7, z: d / 2 - 0.7 };
  const floor = box(w, 0.2, d, floorC); floor.position.y = -0.1; floor.receiveShadow = true;
  const back = box(w, h, 0.25, wallC); back.position.set(0, h / 2, -d / 2);
  const left = box(0.25, h, d, wallC); left.position.set(-w / 2, h / 2, 0);
  const trim = box(w, 0.22, 0.28, trimC); trim.position.set(0, 0.11, -d / 2 + 0.01);
  const trimL = box(0.28, 0.22, d, trimC); trimL.position.set(-w / 2 + 0.01, 0.11, 0);
  g.add(floor, back, left, trim, trimL);
  return g;
}

function roomLights(g, color = 0xfff2d8, intensity = 95) {
  const p = new THREE.PointLight(color, intensity, 45, 1.7);
  p.position.set(1.5, 4.0, 1.5);
  p.userData.base = intensity;
  const fill = new THREE.PointLight(0xdfe8ff, 40, 35, 1.8);
  fill.position.set(-3, 3.5, -2);
  const amb = new THREE.AmbientLight(0xc8d2ea, 0.85);
  amb.userData.base = 0.85;
  g.add(p, fill, amb);
  g.userData.lamp = p;
  g.userData.amb = amb;
}

/* Tag meshes as an interactable "hot spot" with a walk-up prompt */
function tagInteract(group, objects, id, label, ico, point, r = 2.0) {
  for (const o of objects) o.traverse ? o.traverse((m) => { if (m.isMesh) m.userData.interactId = id; }) : null;
  (group.userData.interacts = group.userData.interacts || []).push({ id, label, ico, point: point.clone(), r });
}

/* ---------- gym interior (fills up with facility tier) ---------- */
function gymInterior(tier) {
  const g = roomShell(14, 4.6, 11, 0x3a4152, 0x556180);
  roomLights(g);

  const dumbbellRack = () => {
    const r = new THREE.Group();
    const frame = box(2.2, 0.9, 0.5, 0x3a4258); frame.position.y = 0.45;
    for (let i = 0; i < 5; i++) {
      const db = new THREE.Group();
      const barSm = cyl(0.03, 0.03, 0.3, 6, 0xb9bec7); barSm.rotation.z = Math.PI / 2;
      const w1 = cyl(0.09, 0.09, 0.08, 8, 0x22283b); w1.rotation.z = Math.PI / 2; w1.position.x = -0.12;
      const w2 = w1.clone(); w2.position.x = 0.12;
      db.add(barSm, w1, w2);
      db.position.set(-0.85 + i * 0.42, 1.0, 0);
      r.add(db);
    }
    r.add(frame);
    return r;
  };
  const benchPress = () => {
    const r = new THREE.Group();
    const bench = box(1.2, 0.16, 0.45, 0x8a4a3a); bench.position.y = 0.5;
    const legs = box(1.0, 0.4, 0.32, 0x2a3148); legs.position.y = 0.22;
    const up1 = box(0.08, 1.15, 0.08, 0x5a6478); up1.position.set(-0.45, 0.58, 0);
    const up2 = up1.clone(); up2.position.x = 0.45;
    const bar = cyl(0.035, 0.035, 1.9, 6, 0xb9bec7); bar.rotation.z = Math.PI / 2; bar.position.y = 1.12;
    const pl1 = cyl(0.24, 0.24, 0.1, 10, 0x22283b); pl1.rotation.z = Math.PI / 2; pl1.position.set(-0.85, 1.12, 0);
    const pl2 = pl1.clone(); pl2.position.x = 0.85;
    r.add(bench, legs, up1, up2, bar, pl1, pl2);
    return r;
  };
  const treadmill = () => {
    const r = new THREE.Group();
    const base = box(0.6, 0.14, 1.6, 0x22283b); base.position.y = 0.12;
    const belt = box(0.5, 0.04, 1.4, 0x10141f); belt.position.y = 0.2;
    const post = box(0.5, 0.08, 0.08, 0x3a4258); post.position.set(0, 1.05, -0.72);
    const arm1 = box(0.06, 0.95, 0.06, 0x3a4258); arm1.position.set(-0.24, 0.6, -0.72);
    const arm2 = arm1.clone(); arm2.position.x = 0.24;
    const screen = box(0.36, 0.24, 0.05, 0x10162a, { emissive: 0x2b74d8, emissiveIntensity: 0.8 });
    screen.position.set(0, 1.2, -0.72);
    r.add(base, belt, post, arm1, arm2, screen);
    return r;
  };
  const squatRack = () => {
    const r = new THREE.Group();
    for (const sx of [-0.5, 0.5]) {
      const post = box(0.1, 2.1, 0.1, 0x5a6478); post.position.set(sx, 1.05, 0);
      const foot = box(0.14, 0.08, 0.7, 0x3a4258); foot.position.set(sx, 0.04, 0);
      r.add(post, foot);
    }
    const cross = box(1.1, 0.08, 0.08, 0x5a6478); cross.position.y = 2.05;
    const bar = cyl(0.035, 0.035, 1.8, 6, 0xb9bec7); bar.rotation.z = Math.PI / 2; bar.position.y = 1.35;
    r.add(cross, bar);
    return r;
  };

  // mats + base equipment every gym has
  const mat1 = box(1.6, 0.04, 1.0, 0x4a5aa8); mat1.position.set(-3.0, 0.02, 2.0);
  const bp = benchPress(); bp.position.set(0, 0, -0.6);
  const dr = dumbbellRack(); dr.position.set(-3.4, 0, -3.9);
  const poster = box(1.3, 1.7, 0.05, 0xe25c4a); poster.position.set(-6.85, 2.4, -1.5);
  const poster2 = box(1.3, 1.7, 0.05, 0x22d3ee); poster2.position.set(-6.85, 2.4, 0.6);
  const cooler = new THREE.Group();
  const coolerBase = box(0.4, 1.0, 0.4, 0xf2f2f2); coolerBase.position.y = 0.5;
  const jug = cyl(0.17, 0.17, 0.4, 8, 0x9fdcf2, { transparent: true, opacity: 0.8 }); jug.position.y = 1.2;
  cooler.add(coolerBase, jug);
  cooler.position.set(-5.6, 0, 2.6);
  const plant = new THREE.Group();
  const pot = cyl(0.22, 0.16, 0.35, 7, 0xb85c40); pot.position.y = 0.17;
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4), mat(0x4f9d5f)); leaves.position.y = 0.7;
  plant.add(pot, leaves);
  plant.position.set(1.9, 0, -4.6);
  g.add(mat1, bp, dr, poster, poster2, cooler, plant);

  if (tier >= 1) {
    const t1 = treadmill(); t1.position.set(2.5, 0, -3.8);
    const t2 = treadmill(); t2.position.set(3.7, 0, -3.8);
    g.add(t1, t2);
    g.userData._cardio = [t1, t2];
  }
  if (tier >= 2) {
    const sq = squatRack(); sq.position.set(-1.5, 0, -4.0);
    // mirror wall
    const mirror = box(6, 2.2, 0.06, 0x9fb6cf, { roughness: 0.12, metalness: 0.65 });
    mirror.position.set(-2, 1.6, -5.35);
    // turf sprint lane
    const turf = box(1.4, 0.03, 9, 0x3f7d46); turf.position.set(4.9, 0.02, 0);
    g.add(sq, mirror, turf);
  }
  if (tier >= 3) {
    const stripM = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 1.3, flatShading: true });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.07, 0.07), stripM); s1.position.set(0, 4.3, -5.3);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 10.6), stripM); s2.position.set(-6.8, 4.3, 0);
    const pod = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), stripM);
    pod.position.set(2.9, 1.4, 2.3);
    const podBase = cyl(1.0, 1.15, 0.12, 10, 0x22283b); podBase.position.set(2.9, 0.06, 2.3);
    const screenWall = box(2.6, 1.4, 0.08, 0x10162a, { emissive: 0x2b74d8, emissiveIntensity: 0.6 });
    screenWall.position.set(2.4, 2.4, -5.3);
    g.add(s1, s2, pod, podBase, screenWall);
    g.userData._screen = screenWall;
  }
  // training plan clipboard by the door — the "everything" menu
  const clip = box(0.8, 1.0, 0.06, 0xd9d2c2); clip.position.set(-6.85, 1.9, 2.8);
  const clipPaper = box(0.6, 0.75, 0.05, 0xf2f2f2); clipPaper.position.set(-6.8, 1.9, 2.8);
  g.add(clip, clipPaper);

  tagInteract(g, [bp], 'bench', 'Lift weights', '🏋️', new THREE.Vector3(0, 0, -0.6));
  tagInteract(g, [dr], 'bench', 'Lift weights', '🏋️', new THREE.Vector3(-3.4, 0, -3.9));
  tagInteract(g, [mat1], 'mat', 'Mobility work', '🧘', new THREE.Vector3(-3.0, 0, 2.0));
  tagInteract(g, [clip, clipPaper], 'clipboard', 'Training plan', '📋', new THREE.Vector3(-6.0, 0, 2.8));
  if (tier >= 1) {
    tagInteract(g, g.userData._cardio || [], 'cardio', 'Speed session', '⚡', new THREE.Vector3(3.1, 0, -3.6));
  }
  if (tier >= 3 && g.userData._screen) {
    tagInteract(g, [g.userData._screen], 'screen', 'Film study', '🎬', new THREE.Vector3(2.4, 0, -4.4));
  }
  g.userData.charAnchor = new THREE.Vector3(0, 0, 0.35);
  g.userData.camTarget = new THREE.Vector3(-0.2, 1.0, -0.8);
  g.userData.charPose = 'lift';
  g.userData.indoor = true;
  return g;
}

/* A compact play zone for one childhood sport — the youth park shows
   one per sport you picked, so your whole athletic life is visible. */
function parkZone(sportId) {
  const g = new THREE.Group();
  const pad = (c) => { const p = box(4.6, 0.1, 3.6, c); p.receiveShadow = true; g.add(p); };
  if (sportId === 'basketball') {
    pad(0xc98d4e);
    const pole = cyl(0.07, 0.07, 1.9, 6, 0x5a5a5a); pole.position.set(1.8, 0.95, 0);
    const board = box(0.06, 0.5, 0.75, 0xf2f2f2); board.position.set(1.8, 1.85, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 12), mat(0xe8503a));
    rim.rotation.x = Math.PI / 2; rim.position.set(1.55, 1.62, 0);
    const key = box(1.4, 0.02, 1.1, 0xb87c3e); key.position.set(1.1, 0.07, 0);
    g.add(pole, board, rim, key);
  } else if (sportId === 'soccer') {
    pad(0x3f8a44);
    // white boundary + mow stripe so the pitch pops against park grass
    for (const [w, d, x, z] of [[4.4, 0.07, 0, 1.7], [4.4, 0.07, 0, -1.7], [0.07, 3.4, -2.15, 0], [0.07, 3.4, 2.15, 0]]) {
      const l = box(w, 0.02, d, 0xf2f2f2); l.position.set(x, 0.07, z); g.add(l);
    }
    const stripe = box(1.4, 0.005, 3.4, 0x4a9a4f); stripe.position.set(-0.8, 0.065, 0); g.add(stripe);
    const posts = new THREE.Group();
    for (const pz of [-0.9, 0.9]) { const p = cyl(0.05, 0.05, 1.1, 6, 0xf2f2f2); p.position.set(0, 0.55, pz); posts.add(p); }
    const bar = cyl(0.05, 0.05, 1.85, 6, 0xf2f2f2); bar.rotation.x = Math.PI / 2; bar.position.y = 1.1;
    posts.add(bar);
    posts.position.x = 1.8;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(0xf2f2f2)); ball.position.set(0.3, 0.2, 0.4);
    g.add(posts, ball);
  } else if (sportId === 'football') {
    pad(0x4f9a48);
    const base = cyl(0.05, 0.05, 1.1, 6, 0xf2c14e); base.position.set(1.8, 0.55, 0);
    const cross = cyl(0.04, 0.04, 1.5, 6, 0xf2c14e); cross.rotation.x = Math.PI / 2; cross.position.set(1.8, 1.1, 0);
    const u1 = cyl(0.04, 0.04, 1.0, 6, 0xf2c14e); u1.position.set(1.8, 1.65, -0.75);
    const u2 = u1.clone(); u2.position.z = 0.75;
    const fb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mat(0x7c4a21)); fb.scale.set(1.4, 0.9, 0.9); fb.position.set(0, 0.16, 0.3);
    g.add(base, cross, u1, u2, fb);
  } else if (sportId === 'baseball') {
    pad(0xc9a06a);
    const dirt = cyl(1.5, 1.5, 0.02, 10, 0xb0854e); dirt.position.set(0, 0.07, 0);
    const tee = cyl(0.04, 0.05, 0.9, 6, 0x3a4258); tee.position.set(0, 0.45, 0);
    const bb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xf2f2f2)); bb.position.set(0, 0.95, 0);
    const bat = cyl(0.045, 0.028, 0.85, 6, 0xc9a06a); bat.rotation.z = 1.2; bat.position.set(0.7, 0.16, 0.5);
    for (const [bx, bz] of [[1.4, 0], [0, 1.4], [-1.4, 0], [0, -1.4]]) {
      const bs = box(0.3, 0.03, 0.3, 0xf2f2f2); bs.position.set(bx, 0.09, bz); bs.rotation.y = Math.PI / 4; g.add(bs);
    }
    g.add(dirt, tee, bb, bat);
  } else if (sportId === 'track') {
    pad(0xb85c40);
    for (let i = 0; i < 4; i++) {
      const lane = box(4.4, 0.02, 0.05, 0xf2f2f2); lane.position.set(0, 0.07, -1.35 + i * 0.9); g.add(lane);
    }
    const hurdle = new THREE.Group();
    const hb = box(0.06, 0.5, 0.9, 0x3a4258); hb.position.y = 0.25;
    const ht = box(0.08, 0.06, 1.0, 0xe8503a); ht.position.y = 0.52;
    hurdle.add(hb, ht); hurdle.position.set(0.8, 0, -0.45);
    g.add(hurdle);
  } else if (sportId === 'swimming') {
    const pool = box(4.2, 0.35, 3.2, 0xd9d2c2); pool.position.y = 0.17; g.add(pool);
    const water = box(3.8, 0.06, 2.8, 0x5cc4e8, { roughness: 0.15 }); water.position.y = 0.36; g.add(water);
    for (let i = 0; i < 3; i++) {
      const lane = box(3.7, 0.02, 0.04, 0xf2f2f2); lane.position.set(0, 0.4, -0.9 + i * 0.9); g.add(lane);
    }
  } else if (sportId === 'tennis') {
    pad(0x4a8fd8);
    const netP1 = cyl(0.04, 0.04, 0.55, 6, 0x3a4258); netP1.position.set(0, 0.27, -1.6);
    const netP2 = netP1.clone(); netP2.position.z = 1.6;
    const net = box(0.04, 0.45, 3.2, 0xf2f2f2, { transparent: true, opacity: 0.55 }); net.position.y = 0.28;
    const lineC = box(0.05, 0.02, 3.2, 0xf2f2f2); lineC.position.set(0, 0.07, 0);
    g.add(netP1, netP2, net, lineC);
  } else { // martial arts
    const matPad = box(3.6, 0.08, 3.6, 0xe25c4a); matPad.position.y = 0.04; matPad.receiveShadow = true;
    const matIn = box(2.6, 0.02, 2.6, 0xf2e2c9); matIn.position.y = 0.1;
    const dummyB = cyl(0.22, 0.28, 1.1, 8, 0xc9a06a); dummyB.position.set(1.2, 0.55, -0.8);
    const dummyH = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), mat(0xc9a06a)); dummyH.position.set(1.2, 1.3, -0.8);
    g.add(matPad, matIn, dummyB, dummyH);
  }
  return g;
}

/* The youth park: one zone per childhood sport */
function parkInterior(youthSports, seedR) {
  const g = new THREE.Group();
  const base = box(26, 0.14, 18, 0x74b45c); base.position.y = -0.02; base.receiveShadow = true;
  g.add(base);
  // fence + trees around the edge
  for (let i = 0; i < 14; i++) {
    const fx = -12 + i * 1.85;
    const post = box(0.12, 0.9, 0.12, 0x8a5a33); post.position.set(fx, 0.45, -8.6);
    const rail = box(1.85, 0.1, 0.08, 0x8a5a33); rail.position.set(fx + 0.9, 0.75, -8.6);
    g.add(post, rail);
  }
  for (let i = 0; i < 6; i++) {
    const tr = tree(0.9 + seedR() * 0.5, seedR() > 0.5);
    tr.position.set(-11 + seedR() * 22, 0, -7.4 + seedR() * 1.6);
    g.add(tr);
  }
  const bench = box(1.8, 0.12, 0.5, 0x8a5a33); bench.position.set(9.5, 0.5, 5.5);
  const benchL = box(1.6, 0.4, 0.4, 0x6b4b2a); benchL.position.set(9.5, 0.2, 5.5);
  g.add(bench, benchL);

  const spots = [[-6.2, -3.0], [0, -4.4], [6.2, -3.0]];
  youthSports.forEach((sportId, i) => {
    const zone = parkZone(sportId);
    const [zx, zz] = spots[i] || [0, 0];
    zone.position.set(zx, 0.06, zz);
    g.add(zone);
    const meta = YOUTH_SPORTS[sportId] || {};
    tagInteract(g, [zone], `pickup:${sportId}`, `Play ${meta.name || sportId}`, meta.ico || '🎽', new THREE.Vector3(zx, 0, zz + 2.6), 2.8);
  });

  g.userData.bounds = { x: 12, z: 8 };
  g.userData.charAnchor = new THREE.Vector3(0, 0, 2.4);
  g.userData.charPose = 'dribble';
  g.userData.indoor = false;
  g.userData.viewRadius = 16;
  g.userData.flatView = true; // zones are laid out left-to-right — face them head-on
  return g;
}

/* ---------- playing surface (sport + era) ---------- */
function courtInterior(sport, era, seedR, youthSports) {
  if (era === 'youth') return parkInterior(youthSports || [], seedR);
  const g = new THREE.Group();
  const big = era === 'pro' ? 1.25 : era === 'college' ? 1.1 : era === 'hs' ? 1.0 : 0.85;
  const lineM = mat(0xf2f2f2);
  const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), lineM); m.position.set(x, 0.06, z); return m; };

  let W2, D2;
  if (sport === 'basketball' || !sport) {
    W2 = 15 * big; D2 = 8.6 * big;
    const court = box(W2, 0.12, D2, 0xc98d4e); court.position.y = 0; court.receiveShadow = true;
    g.add(court);
    g.add(line(W2 - 0.4, 0.1, 0, D2 / 2 - 0.25), line(W2 - 0.4, 0.1, 0, -D2 / 2 + 0.25), line(0.1, D2 - 0.4, 0, 0));
    const circle = new THREE.Mesh(new THREE.TorusGeometry(1.1 * big, 0.045, 6, 28), lineM);
    circle.rotation.x = Math.PI / 2; circle.position.y = 0.07;
    g.add(circle);
    for (const side of [-1, 1]) {
      const key = line(2.4 * big, 0.1, side * (W2 / 2 - 2.6 * big), 1.6 * big);
      const key2 = line(2.4 * big, 0.1, side * (W2 / 2 - 2.6 * big), -1.6 * big);
      const key3 = line(0.1, 3.25 * big, side * (W2 / 2 - 1.4 * big), 0);
      g.add(key, key2, key3);
      // hoop
      const pole = cyl(0.09, 0.09, 2.6, 6, 0x3a4258); pole.position.set(side * (W2 / 2 + 0.5), 1.3, 0);
      const arm = box(0.7, 0.08, 0.08, 0x3a4258); arm.position.set(side * (W2 / 2 + 0.15), 2.55, 0);
      const board = box(0.08, 0.9, 1.4, 0xf2f2f2); board.position.set(side * (W2 / 2 - 0.2), 2.6, 0);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 14), mat(0xe8503a));
      rim.rotation.x = Math.PI / 2; rim.position.set(side * (W2 / 2 - 0.5), 2.3, 0);
      const net = cyl(0.22, 0.14, 0.34, 8, 0xf2f2f2, { transparent: true, opacity: 0.5 });
      net.position.set(side * (W2 / 2 - 0.5), 2.12, 0);
      g.add(pole, arm, board, rim, net);
      if (side === 1) g.userData.hoop = new THREE.Vector3(W2 / 2 - 0.5, 2.3, 0);
    }
  } else if (sport === 'soccer') {
    W2 = 20 * big; D2 = 13 * big;
    const pitch = box(W2, 0.12, D2, 0x4f9d46); pitch.receiveShadow = true;
    g.add(pitch);
    // mow stripes
    for (let i = 0; i < 8; i++) {
      if (i % 2) continue;
      const stripe = box(W2 / 8, 0.005, D2, 0x58a94f);
      stripe.position.set(-W2 / 2 + W2 / 16 + i * (W2 / 8), 0.065, 0);
      g.add(stripe);
    }
    g.add(line(W2 - 0.4, 0.12, 0, D2 / 2 - 0.25), line(W2 - 0.4, 0.12, 0, -D2 / 2 + 0.25), line(0.12, D2 - 0.4, 0, 0));
    const circle = new THREE.Mesh(new THREE.TorusGeometry(1.7 * big, 0.05, 6, 30), lineM);
    circle.rotation.x = Math.PI / 2; circle.position.y = 0.07;
    g.add(circle);
    for (const side of [-1, 1]) {
      g.add(line(0.12, 5.2 * big, side * (W2 / 2 - 2.2 * big), 0));
      const posts = new THREE.Group();
      for (const pz of [-1.6 * big, 1.6 * big]) {
        const post = cyl(0.06, 0.06, 1.5, 6, 0xf2f2f2); post.position.set(0, 0.75, pz);
        posts.add(post);
      }
      const bar = cyl(0.06, 0.06, 3.2 * big, 6, 0xf2f2f2); bar.rotation.x = Math.PI / 2; bar.position.y = 1.5;
      const netB = box(0.7, 1.4, 3.2 * big, 0xf2f2f2, { transparent: true, opacity: 0.18 });
      netB.position.set(side * 0.4, 0.7, 0);
      posts.add(bar, netB);
      posts.position.x = side * (W2 / 2 - 0.2);
      g.add(posts);
      if (side === 1) g.userData.hoop = new THREE.Vector3(W2 / 2 - 0.4, 0.7, 0);
    }
  } else { // football
    W2 = 22 * big; D2 = 12 * big;
    const field = box(W2, 0.12, D2, 0x3f8a3f); field.receiveShadow = true;
    g.add(field);
    for (let i = 0; i <= 10; i++) {
      g.add(line(0.1, D2 - 0.4, -W2 / 2 + 1.5 + i * (W2 - 3) / 10, 0));
    }
    for (const side of [-1, 1]) {
      const zone = box(1.5, 0.005, D2 - 0.3, side === 1 ? 0x2f6e9e : 0x9e2f4a);
      zone.position.set(side * (W2 / 2 - 0.75), 0.065, 0);
      g.add(zone);
      const base = cyl(0.07, 0.07, 1.4, 6, 0xf2c14e); base.position.set(side * (W2 / 2 + 0.4), 0.7, 0);
      const cross = cyl(0.05, 0.05, 2.4, 6, 0xf2c14e); cross.rotation.x = Math.PI / 2; cross.position.set(side * (W2 / 2 + 0.4), 1.4, 0);
      const up1 = cyl(0.05, 0.05, 1.6, 6, 0xf2c14e); up1.position.set(side * (W2 / 2 + 0.4), 2.2, -1.2);
      const up2 = up1.clone(); up2.position.z = 1.2;
      g.add(base, cross, up1, up2);
      if (side === 1) g.userData.hoop = new THREE.Vector3(W2 / 2 + 0.4, 2.0, 0);
    }
  }

  // stands wrap the long sides; crowd grows with era
  const rows = era === 'youth' ? 1 : era === 'hs' ? 2 : era === 'college' ? 3 : 4;
  const crowdColors = [0xe25c4a, 0xf2c14e, 0x5a8fd8, 0x8fd85a, 0xd85ab8, 0xf2f2f2];
  for (const side of [-1, 1]) {
    for (let r = 0; r < rows; r++) {
      const stand = box(W2 + 2, 0.5, 0.9, era === 'pro' ? 0x2a3148 : 0x5a6478);
      stand.position.set(0, 0.25 + r * 0.5, side * (D2 / 2 + 1.2 + r * 0.95));
      g.add(stand);
      const seats = Math.floor((W2 + 2) / 0.55);
      for (let sIdx = 0; sIdx < seats; sIdx++) {
        if (seedR() < (era === 'youth' ? 0.75 : era === 'hs' ? 0.45 : 0.2)) continue; // empty seats early on
        const fan = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(crowdColors[Math.floor(seedR() * crowdColors.length)]));
        fan.position.set(-(W2 + 2) / 2 + 0.3 + sIdx * 0.55, 0.65 + r * 0.5, side * (D2 / 2 + 1.2 + r * 0.95));
        g.add(fan);
      }
    }
  }
  // floodlights
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pole = cyl(0.1, 0.13, 5.2, 6, 0x4a5164); pole.position.set(sx * (W2 / 2 + 1.4), 2.6, sz * (D2 / 2 + 2.2));
    const lampM = new THREE.MeshStandardMaterial({ color: 0xfff6cf, emissive: 0xfff2b0, emissiveIntensity: 1.0, flatShading: true });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.18), lampM);
    lamp.position.set(sx * (W2 / 2 + 1.4), 5.3, sz * (D2 / 2 + 2.2));
    lamp.lookAt(0, 0.5, 0);
    g.add(pole, lamp);
  }
  // game ball waiting at center + scoreboard by the stands
  const ballC = sport === 'soccer' ? 0xf2f2f2 : sport === 'football' ? 0x7c4a21 : 0xe8763c;
  const gameBall = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), mat(ballC));
  gameBall.position.set(0, 0.4, -1.6); gameBall.castShadow = true;
  const sbPole = cyl(0.09, 0.11, 2.6, 6, 0x3a4258); sbPole.position.set(-W2 / 2 - 1.6, 1.3, -D2 / 2 - 1.4);
  const sbFace = box(2.2, 1.2, 0.14, 0x10162a, { emissive: 0xe8503a, emissiveIntensity: 0.55 });
  sbFace.position.set(-W2 / 2 - 1.6, 3.1, -D2 / 2 - 1.4);
  sbFace.lookAt(0, 1, 0);
  g.add(gameBall, sbPole, sbFace);
  tagInteract(g, [gameBall], 'ball', 'Ball up!', '🏀', gameBall.position.clone(), 2.4);
  tagInteract(g, [sbPole, sbFace], 'scoreboard', 'Scoreboard', '📊', new THREE.Vector3(-W2 / 2 - 0.6, 0, -D2 / 2 - 0.6), 2.6);
  g.userData.bounds = { x: W2 / 2 + 2, z: D2 / 2 + 1 };
  g.userData.charAnchor = new THREE.Vector3(0, 0, 1.2);
  g.userData.charPose = 'dribble';
  g.userData.indoor = false; // open air: keep the sky
  g.userData.viewRadius = Math.max(W2, D2) * 1.05;
  return g;
}

/* ---------- house interior (owned gear furnishes the room) ---------- */
function houseInterior(state) {
  const gear = state.owned.gear;
  const pro = state.athlete.era === 'pro';
  const g = roomShell(12, 4.4, 9.5, pro ? 0x8a715a : 0x9c7d5c, pro ? 0x3b4252 : 0x8a9bb8);
  roomLights(g, 0xffe2b8, 42);

  // bed — the heart of the game
  const nice = gear['g_matt'];
  const frame = box(2.1, 0.35, 3.1, 0x6b4b2a); frame.position.set(-3.1, 0.18, -2.2);
  const mattress = box(1.9, 0.3, 2.9, nice ? 0xdfe8f2 : 0xcfc4ae); mattress.position.set(-3.1, 0.5, -2.2);
  const pillow = box(1.4, 0.18, 0.6, 0xf2f2f2); pillow.position.set(-3.1, 0.7, -3.3);
  const blanket = box(1.92, 0.12, 1.7, nice ? 0x4a5aa8 : 0x9e2f4a); blanket.position.set(-3.1, 0.68, -1.5);
  g.add(frame, mattress, pillow, blanket);
  g.userData.bed = new THREE.Vector3(-3.1, 0.85, -2.0);

  // nightstand + lamp
  const stand = box(0.7, 0.6, 0.7, 0x6b4b2a); stand.position.set(-1.6, 0.3, -3.6);
  const lampBase = cyl(0.06, 0.1, 0.3, 6, 0x3a4258); lampBase.position.set(-1.6, 0.75, -3.6);
  const shade = cone(0.22, 0.3, 8, 0xf2e2c9); shade.position.set(-1.6, 1.0, -3.6);
  g.add(stand, lampBase, shade);

  // window with (optional blackout) curtains
  const win = box(2.2, 1.5, 0.1, 0x8fc8e8, { emissive: 0x8fc8e8, emissiveIntensity: 0.25 });
  win.position.set(1.6, 2.3, -4.68);
  g.add(win);
  g.userData.window = win;
  if (gear['g_curtain']) {
    const c1 = box(0.5, 1.9, 0.14, 0x22283b); c1.position.set(0.35, 2.3, -4.6);
    const c2 = c1.clone(); c2.position.x = 2.85;
    const rod = cyl(0.03, 0.03, 3.0, 6, 0x6b4b2a); rod.rotation.z = Math.PI / 2; rod.position.set(1.6, 3.3, -4.6);
    g.add(c1, c2, rod);
  }

  // rug
  const rug = cyl(1.7, 1.7, 0.03, 10, pro ? 0x4a5aa8 : 0xb85c40); rug.position.set(0.4, 0.02, 0.4);
  rug.receiveShadow = true;
  g.add(rug);

  // gear shows up in the room as you buy it
  if (gear['g_roller']) {
    const roller = cyl(0.14, 0.14, 0.8, 10, 0x4a5aa8); roller.rotation.z = Math.PI / 2; roller.position.set(1.8, 0.14, 2.4);
    g.add(roller);
  }
  if (gear['g_gun']) {
    const gunB = box(0.14, 0.3, 0.14, 0x22283b); gunB.position.set(-1.45, 0.68, -3.45); // on the nightstand
    g.add(gunB);
  }
  if (gear['g_icebath']) {
    const tub = cyl(0.9, 0.75, 0.8, 10, 0xd9d2c2); tub.position.set(3.9, 0.4, -3.2);
    const water = cyl(0.75, 0.75, 0.06, 10, 0x9fdcf2, { roughness: 0.15 }); water.position.set(3.9, 0.78, -3.2);
    const cubes = [];
    for (let i = 0; i < 4; i++) {
      const cube = box(0.16, 0.12, 0.16, 0xe8f6fc, { transparent: true, opacity: 0.85 });
      cube.position.set(3.9 + Math.cos(i * 1.9) * 0.4, 0.84, -3.2 + Math.sin(i * 1.9) * 0.4);
      cubes.push(cube);
    }
    g.add(tub, water, ...cubes);
  }
  if (gear['g_nutrition'] || gear['g_chef']) {
    // kitchen corner: counter + fridge + fruit bowl
    const counter = box(2.4, 0.9, 0.8, 0xd9d2c2); counter.position.set(4.2, 0.45, 2.9);
    const fridge = box(0.9, 1.9, 0.8, gear['g_chef'] ? 0x9fb6cf : 0xf2f2f2); fridge.position.set(5.3, 0.95, 1.6);
    const bowl = cyl(0.22, 0.14, 0.14, 8, 0x3a4258); bowl.position.set(3.8, 0.97, 2.9);
    const fruit1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0xe25c4a)); fruit1.position.set(3.72, 1.08, 2.85);
    const fruit2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), mat(0xf2c14e)); fruit2.position.set(3.92, 1.08, 2.98);
    g.add(counter, fridge, bowl, fruit1, fruit2);
  }
  // trophy shelf grows with your career
  const shelfCount = Math.min(5, (state.career.trophies || []).length);
  if (shelfCount || pro) {
    const shelf = box(2.2, 0.08, 0.5, 0x6b4b2a); shelf.position.set(-4.6, 2.4, 1.6);
    shelf.rotation.y = Math.PI / 2;
    g.add(shelf);
    for (let i = 0; i < shelfCount; i++) {
      const cup = new THREE.Group();
      const bowl2 = cyl(0.09, 0.05, 0.16, 8, 0xffd166);
      const base2 = box(0.12, 0.05, 0.12, 0xe0a93c); base2.position.y = -0.11;
      cup.add(bowl2, base2);
      cup.position.set(-4.6, 2.55, 0.8 + i * 0.42);
      g.add(cup);
    }
  }
  // wall TV + dresser + plant + pennant
  const tv = box(1.7, 1.0, 0.08, 0x10162a, { emissive: 0x2b74d8, emissiveIntensity: 0.35 });
  tv.position.set(-5.8, 2.2, 0.6); tv.rotation.y = Math.PI / 2;
  const dresser = box(1.6, 0.9, 0.6, 0x8a5a33); dresser.position.set(0.8, 0.45, -4.3);
  const dLamp = cyl(0.05, 0.08, 0.25, 6, 0x3a4258); dLamp.position.set(0.4, 1.02, -4.3);
  const plant2 = new THREE.Group();
  const pot2 = cyl(0.24, 0.18, 0.4, 7, 0xd9d2c2); pot2.position.y = 0.2;
  const leaves2 = cone(0.35, 0.9, 6, 0x4f9d5f); leaves2.position.y = 0.85;
  plant2.add(pot2, leaves2);
  plant2.position.set(-5.2, 0, -3.9);
  const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 3), mat(0xe25c4a));
  pennant.rotation.z = Math.PI / 2; pennant.rotation.x = Math.PI / 2;
  pennant.position.set(-1.0, 2.8, -4.62);
  g.add(tv, dresser, dLamp, plant2, pennant);

  tagInteract(g, [frame, mattress, pillow, blanket], 'bed', 'Sleep', '🛏️', new THREE.Vector3(-3.1, 0, -0.4), 2.2);
  tagInteract(g, [stand, lampBase, shade], 'nightstand', 'Sleep tracker', '⌚', new THREE.Vector3(-1.6, 0, -2.7), 1.8);
  tagInteract(g, [tv], 'tv', 'Career story', '📺', new THREE.Vector3(-4.6, 0, 0.6), 2.2);
  tagInteract(g, [dresser, dLamp], 'dresser', 'Settings', '⚙️', new THREE.Vector3(0.8, 0, -3.2), 1.8);
  g.userData.charAnchor = new THREE.Vector3(-1.9, 0, -0.7);
  g.userData.camTarget = new THREE.Vector3(-1.2, 1.0, -1.2);
  g.userData.charPose = 'sit';
  g.userData.indoor = true;
  return g;
}

/* ---------- school / campus / media HQ interior ---------- */
function schoolInterior(era) {
  if (era === 'pro') {
    // media studio
    const g = roomShell(13, 4.6, 10, 0x2a3148, 0x1c2233);
    roomLights(g, 0xd8e8ff, 60);
    const desk = box(3.4, 0.9, 1.2, 0x39415c); desk.position.set(0, 0.45, -1.6);
    const deskTop = box(3.6, 0.08, 1.35, 0x22d3ee, { emissive: 0x22d3ee, emissiveIntensity: 0.4 }); deskTop.position.set(0, 0.92, -1.6);
    for (const mx of [-1, 0.9]) {
      const micArm = cyl(0.025, 0.025, 0.5, 6, 0x8a93a8); micArm.position.set(mx, 1.2, -1.5); micArm.rotation.z = 0.5;
      const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0x22283b)); micHead.position.set(mx + 0.12, 1.42, -1.5);
      g.add(micArm, micHead);
    }
    const screenWall = box(6, 2.6, 0.1, 0x10162a, { emissive: 0x2b74d8, emissiveIntensity: 0.5 });
    screenWall.position.set(0, 2.4, -4.9);
    for (const cx of [-3.4, 3.4]) {
      const tripod = new THREE.Group();
      for (let l = 0; l < 3; l++) {
        const leg = cyl(0.03, 0.03, 1.5, 5, 0x3a4258);
        leg.position.y = 0.7; leg.rotation.z = 0.4; leg.rotation.y = l * 2.1;
        tripod.add(leg);
      }
      const cam = box(0.5, 0.35, 0.7, 0x22283b); cam.position.y = 1.55;
      const lens = cyl(0.1, 0.13, 0.25, 8, 0x10141f); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.55, 0.45);
      tripod.add(cam, lens);
      tripod.position.set(cx, 0, 1.4);
      tripod.lookAt(0, 1.4, -1.6);
      g.add(tripod);
    }
    g.add(desk, deskTop, screenWall);
    tagInteract(g, [screenWall], 'board', 'Study film', '🎬', new THREE.Vector3(0, 0, -3.6), 2.2);
    tagInteract(g, [desk, deskTop], 'deskj', 'Press conference', '🎙️', new THREE.Vector3(0, 0, 0.2), 2.2);
    g.userData.charAnchor = new THREE.Vector3(0, 0, -0.4);
    g.userData.camTarget = new THREE.Vector3(0, 1.2, -1.4);
    g.userData.charPose = 'sit';
    g.userData.indoor = true;
    return g;
  }
  // classroom / lecture hall
  const college = era === 'college';
  const g = roomShell(13, 4.4, 10, 0x9c7d5c, college ? 0x8a715a : 0xa8c8b8);
  roomLights(g, 0xfff2d8, 48);
  const boardC = college ? 0xf2f2f2 : 0x2f5e46;
  const board = box(4.6, 1.7, 0.1, boardC); board.position.set(-0.5, 2.3, -4.9);
  const tray = box(4.6, 0.08, 0.2, 0x6b4b2a); tray.position.set(-0.5, 1.4, -4.8);
  const tDesk = box(1.8, 0.85, 0.8, 0x6b4b2a); tDesk.position.set(3.6, 0.42, -3.6);
  g.add(board, tray, tDesk);
  const rows = college ? 4 : 3, cols = college ? 4 : 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const desk = new THREE.Group();
      const top = box(0.9, 0.06, 0.55, 0xc9a06a); top.position.y = 0.72;
      const leg = box(0.08, 0.7, 0.08, 0x3a4258); leg.position.set(0, 0.36, 0);
      const seat = box(0.5, 0.06, 0.45, 0x8a4a3a); seat.position.set(0, 0.45, 0.62);
      const back = box(0.5, 0.5, 0.06, 0x8a4a3a); back.position.set(0, 0.72, 0.85);
      desk.add(top, leg, seat, back);
      desk.position.set(-3.3 + c * 1.9, college ? r * 0.22 : 0, -2.2 + r * 1.5);
      g.add(desk);
    }
  }
  if (college) {
    const banner = box(1.2, 1.8, 0.06, 0xa78bfa); banner.position.set(-5.6, 2.6, -3.0); banner.rotation.y = Math.PI / 2;
    g.add(banner);
  } else {
    const globeBase = cyl(0.06, 0.1, 0.3, 6, 0x6b4b2a); globeBase.position.set(3.6, 1.0, -3.6);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0x4a8fd8)); globe.position.set(3.6, 1.3, -3.6);
    g.add(globeBase, globe);
  }
  tagInteract(g, [board, tray], 'board', 'Study hall', '📚', new THREE.Vector3(-0.5, 0, -3.6), 2.4);
  tagInteract(g, [tDesk], 'deskj', 'Yearbook', '📖', new THREE.Vector3(2.6, 0, -2.6), 2.0);
  g.userData.charAnchor = new THREE.Vector3(-1.4, 0, 0.9);
  g.userData.camTarget = new THREE.Vector3(-0.6, 1.0, -1.0);
  g.userData.charPose = 'sit';
  g.userData.indoor = true;
  return g;
}

/* ---------- club shop interior ---------- */
function shopInterior(state) {
  const g = roomShell(12, 4.4, 9.5, 0x9c7d5c, 0xd9c7a8);
  roomLights(g, 0xfff2d8, 50);
  // counter + register
  const counter = box(3.2, 0.95, 0.9, 0x6b4b2a); counter.position.set(2.8, 0.47, 2.6);
  const register = box(0.5, 0.4, 0.4, 0x22283b); register.position.set(3.6, 1.15, 2.6);
  g.add(counter, register);
  // shelves stocked with gear-colored boxes
  const stock = [0x4a5aa8, 0x22283b, 0xe25c4a, 0xf2c14e, 0x8fd85a, 0x9fdcf2, 0xd85ab8, 0xf2f2f2];
  let sIdx = 0;
  for (const sx of [-3.8, -1.2]) {
    for (let lvl = 0; lvl < 3; lvl++) {
      const shelf = box(2.4, 0.07, 0.8, 0x8a5a33); shelf.position.set(sx, 0.7 + lvl * 0.85, -4.0);
      g.add(shelf);
      for (let b = 0; b < 3; b++) {
        const bx = box(0.5, 0.42, 0.5, stock[sIdx++ % stock.length]);
        bx.position.set(sx - 0.8 + b * 0.8, 0.95 + lvl * 0.85, -4.0);
        g.add(bx);
      }
    }
  }
  // shoe display pedestal
  const ped = cyl(0.5, 0.6, 0.9, 8, 0xd9d2c2); ped.position.set(-3.2, 0.45, 1.6);
  const shoe = box(0.55, 0.25, 0.9, 0xe25c4a); shoe.position.set(-3.2, 1.05, 1.6); shoe.rotation.y = 0.6;
  const spot = new THREE.PointLight(0xfff2d8, 12, 6, 2); spot.position.set(-3.2, 2.4, 1.6);
  g.add(ped, shoe, spot);
  // sale sign
  const sign = box(1.8, 0.6, 0.06, 0x10162a, { emissive: 0xffd166, emissiveIntensity: 0.5 });
  sign.position.set(2.8, 2.6, -4.9);
  // recovery corner: massage table
  const mTable = box(1.9, 0.16, 0.8, 0x4a5aa8); mTable.position.set(3.6, 0.75, -3.4);
  const mLegs = box(1.5, 0.7, 0.6, 0xd9d2c2); mLegs.position.set(3.6, 0.35, -3.4);
  const mTowel = box(0.6, 0.06, 0.8, 0xf2f2f2); mTowel.position.set(3.0, 0.86, -3.4);
  g.add(sign, mTable, mLegs, mTowel);

  const shelfMeshes = [];
  g.traverse((o) => { if (o.isMesh && o.geometry?.type === 'BoxGeometry' && o.position.z === -4.0) shelfMeshes.push(o); });
  tagInteract(g, shelfMeshes, 'shelf', 'Browse gear', '🛌', new THREE.Vector3(-2.5, 0, -2.8), 2.6);
  tagInteract(g, [counter, register], 'counter', 'Hire staff & upgrades', '🧑\u200d🏫', new THREE.Vector3(2.0, 0, 1.6), 2.4);
  tagInteract(g, [mTable, mLegs, mTowel], 'massage', 'Recovery services', '💆', new THREE.Vector3(3.4, 0, -2.2), 2.2);
  g.userData.charAnchor = new THREE.Vector3(0.4, 0, 0.6);
  g.userData.camTarget = new THREE.Vector3(-0.6, 1.0, -0.8);
  g.userData.charPose = 'idle';
  g.userData.indoor = true;
  return g;
}

/* ---------- enter / exit ---------- */
export function inInterior() { return interior ? interior.id : null; }

export function enterInterior(id) {
  if (!lastState || interior?.id === id) return;
  exitInterior();
  const era = lastState.athlete.retired ? 'pro' : lastState.athlete.era;
  const seedFn = rng(4242 + ERA_CFG[era].R);
  const group =
    id === 'gym' ? gymInterior(lastState.owned.facility)
    : id === 'stadium' ? courtInterior(lastState.athlete.mainSport, era, seedFn, lastState.athlete.youthSports)
    : id === 'house' ? houseInterior(lastState)
    : id === 'school' ? schoolInterior(era)
    : shopInterior(lastState);

  interior = { id, group };
  worldGroup.visible = false;
  for (const c of clouds) c.visible = false;
  scene.add(group);

  savedView = { orbit: { ...orbit }, fog: scene.fog, bg: scene.background };
  const portrait = camera.aspect < 1;
  if (group.userData.indoor) {
    scene.fog = null;
    scene.background = new THREE.Color(ROOM_BG);
    camera.fov = portrait ? 66 : 50;
    camera.updateProjectionMatrix();
    orbit.min = 5; orbit.max = 16;
    orbit.radius = portrait ? 11.5 : 8.5;
    orbit.phi = 1.1; orbit.theta = Math.PI * 0.24;
    orbit.target = (group.userData.camTarget || new THREE.Vector3(-0.4, 1.0, -0.6)).clone();
  } else {
    const vr = group.userData.viewRadius || 18;
    orbit.min = vr * 0.5; orbit.max = vr * 2.0;
    orbit.radius = vr * (portrait ? (group.userData.flatView ? 1.5 : 1.35) : 0.95);
    orbit.phi = 0.95;
    orbit.theta = Math.PI * (group.userData.flatView ? 0.5 : 0.28);
    orbit.target = new THREE.Vector3(0, 0.5, 0);
  }

  // place the character inside
  if (character) {
    const anchor = group.userData.charAnchor || new THREE.Vector3();
    character.position.copy(anchor);
    character.rotation.y = Math.PI * 0.15;
    charState = { mode: 'idle', target: null, resolve: null, pose: group.userData.charPose || 'idle' };
    setBallForPlace(id);
  }
  applyDayNight();
}

export function exitInterior() {
  if (!interior) return;
  scene.remove(interior.group);
  disposeGroup(interior.group);
  const wasAt = interior.id;
  interior = null;
  worldGroup.visible = true;
  for (const c of clouds) c.visible = true;
  if (savedView) {
    scene.fog = savedView.fog;
    scene.background = savedView.bg;
    orbit = savedView.orbit;
    savedView = null;
    fitCamera(false); // restores the outdoor field of view
  }
  if (character && buildings[wasAt]) {
    character.position.copy(buildings[wasAt].door);
    charState = { mode: 'idle', target: null, resolve: null, pose: 'dribble' };
    setBallForPlace(null);
  }
  applyDayNight();
}

function setBallForPlace(id) {
  if (!character) return;
  const u = character.userData;
  const sport = lastState?.athlete.mainSport;
  const showBall = id === null || id === 'stadium';
  u.ball.visible = showBall;
  const color = sport === 'soccer' ? 0xf2f2f2 : sport === 'football' ? 0x7c4a21 : 0xe8763c;
  u.ball.material = mat(color);
}

/* While a panel covers the lower screen, re-frame the camera */
export function setPanelShift(on) { panelOpenFlag = on; }

/* Character pose for the sleep sequence */
export function setSleeping(on) {
  if (!character || !charState) return;
  if (on) {
    charState.pose = 'sleep';
    if (interior?.id === 'house' && interior.group.userData.bed) {
      const bed = interior.group.userData.bed;
      character.position.set(bed.x, bed.y, bed.z);
      character.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    }
  } else {
    character.rotation.set(0, Math.PI * 0.15, 0);
    charState.pose = interior?.group.userData.charPose || 'idle';
    if (interior?.group.userData.charAnchor) character.position.copy(interior.group.userData.charAnchor);
  }
}

/* ---------------- direct-control API ---------------- */
export function setMoveInput(x, y) { moveInput.x = x; moveInput.y = y; }

export function triggerPrompt() {
  if (!currentPrompt) return;
  if (currentPrompt.kind === 'building') {
    enterArmed[currentPrompt.id] = false;
    if (onEnterCb) onEnterCb(currentPrompt.id);
  } else if (onInteractCb) {
    onInteractCb(currentPrompt.id);
  }
}

/* Play a short activity animation (lift, sprint, stretch, dribble, sit)
   and resolve when it finishes — the visual beat for "doing stuff". */
export function playAction(pose, seconds = 1.6) {
  if (!character || !charState) return Promise.resolve();
  if (charState.action?.resolve) charState.action.resolve();
  return new Promise((resolve) => {
    charState.action = { pose, t: seconds, resolve };
  });
}
