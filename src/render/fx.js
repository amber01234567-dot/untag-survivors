// 純視覺特效（粒子、環、斬擊、傷害數字、光）。只吃事件，不影響遊戲邏輯。
import { ENEMY_LIST } from '../data/enemies.js';
import { TAU } from '../core/util.js';
import { FXS, tinted } from './fxsprites.js';

const BOOM = [
  ['#ffb347', '#ff7a2f'], ['#ffd76b', '#ff6a2f'], ['#7dffb0', '#2fd67a'], ['#ff6b6b', '#c91f3f'], ['#ff9aa6', '#e0142d'],
  ['#fff3c4', '#ffc53d'], ['#a8ffd0', '#1fbf7a'], ['#e9f6ff', '#7cc7ff'], ['#ffb347', '#ff4d2f'], ['#ffe9a8', '#ff8a2f'],
  ['#b9fffb', '#2de2e6'], ['#a8ffd0', '#1fbf7a'], ['#ff6bd6', '#ffd76b'],
];
const RING = ['#aab2c2', '#ffc53d', '#5dff9d', '#ffd76b', '#ff8fd0', '#9fe8ff', '#b56bff', '#2de2e6'];
const SLASH = [['#ffffff', '#9fd0ff'], ['#ffd9b0', '#ff5a2f'], ['#d8ff9a', '#63d12f'], ['#fff3c4', '#ffb52f'], ['#fff6e0', '#c99755'], ['#b9fffb', '#2de2e6'], ['#ffffff', '#ffd0d0'], ['#e8ffff', '#2de2e6'], ['#f4ffe0', '#8fd12f']];
const KILL_COL = { slime: '#7c9a45', bat: '#c43fb4', bag: '#9dff3c', vending: '#b33346', dog: '#6b7686', thug: '#8f8a84', chip: '#c7283a', brute: '#8e3a33', shroom: '#7a3fb3', ooze: '#5b46b8', oozelet: '#6f5ad0', glitch: '#2de2e6', bug: '#2de2e6', sentry: '#2de2e6', eye: '#0fb9c0', virus: '#ff3b5c', nest: '#c84dff', golem: '#5f6d45', champ: '#b3242e', warden: '#2de2e6', goblin: '#c9a23a' };

export class Fx {
  constructor() { this.parts = []; this.booms = []; this.hits = []; this.rings = []; this.slashes = []; this.texts = []; this.lines = []; this.lights = []; this.shake = 0; this.budget = 110; this.banner = null; this.casts = []; this.onSfx = null; this.opts = { dmgNum: true, shake: true }; }

  spark(x, y, n, col, sp = 160, life = 0.4, size = 3, add = true, grav = 0) {
    // 每幀粒子預算：多人同時放大招時不會被粒子淹沒畫面
    if (this.parts.length > 700 || this.budget <= 0) return;
    if (this.budget < 60) n = Math.ceil(n / 2);
    this.budget -= n;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random() * 0.7); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life * (0.6 + Math.random() * 0.4), size: size * (0.6 + Math.random() * 0.8), col, add, grav }); }
  }
  ring(x, y, r, col, life = 0.4, w = 4) { if (this.rings.length < 90) this.rings.push({ x, y, r, col, life, max: life, w }); }
  light(x, y, r, life = 0.25) { this.lights.push({ x, y, r, life, max: life }); }
  text(x, y, s, col, size = 14, life = 0.7) { if (this.texts.length < 90) this.texts.push({ x: x + (Math.random() - 0.5) * 14, y, s, col, size, life, max: life, vy: -46 }); }

  event(ev, players) {
    const k = ev[0];
    switch (k) {
      case 'd': {
        const f = ev[4];
        if (f === 1) this.sfx('crit'); else if (f === 0) this.sfx('hit');
        if (f === 2) this.text(ev[1], ev[2], '+' + ev[3], '#5dff9d', 13);
        else if (f === 3) { this.text(ev[1], ev[2], '-' + ev[3], '#ff5a6b', 15, 0.8); this.spark(ev[1], ev[2] + 20, 6, '#ff5a6b', 140, 0.35, 3); }
        else if (this.opts.dmgNum) this.text(ev[1], ev[2], String(ev[3]), f === 1 ? '#ffd23c' : '#f4f6fa', f === 1 ? 18 : 12, f === 1 ? 0.8 : 0.55);
        break;
      }
      case 's': this.slashes.push({ x: ev[1], y: ev[2], a: ev[3] / 100, r: ev[4], arc: ev[5] / 100, st: ev[6], life: ev[6] >= 7 ? 0.32 : 0.2, max: ev[6] >= 7 ? 0.32 : 0.2 }); if (ev[6] === 7) { this.light(ev[1], ev[2], ev[4] * 2.4, 0.3); this.spark(ev[1], ev[2], 6, '#9ff6ff', 260, 0.4, 3); } this.sfx(ev[6] === 3 ? 'punch' : ev[6] === 6 ? null : 'slash'); break;
      case 'b': {
        const [c1, c2] = BOOM[ev[4]] || BOOM[0], r = ev[3];
        if (FXS.boom && this.booms.length < 40) this.booms.push({ x: ev[1], y: ev[2], r, life: 0.34, max: 0.34 });
        this.ring(ev[1], ev[2], r, c1, 0.35, Math.max(3, r * 0.08));
        if (this.rings.length < 60) this.rings.push({ x: ev[1], y: ev[2], r: r * 0.8, col: c2, life: 0.28, max: 0.28, w: 0, fill: true });
        this.spark(ev[1], ev[2], Math.min(26, 6 + r / 6), c1, 120 + r * 2.2, 0.5, 3 + r / 40);
        if (ev[4] === 12) for (const c of ['#ff6bd6', '#6bd6ff', '#ffd76b']) this.spark(ev[1], ev[2], 8, c, 260, 0.7, 3, true, 200);
        this.spark(ev[1], ev[2], 2, 'rgba(70,70,82,.4)', 50, 0.7, 7, false);
        this.light(ev[1], ev[2], r * 2.2, 0.3);
        if (r > 60) this.addShake(Math.min(8, r / 30));
        this.sfx(ev[4] === 3 ? 'ehit' : 'boom');
        break;
      }
      case 'k': {
        const def = ENEMY_LIST[ev[1]], col = KILL_COL[def.id] || '#fff';
        this.spark(ev[2], ev[3] - def.r, def.boss ? 60 : ev[4] ? 22 : 7, col, def.boss ? 380 : 170, def.boss ? 1.1 : 0.45, def.boss ? 7 : 3.5, false, 300);
        this.spark(ev[2], ev[3] - def.r, 3, '#ffffff', 110, 0.25, 2.5);
        if (def.boss || ev[4]) { this.ring(ev[2], ev[3], def.boss ? 320 : 110, col, 0.6, 8); this.light(ev[2], ev[3], 400, 0.5); this.addShake(def.boss ? 18 : 6); }
        this.sfx(def.boss ? 'bossdie' : 'kill');
        break;
      }
      case 'h': this.sfx('hit'); if (FXS.hit && this.hits.length < 30) this.hits.push({ x: ev[1], y: ev[2], a: Math.random() * TAU, life: 0.14, max: 0.14 }); else this.spark(ev[1], ev[2], 3, '#fff5c4', 110, 0.2, 2.2); break;
      case 'l': this.lines.push({ x1: ev[1], y1: ev[2], x2: ev[3], y2: ev[4], st: ev[5], life: ev[5] === 4 ? 0.38 : 0.22, max: ev[5] === 4 ? 0.38 : 0.22, seed: Math.random() * 99 }); if (ev[5] === 4) { this.sfx('shot'); this.sfx('zap'); this.light(ev[1], ev[2], 150, 0.2); } if (ev[5] === 1 || ev[5] === 3) { this.light(ev[3], ev[4], 160, 0.2); this.sfx('zap'); } else if (ev[5] === 0) this.sfx('shot'); break;
      case 't': this.text(ev[1], ev[2], ev[3], ['#ffffff', '#ffd23c', '#5dff9d', '#ff5a6b', '#b7a6ff'][ev[4]] || '#fff', 17, 1.1); break;
      case 'r': this.ring(ev[1], ev[2], ev[3], RING[ev[4]] || RING[0], ev[3] > 500 ? 0.8 : 0.45, ev[3] > 300 ? 8 : 4); if (ev[4] === 2) this.spark(ev[1], ev[2] - 20, 6, '#5dff9d', 60, 0.6, 3); if (ev[4] === 7) this.light(ev[1], ev[2], 900, 0.6); break;
      case 'sp': this.rings.push({ x: ev[1], y: ev[2], r: ev[3] * 1.6, col: '#b56bff', life: 0.5, max: 0.5, w: 2.5, inv: true }); this.spark(ev[1], ev[2], 4, '#b56bff', 50, 0.5, 2.5); break;
      case 'sh': this.addShake(ev[1]); break;
      case 'bn': this.banner = { title: ev[1], sub: ev[2], st: ev[3], life: 2.4, max: 2.4 }; break;
      case 'sk': { const p = players && players.find((x) => x.id === ev[1]); if (p) { this.casts.push({ id: ev[1], name: ev[3], ult: ev[2], life: 1.4, max: 1.4 }); this.ring(p.x, p.y, ev[2] ? 150 : 70, ev[2] ? '#ffd23c' : '#9fe8ff', 0.5, ev[2] ? 7 : 4); if (ev[2]) { this.spark(p.x, p.y - 20, 30, '#ffd23c', 320, 0.7, 4); this.light(p.x, p.y, 500, 0.5); this.addShake(6); } } this.sfx(ev[2] ? 'ult' : 'skill'); break; }
      case 'gate': this.sfx('gate'); break;
      case 'tint': this.tint = { life: ev[1], max: ev[1] }; this.sfx('gate'); break;      // 死神審判：時間凝結的畫面染色
      case 'evo': {                              // 武器進化的瞬間
        const p = players && players.find((x) => x.id === ev[1]);
        if (p) { this.ring(p.x, p.y, 260, '#ffd23c', 0.8, 9); this.ring(p.x, p.y, 150, '#fff3b0', 0.55, 6); this.spark(p.x, p.y - 20, 40, '#ffd23c', 380, 0.9, 4); this.light(p.x, p.y, 600, 0.7); this.addShake(8); this.casts.push({ id: ev[1], name: '進化 ‧ ' + ev[2], ult: 1, life: 2.4, max: 2.4 }); }
        this.sfx('chest'); this.sfx('ult'); break;
      }
      case 'got': if (ev[1] === 'g') this.sfx('gem'); else if (ev[1] === 'c') this.sfx('coin'); break;
      case 'a': this.sfx(ev[1]); break;
    }
  }
  gateOpen(x, y, col) { this.ring(x, y, 180, col, 0.7, 6); this.spark(x, y, 40, col, 300, 0.8, 4); this.light(x, y, 400, 0.6); this.addShake(5); }
  addShake(v) { if (this.opts.shake) this.shake = Math.min(22, Math.max(this.shake, v)); }
  sfx(n) { if (n && this.onSfx) this.onSfx(n); }

  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 40); this.budget = 110; this.t = (this.t || 0) + dt;
    const upd = (arr) => { let j = 0; for (let i = 0; i < arr.length; i++) { const o = arr[i]; o.life -= dt; if (o.life > 0) arr[j++] = o; } arr.length = j; };
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 3 * dt; p.vy = p.vy * (1 - 3 * dt) + p.grav * dt; }
    for (const t of this.texts) { t.y += t.vy * dt; t.vy *= 1 - 2.5 * dt; }
    upd(this.parts); upd(this.booms); upd(this.hits); upd(this.rings); upd(this.slashes); upd(this.texts); upd(this.lines); upd(this.lights); upd(this.casts);
    if (this.tint) { this.tint.life -= dt; if (this.tint.life <= 0) this.tint = null; }
    if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; }
  }

  // 世界座標內的特效（已套用鏡頭變換）
  draw(g) {
    g.lineCap = 'round';
    for (const r of this.rings) {
      const k = 1 - r.life / r.max, rad = r.inv ? r.r * (1 - k * 0.8) : r.r * (0.25 + 0.75 * (1 - (1 - k) * (1 - k)));
      g.globalAlpha = (1 - k) * (r.fill ? 0.2 : 0.9);
      if (r.fill) { g.fillStyle = r.col; g.beginPath(); g.ellipse(r.x, r.y, rad, rad * 0.86, 0, 0, TAU); g.fill(); }
      else { g.strokeStyle = r.col; g.lineWidth = r.w * (1 - k * 0.6); g.beginPath(); g.ellipse(r.x, r.y, rad, rad * 0.86, 0, 0, TAU); g.stroke(); }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
    for (const s of this.slashes) {
      const k = 1 - s.life / s.max, [c1, c2] = SLASH[s.st] || SLASH[0];
      if (s.st === 7 && FXS.evo_starslash) {          // 進化：星穹光刃的光刃橫掃
        const im = FXS.evo_starslash, d = s.r * 2.3 * (0.8 + k * 0.3);
        g.save(); g.translate(s.x, s.y); g.scale(1, 0.86); g.rotate(s.a + k * 2.6);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - k) * 1.7);
        g.drawImage(im, -d / 2, -d / 2, d, d); g.restore(); g.globalCompositeOperation = 'lighter';
        continue;
      }
      if (s.st === 8 && FXS.evo_chop) {               // 進化：斬骨巨刀的重剁
        const im = FXS.evo_chop, d = s.r * 1.5, right = Math.cos(s.a) >= 0 ? 1 : -1;
        g.save(); g.translate(s.x + Math.cos(s.a) * s.r * 0.55, s.y + Math.sin(s.a) * s.r * 0.55 - d * 0.35 * (1 - Math.min(1, k * 3))); g.scale(right, 1);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - k) * 2);
        g.drawImage(im, -d / 2, -d / 2, d, d); g.restore(); g.globalCompositeOperation = 'lighter';
        continue;
      }
      const sim = s.arc <= 6 && tinted('slash', c2);
      if (sim) {                                   // 圖片斬擊：沿揮砍方向掃過並淡出
        const hh = 2 * s.r * Math.min(1, Math.sin(Math.min(s.arc, Math.PI) / 2) * 1.05), ww = hh * sim.width / sim.height, sc = 0.75 + k * 0.35;
        g.save(); g.translate(s.x, s.y); g.scale(1, 0.86); g.rotate(s.a - 0.35 + k * 0.5); g.scale(sc, sc);
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - k) * 1.6);
        g.drawImage(sim, s.r - ww, -hh / 2, ww, hh);
        g.restore(); g.globalCompositeOperation = 'lighter';
        continue;
      }
      const a0 = s.a - s.arc / 2 + s.arc * Math.max(0, k * 1.4 - 0.4), a1 = s.a - s.arc / 2 + s.arc * Math.min(1, k * 1.8 + 0.25);
      g.save(); g.translate(s.x, s.y); g.scale(1, 0.86);
      const full = s.arc > 6;
      g.globalAlpha = (1 - k) * 0.9;
      g.strokeStyle = c2; g.lineWidth = s.r * 0.34 * (1 - k * 0.5); g.beginPath(); g.arc(0, 0, s.r * 0.78, full ? 0 : a0, full ? TAU : a1); g.stroke();
      g.strokeStyle = c1; g.lineWidth = s.r * 0.1; g.beginPath(); g.arc(0, 0, s.r * 0.92, full ? 0 : a0, full ? TAU : a1); g.stroke();
      g.restore();
    }
    for (const l of this.lines) {
      const k = l.life / l.max;
      g.globalAlpha = k;
      if (l.st >= 5 && l.st <= 7) {            // 進化：聖療光鏈（5 金鏈傷害 / 6 綠鏈治療）、母艦雷射（7）
        const col = l.st === 5 ? '#ffd76b' : l.st === 6 ? '#7dffb0' : '#7cf6ff', dx = l.x2 - l.x1, dy = l.y2 - l.y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 10; g.lineWidth = l.st === 7 ? 4 : 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(l.x1, l.y1);
        if (l.st === 7) g.lineTo(l.x2, l.y2); else for (let i = 1; i <= 10; i++) { const w2 = Math.sin(i * 1.3 + l.seed + this.t * 14) * 7 * Math.sin(i / 10 * Math.PI); g.lineTo(l.x1 + dx * i / 10 + nx * w2, l.y1 + dy * i / 10 + ny * w2); }
        g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); g.shadowBlur = 0; g.lineCap = 'butt';
        if (l.st === 7) { g.fillStyle = col; g.beginPath(); g.arc(l.x2, l.y2, 7 * k, 0, 6.283); g.fill(); }
      } else
      if (l.st === 4) {                        // 進化：死神狙擊的貫穿光線
        g.lineCap = 'round'; g.shadowColor = '#ff2a4a'; g.shadowBlur = 18;
        g.strokeStyle = '#ff2a4a'; g.lineWidth = 24 * k; g.beginPath(); g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 8 * k; g.stroke(); g.shadowBlur = 0; g.lineCap = 'butt';
      } else
      if (l.st === 1 || l.st === 3) {          // 閃電 / 符文光柱
        const col = l.st === 1 ? '#bfe6ff' : '#ff5a6e';
        g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = l.st === 3 ? 9 * k : 3.5;
        g.beginPath(); g.moveTo(l.x1, l.y1);
        if (l.st === 1) for (let i = 1; i < 8; i++) g.lineTo(l.x1 + (l.x2 - l.x1) * i / 8 + Math.sin(l.seed + i * 7.3) * 16, l.y1 + (l.y2 - l.y1) * i / 8);
        g.lineTo(l.x2, l.y2); g.stroke(); g.shadowBlur = 0;
      } else {
        g.strokeStyle = l.st === 2 ? '#5dff9d' : '#fff3c4'; g.lineWidth = l.st === 2 ? 3 : 2.2 * k + 0.5;
        g.beginPath(); g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); g.stroke();
      }
    }
    for (const p of this.parts) {
      if (!p.add) continue;
      const k = p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.5); g.fillStyle = p.col;
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, TAU); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of this.parts) {
      if (p.add) continue;
      const k = p.life / p.max;
      g.globalAlpha = Math.min(1, k * 1.2); g.fillStyle = p.col;
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  }
  // 圖片特效（一般混合模式，畫在粒子之上）
  drawSprites(g) {
    const b = FXS.boom, h = FXS.hit;
    if (b) for (const o of this.booms) {
      const k = 1 - o.life / o.max, i = Math.min(3, Math.floor(k * 4)), cw = b.width / 4, size = Math.min(o.r * 2.1, 230);
      g.globalAlpha = i === 3 ? 0.8 : 1; g.drawImage(b, i * cw, 0, cw, b.height, o.x - size / 2, o.y - size * 0.56, size, size * b.height / cw);
    }
    if (h) for (const o of this.hits) {
      const k = 1 - o.life / o.max, size = 16 + k * 22;
      g.save(); g.translate(o.x, o.y); g.rotate(o.a); g.globalAlpha = 1 - k * 0.7; g.drawImage(h, -size / 2, -size / 2, size, size); g.restore();
    }
    g.globalAlpha = 1;
  }
  drawTexts(g) {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    for (const t of this.texts) {
      const k = t.life / t.max, pop = 1 + Math.max(0, k - 0.8) * 2.5;
      g.globalAlpha = Math.min(1, k * 2.5);
      g.font = `italic 900 ${Math.round(t.size * pop * 1.08)}px "Arial Black", "Noto Sans TC", "Microsoft JhengHei", sans-serif`;
      g.strokeStyle = '#0a0c12'; g.lineWidth = 4.6; g.strokeText(t.s, t.x, t.y + 1.2); g.strokeText(t.s, t.x, t.y);
      g.fillStyle = t.col; g.fillText(t.s, t.x, t.y);
    }
    g.globalAlpha = 1;
  }
}
