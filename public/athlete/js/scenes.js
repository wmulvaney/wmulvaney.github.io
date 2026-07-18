/* ============================================================
   RISE — era scene art (hand-built layered SVG)
   Each scene is a wide illustration used as the dashboard hero
   and in story modals. If you later generate raster art (e.g.
   with Gemini/Imagen), drop files at img/scene-<era>.jpg and
   sceneArt() will use them automatically via <image> fallback.
   ============================================================ */

const W = 800, H = 420;

function wrap(inner, id) {
  return `<svg class="scene" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" data-scene="${id}">${inner}</svg>`;
}

/* Backyard at golden hour: fence, tree, hoop, fireflies */
function youthScene() {
  const fireflies = Array.from({ length: 14 }, (_, i) => {
    const x = 40 + (i * 173) % 720, y = 150 + (i * 97) % 200;
    return `<circle cx="${x}" cy="${y}" r="2.2" fill="#ffe9a3" opacity=".85">
      <animate attributeName="opacity" values="0;.9;0" dur="${2.4 + (i % 5) * 0.6}s" begin="${(i % 7) * 0.5}s" repeatCount="indefinite"/>
    </circle>`;
  }).join('');
  const pickets = Array.from({ length: 27 }, (_, i) =>
    `<rect x="${i * 30 - 5}" y="228" width="20" height="86" rx="3" fill="#3d2b52"/>`).join('');
  return wrap(`
    <defs>
      <linearGradient id="ySky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b1a55"/><stop offset=".45" stop-color="#8f3d6e"/>
        <stop offset=".75" stop-color="#e8724c"/><stop offset="1" stop-color="#ffb35c"/>
      </linearGradient>
      <linearGradient id="yGrass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1d3a2f"/><stop offset="1" stop-color="#0d1f1a"/>
      </linearGradient>
      <radialGradient id="ySun" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff3c4"/><stop offset=".6" stop-color="#ffcf6b"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#ySky)"/>
    <circle cx="580" cy="238" r="90" fill="url(#ySun)"/>
    <circle cx="580" cy="238" r="46" fill="#ffe9ad"/>
    <g opacity=".9">${pickets}</g>
    <rect y="300" width="${W}" height="120" fill="url(#yGrass)"/>
    <!-- tree -->
    <path d="M95 320 q-6-90 8-128 q4-14 12 0 q16 40 6 128 z" fill="#241638"/>
    <ellipse cx="104" cy="168" rx="78" ry="58" fill="#2c1b46"/>
    <ellipse cx="60" cy="200" rx="48" ry="36" fill="#251440"/>
    <ellipse cx="150" cy="205" rx="52" ry="38" fill="#31204e"/>
    <!-- hoop -->
    <rect x="668" y="132" width="10" height="190" rx="4" fill="#2a2140"/>
    <rect x="628" y="118" width="90" height="64" rx="6" fill="#f4ede1" opacity=".92"/>
    <rect x="654" y="138" width="38" height="30" rx="3" fill="none" stroke="#d0654a" stroke-width="4"/>
    <path d="M646 168 h56" stroke="#e8503a" stroke-width="6" stroke-linecap="round"/>
    <path d="M650 170 l6 26 m40-26 l-6 26 m-34-26 l14 26 m26-26 l-14 26 m-19-26 l3 26 m24-26 l-3 26" stroke="#efe7da" stroke-width="2" opacity=".85"/>
    <!-- ball on grass + kid silhouette -->
    <circle cx="600" cy="332" r="14" fill="#e8763c"/>
    <path d="M586 332 h28 M600 318 v28 M590 322 q10 10 20 0 M590 342 q10-10 20 0" stroke="#8a3b1c" stroke-width="1.6" fill="none"/>
    <g fill="#160f28">
      <circle cx="700" cy="272" r="11"/>
      <path d="M700 283 q-4 20 -8 34 l-6 18 h6 l8-22 8 22 h6 l-6-18 q-4-14-8-34 z"/>
      <path d="M692 296 q-12-8-16-18 M708 296 q14-4 20-14" stroke="#160f28" stroke-width="5" stroke-linecap="round" fill="none"/>
    </g>
    ${fireflies}
  `, 'youth');
}

/* Friday night lights: floodlit HS stadium */
function hsScene() {
  const crowd = Array.from({ length: 60 }, (_, i) => {
    const x = 30 + (i * 127) % 740, y = 208 + ((i * 53) % 3) * 13;
    return `<circle cx="${x}" cy="${y}" r="4" fill="${['#5b6b9e', '#46567f', '#6d7cb0'][i % 3]}"/>`;
  }).join('');
  return wrap(`
    <defs>
      <linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#050914"/><stop offset=".7" stop-color="#0c1a33"/><stop offset="1" stop-color="#12325c"/>
      </linearGradient>
      <linearGradient id="hField" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#14532d"/><stop offset="1" stop-color="#052e16"/>
      </linearGradient>
      <radialGradient id="hGlow" cx=".5" cy="0" r="1">
        <stop offset="0" stop-color="#e7f0ff" stop-opacity=".9"/><stop offset=".4" stop-color="#9fc1ff" stop-opacity=".25"/><stop offset="1" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#hSky)"/>
    ${[90, 710].map((x) => `
      <g>
        <rect x="${x - 5}" y="60" width="10" height="200" fill="#0e1526"/>
        <rect x="${x - 42}" y="42" width="84" height="30" rx="6" fill="#101b30"/>
        ${[-28, -8, 12, 28].map((dx) => `<circle cx="${x + dx}" cy="57" r="7" fill="#eef4ff"/>`).join('')}
        <path d="M${x - 40} 72 L${x - 150} 420 L${x + 150} 420 L${x + 40} 72 Z" fill="url(#hGlow)"/>
      </g>`).join('')}
    <rect x="0" y="196" width="${W}" height="58" rx="8" fill="#0d1526"/>
    ${crowd}
    <rect y="254" width="${W}" height="166" fill="url(#hField)"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M${40 + i * 120} 254 L${-40 + i * 140} 420" stroke="#ffffff" stroke-opacity=".22" stroke-width="3"/>`).join('')}
    <path d="M0 300 H800 M0 352 H800" stroke="#ffffff" stroke-opacity=".16" stroke-width="3"/>
    <!-- players -->
    <g fill="#0b1020">
      <circle cx="380" cy="308" r="12"/>
      <path d="M380 320 q-6 26-14 44 h10 l10-30 10 30 h10 q-10-22-14-44 z"/>
      <path d="M368 330 q-14-6-20-16 M392 330 q16-8 18-20" stroke="#0b1020" stroke-width="6" stroke-linecap="round" fill="none"/>
    </g>
    <ellipse cx="452" cy="322" rx="12" ry="8" fill="#7c4a21" transform="rotate(-24 452 322)"/>
    <path d="M446 324 l12-5 M449 318 l6 11" stroke="#f4ede1" stroke-width="1.6"/>
    <circle cx="240" cy="120" r="3" fill="#dbe7ff" opacity=".8"/>
    <circle cx="300" cy="80" r="2" fill="#dbe7ff" opacity=".6"/>
    <circle cx="520" cy="96" r="2.4" fill="#dbe7ff" opacity=".7"/>
  `, 'hs');
}

/* College arena: banners, packed lower bowl, court shine */
function collegeScene() {
  const bowl = Array.from({ length: 90 }, (_, i) => {
    const x = 12 + (i * 61) % 776, y = 120 + ((i * 37) % 5) * 18;
    return `<circle cx="${x}" cy="${y}" r="4.4" fill="${['#7263b8', '#5a4a9e', '#8b7cd0', '#4a3c86'][i % 4]}"/>`;
  }).join('');
  return wrap(`
    <defs>
      <linearGradient id="cTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0a0716"/><stop offset="1" stop-color="#191038"/>
      </linearGradient>
      <linearGradient id="cCourt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c98d4e"/><stop offset="1" stop-color="#8f5c2e"/>
      </linearGradient>
      <radialGradient id="cSpot" cx=".5" cy=".1" r=".9">
        <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-opacity=".08"/><stop offset="1" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#cTop)"/>
    <!-- banners -->
    ${[120, 260, 400, 540, 680].map((x, i) => `
      <g>
        <rect x="${x - 34}" y="26" width="68" height="86" rx="4" fill="${['#a78bfa', '#fb7185', '#ffd166', '#34d399', '#22d3ee'][i]}" opacity=".85"/>
        <rect x="${x - 34}" y="26" width="68" height="20" fill="#0a0716" opacity=".35"/>
        <path d="M${x - 34} 112 l34 14 34-14 z" fill="#0a0716" opacity=".4"/>
      </g>`).join('')}
    <rect x="0" y="118" width="${W}" height="106" fill="#131033"/>
    ${bowl}
    <path d="M0 224 L800 224 L800 420 L0 420 Z" fill="url(#cCourt)"/>
    <ellipse cx="400" cy="320" rx="150" ry="62" fill="none" stroke="#f6ead5" stroke-width="5" opacity=".85"/>
    <path d="M400 258 v124" stroke="#f6ead5" stroke-width="4" opacity=".6"/>
    <path d="M0 250 H800" stroke="#f6ead5" stroke-width="3" opacity=".4"/>
    <rect width="${W}" height="${H}" fill="url(#cSpot)"/>
    <!-- two players -->
    <g fill="#141024">
      <circle cx="330" cy="300" r="12"/>
      <path d="M330 312 q-8 28-16 46 h11 l11-32 10 32 h11 q-10-24-15-46 z"/>
      <path d="M318 320 q-16-10-18-22 M342 318 q18-2 26-14" stroke="#141024" stroke-width="6" stroke-linecap="round" fill="none"/>
      <circle cx="470" cy="286" r="11"/>
      <path d="M470 297 q-5 26-12 42 h10 l8-28 9 28 h10 q-9-22-13-42 z"/>
    </g>
    <circle cx="368" cy="268" r="10" fill="#e8763c"/>
    <path d="M358 268 h20 M368 258 v20" stroke="#8a3b1c" stroke-width="1.4"/>
    <circle cx="112" cy="196" r="2.4" fill="#fff" opacity=".9"><animate attributeName="opacity" values=".2;1;.2" dur="1.4s" repeatCount="indefinite"/></circle>
    <circle cx="690" cy="176" r="2.4" fill="#fff" opacity=".7"><animate attributeName="opacity" values="1;.2;1" dur="1.8s" repeatCount="indefinite"/></circle>
  `, 'college');
}

/* Pro: night skyline, mega-stadium glow, confetti */
function proScene() {
  const buildings = [
    [0, 150, 60], [66, 110, 54], [126, 170, 44], [176, 90, 66], [248, 140, 50],
    [304, 70, 72], [382, 128, 56], [444, 96, 62], [512, 150, 48], [566, 84, 70],
    [642, 130, 52], [700, 100, 64], [770, 160, 40],
  ].map(([x, top, w]) => {
    const windows = Array.from({ length: 8 }, (_, i) =>
      `<rect x="${x + 8 + (i % 3) * (w / 3.4)}" y="${top + 14 + Math.floor(i / 3) * 26}" width="6" height="9" fill="#ffd166" opacity="${0.25 + (i * 37 % 60) / 100}"/>`).join('');
    return `<rect x="${x}" y="${top}" width="${w}" height="${260 - top}" fill="#0d1226"/>${windows}`;
  }).join('');
  const confetti = Array.from({ length: 26 }, (_, i) => {
    const x = 30 + (i * 149) % 740, y = 60 + (i * 83) % 190;
    const c = ['#ffd166', '#22d3ee', '#fb7185', '#34d399', '#a78bfa'][i % 5];
    return `<rect x="${x}" y="${y}" width="6" height="9" rx="1" fill="${c}" opacity=".9" transform="rotate(${(i * 47) % 360} ${x} ${y})">
      <animateTransform attributeName="transform" type="rotate" from="0 ${x} ${y}" to="360 ${x} ${y}" dur="${5 + i % 4}s" repeatCount="indefinite"/>
    </rect>`;
  }).join('');
  return wrap(`
    <defs>
      <linearGradient id="pSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#04060f"/><stop offset="1" stop-color="#101b3d"/>
      </linearGradient>
      <radialGradient id="pDome" cx=".5" cy="1" r="1">
        <stop offset="0" stop-color="#ffd166" stop-opacity=".8"/><stop offset=".5" stop-color="#ff9d5c" stop-opacity=".25"/><stop offset="1" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pPitch" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0f4d3a"/><stop offset="1" stop-color="#062b1f"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#pSky)"/>
    ${buildings}
    <ellipse cx="400" cy="268" rx="330" ry="80" fill="url(#pDome)"/>
    <path d="M70 268 Q400 150 730 268 L730 292 Q400 190 70 292 Z" fill="#141d3d"/>
    ${[150, 260, 370, 480, 590, 650].map((x) => `<circle cx="${x}" cy="${222 - Math.abs(400 - x) * 0.06}" r="4" fill="#e7f0ff"/>`).join('')}
    <rect y="292" width="${W}" height="128" fill="url(#pPitch)"/>
    <ellipse cx="400" cy="352" rx="180" ry="44" fill="none" stroke="#e7f0ff" stroke-opacity=".5" stroke-width="4"/>
    <path d="M400 308 v88" stroke="#e7f0ff" stroke-opacity=".35" stroke-width="3"/>
    <!-- champion lifting trophy -->
    <g fill="#0a0d1c">
      <circle cx="400" cy="322" r="12"/>
      <path d="M400 334 q-7 26-13 44 h10 l9-30 9 30 h10 q-8-24-13-44 z"/>
      <path d="M389 330 q-8-16-6-26 M411 330 q8-16 6-26" stroke="#0a0d1c" stroke-width="6" stroke-linecap="round" fill="none"/>
    </g>
    <g>
      <path d="M388 292 h24 l-4 14 q-3 9-8 9 t-8-9 z" fill="#ffd166"/>
      <path d="M386 294 q-10 2-8 12 q2 8 12 6 M414 294 q10 2 8 12 q-2 8-12 6" stroke="#ffd166" stroke-width="3.4" fill="none"/>
      <rect x="396" y="314" width="8" height="7" fill="#e0a93c"/>
    </g>
    ${confetti}
  `, 'pro');
}

const SCENES = { youth: youthScene, hs: hsScene, college: collegeScene, pro: proScene };
const cache = {};

export function sceneArt(era) {
  if (!cache[era]) cache[era] = SCENES[era] ? SCENES[era]() : SCENES.youth();
  return cache[era];
}

/* Small vignettes used inside story modals */
export function vignette(kind) {
  if (kind === 'draft') {
    return `<svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
      <rect width="800" height="300" fill="#0a0d1e"/>
      <radialGradient id="vd" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#ffd166" stop-opacity=".5"/><stop offset="1" stop-opacity="0"/></radialGradient>
      <rect width="800" height="300" fill="url(#vd)"/>
      <rect x="250" y="90" width="300" height="130" rx="10" fill="#141a36"/>
      <rect x="250" y="90" width="300" height="34" rx="10" fill="#1d2650"/>
      <text x="400" y="114" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="20" fill="#ffd166" letter-spacing="6">DRAFT NIGHT</text>
      <circle cx="400" cy="170" r="26" fill="#0a0d1e" stroke="#ffd166" stroke-width="3"/>
      <path d="M388 170 l8 9 16-18" stroke="#34d399" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${[80, 160, 640, 720].map((x) => `<circle cx="${x}" cy="${150 + (x % 90)}" r="3" fill="#fff" opacity=".6"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" repeatCount="indefinite"/></circle>`).join('')}
    </svg>`;
  }
  if (kind === 'trophy') {
    return `<svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice">
      <rect width="800" height="300" fill="#120b26"/>
      <radialGradient id="vt" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#ffd166" stop-opacity=".65"/><stop offset="1" stop-opacity="0"/></radialGradient>
      <rect width="800" height="300" fill="url(#vt)"/>
      <path d="M360 90 h80 l-10 60 q-8 34-30 34 t-30-34 z" fill="#ffd166"/>
      <path d="M352 98 q-34 6-26 40 q7 28 40 22 M448 98 q34 6 26 40 q-7 28-40 22" stroke="#ffd166" stroke-width="10" fill="none"/>
      <rect x="386" y="184" width="28" height="20" fill="#e0a93c"/>
      <rect x="360" y="204" width="80" height="16" rx="4" fill="#8a6b22"/>
      ${Array.from({ length: 18 }, (_, i) => { const x = 40 + (i * 143) % 720, y = 40 + (i * 97) % 220, c = ['#ffd166', '#22d3ee', '#fb7185', '#34d399'][i % 4]; return `<rect x="${x}" y="${y}" width="7" height="10" fill="${c}" transform="rotate(${i * 40} ${x} ${y})"/>`; }).join('')}
    </svg>`;
  }
  return '';
}
