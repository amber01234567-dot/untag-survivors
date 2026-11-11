// 選單畫面：主選單、大廳（隊伍 + 世界節點圖 + 關卡資訊）、角色圖鑑、天賦。
import { CHARS, CHAR_LIST, ROLES, MASTERY } from '../data/characters.js';
import { WEAPONS } from '../data/weapons.js';
import { TALENTS } from '../data/upgrades.js';
import { CHAPTERS, STAGES, LAYOUTS, DIFFS, NODE_KINDS, nodeUnlocked } from '../data/chapters.js';
import { ENEMIES } from '../data/enemies.js';
import { OBJ_TEXT } from '../sim/stagectl.js';
import { portrait, hasLook } from '../render/chibi.js';
import { SLOT_COLORS } from '../render/renderer.js';
import { save } from '../core/save.js';
import { sfx } from '../core/audio.js';
import { NET_KIND } from '../net/transport.js';
import { icon } from './icons.js';

const KIND_COL = { normal: '#2de2e6', elite: '#ff3d8b', bonus: '#ffd76b', boss: '#ff5a6b' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const P = (id, size) => `<i data-p="${id}" data-s="${size}"></i>`;
function mount(root) { root.querySelectorAll('i[data-p]').forEach((el) => el.replaceWith(portrait(el.dataset.p, +el.dataset.s))); }
const objLine = (o) => (o.t === 'kill' ? `殲滅 ${Math.round(o.n * 1.8)} 名敵人` : o.t === 'survive' ? `撐過 ${o.s} 秒` : o.t === 'nests' ? `摧毀 ${o.n} 個巢穴` : o.t === 'elite' ? `擊敗菁英「${ENEMIES[o.who].name}」` : o.t === 'boss' ? `擊敗首領「${ENEMIES[o.who].name}」` : o.t === 'goblins' ? `${o.s} 秒內盡量攔截運鈔鼠` : '寶藏');

export class Screens {
  constructor(app) {
    this.app = app; this.el = document.getElementById('screen'); this.cur = null; this.tab = 1; this.sel = save.data.char; this.back = 'home';
    this.el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-a]');
      if (!t || t.disabled) return;
      sfx('click');
      this.act(t.dataset.a, t.dataset.v, t);
    });
    this.el.addEventListener('change', (e) => { if (e.target.id === 'name') { save.data.name = e.target.value.trim().slice(0, 12) || save.data.name; save.write(); } });
  }
  hide() { this.el.classList.remove('on'); this.el.innerHTML = ''; this.cur = null; }
  show(name) {
    this.cur = name; this.el.classList.add('on');
    this.el.innerHTML = this[name]();
    mount(this.el);
    if (name === 'lobby') this.drawTopo();
  }
  refresh() { if (this.cur) { const sc = this.el.querySelector('.scroll'); const y = sc ? sc.scrollTop : 0; this.show(this.cur); const s2 = this.el.querySelector('.scroll'); if (s2) s2.scrollTop = y; } }

  async act(a, v) {
    const app = this.app, ses = app.session;
    try {
      switch (a) {
        case 'solo': ses.startSolo(); this.tabFromSel(); this.show('lobby'); break;
        case 'host': app.toast('建立房間中…'); await ses.startHost(); this.tabFromSel(); this.show('lobby'); break;
        case 'join': { const code = (document.getElementById('code').value || '').trim(); if (code.length < 4) return app.toast('請輸入房號'); app.toast('連線中…'); await ses.join(code); this.tabFromSel(); this.show('lobby'); break; }
        case 'roster': this.back = this.cur; this.sel = save.data.char; this.show('roster'); break;
        case 'talents': this.back = this.cur; this.show('talents'); break;
        case 'back': this.show(this.back === 'lobby' && ses.lobby.players.length ? 'lobby' : 'home'); break;
        case 'leave': ses.leave(); ses.lobby.players = []; this.show('home'); break;
        case 'tab': this.tab = +v; this.show('lobby'); break;
        case 'node': if (ses.isHost()) { const cl = ses.lobby.cleared[v] || 0; ses.select(v, Math.min(ses.lobby.sel.diff, cl)); } break;
        case 'diff': if (ses.isHost()) ses.select(ses.lobby.sel.stage, +v); break;
        case 'ready': ses.updateMe(!ses.me().ready); break;
        case 'launch': ses.launch(); break;
        case 'copy': { const url = location.origin + location.pathname + '?room=' + ses.code + (NET_KIND === 'local' ? '&net=local' : ''); try { await navigator.clipboard.writeText(url); app.toast('已複製邀請連結'); } catch (e) { app.toast('房號：' + ses.code); } break; }
        case 'pick': this.sel = v; this.show('roster'); break;
        case 'use': save.data.char = v; save.write(); if (ses.lobby.players.length) ses.updateMe(); this.show('roster'); break;
        case 'buy': if (save.unlock(v)) { app.toast('已解鎖 ' + CHARS[v].name); sfx('chest'); } else app.toast('金幣不足'); this.show('roster'); break;
        case 'talent': if (save.buyTalent(v)) { sfx('levelup'); if (ses.lobby.players.length) ses.updateMe(); } else app.toast('金幣不足'); this.refresh(); break;
        case 'sheet': { const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="assets/sheets/${v}.jpg" alt="">`; lb.onclick = () => lb.remove(); document.body.appendChild(lb); break; }
        case 'reset': if (confirm('確定要清除所有存檔進度嗎？')) { save.reset(); this.show('home'); } break;
      }
    } catch (err) { app.toast(err.message || String(err)); }
  }
  tabFromSel() { this.tab = STAGES[this.app.session.lobby.sel.stage].chapter; }

  // ───────── 主選單 ─────────
  home() {
    const room = new URLSearchParams(location.search).get('room') || '';
    const heroes = ['yingzhang', 'gouqi', 'shenshen', 'laoliu', 'tingge', 'enjidou', 'tiaotiao', 'xia', 'laijie'].filter(hasLook).map((id) => P(id, 150)).join('');
    return `<div class="page home">
      <div class="wallet coin gold">${save.data.coins}</div>
      <div class="heroes">${heroes}</div>
      <div class="logo">UNTAG<small>倖存戰線</small></div>
      <div class="tagline">不被定義・不被束縛 ── 4 人連線合作倖存者</div>
      <div class="row"><input class="field" id="name" maxlength="12" value="${esc(save.data.name)}" placeholder="你的名字"></div>
      <div class="menu">
        <button class="btn primary wide" data-a="solo">單人出擊</button>
        <button class="btn wide" data-a="host">建立房間（最多 4 人）</button>
        <input class="field" id="code" maxlength="5" placeholder="輸入房號" value="${esc(room)}" style="width:100%;text-transform:uppercase;letter-spacing:.2em">
        <button class="btn" data-a="join">加入房間</button>
        <button class="btn ghost" data-a="roster">角色</button>
        <button class="btn ghost" data-a="talents">天賦強化</button>
      </div>
      <div class="foot">WASD / 方向鍵移動・自動攻擊・空白鍵 技能・Q 寶具　｜　<a data-a="reset" style="cursor:pointer;text-decoration:underline">清除存檔</a>　｜　© 2026 UNTAG 倖存戰線・版權所有</div>
    </div>`;
  }

  // ───────── 大廳 ─────────
  lobby() {
    const ses = this.app.session, lb = ses.lobby, host = ses.isHost(), me = ses.me();
    const st = STAGES[lb.sel.stage], ch = CHAPTERS.find((c) => c.id === this.tab), cleared = lb.cleared || {};
    const slots = [0, 1, 2, 3].map((i) => {
      const p = lb.players[i];
      if (!p) return `<div class="slot empty">${ses.mode === 'solo' ? '' : '等待玩家加入…'}</div>`;
      const c = CHARS[p.charId] || CHARS.tingge;
      return `<div class="slot" style="--c:${SLOT_COLORS[i]}">${P(c.id, 52)}<div><div class="nm">${esc(p.name)}${p.id === ses.myId ? '（你）' : ''}</div><div class="ch">${c.name}・${ROLES[c.role].name}　熟練 ${p.rank | 0}</div></div>
        <div class="st" style="color:${p.host ? 'var(--gold2)' : p.ready ? 'var(--green)' : 'var(--dim)'}">${p.host ? '房主' : p.ready ? '已準備' : '未準備'}</div></div>`;
    }).join('');
    const tabs = CHAPTERS.map((c) => `<button class="chtab ${c.id === this.tab ? 'on' : ''}" data-a="tab" data-v="${c.id}" ${nodeUnlocked(c.nodes[0].id, cleared) ? '' : 'disabled'}>第 ${c.id} 章　${c.name}</button>`).join('');
    const px = (n) => 9 + n.pos[0] * 20.5, py = (n) => 15 + n.pos[1] * 28;
    let lines = '';
    for (const n of ch.nodes) for (const id of n.next) { const m = STAGES[id], on = cleared[n.id]; lines += `<line x1="${px(n)}%" y1="${py(n)}%" x2="${px(m)}%" y2="${py(m)}%" stroke="${on ? '#e2b53e' : '#3a4356'}" stroke-width="2" stroke-dasharray="${on ? '' : '5 5'}"/>`; }
    const nodes = ch.nodes.map((n) => {
      const cl = cleared[n.id] || 0, un = nodeUnlocked(n.id, cleared);
      return `<button class="node ${un ? (cl ? 'cleared' : 'open') : 'locked'} ${n.id === lb.sel.stage ? 'sel' : ''}" style="left:${px(n)}%;top:${py(n)}%;--c:${KIND_COL[n.kind]}" data-a="node" data-v="${n.id}">
        <div class="dia"><span>${NODE_KINDS[n.kind].glyph}</span></div><div class="nm">${n.id}　${n.name}</div><div class="stars">${'★'.repeat(cl)}${'☆'.repeat(3 - cl)}</div></button>`;
    }).join('');
    const maxDiff = Math.min(2, cleared[st.id] || 0);
    const diffs = DIFFS.map((d, i) => `<button class="${i === lb.sel.diff ? 'on' : ''}" data-a="diff" data-v="${i}" ${i > maxDiff || !host ? 'disabled' : ''}>${d.name}</button>`).join('');
    const pool = st.pool.map((p) => ENEMIES[p[0]].name).join('、');
    const first = (cleared[st.id] || 0) <= lb.sel.diff;
    const allReady = ses.canLaunch();
    return `<div class="page">
      <div class="topbar"><button class="btn small ghost" data-a="leave">← 離開</button><div class="title">${ses.mode === 'solo' ? '單人出擊' : '作戰大廳'}</div><div class="sp"></div><div class="coin gold" style="font-weight:700">${save.data.coins}</div>
        <button class="btn small" data-a="roster">更換角色</button><button class="btn small" data-a="talents">天賦</button></div>
      <div class="lobby-grid">
        <div class="panel party">${ses.mode !== 'solo' ? `<div class="roomcode"><div class="sub">ROOM CODE</div><b>${ses.code}</b><div><button class="btn small ghost" data-a="copy" style="margin-top:6px">複製邀請連結</button></div></div>` : ''}${slots}
          ${ses.mode !== 'solo' ? '<div class="dim" style="font-size:11px;line-height:1.6">把房號或邀請連結傳給朋友即可加入。房主的瀏覽器就是主機，請保持分頁開啟。</div>' : ''}</div>
        <div class="panel mapwrap"><div class="chtabs">${tabs}</div>
          <div class="wmap"><svg>${lines}</svg>${nodes}<div class="intro">${ch.intro}</div></div></div>
        <div class="panel info scroll">
          <div><span class="tag" style="--c:${KIND_COL[st.kind]}">${NODE_KINDS[st.kind].name}</span> <span class="sub">${st.id}</span></div>
          <h3>${st.name}</h3>
          <canvas class="topo" id="topo"></canvas>
          <div class="dim" style="font-size:11px">關卡拓樸：依序淨化區域，閘門才會開啟（虛線＝需要先完成其他區域）</div>
          <div>${st.objs.map((o, i) => `<div class="obj"><span class="glyph sm" style="--c:var(--gold2)">${i + 1}</span>${objLine(o)}</div>`).join('')}</div>
          <div class="dim" style="font-size:12px">出沒：${pool}</div>
          <div class="diffs">${diffs}</div>
          <div style="font-size:13px">通關獎勵 <b class="coin gold">${Math.round(st.coins * DIFFS[lb.sel.diff].reward * (first ? 2 : 1))}</b>${first ? ' <span class="tag" style="--c:var(--green)">首次通關 ×2</span>' : ''}</div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
            ${host ? `<button class="btn primary" data-a="launch" ${allReady ? '' : 'disabled'}>${allReady ? '出　擊' : '等待隊友準備…'}</button>` : `<button class="btn ${me && me.ready ? '' : 'primary'}" data-a="ready">${me && me.ready ? '取消準備' : '準　備'}</button><div class="dim" style="font-size:11px;text-align:center">由房主選擇關卡並開始</div>`}
          </div>
        </div>
      </div></div>`;
  }
  // 關卡內拓樸示意圖
  drawTopo() {
    const cv = document.getElementById('topo'); if (!cv) return;
    const st = STAGES[this.app.session.lobby.sel.stage], lay = LAYOUTS[st.layout], dpr = Math.min(2, devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    let mx = 0, my = 0; for (const z of lay.zones) { mx = Math.max(mx, z.c[0]); my = Math.max(my, z.c[1]); }
    const cw = Math.min(70, (w - 20) / (mx + 1)), chh = Math.min(42, (h - 12) / (my + 1));
    const ox = (w - cw * (mx + 1)) / 2, oy = (h - chh * (my + 1)) / 2;
    const pos = {}; for (const z of lay.zones) pos[z.id] = [ox + (z.c[0] + 0.5) * cw, oy + (z.c[1] + 0.5) * chh];
    for (const [a, b, req] of lay.links) { g.strokeStyle = req ? '#e2b53e' : '#5a6478'; g.lineWidth = 3; g.setLineDash(req ? [4, 4] : []); g.beginPath(); g.moveTo(...pos[a]); g.lineTo(...pos[b]); g.stroke(); }
    g.setLineDash([]);
    let n = 0;
    for (const z of lay.zones) {
      const kind = z.kind || 'combat', [x, y] = pos[z.id];
      const col = kind === 'start' ? '#5dff9d' : kind === 'final' ? (st.kind === 'boss' ? '#ff5a6b' : '#ff3d8b') : kind === 'treasure' ? '#ffd76b' : '#2de2e6';
      const bw = kind === 'final' ? cw * 0.74 : cw * 0.6, bh = kind === 'final' ? chh * 0.78 : chh * 0.64;
      g.fillStyle = '#0b0e15'; g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.roundRect(x - bw / 2, y - bh / 2, bw, bh, 4); g.fill(); g.stroke();
      g.fillStyle = col; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(kind === 'start' ? '起點' : kind === 'treasure' ? '寶' : kind === 'final' ? (st.kind === 'boss' ? '首領' : '終點') : String(++n), x, y + 0.5);
    }
  }

  // ───────── 角色圖鑑 ─────────
  roster() {
    const cur = save.data.char, sel = CHARS[this.sel] || CHARS[cur];
    const groups = Object.keys(ROLES).map((r) => `<div class="role-h" style="--c:${ROLES[r].color}">${ROLES[r].name}</div><div class="cgrid">${CHAR_LIST.filter((c) => c.role === r).map((c) => {
      const un = save.isUnlocked(c.id);
      return `<button class="ccard ${c.id === sel.id ? 'sel' : ''} ${c.id === cur ? 'cur' : ''} ${un ? '' : 'lock'}" style="--c:${ROLES[r].color}" data-a="pick" data-v="${c.id}">${P(c.id, 72)}<div class="nm">${c.name}</div><div class="${un ? 'wp' : 'cost coin'}">${un ? WEAPONS[c.weapon].name : c.unlock}</div></button>`;
    }).join('')}</div>`).join('');
    const w = WEAPONS[sel.weapon], un = save.isUnlocked(sel.id), rank = save.rank(sel.id), need = MASTERY.need(rank), xp = save.charXp(sel.id), col = ROLES[sel.role].color;
    return `<div class="page">
      <div class="topbar"><button class="btn small ghost" data-a="back">← 返回</button><div class="title">角色</div><div class="sp"></div><div class="coin gold" style="font-weight:700">${save.data.coins}</div></div>
      <div class="roster-grid">
        <div class="panel cards scroll">${groups}</div>
        <div class="panel detail scroll" style="--c:${col}">
          <div class="head">${P(sel.id, 110)}<div><div class="sub">${sel.en}</div><h2>${sel.name}</h2><div style="margin-top:4px"><span class="tag" style="--c:${col}">${ROLES[sel.role].name}</span> <span class="tag">${sel.cls}</span>${sel.species !== '—' ? ` <span class="tag">${sel.species}</span>` : ''}</div></div></div>
          ${sel.quote ? `<div class="quote">「${sel.quote}」</div>` : ''}
          <div style="font-size:13px;line-height:1.6">${sel.desc}</div>
          ${hasLook(sel.id) ? '' : '<div class="tag" style="--c:var(--gold2);align-self:flex-start">外觀待補：收到設定圖後繪製</div>'}
          <div class="stats"><div><b>${sel.hp}</b>生命</div><div><b>${sel.speed}</b>移速</div><div><b>${sel.armor}</b>護甲</div></div>
          <div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>熟練度 <b style="color:var(--teal)">Rank ${rank}</b>　<span class="dim">每階 生命 / 傷害 +3%</span></span><span class="dim">${rank >= MASTERY.maxRank ? 'MAX' : xp + ' / ' + need}</span></div><div class="bar"><i style="width:${rank >= MASTERY.maxRank ? 100 : xp / need * 100}%"></i></div></div>
          <div class="kit">${icon('icons/w_' + w.id, w.glyph, col)}<div><b>${w.name}</b>　<span class="dim">專屬武器・自動攻擊</span><ul class="lvlist">${w.lv.map((l, i) => `<li data-l="${i + 2}">${l[0]}</li>`).join('')}</ul></div></div>
          ${(w.branch || []).map((bid) => { const bw = WEAPONS[bid]; return `<div class="kit">${icon('icons/w_' + bid, bw.glyph, '#ff8a5a')}<div><b>${bw.name}</b>　<span class="dim">路線分支（二選一）</span><br>${bw.branchDesc}<ul class="lvlist">${bw.lv.map((l, i) => `<li data-l="${i + 2}">${l[0]}</li>`).join('')}</ul></div></div>`; }).join('')}
          <div class="kit">${icon('skills/' + sel.skill.id, '技', '#2de2e6')}<div><b>${sel.skill.name}</b>　<span class="dim">冷卻 ${sel.skill.cd} 秒</span><br>${sel.skill.desc}</div></div>
          <div class="kit">${icon('skills/' + sel.ult.id, '寶', 'var(--gold2)')}<div><b>${sel.ult.name}</b>　<span class="dim">寶具・擊殺充能</span><br>${sel.ult.desc}</div></div>
          ${sel.sheet ? `<img class="sheet-thumb" src="assets/sheets/${sel.id}.jpg" data-a="sheet" data-v="${sel.id}" alt="${sel.name} 設定圖">` : ''}
          <div style="margin-top:auto">${un ? `<button class="btn primary" style="width:100%" data-a="use" data-v="${sel.id}" ${sel.id === cur ? 'disabled' : ''}>${sel.id === cur ? '目前出戰中' : '選擇出戰'}</button>` : `<button class="btn primary" style="width:100%" data-a="buy" data-v="${sel.id}" ${save.data.coins >= sel.unlock ? '' : 'disabled'}>解鎖　${sel.unlock} 金幣</button>`}</div>
        </div>
      </div></div>`;
  }

  // ───────── 天賦 ─────────
  talents() {
    return `<div class="page">
      <div class="topbar"><button class="btn small ghost" data-a="back">← 返回</button><div class="title">天賦強化</div><div class="dim" style="font-size:12px">永久生效，所有角色共用</div><div class="sp"></div><div class="coin gold" style="font-weight:700">${save.data.coins}</div></div>
      <div class="panel tgrid scroll">${TALENTS.map((t) => {
        const lv = save.talent(t.id), max = lv >= t.max, cost = max ? 0 : t.cost(lv);
        return `<div class="tcard">${icon('icons/t_' + t.id, t.glyph, 'var(--gold2)')}<div class="mid"><div class="nm">${t.name}</div><div class="ds">${t.desc}／級</div><div class="pips">${Array.from({ length: t.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="btn small ${max ? 'ghost' : ''}" data-a="talent" data-v="${t.id}" ${max || save.data.coins < cost ? 'disabled' : ''}>${max ? 'MAX' : `<span class="coin">${cost}</span>`}</button></div>`;
      }).join('')}</div></div>`;
  }
}
export { OBJ_TEXT, esc, KIND_COL };
