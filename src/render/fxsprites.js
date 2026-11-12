// 特效、掉落物、閘門的圖片素材（assets/fx/）。沒載到的項目，各處會退回原本的程式繪製。
export const FXS = {};
const NAMES = ['pk_g1', 'pk_g2', 'pk_g3', 'pk_c', 'pk_h', 'pk_k', 'pk_m', 'pk_x', 'boom', 'slash', 'hit', 'circle', 'gate',
  'bullet', 'knife', 'cleaver', 'blade', 'rune', 'syringe', 'skewer', 'bead', 'ball', 'missile', 'molotov', 'grenade', 'orb', 'mine', 'drone', 'cat', 'lion', 'rat', 'tank', 'decoy',
  'flame', 'fireground', 'coalground', 'dragonring', 'swordqi', 'whirl', 'crack', 'garbageground', 'blackhole', 'zerogrid', 'mandala', 'palm', 'kart', 'dev_barrel', 'dev_turret', 'dev_pylon'];
export function loadFxSprites() {
  return Promise.all(NAMES.map((n) => new Promise((res) => {
    const im = new Image(); im.onload = () => { FXS[n] = im; res(); }; im.onerror = () => res();
    im.src = new URL(`../../assets/fx/${n}.png`, import.meta.url).href;
  })));
}
// 把白色素材染成指定顏色（結果會快取）
const tints = new Map();
export function tinted(name, color) {
  const key = name + color;
  let c = tints.get(key);
  if (c) return c;
  const im = FXS[name];
  if (!im) return null;
  c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.72; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  tints.set(key, c);
  return c;
}
