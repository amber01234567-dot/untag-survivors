// 敵人生成與 AI。AI[def.ai] = (W, e, dt, speed) => void
import { ENEMIES } from '../data/enemies.js';
import { TAU, dist2 } from '../core/util.js';
import { moveBody, solidAt } from './levelgen.js';

export function spawnEnemy(W, id, x, y, o = {}) {
  const def = ENEMIES[id];
  const el = o.elite ? 1 : 0;
  const hp = def.hp * W.hpMul * (el ? 10 : 1) * (o.hpMul || 1) * (def.boss ? 1 : 1 + W.ctl.cleared * 0.12);
  const e = {
    id: (W.eid = (W.eid % 65000) + 1), def, x, y, r: def.r * (el ? 1.45 : 1), hp, maxHp: hp,
    speed: def.speed * (el ? 1.12 : 1) * W.rng.range(0.92, 1.08), dmg: def.dmg * W.dmgMul * (el ? 1.5 : 1), elite: !!el,
    kx: 0, ky: 0, slowT: 0, slowF: 0, stunT: 0, dot: 0, dotT: 0, dotAcc: 0, dotP: null, mark: 0, flash: 0, hitCd: 0.4,
    spawnT: o.instant ? 0 : 0.55, st: 0, t: W.rng.range(0, 10), fdx: 0, fdy: 0, zone: o.zone === undefined ? -1 : o.zone,
    face: 1, tgt: null, ai: {}, dead: false, noDrop: !!o.noDrop,
  };
  W.enemies.push(e);
  if (!o.instant) W.emit('sp', x | 0, y | 0, e.r | 0);
  return e;
}

export function updateEnemy(W, e, dt) {
  if (e.spawnT > 0) { e.spawnT -= dt; return; }
  e.t += dt; e.flash -= dt; e.mark -= dt; e.hitCd -= dt;
  if (e.dotT > 0) {
    e.dotT -= dt; e.dotAcc += dt;
    if (e.dotAcc >= 0.5) { e.dotAcc -= 0.5; W.damageEnemy(e, e.dot * 0.5, e.dotP, false, { quiet: W.rng.next() < 0.6 }); if (e.dead) return; }
  } else e.dot = 0;
  const def = e.def, L = W.L;
  if (e.kx || e.ky) {
    if (def.fly) { e.x += e.kx * dt; e.y += e.ky * dt; } else moveBody(L, e, e.kx * dt, e.ky * dt, e.r * 0.6);
    const f = Math.pow(0.0015, dt); e.kx *= f; e.ky *= f;
    if (Math.abs(e.kx) + Math.abs(e.ky) < 4) e.kx = e.ky = 0;
  }
  if (e.stunT > 0) { e.stunT -= dt; return; }
  let speed = e.speed;
  if (e.slowT > 0) { e.slowT -= dt; speed *= 1 - e.slowF; }
  if (!e.tgt || e.tgt.down || e.tgt.gone || e.tgt.stealth > 0 || (W.tickN + e.id) % 30 === 0) e.tgt = W.nearestPlayer(e.x, e.y);
  AI[def.ai](W, e, dt, speed);
  if (e.dead) return;
  // 接觸傷害
  if (e.dmg > 0 && e.hitCd <= 0 && def.ai !== 'exploder') {
    for (const p of W.players) {
      if (p.down || p.gone) continue;
      const rr = e.r + 13;
      if (dist2(e.x, e.y, p.x, p.y - 6) < rr * rr) { W.damagePlayer(p, e.dmg * (e.st === 2 && (def.ai === 'charger' || def.boss) ? 1.3 : def.boss ? 0.55 : 1)); e.hitCd = def.boss ? 1 : 0.7; break; }
    }
  }
  // 互相推擠
  if (!def.boss && !def.structure && (W.tickN + e.id) % 2 === 0) {
    let px = 0, py = 0;
    W.hash.query(e.x, e.y, e.r * 0.7, (o) => {
      if (o === e || o.def.structure) return;
      const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy) || 0.01, ov = (e.r + o.r) * 0.85 - d;
      if (ov > 0) { const m = o.def.boss ? 1 : 0.5; px += dx / d * ov * m; py += dy / d * ov * m; }
    });
    if (px || py) { px = Math.max(-4, Math.min(4, px)); py = Math.max(-4, Math.min(4, py)); if (def.fly) { e.x += px; e.y += py; } else moveBody(L, e, px, py, e.r * 0.6); }
  }
}

function seek(W, e, dt, speed, tx, ty) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  if (e.def.fly) { e.x += dx / d * speed * dt; e.y += dy / d * speed * dt; }
  else {
    if ((W.tickN + e.id) % 6 === 0 || e.fdx === undefined) e.fd = W.flow.dir(e);
    if (d < 64 || e.fd <= 2 || (!e.fdx && !e.fdy)) moveBody(W.L, e, dx / d * speed * dt, dy / d * speed * dt, e.r * 0.6);
    else moveBody(W.L, e, e.fdx * speed * dt, e.fdy * speed * dt, e.r * 0.6);
  }
  if (Math.abs(dx) > 6) e.face = dx > 0 ? 1 : -1;
  return d;
}
function wander(W, e, dt, speed) {
  const a = e.t * 0.7 + e.id;
  if (e.def.fly) { e.x += Math.cos(a) * speed * 0.3 * dt; e.y += Math.sin(a) * speed * 0.3 * dt; } else moveBody(W.L, e, Math.cos(a) * speed * 0.3 * dt, Math.sin(a) * speed * 0.3 * dt, e.r * 0.6);
}
function shootAt(W, e, kind, a, speed, dmg, o) {
  return W.shoot(null, Object.assign({ kind, team: 1, x: e.x, y: e.y - e.r * 0.5, a, speed, dmg, life: 4, r: 8 }, o));
}

const AI = {
  chase(W, e, dt, sp) { if (!e.tgt) return wander(W, e, dt, sp); seek(W, e, dt, sp, e.tgt.x, e.tgt.y); },
  swarm(W, e, dt, sp) {
    if (!e.tgt) return wander(W, e, dt, sp);
    const p = e.tgt, w = Math.sin(e.t * 5 + e.id) * 46;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    seek(W, e, dt, sp, p.x + (-dy / d) * w * Math.min(1, d / 120), p.y + (dx / d) * w * Math.min(1, d / 120));
  },
  shooter(W, e, dt, sp) {
    if (!e.tgt) return wander(W, e, dt, sp);
    const p = e.tgt, def = e.def, d = Math.hypot(p.x - e.x, p.y - e.y);
    const ai = e.ai;
    if (ai.t === undefined) ai.t = W.rng.range(1, def.shotCd);
    if (e.st === 1) {                       // 預備動作
      ai.w -= dt;
      if (ai.w <= 0) {
        e.st = 0; ai.t = def.shotCd * W.rng.range(0.85, 1.15);
        const a = Math.atan2(p.y - 12 - e.y, p.x - e.x), n = (def.shotCount || 1) + (e.elite ? 2 : 0);
        for (let i = 0; i < n; i++) shootAt(W, e, def.proj, a + (n > 1 ? (i / (n - 1) - 0.5) * 0.5 : 0), def.shotSpeed, e.dmg);
      }
      return;
    }
    if (d > def.shotRange * 0.85) seek(W, e, dt, sp, p.x, p.y);
    else if (d < def.shotRange * 0.45) { const dx = e.x - p.x, dy = e.y - p.y; if (def.fly) { e.x += dx / d * sp * 0.6 * dt; e.y += dy / d * sp * 0.6 * dt; } else moveBody(W.L, e, dx / d * sp * 0.6 * dt, dy / d * sp * 0.6 * dt, e.r * 0.6); }
    e.face = p.x > e.x ? 1 : -1;
    ai.t -= dt;
    if (ai.t <= 0 && d < def.shotRange * 1.2) { e.st = 1; ai.w = 0.5; }
  },
  charger(W, e, dt, sp) {
    if (!e.tgt) return wander(W, e, dt, sp);
    const p = e.tgt, ai = e.ai;
    if (e.st === 0) {
      const d = seek(W, e, dt, sp, p.x, p.y);
      ai.cd = (ai.cd || 0) - dt;
      if (d < 290 && d > 70 && ai.cd <= 0) { e.st = 1; ai.w = 0.7; }
    } else if (e.st === 1) {
      ai.a = Math.atan2(p.y - e.y, p.x - e.x); e.face = p.x > e.x ? 1 : -1;
      ai.w -= dt; if (ai.w <= 0) { e.st = 2; ai.w = 0.55; }
    } else if (e.st === 2) {
      const hit = moveBody(W.L, e, Math.cos(ai.a) * sp * 4.6 * dt, Math.sin(ai.a) * sp * 4.6 * dt, e.r * 0.6);
      ai.w -= dt; if (ai.w <= 0 || hit) { e.st = 3; ai.w = 0.7; }
    } else { ai.w -= dt; if (ai.w <= 0) { e.st = 0; ai.cd = 1.6; } }
  },
  exploder(W, e, dt, sp) {
    if (!e.tgt) return wander(W, e, dt, sp);
    if (e.st === 1) {
      e.ai.w -= dt;
      if (e.ai.w <= 0) {
        W.playersIn(e.x, e.y, e.def.boomR, (p) => W.damagePlayer(p, e.dmg));
        W.emit('b', e.x | 0, e.y | 0, e.def.boomR, 3);
        W.killEnemy(e, null);
      }
      return;
    }
    const d = seek(W, e, dt, sp, e.tgt.x, e.tgt.y);
    if (d < 48) { e.st = 1; e.ai.w = 0.75; }
  },
  blink(W, e, dt, sp) {
    if (!e.tgt) return wander(W, e, dt, sp);
    const p = e.tgt, d = seek(W, e, dt, sp, p.x, p.y);
    e.ai.t = (e.ai.t === undefined ? W.rng.range(2, 4) : e.ai.t) - dt;
    if (e.ai.t <= 0 && d > 190) {
      e.ai.t = 3.6;
      for (let i = 0; i < 6; i++) {
        const a = W.rng.range(0, TAU), x = p.x + Math.cos(a) * 120, y = p.y + Math.sin(a) * 120;
        if (!solidAt(W.L, x, y)) { W.emit('r', e.x | 0, e.y | 0, 30, 6); e.x = x; e.y = y; e.spawnT = 0.45; W.emit('sp', x | 0, y | 0, e.r | 0); break; }
      }
    }
  },
  flee(W, e, dt, sp) {
    const p = W.nearestPlayer(e.x, e.y, true);
    e.ai.life = (e.ai.life === undefined ? 16 : e.ai.life) - dt;
    if (e.ai.life <= 0) { e.dead = true; W.emit('r', e.x | 0, e.y | 0, 30, 0); W.ctl.onKill(e, true); return; }
    e.ai.w = (e.ai.w || 0) - dt;
    if (e.ai.w <= 0) { e.ai.w = 0.5; const base = p ? Math.atan2(e.y - p.y, e.x - p.x) : 0; e.ai.a = base + W.rng.range(-1.1, 1.1); }
    const near = p && dist2(e.x, e.y, p.x, p.y) < 320 * 320;
    const hit = moveBody(W.L, e, Math.cos(e.ai.a) * sp * (near ? 1 : 0.4) * dt, Math.sin(e.ai.a) * sp * (near ? 1 : 0.4) * dt, e.r * 0.6);
    if (hit) e.ai.a += 1.9;
    e.face = Math.cos(e.ai.a) > 0 ? 1 : -1;
  },
  nest(W, e, dt) {
    e.ai.t = (e.ai.t === undefined ? 1.5 : e.ai.t) - dt;
    if (e.ai.t > 0) return;
    e.ai.t = 3.2 / Math.sqrt(W.rateMul);
    if (W.enemies.length > 240) return;
    const a = W.rng.range(0, TAU), x = e.x + Math.cos(a) * 44, y = e.y + Math.sin(a) * 44;
    if (!solidAt(W.L, x, y)) spawnEnemy(W, W.rng.weighted(W.stage.pool), x, y, { zone: e.zone });
  },

  // ── 首領：垃圾巨像 ──
  boss_golem(W, e, dt, sp) {
    const ai = e.ai, p2 = e.hp < e.maxHp * 0.5;
    if (!e.tgt) return;
    if (ai.q && ai.q.length) { ai.q[0].t -= dt; if (ai.q[0].t <= 0) ai.q.shift().fn(); }
    seek(W, e, dt, sp * (p2 ? 1.35 : 1), e.tgt.x, e.tgt.y);
    ai.cd = (ai.cd === undefined ? 2.5 : ai.cd) - dt;
    if (ai.cd > 0) return;
    ai.cd = p2 ? 3 : 4.2; ai.n = (ai.n || 0) + 1; ai.q = ai.q || [];
    const m = ai.n % 3;
    if (m === 1) {
      for (const p of W.alive()) { warn(W, p.x, p.y, 105, 1.0, e.dmg * 1.2); if (p2) for (let i = 0; i < 2; i++) warn(W, p.x + W.rng.range(-170, 170), p.y + W.rng.range(-170, 170), 85, 1.25, e.dmg * 1.2); }
    } else if (m === 2) {
      const volley = (off) => { for (let i = 0; i < 14; i++) shootAt(W, e, 'e_trash', off + i * TAU / 14, 175, e.dmg * 0.6, { r: 10 }); W.emit('sh', 4); };
      volley(0); ai.q.push({ t: 0.55, fn: () => volley(0.2) }); if (p2) ai.q.push({ t: 0.55, fn: () => volley(0.4) });
    } else {
      for (let i = 0; i < (p2 ? 8 : 5); i++) { const a = i * 1.26; summon(W, e, i % 4 === 3 ? 'bag' : 'slime', a, 80); }
    }
  },
  // ── 首領：鐵籠拳王 ──
  boss_champ(W, e, dt, sp) {
    const ai = e.ai, p2 = e.hp < e.maxHp * 0.4;
    if (!e.tgt) return;
    const p = e.tgt;
    if (e.st === 1) {                               // 蓄力
      ai.w -= dt; e.face = Math.cos(ai.a) > 0 ? 1 : -1;
      if (ai.w <= 0) { e.st = 2; ai.w = 0.42; }
      return;
    }
    if (e.st === 2) {                               // 衝刺拳
      const hit = moveBody(W.L, e, Math.cos(ai.a) * 1300 * dt, Math.sin(ai.a) * 1300 * dt, e.r * 0.6);
      ai.w -= dt;
      if (ai.w <= 0 || hit) { e.st = 0; W.emit('sh', 8); warn(W, e.x, e.y, 150, 0.35, e.dmg); if (ai.chain > 0) { ai.chain--; startDash(W, e, 0.5); } }
      return;
    }
    if (ai.spin > 0) {                              // 鎖鏈彈幕
      ai.spin -= dt; ai.sa = (ai.sa || 0) + dt * 2.4; ai.st = (ai.st || 0) - dt;
      if (ai.st <= 0) { ai.st = 0.13; for (let i = 0; i < (p2 ? 3 : 2); i++) shootAt(W, e, 'e_chain', ai.sa + i * TAU / (p2 ? 3 : 2), 200, e.dmg * 0.55); }
      seek(W, e, dt, sp * 0.4, p.x, p.y);
      return;
    }
    seek(W, e, dt, sp, p.x, p.y);
    ai.cd = (ai.cd === undefined ? 2.5 : ai.cd) - dt;
    if (ai.cd > 0) return;
    ai.cd = p2 ? 2.8 : 3.8; ai.n = (ai.n || 0) + 1;
    const m = ai.n % 3;
    if (m === 1) { ai.chain = p2 ? 2 : 0; startDash(W, e, 0.75); }
    else if (m === 2) { warn(W, e.x, e.y, 235, 0.9, e.dmg * 1.5); ai.q = 1; W.addZone({ kind: 'shadow', x: e.x, y: e.y, r: 0, dur: 0.95, tick: 9, team: 1, onEnd: (W2) => { if (!e.dead) for (let i = 0; i < 12; i++) shootAt(W2, e, 'e_chain', i * TAU / 12, 210, e.dmg * 0.55); } }); }
    else ai.spin = 3;
  },
  // ── 首領：核心守門者 ──
  boss_warden(W, e, dt, sp) {
    const ai = e.ai, hpP = e.hp / e.maxHp, ph = hpP < 0.33 ? 2 : hpP < 0.66 ? 1 : 0;
    if (!e.tgt) return;
    const p = e.tgt;
    seek(W, e, dt, sp * (ai.spiral > 0 ? 0.3 : 1), p.x, p.y);
    if (ai.spiral > 0) {
      ai.spiral -= dt; ai.sa = (ai.sa || 0) + dt * (1.5 + ph * 0.3); ai.st = (ai.st || 0) - dt;
      if (ai.st <= 0) { ai.st = 0.11; for (let i = 0; i < 3 + ph; i++) shootAt(W, e, 'e_orb', ai.sa + i * TAU / (3 + ph), 190, e.dmg * 0.5); }
      return;
    }
    ai.cd = (ai.cd === undefined ? 2 : ai.cd) - dt;
    if (ai.cd > 0) return;
    ai.cd = 3.6 - ph * 0.5; ai.n = (ai.n || 0) + 1;
    const m = ai.n % 4;
    if (m === 1) ai.spiral = 3.2;
    else if (m === 2) {
      const base = W.rng.range(0, TAU), n = 5 + ph;
      for (let v = 0; v <= (ph ? 1 : 0); v++) for (let i = 0; i < n; i++) W.addZone({ kind: 'e_beam', team: 1, x: e.x, y: e.y, a: base + i * TAU / n + v * Math.PI / n, len: 900, w: 34, delay: 1.1 + v * 0.7, dur: 1.9 + v * 0.7, tick: 0.12, dmg: e.dmg * 0.9 });
    } else if (m === 3) {
      const z = W.L.zones[e.zone];
      if (z) { for (let i = 0; i < 8; i++) { const x = z.cx + W.rng.range(-360, 360), y = z.cy + W.rng.range(-260, 260); if (!solidAt(W.L, x, y)) { W.emit('r', e.x | 0, e.y | 0, 80, 6); e.x = x; e.y = y; W.emit('r', x | 0, y | 0, 80, 6); break; } } }
      for (let i = 0; i < 18; i++) shootAt(W, e, 'e_orb', i * TAU / 18, 165, e.dmg * 0.5);
      for (let i = 0; i < 5 + ph * 2; i++) summon(W, e, i % 3 ? 'bug' : 'virus', i * 1.3, 90);
    } else {
      for (const q of W.alive()) for (let i = 0; i < 3 + ph; i++) warn(W, q.x + (i ? W.rng.range(-140, 140) : 0), q.y + (i ? W.rng.range(-140, 140) : 0), 90, 0.9 + i * 0.3, e.dmg * 1.3);
    }
  },
};

function warn(W, x, y, r, delay, dmg) { return W.addZone({ kind: 'e_warn', team: 1, x, y, r, delay, dur: delay + 0.2, tick: 9, dmg, once: true }); }
function summon(W, e, id, a, d) { const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d; if (!solidAt(W.L, x, y) && W.enemies.length < 260) spawnEnemy(W, id, x, y, { zone: e.zone, noDrop: false }); }
function startDash(W, e, wind) {
  const p = e.tgt || W.nearestPlayer(e.x, e.y, true);
  if (!p) return;
  e.st = 1; e.ai.w = wind; e.ai.a = Math.atan2(p.y - e.y, p.x - e.x);
  W.addZone({ kind: 'e_beam', team: 1, x: e.x, y: e.y, a: e.ai.a, len: 560, w: e.r * 2, delay: 99, dur: wind + 0.3, tick: 9, dmg: 0 });
}
