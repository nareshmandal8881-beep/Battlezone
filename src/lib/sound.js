// Tiny synthesized sound effects (Web Audio) — no audio files needed.
let ctx = null;
const KEY = 'bz-sound';

export const isMuted = () => {
  try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; }
};
export const setMuted = (m) => {
  try { localStorage.setItem(KEY, m ? 'off' : 'on'); } catch (e) { /* ignore */ }
};

const ac = () => {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const tone = (freq, start, dur, { type = 'square', vol = 0.12, slide = 0 } = {}) => {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
};

const noise = (start, dur, vol = 0.18) => {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  f.type = 'bandpass'; f.frequency.value = 1800;
  g.gain.value = vol;
  s.buffer = buf;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + start);
};

const SFX = {
  roll: () => { for (let k = 0; k < 6; k += 1) noise(k * 0.06, 0.05, 0.22); },
  dice: () => tone(520, 0, 0.09, { type: 'triangle', vol: 0.18 }),
  step: (n = 0) => tone(380 + n * 40, 0, 0.06, { type: 'triangle', vol: 0.12 }),
  out: () => { tone(330, 0, 0.1, { type: 'triangle' }); tone(660, 0.08, 0.14, { type: 'triangle' }); },
  capture: () => { tone(700, 0, 0.35, { type: 'sawtooth', vol: 0.12, slide: -560 }); noise(0, 0.12, 0.15); },
  home: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, { type: 'triangle', vol: 0.14 })),
  turn: () => tone(880, 0, 0.12, { type: 'sine', vol: 0.1 }),
  win: () => [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.22, { type: 'square', vol: 0.1 })),
  nomove: () => tone(220, 0, 0.18, { type: 'sine', vol: 0.12, slide: -60 }),
};

export const play = (name, arg) => {
  if (isMuted()) return;
  try { SFX[name]?.(arg); } catch (e) { /* audio unavailable */ }
};
