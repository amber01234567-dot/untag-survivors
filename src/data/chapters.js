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
};

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
        pool: [['slime', 6], ['bat', 3]], objs: [kill(50), survive(45), kill(70)] },
      { id: '1-2', name: '霓虹夜市', kind: 'normal', layout: 'fork', diff: 1.05, pos: [1, 0.3], next: ['1-4'], coins: 75,
        pool: [['slime', 5], ['bat', 3], ['bag', 2]], objs: [kill(50), survive(40), elite('vending')] },
      { id: '1-3', name: '排水溝渠', kind: 'normal', layout: 'hub', diff: 1.08, pos: [1, 1.7], next: ['1-4', '1-5'], coins: 80,
        pool: [['slime', 4], ['bat', 4], ['dog', 2]], objs: [kill(35), nests(2), survive(40), kill(70)] },
      { id: '1-4', name: '廢車場', kind: 'normal', layout: 'loop', diff: 1.15, pos: [2, 0.6], next: ['1-6'], coins: 95,
        pool: [['slime', 4], ['bag', 2], ['dog', 3], ['vending', 1]], objs: [kill(45), nests(3), survive(45), elite('dog')] },
      { id: '1-5', name: '地下金庫', kind: 'bonus', layout: 'arena', diff: 1.12, pos: [2, 2], next: ['1-6'], coins: 60,
        pool: [['bat', 5], ['slime', 3], ['bag', 1]], objs: [{ t: 'goblins', s: 75 }] },
      { id: '1-6', name: '鼠道深處', kind: 'elite', layout: 'cross', diff: 1.25, pos: [3, 1.2], next: ['1-B'], coins: 130,
        pool: [['slime', 3], ['bat', 3], ['bag', 2], ['dog', 3], ['vending', 2]], objs: [nests(2), survive(45), kill(60), elite('vending')] },
      { id: '1-B', name: '垃圾山王座', kind: 'boss', layout: 'gauntlet', diff: 1.3, pos: [4, 1], next: [], coins: 220,
        pool: [['slime', 5], ['bat', 3], ['bag', 2], ['dog', 2]], objs: [kill(70), boss('golem')] },
    ],
  },
  {
    id: 2, name: '地下格鬥城', sub: 'UNDERGROUND ARENA', theme: 'arena',
    intro: '鐵籠、聚光燈與歡呼聲。這裡沒有規則，只有站到最後的人。',
    nodes: [
      { id: '2-1', name: '選手通道', kind: 'normal', layout: 'zig', diff: 1.3, pos: [0, 1], next: ['2-2', '2-3'], coins: 110,
        pool: [['thug', 6], ['chip', 4]], objs: [kill(50), survive(40), kill(60), kill(80)] },
      { id: '2-2', name: '賭盤大廳', kind: 'normal', layout: 'hub', diff: 1.36, pos: [1, 0.3], next: ['2-4', '2-5'], coins: 125,
        pool: [['thug', 4], ['chip', 5], ['shroom', 2]], objs: [kill(45), nests(2), survive(45), elite('brute')] },
      { id: '2-3', name: '下水道訓練場', kind: 'normal', layout: 'fork', diff: 1.4, pos: [1, 1.7], next: ['2-4'], coins: 130,
        pool: [['thug', 4], ['ooze', 3], ['chip', 3]], objs: [kill(60), survive(50), elite('ooze')] },
      { id: '2-4', name: '鐵籠外圍', kind: 'normal', layout: 'loop', diff: 1.48, pos: [2, 1], next: ['2-6'], coins: 150,
        pool: [['thug', 4], ['chip', 3], ['brute', 1], ['shroom', 2], ['ooze', 2]], objs: [kill(55), nests(3), survive(50), kill(90)] },
      { id: '2-5', name: '莊家金庫', kind: 'bonus', layout: 'arena', diff: 1.45, pos: [2, 0], next: ['2-6'], coins: 100,
        pool: [['chip', 6], ['thug', 3]], objs: [{ t: 'goblins', s: 80 }] },
      { id: '2-6', name: '冠軍之路', kind: 'elite', layout: 'cross', diff: 1.58, pos: [3, 0.8], next: ['2-B'], coins: 200,
        pool: [['thug', 3], ['chip', 3], ['brute', 2], ['shroom', 2], ['ooze', 2]], objs: [elite('brute'), nests(3), survive(55), kill(80)] },
      { id: '2-B', name: '無規則鐵籠', kind: 'boss', layout: 'gauntlet', diff: 1.65, pos: [4, 1], next: [], coins: 340,
        pool: [['thug', 5], ['chip', 4], ['brute', 1], ['ooze', 2]], objs: [kill(90), boss('champ')] },
    ],
  },
  {
    id: 3, name: '虛空數據城', sub: 'VOID DATA CITY', theme: 'void',
    intro: '現實的背面是一座由數字與符文構成的城市。核心正在等待。',
    nodes: [
      { id: '3-1', name: '登入閘道', kind: 'normal', layout: 'snake', diff: 1.7, pos: [0, 1], next: ['3-2', '3-3'], coins: 170,
        pool: [['bug', 6], ['glitch', 3]], objs: [kill(60), survive(45), kill(90)] },
      { id: '3-2', name: '資料洪流', kind: 'normal', layout: 'zig', diff: 1.78, pos: [1, 0.2], next: ['3-4'], coins: 190,
        pool: [['bug', 5], ['glitch', 3], ['eye', 2]], objs: [kill(55), nests(2), survive(50), elite('eye')] },
      { id: '3-3', name: '廢棄記憶體', kind: 'normal', layout: 'loop', diff: 1.82, pos: [1, 1.8], next: ['3-4', '3-5'], coins: 195,
        pool: [['bug', 4], ['glitch', 3], ['virus', 3]], objs: [kill(60), survive(50), nests(3), kill(90)] },
      { id: '3-4', name: '防火牆', kind: 'normal', layout: 'hub', diff: 1.92, pos: [2, 0.7], next: ['3-6'], coins: 220,
        pool: [['bug', 4], ['glitch', 3], ['sentry', 1], ['eye', 2], ['virus', 2]], objs: [kill(50), elite('sentry'), nests(3), survive(60)] },
      { id: '3-5', name: '加密金鑰庫', kind: 'bonus', layout: 'arena', diff: 1.88, pos: [2, 2], next: ['3-6'], coins: 150,
        pool: [['bug', 6], ['virus', 2]], objs: [{ t: 'goblins', s: 85 }] },
      { id: '3-6', name: '根目錄', kind: 'elite', layout: 'cross', diff: 2.05, pos: [3, 1.2], next: ['3-B'], coins: 290,
        pool: [['bug', 4], ['glitch', 3], ['sentry', 1], ['eye', 2], ['virus', 3]], objs: [nests(3), elite('sentry'), survive(60), kill(100)] },
      { id: '3-B', name: '核心', kind: 'boss', layout: 'gauntlet', diff: 2.2, pos: [4, 1], next: [], coins: 500,
        pool: [['bug', 5], ['glitch', 3], ['eye', 2], ['virus', 2]], objs: [kill(100), boss('warden')] },
    ],
  },
];

export const STAGES = {};
for (const ch of CHAPTERS) for (const n of ch.nodes) { n.chapter = ch.id; n.theme = ch.theme; STAGES[n.id] = n; }

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
