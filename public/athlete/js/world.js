/* ============================================================
   SLEEPER — 3D world map (three.js, low-poly island)
   The main game screen: an island neighborhood that grows with
   your career. Buildings are real places — tap one to walk
   there and open its screen. Everything upgrades visually:
   house (recovery gear), gym (facility tier), stadium (era).
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

/* ---------------- module state ---------------- */
let renderer, scene, camera, raycaster, clock;
let container, onBuildingCb = null;
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
    character.position.copy(buildings.house.door);
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
export function initWorld(el, { onBuilding } = {}) {
  container = el;
  onBuildingCb = onBuilding;
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
  const h = worldHash(state);
  if (h !== lastHash) {
    lastHash = h;
    buildWorld(state);
  }
}

export function walkTo(id) {
  const b = buildings[id];
  if (!b || !character) return Promise.resolve();
  return new Promise((res) => {
    if (charState.resolve) charState.resolve();
    charState = { mode: 'walking', target: b.door.clone(), resolve: res, t: 0 };
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
  const id = findBuildingHit(pointerRay(e));
  if (id && onBuildingCb) {
    // bounce feedback
    const b = buildings[id];
    b.bounce = 1;
    onBuildingCb(id);
  }
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

  // camera orbit
  const { theta, phi, radius, target } = orbit;
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.cos(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.sin(theta)
  );
  camera.lookAt(target);

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
      // idle: breathe + settle limbs, dribble the ball
      u.legL.rotation.x *= 0.85; u.legR.rotation.x *= 0.85;
      u.armL.rotation.x *= 0.85;
      u.armR.rotation.x = Math.sin(t * 6) * 0.18 - 0.15;
      character.position.y = Math.sin(t * 2) * 0.015;
      u.ball.position.y = 0.14 + Math.abs(Math.sin(t * 6)) * 0.42;
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
  const sky = DAY.sky.clone().lerp(NIGHT.sky, k);
  scene.background = sky;
  if (scene.fog) scene.fog.color = sky;
  lights.sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * k;
  lights.hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * k;
  stars.material.opacity = k * 0.9;
  moonSprite.material.opacity = k;
  if (lights.sunSprite) lights.sunSprite.material.opacity = (1 - k) * 0.95;
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
