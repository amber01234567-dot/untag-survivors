// 地圖圖層繪製。地面層（地板 / 牆 / 障礙物 / 貼花）烘焙成區塊快取；
// 招牌、燈具、閘門每幀動態畫；遮蔽層（管線、布條）畫在角色之上。
// 新主題：在 THEMES 加一組配色與 floor / wall / prop 畫法即可。
import { TILE, T_WALL, T_FLOOR, T_OBST } from '../sim/const.js';
import { hash2 } from '../core/util.js';
import { FXS } from './fxsprites.js';

const CH = 16;                      // 一個區塊 16×16 格
const TAU = Math.PI * 2;

export const THEMES = {
  slums: {
    void: '#06070b', roof: '#0c0e14', roofEdge: '#1b2030', ambient: 'rgba(4,6,14,0.24)',
    neon: ['#ff3d8b', '#2de2e6', '#ffc53d', '#9d6bff'], lamp: '#ffb46b', gate: '#ff3d8b',
    floor(g, x, y, tx, ty) {
      const h = hash2(tx, ty, 1);
      g.fillStyle = h < 0.5 ? '#222936' : '#252d3b'; g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'rgba(255,255,255,0.022)'; if (hash2(tx, ty, 2) < 0.5) g.fillRect(x + h * 20, y + hash2(tx, ty, 3) * 20, 9, 7);
      g.fillStyle = '#181d27';
      if (tx % 2 === 0) g.fillRect(x, y, 1.5, TILE);
      if (ty % 2 === 0) g.fillRect(x, y, TILE, 1.5);
      if (h > 0.95) { g.strokeStyle = '#141922'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + 4, y + 6); g.lineTo(x + 13, y + 15); g.lineTo(x + 11, y + 24); g.lineTo(x + 22, y + 29); g.stroke(); }
      if (h < 0.035) { g.fillStyle = '#c9a53a'; g.globalAlpha = 0.25; g.fillRect(x + 2, y + 13, TILE - 4, 5); g.globalAlpha = 1; }
    },
    wall(g, x, y, tx, ty) {
      g.fillStyle = '#2a2026'; g.fillRect(x, y, TILE, TILE);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) {
        const bx = x + c * 16 + (r % 2 ? -8 : 0), by = y + r * 8, hh = hash2(tx * 2 + c, ty * 4 + r, 4);
        g.fillStyle = hh < 0.3 ? '#3b2a30' : hh < 0.7 ? '#33252b' : '#402d31';
        g.fillRect(bx + 1, by + 1, 15, 6.5);
      }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y + TILE - 7, TILE, 7);
      g.fillStyle = '#4b3a40'; g.fillRect(x, y, TILE, 2);
    },
    prop(g, x, y, w, h, v) {
      const W = w * TILE, H = h * TILE;
      if (w === 2 && h === 2) {            // 大垃圾箱
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 3, y + H - 6, W, 8);
        rr(g, x + 3, y - 4, W - 6, H - 2, 4, '#1f5a45', '#0c2a20');
        g.fillStyle = '#184836'; for (let i = 0; i < 5; i++) g.fillRect(x + 9 + i * 10.5, y + 14, 4, H - 26);
        rr(g, x + 1, y - 9, W - 2, 12, 3, '#2a7558', '#0c2a20');
        g.fillStyle = '#e8e2d0'; g.font = 'bold 8px Arial'; g.textAlign = 'center'; g.fillText('UNTAG', x + W / 2, y + H - 12);
      } else if (w === 1 && h === 1) {
        const k = v % 3;
        g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + 17, y + 28, 15, 5, 0, 0, TAU); g.fill();
        if (k === 0) { rr(g, x + 3, y - 4, 26, 32, 3, '#7a5a38', '#2a1c10'); g.strokeStyle = '#4f3920'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, y - 2); g.lineTo(x + 27, y + 26); g.moveTo(x + 27, y - 2); g.lineTo(x + 5, y + 26); g.stroke(); rr(g, x + 3, y - 4, 26, 5, 2, '#94714a', '#2a1c10'); }
        else if (k === 1) { rr(g, x + 5, y - 6, 22, 34, 6, '#3a6ea5', '#122844'); g.fillStyle = '#2a5380'; g.fillRect(x + 5, y + 2, 22, 3); g.fillRect(x + 5, y + 16, 22, 3); g.fillStyle = '#5b93cf'; g.beginPath(); g.ellipse(x + 16, y - 4, 10, 3.4, 0, 0, TAU); g.fill(); }
        else { for (const [ox, oy, r] of [[10, 18, 10], [22, 20, 9], [16, 8, 9]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, TAU); g.fillStyle = '#17191f'; g.fill(); g.strokeStyle = '#3d424e'; g.lineWidth = 1.3; g.stroke(); } g.fillStyle = '#2a2e38'; g.fillRect(x + 14, y - 3, 4, 4); }
      } else {                             // 路障 / 成排木箱
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 3, y + H - 5, W - 2, 7);
        rr(g, x + 2, y - 2, W - 4, H - 4, 3, '#4a4f5b', '#1a1d24');
        g.save(); g.beginPath(); g.rect(x + 3, y + 3, W - 6, Math.min(12, H - 12)); g.clip(); g.fillStyle = '#e0b83a'; g.fillRect(x, y, W, H);
        g.fillStyle = '#17191f'; for (let i = -2; i < W / 8 + 2; i++) { g.beginPath(); g.moveTo(x + i * 16, y + 16); g.lineTo(x + i * 16 + 8, y + 16); g.lineTo(x + i * 16 + 20, y); g.lineTo(x + i * 16 + 12, y); g.fill(); } g.restore();
      }
    },
    decal(g, x, y, v) {
      const k = v % 4;
      if (k < 2) { g.fillStyle = k ? 'rgba(45,226,230,.10)' : 'rgba(255,61,139,.09)'; g.beginPath(); g.ellipse(x, y, 20 + v % 9, 9 + v % 5, (v % 7) / 5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.ellipse(x - 4, y - 2, 8, 2.5, 0, 0, TAU); g.fill(); }
      else if (k === 2) { g.fillStyle = '#12151b'; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.strokeStyle = '#2b313c'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.stroke(); }
      else { g.fillStyle = 'rgba(200,190,160,.18)'; g.fillRect(x - 6, y - 3, 7, 5); g.fillRect(x + 3, y + 2, 5, 4); g.fillStyle = 'rgba(120,160,90,.2)'; g.fillRect(x - 2, y + 4, 4, 3); }
    },
  },
  arena: {
    void: '#070607', roof: '#100e0f', roofEdge: '#2a2420', ambient: 'rgba(8,5,4,0.24)',
    neon: ['#ffb53d', '#ff5a3d', '#f2e3b0', '#ffb53d'], lamp: '#ffd9a0', gate: '#ffb53d',
    floor(g, x, y, tx, ty) {
      const h = hash2(tx, ty, 1);
      g.fillStyle = h < 0.5 ? '#2e2b27' : '#322f2a'; g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#1a1816';
      if (tx % 3 === 0) g.fillRect(x, y, 1.5, TILE);
      if (ty % 3 === 0) g.fillRect(x, y, TILE, 1.5);
      if (tx % 3 === 0 && ty % 3 === 0) { g.fillStyle = '#3a3632'; g.fillRect(x + 3, y + 3, 2.5, 2.5); }
      if (h > 0.975) { g.fillStyle = 'rgba(70,18,18,.24)'; g.beginPath(); g.ellipse(x + 16, y + 16, 12, 7, h * 6, 0, TAU); g.fill(); }
      if (h < 0.05) { g.fillStyle = '#17150f'; g.fillRect(x + 4, y + 4, 24, 24); g.strokeStyle = '#3d3830'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + 6 + i * 5, y + 5); g.lineTo(x + 6 + i * 5, y + 27); g.stroke(); } }
    },
    wall(g, x, y, tx, ty) {
      g.fillStyle = '#2f2a26'; g.fillRect(x, y, TILE, TILE);
      g.strokeStyle = '#4d453c'; g.lineWidth = 1; g.beginPath();
      for (let i = -1; i < 5; i++) { g.moveTo(x + i * 8, y + TILE); g.lineTo(x + i * 8 + 16, y); g.moveTo(x + i * 8 + 16, y + TILE); g.lineTo(x + i * 8, y); }
      g.save(); g.beginPath(); g.rect(x, y + 3, TILE, TILE - 3); g.clip(); g.stroke(); g.restore();
      g.fillStyle = '#e0b83a'; g.fillRect(x, y + TILE - 5, TILE, 3);
      g.fillStyle = '#17150f'; for (let i = 0; i < 4; i++) g.fillRect(x + i * 8 + ((tx % 2) * 4), y + TILE - 5, 4, 3);
      g.fillStyle = '#5a5046'; g.fillRect(x, y, TILE, 3);
    },
    prop(g, x, y, w, h, v) {
      const W = w * TILE, H = h * TILE;
      g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(x + 3, y + H - 5, W - 2, 7);
      if (w === 2 && h === 2) { rr(g, x + 6, y - 14, W - 12, H + 8, 5, '#3c3a38', '#141312'); g.fillStyle = '#4e4b47'; g.fillRect(x + 12, y - 12, 6, H + 4); g.fillStyle = '#e0b83a'; g.fillRect(x + 6, y + H - 18, W - 12, 5); g.fillStyle = '#17150f'; for (let i = 0; i < 7; i++) g.fillRect(x + 8 + i * 8, y + H - 18, 4, 5); }
      else if (w === 1 && h === 1) {
        if (v % 2) { rr(g, x + 5, y - 6, 22, 34, 5, '#a3362f', '#3a100c'); g.fillStyle = '#7d2620'; g.fillRect(x + 5, y + 3, 22, 3); g.fillRect(x + 5, y + 17, 22, 3); g.fillStyle = '#c9574f'; g.beginPath(); g.ellipse(x + 16, y - 4, 10, 3.4, 0, 0, TAU); g.fill(); }
        else for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(x + 16, y + 22 - i * 9, 13, 6, 0, 0, TAU); g.fillStyle = '#17171a'; g.fill(); g.strokeStyle = '#3a3a40'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.ellipse(x + 16, y + 21 - i * 9, 6, 2.4, 0, 0, TAU); g.fillStyle = '#0a0a0c'; g.fill(); }
      } else { for (let i = 0; i < w * 2; i++) for (let j = 0; j < Math.max(1, h); j++) rr(g, x + 2 + i * 15.5, y + j * 26 - (i % 2 ? 2 : 0), 14, 22, 5, '#8a7a5a', '#3a301c'); }
    },
    decal(g, x, y, v) {
      if (v % 3 === 0) { g.strokeStyle = 'rgba(224,184,58,.22)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 22, 0, TAU); g.stroke(); }
      else if (v % 3 === 1) { g.fillStyle = 'rgba(90,20,20,.3)'; g.beginPath(); g.ellipse(x, y, 16, 8, v, 0, TAU); g.fill(); }
      else { g.fillStyle = 'rgba(240,230,200,.12)'; g.fillRect(x - 8, y - 5, 10, 7); g.fillRect(x + 1, y + 1, 9, 6); }
    },
  },
  void: {
    void: '#020409', roof: '#050a12', roofEdge: '#0f3a44', ambient: 'rgba(1,4,10,0.22)',
    neon: ['#2de2e6', '#9d6bff', '#2de2e6', '#ff2d86'], lamp: '#7cfff2', gate: '#2de2e6',
    floor(g, x, y, tx, ty) {
      const h = hash2(tx, ty, 1);
      g.fillStyle = h < 0.5 ? '#0d1722' : '#0f1a26'; g.fillRect(x, y, TILE, TILE);
      g.fillStyle = 'rgba(45,226,230,.09)'; g.fillRect(x, y, 1, TILE); g.fillRect(x, y, TILE, 1);
      if (h > 0.86) { g.strokeStyle = 'rgba(45,226,230,.28)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 16); g.lineTo(x + 12, y + 16); g.lineTo(x + 20, y + 8); g.lineTo(x + TILE, y + 8); g.stroke(); g.fillStyle = 'rgba(124,255,242,.5)'; g.fillRect(x + 11, y + 15, 3, 3); }
      if (h < 0.06) { g.fillStyle = 'rgba(157,107,255,.16)'; g.font = 'bold 9px monospace'; g.textAlign = 'left'; g.fillText(h < 0.03 ? '0110' : '1001', x + 4, y + 14); g.fillText(h < 0.03 ? '1011' : '0100', x + 4, y + 25); }
    },
    wall(g, x, y, tx, ty) {
      g.fillStyle = '#0b1a22'; g.fillRect(x, y, TILE, TILE);
      g.fillStyle = '#0f2630'; g.fillRect(x + 2, y + 4, TILE - 4, TILE - 8);
      const h = hash2(tx, ty, 5);
      g.fillStyle = h < 0.4 ? 'rgba(45,226,230,.55)' : 'rgba(157,107,255,.5)';
      g.fillRect(x + 6 + h * 12, y + 10, 2, 12); if (h > 0.5) g.fillRect(x + 20, y + 14, 6, 2);
      g.fillStyle = '#2de2e6'; g.globalAlpha = 0.5; g.fillRect(x, y, TILE, 1.5); g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x, y + TILE - 6, TILE, 6);
    },
    prop(g, x, y, w, h, v) {
      const W = w * TILE, H = h * TILE;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 3, y + H - 5, W - 2, 7);
      if (w === 1 && h === 1 || (w + h === 3 && v % 2)) {
        for (let i = 0; i < w + h - 1; i++) { const cx = x + 16 + i * (w > 1 ? TILE : 0), cy = y + (h > 1 ? i * TILE : 0); g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 11, cy + 8); g.lineTo(cx + 5, cy + 28); g.lineTo(cx - 6, cy + 28); g.lineTo(cx - 11, cy + 8); g.closePath(); g.fillStyle = '#12414a'; g.fill(); g.strokeStyle = '#2de2e6'; g.lineWidth = 1.4; g.stroke(); g.beginPath(); g.moveTo(cx, cy - 14); g.lineTo(cx + 2, cy + 8); g.lineTo(cx + 5, cy + 28); g.strokeStyle = 'rgba(124,255,242,.5)'; g.stroke(); }
      } else {
        rr(g, x + 3, y - 10, W - 6, H + 6, 3, '#0f1820', '#1c6f73');
        g.fillStyle = '#0a2a30'; for (let j = 0; j < Math.floor((H + 2) / 9); j++) { g.fillRect(x + 7, y - 6 + j * 9, W - 14, 5); g.fillStyle = hash2(x + j, y, v) < 0.5 ? '#2de2e6' : '#ff2d86'; g.fillRect(x + 9 + (j % 3) * 5, y - 5 + j * 9, 3, 3); g.fillStyle = '#0a2a30'; }
      }
    },
    decal(g, x, y, v) {
      g.strokeStyle = v % 2 ? 'rgba(45,226,230,.16)' : 'rgba(157,107,255,.16)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, 20, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, 14, 0, TAU); g.stroke();
      g.beginPath(); for (let i = 0; i < 3; i++) { const a = v + i * TAU / 3; g.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); } g.closePath(); g.stroke();
    },
  },
};
function rr(g, x, y, w, h, r, fill, stroke) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); } }

// ───── 圖片場景素材 ─────
// assets/map/<主題>/ 內的圖：floor（地面貼圖）、wall（牆面橫條）、障礙物與地面貼花。
// 某主題沒有圖時自動退回上面 THEMES 的程式繪製。新主題：放圖並在這裡登記即可。
const MAP_THEMES = ['slums', 'arena', 'void'];
const PROPS = { '1x1': ['p1a', 'p1b', 'p1c'], '2x2': ['p22'], '2x1': ['p21'], '3x1': ['p31'], '1x2': ['p12'] };
const DECALS = [['d1', 30], ['d2', 74], ['d3', 40], ['d4', 56], ['d2', 58], ['d1', 30]];
const TEX = {};
function loadImage(src) { return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
// 鏡射拼接：任何貼圖都能無縫重複
function mirrored(im, mx, my) {
  const c = document.createElement('canvas'); c.width = im.width * (mx ? 2 : 1); c.height = im.height * (my ? 2 : 1);
  const g = c.getContext('2d');
  for (let j = 0; j < (my ? 2 : 1); j++) for (let i = 0; i < (mx ? 2 : 1); i++) { g.save(); g.translate(i ? im.width * 2 : 0, j ? im.height * 2 : 0); g.scale(i ? -1 : 1, j ? -1 : 1); g.drawImage(im, 0, 0); g.restore(); }
  return c;
}
export async function loadMapTextures() {
  await Promise.all(MAP_THEMES.map(async (theme) => {
    const url = (n) => new URL(`../../assets/map/${theme}/${n}.png`, import.meta.url).href, T = { props: {}, decals: [], signs: [] };
    const jobs = [
      loadImage(url('floor')).then((im) => { if (im) T.floor = mirrored(im, true, true); }),
      loadImage(url('roof')).then((im) => { if (im) T.roof = mirrored(im, true, true); }),
      loadImage(url('wall')).then((im) => { if (im) T.wall = mirrored(im, true, false); }),
      loadImage(url('lamp')).then((im) => { T.lamp = im; }),
    ];
    for (const k in PROPS) { T.props[k] = []; PROPS[k].forEach((n, i) => jobs.push(loadImage(url(n)).then((im) => { T.props[k][i] = im; }))); }
    DECALS.forEach(([n, size], i) => jobs.push(loadImage(url(n)).then((im) => { if (im) T.decals[i] = { im, size }; })));
    ['s1', 's2', 's3'].forEach((n, i) => jobs.push(loadImage(url(n)).then((im) => { T.signs[i] = im; })));
    await Promise.all(jobs);
    for (const k in T.props) T.props[k] = T.props[k].filter(Boolean);
    T.decals = T.decals.filter(Boolean); T.signs = T.signs.filter(Boolean);
    TEX[theme] = T;
  }));
}
const WALL_W = 384;      // 牆面貼圖（鏡射後）對應的世界寬度；牆面高 2 格
function pattern(g, canvas, worldW) { const p = g.createPattern(canvas, 'repeat'); const k = worldW / canvas.width; p.setTransform(new DOMMatrix().scale(k, k)); return p; }

export class MapRenderer {
  constructor(L) {
    this.L = L; this.th = THEMES[L.theme] || THEMES.slums;
    this.chunks = new Map(); this.q = 1.25; this.use = 0;
    // 遮蔽層：每條通道上方掛兩組管線 / 布條
    this.over = [];
    for (const l of L.links) for (const s of [-1, 1]) this.over.push({ x: l.x + (l.horiz ? s * 130 : 0), y: l.y + (l.horiz ? 0 : s * 130), horiz: l.horiz, v: l.idx * 2 + s });
  }
  tile(tx, ty) { const L = this.L; return tx < 0 || ty < 0 || tx >= L.W || ty >= L.H ? T_WALL : L.tiles[ty * L.W + tx]; }
  bake(cx, cy) {
    const L = this.L, th = this.th, q = this.q, px = CH * TILE;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * q);
    const g = c.getContext('2d');
    g.scale(q, q); g.translate(-cx * px, -cy * px);
    g.fillStyle = th.void; g.fillRect(cx * px, cy * px, px, px);
    const isW = (x, y) => this.tile(x, y) === T_WALL;
    const tex = TEX[L.theme] || {}, fpat = tex.floor && pattern(g, tex.floor, 512), rpat = tex.roof && pattern(g, tex.roof, 512);
    if (rpat) { g.fillStyle = rpat; g.fillRect(cx * px, cy * px, px, px); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx * px, cy * px, px, px); }
    for (let ty = cy * CH - 1; ty <= (cy + 1) * CH; ty++) for (let tx = cx * CH - 1; tx <= (cx + 1) * CH; tx++) {
      const x = tx * TILE, y = ty * TILE, t = this.tile(tx, ty);
      if (t !== T_WALL) {
        if (fpat) { g.fillStyle = fpat; g.fillRect(x, y, TILE + 0.5, TILE + 0.5); } else th.floor(g, x, y, tx, ty);
        if (isW(tx, ty - 1)) { const gr = g.createLinearGradient(0, y, 0, y + 20); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, TILE, 20); }
        if (isW(tx - 1, ty)) { const gr = g.createLinearGradient(x, 0, x + 12, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x, y, 12, TILE); }
        if (isW(tx + 1, ty)) { const gr = g.createLinearGradient(x + TILE - 12, 0, x + TILE, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(x + TILE - 12, y, 12, TILE); }
      } else if (!isW(tx, ty + 1)) {
        if (tex.wall) {                                  // 牆面畫成 2 格高（往上蓋住屋頂那一格）
          const tall = isW(tx, ty - 1), wc = tex.wall, sx = (((x % WALL_W) + WALL_W) % WALL_W) / WALL_W * wc.width, sw = TILE / WALL_W * wc.width;
          if (tall) g.drawImage(wc, sx, 0, sw, wc.height, x, y - TILE, TILE + 0.5, TILE * 2);
          else g.drawImage(wc, sx, wc.height / 2, sw, wc.height / 2, x, y, TILE + 0.5, TILE);
        } else th.wall(g, x, y, tx, ty);
      }
      else {
        const edge = !isW(tx - 1, ty) || !isW(tx + 1, ty) || !isW(tx, ty - 1) || !isW(tx, ty + 2) || !isW(tx - 1, ty + 1) || !isW(tx + 1, ty + 1) || !isW(tx - 1, ty - 1) || !isW(tx + 1, ty - 1);
        if (edge) {
          if (!rpat) { g.fillStyle = th.roof; g.fillRect(x, y, TILE, TILE); }
          g.fillStyle = th.roofEdge;
          if (!isW(tx - 1, ty)) g.fillRect(x, y, 2, TILE);
          if (!isW(tx + 1, ty)) g.fillRect(x + TILE - 2, y, 2, TILE);
          if (!isW(tx, ty - 1)) g.fillRect(x, y, TILE, 2);
          if (!isW(tx, ty + 2)) g.fillRect(x, y + TILE - 2, TILE, 2);
        }
      }
    }
    const x0 = cx * px - 80, y0 = cy * px - 80, x1 = (cx + 1) * px + 80, y1 = (cy + 1) * px + 80;
    for (const d of L.deco) if (d.t === 'decal' && d.x > x0 && d.x < x1 && d.y > y0 && d.y < y1) {
      const dc = tex.decals && tex.decals.length && tex.decals[d.v % tex.decals.length];
      if (dc) { const w = dc.size, h = w * dc.im.height / dc.im.width; g.globalAlpha = 0.9; g.drawImage(dc.im, d.x - w / 2, d.y - h / 2, w, h); g.globalAlpha = 1; } else th.decal(g, d.x, d.y, d.v);
    }
    for (const p of L.props) {
      const x = p.x * TILE, y = p.y * TILE;
      if (!(x + p.w * TILE > x0 && x < x1 && y + p.h * TILE > y0 && y < y1)) continue;
      const list = tex.props && tex.props[p.w + 'x' + p.h];
      if (!list || !list.length) { th.prop(g, x, y, p.w, p.h, p.v); continue; }
      const im = list[p.v % list.length], W = p.w * TILE, H = p.h * TILE, dw = W * 1.14, dh = dw * im.height / im.width;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + W / 2, y + H - 1, W * 0.56, Math.min(9, H * 0.2), 0, 0, TAU); g.fill();
      g.drawImage(im, x + W / 2 - dw / 2, y + H + 2 - dh, dw, dh);
    }
    return c;
  }
  // 地面層
  drawGround(g, cam, vw, vh, scale) {
    const want = scale > 1.35 ? 1.5 : scale > 1.1 ? 1.25 : 1;
    if (want !== this.q) { this.q = want; this.chunks.clear(); }
    const px = CH * TILE;
    const cx0 = Math.floor(cam.x / px), cy0 = Math.floor(cam.y / px), cx1 = Math.floor((cam.x + vw) / px), cy1 = Math.floor((cam.y + vh) / px);
    this.use++;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cy < 0 || cx * CH >= this.L.W || cy * CH >= this.L.H) continue;
      const key = cy * 1000 + cx;
      let c = this.chunks.get(key);
      if (!c) { c = { cv: this.bake(cx, cy), use: 0 }; this.chunks.set(key, c); }
      c.use = this.use;
      g.drawImage(c.cv, cx * px, cy * px, px + 0.5, px + 0.5);
    }
    if (this.chunks.size > 40) for (const [k, c] of this.chunks) if (c.use < this.use - 240) this.chunks.delete(k);
  }
  // 牆面招牌 / 燈具 / 閘門（在角色之下）
  drawDeco(g, cam, vw, vh, t) {
    const L = this.L, th = this.th;
    for (const d of L.deco) {
      if (d.t === 'decal' || d.x < cam.x - 60 || d.x > cam.x + vw + 60 || d.y < cam.y - 60 || d.y > cam.y + vh + 60) continue;
      const tx2 = TEX[L.theme] || {}, up = tx2.wall ? 20 : 0;
      if (d.t === 'lamp' && tx2.lamp) {
        const w = 17, h = w * tx2.lamp.height / tx2.lamp.width;
        g.shadowColor = th.lamp; g.shadowBlur = 14; g.drawImage(tx2.lamp, d.x - w / 2, d.y - up - h / 2, w, h); g.shadowBlur = 0;
      } else if (d.t === 'sign' && tx2.signs && tx2.signs.length) {
        const im = tx2.signs[d.v % tx2.signs.length], w = 40 + (d.v % 3) * 5, h = w * im.height / im.width;
        g.globalAlpha = Math.sin(t * 9 + d.v) > -0.93 ? 1 : 0.35; g.shadowColor = th.neon[d.v % th.neon.length]; g.shadowBlur = 12;
        g.drawImage(im, d.x - w / 2, d.y - up - h / 2, w, h); g.shadowBlur = 0; g.globalAlpha = 1;
      } else if (d.t === 'lamp') {
        g.fillStyle = '#15171c'; g.fillRect(d.x - 5, d.y - 6, 10, 5);
        g.fillStyle = th.lamp; g.shadowColor = th.lamp; g.shadowBlur = 12; g.beginPath(); g.ellipse(d.x, d.y + 2, 5, 3.5, 0, 0, TAU); g.fill(); g.shadowBlur = 0;
      } else {
        const col = th.neon[d.v % th.neon.length], flick = Math.sin(t * 9 + d.v) > -0.93 ? 1 : 0.25;
        const w = 20 + (d.v % 3) * 6;
        g.globalAlpha = flick; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 10; g.lineWidth = 2;
        g.strokeRect(d.x - w / 2, d.y - 9, w, 16);
        g.fillStyle = col; g.font = 'bold 11px "Noto Sans TC", "Microsoft JhengHei", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(SIGNS[L.theme][d.v % SIGNS[L.theme].length], d.x, d.y - 0.5);
        g.shadowBlur = 0; g.globalAlpha = 1;
      }
    }
    for (const l of L.links) {
      if (l.open || l.x < cam.x - 150 || l.x > cam.x + vw + 150 || l.y < cam.y - 150 || l.y > cam.y + vh + 150) continue;
      const half = 3 * TILE, col = th.gate;
      if (FXS.gate) {                               // 圖片閘門：依主題換色
        const im = FXS.gate, len = half * 2 + 20, gh = len * im.height / im.width;
        g.save(); g.translate(l.x, l.y); g.rotate(l.horiz ? Math.PI / 2 : 0);
        g.filter = `hue-rotate(${{ slums: 150, arena: 215, void: 0 }[L.theme] || 0}deg)`; g.globalAlpha = 0.85 + 0.15 * Math.sin(t * 6);
        g.drawImage(im, -len / 2, -gh / 2, len, gh); g.filter = 'none'; g.globalAlpha = 1; g.restore();
        g.fillStyle = '#0a0b10'; g.beginPath(); g.arc(l.x, l.y, 11, 0, TAU); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
        g.fillStyle = col; g.fillRect(l.x - 4.5, l.y - 1, 9, 7); g.beginPath(); g.arc(l.x, l.y - 2, 3.2, Math.PI, 0); g.stroke();
        continue;
      }
      g.save(); g.translate(l.x, l.y); if (!l.horiz) g.rotate(Math.PI / 2);
      g.shadowColor = col; g.shadowBlur = 14;
      for (let i = -2; i <= 2; i++) { g.globalAlpha = 0.45 + 0.3 * Math.sin(t * 6 + i * 1.3); g.fillStyle = col; g.fillRect(i * 9 - 1.5, -half + 6, 3, half * 2 - 12); }
      g.globalAlpha = 0.16; g.fillRect(-22, -half + 6, 44, half * 2 - 12); g.globalAlpha = 1; g.shadowBlur = 0;
      for (const s of [-1, 1]) { g.fillStyle = '#1a1d25'; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.roundRect(-26, s * half - 9, 52, 18, 4); g.fill(); g.stroke(); }
      g.restore();
      g.fillStyle = '#0a0b10'; g.beginPath(); g.arc(l.x, l.y, 13, 0, TAU); g.fill(); g.strokeStyle = col; g.lineWidth = 2; g.stroke();
      g.fillStyle = col; g.fillRect(l.x - 5, l.y - 1, 10, 8); g.lineWidth = 2; g.beginPath(); g.arc(l.x, l.y - 2, 3.6, Math.PI, 0); g.stroke();
    }
  }
  // 遮蔽層（在角色之上）
  drawOver(g, cam, vw, vh, t) {
    const th = this.th;
    for (const o of this.over) {
      if (o.x < cam.x - 200 || o.x > cam.x + vw + 200 || o.y < cam.y - 200 || o.y > cam.y + vh + 200) continue;
      g.save(); g.translate(o.x, o.y); if (!o.horiz) g.rotate(Math.PI / 2);
      g.globalAlpha = 0.82;
      g.strokeStyle = '#0b0c11'; g.lineWidth = 6; g.beginPath(); g.moveTo(-8, -118); g.quadraticCurveTo(2, 0, -8, 118); g.stroke();
      g.strokeStyle = '#1b1e27'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, -118); g.quadraticCurveTo(18, 10, 6, 118); g.stroke();
      const col = th.neon[Math.abs(o.v) % th.neon.length];
      for (let i = -2; i <= 2; i++) { const yy = i * 38, xx = -8 + 10 * (1 - (i * i) / 9.6); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 10; g.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3 + i + o.v); g.beginPath(); g.arc(xx - 4, yy, 3, 0, TAU); g.fill(); }
      g.restore();
    }
  }
}
const SIGNS = { slums: ['酒', '麵', '當', '宿', '藥', '夜市', 'BAR', '24H'], arena: ['拳', '鬥', '賭', '勝', 'K.O', 'VS'], void: ['01', 'ᚱ', 'ᚠ', '◈', 'SYS', '∞'] };
