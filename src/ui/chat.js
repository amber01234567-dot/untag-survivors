// 聊天：大廳與戰鬥中共用。訊息由房主轉發（session 的 'chat' 事件）。
//   電腦：Enter 開啟輸入、Enter 送出、Esc 關閉；快捷語可以直接點。手機：點 💬。
//   戰鬥中訊息 8 秒後淡出；講話的人頭上會冒對話框（renderer.say）。
import { SLOT_COLORS } from '../render/renderer.js';

export const QUICK = ['集合！', '救我！', '小心！', '衝啊！', '等我一下', '謝謝', '打得好', '抱歉'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX_LINES = 40;

export class Chat {
  constructor(app) {
    this.app = app; this.open = false; this.lines = []; this.where = '';
    const el = this.el = document.createElement('div'); el.id = 'chat'; el.className = 'hidden';
    el.innerHTML = `<div class="clog"></div>
      <div class="cbox hidden"><div class="cquick">${QUICK.map((q, i) => `<button data-q="${i}">${q}</button>`).join('')}</div>
        <div class="crow"><input class="cin" maxlength="60" placeholder="輸入訊息，Enter 送出" autocomplete="off"><button class="csend">送出</button></div></div>
      <button class="cbtn" title="聊天 (Enter)">💬<span>Enter</span></button>`;
    document.getElementById('app') ? document.getElementById('app').appendChild(el) : document.body.appendChild(el);
    this.log = el.querySelector('.clog'); this.box = el.querySelector('.cbox'); this.inp = el.querySelector('.cin');
    el.querySelector('.cbtn').addEventListener('click', () => this.toggle());
    el.querySelector('.csend').addEventListener('click', () => this.submit());
    el.querySelector('.cquick').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) { this.send(QUICK[+b.dataset.q]); if (this.where === 'game') this.toggle(false); } });
    this.inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (this.inp.value.trim()) this.submit(); else this.toggle(false); }
      else if (e.key === 'Escape') { e.preventDefault(); this.toggle(false); }
    });
    addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || this.open || !this.where) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (!document.getElementById('modal').classList.contains('hidden') && this.where === 'game' && this.app.hud.mode === 'result') return;
      e.preventDefault(); this.toggle(true);
    });
    setInterval(() => this.sync(), 250);
  }
  // 依目前畫面決定要不要顯示、用哪種版面
  sync() {
    const app = this.app, multi = app.session.mode !== 'solo' && app.session.lobby.players.length > 0;
    const where = !multi ? '' : app.rt ? 'game' : app.screens.cur === 'lobby' ? 'lobby' : '';
    if (where !== this.where) {
      this.where = where; this.el.className = where ? 'in-' + where : 'hidden';
      if (!where) { this.toggle(false); if (!multi) { this.lines = []; this.log.innerHTML = ''; } }
      if (where === 'lobby') this.toggle(false);
      this.render();
    }
    if (where === 'game') { const now = performance.now(); for (const n of this.log.children) n.classList.toggle('old', !this.open && now - +n.dataset.t > 8000); }
  }
  toggle(v) {
    this.open = v === undefined ? !this.open : v;
    this.box.classList.toggle('hidden', !this.open && this.where !== 'lobby');
    this.el.classList.toggle('open', this.open);
    if (this.open) { const inp = this.app.input; inp.keys.clear(); inp.btn = 0; this.inp.focus(); } else { this.inp.blur(); }
  }
  submit() { const s = this.inp.value.trim(); this.inp.value = ''; if (s) this.send(s); if (this.where === 'game') this.toggle(false); }
  send(s) { this.app.session.sendChat(s); }
  // session 的 'chat' 事件
  onMsg(id, s) {
    const ses = this.app.session, i = ses.lobby.players.findIndex((p) => p.id === id), p = ses.lobby.players[i];
    this.lines.push({ id, name: p ? p.name : '玩家', col: SLOT_COLORS[(i < 0 ? 0 : i) % 4], s, t: performance.now() });
    if (this.lines.length > MAX_LINES) this.lines.shift();
    this.render();
    if (this.app.renderer && this.app.renderer.say) this.app.renderer.say(id, s);
  }
  system(s) { this.lines.push({ sys: 1, s, t: performance.now() }); if (this.lines.length > MAX_LINES) this.lines.shift(); this.render(); }
  render() {
    this.log.innerHTML = this.lines.map((l) => (l.sys ? `<div class="sys" data-t="${l.t}">${esc(l.s)}</div>` : `<div data-t="${l.t}"><b style="color:${l.col}">${esc(l.name)}</b>${esc(l.s)}</div>`)).join('');
    this.log.scrollTop = this.log.scrollHeight;
    this.box.classList.toggle('hidden', !this.open && this.where !== 'lobby');
  }
}
