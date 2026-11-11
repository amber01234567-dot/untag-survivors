// 角色資料。新增角色只要在這裡加一筆 C({...})：
//   unlock → 解鎖價格；目前全角色免費（0）。之後若要做需解鎖的角色，填金額即可，介面會自動顯示。
//   weapon → data/weapons.js     skill / ult → sim/skills.js 內同名實作
//   look   → render/chibi.js 內的外觀（沒有就用剪影佔位）
export const CHARS = {};
export const CHAR_LIST = [];
const C = (def) => { CHARS[def.id] = def; CHAR_LIST.push(def); };

export const ROLES = {
  melee: { name: '近戰', color: '#e2574c' },
  ranged: { name: '遠攻', color: '#35c6d6' },
  support: { name: '輔助', color: '#e8b34a' },
};

// ───────── 近戰 ─────────
C({
  id: 'laoliu', name: '老劉', en: 'LAO LIU', role: 'melee', cls: 'Saber', species: '擬人化小白狗',
  hp: 140, speed: 150, armor: 2, weapon: 'greatsword', unlock: 0, sheet: true,
  quote: '不被定義，不被束縛，向之前的表格一樣。', desc: '雙手劍大範圍橫掃，升級後揮出貫穿戰場的劍氣。',
  skill: { id: 'll_charge', name: '衝鋒斬', cd: 7, desc: '向前突進並斬擊路徑上的所有敵人，期間無敵。' },
  ult: { id: 'll_storm', name: '劍氣風暴', charge: 180, desc: '向四面八方放出兩輪巨大劍氣。' },
});
C({
  id: 'xia', name: '夏', en: 'XIA', role: 'melee', cls: 'Berserker', species: '擬人化水豚',
  hp: 160, speed: 140, armor: 3, weapon: 'greataxe', unlock: 0, sheet: true,
  quote: '我啊，就是想過得舒服而已。', desc: '雙手斧每一擊都沉重無比，連擊觸發 360° 旋風斬。',
  skill: { id: 'xia_whirl', name: '旋風斬', cd: 10, desc: '3 秒內持續旋轉，對周圍敵人連續造成傷害。' },
  ult: { id: 'xia_quake', name: '裂地斬', charge: 200, desc: '重擊地面，大範圍巨量傷害並暈眩敵人。' },
});
C({
  id: 'gouqi', name: '狗企', en: 'GOU QI', role: 'melee', cls: 'Assassin', species: '擬人化老鼠',
  hp: 95, speed: 185, armor: 0, weapon: 'cleaver', unlock: 0, sheet: true, small: 0.82,
  quote: '垃圾也有價值，重點是你怎麼利用它。',
  desc: '來自地下廢棄街區的老鼠廚師。菜刀快速劈砍並塗有毒素，定期丟出飛旋菜刀。',
  skill: { id: 'gq_stealth', name: '氣息遮蔽', cd: 9, desc: '隱身 3 秒：敵人失去目標、移速提升，期間與結束後短暫傷害加倍。' },
  ult: { id: 'gq_empire', name: '垃圾再生・鼠道帝國', charge: 190, desc: '將周圍化為垃圾洪流緩速並腐蝕敵人，同時召喚垃圾鼠軍團。' },
});
C({
  id: 'tingge', name: '庭哥', en: 'TING GE', role: 'melee', cls: 'Berserker', species: '擬人化兔子',
  hp: 130, speed: 168, armor: 1, weapon: 'gloves', unlock: 0, sheet: true,
  quote: '規則是給弱者寫的，我，只打想打的仗。',
  desc: '地下格鬥場的兔子拳手。出拳極快，連擊的最後一拳引爆衝擊波。',
  skill: { id: 'tg_dash', name: '心眼・閃身', cd: 6, desc: '瞬間突進並穿過敵人造成傷害，短暫無敵。' },
  ult: { id: 'tg_limit', name: '無束之拳・極限解放', charge: 180, desc: '8 秒內攻速、移速、傷害大幅提升，每一拳都帶衝擊波，結束時打出終極一拳。' },
});
C({
  id: 'shaonian', name: '少年', en: 'SHAO NIAN', role: 'melee', cls: 'Lancer', species: '擬人化少年',
  hp: 120, speed: 160, armor: 1, weapon: 'bat', unlock: 0, sheet: true,
  quote: '別惹我，不然敲到你清醒為止！', desc: '來自混亂街區的叛逆少年。狼牙棒把敵人打飛，還會甩出彈跳的尖刺鐵球。',
  skill: { id: 'sn_homerun', name: '狼牙暴風擊', cd: 8, desc: '蓄力橫掃，重創並擊飛前方敵人，同時甩出 3 顆尖刺鐵球。' },
  ult: { id: 'sn_slam', name: '不良之魂・狼牙制裁', charge: 180, desc: '大量尖刺鐵球從天而降，轟炸畫面上的敵人。' },
});

// ───────── 遠攻 ─────────
C({
  id: 'enjidou', name: '嗯雞抖', en: 'EN JI DOU', role: 'ranged', cls: 'Berserker', species: '擬人化雞',
  hp: 100, speed: 150, armor: 0, weapon: 'lasercannon', unlock: 0, sheet: true,
  quote: '嗯啊——！就讓你見識，真正的火力美學！',
  desc: '極度自信的戰場藝術家。雷射炮槍射出貫穿一切的光束。',
  skill: { id: 'ejd_charge', name: '蓄能射擊', cd: 8, desc: '射出超高出力的能量彈，命中後大範圍爆炸。' },
  ult: { id: 'ejd_aurora', name: '雷射藝術・極光之嘯', charge: 200, desc: '發射極光級毀滅光束 4 秒，貫穿一切目標並引發連鎖爆炸。' },
});
C({
  id: 'yingzhang', name: '營長', en: 'YING CHANG', role: 'ranged', cls: 'Archer', species: '擬人化鬥牛犬',
  hp: 125, speed: 140, armor: 1, weapon: 'gatling', unlock: 0, sheet: true,
  quote: '戰場不是靠運氣，而是靠火力與紀律去撐住的。', desc: '加特林機槍需要預熱，全速後傾瀉彈幕壓制敵群。',
  skill: { id: 'yz_suppress', name: '壓制射擊', cd: 10, desc: '4 秒內射速倍增，子彈貫穿並緩速敵人。' },
  ult: { id: 'yz_airstrike', name: '空襲轟炸', charge: 200, desc: '呼叫地毯式轟炸，覆蓋前方大片區域。' },
});
C({
  id: 'shenshen', name: '紅髮深深', en: 'XINX', role: 'ranged', cls: 'Master', species: '現代普通少女',
  hp: 90, speed: 155, armor: 0, weapon: 'runes', unlock: 0, sheet: true,
  quote: '不被定義，不被束縛。',
  desc: '隱匿於都市的少女。操控追蹤的上古符文，並在敵群腳下展開魔法陣。',
  skill: { id: 'ss_bind', name: '束縛魔法陣', cd: 9, desc: '在敵群中心展開大型魔法陣，束縛並持續傷害範圍內的敵人。' },
  ult: { id: 'ss_seal', name: '上古封印・無名之影', charge: 200, desc: '融入黑影，以自身為中心展開巨大封印陣，符文光柱連續轟擊。' },
});
C({
  id: 'tk', name: 'TK哥', en: 'TK GE', role: 'ranged', cls: 'Caster', species: '數位黑客',
  hp: 90, speed: 152, armor: 0, weapon: 'wisps', unlock: 0, sheet: true,
  quote: '這個世界的規則，是我寫的程式碼。', desc: '身邊環繞著帶數字的鬼火，數字越大傷害越高。',
  skill: { id: 'tk_hole', name: '黑洞', cd: 11, desc: '在敵群中生成黑洞，吸引並持續傷害敵人，最後內爆。' },
  ult: { id: 'tk_zero', name: '歸零', charge: 210, desc: '為大範圍內所有敵人掛上倒數，歸零時引爆。' },
});
C({
  id: 'feijie', name: '飛姐', en: 'FEI JIE', role: 'ranged', cls: 'Archer', species: '擬人化女性',
  hp: 95, speed: 160, armor: 0, weapon: 'revolver', unlock: 0, sheet: true,
  quote: '規則？我只相信扣動扳機的那一刻。', desc: '左輪每一發都是高傷害貫穿彈，六發後需要裝填。',
  skill: { id: 'fj_fan', name: '快拔連射', cd: 7, desc: '瞬間向最近的 6 個敵人各開一槍（必定暴擊），並立即裝填。' },
  ult: { id: 'fj_eye', name: '死神之眼', charge: 190, desc: '標記畫面上的敵人，隨後一口氣全部射穿。' },
});
C({
  id: 'hajimi', name: '哈基米', en: 'HA KI MI', role: 'ranged', cls: 'Archer', species: '擬人化賓士貓',
  hp: 100, speed: 172, armor: 0, weapon: 'pistol', unlock: 0, sheet: true,
  quote: '規則？弱者才需要的東西。', desc: '手槍連發，子彈會在敵人之間彈跳。',
  skill: { id: 'hjm_roll', name: '戰術翻滾', cd: 4.5, desc: '翻滾閃避（無敵），之後 3 秒射速提升。' },
  ult: { id: 'hjm_storm', name: '彈幕時間', charge: 180, desc: '6 秒內持續向四周掃射子彈風暴。' },
});
C({
  id: 'wangchuan', name: '忘川', en: 'WANG CHUAN', role: 'ranged', cls: 'Assassin', species: '擬人化蜜獾',
  hp: 95, speed: 170, armor: 0, weapon: 'knives', unlock: 0, sheet: true,
  quote: '規則？弱者才需要的東西。別來惹我，我沒有耐心。', desc: '一次擲出扇形飛刀，貫穿成排的敵人。',
  skill: { id: 'wc_ring', name: '刃環', cd: 7, desc: '向四周射出一圈貫穿飛刀。' },
  ult: { id: 'wc_storm', name: '千刃風暴', charge: 190, desc: '5 秒內身邊捲起刀刃風暴，並不斷向外射出飛刀。' },
});

C({
  id: 'moumou', name: '哞哞', en: 'MOU MOU', role: 'ranged', cls: 'Archer', species: '擬人化乳牛',
  hp: 150, speed: 145, armor: 2, weapon: 'rocket0', unlock: 0, sheet: true,
  quote: '哞——！一發入魂，就問你怕不怕哞！',
  desc: '雙路線角色：火箭筒升到 2 級後，下一次升級可選「火箭炮」（遠攻）或「攻城甲」（近戰），選定後整場不變。',
  skill: { id: 'mou_ram', name: '蠻牛衝撞', cd: 8, desc: '低頭向前衝撞，撞飛並重創路徑上的敵人，期間無敵。' },
  ult: { id: 'mou_barrage', name: '草原崩壞・哞哞轟擊', charge: 200, desc: '大量火箭從天而降，把周圍炸成一片焦土。' },
});

// ───────── 輔助 ─────────
C({
  id: 'laijie', name: '賴姐姐', en: 'LAI JIE JIE', role: 'support', cls: 'Caster', species: '擬人化貓',
  hp: 95, speed: 158, armor: 0, weapon: 'syringe', unlock: 0, sheet: true,
  quote: '打針不痛，但我下手，可不會手軟喔～', desc: '毒針攻擊敵人，並定期向血量最低的隊友射出治療針。',
  skill: { id: 'lj_aid', name: '急救針', cd: 10, desc: '立即治療附近所有隊友，並給予持續回復。' },
  ult: { id: 'lj_revive', name: '起死回生', charge: 210, desc: '復活所有倒地隊友、全隊大量回復並短暫無敵。' },
});
C({
  id: 'yangdidi', name: '羊弟弟', en: 'YANG DI DI', role: 'support', cls: 'Lancer', species: '擬人化山羊',
  hp: 115, speed: 152, armor: 0, weapon: 'skewer', unlock: 0, sheet: true,
  quote: '只要瞄準目標，我就不會錯過任何一發子彈。', desc: '用烤肉串突刺，並定期烤出能回血、加攻速的烤肉串給隊友撿。',
  skill: { id: 'yd_party', name: '烤肉派對', cd: 14, desc: '架起烤肉架：範圍內隊友持續回復並加速，敵人則被燒傷。' },
  ult: { id: 'yd_inferno', name: '炭火地獄', charge: 200, desc: '大範圍炭火燃燒敵人，灑出大量烤肉串並強化全隊攻擊。' },
});
C({
  id: 'allen', name: 'ALLEN', en: 'ALLEN', role: 'support', cls: 'Caster', species: '擬人化和尚',
  hp: 110, speed: 155, armor: 1, weapon: 'beads', unlock: 0, sheet: true,
  quote: '業火既起，塵緣皆盡。一切污穢，皆歸寂靜。', desc: '環繞的佛珠緩速敵人，並定期放出定身波控場。',
  skill: { id: 'al_freeze', name: '定身咒', cd: 11, desc: '定住周圍所有敵人，並使其承受更多傷害。' },
  ult: { id: 'al_buddha', name: '萬佛朝宗', charge: 210, desc: '全場敵人被鎮壓暈眩並受到傷害，全隊獲得護盾。' },
});
C({
  id: 'tiaotiao', name: '跳跳', en: 'TIAO TIAO', role: 'support', cls: 'Archer', species: '擬人化袋鼠',
  hp: 110, speed: 175, armor: 0, weapon: 'mines', unlock: 0, sheet: true,
  quote: '嗨——！就是現在，開趴！',
  desc: '熱愛派對與爆炸的袋鼠。邊跑邊佈置地雷，把戰場變成大型遊樂場。',
  skill: { id: 'tt_leap', name: '袋鼠跳', cd: 7, desc: '高高躍起後重踏落地，震暈敵人並向四周撒出地雷。' },
  ult: { id: 'tt_party', name: '蹦蹦派對・爆裂狂歡', charge: 190, desc: '跳躍投擲大量強化炸彈，引發連鎖爆炸的煙火派對。' },
});
C({
  id: 'qiqiu', name: '起秋', en: 'QI QIU', role: 'support', cls: 'Rider', species: '擬人化香蕉',
  hp: 100, speed: 160, armor: 0, weapon: 'cheer', unlock: 0, sheet: true,
  quote: '引擎已經預熱，勝利只是剛好而已。', desc: '傳奇香蕉車手。放出卡丁車「爆蕉號」衝撞貫穿敵人，引擎聲浪讓附近的隊友攻速、移速全面加快。',
  skill: { id: 'qq_morale', name: '蕉影漂移', cd: 12, desc: '附近隊友 6 秒內攻擊、攻速、移速全面提升。' },
  ult: { id: 'qq_amp', name: '全速蕉進・終點無規則', charge: 200, desc: '全隊 10 秒內傷害與攻速大幅提升，回復生命並重置技能冷卻。' },
});
C({
  id: 'maomaochong', name: '貓貓蟲', en: 'MAO MAO CHONG', role: 'support', cls: 'Rider', species: '擬人化貓',
  hp: 95, speed: 158, armor: 0, weapon: 'drones', unlock: 0, sheet: true,
  quote: '喵～資料傳好囉，開始表演吧～', desc: '操控無人機自動鎖定射擊，數量越多火網越密。',
  skill: { id: 'mm_mark', name: '集火標記', cd: 10, desc: '標記一片區域：範圍內敵人承受更多傷害，無人機齊射飛彈。' },
  ult: { id: 'mm_swarm', name: '蜂群協議', charge: 200, desc: '10 秒內額外出動大量高速無人機。' },
});
C({
  id: 'xiaoshunzi', name: '小順子', en: 'XIAO SHUN ZI', role: 'support', cls: 'Caster', species: '擬人化少年',
  hp: 105, speed: 160, armor: 0, weapon: 'cats', unlock: 0, sheet: true,
  quote: '順其自然，貓來了，它會幫我解決一切。', desc: '召喚小貓撲咬敵人，小貓的呼嚕聲會為附近隊友回血。',
  skill: { id: 'xs_supply', name: '貓貓補給', cd: 11, desc: '治療附近隊友並加速，小貓進入狂暴狀態。' },
  ult: { id: 'xs_lion', name: '獅王降臨', charge: 210, desc: '召喚獅王 14 秒：猛烈撲咬、怒吼震暈敵人，並強化附近隊友。' },
});

C({
  id: 'laojin', name: '老瑾', en: 'LAO JIN', role: 'support', cls: 'Ruler', species: '擬人化吉娃娃',
  hp: 95, speed: 152, armor: 0, weapon: 'bait', unlock: 0, sheet: true,
  quote: '這世界只分兩種人，贏家和被我踩在腳下的垃圾。',
  desc: '誘餌型輔助。定期丟出鈔票誘餌，把附近的敵人從隊友身邊引開，時間到就爆炸。',
  skill: { id: 'lk_cash', name: '漫天撒幣', cd: 11, desc: '向四周撒出 3 個誘餌，被吸引的敵人承受更多傷害。' },
  ult: { id: 'lk_tank', name: '帝國之牙・鋼鐵獵犬', charge: 210, desc: '召喚坦克 12 秒：吸引大範圍敵人，並持續砲擊。' },
});
C({
  id: 'nongfu', name: '農夫哥哥', en: 'NONG FU GE GE', role: 'support', cls: 'Caster', species: '擬人化神龍',
  hp: 120, speed: 150, armor: 1, weapon: 'dragonfire', unlock: 0, sheet: true,
  quote: '不被定義，不被束縛，這就是我的規則。',
  desc: '增幅型輔助。身邊的龍炎光環提升隊友傷害，自己則以火球轟炸敵人。',
  skill: { id: 'nf_domain', name: '龍炎領域', cd: 12, desc: '在腳下展開火焰領域 6 秒：灼燒敵人，領域內的隊友傷害大幅提升。' },
  ult: { id: 'nf_judgment', name: '爐天焚世・龍炎天誅', charge: 210, desc: '巨大龍炎吞沒周圍 8 秒，全隊傷害提升 50%。' },
});

// 角色熟練度：每一階的累積需求與加成（之後要加專屬天賦可直接擴充這張表）
export const MASTERY = { maxRank: 10, need: (rank) => 80 + rank * 70, perRank: { hp: 0.03, dmg: 0.03 } };
