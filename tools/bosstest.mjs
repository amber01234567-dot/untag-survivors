// 首領強度量測：玩家不會死，站在首領旁邊打，量「擊殺時間」與寶具一發的傷害佔比。
// 用法：node tools/bosstest.mjs [stageId] [chars] [開打時的隊伍等級]
import { World } from '../src/sim/world.js';
import { STAGES } from '../src/data/chapters.js';
import { CHAR_LIST } from '../src/data/characters.js';
const [stageId = '1-B', who = 'all', lv = '12'] = process.argv.slice(2);
const list = who === 'all' ? CHAR_LIST.map((c) => c.id) : who.split(',');
for (const c of list) {
  const W = new World({ stage: STAGES[stageId], diff: 0, seed: 777, players: [{ id: 0, name: 'b', charId: c }] });
  const p = W.players[0], L = W.L, f = L.zones.find((z) => z.kind === 'final');
  for (const z of L.zones) if (z.kind !== 'final' && z.state !== 'cleared') { z.state = 'cleared'; W.ctl.cleared++; }
  W.ctl.refreshLinks();
  W.lvQueue = +lv - 1;                                   // 模擬打到首領前累積的升級
  for (let i = 0; i < 400 && (W.lvQueue > 0 || W.state === 'levelup'); i++) { if (W.state === 'levelup') W.choose(0, 0); W.step(1 / 60); }
  p.x = f.cx; p.y = f.cy + 120; p.ult = p.ultMax;
  let boss = null, t0 = 0, ultDmg = 0, hp0 = 0, done = null;
  for (let t = 0; t < 60 * 400; t++) {
    if (W.state === 'levelup') W.choose(0, 0);
    p.hp = p.st.maxHp; p.down = false; p.invuln = 1;
    if (!boss) { boss = W.enemies.find((e) => e.def.boss); if (boss) { hp0 = boss.maxHp; t0 = W.time; } }
    if (boss && !boss.dead) { const dx = boss.x - p.x, dy = boss.y - p.y, d = Math.hypot(dx, dy) || 1; const want = p.def.role === 'melee' || ['qiqiu', 'allen', 'xiaoshunzi'].includes(c) ? 40 : 200; p.in.mx = d > want ? dx / d : 0; p.in.my = d > want ? dy / d : 0; }
    const before = boss ? boss.hp : 0, hadUlt = p.ult >= p.ultMax;
    p.in.k = boss && boss.spawnT <= 0 ? 3 : 0;
    W.step(1 / 60); W.ev.length = 0;
    if (boss && boss.dead && !done) { done = W.time - t0; break; }
    if (W.state === 'won') { done = W.time - t0; break; }
  }
  console.log(c.padEnd(12), 'bossHP', Math.round(hp0), 'TTK', done ? done.toFixed(1) + 's' : '>400s', 'dps', done ? Math.round(hp0 / done) : '-');
}
