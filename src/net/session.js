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
import { save } from '../core/save.js';

const now = () => performance.now() / 1000;

function makeTicker(fn, hz = 60) {
  try {
    const w = new Worker(URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${1000 / hz});`], { type: 'text/javascript' })));
    w.onmessage = fn;
    return { stop() { w.terminate(); } };
  } catch (e) { const id = setInterval(fn, 1000 / hz); return { stop() { clearInterval(id); } }; }
}

export class Session {
  constructor() {
    this.mode = 'solo'; this.myId = 0; this.code = null; this.host = null; this.conn = null;
    this.conns = new Map();
    this.lobby = { players: [], sel: { stage: '1-1', diff: 0 }, cleared: {} };
    this.rt = null; this.handlers = {};
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
    this.mode = 'client'; this.code = code.toUpperCase(); this.conn = conn;
    await new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('房主沒有回應')), 8000);
      conn.onData = (d) => {
        if (typeof d !== 'string') { if (this.rt) this.rt.onSnapshot(d); return; }
        const m = JSON.parse(d);
        if (m.t === 'welcome') { clearTimeout(to); this.myId = m.id; this.lobby = m.lobby; resolve(); this.fire('lobby'); }
        else if (m.t === 'reject') { clearTimeout(to); this.mode = 'solo'; this.conn = null; conn.close(); reject(new Error(m.why)); }
        else this.clientMsg(m);
      };
      conn.onClose = () => { if (this.mode === 'client') { this.stopRt(); this.fire('dropped', '與房主的連線中斷了'); this.mode = 'solo'; this.conn = null; } };
      conn.send(JSON.stringify(Object.assign({ t: 'hello', v: PROTO }, this.myInfo())));
    });
  }
  leave() {
    this.stopRt();
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
        const why = m.v !== PROTO ? '遊戲版本不同，請雙方重新整理頁面' : this.rt ? '這個房間正在遊戲中，請等他們回到大廳' : this.lobby.players.length >= MAX_PLAYERS ? '房間已滿' : null;
        if (why) { conn.send(JSON.stringify({ t: 'reject', why })); setTimeout(() => conn.close(), 300); return; }
        pid = [1, 2, 3].find((i) => !this.lobby.players.some((p) => p.id === i));
        this.conns.set(pid, conn);
        this.lobby.players.push({ id: pid, name: String(m.name || '玩家').slice(0, 12), charId: m.charId, bonus: m.bonus, rank: m.rank | 0, ready: false });
        conn.send(JSON.stringify({ t: 'welcome', id: pid, lobby: this.lobby }));
        this.syncLobby();
        return;
      }
      if (pid < 0) return;
      const lp = this.lobby.players.find((p) => p.id === pid);
      if (m.t === 'me' && lp && !this.rt) { lp.charId = m.charId; lp.bonus = m.bonus; lp.rank = m.rank | 0; lp.ready = !!m.ready; lp.name = String(m.name || lp.name).slice(0, 12); this.syncLobby(); }
      else if (this.rt) this.rt.clientMsg(pid, m);
    };
    conn.onClose = () => {
      if (pid < 0) return;
      this.conns.delete(pid);
      this.lobby.players = this.lobby.players.filter((p) => p.id !== pid);
      if (this.rt) this.rt.world.removePlayer(pid);
      this.syncLobby();
    };
  }
  syncLobby() { this.broadcast(JSON.stringify({ t: 'lobby', lobby: this.lobby })); this.fire('lobby'); }
  broadcast(d) { for (const c of this.conns.values()) c.send(d); }

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
  canLaunch() { return this.isHost() && this.lobby.players.every((p) => p.host || p.ready); }
  launch() {
    if (!this.canLaunch() || this.rt) return;
    const msg = { t: 'start', stage: this.lobby.sel.stage, diff: this.lobby.sel.diff, seed: (Math.random() * 2e9) | 0,
      players: this.lobby.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId })) };
    this.broadcast(JSON.stringify(msg));
    const full = Object.assign({}, msg, { players: this.lobby.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId, bonus: p.bonus })) });
    this.rt = new HostRuntime(this, full);
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
    else if (m.t === 'start') { this.stopRt(); this.rt = new ClientRuntime(this, m); this.fire('start', this.rt, m); }
    else if (m.t === 'back') { this.stopRt(); this.fire('lobby'); }
    else if (this.rt) this.rt.hostMsg(m);
  }
}

// ───────────────────────── 房主 / 單人 ─────────────────────────
export class HostRuntime {
  constructor(session, msg) {
    this.session = session; this.myId = session.myId; this.info = msg; this.stage = STAGES[msg.stage];
    this.world = new World({ stage: this.stage, diff: msg.diff, seed: msg.seed, players: msg.players });
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
    for (const p of W.players) {
      const pk = W.picks[p.id];
      if (!pk) continue;
      const key = W.pickSeq + ':' + (pk.seq || 0) + ':' + pk.done;
      if (this.sent[p.id] === key) continue;
      this.sent[p.id] = key;
      const m = { t: 'choices', opts: pk.opts, rerolls: pk.rerolls, done: pk.done, picked: pk.picked || null, reason: W.pickReason, seq: key };
      if (p.id === this.myId) this.onChoices && this.onChoices(m);
      else { const c = this.session.conns.get(p.id); if (c) c.send(JSON.stringify(m)); }
    }
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
    const res = { state: W.state, stage: this.info.stage, diff: this.info.diff, time: Math.round(W.time), kills: W.kills, level: W.level, coins: Math.round(W.coins), zones: W.ctl.cleared - 1,
      players: W.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId, dmg: Math.round(p.stats.dmg), kills: p.stats.kills, heal: Math.round(p.stats.heal), taken: Math.round(p.stats.taken), downs: p.stats.downs, gone: p.gone })) };
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
    if (pr.init) { pr.ex = ox - pr.x; pr.ey = oy - pr.y; if (Math.hypot(pr.ex, pr.ey) > 140) pr.ex = pr.ey = 0; }
    pr.init = true;
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
        if (l > 0.1) { const bx = pr.x, by = pr.y; moveBody(this.view.L, pr, mx * me.spd * SIM_DT, my * me.spd * SIM_DT, 11); dx = pr.x - bx; dy = pr.y - by; }
      }
      this.hist.push({ s: this.seq, dx, dy });
      if (this.hist.length > 240) this.hist.shift();
      if (this.seq % 2 === 0) this.session.conn.send(JSON.stringify({ t: 'i', s: this.seq, x: Math.round(this.in.mx * 100) / 100, y: Math.round(this.in.my * 100) / 100, k: this.in.k }));
    }
  }
  pick(i) { this.session.conn.send(JSON.stringify({ t: 'pick', i })); }
  reroll() { this.session.conn.send(JSON.stringify({ t: 'reroll' })); }
  setPaused() {}
  stop() {}
}
export { NET_KIND };
