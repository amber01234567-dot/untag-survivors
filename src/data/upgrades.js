// 局內被動（升級時三選一）與局外天賦（永久成長）。兩張表都可以直接往後追加。

// 局內被動：apply(st, lv) 會在重算角色數值時呼叫
export const PASSIVES = {
  power: { name: '力量', glyph: '力', max: 5, desc: '傷害 +12%', apply: (s, l) => { s.dmg *= 1 + 0.12 * l; } },
  haste: { name: '急速', glyph: '速', max: 5, desc: '冷卻 -7%', apply: (s, l) => { s.cd *= Math.pow(0.93, l); } },
  area: { name: '擴張', glyph: '域', max: 5, desc: '攻擊範圍 +10%', apply: (s, l) => { s.area *= 1 + 0.1 * l; } },
  vigor: { name: '體魄', glyph: '體', max: 5, desc: '最大生命 +20%', apply: (s, l) => { s.maxHp *= 1 + 0.2 * l; } },
  swift: { name: '疾走', glyph: '疾', max: 5, desc: '移動速度 +7%', apply: (s, l) => { s.speed *= 1 + 0.07 * l; } },
  magnet: { name: '磁力', glyph: '磁', max: 5, desc: '拾取範圍 +30%', apply: (s, l) => { s.magnet *= 1 + 0.3 * l; } },
  armor: { name: '護甲', glyph: '甲', max: 5, desc: '受到的傷害 -1.5', apply: (s, l) => { s.armor += 1.5 * l; } },
  regen: { name: '再生', glyph: '癒', max: 5, desc: '每秒回復 0.5 生命', apply: (s, l) => { s.regen += 0.5 * l; } },
  crit: { name: '銳眼', glyph: '銳', max: 5, desc: '暴擊率 +7%', apply: (s, l) => { s.crit += 0.07 * l; } },
  wisdom: { name: '學識', glyph: '識', max: 5, desc: '經驗值 +10%', apply: (s, l) => { s.xp *= 1 + 0.1 * l; } },
  mend: { name: '仁心', glyph: '仁', max: 5, desc: '治療與護盾效果 +15%', apply: (s, l) => { s.heal *= 1 + 0.15 * l; }, roles: ['support'] },
};

// 局外天賦：cost(lv) 為升到下一級的價格；apply(b, lv) 寫入帶進戰場的加成
export const TALENTS = [
  { id: 'hp', name: '強健體魄', glyph: '體', max: 10, desc: '最大生命 +5%', cost: (l) => 60 + l * 50, apply: (b, l) => { b.hp += 0.05 * l; } },
  { id: 'dmg', name: '火力美學', glyph: '力', max: 10, desc: '傷害 +4%', cost: (l) => 80 + l * 60, apply: (b, l) => { b.dmg += 0.04 * l; } },
  { id: 'speed', name: '輕盈步伐', glyph: '疾', max: 5, desc: '移動速度 +2%', cost: (l) => 80 + l * 70, apply: (b, l) => { b.speed += 0.02 * l; } },
  { id: 'cd', name: '熟能生巧', glyph: '速', max: 5, desc: '冷卻 -2%', cost: (l) => 120 + l * 90, apply: (b, l) => { b.cd += 0.02 * l; } },
  { id: 'armor', name: '強化護具', glyph: '甲', max: 4, desc: '護甲 +1', cost: (l) => 150 + l * 150, apply: (b, l) => { b.armor += l; } },
  { id: 'regen', name: '自我修復', glyph: '癒', max: 5, desc: '每秒回復 +0.2', cost: (l) => 100 + l * 80, apply: (b, l) => { b.regen += 0.2 * l; } },
  { id: 'magnet', name: '收集癖', glyph: '磁', max: 5, desc: '拾取範圍 +12%', cost: (l) => 50 + l * 40, apply: (b, l) => { b.magnet += 0.12 * l; } },
  { id: 'xp', name: '實戰經驗', glyph: '識', max: 5, desc: '經驗值 +5%', cost: (l) => 90 + l * 70, apply: (b, l) => { b.xp += 0.05 * l; } },
  { id: 'coin', name: '生財有道', glyph: '財', max: 5, desc: '金幣獲得 +10%', cost: (l) => 100 + l * 90, apply: (b, l) => { b.coin += 0.1 * l; } },
  { id: 'crit', name: '弱點洞察', glyph: '銳', max: 5, desc: '暴擊率 +2%', cost: (l) => 110 + l * 90, apply: (b, l) => { b.crit += 0.02 * l; } },
  { id: 'revive', name: '不死鳥', glyph: '甦', max: 2, desc: '每關可自動復活 +1 次', cost: (l) => 500 + l * 900, apply: (b, l) => { b.revives += l; } },
  { id: 'reroll', name: '命運重抽', glyph: '運', max: 3, desc: '每關升級重抽次數 +1', cost: (l) => 200 + l * 250, apply: (b, l) => { b.rerolls += l; } },
  { id: 'ult', name: '寶具共鳴', glyph: '寶', max: 5, desc: '寶具充能速度 +6%', cost: (l) => 130 + l * 100, apply: (b, l) => { b.ult += 0.06 * l; } },
];

export const emptyBonus = () => ({ hp: 0, dmg: 0, speed: 0, cd: 0, armor: 0, regen: 0, magnet: 0, xp: 0, coin: 0, crit: 0, revives: 0, rerolls: 0, ult: 0 });
