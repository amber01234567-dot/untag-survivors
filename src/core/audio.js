// 以 WebAudio 即時合成的簡易音效（不需要任何音檔）。之後要換成正式音效，只要改 SFX 這張表。
let ctx = null, master = null, vol = 0.5, unlocked = false;
const last = {};

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f, dur, type = 'square', gain = 0.1, to = null, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
let nbuf = null;
function noise(dur, gain = 0.15, freq = 1500, delay = 0, type = 'lowpass') {
  const c = ac(); if (!c) return;
  if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = nbuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5, dur + 0.05);
}
const arp = (notes, step = 0.08, type = 'triangle', gain = 0.12) => notes.forEach((f, i) => tone(f, 0.16, type, gain, null, i * step));

const SFX = {
  shot: () => tone(900, 0.05, 'square', 0.035, 320),
  slash: () => noise(0.09, 0.09, 3200, 0, 'highpass'),
  punch: () => { tone(170, 0.07, 'sine', 0.2, 60); noise(0.04, 0.07, 1400); },
  boom: () => { noise(0.36, 0.26, 700); tone(95, 0.32, 'sine', 0.26, 32); },
  ehit: () => tone(150, 0.14, 'sawtooth', 0.16, 55),
  kill: () => tone(320, 0.06, 'triangle', 0.06, 130),
  gem: () => tone(1250, 0.05, 'sine', 0.05, 1900),
  coin: () => { tone(1500, 0.05, 'square', 0.04); tone(2000, 0.08, 'square', 0.04, null, 0.05); },
  levelup: () => arp([523, 659, 784, 1047]),
  chest: () => arp([659, 784, 988, 1319, 1568], 0.07),
  skill: () => tone(480, 0.16, 'sawtooth', 0.08, 1300),
  ult: () => { tone(180, 0.55, 'sawtooth', 0.14, 1700); noise(0.5, 0.12, 2400, 0, 'highpass'); },
  gate: () => { tone(280, 0.45, 'sine', 0.14, 980); noise(0.3, 0.06, 4000, 0, 'highpass'); },
  clear: () => arp([659, 784, 988, 1319], 0.1, 'triangle', 0.14),
  down: () => tone(420, 0.55, 'sawtooth', 0.18, 70),
  revive: () => arp([440, 660, 880], 0.09),
  zap: () => { noise(0.1, 0.12, 5200, 0, 'highpass'); tone(1700, 0.08, 'square', 0.05, 380); },
  heal: () => tone(720, 0.13, 'sine', 0.08, 1080),
  boss: () => { tone(82, 1.0, 'sawtooth', 0.22, 48); noise(0.8, 0.1, 500); },
  bossdie: () => { noise(1.1, 0.3, 480); arp([220, 330, 440, 660, 880], 0.12, 'sawtooth', 0.1); },
  click: () => tone(920, 0.03, 'square', 0.04),
};
const GAP = { kill: 0.05, gem: 0.04, shot: 0.06, slash: 0.07, punch: 0.06, boom: 0.07, zap: 0.08, coin: 0.06, ehit: 0.1 };

export function sfx(name) {
  if (!unlocked || vol <= 0 || !SFX[name]) return;      // 瀏覽器規定：使用者互動後才能出聲
  const t = performance.now() / 1000;
  if (t - (last[name] || 0) < (GAP[name] || 0.03)) return;
  last[name] = t;
  try { SFX[name](); } catch (e) { /* 音訊尚未解鎖時忽略 */ }
}
export function setVolume(v) { vol = v; if (master) master.gain.value = v; }
export function unlockAudio() { unlocked = true; ac(); }
