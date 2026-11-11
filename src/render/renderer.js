// 主繪製：鏡頭 → 地面層 → 地面效果 → 依 Y 排序的角色與敵人 → 子彈 / 特效 → 遮蔽層 → 光照 → 文字。
import { PROJ_KINDS, ZONE_KINDS, SUMMON_KINDS, BUFF_BITS, VIEW_H } from '../sim/const.js';
import { ENEMY_LIST } from '../data/enemies.js';
import { TAU, clamp } from '../core/util.js';
import { zoneAt } from '../sim/levelgen.js';
import { MapRenderer } from './map.js';
import { enemySprite, setEnemyTheme } from './enemySprites.js';
import { drawChar, rune, charHeight } from './chibi.js';
import { Fx } from './fx.js';
import { FXS, tinted } from './fxsprites.js';

// 子彈貼圖：[素材, 寬度, 旋轉方式, 染色]
const PSPR = {
  bullet: ['bullet', 18, 'aim', '#ffe69a'], gatling: ['bullet', 18, 'aim', '#ffe69a'], revolver: ['bullet', 30, 'aim', '#fff1c4'], pistol: ['bullet', 15, 'aim', '#bff4ff'], dronebolt: ['bullet', 14, 'aim', '#2de2e6'],
  knife: ['knife', 24, 'aim'], cleaver: ['cleaver', 24, 'spin'], blade: ['blade', 24, 'spin'], rune: ['rune', 17, ''], syringe: ['syringe', 28, 'aim'], skewer: ['skewer', 36, 'aim'], bead: ['bead', 15, ''],
  baseball: ['ball', 15, 'spin'], missile: ['missile', 26, 'aim'], molotov: ['molotov', 17, 'spin'], grenade: ['grenade', 15, 'spin'],
  note: ['pk_c', 13, 'spin'], kart: ['kart', 46, 'aim'], wave: ['swordqi', 78, 'aim'], fireball: ['orb', 20, 'spin', '#ff8a2f'],
  e_can: ['orb', 17, '', '#ff5a5a'], e_spore: ['orb', 16, '', '#9dff3c'], e_orb: ['orb', 17, '', '#ff2d86'], e_trash: ['orb', 19, '', '#b08a4a'], e_chain: ['orb', 17, '', '#c9ced8'],
};
export const SLOT_COLORS = ['#2de2e6', '#ffc53d', '#ff5a8a', '#8dff6b'];
const FONT = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "WenQuanYi Zen Hei", sans-serif';

export class Renderer {
  constructor(canvas, L, myId, roster) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.L = L; this.myId = myId;
    this.roster = new Map(roster.map((p, i) => [p.id, Object.assign({ slot: i }, p)]));
    this.map = new MapRenderer(L); this.fx = new Fx(); setEnemyTheme(L.theme);
    this.cam = { x: L.spawn.x - 640, y: L.spawn.y - 360 }; this.anim = new Map(); this.lobs = new Map();
    this.lc = document.createElement('canvas'); this.lg = this.lc.getContext('2d');
    this.t = 0; this.gates = L.links.map((l) => l.open);
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = this.cv.clientWidth || innerWidth, h = this.cv.clientHeight || innerHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    let sc = this.cv.height / VIEW_H;
    if (this.cv.width / sc > 1440) sc = this.cv.width / 1440;
    if (this.cv.width / sc < 700) sc = this.cv.width / 700;        // 直向手機：拉遠一點
    this.sc = sc; this.vw = this.cv.width / sc; this.vh = this.cv.height / sc;
    this.lc.width = Math.ceil(this.cv.width / 3); this.lc.height = Math.ceil(this.cv.height / 3);
  }

  draw(f, dt) {
    const g = this.g, fx = this.fx, L = this.L;
    this.t += dt;
    const t = this.t, me = f.me || f.players[0];
    fx.update(dt);
    L.links.forEach((l, i) => { if (l.open && !this.gates[i]) { this.gates[i] = true; fx.gateOpen(l.x, l.y, this.map.th.gate); } });
    // 鏡頭
    if (me) {
      const tx = me.x - this.vw / 2, ty = me.y - 20 - this.vh / 2, k = Math.min(1, dt * 9);
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    }
    const cam = { x: this.cam.x + (Math.random() - 0.5) * fx.shake, y: this.cam.y + (Math.random() - 0.5) * fx.shake };
    const vw = this.vw, vh = this.vh, sc = this.sc;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = this.map.th.void; g.fillRect(0, 0, this.cv.width, this.cv.height);
    g.setTransform(sc, 0, 0, sc, Math.round(-cam.x * sc), Math.round(-cam.y * sc));
    const vis = (x, y, m = 80) => x > cam.x - m && x < cam.x + vw + m && y > cam.y - m && y < cam.y + vh + m;

    this.map.drawGround(g, cam, vw, vh, sc);
    this.map.drawDeco(g, cam, vw, vh, t);
    for (const z of f.zones) if (vis(z.x, z.y, z.r + (z.len || 0) + 60)) this.zoneGround(g, z, t);
    for (const p of f.pickups.values()) if (vis(p.x, p.y, 30)) this.pickup(g, p, t);

    // 依 Y 排序
    const list = [];
    for (const e of f.enemies) if (vis(e.x, e.y, 120)) list.push(e);
    for (const p of f.players) if (!(p.fl & 32)) { p._p = 1; list.push(p); }
    for (const s of f.summons) { const k = SUMMON_KINDS[s.k]; if (k !== 'wisp' && k !== 'drone') { s._s = 1; list.push(s); } }
    list.sort((a, b) => a.y - b.y);
    for (const o of list) { if (o._p) this.player(g, o, t, dt); else if (o._s) this.summon(g, o, t); else this.enemy(g, o, t); }
    for (const s of f.summons) { const k = SUMMON_KINDS[s.k]; if (k === 'wisp' || k === 'drone') this.summon(g, s, t); }

    // 子彈與光束
    const seen = this.lobs; for (const v of seen.values()) v.live = false;
    for (const p of f.projs) if (vis(p.x, p.y, 60)) this.proj(g, p, t);
    for (const [k, v] of seen) if (!v.live) seen.delete(k);
    for (const z of f.zones) if (z.len) this.beam(g, z, t);
    fx.draw(g);
    fx.drawSprites(g);
    this.map.drawOver(g, cam, vw, vh, t);

    // 光照
    this.lighting(f, cam, t);
    g.setTransform(sc, 0, 0, sc, Math.round(-cam.x * sc), Math.round(-cam.y * sc));
    for (const e of f.enemies) if (vis(e.x, e.y)) this.enemyOverlay(g, e, t);
    for (const p of f.players) if (!(p.fl & 32)) this.playerLabel(g, p, t);
    fx.drawTexts(g);
    for (const c of fx.casts) { const p = f.players.find((x) => x.id === c.id); if (!p) continue; const k = c.life / c.max; g.globalAlpha = Math.min(1, k * 3); g.font = `900 ${c.ult ? 17 : 13}px ${FONT}`; g.textAlign = 'center'; g.strokeStyle = 'rgba(5,6,10,.9)'; g.lineWidth = 4; g.strokeText(c.name, p.x, p.y - 96 - (1 - k) * 16); g.fillStyle = c.ult ? '#ffd23c' : '#9fe8ff'; g.fillText(c.name, p.x, p.y - 96 - (1 - k) * 16); g.globalAlpha = 1; }

    // 畫面座標：指引箭頭、橫幅
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (me) this.arrow(g, me, cam, t);
    this.banner(g);
  }

  // ───────── 角色 ─────────
  player(g, p, t, dt) {
    let a = this.anim.get(p.id);
    if (!a) { a = { atkN: p.atkN, atkT: 9, castN: p.castN, castT: 9 }; this.anim.set(p.id, a); }
    if (a.atkN !== p.atkN) { a.atkN = p.atkN; a.atkT = 0; }
    if (a.castN !== p.castN) { a.castN = p.castN; a.castT = 0; }
    a.atkT += dt; a.castT += dt;
    const info = this.roster.get(p.id) || { charId: 'tingge', slot: 0 }, col = SLOT_COLORS[info.slot % 4];
    const down = p.fl & 1, flip = p.face < 0;
    let aim = flip ? Math.PI - p.atkA : p.atkA;
    if (a.atkT > 0.5) aim = flip ? Math.PI - p.aim : p.aim;
    aim = Math.atan2(Math.sin(aim), Math.cos(aim));
    const dur = info.charId === 'tingge' ? 0.16 : info.charId === 'laoliu' ? 0.34 : info.charId === 'qiqiu' ? 0.3 : 0.24;
    // 影子與腳下光圈
    g.fillStyle = 'rgba(0,0,0,.38)'; g.beginPath(); g.ellipse(p.x, p.y, 15 - p.jz * 0.05, 6 - p.jz * 0.02, 0, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = down ? 0.35 : 0.75; g.beginPath(); g.ellipse(p.x, p.y, 19, 8, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
    if (p.buffs & BUFF_BITS.ult) { g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(p.x, p.y - 20, 4, p.x, p.y - 20, 60); gr.addColorStop(0, 'rgba(255,210,60,.38)'); gr.addColorStop(1, 'rgba(255,210,60,0)'); g.fillStyle = gr; g.fillRect(p.x - 60, p.y - 80, 120, 120); g.globalCompositeOperation = 'source-over'; }
    g.save(); g.translate(p.x, p.y - p.jz); g.scale(1.15, 1.15);
    if (p.buffs & BUFF_BITS.stealth) g.globalAlpha = 0.4;
    else if ((p.buffs & BUFF_BITS.invuln) && !down && Math.sin(t * 30) > 0.3) g.globalAlpha = 0.6;
    if (p.fl & 4) g.translate((Math.random() - 0.5) * 3, 0);
    drawChar(g, info.charId, { t: t + p.id * 1.7, moving: !!(p.fl & 2) && !down, atk: a.atkT < dur ? a.atkT / dur : 0, aim, down: !!down, flip, skin: p.skin });
    g.restore();
    if (p.shield > 0) { g.strokeStyle = 'rgba(160,220,255,.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(p.x, p.y - 26 - p.jz, 24, 34, 0, 0, TAU); g.stroke(); g.fillStyle = 'rgba(160,220,255,.08)'; g.fill(); }
    if (p.buffs & (BUFF_BITS.dmg | BUFF_BITS.haste)) { const c = p.buffs & BUFF_BITS.dmg ? '#ff7a5a' : '#ffe06b'; g.fillStyle = c; for (let i = 0; i < 3; i++) { const yy = ((t * 50 + i * 21 + p.id * 9) % 60); g.globalAlpha = 1 - yy / 60; g.fillRect(p.x - 16 + i * 14, p.y - 6 - yy, 2, 7); } g.globalAlpha = 1; }
  }
  playerLabel(g, p, t) {
    const info = this.roster.get(p.id) || { name: '?', slot: 0 }, col = SLOT_COLORS[info.slot % 4], down = p.fl & 1;
    const y = p.y - charHeight(info.charId) * 1.15 - 18 - p.jz * 0.5;
    g.font = `700 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.strokeStyle = 'rgba(5,6,10,.85)'; g.lineWidth = 3; g.strokeText(info.name, p.x, y); g.fillStyle = col; g.fillText(info.name, p.x, y);
    const w = 40, hp = clamp(p.hp / p.maxHp, 0, 1);
    g.fillStyle = 'rgba(5,6,10,.8)'; g.fillRect(p.x - w / 2 - 1, y + 3, w + 2, 6);
    g.fillStyle = hp > 0.5 ? '#5dff9d' : hp > 0.25 ? '#ffc53d' : '#ff5a6b'; g.fillRect(p.x - w / 2, y + 4, w * hp, 4);
    if (p.shield > 0) { g.fillStyle = '#a0dcff'; g.fillRect(p.x - w / 2, y + 4, w * clamp(p.shield / p.maxHp, 0, 1), 1.6); }
    if (down) {
      g.fillStyle = '#ff5a6b'; g.font = `900 13px ${FONT}`; g.strokeText('倒地・靠近救援', p.x, p.y - 44); g.fillText('倒地・靠近救援', p.x, p.y - 44);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y - 8, 26, 0, TAU); g.stroke();
      g.strokeStyle = '#5dff9d'; g.beginPath(); g.arc(p.x, p.y - 8, 26, -Math.PI / 2, -Math.PI / 2 + TAU * p.rev / 100); g.stroke();
    }
  }

  // ───────── 敵人 ─────────
  enemy(g, e, t) {
    const def = ENEMY_LIST[e.d], el = e.fl & 1, spawning = e.fl & 64;
    const sp = enemySprite(e.d, Math.floor(t * (def.boss ? 4 : 7) + e.id) & 3, !!(e.fl & 2)), sc = el ? 1.45 : 1;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(e.x, e.y, def.r * sc * 1.05, def.r * sc * 0.4, 0, 0, TAU); g.fill();
    if (el) { g.strokeStyle = '#ffb52f'; g.lineWidth = 2.5; g.globalAlpha = 0.6 + Math.sin(t * 6) * 0.25; g.beginPath(); g.ellipse(e.x, e.y, def.r * 2.1, def.r * 0.85, 0, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    if (e.fl & 128) { g.strokeStyle = '#ff5a6b'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(e.x, e.y, def.r * 1.5, def.r * 0.6, 0, 0, TAU); g.stroke(); }
    if (spawning) g.globalAlpha = 0.45;
    const fy = def.fly ? Math.sin(t * 4 + e.id) * 3 : 0;
    if (e.st === 2 && (def.ai === 'charger' || def.boss)) { g.globalAlpha = 0.3; g.drawImage(sp.c, e.x - sp.ox * sc - (e.fl & 32 ? -14 : 14), e.y - sp.oy * sc, sp.w * sc, sp.h * sc); g.globalAlpha = 1; }
    if (e.fl & 32) { g.save(); g.translate(e.x, e.y + fy); g.scale(-1, 1); g.drawImage(sp.c, -sp.ox * sc, -sp.oy * sc, sp.w * sc, sp.h * sc); g.restore(); }
    else g.drawImage(sp.c, e.x - sp.ox * sc, e.y + fy - sp.oy * sc, sp.w * sc, sp.h * sc);
    g.globalAlpha = 1;
    if (e.fl & 4) { g.fillStyle = 'rgba(140,210,255,.35)'; g.beginPath(); g.ellipse(e.x, e.y - 2, def.r * sc, def.r * sc * 0.4, 0, 0, TAU); g.fill(); }
    if (e.fl & 16) { g.fillStyle = '#9dff3c'; g.beginPath(); g.arc(e.x - def.r * 0.5, e.y - def.r * 2 - ((t * 20 + e.id) % 8), 1.8, 0, TAU); g.arc(e.x + def.r * 0.4, e.y - def.r * 1.6 - ((t * 20 + e.id * 3) % 8), 1.4, 0, TAU); g.fill(); }
  }
  enemyOverlay(g, e, t) {
    const def = ENEMY_LIST[e.d], el = e.fl & 1, top = e.y - def.r * (el ? 3.4 : 2.5) - 8;
    if (e.fl & 8) { g.fillStyle = '#ffe06b'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; g.beginPath(); g.arc(e.x + Math.cos(a) * 9, top + 6 + Math.sin(a) * 3, 2, 0, TAU); g.fill(); } }
    if (e.st === 1 && !def.structure) { g.font = '900 18px Arial'; g.textAlign = 'center'; g.fillStyle = '#ff3b3b'; g.strokeStyle = '#1a0505'; g.lineWidth = 3; g.strokeText('!', e.x, top + 4); g.fillText('!', e.x, top + 4); }
    if ((el || def.structure || def.hp >= 150) && !def.boss && e.hp < 0.999) {
      const w = el || def.structure ? 44 : 30;
      g.fillStyle = 'rgba(5,6,10,.8)'; g.fillRect(e.x - w / 2 - 1, top - 3, w + 2, 6);
      g.fillStyle = el ? '#ffb52f' : def.structure ? '#c84dff' : '#ff5a6b'; g.fillRect(e.x - w / 2, top - 2, w * e.hp, 4);
    }
  }

  // ───────── 召喚物 ─────────
  summon(g, s, t) {
    const k = SUMMON_KINDS[s.k];
    const sm = k !== 'wisp' && FXS[k];
    if (sm) {                                     // 圖片召喚物
      const size = { drone: 30, cat: 26, lion: 66, rat: 27, tank: 62 }[k], h = size * sm.height / sm.width, fly = k === 'drone';
      const bob = fly ? Math.sin(t * 5 + s.id) * 2 : s.st === 1 ? Math.abs(Math.sin(t * 14 + s.id)) * 3 : 0;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(s.x, s.y + (fly ? 46 : 0), size * 0.36, size * 0.13, 0, 0, TAU); g.fill();
      g.save(); g.translate(s.x, s.y - bob); g.scale(s.face < 0 ? -1 : 1, 1); if (s.st === 2) g.rotate(0.18);
      g.drawImage(sm, -size / 2, fly ? -h / 2 : -h, size, h); g.restore();
      return;
    }
    if (k === 'wisp') {
      if (!s.st) return;
      wisp(g, s.x, s.y, 8, s.st, t + s.id);
    } else if (k === 'drone') {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(s.x, s.y + 46, 9, 3.5, 0, 0, TAU); g.fill();
      const b = Math.sin(t * 5 + s.id) * 2;
      g.save(); g.translate(s.x, s.y + b);
      g.strokeStyle = '#8b93a3'; g.lineWidth = 2; g.beginPath(); g.moveTo(-11, -3); g.lineTo(11, -3); g.stroke();
      g.strokeStyle = 'rgba(200,230,255,.5)'; g.lineWidth = 1.5; for (const sx of [-11, 11]) { g.beginPath(); g.ellipse(sx, -5, 7 * Math.abs(Math.sin(t * 40 + s.id)), 1.5, 0, 0, TAU); g.stroke(); }
      g.fillStyle = '#20242d'; g.strokeStyle = '#596274'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(-7, -4, 14, 9, 3); g.fill(); g.stroke();
      g.fillStyle = '#2de2e6'; g.shadowColor = '#2de2e6'; g.shadowBlur = 8; g.beginPath(); g.arc(s.face * 3, 1, 2.2, 0, TAU); g.fill(); g.shadowBlur = 0;
      g.restore();
    } else {
      const big = k === 'lion', sc = big ? 2.3 : k === 'rat' ? 0.8 : 1;
      const body = big ? '#e0a23a' : k === 'rat' ? '#77736e' : ['#f0a24a', '#e9e4d8', '#3b3b42', '#c9c2b0'][s.id % 4];
      const run = s.st === 1 ? Math.sin(t * 22 + s.id) : 0, bite = s.st === 2;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(s.x, s.y, 10 * sc, 4 * sc, 0, 0, TAU); g.fill();
      g.save(); g.translate(s.x, s.y); g.scale(s.face * sc, sc);
      g.strokeStyle = body; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-8, -8); g.quadraticCurveTo(-15, -12, -13, -18 + run * 2); g.stroke();
      g.strokeStyle = '#0b0c10'; g.lineWidth = 2.2; for (const lx of [-5, 5]) { g.beginPath(); g.moveTo(lx, -4); g.lineTo(lx + run * 3 * (lx > 0 ? 1 : -1), 0); g.stroke(); }
      g.fillStyle = body; g.strokeStyle = '#0b0c10'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(0, -8, 9, 5.6, 0, 0, TAU); g.fill(); g.stroke();
      if (big) { g.fillStyle = '#8a4f1a'; g.beginPath(); g.arc(8, -13, 9.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = body; }
      g.beginPath(); g.arc(8 + (bite ? 2 : 0), -13, 5.6, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(4.5, -17); g.lineTo(5.5, -22); g.lineTo(8, -18); g.moveTo(9, -18); g.lineTo(11.5, -22); g.lineTo(12.5, -17); g.fill(); g.stroke();
      g.fillStyle = '#0b0c10'; g.beginPath(); g.arc(9.5, -13.5, 0.9, 0, TAU); g.arc(12.2, -13.5, 0.9, 0, TAU); g.fill();
      if (k === 'rat') { g.fillStyle = '#d98a8f'; g.beginPath(); g.arc(13.6, -12, 1, 0, TAU); g.fill(); }
      g.restore();
    }
  }

  // ───────── 掉落物 ─────────
  pickup(g, p, t) {
    const pk = FXS[p.type === 'g' ? (p.v >= 10 ? 'pk_g3' : p.v >= 3 ? 'pk_g2' : 'pk_g1') : 'pk_' + p.type];
    if (pk) {
      const size = p.type === 'g' ? (p.v >= 10 ? 24 : p.v >= 3 ? 19 : 15) : { c: 17, h: 26, k: 30, m: 26, x: 40 }[p.type] || 20;
      const bx = p.x, by = p.y - 6 + Math.sin(t * 4 + p.id) * 2, h = size * pk.height / pk.width;
      if (p.type === 'x') { g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, by - 90, 0, by); gr.addColorStop(0, 'rgba(255,210,60,0)'); gr.addColorStop(1, 'rgba(255,210,60,.35)'); g.fillStyle = gr; g.fillRect(bx - 12, by - 90, 24, 90); g.globalCompositeOperation = 'source-over'; }
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(p.x, p.y + 4, size * 0.36, size * 0.13, 0, 0, TAU); g.fill();
      g.drawImage(pk, bx - size / 2, by - h / 2, size, h);
      return;
    }
    const b = Math.sin(t * 4 + p.id) * 2, x = p.x, y = p.y - 6 + b;
    if (p.type === 'g') {
      const big = p.v >= 10, mid = p.v >= 3, s = big ? 7 : mid ? 5.5 : 4.2, col = big ? '#ffd23c' : mid ? '#9d8bff' : '#2de2e6';
      g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 8;
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.72, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.72, y); g.closePath(); g.fill(); g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * 0.3, y); g.lineTo(x, y - s * 0.2); g.closePath(); g.fill();
    } else if (p.type === 'c') {
      g.fillStyle = '#e2b53e'; g.strokeStyle = '#7a5a12'; g.lineWidth = 1.2; g.shadowColor = '#ffd23c'; g.shadowBlur = 6;
      g.beginPath(); g.ellipse(x, y, 5 * Math.abs(Math.cos(t * 3 + p.id)) + 1, 5.5, 0, 0, TAU); g.fill(); g.shadowBlur = 0; g.stroke();
    } else if (p.type === 'h') {
      g.fillStyle = '#f4f0e6'; g.strokeStyle = '#0b0c10'; g.lineWidth = 1.3; g.beginPath(); g.roundRect(x - 9, y - 7, 18, 14, 3); g.fill(); g.stroke();
      g.fillStyle = '#ff4d5e'; g.fillRect(x - 2, y - 5, 4, 10); g.fillRect(x - 5, y - 2, 10, 4);
    } else if (p.type === 'k') {
      g.strokeStyle = '#c9a56b'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y + 6); g.lineTo(x + 10, y - 8); g.stroke();
      for (let i = 0; i < 3; i++) { g.fillStyle = i === 1 ? '#6fbf4a' : '#b5562a'; g.strokeStyle = '#3a1a0a'; g.lineWidth = 1; g.beginPath(); g.roundRect(x - 6 + i * 5, y + 1 - i * 3.6, 5.5, 5.5, 1.5); g.fill(); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 10); g.quadraticCurveTo(x + 3, y - 14, x, y - 18 - b); g.stroke();
    } else if (p.type === 'm') {
      g.strokeStyle = '#ff4d5e'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, 7, Math.PI, 0); g.stroke();
      g.fillStyle = '#e8e8ee'; g.fillRect(x - 9.5, y, 5, 5); g.fillRect(x + 4.5, y, 5, 5);
    } else if (p.type === 'x') {
      g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, y - 90, 0, y); gr.addColorStop(0, 'rgba(255,210,60,0)'); gr.addColorStop(1, 'rgba(255,210,60,.35)'); g.fillStyle = gr; g.fillRect(x - 12, y - 90, 24, 90); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#7a4a22'; g.strokeStyle = '#1a0f06'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 14, y - 10, 28, 18, 3); g.fill(); g.stroke();
      g.fillStyle = '#9a6230'; g.beginPath(); g.roundRect(x - 14, y - 15, 28, 9, [6, 6, 0, 0]); g.fill(); g.stroke();
      g.fillStyle = '#e2b53e'; g.fillRect(x - 14, y - 7, 28, 2.5); g.fillRect(x - 3, y - 9, 6, 7);
    }
  }

  // ───────── 地面區域效果 ─────────
  zoneGround(g, z, t) {
    const k = ZONE_KINDS[z.k], { x, y, r } = z;
    switch (k) {
      case 'crack': if (FXS.crack) { const pop = Math.min(1, z.p * 22); disc(g, FXS.crack, x, y, r * (0.5 + 0.5 * pop), z.id, Math.min(0.9, (1 - z.p) * 2.2)); } break;
      case 'zero': {                                  // 歸零：駭客 HUD 圈 + 大倒數
        const fade = Math.min(1, z.p * 10, (1 - z.p) * 8), n = Math.max(0, 3 - Math.floor(z.p * 3.2 / 1.0667));
        if (FXS.zerogrid) { disc(g, FXS.zerogrid, x, y, 330, t * 0.7, fade * 0.8); disc(g, FXS.zerogrid, x, y, r, -t * 0.25, fade * 0.3); }
        const pulse = 1 + ((z.p * 3) % 1 < 0.15 ? 0.3 : 0);
        g.font = `900 ${Math.round(120 * pulse)}px "Courier New", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = fade;
        for (const [ox, c] of [[-4, '#ff2d86'], [4, '#2de2e6'], [0, '#eafcff']]) { g.fillStyle = c; g.fillText(String(n), x + ox * (Math.sin(t * 40) > 0 ? 1 : 0.3), y - 150); }
        g.globalAlpha = 1; break;
      }
      case 'decoy': {                              // 誘餌：吸引範圍圈 + 鈔票堆
        g.strokeStyle = 'rgba(255,215,107,.55)'; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, t * 0.6, t * 0.6 + TAU); g.stroke(); g.setLineDash([]);
        g.fillStyle = `rgba(255,215,107,${0.05 + 0.05 * Math.sin(t * 6)})`; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill();
        const dim = FXS.decoy || FXS.pk_c, dw = 34 + Math.sin(t * 8) * 2;
        if (dim) { const dh = dw * dim.height / dim.width; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 4, 15, 5, 0, 0, TAU); g.fill(); g.drawImage(dim, x - dw / 2, y - dh + 8, dw, dh); }
        if (z.p > 0.75) { g.strokeStyle = '#ff5a6b'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 6, 22 * (1 - (z.p - 0.75) * 4) + 6, 0, TAU); g.stroke(); }
        break;
      }
      case 'aura': {                               // 增幅光環
        g.fillStyle = 'rgba(255,138,47,.06)'; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,170,80,.6)'; g.lineWidth = 2; g.setLineDash([14, 10]); g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, -t * 0.5, -t * 0.5 + TAU); g.stroke(); g.setLineDash([]);
        break;
      }
      case 'mine': if (FXS.mine) {
        const mw = 21, mh = mw * FXS.mine.height / FXS.mine.width;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 3, 10, 4, 0, 0, TAU); g.fill();
        g.drawImage(FXS.mine, x - mw / 2, y - mh / 2 - 1, mw, mh);
        if (z.p > 0.02 && Math.sin(t * 10 + z.id) > 0) { g.fillStyle = '#b9fffb'; g.beginPath(); g.arc(x, y - 2, 1.8, 0, TAU); g.fill(); }
        break;
      }
      // eslint-disable-next-line no-fallthrough
      case 'mine_old': {
        const armed = z.p > 0.02;
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 2, 9, 4, 0, 0, TAU); g.fill();
        g.fillStyle = '#1f3a2f'; g.strokeStyle = '#07080c'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, 8, 5.5, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#2d5a48'; g.beginPath(); g.ellipse(x, y - 1.5, 5, 3, 0, 0, TAU); g.fill();
        const on = armed && Math.sin(t * 10 + z.id) > 0;
        g.fillStyle = on ? '#5cf0ee' : '#1b6f6e'; if (on) { g.shadowColor = '#5cf0ee'; g.shadowBlur = 8; } g.beginPath(); g.arc(x, y - 2, 1.8, 0, TAU); g.fill(); g.shadowBlur = 0;
        break;
      }
      case 'rune': case 'runebig': case 'seal': if (FXS.circle) {
        const im = FXS.circle, al = z.on ? 0.95 * (1 - Math.max(0, z.p - 0.8) * 5) : z.dp * 0.5;
        g.save(); g.translate(x, y); g.scale(1, 0.86); g.globalAlpha = Math.max(0, al) * 0.16; g.fillStyle = '#e0142d'; g.beginPath(); g.arc(0, 0, r * (z.on ? 1 : z.dp), 0, TAU); g.fill();
        g.globalAlpha = Math.max(0, al) * (r > 300 ? 0.4 : 1); g.rotate((t * (k === 'seal' ? 0.25 : 0.6) + z.id) % TAU); g.drawImage(im, -r, -r, r * 2, r * 2); g.restore(); break;
      } magicCircle(g, x, y, r, t * (k === 'seal' ? 0.5 : 1.2) + z.id, k === 'seal' ? '#ff3d6e' : '#2de2e6', z.on ? 0.8 * (1 - Math.max(0, z.p - 0.8) * 5) : z.dp * 0.5, k !== 'rune'); break;
      case 'blackhole': if (FXS.blackhole) {             // 黑洞：旋轉的吸積盤 + 被吸進去的數字
        const fade = Math.min(1, z.p * 10, (1 - z.p) * 6);
        disc(g, FXS.blackhole, x, y, r * 1.15, t * 2.6 + z.id, fade);
        g.font = '900 13px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let i = 0; i < 14; i++) { const k2 = (t * 0.55 + i / 14) % 1, a = i * 2.4 + t * 2.2 + k2 * 5, d = r * (1.05 - k2); g.globalAlpha = fade * Math.min(1, k2 * 4) * (1 - k2 * 0.5); g.fillStyle = i % 3 ? '#7dffb0' : '#eafff4'; g.fillText(String((i * 7 + z.id) % 10), x + Math.cos(a) * d, y + Math.sin(a) * d * 0.86); }
        g.globalAlpha = 1; break;
      }
      // eslint-disable-next-line no-fallthrough
      case 'blackhole_old': {
        const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.35, 'rgba(30,8,60,.75)'); gr.addColorStop(1, 'rgba(120,60,255,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill();
        g.strokeStyle = '#b56bff'; g.lineWidth = 2.5; for (let i = 0; i < 3; i++) { g.globalAlpha = 0.7 - i * 0.2; g.beginPath(); g.ellipse(x, y, r * (0.3 + i * 0.22), r * (0.3 + i * 0.22) * 0.86, 0, t * (5 - i) + i, t * (5 - i) + i + 4); g.stroke(); } g.globalAlpha = 1;
        break;
      }
      case 'fire': case 'grill': case 'dragonfire': if (FXS.flame) {   // 火焰區域：燃燒的地面 + 一簇簇火焰
        const fade = Math.min(1, z.p * 12, (1 - z.p) * 6), gnd = k === 'grill' ? FXS.coalground || FXS.fireground : FXS.fireground;
        if (gnd) disc(g, gnd, x, y, r, z.id * 1.7, fade * (r > 300 ? 0.55 : 0.85));
        if (k === 'dragonfire' && FXS.dragonring) disc(g, FXS.dragonring, x, y, r * 0.98, -t * (r > 300 ? 0.9 : 1.5) + z.id, fade * (r > 300 ? 0.8 : 1));
        const fl = FXS.flame, cw = fl.width / 4, n = Math.max(4, Math.min(r > 300 ? 16 : 20, Math.round(r / 13)));
        for (let i = 0; i < n; i++) {
          const a = i * 2.39996 + z.id, d = r * 0.86 * Math.sqrt((i + 0.5) / n), fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d * 0.86;
          const sz = (24 + (i * 37 % 16)) * (r > 300 ? 1.25 : 1) * fade, fh = sz * fl.height / cw;
          g.drawImage(fl, ((Math.floor(t * 9) + i) & 3) * cw, 0, cw, fl.height, fx - sz / 2, fy - fh * 0.9, sz, fh);
        }
        if (k === 'grill') { g.fillStyle = '#2a2d35'; g.strokeStyle = '#07080c'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 18, y - 14, 36, 12, 3); g.fill(); g.stroke(); g.strokeStyle = 'rgba(93,255,157,.6)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, t, t + TAU); g.stroke(); g.setLineDash([]); }
        if (k === 'dragonfire') { g.strokeStyle = 'rgba(255,170,80,.6)'; g.lineWidth = 2; g.setLineDash([12, 8]); g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, -t, -t + TAU); g.stroke(); g.setLineDash([]); }
        break;
      }
      // eslint-disable-next-line no-fallthrough
      case 'fire_old': case 'grill_old': {
        const gr = g.createRadialGradient(x, y, 0, x, y, r); const fa = r > 250 ? 0.4 : 1; gr.addColorStop(0, `rgba(255,140,40,${0.34 * fa})`); gr.addColorStop(0.7, `rgba(255,80,20,${0.2 * fa})`); gr.addColorStop(1, 'rgba(255,60,10,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter';
        const n = Math.min(r > 250 ? 16 : 26, Math.round(r / 9));
        for (let i = 0; i < n; i++) { const a = i * 2.4 + z.id, d = r * 0.85 * Math.sqrt(((i * 37) % 100) / 100), fl = (t * 1.6 + i * 0.37) % 1; g.fillStyle = `rgba(255,${150 - fl * 90},40,${0.5 * (1 - fl)})`; g.beginPath(); g.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.86 - fl * 24, 6 * (1 - fl) + 2, 9 * (1 - fl) + 2, 0, 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'source-over';
        if (k === 'grill') { g.fillStyle = '#2a2d35'; g.strokeStyle = '#07080c'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - 18, y - 14, 36, 12, 3); g.fill(); g.stroke(); g.strokeStyle = '#59606e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 13, y - 2); g.lineTo(x - 16, y + 10); g.moveTo(x + 13, y - 2); g.lineTo(x + 16, y + 10); g.stroke(); g.strokeStyle = 'rgba(93,255,157,.55)'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, t, t + TAU); g.stroke(); g.setLineDash([]); }
        break;
      }
      case 'heal': { g.fillStyle = 'rgba(93,255,157,.12)'; g.strokeStyle = 'rgba(93,255,157,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill(); g.setLineDash([10, 8]); g.stroke(); g.setLineDash([]); g.fillStyle = '#5dff9d'; for (let i = 0; i < 6; i++) { const a = i * 1.05 + t * 0.6, yy = (t * 30 + i * 13) % 40; g.globalAlpha = 1 - yy / 40; g.fillRect(x + Math.cos(a) * r * 0.6 - 1, y + Math.sin(a) * r * 0.5 - yy - 4, 2, 8); g.fillRect(x + Math.cos(a) * r * 0.6 - 4, y + Math.sin(a) * r * 0.5 - yy - 1, 8, 2); } g.globalAlpha = 1; break; }
      case 'garbage': if (FXS.garbageground) { disc(g, FXS.garbageground, x, y, r * 1.05, t * 0.5, Math.min(1, z.p * 10, (1 - z.p) * 6) * 0.92); break; }
      // eslint-disable-next-line no-fallthrough
      case 'garbage_old': { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,140,50,.34)'); gr.addColorStop(0.8, 'rgba(70,90,40,.24)'); gr.addColorStop(1, 'rgba(60,80,30,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill(); for (let i = 0; i < 16; i++) { const a = i * 2.4 + t * 0.4, d = r * 0.9 * (((i * 53) % 100) / 100); g.fillStyle = ['#1d1f25', '#8a6a44', '#c9c2a8', '#9dff3c'][i % 4]; g.globalAlpha = 0.7; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.86 + Math.sin(t * 3 + i) * 3, 7, 5); } g.globalAlpha = 1; break; }
      case 'whirl': { const wim = z.aux ? tinted('whirl', '#dfe8f5') : FXS.whirl; if (wim) { g.save(); g.translate(x, y - 14); g.scale(1, 0.8); g.rotate(t * 13); g.globalAlpha = Math.min(1, z.p * 14, (1 - z.p) * 8) * (z.aux ? 0.7 : 0.95); g.drawImage(wim, -r, -r, r * 2, r * 2); g.rotate(-t * 22); g.globalAlpha *= 0.35; g.drawImage(wim, -r * 0.62, -r * 0.62, r * 1.24, r * 1.24); g.restore(); g.globalAlpha = 1; break; } }
      // eslint-disable-next-line no-fallthrough
      case 'whirl_old': { g.globalCompositeOperation = 'lighter'; g.strokeStyle = z.aux ? '#dfe8f5' : '#ffd0a0'; g.lineWidth = z.aux ? 3 : 7; for (let i = 0; i < 4; i++) { g.globalAlpha = 0.5; g.beginPath(); g.ellipse(x, y - 14, r * (0.55 + (i % 2) * 0.35), r * (0.55 + (i % 2) * 0.35) * 0.8, 0, t * 14 + i * 1.57, t * 14 + i * 1.57 + 1.1); g.stroke(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break; }
      case 'bell': if (FXS.mandala) {                  // 萬佛朝宗：金色蓮花法陣展開，巨掌從天而降
        const R = 400, grow = Math.min(1, z.p * 3.2), ease = 1 - (1 - grow) * (1 - grow), fade = Math.min(1, (1 - z.p) * 3);
        disc(g, FXS.mandala, x, y, R * ease, t * 0.5, fade);
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffd76b'; g.lineWidth = 6; g.globalAlpha = fade * 0.5;
        const rr = r * Math.min(1, z.p * 1.6); g.beginPath(); g.ellipse(x, y, rr, rr * 0.86, 0, 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over';
        if (FXS.palm && z.p < 0.6) { const k2 = Math.min(1, z.p / 0.22), sz = 250 * (1.7 - 0.7 * k2), ph = sz * FXS.palm.height / FXS.palm.width; g.globalAlpha = Math.min(1, k2 * 1.5) * Math.min(1, (0.6 - z.p) * 6); g.drawImage(FXS.palm, x - sz / 2, y - ph / 2 - 30 - (1 - k2) * 220, sz, ph); }
        g.globalAlpha = 1; break;
      }
      // eslint-disable-next-line no-fallthrough
      case 'bell_old': { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const rr = r * Math.min(1, z.p * 1.3 + i * 0.12); g.strokeStyle = '#ffd76b'; g.globalAlpha = (1 - z.p) * 0.6; g.lineWidth = 10 - i * 3; g.beginPath(); g.ellipse(x, y, rr, rr * 0.86, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break; }
      case 'mark': case 'airstrike': {
        const col = k === 'mark' ? '#ff5a6b' : '#ffb52f', pu = k === 'airstrike' ? z.dp : 1;
        if (k === 'airstrike' && z.on) break;
        g.strokeStyle = col; g.lineWidth = 2; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.stroke();
        g.fillStyle = col; g.globalAlpha = 0.12 + 0.18 * pu; g.beginPath(); g.ellipse(x, y, r * pu, r * pu * 0.86, 0, 0, TAU); g.fill();
        g.globalAlpha = 0.8; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r * 0.7, y); g.moveTo(x + r, y); g.lineTo(x + r * 0.7, y); g.moveTo(x, y - r * 0.86); g.lineTo(x, y - r * 0.6); g.moveTo(x, y + r * 0.86); g.lineTo(x, y + r * 0.6); g.stroke(); g.globalAlpha = 1;
        break;
      }
      case 'e_warn': case 'e_slam': {
        const col = k === 'e_warn' ? '255,60,60' : '255,197,61';
        g.fillStyle = `rgba(${col},.14)`; g.strokeStyle = `rgba(${col},.85)`; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(x, y, r, r * 0.86, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = `rgba(${col},.30)`; g.beginPath(); g.ellipse(x, y, r * z.dp, r * z.dp * 0.86, 0, 0, TAU); g.fill();
        break;
      }
    }
  }
  beam(g, z, t) {
    const k = ZONE_KINDS[z.k], ca = Math.cos(z.a), sa = Math.sin(z.a);
    if (k === 'e_beam') {
      g.save(); g.translate(z.x, z.y); g.rotate(z.a);
      if (!z.on) { g.fillStyle = 'rgba(255,60,60,.13)'; g.fillRect(0, -z.w / 2, z.len, z.w); g.strokeStyle = 'rgba(255,60,60,.8)'; g.lineWidth = 1.5; g.setLineDash([10, 8]); g.strokeRect(0, -z.w / 2, z.len, z.w); g.setLineDash([]); g.fillStyle = 'rgba(255,60,60,.35)'; g.fillRect(0, -z.w / 2 * z.dp, z.len, z.w * z.dp); }
      else { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,50,80,.6)'; g.fillRect(0, -z.w / 2, z.len, z.w); g.fillStyle = '#ffe0e6'; g.fillRect(0, -z.w / 6, z.len, z.w / 3); }
      g.restore(); g.globalCompositeOperation = 'source-over';
      return;
    }
    const big = z.aux === 1, fl = 0.85 + Math.sin(t * 50) * 0.15;
    g.save(); g.translate(z.x, z.y); g.rotate(z.a); g.globalCompositeOperation = 'lighter';
    const fade = Math.min(1, (1 - z.p) * 6, z.p * 30 + 0.3);
    const gw = z.w * (big ? 0.7 : 0.9);
    const gr = g.createLinearGradient(0, -gw, 0, gw);
    if (big) { gr.addColorStop(0, 'rgba(160,80,255,0)'); gr.addColorStop(0.25, 'rgba(150,90,255,.4)'); gr.addColorStop(0.4, 'rgba(60,230,230,.6)'); gr.addColorStop(0.5, 'rgba(235,255,255,.9)'); gr.addColorStop(0.6, 'rgba(110,255,170,.6)'); gr.addColorStop(0.75, 'rgba(60,230,230,.4)'); gr.addColorStop(1, 'rgba(160,80,255,0)'); }
    else { gr.addColorStop(0, 'rgba(45,226,230,0)'); gr.addColorStop(0.35, 'rgba(45,226,230,.6)'); gr.addColorStop(0.5, 'rgba(240,255,255,.95)'); gr.addColorStop(0.65, 'rgba(45,226,230,.6)'); gr.addColorStop(1, 'rgba(45,226,230,0)'); }
    const hw = z.w * (big ? 0.7 : 0.9) * fl;
    g.globalAlpha = fade * (big ? 0.85 : 1); g.fillStyle = gr; g.fillRect(0, -hw, z.len, hw * 2);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0, 0, Math.min(26, z.w * 0.6) * fl, 0, TAU); g.fill();
    g.restore(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    this.fx.light(z.x + ca * z.len * 0.5, z.y + sa * z.len * 0.5, z.len * 0.6, 0.05);
    if (Math.random() < 0.5) this.fx.spark(z.x + ca * z.len * Math.random(), z.y + sa * z.len * Math.random(), 1, big ? '#b9fffb' : '#2de2e6', 80, 0.3, 2.5);
  }

  // ───────── 子彈 ─────────
  proj(g, p, t) {
    const k = PROJ_KINDS[p.k];
    let x = p.x, y = p.y;
    if (k === 'grenade' || k === 'molotov' || (p.aux > 0 && (k === 'missile' || k === 'baseball'))) {       // 拋物線
      let lb = this.lobs.get(p.id);
      if (!lb) { lb = { t0: t }; this.lobs.set(p.id, lb); }
      lb.live = true;
      const pr = clamp((t - lb.t0) / Math.max(0.1, p.aux / 100), 0, 1);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 6, 3, 0, 0, TAU); g.fill();
      y -= Math.sin(pr * Math.PI) * 70 + (k === 'baseball' ? (1 - pr) * 300 : 0);
    }
    g.save(); g.translate(x, y);
    const sp = PSPR[k], sim = sp && (sp[3] ? tinted(sp[0], sp[3]) : FXS[sp[0]]);
    if (sim) {                                    // 圖片子彈
      const w = sp[1], h = w * sim.height / sim.width;
      g.rotate(sp[2] === 'spin' ? t * 14 + p.id : sp[2] === 'aim' ? p.a : 0);
      g.drawImage(sim, -w / 2, -h / 2, w, h); g.restore(); return;
    }
    switch (k) {
      case 'gatling': case 'bullet': case 'pistol': case 'dronebolt': case 'revolver': {
        const len = k === 'revolver' ? 26 : k === 'gatling' ? 16 : 12, col = k === 'pistol' ? '#bff4ff' : k === 'dronebolt' ? '#2de2e6' : '#ffe69a';
        g.rotate(p.a); g.globalCompositeOperation = 'lighter';
        g.strokeStyle = col; g.lineWidth = k === 'revolver' ? 4 : 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, 0); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-len * 0.4, 0); g.lineTo(0, 0); g.stroke();
        break;
      }
      case 'knife': case 'cleaver': case 'blade': {
        g.rotate(k === 'knife' ? p.a : t * 18 + p.id);
        if (k === 'cleaver') { g.fillStyle = '#4a2c19'; g.fillRect(-9, -1.5, 7, 3); g.fillStyle = '#c7ccd4'; g.strokeStyle = '#3a3f49'; g.lineWidth = 1; g.beginPath(); g.roundRect(-2, -6, 12, 9, 1.5); g.fill(); g.stroke(); }
        else { g.fillStyle = '#e6ebf2'; g.strokeStyle = '#3a3f49'; g.lineWidth = 1; g.beginPath(); g.moveTo(11, 0); g.lineTo(-2, -3.2); g.lineTo(-2, 3.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#2a2d35'; g.fillRect(-8, -1.6, 6, 3.2); }
        break;
      }
      case 'rune': rune(g, 0, 0, 5, t + p.id, 1); break;
      case 'wisp': wisp(g, 0, 0, 9, p.aux, t + p.id); break;
      case 'syringe': g.rotate(p.a); g.fillStyle = '#e9eef2'; g.strokeStyle = '#2a2d35'; g.lineWidth = 1; g.beginPath(); g.roundRect(-9, -2.6, 12, 5.2, 1.5); g.fill(); g.stroke(); g.fillStyle = '#7dff6b'; g.fillRect(-6, -1.4, 7, 2.8); g.strokeStyle = '#cfd6de'; g.beginPath(); g.moveTo(3, 0); g.lineTo(10, 0); g.stroke(); g.fillStyle = '#ff5a8a'; g.fillRect(-12, -3.4, 3, 6.8); break;
      case 'skewer': g.rotate(p.a); g.strokeStyle = '#c9a56b'; g.lineWidth = 2; g.beginPath(); g.moveTo(-16, 0); g.lineTo(18, 0); g.stroke(); for (let i = 0; i < 3; i++) { g.fillStyle = i === 1 ? '#6fbf4a' : '#b5562a'; g.strokeStyle = '#3a1a0a'; g.lineWidth = 1; g.beginPath(); g.roundRect(-6 + i * 7, -3.4, 6, 6.8, 1.6); g.fill(); g.stroke(); } break;
      case 'bead': g.fillStyle = '#8a5a2a'; g.strokeStyle = '#2a1a08'; g.lineWidth = 1.2; g.shadowColor = '#ffd76b'; g.shadowBlur = 10; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.shadowBlur = 0; g.stroke(); g.fillStyle = 'rgba(255,230,170,.8)'; g.beginPath(); g.arc(-2, -2, 2, 0, TAU); g.fill(); break;
      case 'wave': { const wv = tinted('slash', '#7fd8ff'); if (wv) { const hh = 62, ww = hh * wv.width / wv.height; g.rotate(p.a); g.globalAlpha = 0.92; g.drawImage(wv, 14 - ww, -hh / 2, ww, hh); g.globalAlpha = 1; break; } }
      // eslint-disable-next-line no-fallthrough
      case 'wave_old': g.rotate(p.a); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#bfe0ff'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(-22, 0, 34, -0.9, 0.9); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(-22, 0, 36, -0.8, 0.8); g.stroke(); break;
      case 'baseball': g.fillStyle = '#f6f3ea'; g.strokeStyle = '#2a2d35'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = '#d23a3a'; g.beginPath(); g.arc(-4, 0, 5, -0.7, 0.7); g.stroke(); break;
      case 'laserbolt': g.globalCompositeOperation = 'lighter'; for (const [r, c] of [[20, 'rgba(45,226,230,.35)'], [13, 'rgba(120,255,250,.7)'], [7, '#fff']]) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, r + Math.sin(t * 40) * 1.5, 0, TAU); g.fill(); } break;
      case 'missile': g.rotate(p.a); g.fillStyle = '#d9dde3'; g.strokeStyle = '#2a2d35'; g.lineWidth = 1; g.beginPath(); g.roundRect(-8, -2.6, 14, 5.2, 2); g.fill(); g.stroke(); g.fillStyle = '#ff4d5e'; g.beginPath(); g.moveTo(6, -2.6); g.lineTo(11, 0); g.lineTo(6, 2.6); g.fill(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffb347'; g.beginPath(); g.ellipse(-12, 0, 5 + Math.random() * 3, 2.5, 0, 0, TAU); g.fill(); break;
      case 'molotov': g.rotate(t * 12); g.fillStyle = '#6b3a1a'; g.strokeStyle = '#1a0f06'; g.lineWidth = 1; g.beginPath(); g.roundRect(-3.5, -6, 7, 12, 2); g.fill(); g.stroke(); g.fillStyle = '#ffb347'; g.beginPath(); g.arc(0, -9, 3, 0, TAU); g.fill(); break;
      case 'grenade': g.rotate(t * 10); g.fillStyle = '#243a30'; g.strokeStyle = '#07080c'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 5.5, 6.5, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#5cf0ee'; g.fillRect(-1.5, -9, 3, 3); break;
      default: {            // 敵方彈幕
        const col = { e_can: '#ff5a5a', e_spore: '#9dff3c', e_orb: '#ff2d86', e_laser: '#ff3b3b', e_trash: '#b08a4a', e_chain: '#c9ced8' }[k] || '#ff5a5a';
        if (k === 'e_laser') { g.rotate(p.a); g.globalCompositeOperation = 'lighter'; g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(0, 0); g.stroke(); break; }
        g.fillStyle = 'rgba(8,4,6,.75)'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
        g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 10; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.shadowBlur = 0;
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
      }
    }
    g.restore(); g.globalCompositeOperation = 'source-over';
  }

  // ───────── 光照層 ─────────
  lighting(f, cam, t) {
    const lg = this.lg, k = this.sc / 3, th = this.map.th, vw = this.vw, vh = this.vh;
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, this.lc.width, this.lc.height);
    lg.fillStyle = th.ambient; lg.fillRect(0, 0, this.lc.width, this.lc.height);
    lg.globalCompositeOperation = 'destination-out';
    lg.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
    const hole = (x, y, r, a = 1) => { if (x < cam.x - r || x > cam.x + vw + r || y < cam.y - r || y > cam.y + vh + r) return; const gr = lg.createRadialGradient(x, y, r * 0.15, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(x - r, y - r, r * 2, r * 2); };
    for (const p of f.players) if (!(p.fl & 32)) hole(p.x, p.y - 20, p.id === this.myId ? 430 : 330, 1);
    for (const l of this.L.lights) { if (l.gate !== undefined && this.L.links[l.gate].open) continue; hole(l.x, l.y, l.r, 0.75 + Math.sin(t * 2 + l.v) * 0.06); }
    for (const l of this.fx.lights) hole(l.x, l.y, l.r, l.life / l.max);
    let n = 0;
    for (const p of f.projs) { if (n++ > 70) break; hole(p.x, p.y, p.tm ? 60 : 44, 0.55); }
    for (const z of f.zones) { const kk = ZONE_KINDS[z.k]; if (kk === 'fire' || kk === 'grill' || kk === 'dragonfire' || kk === 'rune' || kk === 'runebig' || kk === 'seal' || kk === 'heal' || kk === 'e_warn') hole(z.x, z.y, z.r * 1.5, 0.6); }
    for (const p of f.pickups.values()) if (p.type === 'x') hole(p.x, p.y, 110, 0.7);
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.lc, 0, 0, this.cv.width, this.cv.height);
    // 燈具的有色光暈
    g.setTransform(this.sc, 0, 0, this.sc, Math.round(-cam.x * this.sc), Math.round(-cam.y * this.sc));
    g.globalCompositeOperation = 'lighter';
    for (const l of this.L.lights) {
      if (l.x < cam.x - 200 || l.x > cam.x + vw + 200 || l.y < cam.y - 200 || l.y > cam.y + vh + 200) continue;
      if (l.gate !== undefined && this.L.links[l.gate].open) continue;
      const col = l.gate !== undefined ? th.gate : th.neon[l.v % th.neon.length];
      const gr = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8); gr.addColorStop(0, col + '2e'); gr.addColorStop(1, col + '00');
      g.fillStyle = gr; g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    g.globalCompositeOperation = 'source-over';
  }

  // ───────── 指引箭頭 / 橫幅 ─────────
  arrow(g, me, cam, t) {
    const L = this.L, zi = zoneAt(L, me.x, me.y);
    if (zi >= 0 && L.zones[zi].state === 'active') return;
    let best = null, bd = Infinity;
    for (const pass of ['active', 'open']) {
      for (const z of L.zones) { if (z.state !== pass || (pass === 'open' && z.kind === 'treasure' && L.zones.some((o) => o.state === 'open' && o.kind !== 'treasure'))) continue; const d = Math.hypot(z.cx - me.x, z.cy - me.y); if (d < bd) { bd = d; best = z; } }
      if (best) break;
    }
    if (!best) return;
    // 找通往該區域且已開啟的閘門當作中繼點
    let tx = best.cx, ty = best.cy;
    const link = L.links.find((l) => l.open && ((l.a === best.idx && (zi === l.b || zi < 0)) || (l.b === best.idx && (zi === l.a || zi < 0))));
    if (link && zi >= 0) { tx = link.x; ty = link.y; }
    const a = Math.atan2(ty - me.y, tx - me.x), w = this.cv.width, h = this.cv.height, dpr = w / (this.cv.clientWidth || w);
    const R = Math.min(w, h) * 0.3, x = w / 2 + Math.cos(a) * R, y = h / 2 + Math.sin(a) * R * 0.8, pu = 1 + Math.sin(t * 6) * 0.12;
    g.save(); g.translate(x, y); g.rotate(a); g.scale(dpr * pu, dpr * pu);
    g.fillStyle = '#ffd23c'; g.strokeStyle = 'rgba(5,6,10,.85)'; g.lineWidth = 3; g.shadowColor = '#ffd23c'; g.shadowBlur = 12;
    g.beginPath(); g.moveTo(20, 0); g.lineTo(-6, -13); g.lineTo(0, 0); g.lineTo(-6, 13); g.closePath(); g.stroke(); g.fill();
    g.restore();
    g.font = `700 ${12 * dpr}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#ffd23c'; g.strokeStyle = 'rgba(5,6,10,.85)'; g.lineWidth = 3;
    const label = best.state === 'active' ? '目標區域' : best.kind === 'treasure' ? '寶藏室' : best.kind === 'final' ? '最終區域' : '下一區';
    g.strokeText(label, x, y + 30 * dpr); g.fillText(label, x, y + 30 * dpr);
  }
  banner(g) {
    const b = this.fx.banner;
    if (!b) return;
    const w = this.cv.width, h = this.cv.height, dpr = w / (this.cv.clientWidth || w), k = b.life / b.max, al = Math.min(1, (1 - k) * 6, k * 4);
    const col = ['#2de2e6', '#ffd23c', '#ff5a6b', '#ff3b3b'][b.st] || '#fff', y = h * 0.24;
    g.globalAlpha = al * 0.75; const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(5,6,10,0)'); gr.addColorStop(0.5, 'rgba(5,6,10,.9)'); gr.addColorStop(1, 'rgba(5,6,10,0)'); g.fillStyle = gr; g.fillRect(0, y - 44 * dpr, w, 88 * dpr);
    g.globalAlpha = al; g.fillStyle = col; g.fillRect(w * 0.3, y - 44 * dpr, w * 0.4, 1.5 * dpr); g.fillRect(w * 0.3, y + 43 * dpr, w * 0.4, 1.5 * dpr);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${34 * dpr}px "Noto Serif TC", "Songti TC", "PMingLiU", ${FONT}`; g.shadowColor = col; g.shadowBlur = 18 * dpr; g.fillStyle = '#fff'; g.fillText(b.title, w / 2 + (1 - Math.min(1, (1 - k) * 5)) * 60, y - 6 * dpr);
    g.shadowBlur = 0; g.font = `700 ${12 * dpr}px Arial`; g.fillStyle = col; g.fillText(b.sub.split('').join(' '), w / 2, y + 26 * dpr);
    g.globalAlpha = 1; g.textBaseline = 'alphabetic';
  }
}

// 把圓形俯視素材畫成地面上的圓盤（壓扁 0.86、可旋轉）
function disc(g, im, x, y, r, rot, alpha) {
  if (alpha <= 0) return;
  g.save(); g.translate(x, y); g.scale(1, 0.86); g.rotate(rot); g.globalAlpha = Math.min(1, alpha); g.drawImage(im, -r, -r, r * 2, r * 2); g.restore(); g.globalAlpha = 1;
}
function magicCircle(g, x, y, r, t, col, alpha, big) {
  g.save(); g.translate(x, y); g.scale(1, 0.86); g.globalAlpha = Math.max(0, alpha);
  g.fillStyle = col + (r > 300 ? '0c' : '1c'); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 12; g.lineWidth = 2.2;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.stroke();
  g.rotate(t * 0.6);
  for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 3; i++) { const a = k * Math.PI + i * TAU / 3; g.lineTo(Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84); } g.closePath(); g.stroke(); }
  g.beginPath(); g.arc(0, 0, r * 0.42, 0, TAU); g.stroke();
  g.rotate(-t * 1.4);
  const n = big ? 12 : 8;
  for (let i = 0; i < n; i++) { const a = i * TAU / n; g.save(); g.translate(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); g.rotate(a + 1.57); g.fillStyle = col; g.fillRect(-1, -4, 2, 8); g.fillRect(-3, -1, 6, 1.6); g.restore(); }
  g.restore();
}
function wisp(g, x, y, s, digit, t) {
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter';
  for (const [r, c] of [[s * 1.5, 'rgba(90,110,255,.3)'], [s, 'rgba(140,170,255,.6)']]) { g.fillStyle = c; g.beginPath(); g.moveTo(-r * 0.75, 0); g.quadraticCurveTo(-r * 0.9, -r * 1.2, Math.sin(t * 9) * r * 0.3, -r * 1.9); g.quadraticCurveTo(r * 0.9, -r * 1.2, r * 0.75, 0); g.arc(0, 0, r * 0.75, 0, Math.PI); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  g.font = `900 ${s * 1.3}px "Courier New", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = digit >= 9 ? '#ffd23c' : '#ffffff'; g.strokeStyle = '#1a1f5a'; g.lineWidth = 2.5; g.strokeText(digit, 0, -s * 0.1); g.fillText(digit, 0, -s * 0.1);
  g.restore();
}
