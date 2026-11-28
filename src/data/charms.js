// 夥伴＝御守吊飾：出戰時帶 1 個，飄在角色旁邊。純輔助，不直接造成傷害。
// 取得：首領掉落 / 商城購買；重複取得升星（最高 5 星）。全角色共用。
// 數值 = [1 星, 5 星]，中間線性內插。百分比類一律 1 星 1% → 5 星 5%（每星 +1%）：御守是錦上添花，不能蓋過裝備與天賦。和抽卡池的被動重疊的效果一律「乘在該效果上」，不另外加一份數值。
export const CHARM_MAX = 5;
export const CHARMS = [
  { id: 'charge', name: '蓄力守', color: '#b98bff', desc: (v) => `寶具充能速度 +${pct(v.a)}`, a: [0.01, 0.05], drop: '27-B' },
  { id: 'heal', name: '癒療守', color: '#6fe08a', desc: (v) => `自己受到的所有回復 +${pct(v.a)}；每 ${HEAL_CD} 秒幫血量最低的隊友回復 ${pct(v.b)} 生命`, a: [0.01, 0.05], b: [0.01, 0.05], drop: '15-B' },
  { id: 'pick', name: '拾物守', color: '#5ab8ff', desc: (v) => `拾取範圍 +${pct(v.a)}（乘在磁力效果上，不另外相加）`, a: [0.01, 0.05], drop: '6-B' },
  { id: 'guard', name: '守護守', color: '#8fd0ff', desc: (v) => `每 ${GUARD_CD} 秒獲得 ${pct(v.a)} 生命的護盾`, a: [0.01, 0.05], drop: '24-B' },
  { id: 'coin', name: '招財守', color: '#ffd23c', desc: (v) => `關卡內撿到的金幣 +${pct(v.a)}`, a: [0.01, 0.05], drop: '18-B' },
  { id: 'mark', name: '鎖定守', color: '#ff6a6a', desc: (v) => `每 ${MARK_CD} 秒標記附近最強的敵人，牠受到的傷害 +${pct(v.a)}`, a: [0.01, 0.05], drop: '12-B' },
  { id: 'frost', name: '寒霜守', color: '#9fe8ff', desc: (v) => `身邊的敵人移動速度 -${pct(v.a)}（不與其他緩速疊加）`, a: [0.01, 0.05], drop: '9-B' },
  { id: 'revive', name: '續命守', color: '#ffb0d0', desc: (v) => `被救起的速度 +${pct(v.a)}；每關一次，倒地 ${Math.round(v.b)} 秒後自動站起`, a: [0.01, 0.05], b: [10, 6], drop: '21-B' },
];
export const HEAL_CD = 12, GUARD_CD = 16, MARK_CD = 10, MARK_DUR = 5, FROST_R = 150;
// 商城價格：第一次購買，以及升到 2～5 星各自的價格。首領掉落的機率（每次通關該首領關）
export const CHARM_PRICE = [15000, 25000, 40000, 60000, 90000];
export const CHARM_DROP = 0.12;
export const CHARM = Object.fromEntries(CHARMS.map((c) => [c.id, c]));
export const CHARM_IDS = CHARMS.map((c) => c.id);
function pct(x) { return Math.round(x * 100) + '%'; }
// 某顆星的實際數值
export function charmVal(id, star) {
  const c = CHARM[id]; if (!c) return null;
  const t = (Math.max(1, Math.min(CHARM_MAX, star | 0)) - 1) / (CHARM_MAX - 1), f = (r) => (r ? r[0] + (r[1] - r[0]) * t : 0);
  return { a: f(c.a), b: f(c.b) };
}
export const charmDesc = (id, star) => CHARM[id].desc(charmVal(id, star));
