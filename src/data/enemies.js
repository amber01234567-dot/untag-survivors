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
// ── 第二系列：廢土荒野（第四～六章） ──
// 第四章：廢棄公路
E('tumble', { name: '風滾草怪', hp: 18, speed: 150, dmg: 8, r: 10, xp: 2, ai: 'swarm' });
E('lizard', { name: '變異蜥蜴', hp: 58, speed: 92, dmg: 13, r: 13, xp: 3, ai: 'chase' });
E('vulture', { name: '禿鷹', hp: 46, speed: 96, dmg: 12, r: 13, xp: 4, ai: 'shooter', fly: true, proj: 'e_orb', shotCd: 2.8, shotRange: 360, shotSpeed: 220 });
E('scrapbot', { name: '拾荒機器人', hp: 95, speed: 54, dmg: 13, r: 15, xp: 5, ai: 'shooter', proj: 'e_can', shotCd: 2.4, shotRange: 380, shotSpeed: 250, shotCount: 2 });
E('barrelbug', { name: '油桶蟲', hp: 42, speed: 108, dmg: 20, r: 13, xp: 3, ai: 'exploder', boomR: 86 });
E('cactus', { name: '仙人掌怪', hp: 300, speed: 46, dmg: 20, r: 19, xp: 10, ai: 'burst', kbRes: 0.85, proj: 'e_spore', shotCd: 4.2, shotSpeed: 170, shotCount: 8 });
// 第五章：沙塵峽谷
E('scorp', { name: '沙蠍', hp: 70, speed: 92, dmg: 15, r: 14, xp: 4, ai: 'charger' });
E('raider', { name: '拾荒豺狼', hp: 74, speed: 98, dmg: 15, r: 13, xp: 3, ai: 'chase' });
E('sandworm', { name: '沙蟲', hp: 90, speed: 84, dmg: 16, r: 15, xp: 5, ai: 'blink' });
E('mortar', { name: '砲龜', hp: 150, speed: 40, dmg: 20, r: 17, xp: 7, ai: 'lobber', kbRes: 0.6, shotCd: 3.6, shotRange: 460 });
E('dustling', { name: '沙塵精', hp: 20, speed: 158, dmg: 9, r: 10, xp: 2, ai: 'swarm', fly: true });
E('bison', { name: '鐵甲野牛', hp: 400, speed: 62, dmg: 26, r: 22, xp: 13, ai: 'charger', kbRes: 0.9 });
// 第六章：隕石坑
E('shard', { name: '隕石碎塊', hp: 26, speed: 160, dmg: 10, r: 10, xp: 2, ai: 'swarm', fly: true });
E('magma', { name: '熔岩史萊姆', hp: 120, speed: 66, dmg: 16, r: 17, xp: 5, ai: 'chase', split: 'magmalet', splitN: 3 });
E('magmalet', { name: '小熔岩', hp: 30, speed: 110, dmg: 10, r: 10, xp: 1, ai: 'chase' });
E('wreckdrone', { name: '殘骸無人機', hp: 100, speed: 78, dmg: 15, r: 14, xp: 6, ai: 'shooter', fly: true, proj: 'e_laser', shotCd: 2.3, shotRange: 400, shotSpeed: 340, shotCount: 2 });
E('crystal', { name: '水晶甲蟲', hp: 460, speed: 48, dmg: 24, r: 21, xp: 14, ai: 'burst', kbRes: 0.9, proj: 'e_orb', shotCd: 3.8, shotSpeed: 180, shotCount: 10 });
E('radrat', { name: '輻射鼠', hp: 55, speed: 128, dmg: 24, r: 12, xp: 4, ai: 'exploder', boomR: 92 });
E('titanhand', { name: '機械殘肢', hp: 170, speed: 84, dmg: 20, r: 17, xp: 7, ai: 'charger', kbRes: 0.5 });
// 首領
E('rig', { name: '暴走聯結車', hp: 50000, speed: 70, dmg: 25, r: 48, xp: 600, ai: 'boss_rig', kbRes: 1, boss: true });
E('wormqueen', { name: '沙蟲女王', hp: 60000, speed: 56, dmg: 25, r: 46, xp: 700, ai: 'boss_wormqueen', kbRes: 1, boss: true });
E('colossus', { name: '隕星機神', hp: 72000, speed: 52, dmg: 26, r: 50, xp: 800, ai: 'boss_colossus', kbRes: 1, boss: true });
// ───── 第三系列：永凍冰原（冰屬性）─────
E('snowling', { name: '雪球怪', hp: 19, speed: 142, dmg: 8, r: 10, xp: 2, ai: 'swarm' });
E('frostwolf', { name: '雪狼', hp: 60, speed: 104, dmg: 13, r: 13, xp: 3, ai: 'chase' });
E('pengu', { name: '企鵝水兵', hp: 90, speed: 78, dmg: 18, r: 13, xp: 5, ai: 'charger', kbRes: 0.3 });
E('icecrab', { name: '冰晶蟹', hp: 72, speed: 58, dmg: 13, r: 14, xp: 4, ai: 'shooter', proj: 'e_ice', shotCd: 2.6, shotRange: 370, shotSpeed: 230 });
E('snowman', { name: '擲彈雪人', hp: 165, speed: 42, dmg: 20, r: 17, xp: 7, ai: 'lobber', kbRes: 0.6, shotCd: 3.4, shotRange: 450 });
E('captain', { name: '冰霜船長', hp: 74000, speed: 56, dmg: 27, r: 48, xp: 900, ai: 'boss_captain', kbRes: 1, boss: true });
E('icewalrus', { name: '冰甲海象', hp: 420, speed: 58, dmg: 26, r: 22, xp: 13, ai: 'charger', kbRes: 0.9 });
E('frostwisp', { name: '冰靈', hp: 44, speed: 112, dmg: 21, r: 13, xp: 3, ai: 'exploder', boomR: 90, fly: true });
E('snowowl', { name: '雪鴞', hp: 50, speed: 100, dmg: 13, r: 13, xp: 4, ai: 'shooter', fly: true, proj: 'e_ice', shotCd: 2.6, shotRange: 380, shotSpeed: 240 });
E('iceguard', { name: '冰甲衛兵', hp: 320, speed: 48, dmg: 21, r: 19, xp: 11, ai: 'burst', kbRes: 0.85, proj: 'e_ice', shotCd: 4.0, shotSpeed: 180, shotCount: 8 });
E('icegolem', { name: '冰晶巨像', hp: 72000, speed: 50, dmg: 28, r: 50, xp: 950, ai: 'boss_icegolem', kbRes: 1, boss: true });
E('icequeen', { name: '冰雪女王', hp: 74000, speed: 62, dmg: 29, r: 44, xp: 1000, ai: 'boss_icequeen', kbRes: 1, boss: true });
// ───── 第四系列：熔岩火山（火屬性）─────
E('ember', { name: '火星子', hp: 21, speed: 146, dmg: 9, r: 10, xp: 2, ai: 'swarm' });
E('lavalizard', { name: '熔岩蜥蜴', hp: 66, speed: 100, dmg: 14, r: 13, xp: 3, ai: 'chase' });
E('volturtle', { name: '火山龜', hp: 170, speed: 40, dmg: 21, r: 17, xp: 7, ai: 'lobber', kbRes: 0.6, shotCd: 3.4, shotRange: 460 });
E('bombbeetle', { name: '炸彈甲蟲', hp: 46, speed: 110, dmg: 22, r: 13, xp: 3, ai: 'exploder', boomR: 92 });
E('lavabull', { name: '熔岩蠻牛', hp: 76000, speed: 66, dmg: 29, r: 50, xp: 1050, ai: 'boss_lavabull', kbRes: 1, boss: true });
E('firebat', { name: '火蝙蝠', hp: 52, speed: 104, dmg: 13, r: 13, xp: 4, ai: 'shooter', fly: true, proj: 'e_fire', shotCd: 2.6, shotRange: 380, shotSpeed: 240 });
E('obgolem', { name: '黑曜石魔像', hp: 340, speed: 46, dmg: 22, r: 19, xp: 11, ai: 'burst', kbRes: 0.85, proj: 'e_fire', shotCd: 4.0, shotSpeed: 180, shotCount: 8 });
E('firepriest', { name: '火焰祭司', hp: 96, speed: 86, dmg: 17, r: 14, xp: 6, ai: 'blink' });
E('whelp', { name: '幼龍', hp: 430, speed: 62, dmg: 27, r: 21, xp: 13, ai: 'charger', kbRes: 0.85 });
E('obscorp', { name: '黑曜石巨蠍', hp: 70000, speed: 60, dmg: 30, r: 50, xp: 1100, ai: 'boss_obscorp', kbRes: 1, boss: true });
E('firedragon', { name: '炎龍', hp: 76000, speed: 58, dmg: 31, r: 56, xp: 1300, ai: 'boss_firedragon', kbRes: 1, boss: true });
// ───── 第五系列：瘴氣毒沼（毒屬性）─────
E('mudling', { name: '毒泥怪', hp: 22, speed: 144, dmg: 9, r: 10, xp: 2, ai: 'swarm' });
E('mosquito', { name: '沼澤蚊', hp: 50, speed: 122, dmg: 13, r: 12, xp: 3, ai: 'chase', fly: true });
E('toad', { name: '毒蟾蜍', hp: 175, speed: 40, dmg: 21, r: 17, xp: 7, ai: 'lobber', kbRes: 0.6, shotCd: 3.4, shotRange: 460 });
E('rotter', { name: '腐屍', hp: 300, speed: 50, dmg: 22, r: 18, xp: 9, ai: 'chase', kbRes: 0.7 });
E('bogfrog', { name: '沼澤巨蛙', hp: 68000, speed: 54, dmg: 31, r: 52, xp: 1250, ai: 'boss_bogfrog', kbRes: 1, boss: true });
E('sporeshroom', { name: '孢子菇', hp: 48, speed: 108, dmg: 23, r: 13, xp: 3, ai: 'exploder', boomR: 92 });
E('sporeflower', { name: '噴孢花', hp: 350, speed: 44, dmg: 23, r: 19, xp: 11, ai: 'burst', kbRes: 0.85, proj: 'e_spore', shotCd: 4.0, shotSpeed: 180, shotCount: 8 });
E('wraith', { name: '亡靈', hp: 100, speed: 88, dmg: 18, r: 14, xp: 6, ai: 'blink', fly: true });
E('skelarcher', { name: '骷髏射手', hp: 78, speed: 60, dmg: 14, r: 14, xp: 5, ai: 'shooter', proj: 'e_spore', shotCd: 2.4, shotRange: 400, shotSpeed: 260 });
E('sporemother', { name: '孢子母菇', hp: 64000, speed: 0, dmg: 32, r: 58, xp: 1300, ai: 'boss_sporemother', kbRes: 1, boss: true });
E('plaguelord', { name: '瘟疫領主', hp: 70000, speed: 62, dmg: 33, r: 48, xp: 1500, ai: 'boss_plaguelord', kbRes: 1, boss: true });
// ───── 第六系列：黃金神殿（金屬性：攻擊力較高）─────
E('coinling', { name: '金幣怪', hp: 23, speed: 146, dmg: 9, r: 10, xp: 2, ai: 'swarm' });
E('swordsman', { name: '持刀兵俑', hp: 72, speed: 98, dmg: 14, r: 13, xp: 3, ai: 'chase' });
E('crossbow', { name: '弓弩兵俑', hp: 76, speed: 56, dmg: 14, r: 14, xp: 4, ai: 'shooter', proj: 'e_gold', shotCd: 2.5, shotRange: 400, shotSpeed: 270 });
E('lionling', { name: '小石獅', hp: 110, speed: 78, dmg: 19, r: 14, xp: 5, ai: 'charger', kbRes: 0.4 });
E('stonelion', { name: '鎮殿石獅', hp: 64000, speed: 62, dmg: 33, r: 50, xp: 1500, ai: 'boss_stonelion', kbRes: 1, boss: true });
E('shieldman', { name: '持盾兵俑', hp: 330, speed: 50, dmg: 22, r: 18, xp: 9, ai: 'chase', kbRes: 0.8 });
E('dingmon', { name: '青銅鼎怪', hp: 185, speed: 40, dmg: 22, r: 17, xp: 7, ai: 'lobber', kbRes: 0.6, shotCd: 3.4, shotRange: 460 });
E('goldguard', { name: '金甲親衛', hp: 360, speed: 48, dmg: 24, r: 19, xp: 12, ai: 'burst', kbRes: 0.85, proj: 'e_gold', shotCd: 4.0, shotSpeed: 185, shotCount: 8 });
E('mimic', { name: '寶箱怪', hp: 60, speed: 112, dmg: 25, r: 14, xp: 4, ai: 'exploder', boomR: 96, coins: 2 });
E('general', { name: '兵俑將軍', hp: 68000, speed: 60, dmg: 34, r: 50, xp: 1600, ai: 'boss_general', kbRes: 1, boss: true });
E('emperor', { name: '黃金帝王', hp: 68000, speed: 70, dmg: 35, r: 56, xp: 1800, ai: 'boss_emperor', kbRes: 1, boss: true });
// ───── 第七系列：浮空風島（風屬性：移動較快）─────
E('windling', { name: '風精', hp: 22, speed: 150, dmg: 9, r: 10, xp: 2, ai: 'swarm', fly: true });
E('sparrow', { name: '山雀', hp: 56, speed: 118, dmg: 14, r: 12, xp: 3, ai: 'chase', fly: true });
E('kitemon', { name: '紙風箏怪', hp: 60, speed: 96, dmg: 14, r: 13, xp: 4, ai: 'shooter', fly: true, proj: 'e_wind', shotCd: 2.5, shotRange: 390, shotSpeed: 260 });
E('goat', { name: '山羊', hp: 130, speed: 80, dmg: 20, r: 15, xp: 6, ai: 'charger', kbRes: 0.5 });
E('thunderbird', { name: '風暴大鵬', hp: 66000, speed: 70, dmg: 35, r: 52, xp: 1800, ai: 'boss_thunderbird', kbRes: 1, boss: true, fly: true });
E('dandelion', { name: '蒲公英怪', hp: 50, speed: 110, dmg: 24, r: 13, xp: 3, ai: 'exploder', boomR: 94, fly: true });
E('millsoldier', { name: '風車兵', hp: 370, speed: 46, dmg: 24, r: 19, xp: 12, ai: 'burst', kbRes: 0.85, proj: 'e_wind', shotCd: 4.0, shotSpeed: 185, shotCount: 8 });
E('crowtengu', { name: '烏天狗', hp: 105, speed: 92, dmg: 19, r: 14, xp: 6, ai: 'blink', fly: true });
E('yamabushi', { name: '山伏僧', hp: 350, speed: 52, dmg: 23, r: 18, xp: 10, ai: 'chase', kbRes: 0.8 });
E('millgolem', { name: '風車巨怪', hp: 64000, speed: 54, dmg: 36, r: 56, xp: 1900, ai: 'boss_millgolem', kbRes: 1, boss: true });
E('tengu', { name: '大天狗', hp: 70000, speed: 74, dmg: 37, r: 46, xp: 2100, ai: 'boss_tengu', kbRes: 1, boss: true, fly: true });
E('tenguclone', { name: '天狗分身', hp: 1, speed: 0, dmg: 20, r: 40, xp: 0, ai: 'clone', kbRes: 1, fly: true });
// ───── 第八系列：巨岩峽谷（土屬性：較耐打）─────
E('pebble', { name: '碎石怪', hp: 24, speed: 144, dmg: 10, r: 10, xp: 2, ai: 'swarm' });
E('rocklizard', { name: '岩蜥', hp: 80, speed: 98, dmg: 15, r: 13, xp: 3, ai: 'chase' });
E('monkey', { name: '投石猴', hp: 150, speed: 60, dmg: 22, r: 15, xp: 6, ai: 'lobber', kbRes: 0.4, shotCd: 3.2, shotRange: 460 });
E('pangolin', { name: '穿山甲', hp: 150, speed: 80, dmg: 21, r: 15, xp: 6, ai: 'charger', kbRes: 0.6 });
E('rockturtle', { name: '岩甲巨龜', hp: 56000, speed: 50, dmg: 38, r: 58, xp: 2100, ai: 'boss_rockturtle', kbRes: 1, boss: true });
E('genin', { name: '下忍', hp: 110, speed: 94, dmg: 20, r: 13, xp: 6, ai: 'blink' });
E('shurinin', { name: '手裏劍忍者', hp: 90, speed: 62, dmg: 15, r: 13, xp: 5, ai: 'shooter', proj: 'e_rock', shotCd: 2.3, shotRange: 410, shotSpeed: 280 });
E('stonegolem', { name: '岩石魔像', hp: 460, speed: 44, dmg: 25, r: 20, xp: 13, ai: 'burst', kbRes: 0.9, proj: 'e_rock', shotCd: 4.0, shotSpeed: 185, shotCount: 8 });
E('haniwa', { name: '土偶', hp: 56, speed: 108, dmg: 26, r: 13, xp: 3, ai: 'exploder', boomR: 96 });
E('spiderling', { name: '小蜘蛛', hp: 26, speed: 150, dmg: 10, r: 10, xp: 2, ai: 'swarm' });
E('tsuchigumo', { name: '土蜘蛛', hp: 54000, speed: 64, dmg: 39, r: 56, xp: 2300, ai: 'boss_tsuchigumo', kbRes: 1, boss: true });
E('ninjamaster', { name: '忍軍頭領', hp: 56000, speed: 78, dmg: 40, r: 44, xp: 2500, ai: 'boss_ninjamaster', kbRes: 1, boss: true });
// ───── 第九系列：雷雲尖塔（雷屬性：打到會麻痺）─────
E('sparkball', { name: '電氣球', hp: 25, speed: 148, dmg: 10, r: 10, xp: 2, ai: 'swarm', fly: true });
E('weasel', { name: '雷鼬', hp: 78, speed: 124, dmg: 16, r: 12, xp: 3, ai: 'chase' });
E('drumkid', { name: '小鼓童', hp: 96, speed: 60, dmg: 16, r: 14, xp: 5, ai: 'shooter', proj: 'e_spark', shotCd: 2.4, shotRange: 400, shotSpeed: 270 });
E('lantern', { name: '提燈怪', hp: 58, speed: 110, dmg: 27, r: 13, xp: 3, ai: 'exploder', boomR: 96, fly: true });
E('raiju', { name: '雷獸', hp: 54000, speed: 84, dmg: 41, r: 50, xp: 2500, ai: 'boss_raiju', kbRes: 1, boss: true });
E('coilsentry', { name: '線圈哨兵', hp: 300, speed: 0, dmg: 22, r: 18, xp: 10, ai: 'burst', kbRes: 1, proj: 'e_spark', shotCd: 3.2, shotSpeed: 190, shotCount: 10 });
E('eeldragon', { name: '電鰻龍', hp: 120, speed: 96, dmg: 21, r: 14, xp: 6, ai: 'blink', fly: true });
E('drumwarrior', { name: '雷鼓武者', hp: 500, speed: 64, dmg: 29, r: 21, xp: 14, ai: 'charger', kbRes: 0.9 });
E('cloudsprite', { name: '雷雲精', hp: 150, speed: 70, dmg: 24, r: 15, xp: 7, ai: 'lobber', fly: true, shotCd: 3.0, shotRange: 470 });
E('mechguard', { name: '雷電機兵', hp: 56000, speed: 56, dmg: 42, r: 56, xp: 2700, ai: 'boss_mechguard', kbRes: 1, boss: true });
E('raijin', { name: '雷神', hp: 76000, speed: 72, dmg: 44, r: 52, xp: 4000, ai: 'boss_raijin', kbRes: 1, boss: true, fly: true });
