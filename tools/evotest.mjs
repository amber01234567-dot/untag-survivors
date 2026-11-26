// 進化測試：直接把角色升到「滿級武器 + 對應被動達標」，確認進化卡出現，並比較進化前後對木樁群的輸出。
// 用法：node tools/evotest.mjs [charId,...|all]
import { World } from '../src/sim/world.js';
import { STAGES } from '../src/data/chapters.js';
import { CHAR_LIST } from '../src/data/characters.js';
import { WEAPONS } from '../src/data/weapons.js';
import { spawnEnemy } from '../src/sim/enemy.js';
import { applyOption, rollOptions } from '../src/sim/player.js';
const who = process.argv[2] || 'all', N = +(process.argv[3] || 24);
const list = (who === 'all' ? CHAR_LIST.map((c) => c.id) : who.split(',')).filter((c) => { const w = WEAPONS[CHAR_LIST.find((x) => x.id === c).weapon]; return w.evo || (w.branch || []).some((b) => WEAPONS[b].evo); });
function dps(charId, evolve, branch) {
  const W = new World({ stage: STAGES['3-1'], diff: 0, seed: 11, players: [{ id: 0, name: 'b', charId }] });
  const p = W.players[0]; W.lvQueue = 0;
  let main = p.weapons[0];
  const up = (id) => applyOption(W, p, { k: 'w', id, lv: 1 });
  while (main.level < main.def.maxLv) up(main.def.id);
  if (branch) { applyOption(W, p, { k: 'w', id: branch, lv: 1, replace: main.def.id }); main = p.weapons[0]; while (main.level < main.def.maxLv) up(main.def.id); }
  const evo = main.def.evo; let card = false;
  for (let i = 0; i < evo.need; i++) applyOption(W, p, { k: 'p', id: evo.passive });
  if (evolve) { const o = rollOptions(W, p, 3).find((x) => x.evo); card = !!o; if (o) applyOption(W, p, o); }
  const z = W.L.zones[0]; let total = 0;
  for (let t = 0; t < 60 * 30; t++) {
    if (W.state === 'levelup') W.choose(0, 0);
    p.hp = p.st.maxHp; p.invuln = 1; p.x = z.cx; p.y = z.cy; p.in.mx = p.in.my = 0; p.in.k = 0;
    while (W.enemies.filter((e) => !e.dead).length < N) { const i = W.enemies.length, a = i * 2.399963, d = N < 3 ? 70 : 60 + ((i * 53) % 200); const e = spawnEnemy(W, 'sentry', z.cx + Math.cos(a) * d, z.cy + Math.sin(a) * d, { instant: true, noDrop: true }); e.speed = 0; e.dmg = 0; e.hp = e.maxHp = 1e7; }
    const before = p.stats.dmg; W.step(1 / 60); total += p.stats.dmg - before; W.ev.length = 0;
  }
  return { dps: Math.round(total / 30), card, name: p.weapons[0].def.name };
}
for (const c of list) {
  const w = WEAPONS[CHAR_LIST.find((x) => x.id === c).weapon];
  for (const br of w.evo ? [null] : w.branch.filter((b) => WEAPONS[b].evo)) {
    const a = dps(c, false, br), b = dps(c, true, br);
    console.log(c.padEnd(12), a.name, a.dps, '→', b.name, b.dps, `(${(b.dps / a.dps).toFixed(2)}x)`, b.card ? '進化卡 OK' : '!! 沒出現進化卡');
  }
}
