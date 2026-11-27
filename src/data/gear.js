// 屬性與裝備。
// 屬性 7 種；克制環：冰→火→毒→金→風→土→雷→冰（箭頭左邊克制右邊）。
// 裝備 = 武器配件 acc（把武器轉成該屬性）+ 防具三件 top / pants / shoes（抗該屬性）。
// 沒有稀有度與詞條：重複取得升星（上限 5 星）。全角色通用、背包共用、各角色各自穿。
export const ELEMENTS = [
  { id: 'ice', name: '冰', color: '#7fd8ff', set: '騎士冰甲', acc: '緩速敵人，連續命中後凍結' },
  { id: 'fire', name: '火', color: '#ff7a3c', set: '火龍獵人', acc: '點燃敵人，造成持續傷害' },
  { id: 'poison', name: '毒', color: '#9ce04a', set: '瘴氣死神', acc: '腐蝕敵人：持續傷害並使其承受更多傷害' },
  { id: 'gold', name: '金', color: '#ffd23c', set: '黃金武將', acc: '攻擊力提升' },
  { id: 'wind', name: '風', color: '#5fe0b0', set: '天狗行者', acc: '移動速度提升' },
  { id: 'earth', name: '土', color: '#c79a5a', set: '大地忍者', acc: '防禦力提升，攻擊有機率擊退' },
  { id: 'thunder', name: '雷', color: '#c58bff', set: '雷神太鼓', acc: '閃電連鎖到附近敵人並短暫暈眩' },
];
export const EL = Object.fromEntries(ELEMENTS.map((e) => [e.id, e]));
export const EL_IDS = ELEMENTS.map((e) => e.id);
const RING = ['ice', 'fire', 'poison', 'gold', 'wind', 'earth', 'thunder'];
export const BEATS = {}, BEATEN_BY = {};
RING.forEach((e, i) => { const n = RING[(i + 1) % RING.length]; BEATS[e] = n; BEATEN_BY[n] = e; });

export const SLOTS = [
  { id: 'acc', name: '武器配件', glyph: '配' },
  { id: 'top', name: '衣服', glyph: '衣' },
  { id: 'pants', name: '褲子', glyph: '褲' },
  { id: 'shoes', name: '鞋子', glyph: '鞋' },
];
export const ARMOR_SLOTS = ['top', 'pants', 'shoes'];
export const MAX_STAR = 5;
export const gearId = (el, slot) => el + '_' + slot;
export const gearName = (el, slot) => EL[el].name + '之' + SLOTS.find((s) => s.id === slot).name;
export const starMul = (star) => 1 + 0.15 * (Math.max(1, star) - 1);          // 每星 +15% 效果

// 數值（1 星基準；乘上 starMul；同屬性三件套再乘 SET_MUL）
export const SET_MUL = 1.5;
export const ADV = { piece: 0.03, set3: 0.10, acc: 0.05, allFive: 0.05, weak: 0.15 };   // 克制加成 / 被克制減傷害
export const RESIST_PER_PIECE = 0.08;                                           // 每件防具：該屬性怪物的傷害與負面效果 -8%（乘星數）
export const ACC = {
  ice: { slow: 0.2, slowDur: 1.5, hits: 6, freeze: 1.0, freezeCd: 4 },
  fire: { dot: 0.12, dur: 3 },
  poison: { dot: 0.06, dur: 4, vuln: 0.08 },
  gold: { dmg: 0.08 },
  wind: { speed: 0.08 },
  earth: { armor: 3, kbChance: 0.15, kb: 280 },
  thunder: { chance: 0.15, targets: 2, range: 170, frac: 0.45, stun: 0.3 },
};
// 屬性怪物（該章節所有怪）：自身強化 + 打到玩家的負面效果
export const FOE = {
  ice: { slow: 0.25, dur: 1.5, text: '打到你會緩速' },
  fire: { burn: 0.25, dur: 3, text: '打到你會燃燒' },
  poison: { burn: 0.12, dur: 6, text: '打到你會中毒' },
  gold: { dmg: 0.2, text: '攻擊力較高' },
  wind: { speed: 0.15, text: '移動較快' },
  earth: { tough: 0.15, text: '較耐打' },
  thunder: { shock: 0.5, dur: 0.6, cd: 4, text: '打到你會麻痺' },
};

// 把一個角色穿的裝備整理成戰鬥用的摘要。gear = { acc: [el, star], top: [el, star], ... }
export function gearSummary(gear) {
  const g = gear || {}, s = { acc: null, accStar: 0, accMul: 0, set: null, pieces: {}, adv: {}, resist: {}, allFive: false };
  let five = !!g.acc && g.acc[1] >= MAX_STAR;
  for (const slot of ARMOR_SLOTS) {
    const it = g[slot];
    if (!it || !EL[it[0]]) { five = false; continue; }
    s.pieces[it[0]] = (s.pieces[it[0]] || 0) + 1;
    s.resist[it[0]] = (s.resist[it[0]] || 0) + RESIST_PER_PIECE * starMul(it[1]);
    if (it[1] < MAX_STAR) five = false;
  }
  for (const el in s.pieces) if (s.pieces[el] === 3) s.set = el;
  if (g.acc && EL[g.acc[0]]) { s.acc = g.acc[0]; s.accStar = g.acc[1]; s.accMul = starMul(g.acc[1]) * (s.set === s.acc ? SET_MUL : 1); }
  s.allFive = five && !!s.set && s.set === s.acc;
  for (const el of EL_IDS) {
    const n = s.pieces[el] || 0;
    const a = (n === 3 ? ADV.set3 : n * ADV.piece) + (s.acc === el ? ADV.acc : 0) + (s.allFive && s.acc === el ? ADV.allFive : 0);
    if (a) s.adv[el] = a;
  }
  return s;
}
// 對某屬性的怪：傷害倍率
export function advMul(sum, foeEl) {
  if (!foeEl || !sum) return 1;
  let m = 1 + (sum.adv[BEATEN_BY[foeEl]] || 0);
  if (sum.acc && BEATS[foeEl] === sum.acc) m *= 1 - ADV.weak;
  return m;
}
// 章節屬性：系列三（第 7–13 章）每章一種。TEST_EL = 測試用：讓現有第 1–6 章暫時帶屬性
// 章節屬性：系列三起一個系列一種屬性（每系列 3 章）：第 7–9 章冰、10–12 火、13–15 毒、16–18 金、19–21 風、22–24 土、25–27 雷
export const CHAPTER_EL = {};
RING.forEach((el, i) => { for (let k = 0; k < 3; k++) CHAPTER_EL[7 + i * 3 + k] = el; });
export const TEST_EL = { 1: 'ice', 2: 'fire', 3: 'poison', 4: 'gold', 5: 'wind', 6: 'earth' };
// 掉落：防具在該章機率掉；武器配件只有首領機率掉
export const DROP = { armor: 0.3, armorBoss: 1, acc: 0.35 };
