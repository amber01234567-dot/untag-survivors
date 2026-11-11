// 權威模擬世界（只在房主 / 單人端執行）。客戶端只收快照，不跑這個檔案。
import { TILE, PROJ_KINDS, ZONE_KINDS, SUMMON_KINDS } from './const.js';
import { RNG, TAU, clamp, dist2, angDiff, lerpAngle } from '../core/util.js';
import { buildLevel, moveBody, blocksShot, solidAt, FlowField } from './levelgen.js';
import { DIFFS } from '../data/chapters.js';
import { ENEMIES } from '../data/enemies.js';
import { makePlayer, updatePlayer, rollOptions, applyOption, bDmg, addBuff, recalc } from './player.js';
import { spawnEnemy, updateEnemy } from './enemy.js';
import { StageCtl } from './stagectl.js';

class Hash {
  constructor(w, h, cs) {
    this.cs = cs; this.cols = Math.ceil(w / cs) + 1; this.rows = Math.ceil(h / cs) + 1;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    this.used = [];
  }
  clear() { for (const i of this.used) this.cells[i].length = 0; this.used.length = 0; }
  insert(e) {
    const cx = clamp(Math.floor(e.x / this.cs), 0, this.cols - 1), cy = clamp(Math.floor(e.y / this.cs), 0, this.rows - 1);
    const i = cy * this.cols + cx, c = this.cells[i];
    if (!c.length) this.used.push(i);
    c.push(e);
  }
  // 對圓內每個存活敵人呼叫 cb
  query(x, y, r, cb) {
    const cs = this.cs, pad = r + 48;
    const x0 = clamp(Math.floor((x - pad) / cs), 0, this.cols - 1), x1 = clamp(Math.floor((x + pad) / cs), 0, this.cols - 1);
    const y0 = clamp(Math.floor((y - pad) / cs), 0, this.rows - 1), y1 = clamp(Math.floor((y + pad) / cs), 0, this.rows - 1);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = this.cells[cy * this.cols + cx];
      for (let k = 0; k < c.length; k++) {
        const e = c[k];
        if (e.dead) continue;
        const rr = r + e.r, dx = e.x - x, dy = e.y - y;
        if (dx * dx + dy * dy <= rr * rr) cb(e);
      }
    }
  }
}

export class World {
  constructor({ stage, diff = 0, seed, players }) {
    this.stage = stage; this.diffIdx = diff; this.diff = DIFFS[diff]; this.seed = seed;
    this.L = buildLevel(stage, seed);
    this.rng = new RNG(seed * 7 + 13);
    this.time = 0; this.tickN = 0;
    this.players = []; this.enemies = []; this.projs = []; this.zones = []; this.summons = [];
    this.pickups = new Map();
    this.decoys = [];
    this.ev = []; this._dmgEv = 0;
    this.eid = 0; this.prid = 0; this.zid = 0; this.gid = 0; this.sid = 0;
    this.n = players.length;
    this.level = 1; this.xp = 0; this.xpNeed = this.needFor(1);
    this.lvQueue = (stage.chapter - 1) * 2;      // 戰前補給：後面章節開場先給幾次強化，避免一級裸裝硬扛
    this.coins = 0; this.kills = 0;
    this.state = 'play'; this.picks = null; this.pickT = 0; this.endT = 0; this.pickLog = [];
    this.hash = new Hash(this.L.pxW, this.L.pxH, 64);
    this.flow = new FlowField(this.L);
    const nMul = 1 + 0.55 * (this.n - 1);
    this.hpMul = stage.diff * this.diff.hp * nMul;
    this.dmgMul = Math.sqrt(stage.diff) * this.diff.dmg;
    this.rateMul = this.diff.rate * (1 + 0.5 * (this.n - 1));
    players.forEach((p, i) => this.players.push(makePlayer(this, p, i)));
    this.ctl = new StageCtl(this);
    this.flow.compute(this.players);
  }

  needFor(l) { return Math.floor((5 + l * 2.6 + l * l * 0.14) * (1 + 0.6 * (this.n - 1))); }
  emit(...a) { this.ev.push(a); }
  player(id) { return this.players.find((p) => p.id === id); }
  alive() { return this.players.filter((p) => !p.down && !p.gone); }

  // ───────── 主迴圈 ─────────
  step(dt) {
    if (this.state === 'levelup') {
      this.pickT -= dt;
      if (this.pickT <= 0) for (const p of this.players) if (this.picks[p.id] && !this.picks[p.id].done) this.choose(p.id, -1);
      return;
    }
    if (this.state !== 'play') return;
    this.time += dt; this.tickN++;
    this._dmgEv = Math.max(0, this._dmgEv - 0.5);
    if (this.tickN % 12 === 0) this.flow.compute(this.players);
    this.hash.clear();
    for (const e of this.enemies) if (!e.dead) this.hash.insert(e);
    for (const p of this.players) if (!p.gone) updatePlayer(this, p, dt);
    for (let i = 0; i < this.enemies.length; i++) { const e = this.enemies[i]; if (!e.dead) updateEnemy(this, e, dt); }
    this.updateProjs(dt);
    this.updateZones(dt);
    this.updateSummons(dt);
    for (const d of this.decoys) { d.t -= dt; if (d.follow) { d.x = d.follow.x; d.y = d.follow.y; if (d.follow.dead) d.gone = true; } if (d.t <= 0) d.gone = true; }
    this.updatePickups(dt);
    this.ctl.update(dt);
    if (this.tickN % 20 === 0) {
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.zones = this.zones.filter((z) => !z.dead);
      this.summons = this.summons.filter((s) => !s.dead);
    }
    this.projs = this.projs.filter((p) => !p.dead);
    if (this.decoys.length) this.decoys = this.decoys.filter((d) => !d.gone);
    if (this.endT > 0) { this.endT -= dt; if (this.endT <= 0) this.state = this.endState; return; }
    if (!this.alive().length) { this.endState = 'lost'; this.endT = 1.6; this.emit('bn', '全員倒下', 'DEFEATED', 2); }
    else if (this.lvQueue > 0) { this.lvQueue--; this.startPicks(this.time < 1 ? 'supply' : 'level'); }
  }
  win() { if (this.endT > 0) return; this.endState = 'won'; this.endT = 3.2; this.emit('bn', '關卡完成', 'STAGE CLEAR', 1); for (const g of this.pickups.values()) if (g.type === 'g' || g.type === 'c') this.attract(g, this.alive()[0] || this.players[0]); }

  // ───────── 查詢 ─────────
  nearestEnemy(x, y, maxR, skip) {
    let best = null, bd = maxR * maxR;
    this.hash.query(x, y, maxR, (e) => {
      if (e === skip || e.spawnT > 0.25) return;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }
  enemiesIn(x, y, r, out = []) { out.length = 0; this.hash.query(x, y, r, (e) => out.push(e)); return out; }
  randomEnemies(x, y, r, n) {
    const arr = this.enemiesIn(x, y, r);
    this.rng.shuffle(arr);
    return arr.slice(0, n);
  }
  // 找敵人最密集的位置（抽樣）
  cluster(x, y, r, rad = 90) {
    const arr = this.enemiesIn(x, y, r);
    if (!arr.length) return null;
    let best = arr[0], bc = -1;
    for (let i = 0; i < Math.min(6, arr.length); i++) {
      const c = arr[Math.floor(this.rng.next() * arr.length)];
      let n = 0;
      this.hash.query(c.x, c.y, rad, () => n++);
      if (n > bc) { bc = n; best = c; }
    }
    return best;
  }
  lineHits(x, y, a, len, width, cb) {
    const ca = Math.cos(a), sa = Math.sin(a), hw = width / 2;
    this.hash.query(x + ca * len / 2, y + sa * len / 2, len / 2 + hw, (e) => {
      const dx = e.x - x, dy = e.y - y, t = dx * ca + dy * sa;
      if (t < -e.r || t > len + e.r) return;
      if (Math.abs(-dx * sa + dy * ca) <= hw + e.r) cb(e);
    });
  }
  playersIn(x, y, r, cb) {
    for (const p of this.players) if (!p.gone && !p.down && dist2(x, y, p.x, p.y) <= r * r) cb(p);
  }
  nearestPlayer(x, y, anyState) {
    let best = null, bd = Infinity;
    for (const p of this.players) {
      if (p.gone || p.down || (!anyState && p.stealth > 0)) continue;
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // ───────── 傷害 / 治療 ─────────
  // 由玩家造成的一次打擊：套用傷害加成與暴擊
  strike(p, e, base, o) {
    let d = base * (p ? p.st.dmg * bDmg(p) : 1), crit = false;
    if (p && (o && o.crit || this.rng.next() < p.st.crit + (o && o.critAdd || 0))) { d *= p.st.critDmg; crit = true; }
    this.damageEnemy(e, d, p, crit, o);
  }
  damageEnemy(e, amount, p, crit, o) {
    if (e.dead) return;
    if (e.mark > 0) amount *= 1.3;
    e.hp -= amount; e.flash = 0.1;
    if (e.def.boss && e.hp > 0) {            // 首領每掉 25% 血噴出補給，讓長時間的首領戰撐得下去
      const q = Math.floor((1 - e.hp / e.maxHp) * 4);
      if (q > (e.supplyQ || 0)) { e.supplyQ = q; for (let i = 0; i < 1 + this.n; i++) { const a = i * 2.1 + q; this.drop('h', e.x + Math.cos(a) * (e.r + 70), e.y + Math.sin(a) * (e.r + 70), 20); } this.emit('a', 'heal'); }
    }
    if (p) { p.stats.dmg += amount; p.ult = Math.min(p.ultMax, p.ult + Math.min(amount, 80) * (e.def.boss ? 0.004 : 0.012) * p.st.ultRate); }   // 打首領的充能較慢，避免寶具無限連發
    if (!(o && o.quiet) && this._dmgEv < 14) { this._dmgEv++; this.emit('d', e.x | 0, (e.y - e.r) | 0, Math.max(1, Math.round(amount)), crit ? 1 : 0); }
    if (o) {
      const res = 1 - (e.def.kbRes || 0) * (e.elite ? 1 : 1);
      if (o.kb && res > 0) {
        let nx = o.nx, ny = o.ny;
        if (nx === undefined) { const sx = o.sx !== undefined ? o.sx : (p ? p.x : e.x), sy = o.sy !== undefined ? o.sy : (p ? p.y : e.y); const dx = e.x - sx, dy = e.y - sy, d = Math.hypot(dx, dy) || 1; nx = dx / d; ny = dy / d; }
        const k = o.kb * res * (e.elite ? 0.5 : 1);
        e.kx += nx * k; e.ky += ny * k;
      }
      if (o.dot) { e.dot = Math.max(e.dot, o.dot * (p ? p.st.dmg : 1)); e.dotT = Math.max(e.dotT, o.dotDur || 3); e.dotP = p; }
      if (o.slow) { e.slowF = Math.max(e.slowT > 0 ? e.slowF : 0, o.slow); e.slowT = Math.max(e.slowT, o.slowDur || 1.5); }
      if (o.stun && !e.def.boss) e.stunT = Math.max(e.stunT, o.stun * (e.elite ? 0.5 : 1));
      if (o.stun && e.def.boss) { e.slowF = 0.5; e.slowT = Math.max(e.slowT, o.stun); }
      if (o.mark) e.mark = Math.max(e.mark, o.mark);
    }
    if (e.hp <= 0) this.killEnemy(e, p);
  }
  killEnemy(e, p, silent) {
    if (e.dead) return;
    e.dead = true; this.kills++;
    if (p) p.stats.kills++;
    for (const q of this.players) q.ult = Math.min(q.ultMax, q.ult + (q === p ? 1.6 : 0.8) * q.st.ultRate * (e.elite ? 6 : 1));
    const def = e.def;
    this.emit('k', def.idx, e.x | 0, e.y | 0, e.elite ? 1 : 0);
    if (!e.noDrop) {
      const xp = def.xp * (e.elite ? 12 : 1);
      this.dropGem(e.x, e.y, xp);
      const r = this.rng.next();
      if (def.coins) for (let i = 0; i < 4; i++) this.drop('c', e.x + this.rng.range(-20, 20), e.y + this.rng.range(-20, 20), def.coins / 4);
      else if (r < 0.03) this.drop('c', e.x, e.y, 2 + Math.floor(this.stage.diff * 2));
      else if (r < 0.038) this.drop('h', e.x, e.y, 20);
      else if (r < 0.041) this.drop('m', e.x, e.y, 0);
      if (e.elite || def.boss) { this.drop('x', e.x, e.y, 0); for (let i = 0; i < (def.boss ? 12 : 4); i++) this.drop('c', e.x + this.rng.range(-40, 40), e.y + this.rng.range(-40, 40), 2 + Math.floor(this.stage.diff * 2)); }
    }
    if (def.split && !silent) for (let i = 0; i < def.splitN; i++) { const c = spawnEnemy(this, def.split, e.x + this.rng.range(-14, 14), e.y + this.rng.range(-14, 14), { zone: e.zone, instant: true }); c.kx = this.rng.range(-200, 200); c.ky = this.rng.range(-200, 200); }
    this.ctl.onKill(e);
  }
  // 圓形範圍傷害（玩家方）
  aoe(x, y, r, base, p, o) {
    const opt = Object.assign({ sx: x, sy: y }, o);
    this.hash.query(x, y, r, (e) => this.strike(p, e, base, opt));
    if (!(o && o.noFx)) this.emit('b', x | 0, y | 0, r | 0, (o && o.fx) || 0);
  }
  damagePlayer(p, amount, src) {
    if (p.down || p.gone || p.invuln > 0 || p.jump) return;
    amount = Math.max(1, amount - p.st.armor);
    if (p.shield > 0) { const a = Math.min(p.shield, amount); p.shield -= a; amount -= a; }
    if (amount <= 0) return;
    p.hp -= amount; p.stats.taken += amount; p.hurt = 0.2;
    this.emit('d', p.x | 0, (p.y - 40) | 0, Math.round(amount), 3);
    if (p.hp <= 0) {
      p.hp = 0;
      if (p.revives > 0) { p.revives--; this.revive(p, 0.5, true); this.emit('t', p.x | 0, (p.y - 60) | 0, '不死鳥！', 3); }
      else { p.down = true; p.reviveP = 0; p.stats.downs++; this.emit('t', p.x | 0, (p.y - 60) | 0, '倒地', 3); this.emit('a', 'down'); }
    }
  }
  revive(p, frac, blast) {
    p.down = false; p.hp = Math.max(p.hp, p.st.maxHp * frac); p.invuln = 2.5; p.reviveP = 0;
    this.emit('r', p.x | 0, p.y | 0, 150, 2);
    if (blast) this.hash.query(p.x, p.y, 170, (e) => this.damageEnemy(e, 30 * this.hpMul, null, false, { kb: 400, sx: p.x, sy: p.y, stun: 1 }));
  }
  heal(p, amount, src, overheal) {
    if (p.down || p.gone) return;
    amount *= src ? src.st.heal : 1;
    const before = p.hp;
    p.hp = Math.min(p.st.maxHp, p.hp + amount);
    const done = p.hp - before, extra = amount - done;
    if (overheal && extra > 0) p.shield = Math.min(p.st.maxHp * 0.4, p.shield + extra * 0.6);
    if (src && src !== p) src.stats.heal += done; else if (src) src.stats.heal += done * 0.5;
    if (done >= 1) this.emit('d', p.x | 0, (p.y - 44) | 0, Math.round(done), 2);
  }

  // ───────── 生成 ─────────
  shoot(p, o) {
    const pr = Object.assign({
      id: (this.prid = (this.prid % 65000) + 1), k: 0, x: p ? p.x : 0, y: p ? p.y - 14 : 0, a: 0, speed: 600, dmg: 1, r: 7,
      pierce: 0, life: 1, team: 0, owner: p, aux: 0, age: 0, dead: false, hit: null,
    }, o);
    pr.k = PROJ_KINDS.indexOf(o.kind);
    pr.vx = Math.cos(pr.a) * pr.speed; pr.vy = Math.sin(pr.a) * pr.speed;
    this.projs.push(pr);
    return pr;
  }
  addZone(o) {
    const z = Object.assign({ id: (this.zid = (this.zid % 65000) + 1), x: 0, y: 0, r: 60, t: 0, dur: 1, delay: 0, tick: 0.25, tk: 0, team: 0, a: 0, len: 0, w: 0, dead: false }, o);
    z.k = ZONE_KINDS.indexOf(o.kind);
    this.zones.push(z);
    return z;
  }
  addSummon(o) {
    const s = Object.assign({ id: (this.sid = (this.sid % 65000) + 1), x: 0, y: 0, face: 1, st: 0, t: 0, dead: false }, o);
    s.k = SUMMON_KINDS.indexOf(o.kind);
    this.summons.push(s);
    return s;
  }
  drop(type, x, y, v) {
    if (solidAt(this.L, x, y)) return;
    const g = { id: (this.gid = (this.gid % 65000) + 1), type, x, y, v, to: null, sp: 0, born: this.time };
    this.pickups.set(g.id, g);
    this.emit('g+', g.id, type, x | 0, y | 0, Math.round(v));
    return g;
  }
  dropGem(x, y, v) {
    if (this.pickups.size > 420) {       // 太多寶石時合併到附近既有的寶石
      for (const g of this.pickups.values()) if (g.type === 'g' && !g.to && dist2(g.x, g.y, x, y) < 200 * 200) { g.v += v; return; }
    }
    this.drop('g', x + this.rng.range(-6, 6), y + this.rng.range(-6, 6), v);
  }
// 誘餌：吸引範圍內的敵人，時間到（或 follow 的召喚物消失）就失效
  addDecoy(x, y, r, dur, follow) {
    const d = { x, y, r, t: dur, down: false, gone: false, stealth: 0, isDecoy: true, follow };
    this.decoys.push(d);
    this.hash.query(x, y, r, (e) => { if (!e.def.boss && !e.def.structure) e.tgt = d; });
    return d;
  }
    attract(g, p) { if (g.to || !p) return; g.to = p; g.sp = 120; this.emit('g>', g.id, p.id); }

  // ───────── 子彈 ─────────
  updateProjs(dt) {
    const L = this.L;
    for (const pr of this.projs) {
      if (pr.dead || pr.orbit) continue;
      pr.age += dt;
      if (pr.homing && pr.team === 0) {
        if (!pr.tgt || pr.tgt.dead) pr.tgt = this.nearestEnemy(pr.x, pr.y, 360);
        if (pr.tgt) { pr.a = lerpAngle(pr.a, Math.atan2(pr.tgt.y - pr.y, pr.tgt.x - pr.x), Math.min(1, pr.homing * dt)); pr.vx = Math.cos(pr.a) * pr.speed; pr.vy = Math.sin(pr.a) * pr.speed; }
      }
      if (pr.ret && !pr.back && pr.age > pr.life * 0.5) { pr.back = true; pr.hit = null; pr.pierce = 99; }
      if (pr.back && pr.owner) { pr.a = Math.atan2(pr.owner.y - 14 - pr.y, pr.owner.x - pr.x); pr.vx = Math.cos(pr.a) * pr.speed; pr.vy = Math.sin(pr.a) * pr.speed; if (dist2(pr.x, pr.y, pr.owner.x, pr.owner.y - 14) < 400) pr.dead = true; }
      if (pr.lob) { // 拋物線投擲物：飛到目的地才生效
        pr.x += pr.vx * dt; pr.y += pr.vy * dt;
        if (pr.age >= pr.life) { pr.dead = true; pr.onLand && pr.onLand(this, pr); }
        continue;
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.age >= pr.life) { pr.dead = true; this.projEnd(pr); continue; }
      if (blocksShot(L, pr.x, pr.y)) {
        if (pr.bounce > 0 && pr.team === 0) { pr.bounce--; pr.x -= pr.vx * dt; pr.y -= pr.vy * dt; if (blocksShot(L, pr.x + pr.vx * dt, pr.y)) pr.vx = -pr.vx; else pr.vy = -pr.vy; pr.a = Math.atan2(pr.vy, pr.vx); }
        else { pr.dead = true; this.projEnd(pr); this.emit('h', pr.x | 0, pr.y | 0, pr.k); continue; }
      }
      if (pr.team === 0) {
        this.hash.query(pr.x, pr.y, pr.r, (e) => {
          if (pr.dead || (pr.hit && pr.hit.has(e.id))) return;
          this.strike(pr.owner, e, pr.dmg, pr);
          this.emit('h', pr.x | 0, pr.y | 0, pr.k);
          if (pr.onHit) pr.onHit(this, pr, e);
          if (pr.aoe) { pr.dead = true; this.projEnd(pr); return; }
          if (pr.bounce > 0) {
            pr.bounce--; (pr.hit || (pr.hit = new Set())).add(e.id);
            const n = this.nearestEnemy(pr.x, pr.y, 300, e);
            if (n) { pr.a = Math.atan2(n.y - pr.y, n.x - pr.x); pr.vx = Math.cos(pr.a) * pr.speed; pr.vy = Math.sin(pr.a) * pr.speed; pr.age = Math.max(0, pr.age - 0.25); }
            return;
          }
          if (pr.pierce > 0) { pr.pierce--; (pr.hit || (pr.hit = new Set())).add(e.id); }
          else pr.dead = true;
        });
      } else {
        for (const p of this.players) {
          if (p.down || p.gone) continue;
          const rr = pr.r + 12;
          if (dist2(pr.x, pr.y, p.x, p.y - 12) <= rr * rr) { this.damagePlayer(p, pr.dmg); pr.dead = true; this.emit('h', pr.x | 0, pr.y | 0, pr.k); break; }
        }
      }
    }
  }
  projEnd(pr) {
    if (pr.aoe && pr.team === 0) this.aoe(pr.x, pr.y, pr.aoe, pr.aoeDmg || pr.dmg, pr.owner, { fx: pr.fx || 0, dot: pr.dot, dotDur: pr.dotDur, kb: 120, critAdd: pr.critAdd });
    if (pr.onEnd) pr.onEnd(this, pr);
  }

  // ───────── 區域效果 ─────────
  updateZones(dt) {
    for (const z of this.zones) {
      if (z.dead) continue;
      z.t += dt;
      if (z.follow) { if (z.follow.gone || z.follow.dead) { z.dead = true; continue; } z.x = z.follow.x; z.y = z.follow.y + (z.oy || 0); }
      if (z.upd) z.upd(this, z, dt);
      else if (z.t >= z.delay) {
        if (!z.started) { z.started = true; z.onStart && z.onStart(this, z); }
        z.tk -= dt;
        if (z.tk <= 0) { z.tk += z.tick; this.zoneTick(z); }
      }
      if (z.t >= z.dur && !z.dead) { z.dead = true; z.onEnd && z.onEnd(this, z); }
    }
  }
  zoneTick(z) {
    if (z.team === 1) {                       // 敵方：預警結束後傷害玩家
      if (z.once && z.fired) return;
      z.fired = true;
      if (z.len) { const ca = Math.cos(z.a), sa = Math.sin(z.a); for (const p of this.players) { const dx = p.x - z.x, dy = p.y - z.y, t = dx * ca + dy * sa; if (t >= 0 && t <= z.len && Math.abs(-dx * sa + dy * ca) <= z.w / 2 + 10) this.damagePlayer(p, z.dmg); } }
      else { this.playersIn(z.x, z.y, z.r, (p) => this.damagePlayer(p, z.dmg)); if (z.once) this.emit('b', z.x | 0, z.y | 0, z.r | 0, 3); }
      return;
    }
    const p = z.owner;
    if (z.len) {
      this.lineHits(z.x, z.y, z.a, z.len, z.w, (e) => { this.strike(p, e, z.dmg, z.hitOpt); if (z.burst && this.rng.next() < 0.12) this.aoe(e.x, e.y, 46, z.dmg * 1.5, p, { fx: 1 }); });
      return;
    }
    if (z.dmg || z.pull || z.hitOpt) {
      this.hash.query(z.x, z.y, z.r, (e) => {
        if (z.pull && !e.def.boss && !e.def.structure) { const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1; const f = z.pull * z.tick; e.x += dx / d * Math.min(d, f); e.y += dy / d * Math.min(d, f); }
        if (z.dmg) this.strike(p, e, z.dmg, z.hitOpt);
        else this.damageEnemy(e, 0, null, false, z.hitOpt);
      });
    }
    if (z.heal || z.buff) this.playersIn(z.x, z.y, z.r, (q) => { if (z.heal) this.heal(q, z.heal * z.tick, p); if (z.buff) addBuff(q, z.kind, z.buff); });
  }

  // ───────── 召喚物 ─────────
  updateSummons(dt) {
    for (const s of this.summons) {
      if (s.dead) continue;
      s.t += dt;
      if (s.owner && s.owner.gone) { s.dead = true; continue; }
      if (s.life !== undefined && s.t >= s.life) { s.dead = true; this.emit('r', s.x | 0, s.y | 0, 30, 0); continue; }
      if (s.upd) s.upd(this, s, dt);
    }
  }

  // ───────── 掉落物 ─────────
  updatePickups(dt) {
    for (const g of this.pickups.values()) {
      if (g.to) {
        const p = g.to;
        if (p.gone) { g.to = null; continue; }
        g.sp = Math.min(900, g.sp + 1600 * dt);
        const dx = p.x - g.x, dy = p.y - 14 - g.y, d = Math.hypot(dx, dy) || 1;
        if (d < 20 || d < g.sp * dt) { this.collect(g, p); continue; }
        g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
        continue;
      }
      for (const p of this.players) {
        if (p.down || p.gone) continue;
        const r = (g.type === 'g' || g.type === 'c') ? p.st.magnet : 34;
        if (dist2(g.x, g.y, p.x, p.y) < r * r) { this.attract(g, p); break; }
      }
    }
  }
  collect(g, p) {
    this.pickups.delete(g.id);
    switch (g.type) {
      case 'g': this.giveXp(g.v * p.st.xp); break;
      case 'c': this.coins += g.v; this.emit('a', 'coin'); break;
      case 'h': this.heal(p, g.v + p.st.maxHp * 0.12, null); this.emit('a', 'heal'); break;
      case 'k': this.heal(p, g.v, g.src || null); addBuff(p, 'food', { t: 7, haste: g.buff || 0.15, dmg: g.bdmg || 0 }); this.emit('a', 'heal'); break;
      case 'm': for (const o of this.pickups.values()) if (o.type === 'g' || o.type === 'c') this.attract(o, p); this.emit('t', p.x | 0, (p.y - 60) | 0, '磁力吸收！', 1); break;
      case 'x': this.coins += 8; this.startPicks('chest'); break;
    }
  }
  giveXp(v) {
    this.xp += v;
    while (this.xp >= this.xpNeed) { this.xp -= this.xpNeed; this.level++; this.xpNeed = this.needFor(this.level); this.lvQueue++; }
  }

  // ───────── 升級三選一 ─────────
  startPicks(reason) {
    if (this.state !== 'play') { if (reason === 'chest') this.lvQueue++; return; }
    this.state = 'levelup'; this.pickReason = reason; this.picks = {}; this.pickT = 25;
    for (const p of this.players) { if (p.gone) continue; this.picks[p.id] = { opts: rollOptions(this, p, 3), done: false, rerolls: p.rerolls }; }
    this.pickSeq = (this.pickSeq || 0) + 1;
    this.emit('a', reason === 'chest' ? 'chest' : 'levelup');
  }
  choose(pid, i) {
    const pk = this.picks && this.picks[pid];
    if (!pk || pk.done) return;
    const p = this.player(pid);
    const opt = pk.opts[i < 0 || i >= pk.opts.length ? Math.floor(this.rng.next() * pk.opts.length) : i];
    applyOption(this, p, opt);
    pk.done = true; pk.picked = opt; this.pickLog.push([pid, opt]);
    if (Object.values(this.picks).every((x) => x.done)) { this.state = 'play'; this.picks = null; }
  }
  reroll(pid) {
    const pk = this.picks && this.picks[pid], p = this.player(pid);
    if (!pk || pk.done || p.rerolls <= 0) return;
    p.rerolls--; pk.rerolls = p.rerolls; pk.opts = rollOptions(this, p, 3); pk.seq = (pk.seq || 0) + 1;
  }
  removePlayer(pid) {
    const p = this.player(pid);
    if (!p) return;
    p.gone = true; p.down = true;
    if (this.picks && this.picks[pid]) { delete this.picks[pid]; if (Object.values(this.picks).every((x) => x.done)) { this.state = 'play'; this.picks = null; } }
  }
}

export { ENEMIES, TAU, TILE, angDiff, moveBody, recalc };
