// 快照：World → 精簡物件 (snapOf) → 二進位 (encode) → 物件 (decode)
// 房主自己也走同一個 snapOf → View 的路徑，所以房主與客戶端的畫面邏輯完全一致。
import { buffBits, bHaste } from '../sim/player.js';

export const PROTO = 4;
const STATES = ['play', 'levelup', 'won', 'lost'];
const PF = ['id', 'x', 'y', 'face', 'aim', 'hp', 'maxHp', 'shield', 'fl', 'rev', 'atkN', 'atkA', 'cdP', 'ult', 'buffs', 'jz', 'ack', 'castN', 'spd'];

export function snapOf(W) {
  const s = {
    t: W.time, st: STATES.indexOf(W.state), lv: W.level, xp: Math.floor(W.xp), xn: W.xpNeed, co: Math.floor(W.coins), ki: W.kills, pt: Math.ceil(W.pickT),
    p: [], en: [], pr: [], z: [], s: [], L: W.ctl.state(), e: W.ev,
  };
  W.ev = [];
  for (const p of W.players) {
    let spd = p.st.speed;
    for (const k in p.buffs) spd *= 1 + (p.buffs[k].speed || 0);
    s.p.push({
      id: p.id, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, face: p.face, aim: Math.round(p.aim * 100) / 100,
      hp: Math.ceil(p.hp), maxHp: p.st.maxHp, shield: Math.ceil(p.shield),
      fl: (p.down ? 1 : 0) | (p.moving ? 2 : 0) | (p.hurt > 0 ? 4 : 0) | (p.jump ? 8 : 0) | (p.dash ? 16 : 0) | (p.gone ? 32 : 0),
      rev: Math.round(p.reviveP * 100), atkN: p.atkN & 1023, atkA: Math.round(p.atkA * 100) / 100,
      cdP: Math.max(0, Math.round(p.skillCd / (p.def.skill.cd * p.st.cd) * 100)), ult: Math.floor(p.ult / p.ultMax * 100),
      buffs: buffBits(p), jz: Math.round(p.jumpZ), ack: p.ack, castN: p.castN & 255, spd: Math.round(spd),
    });
  }
  for (const e of W.enemies) {
    if (e.dead) continue;
    s.en.push({ id: e.id, d: e.def.idx, x: e.x, y: e.y, hp: Math.max(0, Math.min(1, e.hp / e.maxHp)),
      fl: (e.elite ? 1 : 0) | (e.flash > 0 ? 2 : 0) | (e.slowT > 0 ? 4 : 0) | (e.stunT > 0 ? 8 : 0) | (e.dotT > 0 ? 16 : 0) | (e.face < 0 ? 32 : 0) | (e.spawnT > 0 ? 64 : 0) | (e.mark > 0 ? 128 : 0),
      st: e.st });
  }
  for (const p of W.projs) if (!p.dead) s.pr.push({ id: p.id, k: p.k, x: p.x, y: p.y, a: p.a, aux: p.aux | 0, tm: p.team });
  for (const z of W.zones) {
    if (z.dead || z.kind === 'shadow') continue;
    s.z.push({ id: z.id, k: z.k, x: z.x, y: z.y, r: z.r, p: Math.min(1, z.t / z.dur), on: z.t >= z.delay ? 1 : 0, dp: z.delay ? Math.min(1, z.t / z.delay) : 1, a: z.a, len: z.len, w: z.w, aux: z.aux | 0 });
  }
  for (const m of W.summons) if (!m.dead) s.s.push({ id: m.id, k: m.k, x: m.x, y: m.y, face: m.face, st: m.st | 0 });
  return s;
}

class Writer {
  constructor() { this.buf = new ArrayBuffer(1 << 15); this.dv = new DataView(this.buf); this.o = 0; }
  need(n) { if (this.o + n <= this.buf.byteLength) return; const nb = new ArrayBuffer(Math.max(this.buf.byteLength * 2, this.o + n)); new Uint8Array(nb).set(new Uint8Array(this.buf)); this.buf = nb; this.dv = new DataView(nb); }
  u8(v) { this.need(1); this.dv.setUint8(this.o++, v); }
  u16(v) { this.need(2); this.dv.setUint16(this.o, v, true); this.o += 2; }
  u32(v) { this.need(4); this.dv.setUint32(this.o, v, true); this.o += 4; }
  bytes(b) { this.need(b.length); new Uint8Array(this.buf, this.o, b.length).set(b); this.o += b.length; }
}
const te = new TextEncoder(), td = new TextDecoder();
const q8 = (v) => Math.max(0, Math.min(65535, Math.round(v * 8)));

export function encode(s, events) {
  const w = new Writer();
  const head = { t: Math.round(s.t * 1000) / 1000, st: s.st, lv: s.lv, xp: s.xp, xn: s.xn, co: s.co, ki: s.ki, pt: s.pt, L: s.L, e: events,
    p: s.p.map((p) => PF.map((k) => p[k])),
    z: s.z.map((z) => [z.id, z.k, Math.round(z.x), Math.round(z.y), Math.round(z.r), Math.round(z.p * 100), z.on, Math.round(z.dp * 100), Math.round(z.a * 100), Math.round(z.len), Math.round(z.w), z.aux]),
    s: s.s.map((m) => [m.id, m.k, Math.round(m.x), Math.round(m.y), m.face, m.st]) };
  const hb = te.encode(JSON.stringify(head));
  w.u8(1); w.u32(hb.length); w.bytes(hb);
  w.u16(s.en.length);
  for (const e of s.en) { w.u16(e.id); w.u8(e.d); w.u16(q8(e.x)); w.u16(q8(e.y)); w.u8(Math.round(e.hp * 255)); w.u8(e.fl); w.u8(e.st); }
  w.u16(s.pr.length);
  for (const p of s.pr) { w.u16(p.id); w.u8(p.k | (p.tm ? 128 : 0)); w.u16(q8(p.x)); w.u16(q8(p.y)); w.u8(Math.round((((p.a % 6.2832) + 6.2832) % 6.2832) / 6.2832 * 255)); w.u8(p.aux); }
  return w.buf.slice(0, w.o);
}

export function decode(buf) {
  const dv = new DataView(buf);
  let o = 1;
  const hl = dv.getUint32(o, true); o += 4;
  const h = JSON.parse(td.decode(new Uint8Array(buf, o, hl))); o += hl;
  const s = { t: h.t, st: h.st, lv: h.lv, xp: h.xp, xn: h.xn, co: h.co, ki: h.ki, pt: h.pt, L: h.L, e: h.e, en: [], pr: [] };
  s.p = h.p.map((a) => { const p = {}; PF.forEach((k, i) => { p[k] = a[i]; }); return p; });
  s.z = h.z.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], r: a[4], p: a[5] / 100, on: a[6], dp: a[7] / 100, a: a[8] / 100, len: a[9], w: a[10], aux: a[11] }));
  s.s = h.s.map((a) => ({ id: a[0], k: a[1], x: a[2], y: a[3], face: a[4], st: a[5] }));
  let n = dv.getUint16(o, true); o += 2;
  for (let i = 0; i < n; i++, o += 10) s.en.push({ id: dv.getUint16(o, true), d: dv.getUint8(o + 2), x: dv.getUint16(o + 3, true) / 8, y: dv.getUint16(o + 5, true) / 8, hp: dv.getUint8(o + 7) / 255, fl: dv.getUint8(o + 8), st: dv.getUint8(o + 9) });
  n = dv.getUint16(o, true); o += 2;
  for (let i = 0; i < n; i++, o += 9) { const k = dv.getUint8(o + 2); s.pr.push({ id: dv.getUint16(o, true), k: k & 127, tm: k >> 7, x: dv.getUint16(o + 3, true) / 8, y: dv.getUint16(o + 5, true) / 8, a: dv.getUint8(o + 7) / 255 * 6.2832, aux: dv.getUint8(o + 8) }); }
  return s;
}
export { STATES, bHaste };
