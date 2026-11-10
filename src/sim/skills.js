// 主動技能與寶具。key 對應 data/characters.js 的 skill.id / ult.id。
// 新角色的技能直接在這裡加一個 (W, p) => {...} 即可，盡量用現成的積木（aoe / addZone / shoot / dash / addBuff）。
import { TAU, dist2 } from '../core/util.js';
import { addBuff, dash, moveDir } from './player.js';
import { swing, beamUpd, lob, plantMine } from './weapons.js';
import { solidAt } from './levelgen.js';

const wdmg = (p) => p.weapons[0].s.dmg;
const allies = (W, p, r, cb) => { for (const q of W.players) if (!q.gone && !q.down && (!r || dist2(p.x, p.y, q.x, q.y) <= r * r)) cb(q); };
const ring = (W, p, n, kind, o, off = 0) => { for (let i = 0; i < n; i++) W.shoot(p, Object.assign({ kind, a: off + i * TAU / n }, o)); };
const clusterOrAhead = (W, p, r, d = 160) => { const c = W.cluster(p.x, p.y, r); return c ? { x: c.x, y: c.y } : { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d }; };
// 在一段時間內重複執行（掛在玩家身上的隱形區域）
const channel = (W, p, dur, every, fn, onEnd) => W.addZone({ kind: 'shadow', owner: p, follow: p, r: 0, dur, tick: every, tk: every, upd(W2, z, dt) { if (p.down) { z.dead = true; return; } z.tk -= dt; if (z.tk <= 0) { z.tk += every; fn(W2, z); } }, onEnd });

export const SKILLS = {
  // ── 老劉 ──
  ll_charge(W, p) {
    const a = moveDir(p);
    dash(p, a, 280, 0.22, { dmg: wdmg(p) * 2.5, hitR: 60, hitOpt: { kb: 200 } });
    W.emit('s', p.x | 0, (p.y - 14) | 0, Math.round(a * 100), 150, 200, 0);
  },
  ll_storm(W, p) {
    const d = wdmg(p) * 2.2;
    for (let k = 0; k < 2; k++) channel(W, p, 0.05 + k * 0.5, 0.04 + k * 0.5, (W2) => { ring(W2, p, 12, 'wave', { speed: 520, dmg: d, pierce: 99, life: 1.1, r: 34, kb: 120 }, k * 0.26); W2.emit('sh', 6); });
  },
  // ── 夏 ──
  xia_whirl(W, p) {
    addBuff(p, 'whirl', { t: 3, speed: 0.2 });
    W.addZone({ kind: 'whirl', owner: p, follow: p, r: 135 * p.st.area, dur: 3, tick: 0.22, dmg: wdmg(p) * 0.55, hitOpt: { kb: 60 } });
  },
  xia_quake(W, p) {
    const x = p.x + Math.cos(p.aim) * 90, y = p.y + Math.sin(p.aim) * 90;
    W.addZone({ kind: 'e_slam', owner: p, x, y, r: 380, dur: 0.45, delay: 0.4, tick: 9, onStart(W2) {
      W2.aoe(x, y, 380, wdmg(p) * 9, p, { stun: 2, kb: 300, fx: 9 }); W2.emit('sh', 18);
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; W2.addZone({ kind: 'fire', owner: p, x: x + Math.cos(a) * 180, y: y + Math.sin(a) * 180, r: 90, dur: 5, tick: 0.4, dmg: wdmg(p) * 0.3, hitOpt: { quiet: true } }); }
    } });
  },
  // ── 狗企 ──
  gq_stealth(W, p) {
    p.stealth = 3; addBuff(p, 'stealth', { t: 4.5, speed: 0.4, dmg: 1 });
    W.emit('r', p.x | 0, p.y | 0, 60, 0);
  },
  gq_empire(W, p) {
    W.addZone({ kind: 'garbage', owner: p, x: p.x, y: p.y, r: 300, dur: 10, tick: 0.5, dmg: wdmg(p) * 0.9, hitOpt: { slow: 0.5, slowDur: 0.8, dot: 10, dotDur: 3, quiet: true } });
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10; minion(W, p, 'rat', p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 50, { life: 12, speed: 300, dmg: wdmg(p) * 1.2, cd: 0.5, dot: 8 }); }
    W.emit('sh', 10);
  },
  // ── 庭哥 ──
  tg_dash(W, p) {
    dash(p, moveDir(p), 200, 0.16, { dmg: wdmg(p) * 3, hitR: 52, hitOpt: { kb: 120, stun: 0.5 } });
    p.invuln = Math.max(p.invuln, 0.8);
    addBuff(p, 'focus', { t: 2.5, haste: 0.35 });
  },
  tg_limit(W, p) {
    addBuff(p, 'limit', { t: 8, haste: 1.2, speed: 0.3, dmg: 0.5, ult: 1, onEnd(W2, q) { if (q.down) return; W2.aoe(q.x + Math.cos(q.aim) * 60, q.y + Math.sin(q.aim) * 60, 270, wdmg(q) * 22, q, { kb: 600, stun: 1.5, fx: 9 }); W2.emit('sh', 20); } });
    W.emit('r', p.x | 0, p.y | 0, 200, 1);
  },
  // ── 少年 ──
  sn_homerun(W, p) {
    swing(W, p, p.aim, 160 * p.st.area, 2.6, wdmg(p) * 4, { kb: 750, stun: 0.6, fx: 4 });
    for (let i = -1; i <= 1; i++) W.shoot(p, { kind: 'baseball', a: p.aim + i * 0.22, speed: 820, dmg: wdmg(p) * 2.2, bounce: 4, life: 1.4, r: 10, kb: 200 });
    W.emit('sh', 8);
  },
  sn_slam(W, p) {
    channel(W, p, 3, 0.075, (W2) => {
      const t = W2.randomEnemies(p.x, p.y, 560, 1)[0];
      const tx = t ? t.x : p.x + W2.rng.range(-380, 380), ty = t ? t.y : p.y + W2.rng.range(-260, 260);
      lob(W2, p, 'baseball', tx, ty, 0.35, (W3) => W3.aoe(tx, ty, 80, wdmg(p) * 3.4, p, { kb: 260, fx: 1 }), tx + W2.rng.range(-60, 60), ty - 500);
    });
  },
  // ── 嗯雞抖 ──
  ejd_charge(W, p) {
    W.shoot(p, { kind: 'laserbolt', a: p.aim, speed: 620, dmg: wdmg(p) * 6, aoe: 150 * p.st.area, aoeDmg: wdmg(p) * 14, life: 1.2, r: 18, fx: 10, kb: 200 });
    W.emit('sh', 6);
  },
  ejd_aurora(W, p) {
    addBuff(p, 'aurora', { t: 4, ult: 1 });
    W.addZone({ kind: 'beam', owner: p, follow: p, oy: -16, a: p.aim, len: 900, w: 90, dur: 4, tick: 0.1, dmg: wdmg(p) * 3, burst: 1, aux: 1, turn: 2.6, upd: beamUpd });
    channel(W, p, 4, 0.25, (W2) => W2.emit('sh', 4));
  },
  // ── 營長 ──
  yz_suppress(W, p) { addBuff(p, 'suppress', { t: 4, haste: 0.01 }); const w = p.weapons[0]; w.heat = 1; },
  yz_airstrike(W, p) {
    const c = clusterOrAhead(W, p, 520, 260), a = p.aim + 1.57, d = wdmg(p) * 26;
    for (let row = -1; row <= 1; row++) for (let i = -3; i <= 3; i++) {
      const x = c.x + Math.cos(a) * i * 95 + Math.cos(p.aim) * row * 130, y = c.y + Math.sin(a) * i * 95 + Math.sin(p.aim) * row * 130;
      W.addZone({ kind: 'airstrike', owner: p, x, y, r: 115, delay: 0.7 + (row + 1) * 0.35 + Math.abs(i) * 0.05, dur: 1.9, tick: 9, onStart(W2, z) { W2.aoe(z.x, z.y, z.r, d, p, { fx: 1, kb: 200 }); W2.emit('sh', 5); } });
    }
  },
  // ── 深深 ──
  ss_bind(W, p) {
    const c = clusterOrAhead(W, p, 520);
    W.addZone({ kind: 'runebig', owner: p, x: c.x, y: c.y, r: 175 * p.st.area, delay: 0.4, dur: 3.2, tick: 0.4, dmg: wdmg(p) * 0.8, hitOpt: { stun: 0.5, slow: 0.6, slowDur: 1 } });
  },
  ss_seal(W, p) {
    p.stealth = 6; addBuff(p, 'shadow', { t: 6, speed: 0.25, ult: 1 });
    const z = W.addZone({ kind: 'seal', owner: p, follow: p, r: 420, dur: 6, tick: 0.5, dmg: 0, hitOpt: { slow: 0.4, slowDur: 0.8, quiet: true } });
    channel(W, p, 6, 0.16, (W2) => {
      const t = W2.randomEnemies(p.x, p.y, z.r, 1)[0];
      const x = t ? t.x : p.x + W2.rng.range(-300, 300), y = t ? t.y : p.y + W2.rng.range(-300, 300);
      W2.emit('l', x | 0, (y - 460) | 0, x | 0, y | 0, 3);
      W2.aoe(x, y, 85, wdmg(p) * 4.5, p, { fx: 4 });
    });
  },
  // ── TK哥 ──
  tk_hole(W, p) {
    const c = clusterOrAhead(W, p, 520);
    W.addZone({ kind: 'blackhole', owner: p, x: c.x, y: c.y, r: 190 * p.st.area, dur: 4, tick: 0.1, pull: 210, dmg: wdmg(p) * 0.16, hitOpt: { quiet: true },
      onEnd(W2, z) { W2.aoe(z.x, z.y, z.r * 0.8, wdmg(p) * 9, p, { fx: 11, kb: 300 }); W2.emit('sh', 10); } });
  },
  tk_zero(W, p) {
    const targets = W.enemiesIn(p.x, p.y, 720).slice();
    W.emit('r', p.x | 0, p.y | 0, 720, 6);
    for (const e of targets) { e.mark = 4; e.cnt = 3; }
    let n = 3;
    channel(W, p, 3.1, 1, (W2) => {
      n--;
      for (const e of targets) { if (e.dead) continue; e.cnt = n; if (n > 0) W2.emit('t', e.x | 0, (e.y - 30) | 0, String(n), 4); else { W2.emit('b', e.x | 0, e.y | 0, 50, 11); W2.strike(p, e, wdmg(p) * 12 + (e.def.boss || e.elite ? 0 : e.maxHp * 0.3), { quiet: false }); } }
      if (n <= 0) W2.emit('sh', 16);
    });
  },
  // ── 飛姐 ──
  fj_fan(W, p) {
    const ts = W.enemiesIn(p.x, p.y, 560).slice().sort((a, b) => dist2(p.x, p.y, a.x, a.y) - dist2(p.x, p.y, b.x, b.y)).slice(0, 6);
    ts.forEach((e) => { W.emit('l', p.x | 0, (p.y - 16) | 0, e.x | 0, e.y | 0, 0); W.strike(p, e, wdmg(p) * 2.2, { crit: true, kb: 150 }); });
    const w = p.weapons[0]; w.reload = 0; w.ammo = w.s.mag;
  },
  fj_eye(W, p) {
    const ts = W.enemiesIn(p.x, p.y, 700).slice(0, 40);
    for (const e of ts) { e.mark = 3; e.slowF = 0.7; e.slowT = 1.6; W.emit('t', e.x | 0, (e.y - 26) | 0, '✛', 3); }
    let i = 0;
    channel(W, p, 1.2 + ts.length * 0.04 + 0.1, 0.04, (W2, z) => {
      if (z.t < 1.2) return;
      const e = ts[i++];
      if (!e || e.dead) return;
      W2.emit('l', p.x | 0, (p.y - 16) | 0, e.x | 0, e.y | 0, 0);
      W2.strike(p, e, wdmg(p) * 9, { crit: true });
      W2.emit('sh', 2);
    });
  },
  // ── 哈吉米 ──
  hjm_roll(W, p) { dash(p, moveDir(p), 180, 0.22, {}); addBuff(p, 'roll', { t: 3.2, haste: 0.6 }); },
  hjm_storm(W, p) {
    addBuff(p, 'storm', { t: 6, haste: 0.5, ult: 1 });
    let off = 0;
    channel(W, p, 6, 0.22, (W2) => { off += 0.19; ring(W2, p, 14, 'pistol', { speed: 760, dmg: wdmg(p) * 1.5, life: 0.8, pierce: 1, r: 7, y: p.y - 14 }, off); });
  },
  // ── 望川 ──
  wc_ring(W, p) { ring(W, p, 16, 'knife', { speed: 700, dmg: wdmg(p) * 1.8, pierce: 99, life: 0.7, ret: true, r: 8 }, p.aim); },
  wc_storm(W, p) {
    addBuff(p, 'blade', { t: 5, speed: 0.2, ult: 1 });
    W.addZone({ kind: 'whirl', owner: p, follow: p, r: 220, dur: 5, tick: 0.16, dmg: wdmg(p) * 0.9, aux: 1, hitOpt: { kb: 30, quiet: true } });
    let off = 0;
    channel(W, p, 5, 0.3, (W2) => { off += 0.4; ring(W2, p, 8, 'knife', { speed: 760, dmg: wdmg(p) * 1.4, pierce: 6, life: 0.7, r: 8 }, off); });
  },
  // ── 賴姐姐 ──
  lj_aid(W, p) {
    allies(W, p, 520, (q) => { W.heal(q, q.st.maxHp * 0.35, p); addBuff(q, 'aid', { t: 4, regen: q.st.maxHp * 0.03 }); if (q !== p) W.emit('l', p.x | 0, (p.y - 16) | 0, q.x | 0, (q.y - 16) | 0, 2); W.emit('r', q.x | 0, q.y | 0, 60, 2); });
  },
  lj_revive(W, p) {
    for (const q of W.players) { if (q.gone) continue; if (q.down) { W.revive(q, 0.6, true); W.emit('t', q.x | 0, (q.y - 60) | 0, '起死回生！', 2); } W.heal(q, q.st.maxHp, p); q.invuln = Math.max(q.invuln, 3); W.emit('r', q.x | 0, q.y | 0, 120, 2); }
    W.addZone({ kind: 'heal', owner: p, follow: p, r: 260, dur: 8, tick: 0.5, heal: 14, buff: { t: 1, regen: 2 } });
  },
  // ── 羊弟弟 ──
  yd_party(W, p) {
    W.addZone({ kind: 'grill', owner: p, x: p.x, y: p.y, r: 155 * p.st.area, dur: 8, tick: 0.5, dmg: wdmg(p) * 0.5, heal: 7, buff: { t: 1, haste: 0.2 }, hitOpt: { dot: 8, dotDur: 2, quiet: true } });
  },
  yd_inferno(W, p) {
    W.addZone({ kind: 'fire', owner: p, x: p.x, y: p.y, r: 360, dur: 8, tick: 0.4, dmg: wdmg(p) * 1.5, aux: 1, hitOpt: { dot: 14, dotDur: 3, quiet: true } });
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const g = W.drop('k', p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 80, 30); if (g) { g.src = p; g.buff = 0.2; g.bdmg = 0.15; } }
    allies(W, p, 0, (q) => addBuff(q, 'bbq', { t: 10, dmg: 0.4 }));
    W.emit('sh', 10);
  },
  // ── ALLEN ──
  al_freeze(W, p) {
    W.hash.query(p.x, p.y, 310 * p.st.area, (e) => W.strike(p, e, wdmg(p) * 2, { stun: 2.8, mark: 4 }));
    W.emit('r', p.x | 0, p.y | 0, (310 * p.st.area) | 0, 3);
  },
  al_buddha(W, p) {
    W.addZone({ kind: 'bell', owner: p, follow: p, r: 800, dur: 1.2, tick: 9 });
    W.hash.query(p.x, p.y, 800, (e) => W.strike(p, e, wdmg(p) * 14, { stun: 5, mark: 5 }));
    allies(W, p, 0, (q) => { q.shield = Math.max(q.shield, 40 + q.st.maxHp * 0.3 * p.st.heal); addBuff(q, 'buddha', { t: 6, regen: 4 }); W.emit('r', q.x | 0, q.y | 0, 80, 3); });
    W.emit('sh', 14);
  },
  // ── 跳跳 ──
  tt_leap(W, p) {
    const a = moveDir(p);
    let tx = p.x, ty = p.y;
    for (let d = 250; d >= 0; d -= 25) { const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (!solidAt(W.L, x, y) && !solidAt(W.L, x + 12, y) && !solidAt(W.L, x - 12, y)) { tx = x; ty = y; break; } }
    p.jump = { t: 0, dur: 0.5, sx: p.x, sy: p.y, tx, ty, h: 90, onLand(W2, q) {
      const w = q.weapons[0];
      W2.aoe(q.x, q.y, 135 * q.st.area, w.s.dmg * 1.6, q, { stun: 1, kb: 260, fx: 5 }); W2.emit('sh', 8);
      for (let i = 0; i < 5; i++) { const an = i * TAU / 5 + 0.3, x = q.x + Math.cos(an) * 85, y = q.y + Math.sin(an) * 85; if (!solidAt(W2.L, x, y)) (w.mines || (w.mines = [])).push(plantMine(W2, q, x, y, w.s)); }
    } };
  },
  tt_party(W, p) {
    addBuff(p, 'party', { t: 4, speed: 0.3, ult: 1 });
    channel(W, p, 4, 0.11, (W2) => {
      const t = W2.rng.chance(0.7) ? W2.randomEnemies(p.x, p.y, 440, 1)[0] : null;
      const a = W2.rng.range(0, TAU), d = W2.rng.range(60, 420);
      const tx = t ? t.x : p.x + Math.cos(a) * d, ty = t ? t.y : p.y + Math.sin(a) * d;
      lob(W2, p, 'grenade', tx, ty, 0.5, (W3) => { W3.aoe(tx, ty, 105, wdmg(p) * 2.6, p, { fx: 12, kb: 200 }); W3.emit('sh', 3); });
    });
  },
  // ── 起秋 ──
  qq_morale(W, p) {
    allies(W, p, 620, (q) => { addBuff(q, 'morale', { t: 6, dmg: 0.3, haste: 0.25, speed: 0.2 }); W.emit('r', q.x | 0, q.y | 0, 70, 1); });
    W.emit('r', p.x | 0, p.y | 0, 620, 4);
  },
  qq_amp(W, p) {
    allies(W, p, 0, (q) => { addBuff(q, 'amp', { t: 10, dmg: 0.7, haste: 0.5, ult: 1 }); q.skillCd = 0; W.heal(q, q.st.maxHp * 0.25, p); W.emit('r', q.x | 0, q.y | 0, 110, 1); });
    W.emit('sh', 8);
  },
  // ── 貓貓蟲 ──
  mm_mark(W, p) {
    const c = clusterOrAhead(W, p, 520), w = p.weapons[0];
    W.addZone({ kind: 'mark', owner: p, x: c.x, y: c.y, r: 165 * p.st.area, dur: 5, tick: 0.4, dmg: 0, hitOpt: { mark: 0.6, quiet: true } });
    (w.ds || []).forEach((d, i) => { for (let k = 0; k < 4; k++) lob(W, p, 'missile', c.x + W.rng.range(-110, 110), c.y + W.rng.range(-110, 110), 0.5 + k * 0.18 + i * 0.05, (W2, pr) => W2.aoe(pr.x, pr.y, 70, w.s.dmg * 5, p, { fx: 1 }), d.ent.x, d.ent.y); });
  },
  mm_swarm(W, p) { addBuff(p, 'swarm', { t: 10, ult: 1 }); W.emit('r', p.x | 0, p.y | 0, 160, 0); },
  // ── 小順子 ──
  xs_supply(W, p) {
    allies(W, p, 520, (q) => { W.heal(q, q.st.maxHp * 0.18, p); addBuff(q, 'supply', { t: 4, speed: 0.25 }); W.emit('r', q.x | 0, q.y | 0, 60, 2); });
    addBuff(p, 'catrage', { t: 5 });
  },
  xs_lion(W, p) {
    const d = wdmg(p);
    const lion = minion(W, p, 'lion', p.x + Math.cos(p.aim) * 60, p.y + Math.sin(p.aim) * 60, { life: 14, speed: 330, dmg: d * 7, cd: 0.6, aoe: 95, r: 30 });
    lion.roarT = 0.3;
    const base = lion.upd;
    lion.upd = (W2, s, dt) => {
      base(W2, s, dt);
      s.roarT -= dt;
      if (s.roarT <= 0) { s.roarT = 4; W2.hash.query(s.x, s.y, 270, (e) => W2.strike(p, e, d * 2, { stun: 1.3, kb: 200, sx: s.x, sy: s.y })); W2.emit('r', s.x | 0, s.y | 0, 270, 1); W2.emit('sh', 7); }
      W2.playersIn(s.x, s.y, 260, (q) => addBuff(q, 'lion', { t: 0.6, dmg: 0.2 }));
    };
    W.emit('sh', 12);
  },
};

// 通用近戰召喚物：追最近的敵人並撲咬
export function minion(W, p, kind, x, y, o) {
  const s = W.addSummon(Object.assign({ kind, owner: p, x, y, bt: 0, r: 12 }, o));
  s.upd = (W2, m, dt) => {
    m.bt -= dt;
    const tgt = W2.nearestEnemy(m.x, m.y, 420) || W2.nearestEnemy(p.x, p.y, 500);
    let gx = p.x, gy = p.y, reach = 60;
    if (tgt) { gx = tgt.x; gy = tgt.y; reach = tgt.r + m.r; }
    const dx = gx - m.x, dy = gy - m.y, dd = Math.hypot(dx, dy) || 1;
    if (dd > reach) { const mv = Math.min(dd - reach + 1, m.speed * dt); m.x += dx / dd * mv; m.y += dy / dd * mv; m.st = 1; } else m.st = 0;
    if (Math.abs(dx) > 4) m.face = dx > 0 ? 1 : -1;
    if (tgt && dd <= reach + 8 && m.bt <= 0) {
      m.bt = m.cd; m.st = 2;
      if (m.aoe) W2.aoe(tgt.x, tgt.y, m.aoe, m.dmg, p, { noFx: true, kb: 120, sx: m.x, sy: m.y }); else W2.strike(p, tgt, m.dmg, { dot: m.dot, dotDur: 3, kb: 40, sx: m.x, sy: m.y });
      W2.emit('s', m.x | 0, m.y | 0, Math.round(Math.atan2(dy, dx) * 100), m.aoe ? 90 : 30, 180, 6);
    }
  };
  return s;
}
