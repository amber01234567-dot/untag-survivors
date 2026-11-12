// 主選單 LOGO 的火焰：從文字筆畫上冒出火焰粒子（Canvas 疊在文字後面，加色混合）。
let raf = 0;
export function startLogoFire(root) {
  cancelAnimationFrame(raf);
  const cv = root.querySelector('.logo canvas.flames'), span = root.querySelector('.logo span');
  if (!cv || !span) return;
  const g = cv.getContext('2d'), parts = [];
  let pts = [], W = 0, H = 0, pad = 0, fs = 0, last = performance.now();
  // 火焰貼圖（柔邊圓）
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  { const d = dot.getContext('2d'), gr = d.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); d.fillStyle = gr; d.fillRect(0, 0, 64, 64); }
  const tint = (col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const d = c.getContext('2d'); d.drawImage(dot, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = col; d.fillRect(0, 0, 64, 64); return c; };
  const SPR = [tint('#fff3b0'), tint('#ffc23d'), tint('#ff7a1a'), tint('#e0260e'), tint('#5a0c06')];
  function layout() {
    const r = span.getBoundingClientRect();
    if (r.width < 10) return false;
    fs = parseFloat(getComputedStyle(span).fontSize); pad = Math.round(fs * 0.9);
    W = Math.round(r.width + pad); H = Math.round(r.height + pad);
    cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.style.left = -pad / 2 + 'px'; cv.style.top = -pad + 'px';
    // 取樣文字筆畫的位置當火源
    const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'), cs = getComputedStyle(span);
    mg.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`; mg.textBaseline = 'alphabetic'; mg.letterSpacing = cs.letterSpacing; mg.fillStyle = '#fff';
    mg.fillText(span.textContent, pad / 2, pad + r.height * 0.86);
    const d = mg.getImageData(0, 0, W, H).data; pts = [];
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 128) { const top = y < 3 || d[((y - 3) * W + x) * 4 + 3] < 128; pts.push([x, y, top]); if (top) pts.push([x, y, top], [x, y, top]); }
    return pts.length > 0;
  }
  function tick(t) {
    if (!cv.isConnected) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (!pts.length || Math.abs(span.getBoundingClientRect().width + pad - W) > 2) { if (!layout()) return; }
    const n = Math.min(14, Math.ceil(pts.length / 260));
    for (let i = 0; i < n && parts.length < 520; i++) { const p = pts[(Math.random() * pts.length) | 0]; parts.push({ x: p[0] + (Math.random() - 0.5) * 6, y: p[1], vx: (Math.random() - 0.5) * 16, vy: -(30 + Math.random() * 70) * (p[2] ? 1.25 : 0.7), life: 0, max: 0.5 + Math.random() * 0.75, s: fs * (0.1 + Math.random() * 0.14), ph: Math.random() * 6 }); }
    g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life += dt;
      if (p.life >= p.max) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      const k = p.life / p.max;
      p.x += (p.vx + Math.sin(t / 260 + p.ph) * 22) * dt; p.y += p.vy * dt; p.vy -= 60 * dt;
      const s = p.s * (1 - k * 0.6), im = SPR[Math.min(4, (k * 5) | 0)];
      g.globalAlpha = (k < 0.15 ? k / 0.15 : 1 - k) * 0.5;
      g.drawImage(im, p.x - s, p.y - s * 1.3, s * 2, s * 2.6);
    }
    g.globalAlpha = 1;
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { layout(); raf = requestAnimationFrame(tick); });
}
