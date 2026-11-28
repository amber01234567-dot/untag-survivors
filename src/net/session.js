// 房間（大廳）與對局執行期。
//   Session      大廳狀態：誰在房裡、選了哪個角色、房主選了哪一關
//   HostRuntime  房主 / 單人：跑 World，並把快照廣播給其他人
//   ClientRuntime 其他玩家：送輸入、收快照、預測自己的移動
import { World } from '../sim/world.js';
import { buildLevel, moveBody } from '../sim/levelgen.js';
import { SIM_DT, SNAP_EVERY, MAX_PLAYERS } from '../sim/const.js';
import { STAGES } from '../data/chapters.js';
import { snapOf, encode, decode, PROTO } from './protocol.js';
import { View } from './view.js';
import { openHost, connect, makeCode, NET_KIND } from './transport.js';
import { save, DEV } from '../core/save.js';
import { CHAPTER_EL, TEST_EL } from '../data/gear.js';
// 關卡屬性：系列三每章一種；測試模式下讓現有第 1–6 章暫時帶屬性
const stageEl = (id) => { const ch = STAGES[id].chapter; return CHAPTER_EL[ch] || (DEV ? TEST_EL[ch] : null) || null; };

const now = () => performance.now() / 1000;
const AWAY_MS = 300000;        // 玩家暫離 / 斷線後，位置保留多久
const token = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function makeTicker(fn, hz = 60) {
  try {
    const w = new Worker(URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${1000 / hz});`], { type: 'text/javascript' })));
    w.onmessage = fn;
    return { stop() { w.terminate(); } };
  } catch (e) { const id = setInterval(fn, 1000 / hz); return { stop() { clearInterval(id); } }; }
}

// 聊天訊息清理：去掉控制字元與換行、壓縮空白、最長 60 字
function cleanChat(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60); }
export class Session {
  constructor() {
    this.mode = 'solo'; this.myId = 0; this.code = null; this.host = null; this.conn = null;
    this.conns = new Map();
    this.lobby = { players: [], sel: { stage: '1-1', diff: 0 }, cleared: {} };
    this.rt = null; this.handlers = {};
    this.toks = new Map(); this.awayT = new Map();      // 房主端：重連憑證、暫離計時
    this.tok = null; this.reconnecting = false;         // 客戶端
    this.chatT = new Map();                             // 房主端：每個人上次發言時間（防洗頻）
    // 分頁切到背景（手機切 App）：先告訴對方「我暫離」，回來時再確認連線還活著
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      const hid = document.hidden;
      if (this.mode === 'client' && this.conn && this.conn.open) {
        if (hid) { this.conn.send(JSON.stringify({ t: 'away' })); this.conn.grace(AWAY_MS); }
        else { this.conn.grace(0); this.conn.probe(); this.conn.send(JSON.stringify({ t: 'fg' })); }
      } else if (this.mode === 'host' && this.conns.size) {
        this.broadcast(JSON.stringify({ t: hid ? 'hostaway' : 'hostfg' }));
        if (!hid) for (const c of this.conns.values()) c.probe();
      }
    });
  }
  on(ev, cb) { this.handlers[ev] = cb; }
  fire(ev, ...a) { if (this.handlers[ev]) this.handlers[ev](...a); }
  myInfo() { const c = save.data.char; return { name: save.data.name, charId: c, bonus: save.bonusFor(c), rank: save.rank(c) }; }
  me() { return this.lobby.players.find((p) => p.id === this.myId); }
  isHost() { return this.mode !== 'client'; }

  // ── 建立 / 加入 ──
  startSolo() {
    this.leave(); this.mode = 'solo'; this.myId = 0;
    this.lobby.players = [Object.assign({ id: 0, host: true, ready: true }, this.myInfo())];
    this.lobby.cleared = save.data.cleared;
    this.fire('lobby');
  }
  async startHost() {
    this.leave(); this.mode = 'host'; this.myId = 0;
    for (let i = 0; i < 5; i++) {
      this.code = makeCode();
      try { this.host = await openHost(this.code); break; } catch (e) { if (e.message !== 'TAKEN' || i === 4) throw e; }
    }
    this.host.onConn = (c) => this.accept(c);
    this.lobby.players = [Object.assign({ id: 0, host: true, ready: true }, this.myInfo())];
    this.lobby.cleared = save.data.cleared;
    this.fire('lobby');
  }
  async join(code) {
    this.leave();
    const conn = await connect(code.toUpperCase());
    this.mode = 'client'; this.code = code.toUpperCase();
    try { await this.handshake(conn, null); } catch (e) { this.mode = 'solo'; this.conn = null; conn.close(); throw e; }
  }
  // 與房主握手。resume = 上次拿到的憑證（斷線重連時帶上，房主會把原本的位置還給我們）
  handshake(conn, resume) {
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('房主沒有回應')), 8000);
      conn.onData = (d) => {
        if (typeof d !== 'string') { if (this.rt && this.conn === conn) this.rt.onSnapshot(d); return; }
        const m = JSON.parse(d);
        if (m.t === 'welcome') { clearTimeout(to); this.conn = conn; this.myId = m.id; this.tok = m.tok; this.lobby = m.lobby; resolve(); if (!resume) this.fire('lobby'); }
        else if (m.t === 'reject') { clearTimeout(to); const e = new Error(m.why); e.fatal = true; reject(e); }
        else if (this.conn === conn) this.clientMsg(m);
      };
      conn.onClose = () => { if (this.conn === conn) this.lost(); };
      conn.send(JSON.stringify(Object.assign({ t: 'hello', v: PROTO, resume }, this.myInfo())));
    });
  }
  // 客戶端：連線斷了 → 保留畫面，自動重連；超過保留時間或被房主拒絕才真的離開
  lost() {
    if (this.mode !== 'client' || this.reconnecting) return;
    this.conn = null; this.reconnecting = true;
    this.fire('note', '連線中斷，正在重新連線…');
    let spent = 0;
    const giveUp = (why) => { this.reconnecting = false; if (this.mode !== 'client') return; this.stopRt(); this.mode = 'solo'; this.conn = null; this.fire('dropped', why); };
    const attempt = async () => {
      if (this.mode !== 'client' || !this.reconnecting) return;
      if (typeof document !== 'undefined' && document.hidden) return setTimeout(attempt, 1000);
      if (spent > AWAY_MS + 20000) return giveUp('與房主的連線中斷了');
      const t0 = Date.now();
      let conn = null;
      try {
        conn = await connect(this.code);
        if (this.mode !== 'client' || !this.reconnecting) return conn.close();
        await this.handshake(conn, this.tok);
        this.reconnecting = false; this.fire('note', '已重新連線');
      } catch (e) {
        if (conn) { conn.onClose = null; conn.close(); }
        if (e.fatal) return giveUp(e.message);
        spent += Date.now() - t0 + 2000; setTimeout(attempt, 2000);
      }
    };
    attempt();
  }
  leave() {
    this.stopRt(); this.reconnecting = false; this.tok = null;
    for (const t of this.awayT.values()) clearTimeout(t);
    this.awayT.clear(); this.toks.clear();
    if (this.host) { for (const c of this.conns.values()) c.close(); this.host.close(); this.host = null; }
    if (this.conn) { const c = this.conn; this.conn = null; this.mode = 'solo'; c.close(); }
    this.conns.clear(); this.code = null;
  }
  stopRt() { if (this.rt) { this.rt.stop(); this.rt = null; } }

  // ── 房主端 ──
  accept(conn) {
    let pid = -1;
    conn.onData = (d) => {
      if (typeof d !== 'string') return;
      const m = JSON.parse(d);
      if (m.t === 'hello') {
        if (m.resume) {                          // 斷線重連：憑證對得上就把原本的位置還給他
          const hit = [...this.toks].find(([id, t]) => t === m.resume && this.lobby.players.some((p) => p.id === id));
          if (!hit || m.v !== PROTO) { conn.send(JSON.stringify({ t: 'reject', why: '離開太久，位置已經釋出了' })); setTimeout(() => conn.close(), 300); return; }
          pid = hit[0];
          const old = this.conns.get(pid);
          if (old && old !== conn) { old.onClose = null; old.close(); }
          this.conns.set(pid, conn);
          conn.send(JSON.stringify({ t: 'welcome', id: pid, tok: m.resume, lobby: this.lobby }));
          this.setAway(pid, false);
          if (this.rt) this.rt.resync(pid); else conn.send(JSON.stringify({ t: 'back' }));
          return;
        }
        const why = m.v !== PROTO ? '遊戲版本不同，請雙方重新整理頁面' : this.rt ? '這個房間正在遊戲中，請等他們回到大廳' : this.lobby.players.length >= MAX_PLAYERS ? '房間已滿' : null;
        if (why) { conn.send(JSON.stringify({ t: 'reject', why })); setTimeout(() => conn.close(), 300); return; }
        pid = [1, 2, 3].find((i) => !this.lobby.players.some((p) => p.id === i));
        this.conns.set(pid, conn); this.toks.set(pid, token());
        this.lobby.players.push({ id: pid, name: String(m.name || '玩家').slice(0, 12), charId: m.charId, bonus: m.bonus, rank: m.rank | 0, ready: false });
        conn.send(JSON.stringify({ t: 'welcome', id: pid, tok: this.toks.get(pid), lobby: this.lobby }));
        this.syncLobby();
        return;
      }
      if (pid < 0 || this.conns.get(pid) !== conn) return;
      const lp = this.lobby.players.find((p) => p.id === pid);
      if (m.t === 'chat') { this.relayChat(pid, m.s); return; }
      if (m.t === 'away') { conn.grace(AWAY_MS); this.setAway(pid, true); }
      else if (m.t === 'fg') { conn.grace(0); this.setAway(pid, false); if (this.rt) this.rt.resync(pid); }
      else if (m.t === 'me' && lp && !this.rt) { lp.charId = m.charId; lp.bonus = m.bonus; lp.rank = m.rank | 0; lp.ready = !!m.ready; lp.name = String(m.name || lp.name).slice(0, 12); this.syncLobby(); }
      else if (this.rt) this.rt.clientMsg(pid, m);
    };
    conn.onClose = () => {                       // 先保留位置一段時間，等他重連
      if (pid < 0 || this.conns.get(pid) !== conn) return;
      this.conns.delete(pid);
      this.setAway(pid, true);
    };
  }
  // 房主端：標記玩家暫離 / 回來。暫離期間角色原地無敵待機，逾時才真的移出房間
  setAway(pid, v) {
    const lp = this.lobby.players.find((p) => p.id === pid);
    if (!lp) return;
    if (v) {
      if (!this.awayT.has(pid)) this.awayT.set(pid, setTimeout(() => this.dropPlayer(pid), AWAY_MS));
      if (!lp.away) { lp.away = true; this.note(`${lp.name} 暫時離開（保留位置 ${Math.round(AWAY_MS / 60000 * 10) / 10} 分鐘）`); this.syncLobby(); }
    } else {
      clearTimeout(this.awayT.get(pid)); this.awayT.delete(pid);
      if (lp.away) { lp.away = false; this.note(`${lp.name} 回來了`); this.syncLobby(); }
    }
  }
  dropPlayer(pid) {
    clearTimeout(this.awayT.get(pid)); this.awayT.delete(pid); this.toks.delete(pid);
    const c = this.conns.get(pid);
    if (c) { this.conns.delete(pid); c.onClose = null; c.close(); }
    const lp = this.lobby.players.find((p) => p.id === pid);
    this.lobby.players = this.lobby.players.filter((p) => p.id !== pid);
    if (this.rt) this.rt.world.removePlayer(pid);
    if (lp) this.note(`${lp.name} 離開了房間`);
    this.syncLobby();
  }
  isAway(pid) { const lp = this.lobby.players.find((p) => p.id === pid); return !!(lp && lp.away); }
  note(s) { this.broadcast(JSON.stringify({ t: 'note', s })); this.fire('note', s); }
  // 聊天：客戶端送給房主，房主檢查後轉發給所有人（含自己）。每人 0.7 秒最多一則、最長 60 字
  sendChat(s) {
    s = cleanChat(s);
    if (!s || this.mode === 'solo') return;
    if (this.mode === 'client') { if (this.conn && this.conn.open) this.conn.send(JSON.stringify({ t: 'chat', s })); }
    else this.relayChat(this.myId, s);
  }
  relayChat(pid, s) {
    s = cleanChat(s);
    const t = Date.now(), last = this.chatT.get(pid) || 0;
    if (!s || t - last < 700) return;
    this.chatT.set(pid, t);
    this.broadcast(JSON.stringify({ t: 'chat', id: pid, s })); this.fire('chat', pid, s);
  }
  syncLobby() { this.broadcast(JSON.stringify({ t: 'lobby', lobby: this.lobby })); this.fire('lobby'); }
  // 快照（二進位）不送給暫離中的玩家：凍結的頁面收不了，積太多會把連線塞爆
  broadcast(d) { const bin = typeof d !== 'string'; for (const [pid, c] of this.conns) if (!bin || !this.isAway(pid)) c.send(d); }

  // ── 大廳操作 ──
  updateMe(ready) {
    const me = this.me();
    if (!me) return;
    Object.assign(me, this.myInfo());
    if (ready !== undefined) me.ready = ready;
    if (this.mode === 'client') this.conn.send(JSON.stringify(Object.assign({ t: 'me', ready: me.ready }, this.myInfo())));
    else this.syncLobby();
  }
  select(stage, diff) { if (!this.isHost()) return; this.lobby.sel = { stage, diff }; this.syncLobby(); }
  canLaunch() { return this.isHost() && this.lobby.players.every((p) => p.host || (p.ready && !p.away)); }
  launch() {
    if (!this.canLaunch() || this.rt) return;
    const msg = { t: 'start', stage: this.lobby.sel.stage, diff: this.lobby.sel.diff, seed: (Math.random() * 2e9) | 0, el: stageEl(this.lobby.sel.stage),
      players: this.lobby.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId })) };
    this.broadcast(JSON.stringify(msg));
    const full = Object.assign({}, msg, { players: this.lobby.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId, bonus: p.bonus })) });
    this.rt = new HostRuntime(this, full); this.rt.pub = msg;
    this.fire('start', this.rt, msg);
  }
  backToLobby() {
    this.stopRt();
    if (this.isHost()) { for (const p of this.lobby.players) if (!p.host) p.ready = false; this.lobby.cleared = save.data.cleared; this.broadcast(JSON.stringify({ t: 'back' })); this.syncLobby(); }
    else { const me = this.me(); if (me) me.ready = false; }
    this.fire('lobby');
  }

  // ── 客戶端收到的控制訊息 ──
  clientMsg(m) {
    if (m.t === 'lobby') { this.lobby = m.lobby; if (!this.rt) this.fire('lobby'); }
    else if (m.t === 'note') this.fire('note', m.s);
    else if (m.t === 'chat') this.fire('chat', m.id | 0, cleanChat(m.s));
    else if (m.t === 'hostaway') { if (this.conn) this.conn.grace(AWAY_MS); this.fire('note', '房主切到背景了，畫面若停住請稍候…'); }
    else if (m.t === 'hostfg') { if (this.conn) { this.conn.grace(0); this.conn.probe(); } this.fire('note', '房主回來了'); }
    else if (m.t === 'resume') {                 // 重連後：對局還在進行，補上這段時間錯過的狀態
      if (!this.rt || this.rt.info.seed !== m.start.seed) { this.stopRt(); this.rt = new ClientRuntime(this, m.start); this.fire('start', this.rt, m.start); }
      this.rt.applySync(m.sync);
    }
    else if (m.t === 'start') { this.stopRt(); this.rt = new ClientRuntime(this, m); this.fire('start', this.rt, m); }
    else if (m.t === 'back') { if (this.rt) { this.stopRt(); this.fire('lobby'); } }
    else if (this.rt) this.rt.hostMsg(m);
  }
}

// ───────────────────────── 房主 / 單人 ─────────────────────────
export class HostRuntime {
  constructor(session, msg) {
    this.session = session; this.myId = session.myId; this.info = msg; this.stage = STAGES[msg.stage];
    this.world = new World({ stage: this.stage, diff: msg.diff, seed: msg.seed, players: msg.players, el: msg.el });
    this.view = new View(buildLevel(this.stage, msg.seed), this.myId, 0.028);
    this.acc = 0; this.n = 0; this.evAcc = []; this.sent = {}; this.paused = false; this.ended = false;
    this.onChoices = null; this.onEnd = null; this.onPicked = null; this.lastState = 'play';
    this.last = now();
    this.ticker = makeTicker(() => this.pump());
  }
  pump() {
    const t = now();
    let dt = t - this.last; this.last = t;
    if (this.paused) return;
    this.acc += Math.min(dt, 0.2);
    while (this.acc >= SIM_DT) { this.acc -= SIM_DT; this.tick(); }
  }
  tick() {
    const W = this.world;
    for (const p of W.players) {                 // 暫離中的玩家：原地待機、無敵、敵人不鎖定；升級選項自動選
      if (p.gone || !this.session.isAway(p.id)) continue;
      p.in.mx = p.in.my = 0; p.in.k = 0; p.invuln = Math.max(p.invuln, 0.4); p.stealth = Math.max(p.stealth, 0.4);
      if (W.state === 'levelup' && W.picks && W.picks[p.id] && !W.picks[p.id].done) W.choose(p.id, -1);
    }
    W.step(SIM_DT);
    this.n++;
    while (W.pickLog.length) {                 // 告知每個人自己選到了什麼（含逾時自動選）
      const [pid, opt] = W.pickLog.shift();
      if (pid === this.myId) this.onPicked && this.onPicked(opt);
      else { const c = this.session.conns.get(pid); if (c) c.send(JSON.stringify({ t: 'picked', opt })); }
    }
    const changed = W.state !== this.lastState;
    this.lastState = W.state;
    if (W.state === 'levelup' && !changed && this.n % 12 !== 0) { this.syncChoices(); return; }
    const snap = snapOf(W);
    this.view.push(snap, now());
    for (const e of snap.e) this.evAcc.push(e);
    if (this.n % SNAP_EVERY === 0 || changed) {
      if (this.session.conns.size) this.session.broadcast(encode(snap, this.evAcc));
      this.evAcc = [];
    }
    this.syncChoices();
    if ((W.state === 'won' || W.state === 'lost') && !this.ended) this.finish();
  }
  syncChoices() {
    const W = this.world;
    if (W.state !== 'levelup') { if (this.sent.on) { this.sent = {}; } return; }
    this.sent.on = true;
    const resend = this.n % 180 === 0;      // 每 3 秒對還沒選的人重送一次選項：就算訊息漏接（例如剛好斷線重連），也不會讓全隊卡到逾時
    for (const p of W.players) {
      const pk = W.picks[p.id];
      if (!pk) continue;
      if (resend && !pk.done && p.id !== this.myId) delete this.sent[p.id];
      const key = W.pickSeq + ':' + (pk.seq || 0) + ':' + pk.done;
      if (this.sent[p.id] === key) continue;
      this.sent[p.id] = key;
      const m = { t: 'choices', opts: pk.opts, rerolls: pk.rerolls, done: pk.done, picked: pk.picked || null, reason: W.pickReason, seq: key };
      if (p.id === this.myId) this.onChoices && this.onChoices(m);
      else { const c = this.session.conns.get(p.id); if (c) c.send(JSON.stringify(m)); }
    }
  }
  // 玩家回來 / 重連：把他錯過的東西補給他（對局資訊、場上掉落物、目前的武器被動、升級選項）
  resync(pid) {
    const W = this.world, c = this.session.conns.get(pid), p = W.player(pid);
    if (!c || !p) return;
    const build = p.weapons.map((w) => ({ k: 'w', id: w.def.id, lv: w.level })).concat(Object.keys(p.passives).map((id) => ({ k: 'p', id, lv: p.passives[id] })));
    const pk = []; for (const g of W.pickups.values()) if (!g.to) pk.push([g.id, g.type, g.x | 0, g.y | 0, Math.round(g.v)]);
    c.send(JSON.stringify({ t: 'resume', start: this.pub, sync: { pk, build } }));
    delete this.sent[pid];
    if (this.ended && this.endRes) c.send(JSON.stringify({ t: 'end', res: this.endRes }));
  }
  clientMsg(pid, m) {
    const p = this.world.player(pid);
    if (!p) return;
    if (m.t === 'i') { p.in.mx = +m.x || 0; p.in.my = +m.y || 0; p.in.k = m.k | 0; p.ack = m.s | 0; }
    else if (m.t === 'pick') this.world.choose(pid, m.i | 0);
    else if (m.t === 'reroll') this.world.reroll(pid);
  }
  setInput(mx, my, k) { const p = this.world.player(this.myId); p.in.mx = mx; p.in.my = my; p.in.k = k; }
  update() { /* 房主的模擬由 ticker 推動 */ }
  pick(i) { this.world.choose(this.myId, i); }
  reroll() { this.world.reroll(this.myId); }
  setPaused(v) { if (this.session.mode === 'solo') { this.paused = v; this.last = now(); } }
  finish() {
    this.ended = true;
    const W = this.world;
    const res = { state: W.state, stage: this.info.stage, diff: this.info.diff, time: Math.round(W.time), kills: W.kills, level: W.level, coins: Math.round(W.coins), zones: W.ctl.cleared - 1, el: W.el,
      players: W.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId, dmg: Math.round(p.stats.dmg), kills: p.stats.kills, heal: Math.round(p.stats.heal), taken: Math.round(p.stats.taken), downs: p.stats.downs, gone: p.gone })) };
    this.endRes = res;
    this.session.broadcast(JSON.stringify({ t: 'end', res }));
    this.onEnd && this.onEnd(res);
  }
  stop() { this.ticker.stop(); }
}

// ───────────────────────── 客戶端 ─────────────────────────
export class ClientRuntime {
  constructor(session, msg) {
    this.session = session; this.myId = session.myId; this.info = msg; this.stage = STAGES[msg.stage];
    this.view = new View(buildLevel(this.stage, msg.seed), this.myId, 0.12);
    this.pred = this.view.pred = { x: 0, y: 0, ex: 0, ey: 0, init: false };
    this.hist = []; this.seq = 0; this.acc = 0; this.in = { mx: 0, my: 0, k: 0 };
    this.onChoices = null; this.onEnd = null; this.onPicked = null; this.paused = false;
  }
  onSnapshot(buf) {
    const s = decode(buf);
    this.view.push(s, now());
    const me = s.p.find((p) => p.id === this.myId), pr = this.pred;
    if (!me) return;
    const ox = pr.x + pr.ex, oy = pr.y + pr.ey;
    pr.x = me.x; pr.y = me.y;
    if (!(me.fl & (1 | 8 | 16)) && s.st === 0) for (const h of this.hist) if (h.s > me.ack) moveBody(this.view.L, pr, h.dx, h.dy, 11);
    if (pr.init) { pr.ex = ox - pr.x; pr.ey = oy - pr.y; if (Math.hypot(pr.ex, pr.ey) > 280) pr.ex = pr.ey = 0; }      // 衝刺時一格快照就能差到 100 多像素：門檻放寬，用平滑追上而不是瞬移
    pr.init = true;
  }
  applySync(sync) {
    const v = this.view;
    v.buf = []; v.offset = null; v.pickups.clear(); this.hist = []; this.pred.init = false;
    for (const [id, type, x, y, val] of sync.pk) v.pickups.set(id, { id, type, x, y, v: val, to: -1, sp: 0, born: v.rt });
    this.onSync && this.onSync(sync.build);
  }
  hostMsg(m) {
    if (m.t === 'choices') this.onChoices && this.onChoices(m);
    else if (m.t === 'picked') this.onPicked && this.onPicked(m.opt);
    else if (m.t === 'end') this.onEnd && this.onEnd(m.res);
  }
  setInput(mx, my, k) { this.in.mx = mx; this.in.my = my; this.in.k = k; }
  update(dt) {
    const pr = this.pred, f = Math.pow(0.8, dt * 60);
    pr.ex *= f; pr.ey *= f;
    this.acc += Math.min(dt, 0.2);
    while (this.acc >= SIM_DT) {
      this.acc -= SIM_DT; this.seq++;
      const last = this.view.last, me = last && last.p.find((p) => p.id === this.myId);
      let dx = 0, dy = 0;
      if (me && last.st === 0 && !(me.fl & (1 | 8 | 16))) {
        let { mx, my } = this.in; const l = Math.hypot(mx, my);
        if (l > 1) { mx /= l; my /= l; }
        const bx = pr.x, by = pr.y, wd = last.L && last.L.w;
        if (l > 0.1 && !(me.fl & 128)) moveBody(this.view.L, pr, mx * me.spd * SIM_DT, my * me.spd * SIM_DT, 11);      // 128 = 被蜘蛛絲定住
        if (wd && wd[2] === 2 && !(me.fl & 64)) moveBody(this.view.L, pr, wd[0] * SIM_DT, wd[1] * SIM_DT, 11);      // 陣風也要一起預測，畫面才不會抖
        dx = pr.x - bx; dy = pr.y - by;
      }
      this.hist.push({ s: this.seq, dx, dy });
      if (this.hist.length > 240) this.hist.shift();
      if (this.seq % 2 === 0 && this.session.conn) this.session.conn.send(JSON.stringify({ t: 'i', s: this.seq, x: Math.round(this.in.mx * 100) / 100, y: Math.round(this.in.my * 100) / 100, k: this.in.k }));
    }
  }
  pick(i) { if (this.session.conn) this.session.conn.send(JSON.stringify({ t: 'pick', i })); }
  reroll() { if (this.session.conn) this.session.conn.send(JSON.stringify({ t: 'reroll' })); }
  setPaused() {}
  stop() {}
}
export { NET_KIND };
