// 無頭模擬測試：用簡單的機器人跑完整關卡，檢查不會噴錯並粗估平衡。
// 用法：node tools/simtest.mjs [stageId] [charId|all] [players] [diff]
import { World } from '../src/sim/world.js';
import { STAGES } from '../src/data/chapters.js';
import { CHAR_LIST } from '../src/data/characters.js';
import { TILE, T_FLOOR } from '../src/sim/const.js';
import { botStep } from './bot.mjs';

const [stageId = '1-1', who = 'all', nP = '1', diff = '0', meta = '0', pickAlt = '0'] = process.argv.slice(2);
const M = +meta, BONUS = { hp: 0.8 * M, dmg: 0.7 * M, speed: 0.1 * M, cd: 0.1 * M, armor: 4 * M, regen: 1 * M, magnet: 0.6 * M, xp: 0.25 * M, crit: 0.1 * M, revives: Math.round(2 * M), rerolls: 0, ult: 0.3 * M, coin: 0 };

// 屬性測試：EL=fire GEAR=ice:5 node tools/simtest.mjs 1-1 laoliu  → 火屬性關、穿冰全套 5 星
const ENV_EL = process.env.EL || undefined;
if (process.env.NOHAZ) for (const k in STAGES) STAGES[k].hazard = null;
if (process.env.GEAR) { const [g, st = '1'] = process.env.GEAR.split(':'); BONUS.gear = { acc: [g, +st], top: [g, +st], pants: [g, +st], shoes: [g, +st] }; }
function run(stage, chars, diffI, seed) {
  const W = new World({ stage, diff: diffI, seed, el: ENV_EL, players: chars.map((c, i) => ({ id: i, name: 'bot' + i, charId: c, bonus: BONUS })) });
  const st = { nav: null, navKey: '', minHp: 1 }, lvlAt = [];
  const maxT = 60 * 60 * 14;
  for (let tick = 0; tick < maxT && (W.state === 'play' || W.state === 'levelup'); tick++) {
    if (W.state === 'levelup') { for (const p of W.players) { const pk = W.picks[p.id]; W.choose(p.id, +pickAlt && pk && pk.opts[1] && pk.opts[1].branch ? 1 : 0); } }
    botStep(W, st, tick, (p, mx, my, k) => { p.in.mx = mx; p.in.my = my; p.in.k = k; });
    W.step(1 / 60);
    W.ev.length = 0;
    if (tick % 3600 === 0) lvlAt.push(W.level);
  }
  return { state: W.state, t: Math.round(W.time), lv: W.level, kills: W.kills, coins: Math.round(W.coins), minHp: +st.minHp.toFixed(2), zones: W.ctl.cleared, dmg: W.players.map((p) => Math.round(p.stats.dmg)), heal: W.players.map((p) => Math.round(p.stats.heal)), downs: W.players.map((p) => p.stats.downs), lvlAt };
}
const stage = STAGES[stageId];
const list = who === 'all' ? CHAR_LIST.map((c) => c.id) : who.split(',');
if (+nP > 1 && who !== 'all') { console.log(stageId, list.join('+'), JSON.stringify(run(stage, list, +diff, 12345))); }
else for (const c of list) {
  const t0 = Date.now();
  try { const r = run(stage, Array.from({ length: +nP }, () => c), +diff, 12345); console.log(stageId, c.padEnd(12), JSON.stringify(r), (Date.now() - t0) + 'ms'); }
  catch (e) { console.log(stageId, c, 'ERROR', e.stack.split('\n').slice(0, 5).join('\n')); }
}
