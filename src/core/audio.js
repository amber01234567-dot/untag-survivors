// 音訊：WebAudio 即時合成的音效（不需要音檔）+ 背景音樂播放（assets/music/）。
// 音效設計：每個聲音由「瞬態敲擊 + 主體 + 尾音」幾層疊成，音高每次略為隨機，
// 最後過一顆壓縮器與短殘響，避免單薄與重複感。要換成取樣音檔時只要改 SFX 這張表。
let ctx = null, master = null, sfxBus = null, musicBus = null, wet = null, vol = 0.5, mvol = 0.35, unlocked = false, voices = 0;
const last = {};
const rnd = (a, b) => a + Math.random() * (b - a);

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.16;
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol * SFX_GAIN; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = mvol * MUSIC_GAIN; musicBus.connect(master);
    // 短殘響：指數衰減的雜訊當脈衝響應
    const len = Math.floor(ctx.sampleRate * 1.1), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    const conv = ctx.createConvolver(); conv.buffer = ir;
    wet = ctx.createGain(); wet.gain.value = 0.5; wet.connect(conv); conv.connect(sfxBus);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function out(node, send) { node.connect(sfxBus); if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(wet); } }
function track(src, t, dur) { voices++; src.onended = () => { voices--; }; src.start(t); src.stop(t + dur + 0.05); }

// 振盪器：f → to 的滑音，a 為起音時間，lp 為低通截止（讓鋸齒 / 方波不刺耳）
function tone(f, dur, o = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + (o.delay || 0), os = c.createOscillator(), g = c.createGain();
  const k = o.fixed ? 1 : rnd(0.94, 1.06);
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(f * k, t);
  if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to * k), t + dur * (o.glide || 1));
  const peak = o.gain || 0.1, a = o.a || 0.003;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  let node = os;
  if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur); os.connect(fl); node = fl; }
  node.connect(g); out(g, o.rev); track(os, t, dur);
}
let nbuf = null;
// 雜訊：type/freq 為濾波器，freqTo 做掃頻（揮砍的「咻」、爆炸的悶響）
function noise(dur, o = {}) {
  const c = ac(); if (!c) return;
  if (!nbuf) { nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = c.currentTime + (o.delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = nbuf; s.playbackRate.value = rnd(0.9, 1.1);
  f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.8; f.frequency.setValueAtTime(o.freq || 1500, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
  const peak = o.gain || 0.15, a = o.a || 0.002;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); out(g, o.rev);
  voices++; s.onended = () => { voices--; }; s.start(t, Math.random() * 1.2, dur + 0.05);
}
// 和弦 / 琶音（提示音用，音高固定）
const chime = (notes, step = 0.08, gain = 0.1, dur = 0.34) => notes.forEach((f, i) => {
  tone(f, dur, { type: 'triangle', gain, delay: i * step, fixed: true, rev: 0.35 });
  tone(f * 2, dur * 0.6, { type: 'sine', gain: gain * 0.35, delay: i * step, fixed: true });
});

const SFX = {
  // ── 攻擊 ──
  shot: () => { noise(0.07, { type: 'highpass', freq: 2600, gain: 0.07 }); tone(520, 0.07, { type: 'square', gain: 0.045, to: 140, lp: 2400 }); tone(150, 0.06, { gain: 0.09, to: 60 }); },
  slash: () => { noise(0.16, { type: 'bandpass', freq: 5200, freqTo: 1100, q: 1.4, gain: 0.13, a: 0.015 }); tone(2100, 0.07, { type: 'triangle', gain: 0.022, to: 3200, delay: 0.03 }); },
  punch: () => { tone(190, 0.11, { gain: 0.26, to: 48 }); noise(0.05, { type: 'bandpass', freq: 1500, q: 0.9, gain: 0.14 }); noise(0.012, { type: 'highpass', freq: 5000, gain: 0.08 }); },
  zap: () => { noise(0.13, { type: 'highpass', freq: 4200, gain: 0.1 }); tone(2400, 0.11, { type: 'sawtooth', gain: 0.045, to: 300, lp: 5200 }); tone(1300, 0.06, { type: 'square', gain: 0.03, to: 2600, delay: 0.02, lp: 4200 }); },
  boom: () => { noise(0.03, { type: 'highpass', freq: 3000, gain: 0.16 }); noise(0.5, { freq: 1400, freqTo: 160, gain: 0.3, rev: 0.5 }); tone(120, 0.42, { gain: 0.32, to: 30 }); },
  // ── 命中 / 擊殺 ──
  hit: () => { tone(240, 0.07, { gain: 0.2, to: 70 }); noise(0.035, { type: 'bandpass', freq: 2200, q: 0.8, gain: 0.16 }); noise(0.01, { type: 'highpass', freq: 6000, gain: 0.1 }); },
  crit: () => { tone(300, 0.12, { gain: 0.3, to: 55 }); noise(0.07, { type: 'bandpass', freq: 3000, freqTo: 900, q: 0.9, gain: 0.22 }); tone(1800, 0.09, { type: 'triangle', gain: 0.07, to: 2600, rev: 0.3 }); },
  kill: () => { tone(380, 0.12, { type: 'triangle', gain: 0.13, to: 80 }); tone(120, 0.1, { gain: 0.16, to: 50 }); noise(0.06, { type: 'bandpass', freq: 2400, q: 1.0, gain: 0.13 }); },
  ehit: () => { tone(180, 0.2, { type: 'sawtooth', gain: 0.17, to: 52, lp: 900, lpTo: 220 }); noise(0.09, { freq: 900, gain: 0.14 }); },
  down: () => { tone(380, 0.7, { type: 'sawtooth', gain: 0.16, to: 55, lp: 1400, lpTo: 200, rev: 0.4 }); tone(95, 0.5, { gain: 0.18, to: 40, delay: 0.1 }); },
  // ── 拾取 ──
  gem: () => { const f = rnd(1150, 1500); tone(f, 0.09, { gain: 0.045, to: f * 1.5, fixed: true }); tone(f * 2, 0.06, { type: 'triangle', gain: 0.018, delay: 0.02, fixed: true }); },
  coin: () => { tone(1320, 0.06, { type: 'triangle', gain: 0.06, fixed: true }); tone(1980, 0.16, { type: 'triangle', gain: 0.06, delay: 0.055, fixed: true, rev: 0.25 }); },
  heal: () => { tone(620, 0.2, { gain: 0.07, to: 930, rev: 0.4 }); tone(930, 0.22, { type: 'triangle', gain: 0.04, to: 1240, delay: 0.07, rev: 0.4 }); },
  // ── 提示 ──
  levelup: () => chime([523, 659, 784, 1047], 0.075, 0.1),
  chest: () => { chime([659, 784, 988, 1319, 1568], 0.065, 0.1); noise(0.5, { type: 'highpass', freq: 6000, gain: 0.03, a: 0.2, delay: 0.2 }); },
  clear: () => chime([523, 784, 1047, 1319], 0.1, 0.12, 0.5),
  revive: () => chime([440, 660, 880], 0.09, 0.1),
  skill: () => { noise(0.2, { type: 'bandpass', freq: 800, freqTo: 4200, q: 1.5, gain: 0.08, a: 0.05 }); tone(420, 0.2, { type: 'sawtooth', gain: 0.06, to: 1250, lp: 2600, rev: 0.3 }); },
  ult: () => { noise(0.7, { type: 'bandpass', freq: 400, freqTo: 6000, q: 1.2, gain: 0.13, a: 0.3, rev: 0.5 }); tone(110, 0.7, { type: 'sawtooth', gain: 0.13, to: 880, lp: 3200, rev: 0.4 }); tone(55, 0.5, { gain: 0.26, to: 34, delay: 0.55 }); noise(0.35, { freq: 1800, freqTo: 200, gain: 0.2, delay: 0.55, rev: 0.6 }); },
  gate: () => { tone(220, 0.5, { gain: 0.13, to: 880, rev: 0.4 }); noise(0.4, { type: 'highpass', freq: 3500, gain: 0.05, a: 0.1 }); tone(1760, 0.3, { type: 'triangle', gain: 0.05, delay: 0.3, fixed: true, rev: 0.5 }); },
  boss: () => { tone(70, 1.3, { type: 'sawtooth', gain: 0.24, to: 42, lp: 600, rev: 0.6 }); tone(104, 1.3, { type: 'sawtooth', gain: 0.14, to: 63, lp: 500 }); noise(1.0, { freq: 500, freqTo: 120, gain: 0.14, rev: 0.6 }); },
  bossdie: () => { noise(1.3, { freq: 2200, freqTo: 120, gain: 0.32, rev: 0.7 }); tone(140, 1.0, { gain: 0.3, to: 28 }); chime([220, 330, 440, 660, 880], 0.12, 0.09, 0.6); },
  click: () => { tone(760, 0.045, { type: 'triangle', gain: 0.05, to: 1100, fixed: true }); noise(0.012, { type: 'highpass', freq: 4000, gain: 0.03 }); },
};
// ───── 取樣音效（assets/sfx/，來源見該資料夾 CREDITS.md）─────
// 名稱 → [變體數, 音量, 殘響量]。同一個聲音有多個變體時隨機挑，並略微變調，避免重複感。
// 取樣還沒載完（或載入失敗）時退回上面的合成音效。
const SAMPLES = {
  hit: [4, 0.5], crit: [3, 0.8, 0.2], punch: [3, 0.75], slash: [3, 0.5], shot: [3, 0.4], zap: [3, 0.45], boom: [4, 0.85, 0.3], kill: [3, 0.55],
  ehit: [2, 0.8], down: [1, 0.9, 0.3], gem: [3, 0.3], coin: [2, 0.4], heal: [2, 0.5], levelup: [1, 0.7, 0.2], chest: [1, 0.8, 0.2], clear: [1, 0.8, 0.3], revive: [1, 0.7, 0.2],
  skill: [1, 0.6], ult: [1, 1.0, 0.4], gate: [1, 0.7, 0.3], boss: [1, 1.0, 0.5], bossdie: [1, 1.0, 0.5], click: [1, 0.5], select: [1, 0.5],
};
const FIXED = { levelup: 1, chest: 1, clear: 1, revive: 1, click: 1, select: 1, gem: 0, coin: 1 };      // 旋律性的聲音不變調
const USE_SAMPLES = false;      // 目前使用合成音效；要改用取樣，把音檔放進 assets/sfx/ 並設為 true
const bufs = {};
let loading = false;
function loadSamples() {
  if (!USE_SAMPLES || loading || !ctx) return; loading = true;
  for (const name in SAMPLES) for (let i = 1; i <= SAMPLES[name][0]; i++) {
    fetch(new URL(`../../assets/sfx/${name}${i}.wav`, import.meta.url)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject())).then((ab) => ctx.decodeAudioData(ab)).then((b) => { (bufs[name] || (bufs[name] = [])).push(b); }).catch(() => {});
  }
}
function sample(name) {
  const list = bufs[name];
  if (!list || !list.length) return false;
  const [, gain, rev] = SAMPLES[name], c = ctx, s = c.createBufferSource(), g = c.createGain();
  s.buffer = list[(Math.random() * list.length) | 0];
  s.playbackRate.value = FIXED[name] ? 1 : rnd(0.92, 1.08);
  g.gain.value = gain * (FIXED[name] ? 1 : rnd(0.85, 1));
  s.connect(g); out(g, rev);
  voices++; s.onended = () => { voices--; }; s.start();
  return true;
}

const GAP = { hit: 0.055, crit: 0.09, kill: 0.06, gem: 0.045, shot: 0.07, slash: 0.08, punch: 0.07, boom: 0.09, zap: 0.09, coin: 0.06, ehit: 0.12, heal: 0.15 };
const LIGHT = { hit: 1, kill: 1, gem: 1, shot: 1, slash: 1, punch: 1, zap: 1, coin: 1 };      // 聲音太多時先捨棄這些

export function sfx(name) {
  if (!unlocked || vol <= 0 || !(SFX[name] || SAMPLES[name])) return;      // 瀏覽器規定：使用者互動後才能出聲
  const t = performance.now() / 1000;
  if (t - (last[name] || 0) < (GAP[name] || 0.03)) return;
  if (voices > (LIGHT[name] ? 22 : 40)) return;
  last[name] = t;
  try { if (!ac()) return; if (!USE_SAMPLES || !sample(name)) SFX[name](); } catch (e) { /* 音訊尚未解鎖時忽略 */ }
}
export function setVolume(v) { vol = v; if (sfxBus) sfxBus.gain.value = v * SFX_GAIN; }

// ───── 背景音樂 ─────
// TRACKS：情境 → assets/music/ 內的檔名。檔案不存在時安靜略過。換歌只要換檔案或改這張表。
export const TRACKS = { menu: 'menu', s1: 'series1', s2: 'series2' };      // 沒有列出的情境（例如 boss）沿用當下正在播的曲子      // 兩個情境指到同一個檔案時不會重播
const MUSIC_GAIN = 0.38, SFX_GAIN = 1.7;      // 音樂壓低、音效拉高，打擊聲才不會被蓋住
const players = {};
let want = null, cur = null;
function player(id) {
  if (players[id]) return players[id];
  const c = ac(); if (!c) return null;
  const el = new Audio(new URL(`../../assets/music/${TRACKS[id]}.mp3`, import.meta.url).href);
  el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
  const g = c.createGain(); g.gain.value = 0;
  try { c.createMediaElementSource(el).connect(g); g.connect(musicBus); } catch (e) { return null; }
  el.addEventListener('error', () => { players[id].bad = true; });
  return (players[id] = { el, g, bad: false });
}
function fade(p, to, sec) { const t = ctx.currentTime; p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(to, t + sec); }
// 切換情境音樂（交叉淡入淡出）。傳 null 停止。尚未解鎖音訊時先記著，解鎖後自動開始。
export function music(id) {
  if (id && !TRACKS[id]) return;
  want = id;
  if (!unlocked || id === cur) return;
  if (id && cur && TRACKS[id] === TRACKS[cur] && players[cur]) { players[id] = players[cur]; cur = id; return; }
  if (cur && players[cur]) { const old = players[cur]; fade(old, 0, 1.2); setTimeout(() => { if (!cur || players[cur] !== old) old.el.pause(); }, 1400); }
  cur = id;
  if (!id || !TRACKS[id]) return;
  const p = player(id);
  if (!p || p.bad) return;
  p.el.play().then(() => fade(p, 1, 1.5)).catch(() => {});
}
export function setMusicVolume(v) { mvol = v; if (musicBus) musicBus.gain.value = v * MUSIC_GAIN; }
export function unlockAudio() { const first = !unlocked; unlocked = true; ac(); loadSamples(); if (first && want) { const w = want; cur = null; music(w); } }
