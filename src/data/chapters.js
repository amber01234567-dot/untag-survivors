// 章節（世界節點圖）與關卡內拓樸（區域 + 連結）。
//
// ▍兩層結構
//   外層：CHAPTERS[].nodes 為有向節點圖，next 指向可前往的下一關（分歧路線）。
//   內層：LAYOUTS 為關卡內的區域拓樸。zones 放在粗網格座標 c:[cx,cy] 上，
//         links 為相鄰區域間的通道，req = 需要先淨化哪些區域閘門才會開。
// 新增關卡：挑一個 layout，填 objs（依序套到戰鬥區，最後一個給終點區）與敵人池即可。

export const LAYOUTS = {
  snake: {
    zones: [{ id: 'S', c: [0, 1], kind: 'start' }, { id: 'A', c: [1, 1] }, { id: 'B', c: [1, 0] }, { id: 'F', c: [2, 0], kind: 'final' }],
    links: [['S', 'A'], ['A', 'B'], ['B', 'F']],
  },
  fork: {
    zones: [{ id: 'S', c: [0, 1], kind: 'start' }, { id: 'A', c: [1, 1] }, { id: 'T', c: [1, 0], kind: 'treasure' }, { id: 'B', c: [2, 1] }, { id: 'F', c: [3, 1], kind: 'final' }],
    links: [['S', 'A'], ['A', 'T'], ['A', 'B'], ['B', 'F']],
  },
  hub: {
    zones: [{ id: 'S', c: [1, 2], kind: 'start' }, { id: 'H', c: [1, 1] }, { id: 'L', c: [0, 1] }, { id: 'R', c: [2, 1] }, { id: 'F', c: [1, 0], kind: 'final' }],
    links: [['S', 'H'], ['H', 'L'], ['H', 'R'], ['H', 'F', ['L', 'R']]],
  },
  loop: {
    zones: [{ id: 'S', c: [0, 0], kind: 'start' }, { id: 'A', c: [1, 0] }, { id: 'B', c: [1, 1] }, { id: 'C', c: [0, 1] }, { id: 'F', c: [2, 0], kind: 'final' }],
    links: [['S', 'A'], ['A', 'B'], ['B', 'C'], ['C', 'S', ['C']], ['A', 'F', ['C']]],
  },
  cross: {
    zones: [{ id: 'S', c: [1, 1], kind: 'start', size: [22, 16] }, { id: 'N', c: [1, 0] }, { id: 'W', c: [0, 1] }, { id: 'E', c: [2, 1] }, { id: 'F', c: [1, 2], kind: 'final' }],
    links: [['S', 'N'], ['S', 'W'], ['S', 'E'], ['S', 'F', ['N', 'W', 'E']]],
  },
  zig: {
    zones: [{ id: 'S', c: [0, 0], kind: 'start' }, { id: 'A', c: [1, 0] }, { id: 'B', c: [1, 1] }, { id: 'T', c: [0, 1], kind: 'treasure' }, { id: 'C', c: [2, 1] }, { id: 'F', c: [2, 0], kind: 'final' }],
    links: [['S', 'A'], ['A', 'B'], ['B', 'T'], ['B', 'C'], ['C', 'F']],
  },
  gauntlet: {
    zones: [{ id: 'S', c: [0, 0], kind: 'start' }, { id: 'A', c: [1, 0] }, { id: 'F', c: [2, 0], kind: 'final', size: [40, 30] }],
    links: [['S', 'A'], ['A', 'F']],
  },
  arena: {
    zones: [{ id: 'S', c: [0, 0], kind: 'start' }, { id: 'F', c: [1, 0], kind: 'final', size: [40, 30] }],
    links: [['S', 'F']],
  },
  trident: {
    zones: [{ id: 'S', c: [0, 1], kind: 'start' }, { id: 'A', c: [1, 1] }, { id: 'B', c: [1, 0] }, { id: 'C', c: [1, 2] }, { id: 'M', c: [2, 1] }, { id: 'F', c: [3, 1], kind: 'final' }],
    links: [['S', 'A'], ['A', 'B'], ['A', 'C'], ['A', 'M', ['B', 'C']], ['M', 'F']],
  },
  ring: {
    zones: [{ id: 'S', c: [0, 0], kind: 'start' }, { id: 'A', c: [1, 0] }, { id: 'B', c: [1, 1] }, { id: 'C', c: [0, 1] }, { id: 'T', c: [2, 1], kind: 'treasure' }, { id: 'F', c: [2, 0], kind: 'final' }],
    links: [['S', 'A'], ['A', 'B'], ['B', 'C'], ['B', 'T'], ['A', 'F', ['C']]],
  },
};

// 系列：每三章一個主題。新系列在這裡加一筆，章節用 series 指過來。
export const SERIES = [
  { id: 1, name: '霓虹都市', sub: 'NEON CITY' },
  { id: 2, name: '廢土荒野', sub: 'WASTELAND' },
  { id: 3, name: '永凍冰原', sub: 'FROZEN TUNDRA', el: 'ice' },      // 系列三起：一個系列一種屬性，掉該屬性的套裝
  { id: 4, name: '熔岩火山', sub: 'MAGMA VOLCANO', el: 'fire' },
  { id: 5, name: '瘴氣毒沼', sub: 'MIASMA MIRE', el: 'poison' },
  { id: 6, name: '黃金神殿', sub: 'GOLDEN TEMPLE', el: 'gold' },
];

export const DIFFS = [
  { name: '普通', hp: 1, dmg: 1, rate: 1, reward: 1 },
  { name: '困難', hp: 1.9, dmg: 1.4, rate: 1.2, reward: 1.7 },
  { name: '地獄', hp: 3.4, dmg: 1.9, rate: 1.4, reward: 2.6 },
];

const kill = (n) => ({ t: 'kill', n });
const survive = (s) => ({ t: 'survive', s });
const nests = (n) => ({ t: 'nests', n });
const elite = (who) => ({ t: 'elite', who });
const boss = (who) => ({ t: 'boss', who });

export const CHAPTERS = [
  {
    id: 1, name: '霓虹後巷', sub: 'NEON BACK ALLEY', theme: 'slums',
    intro: '廢棄街區的垃圾開始自己動了起來。順著霓虹燈往深處走，找出源頭。',
    nodes: [
      { id: '1-1', name: '後巷入口', kind: 'normal', layout: 'snake', diff: 1.0, pos: [0, 1], next: ['1-2', '1-3'], coins: 60,
        pool: [['slime', 6], ['bat', 3], ['roach', 3]], objs: [kill(50), survive(45), kill(70)] },
      { id: '1-2', name: '霓虹夜市', kind: 'normal', layout: 'fork', diff: 1.05, pos: [1, 0.3], next: ['1-4'], coins: 75,
        pool: [['slime', 5], ['bat', 3], ['bag', 2], ['roach', 3]], objs: [kill(50), survive(40), elite('vending')] },
      { id: '1-3', name: '排水溝渠', kind: 'normal', layout: 'hub', diff: 1.08, pos: [1, 1.7], next: ['1-4', '1-5'], coins: 80,
        pool: [['slime', 4], ['bat', 4], ['dog', 2], ['conecrab', 1]], objs: [kill(35), nests(2), survive(40), kill(70)] },
      { id: '1-4', name: '廢車場', kind: 'normal', layout: 'loop', diff: 1.15, pos: [2, 0.6], next: ['1-6'], coins: 95,
        pool: [['slime', 4], ['bag', 2], ['dog', 3], ['vending', 1], ['conecrab', 2]], objs: [kill(45), nests(3), survive(45), elite('dog')] },
      { id: '1-5', name: '地下金庫', kind: 'bonus', layout: 'arena', diff: 1.12, pos: [2, 2], next: ['1-6'], coins: 60,
        pool: [['bat', 5], ['slime', 3], ['bag', 1], ['roach', 4]], objs: [{ t: 'goblins', s: 75 }] },
      { id: '1-6', name: '鼠道深處', kind: 'elite', layout: 'cross', diff: 1.25, pos: [3, 1.2], next: ['1-B'], coins: 130,
        pool: [['slime', 3], ['bat', 3], ['bag', 2], ['dog', 3], ['vending', 2], ['signghost', 2], ['conecrab', 1]], objs: [nests(2), survive(45), kill(60), elite('vending')] },
      { id: '1-B', name: '垃圾山王座', kind: 'boss', layout: 'gauntlet', diff: 1.3, pos: [4, 1], next: [], coins: 220,
        pool: [['slime', 5], ['bat', 3], ['bag', 2], ['dog', 2], ['signghost', 1], ['roach', 2]], objs: [kill(70), boss('golem')] },
    ],
  },
  {
    id: 2, name: '地下格鬥城', sub: 'UNDERGROUND ARENA', theme: 'arena',
    intro: '鐵籠、聚光燈與歡呼聲。這裡沒有規則，只有站到最後的人。',
    nodes: [
      { id: '2-1', name: '選手通道', kind: 'normal', layout: 'zig', diff: 1.3, pos: [0, 1], next: ['2-2', '2-3'], coins: 110,
        pool: [['thug', 6], ['chip', 4], ['tire', 1]], objs: [kill(50), survive(40), kill(60), kill(80)] },
      { id: '2-2', name: '賭盤大廳', kind: 'normal', layout: 'hub', diff: 1.36, pos: [1, 0.3], next: ['2-4', '2-5'], coins: 125,
        pool: [['thug', 4], ['chip', 5], ['shroom', 2], ['dice', 2]], objs: [kill(45), nests(2), survive(45), elite('brute')] },
      { id: '2-3', name: '下水道訓練場', kind: 'normal', layout: 'fork', diff: 1.4, pos: [1, 1.7], next: ['2-4'], coins: 130,
        pool: [['thug', 4], ['ooze', 3], ['chip', 3], ['sandbag', 1]], objs: [kill(60), survive(50), elite('ooze')] },
      { id: '2-4', name: '鐵籠外圍', kind: 'normal', layout: 'loop', diff: 1.48, pos: [2, 1], next: ['2-6'], coins: 150,
        pool: [['thug', 4], ['chip', 3], ['brute', 1], ['shroom', 2], ['ooze', 2], ['tire', 2]], objs: [kill(55), nests(3), survive(50), kill(90)] },
      { id: '2-5', name: '莊家金庫', kind: 'bonus', layout: 'arena', diff: 1.45, pos: [2, 0], next: ['2-6'], coins: 100,
        pool: [['chip', 6], ['thug', 3], ['dice', 2]], objs: [{ t: 'goblins', s: 80 }] },
      { id: '2-6', name: '冠軍之路', kind: 'elite', layout: 'cross', diff: 1.58, pos: [3, 0.8], next: ['2-B'], coins: 200,
        pool: [['thug', 3], ['chip', 3], ['brute', 2], ['shroom', 2], ['ooze', 2], ['sandbag', 2], ['tire', 2], ['dice', 1]], objs: [elite('brute'), nests(3), survive(55), kill(80)] },
      { id: '2-B', name: '無規則鐵籠', kind: 'boss', layout: 'gauntlet', diff: 1.65, pos: [4, 1], next: [], coins: 340,
        pool: [['thug', 5], ['chip', 4], ['brute', 1], ['ooze', 2], ['tire', 1], ['dice', 1]], objs: [kill(90), boss('champ')] },
    ],
  },
  {
    id: 3, name: '虛空數據城', sub: 'VOID DATA CITY', theme: 'void',
    intro: '現實的背面是一座由數字與符文構成的城市。核心正在等待。',
    nodes: [
      { id: '3-1', name: '登入閘道', kind: 'normal', layout: 'snake', diff: 1.7, pos: [0, 1], next: ['3-2', '3-3'], coins: 170,
        pool: [['bug', 6], ['glitch', 3], ['cursor', 3]], objs: [kill(60), survive(45), kill(90)] },
      { id: '3-2', name: '資料洪流', kind: 'normal', layout: 'zig', diff: 1.78, pos: [1, 0.2], next: ['3-4'], coins: 190,
        pool: [['bug', 5], ['glitch', 3], ['eye', 2], ['cursor', 3]], objs: [kill(55), nests(2), survive(50), elite('eye')] },
      { id: '3-3', name: '廢棄記憶體', kind: 'normal', layout: 'loop', diff: 1.82, pos: [1, 1.8], next: ['3-4', '3-5'], coins: 195,
        pool: [['bug', 4], ['glitch', 3], ['virus', 3], ['trojan', 1]], objs: [kill(60), survive(50), nests(3), kill(90)] },
      { id: '3-4', name: '防火牆', kind: 'normal', layout: 'hub', diff: 1.92, pos: [2, 0.7], next: ['3-6'], coins: 220,
        pool: [['bug', 4], ['glitch', 3], ['sentry', 1], ['eye', 2], ['virus', 2], ['popup', 2]], objs: [kill(50), elite('sentry'), nests(3), survive(60)] },
      { id: '3-5', name: '加密金鑰庫', kind: 'bonus', layout: 'arena', diff: 1.88, pos: [2, 2], next: ['3-6'], coins: 150,
        pool: [['bug', 6], ['virus', 2], ['cursor', 4]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '3-6', name: '根目錄', kind: 'elite', layout: 'cross', diff: 2.05, pos: [3, 1.2], next: ['3-B'], coins: 290,
        pool: [['bug', 4], ['glitch', 3], ['sentry', 1], ['eye', 2], ['virus', 3], ['popup', 2], ['trojan', 2], ['cursor', 2]], objs: [nests(3), elite('sentry'), survive(60), kill(100)] },
      { id: '3-B', name: '核心', kind: 'boss', layout: 'gauntlet', diff: 2.2, pos: [4, 1], next: [], coins: 500,
        pool: [['bug', 5], ['glitch', 3], ['eye', 2], ['virus', 2], ['cursor', 2], ['popup', 1]], objs: [kill(100), boss('warden')] },
    ],
  },
  // ───── 第二系列：廢土荒野（戶外大地圖 outdoor + 場地機關 devices） ─────
  {
    id: 4, series: 2, name: '廢棄公路', sub: 'DEAD HIGHWAY', theme: 'road', outdoor: true,
    intro: '逃出城市之後，只剩一條被黃沙吞掉一半的公路。油罐還在，會動的東西也還在。',
    devices: [['barrel', 5], ['turret', 1]],
    nodes: [
      { id: '4-1', name: '城郊收費站', kind: 'normal', layout: 'snake', diff: 2.3, pos: [0, 1], next: ['4-2', '4-3'], coins: 260,
        pool: [['tumble', 6], ['lizard', 4], ['vulture', 2]], objs: [kill(70), survive(50), kill(100)] },
      { id: '4-2', name: '廢棄加油站', kind: 'normal', layout: 'ring', diff: 2.38, pos: [1, 0.3], next: ['4-4'], coins: 290,
        pool: [['tumble', 5], ['lizard', 4], ['barrelbug', 2], ['scrapbot', 2]], objs: [kill(60), nests(3), survive(50), elite('scrapbot')] },
      { id: '4-3', name: '乾涸河床', kind: 'normal', layout: 'hub', diff: 2.42, pos: [1, 1.7], next: ['4-4', '4-5'], coins: 300,
        pool: [['tumble', 5], ['lizard', 4], ['vulture', 3], ['cactus', 1]], objs: [kill(60), survive(55), nests(3), kill(100)] },
      { id: '4-4', name: '連環車禍現場', kind: 'normal', layout: 'trident', diff: 2.5, pos: [2, 0.7], next: ['4-6'], coins: 340,
        pool: [['tumble', 4], ['lizard', 4], ['scrapbot', 2], ['barrelbug', 2], ['cactus', 1], ['vulture', 2]], objs: [kill(60), nests(3), survive(55), elite('cactus'), kill(110)] },
      { id: '4-5', name: '走私車隊', kind: 'bonus', layout: 'arena', diff: 2.45, pos: [2, 2], next: ['4-6'], coins: 220,
        pool: [['tumble', 6], ['lizard', 3], ['barrelbug', 2]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '4-6', name: '拾荒者哨站', kind: 'elite', layout: 'cross', diff: 2.62, pos: [3, 1.2], next: ['4-B'], coins: 420,
        pool: [['tumble', 4], ['lizard', 4], ['scrapbot', 3], ['barrelbug', 2], ['cactus', 2], ['vulture', 2]], objs: [nests(3), elite('cactus'), survive(60), kill(110)] },
      { id: '4-B', name: '斷橋', kind: 'boss', layout: 'gauntlet', diff: 2.75, pos: [4, 1], next: [], coins: 700,
        pool: [['tumble', 5], ['lizard', 4], ['barrelbug', 2], ['vulture', 2], ['scrapbot', 1]], objs: [kill(110), boss('rig')] },
    ],
  },
  {
    id: 5, series: 2, name: '沙塵峽谷', sub: 'DUST CANYON', theme: 'canyon', outdoor: true,
    intro: '紅色的岩壁之間是拾荒者的地盤。沙子底下有東西在游。',
    devices: [['turret', 4], ['barrel', 3]],
    nodes: [
      { id: '5-1', name: '峽谷入口', kind: 'normal', layout: 'zig', diff: 2.8, pos: [0, 1], next: ['5-2', '5-3'], coins: 380,
        pool: [['raider', 5], ['dustling', 5], ['scorp', 3]], objs: [kill(70), survive(50), kill(80), kill(110)] },
      { id: '5-2', name: '拾荒者營地', kind: 'normal', layout: 'trident', diff: 2.88, pos: [1, 0.3], next: ['5-4', '5-5'], coins: 410,
        pool: [['raider', 5], ['dustling', 4], ['mortar', 2], ['scorp', 2]], objs: [kill(60), nests(3), survive(55), elite('mortar'), kill(110)] },
      { id: '5-3', name: '流沙谷', kind: 'normal', layout: 'ring', diff: 2.92, pos: [1, 1.7], next: ['5-4'], coins: 420,
        pool: [['dustling', 5], ['sandworm', 4], ['scorp', 3], ['raider', 2]], objs: [kill(70), survive(60), nests(3), elite('sandworm')] },
      { id: '5-4', name: '舊礦坑口', kind: 'normal', layout: 'loop', diff: 3.0, pos: [2, 1], next: ['5-6'], coins: 460,
        pool: [['raider', 4], ['dustling', 4], ['sandworm', 2], ['mortar', 2], ['bison', 1], ['scorp', 2]], objs: [kill(70), nests(4), survive(60), kill(120)] },
      { id: '5-5', name: '贓物倉', kind: 'bonus', layout: 'arena', diff: 2.95, pos: [2, 0], next: ['5-6'], coins: 300,
        pool: [['dustling', 6], ['raider', 4], ['scorp', 2]], objs: [{ t: 'goblins', s: 90 }] },
      { id: '5-6', name: '獸骨祭壇', kind: 'elite', layout: 'cross', diff: 3.12, pos: [3, 0.8], next: ['5-B'], coins: 560,
        pool: [['raider', 4], ['dustling', 4], ['sandworm', 3], ['mortar', 2], ['bison', 2], ['scorp', 2]], objs: [elite('bison'), nests(4), survive(65), kill(120)] },
      { id: '5-B', name: '沙海巢穴', kind: 'boss', layout: 'gauntlet', diff: 3.25, pos: [4, 1], next: [], coins: 950,
        pool: [['raider', 4], ['dustling', 5], ['sandworm', 2], ['scorp', 2], ['mortar', 1]], objs: [kill(120), boss('wormqueen')] },
    ],
  },
  {
    id: 6, series: 2, name: '隕石坑', sub: 'METEOR CRATER', theme: 'crater', outdoor: true,
    intro: '荒野的盡頭是一個還在發光的大坑。墜落的不只是石頭，還有一具沉睡的機神。',
    devices: [['pylon', 4], ['turret', 2], ['barrel', 2]],
    nodes: [
      { id: '6-1', name: '坑緣', kind: 'normal', layout: 'snake', diff: 3.3, pos: [0, 1], next: ['6-2', '6-3'], coins: 520,
        pool: [['shard', 6], ['magma', 3], ['radrat', 2]], objs: [kill(80), survive(55), kill(120)] },
      { id: '6-2', name: '水晶林', kind: 'normal', layout: 'ring', diff: 3.4, pos: [1, 0.2], next: ['6-4'], coins: 560,
        pool: [['shard', 5], ['magma', 3], ['crystal', 1], ['wreckdrone', 3]], objs: [kill(70), nests(3), survive(60), elite('crystal')] },
      { id: '6-3', name: '殘骸墳場', kind: 'normal', layout: 'trident', diff: 3.45, pos: [1, 1.8], next: ['6-4', '6-5'], coins: 580,
        pool: [['shard', 5], ['titanhand', 3], ['wreckdrone', 3], ['radrat', 3]], objs: [kill(70), survive(60), nests(4), elite('titanhand'), kill(120)] },
      { id: '6-4', name: '熔岩裂隙', kind: 'normal', layout: 'hub', diff: 3.55, pos: [2, 0.7], next: ['6-6'], coins: 620,
        pool: [['shard', 4], ['magma', 4], ['radrat', 3], ['crystal', 1], ['wreckdrone', 2], ['titanhand', 2]], objs: [kill(70), elite('crystal'), nests(4), survive(70)] },
      { id: '6-5', name: '隕鐵礦脈', kind: 'bonus', layout: 'arena', diff: 3.5, pos: [2, 2], next: ['6-6'], coins: 400,
        pool: [['shard', 7], ['magma', 2], ['radrat', 2]], objs: [{ t: 'goblins', s: 95 }] },
      { id: '6-6', name: '機神之手', kind: 'elite', layout: 'cross', diff: 3.7, pos: [3, 1.2], next: ['6-B'], coins: 760,
        pool: [['shard', 4], ['magma', 3], ['radrat', 3], ['crystal', 2], ['wreckdrone', 3], ['titanhand', 3]], objs: [nests(4), elite('titanhand'), survive(70), kill(130)] },
      { id: '6-B', name: '墜星核心', kind: 'boss', layout: 'gauntlet', diff: 3.9, pos: [4, 1], next: [], coins: 1300,
        pool: [['shard', 5], ['magma', 3], ['radrat', 2], ['wreckdrone', 2], ['titanhand', 1]], objs: [kill(130), boss('colossus')] },
    ],
  },
  // ───── 第三系列：永凍冰原（冰屬性：怪物打到會緩速；掉落騎士冰甲）─────
  {
    id: 7, series: 3, name: '冰封港口', sub: 'FROZEN HARBOUR', theme: 'harbor', outdoor: true, hazard: 'icicle',
    shapes: { combat: [['pier', 4], ['islands', 3], ['rect', 1]], final: 'round' },      // 空間架構：突堤碼頭、浮冰群；首領在圓形錨地
    intro: '海結冰了，船也是。碼頭上的東西沒有一個歡迎活人——連企鵝都不例外。',
    devices: [['icebomb', 4], ['brazier', 3]],
    nodes: [
      { id: '7-1', name: '結冰的棧橋', kind: 'normal', layout: 'snake', diff: 3.75, pos: [0, 1], next: ['7-2', '7-3'], coins: 820,
        pool: [['snowling', 6], ['frostwolf', 4], ['icecrab', 2]], objs: [kill(80), survive(50), kill(110)] },
      { id: '7-2', name: '貨櫃場', kind: 'normal', layout: 'ring', diff: 3.82, pos: [1, 0.3], next: ['7-4'], coins: 860,
        pool: [['snowling', 5], ['frostwolf', 4], ['pengu', 2], ['icecrab', 2]], objs: [kill(70), nests(3), survive(55), elite('pengu')] },
      { id: '7-3', name: '漁獲倉庫', kind: 'normal', layout: 'hub', diff: 3.86, pos: [1, 1.7], next: ['7-4', '7-5'], coins: 880,
        pool: [['snowling', 5], ['frostwolf', 4], ['icecrab', 3], ['snowman', 1]], objs: [kill(70), survive(55), nests(3), kill(110)] },
      { id: '7-4', name: '破冰船甲板', kind: 'normal', layout: 'trident', diff: 3.95, pos: [2, 0.7], next: ['7-6'], coins: 940,
        pool: [['snowling', 4], ['frostwolf', 4], ['pengu', 3], ['icecrab', 2], ['snowman', 1]], objs: [kill(70), nests(3), survive(55), elite('snowman'), kill(120)] },
      { id: '7-5', name: '走私冷凍庫', kind: 'bonus', layout: 'arena', diff: 3.9, pos: [2, 2], next: ['7-6'], coins: 620,
        pool: [['snowling', 6], ['frostwolf', 3], ['pengu', 2]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '7-6', name: '燈塔底層', kind: 'elite', layout: 'cross', diff: 4.05, pos: [3, 1.2], next: ['7-B'], coins: 1080,
        pool: [['snowling', 4], ['frostwolf', 4], ['pengu', 3], ['icecrab', 2], ['snowman', 2]], objs: [nests(3), elite('snowman'), survive(60), kill(120)] },
      { id: '7-B', name: '船長的錨地', kind: 'boss', layout: 'gauntlet', diff: 4.2, pos: [4, 1], next: [], coins: 1700,
        pool: [['snowling', 5], ['frostwolf', 4], ['pengu', 2], ['icecrab', 2], ['snowman', 1]], objs: [kill(120), boss('captain')] },
    ],
  },
  {
    id: 8, series: 3, name: '冰晶礦坑', sub: 'CRYSTAL MINE', theme: 'icemine', outdoor: true, hazard: 'icicle',
    shapes: { combat: [['cave', 4], ['cross', 2], ['islands', 1]], final: 'cave' },      // 空間架構：不規則洞窟、十字坑道
    intro: '冰川底下有一座沒人敢回去的礦坑。水晶還在發光，礦工的燈也還亮著——只是提燈的已經不是人了。',
    devices: [['icebomb', 4], ['brazier', 3]],
    nodes: [
      { id: '8-1', name: '礦坑入口', kind: 'normal', layout: 'zig', diff: 4.05, pos: [0, 1], next: ['8-2', '8-3'], coins: 980,
        pool: [['snowling', 5], ['frostwolf', 4], ['frostwisp', 3], ['icecrab', 2]], objs: [kill(80), survive(55), kill(110)] },
      { id: '8-2', name: '水晶礦脈', kind: 'normal', layout: 'hub', diff: 4.12, pos: [1, 0.3], next: ['8-4'], coins: 1020,
        pool: [['snowling', 5], ['frostwisp', 4], ['icecrab', 3], ['icewalrus', 1]], objs: [kill(70), nests(3), survive(55), elite('icewalrus')] },
      { id: '8-3', name: '廢棄軌道', kind: 'normal', layout: 'trident', diff: 4.16, pos: [1, 1.7], next: ['8-4', '8-5'], coins: 1040,
        pool: [['frostwolf', 5], ['frostwisp', 3], ['pengu', 2], ['snowman', 2]], objs: [kill(70), survive(55), nests(3), kill(115)] },
      { id: '8-4', name: '坍方區', kind: 'normal', layout: 'ring', diff: 4.25, pos: [2, 0.7], next: ['8-6'], coins: 1100,
        pool: [['snowling', 4], ['frostwisp', 4], ['icecrab', 3], ['icewalrus', 2], ['snowman', 1]], objs: [kill(70), nests(3), survive(55), elite('icewalrus'), kill(120)] },
      { id: '8-5', name: '藏寶坑道', kind: 'bonus', layout: 'arena', diff: 4.2, pos: [2, 2], next: ['8-6'], coins: 720,
        pool: [['snowling', 6], ['frostwisp', 3], ['frostwolf', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '8-6', name: '升降機井', kind: 'elite', layout: 'cross', diff: 4.35, pos: [3, 1.2], next: ['8-B'], coins: 1250,
        pool: [['frostwolf', 4], ['frostwisp', 4], ['icecrab', 3], ['icewalrus', 2], ['snowman', 2]], objs: [nests(3), elite('icewalrus'), survive(60), kill(120)] },
      { id: '8-B', name: '晶核深處', kind: 'boss', layout: 'gauntlet', diff: 4.5, pos: [4, 1], next: [], coins: 1950,
        pool: [['snowling', 5], ['frostwisp', 4], ['icecrab', 2], ['icewalrus', 1]], objs: [kill(120), boss('icegolem')] },
    ],
  },
  {
    id: 9, series: 3, name: '極光冰宮', sub: 'AURORA PALACE', theme: 'icepalace', outdoor: true, hazard: 'icicle',
    shapes: { combat: [['hall', 4], ['round', 2], ['cross', 1]], final: 'hall' },      // 空間架構：有柱列的方正大廳、圓形舞廳
    intro: '極光底下的宮殿沒有一扇門是鎖的。女王在等客人——她已經很久沒有新的冰雕了。',
    devices: [['brazier', 4], ['icebomb', 3]],
    nodes: [
      { id: '9-1', name: '冰雕庭園', kind: 'normal', layout: 'snake', diff: 4.35, pos: [0, 1], next: ['9-2', '9-3'], coins: 1150,
        pool: [['snowling', 5], ['frostwolf', 4], ['snowowl', 3], ['iceguard', 1]], objs: [kill(80), survive(55), kill(115)] },
      { id: '9-2', name: '鏡廳', kind: 'normal', layout: 'ring', diff: 4.42, pos: [1, 0.3], next: ['9-4'], coins: 1200,
        pool: [['frostwisp', 4], ['snowowl', 4], ['iceguard', 2], ['pengu', 2]], objs: [kill(70), nests(3), survive(55), elite('iceguard')] },
      { id: '9-3', name: '衛兵迴廊', kind: 'normal', layout: 'hub', diff: 4.46, pos: [1, 1.7], next: ['9-4', '9-5'], coins: 1220,
        pool: [['frostwolf', 4], ['snowowl', 3], ['iceguard', 2], ['icewalrus', 1], ['snowman', 2]], objs: [kill(70), survive(55), nests(3), kill(120)] },
      { id: '9-4', name: '宴會大廳', kind: 'normal', layout: 'trident', diff: 4.55, pos: [2, 0.7], next: ['9-6'], coins: 1300,
        pool: [['snowling', 4], ['frostwisp', 3], ['snowowl', 3], ['iceguard', 2], ['icewalrus', 2]], objs: [kill(70), nests(3), survive(55), elite('iceguard'), kill(125)] },
      { id: '9-5', name: '寶物庫', kind: 'bonus', layout: 'arena', diff: 4.5, pos: [2, 2], next: ['9-6'], coins: 850,
        pool: [['snowling', 6], ['snowowl', 3], ['frostwolf', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '9-6', name: '王座前廳', kind: 'elite', layout: 'cross', diff: 4.65, pos: [3, 1.2], next: ['9-B'], coins: 1480,
        pool: [['frostwolf', 4], ['snowowl', 4], ['iceguard', 3], ['icewalrus', 2], ['frostwisp', 3]], objs: [nests(3), elite('iceguard'), survive(60), kill(125)] },
      { id: '9-B', name: '極光王座', kind: 'boss', layout: 'gauntlet', diff: 4.8, pos: [4, 1], next: [], coins: 2300,
        pool: [['snowling', 5], ['snowowl', 4], ['iceguard', 2], ['frostwisp', 3]], objs: [kill(125), boss('icequeen')] },
    ],
  },
  // ───── 第四系列：熔岩火山（火屬性：怪物打到會燃燒；掉落火龍獵人）─────
  {
    id: 10, series: 4, name: '焦土山麓', sub: 'SCORCHED FOOTHILLS', theme: 'ashfoot', outdoor: true, hazard: 'vent',
    shapes: { combat: [['rift', 4], ['cave', 2]], final: 'round' },      // 空間架構：被熔岩裂縫切開的裂谷、不規則空地；首領在圓形火山口
    intro: '雪線以下是另一個世界：地是黑的，風是燙的，連石頭都會動。山頂有東西在吼。',
    devices: [['water', 4], ['barrel', 3]],
    nodes: [
      { id: '10-1', name: '灰燼小徑', kind: 'normal', layout: 'snake', diff: 4.45, pos: [0, 1], next: ['10-2', '10-3'], coins: 1350,
        pool: [['ember', 6], ['lavalizard', 4], ['volturtle', 1]], objs: [kill(85), survive(55), kill(120)] },
      { id: '10-2', name: '枯木林', kind: 'normal', layout: 'ring', diff: 4.53, pos: [1, 0.3], next: ['10-4'], coins: 1400,
        pool: [['ember', 5], ['lavalizard', 4], ['bombbeetle', 3], ['volturtle', 1]], objs: [kill(75), nests(3), survive(55), elite('volturtle')] },
      { id: '10-3', name: '冷卻的熔岩原', kind: 'normal', layout: 'hub', diff: 4.57, pos: [1, 1.7], next: ['10-4', '10-5'], coins: 1420,
        pool: [['ember', 5], ['lavalizard', 5], ['bombbeetle', 2], ['volturtle', 2]], objs: [kill(75), survive(55), nests(3), kill(120)] },
      { id: '10-4', name: '裂谷吊橋', kind: 'normal', layout: 'trident', diff: 4.65, pos: [2, 0.7], next: ['10-6'], coins: 1500,
        pool: [['ember', 4], ['lavalizard', 4], ['bombbeetle', 3], ['volturtle', 2]], objs: [kill(75), nests(3), survive(55), elite('lavalizard'), kill(125)] },
      { id: '10-5', name: '採硫人營地', kind: 'bonus', layout: 'arena', diff: 4.60, pos: [2, 2], next: ['10-6'], coins: 980,
        pool: [['ember', 6], ['lavalizard', 3], ['bombbeetle', 2]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '10-6', name: '噴氣孔群', kind: 'elite', layout: 'cross', diff: 4.75, pos: [3, 1.2], next: ['10-B'], coins: 1700,
        pool: [['ember', 4], ['lavalizard', 4], ['bombbeetle', 3], ['volturtle', 3]], objs: [nests(3), elite('volturtle'), survive(60), kill(125)] },
      { id: '10-B', name: '蠻牛的火山口', kind: 'boss', layout: 'gauntlet', diff: 4.90, pos: [4, 1], next: [], coins: 2650,
        pool: [['ember', 5], ['lavalizard', 4], ['bombbeetle', 2], ['volturtle', 1]], objs: [kill(125), boss('lavabull')] },
    ],
  },
  {
    id: 11, series: 4, name: '熔岩洞窟', sub: 'MAGMA CAVERN', theme: 'lavacave', outdoor: true, hazard: 'vent',
    shapes: { combat: [['wind', 4], ['cave', 3], ['rift', 1]], final: 'cave' },      // 空間架構：蜿蜒的 S 形坑道、洞窟
    intro: '火山的肚子裡有路。路的兩邊是會流動的光，踩錯一步就不用再走了。',
    devices: [['water', 4], ['barrel', 3]],
    nodes: [
      { id: '11-1', name: '熔岩河岸', kind: 'normal', layout: 'zig', diff: 4.75, pos: [0, 1], next: ['11-2', '11-3'], coins: 1550,
        pool: [['ember', 5], ['lavalizard', 4], ['firebat', 3], ['bombbeetle', 2]], objs: [kill(85), survive(55), kill(120)] },
      { id: '11-2', name: '黑曜石礦脈', kind: 'normal', layout: 'hub', diff: 4.82, pos: [1, 0.3], next: ['11-4'], coins: 1600,
        pool: [['ember', 5], ['firebat', 4], ['bombbeetle', 3], ['obgolem', 1]], objs: [kill(75), nests(3), survive(55), elite('obgolem')] },
      { id: '11-3', name: '硫磺坑道', kind: 'normal', layout: 'trident', diff: 4.86, pos: [1, 1.7], next: ['11-4', '11-5'], coins: 1630,
        pool: [['lavalizard', 5], ['firebat', 3], ['volturtle', 2], ['bombbeetle', 2]], objs: [kill(75), survive(55), nests(3), kill(125)] },
      { id: '11-4', name: '岩漿瀑布', kind: 'normal', layout: 'ring', diff: 4.95, pos: [2, 0.7], next: ['11-6'], coins: 1720,
        pool: [['ember', 4], ['firebat', 4], ['bombbeetle', 3], ['obgolem', 2], ['volturtle', 1]], objs: [kill(75), nests(3), survive(55), elite('obgolem'), kill(125)] },
      { id: '11-5', name: '走私者的洞', kind: 'bonus', layout: 'arena', diff: 4.9, pos: [2, 2], next: ['11-6'], coins: 1120,
        pool: [['ember', 6], ['firebat', 3], ['lavalizard', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '11-6', name: '蠍巢外圍', kind: 'elite', layout: 'cross', diff: 5.05, pos: [3, 1.2], next: ['11-B'], coins: 1950,
        pool: [['lavalizard', 4], ['firebat', 4], ['bombbeetle', 3], ['obgolem', 2], ['volturtle', 2]], objs: [nests(3), elite('obgolem'), survive(60), kill(125)] },
      { id: '11-B', name: '巨蠍的巢穴', kind: 'boss', layout: 'gauntlet', diff: 5.2, pos: [4, 1], next: [], coins: 3000,
        pool: [['ember', 5], ['firebat', 4], ['bombbeetle', 2], ['obgolem', 1]], objs: [kill(125), boss('obscorp')] },
    ],
  },
  {
    id: 12, series: 4, name: '火山口神殿', sub: 'CRATER TEMPLE', theme: 'firetemple', outdoor: true, hazard: 'vent',
    shapes: { combat: [['ringpool', 4], ['hall', 3], ['cross', 1]], final: 'hall' },      // 空間架構：繞著熔岩池的環形祭壇、柱列大廳
    intro: '火山口上有人蓋了一座神殿，拜的東西還活著。牠醒著，而且知道有人上山了。',
    devices: [['water', 4], ['barrel', 3]],
    nodes: [
      { id: '12-1', name: '朝聖階梯', kind: 'normal', layout: 'snake', diff: 5.05, pos: [0, 1], next: ['12-2', '12-3'], coins: 1800,
        pool: [['ember', 5], ['lavalizard', 4], ['firebat', 3], ['firepriest', 2]], objs: [kill(85), survive(55), kill(125)] },
      { id: '12-2', name: '獻祭環廊', kind: 'normal', layout: 'ring', diff: 5.12, pos: [1, 0.3], next: ['12-4'], coins: 1870,
        pool: [['ember', 4], ['firebat', 4], ['firepriest', 3], ['whelp', 1]], objs: [kill(75), nests(3), survive(55), elite('whelp')] },
      { id: '12-3', name: '龍雕長廊', kind: 'normal', layout: 'hub', diff: 5.16, pos: [1, 1.7], next: ['12-4', '12-5'], coins: 1900,
        pool: [['lavalizard', 4], ['firepriest', 3], ['obgolem', 2], ['whelp', 1], ['volturtle', 2]], objs: [kill(75), survive(55), nests(3), kill(125)] },
      { id: '12-4', name: '熔岩祭壇', kind: 'normal', layout: 'trident', diff: 5.25, pos: [2, 0.7], next: ['12-6'], coins: 2000,
        pool: [['ember', 4], ['firebat', 3], ['firepriest', 3], ['obgolem', 2], ['whelp', 2]], objs: [kill(75), nests(3), survive(55), elite('obgolem'), kill(130)] },
      { id: '12-5', name: '供品庫', kind: 'bonus', layout: 'arena', diff: 5.2, pos: [2, 2], next: ['12-6'], coins: 1300,
        pool: [['ember', 6], ['firebat', 3], ['lavalizard', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '12-6', name: '龍巢前庭', kind: 'elite', layout: 'cross', diff: 5.35, pos: [3, 1.2], next: ['12-B'], coins: 2250,
        pool: [['lavalizard', 4], ['firebat', 4], ['firepriest', 3], ['whelp', 2], ['obgolem', 2]], objs: [nests(3), elite('whelp'), survive(60), kill(130)] },
      { id: '12-B', name: '炎龍之座', kind: 'boss', layout: 'gauntlet', diff: 5.5, pos: [4, 1], next: [], coins: 3500,
        pool: [['ember', 5], ['firebat', 4], ['firepriest', 2], ['whelp', 1]], objs: [kill(130), boss('firedragon')] },
    ],
  },
  // ───── 第五系列：瘴氣毒沼（毒屬性：怪物打到會中毒；掉落瘴氣死神）─────
  {
    id: 13, series: 5, name: '腐爛濕地', sub: 'ROTTING WETLAND', theme: 'swamp', outdoor: true, hazard: 'fog',
    shapes: { combat: [['bog', 4], ['cave', 2]], final: 'round' },      // 空間架構：木棧道串起的沼澤群島、不規則空地；首領在圓形泥潭
    intro: '火山的灰落到山腳下，把一整片林子泡爛了。水是綠的，霧是紫的，踩下去的每一步都有東西在看。',
    devices: [['totem', 4], ['gas', 3]],
    nodes: [
      { id: '13-1', name: '爛木棧道', kind: 'normal', layout: 'snake', diff: 5.05, pos: [0, 1], next: ['13-2', '13-3'], coins: 2050,
        pool: [['mudling', 6], ['mosquito', 4], ['toad', 1]], objs: [kill(85), survive(55), kill(125)] },
      { id: '13-2', name: '枯樹沼', kind: 'normal', layout: 'ring', diff: 5.12, pos: [1, 0.3], next: ['13-4'], coins: 2120,
        pool: [['mudling', 5], ['mosquito', 4], ['rotter', 2], ['toad', 1]], objs: [kill(75), nests(3), survive(55), elite('rotter')] },
      { id: '13-3', name: '毒蟾窪地', kind: 'normal', layout: 'hub', diff: 5.16, pos: [1, 1.7], next: ['13-4', '13-5'], coins: 2150,
        pool: [['mudling', 5], ['mosquito', 4], ['toad', 3], ['rotter', 1]], objs: [kill(75), survive(55), nests(3), kill(125)] },
      { id: '13-4', name: '沉船墳場', kind: 'normal', layout: 'trident', diff: 5.25, pos: [2, 0.7], next: ['13-6'], coins: 2250,
        pool: [['mudling', 4], ['mosquito', 4], ['rotter', 3], ['toad', 2]], objs: [kill(75), nests(3), survive(55), elite('toad'), kill(130)] },
      { id: '13-5', name: '採藥人小屋', kind: 'bonus', layout: 'arena', diff: 5.2, pos: [2, 2], next: ['13-6'], coins: 1450,
        pool: [['mudling', 6], ['mosquito', 3], ['rotter', 1]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '13-6', name: '瘴氣源頭', kind: 'elite', layout: 'cross', diff: 5.35, pos: [3, 1.2], next: ['13-B'], coins: 2500,
        pool: [['mudling', 4], ['mosquito', 4], ['rotter', 3], ['toad', 3]], objs: [nests(3), elite('rotter'), survive(60), kill(130)] },
      { id: '13-B', name: '巨蛙的泥潭', kind: 'boss', layout: 'gauntlet', diff: 5.5, pos: [4, 1], next: [], coins: 3900,
        pool: [['mudling', 5], ['mosquito', 4], ['rotter', 2], ['toad', 1]], objs: [kill(130), boss('bogfrog')] },
    ],
  },
  {
    id: 14, series: 5, name: '菌菇森林', sub: 'FUNGAL FOREST', theme: 'fungus', outdoor: true, hazard: 'fog',
    shapes: { combat: [['grove', 4], ['cave', 2], ['bog', 1]], final: 'cave' },
    intro: '沼澤的深處長出了一座會發光的森林。漂亮得不像話——直到你發現那些蘑菇在呼吸，而且每一朵都朝著你。',
    devices: [['totem', 4], ['gas', 3]],
    nodes: [
      { id: '14-1', name: '孢子小徑', kind: 'normal', layout: 'zig', diff: 5.20, pos: [0, 1], next: ['14-2', '14-3'], coins: 2350,
        pool: [['mudling', 5], ['mosquito', 4], ['sporeshroom', 3], ['toad', 1]], objs: [kill(85), survive(55), kill(125)] },
      { id: '14-2', name: '巨菇林', kind: 'normal', layout: 'hub', diff: 5.27, pos: [1, 0.3], next: ['14-4'], coins: 2420,
        pool: [['mudling', 5], ['sporeshroom', 4], ['sporeflower', 1], ['mosquito', 3]], objs: [kill(75), nests(3), survive(55), elite('sporeflower')] },
      { id: '14-3', name: '發光窪地', kind: 'normal', layout: 'trident', diff: 5.31, pos: [1, 1.7], next: ['14-4', '14-5'], coins: 2460,
        pool: [['mosquito', 5], ['sporeshroom', 3], ['toad', 2], ['rotter', 2]], objs: [kill(75), survive(55), nests(3), kill(130)] },
      { id: '14-4', name: '菌絲網', kind: 'normal', layout: 'ring', diff: 5.40, pos: [2, 0.7], next: ['14-6'], coins: 2580,
        pool: [['mudling', 4], ['sporeshroom', 4], ['sporeflower', 2], ['toad', 2]], objs: [kill(75), nests(3), survive(55), elite('rotter'), kill(130)] },
      { id: '14-5', name: '採菇人營地', kind: 'bonus', layout: 'arena', diff: 5.35, pos: [2, 2], next: ['14-6'], coins: 1640,
        pool: [['mudling', 6], ['sporeshroom', 3], ['mosquito', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '14-6', name: '母菇根系', kind: 'elite', layout: 'cross', diff: 5.50, pos: [3, 1.2], next: ['14-B'], coins: 2860,
        pool: [['mosquito', 4], ['sporeshroom', 4], ['sporeflower', 2], ['rotter', 2]], objs: [nests(3), elite('sporeflower'), survive(60), kill(130)] },
      { id: '14-B', name: '母菇之心', kind: 'boss', layout: 'gauntlet', diff: 5.65, pos: [4, 1], next: [], coins: 4460,
        pool: [['mudling', 5], ['sporeshroom', 3], ['mosquito', 3]], objs: [kill(130), boss('sporemother')] },
    ],
  },
  {
    id: 15, series: 5, name: '瘟疫墓園', sub: 'PLAGUE GRAVEYARD', theme: 'graveyard', outdoor: true, hazard: 'fog',
    shapes: { combat: [['crypt', 4], ['hall', 2], ['cross', 1]], final: 'hall' },
    intro: '瘴氣是從這裡飄出去的。墓碑上的名字早就磨平了，但躺在底下的還記得怎麼站起來。',
    devices: [['totem', 4], ['gas', 3]],
    nodes: [
      { id: '15-1', name: '鐵柵門', kind: 'normal', layout: 'snake', diff: 5.50, pos: [0, 1], next: ['15-2', '15-3'], coins: 2700,
        pool: [['mudling', 5], ['mosquito', 3], ['skelarcher', 3], ['wraith', 2]], objs: [kill(85), survive(55), kill(125)] },
      { id: '15-2', name: '亂葬崗', kind: 'normal', layout: 'ring', diff: 5.57, pos: [1, 0.3], next: ['15-4'], coins: 2780,
        pool: [['mudling', 4], ['wraith', 3], ['skelarcher', 3], ['rotter', 2]], objs: [kill(75), nests(3), survive(55), elite('rotter')] },
      { id: '15-3', name: '石棺小徑', kind: 'normal', layout: 'hub', diff: 5.61, pos: [1, 1.7], next: ['15-4', '15-5'], coins: 2830,
        pool: [['rotter', 3], ['wraith', 3], ['skelarcher', 3], ['sporeshroom', 3]], objs: [kill(75), survive(55), nests(3), kill(130)] },
      { id: '15-4', name: '地下墓室', kind: 'normal', layout: 'trident', diff: 5.70, pos: [2, 0.7], next: ['15-6'], coins: 2970,
        pool: [['mudling', 4], ['wraith', 3], ['skelarcher', 3], ['rotter', 2], ['sporeflower', 1]], objs: [kill(75), nests(3), survive(55), elite('wraith'), kill(130)] },
      { id: '15-5', name: '守墓人小屋', kind: 'bonus', layout: 'arena', diff: 5.65, pos: [2, 2], next: ['15-6'], coins: 1880,
        pool: [['mudling', 6], ['wraith', 3], ['mosquito', 3]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '15-6', name: '禮拜堂前庭', kind: 'elite', layout: 'cross', diff: 5.80, pos: [3, 1.2], next: ['15-B'], coins: 3290,
        pool: [['wraith', 4], ['skelarcher', 4], ['rotter', 3], ['sporeflower', 1]], objs: [nests(3), elite('rotter'), survive(60), kill(130)] },
      { id: '15-B', name: '瘟疫禮拜堂', kind: 'boss', layout: 'gauntlet', diff: 5.95, pos: [4, 1], next: [], coins: 5130,
        pool: [['mudling', 5], ['wraith', 3], ['skelarcher', 3]], objs: [kill(130), boss('plaguelord')] },
    ],
  },
  // ───── 第六系列：黃金神殿（金屬性：怪物攻擊力較高；掉落黃金武將；金幣 +50%）─────
  {
    id: 16, series: 6, name: '黃金古道', sub: 'GOLDEN APPROACH', theme: 'goldroad', outdoor: true, hazard: 'arrows', coinMul: 1.5,
    shapes: { combat: [['avenue', 4], ['hall', 2]], final: 'hall' },      // 空間架構：兩側有小廣場的參道、柱列大廳；首領在牌樓廣場
    intro: '瘴氣散開之後，露出一條鋪到天邊的石板路。路的盡頭在發光，路的兩邊站滿了不該會動的東西。',
    devices: [['drum', 4], ['ballista', 3]],
    nodes: [
      { id: '16-1', name: '山門', kind: 'normal', layout: 'snake', diff: 5.55, pos: [0, 1], next: ['16-2', '16-3'], coins: 3100,
        pool: [['coinling', 6], ['swordsman', 4], ['crossbow', 2]], objs: [kill(85), survive(55), kill(130)] },
      { id: '16-2', name: '石獅道', kind: 'normal', layout: 'ring', diff: 5.62, pos: [1, 0.3], next: ['16-4'], coins: 3200,
        pool: [['coinling', 5], ['swordsman', 4], ['lionling', 2], ['crossbow', 2]], objs: [kill(75), nests(3), survive(55), elite('lionling')] },
      { id: '16-3', name: '銀杏林', kind: 'normal', layout: 'hub', diff: 5.66, pos: [1, 1.7], next: ['16-4', '16-5'], coins: 3250,
        pool: [['coinling', 5], ['swordsman', 4], ['crossbow', 3], ['lionling', 1]], objs: [kill(75), survive(55), nests(3), kill(130)] },
      { id: '16-4', name: '千燈參道', kind: 'normal', layout: 'trident', diff: 5.75, pos: [2, 0.7], next: ['16-6'], coins: 3400,
        pool: [['coinling', 4], ['swordsman', 4], ['lionling', 3], ['crossbow', 3]], objs: [kill(75), nests(3), survive(55), elite('swordsman'), kill(135)] },
      { id: '16-5', name: '香油錢庫', kind: 'bonus', layout: 'arena', diff: 5.7, pos: [2, 2], next: ['16-6'], coins: 2200,
        pool: [['coinling', 7], ['swordsman', 3], ['lionling', 1]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '16-6', name: '碑林', kind: 'elite', layout: 'cross', diff: 5.85, pos: [3, 1.2], next: ['16-B'], coins: 3800,
        pool: [['coinling', 4], ['swordsman', 4], ['lionling', 3], ['crossbow', 3]], objs: [nests(3), elite('lionling'), survive(60), kill(135)] },
      { id: '16-B', name: '牌樓廣場', kind: 'boss', layout: 'gauntlet', diff: 6.0, pos: [4, 1], next: [], coins: 5900,
        pool: [['coinling', 5], ['swordsman', 4], ['lionling', 2], ['crossbow', 2]], objs: [kill(135), boss('stonelion')] },
    ],
  },
];

export const STAGES = {};
for (const ch of CHAPTERS) for (const n of ch.nodes) { n.chapter = ch.id; n.theme = ch.theme; n.outdoor = !!ch.outdoor; n.devices = ch.devices || null; n.hazard = ch.hazard || null; n.shapes = n.shapes || ch.shapes || null; n.coinMul = ch.coinMul || 1; n.series = ch.series || 1; STAGES[n.id] = n; }

export const NODE_KINDS = {
  normal: { name: '戰鬥', glyph: '戰' }, elite: { name: '菁英', glyph: '菁' },
  bonus: { name: '寶藏', glyph: '寶' }, boss: { name: '首領', glyph: '王' },
};

// 節點是否已解鎖：章節起點（且前一章首領已通關），或任一前置節點已通關
export function nodeUnlocked(nodeId, cleared) {
  const st = STAGES[nodeId];
  const ch = CHAPTERS.find((c) => c.id === st.chapter);
  if (ch.nodes[0].id === nodeId) {
    if (ch.id === 1) return true;
    const prev = CHAPTERS.find((c) => c.id === ch.id - 1);
    return !!cleared[prev.nodes[prev.nodes.length - 1].id];
  }
  return ch.nodes.some((n) => n.next.includes(nodeId) && cleared[n.id]);
}
