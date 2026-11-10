// 連線傳輸層。對上層只提供：
//   openHost(code)  → { onConn(cb), close() }
//   connect(code)   → conn
//   conn = { send(strOrArrayBuffer), onData, onClose, close() }
//
// 預設使用 PeerJS (WebRTC P2P，房主當主機)。網址參數：
//   ?net=local                同一台電腦不同分頁用 BroadcastChannel 連線（開發 / 測試用）
//   ?peerhost=..&peerport=..  使用自架的 PeerServer 訊號伺服器（預設用 PeerJS 公用雲端）
const qs = new URLSearchParams(location.search);
export const NET_KIND = qs.get('net') === 'local' ? 'local' : 'peer';
const PREFIX = 'untag-sv3-';

function peerOpts() {
  const o = { debug: 1 };
  if (qs.get('peerhost')) { o.host = qs.get('peerhost'); o.port = +(qs.get('peerport') || 9000); o.path = qs.get('peerpath') || '/'; o.secure = qs.get('peersecure') === '1'; }
  return o;
}
// WebRTC 偵測對方離線很慢（可能 30 秒以上），所以傳輸層自己做心跳：
// 每 1.5 秒送一個 ping，超過 10 秒完全沒收到任何資料就視為斷線。
// 心跳用 Web Worker 計時：分頁切到背景時主執行緒的計時器會被瀏覽器降速，Worker 不會，才不會誤判斷線。
const PING = '\u0001';
const beats = new Set();
let beatStarted = false;
function onBeat(fn) {
  beats.add(fn);
  if (beatStarted) return;
  beatStarted = true;
  const tick = () => { for (const f of beats) f(); };
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),1500);'], { type: 'text/javascript' }))); w.onmessage = tick; }
  catch (e) { setInterval(tick, 1500); }
}
function wrapPeerConn(c) {
  let lastRecv = performance.now();
  const conn = { onData: null, onClose: null, open: true,
    send(d) { if (c.open) { try { c.send(d); } catch (e) { /* 連線中斷時丟棄 */ } } },
    close() { closed(true); try { c.close(); } catch (e) { /* noop */ } } };
  function closed(silent) { if (!conn.open) return; conn.open = false; beats.delete(hb); removeEventListener('pagehide', bye); if (!silent && conn.onClose) conn.onClose(); }
  const bye = () => { try { c.close(); } catch (e) { /* noop */ } };
  const hb = () => { if (performance.now() - lastRecv > 10000) { closed(); bye(); } else conn.send(PING); };
  onBeat(hb);
  addEventListener('pagehide', bye);
  c.on('data', (d) => {
    lastRecv = performance.now();
    if (d === PING) return;
    if (d instanceof Blob) d.arrayBuffer().then((buf) => conn.onData && conn.onData(buf));
    else conn.onData && conn.onData(d.buffer && !(d instanceof ArrayBuffer) ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d);
  });
  c.on('close', () => closed()); c.on('error', () => closed());
  return conn;
}

function peerHost(code) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(PREFIX + code, peerOpts());
    const host = { onConn: null, close() { peer.destroy(); } };
    let opened = false, retries = 0;
    peer.on('open', () => { opened = true; retries = 0; resolve(host); });
    peer.on('connection', (c) => c.on('open', () => host.onConn && host.onConn(wrapPeerConn(c))));
    peer.on('error', (e) => { if (opened) return; peer.destroy(); reject(e.type === 'unavailable-id' ? new Error('TAKEN') : new Error('無法連上連線伺服器：' + (e.type || e.message))); });
    // 訊號伺服器斷線不影響已連上的玩家，只是暫時無法讓新玩家加入；有限次數重連
    peer.on('disconnected', () => { if (opened && !peer.destroyed && retries++ < 8) setTimeout(() => { try { peer.reconnect(); } catch (e) { /* noop */ } }, 1500 * retries); });
  });
}
function peerJoin(code) {
  return new Promise((resolve, reject) => {
    const peer = new window.Peer(peerOpts());
    const to = setTimeout(() => { peer.destroy(); reject(new Error('連線逾時，請確認房號或換個網路環境再試')); }, 15000);
    peer.on('open', () => {
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'raw' });
      c.on('open', () => { clearTimeout(to); const conn = wrapPeerConn(c); const close = conn.close; conn.close = () => { close(); peer.destroy(); }; resolve(conn); });
    });
    peer.on('error', (e) => { clearTimeout(to); peer.destroy(); reject(new Error(e.type === 'peer-unavailable' ? '找不到這個房間' : '連線失敗：' + (e.type || e.message))); });
  });
}

// ── BroadcastChannel（同機多分頁） ──
function bcConn(ch, me, other) {
  const conn = { onData: null, onClose: null, open: true,
    send(d) { if (conn.open) ch.postMessage({ to: other, from: me, d }); },
    close() { if (conn.open) { ch.postMessage({ to: other, from: me, bye: 1 }); conn.open = false; } } };
  return conn;
}
function bcHost(code) {
  const ch = new BroadcastChannel(PREFIX + code), conns = new Map();
  const host = { onConn: null, close() { for (const c of conns.values()) c.close(); ch.close(); } };
  ch.onmessage = (m) => {
    const v = m.data;
    if (v.to !== 'host') return;
    if (v.join) { const c = bcConn(ch, 'host', v.from); conns.set(v.from, c); ch.postMessage({ to: v.from, from: 'host', ok: 1 }); host.onConn && host.onConn(c); return; }
    const c = conns.get(v.from);
    if (!c) return;
    if (v.bye) { c.open = false; conns.delete(v.from); c.onClose && c.onClose(); } else c.onData && c.onData(v.d);
  };
  addEventListener('pagehide', () => host.close());
  return Promise.resolve(host);
}
function bcJoin(code) {
  return new Promise((resolve, reject) => {
    const ch = new BroadcastChannel(PREFIX + code), me = 'c' + Math.random().toString(36).slice(2, 9);
    let conn = null;
    const to = setTimeout(() => { ch.close(); reject(new Error('找不到這個房間')); }, 1500);
    ch.onmessage = (m) => {
      const v = m.data;
      if (v.to !== me) return;
      if (v.ok) { clearTimeout(to); conn = bcConn(ch, me, 'host'); resolve(conn); return; }
      if (!conn) return;
      if (v.bye) { conn.open = false; conn.onClose && conn.onClose(); } else conn.onData && conn.onData(v.d);
    };
    ch.postMessage({ to: 'host', from: me, join: 1 });
    addEventListener('pagehide', () => conn && conn.close());
  });
}

export const openHost = (code) => (NET_KIND === 'local' ? bcHost(code) : peerHost(code));
export const connect = (code) => (NET_KIND === 'local' ? bcJoin(code) : peerJoin(code));
export const makeCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
