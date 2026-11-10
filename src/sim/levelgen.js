// 由「關卡拓樸」(LAYOUTS) + seed 生成分層地圖。主機與客戶端用同一顆 seed 會得到完全相同的結果。
//
// 圖層：
//   tiles   碰撞層（牆 / 地板 / 障礙物 / 閘門）
//   props   障礙物外觀（由主題決定長相）
//   deco    地面貼花、牆面招牌、燈具（純視覺）
//   lights  光源（給光照層）
//   zoneOf  每格屬於哪個區域（-1 = 通道 / 牆）
import { TILE, T_WALL, T_FLOOR, T_OBST, T_GATE } from './const.js';
import { RNG } from '../core/util.js';
import { LAYOUTS } from '../data/chapters.js';

const CW = 48, CH = 38, COR = 6;
const SIZES = { start: [20, 14], combat: [30, 22], treasure: [18, 14], final: [36, 26] };

export function buildLevel(stage, seed) {
  const rng = new RNG(seed);
  const layout = LAYOUTS[stage.layout];
  let mx = 0, my = 0;
  for (const z of layout.zones) { mx = Math.max(mx, z.c[0]); my = Math.max(my, z.c[1]); }
  const W = (mx + 1) * CW, H = (my + 1) * CH;
  const tiles = new Uint8Array(W * H);
  const zoneOf = new Int8Array(W * H).fill(-1);
  const idx = (x, y) => y * W + x;

  // ── 區域 ──
  const zones = layout.zones.map((z, i) => {
    const kind = z.kind || 'combat';
    let [w, h] = z.size || SIZES[kind];
    if (kind === 'combat' && !z.size) { w += rng.int(-1, 2) * 2; h += rng.int(-1, 1) * 2; }
    const x = z.c[0] * CW + ((CW - w) >> 1), y = z.c[1] * CH + ((CH - h) >> 1);
    return { idx: i, id: z.id, kind, c: z.c, x, y, w, h, cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE,
      state: kind === 'start' ? 'cleared' : 'locked', obj: null, floor: null };
  });
  const byId = {};
  for (const z of zones) byId[z.id] = z;

  for (const z of zones) {
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) tiles[idx(x, y)] = T_FLOOR;
    // 切角，讓房間不是死板的矩形
    const corners = [[z.x, z.y, 1, 1], [z.x + z.w - 1, z.y, -1, 1], [z.x, z.y + z.h - 1, 1, -1], [z.x + z.w - 1, z.y + z.h - 1, -1, -1]];
    for (const [cx, cy, sx, sy] of corners) {
      const k = rng.int(2, 5);
      for (let a = 0; a < k; a++) for (let b = 0; b < k - a; b++) tiles[idx(cx + a * sx, cy + b * sy)] = T_WALL;
    }
    // 邊緣凹凸（避開通道口）
    const midX = z.x + z.w / 2, midY = z.y + z.h / 2;
    for (let n = 0; n < 6; n++) {
      const side = rng.int(0, 3), len = rng.int(2, 5), dep = rng.int(1, 2);
      if (side < 2) {
        const sx = rng.int(z.x + 5, z.x + z.w - 6 - len);
        if (Math.abs(sx + len / 2 - midX) < COR / 2 + len / 2 + 2) continue;
        for (let a = 0; a < len; a++) for (let b = 0; b < dep; b++) tiles[idx(sx + a, side === 0 ? z.y + b : z.y + z.h - 1 - b)] = T_WALL;
      } else {
        const sy = rng.int(z.y + 5, z.y + z.h - 6 - len);
        if (Math.abs(sy + len / 2 - midY) < COR / 2 + len / 2 + 2) continue;
        for (let a = 0; a < len; a++) for (let b = 0; b < dep; b++) tiles[idx(side === 2 ? z.x + b : z.x + z.w - 1 - b, sy + a)] = T_WALL;
      }
    }
  }

  // ── 通道與閘門 ──
  const links = layout.links.map(([a, b, req], i) => {
    const za = byId[a], zb = byId[b];
    const link = { idx: i, a: za.idx, b: zb.idx, req: (req || [a]).map((id) => byId[id].idx), open: false, tiles: [], horiz: za.c[1] === zb.c[1] };
    if (link.horiz) {
      const l = za.c[0] < zb.c[0] ? za : zb, r = l === za ? zb : za;
      const y0 = l.c[1] * CH + CH / 2 - COR / 2, x0 = l.x + l.w - 3, x1 = r.x + 2;
      for (let x = x0; x <= x1; x++) for (let y = y0; y < y0 + COR; y++) tiles[idx(x, y)] = T_FLOOR;
      const gx = Math.floor((l.x + l.w + r.x) / 2) - 1;
      for (let x = gx; x < gx + 2; x++) for (let y = y0; y < y0 + COR; y++) { tiles[idx(x, y)] = T_GATE; link.tiles.push(idx(x, y)); }
      link.x = (gx + 1) * TILE; link.y = (y0 + COR / 2) * TILE;
    } else {
      const t = za.c[1] < zb.c[1] ? za : zb, bt = t === za ? zb : za;
      const x0 = t.c[0] * CW + CW / 2 - COR / 2, y0 = t.y + t.h - 3, y1 = bt.y + 2;
      for (let y = y0; y <= y1; y++) for (let x = x0; x < x0 + COR; x++) tiles[idx(x, y)] = T_FLOOR;
      const gy = Math.floor((t.y + t.h + bt.y) / 2) - 1;
      for (let y = gy; y < gy + 2; y++) for (let x = x0; x < x0 + COR; x++) { tiles[idx(x, y)] = T_GATE; link.tiles.push(idx(x, y)); }
      link.x = (x0 + COR / 2) * TILE; link.y = (gy + 1) * TILE;
    }
    return link;
  });

  // ── 障礙物 ──
  const props = [];
  const clearAround = (x, y, w, h, pad) => {
    for (let ty = y - pad; ty < y + h + pad; ty++) for (let tx = x - pad; tx < x + w + pad; tx++) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H || tiles[idx(tx, ty)] !== T_FLOOR) return false;
    }
    return true;
  };
  for (const z of zones) {
    const n = Math.floor((z.w * z.h) / (z.kind === 'final' ? 150 : 95));
    const midX = z.x + z.w / 2, midY = z.y + z.h / 2;
    for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
      const shape = rng.weighted([[[1, 1], 4], [[2, 2], 3], [[2, 1], 2], [[1, 2], 2], [[3, 1], 1]]);
      const [w, h] = shape;
      const x = rng.int(z.x + 2, z.x + z.w - 3 - w), y = rng.int(z.y + 2, z.y + z.h - 3 - h);
      if (Math.abs(x + w / 2 - midX) < 4.5 && Math.abs(y + h / 2 - midY) < 4.5) continue;            // 區域中心留空
      if (Math.abs(y + h / 2 - midY) < 5 && (x < z.x + 7 || x + w > z.x + z.w - 7)) continue;         // 左右通道口
      if (Math.abs(x + w / 2 - midX) < 5 && (y < z.y + 7 || y + h > z.y + z.h - 7)) continue;         // 上下通道口
      if (!clearAround(x, y, w, h, 2)) continue;
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) tiles[idx(tx, ty)] = T_OBST;
      props.push({ x, y, w, h, v: rng.int(0, 999) });
      i++;
    }
  }

  // ── 區域歸屬與可走格清單 ──
  for (const z of zones) {
    const fl = [];
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
      const i = idx(x, y);
      if (tiles[i] === T_FLOOR) { zoneOf[i] = z.idx; fl.push(i); }
    }
    z.floor = fl;
  }

  // ── 裝飾層 ──
  const deco = [], lights = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const t = tiles[idx(x, y)];
    if (t === T_WALL && tiles[idx(x, y + 1)] !== T_WALL) {           // 朝南的牆面
      const r = rng.next();
      if (r < 0.085) { deco.push({ t: 'lamp', x: (x + 0.5) * TILE, y: (y + 0.45) * TILE, v: rng.int(0, 99) }); lights.push({ x: (x + 0.5) * TILE, y: (y + 1.6) * TILE, r: 210, v: rng.int(0, 99) }); }
      else if (r < 0.15) deco.push({ t: 'sign', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: rng.int(0, 999) });
    } else if (t === T_FLOOR) {
      const r = rng.next();
      if (r < 0.022) deco.push({ t: 'decal', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: rng.int(0, 999) });
    }
  }
  for (const l of links) lights.push({ x: l.x, y: l.y, r: 170, v: 7, gate: l.idx });

  // ── 目標分配：objs 依序給戰鬥區，最後一個給終點區 ──
  const objs = (stage.objs || []).map((o) => Object.assign({}, o));
  const fin = zones.find((z) => z.kind === 'final');
  if (fin) fin.obj = objs.pop() || { t: 'kill', n: 60 };
  let oi = 0;
  for (const z of zones) {
    if (z.kind === 'combat') z.obj = objs.length ? Object.assign({}, objs[oi++ % objs.length]) : { t: 'kill', n: 40 };
    if (z.kind === 'treasure') z.obj = { t: 'treasure' };
  }

  const start = zones.find((z) => z.kind === 'start');
  return { W, H, pxW: W * TILE, pxH: H * TILE, tiles, zoneOf, zones, links, props, deco, lights, theme: stage.theme, seed,
    spawn: { x: start.cx, y: start.cy } };
}

// ── 碰撞工具 ──
export function solidTile(L, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return true;
  return L.tiles[ty * L.W + tx] !== T_FLOOR;
}
export function solidAt(L, x, y) { return solidTile(L, Math.floor(x / TILE), Math.floor(y / TILE)); }
// 子彈只會被牆與閘門擋住（可以飛過矮障礙物）
export function blocksShot(L, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return true;
  const t = L.tiles[ty * L.W + tx];
  return t === T_WALL || t === T_GATE;
}
function boxSolid(L, x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solidTile(L, tx, ty)) return true;
  return false;
}
// 分軸移動，撞牆時沿牆滑動。回傳是否有被擋住
export function moveBody(L, e, dx, dy, r) {
  let hit = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 10));
  dx /= steps; dy /= steps;
  for (let i = 0; i < steps; i++) {
    if (dx && !boxSolid(L, e.x + dx, e.y, r)) e.x += dx; else if (dx) hit = true;
    if (dy && !boxSolid(L, e.x, e.y + dy, r)) e.y += dy; else if (dy) hit = true;
  }
  return hit;
}
export function openLink(L, link) {
  link.open = true;
  for (const i of link.tiles) L.tiles[i] = T_FLOOR;
}
export function zoneAt(L, x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= L.W || ty >= L.H) return -1;
  return L.zoneOf[ty * L.W + tx];
}

// ── 流場尋路：從所有玩家位置做 BFS，敵人沿距離遞減方向走 ──
export class FlowField {
  constructor(L) { this.L = L; this.d = new Uint16Array(L.W * L.H); this.q = new Int32Array(L.W * L.H); }
  compute(players) {
    const { L, d, q } = this, W = L.W, H = L.H, tiles = L.tiles;
    d.fill(65535);
    let head = 0, tail = 0;
    for (const p of players) {
      if (p.down || p.gone) continue;
      const i = Math.floor(p.y / TILE) * W + Math.floor(p.x / TILE);
      if (i >= 0 && i < d.length && d[i] !== 0) { d[i] = 0; q[tail++] = i; }
    }
    while (head < tail) {
      const i = q[head++], nd = d[i] + 1, x = i % W;
      if (x > 0 && d[i - 1] === 65535 && tiles[i - 1] === T_FLOOR) { d[i - 1] = nd; q[tail++] = i - 1; }
      if (x < W - 1 && d[i + 1] === 65535 && tiles[i + 1] === T_FLOOR) { d[i + 1] = nd; q[tail++] = i + 1; }
      if (i >= W && d[i - W] === 65535 && tiles[i - W] === T_FLOOR) { d[i - W] = nd; q[tail++] = i - W; }
      if (i < W * (H - 1) && d[i + W] === 65535 && tiles[i + W] === T_FLOOR) { d[i + W] = nd; q[tail++] = i + W; }
    }
  }
  // 把前進方向寫進 e.fdx / e.fdy；回傳該格到玩家的距離（格）
  dir(e) {
    const { L, d } = this, W = L.W;
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= L.H - 1) { e.fdx = 0; e.fdy = 0; return 65535; }
    const i = ty * W + tx;
    let best = d[i], bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const v = d[i + oy * W + ox];
      if (v >= best) continue;
      if (ox && oy && (d[i + ox] === 65535 || d[i + oy * W] === 65535)) continue; // 不切牆角
      best = v; bx = ox; by = oy;
    }
    if (!bx && !by) { e.fdx = 0; e.fdy = 0; return d[i]; }
    const gx = (tx + bx + 0.5) * TILE - e.x, gy = (ty + by + 0.5) * TILE - e.y;
    const g = Math.hypot(gx, gy) || 1;
    e.fdx = gx / g; e.fdy = gy / g;
    return d[i];
  }
}
