// 進入點：把存檔、連線、畫面、輸入串起來。
import { save, DEV } from './core/save.js';
import { sfx, setVolume, setMusicVolume, music, unlockAudio } from './core/audio.js';
import { Session } from './net/session.js';
import { Renderer } from './render/renderer.js';
import { loadSprites } from './render/chibi.js';
import { loadEnemySprites } from './render/enemySprites.js';
import { loadMapTextures, mapReady, MapRenderer } from './render/map.js';
import { loadFxSprites } from './render/fxsprites.js';
import { Screens } from './ui/screens.js';
import { Hud } from './ui/hud.js';
import { Input } from './ui/input.js';
import { CHARS } from './data/characters.js';
import { STAGES } from './data/chapters.js';

const qs = new URLSearchParams(location.search);
save.load();
if (/^[A-H]$/i.test(qs.get('logo') || '')) document.documentElement.style.setProperty('--logo', '"Logo' + qs.get('logo').toUpperCase() + '"');
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
setVolume(save.data.settings.sfx); setMusicVolume(save.data.settings.music);
music('menu');
addEventListener('pointerdown', unlockAudio, { once: true });
addEventListener('keydown', unlockAudio, { once: true });

const app = {
  session: new Session(), input: new Input(), rt: null, renderer: null, frame: null,
  canvas: document.getElementById('game'),
  toast(msg) { const t = document.getElementById('toast'), d = document.createElement('div'); d.textContent = msg; t.appendChild(d); setTimeout(() => d.remove(), 3100); while (t.children.length > 3) t.firstChild.remove(); },

  startGame(rt, msg) {
    this.rt = rt; this.frame = null;
    this.screens.hide();
    this.renderer = new Renderer(this.canvas, rt.view.L, rt.myId, msg.players);
    { const th = rt.view.L.theme, r = this.renderer; if (!mapReady(th)) loadMapTextures(th).then(() => { if (this.renderer === r) r.map = new MapRenderer(rt.view.L); }); }      // 場景貼圖還沒載好：先用程式繪製，載好後換上
    this.renderer.fx.onSfx = (n) => { if (n === 'boss') music('boss'); sfx(n); };
    music('s' + (STAGES[msg.stage] ? STAGES[msg.stage].series : 1));
    this.renderer.fx.opts.shake = save.data.settings.shake; this.renderer.fx.opts.dmgNum = save.data.settings.dmgNum;
    rt.view.onEvent = (ev) => { if (ev[0] === 'evo' && ev[1] === rt.myId && ev[3]) { const c = (msg.players.find((q) => q.id === rt.myId) || {}).charId; if (c && save.unlockEvo(c, ev[3])) this.toast('已永久解鎖進化武器：' + ev[2] + '（可在角色頁切換）'); } this.renderer.fx.event(ev, this.frame && this.frame.players); };
    rt.onEnd = (res) => this.hud.showResult(res);
    this.hud.start(rt, msg);
    this.input.enabled = true;
    this.input.onPause = () => this.hud.togglePause();
  },
  stopGame() { music('menu'); this.input.enabled = false; this.hud.stop(); this.rt = null; this.renderer = null; this.frame = null; const g = this.canvas.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height); },
  // 結算後回大廳
  endGame() { this.stopGame(); this.session.backToLobby(); if (!this.screens.cur) this.screens.show('lobby'); },
  // 中途離開
  quitGame() {
    this.stopGame();
    if (this.session.mode === 'client') { this.session.leave(); this.session.lobby.players = []; this.screens.show('home'); } else { this.session.backToLobby(); if (!this.screens.cur) this.screens.show('lobby'); }
  },
};
app.screens = new Screens(app);
app.hud = new Hud(app);
window.__app = app;                       // 方便除錯 / 自動化測試

app.session.on('lobby', () => { if (app.rt && app.session.rt) return; if (app.rt) app.stopGame(); if (app.screens.cur === 'lobby' || !app.screens.cur) { app.screens.tabFromSel(); app.screens.show('lobby'); } });
app.session.on('start', (rt, msg) => app.startGame(rt, msg));
app.session.on('note', (s) => app.toast(s));
app.session.on('dropped', (why) => { app.stopGame(); app.session.lobby.players = []; app.screens.show('home'); app.toast(why); });

addEventListener('resize', () => { if (app.renderer) app.renderer.resize(); });
// 分頁切到背景時畫面迴圈會停：先把自己的輸入歸零，角色才不會一直往同方向走
document.addEventListener('visibilitychange', () => { if (document.hidden && app.rt) { app.input.keys.clear(); app.input.btn = 0; app.rt.setInput(0, 0, 0); } });

// 測試用（單人）：直接把專屬武器升滿、對應被動升到門檻，下一次升級就會出現進化卡。
// 網址 ?quick=1-1,laoliu&evo=1；或遊戲中按 F9。
async function grantEvoReady() {
  const rt = app.rt, W = rt && rt.world;
  if (!W) return;
  const { applyOption } = await import('./sim/player.js');
  const p = W.player(rt.myId), main = p.weapons[0];
  while (main.level < main.def.maxLv) applyOption(W, p, { k: 'w', id: main.def.id, lv: 1 });
  const evo = main.def.evo;
  if (!evo) return app.toast(main.def.branch ? '這把武器要先選路線分支，升滿後再按一次 F9' : '這個角色的進化還沒做');
  while ((p.passives[evo.passive] || 0) < evo.need) applyOption(W, p, { k: 'p', id: evo.passive });
  app.hud.build = p.weapons.map((w) => ({ k: 'w', id: w.def.id, lv: w.level })).concat(Object.keys(p.passives).map((id) => ({ k: 'p', id, lv: p.passives[id] })));
  app.hud.renderBuild(); W.lvQueue++;
  app.toast('測試：進化條件已達成，選金色的進化卡');
}
app.grantEvoReady = grantEvoReady;
addEventListener('keydown', (e) => { if (e.code === 'F9' && app.rt && app.session.mode === 'solo') { e.preventDefault(); grantEvoReady(); } });

let last = performance.now();
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  const rt = app.rt;
  if (!rt || !app.renderer) return;
  const inp = app.input.read();
  rt.setInput(inp.mx, inp.my, inp.k);
  rt.update(dt);
  const f = rt.view.frame(t / 1000, dt);
  if (!f.hud) return;
  app.frame = f;
  app.renderer.draw(f, dt);
  app.hud.update(f, dt);
}
requestAnimationFrame(loop);

await Promise.all([loadSprites(), loadEnemySprites(), loadFxSprites()]);                      // 圖片立繪要先載好，選單上的頭像才畫得出來
// 啟動畫面。?quick=1-1,tingge 直接開一場單人（開發用）
if (qs.get('set')) window.__SET = qs.get('set');
if (qs.get('quick')) {
  const [stage, ch] = qs.get('quick').split(',');
  if (CHARS[ch] && (DEV || save.isUnlocked(ch))) save.data.char = ch;
  app.session.startSolo();
  if (STAGES[stage]) app.session.lobby.sel = { stage, diff: +(qs.get('diff') || 0) };
  if (qs.get('fastult')) app.session.lobby.players[0].bonus.ult = 40;        // 測試用：寶具幾乎隨時可放
  app.session.launch();
  if (qs.get('evo')) grantEvoReady();
} else app.screens.show('home');
if (DEV) app.toast('開發模式：全角色解鎖，進度不會存檔');
