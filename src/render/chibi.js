// 程式手繪 Q 版角色。座標原點在腳底中央，朝右繪製（朝左由呼叫端水平翻轉）。
// 新增角色外觀：在 LOOKS 加一個同名函式即可；沒有外觀的角色會畫成剪影佔位。
//
// pose = { t 時間, moving 是否移動, atk 攻擊動畫進度 0..1 (0=無), aim 相對朝向的瞄準角, down 倒地, cast 施法閃光 0..1 }
import { ROLES, CHARS } from '../data/characters.js';

const INK = '#07080c', RIM = '#3b4252';
const TAU = Math.PI * 2;

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
function fs(g, fill, stroke = INK, lw = 1.4) { g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function shades(g, x, y, s = 1) {
  g.fillStyle = '#050507';
  rr(g, x - 7 * s, y - 3 * s, 15 * s, 6.4 * s, 2.4 * s); g.fill();
  g.fillRect(x - 12 * s, y - 2.2 * s, 6 * s, 1.6 * s);
  g.fillStyle = 'rgba(120,220,235,.55)';
  g.fillRect(x - 4 * s, y - 2 * s, 4 * s, 1.2 * s); g.fillRect(x + 3 * s, y - 2 * s, 3 * s, 1.2 * s);
}
let FLIP = false;      // 角色朝左時文字要翻回來，才不會變成鏡像字
function untag(g, x, y, size = 4.6, col = '#f2f2f2') {
  g.font = `900 ${size}px "Arial Black", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = col;
  if (FLIP) { g.save(); g.translate(x, y); g.scale(-1, 1); g.fillText('UNTAG', 0, 0); g.restore(); } else g.fillText('UNTAG', x, y);
}
function smoke(g, x, y, t, col = 'rgba(210,215,225,.5)') {
  g.strokeStyle = col; g.lineWidth = 1.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y);
  for (let i = 1; i <= 5; i++) g.lineTo(x + Math.sin(t * 3 + i * 1.3) * (1.5 + i * 0.6), y - i * 3.2);
  g.stroke();
}
function cig(g, x, y, t, cigar) {
  g.save(); g.translate(x, y); g.rotate(0.12);
  g.fillStyle = cigar ? '#6b4226' : '#ece7dc'; g.fillRect(0, -1.1, cigar ? 9 : 7, cigar ? 3 : 2.1);
  g.fillStyle = cigar ? '#5cf0ee' : '#ff8a3c'; g.fillRect(cigar ? 9 : 7, -1.1, 1.8, cigar ? 3 : 2.1);
  g.restore();
  smoke(g, x + (cigar ? 11 : 9), y - 1, t, cigar ? 'rgba(120,235,235,.45)' : undefined);
}
// 腿 + 鞋：sw 為擺動相位
function legs(g, p, o) {
  const sw = p.moving ? Math.sin(p.t * 13) : 0;
  for (const s of [-1, 1]) {
    const x = s * 5 + sw * s * 3.2, lift = p.moving ? Math.max(0, -sw * s) * 3 : 0;
    rr(g, x - 3.6, -15, 7.2, 13 - lift, 2.5); fs(g, o.pants, o.rim || RIM, 1);
    if (o.shin) { rr(g, x - 3.2, -8, 6.4, 6 - lift, 2); fs(g, o.shin, null); }
    rr(g, x - 4.4, -4.4 - lift, 10.5, 4.6, 2.2); fs(g, o.shoe, INK, 1);
    if (o.sole) { g.fillStyle = o.sole; g.fillRect(x - 4, -1.2 - lift, 9.6, 1.5); }
  }
}
function torso(g, y, o) {
  rr(g, -10.5, y - 19, 21, 20, 6); fs(g, o.top, o.rim || RIM, 1.1);
}
function arm(g, x0, y0, x1, y1, col, w = 5.4, rim = RIM) {
  g.lineCap = 'round';
  g.strokeStyle = rim; g.lineWidth = w + 1.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
const bobOf = (p) => (p.moving ? Math.sin(p.t * 13) * 1.4 : Math.sin(p.t * 2.6) * 0.9);
const swingA = (p, range = 1.3) => (p.atk > 0 ? p.aim - range + p.atk * range * 2 : p.aim * 0.4 + 0.5);

const LOOKS = {
  // ───── 庭哥：白兔拳手，黑背心、金鍊、刺青、黑拳套 ─────
  tingge(g, p) {
    const b = bobOf(p), ty = -13 + b;
    legs(g, p, { pants: '#111216', shin: '#f1efe9', shoe: '#0c0c10', sole: '#30323a' });
    // 後手
    const punch = p.atk > 0 ? Math.sin(p.atk * Math.PI) : 0;
    arm(g, -8, ty - 15, -13, ty - 6 - punch * 2, '#f1efe9', 6.2, '#9a988f');
    ell(g, -13.5, ty - 4.5, 5.6, 5.4); fs(g, '#0d0d11', RIM, 1.1);
    torso(g, ty, { top: '#0e0f13' });
    untag(g, 0.5, ty - 9.5, 4.8);
    g.strokeStyle = '#e2b53e'; g.lineWidth = 1.3; g.beginPath(); g.arc(1, ty - 18.5, 6.5, 0.15, Math.PI - 0.15); g.stroke();
    rr(g, -0.5, ty - 13.6, 3.4, 3.6, 1); fs(g, '#e2b53e', '#7a5a12', 0.7);
    // 頭
    const hy = ty - 30;
    for (const s of [-1, 1]) { ell(g, s * 5 - 1, hy - 20, 4.2, 12.5, s * 0.16 - 0.06); fs(g, '#f4f2ec', '#8d8a82', 1.2); ell(g, s * 5 - 1, hy - 19, 1.9, 8.5, s * 0.16 - 0.06); fs(g, '#d9b9b4', null); }
    ell(g, 0, hy, 12.5, 11); fs(g, '#f4f2ec', '#8d8a82', 1.3);
    ell(g, 8.5, hy + 3.4, 5.4, 4.2); fs(g, '#fbfaf6', null);
    ell(g, 12.6, hy + 2, 1.5, 1.1); fs(g, '#d98a8f', null);
    g.fillStyle = '#0c0c10'; g.fillRect(-12, hy - 8.6, 24, 3.4);                      // 頭帶
    g.fillStyle = '#eee'; g.fillRect(2, hy - 7.6, 6, 1.2);
    shades(g, 3, hy - 1.6);
    g.strokeStyle = '#15151a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-8, hy + 2); g.lineTo(-5, hy + 5); g.moveTo(-5, hy + 2); g.lineTo(-8, hy + 5); g.stroke(); // 疤
    cig(g, 10.5, hy + 5.6, p.t);
    // 前手：出拳沿瞄準方向伸出
    const a = p.aim, ext = 9 + punch * 13, sx = 8, sy = ty - 15;
    const hx = sx + Math.cos(a) * ext, hyy = sy + 6 + Math.sin(a) * ext - punch * 5;
    arm(g, sx, sy, hx, hyy, '#f1efe9', 6.4, '#9a988f');
    g.fillStyle = '#16161a'; g.fillRect(sx + 0.5, sy + 1, 2.6, 1); g.fillRect(sx + 1.5, sy + 3, 2.2, 0.9);   // 刺青
    ell(g, hx + Math.cos(a) * 3, hyy + Math.sin(a) * 3, 6.6, 6.2); fs(g, '#0d0d11', RIM, 1.2);
    g.fillStyle = '#ececec'; g.fillRect(hx + Math.cos(a) * 3 - 2, hyy + Math.sin(a) * 3 - 1, 4, 1.6);
  },

  // ───── 跳跳：袋鼠，黑色 UNTAG 短袖帽T、工作褲、地雷 ─────
  tiaotiao(g, p) {
    const b = bobOf(p), ty = -13 + b, fur = '#c79158', furD = '#a67440';
    // 尾巴
    g.strokeStyle = furD; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-7, ty - 3); g.quadraticCurveTo(-22, ty + 2, -25 + Math.sin(p.t * 3) * 1.5, -3); g.stroke();
    g.strokeStyle = fur; g.lineWidth = 6.6; g.stroke();
    legs(g, p, { pants: '#101116', shoe: '#0c0c10', sole: '#e9e9e9' });
    arm(g, -8, ty - 15, -12, ty - 6, fur, 5.2, furD);
    torso(g, ty, { top: '#0e0f13' });
    rr(g, -9, ty - 21.5, 18, 6, 3); fs(g, '#15161b', RIM, 1);                        // 帽兜
    untag(g, 0.5, ty - 9.5, 4.8);
    const hy = ty - 30;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 4 - 2, hy - 8); g.quadraticCurveTo(s * 9 - 3, hy - 22, s * 5.5 - 1, hy - 27); g.quadraticCurveTo(s * 1 - 1.5, hy - 20, s * 1.5 - 2, hy - 8); g.closePath(); fs(g, fur, furD, 1.2); g.beginPath(); g.moveTo(s * 4 - 2, hy - 11); g.quadraticCurveTo(s * 6.5 - 2.5, hy - 19, s * 5 - 1.5, hy - 23); g.quadraticCurveTo(s * 3 - 2, hy - 18, s * 3 - 2, hy - 11); g.closePath(); fs(g, '#8a5a34', null); }
    ell(g, -1, hy, 11.5, 10.5); fs(g, fur, furD, 1.3);
    ell(g, 9, hy + 3.5, 7.5, 5.2, 0.12); fs(g, '#dcae78', furD, 1.1);              // 吻部
    ell(g, 15.2, hy + 2.2, 2, 1.6); fs(g, '#2a1c14', null);
    g.strokeStyle = '#4a2f1c'; g.lineWidth = 1; g.beginPath(); g.arc(9, hy + 4, 4.5, 0.3, 1.9); g.stroke();
    shades(g, 3, hy - 2);
    // 前手拿地雷，攻擊時往前拋
    const toss = p.atk > 0 ? Math.sin(p.atk * Math.PI) : 0;
    const hx = 12 + toss * 8, hyy = ty - 7 - toss * 12;
    arm(g, 8, ty - 15, hx, hyy, fur, 5.2, furD);
    g.fillStyle = '#101116'; g.fillRect(5.5, ty - 18, 6, 5);
    if (toss < 0.6) { ell(g, hx + 3, hyy + 1, 6, 4.2); fs(g, '#1f3a2f', INK, 1.1); ell(g, hx + 3, hyy - 0.4, 3.4, 2); fs(g, '#2d5a48', null); ell(g, hx + 3, hyy - 0.8, 1.3, 1); fs(g, Math.sin(p.t * 8) > 0 ? '#5cf0ee' : '#1b6f6e', null); }
  },

  // ───── 狗企：灰老鼠，廚師帽、皮夾克、菜刀與酒瓶 ─────
  gouqi(g, p) {
    const b = bobOf(p), ty = -12 + b, fur = '#8d8983', furD = '#5d5a56';
    g.strokeStyle = '#a0766c'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-7, ty - 3); g.bezierCurveTo(-22, ty - 2, -20, ty - 18, -26 + Math.sin(p.t * 3) * 2, ty - 20); g.stroke();
    legs(g, p, { pants: '#16171c', shoe: '#6f6b66' });
    // 後手：酒瓶
    arm(g, -8, ty - 15, -12.5, ty - 7, '#0f1014', 5.2);
    rr(g, -16, ty - 10, 5, 9, 1.6); fs(g, '#5a2f17', INK, 1); g.fillStyle = '#5a2f17'; g.fillRect(-14.6, ty - 13.6, 2.2, 4); g.fillStyle = '#e8dcc0'; g.fillRect(-15.4, ty - 7.4, 3.8, 3.4);
    torso(g, ty, { top: '#0f1014' });
    g.fillStyle = '#23252c'; g.beginPath(); g.moveTo(-3, ty - 19); g.lineTo(2, ty - 8); g.lineTo(6, ty - 19); g.closePath(); g.fill();     // 翻領
    g.strokeStyle = '#3d414c'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(2, ty - 8); g.lineTo(2, ty); g.stroke();
    g.strokeStyle = '#c9a23a'; g.lineWidth = 0.9; g.beginPath(); g.arc(1.5, ty - 17.5, 3.4, 0.3, 2.8); g.stroke();
    const hy = ty - 29;
    for (const s of [-1, 1]) { ell(g, s * 10 - 2, hy - 5, 6, 6.4); fs(g, fur, furD, 1.2); ell(g, s * 10 - 2, hy - 5, 3.4, 3.8); fs(g, '#c9a39c', null); }
    ell(g, -1, hy, 11, 10); fs(g, fur, furD, 1.3);
    g.beginPath(); g.moveTo(6, hy - 3); g.quadraticCurveTo(17, hy + 1, 16.5, hy + 4); g.quadraticCurveTo(10, hy + 8.5, 4, hy + 6); g.closePath(); fs(g, '#a09c96', furD, 1.1);   // 尖吻
    ell(g, 16.4, hy + 3, 1.7, 1.5); fs(g, '#d98a8f', null);
    g.strokeStyle = 'rgba(240,240,240,.6)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(12, hy + 4); g.lineTo(19, hy + 2.4); g.moveTo(12, hy + 5); g.lineTo(19, hy + 6.4); g.stroke();
    // 廚師帽
    rr(g, -8.5, hy - 13.5, 15, 5.4, 1.4); fs(g, '#f1eee6', '#9c988f', 1.1);
    for (const [x, y, r] of [[-6.5, hy - 17, 5], [-1, hy - 19.5, 5.8], [5, hy - 17, 5]]) { ell(g, x, y, r, r * 0.9); fs(g, '#f6f4ee', '#9c988f', 1.1); }
    g.fillStyle = '#f6f4ee'; g.fillRect(-7, hy - 17.5, 13, 5);
    shades(g, 3, hy - 1.6);
    cig(g, 9, hy + 6.2, p.t);
    // 前手：菜刀劈砍
    const a = swingA(p, 1.5), sx = 8, sy = ty - 14, hx = sx + Math.cos(a) * 8, hyy = sy + 5 + Math.sin(a) * 8;
    arm(g, sx, sy, hx, hyy, '#0f1014', 5.2);
    g.save(); g.translate(hx, hyy); g.rotate(a);
    g.fillStyle = '#4a2c19'; g.fillRect(-2, -1.5, 7, 3);
    rr(g, 5, -6.5, 13, 9.5, 1.4); fs(g, '#c7ccd4', '#4d535e', 1); g.fillStyle = '#eef1f5'; g.fillRect(6, 1, 11, 1.6);
    g.fillStyle = 'rgba(120,200,90,.55)'; g.fillRect(8, -3, 3, 2); g.fillRect(13, -5, 2.4, 1.6);
    g.restore();
  },

  // ───── 紅髮深深：紅色長髮、UNTAG 鴨舌帽、帽T短褲，操控符文與魔法陣 ─────
  shenshen(g, p) {
    const b = bobOf(p), ty = -13 + b, hair = '#c2182d', hairD = '#7d0f1e', skin = '#f3d9c4';
    const hy = ty - 30, sway = Math.sin(p.t * 2.2) * 1.4 + (p.moving ? -3 : 0);
    // 後髮
    g.beginPath(); g.moveTo(-11, hy - 4); g.bezierCurveTo(-19, hy + 8, -17 + sway, ty - 2, -14 + sway * 1.6, ty + 6);
    g.lineTo(-6 + sway, ty + 3); g.lineTo(-9 + sway * 1.2, ty + 9); g.lineTo(1, ty + 2); g.lineTo(6, ty - 18); g.lineTo(8, hy - 4); g.closePath(); fs(g, hair, hairD, 1.2);
    legs(g, p, { pants: skin, rim: '#b99a85', shoe: '#0c0c10', sole: '#f0f0f0' });
    rr(g, -9.5, -17 + b * 0.3, 19, 7, 2.5); fs(g, '#101116', RIM, 1);                 // 短褲
    arm(g, -8, ty - 15, -12, ty - 6, '#0f1014', 5.2);
    torso(g, ty, { top: '#0f1014' });
    rr(g, -9, ty - 21.5, 18, 6, 3); fs(g, '#16171c', RIM, 1);
    untag(g, 0.5, ty - 9.5, 4.8, '#b9bcc4');
    ell(g, 0, hy, 11.5, 10.8); fs(g, skin, '#b99a85', 1.2);
    // 前髮與側髮
    g.beginPath(); g.moveTo(-12, hy - 1); g.quadraticCurveTo(-12, hy - 11, 0, hy - 11); g.quadraticCurveTo(11, hy - 11, 12, hy - 2); g.quadraticCurveTo(8, hy - 6, 3, hy - 5); g.quadraticCurveTo(-4, hy - 4, -8, hy + 6); g.quadraticCurveTo(-11, hy + 10, -12.5, hy + 13); g.closePath(); fs(g, hair, hairD, 1.1);
    g.beginPath(); g.moveTo(10.5, hy - 2); g.quadraticCurveTo(13, hy + 6, 10, hy + 13); g.quadraticCurveTo(9, hy + 5, 8.5, hy - 2); g.closePath(); fs(g, hair, hairD, 1);
    // 鴨舌帽
    g.beginPath(); g.moveTo(-12, hy - 5); g.quadraticCurveTo(-11, hy - 17, 1, hy - 17); g.quadraticCurveTo(12, hy - 17, 12.5, hy - 5.5); g.closePath(); fs(g, '#0e0f13', RIM, 1.1);
    g.beginPath(); g.moveTo(4, hy - 6.6); g.quadraticCurveTo(16, hy - 8, 19, hy - 4.2); g.quadraticCurveTo(12, hy - 4, 4, hy - 4.6); g.closePath(); fs(g, '#0a0a0e', RIM, 1);
    untag(g, 1.5, hy - 10.5, 4.2);
    shades(g, 3.5, hy - 1.2);
    g.strokeStyle = '#a4574f'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(5, hy + 5.4); g.lineTo(8, hy + 5.2); g.stroke();
    // 前手托著浮空符文
    const cast = p.atk > 0 ? Math.sin(p.atk * Math.PI) : 0, a = p.aim;
    const hx = 9 + Math.cos(a) * (5 + cast * 5), hyy = ty - 10 + Math.sin(a) * (5 + cast * 5) - cast * 3;
    arm(g, 8, ty - 15, hx, hyy, '#0f1014', 5.2);
    ell(g, hx + 1, hyy, 2.6, 2.4); fs(g, skin, '#b99a85', 0.8);
    rune(g, hx + 8 + Math.cos(a) * 3, hyy - 6 + Math.sin(p.t * 3) * 1.5, 5.5 + cast * 3, p.t, 0.75 + cast * 0.25);
  },

  // ───── 嗯雞抖：黑色烏骨雞，西裝領帶、雪茄、雷射炮槍 ─────
  enjidou(g, p) {
    const b = bobOf(p), ty = -13 + b;
    for (let i = 0; i < 5; i++) { ell(g, -12 - i * 1.6, ty - 6 - i * 2.4 + Math.sin(p.t * 3 + i) * 0.6, 5 - i * 0.4, 3.4, -0.7); fs(g, i % 2 ? '#2a2a31' : '#1b1b20', null); }   // 尾羽
    legs(g, p, { pants: '#0e0f13', shoe: '#08080b', sole: '#2a2c33' });
    arm(g, -8, ty - 15, -11.5, ty - 6, '#0f1014', 5.4);
    torso(g, ty, { top: '#0f1014' });
    g.fillStyle = '#eceff2'; g.beginPath(); g.moveTo(-3.5, ty - 19); g.lineTo(1.5, ty - 7); g.lineTo(6.5, ty - 19); g.closePath(); g.fill();
    g.fillStyle = '#0a0a0d'; g.beginPath(); g.moveTo(0.3, ty - 18.5); g.lineTo(2.9, ty - 18.5); g.lineTo(3.4, ty - 10); g.lineTo(1.6, ty - 7.6); g.lineTo(-0.2, ty - 10); g.closePath(); g.fill();
    g.strokeStyle = RIM; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-3.5, ty - 19); g.lineTo(1.5, ty - 7); g.lineTo(6.5, ty - 19); g.stroke();
    untag(g, -4.6, ty - 5, 2.6, '#aeb2ba');
    // 蓬鬆的頭
    const hy = ty - 31;
    g.fillStyle = '#17171c'; g.strokeStyle = '#3a3a44'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= 26; i++) { const an = i / 26 * TAU, r = 13.6 + (i % 2 ? 2.6 : 0) + Math.sin(p.t * 2 + i) * 0.3; const x = Math.cos(an) * r, y = hy - 1 + Math.sin(an) * r * 0.96; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2c2c34'; for (const [x, y] of [[-6, -9], [1, -11], [7, -8], [-9, -2], [-3, -5], [5, -4], [-7, 6], [9, 3]]) { g.beginPath(); g.arc(x, hy + y, 2.1, 0, TAU); g.fill(); }
    g.beginPath(); g.moveTo(9, hy + 2); g.lineTo(15.5, hy + 4.4); g.lineTo(9, hy + 7); g.closePath(); fs(g, '#2b2d36', INK, 1);     // 喙
    ell(g, 9.5, hy + 9.4, 2.2, 3); fs(g, '#b3242e', '#5c0f15', 0.8);                                                              // 肉垂
    shades(g, 3.5, hy - 1.4, 1.06);
    cig(g, 12.5, hy + 5.4, p.t, true);
    // 雷射炮槍：沿瞄準方向
    const fire = p.atk > 0 ? Math.sin(Math.min(1, p.atk * 1.4) * Math.PI) : 0, a = Math.max(-1.2, Math.min(1.2, p.aim));
    const sx = 7, sy = ty - 13, hx = sx + Math.cos(a) * 7 - fire * 2, hyy = sy + 3 + Math.sin(a) * 7;
    arm(g, sx, sy, hx, hyy, '#0f1014', 5.4);
    g.save(); g.translate(hx, hyy); g.rotate(a);
    rr(g, -4, -5, 24, 9, 2.6); fs(g, '#1a1c23', '#4a505e', 1.1);
    rr(g, 16, -6.5, 8, 12, 3); fs(g, '#23262f', '#4a505e', 1.1);
    g.fillStyle = '#35e6e4'; g.shadowColor = '#35e6e4'; g.shadowBlur = 6 + fire * 10; g.fillRect(-1, -2.4, 14, 1.6); g.fillRect(3, 1, 9, 1.2);
    ell(g, 24.5, -0.5, 2.6 + fire * 2, 4.4 + fire * 2); g.fill(); g.shadowBlur = 0;
    rr(g, 1, 3.4, 4.6, 6, 1.2); fs(g, '#14151a', '#4a505e', 0.9);
    g.restore();
  },
};

// 深深的符文（也給 UI 與特效用）
export function rune(g, x, y, s, t, alpha = 1) {
  g.save(); g.translate(x, y); g.globalAlpha *= alpha;
  g.shadowColor = '#3ee6e0'; g.shadowBlur = s * 1.6;
  g.strokeStyle = '#8ff7f2'; g.lineWidth = Math.max(1, s * 0.22); g.lineCap = 'round';
  g.rotate(Math.sin(t * 1.7) * 0.2);
  g.beginPath(); g.moveTo(-s * 0.35, s); g.lineTo(-s * 0.35, -s); g.lineTo(s * 0.5, -s * 0.35); g.lineTo(-s * 0.35, s * 0.2); g.lineTo(s * 0.55, s); g.stroke();
  g.beginPath(); g.arc(0, 0, s * 1.5, t * 2, t * 2 + 4.4); g.lineWidth = Math.max(0.7, s * 0.12); g.stroke();
  g.restore();
}

// 尚未提供設定圖的角色：剪影佔位（職業色 + 問號）
function placeholder(g, p, def) {
  const b = bobOf(p), ty = -13 + b, col = ROLES[def.role].color;
  legs(g, p, { pants: '#14161c', shoe: '#0c0c10' });
  arm(g, -8, ty - 15, -12, ty - 6, '#171920', 5.2);
  torso(g, ty, { top: '#171920', rim: col });
  const hy = ty - 30;
  ell(g, 0, hy, 12, 11.5); fs(g, '#171920', col, 1.3);
  g.beginPath(); g.moveTo(-12, hy + 2); g.quadraticCurveTo(-13, hy - 14, 0, hy - 15); g.quadraticCurveTo(13, hy - 14, 12, hy + 2); g.quadraticCurveTo(0, hy - 6, -12, hy + 2); g.closePath(); fs(g, '#0f1015', col, 1.1);
  g.shadowColor = col; g.shadowBlur = 6; g.fillStyle = col; g.font = '900 13px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0.5, hy + 3); g.shadowBlur = 0;
  untag(g, 0.5, ty - 9.5, 4.6, col);
  const sw = p.atk > 0 ? Math.sin(p.atk * Math.PI) : 0, a = p.aim;
  arm(g, 8, ty - 15, 10 + Math.cos(a) * (6 + sw * 8), ty - 8 + Math.sin(a) * (6 + sw * 8), '#171920', 5.2);
}

export function hasLook(id) { return !!LOOKS[id]; }

// 畫在 (0,0) 為腳底的位置；pose.flip = true 時朝左（aim 需已換算成相對朝向的角度）
export function drawChar(g, charId, pose) {
  const def = CHARS[charId] || CHARS.tingge;
  const sc = def.small || 1;
  g.save();
  FLIP = !!pose.flip;
  if (FLIP) g.scale(-1, 1);
  if (pose.down) { g.translate(0, -5); g.rotate(-1.45); g.globalAlpha *= 0.75; }
  if (sc !== 1) g.scale(sc, sc);
  g.lineJoin = 'round';
  if (LOOKS[charId]) LOOKS[charId](g, pose); else placeholder(g, pose, def);
  g.restore();
}

// UI 用立繪：每次回傳一張新的 canvas（內容從快取複製），可以同時放在畫面多處
const portraitCache = new Map();
export function portrait(charId, size = 160) {
  const key = charId + ':' + size, dpr = Math.min(2, window.devicePixelRatio || 1);
  let m = portraitCache.get(key);
  if (!m) {
    m = document.createElement('canvas');
    m.width = m.height = Math.round(size * dpr);
    const g = m.getContext('2d');
    g.scale(dpr, dpr);
    const s = size / 78;
    g.translate(size / 2 - 2 * s, size * 0.9); g.scale(s, s);
    drawChar(g, charId, { t: 0.6, moving: false, atk: 0, aim: 0.15, down: false });
    portraitCache.set(key, m);
  }
  const c = document.createElement('canvas');
  c.width = m.width; c.height = m.height; c.style.width = c.style.height = size + 'px';
  c.getContext('2d').drawImage(m, 0, 0);
  return c;
}
