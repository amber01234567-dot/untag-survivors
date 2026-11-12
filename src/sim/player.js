import { CHARS } from '../data/characters.js';
import { WEAPONS, SUB_WEAPONS, weaponStats } from '../data/weapons.js';
import { PASSIVES, emptyBonus } from '../data/upgrades.js';
import { moveBody, solidAt } from './levelgen.js';
import { dist2 } from '../core/util.js';
import { BEH } from './weapons.js';
import { SKILLS } from './skills.js';
import { BUFF_BITS } from './const.js';

export function makePlayer(W, info, slot) {
  const def = CHARS[info.charId] || CHARS.tingge;
  const sp = W.L.spawn, ang = slot * 1.57 + 0.78;
  const p = {
    id: info.id, slot, name: info.name || 'P' + (slot + 1), charId: def.id, def,
    x: sp.x + Math.cos(ang) * 46, y: sp.y + Math.sin(ang) * 46,
    in: { mx: 0, my: 0, k: 0 }, ack: 0,
    face: 1, aim: 0, moving: false,
    bonus: Object.assign(emptyBonus(), info.bonus || {}),
    passives: {}, weapons: [], buffs: {},
    hp: 1, shield: 0, st: null,
    skillCd: 1.5, ult: 0, ultMax: def.ult.charge,
    down: false, gone: false, reviveP: 0, invuln: 1.5, hurt: 0, stealth: 0,
    atkN: 0, atkA: 0, castN: 0, dash: null, jump: null, jumpZ: 0,
    stats: { dmg: 0, kills: 0, heal: 0, taken: 0, downs: 0 },
  };
  p.revives = p.bonus.revives | 0; p.rerolls = p.bonus.rerolls | 0;
  recalc(p);
  p.hp = p.st.maxHp;
  addWeapon(p, def.weapon);
  recalc(p); p.hp = p.st.maxHp;
  return p;
}

export function recalc(p) {
  const d = p.def, b = p.bonus, old = p.st ? p.st.maxHp : 0;
  const s = {
    maxHp: d.hp * (1 + b.hp), speed: d.speed * (1 + b.speed), dmg: 1 + b.dmg, cd: 1 - b.cd, area: 1 + (b.area || 0),
    crit: 0.05 + b.crit, critDmg: 2, armor: d.armor + b.armor, regen: b.regen, magnet: 100 * (1 + b.magnet),
    xp: 1 + b.xp, heal: 1, ultRate: 1 + b.ult,
  };
  for (const id in p.passives) PASSIVES[id].apply(s, p.passives[id]);
  for (const w of p.weapons) { if (w.s.armorAdd) s.armor += w.s.armorAdd; if (w.s.hpMul) s.maxHp *= w.s.hpMul; }
  s.maxHp = Math.round(s.maxHp);
  p.st = s;
  if (old && s.maxHp > old) p.hp += s.maxHp - old;
  if (p.hp > s.maxHp) p.hp = s.maxHp;
}

let uid = 1;
export function addWeapon(p, id) {
  const def = WEAPONS[id];
  const w = { uid: uid++, def, level: 1, s: weaponStats(def, 1), t: 0.4, n: 0 };
  p.weapons.push(w);
  return w;
}

// ── 增益 ──
export function addBuff(p, key, b) {
  const cur = p.buffs[key];
  if (cur && cur.t > b.t && (cur.dmg || 0) >= (b.dmg || 0)) return;
  p.buffs[key] = Object.assign({}, b);
}
export function bDmg(p) { let m = 1; for (const k in p.buffs) m *= 1 + (p.buffs[k].dmg || 0); return m; }
export function bHaste(p) { let m = 1; for (const k in p.buffs) m *= 1 + (p.buffs[k].haste || 0); return m; }
function bSpeed(p) { let m = 1; for (const k in p.buffs) m *= 1 + (p.buffs[k].speed || 0); return m; }
export function buffBits(p) {
  let f = 0;
  for (const k in p.buffs) { const b = p.buffs[k]; if (b.dmg) f |= BUFF_BITS.dmg; if (b.haste) f |= BUFF_BITS.haste; if (b.speed) f |= BUFF_BITS.speed; if (b.regen) f |= BUFF_BITS.heal; if (b.ult) f |= BUFF_BITS.ult; }
  if (p.shield > 0) f |= BUFF_BITS.shield;
  if (p.invuln > 0.05) f |= BUFF_BITS.invuln;
  if (p.stealth > 0) f |= BUFF_BITS.stealth;
  return f;
}

// 位移技能
export function dash(p, a, distance, time, o) {
  p.dash = Object.assign({ vx: Math.cos(a) * distance / time, vy: Math.sin(a) * distance / time, t: time, hit: new Set() }, o);
  if (!o || o.invuln !== false) p.invuln = Math.max(p.invuln, time + 0.15);
}
export function moveDir(p) { return p.moving ? Math.atan2(p.in.my, p.in.mx) : p.aim; }

export function updatePlayer(W, p, dt) {
  const L = W.L;
  if (p.down) {
    // 隊友靠近 3 秒可救起
    let near = false;
    for (const q of W.players) if (q !== p && !q.down && !q.gone && dist2(p.x, p.y, q.x, q.y) < 80 * 80) near = true;
    p.reviveP = Math.max(0, p.reviveP + (near ? dt / 3 : -dt / 2));
    if (p.reviveP >= 1) { W.revive(p, 0.4); W.emit('t', p.x | 0, (p.y - 60) | 0, '復活！', 2); W.emit('a', 'revive'); }
    return;
  }
  p.invuln -= dt; p.hurt -= dt; if (p.stealth > 0) p.stealth -= dt;
  let regen = p.st.regen;
  for (const k in p.buffs) { const b = p.buffs[k]; b.t -= dt; if (b.regen) regen += b.regen; if (b.t <= 0) { const end = b.onEnd; delete p.buffs[k]; if (end) end(W, p); } }
  if (regen > 0 && p.hp < p.st.maxHp) p.hp = Math.min(p.st.maxHp, p.hp + regen * dt);

  // 移動
  let mx = p.in.mx, my = p.in.my;
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  p.moving = ml > 0.1;
  if (p.jump) {
    const j = p.jump; j.t += dt;
    const k = Math.min(1, j.t / j.dur);
    p.x = j.sx + (j.tx - j.sx) * k; p.y = j.sy + (j.ty - j.sy) * k; p.jumpZ = Math.sin(k * Math.PI) * j.h;
    if (k >= 1) { p.jump = null; p.jumpZ = 0; j.onLand && j.onLand(W, p); }
  } else if (p.dash) {
    const d = p.dash;
    moveBody(L, p, d.vx * dt, d.vy * dt, 11);
    if (d.dmg) W.hash.query(p.x, p.y, d.hitR || 40, (e) => { if (d.hit.has(e.id)) return; d.hit.add(e.id); W.strike(p, e, d.dmg, d.hitOpt); });
    d.t -= dt;
    if (d.t <= 0) { p.dash = null; d.onEnd && d.onEnd(W, p); }
  } else if (p.moving && !p.rooted) {
    const sp = p.st.speed * bSpeed(p);
    moveBody(L, p, mx * sp * dt, my * sp * dt, 11);
  }

  // 自動瞄準最近的敵人
  const tgt = W.nearestEnemy(p.x, p.y, 640);
  if (tgt) p.aim = Math.atan2(tgt.y - p.y, tgt.x - p.x);
  else if (p.moving) p.aim = Math.atan2(my, mx);
  if (p.moving && Math.abs(mx) > 0.15) p.face = mx > 0 ? 1 : -1;
  else if (tgt && !p.moving) p.face = Math.cos(p.aim) >= 0 ? 1 : -1;

  if (!p.jump) for (const w of p.weapons) BEH[w.def.beh](W, p, w, dt);

  // 主動技能 / 寶具
  p.skillCd -= dt;
  if ((p.in.k & 1) && p.skillCd <= 0 && !p.jump && !p.dash) {
    p.skillCd = p.def.skill.cd * p.st.cd; p.castN++;
    W.emit('sk', p.id, 0, p.def.skill.name);
    SKILLS[p.def.skill.id](W, p);
  }
  if ((p.in.k & 2) && p.ult >= p.ultMax && !p.jump && !p.dash) {
    p.ult = 0; p.castN++;
    W.emit('sk', p.id, 1, p.def.ult.name);
    SKILLS[p.def.ult.id](W, p);
  }
}

// ── 升級選項 ──
export function rollOptions(W, p, n) {
  const pool = [];
  const main = p.weapons[0];
  if (main.level < main.def.maxLv) pool.push([{ k: 'w', id: main.def.id, lv: main.level + 1, main: true }, 3.4]);
  const forced = main.level >= main.def.maxLv && main.def.branch ? main.def.branch.map((id) => describe({ k: 'w', id, lv: 1, main: true, branch: true, replace: main.def.id })) : [];
  const subs = p.weapons.slice(1);
  for (const w of subs) if (w.level < w.def.maxLv) pool.push([{ k: 'w', id: w.def.id, lv: w.level + 1 }, 1.7]);
  if (subs.length < 2) for (const id of SUB_WEAPONS) if (!subs.some((w) => w.def.id === id)) pool.push([{ k: 'w', id, lv: 1, isNew: true }, 0.8]);
  const owned = Object.keys(p.passives);
  for (const id in PASSIVES) {
    const ps = PASSIVES[id], lv = p.passives[id] || 0;
    if (ps.roles && !ps.roles.includes(p.def.role)) continue;
    if (lv >= ps.max) continue;
    if (!lv && owned.length >= 6) continue;
    pool.push([{ k: 'p', id, lv: lv + 1, isNew: !lv }, lv ? 1.5 : 1]);
  }
  const out = forced.slice();           // 路線分支：兩條路線一定同時出現
  while (out.length < n && pool.length) {
    const pick = W.rng.weighted(pool);
    pool.splice(pool.findIndex((x) => x[0] === pick), 1);
    out.push(describe(pick));
  }
  while (out.length < n) out.push(describe(out.some((o) => o.k === 'heal') ? { k: 'coin' } : { k: 'heal' }));
  return out;
}
function describe(o) {
  if (o.k === 'w') {
    const d = WEAPONS[o.id];
    o.name = d.name; o.glyph = d.glyph; o.cat = o.main ? '專屬武器' : '副武器';
    o.desc = o.branch ? d.branchDesc : o.lv === 1 ? '獲得新的副武器' : d.lv[o.lv - 2][0];
    if (o.branch) o.cat = '路線分支';
  } else if (o.k === 'p') {
    const d = PASSIVES[o.id];
    o.name = d.name; o.glyph = d.glyph; o.cat = '被動'; o.desc = d.desc;
  } else if (o.k === 'heal') { o.name = '便當'; o.glyph = '飯'; o.cat = '補給'; o.desc = '回復 40% 生命'; o.lv = 0; }
  else { o.name = '一袋金幣'; o.glyph = '財'; o.cat = '補給'; o.desc = '獲得 30 金幣'; o.lv = 0; }
  return o;
}
export function applyOption(W, p, o) {
  if (o.k === 'w') {
    let w = p.weapons.find((x) => x.def.id === o.id);
    if (o.replace && !w) {                     // 路線分支：換掉基礎武器
      const i = p.weapons.findIndex((x) => x.def.id === o.replace);
      if (i < 0) return;
      for (const k of ['orbs']) if (p.weapons[i][k]) for (const e of p.weapons[i][k]) e.dead = true;
      w = addWeapon(p, o.id); p.weapons.pop(); p.weapons[i] = w;
    } else if (!w) w = addWeapon(p, o.id); else { w.level = Math.min(w.def.maxLv, w.level + 1); w.s = weaponStats(w.def, w.level); }
    recalc(p);
  } else if (o.k === 'p') { p.passives[o.id] = (p.passives[o.id] || 0) + 1; recalc(p); }
  else if (o.k === 'heal') { if (!p.down) p.hp = Math.min(p.st.maxHp, p.hp + p.st.maxHp * 0.4); }
  else W.coins += 30;
}
export { solidAt };
