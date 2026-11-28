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

// 室內 / 戶外兩種尺度：戶外（第二系列起）每區面積約 1.5 倍、通道更寬
const DIMS = {
  indoor: { CW: 48, CH: 38, COR: 6, k: 1, SIZES: { start: [20, 14], combat: [30, 22], treasure: [18, 14], final: [36, 26] } },
  outdoor: { CW: 60, CH: 48, COR: 10, k: 1.22, SIZES: { start: [24, 18], combat: [37, 27], treasure: [22, 18], final: [44, 32] } },
};

// 非矩形區域的大小 [戰鬥區, 終點區]（格）。必須塞得進戶外的一格 60x48，四周留通道。
const SHAPE_SIZE = { avenue: [[52, 38], [52, 40]], grove: [[50, 38], [52, 40]], crypt: [[50, 38], [52, 40]], bog: [[52, 40], [52, 40]], wind: [[52, 38], [52, 40]], ringpool: [[46, 38], [50, 40]], rift: [[50, 38], [52, 40]], pier: [[50, 36], [50, 38]], islands: [[50, 38], [52, 40]], round: [[40, 34], [46, 40]], cave: [[46, 36], [50, 40]], hall: [[44, 30], [50, 36]], cross: [[46, 38], [50, 40]] };
// 在區域的外框裡挖出指定形狀的地板。set(x, y) 會自動裁在外框內。
function carveShape(z, side, rng, COR, set, unset) {
  const { x: X, y: Y, w, h } = z, cx = X + w / 2, cy = Y + h / 2;
  const ell = (ex, ey, rx, ry) => { for (let y = Math.floor(ey - ry); y <= ey + ry; y++) for (let x = Math.floor(ex - rx); x <= ex + rx; x++) if (((x + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2 <= 1) set(x, y); };
  const rect = (x0, y0, x1, y1) => { for (let y = Math.floor(y0); y < y1; y++) for (let x = Math.floor(x0); x < x1; x++) set(x, y); };
  let pool = null;
  if (z.shape === 'round') ell(cx, cy, w / 2, h / 2);
  else if (z.shape === 'avenue') {                      // 參道：一條寬的橫向大道，兩側是一格一格的小廣場，各用一段短頸連到大道
    const ah = 10, pw = 7, step = 9, nk = 3, pd = Math.floor(h / 2 - ah / 2 - nk - 1);
    rect(X, cy - ah / 2, X + w, cy + ah / 2);
    for (let k = 0; k < 2; k++) for (const fx of [cx - COR / 2 - 2 - pw - k * step, cx + COR / 2 + 2 + k * step]) for (const sy of [-1, 1]) {      // 每側四格，正中央留給上下通道
      const y0 = sy < 0 ? cy - ah / 2 - nk - pd : cy + ah / 2 + nk;
      rect(fx, y0, fx + pw, y0 + pd); rect(fx + pw / 2 - 2, sy < 0 ? cy - ah / 2 - nk : cy + ah / 2, fx + pw / 2 + 2, sy < 0 ? cy - ah / 2 : cy + ah / 2 + nk);
    }
  }
  else if (z.shape === 'bog') {                         // 沼澤群島：中央一塊陸地，周圍一圈小島，用木棧道（6 格寬）串成網，中間是毒水
    const isl = [[cx, cy, 7, 6]], n = 6, a0 = rng.range(0, 6.28);
    for (let i = 0; i < n; i++) { const a = a0 + i * 6.283 / n + rng.range(-0.18, 0.18); isl.push([cx + Math.cos(a) * w * 0.38, cy + Math.sin(a) * h * 0.37, rng.range(5.5, 7), rng.range(4.5, 5.5)]); }
    for (const [ex, ey, rx, ry] of isl) ell(ex, ey, rx, ry);
    const bridge = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); for (let t = 0; t <= 1; t += 0.5 / d) ell(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, 3.1, 3.1); };
    for (let i = 1; i <= n; i++) { bridge(isl[i], isl[i % n + 1]); if (i % 2) bridge(isl[0], isl[i]); }      // 外圈相連 + 每隔一座連回中央
  }
  else if (z.shape === 'wind') {                        // 蜿蜒坑道：一條寬的 S 形通道，兩個彎處各有一個較大的空間
    const A = h / 2 - 9;
    for (let t = 0; t <= 1; t += 0.004) ell(X + t * w, cy + A * Math.sin(t * Math.PI * 2), 6.2, 6.2);
    ell(X + w * 0.25, cy + A, 10, 7.5); ell(X + w * 0.75, cy - A, 10, 7.5);
  } else if (z.shape === 'ringpool') {                  // 環形祭壇：中央是熔岩池（不能走），繞著池子打
    ell(cx, cy, w / 2, h / 2); pool = [w * 0.19, h * 0.19];
  }
  else if (z.shape === 'rift') {                        // 熔岩裂谷：一片空地被幾條彎曲的熔岩裂縫切開，只有幾處石橋能過
    ell(cx, cy, w / 2 + 3, h / 2 + 3); rect(X + 3, Y + 3, X + w - 3, Y + h - 3);
    const crack = (vertical, at) => {
      const len = vertical ? h : w, p1 = rng.range(0, 6.28), amp = rng.range(2, 3.5), bridges = [rng.int(5, Math.floor(len * 0.33)), rng.int(Math.floor(len * 0.6), len - 9)];
      for (let i = 0; i < len; i++) {
        if (bridges.some((b) => i >= b && i < b + 5)) continue;
        const o = Math.round(at + Math.sin(i * 0.22 + p1) * amp);
        for (let k = -1; k <= 1; k++) vertical ? unset(X + o + k, Y + i) : unset(X + i, Y + o + k);
      }
    };
    crack(true, w * 0.3); crack(true, w * 0.7); if (rng.next() < 0.6) crack(false, h * (rng.next() < 0.5 ? 0.24 : 0.76));
  }
  else if (z.shape === 'pier') {                        // 碼頭：中間一條橫向主棧橋，上下伸出一根根突堤，突堤之間是海
    const qh = 12, fw = 6, gw = 4, step = fw + gw;
    rect(X, cy - qh / 2, X + w, cy + qh / 2);
    const off = ((w / 2 - fw / 2) % step + step) % step;
    for (let fx = X + off - step; fx < X + w; fx += step) {
      if (fx < X) continue;
      const up = Math.round((h / 2 - qh / 2) * rng.range(0.55, 1)), dn = Math.round((h / 2 - qh / 2) * rng.range(0.55, 1));
      rect(fx, cy - qh / 2 - up, fx + fw, cy + qh / 2 + dn);
    }
  } else if (z.shape === 'islands') {                   // 浮冰：中央一大塊，四周幾塊浮冰用冰橋相連
    ell(cx, cy, w * 0.24, h * 0.3);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ex = cx + sx * w * rng.range(0.27, 0.31), ey = cy + sy * h * rng.range(0.25, 0.29), rx = w * rng.range(0.16, 0.19), ry = h * rng.range(0.18, 0.21);
      ell(ex, ey, rx, ry);
      for (let t = 0; t <= 1; t += 0.04) ell(cx + (ex - cx) * t, cy + (ey - cy) * t, 2.6, 2.6);
    }
  } else if (z.shape === 'crypt') {                     // 十字墓道：十字形走道，四個角落各一間獨立的小墓室，各有兩扇門通到走道
    rect(cx - 5, Y, cx + 5, Y + h); rect(X, cy - 5, X + w, cy + 5);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x0 = sx < 0 ? X + 1 : cx + 8, x1 = sx < 0 ? cx - 8 : X + w - 1, y0 = sy < 0 ? Y + 1 : cy + 8, y1 = sy < 0 ? cy - 8 : Y + h - 1;
      rect(x0, y0, x1, y1);
      const my = (y0 + y1) / 2, mx = (x0 + x1) / 2;
      rect(sx < 0 ? x1 : cx + 5, my - 2, sx < 0 ? cx - 5 : x0, my + 2); rect(mx - 2, sy < 0 ? y1 : cy + 5, mx + 2, sy < 0 ? cy - 5 : y0);
    }
  } else if (z.shape === 'cave' || z.shape === 'grove') {                      // 洞窟：不規則的圓
    const p1 = rng.range(0, 6.28), p2 = rng.range(0, 6.28), p3 = rng.range(0, 6.28);
    for (let y = Y; y < Y + h; y++) for (let x = X; x < X + w; x++) {
      const dx = (x + 0.5 - cx) / (w / 2), dy = (y + 0.5 - cy) / (h / 2), a = Math.atan2(dy, dx);
      const f = Math.min(1, 0.8 + 0.13 * Math.sin(3 * a + p1) + 0.09 * Math.sin(5 * a + p2) + 0.05 * Math.sin(8 * a + p3));
      if (dx * dx + dy * dy <= f * f) set(x, y);
    }
  } else if (z.shape === 'cross') { rect(cx - w * 0.23, Y, cx + w * 0.23, Y + h); rect(X, cy - h * 0.25, X + w, cy + h * 0.25); }
  else {                                                // hall：方正的大廳，四角小切角
    rect(X, Y, X + w, Y + h);
  }
  // 中心與通道口一定相通
  if (z.shape !== 'bog') rect(cx - 5, cy - 5, cx + 5, cy + 5);
  const b = z.shape === 'bog' ? 3.2 : COR / 2 + 1;      // 沼澤：通道口到中央也是一條棧道，不是大通道
  if (side.U) rect(cx - b, Y, cx + b, cy); if (side.D) rect(cx - b, cy, cx + b, Y + h);
  if (side.L) rect(X, cy - b, cx, cy + b); if (side.R) rect(cx, cy - b, X + w, cy + b);
  if (pool) {                                           // 池子最後挖：通道口到環上是通的，中心不可走
    for (let y = Math.floor(cy - pool[1]); y <= cy + pool[1]; y++) for (let x = Math.floor(cx - pool[0]); x <= cx + pool[0]; x++) if (((x + 0.5 - cx) / pool[0]) ** 2 + ((y + 0.5 - cy) / pool[1]) ** 2 <= 1) unset(x, y);
    return [cx, cy + (pool[1] + h / 2) / 2];             // 新的「區域中心」：池子正下方的環上（首領與目標物出現在這裡）
  }
  return null;
}

export function buildLevel(stage, seed) {
  const rng = new RNG(seed);
  const layout = LAYOUTS[stage.layout];
  const out = !!stage.outdoor, { CW, CH, COR, SIZES, k: SK } = DIMS[out ? 'outdoor' : 'indoor'];
  let mx = 0, my = 0;
  for (const z of layout.zones) { mx = Math.max(mx, z.c[0]); my = Math.max(my, z.c[1]); }
  const W = (mx + 1) * CW, H = (my + 1) * CH;
  const tiles = new Uint8Array(W * H);
  const zoneOf = new Int8Array(W * H).fill(-1);
  const idx = (x, y) => y * W + x;

  // ── 區域 ──
  const zones = layout.zones.map((z, i) => {
    const kind = z.kind || 'combat';
    // 區域形狀（系列三起，由章節的 shapes 指定；沒指定就是原本的矩形房間）
    const sp = stage.shapes && stage.shapes[kind], shape = !sp || z.size ? 'rect' : typeof sp === 'string' ? sp : rng.weighted(sp);
    let [w, h] = z.size ? [Math.round(z.size[0] * SK / 2) * 2, Math.round(z.size[1] * SK / 2) * 2] : shape !== 'rect' && SHAPE_SIZE[shape] ? SHAPE_SIZE[shape][kind === 'final' ? 1 : 0] : SIZES[kind];
    if (kind === 'combat' && !z.size && shape === 'rect') { w += rng.int(-1, 2) * 2; h += rng.int(-1, 1) * 2; }
    if (kind === 'start' || kind === 'treasure') { if (shape !== 'rect') [w, h] = SIZES[kind]; }
    const x = z.c[0] * CW + ((CW - w) >> 1), y = z.c[1] * CH + ((CH - h) >> 1);
    return { idx: i, id: z.id, kind, shape, c: z.c, x, y, w, h, cx: (x + w / 2) * TILE, cy: (y + h / 2) * TILE,
      state: kind === 'start' ? 'cleared' : 'locked', obj: null, floor: null };
  });
  const byId = {};
  for (const z of zones) byId[z.id] = z;

  // 每個區域哪幾邊有通道（非矩形的區域要保證通道口與中心相連）
  const sides = zones.map(() => ({}));
  for (const [a, b] of layout.links) {
    const za = byId[a], zb = byId[b];
    if (za.c[1] === zb.c[1]) { const l = za.c[0] < zb.c[0] ? za : zb, r = l === za ? zb : za; sides[l.idx].R = 1; sides[r.idx].L = 1; }
    else { const t = za.c[1] < zb.c[1] ? za : zb, bt = t === za ? zb : za; sides[t.idx].D = 1; sides[bt.idx].U = 1; }
  }
  for (const z of zones) {
    if (z.shape !== 'rect') { const inb = (x, y) => x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h; const nc = carveShape(z, sides[z.idx], rng, COR, (x, y) => { if (inb(x, y)) tiles[idx(x, y)] = T_FLOOR; }, (x, y) => { if (inb(x, y)) tiles[idx(x, y)] = T_WALL; });
      // 從中心往外走一遍，走不到的地板（被裂縫切掉的孤島）填回牆
      if (nc) { z.cx = nc[0] * TILE; z.cy = nc[1] * TILE; z.pool = true; }
      const seen = new Set(), q = [idx(Math.floor(z.cx / TILE), Math.floor(z.cy / TILE))]; seen.add(q[0]);
      for (let k = 0; k < q.length; k++) { const i = q[k], x = i % W, y = (i - x) / W; for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) { const j = idx(nx, ny); if (inb(nx, ny) && tiles[j] === T_FLOOR && !seen.has(j)) { seen.add(j); q.push(j); } } }
      for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) if (tiles[idx(x, y)] === T_FLOOR && !seen.has(idx(x, y))) tiles[idx(x, y)] = T_WALL;
      continue; }
    for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) tiles[idx(x, y)] = T_FLOOR;
    // 切角，讓房間不是死板的矩形
    const corners = [[z.x, z.y, 1, 1], [z.x + z.w - 1, z.y, -1, 1], [z.x, z.y + z.h - 1, 1, -1], [z.x + z.w - 1, z.y + z.h - 1, -1, -1]];
    for (const [cx, cy, sx, sy] of corners) {
      const k = out ? rng.int(4, 8) : rng.int(2, 5);
      for (let a = 0; a < k; a++) for (let b = 0; b < k - a; b++) tiles[idx(cx + a * sx, cy + b * sy)] = T_WALL;
    }
    // 邊緣凹凸（避開通道口）
    const midX = z.x + z.w / 2, midY = z.y + z.h / 2;
    for (let n = 0; n < (out ? 12 : 6); n++) {
      const side = rng.int(0, 3), len = rng.int(2, out ? 7 : 5), dep = rng.int(1, out ? 3 : 2);
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
    const link = { idx: i, a: za.idx, b: zb.idx, req: (req || [a]).map((id) => byId[id].idx), open: false, tiles: [], horiz: za.c[1] === zb.c[1], half: COR / 2 * TILE };
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
    let n = Math.floor((z.w * z.h) / (z.kind === 'final' ? 150 : 95));
    const midX = z.x + z.w / 2, midY = z.y + z.h / 2;
    if (z.shape === 'hall') {                          // 大廳：對稱的柱列，零散障礙物較少
      n = Math.floor(n * 0.35);
      for (let py = z.y + 4; py < z.y + z.h - 5; py += 6) for (let px = z.x + 4; px < z.x + z.w - 5; px += 7) {
        if (Math.abs(px + 1 - midX) < 6 || Math.abs(py + 1 - midY) < 6) continue;
        if (!clearAround(px, py, 2, 2, 1)) continue;
        for (let ty = py; ty < py + 2; ty++) for (let tx = px; tx < px + 2; tx++) tiles[idx(tx, ty)] = T_OBST;
        props.push({ x: px, y: py, w: 2, h: 2, v: 500 });
      }
    } else if (z.shape === 'grove') {                  // 蘑菇迷林：一圈圈巨菇圍成天然的隔間，每圈留幾個缺口
      n = Math.floor(n * 0.4);
      for (const [ox, oy] of [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.22], [0.24, 0.22]]) {
        const rcx = midX + ox * z.w, rcy = midY + oy * z.h, gap = rng.int(0, 11), rr = rng.range(5, 6);
        for (let i = 0; i < 12; i++) {
          if (i === gap || i === (gap + 4) % 12 || i === (gap + 8) % 12) continue;
          const px = Math.round(rcx + Math.cos(i * 0.5236) * rr - 1), py = Math.round(rcy + Math.sin(i * 0.5236) * rr * 0.85 - 1);
          if (Math.abs(px + 1 - midX) < 5 && (py < z.y + 7 || py + 2 > z.y + z.h - 7)) continue;
          if (Math.abs(py + 1 - midY) < 5 && (px < z.x + 7 || px + 2 > z.x + z.w - 7)) continue;
          if (!clearAround(px, py, 2, 2, 0)) continue;
          for (let ty = py; ty < py + 2; ty++) for (let tx = px; tx < px + 2; tx++) tiles[idx(tx, ty)] = T_OBST;
          props.push({ x: px, y: py, w: 2, h: 2, v: 500 });
        }
      }
    } else if (z.shape === 'pier' || z.shape === 'islands') n = Math.floor(n * 0.6);
    for (let i = 0, tries = 0; i < n && tries < n * 12; tries++) {
      const shape = rng.weighted([[[1, 1], 4], [[2, 2], 3], [[2, 1], 2], [[1, 2], 2], [[3, 1], 1]]);
      const [w, h] = shape;
      const x = rng.int(z.x + 2, z.x + z.w - 3 - w), y = rng.int(z.y + 2, z.y + z.h - 3 - h);
      if (Math.abs(x + w / 2 - midX) < 4.5 && Math.abs(y + h / 2 - midY) < 4.5) continue;            // 區域中心留空
      if (z.pool && Math.abs(x + w / 2 - z.cx / TILE) < 5 && Math.abs(y + h / 2 - z.cy / TILE) < 4) continue;      // 環形祭壇：首領 / 目標物出現的位置留空
      if (Math.abs(y + h / 2 - midY) < 5 && (x < z.x + 7 || x + w > z.x + z.w - 7)) continue;         // 左右通道口
      if (Math.abs(x + w / 2 - midX) < 5 && (y < z.y + 7 || y + h > z.y + z.h - 7)) continue;         // 上下通道口
      if (!clearAround(x, y, w, h, 2)) continue;
      for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) tiles[idx(tx, ty)] = T_OBST;
      props.push({ x, y, w, h, v: rng.int(0, 999) });
      i++;
    }
  }

  // ── 場地機關（戶外系列）：戰鬥區各放幾座，位置由 seed 決定 ──
  // ── 噴發口（火系列的場地危險）：每個戰鬥區固定幾個位置，輪流噴發 ──
  const vents = [];
  if (stage.hazard === 'vent') for (const z of zones) {
    if (z.kind !== 'combat' && z.kind !== 'final') continue;
    for (let i = 0, tries = 0; i < (z.kind === 'final' ? 7 : 6) && tries < 120; tries++) {
      const x = rng.int(z.x + 4, z.x + z.w - 5), y = rng.int(z.y + 4, z.y + z.h - 5);
      if (Math.abs(x - (z.x + z.w / 2)) < 4 && Math.abs(y - (z.y + z.h / 2)) < 4) continue;
      if (!clearAround(x, y, 1, 1, 2)) continue;
      const px = (x + 0.5) * TILE, py = (y + 0.5) * TILE;
      if (vents.some((v) => (v.x - px) ** 2 + (v.y - py) ** 2 < 230 * 230)) continue;
      vents.push({ x: px, y: py, zone: z.idx, ph: rng.range(0, 9) }); i++;
    }
  }
  const devices = [];
  if (stage.devices) for (const z of zones) {
    if (z.kind !== 'combat' && z.kind !== 'final') continue;
    const want = z.kind === 'final' ? 3 : 2;
    for (let i = 0, tries = 0; i < want && tries < 80; tries++) {
      const x = rng.int(z.x + 5, z.x + z.w - 6), y = rng.int(z.y + 5, z.y + z.h - 6);
      if (Math.abs(x - (z.x + z.w / 2)) < 6 && Math.abs(y - (z.y + z.h / 2)) < 5) continue;
      if (!clearAround(x, y, 1, 1, 2)) continue;
      const px = (x + 0.5) * TILE, py = (y + 0.5) * TILE;
      if (devices.some((d) => (d.x - px) ** 2 + (d.y - py) ** 2 < 300 * 300)) continue;
      tiles[idx(x, y)] = T_OBST;
      devices.push({ idx: devices.length, kind: rng.weighted(stage.devices), x: px, y: py, zone: z.idx });
      i++;
    }
  }

  // ── 全圖連通檢查：從出生點走不到的地板（被障礙物圍死的小格子）填成牆。只在有特殊形狀的關卡做，舊章節的地圖不變 ──
  if (stage.shapes) {
    const st0 = zones.find((z) => z.kind === 'start'), seen = new Uint8Array(W * H), q = [idx(Math.floor(st0.cx / TILE), Math.floor(st0.cy / TILE))]; seen[q[0]] = 1;
    for (let k = 0; k < q.length; k++) { const i = q[k]; for (const j of [i - 1, i + 1, i - W, i + W]) if (j >= 0 && j < seen.length && !seen[j] && (tiles[j] === T_FLOOR || tiles[j] === T_GATE)) { seen[j] = 1; q.push(j); } }
    for (let i = 0; i < seen.length; i++) if (tiles[i] === T_FLOOR && !seen[i]) tiles[i] = T_WALL;
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
      if (r < 0.011 && tiles[idx(x - 1, y)] === T_FLOOR && tiles[idx(x + 1, y)] === T_FLOOR && tiles[idx(x, y - 1)] === T_FLOOR && tiles[idx(x, y + 1)] === T_FLOOR) deco.push({ t: 'decal', x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: rng.int(0, 999) });
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
  return { W, H, pxW: W * TILE, pxH: H * TILE, tiles, zoneOf, zones, links, props, deco, lights, devices, vents, outdoor: out, theme: stage.theme, seed,
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
