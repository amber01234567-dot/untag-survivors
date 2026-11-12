// 敵人貼圖：程式繪製後快取成離屏 canvas（4 格動畫 × 一般 / 受擊閃白）。
// 新敵人：在 DRAW 加一個同名函式 (g, r, f)；原點在腳底中央，r 為碰撞半徑，f 為動畫相位 0..1。
import { ENEMY_LIST } from '../data/enemies.js';

const TAU = Math.PI * 2, INK = '#06070a';
const SC = 2;      // 貼圖解析度倍率
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
function fs(g, fill, stroke = INK, lw = 1.5) { g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function eyes(g, x, y, d, col = '#fff', r = 2, glow) {
  if (glow) { g.shadowColor = col; g.shadowBlur = 6; }
  g.fillStyle = col; g.beginPath(); g.arc(x - d, y, r, 0, TAU); g.arc(x + d, y, r, 0, TAU); g.fill(); g.shadowBlur = 0;
}
function angry(g, x, y, d, col = INK) { g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - d - 3, y - 4); g.lineTo(x - d + 2, y - 2); g.moveTo(x + d + 3, y - 4); g.lineTo(x + d - 2, y - 2); g.stroke(); }
const wob = (f) => Math.sin(f * TAU);

function blob(g, r, f, c1, c2, eye) {
  const sq = 1 + wob(f) * 0.08;
  g.beginPath(); g.moveTo(-r * 1.1 * sq, 0);
  g.bezierCurveTo(-r * 1.2 * sq, -r * 1.5 / sq, r * 1.2 * sq, -r * 1.5 / sq, r * 1.1 * sq, 0);
  g.quadraticCurveTo(0, r * 0.25, -r * 1.1 * sq, 0); g.closePath(); fs(g, c1);
  ell(g, -r * 0.35, -r * 0.95 / sq, r * 0.3, r * 0.16, -0.5); fs(g, c2, null);
  eyes(g, r * 0.15, -r * 0.6 / sq, r * 0.32, eye, r * 0.17);
  g.fillStyle = INK; g.beginPath(); g.arc(r * 0.15 - r * 0.28, -r * 0.6 / sq, r * 0.08, 0, TAU); g.arc(r * 0.15 + r * 0.36, -r * 0.6 / sq, r * 0.08, 0, TAU); g.fill();
}
function legsWalk(g, r, f, col, n = 2, w = 3) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  for (let i = 0; i < n; i++) { const x = (i / (n - 1 || 1) - 0.5) * r * 1.3, s = Math.sin(f * TAU + i * Math.PI) * r * 0.25; g.beginPath(); g.moveTo(x, -r * 0.5); g.lineTo(x + s, 0); g.stroke(); }
}

const DRAW = {
  slime(g, r, f) {
    blob(g, r, f, '#7c9a45', '#b6d07a', '#f4ffd9');
    g.fillStyle = '#4b5e2a'; g.fillRect(-r * 0.7, -r * 0.5, r * 0.3, r * 0.2); g.fillStyle = '#c9c2a8'; g.fillRect(r * 0.5, -r * 0.35, r * 0.25, r * 0.16);
  },
  bat(g, r, f) {
    const fl = wob(f), y = -r * 1.6 + fl * 2;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * r * 0.4, y); g.lineTo(s * r * 1.9, y - r * 0.9 * fl - r * 0.3); g.lineTo(s * r * 1.5, y + r * 0.2); g.lineTo(s * r * 1.1, y - r * 0.1); g.lineTo(s * r * 0.8, y + r * 0.5); g.closePath(); fs(g, '#8a2a86', INK, 1.2); }
    ell(g, 0, y, r * 0.7, r * 0.75); fs(g, '#c43fb4');
    g.beginPath(); g.moveTo(-r * 0.5, y - r * 0.5); g.lineTo(-r * 0.4, y - r * 1.2); g.lineTo(-r * 0.1, y - r * 0.6); g.moveTo(r * 0.5, y - r * 0.5); g.lineTo(r * 0.4, y - r * 1.2); g.lineTo(r * 0.1, y - r * 0.6); fs(g, '#c43fb4', INK, 1.2);
    eyes(g, 0, y - r * 0.1, r * 0.28, '#7cfff2', r * 0.16, true);
  },
  bag(g, r, f) {
    const sq = 1 + wob(f) * 0.06;
    g.beginPath(); g.moveTo(-r * 0.3, -r * 1.9); g.lineTo(0, -r * 1.55); g.lineTo(r * 0.35, -r * 1.95); g.lineTo(r * 0.15, -r * 1.5);
    g.bezierCurveTo(r * 1.5 * sq, -r * 1.2, r * 1.3 * sq, 0, 0, 0); g.bezierCurveTo(-r * 1.3 * sq, 0, -r * 1.5 * sq, -r * 1.2, -r * 0.15, -r * 1.5); g.closePath(); fs(g, '#1d1f25', '#454a56', 1.5);
    g.strokeStyle = '#3a3e49'; g.lineWidth = 1; g.beginPath(); g.moveTo(-r * 0.5, -r * 1.2); g.lineTo(-r * 0.7, -r * 0.3); g.moveTo(r * 0.4, -r * 1.25); g.lineTo(r * 0.75, -r * 0.4); g.stroke();
    eyes(g, 0, -r * 0.75, r * 0.38, '#9dff3c', r * 0.2, true); angry(g, 0, -r * 0.75, r * 0.38, '#9dff3c');
    ell(g, r * 0.6, -r * 0.12, r * 0.22, r * 0.12); fs(g, '#9dff3c', null);
  },
  vending(g, r, f) {
    legsWalk(g, r, f, '#2a2f3a', 2, 4);
    const y = -r * 2.5 + Math.abs(wob(f)) * -1.5;
    rr(g, -r * 0.85, y, r * 1.7, r * 2.1, 3); fs(g, '#b33346', INK, 1.6);
    rr(g, -r * 0.62, y + r * 0.2, r * 0.85, r * 1.05, 2); fs(g, '#0f1a22', '#2a3542', 1);
    g.fillStyle = f < 0.5 ? '#39e6e0' : '#ff4d8d'; g.fillRect(-r * 0.5, y + r * 0.35, r * 0.6, r * 0.14); g.fillRect(-r * 0.5 + (f < 0.5 ? 2 : 0), y + r * 0.62, r * 0.4, r * 0.12);
    eyes(g, -r * 0.2, y + r * 0.95, r * 0.2, '#ff5544', r * 0.1, true);
    g.fillStyle = '#e8e2d0'; g.fillRect(r * 0.38, y + r * 0.25, r * 0.3, r * 0.5); g.fillStyle = '#16181d'; g.fillRect(-r * 0.6, y + r * 1.5, r * 1.2, r * 0.35);
  },
  dog(g, r, f) {
    legsWalk(g, r * 1.3, f, '#3a4250', 4, 3);
    rr(g, -r * 1.1, -r * 1.35, r * 2.0, r * 0.95, 4); fs(g, '#566070', INK, 1.5);
    rr(g, r * 0.5, -r * 1.75, r * 0.95, r * 0.85, 3); fs(g, '#6b7686', INK, 1.5);
    g.beginPath(); g.moveTo(r * 0.6, -r * 1.75); g.lineTo(r * 0.7, -r * 2.2); g.lineTo(r * 0.95, -r * 1.75); fs(g, '#566070', INK, 1.2);
    g.fillStyle = '#ff3b30'; g.shadowColor = '#ff3b30'; g.shadowBlur = 6; g.fillRect(r * 0.95, -r * 1.5, r * 0.35, r * 0.16); g.shadowBlur = 0;
    g.strokeStyle = '#3a4250'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-r * 1.1, -r * 1.1); g.lineTo(-r * 1.55, -r * 1.5 + wob(f) * 2); g.stroke();
    g.fillStyle = '#d9dde3'; g.fillRect(r * 1.05, -r * 1.12, r * 0.3, r * 0.1);
  },
  thug(g, r, f) {
    legsWalk(g, r, f, '#23262e', 2, 4);
    const y = -r * 0.5 + wob(f);
    rr(g, -r * 0.75, y - r * 1.2, r * 1.5, r * 1.3, 4); fs(g, '#3b2f2a', INK, 1.5);
    for (const s of [-1, 1]) { ell(g, s * r * 0.7, y - r * 2.0, r * 0.38, r * 0.4); fs(g, '#7b7772', INK, 1.2); }
    ell(g, 0, y - r * 1.6, r * 0.8, r * 0.72); fs(g, '#8f8a84', INK, 1.5);
    g.fillStyle = '#b3242e'; g.fillRect(-r * 0.8, y - r * 2.0, r * 1.6, r * 0.3);
    eyes(g, r * 0.12, y - r * 1.6, r * 0.3, '#ffe9a8', r * 0.13); angry(g, r * 0.12, y - r * 1.6, r * 0.3);
    g.strokeStyle = '#8a6a44'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * 0.8, y - r * 0.6); g.lineTo(r * 1.4, y - r * 1.7 + wob(f) * 2); g.stroke();
  },
  chip(g, r, f) {
    legsWalk(g, r * 1.2, f, '#1a1a20', 3, 1.6);
    const y = -r * 1.1 + wob(f) * 1.2;
    ell(g, 0, y, r, r); fs(g, '#c7283a', INK, 1.4);
    g.strokeStyle = '#f3ead8'; g.lineWidth = r * 0.28; g.setLineDash([r * 0.5, r * 0.55]); g.beginPath(); g.arc(0, y, r * 0.78, f * TAU, f * TAU + TAU); g.stroke(); g.setLineDash([]);
    ell(g, 0, y, r * 0.5, r * 0.5); fs(g, '#f3ead8', null);
    eyes(g, 0, y, r * 0.2, INK, r * 0.12);
  },
  brute(g, r, f) {
    legsWalk(g, r * 0.9, f, '#1d1b20', 2, 6);
    const y = -r * 0.45 + wob(f);
    for (const s of [-1, 1]) { ell(g, s * r * 1.0, y - r * 0.7 + s * wob(f) * 2, r * 0.42, r * 0.5); fs(g, '#7a2f2a', INK, 1.5); ell(g, s * r * 1.05, y - r * 0.2 + s * wob(f) * 2, r * 0.36, r * 0.36); fs(g, '#2a2c33', '#6b7080', 1.3); }
    rr(g, -r * 0.8, y - r * 1.5, r * 1.6, r * 1.5, 6); fs(g, '#8e3a33', INK, 1.6);
    g.strokeStyle = '#9aa0ad'; g.lineWidth = 2; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(-r * 0.8, y - r * 1.3); g.lineTo(r * 0.8, y - r * 0.3); g.stroke(); g.setLineDash([]);
    rr(g, -r * 0.5, y - r * 2.1, r * 1.0, r * 0.8, 4); fs(g, '#a1463e', INK, 1.5);
    g.fillStyle = '#17181d'; g.fillRect(-r * 0.5, y - r * 1.95, r * 1.0, r * 0.3);
    eyes(g, r * 0.08, y - r * 1.8, r * 0.22, '#ffd23c', r * 0.09, true);
    g.fillStyle = '#e2b53e'; g.fillRect(-r * 0.8, y - r * 0.25, r * 1.6, r * 0.22);
  },
  shroom(g, r, f) {
    const y = -r * 0.9 + wob(f) * 0.8;
    rr(g, -r * 0.45, -r * 1.0, r * 0.9, r * 1.0, 4); fs(g, '#d9d2c2', INK, 1.4);
    eyes(g, r * 0.05, -r * 0.55, r * 0.2, INK, r * 0.1);
    g.beginPath(); g.moveTo(-r * 1.2, y); g.bezierCurveTo(-r * 1.2, y - r * 1.6, r * 1.2, y - r * 1.6, r * 1.2, y); g.quadraticCurveTo(0, y + r * 0.3, -r * 1.2, y); g.closePath(); fs(g, '#7a3fb3', INK, 1.5);
    g.fillStyle = '#b6ff5c'; for (const [x, yy, s] of [[-0.6, -0.5, 0.2], [0.1, -0.85, 0.26], [0.7, -0.4, 0.17]]) { g.beginPath(); g.arc(r * x, y + r * yy, r * s, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(182,255,92,.35)'; g.beginPath(); g.arc(-r * 0.9, y - r * 1.3 - f * 4, r * 0.25, 0, TAU); g.arc(r * 0.8, y - r * 1.5 - f * 3, r * 0.18, 0, TAU); g.fill();
  },
  ooze(g, r, f) { blob(g, r, f, '#5b46b8', '#a99cf0', '#f0ecff'); g.fillStyle = 'rgba(200,190,255,.6)'; g.beginPath(); g.arc(-r * 0.6, -r * 0.4, r * 0.12, 0, TAU); g.arc(r * 0.7, -r * 0.7, r * 0.09, 0, TAU); g.fill(); },
  oozelet(g, r, f) { blob(g, r, f, '#6f5ad0', '#b9aef5', '#f0ecff'); },
  glitch(g, r, f) {
    const j = f < 0.25 ? 2 : f < 0.5 ? -1 : f < 0.75 ? 1 : -2;
    for (const [dx, col, al] of [[-2 - j, '#ff2d86', 0.6], [2 + j, '#2de2e6', 0.6], [0, '#11131a', 1]]) {
      g.globalAlpha = al; g.fillStyle = col;
      g.fillRect(-r * 0.5 + dx, -r * 2.4, r, r * 0.8); g.fillRect(-r * 0.7 + dx, -r * 1.55, r * 1.4, r * 1.0); g.fillRect(-r * 0.6 + dx + j, -r * 0.55, r * 0.45, r * 0.55); g.fillRect(r * 0.15 + dx - j, -r * 0.55, r * 0.45, r * 0.55);
    }
    g.globalAlpha = 1; g.fillStyle = '#2de2e6'; g.fillRect(-r * 0.3, -r * 2.1, r * 0.25, r * 0.16); g.fillStyle = '#ff2d86'; g.fillRect(r * 0.1, -r * 2.1, r * 0.25, r * 0.16);
    g.fillStyle = '#2de2e6'; g.fillRect(-r * 0.9 + j * 2, -r * (1 + f), r * 0.5, 1.5);
  },
  bug(g, r, f) {
    legsWalk(g, r * 1.4, f, '#1c6f73', 3, 1.5);
    ell(g, 0, -r * 0.9, r * 1.1, r * 0.8); fs(g, '#0f3f44', '#2de2e6', 1.3);
    g.strokeStyle = '#2de2e6'; g.lineWidth = 1; g.beginPath(); g.moveTo(-r * 0.2, -r * 1.6); g.lineTo(-r * 0.2, -r * 0.2); g.stroke();
    g.fillStyle = '#7cfff2'; g.font = `bold ${r * 0.7}px monospace`; g.textAlign = 'center'; g.fillText(f < 0.5 ? '1' : '0', -r * 0.6, -r * 0.65); g.fillText(f < 0.5 ? '0' : '1', r * 0.35, -r * 0.65);
    eyes(g, r * 0.8, -r * 1.0, r * 0.14, '#ff2d86', r * 0.12, true);
  },
  sentry(g, r, f) {
    legsWalk(g, r * 0.8, f, '#1a2a33', 2, 6);
    const y = -r * 0.45 + wob(f) * 0.8;
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.52; g.lineTo(Math.cos(a) * r * 1.05, y - r * 0.95 + Math.sin(a) * r * 1.05); } g.closePath(); fs(g, '#14222b', '#2de2e6', 1.8);
    g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.52; g.lineTo(Math.cos(a) * r * 0.6, y - r * 0.95 + Math.sin(a) * r * 0.6); } g.closePath(); fs(g, '#1e3a47', '#1c6f73', 1);
    g.fillStyle = '#ff4d4d'; g.shadowColor = '#ff4d4d'; g.shadowBlur = 8; g.fillRect(-r * 0.4, y - r * 1.05, r * 0.8, r * 0.16); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(45,226,230,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(r * 0.2, y - r * 0.95, r * 1.3, -0.9, 0.9); g.stroke();
  },
  eye(g, r, f) {
    const y = -r * 1.9 + wob(f) * 2;
    g.strokeStyle = '#2de2e6'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, y, r * 1.5, r * 0.5, f * TAU, 0, TAU); g.stroke();
    ell(g, 0, y, r, r); fs(g, '#e9edf2', INK, 1.5);
    ell(g, r * 0.2, y, r * 0.55, r * 0.55); fs(g, '#0fb9c0', '#06474a', 1);
    ell(g, r * 0.3, y, r * 0.25, r * 0.25); fs(g, INK, null);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(r * 0.05, y - r * 0.25, r * 0.12, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,60,90,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-r * 0.8, y - r * 0.3); g.lineTo(-r * 0.4, y - r * 0.1); g.moveTo(-r * 0.8, y + r * 0.3); g.lineTo(-r * 0.45, y + r * 0.15); g.stroke();
  },
  virus(g, r, f) {
    const y = -r * 1.1 + wob(f) * 1.2, pu = 1 + wob(f) * 0.08;
    g.fillStyle = '#ff3b5c'; g.strokeStyle = INK; g.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + f; g.beginPath(); g.moveTo(Math.cos(a - 0.18) * r * 0.8, y + Math.sin(a - 0.18) * r * 0.8); g.lineTo(Math.cos(a) * r * 1.35 * pu, y + Math.sin(a) * r * 1.35 * pu); g.lineTo(Math.cos(a + 0.18) * r * 0.8, y + Math.sin(a + 0.18) * r * 0.8); g.fill(); g.stroke(); }
    ell(g, 0, y, r * 0.9, r * 0.9); fs(g, '#c41f45', INK, 1.4);
    eyes(g, 0, y - r * 0.1, r * 0.3, '#fff36b', r * 0.16, true); angry(g, 0, y - r * 0.1, r * 0.3);
    g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.arc(0, y + r * 0.55, r * 0.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  },
  nest(g, r, f) {
    g.beginPath(); g.moveTo(-r * 1.3, 0); g.bezierCurveTo(-r * 1.2, -r * 1.6, -r * 0.5, -r * 2.2, 0, -r * 2.1); g.bezierCurveTo(r * 0.6, -r * 2.2, r * 1.3, -r * 1.5, r * 1.3, 0); g.closePath(); fs(g, '#2a2233', '#5a4a6e', 2);
    g.strokeStyle = '#3a3046'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 0.9, -r * 0.4); g.lineTo(-r * 0.5, -r * 1.6); g.moveTo(r * 0.8, -r * 0.5); g.lineTo(r * 0.5, -r * 1.7); g.stroke();
    const pu = 0.85 + wob(f) * 0.15;
    g.shadowColor = '#c84dff'; g.shadowBlur = 16; ell(g, 0, -r * 0.85, r * 0.6 * pu, r * 0.75 * pu); fs(g, '#c84dff', null); g.shadowBlur = 0;
    ell(g, 0, -r * 0.85, r * 0.32 * pu, r * 0.45 * pu); fs(g, '#1a0626', null);
    g.fillStyle = '#e7a8ff'; for (let i = 0; i < 4; i++) { const a = f * TAU + i * 1.57; g.beginPath(); g.arc(Math.cos(a) * r * 0.9, -r * 0.85 + Math.sin(a) * r * 1.1, 1.6, 0, TAU); g.fill(); }
  },
  golem(g, r, f) {
    const y = wob(f) * 1.5;
    for (const s of [-1, 1]) { ell(g, s * r * 1.15, -r * 0.9 + y + s * wob(f) * 3, r * 0.42, r * 0.7, s * 0.3); fs(g, '#4f5a3a', INK, 2); ell(g, s * r * 1.3, -r * 0.3 + y + s * wob(f) * 3, r * 0.4, r * 0.36); fs(g, '#2a2d33', '#555b68', 1.6); }
    g.beginPath(); g.moveTo(-r * 1.0, 0); g.bezierCurveTo(-r * 1.3, -r * 1.2, -r * 0.8, -r * 2.2 + y, 0, -r * 2.2 + y); g.bezierCurveTo(r * 0.8, -r * 2.2 + y, r * 1.3, -r * 1.2, r * 1.0, 0); g.closePath(); fs(g, '#5f6d45', INK, 2.2);
    for (const [x, yy, w, h, c] of [[-0.7, -0.6, 0.5, 0.4, '#1d1f25'], [0.25, -0.5, 0.55, 0.35, '#8a6a44'], [-0.3, -1.05, 0.4, 0.3, '#b33346'], [0.4, -1.1, 0.35, 0.3, '#c9c2a8'], [-0.75, -1.3, 0.3, 0.25, '#3a6ea5']]) { rr(g, r * x, r * yy + y * 0.5, r * w, r * h, 2); fs(g, c, INK, 1.2); }
    g.shadowColor = '#b6ff3c'; g.shadowBlur = 12; g.fillStyle = '#b6ff3c';
    g.beginPath(); g.moveTo(-r * 0.55, -r * 1.75 + y); g.lineTo(-r * 0.15, -r * 1.6 + y); g.lineTo(-r * 0.5, -r * 1.5 + y); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(r * 0.55, -r * 1.75 + y); g.lineTo(r * 0.15, -r * 1.6 + y); g.lineTo(r * 0.5, -r * 1.5 + y); g.closePath(); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-r * 0.4, -r * 1.25 + y); for (let i = 0; i < 5; i++) g.lineTo(-r * 0.4 + (i + 0.5) * r * 0.16, -r * (i % 2 ? 1.25 : 1.12) + y); g.stroke();
  },
  champ(g, r, f) {
    legsWalk(g, r * 0.8, f, '#17181d', 2, 9);
    const y = -r * 0.4 + wob(f) * 1.5;
    for (const s of [-1, 1]) { ell(g, s * r * 1.0, y - r * 0.95 + s * wob(f) * 3, r * 0.4, r * 0.55, s * 0.2); fs(g, '#8f8a84', INK, 2); ell(g, s * r * 1.15, y - r * 0.35 + s * wob(f) * 4, r * 0.46, r * 0.44); fs(g, '#b3242e', INK, 2); g.fillStyle = '#f1e9d8'; g.fillRect(s * r * 1.15 - r * 0.3, y - r * 0.72 + s * wob(f) * 4, r * 0.6, r * 0.14); }
    rr(g, -r * 0.8, y - r * 1.5, r * 1.6, r * 1.5, 8); fs(g, '#9a958f', INK, 2.2);
    g.fillStyle = '#17181d'; g.fillRect(-r * 0.8, y - r * 0.55, r * 1.6, r * 0.5);
    rr(g, -r * 0.45, y - r * 0.6, r * 0.9, r * 0.36, 3); fs(g, '#e2b53e', '#7a5a12', 1.5);
    for (const s of [-1, 1]) { ell(g, s * r * 0.55, y - r * 2.3, r * 0.3, r * 0.34); fs(g, '#8f8a84', INK, 1.6); }
    ell(g, 0, y - r * 1.85, r * 0.68, r * 0.6); fs(g, '#a6a19a', INK, 2);
    g.fillStyle = '#b3242e'; g.fillRect(-r * 0.68, y - r * 2.2, r * 1.36, r * 0.24);
    eyes(g, r * 0.08, y - r * 1.85, r * 0.25, '#ffd23c', r * 0.09, true); angry(g, r * 0.08, y - r * 1.85, r * 0.25);
    g.strokeStyle = '#17181d'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-r * 0.2, y - r * 1.55); g.lineTo(r * 0.3, y - r * 1.55); g.stroke();
  },
  warden(g, r, f) {
    const y = -r * 1.5 + wob(f) * 3;
    g.strokeStyle = 'rgba(45,226,230,.7)'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, y, r * 1.5, r * 0.45, f * TAU * 0.5, 0, TAU); g.stroke();
    g.beginPath(); g.ellipse(0, y, r * 1.5, r * 0.45, -f * TAU * 0.5 + 1.5, 0, TAU); g.stroke();
    g.shadowColor = '#2de2e6'; g.shadowBlur = 18;
    g.beginPath(); g.moveTo(0, y - r * 1.25); g.lineTo(r * 0.85, y); g.lineTo(0, y + r * 1.25); g.lineTo(-r * 0.85, y); g.closePath(); fs(g, '#0d2a33', '#2de2e6', 2.4); g.shadowBlur = 0;
    g.beginPath(); g.moveTo(0, y - r * 1.25); g.lineTo(r * 0.3, y); g.lineTo(0, y + r * 1.25); g.closePath(); fs(g, '#164855', null);
    ell(g, 0, y, r * 0.42, r * 0.42); fs(g, '#eafcff', '#2de2e6', 1.5);
    ell(g, r * 0.06, y, r * 0.2, r * 0.26); fs(g, '#ff2d86', null);
    g.fillStyle = '#7cfff2'; for (let i = 0; i < 6; i++) { const a = f * TAU + i * 1.05; g.fillRect(Math.cos(a) * r * 1.2 - 2, y + Math.sin(a) * r * 1.5 - 2, 4, 4); }
  },
  goblin(g, r, f) {
    legsWalk(g, r, f, '#5d5a56', 2, 3);
    const y = -r * 0.5 + wob(f);
    ell(g, -r * 0.7, y - r * 1.1, r * 0.8, r * 0.9); fs(g, '#c9a23a', '#7a5a12', 1.5);
    g.fillStyle = '#7a5a12'; g.font = `bold ${r}px Arial`; g.textAlign = 'center'; g.fillText('$', -r * 0.7, y - r * 0.75);
    rr(g, -r * 0.3, y - r * 1.1, r * 1.1, r * 1.1, 4); fs(g, '#8d8983', INK, 1.4);
    for (const s of [-1, 1]) { ell(g, r * 0.3 + s * r * 0.55, y - r * 1.9, r * 0.32, r * 0.34); fs(g, '#8d8983', INK, 1.2); }
    ell(g, r * 0.35, y - r * 1.5, r * 0.68, r * 0.6); fs(g, '#a09c96', INK, 1.4);
    eyes(g, r * 0.5, y - r * 1.55, r * 0.22, INK, r * 0.1);
    g.fillStyle = '#17181d'; g.fillRect(-r * 0.2, y - r * 1.72, r * 1.2, r * 0.22);
  },
};

// ── 圖片怪物 ──
// assets/enemies/<id>.png 單張圖，走路的彈跳擠壓由程式做（4 格）。沒有圖的敵人退回上面的程式繪製。
// VIS = 顯示高度相對碰撞半徑的倍率；巢穴依章節主題換圖。
const VIS = { default: 2.7, bat: 2.4, roach: 2.2, bug: 2.6, cursor: 3, chip: 3, nest: 2.6, golem: 2.9, champ: 3, warden: 3.1, conecrab: 3, vending: 3, sandbag: 3.1, brute: 2.9, signghost: 3, popup: 2.7,
  tumble: 2.6, vulture: 2.8, dustling: 2.8, shard: 2.8, cactus: 3.1, bison: 2.8, crystal: 2.8, scrapbot: 3, mortar: 2.7, sandworm: 3, wreckdrone: 2.8, rig: 2.7, wormqueen: 3.2, colossus: 3.2 };
const NEST = { slums: 'nest1', arena: 'nest2', void: 'nest3', road: 'nest4', canyon: 'nest5', crater: 'nest6' };
const IMG = {};
let theme = 'slums';
const cache = new Map();
export function setEnemyTheme(t) { if (t !== theme) { theme = t; cache.clear(); } }
export function loadEnemySprites() {
  const names = ENEMY_LIST.map((d) => d.id).filter((id) => id !== 'nest').concat(Object.values(NEST));
  return Promise.all(names.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => res();
    im.src = new URL(`../../assets/enemies/${n}.png`, import.meta.url).href;
  })));
}
export function enemySprite(idx, frame, flash) {
  const key = idx * 16 + frame * 2 + (flash ? 1 : 0);
  let s = cache.get(key);
  if (s) return s;
  const def = ENEMY_LIST[idx], r = def.r, im = IMG[def.id === 'nest' ? (NEST[theme] || 'nest1') : def.id];
  const vh = r * (VIS[def.id] || VIS.default), vw = im ? vh * im.width / im.height : 0;
  const w = im ? Math.ceil(vw * 1.2 + 8) : Math.ceil(r * 5.2 + 20), h = im ? Math.ceil(vh * 1.14 + 10) : Math.ceil(r * 4.4 + 24);
  const c = document.createElement('canvas');
  c.width = w * SC; c.height = h * SC;
  const g = c.getContext('2d');
  g.scale(SC, SC); g.translate(w / 2, h - 8); g.lineJoin = 'round';
  if (im) {
    const ph = Math.sin(frame / 4 * TAU), still = def.structure;
    const sy = still ? 1 + ph * 0.02 : 1 + ph * 0.07, sx = still ? 1 : 1 - ph * 0.06;         // 走路時上下擠壓
    g.imageSmoothingQuality = 'high'; g.scale(sx, sy);
    g.drawImage(im, -vw / 2, -vh, vw, vh);
  } else (DRAW[def.id] || DRAW.slime)(g, r, frame / 4);
  if (flash) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.78)'; g.fillRect(0, 0, c.width, c.height); }
  s = { c, w, h, ox: w / 2, oy: h - 8 };
  cache.set(key, s);
  return s;
}
