// 遊戲內介面：血條、經驗、目標、隊友、技能鈕、升級三選一、暫停、結算。
import { CHARS, ROLES } from '../data/characters.js';
import { WEAPONS } from '../data/weapons.js';
import { PASSIVES } from '../data/upgrades.js';
import { ENEMY_LIST } from '../data/enemies.js';
import { DIFFS, STAGES } from '../data/chapters.js';
import { OBJ_TEXT } from '../sim/stagectl.js';
import { portrait } from '../render/chibi.js';
import { SLOT_COLORS } from '../render/renderer.js';
import { fmt } from '../core/util.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CAT_COL = { 專屬武器: '#ffd76b', 副武器: '#ff8fd0', 被動: '#2de2e6', 補給: '#5dff9d' };

export class Hud {
  constructor(app) {
    this.app = app; this.el = document.getElementById('hud'); this.modal = document.getElementById('modal');
    this.modal.addEventListener('click', (e) => { const t = e.target.closest('[data-a]'); if (t && !t.disabled) { sfx('click'); this.act(t.dataset.a, t.dataset.v); } });
    addEventListener('keydown', (e) => {
      if (!this.choices || this.choices.done) return;
      const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
      if (i >= 0 && i < this.choices.opts.length) this.act('opt', i); else if (e.code === 'KeyR') this.act('reroll');
    });
    this.choices = null; this.build = []; this.acc = 0; this.mode = null;
  }

  start(rt, msg) {
    this.rt = rt; this.roster = msg.players; this.myId = rt.myId; this.choices = null; this.mode = null;
    const mi = Math.max(0, msg.players.findIndex((p) => p.id === rt.myId)), me = msg.players[mi], def = CHARS[me.charId], st = STAGES[msg.stage];
    this.def = def; this.build = [{ k: 'w', id: def.weapon, lv: 1 }];
    const mates = msg.players.map((p, i) => (p.id === rt.myId ? '' : `<div class="mate" id="mate${p.id}" style="--c:${SLOT_COLORS[i]}"><span>${esc(p.name)}</span><div class="mb"><i></i></div></div>`)).join('');
    this.el.innerHTML = `<div class="vig"></div><div class="lowhp"></div>
      <div class="xp"><i></i></div><div class="lv"></div>
      <div class="me" style="--c:${SLOT_COLORS[mi]}"><span id="hp-port"></span><div><div class="nm">${esc(me.name)}・${def.name}</div><div class="hpbar"><i></i><u></u><span></span></div><div class="build"></div></div></div>
      <div class="team">${mates}</div>
      <div class="objs"></div>
      <div class="tr"><div class="time">0:00</div><div class="dim" style="font-size:11px">${st.id} ${st.name}・${DIFFS[msg.diff].name}</div><div>擊殺 <span class="kills">0</span></div><div class="coin gold coins">0</div><div class="net"></div>
        <button class="btn small ghost pausebtn" id="btn-pause">選單<span> (Esc)</span></button></div>
      <div class="skills">
        <button class="skbtn" id="btn-skill" style="--c:#9fe8ff"><div class="cd"></div><div class="g">技</div><div class="key">空白鍵</div><div class="nm">${def.skill.name}</div></button>
        <button class="skbtn" id="btn-ult" style="--c:#ffd76b"><div class="fill"></div><div class="g">寶</div><div class="key">Q</div><div class="nm">${def.ult.name}</div></button>
      </div>`;
    this.el.querySelector('#hp-port').replaceWith(portrait(def.id, 62));
    this.el.classList.remove('hidden');
    document.getElementById('touch').classList.remove('hidden');
    const q = (s) => this.el.querySelector(s);
    this.r = { xp: q('.xp i'), lv: q('.lv'), hp: q('.hpbar i'), sh: q('.hpbar u'), hpt: q('.hpbar span'), build: q('.build'), objs: q('.objs'), time: q('.time'), kills: q('.kills'), coins: q('.coins'), low: q('.lowhp'), sk: q('#btn-skill'), skcd: q('#btn-skill .cd'), ult: q('#btn-ult'), ultf: q('#btn-ult .fill'), net: q('.net') };
    this.app.input.bindButton(this.r.sk, 1); this.app.input.bindButton(this.r.ult, 2);
    q('#btn-pause').addEventListener('click', () => this.togglePause());
    rt.onChoices = (m) => this.onChoices(m);
    rt.onPicked = (o) => { if (o.k !== 'w' && o.k !== 'p') return; const b = this.build.find((x) => x.k === o.k && x.id === o.id); if (b) b.lv = o.lv; else this.build.push({ k: o.k, id: o.id, lv: o.lv }); this.renderBuild(); };
    this.renderBuild(); this.objKey = '';
  }
  stop() { this.el.classList.add('hidden'); this.el.innerHTML = ''; document.getElementById('touch').classList.add('hidden'); this.closeModal(); this.rt = null; }

  update(f, dt) {
    const h = f.hud, me = f.me, r = this.r;
    if (!h || !me) return;
    // 技能鈕每幀更新，其餘 8Hz
    r.skcd.style.height = me.cdP + '%'; r.sk.classList.toggle('ready', me.cdP <= 0 && !(me.fl & 1));
    r.ultf.style.height = me.ult + '%'; r.ult.classList.toggle('ready', me.ult >= 100); r.ult.classList.toggle('off', me.ult < 100);
    if (h.st === 1) this.seenLv = true;
    if (this.choices && this.seenLv && h.st !== 1 && this.mode === 'lvup') { this.choices = null; this.closeModal(); }   // 快照比選項訊息晚到，要等看過升級狀態才關
    this.acc += dt; if (this.acc < 0.12) return; this.acc = 0;
    r.xp.style.width = Math.min(100, h.xp / h.xn * 100) + '%'; r.lv.textContent = 'LV ' + h.lv;
    r.hp.style.width = Math.max(0, me.hp / me.maxHp * 100) + '%'; r.sh.style.width = Math.min(100, me.shield / me.maxHp * 100) + '%'; r.hpt.textContent = `${Math.max(0, me.hp)} / ${me.maxHp}`;
    r.low.classList.toggle('on', me.hp > 0 && me.hp / me.maxHp < 0.3);
    const s = Math.floor(f.time); r.time.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    r.kills.textContent = h.ki; r.coins.textContent = h.co;
    for (const p of f.players) { if (p.id === this.myId) continue; const el = document.getElementById('mate' + p.id); if (!el) continue; el.classList.toggle('down', !!(p.fl & 1)); el.style.opacity = p.fl & 32 ? 0.3 : 1; el.querySelector('i').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%'; }
    // 目標
    const key = JSON.stringify(h.L.o) + (h.L.b ? h.L.b[1] : '');
    if (key !== this.objKey) {
      this.objKey = key;
      let html = '';
      if (h.L.b) html += `<div class="boss"><div class="bn">${ENEMY_LIST[h.L.b[0]].name}</div><div class="bar"><i style="width:${h.L.b[1] / h.L.b[2] * 100}%"></i></div></div>`;
      for (const o of h.L.o) { if (o[1] === 'boss') continue; const tm = o[1] === 'survive' || o[1] === 'goblins'; html += `<div class="objv"><div class="r"><span>${OBJ_TEXT[o[1]]}</span><span>${tm ? Math.max(0, o[3] - o[2]) + ' 秒' : o[2] + ' / ' + o[3]}</span></div><div class="bar"><i style="width:${Math.min(100, o[2] / o[3] * 100)}%"></i></div></div>`; }
      if (!h.L.o.length && !h.L.b && h.st === 0) html = '<div class="objv" style="text-align:center;font-weight:700;border-left-color:var(--teal)">跟著箭頭前往下一個區域</div>';
      r.objs.innerHTML = html;
    }
  }
  renderBuild() {
    this.r.build.innerHTML = this.build.map((b) => { const d = b.k === 'w' ? WEAPONS[b.id] : PASSIVES[b.id]; return `<span class="glyph" style="--c:${b.k === 'w' ? '#ffd76b' : '#2de2e6'}" title="${d.name}">${d.glyph}<em>${b.lv}</em></span>`; }).join('');
  }

  // ───────── 升級三選一 ─────────
  onChoices(m) {
    if (this.mode === 'result') return;
    if (!this.choices || this.mode !== 'lvup') this.seenLv = false;
    this.choices = m; this.mode = 'lvup';
    if (m.done) {
      this.showModal(`<div class="lvup"><h2>${m.reason === 'chest' ? '寶箱' : '升級'}</h2><div class="wait">等待其他隊友選擇…</div></div>`);
      return;
    }
    const cards = m.opts.map((o, i) => `<button class="upc panel" data-a="opt" data-v="${i}" style="--c:${CAT_COL[o.cat] || '#2de2e6'}">
      <span class="tag" style="--c:${CAT_COL[o.cat]}">${o.cat}</span><span class="glyph" style="--c:${CAT_COL[o.cat]}">${o.glyph}</span>
      <div class="nm">${o.name}${o.lv ? ` <span class="dim" style="font-size:12px">Lv ${o.lv}</span>` : ''}</div>${o.isNew ? '<div class="new">NEW</div>' : ''}<div class="ds">${o.desc}</div><div class="dim" style="font-size:11px;margin-top:auto">按 ${i + 1}</div></button>`).join('');
    this.showModal(`<div class="lvup"><div class="sub">${m.reason === 'chest' ? 'TREASURE' : m.reason === 'supply' ? 'SUPPLY' : 'LEVEL UP'}</div><h2>${m.reason === 'chest' ? '開啟寶箱' : m.reason === 'supply' ? '戰前補給' : '選擇強化'}</h2>
      <div class="cards3">${cards}</div>
      <button class="btn small" data-a="reroll" ${m.rerolls > 0 ? '' : 'disabled'}>重抽（剩 ${m.rerolls} 次）R</button></div>`);
  }
  act(a, v) {
    if (a === 'opt' && this.choices && !this.choices.done) { this.rt.pick(+v); sfx('skill'); }
    else if (a === 'reroll' && this.choices && this.choices.rerolls > 0) this.rt.reroll();
    else if (a === 'resume') this.togglePause();
    else if (a === 'quit') { this.closeModal(); this.app.quitGame(); }
    else if (a === 'lobby') { this.closeModal(); this.app.endGame(); }
  }
  showModal(html) { this.modal.innerHTML = html; this.modal.classList.remove('hidden'); }
  closeModal() { this.modal.classList.add('hidden'); this.modal.innerHTML = ''; if (this.mode !== 'result') this.mode = null; }

  // ───────── 暫停 ─────────
  togglePause() {
    if (!this.rt || this.mode === 'lvup' || this.mode === 'result') return;
    if (this.mode === 'pause') { this.rt.setPaused(false); this.closeModal(); return; }
    this.mode = 'pause'; this.rt.setPaused(true);
    const solo = this.app.session.mode === 'solo';
    this.showModal(`<div class="panel pausebox"><h2>${solo ? '暫停' : '選單'}</h2>
      <div class="help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移動（攻擊全自動）<br><kbd>空白鍵</kbd> 技能：${this.def.skill.name}<br><kbd>Q</kbd> 寶具：${this.def.ult.name}<br>倒地的隊友：靠近 3 秒即可救起</div>
      ${solo ? '' : '<div class="dim" style="font-size:11px">連線遊戲不會暫停</div>'}
      <button class="btn primary" data-a="resume">繼續</button><button class="btn danger" data-a="quit">${this.app.session.mode === 'client' ? '離開房間' : '放棄關卡'}</button></div>`);
  }

  // ───────── 結算 ─────────
  showResult(res) {
    this.mode = 'result'; this.choices = null;
    const won = res.state === 'won', me = res.players.find((p) => p.id === this.myId) || res.players[0];
    const rw = save.settle(Object.assign({}, res, { myChar: me.charId }));
    const rows = res.players.map((p, i) => `<tr style="color:${SLOT_COLORS[i]}"><td>${esc(p.name)}・${CHARS[p.charId].name}${p.gone ? '（離線）' : ''}</td><td>${fmt(p.dmg)}</td><td>${p.kills}</td><td>${fmt(p.heal)}</td><td>${fmt(p.taken)}</td><td>${p.downs}</td></tr>`).join('');
    const host = this.app.session.isHost();
    this.showModal(`<div class="panel result ${won ? 'won' : 'lost'} scroll"><div class="sub">${won ? 'STAGE CLEAR' : 'DEFEATED'}</div><h1>${won ? '關卡完成' : '作戰失敗'}</h1>
      <div class="dim" style="margin-top:4px">${res.stage} ${STAGES[res.stage].name}・${DIFFS[res.diff].name}　時間 ${Math.floor(res.time / 60)}:${String(res.time % 60).padStart(2, '0')}　隊伍等級 ${res.level}　擊殺 ${res.kills}</div>
      <table><tr><th>隊員</th><th>傷害</th><th>擊殺</th><th>治療</th><th>承傷</th><th>倒地</th></tr>${rows}</table>
      <div class="rewards"><div><b>+${rw.coins}</b>金幣${rw.first ? '（首次通關 ×2）' : ''}</div><div><b>+${rw.xp}</b>${CHARS[me.charId].name} 熟練經驗</div><div><b style="color:var(--teal)">Rank ${rw.rank}</b>${rw.ranksUp ? '熟練度提升！' : '目前熟練度'}</div></div>
      <button class="btn primary" data-a="lobby">${host ? '返回大廳' : '返回大廳（等待房主）'}</button></div>`);
    sfx(won ? 'chest' : 'down');
  }
}
export { ROLES };
