// 敵人資料。ai 對應 sim/enemy.js 的行為；sprite 對應 render/enemySprites.js。
// 清單順序即網路同步索引：新增敵人請加在最後面。
export const ENEMY_LIST = [];
export const ENEMIES = {};
const E = (id, def) => { def.id = id; def.idx = ENEMY_LIST.length; ENEMY_LIST.push(def); ENEMIES[id] = def; };

// 第一章：霓虹後巷
E('slime', { name: '垃圾史萊姆', hp: 14, speed: 62, dmg: 6, r: 13, xp: 1, ai: 'chase' });
E('bat', { name: '霓虹蝙蝠', hp: 8, speed: 120, dmg: 5, r: 10, xp: 1, ai: 'swarm', fly: true });
E('bag', { name: '毒垃圾袋', hp: 20, speed: 84, dmg: 11, r: 13, xp: 2, ai: 'exploder', boomR: 72 });
E('vending', { name: '故障販賣機', hp: 60, speed: 42, dmg: 9, r: 17, xp: 4, ai: 'shooter', proj: 'e_can', shotCd: 2.6, shotRange: 340, shotSpeed: 230 });
E('dog', { name: '機械野狗', hp: 30, speed: 80, dmg: 7, r: 14, xp: 3, ai: 'charger' });
// 第二章：地下格鬥城
E('thug', { name: '浣熊打手', hp: 30, speed: 80, dmg: 10, r: 13, xp: 2, ai: 'chase' });
E('chip', { name: '籌碼蟲', hp: 10, speed: 132, dmg: 6, r: 9, xp: 1, ai: 'swarm' });
E('brute', { name: '鐵鍊猩猩', hp: 180, speed: 50, dmg: 20, r: 21, xp: 8, ai: 'chase', kbRes: 0.8 });
E('shroom', { name: '毒氣菇', hp: 45, speed: 46, dmg: 10, r: 14, xp: 4, ai: 'shooter', proj: 'e_spore', shotCd: 2.8, shotRange: 320, shotSpeed: 190, shotCount: 3 });
E('ooze', { name: '分裂軟泥', hp: 70, speed: 60, dmg: 10, r: 17, xp: 4, ai: 'chase', split: 'oozelet', splitN: 3 });
E('oozelet', { name: '小軟泥', hp: 18, speed: 96, dmg: 6, r: 10, xp: 1, ai: 'chase' });
// 第三章：虛空數據城
E('glitch', { name: '故障體', hp: 55, speed: 92, dmg: 12, r: 14, xp: 3, ai: 'blink' });
E('bug', { name: '資料蟲', hp: 16, speed: 142, dmg: 7, r: 9, xp: 1, ai: 'swarm' });
E('sentry', { name: '防火牆哨兵', hp: 320, speed: 44, dmg: 24, r: 22, xp: 12, ai: 'chase', kbRes: 0.9 });
E('eye', { name: '監視之眼', hp: 70, speed: 70, dmg: 12, r: 14, xp: 5, ai: 'shooter', fly: true, proj: 'e_laser', shotCd: 2.4, shotRange: 380, shotSpeed: 330 });
E('virus', { name: '病毒炸彈', hp: 40, speed: 106, dmg: 16, r: 13, xp: 3, ai: 'exploder', boomR: 80 });
// 目標物
E('nest', { name: '巢穴', hp: 220, speed: 0, dmg: 0, r: 26, xp: 20, ai: 'nest', kbRes: 1, structure: true });
// 首領
E('golem', { name: '垃圾巨像', hp: 18000, speed: 58, dmg: 22, r: 44, xp: 300, ai: 'boss_golem', kbRes: 1, boss: true });
E('champ', { name: '鐵籠拳王', hp: 32000, speed: 72, dmg: 26, r: 40, xp: 400, ai: 'boss_champ', kbRes: 1, boss: true });
E('warden', { name: '核心守門者', hp: 46000, speed: 50, dmg: 28, r: 46, xp: 500, ai: 'boss_warden', kbRes: 1, boss: true, fly: true });
// 獎勵關的寶藏怪
E('goblin', { name: '運鈔黃鼠狼', hp: 60, speed: 150, dmg: 0, r: 13, xp: 3, ai: 'flee', coins: 12 });
// ── 第二批新增（一律加在最後，順序是網路同步索引） ──
E('conecrab', { name: '路錐寄居蟹', hp: 70, speed: 42, dmg: 9, r: 16, xp: 5, ai: 'chase', kbRes: 0.6 });
E('signghost', { name: '霓虹招牌鬼', hp: 40, speed: 64, dmg: 9, r: 14, xp: 4, ai: 'shooter', fly: true, proj: 'e_orb', shotCd: 3.3, shotRange: 320, shotSpeed: 185 });
E('roach', { name: '後巷蟑螂', hp: 6, speed: 150, dmg: 4, r: 8, xp: 1, ai: 'swarm' });
E('sandbag', { name: '沙包怪', hp: 240, speed: 46, dmg: 18, r: 19, xp: 9, ai: 'chase', kbRes: 0.85 });
E('dice', { name: '骰子炸彈', hp: 30, speed: 96, dmg: 15, r: 13, xp: 3, ai: 'exploder', boomR: 78 });
E('tire', { name: '輪胎怪', hp: 48, speed: 90, dmg: 12, r: 15, xp: 4, ai: 'charger' });
E('cursor', { name: '游標群', hp: 12, speed: 150, dmg: 6, r: 9, xp: 1, ai: 'swarm' });
E('popup', { name: '彈出視窗怪', hp: 80, speed: 56, dmg: 11, r: 16, xp: 5, ai: 'shooter', fly: true, proj: 'e_orb', shotCd: 2.6, shotRange: 340, shotSpeed: 210, shotCount: 2 });
E('trojan', { name: '木馬', hp: 130, speed: 54, dmg: 14, r: 18, xp: 6, ai: 'chase', split: 'bug', splitN: 4, kbRes: 0.4 });
