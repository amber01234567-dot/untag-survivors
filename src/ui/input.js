// 鍵盤 + 觸控輸入 → { mx, my, k }   k: bit0 技能  bit1 寶具
export class Input {
  constructor() {
    this.keys = new Set(); this.touch = { mx: 0, my: 0, id: null, ox: 0, oy: 0 }; this.btn = 0; this.enabled = false;
    this.onPause = null;
    addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' && this.enabled && this.onPause) this.onPause();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.btn = 0; });
    this.stick = document.getElementById('stick'); this.knob = document.getElementById('knob');
    const el = document.getElementById('game');
    el.addEventListener('touchstart', (e) => this.tstart(e), { passive: false });
    addEventListener('touchmove', (e) => this.tmove(e), { passive: false });
    addEventListener('touchend', (e) => this.tend(e)); addEventListener('touchcancel', (e) => this.tend(e));
  }
  tstart(e) {
    if (!this.enabled) return;
    document.body.classList.add('touch');
    e.preventDefault();
    const t = e.changedTouches[0];
    if (this.touch.id !== null) return;
    this.touch.id = t.identifier; this.touch.ox = t.clientX; this.touch.oy = t.clientY;
    this.stick.style.display = 'block'; this.stick.style.left = t.clientX + 'px'; this.stick.style.top = t.clientY + 'px'; this.knob.style.transform = '';
  }
  tmove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== this.touch.id) continue;
      e.preventDefault();
      let dx = t.clientX - this.touch.ox, dy = t.clientY - this.touch.oy;
      const d = Math.hypot(dx, dy), R = 50;
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      this.knob.style.transform = `translate(${dx}px,${dy}px)`;
      this.touch.mx = d < 8 ? 0 : dx / R; this.touch.my = d < 8 ? 0 : dy / R;
    }
  }
  tend(e) {
    for (const t of e.changedTouches) if (t.identifier === this.touch.id) { this.touch.id = null; this.touch.mx = this.touch.my = 0; this.stick.style.display = 'none'; }
  }
  // 綁定畫面上的技能按鈕（按住即持續施放）
  bindButton(el, bit) {
    const on = (e) => { e.preventDefault(); e.stopPropagation(); this.btn |= bit; }, off = (e) => { e.preventDefault(); this.btn &= ~bit; };
    el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointerleave', off); el.addEventListener('pointercancel', off);
  }
  read() {
    const k = this.keys;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (!mx && !my) { mx = this.touch.mx; my = this.touch.my; }
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    const btn = ((k.has('Space') || k.has('KeyJ')) ? 1 : 0) | ((k.has('KeyQ') || k.has('KeyK') || k.has('KeyE')) ? 2 : 0) | this.btn;
    return { mx, my, k: btn };
  }
}
