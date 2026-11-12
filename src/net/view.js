// 插值視圖：吃快照、吐出「現在這一幀該畫什麼」。房主 (延遲 ~1 tick) 與客戶端 (延遲 ~120ms) 共用。
import { lerp, lerpAngle } from '../core/util.js';
import { openLink } from '../sim/levelgen.js';

export class View {
  constructor(L, myId, delay) {
    this.L = L; this.myId = myId; this.delay = delay;
    this.buf = []; this.offset = null; this.rt = 0;
    this.pickups = new Map();
    this.onEvent = null;
    this.hud = null; this.last = null;
    this.frameOut = { players: [], enemies: [], projs: [], zones: [], summons: [], pickups: this.pickups, time: 0, hud: null, L };
    this.pred = null;                 // 客戶端自己角色的預測位置 {x,y}
  }
  push(s, now) {
    const sample = s.t - now;
    if (this.last && this.last.st !== s.st) this.offset = null;      // 暫停 / 恢復時重新對時
    if (this.offset === null || Math.abs(sample - this.offset) > 0.25 || sample > this.offset) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.02;
    s.em = null; s.done = false;
    this.buf.push(s);
    this.last = s;
    while (this.buf.length > 14) this.fire(this.buf.shift());
  }
  fire(s) {
    if (s.done) return;
    s.done = true;
    // 閘門狀態（影響碰撞與畫面）
    const L = this.L;
    s.L.g.forEach((g, i) => { if (g && !L.links[i].open) openLink(L, L.links[i]); });
    s.L.z.forEach((c, i) => { L.zones[i].state = ['locked', 'open', 'active', 'cleared'][c]; });
    for (const ev of s.e) {
      const k = ev[0];
      if (k === 'g+') this.pickups.set(ev[1], { id: ev[1], type: ev[2], x: ev[3], y: ev[4], v: ev[5], to: -1, sp: 0, born: this.rt });
      else if (k === 'g>') { const g = this.pickups.get(ev[1]); if (g) { g.to = ev[2]; g.sp = 120; } }
      else if (this.onEvent) this.onEvent(ev);
    }
  }
  index(s) { if (!s.em) { s.em = new Map(); for (const e of s.en) s.em.set(e.id, e); s.pm = new Map(); for (const p of s.pr) s.pm.set(p.id, p); s.sm = new Map(); for (const m of s.s) s.sm.set(m.id, m); } }

  frame(now, dt) {
    const buf = this.buf, out = this.frameOut;
    if (!buf.length) return out;
    let rt = now + this.offset - this.delay;
    const last = buf[buf.length - 1];
    if (rt > last.t) rt = last.t;
    if (rt < buf[0].t) rt = buf[0].t;
    if (rt < this.rt) rt = this.rt;            // 畫面時間只進不退（對時修正時避免倒帶）
    this.rt = rt;
    let i = 0;
    while (i < buf.length - 2 && buf[i + 1].t <= rt) i++;
    const a = buf[i], b = buf[Math.min(i + 1, buf.length - 1)];
    for (let k = 0; k <= i; k++) this.fire(buf[k]);
    if (b.t <= rt) this.fire(b);
    const al = b.t > a.t ? Math.max(0, Math.min(1, (rt - a.t) / (b.t - a.t))) : 1;
    this.index(a);

    out.time = rt; out.hud = b;
    out.players.length = 0;
    for (const p of b.p) {
      const q = a.p.find((x) => x.id === p.id);
      const o = Object.assign({}, p);
      if (q) { o.x = lerp(q.x, p.x, al); o.y = lerp(q.y, p.y, al); o.jz = lerp(q.jz, p.jz, al); o.aim = lerpAngle(q.aim, p.aim, al); }
      if (p.id === this.myId) { out.me = o; if (this.pred && !(p.fl & (1 | 8 | 16))) { o.x = this.pred.x + this.pred.ex; o.y = this.pred.y + this.pred.ey; } }
      out.players.push(o);
    }
    out.enemies.length = 0;
    for (const e of b.en) {
      const q = a.em.get(e.id);
      if (q && Math.abs(q.x - e.x) + Math.abs(q.y - e.y) < 90) out.enemies.push({ id: e.id, d: e.d, x: lerp(q.x, e.x, al), y: lerp(q.y, e.y, al), hp: e.hp, fl: e.fl, st: e.st });
      else out.enemies.push(e);
    }
    out.projs.length = 0;
    for (const p of b.pr) {
      const q = a.pm.get(p.id);
      if (q) out.projs.push({ id: p.id, k: p.k, tm: p.tm, x: lerp(q.x, p.x, al), y: lerp(q.y, p.y, al), a: p.a, aux: p.aux });
      else out.projs.push(p);
    }
    out.summons.length = 0;
    for (const m of b.s) {
      const q = a.sm.get(m.id);
      if (q) out.summons.push({ id: m.id, k: m.k, x: lerp(q.x, m.x, al), y: lerp(q.y, m.y, al), face: m.face, st: m.st });
      else out.summons.push(m);
    }
    out.zones = b.z; out.devs = b.dv || null;
    // 被吸走的掉落物：在本地飛向該玩家
    for (const g of this.pickups.values()) {
      if (g.to < 0) continue;
      const p = out.players.find((x) => x.id === g.to);
      if (!p) { this.pickups.delete(g.id); continue; }
      g.sp = Math.min(900, g.sp + 1600 * dt);
      const dx = p.x - g.x, dy = p.y - 14 - g.y, d = Math.hypot(dx, dy) || 1;
      if (d < 22 || d < g.sp * dt) { this.pickups.delete(g.id); if (this.onEvent) this.onEvent(['got', g.type, p.x, p.y, g.to]); continue; }
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
    }
    return out;
  }
}
