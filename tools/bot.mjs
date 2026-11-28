// 測試用機器人：simtest（無頭）與 nettest（瀏覽器連線測試）共用。
import { TILE, T_FLOOR } from '../src/sim/const.js';
import { zoneAt } from '../src/sim/levelgen.js';
function bfs(L, gx, gy) {
  const d = new Uint16Array(L.W * L.H).fill(65535), q = new Int32Array(L.W * L.H);
  let h = 0, t = 0; const s = Math.floor(gy / TILE) * L.W + Math.floor(gx / TILE);
  d[s] = 0; q[t++] = s;
  while (h < t) { const i = q[h++]; for (const j of [i - 1, i + 1, i - L.W, i + L.W]) if (j >= 0 && j < d.length && d[j] === 65535 && L.tiles[j] === T_FLOOR) { d[j] = d[i] + 1; q[t++] = j; } }
  return d;
}
// st = { nav, navKey, minHp }（呼叫端保存）；set(p, mx, my, k) 寫入輸入
export function botStep(W, st, tick, set) {
  const L = W.L;
    for (const p of W.players) {
      if (p.down) continue;
      st.minHp = Math.min(st.minHp, p.hp / p.st.maxHp);
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
        if (key !== st.navKey || tick % 30 === 0) { st.nav = bfs(L, goal.x, goal.y); st.navKey = key; }
        const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), i = ty * L.W + tx; let best = st.nav[i];
        if (best === 0) { mx = goal.x - p.x; my = goal.y - p.y; }
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const v = st.nav[i + oy * L.W + ox]; if (v < best && !(ox && oy && (st.nav[i + ox] === 65535 || st.nav[i + oy * L.W] === 65535))) { best = v; mx = (tx + ox + 0.5) * TILE - p.x; my = (ty + oy + 0.5) * TILE - p.y; } }
      }
      // 閃避：遠離附近敵人
      let ax = 0, ay = 0;
      const kite = p.def.role === 'melee' ? (p.hp < p.st.maxHp * 0.5 ? 150 : 70) : 170;
      W.hash.query(p.x, p.y, kite, (e) => { const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; ax += dx / d / d; ay += dy / d / d; });
      let danger = false, zx = 0, zy = 0;
      for (const z of W.zones) if (z.team === 1 && !z.len) { const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1; if (d < z.r + 30) { const w = (z.r + 30 - d) / (z.r + 30) + 0.2; zx += dx / d * w; zy += dy / d * w; danger = true; } }
      if (danger) { if (Math.hypot(zx, zy) < 0.05) { zx = Math.cos(p.id + tick * 0.01); zy = Math.sin(p.id + tick * 0.01); } ax = zx; ay = zy; }
      W.hash.query(p.x, p.y, 230, (e) => { if (e.st !== 1 && e.st !== 2) return; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; if (e.def.ai === 'exploder') { ax += dx / d * 0.5; ay += dy / d * 0.5; } else { ax += -dy / d * 0.5; ay += dx / d * 0.5; } danger = true; });
      for (const pr of W.projs) if (pr.team === 1) { const dx = p.x - pr.x, dy = p.y - pr.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const c = (pr.vx * dx + pr.vy * dy) / (d * (pr.speed || 1)); if (c > 0.6) { const s = (pr.vx * dy - pr.vy * dx) > 0 ? 1 : -1; ax += pr.vy / pr.speed * s * 0.04; ay += -pr.vx / pr.speed * s * 0.04; } } }
      if (danger) { mx = 0; my = 0; }
      const ml = Math.hypot(mx, my) || 1, al = Math.hypot(ax, ay);
      mx = mx / ml * (goal ? 1 : 0) + (al ? ax / al * 1.3 : 0); my = my / ml * (goal ? 1 : 0) + (al ? ay / al * 1.3 : 0);
      if (!goal && !al && act) { mx = act.cx - p.x; my = act.cy - p.y; if (Math.hypot(mx, my) < 120) mx = my = 0; }
      const l = Math.hypot(mx, my) || 1;
      set(p, mx / l, my / l, 3);
    }
}
