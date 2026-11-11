// 武器行為。每個行為是 (W, p, w, dt) => void；w.s 是當前等級的數值，w.t 是冷卻計時。
// 新武器若能用既有行為 + 不同數值組合出來，就只需要改 data/weapons.js。
import { TAU, angDiff, dist2 } from '../core/util.js';
import { bHaste, addBuff } from './player.js';
import { solidAt } from './levelgen.js';

const FX = { steel: 0, heavy: 1, toxic: 2, punch: 3, wood: 4, teal: 5 };

// 扇形揮砍
export function swing(W, p, a, range, arc, dmg, o) {
  const half = arc / 2;
  W.hash.query(p.x, p.y, range, (e) => {
    const d2 = dist2(p.x, p.y, e.x, e.y);
    if (d2 > 30 * 30 && Math.abs(angDiff(a, Math.atan2(e.y - p.y, e.x - p.x))) > half) return;
    W.strike(p, e, dmg, o);
  });
  W.emit('s', p.x | 0, (p.y - 14) | 0, Math.round(a * 100), range | 0, Math.round(arc * 100), o.fx || 0);
}

function volley(W, p, w, a, s, extra) {
  const n = s.count || 1, spread = n > 1 ? (s.spread || 0.3) : 0;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i / (n - 1) - 0.5) * spread : 0;
    const jit = s.jitter ? W.rng.range(-s.jitter, s.jitter) / 2 : 0;
    W.shoot(p, Object.assign({
      kind: w.def.proj, a: a + off + jit, speed: s.speed, dmg: s.dmg, pierce: s.pierce || 0, life: s.life * (p.st.area * 0.5 + 0.5),
      bounce: s.bounce || 0, homing: s.homing || 0, dot: s.dot, dotDur: s.dotDur, slow: s.slow, slowDur: s.slowDur, kb: s.kb || 0,
      critAdd: s.critAdd || 0, ret: s.ret, x: p.x + Math.cos(a) * 16, y: p.y - 14 + Math.sin(a) * 16,
      aoe: s.aoe ? s.aoe * p.st.area : 0, fx: s.aoe ? 1 : 0,
    }, extra));
  }
}

const EXTRA = {
  // 深深：每 N 次施法在敵群腳下展開魔法陣
  circle(W, p, w, s) {
    if (w.n % s.circleEvery !== 0) return;
    for (let i = 0; i < (s.circleCount || 1); i++) {
      const c = W.cluster(p.x, p.y, 480);
      if (!c) return;
      const r = s.circleR * p.st.area;
      W.addZone({ kind: 'rune', owner: p, x: c.x, y: c.y, r, delay: 0.65, dur: 2.9, tick: 0.45, dmg: s.circleDmg * 0.3, hitOpt: { slow: s.circleSlow, slowDur: 0.8, quiet: true },
        onStart: (W2, z) => W2.aoe(z.x, z.y, z.r, s.circleDmg, p, { fx: 4 }) });
    }
  },
};
const TICK = {
  // 賴姐姐：定期向血量最低的隊友射治療針
  heal(W, p, w, dt, s) {
    w.ht = (w.ht === undefined ? 1.5 : w.ht) - dt * bHaste(p);
    if (w.ht > 0) return;
    const cands = W.players.filter((q) => !q.down && !q.gone && q.hp < q.st.maxHp - 1 && dist2(p.x, p.y, q.x, q.y) < s.healRange * s.healRange)
      .sort((a, b) => a.hp / a.st.maxHp - b.hp / b.st.maxHp).slice(0, s.healCount);
    if (!cands.length) { w.ht = 0.3; return; }
    w.ht = s.healCd * p.st.cd;
    for (const q of cands) { W.heal(q, s.healAmt, p, s.overheal); if (q !== p) W.emit('l', p.x | 0, (p.y - 16) | 0, q.x | 0, (q.y - 16) | 0, 2); W.emit('r', q.x | 0, q.y | 0, 36, 2); }
  },
  // 羊弟弟：定期烤出烤肉串掉在地上，誰撿誰補
  food(W, p, w, dt, s) {
    w.ft = (w.ft === undefined ? 3 : w.ft) - dt;
    if (w.ft > 0) return;
    w.ft = s.foodCd * p.st.cd;
    let n = 0; for (const g of W.pickups.values()) if (g.type === 'k') n++;
    if (n >= 6) return;
    const a = W.rng.range(0, TAU);
    const g = W.drop('k', p.x + Math.cos(a) * 46, p.y + Math.sin(a) * 46, s.foodHeal * p.st.heal);
    if (g) { g.src = p; g.buff = s.foodBuff; g.bdmg = s.foodDmg || 0; }
  },
};

export const BEH = {
  melee(W, p, w, dt) {
    const s = w.s;
    if (w.pend) { w.pend.t -= dt; if (w.pend.t <= 0) { const q = w.pend; w.pend = null; swing(W, p, q.a, q.range, s.arc, s.dmg, q.o); p.atkN++; p.atkA = q.a; } }
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const range = s.range * p.st.area;
    const tgt = W.nearestEnemy(p.x, p.y, range * 1.25);
    if (!tgt) return;
    w.t = s.cd * p.st.cd; w.n++;
    const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), fx = FX[w.def.fx] || 0;
    const o = { kb: s.kb, dot: s.dot, dotDur: s.dotDur, fx, critAdd: p.buffs.stealth ? 1 : 0 };
    p.atkN++; p.atkA = a;
    swing(W, p, a, range, s.arc, s.dmg, o);
    if (s.double) w.pend = { t: 0.16, a: a + Math.PI, range, o };
    const forceCombo = p.buffs.limit;
    if (s.combo && (w.n % s.combo === 0 || forceCombo)) {
      const r = s.comboR * p.st.area;
      if (s.comboSpin) { swing(W, p, a, r, TAU, s.dmg * s.comboMul, Object.assign({}, o, { kb: s.kb * 1.2, stun: s.comboStun })); }
      else { const cx = p.x + Math.cos(a) * 40, cy = p.y + Math.sin(a) * 40; W.aoe(cx, cy, r, s.dmg * s.comboMul * (forceCombo && w.n % s.combo ? 0.6 : 1), p, { kb: s.kb * 3, stun: s.comboStun, fx: 5 }); }
    }
    if (s.waveEvery && w.n % s.waveEvery === 0) W.shoot(p, { kind: 'wave', a, speed: 540, dmg: s.dmg * s.waveDmg, pierce: 99, life: 0.75, r: 30, kb: 60 });
    if (s.throwEvery && w.n % s.throwEvery === 0) { const c = 1 + (s.throwCount || 0); for (let i = 0; i < c; i++) W.shoot(p, { kind: 'cleaver', a: a + (c > 1 ? (i / (c - 1) - 0.5) * 0.6 : 0), speed: 480, dmg: s.dmg * s.throwDmg, pierce: 4, life: 0.8, r: 14, dot: s.dot, dotDur: s.dotDur }); }
    if (s.ballEvery && w.n % s.ballEvery === 0) W.shoot(p, { kind: 'baseball', a, speed: 760, dmg: s.dmg * s.ballDmg, bounce: 2 + (s.ballBounce || 0), life: 1.2, r: 9, kb: 160 });
  },

  gun(W, p, w, dt) {
    const s = w.s, ex = w.def.extra;
    if (ex && TICK[ex]) TICK[ex](W, p, w, dt, s);
    if (w.reload > 0) { w.reload -= dt * bHaste(p); if (w.reload <= 0) w.ammo = s.mag; return; }
    if (s.mag && w.ammo === undefined) w.ammo = s.mag;
    if (w.burst > 0) { w.bt -= dt; if (w.bt <= 0) { w.burst--; w.bt = 0.07; volley(W, p, w, w.ba, s, w.bx); } }
    w.t -= dt * bHaste(p);
    const tgt = W.nearestEnemy(p.x, p.y, s.range * (p.st.area * 0.5 + 0.5));
    if (!tgt) { if (s.spin) w.heat = Math.max(0, (w.heat || 0) - dt * 0.7); return; }
    if (s.spin) w.heat = Math.min(1, (w.heat || 0) + dt / Math.max(0.3, s.spin));
    if (w.t > 0) return;
    const sup = p.buffs.suppress, hip = p.buffs.storm;
    w.t = s.cd * p.st.cd * (s.spin ? 3 - 2 * w.heat : 1) * (sup ? 0.5 : 1);
    w.n++; p.atkN++;
    const a = Math.atan2(tgt.y - 6 - p.y + 14, tgt.x - p.x);
    p.atkA = a;
    let extra = sup ? { pierce: (s.pierce || 0) + 2, slow: 0.4, slowDur: 1 } : null;
    if (s.lastAoe && w.ammo === 1) extra = { aoe: s.lastAoe, pierce: 0 };
    volley(W, p, w, a, s, extra);
    if (s.dual) { const t2 = W.nearestEnemy(p.x, p.y, s.range, tgt); if (t2) volley(W, p, w, Math.atan2(t2.y - p.y, t2.x - p.x), s, extra); }
    if (s.burst > 1) { w.burst = s.burst - 1; w.bt = 0.07; w.ba = a; w.bx = extra; }
    if (s.mag) { w.ammo--; if (w.ammo <= 0) w.reload = s.reload; }
    if (ex && EXTRA[ex]) EXTRA[ex](W, p, w, s);
    if (hip) { hip.n = (hip.n || 0) + 1; }
  },

  beam(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const len = s.len * (p.st.area * 0.5 + 0.5);
    if (!W.nearestEnemy(p.x, p.y, len * 0.9)) return;
    w.t = s.cd * p.st.cd + s.dur; p.atkN++; p.atkA = p.aim;
    for (let i = 0; i < s.count; i++) {
      const off = s.count > 1 ? (i - (s.count - 1) / 2) * 0.5 : 0;
      W.addZone({ kind: 'beam', owner: p, follow: p, oy: -16, a: p.aim + off, off, len, w: s.width * p.st.area, dur: s.dur, tick: 0.1, dmg: s.dmg, burst: s.burst, hitOpt: { quiet: false },
        upd: beamUpd });
    }
  },

  wisp(W, p, w, dt) {
    const s = w.s;
    if (!w.ws) w.ws = [];
    while (w.ws.length < s.count) w.ws.push({ r: 0.2 + w.ws.length * 0.2, digit: 0, ent: W.addSummon({ kind: 'wisp', owner: p, x: p.x, y: p.y }) });
    w.rot = (w.rot || 0) + dt * 2.2;
    const n = w.ws.length;
    w.ws.forEach((ws, i) => {
      if (!ws.digit) { ws.r -= dt * bHaste(p); if (ws.r <= 0) ws.digit = W.rng.int(s.minDigit, 9); }
      const a = w.rot + i * TAU / n;
      ws.ent.x = p.x + Math.cos(a) * 34; ws.ent.y = p.y - 22 + Math.sin(a) * 18; ws.ent.st = ws.digit;
    });
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const tgt = W.nearestEnemy(p.x, p.y, s.range);
    const ws = tgt && w.ws.find((x) => x.digit);
    if (!ws) return;
    w.t = s.cd * p.st.cd; p.atkN++;
    const d = ws.digit, a = Math.atan2(tgt.y - ws.ent.y, tgt.x - ws.ent.x);
    p.atkA = a;
    W.shoot(p, { kind: 'wisp', x: ws.ent.x, y: ws.ent.y, a, speed: s.speed, homing: s.homing, dmg: s.dmg * d / 5 * (d === 9 && s.nine ? 3 : 1), aoe: s.aoe ? s.aoe * p.st.area : 0, life: 1.6, aux: d, r: 9, fx: 6 });
    ws.digit = 0; ws.r = s.regen * p.st.cd;
  },

  orbit(W, p, w, dt) {
    const s = w.s;
    if (!w.orbs) w.orbs = [];
    while (w.orbs.length < s.count) w.orbs.push(W.shoot(p, { kind: w.def.proj, orbit: true, life: 1e9, speed: 0, dmg: 0 }));
    w.rot = (w.rot || 0) + dt * s.rot;
    const n = w.orbs.length, R = s.radius * p.st.area;
    for (let i = 0; i < n; i++) {
      const o = w.orbs[i], a = w.rot + i * TAU / n;
      o.x = p.x + Math.cos(a) * R; o.y = p.y - 12 + Math.sin(a) * R * 0.86; o.a = a + 1.57;
      if (p.down) continue;
      W.hash.query(o.x, o.y, 12, (e) => {
        const ot = e.ot || (e.ot = {});
        if ((ot[w.uid] || 0) > W.time) return;
        ot[w.uid] = W.time + s.hitCd;
        W.strike(p, e, s.dmg, { slow: s.slow, slowDur: s.slowDur, kb: 30, sx: p.x, sy: p.y });
      });
    }
    if (!s.pulseCd) return;
    w.pt = (w.pt === undefined ? 3 : w.pt) - dt * bHaste(p);
    if (w.pt > 0) return;
    const r = s.pulseR * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, r)) return;
    w.pt = s.pulseCd * p.st.cd; p.atkN++;
    W.hash.query(p.x, p.y, r, (e) => W.strike(p, e, s.dmg, { stun: s.pulseStun, mark: s.pulseMark ? s.pulseStun + 1 : 0 }));
    W.emit('r', p.x | 0, p.y | 0, r | 0, 3);
  },

  mine(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const tgt = W.nearestEnemy(p.x, p.y, 520);
    if (!tgt) return;
    w.t = s.cd * p.st.cd; p.atkN++;
    if (!w.mines) w.mines = [];
    w.mines = w.mines.filter((m) => !m.dead);
    const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    p.atkA = base;
    for (let i = 0; i < s.count; i++) {
      if (w.mines.length >= s.max) { const old = w.mines.shift(); old.t = old.dur; }
      const a = base + W.rng.range(-0.7, 0.7), d = Math.min(W.rng.range(50, 140), Math.hypot(tgt.x - p.x, tgt.y - p.y));
      let x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (solidAt(W.L, x, y)) { x = p.x; y = p.y; }
      w.mines.push(plantMine(W, p, x, y, s));
    }
  },

  pulse(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const r = s.r * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, r * 2.4)) return;
    w.t = s.cd * p.st.cd; p.atkN++;
    W.hash.query(p.x, p.y, r, (e) => W.strike(p, e, s.dmg, { kb: s.kb }));
    W.playersIn(p.x, p.y, r * 1.4, (q) => addBuff(q, 'cheer', { t: s.buffDur, dmg: s.buffDmg, haste: s.buffHaste, speed: s.buffSpeed || 0 }));
    W.emit('r', p.x | 0, p.y | 0, r | 0, 4);
  },

  drone(W, p, w, dt) {
    const s = w.s;
    if (!w.ds) w.ds = [];
    const boost = p.buffs.swarm;
    const want = s.count + (boost ? 10 : 0);
    while (w.ds.length < want) w.ds.push({ t: W.rng.range(0, 0.4), n: 0, ent: W.addSummon({ kind: 'drone', owner: p, x: p.x, y: p.y - 40 }) });
    while (w.ds.length > want) w.ds.pop().ent.dead = true;
    w.rot = (w.rot || 0) + dt * 0.9;
    const n = w.ds.length;
    w.ds.forEach((d, i) => {
      const a = w.rot + i * TAU / n, R = 44 + (i % 3) * 16;
      const tx = p.x + Math.cos(a) * R, ty = p.y - 46 + Math.sin(a) * R * 0.5;
      d.ent.x += (tx - d.ent.x) * Math.min(1, dt * 7); d.ent.y += (ty - d.ent.y) * Math.min(1, dt * 7);
      if (p.down) return;
      d.t -= dt * bHaste(p) * (boost ? 1.8 : 1);
      if (d.t > 0) return;
      const tgt = W.nearestEnemy(d.ent.x, d.ent.y + 30, s.range);
      if (!tgt) return;
      d.t = s.cd * p.st.cd; d.n++;
      const ang = Math.atan2(tgt.y - d.ent.y, tgt.x - d.ent.x);
      d.ent.face = Math.cos(ang) >= 0 ? 1 : -1; d.ent.st = (d.ent.st + 1) % 250;
      if (s.missileEvery && d.n % s.missileEvery === 0) W.shoot(p, { kind: 'missile', x: d.ent.x, y: d.ent.y, a: ang, speed: 430, homing: 5, dmg: s.dmg * s.missileDmg, aoe: s.missileR * p.st.area, life: 1.6, r: 9, fx: 1 });
      else W.shoot(p, { kind: 'dronebolt', x: d.ent.x, y: d.ent.y, a: ang, speed: s.speed, dmg: s.dmg, life: 0.6, r: 6 });
    });
  },

  cats(W, p, w, dt) {
    const s = w.s;
    if (!w.cs) w.cs = [];
    while (w.cs.length < s.count) { const c = W.addSummon({ kind: 'cat', owner: p, x: p.x + W.rng.range(-30, 30), y: p.y + W.rng.range(-30, 30) }); c.bt = 0; c.i = w.cs.length; w.cs.push(c); }
    const rage = p.buffs.catrage;
    for (const c of w.cs) {
      c.bt -= dt * bHaste(p) * (rage ? 2 : 1);
      let tgt = p.down ? null : W.nearestEnemy(c.x, c.y, 260);
      if (tgt && dist2(tgt.x, tgt.y, p.x, p.y) > s.leash * s.leash) tgt = W.nearestEnemy(p.x, p.y, s.leash * 0.8);
      const sp = s.speed * (rage ? 1.4 : 1);
      let gx, gy;
      if (tgt) { gx = tgt.x; gy = tgt.y; } else { const a = c.i * 2.1 + W.time * 0.4; gx = p.x + Math.cos(a) * 50; gy = p.y + Math.sin(a) * 36; }
      const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy) || 1;
      const reach = tgt ? tgt.r + 16 : 8;
      if (d > reach) { const m = Math.min(d - reach + 1, sp * dt); c.x += dx / d * m; c.y += dy / d * m; c.st = 1; } else c.st = 0;
      if (Math.abs(dx) > 4) c.face = dx > 0 ? 1 : -1;
      if (tgt && d <= reach + 6 && c.bt <= 0) { c.bt = s.cd; c.st = 2; W.strike(p, tgt, s.dmg, { dot: s.dot, dotDur: s.dotDur, kb: 40, sx: c.x, sy: c.y }); W.emit('s', c.x | 0, c.y | 0, Math.round(Math.atan2(dy, dx) * 100), 30, 160, 6); }
    }
    w.pt = (w.pt === undefined ? s.purrCd : w.pt) - dt;
    if (w.pt > 0 || p.down) return;
    w.pt = s.purrCd * p.st.cd;
    const done = new Set();
    for (const c of w.cs) {
      W.emit('r', c.x | 0, c.y | 0, s.purrR | 0, 2);
      W.playersIn(c.x, c.y, s.purrR, (q) => { if (done.has(q)) return; done.add(q); W.heal(q, s.purrHeal, p); if (s.purrHaste) addBuff(q, 'purr', { t: 4, haste: s.purrHaste }); });
    }
  },

// 老瑾：平時彈硬幣，定期丟出誘餌
  decoy(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    const tgt = W.nearestEnemy(p.x, p.y, s.range);
    if (tgt && w.t <= 0) {
      w.t = s.cd * p.st.cd; p.atkN++;
      const a = Math.atan2(tgt.y - p.y, tgt.x - p.x); p.atkA = a;
      W.shoot(p, { kind: 'note', a, speed: 620, dmg: s.dmg, life: 0.8, r: 8, pierce: 1 });
    }
    w.dt = (w.dt === undefined ? 2 : w.dt) - dt * bHaste(p);
    if (w.dt > 0 || !W.nearestEnemy(p.x, p.y, 520)) return;
    w.dt = s.decoyCd * p.st.cd;
    for (let i = 0; i < s.decoys; i++) {
      const c = W.cluster(p.x, p.y, 420) || { x: p.x, y: p.y };
      let x = (p.x + c.x) / 2 + W.rng.range(-50, 50), y = (p.y + c.y) / 2 + W.rng.range(-50, 50);
      if (solidAt(W.L, x, y)) { x = p.x; y = p.y; }
      throwDecoy(W, p, x, y, s);
    }
  },
  // 農夫哥哥：增幅光環 + 火球
  aura(W, p, w, dt) {
    const s = w.s, r = s.auraR * p.st.area;
    if (!w.zone || w.zone.dead) w.zone = W.addZone({ kind: 'aura', owner: p, follow: p, r, dur: 1e9, tick: 9, upd() {} });
    w.zone.r = r;
    w.at = (w.at || 0) - dt;
    if (w.at <= 0 && !p.down) { w.at = 0.4; W.playersIn(p.x, p.y, r, (q) => addBuff(q, 'dragon', { t: 0.9, dmg: s.buffDmg, haste: s.buffHaste })); }
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const tgt = W.nearestEnemy(p.x, p.y, s.range);
    if (!tgt) return;
    w.t = s.cd * p.st.cd; p.atkN++;
    const a = Math.atan2(tgt.y - p.y, tgt.x - p.x); p.atkA = a;
    volley(W, p, w, a, s, null);
  },

// 起秋：放出卡丁車衝撞貫穿，同時以引擎聲浪為附近隊友加速
  kart(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const tgt = W.nearestEnemy(p.x, p.y, s.range);
    if (!tgt) return;
    w.t = s.cd * p.st.cd; p.atkN++;
    const a = Math.atan2(tgt.y - p.y, tgt.x - p.x); p.atkA = a;
    volley(W, p, w, a, s, { r: 20, y: p.y });
    W.playersIn(p.x, p.y, s.r * p.st.area, (q) => addBuff(q, 'cheer', { t: s.buffDur, dmg: s.buffDmg, haste: s.buffHaste, speed: s.buffSpeed || 0 }));
    W.emit('r', p.x | 0, p.y | 0, (s.r * p.st.area) | 0, 4);
  },

  lightning(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const ts = W.randomEnemies(p.x, p.y, s.range, s.count);
    if (!ts.length) return;
    w.t = s.cd * p.st.cd;
    for (const e of ts) { W.emit('l', e.x | 0, (e.y - 420) | 0, e.x | 0, e.y | 0, 1); W.aoe(e.x, e.y, s.aoe * p.st.area, s.dmg, p, { fx: 7, stun: 0.15 }); }
  },

  molotov(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const c = W.cluster(p.x, p.y, s.range);
    if (!c) return;
    w.t = s.cd * p.st.cd;
    for (let i = 0; i < s.count; i++) {
      const tx = c.x + (i ? W.rng.range(-90, 90) : 0), ty = c.y + (i ? W.rng.range(-90, 90) : 0);
      lob(W, p, 'molotov', tx, ty, 0.45, (W2) => { W2.addZone({ kind: 'fire', owner: p, x: tx, y: ty, r: s.r * p.st.area, dur: s.dur, tick: 0.4, dmg: s.dmg, hitOpt: { quiet: true } }); W2.emit('b', tx | 0, ty | 0, (s.r * p.st.area) | 0, 8); });
    }
  },

  nova(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const r = s.r * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, r * 0.9)) return;
    w.t = s.cd * p.st.cd;
    W.hash.query(p.x, p.y, r, (e) => W.strike(p, e, s.dmg, { slow: s.slow, slowDur: s.slowDur, stun: s.freeze }));
    W.emit('r', p.x | 0, p.y | 0, r | 0, 5);
  },
};

// 光束：跟著持有者與瞄準方向轉動，每 0.1 秒對線上敵人造成傷害
export function beamUpd(W, z, dt) {
  const p = z.owner;
  if (p.down) { z.dead = true; return; }
  z.a += angDiff(z.a, p.aim + (z.off || 0)) * Math.min(1, dt * (z.turn || 5));
  z.x = p.x + Math.cos(z.a) * 22; z.y = p.y - 16 + Math.sin(z.a) * 22;
  z.tk -= dt;
  if (z.tk <= 0) { z.tk += z.tick; W.zoneTick(z); }
}

// 拋物線投擲（落地才觸發）
export function lob(W, p, kind, tx, ty, time, onLand, sx, sy) {
  const x = sx === undefined ? p.x : sx, y = sy === undefined ? p.y - 20 : sy;
  const d = Math.hypot(tx - x, ty - y);
  return W.shoot(p, { kind, x, y, a: Math.atan2(ty - y, tx - x), speed: d / time, life: time, lob: true, onLand, aux: Math.min(255, Math.round(time * 100)) });
}

export function plantMine(W, p, x, y, s, small) {
  const blast = (small ? s.r * 0.65 : s.r) * p.st.area, dmg = small ? s.dmg * 0.45 : s.dmg;
  return W.addZone({ kind: 'mine', owner: p, x, y, r: s.trig, dur: s.life, arm: s.arm,
    upd(W2, z) {
      if (z.t < z.arm) return;
      let trig = false;
      W2.hash.query(z.x, z.y, z.r, () => { trig = true; });
      if (trig) z.t = z.dur;
    },
    onEnd(W2, z) {
      W2.aoe(z.x, z.y, blast, dmg, p, { fx: 1, kb: 220 });
      if (s.cluster && !small) for (let i = 0; i < s.cluster; i++) {
        const a = W2.rng.range(0, TAU), d = W2.rng.range(60, 110);
        const tx = z.x + Math.cos(a) * d, ty = z.y + Math.sin(a) * d;
        lob(W2, p, 'grenade', tx, ty, 0.4, (W3) => W3.aoe(tx, ty, blast * 0.6, dmg * 0.45, p, { fx: 1 }), z.x, z.y);
      }
    } });
}

// 丟出一個誘餌：吸引敵人，結束時爆炸
export function throwDecoy(W, p, x, y, s, mark) {
  const r = s.decoyR * p.st.area;
  W.addDecoy(x, y, r, s.decoyDur);
  return W.addZone({ kind: 'decoy', owner: p, x, y, r, dur: s.decoyDur, tick: 0.5, dmg: 0, hitOpt: mark ? { mark: 0.7, quiet: true } : null,
    onEnd(W2, z) {
      W2.aoe(z.x, z.y, s.boomR * p.st.area, s.boomDmg, p, { fx: 1, kb: 200 });
      for (let i = 0; i < (s.coins || 0); i++) W2.drop('c', z.x + W2.rng.range(-30, 30), z.y + W2.rng.range(-30, 30), 2);
    } });
}
