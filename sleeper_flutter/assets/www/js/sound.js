/* ============================================================
   SLEEPER — sound & haptics
   All effects are synthesized with WebAudio (no asset files).
   The context starts lazily on the first user gesture; a global
   toggle lives in settings. Haptics use navigator.vibrate where
   the platform supports it (Android Chrome; iOS ignores it).
   ============================================================ */

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) { enabled = on; }
export function soundEnabled() { return enabled; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/* One enveloped oscillator note */
function note({ freq = 440, type = 'sine', dur = 0.15, vol = 0.2, delay = 0, slide = 0 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/* Short filtered-noise burst (bounces, swishes) */
function noiseBurst({ dur = 0.08, vol = 0.15, freq = 800, delay = 0 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

const FX = {
  click:   () => note({ freq: 520, type: 'triangle', dur: 0.05, vol: 0.08 }),
  bounce:  () => { noiseBurst({ freq: 240, dur: 0.06, vol: 0.2 }); note({ freq: 90, type: 'sine', dur: 0.08, vol: 0.18 }); },
  gain:    () => { note({ freq: 660, dur: 0.09, vol: 0.1 }); note({ freq: 880, dur: 0.12, vol: 0.1, delay: 0.07 }); },
  win:     () => { [523, 659, 784, 1047].forEach((f, i) => note({ freq: f, dur: 0.16, vol: 0.13, delay: i * 0.09 })); },
  loss:    () => { note({ freq: 220, type: 'sawtooth', dur: 0.3, vol: 0.08, slide: -80 }); },
  buy:     () => { note({ freq: 780, type: 'triangle', dur: 0.06, vol: 0.12 }); note({ freq: 1170, type: 'triangle', dur: 0.1, vol: 0.12, delay: 0.06 }); },
  sleep:   () => { [392, 330, 262].forEach((f, i) => note({ freq: f, dur: 0.5, vol: 0.06, delay: i * 0.22 })); },
  whistle: () => note({ freq: 2100, type: 'square', dur: 0.22, vol: 0.05 }),
  injury:  () => { note({ freq: 160, type: 'sawtooth', dur: 0.25, vol: 0.1, slide: -60 }); },
  meterTick: () => note({ freq: 1200, type: 'triangle', dur: 0.03, vol: 0.06 }),
  swish:   () => noiseBurst({ freq: 1600, dur: 0.18, vol: 0.16 }),
};

export function sfx(name) {
  if (!enabled || !FX[name]) return;
  try { FX[name](); } catch (e) { /* audio blocked — stay silent */ }
}

export function buzz(pattern) {
  if (!enabled) return;
  try { navigator.vibrate?.(pattern); } catch (e) { /* unsupported */ }
}
