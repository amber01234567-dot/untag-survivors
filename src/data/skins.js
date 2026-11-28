// 獨立造型（商城購買）：純外觀，不影響數值。買一次全角色都能穿，各角色各自選要不要穿。
// 圖檔：assets/sprites/<角色>_<造型>.png（由 tools/build_sprites.py 產生）。只能往後加（連線同步用索引）。
// limited = 限定期間上架 [開始月, 日, 結束月, 日]（每年；買過就永久保有）。scale = 體型倍率（背飾把圖撐高時補回來）。
export const SKINS = [
  { id: 'longcoat', name: '高領長大衣', price: 30000 },
  { id: 'heavy', name: '重砲機甲', price: 40000, scale: 1.16 },
  { id: 'pilot', name: '王牌飛行員', price: 30000 },
  { id: 'school', name: '學院制服', price: 30000 },
  { id: 'cowboy', name: '西部牛仔', price: 30000, scale: 1.06 },
  { id: 'market', name: '夜市老闆', price: 30000 },
  { id: 'pjstar', name: '星月睡衣', price: 25000 },
  { id: 'pjdino', name: '恐龍睡衣', price: 25000 },
  { id: 'pjlazy', name: '居家懶人', price: 25000 },
  { id: 'xmas', name: '聖誕限定', price: 35000, limited: [12, 1, 1, 5], scale: 1.04 },
  { id: 'untaga', name: 'UNTAG・NÏ MA JIAO', price: 35000, brand: true },
  { id: 'untagb', name: 'UNTAG・NO TAG', price: 35000, brand: true },
  { id: 'untagc', name: 'UNTAG・404', price: 35000, brand: true },
];
export const SKIN = Object.fromEntries(SKINS.map((s) => [s.id, s]));
export const SKIN_IDS = SKINS.map((s) => s.id);
// 限定造型現在有沒有在賣
export function skinOnSale(s, now = new Date()) {
  if (!s.limited) return true;
  const [m0, d0, m1, d1] = s.limited, k = (now.getMonth() + 1) * 100 + now.getDate(), a = m0 * 100 + d0, b = m1 * 100 + d1;
  return a <= b ? k >= a && k <= b : k >= a || k <= b;
}
export const saleText = (s) => (s.limited ? `${s.limited[0]}/${s.limited[1]}～${s.limited[2]}/${s.limited[3]} 限定販售` : '');
