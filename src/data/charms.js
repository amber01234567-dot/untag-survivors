// 夥伴＝御守吊飾：出戰時帶 1 個，飄在角色旁邊。純輔助，不直接造成傷害。
// 取得：首領掉落 / 商城購買；重複取得升星（最高 5 星）。全角色共用。
// 數值 = [1 星, 5 星]，中間線性內插。和抽卡池的被動重疊的效果一律「乘在該效果上」，不另外加一份數值。
export const CHARM_MAX = 5;
export const CHARMS = [
  { id: 'charge', name: '蓄力守', color: '#b98bff', desc: (v) => `寶具充能速度 +${pct(v.a)}`, a: [0.05, 0.13] },
  { id: 'heal', name: '癒療守', color: '#6fe08a', desc: (v) => `自己受到的所有回復 +${pct(v.a)}；每 ${HEAL_CD} 秒幫血量最低的隊友回復 ${pct(v.b)} 生命`, a: [0.06, 0.14], b: [0.02, 0.04] },
  { id: 'pick', name: '拾物守', color: '#5ab8ff', desc: (v) => `拾取範圍 +15%；有「磁力」被動時改為磁力效果 +${pct(v.a)}（兩者不相加）`, a: [0.1, 0.3], todo: true },
  { id: 'guard', name: '守護守', color: '#8fd0ff', desc: (v) => `每 16 秒獲得 ${pct(v.a)} 生命的護盾`, a: [0.04, 0.08], todo: true },
  { id: 'coin', name: '招財守', color: '#ffd23c', desc: (v) => `關卡內撿到的金幣 +${pct(v.a)}`, a: [0.05, 0.15], todo: true },
  { id: 'mark', name: '鎖定守', color: '#ff6a6a', desc: (v) => `每 10 秒標記附近最強的敵人，牠受到的傷害 +${pct(v.a)}`, a: [0.06, 0.12], todo: true },
  { id: 'frost', name: '寒霜守', color: '#9fe8ff', desc: (v) => `身邊的敵人移動速度 -${pct(v.a)}（不與其他緩速疊加）`, a: [0.08, 0.16], todo: true },
  { id: 'revive', name: '續命守', color: '#ffb0d0', desc: (v) => `被救起的速度 +${pct(v.a)}；每關一次，倒地 ${Math.round(v.b)} 秒後自動站起`, a: [0.2, 0.5], b: [10, 6], todo: true },
];
export const HEAL_CD = 12;
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
