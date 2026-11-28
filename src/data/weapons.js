// 武器資料。新增武器：在這裡加一筆 W(...)，行為 (beh) 對應 sim/weapons.js 內的實作。
// base = 一級數值；lv = 之後每一級的說明與修正  m:乘算  a:加算  s:直接設定
export const WEAPONS = {};
const W = (id, def) => { def.id = id; def.maxLv = def.lv.length + 1; WEAPONS[id] = def; };

// ───────── 近戰 ─────────
W('greatsword', {
  name: '雙手劍', glyph: '劍', beh: 'melee', fx: 'steel',
  base: { dmg: 30, cd: 0.95, range: 122, arc: 2.4, kb: 150, waveEvery: 0, waveDmg: 0.6 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['攻擊範圍 +18%', { m: { range: 1.18 } }],
    ['每 2 次揮砍放出劍氣', { s: { waveEvery: 2 } }],
    ['傷害 +25%、冷卻 -12%', { m: { dmg: 1.25, cd: 0.88 } }],
    ['每次揮砍都放出劍氣', { s: { waveEvery: 1 } }],
    ['傷害 +35%，揮砍變為迴旋雙斬', { m: { dmg: 1.35 }, s: { double: 1 } }],
  ],
});
W('greataxe', {
  name: '雙手斧', glyph: '斧', beh: 'melee', fx: 'heavy',
  base: { dmg: 44, cd: 1.3, range: 116, arc: 2.0, kb: 240, combo: 3, comboMul: 1.6, comboR: 140, comboSpin: 1 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['旋風斬範圍 +25%', { m: { comboR: 1.25 } }],
    ['命中造成撕裂（持續傷害）', { s: { dot: 12, dotDur: 3 } }],
    ['冷卻 -15%', { m: { cd: 0.85 } }],
    ['每 2 次攻擊就觸發旋風斬', { s: { combo: 2 } }],
    ['傷害 +40%，旋風斬附帶暈眩', { m: { dmg: 1.4 }, s: { comboStun: 0.8 } }],
  ],
});
W('cleaver', {
  name: '垃圾菜刀', glyph: '刀', beh: 'melee', fx: 'toxic',
  base: { dmg: 13, cd: 0.38, range: 72, arc: 1.9, kb: 40, dot: 8, dotDur: 3, throwEvery: 5, throwDmg: 1.6 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['毒素傷害 +60%', { m: { dot: 1.6 } }],
    ['每 3 刀丟出飛旋菜刀', { s: { throwEvery: 3 } }],
    ['攻速 +18%', { m: { cd: 0.82 } }],
    ['飛旋菜刀 +2 把', { a: { throwCount: 2 } }],
    ['傷害 +35%，毒素持續 +2 秒', { m: { dmg: 1.35 }, a: { dotDur: 2 } }],
  ],
});
W('gloves', {
  name: '無束拳套', glyph: '拳', beh: 'melee', fx: 'punch',
  base: { dmg: 13, cd: 0.25, range: 72, arc: 1.9, kb: 55, combo: 4, comboMul: 3, comboR: 100 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['攻速 +15%', { m: { cd: 0.85 } }],
    ['衝擊波範圍 +35%', { m: { comboR: 1.35 } }],
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['每 3 拳就引爆衝擊波', { s: { combo: 3 } }],
    ['傷害 +30%，衝擊波附帶暈眩', { m: { dmg: 1.3 }, s: { comboStun: 0.6 } }],
  ],
});
W('bat', {
  name: '狼牙棒', glyph: '棒', beh: 'melee', fx: 'wood',
  base: { dmg: 24, cd: 0.7, range: 96, arc: 2.2, kb: 380, ballEvery: 3, ballDmg: 1.15 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['每 2 次揮擊甩出尖刺鐵球', { s: { ballEvery: 2 } }],
    ['攻擊範圍 +20%', { m: { range: 1.2 } }],
    ['鐵球多彈跳 2 次、傷害 +30%', { a: { ballBounce: 2 }, m: { ballDmg: 1.3 } }],
    ['冷卻 -18%', { m: { cd: 0.82 } }],
    ['傷害 +35%，每次揮擊都甩出鐵球', { m: { dmg: 1.35 }, s: { ballEvery: 1 } }],
  ],
});

// ───────── 遠攻 ─────────
W('lasercannon', {
  name: '雷射炮槍', glyph: '雷', beh: 'beam', fx: 'teal',
  base: { dmg: 11, cd: 1.9, dur: 0.9, len: 520, width: 24, count: 1 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['照射時間 +35%', { m: { dur: 1.35 } }],
    ['光束寬度 +40%、射程 +15%', { m: { width: 1.4, len: 1.15 } }],
    ['冷卻 -20%', { m: { cd: 0.8 } }],
    ['雙重光束', { a: { count: 1 } }],
    ['傷害 +40%，光束命中引發小爆炸', { m: { dmg: 1.4 }, s: { burst: 1 } }],
  ],
});
W('gatling', {
  name: '加特林機槍', glyph: '槍', beh: 'gun', proj: 'gatling',
  base: { dmg: 5, cd: 0.085, count: 1, jitter: 0.2, speed: 950, pierce: 0, life: 0.55, range: 480, spin: 1.4, kb: 20 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['子彈貫穿 +1', { a: { pierce: 1 } }],
    ['射速 +20%', { m: { cd: 0.83 } }],
    ['傷害 +25%，預熱更快', { m: { dmg: 1.25, spin: 0.5 } }],
    ['雙管齊射', { a: { count: 1 } }],
    ['傷害 +30%、貫穿 +1', { m: { dmg: 1.3 }, a: { pierce: 1 } }],
  ],
});
W('runes', {
  name: '上古符文', glyph: '符', beh: 'gun', proj: 'rune', extra: 'circle',
  base: { dmg: 14, cd: 0.8, count: 2, spread: 0.5, speed: 430, pierce: 0, life: 1.7, range: 520, homing: 6,
    circleEvery: 3, circleDmg: 38, circleR: 95, circleSlow: 0.4 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25, circleDmg: 1.25 } }],
    ['符文 +1', { a: { count: 1 } }],
    ['魔法陣範圍 +30%', { m: { circleR: 1.3 } }],
    ['每 2 次施法就展開魔法陣', { s: { circleEvery: 2 } }],
    ['符文 +1、冷卻 -12%', { a: { count: 1 }, m: { cd: 0.88 } }],
    ['魔法陣傷害 +60%，同時展開 2 個', { m: { circleDmg: 1.6 }, s: { circleCount: 2 } }],
  ],
});
W('wisps', {
  name: '數字鬼火', glyph: '數', beh: 'wisp',
  base: { dmg: 18, cd: 0.45, count: 3, regen: 1.0, speed: 520, homing: 8, minDigit: 1, aoe: 0, range: 520 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['鬼火 +1', { a: { count: 1 } }],
    ['數字至少為 3', { s: { minDigit: 3 } }],
    ['鬼火命中時爆炸', { s: { aoe: 60 } }],
    ['鬼火 +2、補充更快', { a: { count: 2 }, m: { regen: 0.75 } }],
    ['數字至少為 5，「9」造成三倍傷害', { s: { minDigit: 5, nine: 1 } }],
  ],
});
W('revolver', {
  name: '左輪手槍', glyph: '輪', beh: 'gun', proj: 'revolver',
  base: { dmg: 34, cd: 0.42, count: 1, speed: 1150, pierce: 2, life: 0.6, range: 560, mag: 6, reload: 1.3, critAdd: 0.15, kb: 90 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['裝填時間 -30%', { m: { reload: 0.7 } }],
    ['貫穿 +2', { a: { pierce: 2 } }],
    ['暴擊率 +15%', { a: { critAdd: 0.15 } }],
    ['每輪最後一發為爆裂彈', { s: { lastAoe: 90 } }],
    ['傷害 +40%，射擊間隔 -20%', { m: { dmg: 1.4, cd: 0.8 } }],
  ],
});
W('pistol', {
  name: '手槍', glyph: '彈', beh: 'gun', proj: 'pistol',
  base: { dmg: 11, cd: 0.32, count: 1, burst: 2, speed: 820, pierce: 0, bounce: 1, life: 0.9, range: 460, jitter: 0.06 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['彈跳 +1', { a: { bounce: 1 } }],
    ['三連發', { a: { burst: 1 } }],
    ['射速 +20%', { m: { cd: 0.83 } }],
    ['彈跳 +2、傷害 +20%', { a: { bounce: 2 }, m: { dmg: 1.2 } }],
    ['雙槍：同時向兩個目標射擊', { s: { dual: 1 } }],
  ],
});
W('knives', {
  name: '飛刀', glyph: '刃', beh: 'gun', proj: 'knife',
  base: { dmg: 13, cd: 0.75, count: 3, spread: 0.5, speed: 720, pierce: 2, life: 0.75, range: 440 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['飛刀 +2', { a: { count: 2 }, m: { spread: 1.3 } }],
    ['飛刀會折返', { s: { ret: 1 } }],
    ['冷卻 -18%', { m: { cd: 0.82 } }],
    ['飛刀 +2、貫穿 +2', { a: { count: 2, pierce: 2 } }],
    ['傷害 +35%，命中造成流血', { m: { dmg: 1.35 }, s: { dot: 10, dotDur: 3 } }],
  ],
});

// ───────── 輔助 ─────────
W('syringe', {
  name: '針筒', glyph: '針', beh: 'gun', proj: 'syringe', extra: 'heal',
  base: { dmg: 18, cd: 0.48, count: 1, speed: 680, pierce: 1, life: 0.8, range: 440, dot: 16, dotDur: 3,
    healCd: 3.5, healAmt: 12, healCount: 1, healRange: 620 },
  lv: [
    ['治療量 +35%', { m: { healAmt: 1.35 } }],
    ['傷害與毒素 +30%', { m: { dmg: 1.3, dot: 1.3 } }],
    ['治療針同時射向 2 名隊友', { a: { healCount: 1 } }],
    ['治療冷卻 -25%', { m: { healCd: 0.75 } }],
    ['針筒 +1、貫穿 +1', { a: { count: 1, pierce: 1 }, s: { spread: 0.25 } }],
    ['治療量 +50%，溢出的治療轉為護盾', { m: { healAmt: 1.5 }, s: { overheal: 1 } }],
  ],
});
W('skewer', {
  name: '烤肉串', glyph: '串', beh: 'gun', proj: 'skewer', extra: 'food',
  base: { dmg: 15, cd: 0.7, count: 1, spread: 0.5, speed: 640, pierce: 99, life: 0.36, range: 250,
    foodCd: 7, foodHeal: 15, foodBuff: 0.15 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['一次刺出 3 串', { a: { count: 2 } }],
    ['炭火：命中造成燃燒', { s: { dot: 12, dotDur: 3 } }],
    ['烤肉出爐更快 (-30%)', { m: { foodCd: 0.7 } }],
    ['烤肉串回復量 +60%，並提升攻擊力', { m: { foodHeal: 1.6 }, s: { foodDmg: 0.15 } }],
    ['傷害 +35%、射程 +30%', { m: { dmg: 1.35, life: 1.3, range: 1.3 } }],
  ],
});
W('beads', {
  name: '佛珠', glyph: '珠', beh: 'orbit', proj: 'bead',
  base: { dmg: 20, count: 4, radius: 84, rot: 3.4, hitCd: 0.36, slow: 0.35, slowDur: 1.2, pulseCd: 6, pulseR: 150, pulseStun: 1.0 },
  lv: [
    ['佛珠 +2', { a: { count: 2 } }],
    ['緩速效果提升至 50%', { s: { slow: 0.5 } }],
    ['定身波範圍 +30%、暈眩 +0.5 秒', { m: { pulseR: 1.3 }, a: { pulseStun: 0.5 } }],
    ['傷害 +40%', { m: { dmg: 1.4 } }],
    ['佛珠 +2、環繞範圍 +20%', { a: { count: 2 }, m: { radius: 1.2 } }],
    ['定身波冷卻 -35%，被定身的敵人承受更多傷害', { m: { pulseCd: 0.65 }, s: { pulseMark: 1 } }],
  ],
});
W('mines', {
  name: '派對地雷', glyph: '雷', beh: 'mine',
  base: { dmg: 46, cd: 1.5, count: 1, r: 85, trig: 38, arm: 0.4, max: 14, life: 25, cluster: 0 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['一次佈置 2 顆', { a: { count: 1, max: 6 } }],
    ['爆炸範圍 +25%', { m: { r: 1.25 } }],
    ['冷卻 -20%', { m: { cd: 0.8 } }],
    ['連鎖：爆炸後彈出 3 顆小炸彈', { s: { cluster: 3 } }],
    ['傷害 +40%，一次佈置 3 顆', { m: { dmg: 1.4 }, a: { count: 1, max: 6 } }],
  ],
});
W('cheer', {
  name: '爆蕉號', glyph: '車', beh: 'ram',
  base: { dmg: 32, hitCd: 0.4, ramR: 48, kb: 220, boostCd: 2.4, boostMul: 2.4, boostDist: 130, r: 185, buffDmg: 0.08, buffHaste: 0.08, buffSpeed: 0.08, buffDur: 3, armorAdd: 2 },
  lv: [
    ['衝撞傷害 +25%', { m: { dmg: 1.25 } }],
    ['加速：隊友攻速與移速加成提升至 14%', { s: { buffHaste: 0.14, buffSpeed: 0.14 } }],
    ['氮氣衝刺冷卻 -20%', { m: { boostCd: 0.8 } }],
    ['引擎聲浪同時提升 14% 攻擊力', { s: { buffDmg: 0.14 } }],
    ['衝撞範圍 +30%，氮氣衝刺距離 +30%', { m: { ramR: 1.3, boostDist: 1.3 } }],
    ['攻速與移速加成提升至 22%，氮氣衝刺留下火焰', { s: { buffHaste: 0.22, buffSpeed: 0.22, trail: 1 } }],
  ],
});
W('drones', {
  name: '無人機', glyph: '機', beh: 'drone',
  base: { dmg: 8, cd: 0.45, count: 2, range: 400, speed: 820, missileEvery: 0, missileDmg: 3, missileR: 62 },
  lv: [
    ['無人機 +1', { a: { count: 1 } }],
    ['傷害 +30%', { m: { dmg: 1.3 } }],
    ['每 5 發改射飛彈', { s: { missileEvery: 5 } }],
    ['無人機 +1', { a: { count: 1 } }],
    ['射速 +25%', { m: { cd: 0.8 } }],
    ['無人機 +1，每 3 發改射飛彈', { a: { count: 1 }, s: { missileEvery: 3 } }],
  ],
});
W('cats', {
  name: '召喚小貓', glyph: '貓', beh: 'cats',
  base: { dmg: 12, cd: 0.8, count: 2, speed: 270, leash: 380, purrCd: 6, purrHeal: 4, purrR: 200, purrHaste: 0 },
  lv: [
    ['小貓 +1', { a: { count: 1 } }],
    ['傷害 +30%', { m: { dmg: 1.3 } }],
    ['呼嚕回復量 +75%', { m: { purrHeal: 1.75 } }],
    ['呼嚕同時提升隊友 10% 攻速', { s: { purrHaste: 0.1 } }],
    ['小貓 +1、攻擊更快', { a: { count: 1 }, m: { cd: 0.8 } }],
    ['傷害 +40%，小貓攻擊造成流血', { m: { dmg: 1.4 }, s: { dot: 8, dotDur: 3 } }],
  ],
});

// ───────── 哞哞：基礎武器升滿後二選一分支（branch） ─────────
W('rocket0', {
  name: '火箭筒', glyph: '砲', beh: 'gun', proj: 'missile', branch: ['rocket', 'siege'],
  base: { dmg: 22, cd: 1.35, count: 1, speed: 500, life: 1.2, range: 500, aoe: 62, kb: 120 },
  lv: [['傷害 +25%', { m: { dmg: 1.25 } }]],
});
W('rocket', {
  name: '火箭炮', glyph: '砲', beh: 'gun', proj: 'missile', path: true,
  branchDesc: '遠攻路線：大範圍爆炸的重型火箭，之後可升級成多發齊射。',
  base: { dmg: 34, cd: 1.2, count: 1, spread: 0.3, speed: 540, life: 1.2, range: 540, aoe: 82, kb: 160 },
  lv: [
    ['爆炸範圍 +25%', { m: { aoe: 1.25 } }],
    ['傷害 +30%', { m: { dmg: 1.3 } }],
    ['雙發齊射', { a: { count: 1 } }],
    ['冷卻 -20%', { m: { cd: 0.8 } }],
    ['爆炸造成燃燒', { s: { dot: 14, dotDur: 3 } }],
    ['傷害 +40%，三發齊射', { m: { dmg: 1.4 }, a: { count: 1 } }],
  ],
});
W('siege', {
  name: '攻城甲', glyph: '甲', beh: 'melee', fx: 'heavy', path: true, skin: 'siege',
  branchDesc: '近戰路線：穿上攻城甲，護甲與生命提升，改用重拳橫掃並擊退敵人。',
  base: { dmg: 42, cd: 0.8, range: 108, arc: 2.6, kb: 340, armorAdd: 4, hpMul: 1.15, combo: 0, comboMul: 2, comboR: 125 },
  lv: [
    ['護甲 +3', { a: { armorAdd: 3 } }],
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['每 3 次攻擊引發震地衝擊波', { s: { combo: 3 } }],
    ['最大生命再 +25%', { m: { hpMul: 1.22 } }],
    ['冷卻 -15%', { m: { cd: 0.85 } }],
    ['傷害 +40%，衝擊波附帶暈眩', { m: { dmg: 1.4 }, s: { comboStun: 0.8 } }],
  ],
});
// ───────── 老瑾：誘餌 ─────────
W('bait', {
  name: '鈔票誘餌', glyph: '餌', beh: 'decoy',
  base: { dmg: 13, cd: 0.7, range: 420, decoyCd: 6, decoyDur: 3.5, decoyR: 190, boomDmg: 55, boomR: 110, decoys: 1 },
  lv: [
    ['誘餌持續 +1 秒', { a: { decoyDur: 1 } }],
    ['誘餌爆炸傷害 +40%', { m: { boomDmg: 1.4 } }],
    ['吸引範圍 +25%', { m: { decoyR: 1.25 } }],
    ['誘餌冷卻 -20%', { m: { decoyCd: 0.8 } }],
    ['同時丟出 2 個誘餌', { a: { decoys: 1 } }],
    ['爆炸傷害 +40%，並噴出金幣', { m: { boomDmg: 1.4 }, s: { coins: 2 } }],
  ],
});
// ───────── 農夫哥哥：增幅 ─────────
W('dragonfire', {
  name: '龍炎咒力', glyph: '炎', beh: 'aura', proj: 'fireball',
  base: { dmg: 20, cd: 1.4, count: 1, speed: 430, life: 1.3, range: 480, aoe: 60, auraR: 170, buffDmg: 0.12, buffHaste: 0 },
  lv: [
    ['增幅：光環內隊友傷害加成提升至 18%', { s: { buffDmg: 0.18 } }],
    ['火球傷害 +30%', { m: { dmg: 1.3 } }],
    ['光環範圍 +25%', { m: { auraR: 1.25 } }],
    ['光環同時提升 10% 攻速', { s: { buffHaste: 0.1 } }],
    ['一次發射 2 顆火球', { a: { count: 1 } }],
    ['傷害加成提升至 28%，火球造成燃燒', { s: { buffDmg: 0.28, dot: 12, dotDur: 3 } }],
  ],
});

// ───────── 通用副武器（任何角色都能在局內取得） ─────────
W('sub_blades', {
  name: '環刃', glyph: '環', beh: 'orbit', proj: 'blade', sub: true,
  base: { dmg: 10, count: 2, radius: 78, rot: 3.6, hitCd: 0.5, slow: 0, slowDur: 0, pulseCd: 0 },
  lv: [
    ['環刃 +1', { a: { count: 1 } }],
    ['傷害 +35%', { m: { dmg: 1.35 } }],
    ['環刃 +1、範圍 +15%', { a: { count: 1 }, m: { radius: 1.15 } }],
    ['傷害 +40%，轉速提升', { m: { dmg: 1.4, rot: 1.3 } }],
  ],
});
W('sub_lightning', {
  name: '落雷', glyph: '電', beh: 'lightning', sub: true,
  base: { dmg: 26, cd: 2.2, count: 2, range: 460, aoe: 46 },
  lv: [
    ['落雷 +1', { a: { count: 1 } }],
    ['傷害 +35%', { m: { dmg: 1.35 } }],
    ['冷卻 -25%', { m: { cd: 0.75 } }],
    ['落雷 +2、範圍 +30%', { a: { count: 2 }, m: { aoe: 1.3 } }],
  ],
});
W('sub_molotov', {
  name: '燃燒瓶', glyph: '焰', beh: 'molotov', sub: true,
  base: { dmg: 9, cd: 4.2, count: 1, r: 78, dur: 3.5, range: 360 },
  lv: [
    ['火焰範圍 +25%', { m: { r: 1.25 } }],
    ['傷害 +40%', { m: { dmg: 1.4 } }],
    ['一次投出 2 瓶', { a: { count: 1 } }],
    ['持續時間 +50%、冷卻 -20%', { m: { dur: 1.5, cd: 0.8 } }],
  ],
});
W('sub_nova', {
  name: '冰霜新星', glyph: '霜', beh: 'nova', sub: true,
  base: { dmg: 14, cd: 3.4, r: 150, slow: 0.45, slowDur: 2 },
  lv: [
    ['範圍 +25%', { m: { r: 1.25 } }],
    ['傷害 +50%', { m: { dmg: 1.5 } }],
    ['冷卻 -25%', { m: { cd: 0.75 } }],
    ['緩速提升至 65%，並短暫凍結', { s: { slow: 0.65, freeze: 0.6 } }],
  ],
});

// ───────── 武器進化 ─────────
// 條件：專屬武器升滿 + 指定被動達 EVO_NEED 級 → 下次升級保證出現金色「進化」卡。
// EVO(原武器, 新武器 id, 對應被動, def)：新武器以原武器滿級數值為底，再套 mod（m 乘 / a 加 / s 設定）。
// 進化是「形態改變」：用 beh 換行為，或在原行為裡以 s.xxx 旗標切換打法。
// def.ult = 覺醒寶具（武器進化的同時，寶具也換成新形態）。
export const EVO_NEED = 3;
function EVO(from, id, passive, def) {
  // 進化武器沿用原武器的升級表（等級 1..滿級），每一級的數值 = 原武器該級數值再套上進化的 mod。
  // 戰鬥中進化：直接是滿級；已永久解鎖、開場就帶進化武器：從 1 級開始照原本的升級卡成長。
  const src = WEAPONS[from];
  // 造型：進化後換成「拿著新武器」的動作圖（assets/sprites/<角色>_evo_*.png；還沒畫的會自動沿用原造型）
  WEAPONS[id] = Object.assign({ beh: src.beh, proj: src.proj, fx: src.fx, extra: src.extra }, def, { id, base: src.base, lv: src.lv, maxLv: src.maxLv, evoMod: def.mod || {}, evoOf: from, skin: src.skin ? src.skin + '_evo' : 'evo' });
  src.evo = { to: id, passive, need: EVO_NEED };
}
EVO('greatsword', 'starblade', 'power', {
  name: '星穹光刃', glyph: '星', fx: 'star',
  evoDesc: '大劍展開成一道比人還長的能量光刃：揮砍變成 360 度的光刃橫掃，每一擊往前射出月牙形光波',
  ult: { id: 'll_cross', name: '天穹十字斬', desc: '巨大的光刃從天而降縱劈整個畫面，緊接著再橫劈一刀形成十字。' },
  mod: { m: { dmg: 1.3, range: 1.15, kb: 1.3 }, s: { arc: 6.283, double: 0, waveEvery: 0, starWave: 0.35 } },
});
EVO('greataxe', 'quakeaxe', 'armor', {
  name: '裂地戰斧', glyph: '裂', fx: 'heavy',
  evoDesc: '從「揮砍」變成「砸地」：每一擊在前方撕開一條地裂，岩柱沿線一路噴出並震暈敵人；每第三擊同時裂出三道',
  ult: { id: 'xia_shatter', name: '天崩地裂', desc: '以自己為中心，整片地面由近到遠連鎖碎裂，岩柱一圈一圈噴發。' },
  mod: { m: { dmg: 1.55 }, s: { quake: 1, combo: 3, comboSpin: 0, comboMul: 1, quakeLen: 400 } },
});
EVO('cleaver', 'bonechopper', 'regen', {
  name: '斬骨巨刀', glyph: '斬', fx: 'chop',
  evoDesc: '菜刀變成比身體還大的屠夫巨刀：從快速連砍變成重重往下「剁」，每一刀震飛敵人並在地上留下一道帶毒的刀痕，命中還會回血',
  ult: { id: 'gq_kitchen', name: '地獄廚房', desc: '數把巨型菜刀從天上輪流剁下來，最後一刀把全場敵人剁飛。' },
  mod: { m: { dmg: 4.6, cd: 3.0, range: 2.0, kb: 6 }, s: { arc: 1.5, chop: 1, throwEvery: 0, throwCount: 0 } },
});
EVO('gloves', 'phantomfist', 'haste', {
  name: '殘影巨拳', glyph: '影', fx: 'punch',
  evoDesc: '拳頭化成巨大的半透明拳影往前飛出：近戰變成中距離的拳影連打，每第三拳是一記更大的重拳',
  ult: { id: 'tg_thousand', name: '千手無束', desc: '背後浮現無數拳影，對前方連續轟出數十拳，最後一記巨拳收尾。' },
  mod: { m: { dmg: 0.95 }, s: { fist: 1, fistRange: 300, combo: 3 } },
});
EVO('bat', 'thunderclub', 'crit', {
  name: '雷霆金剛棒', glyph: '雷', fx: 'wood',
  evoDesc: '球棒帶電變大：每次命中在落點劈下落雷；擊出的球變成貫穿全場的雷光彗星',
  ult: { id: 'sn_thunder', name: '雷神全壘打', desc: '蓄力一棒把巨大的雷球轟出去，同時全畫面降下落雷。' },
  mod: { m: { dmg: 1.2, range: 1.2 }, s: { thunder: 3, comet: 1, ballEvery: 2, ballDmg: 2.2 } },
});
EVO('lasercannon', 'prismcannon', 'area', {
  name: '極光稜鏡砲', glyph: '虹', fx: 'teal',
  evoDesc: '細直線雷射變成寬大的彩虹光束，發射時會左右掃過一整個扇面',
  ult: { id: 'ejd_curtain', name: '極光天幕', desc: '一道從天而降的彩虹光幕由一側橫掃到另一側，掃過整個戰場。' },
  mod: { m: { dmg: 2.0, width: 2.3, len: 1.15, dur: 1.25 }, s: { count: 1, sweep: 0.75, burst: 1 } },
});
EVO('gatling', 'vulcan', 'haste', {
  name: '火神熔彈砲', glyph: '熔', proj: 'tracer',
  evoDesc: '子彈變成一條連續的火線，貫穿敵人並在掃過的地面留下燃燒的彈道',
  ult: { id: 'yz_carpet', name: '燃燒地毯', desc: '呼叫轟炸機投下三排燃燒彈，把整片區域變成火海。' },
  mod: { m: { dmg: 2.3, cd: 1.6, speed: 1.3 }, a: { pierce: 2 }, s: { count: 1, jitter: 0.1, trail: 4, projR: 10 } },
});
EVO('runes', 'lancearray', 'wisdom', {
  name: '緋紅魔槍陣', glyph: '緋', proj: 'lance',
  evoDesc: '背後展開鮮紅魔法陣，追蹤符文變成從陣中射出、貫穿整排敵人的緋紅長槍；魔法陣照樣在敵群腳下展開',
  ult: { id: 'ss_doom', name: '終焉大魔法陣', desc: '鋪滿整個畫面的多層鮮紅魔法陣由外到內逐層亮起並束縛敵人，全部亮起後所有符文節點同時噴出紅色光柱。' },
  mod: { m: { dmg: 1.9, speed: 2.2, life: 0.45 }, s: { count: 3, spread: 0.26, homing: 0, pierce: 99, projR: 12, back: 26 } },
});
EVO('wisps', 'netherskull', 'regen', {
  name: '鬼火大王', glyph: '王', beh: 'skull',
  evoDesc: '小鬼火合體成一隻圓滾滾的大鬼火，自己在場上追著敵人啃咬；頭上的數字每咬一口就重抽一次，數字越大咬得越痛，咬死敵人時為主人回血',
  ult: { id: 'tk_maw', name: '大口吞吞', desc: '大鬼火變得超級巨大，張開嘴把範圍內的敵人吸過來一口吞下，血量低的敵人直接被吞掉。' },
  mod: { m: { dmg: 1.4 }, s: { biteCd: 0.34, biteR: 74, skullSpeed: 300, leash: 430 } },
});
EVO('pistol', 'twinbits', 'swift', {
  name: '浮游雙槍', glyph: '浮',
  evoDesc: '手上的槍變成兩把漂浮在肩上的浮游槍，各自瞄準不同目標、獨立開火，子彈會追蹤',
  ult: { id: 'hjm_array', name: '浮游砲陣', desc: '六把浮游槍展開成環繞著自己旋轉，持續向四周的敵人齊射。' },
  mod: { m: { dmg: 2.0 }, a: { pierce: 1 }, s: { bits: 1, dual: 0, homing: 4, burst: 2 } },
});
EVO('knives', 'glaive', 'magnet', {
  name: '歸鞘迴刃', glyph: '迴', proj: 'glaive',
  evoDesc: '一把把小飛刀合成一把大型迴旋刃：飛出去後會被吸回手上，去程回程各切一次，路徑上的敵人全部貫穿',
  ult: { id: 'wc_return', name: '萬刃歸宗', desc: '無數迴旋刃飛向四面八方，再一口氣全部吸回身上。' },
  mod: { m: { dmg: 5.6, cd: 1.25, speed: 0.9, life: 1.5 }, s: { count: 1, pierce: 99, ret: 1, projR: 34 } },
});
EVO('rocket', 'doomsday', 'area', {
  name: '末日彈頭', glyph: '核', proj: 'nuke',
  evoDesc: '多發火箭變成一顆緩慢飛行的巨型彈頭：落地出現蕈狀雲，並留下一片持續傷害的輻射區',
  ult: { id: 'mou_doom', name: '末日審判', desc: '一顆超大彈頭從天而降，蕈狀雲籠罩全場並留下大片輻射區。' },
  mod: { m: { dmg: 2.3, cd: 1.9, aoe: 2.2, speed: 0.5, life: 2.0 }, s: { count: 1, nuke: 1, projR: 16 } },
});
EVO('siege', 'titan', 'vigor', {
  name: '泰坦機甲', glyph: '泰', fx: 'heavy',
  evoDesc: '機甲整體變大換色：每一記重拳落地都向外擴散一圈衝擊波，護甲與生命再提升',
  ult: { id: 'mou_titan', name: '泰坦墜擊', desc: '機甲高高跳起砸下，衝擊波向外擴散三層並震暈敵人。' },
  mod: { m: { dmg: 1.25, hpMul: 1.12, range: 1.15 }, a: { armorAdd: 3 }, s: { titan: 1, combo: 2 } },
});
EVO('syringe', 'holychain', 'mend', {
  name: '聖療光鏈', glyph: '鏈', beh: 'chain',
  evoDesc: '針筒投射變成持續的光鏈：同時連住附近數個敵人造成傷害與毒素，另一端連著血量最低的隊友持續補血',
  ult: { id: 'lj_ark', name: '聖光方舟', desc: '光鏈連結全隊：復活倒地的隊友、回滿生命並給予短暫無敵，同時灼燒周圍所有敵人。' },
  mod: { m: { dmg: 0.75 }, s: { chainN: 3, chainR: 330, chainTick: 0.22 } },
});
EVO('skewer', 'shawarma', 'vigor', {
  name: '旋轉沙威瑪塔', glyph: '塔', proj: 'meatslice',
  evoDesc: '肩上扛著一支旋轉烤肉塔、手拿切肉刀：一刀一刀把肉片削飛出去，肉片飛得更遠並貫穿敵人；照樣會定期掉出烤肉',
  ult: { id: 'yd_feast', name: '烤肉盛宴', desc: '把烤肉塔插在地上：肉片不斷削飛出去攻擊周圍敵人，塔旁的隊友持續回血。' },
  mod: { m: { dmg: 1.5, cd: 0.75, speed: 0.95, life: 1.7, range: 1.5 }, s: { count: 3, spread: 0.45, pierce: 3, projR: 12, sliceCd: 0.2, sliceR: 340, towerHeal: 3.5, towerR: 190 } },
});
EVO('mines', 'gravball', 'area', {
  name: '重力派對球', glyph: '球',
  evoDesc: '地雷變成迪斯可重力球：被觸發後先把周圍敵人吸過來，再一口氣炸開',
  ult: { id: 'tt_dance', name: '黑洞舞池', desc: '丟出一顆巨型重力球，把全場敵人吸成一團後引爆。' },
  mod: { m: { dmg: 1.0, r: 1.25, cd: 1.2 }, s: { gravity: 1, cluster: 0 } },
});
EVO('cheer', 'rocketkart', 'swift', {
  name: '火箭蕉號', glyph: '箭',
  evoDesc: '卡丁車裝上火箭推進器：衝撞更痛、氮氣衝刺更頻繁，行駛時車尾一路丟下香蕉皮，踩到的敵人會滑倒並受傷',
  ult: { id: 'qq_finish', name: '火箭衝線', desc: '火箭全開高速狂飆數秒：無敵、衝撞傷害大增，沿路灑滿香蕉皮，結束時原地大爆炸；全隊同時獲得增幅。' },
  mod: { m: { dmg: 1.45, ramR: 1.2, boostCd: 0.6, boostDist: 1.3 }, s: { trail: 0, peel: 0.3 } },
});
EVO('drones', 'mothership', 'wisdom', {
  name: '母艦協議', glyph: '艦', beh: 'mothership',
  evoDesc: '小無人機合體成一艘懸浮母艦：用追蹤雷射持續照射敵人，並定期向敵群投下炸彈',
  ult: { id: 'mm_cannon', name: '蜂群空投', desc: '母艦打開艙門，放出一大群自爆無人機，各自追著敵人俯衝爆炸。' },
  mod: { m: { dmg: 13 }, s: { laserTick: 0.12, bombCd: 2.2, bombR: 90, bombDmg: 5 } },
});
EVO('cats', 'tiger', 'mend', {
  name: '虎爺降臨', glyph: '虎', beh: 'tiger',
  evoDesc: '小貓合體成一隻大老虎：對敵群撲擊造成範圍傷害與流血，呼嚕光環變大、治療更強',
  ult: { id: 'xs_twin', name: '雙王降臨', desc: '獅王出場與虎爺並肩作戰，虎爺同時變得更兇猛。' },
  mod: { m: { dmg: 2.0, cd: 0.9, purrHeal: 2.0, purrR: 1.4, leash: 1.2, speed: 1.25 }, s: { count: 1, pounceR: 84 } },
});
EVO('bait', 'cashnado', 'magnet', {
  name: '鈔票龍捲風', glyph: '捲',
  evoDesc: '丟出去的鈔票捲成一道鈔票龍捲風：吸引敵人並把他們吸進去絞切，結束時金幣四散爆開',
  ult: { id: 'lk_goldtank', name: '土豪金坦克', desc: '開出一台純金加長禮車坦克：砲管噴鈔票和金條，一邊開一邊撒錢，隊友靠近會獲得增益。' },
  mod: { m: { boomDmg: 1.3, decoyR: 1.15 }, a: { decoyDur: 1.5 }, s: { tornado: 1, coins: 3 } },
});
EVO('dragonfire', 'truedragon', 'power', {
  name: '真龍顯現', glyph: '龍',
  evoDesc: '纏在手臂上的小火龍取代了火球：直接對敵人吐出扇形龍息並點燃他們，增益光環照舊',
  ult: { id: 'nf_breath', name: '真龍吐息', desc: '一條巨龍橫越整個畫面，沿路噴出龍炎並留下燃燒的地面；全隊獲得傷害加成。' },
  mod: { m: { dmg: 2.0, cd: 0.85 }, s: { dragon: 1, count: 1, breathR: 200, breathArc: 1.15, dot: 14, dotDur: 3 } },
});
EVO('revolver', 'reapersniper', 'crit', {
  name: '死神狙擊', glyph: '狙',
  evoDesc: '左輪換成長管狙擊槍：子彈變成瞬間貫穿整個畫面的狙擊光線；暴擊時在命中點引發爆炸',
  ult: { id: 'fj_judge', name: '死神審判', desc: '時間凝結，鎖定全場敵人，接著一槍同時貫穿所有目標。' },
  mod: { m: { dmg: 1.65, cd: 1.5 }, a: { critAdd: 0.1 }, s: { rail: 1, railLen: 1150, railW: 30, railBoom: 78, lastAoe: 0 } },
});
EVO('beads', 'dharmawheel', 'armor', {
  name: '金剛法輪', glyph: '輪', beh: 'wheel', proj: 'wheel',
  evoDesc: '佛珠合成一個巨大的金色法輪：環繞範圍更大、碾過的敵人被緩速，並定期飛出去輾過敵群再飛回來',
  ult: { id: 'al_wheel', name: '法輪常轉', desc: '巨大法輪從天而降碾壓戰場並持續轉動，全場敵人定身，隊友獲得護盾。' },
  mod: { m: { dmg: 4.2, radius: 1.25 }, s: { count: 1, hitCd: 0.24, wheelR: 58, throwCd: 4.5, throwDist: 430, throwDmg: 1.6 } },
});

// ───── 章節副武器：打倒特定首領後永久解鎖（unlock = 關卡 id，玩家事先不知道是哪一隻）。帶屬性 el：帶著上場時，對被該屬性克制的怪傷害 +1% ─────
W('sub_icering', {
  name: '冰錐環', glyph: '錐', beh: 'icering', sub: true, el: 'ice', unlock: '8-B',
  base: { dmg: 13, cd: 3.0, count: 8, speed: 420, life: 0.75, pierce: 1, slow: 0.3, slowDur: 1.6, shard: 0 },
  lv: [
    ['冰錐 +4', { a: { count: 4 } }],
    ['傷害 +40%', { m: { dmg: 1.4 } }],
    ['冷卻 -25%，貫穿 +1', { m: { cd: 0.75 }, a: { pierce: 1 } }],
    ['冰錐 +4，命中後碎裂成 3 片小冰片', { a: { count: 4 }, s: { shard: 3 } }],
  ],
});
W('sub_drum', {
  name: '雷鼓', glyph: '鼓', beh: 'drum', sub: true, el: 'thunder', unlock: '27-B',
  base: { dmg: 20, cd: 1.5, jumps: 3, range: 380, jumpR: 190, falloff: 0.82, bolt: 0 },
  lv: [
    ['連鎖 +2', { a: { jumps: 2 } }],
    ['傷害 +35%', { m: { dmg: 1.35 } }],
    ['冷卻 -20%', { m: { cd: 0.8 } }],
    ['連鎖 +2，每第 4 下改成全畫面落雷', { a: { jumps: 2 }, s: { bolt: 4 } }],
  ],
});
export const SUB_WEAPONS = Object.values(WEAPONS).filter((w) => w.sub).map((w) => w.id);

export function weaponStats(def, level) {
  const s = Object.assign({}, def.base);
  for (let i = 0; i < level - 1 && i < def.lv.length; i++) {
    const mod = def.lv[i][1];
    if (mod.m) for (const k in mod.m) s[k] = (s[k] || 0) * mod.m[k];
    if (mod.a) for (const k in mod.a) s[k] = (s[k] || 0) + mod.a[k];
    if (mod.s) for (const k in mod.s) s[k] = mod.s[k];
  }
  const em = def.evoMod;
  if (em) {
    if (em.m) for (const k in em.m) s[k] = (s[k] || 0) * em.m[k];
    if (em.a) for (const k in em.a) s[k] = (s[k] || 0) + em.a[k];
    if (em.s) for (const k in em.s) s[k] = em.s[k];
  }
  return s;
}
