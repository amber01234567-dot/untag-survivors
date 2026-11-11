// 關卡流程：區域狀態機（locked → open → active → cleared）、目標、閘門、出怪導演。
import { TILE } from './const.js';
import { TAU, dist2 } from '../core/util.js';
import { openLink, zoneAt, solidAt } from './levelgen.js';
import { spawnEnemy } from './enemy.js';
import { ENEMIES } from '../data/enemies.js';

const RATE = { kill: 1.0, survive: 1.3, nests: 0.45, elite: 0.6, boss: 0.32, goblins: 1.0, treasure: 0 };
export const OBJ_TEXT = { kill: '殲滅敵人', survive: '撐過時間', nests: '摧毀巢穴', elite: '擊敗菁英', boss: '擊敗首領', goblins: '攔截運鈔鼠', treasure: '寶藏' };

export class StageCtl {
  constructor(W) {
    this.W = W; this.L = W.L; this.cleared = 0; this.bossE = null; this.amb = 0;
    this.refreshLinks(true);
  }

  refreshLinks(silent) {
    const L = this.L;
    for (const l of L.links) {
      if (l.open) continue;
      if (l.req.every((i) => L.zones[i].state === 'cleared')) {
        openLink(L, l);
        for (const zi of [l.a, l.b]) if (L.zones[zi].state === 'locked') L.zones[zi].state = 'open';
        if (!silent) { this.W.emit('gate', l.idx); this.W.emit('a', 'gate'); }
      }
    }
  }

  update(dt) {
    const W = this.W, L = this.L;
    for (const p of W.players) {
      if (p.down || p.gone) continue;
      const zi = zoneAt(L, p.x, p.y);
      if (zi >= 0 && L.zones[zi].state === 'open') this.activate(L.zones[zi]);
    }
    let anyActive = false;
    for (const z of L.zones) if (z.state === 'active') { anyActive = true; this.runZone(z, dt); }
    // 沒有進行中的區域時，少量遊蕩怪保持節奏
    if (!anyActive && W.enemies.length < 14 * W.rateMul && W.endT <= 0) {
      this.amb += dt * 0.5 * W.rateMul;
      if (this.amb >= 1) { this.amb = 0; const p = W.rng.pick(W.alive()); if (p) this.spawnNear(p, -1); }
    }
  }

  activate(z) {
    const W = this.W, o = z.obj, n = W.n;
    z.state = 'active'; z.t = 0; z.acc = 0; z.wave = 6; z.alive = 0;
    o.cur = 0;
    const scale = 1 + 0.5 * (n - 1);
    if (o.t === 'kill') o.max = Math.round(o.n * 1.5 * scale);
    else if (o.t === 'survive' || o.t === 'goblins') { o.max = o.s; o.gob = 2; }
    else if (o.t === 'nests') {
      o.max = o.n; o.nests = [];
      for (let i = 0, tries = 0; i < o.n && tries < 200; tries++) {
        const pt = this.randFloor(z);
        if (W.players.some((p) => dist2(p.x, p.y, pt.x, pt.y) < 300 * 300)) continue;
        if (o.nests.some((e) => dist2(e.x, e.y, pt.x, pt.y) < 260 * 260)) continue;
        if (solidAt(this.L, pt.x + 30, pt.y) || solidAt(this.L, pt.x - 30, pt.y) || solidAt(this.L, pt.x, pt.y + 30) || solidAt(this.L, pt.x, pt.y - 30)) continue;
        const e = spawnEnemy(W, 'nest', pt.x, pt.y, { zone: z.idx, hpMul: 1 }); e.isObj = true; o.nests.push(e); i++;
      }
      o.max = o.nests.length || 1;
    } else if (o.t === 'elite') {
      o.max = 1;
      const pt = this.farPoint(z);
      const e = spawnEnemy(W, o.who, pt.x, pt.y, { zone: z.idx, elite: true, hpMul: 1.7 }); e.isObj = true; o.ent = e;
    } else if (o.t === 'boss') {
      o.max = 1;
      const e = spawnEnemy(W, o.who, z.cx, z.cy - 60, { zone: z.idx }); e.isObj = true; e.spawnT = 1.6; o.ent = e; this.bossE = e;
      W.emit('bn', ENEMIES[o.who].name, 'BOSS', 3); W.emit('a', 'boss'); W.emit('sh', 14);
    } else if (o.t === 'treasure') {
      W.drop('x', z.cx, z.cy, 0);
      for (let i = 0; i < 4; i++) W.drop('c', z.cx + Math.cos(i * 1.57) * 50, z.cy + Math.sin(i * 1.57) * 50, 8 + Math.floor(W.stage.diff * 4));
      for (let i = 0; i < Math.round(8 * scale); i++) { const pt = this.randFloor(z); if (dist2(pt.x, pt.y, z.cx, z.cy) > 120 * 120) spawnEnemy(W, W.rng.weighted(W.stage.pool), pt.x, pt.y, { zone: z.idx }); }
      this.clearZone(z, true);
      W.emit('bn', '寶藏室', 'TREASURE', 0);
      return;
    }
    if (o.t !== 'boss') W.emit('bn', OBJ_TEXT[o.t], 'OBJECTIVE', 0);
  }

  runZone(z, dt) {
    const W = this.W, o = z.obj;
    z.t += dt;
    if (W.endT > 0) return;
    // 目標進度
    if (o.t === 'survive' || o.t === 'goblins') { o.cur = Math.min(o.max, z.t); if (z.t >= o.max) return this.clearZone(z); }
    if (o.t === 'nests') { o.cur = o.nests.filter((e) => e.dead).length; if (o.cur >= o.max) return this.clearZone(z); }
    if ((o.t === 'elite' || o.t === 'boss') && o.ent.dead) { o.cur = 1; return this.clearZone(z); }
    if (o.t === 'kill' && o.cur >= o.max) return this.clearZone(z);
    if (o.t === 'goblins') { o.gob -= dt; if (o.gob <= 0) { o.gob = 3.2 / Math.sqrt(W.rateMul); const pt = this.spawnPoint(z, 260); if (pt) spawnEnemy(W, 'goblin', pt.x, pt.y, { zone: z.idx }); } }
    // 出怪
    const inZone = W.players.filter((p) => !p.down && !p.gone && zoneAt(this.L, p.x, p.y) === z.idx);
    if (!inZone.length) return;
    const ramp = 0.7 + Math.min(1.5, z.t / 60);        // 進區後前 20 秒較緩，讓玩家先升幾級
    const rate = 2.0 * RATE[o.t] * W.rateMul * ramp * (0.7 + W.stage.diff * 0.15) * (0.82 + 0.09 * Math.min(4, this.cleared - 1));
    const cap = Math.min(230, 62 * (1 + 0.5 * (W.n - 1)) * (0.8 + RATE[o.t] * 0.4));
    let alive = 0;
    for (const e of W.enemies) if (!e.dead && e.zone === z.idx) alive++;
    z.acc += rate * dt;
    while (z.acc >= 1) { z.acc -= 1; if (alive < cap) { this.spawnIn(z); alive++; } }
    // 定期一波同種怪圍攻
    z.wave -= dt;
    if (z.wave <= 0) {
      z.wave = 17;
      const id = W.rng.weighted(W.stage.pool), n = Math.round((5 + W.stage.diff * 1.5) * W.rateMul * (ENEMIES[id].hp > 50 ? 0.4 : 1));
      const c = this.spawnPoint(z, 330);
      if (c) for (let i = 0; i < n && alive < cap + 20; i++) { const a = i * TAU / n, x = c.x + Math.cos(a) * 44, y = c.y + Math.sin(a) * 44; if (!solidAt(this.L, x, y)) { spawnEnemy(W, id, x, y, { zone: z.idx }); alive++; } }
      if (z.t > 30 && W.rng.chance(0.5)) { const pt = this.spawnPoint(z, 330); if (pt) spawnEnemy(W, W.rng.weighted(W.stage.pool), pt.x, pt.y, { zone: z.idx, elite: true }); }
    }
  }

  onKill(e, escaped) {
    if (e.zone < 0 || escaped) return;
    const z = this.L.zones[e.zone];
    if (z && z.state === 'active' && z.obj.t === 'kill' && !e.def.structure) z.obj.cur++;
  }

  clearZone(z, quiet) {
    const W = this.W;
    z.state = 'cleared'; this.cleared++;
    if (!quiet) {
      // 淨化：區域內殘存的敵人直接蒸發（照樣掉經驗）
      for (const e of W.enemies) if (!e.dead && e.zone === z.idx && !e.def.boss) W.killEnemy(e, null, true);
      W.projs.forEach((p) => { if (p.team === 1) p.dead = true; });
      W.emit('r', z.cx | 0, z.cy | 0, 900, 7); W.emit('a', 'clear');
      for (const p of W.players) { if (p.gone) continue; if (p.down) W.revive(p, 0.4); else W.heal(p, p.st.maxHp * 0.2, null); }
      // 淨化後自動吸取場上的經驗與金幣
      for (const g of W.pickups.values()) if (g.type === 'g' || g.type === 'c') W.attract(g, W.nearestPlayer(g.x, g.y, true) || W.players[0]);
      if (z.kind === 'final') { W.win(); return; }
      W.drop('x', z.cx, z.cy, 0);
      W.emit('bn', '區域淨化', 'ZONE CLEARED', 1);
    }
    this.refreshLinks();
  }

  // ── 出怪位置 ──
  randFloor(z) { const i = z.floor[Math.floor(this.W.rng.next() * z.floor.length)]; return { x: (i % this.L.W + 0.5) * TILE, y: (Math.floor(i / this.L.W) + 0.5) * TILE }; }
  spawnPoint(z, minD) {
    const W = this.W;
    for (let t = 0; t < 14; t++) {
      const pt = this.randFloor(z), need = t < 8 ? Math.max(minD, 430) : minD;
      let ok = true, near = false;
      for (const p of W.players) { if (p.gone) continue; const d = dist2(p.x, p.y, pt.x, pt.y); if (d < need * need) ok = false; if (d < 900 * 900) near = true; }
      if (ok && (near || t > 10)) return pt;
    }
    return null;
  }
  farPoint(z) {
    let best = { x: z.cx, y: z.cy }, bd = -1;
    for (let t = 0; t < 20; t++) { const pt = this.randFloor(z); let d = Infinity; for (const p of this.W.players) d = Math.min(d, dist2(p.x, p.y, pt.x, pt.y)); if (d > bd) { bd = d; best = pt; } }
    return best;
  }
  spawnIn(z) {
    const pt = this.spawnPoint(z, 270);
    if (pt) spawnEnemy(this.W, this.W.rng.weighted(this.W.stage.pool), pt.x, pt.y, { zone: z.idx });
  }
  spawnNear(p, zone) {
    const W = this.W;
    for (let t = 0; t < 8; t++) {
      const a = W.rng.range(0, TAU), d = W.rng.range(420, 620), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (!solidAt(this.L, x, y) && W.flow.d[Math.floor(y / TILE) * this.L.W + Math.floor(x / TILE)] < 60) { spawnEnemy(W, W.rng.weighted(W.stage.pool), x, y, { zone }); return; }
    }
  }

  // 給 HUD / 快照用的狀態
  state() {
    const L = this.L, objs = [];
    for (const z of L.zones) if (z.state === 'active') objs.push([z.idx, z.obj.t, Math.floor(z.obj.cur), z.obj.max]);
    const b = this.bossE && !this.bossE.dead ? [this.bossE.def.idx, Math.ceil(this.bossE.hp), Math.ceil(this.bossE.maxHp)] : null;
    return { z: L.zones.map((z) => 'loac'.indexOf(z.state[0])), g: L.links.map((l) => (l.open ? 1 : 0)), o: objs, b };
  }
}
