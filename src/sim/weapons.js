// 武器行為。每個行為是 (W, p, w, dt) => void；w.s 是當前等級的數值，w.t 是冷卻計時。
// 新武器若能用既有行為 + 不同數值組合出來，就只需要改 data/weapons.js。
import { TAU, angDiff, dist2 } from '../core/util.js';
import { bHaste, addBuff, dash } from './player.js';
import { solidAt, blocksShot } from './levelgen.js';

const FX = { steel: 0, heavy: 1, toxic: 2, punch: 3, wood: 4, teal: 5, star: 7, chop: 8 };

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

// 以任意位置為圓心的扇形打擊（召喚物的吐息 / 撲擊用）
function swingFrom(W, p, x, y, a, range, arc, dmg, o) {
  const half = arc / 2;
  W.hash.query(x, y, range, (e) => { if (dist2(x, y, e.x, e.y) > 30 * 30 && Math.abs(angDiff(a, Math.atan2(e.y - y, e.x - x))) > half) return; W.strike(p, e, dmg, Object.assign({ sx: x, sy: y }, o)); });
}
function volley(W, p, w, a, s, extra) {
  const n = s.count || 1, spread = n > 1 ? (s.spread || 0.3) : 0;
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i / (n - 1) - 0.5) * spread : 0;
    const jit = s.jitter ? W.rng.range(-s.jitter, s.jitter) / 2 : 0;
    W.shoot(p, Object.assign({
      kind: w.def.proj, a: a + off + jit, speed: s.speed, dmg: s.dmg, pierce: s.pierce || 0, life: s.life * (p.st.area * 0.5 + 0.5), r: s.projR || 7,
      bounce: s.bounce || 0, homing: s.homing || 0, dot: s.dot, dotDur: s.dotDur, slow: s.slow, slowDur: s.slowDur, kb: s.kb || 0,
      critAdd: s.critAdd || 0, ret: s.ret, x: p.x + Math.cos(a) * (16 - (s.back || 0)) - Math.sin(a) * off * 90, y: p.y - 14 - (s.back ? 14 : 0) + Math.sin(a) * (16 - (s.back || 0)) + Math.cos(a) * off * 90,
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

// 進化：裂地戰斧 —— 沿一條線依序噴出岩柱（每根是一個小圓形區域，延遲由近到遠）
// 烤肉塔：削肉片攻擊 + 治療附近隊友。big = 寶具版（向四面八方射、治療更強）
export function spawnKebab(W, p, x, y, s, dur, big) {
  const k = W.addSummon({ kind: 'kebab', owner: p, x, y, life: dur, st: 0 });
  k.ct = 0; k.ht = 0; k.rot = 0;
  k.upd = (W2, m, dt) => {
    m.ct -= dt * bHaste(p); m.ht -= dt; m.rot += dt * 5;
    if (m.ct <= 0) {
      m.ct = s.sliceCd * (big ? 0.55 : 1);
      const e = big ? null : W2.randomEnemies(m.x, m.y, s.sliceR * p.st.area, 1)[0];
      if (big || e) { const a = e ? Math.atan2(e.y - m.y + 40, e.x - m.x) : m.rot * 1.7; W2.shoot(p, { kind: 'meatslice', x: m.x, y: m.y - 46, a, speed: 560, dmg: s.dmg * (big ? 1.3 : 1), pierce: big ? 3 : 1, life: 0.75, r: 12, dot: s.dot, dotDur: s.dotDur, kb: 30 }); }
    }
    if (m.ht <= 0) { m.ht = 0.5; const R = s.towerR * p.st.area * (big ? 1.8 : 1); W2.playersIn(m.x, m.y, R, (q) => { W2.heal(q, (big ? q.st.maxHp * 0.03 : s.towerHeal * 0.5) , p); if (big) addBuff(q, 'bbq', { t: 1.2, dmg: 0.4 }); }); }
  };
  return k;
}
// 香蕉皮：踩到的敵人滑倒（短暫暈眩）並受傷，一片只會滑倒同一隻敵人一次
export function dropPeel(W, p, x, y, dmg, dur) {
  if (solidAt(W.L, x, y)) return;
  W.addZone({ kind: 'peel', owner: p, x, y, r: 26, dur, tick: 0.15, aux: (W.tickN * 7) % 4,
    upd(W2, z, dt) { z.tk -= dt; if (z.tk > 0) return; z.tk += z.tick; W2.hash.query(z.x, z.y, z.r, (e) => { const ot = e.ot || (e.ot = {}), k = 'pl' + z.id; if (ot[k]) return; ot[k] = 1; W2.strike(p, e, dmg, { stun: 0.45, kb: 140, sx: p.x, sy: p.y }); }); } });
}
export function fissure(W, p, x, y, a, len, dmg, hitOpt, step = 62, r = 46) {
  for (let d = step, i = 0; d <= len; d += step, i++) {
    const fx2 = x + Math.cos(a) * d, fy = y + Math.sin(a) * d;
    if (solidAt(W.L, fx2, fy)) break;
    W.addZone({ kind: 'rockburst', owner: p, x: fx2, y: fy, r, delay: 0.05 + i * 0.045, dur: 0.75 + i * 0.045, tick: 9, dmg, hitOpt: Object.assign({ kb: 90, sx: x, sy: y }, hitOpt), aux: (i * 7) % 5 });
  }
}
// 進化：死神狙擊 —— 瞬間貫穿的光線（遇牆停止），暴擊在命中點爆炸
function railShot(W, p, a, s) {
  const x0 = p.x + Math.cos(a) * 18, y0 = p.y - 14 + Math.sin(a) * 18, ca = Math.cos(a), sa = Math.sin(a);
  let len = 0;
  const max = s.railLen * (p.st.area * 0.5 + 0.5);
  while (len < max && !blocksShot(W.L, x0 + ca * (len + 16), y0 + sa * (len + 16))) len += 16;
  W.lineHits(x0, y0, a, len, s.railW, (e) => {
    const crit = W.rng.next() < p.st.crit + (s.critAdd || 0);
    W.strike(p, e, s.dmg, { crit, critAdd: -9, kb: s.kb, sx: p.x, sy: p.y });
    if (crit && s.railBoom) W.aoe(e.x, e.y, s.railBoom * p.st.area, s.dmg * 0.45, p, { fx: 1, critAdd: -9 });
  });
  W.emit('l', x0 | 0, y0 | 0, (x0 + ca * len) | 0, (y0 + sa * len) | 0, 4);
}

export const BEH = {
  // 進化：聖療光鏈 —— 持續連住附近敵人（傷害）與最需要治療的隊友（補血）
  chain(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0 || p.down) return;
    w.t = s.chainTick;
    const R = s.chainR * (p.st.area * 0.5 + 0.5), es = W.enemiesIn(p.x, p.y, R).slice().sort((a, b) => dist2(a.x, a.y, p.x, p.y) - dist2(b.x, b.y, p.x, p.y)).slice(0, s.chainN + (s.count > 1 ? 1 : 0));
    for (const e of es) { W.strike(p, e, s.dmg, { dot: s.dot, dotDur: s.dotDur, quiet: W.rng.next() < 0.5 }); W.emit('l', p.x | 0, (p.y - 18) | 0, e.x | 0, (e.y - e.r * 0.5) | 0, 5); }
    if (es.length) { w.n++; if (w.n % 3 === 0) { p.atkN++; p.atkA = Math.atan2(es[0].y - p.y, es[0].x - p.x); } }
    let best = null, bv = 0.999;
    for (const q of W.players) { if (q.gone || q.down || dist2(q.x, q.y, p.x, p.y) > s.healRange * s.healRange) continue; const v = q.hp / q.st.maxHp; if (v < bv) { bv = v; best = q; } }
    if (best) { W.heal(best, s.healAmt * s.healCount * s.chainTick / s.healCd * 1.6, p, s.overheal); if (best !== p) W.emit('l', p.x | 0, (p.y - 18) | 0, best.x | 0, (best.y - 18) | 0, 6); }
  },
  // 進化：母艦協議 —— 一艘母艦跟在頭上：追蹤雷射 + 定期投彈
  mothership(W, p, w, dt) {
    const s = w.s;
    if (!w.ms || w.ms.dead) w.ms = W.addSummon({ kind: 'mothership', owner: p, x: p.x, y: p.y - 70 });
    const m = w.ms, tx = p.x - 34 * (p.face || 1), ty = p.y - 78;
    m.x += (tx - m.x) * Math.min(1, dt * 5); m.y += (ty - m.y) * Math.min(1, dt * 5);
    if (p.down) return;
    const boost = p.buffs.swarm ? 1.8 : 1;
    w.t -= dt * bHaste(p) * boost; w.bt = (w.bt === undefined ? 1.2 : w.bt) - dt * bHaste(p) * boost;
    if (w.t <= 0) {
      w.t = s.laserTick;
      if (!w.tg || w.tg.dead || dist2(w.tg.x, w.tg.y, m.x, m.y) > s.range * s.range * 1.3) w.tg = W.nearestEnemy(m.x, m.y + 40, s.range);
      const e = w.tg;
      if (e) { W.strike(p, e, s.dmg * s.laserTick / s.cd, { quiet: W.rng.next() < 0.6 }); W.emit('l', m.x | 0, (m.y + 8) | 0, e.x | 0, (e.y - e.r * 0.5) | 0, 7); m.face = e.x >= m.x ? 1 : -1; w.n++; if (w.n % 5 === 0) { p.atkN++; p.atkA = Math.atan2(e.y - p.y, e.x - p.x); } }
    }
    if (w.bt <= 0) {
      const c = W.cluster(p.x, p.y, s.range, 100);
      if (!c) { w.bt = 0.4; return; }
      w.bt = s.bombCd * p.st.cd;
      const bx = c.x, by = c.y;
      lob(W, p, 'missile', bx, by, 0.5, (W2) => { W2.aoe(bx, by, s.bombR * p.st.area, s.dmg * s.bombDmg / 13, p, { fx: 1, kb: 160 }); W2.emit('sh', 3); }, m.x, m.y);
    }
  },
  // 進化：虎爺降臨 —— 一隻大老虎撲擊敵群（範圍傷害），呼嚕光環治療隊友
  tiger(W, p, w, dt) {
    const s = w.s;
    if (!w.tg0 || w.tg0.dead) { w.tg0 = W.addSummon({ kind: 'tiger', owner: p, x: p.x + 30, y: p.y + 20 }); w.tg0.bt = 0; }
    const c = w.tg0, rage = p.buffs.catrage || p.buffs.twin;
    const twinBit = 0;
    c.bt -= dt * bHaste(p) * (rage ? 1.8 : 1);
    let tgt = p.down ? null : (W.cluster(p.x, p.y, s.leash, 90) || null);
    const sp = s.speed * (rage ? 1.4 : 1);
    let gx, gy;
    if (tgt) { gx = tgt.x; gy = tgt.y; } else { const a = W.time * 0.5; gx = p.x + Math.cos(a) * 56; gy = p.y + Math.sin(a) * 40; }
    const dx = gx - c.x, dy = gy - c.y, d = Math.hypot(dx, dy) || 1, reach = tgt ? tgt.r + 30 : 8;
    if (d > reach) { const m = Math.min(d - reach + 1, sp * dt); c.x += dx / d * m; c.y += dy / d * m; c.st = 1 | twinBit; } else c.st = twinBit;
    if (Math.abs(dx) > 4) c.face = dx > 0 ? 1 : -1;
    if (tgt && d <= reach + 10 && c.bt <= 0) {
      c.bt = s.cd; c.st = 2 | twinBit;
      W.aoe(tgt.x, tgt.y, s.pounceR * p.st.area, s.dmg * (p.buffs.twin ? 1.8 : 1), p, { dot: s.dot || 8, dotDur: s.dotDur || 3, kb: 120, sx: c.x, sy: c.y, noFx: true });
      W.emit('s', tgt.x | 0, tgt.y | 0, Math.round(Math.atan2(dy, dx) * 100), (s.pounceR * 1.1) | 0, 628, 3); p.atkN++; p.atkA = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    }
    w.pt = (w.pt === undefined ? s.purrCd : w.pt) - dt;
    if (w.pt > 0 || p.down) return;
    w.pt = s.purrCd * p.st.cd;
    const R = s.purrR * p.st.area;
    for (const [x, y] of [[c.x, c.y], [p.x, p.y]]) { W.emit('r', x | 0, y | 0, R | 0, 2); }
    for (const q of W.players) if (!q.gone && !q.down && (dist2(q.x, q.y, c.x, c.y) <= R * R || dist2(q.x, q.y, p.x, p.y) <= R * R)) { W.heal(q, s.purrHeal * 3, p); if (s.purrHaste) addBuff(q, 'purr', { t: 4, haste: s.purrHaste }); }
  },
  // 進化：幽冥骷髏 —— 一顆大骷髏自己追著敵群啃咬（不會離主人太遠）
  skull(W, p, w, dt) {
    const s = w.s;
    if (!w.sk || w.sk.dead) w.sk = W.addSummon({ kind: 'skull', owner: p, x: p.x, y: p.y - 30 });
    const k = w.sk;
    if (p.down) return;
    const far = dist2(k.x, k.y, p.x, p.y) > s.leash * s.leash;
    if (!w.tg || w.tg.dead || far || (W.tickN + 7) % 30 === 0) w.tg = far ? null : (W.cluster(p.x, p.y, s.leash, 90) || null);
    const tx = w.tg ? w.tg.x : p.x + Math.cos(W.time * 1.3) * 60, ty = w.tg ? w.tg.y : p.y - 30 + Math.sin(W.time * 1.3) * 30;
    const dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy) || 1, sp = s.skullSpeed * (far ? 2 : 1) * dt;
    if (d > 8) { k.x += dx / d * Math.min(d, sp); k.y += dy / d * Math.min(d, sp); if (Math.abs(dx) > 4) k.face = dx > 0 ? 1 : -1; }
    w.t -= dt * bHaste(p); if (!w.digit) w.digit = W.rng.int(Math.max(1, s.minDigit || 1), 9); k.st = w.digit + (w.t > s.biteCd * p.st.cd * 0.6 ? 16 : 0);      // st = 數字 + 16（剛咬完）
    if (w.t > 0) return;
    let n = 0, kills = 0;
    if (!w.digit) w.digit = W.rng.int(Math.max(1, s.minDigit || 1), 9);
    const dg = w.digit, mul = dg / 5 * (dg === 9 && s.nine ? 3 : 1);      // 沿用數字鬼火的規則：數字越大越痛
    W.hash.query(k.x, k.y, s.biteR * p.st.area, (e) => { n++; W.strike(p, e, s.dmg * mul, { kb: 40, sx: k.x, sy: k.y }); if (e.dead) kills++; });
    k.aux = dg;
    if (!n) return;
    w.digit = 0;
    w.t = s.biteCd * p.st.cd; p.atkN++; p.atkA = Math.atan2(k.y - p.y, k.x - p.x);
    if (kills) W.heal(p, Math.min(6, kills * 1.5), p);
    W.emit('h', k.x | 0, k.y | 0, 6);
  },
  // 進化：金剛法輪 —— 一個大法輪繞行；定期飛向敵群再飛回來
  wheel(W, p, w, dt) {
    const s = w.s;
    if (!w.orbs || !w.orbs.length || w.orbs[0].dead) w.orbs = [W.shoot(p, { kind: 'wheel', orbit: true, life: 1e9, speed: 0, dmg: 0 })];
    const o = w.orbs[0], R = s.radius * p.st.area, hitR = s.wheelR * (p.st.area * 0.5 + 0.5);
    w.rot = (w.rot || 0) + dt * s.rot * 0.75;
    const hx = p.x + Math.cos(w.rot) * R, hy = p.y - 12 + Math.sin(w.rot) * R * 0.86;      // 軌道上的歸位點
    if (w.fly) {
      const f = w.fly; f.t += dt;
      const k = f.t / f.dur, out = k < 0.5 ? k * 2 : 2 - k * 2, e = 1 - (1 - out) * (1 - out);
      o.x = hx + (f.tx - hx) * e; o.y = hy + (f.ty - hy) * e;
      if (k >= 1) { w.fly = null; w.tt = s.throwCd * p.st.cd; }
    } else {
      o.x = hx; o.y = hy;
      w.tt = (w.tt === undefined ? 2.5 : w.tt) - dt * bHaste(p);
      if (w.tt <= 0 && !p.down) {
        const c = W.cluster(p.x, p.y, s.throwDist * 1.1, 110);
        if (c) { const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy) || 1, L = Math.min(s.throwDist * p.st.area, d + 120); w.fly = { t: 0, dur: 1.5, tx: p.x + dx / d * L, ty: p.y + dy / d * L }; p.atkN++; p.atkA = Math.atan2(dy, dx); W.emit('a', 'slash'); }
        else w.tt = 0.5;
      }
    }
    o.a = (o.a || 0) + dt * (w.fly ? 16 : 7); o.aux = w.fly ? 1 : 0;
    if (!p.down) W.hash.query(o.x, o.y, hitR, (e) => {
      const ot = e.ot || (e.ot = {}), key = w.uid * 32;
      if ((ot[key] || 0) > W.time) return;
      ot[key] = W.time + s.hitCd;
      W.strike(p, e, s.dmg * (w.fly ? s.throwDmg : 1), { slow: s.slow, slowDur: s.slowDur, kb: w.fly ? 160 : 50, sx: o.x, sy: o.y });
    });
    if (!s.pulseCd) return;                      // 定身波沿用佛珠的設定
    w.pt = (w.pt === undefined ? 3 : w.pt) - dt * bHaste(p);
    if (w.pt > 0) return;
    const r = s.pulseR * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, r)) return;
    w.pt = s.pulseCd * p.st.cd; p.atkN++;
    W.hash.query(p.x, p.y, r, (e) => W.strike(p, e, s.dmg * 1.5, { stun: s.pulseStun, mark: s.pulseMark ? s.pulseStun + 1 : 0 }));
    W.emit('r', p.x | 0, p.y | 0, r | 0, 5);
  },

  melee(W, p, w, dt) {
    const s = w.s;
    if (w.pend) { w.pend.t -= dt; if (w.pend.t <= 0) { const q = w.pend; w.pend = null; swing(W, p, q.a, q.range, s.arc, s.dmg, q.o); p.atkN++; p.atkA = q.a; } }
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const range = s.range * p.st.area;
    const tgt = W.nearestEnemy(p.x, p.y, s.fist ? s.fistRange * (p.st.area * 0.5 + 0.5) : range * 1.25);
    if (!tgt) return;
    w.t = s.cd * p.st.cd; w.n++;
    const a = Math.atan2(tgt.y - p.y, tgt.x - p.x), fx = FX[w.def.fx] || 0;
    const o = { kb: s.kb, dot: s.dot, dotDur: s.dotDur, fx, critAdd: p.buffs.stealth ? 1 : 0 };
    p.atkN++; p.atkA = a;
    if (s.fist) {                                 // 進化：殘影巨拳 —— 拳影飛出去打，左右手交替；每 N 拳一記重拳
      const big = w.n % s.combo === 0 || !!p.buffs.limit, side = w.n % 2 ? 1 : -1, k = big ? 1.7 : 1;
      W.shoot(p, { kind: 'fist', a, speed: 760, dmg: s.dmg * (big ? s.comboMul * 0.8 : 1.5), pierce: big ? 99 : 5, life: 0.4 * (p.st.area * 0.5 + 0.5), r: 28 * k, kb: s.kb * (big ? 5 : 2), stun: big ? s.comboStun : 0, aux: big ? 1 : 0,
        x: p.x + Math.cos(a) * 20 - Math.sin(a) * 14 * side, y: p.y - 16 + Math.sin(a) * 20 + Math.cos(a) * 14 * side });
      if (big) W.emit('sh', 3);
      return;
    }
    if (s.quake) {                                // 進化：裂地戰斧 —— 砸地 + 沿線噴出岩柱
      const cx = p.x + Math.cos(a) * 60, cy = p.y + Math.sin(a) * 60;
      W.aoe(cx, cy, 95 * p.st.area, s.dmg, p, Object.assign({}, o, { fx: 9 })); W.emit('sh', 4);
      const fan = w.n % s.combo === 0 ? [-0.5, 0, 0.5] : [0];
      for (const off of fan) fissure(W, p, cx, cy, a + off, s.quakeLen * (p.st.area * 0.5 + 0.5), s.dmg * 0.9, { stun: s.comboStun || 0.4, dot: s.dot, dotDur: s.dotDur });
      return;
    }
    swing(W, p, a, range, s.arc, s.dmg, o);
    if (s.titan) { const cx = p.x + Math.cos(a) * range * 0.55, cy = p.y + Math.sin(a) * range * 0.55; W.aoe(cx, cy, 150 * p.st.area, s.dmg * 0.55, p, { kb: 160, fx: 9 }); W.emit('r', cx | 0, cy | 0, (190 * p.st.area) | 0, 3); W.emit('sh', 4); }      // 進化：泰坦機甲的衝擊波
    if (s.chop) {                                 // 進化：斬骨巨刀 —— 留下帶毒刀痕，命中回血
      const cx = p.x + Math.cos(a) * range * 0.6, cy = p.y + Math.sin(a) * range * 0.6;
      let n = 0; W.hash.query(cx, cy, range * 0.55, () => n++);
      if (n) W.heal(p, Math.min(10, 2 + n * 1.5), p);
      W.addZone({ kind: 'chopmark', owner: p, x: cx, y: cy, a, r: range * 0.5, dur: 3.2, tick: 0.5, dmg: s.dmg * 0.09, hitOpt: { dot: s.dot, dotDur: s.dotDur, slow: 0.25, slowDur: 0.8, quiet: true } });
      W.emit('sh', 5);
    }
    if (s.thunder) {                              // 進化：雷霆金剛棒 —— 命中的敵人頭上劈下落雷
      const hit = []; W.hash.query(p.x + Math.cos(a) * range * 0.6, p.y + Math.sin(a) * range * 0.6, range * 0.7, (e) => { if (hit.length < s.thunder) hit.push(e); });
      for (const e of hit) { W.emit('l', e.x | 0, (e.y - 460) | 0, e.x | 0, e.y | 0, 1); W.aoe(e.x, e.y, 62 * p.st.area, s.dmg * 0.55, p, { stun: 0.25, noFx: true }); }
    }
    if (s.double) w.pend = { t: 0.16, a: a + Math.PI, range, o };
    const forceCombo = p.buffs.limit;
    if (s.combo && (w.n % s.combo === 0 || forceCombo)) {
      const r = s.comboR * p.st.area;
      if (s.comboSpin) { swing(W, p, a, r, TAU, s.dmg * s.comboMul, Object.assign({}, o, { kb: s.kb * 1.2, stun: s.comboStun })); }
      else { const cx = p.x + Math.cos(a) * 40, cy = p.y + Math.sin(a) * 40; W.aoe(cx, cy, r, s.dmg * s.comboMul * (forceCombo && w.n % s.combo ? 0.6 : 1), p, { kb: s.kb * 3, stun: s.comboStun, fx: 5 }); }
    }
    if (s.starWave) W.shoot(p, { kind: 'starwave', a, speed: 680, dmg: s.dmg * s.starWave, pierce: 99, life: 1.4, r: 64, kb: 90, x: p.x + Math.cos(a) * 30, y: p.y - 14 + Math.sin(a) * 30 });   // 進化：星穹光刃
    if (s.waveEvery && w.n % s.waveEvery === 0) W.shoot(p, { kind: 'wave', a, speed: 540, dmg: s.dmg * s.waveDmg, pierce: 99, life: 0.75, r: 30, kb: 60 });
    if (s.throwEvery && w.n % s.throwEvery === 0) { const c = 1 + (s.throwCount || 0); for (let i = 0; i < c; i++) W.shoot(p, { kind: 'cleaver', a: a + (c > 1 ? (i / (c - 1) - 0.5) * 0.6 : 0), speed: 480, dmg: s.dmg * s.throwDmg, pierce: 4, life: 0.8, r: 14, dot: s.dot, dotDur: s.dotDur }); }
    if (s.comet && w.n % s.ballEvery === 0) W.shoot(p, { kind: 'thunderball', a, speed: 630, dmg: s.dmg * s.ballDmg, pierce: 99, life: 1.86, r: 24, kb: 220, stun: 0.3 });
    else if (s.ballEvery && w.n % s.ballEvery === 0) W.shoot(p, { kind: 'baseball', a, speed: 760, dmg: s.dmg * s.ballDmg, bounce: 2 + (s.ballBounce || 0), life: 1.2, r: 9, kb: 160 });
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
    if (s.nuke) extra = Object.assign(extra || {}, { onEnd: (W2, pr) => {      // 進化：末日彈頭 —— 蕈狀雲 + 輻射區
      W2.addZone({ kind: 'mushroom', owner: p, x: pr.x, y: pr.y, r: pr.aoe, dur: 1.5, tick: 9 }); W2.emit('sh', 9);
      W2.addZone({ kind: 'toxic', owner: p, x: pr.x, y: pr.y, r: pr.aoe * 0.8, dur: 5, tick: 0.5, dmg: s.dmg * 0.09, hitOpt: { quiet: true, slow: 0.2, slowDur: 0.8 } }); } });
    if (s.trail && w.n % s.trail === 0) W.addZone({ kind: 'fire', owner: p, x: tgt.x, y: tgt.y, r: 48 * p.st.area, dur: 2.6, tick: 0.4, dmg: s.dmg * 0.5, hitOpt: { quiet: true } });      // 進化：火神熔彈砲的燃燒彈道
    if (s.bits) {                                 // 進化：浮游雙槍 —— 兩把槍從肩膀位置各打各的目標
      const t2 = W.nearestEnemy(p.x, p.y, s.range, tgt) || tgt;
      [[tgt, -22], [t2, 22]].forEach(([t, ox]) => { const bx = p.x + ox, by = p.y - 52; volley(W, p, w, Math.atan2(t.y - 6 - by, t.x - bx), s, Object.assign({ x: bx, y: by }, extra)); });
    } else
    if (s.rail) railShot(W, p, a, s); else
    volley(W, p, w, a, s, extra);
    if (s.dual) { const t2 = W.nearestEnemy(p.x, p.y, s.range, tgt); if (t2) volley(W, p, w, Math.atan2(t2.y - p.y, t2.x - p.x), s, extra); }
    if (s.burst > 1 && !s.bits) { w.burst = s.burst - 1; w.bt = 0.07; w.ba = a; w.bx = extra; }
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
      W.addZone({ kind: 'beam', owner: p, follow: p, oy: -16, a: p.aim + off - (s.sweep || 0), off, len, w: s.width * p.st.area, dur: s.dur, tick: 0.1, dmg: s.dmg, burst: s.burst, hitOpt: { quiet: false },
        aux: s.sweep ? 1 : 0, sweep: s.sweep, a0: p.aim, upd: s.sweep ? sweepUpd : beamUpd });
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
      W.hash.query(o.x, o.y, 22, (e) => {
        const ot = e.ot || (e.ot = {}), key = w.uid * 32 + i;          // 每顆珠子各自計算命中間隔
        if ((ot[key] || 0) > W.time) return;
        ot[key] = W.time + s.hitCd;
        W.strike(p, e, s.dmg, { slow: s.slow, slowDur: s.slowDur, kb: 30, sx: p.x, sy: p.y });
      });
    }
    if (!s.pulseCd) return;
    w.pt = (w.pt === undefined ? 3 : w.pt) - dt * bHaste(p);
    if (w.pt > 0) return;
    const r = s.pulseR * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, r)) return;
    w.pt = s.pulseCd * p.st.cd; p.atkN++;
    W.hash.query(p.x, p.y, r, (e) => W.strike(p, e, s.dmg * 4, { stun: s.pulseStun, mark: s.pulseMark ? s.pulseStun + 1 : 0 }));
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
    if (s.dragon) {                               // 進化：真龍顯現 —— 手臂上的小火龍朝敵人吐出扇形龍息
      const bx = p.x + Math.cos(a) * 22, by = p.y - 22 + Math.sin(a) * 14, ba = Math.atan2(tgt.y - by, tgt.x - bx), R = s.breathR * p.st.area;
      swingFrom(W, p, bx, by, ba, R, s.breathArc, s.dmg, { dot: s.dot, dotDur: s.dotDur, kb: 60 });
      W.addZone({ kind: 'breath', owner: p, x: bx, y: by, a: ba, r: R, dur: 0.42, tick: 9, aux: Math.round(s.breathArc * 50) });
      return;
    }
    volley(W, p, w, a, s, null);
  },

// 起秋：開著卡丁車直接衝撞。碰到的敵人持續受傷並被撞開；移動中會定期自動氮氣衝刺。
  ram(W, p, w, dt) {
    const s = w.s, R = s.ramR * p.st.area, mv = p.moving ? 1 : 0.5;
    if (!p.dash) W.hash.query(p.x, p.y, R, (e) => {
      const ot = e.ot || (e.ot = {});
      if ((ot[w.uid] || 0) > W.time) return;
      ot[w.uid] = W.time + s.hitCd / bHaste(p);
      W.strike(p, e, s.dmg * mv * (p.buffs.finish ? 3 : 1), { kb: s.kb * mv, sx: p.x, sy: p.y });
    });
    if (s.peel && p.moving) {                     // 進化：火箭蕉號 —— 行駛時車尾一路丟香蕉皮
      w.ex = (w.ex || 0) - dt;
      if (w.ex <= 0) { w.ex = s.peel * (p.buffs.finish ? 0.45 : 1); dropPeel(W, p, p.x + W.rng.range(-10, 10), p.y + 8 + W.rng.range(-8, 8), s.dmg * (p.buffs.finish ? 1.6 : 0.7), p.buffs.finish ? 5 : 3); }
    }
    w.t -= dt * bHaste(p);
    if (w.t > 0 || !p.moving || p.dash || !W.nearestEnemy(p.x, p.y, 260)) return;
    w.t = s.boostCd * p.st.cd; p.atkN++;
    const a = Math.atan2(p.in.my, p.in.mx); p.atkA = a;
    const x0 = p.x, y0 = p.y;
    dash(p, a, s.boostDist, 0.2, { dmg: s.dmg * s.boostMul, hitR: R + 14, hitOpt: { kb: s.kb * 1.8, stun: 0.3 },
      onEnd(W2, q) { if (s.trail) W2.addZone({ kind: 'fire', owner: q, x: (x0 + q.x) / 2, y: (y0 + q.y) / 2, r: 62, dur: 2.5, tick: 0.4, dmg: s.dmg * 0.5, hitOpt: { quiet: true } }); } });
    W.playersIn(p.x, p.y, s.r * p.st.area, (q) => addBuff(q, 'cheer', { t: s.buffDur, dmg: s.buffDmg, haste: s.buffHaste, speed: s.buffSpeed || 0 }));
    W.emit('r', p.x | 0, p.y | 0, (s.r * p.st.area) | 0, 4);
  },
  // （舊）放出卡丁車衝撞貫穿
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

  // 冰錐環：定時向四周射出一圈冰錐，命中緩速；滿級命中後碎裂
  icering(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    if (!W.nearestEnemy(p.x, p.y, s.speed * s.life * 0.9)) return;
    w.t = s.cd * p.st.cd; w.n++;
    const off = (w.n % 2) * Math.PI / s.count;
    for (let i = 0; i < s.count; i++) W.shoot(p, { kind: 'e_ice', a: off + i * 6.2832 / s.count, speed: s.speed, dmg: s.dmg, life: s.life * p.st.area, pierce: s.pierce, r: 9, slow: s.slow, slowDur: s.slowDur,
      onEnd: s.shard ? (W2, pr) => { if (pr.age < pr.life - 0.02) for (let k = 0; k < s.shard; k++) W2.shoot(p, { kind: 'e_ice', x: pr.x, y: pr.y, a: pr.a + (k - 1) * 0.9 + 3.14, speed: 300, dmg: s.dmg * 0.4, life: 0.3, r: 6, slow: s.slow, slowDur: s.slowDur }); } : null });
    W.emit('r', p.x | 0, p.y | 0, 46, 5);
  },
  // 雷鼓：每敲一下對最近的敵人放連鎖閃電，一隻跳一隻（傷害遞減）；滿級每第 4 下是全畫面落雷
  drum(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    let e = W.nearestEnemy(p.x, p.y, s.range);
    if (!e) return;
    w.t = s.cd * p.st.cd; w.n++;
    if (s.bolt && w.n % s.bolt === 0) {
      for (const q of W.randomEnemies(p.x, p.y, 620, 14)) { W.emit('l', q.x | 0, (q.y - 420) | 0, q.x | 0, q.y | 0, 1); W.strike(p, q, s.dmg * 1.2, { stun: 0.3 }); }
      W.emit('sh', 3); return;
    }
    let px = p.x, py = p.y - 30, dmg = s.dmg; const hit = new Set();
    for (let k = 0; k <= s.jumps && e; k++) {
      hit.add(e.id); W.emit('l', px | 0, py | 0, e.x | 0, e.y | 0, 0); W.strike(p, e, dmg, { stun: 0.12 });
      px = e.x; py = e.y; dmg *= s.falloff;
      let best = null, bd = s.jumpR * s.jumpR;
      W.hash.query(px, py, s.jumpR, (q) => { if (q.dead || hit.has(q.id)) return; const d = (q.x - px) ** 2 + (q.y - py) ** 2; if (d < bd) { bd = d; best = q; } });
      e = best;
    }
  },
  // 龍息瓶：朝最近的敵人噴一口扇形火焰並點燃；滿級前後各噴一口
  dragonbreath(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const tgt = W.nearestEnemy(p.x, p.y, s.range * p.st.area);
    if (!tgt) return;
    w.t = s.cd * p.st.cd;
    const a0 = Math.atan2(tgt.y - p.y, tgt.x - p.x), R = s.r * p.st.area;
    for (let k = 0; k <= s.twin; k++) {
      const a = a0 + k * Math.PI, bx = p.x + Math.cos(a) * 18, by = p.y - 18 + Math.sin(a) * 12;
      swingFrom(W, p, bx, by, a, R, s.arc, s.dmg, { dot: s.dot, dotDur: s.dotDur, kb: 40 });
      W.addZone({ kind: 'breath', owner: p, x: bx, y: by, a, r: R, dur: 0.42, tick: 9, aux: Math.round(s.arc * 50) });
    }
  },
  // 孢子雲：往敵人最多的地方丟一團毒雲，雲裡的敵人持續受傷並被腐蝕（承受更多傷害）；滿級雲散時爆開
  spore(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const c = W.cluster(p.x, p.y, s.range);
    if (!c) return;
    w.t = s.cd * p.st.cd;
    for (let i = 0; i < s.count; i++) {
      const tx = c.x + (i ? W.rng.range(-110, 110) : 0), ty = c.y + (i ? W.rng.range(-110, 110) : 0), r = s.r * p.st.area;
      W.addZone({ kind: 'spore', owner: p, x: tx, y: ty, r, dur: s.dur, tick: 0.5, dmg: s.dmg, hitOpt: { quiet: true, corr: 1.2, corrV: s.vuln },
        onEnd: s.burst ? (W2, z) => { W2.aoe(z.x, z.y, r * 1.25, s.dmg * 4, p, { fx: 3, corr: 2, corrV: s.vuln }); } : null });
      W.emit('r', tx | 0, ty | 0, r | 0, 2);
    }
  },
  // 飛錢鏢：擲出會在敵人之間彈跳的銅錢；滿級擊殺有機率多掉金幣
  coindart(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const ts = W.randomEnemies(p.x, p.y, s.range, s.count);
    if (!ts.length) return;
    w.t = s.cd * p.st.cd;
    for (let i = 0; i < s.count; i++) {
      const e = ts[i % ts.length];
      W.shoot(p, { kind: 'e_gold', a: Math.atan2(e.y - p.y + 14, e.x - p.x) + (i >= ts.length ? 0.25 : 0), speed: s.speed, dmg: s.dmg, life: 0.9, r: 9, bounce: s.bounce,
        onHit: s.coin ? (W2, pr, q) => { if (q.dead && !q.def.boss && W2.rng.next() < s.coin) W2.drop('c', q.x, q.y, 1); } : null });
    }
  },
  // 旋風陣：放出一道會追著敵人跑的旋風，把小怪吸進去持續絞傷
  cyclone(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    if (!W.nearestEnemy(p.x, p.y, s.range)) return;
    w.t = s.cd * p.st.cd;
    for (let i = 0; i < s.count; i++) {
      const a = W.rng.range(0, 6.2832);
      W.addZone({ kind: 'cyclone', owner: p, x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, r: s.r * p.st.area, dur: s.dur, tick: 0.3, dmg: s.dmg, pull: s.pull, hitOpt: { quiet: true }, seekT: i * 0.2, vx: 0, vy: 0,
        upd(W2, z, dt2) {
          z.seekT -= dt2;
          if (z.seekT <= 0) { z.seekT = 0.4; const c = W2.cluster(z.x, z.y, 360) || W2.nearestEnemy(z.x, z.y, 500); if (c) { const d = Math.hypot(c.x - z.x, c.y - z.y) || 1, v = d < 20 ? 0 : s.speed; z.vx = (c.x - z.x) / d * v; z.vy = (c.y - z.y) / d * v; } else { z.vx = z.vy = 0; } }
          const nx = z.x + z.vx * dt2, ny = z.y + z.vy * dt2;
          if (!solidAt(W2.L, nx, z.y)) z.x = nx;
          if (!solidAt(W2.L, z.x, ny)) z.y = ny;
          z.tk -= dt2; if (z.tk <= 0) { z.tk += z.tick; W2.zoneTick(z); }
        } });
    }
  },
  // 岩刺陣：身邊一圈岩刺破土而出，把敵人頂開並暈眩；滿級外圈再一圈
  rockspike(W, p, w, dt) {
    const s = w.s;
    w.t -= dt * bHaste(p);
    if (w.t > 0) return;
    const R = s.ring * p.st.area;
    if (!W.nearestEnemy(p.x, p.y, R * (s.outer ? 1.9 : 1.25))) return;
    w.t = s.cd * p.st.cd; w.n++;
    const x = p.x, y = p.y;
    for (let k = 0; k <= s.outer; k++) {
      const n = s.count + k * 4, rr = R * (1 + k * 0.7);
      for (let i = 0; i < n; i++) {
        const a = i * 6.2832 / n + w.n * 0.5 + k * 0.3, rx = x + Math.cos(a) * rr, ry = y + Math.sin(a) * rr * 0.86;
        if (solidAt(W.L, rx, ry)) continue;
        W.addZone({ kind: 'rockburst', owner: p, x: rx, y: ry, r: s.r * p.st.area, delay: 0.08 + k * 0.18, dur: 0.85 + k * 0.18, tick: 9, dmg: s.dmg, hitOpt: { stun: s.stun, kb: 150, sx: x, sy: y }, aux: i % 5 });
      }
    }
    W.emit('sh', 2);
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
// 進化：極光稜鏡砲 —— 光束在發射期間由一側掃到另一側
function sweepUpd(W, z, dt) {
  const p = z.owner;
  if (p.down) { z.dead = true; return; }
  z.a = z.a0 + z.sweep * (2 * Math.min(1, z.t / z.dur) - 1);
  z.x = p.x + Math.cos(z.a) * 22; z.y = p.y - 16 + Math.sin(z.a) * 22;
  z.tk -= dt;
  if (z.tk <= 0) { z.tk += z.tick; W.zoneTick(z); }
}
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
      if (s.gravity && !small) {                  // 進化：重力派對球 —— 先吸再炸
        W2.addZone({ kind: 'gravball', owner: p, x: z.x, y: z.y, r: blast * 1.2, dur: 0.95, tick: 0.1, pull: 300, dmg: dmg * 0.04, hitOpt: { quiet: true, slow: 0.4, slowDur: 0.3 },
          onEnd: (W3, g) => { W3.aoe(g.x, g.y, blast, dmg, p, { fx: 12, kb: 260, stun: 0.5 }); W3.emit('sh', 5); } });
        return;
      }
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
  if (s.tornado) {                               // 進化：鈔票龍捲風 —— 會慢慢追著敵群移動、吸入並絞切
    const d = W.addDecoy(x, y, r, s.decoyDur);
    const z = W.addZone({ kind: 'cashnado', owner: p, x, y, r: r * 0.42, dur: s.decoyDur, tick: 0.22, pull: 170, dmg: s.boomDmg * 0.04, hitOpt: { quiet: true, mark: mark ? 0.7 : 0 },
      upd(W2, zz, dt) {
        const c = (W2.tickN % 20 === 0 || !zz.tg) ? (zz.tg = W2.cluster(zz.x, zz.y, 300, 100)) : zz.tg;
        if (c && !c.dead) { const dx = c.x - zz.x, dy = c.y - zz.y, dd = Math.hypot(dx, dy) || 1, mv = Math.min(dd, 70 * dt), nx = zz.x + dx / dd * mv, ny = zz.y + dy / dd * mv; if (!solidAt(W2.L, nx, ny)) { zz.x = nx; zz.y = ny; d.x = nx; d.y = ny; } }
        zz.tk -= dt; if (zz.tk <= 0) { zz.tk += zz.tick; W2.zoneTick(zz); }
      },
      onEnd(W2, zz) {
        W2.aoe(zz.x, zz.y, s.boomR * p.st.area * 1.3, s.boomDmg, p, { fx: 1, kb: 240 });
        for (let i = 0; i < (s.coins || 0); i++) W2.drop('c', zz.x + W2.rng.range(-40, 40), zz.y + W2.rng.range(-40, 40), 2);
      } });
    return z;
  }
  W.addDecoy(x, y, r, s.decoyDur);
  return W.addZone({ kind: 'decoy', owner: p, x, y, r, dur: s.decoyDur, tick: 0.5, dmg: 0, hitOpt: mark ? { mark: 0.7, quiet: true } : null,
    onEnd(W2, z) {
      W2.aoe(z.x, z.y, s.boomR * p.st.area, s.boomDmg, p, { fx: 1, kb: 200 });
      for (let i = 0; i < (s.coins || 0); i++) W2.drop('c', z.x + W2.rng.range(-30, 30), z.y + W2.rng.range(-30, 30), 2);
    } });
}
