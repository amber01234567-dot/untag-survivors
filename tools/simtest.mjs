// 無頭模擬測試：用簡單的機器人跑完整關卡，檢查不會噴錯並粗估平衡。
// 用法：node tools/simtest.mjs [stageId] [charId|all] [players] [diff]
import { World } from '../src/sim/world.js';
import { STAGES } from '../src/data/chapters.js';
import { CHAR_LIST } from '../src/data/characters.js';
import { TILE, T_FLOOR } from '../src/sim/const.js';
import { zoneAt } from '../src/sim/levelgen.js';

const [stageId = '1-1', who = 'all', nP = '1', diff = '0', meta = '0'] = process.argv.slice(2);
const M = +meta, BONUS = { hp: 0.8 * M, dmg: 0.7 * M, speed: 0.1 * M, cd: 0.1 * M, armor: 4 * M, regen: 1 * M, magnet: 0.6 * M, xp: 0.25 * M, crit: 0.1 * M, revives: Math.round(2 * M), rerolls: 0, ult: 0.3 * M, coin: 0 };

function bfs(L, gx, gy) {
  const d = new Uint16Array(L.W * L.H).fill(65535), q = new Int32Array(L.W * L.H);
  let h = 0, t = 0; const s = Math.floor(gy / TILE) * L.W + Math.floor(gx / TILE);
  d[s] = 0; q[t++] = s;
  while (h < t) { const i = q[h++]; for (const j of [i - 1, i + 1, i - L.W, i + L.W]) if (j >= 0 && j < d.length && d[j] === 65535 && L.tiles[j] === T_FLOOR) { d[j] = d[i] + 1; q[t++] = j; } }
  return d;
}
function run(stage, chars, diffI, seed) {
  const W = new World({ stage, diff: diffI, seed, players: chars.map((c, i) => ({ id: i, name: 'bot' + i, charId: c, bonus: BONUS })) });
  const L = W.L; let nav = null, navKey = '', minHp = 1, lvlAt = [];
  const maxT = 60 * 60 * 14;
  for (let tick = 0; tick < maxT && (W.state === 'play' || W.state === 'levelup'); tick++) {
    if (W.state === 'levelup') { for (const p of W.players) W.choose(p.id, 0); }
    for (const p of W.players) {
      if (p.down) continue;
      minHp = Math.min(minHp, p.hp / p.st.maxHp);
      const zi = zoneAt(L, p.x, p.y);
      let goal = null, chest = null;
      for (const g of W.pickups.values()) if (g.type === 'x' || g.type === 'h' || g.type === 'k') chest = g;
      const act = L.zones.find((z) => z.state === 'active'), open = L.zones.find((z) => z.state === 'open' && z.kind !== 'treasure') || L.zones.find((z) => z.state === 'open');
      let mx = 0, my = 0;
      const inAct = act && zi === act.idx;
      if (chest && (!act || inAct)) goal = chest; else if (act && !inAct) goal = { x: act.cx, y: act.cy }; else if (!act && open) goal = { x: open.cx, y: open.cy };
      if (act && inAct && act.obj.t === 'nests') { const n = act.obj.nests.find((e) => !e.dead); if (n) goal = n; }
      if (act && inAct && (act.obj.t === 'elite' || act.obj.t === 'boss') && p.def.role === 'melee') goal = act.obj.ent;
      if (goal) {
        const key = (goal.x | 0) + ',' + (goal.y | 0);
        if (key !== navKey || tick % 30 === 0) { nav = bfs(L, goal.x, goal.y); navKey = key; }
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), i = ty * L.W + tx; let best = nav[i];
        if (best === 0) { mx = goal.x - p.x; my = goal.y - p.y; }
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const v = nav[i + oy * L.W + ox]; if (v < best && !(ox && oy && (nav[i + ox] === 65535 || nav[i + oy * L.W] === 65535))) { best = v; mx = (tx + ox + 0.5) * TILE - p.x; my = (ty + oy + 0.5) * TILE - p.y; } }
      }
      // 閃避：遠離附近敵人
      let ax = 0, ay = 0;
      const kite = p.def.role === 'melee' ? (p.hp < p.st.maxHp * 0.5 ? 150 : 70) : 170;
      W.hash.query(p.x, p.y, kite, (e) => { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; ax += dx / d / d; ay += dy / d / d; });
      let danger = false;
      for (const z of W.zones) if (z.team === 1 && !z.len) { const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1; if (d < z.r + 30) { ax = dx / d; ay = dy / d; danger = true; } }
      W.hash.query(p.x, p.y, 230, (e) => { if (e.st !== 1 && e.st !== 2) return; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; if (e.def.ai === 'exploder') { ax += dx / d * 0.5; ay += dy / d * 0.5; } else { ax += -dy / d * 0.5; ay += dx / d * 0.5; } danger = true; });
      for (const pr of W.projs) if (pr.team === 1) { const dx = p.x - pr.x, dy = p.y - pr.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const c = (pr.vx * dx + pr.vy * dy) / (d * (pr.speed || 1)); if (c > 0.6) { const s = (pr.vx * dy - pr.vy * dx) > 0 ? 1 : -1; ax += pr.vy / pr.speed * s * 0.04; ay += -pr.vx / pr.speed * s * 0.04; } } }
      if (danger) { mx = 0; my = 0; }
      const ml = Math.hypot(mx, my) || 1, al = Math.hypot(ax, ay);
      mx = mx / ml * (goal ? 1 : 0) + (al ? ax / al * 1.3 : 0); my = my / ml * (goal ? 1 : 0) + (al ? ay / al * 1.3 : 0);
      if (!goal && !al && act) { mx = act.cx - p.x; my = act.cy - p.y; if (Math.hypot(mx, my) < 120) mx = my = 0; }
      const l = Math.hypot(mx, my) || 1;
      p.in.mx = mx / l; p.in.my = my / l; p.in.k = 3;
    }
    W.step(1 / 60);
    W.ev.length = 0;
    if (tick % 3600 === 0) lvlAt.push(W.level);
  }
  return { state: W.state, t: Math.round(W.time), lv: W.level, kills: W.kills, coins: Math.round(W.coins), minHp: +minHp.toFixed(2), zones: W.ctl.cleared, dmg: W.players.map((p) => Math.round(p.stats.dmg)), heal: W.players.map((p) => Math.round(p.stats.heal)), downs: W.players.map((p) => p.stats.downs), lvlAt };
}
const stage = STAGES[stageId];
const list = who === 'all' ? CHAR_LIST.map((c) => c.id) : who.split(',');
if (+nP > 1 && who !== 'all') { console.log(stageId, list.join('+'), JSON.stringify(run(stage, list, +diff, 12345))); }
else for (const c of list) {
  const t0 = Date.now();
  try { const r = run(stage, Array.from({ length: +nP }, () => c), +diff, 12345); console.log(stageId, c.padEnd(12), JSON.stringify(r), (Date.now() - t0) + 'ms'); }
  catch (e) { console.log(stageId, c, 'ERROR', e.stack.split('\n').slice(0, 5).join('\n')); }
}
