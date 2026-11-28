// 連線實測：同一個瀏覽器開 N 個分頁，用 ?net=local（BroadcastChannel）真的組隊打一關，機器人操作。
// 量測：錯誤訊息、每個分頁的畫面更新時間、房主模擬耗時、快照大小與間隔、客戶端位置預測誤差、房主與客戶端的狀態是否一致。
// 用法：node tools/nettest.cjs <stage> <人數> [秒數=150] [lag毫秒=0] [角色,角色,...]
//   先啟動 node tools/serve.mjs 8080
const { chromium } = require('playwright');
const [stage = '1-1', nStr = '2', secStr = '150', lagStr = '0', charStr = 'feijie,laoliu,tingge,nongfu'] = process.argv.slice(2);
const N = +nStr, SEC = +secStr, LAG = +lagStr, CHARS = charStr.split(',');
const URL = `http://localhost:8080/?dev=1&net=local${LAG ? '&lag=' + LAG : ''}`;

// 在每個分頁裡執行：掛上量測
function instrument() {
  const app = window.__app, M = window.__M = { frames: 0, dts: [], draw: [], tick: [], snapN: 0, snapBytes: 0, snapMax: 0, snapGap: [], pred: [], lastSnap: 0, sent: 0, sentBytes: 0, predEv: [], lastSt: 1 };
  let last = performance.now();
  const raf = (t) => { requestAnimationFrame(raf); const dt = t - last; last = t; if (app.rt) { M.frames++; M.dts.push(dt); } };
  requestAnimationFrame(raf);
  setInterval(() => {
    const r = app.renderer, rt = app.rt;
    if (r && !r.__w) { r.__w = 1; const d = r.draw.bind(r); r.draw = (f, dt) => { const t0 = performance.now(); d(f, dt); M.draw.push(performance.now() - t0); }; }
    if (rt && !rt.__w) {
      rt.__w = 1;
      if (rt.world) { const tk = rt.tick.bind(rt); rt.tick = () => { const t0 = performance.now(); tk(); M.tick.push(performance.now() - t0); }; }
      else { const os = rt.onSnapshot.bind(rt); rt.onSnapshot = (buf) => { const n = performance.now(); if (M.lastSnap) M.snapGap.push(n - M.lastSnap); M.lastSnap = n; M.snapN++; M.snapBytes += buf.byteLength; M.snapMax = Math.max(M.snapMax, buf.byteLength); const before = M.lastSt; os(buf); const ls = rt.view.last, me = ls && ls.p.find((q) => q.id === rt.myId); M.lastSt = ls ? ls.st : 1; if (M.lastSt !== 0 || before !== 0) M.snapGap.pop(); const pe = Math.hypot(rt.pred.ex, rt.pred.ey); if (M.lastSt === 0) M.pred.push(pe); if (pe > 50 && M.lastSt === 0 && M.predEv.length < 12) M.predEv.push({ e: Math.round(pe), fl: me ? me.fl : -1, t: +(ls.t || 0).toFixed(1), prevSt: before, spd: me && me.spd, wind: ls.L && ls.L.w ? 1 : 0, hist: rt.hist.length, ackLag: me ? rt.seq - me.ack : -1 }); }; }
    }
  }, 200);
  const ses = app.session, bc = ses.broadcast.bind(ses);
  ses.broadcast = (d) => { if (typeof d !== 'string') { M.sent++; M.sentBytes += d.byteLength * ses.conns.size; } bc(d); };
  // 升級卡：定時按 1
  setInterval(() => { if (app.rt) dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1', key: '1' })); }, 700);
}
// 房主分頁：機器人算出每個人的方向，透過另一條頻道發給各分頁（各分頁再當成自己的鍵盤輸入送回房主）
async function hostBot() {
  const { botStep } = await import('/tools/bot.mjs');
  const app = window.__app, ch = new BroadcastChannel('nettest-bot'), st = { nav: null, navKey: '', minHp: 1 };
  let tick = 0, mine = { mx: 0, my: 0, k: 0 }, lvT = 0;
  window.__LV = [];
  app.input.read = () => mine;
  setInterval(() => {
    const rt = app.rt, W = rt && rt.world;
    if (W) { if (W.state === 'levelup' && !lvT) lvT = performance.now(); if (W.state !== 'levelup' && lvT) { window.__LV.push(Math.round(performance.now() - lvT)); lvT = 0; } }
    if (!W || W.state !== 'play') return;
    tick += 3; const dirs = {};
    try { botStep(W, st, tick, (p, mx, my, k) => { dirs[p.id] = { mx: Math.round(mx * 100) / 100, my: Math.round(my * 100) / 100, k }; }); } catch (e) { window.__botErr = e.message; }
    for (const p of W.players) { if (!dirs[p.id]) dirs[p.id] = { mx: 0, my: 0, k: 0 }; if (!p.down && p.hp < p.st.maxHp * 0.6) p.hp = p.st.maxHp; }      // 測試要跑完整關：血太低就補滿（倒地、復活另外測）
    mine = dirs[rt.myId] || mine;
    ch.postMessage(dirs);
  }, 50);
}
function clientBot() {
  const app = window.__app, ch = new BroadcastChannel('nettest-bot');
  let mine = { mx: 0, my: 0, k: 0 };
  app.input.read = () => mine;
  ch.onmessage = (m) => { const d = m.data[app.session.myId]; if (d) mine = d; };
}
// 取樣：回傳後清空
function sample() {
  const app = window.__app, M = window.__M, rt = app.rt, st = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return { avg: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1), n: a.length }; };
  const out = { frames: M.frames, dt: st(M.dts), slow33: M.dts.filter((d) => d > 33.4).length, slow50: M.dts.filter((d) => d > 50).length, draw: st(M.draw), tick: st(M.tick), snapN: M.snapN, snapBytes: M.snapBytes, snapMax: M.snapMax, snapGap: st(M.snapGap), pred: st(M.pred), sent: M.sent, sentBytes: M.sentBytes, botErr: window.__botErr || null, predEv: M.predEv.splice(0), lv: window.__LV ? window.__LV.splice(0) : [] };
  M.frames = 0; M.dts = []; M.draw = []; M.tick = []; M.snapN = 0; M.snapBytes = 0; M.snapMax = 0; M.snapGap = []; M.pred = []; M.sent = 0; M.sentBytes = 0;
  if (rt && rt.world) { const W = rt.world; out.host = { t: +W.time.toFixed(1), state: W.state, lv: W.level, en: W.enemies.filter((e) => !e.dead).length, pr: W.projs.length, zn: W.zones.length, cleared: W.ctl.cleared, p: W.players.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), hp: Math.ceil(p.hp), down: p.down ? 1 : 0 })) }; }
  const f = app.frame;
  if (f && f.hud) out.view = { t: +f.hud.t.toFixed(1), st: f.hud.st, lv: f.hud.lv, en: f.enemies.length, p: f.players.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), hp: p.hp, down: p.fl & 1 })) };
  out.result = !!document.querySelector('.result, #result.show, .resultbox') || (app.hud && !!app.hud.resultShown);
  out.screen = app.screens.cur || '';
  const hd = app.hud; out.hud = { mode: hd.mode, ch: hd.choices ? { done: hd.choices.done, seq: hd.choices.seq, n: hd.choices.opts && hd.choices.opts.length } : null, modal: document.getElementById('modal').className + '|' + (document.getElementById('modal').innerText || '').slice(0, 14) };
  if (rt && rt.world && rt.world.state === 'levelup') { const W = rt.world; out.lvdbg = { since: W.pickT, seq: W.pickSeq, picks: Object.fromEntries(Object.entries(W.picks || {}).map(([k, v]) => [k, v.done ? 1 : 0])), away: W.players.map((p) => app.session.isAway(p.id) ? 1 : 0), sent: JSON.stringify(rt.sent) }; }
  return out;
}

(async () => {
  const b = await chromium.launch({ args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const errs = [], pages = [];
  for (let i = 0; i < N; i++) {
    const p = await ctx.newPage(); pages.push(p);
    await p.route(/fonts\.(googleapis|gstatic)\.com|unpkg|peerjs/, (r) => r.abort());
    p.on('pageerror', (e) => errs.push(`P${i} ${e.message} @ ${(e.stack || '').split('\n').slice(1, 4).map((l) => l.trim().replace(/http:\/\/localhost:8080/, '')).join(' < ')}`));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push(`P${i} console: ${m.text().slice(0, 200)}`); });
    await p.goto(URL); await p.waitForFunction(() => window.__app && window.__app.screens && window.__app.screens.cur === 'home', null, { timeout: 30000 });
    await p.evaluate(async ([c, i]) => { const { save } = await import('/src/core/save.js'); save.data.char = c; save.data.name = 'BOT' + i; }, [CHARS[i % CHARS.length], i]);
    await p.evaluate(instrument);
  }
  const code = await pages[0].evaluate(async (stage) => { const s = window.__app.session; await s.startHost(); s.select(stage, 0); return s.code; }, stage);
  for (let i = 1; i < N; i++) await pages[i].evaluate(async (code) => { const s = window.__app.session; await s.join(code); s.updateMe(true); }, code);
  await pages[0].waitForFunction((n) => { const s = window.__app.session; return s.lobby.players.length === n && s.canLaunch(); }, N, { timeout: 15000 });
  await pages[0].evaluate(hostBot);
  for (let i = 1; i < N; i++) await pages[i].evaluate(clientBot);
  await pages[0].evaluate(() => window.__app.session.launch());
  await pages[0].waitForTimeout(3000);
  for (const p of pages) await p.evaluate(sample);            // 清掉載入期間的資料
  const T0 = Date.now(), agg = pages.map(() => ({ frames: 0, slow33: 0, slow50: 0, dtMax: 0, drawSum: 0, drawN: 0, drawMax: 0, tickSum: 0, tickN: 0, tickMax: 0, tickP95: 0, snapN: 0, snapBytes: 0, snapMax: 0, gapMax: 0, gapP95: 0, predMax: 0, predSum: 0, predN: 0, posErrMax: 0, posErrSum: 0, posErrN: 0, enDiffMax: 0, lvMismatch: 0 }));
  let final = null, peak = { en: 0, pr: 0, zn: 0 }, botErr = null, sentBytes = 0, predEv = [], lvWait = [], dropInfo = null, stalls = [];
  const DROP = +(process.env.DROP || 0);
  while (Date.now() - T0 < SEC * 1000) {
    await pages[0].waitForTimeout(2000);
    if (DROP && !dropInfo && N > 1 && Date.now() - T0 > DROP * 1000) {      // 斷線重連測試：客戶端 1 的連線直接切斷，看多久接回來
      const t0 = Date.now(); await pages[1].evaluate(() => { const s = window.__app.session, c = s.conn; window.__notes = []; const of = s.handlers.note; s.handlers.note = (x) => { window.__notes.push(x); of && of(x); }; c.close(); s.lost(); });
      let back = -1; for (let k = 0; k < 40; k++) { await pages[1].waitForTimeout(500); const ok = await pages[1].evaluate(() => { const s = window.__app.session; return !!(s.conn && s.conn.open && !s.reconnecting && window.__app.rt && window.__M.snapN > 0); }); if (ok) { back = Date.now() - t0; break; } await pages[1].evaluate(() => { window.__M.snapN = 0; }); }
      dropInfo = { backMs: back, notes: await pages[1].evaluate(() => window.__notes), stillInGame: await pages[1].evaluate(() => !!window.__app.rt) };
    }
    const S = await Promise.all(pages.map((p) => p.evaluate(sample).catch((e) => ({ err: e.message }))));
    const h = S[0].host;
    if (S[0].lvdbg && S[0].lvdbg.since < 19 && stalls.length < 6) stalls.push({ host: S[0].lvdbg, huds: S.map((x) => x.hud) });
    S.forEach((s, i) => {
      const a = agg[i]; if (s.err) { errs.push(`P${i} sample: ${s.err}`); return; }
      a.frames += s.frames; a.slow33 += s.slow33; a.slow50 += s.slow50; if (s.dt) a.dtMax = Math.max(a.dtMax, s.dt.max);
      if (s.draw) { a.drawSum += s.draw.avg * s.draw.n; a.drawN += s.draw.n; a.drawMax = Math.max(a.drawMax, s.draw.max); }
      if (s.tick) { a.tickSum += s.tick.avg * s.tick.n; a.tickN += s.tick.n; a.tickMax = Math.max(a.tickMax, s.tick.max); a.tickP95 = Math.max(a.tickP95, s.tick.p95); }
      a.snapN += s.snapN; a.snapBytes += s.snapBytes; a.snapMax = Math.max(a.snapMax, s.snapMax); if (s.snapGap) { a.gapMax = Math.max(a.gapMax, s.snapGap.max); a.gapP95 = Math.max(a.gapP95, s.snapGap.p95); }
      if (s.pred) { a.predMax = Math.max(a.predMax, s.pred.max); a.predSum += s.pred.avg * s.pred.n; a.predN += s.pred.n; }
      if (i && h && s.view && h.state === 'play') {
        const hp = h.p.find((q) => q.id === i), me = s.view.p.find((q) => q.id === i);
        if (hp && me && !hp.down) { const d = Math.hypot(hp.x - me.x, hp.y - me.y); a.posErrMax = Math.max(a.posErrMax, d); a.posErrSum += d; a.posErrN++; }
        a.enDiffMax = Math.max(a.enDiffMax, Math.abs(h.en - s.view.en)); if (Math.abs(h.lv - s.view.lv) > 1) a.lvMismatch++;
      }
      if (s.botErr) botErr = s.botErr; sentBytes += s.sentBytes || 0; for (const e of s.predEv || []) if (predEv.length < 14) predEv.push(Object.assign({ p: i }, e)); for (const v of s.lv || []) lvWait.push(v);
    });
    if (h) { final = h; peak.en = Math.max(peak.en, h.en); peak.pr = Math.max(peak.pr, h.pr); peak.zn = Math.max(peak.zn, h.zn); if (h.state === 'won' || h.state === 'lost') { await pages[0].waitForTimeout(2500); break; } }
    else if (S[0].screen === 'lobby') break;
  }
  const el = (Date.now() - T0) / 1000;
  const ended = await Promise.all(pages.map((p) => p.evaluate(() => ({ res: !!(document.querySelector('.result') || document.querySelector('[data-a="again"]') || document.querySelector('[data-a="tolobby"]')), txt: (document.querySelector('#hud') || document.body).innerText.includes('結算') || document.body.innerText.includes('通關') || document.body.innerText.includes('失敗') })).catch(() => null)));
  const R = { stage, players: N, lag: LAG, seconds: Math.round(el), end: final && { state: final.state, t: final.t, lv: final.lv, cleared: final.cleared }, peak, hostKBps: +(sentBytes / el / 1024).toFixed(1), botErr, lvWait: lvWait.length ? { n: lvWait.length, avg: Math.round(lvWait.reduce((a, b) => a + b, 0) / lvWait.length), max: Math.max(...lvWait), over5s: lvWait.filter((v) => v > 5000).length } : null, predEv, dropInfo, stalls, errors: [...new Set(errs)].slice(0, 12), errorCount: errs.length, resultShown: ended.map((e) => e && (e.res || e.txt)),
    pages: agg.map((a, i) => ({ role: i ? 'client' + i : 'host', fps: +(a.frames / el).toFixed(1), slow33pct: +(a.slow33 / Math.max(1, a.frames) * 100).toFixed(2), slow50: a.slow50, frameMax: a.dtMax, drawAvg: +(a.drawSum / Math.max(1, a.drawN)).toFixed(2), drawMax: a.drawMax,
      ...(i ? { snapPerSec: +(a.snapN / el).toFixed(1), snapKBps: +(a.snapBytes / el / 1024).toFixed(1), snapMaxBytes: a.snapMax, gapP95: a.gapP95, gapMax: a.gapMax, predAvg: +(a.predSum / Math.max(1, a.predN)).toFixed(1), predMax: +a.predMax.toFixed(0), posErrAvg: +(a.posErrSum / Math.max(1, a.posErrN)).toFixed(0), posErrMax: +a.posErrMax.toFixed(0), enDiffMax: a.enDiffMax, lvMismatch: a.lvMismatch }
        : { tickAvg: +(a.tickSum / Math.max(1, a.tickN)).toFixed(2), tickP95: a.tickP95, tickMax: a.tickMax }) })) };
  console.log(JSON.stringify(R));
  await b.close();
})().catch((e) => { console.log(JSON.stringify({ stage, players: N, fatal: e.message })); process.exit(1); });
