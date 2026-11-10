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
  base: { dmg: 11, cd: 0.25, range: 66, arc: 1.8, kb: 55, combo: 4, comboMul: 2.6, comboR: 95 },
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
  name: '棒球球棒', glyph: '棒', beh: 'melee', fx: 'wood',
  base: { dmg: 24, cd: 0.7, range: 96, arc: 2.2, kb: 380, ballEvery: 3, ballDmg: 1.4 },
  lv: [
    ['傷害 +25%', { m: { dmg: 1.25 } }],
    ['每 2 次揮棒擊出棒球', { s: { ballEvery: 2 } }],
    ['攻擊範圍 +20%', { m: { range: 1.2 } }],
    ['棒球多彈跳 2 次、傷害 +30%', { a: { ballBounce: 2 }, m: { ballDmg: 1.3 } }],
    ['冷卻 -18%', { m: { cd: 0.82 } }],
    ['傷害 +35%，每次揮棒都擊出棒球', { m: { dmg: 1.35 }, s: { ballEvery: 1 } }],
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
  base: { dmg: 13, cd: 0.5, count: 3, regen: 1.1, speed: 520, homing: 8, minDigit: 1, aoe: 0, range: 520 },
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
  base: { dmg: 13, cd: 0.5, count: 1, speed: 680, pierce: 1, life: 0.8, range: 440, dot: 12, dotDur: 3,
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
  base: { dmg: 9, count: 4, radius: 95, rot: 3.2, hitCd: 0.45, slow: 0.35, slowDur: 1.2, pulseCd: 6, pulseR: 150, pulseStun: 1.0 },
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
  name: '應援音波', glyph: '援', beh: 'pulse',
  base: { dmg: 16, cd: 1.6, r: 150, kb: 70, buffDmg: 0.1, buffHaste: 0, buffDur: 3 },
  lv: [
    ['音波範圍 +20%', { m: { r: 1.2 } }],
    ['增幅：攻擊力加成提升至 16%', { s: { buffDmg: 0.16 } }],
    ['傷害 +35%', { m: { dmg: 1.35 } }],
    ['增幅同時提升 12% 攻速', { s: { buffHaste: 0.12 } }],
    ['冷卻 -22%', { m: { cd: 0.78 } }],
    ['攻擊力加成提升至 25%，範圍 +20%', { s: { buffDmg: 0.25 }, m: { r: 1.2 } }],
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

export const SUB_WEAPONS = Object.values(WEAPONS).filter((w) => w.sub).map((w) => w.id);

export function weaponStats(def, level) {
  const s = Object.assign({}, def.base);
  for (let i = 0; i < level - 1 && i < def.lv.length; i++) {
    const mod = def.lv[i][1];
    if (mod.m) for (const k in mod.m) s[k] = (s[k] || 0) * mod.m[k];
    if (mod.a) for (const k in mod.a) s[k] = (s[k] || 0) + mod.a[k];
    if (mod.s) for (const k in mod.s) s[k] = mod.s[k];
  }
  return s;
}
