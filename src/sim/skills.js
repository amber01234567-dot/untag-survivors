// 主動技能與寶具。key 對應 data/characters.js 的 skill.id / ult.id。
// 新角色的技能直接在這裡加一個 (W, p) => {...} 即可，盡量用現成的積木（aoe / addZone / shoot / dash / addBuff）。
import { TAU, dist2 } from '../core/util.js';
import { addBuff, dash, moveDir } from './player.js';
import { swing, beamUpd, lob, plantMine, throwDecoy, fissure, spawnKebab } from './weapons.js';
import { solidAt } from './levelgen.js';

const wdmg = (p) => p.weapons[0].s.dmg;
const allies = (W, p, r, cb) => { for (const q of W.players) if (!q.gone && !q.down && (!r || dist2(p.x, p.y, q.x, q.y) <= r * r)) cb(q); };
const ring = (W, p, n, kind, o, off = 0) => { for (let i = 0; i < n; i++) W.shoot(p, Object.assign({ kind, a: off + i * TAU / n }, o)); };
const clusterOrAhead = (W, p, r, d = 160) => { const c = W.cluster(p.x, p.y, r); return c ? { x: c.x, y: c.y } : { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d }; };
// 在一段時間內重複執行（掛在玩家身上的隱形區域）
const channel = (W, p, dur, every, fn, onEnd) => W.addZone({ kind: 'shadow', owner: p, follow: p, r: 0, dur, tick: every, tk: every, upd(W2, z, dt) { if (p.down) { z.dead = true; return; } z.tk -= dt; if (z.tk <= 0) { z.tk += every; fn(W2, z); } }, onEnd });

export const SKILLS = {
  // ═════ 覺醒寶具（武器進化後取代原寶具） ═════
  // 老劉・天穹十字斬：兩道巨大光刃，先縱劈再橫劈，交會在敵人最密集處
  ll_cross(W, p) {
    const c = W.cluster(p.x, p.y, 420, 160) || p, L = 1500, d = wdmg(p) * 11;
    [Math.PI / 2, 0].forEach((a, i) => W.addZone({ kind: 'skyblade', owner: p, x: c.x - Math.cos(a) * L / 2, y: c.y - Math.sin(a) * L / 2, a, len: L, w: 130, delay: 0.55 + i * 0.6, dur: 1.25 + i * 0.6, tick: 9, dmg: d, hitOpt: { kb: 260, stun: 1.2 },
      onStart: (W2) => { W2.emit('sh', 14); W2.emit('a', 'boom'); } }));
  },
  // 飛姐・死神審判：凝結時間並鎖定全場，接著一槍同時貫穿所有目標
  fj_judge(W, p) {
    const ts = W.enemiesIn(p.x, p.y, 820).slice(0, 48);
    W.emit('tint', 1.5);
    for (const e of ts) { e.mark = 4; e.stunT = Math.max(e.stunT, e.def.boss ? 0 : 1.6); e.slowF = 0.8; e.slowT = 1.8; W.addZone({ kind: 'reticle', owner: p, follow: e, x: e.x, y: e.y, r: e.r + 14, dur: 1.5, tick: 9 }); }
    channel(W, p, 1.4, 9, () => {}, (W2) => {
      if (p.down) return;
      for (const e of ts) { if (e.dead) continue; W2.emit('l', p.x | 0, (p.y - 16) | 0, e.x | 0, (e.y - e.r * 0.5) | 0, 4); W2.strike(p, e, wdmg(p) * 7.5, { crit: true }); W2.aoe(e.x, e.y, 70, wdmg(p) * 1.2, p, { fx: 1, noFx: ts.length > 16 }); }
      W2.emit('sh', 16); p.atkN++;
    });
  },
  // ALLEN・法輪常轉：巨大法輪從天而降，落地後持續轉動碾壓；全場定身、隊友護盾
  al_wheel(W, p) {
    const c = W.cluster(p.x, p.y, 380, 200) || p, R = 250 * p.st.area;
    W.addZone({ kind: 'bigwheel', owner: p, x: c.x, y: c.y, r: R, delay: 0.7, dur: 4.7, tick: 0.3, dmg: wdmg(p) * 0.55, hitOpt: { slow: 0.6, slowDur: 0.6, kb: 20, quiet: true },
      onStart: (W2, z) => { W2.hash.query(z.x, z.y, 820, (e) => W2.strike(p, e, wdmg(p) * (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r ? 4.5 : 1.6), { stun: 4.5, mark: 5 })); W2.emit('sh', 18); W2.emit('r', z.x | 0, z.y | 0, 820, 3); W2.emit('a', 'boom'); } });
    allies(W, p, 0, (q) => { q.shield = Math.max(q.shield, 40 + q.st.maxHp * 0.3 * p.st.heal); addBuff(q, 'buddha', { t: 6, regen: 4 }); W.emit('r', q.x | 0, q.y | 0, 80, 3); });
  },
  // 夏・天崩地裂：以自己為中心，一圈一圈往外噴發岩柱
  xia_shatter(W, p) {
    const x = p.x, y = p.y, d = wdmg(p);
    W.aoe(x, y, 130, d * 5, p, { stun: 2, kb: 320, fx: 9 }); W.emit('sh', 18);
    W.addZone({ kind: 'crack', owner: p, x, y, r: 190, dur: 4, tick: 9 });
    let k = 0;
    channel(W, p, 1.0, 0.24, (W2) => {
      k++; const R = 100 + k * 82, n = 5 + k * 3;
      for (let i = 0; i < n; i++) { const a = i * TAU / n + k * 0.4, rx = x + Math.cos(a) * R, ry = y + Math.sin(a) * R * 0.86; if (!solidAt(W2.L, rx, ry)) W2.addZone({ kind: 'rockburst', owner: p, x: rx, y: ry, r: 60, delay: 0.08, dur: 0.9, tick: 9, dmg: d * 5, hitOpt: { stun: 1.8, kb: 140, sx: x, sy: y }, aux: i % 5 }); }
      W2.emit('sh', 9); W2.emit('a', 'boom');
    });
  },
  // 狗企・地獄廚房：巨型菜刀輪流剁向敵群，最後一刀全場震飛
  gq_kitchen(W, p) {
    const d = wdmg(p);
    for (let i = 0; i < 6; i++) {
      const last = i === 5, c = last ? p : (W.cluster(p.x, p.y, 520, 150) || { x: p.x + W.rng.range(-260, 260), y: p.y + W.rng.range(-200, 200) });
      const x = c.x + (last ? 0 : W.rng.range(-70, 70)), y = c.y + (last ? 0 : W.rng.range(-50, 50)), r = last ? 290 : 125;
      W.addZone({ kind: 'cleaverfall', owner: p, x, y, r, delay: 0.5 + i * 0.36, dur: 1.0 + i * 0.36, tick: 9, dmg: d * (last ? 3.2 : 1.9), hitOpt: { stun: last ? 2.2 : 1, kb: last ? 800 : 200, sx: x, sy: y, dot: 14, dotDur: 4 }, aux: last ? 1 : 0,
        onStart: (W2) => { W2.emit('sh', last ? 20 : 9); W2.emit('a', 'boom'); W2.emit('b', x | 0, y | 0, r, 2); } });
    }
  },
  // 庭哥・千手無束：3 秒內對前方轟出數十記拳影，最後一記巨拳
  tg_thousand(W, p) {
    addBuff(p, 'limit', { t: 3.4, speed: 0.15, dmg: 0.2, ult: 1 });
    const d = wdmg(p);
    channel(W, p, 3, 0.055, (W2) => {
      const a = p.aim + W2.rng.range(-0.55, 0.55), off = W2.rng.range(-70, 70);
      W2.shoot(p, { kind: 'fist', a, speed: 900, dmg: d * 1.5, pierce: 8, life: 0.42, r: 30, kb: 120, x: p.x - Math.sin(p.aim) * off - Math.cos(p.aim) * 30, y: p.y - 16 + Math.cos(p.aim) * off - Math.sin(p.aim) * 30 });
      p.atkN++; p.atkA = p.aim;
    }, (W2) => { if (p.down) return; W2.shoot(p, { kind: 'fist', a: p.aim, speed: 820, dmg: d * 16, pierce: 99, life: 0.75, r: 72, kb: 700, stun: 1.5, aux: 2 }); W2.emit('sh', 20); W2.emit('a', 'boom'); });
  },
  // 少年・雷神全壘打：巨大雷球貫穿全場，同時全畫面落雷
  sn_thunder(W, p) {
    const d = wdmg(p), a = p.aim;
    swing(W, p, a, 190 * p.st.area, 2.8, d * 5, { kb: 800, stun: 0.8, fx: 4 });
    W.shoot(p, { kind: 'thunderball', a, speed: 720, dmg: d * 9, pierce: 99, life: 2.2, r: 48, kb: 400, stun: 1, aux: 1 });
    W.emit('sh', 16);
    channel(W, p, 2.4, 0.07, (W2) => {
      const t = W2.randomEnemies(p.x, p.y, 620, 1)[0];
      const tx = t ? t.x : p.x + W2.rng.range(-420, 420), ty = t ? t.y : p.y + W2.rng.range(-280, 280);
      W2.emit('l', tx | 0, (ty - 460) | 0, tx | 0, ty | 0, 1); W2.aoe(tx, ty, 78, d * 2.6, p, { stun: 0.6, fx: 1 });
    });
  },
  // 嗯雞抖・極光天幕：一道直立的彩虹光幕由左到右橫掃戰場
  ejd_curtain(W, p) {
    const d = wdmg(p), dir = Math.cos(p.aim) >= 0 ? 1 : -1, x0 = p.x - dir * 620, H = 1300;
    W.addZone({ kind: 'beam', owner: p, x: x0, y: p.y - H / 2, a: Math.PI / 2, len: H, w: 120, dur: 2.6, tick: 0.08, dmg: d * 1.5, burst: 1, aux: 1, hitOpt: { kb: 40 },
      upd(W2, z, dt) { z.x = x0 + dir * 1240 * Math.min(1, z.t / z.dur); z.tk -= dt; if (z.tk <= 0) { z.tk += z.tick; W2.zoneTick(z); } } });
    channel(W, p, 2.6, 0.25, (W2) => W2.emit('sh', 5));
  },
  // 營長・燃燒地毯：三排燃燒彈，炸完留下整片火海
  yz_carpet(W, p) {
    const c = clusterOrAhead(W, p, 520, 260), a = p.aim + 1.57, d = wdmg(p) * 9;
    for (let row = -1; row <= 1; row++) for (let i = -3; i <= 3; i++) {
      const x = c.x + Math.cos(a) * i * 84 + Math.cos(p.aim) * row * 115, y = c.y + Math.sin(a) * i * 84 + Math.sin(p.aim) * row * 115;
      W.addZone({ kind: 'airstrike', owner: p, x, y, r: 96, delay: 0.6 + (row + 1) * 0.4 + (i + 3) * 0.06, dur: 1.9 + (row + 1) * 0.4, tick: 9, onStart(W2, z) {
        W2.aoe(z.x, z.y, z.r, d, p, { fx: 1, kb: 160, dot: 16, dotDur: 4 }); W2.emit('sh', 4);
        W2.addZone({ kind: 'fire', owner: p, x: z.x, y: z.y, r: 62, dur: 4.5, tick: 0.4, dmg: d * 0.1, hitOpt: { quiet: true } }); } });
    }
  },
  // 深深・終焉大魔法陣：巨大魔法陣逐層亮起並束縛敵人，最後所有節點噴出光柱
  ss_doom(W, p) {
    const d = wdmg(p), R = 400, x = p.x, y = p.y;
    W.addZone({ kind: 'doomcircle', owner: p, x, y, r: R, dur: 3.9, tick: 0.3, dmg: d * 0.4, hitOpt: { slow: 0.75, slowDur: 0.6, quiet: true },
      onEnd: () => {} });
    channel(W, p, 3.0, 9, () => {}, (W2) => {
      W2.hash.query(x, y, R, (e) => W2.strike(p, e, d * 9, { stun: 2, mark: 4 }));
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12, px = x + Math.cos(a) * R * 0.72, py = y + Math.sin(a) * R * 0.72 * 0.86; W2.emit('l', px | 0, (py - 520) | 0, px | 0, py | 0, 3); W2.aoe(px, py, 90, d * 4, p, { fx: 4 }); }
      W2.emit('l', x | 0, (y - 520) | 0, x | 0, y | 0, 3); W2.emit('sh', 20); W2.emit('a', 'boom');
    });
  },
  // TK哥・幽冥巨口：巨大骷髏把敵人吸過來一口吞下；低血量的一般敵人直接吞噬
  tk_maw(W, p) {
    const c = W.cluster(p.x, p.y, 480, 200) || { x: p.x + Math.cos(p.aim) * 160, y: p.y + Math.sin(p.aim) * 160 }, d = wdmg(p), R = 230;
    W.addZone({ kind: 'maw', owner: p, x: c.x, y: c.y, r: R, delay: 1.1, dur: 1.9, tick: 0.1, pull: 300, dmg: 0, hitOpt: { quiet: true, slow: 0.5, slowDur: 0.3 },
      upd(W2, z, dt) {
        z.tk -= dt;
        if (z.t < z.delay) { if (z.tk <= 0) { z.tk += z.tick; W2.zoneTick(z); } return; }
        if (z.bit) return; z.bit = true;
        W2.hash.query(z.x, z.y, R * 0.8, (e) => { if (!e.def.boss && !e.def.structure && e.hp < e.maxHp * 0.3) W2.killEnemy(e, p); else W2.strike(p, e, d * 4.5, { stun: 1.5 }); });
        W2.emit('sh', 20); W2.emit('a', 'boom'); W2.heal(p, p.st.maxHp * 0.25, p);
      } });
  },
  // 哈基米・浮游砲陣：六把浮游槍繞著自己旋轉齊射
  hjm_array(W, p) {
    addBuff(p, 'storm', { t: 5.2, haste: 0.3, ult: 1 });
    const bits = []; for (let i = 0; i < 6; i++) bits.push(W.addSummon({ kind: 'bit', owner: p, x: p.x, y: p.y, life: 5.3 }));
    let rot = 0, n = 0; const d = wdmg(p);
    channel(W, p, 5.2, 0.045, (W2) => {
      rot += 0.11; n++;
      bits.forEach((b, i) => { const a = rot + i * TAU / 6; b.x = p.x + Math.cos(a) * 74; b.y = p.y - 26 + Math.sin(a) * 52; b.face = Math.cos(a) >= 0 ? 1 : -1; });
      const b = bits[n % 6], t = W2.nearestEnemy(b.x, b.y, 520), a = t ? Math.atan2(t.y - 8 - b.y, t.x - b.x) : rot + (n % 6) * TAU / 6;
      b.st = Math.round((((a % TAU) + TAU) % TAU) / TAU * 255);
      W2.shoot(p, { kind: 'pistol', x: b.x, y: b.y, a, speed: 880, dmg: d * 1.1, life: 0.8, pierce: 2, homing: 3, r: 8 });
    }, () => bits.forEach((b) => { b.dead = true; }));
  },
  // 忘川・萬刃歸宗：三波迴旋刃飛向四面八方再全部吸回
  wc_return(W, p) {
    const d = wdmg(p);
    addBuff(p, 'blade', { t: 3, speed: 0.2, ult: 1 });
    let k = 0;
    channel(W, p, 1.3, 0.42, (W2) => { ring(W2, p, 14, 'glaive', { speed: 620, dmg: d * 0.75, pierce: 99, life: 1.5, ret: true, r: 30, kb: 60 }, k * 0.22); k++; W2.emit('sh', 6); });
  },
  // 哞哞（火箭）・末日審判：超大彈頭從天而降
  mou_doom(W, p) {
    const c = clusterOrAhead(W, p, 520, 240), d = wdmg(p), R = 320;
    W.addZone({ kind: 'airstrike', owner: p, x: c.x, y: c.y, r: R, delay: 1.3, dur: 1.5, tick: 9 });
    lob(W, p, 'nuke', c.x, c.y, 1.3, (W2) => {
      W2.aoe(c.x, c.y, R, d * 5, p, { kb: 500, stun: 1.5, dot: 20, dotDur: 5, fx: 1 }); W2.emit('sh', 24); W2.emit('a', 'boom');
      W2.addZone({ kind: 'mushroom', owner: p, x: c.x, y: c.y, r: R, dur: 2.4, tick: 9, aux: 1 });
      W2.addZone({ kind: 'toxic', owner: p, x: c.x, y: c.y, r: R * 0.8, dur: 6, tick: 0.5, dmg: d * 0.24, hitOpt: { quiet: true, slow: 0.3, slowDur: 0.8 } });
    }, c.x + 80, c.y - 760);
  },
  // 哞哞（攻城甲）・泰坦墜擊：高高跳起砸下，三層衝擊波
  mou_titan(W, p) {
    const a = moveDir(p), d = wdmg(p);
    let tx = p.x, ty = p.y;
    for (let dd = 220; dd >= 0; dd -= 20) { const x = p.x + Math.cos(a) * dd, y = p.y + Math.sin(a) * dd; if (!solidAt(W.L, x, y) && !solidAt(W.L, x + 14, y) && !solidAt(W.L, x - 14, y)) { tx = x; ty = y; break; } }
    p.jump = { t: 0, dur: 0.7, sx: p.x, sy: p.y, tx, ty, h: 190, onLand(W2, q) {
      [[170, 6, 0], [280, 4, 0.22], [390, 2.6, 0.44]].forEach(([r, m, delay]) => W2.addZone({ kind: 'e_slam', owner: q, x: q.x, y: q.y, r, delay, dur: delay + 0.25, tick: 9,
        onStart: (W3, z) => { W3.aoe(z.x, z.y, r, d * m, q, { stun: 1.6, kb: 300, fx: 9 }); W3.emit('r', z.x | 0, z.y | 0, r, 3); W3.emit('sh', 14); } }));
      q.shield = Math.max(q.shield, q.st.maxHp * 0.3);
    } };
  },
  // 賴姐姐・聖光方舟：全隊復活 / 回滿 / 無敵，光鏈灼燒周圍所有敵人
  lj_ark(W, p) {
    for (const q of W.players) { if (q.gone) continue; if (q.down) { W.revive(q, 1, true); W.emit('t', q.x | 0, (q.y - 60) | 0, '聖光方舟！', 2); } W.heal(q, q.st.maxHp, p); q.invuln = Math.max(q.invuln, 4); q.shield = Math.max(q.shield, q.st.maxHp * 0.3); if (q !== p) W.emit('l', p.x | 0, (p.y - 18) | 0, q.x | 0, (q.y - 18) | 0, 6); W.emit('r', q.x | 0, q.y | 0, 140, 2); }
    W.addZone({ kind: 'heal', owner: p, follow: p, r: 250, dur: 8, tick: 0.5, heal: 18, buff: { t: 1, regen: 3 } });
    const d = wdmg(p);
    channel(W, p, 4, 0.2, (W2) => { for (const e of W2.enemiesIn(p.x, p.y, 420).slice(0, 14)) { W2.strike(p, e, d * 2.2, { dot: 20, dotDur: 3, quiet: W2.rng.next() < 0.5 }); W2.emit('l', p.x | 0, (p.y - 18) | 0, e.x | 0, (e.y - e.r * 0.5) | 0, 5); } });
    W.emit('sh', 10);
  },
  // 羊弟弟・烤肉盛宴：把烤肉塔插在地上，肉片不斷削飛出去，塔旁隊友持續回血
  yd_feast(W, p) {
    const s = p.weapons[0].s;
    let x = p.x + Math.cos(p.aim) * 70, y = p.y + Math.sin(p.aim) * 70; if (solidAt(W.L, x, y)) { x = p.x; y = p.y; }
    spawnKebab(W, p, x, y, Object.assign({}, s, { dmg: s.dmg * 1.6, sliceCd: 0.1, towerHeal: 9 }), 10, 0);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; const g = W.drop('k', x + Math.cos(a) * 70, y + Math.sin(a) * 70, 30); if (g) { g.src = p; g.buff = 0.2; g.bdmg = 0.15; } }
    allies(W, p, 0, (q) => addBuff(q, 'bbq', { t: 10, dmg: 0.3 }));
    W.emit('sh', 8); W.emit('r', x | 0, y | 0, 200, 2);
  },
  // 跳跳・黑洞舞池：巨型重力球把全場敵人吸成一團後引爆
  tt_dance(W, p) {
    const c = W.cluster(p.x, p.y, 480, 200) || { x: p.x + Math.cos(p.aim) * 150, y: p.y + Math.sin(p.aim) * 150 }, d = wdmg(p);
    W.addZone({ kind: 'gravball', owner: p, x: c.x, y: c.y, r: 360, dur: 3.2, tick: 0.1, pull: 330, dmg: d * 0.12, aux: 1, hitOpt: { quiet: true, slow: 0.6, slowDur: 0.3 },
      onEnd: (W2, g) => { W2.aoe(g.x, g.y, 250, d * 9, p, { fx: 12, kb: 600, stun: 2 }); W2.emit('sh', 22); W2.emit('a', 'boom'); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; W2.aoe(g.x + Math.cos(a) * 160, g.y + Math.sin(a) * 136, 90, d * 2.5, p, { fx: 12 }); } } });
  },
  // 起秋・火箭衝線：數秒內無敵狂飆，衝撞大增、沿路著火，結束時大爆炸；全隊增幅
  qq_finish(W, p) {
    const d = wdmg(p);
    addBuff(p, 'finish', { t: 5, speed: 0.9, ult: 1, onEnd(W2, q) { if (q.down) return; W2.aoe(q.x, q.y, 240, d * 9, q, { kb: 500, stun: 1.5, fx: 12 }); W2.emit('sh', 20); W2.emit('a', 'boom'); } });
    p.invuln = Math.max(p.invuln, 5);
    allies(W, p, 0, (q) => { addBuff(q, 'amp', { t: 8, dmg: 0.5, haste: 0.35, ult: 1 }); W.heal(q, q.st.maxHp * 0.2, p); W.emit('r', q.x | 0, q.y | 0, 110, 1); });
    W.emit('sh', 8);
  },
  // 貓貓蟲・蜂群空投：母艦放出一大群自爆無人機，各自追著敵人俯衝爆炸
  mm_cannon(W, p) {
    const d = wdmg(p), w = p.weapons[0];
    addBuff(p, 'swarm', { t: 4, ult: 1 });
    channel(W, p, 3.6, 0.075, (W2) => {
      const m = w.ms || p, a = W2.rng.range(0, TAU);
      W2.shoot(p, { kind: 'kamikaze', x: m.x + W2.rng.range(-14, 14), y: m.y + 6, a, speed: 430, homing: 7, dmg: d * 0.2, aoe: 66, aoeDmg: d * 0.2, life: 1.8, r: 10, fx: 1, kb: 120 });
    });
    W.emit('sh', 6);
  },
  // 小順子・雙王降臨：獅王出場與虎爺並肩作戰，虎爺同時變得更兇猛
  xs_twin(W, p) {
    const d = wdmg(p);
    addBuff(p, 'twin', { t: 14, ult: 1 });
    minion(W, p, 'lion', p.x + Math.cos(p.aim) * 60, p.y + Math.sin(p.aim) * 60, { life: 14, speed: 330, dmg: d * 2.6, cd: 0.6, aoe: 95, r: 30 });
    allies(W, p, 0, (q) => { W.heal(q, q.st.maxHp * 0.3, p); W.emit('r', q.x | 0, q.y | 0, 100, 2); });
    W.aoe(p.x, p.y, 220, d * 3, p, { stun: 1.5, kb: 300, fx: 9 }); W.emit('sh', 14);
  },
  // 老瑾・土豪金坦克：純金禮車坦克，砲管噴錢袋，一邊開一邊撒錢，靠近的隊友獲得增益
  lk_goldtank(W, p) {
    const d = p.weapons[0].s.boomDmg;
    const tank = W.addSummon({ kind: 'goldtank', owner: p, x: p.x + Math.cos(p.aim) * 80, y: p.y + Math.sin(p.aim) * 80, life: 14, bt: 0.4 });
    tank.ct = 1; tank.at = 0;
    W.addDecoy(tank.x, tank.y, 300, 14, tank);
    tank.upd = (W2, m, dt) => {
      const gx = p.x + Math.cos(p.aim) * 110, gy = p.y + Math.sin(p.aim) * 110, dx = gx - m.x, dy = gy - m.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > 70) { const mv = Math.min(dd - 70, 170 * dt); m.x += dx / dd * mv; m.y += dy / dd * mv; m.st = 1; } else m.st = 0;
      if (Math.abs(dx) > 6) m.face = dx > 0 ? 1 : -1;
      W2.hash.query(m.x, m.y, 60, (e) => { const ot = e.ot || (e.ot = {}); if ((ot.gt || 0) > W2.time) return; ot.gt = W2.time + 0.5; W2.strike(p, e, d * 0.9, { kb: 260, sx: m.x, sy: m.y }); });
      m.bt -= dt; m.ct -= dt; m.at -= dt;
      if (m.bt <= 0) { const c = W2.cluster(m.x, m.y, 480, 100); if (c) { m.bt = 0.75; const tx = c.x, ty = c.y; m.face = tx >= m.x ? 1 : -1; lob(W2, p, 'moneybag', tx, ty, 0.5, (W3) => { W3.aoe(tx, ty, 95, d * 1.5, p, { fx: 1, kb: 220 }); W3.emit('sh', 4); if (W3.rng.chance(0.5)) W3.drop('c', tx, ty, 3); }, m.x + m.face * 40, m.y - 40); } else m.bt = 0.3; }
      if (m.ct <= 0) { m.ct = 1.1; W2.drop('c', m.x + W2.rng.range(-50, 50), m.y + W2.rng.range(-20, 40), 2); }
      if (m.at <= 0) { m.at = 0.5; W2.playersIn(m.x, m.y, 260, (q) => addBuff(q, 'gold', { t: 1.2, dmg: 0.35, haste: 0.2 })); }
    };
    W.emit('sh', 12);
  },
  // 農夫哥哥・真龍吐息：巨龍橫越畫面，沿路噴火並留下燃燒地面；全隊增傷
  nf_breath(W, p) {
    const d = wdmg(p), dir = Math.cos(p.aim) >= 0 ? 1 : -1, x0 = p.x - dir * 760, y0 = p.y;
    let dropT = 0;
    W.addZone({ kind: 'dragonpass', owner: p, x: x0, y: y0, r: 150, a: dir > 0 ? 0 : Math.PI, dur: 2.6, tick: 0.1, dmg: d * 1.4, hitOpt: { dot: 18, dotDur: 4, kb: 60, quiet: false },
      upd(W2, z, dt) {
        z.x = x0 + dir * 1520 * Math.min(1, z.t / z.dur); z.y = y0 + Math.sin(z.t * 3.2) * 60;
        z.tk -= dt; if (z.tk <= 0) { z.tk += z.tick; W2.zoneTick(z); }
        dropT -= dt; if (dropT <= 0) { dropT = 0.22; if (!solidAt(W2.L, z.x, z.y)) W2.addZone({ kind: 'dragonfire', owner: p, x: z.x, y: z.y, r: 84, dur: 4, tick: 0.4, dmg: d * 0.45, hitOpt: { dot: 14, dotDur: 3, quiet: true } }); }
      } });
    allies(W, p, 0, (q) => { addBuff(q, 'judgment', { t: 10, dmg: 0.5, ult: 1 }); W.emit('r', q.x | 0, q.y | 0, 110, 1); });
    channel(W, p, 2.6, 0.3, (W2) => W2.emit('sh', 6));
  },
  // ═════ 一般技能與寶具 ═════
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
    W.addZone({ kind: 'e_slam', owner: p, x, y, r: 300, dur: 0.45, delay: 0.4, tick: 9, onStart(W2) {
      W2.aoe(x, y, 300, wdmg(p) * 9, p, { stun: 2, kb: 300, fx: 9 }); W2.emit('sh', 18);
      W2.addZone({ kind: 'crack', owner: p, x, y, r: 300, dur: 3.5, tick: 9 });
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3; W2.addZone({ kind: 'fire', owner: p, x: x + Math.cos(a) * 140, y: y + Math.sin(a) * 140, r: 72, dur: 4, tick: 0.4, dmg: wdmg(p) * 0.3, hitOpt: { quiet: true } }); }
    } });
  },
  // ── 狗企 ──
  gq_stealth(W, p) {
    p.stealth = 3; addBuff(p, 'stealth', { t: 4.5, speed: 0.4, dmg: 1 });
    W.emit('r', p.x | 0, p.y | 0, 60, 0);
  },
  gq_empire(W, p) {
    W.addZone({ kind: 'garbage', owner: p, x: p.x, y: p.y, r: 250, dur: 10, tick: 0.5, dmg: wdmg(p) * 0.9, hitOpt: { slow: 0.5, slowDur: 0.8, dot: 10, dotDur: 3, quiet: true } });
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14, d = 50 + (i % 3) * 34; minion(W, p, 'rat', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, { life: 12, speed: 300, dmg: wdmg(p) * 0.9, cd: 0.5, dot: 8 }); }
    W.emit('sh', 10);
  },
  // ── 庭哥 ──
  tg_dash(W, p) {
    dash(p, moveDir(p), 200, 0.16, { dmg: wdmg(p) * 3, hitR: 52, hitOpt: { kb: 120, stun: 0.5 } });
    p.invuln = Math.max(p.invuln, 0.8);
    addBuff(p, 'focus', { t: 2.5, haste: 0.35 });
  },
  tg_limit(W, p) {
    addBuff(p, 'limit', { t: 8, haste: 1.2, speed: 0.3, dmg: 0.5, ult: 1, onEnd(W2, q) { if (q.down) return; W2.aoe(q.x + Math.cos(q.aim) * 60, q.y + Math.sin(q.aim) * 60, 230, wdmg(q) * 22, q, { kb: 600, stun: 1.5, fx: 9 }); W2.emit('sh', 20); } });
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
    W.addZone({ kind: 'beam', owner: p, follow: p, oy: -16, a: p.aim, len: 820, w: 72, dur: 4, tick: 0.1, dmg: wdmg(p) * 3, burst: 1, aux: 1, turn: 2.6, upd: beamUpd });
    channel(W, p, 4, 0.25, (W2) => W2.emit('sh', 4));
  },
  // ── 營長 ──
  yz_suppress(W, p) { addBuff(p, 'suppress', { t: 4, haste: 0.01 }); const w = p.weapons[0]; w.heat = 1; },
  yz_airstrike(W, p) {
    const c = clusterOrAhead(W, p, 520, 260), a = p.aim + 1.57, d = wdmg(p) * 26;
    for (let row = -1; row <= 1; row++) for (let i = -3; i <= 3; i++) {
      const x = c.x + Math.cos(a) * i * 82 + Math.cos(p.aim) * row * 112, y = c.y + Math.sin(a) * i * 82 + Math.sin(p.aim) * row * 112;
      W.addZone({ kind: 'airstrike', owner: p, x, y, r: 98, delay: 0.7 + (row + 1) * 0.35 + Math.abs(i) * 0.05, dur: 1.9, tick: 9, onStart(W2, z) { W2.aoe(z.x, z.y, z.r, d, p, { fx: 1, kb: 200 }); W2.emit('sh', 5); } });
    }
  },
  // ── 深深 ──
  ss_bind(W, p) {
    const c = clusterOrAhead(W, p, 520);
    W.addZone({ kind: 'runebig', owner: p, x: c.x, y: c.y, r: 175 * p.st.area, delay: 0.4, dur: 3.2, tick: 0.4, dmg: wdmg(p) * 0.8, hitOpt: { stun: 0.5, slow: 0.6, slowDur: 1 } });
  },
  ss_seal(W, p) {
    p.stealth = 6; addBuff(p, 'shadow', { t: 6, speed: 0.25, ult: 1 });
    const z = W.addZone({ kind: 'seal', owner: p, follow: p, r: 330, dur: 6, tick: 0.5, dmg: 0, hitOpt: { slow: 0.4, slowDur: 0.8, quiet: true } });
    channel(W, p, 6, 0.16, (W2) => {
      const t = W2.randomEnemies(p.x, p.y, z.r, 1)[0];
      const x = t ? t.x : p.x + W2.rng.range(-240, 240), y = t ? t.y : p.y + W2.rng.range(-240, 240);
      W2.emit('l', x | 0, (y - 460) | 0, x | 0, y | 0, 3);
      W2.aoe(x, y, 75, wdmg(p) * 4.5, p, { fx: 4 });
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
    W.addZone({ kind: 'zero', owner: p, follow: p, r: 720, dur: 3.2, tick: 9 });
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
    W.addZone({ kind: 'whirl', owner: p, follow: p, r: 190, dur: 5, tick: 0.16, dmg: wdmg(p) * 0.9, aux: 1, hitOpt: { kb: 30, quiet: true } });
    let off = 0;
    channel(W, p, 5, 0.3, (W2) => { off += 0.4; ring(W2, p, 8, 'knife', { speed: 760, dmg: wdmg(p) * 1.4, pierce: 6, life: 0.7, r: 8 }, off); });
  },
  // ── 賴姐姐 ──
  lj_aid(W, p) {
    allies(W, p, 520, (q) => { W.heal(q, q.st.maxHp * 0.35, p); addBuff(q, 'aid', { t: 4, regen: q.st.maxHp * 0.03 }); if (q !== p) W.emit('l', p.x | 0, (p.y - 16) | 0, q.x | 0, (q.y - 16) | 0, 2); W.emit('r', q.x | 0, q.y | 0, 60, 2); });
  },
  lj_revive(W, p) {
    for (const q of W.players) { if (q.gone) continue; if (q.down) { W.revive(q, 0.6, true); W.emit('t', q.x | 0, (q.y - 60) | 0, '起死回生！', 2); } W.heal(q, q.st.maxHp, p); q.invuln = Math.max(q.invuln, 3); W.emit('r', q.x | 0, q.y | 0, 120, 2); }
    W.addZone({ kind: 'heal', owner: p, follow: p, r: 230, dur: 8, tick: 0.5, heal: 14, buff: { t: 1, regen: 2 } });
  },
  // ── 羊弟弟 ──
  yd_party(W, p) {
    W.addZone({ kind: 'grill', owner: p, x: p.x, y: p.y, r: 155 * p.st.area, dur: 8, tick: 0.5, dmg: wdmg(p) * 0.5, heal: 7, buff: { t: 1, haste: 0.2 }, hitOpt: { dot: 8, dotDur: 2, quiet: true } });
  },
  yd_inferno(W, p) {
    W.addZone({ kind: 'fire', owner: p, x: p.x, y: p.y, r: 280, dur: 7, tick: 0.4, dmg: wdmg(p) * 1.5, aux: 1, hitOpt: { dot: 14, dotDur: 3, quiet: true } });
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const g = W.drop('k', p.x + Math.cos(a) * 80, p.y + Math.sin(a) * 80, 30); if (g) { g.src = p; g.buff = 0.2; g.bdmg = 0.15; } }
    allies(W, p, 0, (q) => addBuff(q, 'bbq', { t: 10, dmg: 0.4 }));
    W.emit('sh', 10);
  },
  // ── ALLEN ──
  al_freeze(W, p) {
    W.hash.query(p.x, p.y, 260 * p.st.area, (e) => W.strike(p, e, wdmg(p) * 2, { stun: 2.8, mark: 4 }));
    W.emit('r', p.x | 0, p.y | 0, (260 * p.st.area) | 0, 3);
  },
  al_buddha(W, p) {
    W.addZone({ kind: 'bell', owner: p, follow: p, r: 800, dur: 2, tick: 9 });
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
  // ── 哞哞 ──
  mou_ram(W, p) {
    dash(p, moveDir(p), 300, 0.3, { dmg: 60 + wdmg(p) * 1.5, hitR: 64, hitOpt: { kb: 520, stun: 0.8 } });
    W.emit('sh', 6);
  },
  mou_barrage(W, p) {
    const d = 55 + wdmg(p) * 1.6;
    channel(W, p, 3.5, 0.09, (W2) => {
      const t = W2.randomEnemies(p.x, p.y, 560, 1)[0];
      const tx = t ? t.x : p.x + W2.rng.range(-380, 380), ty = t ? t.y : p.y + W2.rng.range(-260, 260);
      lob(W2, p, 'missile', tx, ty, 0.4, (W3) => { W3.aoe(tx, ty, 95, d, p, { kb: 240, fx: 1 }); W3.emit('sh', 3); }, tx + W2.rng.range(-60, 60), ty - 480);
    });
  },
  // ── 老瑾 ──
  lk_cash(W, p) {
    const s = p.weapons[0].s;
    for (let i = 0; i < 3; i++) { const a = p.aim + i * TAU / 3, x = p.x + Math.cos(a) * 150, y = p.y + Math.sin(a) * 150; throwDecoy(W, p, solidAt(W.L, x, y) ? p.x : x, solidAt(W.L, x, y) ? p.y : y, s, true); }
    W.emit('r', p.x | 0, p.y | 0, 220, 1);
  },
  lk_tank(W, p) {
    const d = p.weapons[0].s.boomDmg;
    const tank = W.addSummon({ kind: 'tank', owner: p, x: p.x + Math.cos(p.aim) * 70, y: p.y + Math.sin(p.aim) * 70, life: 12, bt: 0.4 });
    W.addDecoy(tank.x, tank.y, 300, 12, tank);
    tank.upd = (W2, m, dt) => {
      const tgt = W2.nearestEnemy(m.x, m.y, 460);
      const gx = p.x + Math.cos(p.aim) * 90, gy = p.y + Math.sin(p.aim) * 90, dx = gx - m.x, dy = gy - m.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > 60) { const mv = Math.min(dd - 60, 150 * dt); m.x += dx / dd * mv; m.y += dy / dd * mv; m.st = 1; } else m.st = 0;
      if (tgt) m.face = tgt.x > m.x ? 1 : -1;
      m.bt -= dt;
      if (tgt && m.bt <= 0) { m.bt = 0.7; W2.shoot(p, { kind: 'missile', x: m.x, y: m.y - 16, a: Math.atan2(tgt.y - m.y, tgt.x - m.x), speed: 520, dmg: d * 1.2, aoe: 90, life: 1.2, r: 10, fx: 1, kb: 160 }); }
    };
    W.emit('sh', 12); W.emit('r', tank.x | 0, tank.y | 0, 300, 1);
  },
  // ── 農夫哥哥 ──
  nf_domain(W, p) {
    W.addZone({ kind: 'dragonfire', owner: p, x: p.x, y: p.y, r: 200 * p.st.area, dur: 6, tick: 0.4, dmg: wdmg(p) * 0.7, buff: { t: 1, dmg: 0.3 }, hitOpt: { dot: 10, dotDur: 2, quiet: true } });
  },
  nf_judgment(W, p) {
    W.addZone({ kind: 'dragonfire', owner: p, follow: p, r: 320, dur: 8, tick: 0.4, dmg: wdmg(p) * 1.6, aux: 1, hitOpt: { dot: 16, dotDur: 3, quiet: true } });
    allies(W, p, 0, (q) => { addBuff(q, 'judgment', { t: 10, dmg: 0.5, ult: 1 }); W.emit('r', q.x | 0, q.y | 0, 110, 1); });
    W.emit('sh', 14);
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
