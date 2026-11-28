// 平衡量測：依「打到這一章時玩家大概有什麼」的進度設定，讓機器人跑各章抽樣關卡，輸出通關率 / 時間 / 最低血量。
// 用法：node tools/baltest.mjs [章節範圍=1-27] [關卡=1,4,B] [角色=...] [種子數=2] [人數=1] [難度=0]
//   PROFILE=none|talent|full  覆寫進度設定（預設 auto：依章節）
import { World } from '../src/sim/world.js';
import { STAGES } from '../src/data/chapters.js';
import { CHARS } from '../src/data/characters.js';
import { WEAPONS } from '../src/data/weapons.js';
import { CHAPTER_EL, BEATEN_BY } from '../src/data/gear.js';
import { botStep } from './bot.mjs';

const [range = '1-27', sts = '1,4,B', chs = 'laoliu,tingge,feijie,yingzhang,allen,maomaochong', seedsN = '2', nP = '1', diff = '0'] = process.argv.slice(2);
const [c0, c1] = range.split('-').map(Number);
// 進度設定：m = 天賦完成度（0..1，1 = 兩頁全滿）、rank = 角色熟練度、evo = 是否已解鎖進化武器、gear = [件數, 星數]（穿的是克制該章屬性的套裝）、subs = 章節副武器
export function profile(ch) {
  const P = process.env.PROFILE;
  if (P === 'none') return { m: 0, rank: 0 };
  if (P === 'full') return { m: 1, rank: 10, evo: true, gear: [4, 5], subs: true };
  if (ch <= 6) return { m: [0, 0.12, 0.25, 0.4, 0.55, 0.7][ch - 1], rank: Math.min(10, ch), evo: ch >= 4 };
  const s = Math.floor((ch - 7) / 3), k = (ch - 7) % 3;                // s = 第幾個新系列（0..6），k = 系列內第幾章
  return { m: Math.min(1, 0.8 + s * 0.1), rank: 10, evo: true, gear: s === 0 ? null : [k === 0 ? 3 : 4, Math.min(5, 1 + k + (s > 3 ? 1 : 0))], subs: s > 0 };
}
function bonusOf(ch, charId) {
  const pf = profile(ch), m = pf.m;
  const b = { hp: 0.9 * m + pf.rank * 0.03, dmg: 0.7 * m + pf.rank * 0.03, speed: 0.1 * m, cd: 0.1 * m, armor: Math.round(4 * m), regen: 1 * m, magnet: 0.6 * m, xp: 0.25 * m, crit: 0.1 * m, revives: Math.round(2 * m), rerolls: 0, ult: 0.3 * m, coin: 0 };
  if (pf.evo) { const w = WEAPONS[CHARS[charId].weapon]; if (w && w.evo) b.evo = w.evo.to; }
  const el = CHAPTER_EL[ch];
  if (pf.gear && el) { const g = BEATEN_BY[el], [n, st] = pf.gear; b.gear = { top: [g, st], pants: [g, st], shoes: [g, st] }; if (n > 3) b.gear.acc = [g, st]; }
  if (pf.subs) b.subs = ['sub_blades', 'sub_lightning', 'sub_icering', 'sub_drum'];
  return b;
}
function run(stage, chars, ch, seed) {
  const W = new World({ stage, diff: +diff, seed, el: CHAPTER_EL[ch], players: chars.map((c, i) => ({ id: i, name: 'b' + i, charId: c, bonus: bonusOf(ch, c) })) });
  const st = { nav: null, navKey: '', minHp: 1 };
  for (let tick = 0; tick < 60 * 60 * 14 && (W.state === 'play' || W.state === 'levelup'); tick++) {
    if (W.state === 'levelup') for (const p of W.players) W.choose(p.id, 0);
    botStep(W, st, tick, (p, mx, my, k) => { p.in.mx = mx; p.in.my = my; p.in.k = k; });
    W.step(1 / 60); W.ev.length = 0;
  }
  return { won: W.state === 'won' ? 1 : 0, t: W.time, minHp: st.minHp, downs: W.players.reduce((a, p) => a + p.stats.downs, 0), zones: W.ctl.cleared, taken: W.players.reduce((a, p) => a + p.stats.taken, 0) / W.players.reduce((a, p) => a + p.st.maxHp, 0) };
}
// KS="3:1.2,4:1.3"：測試用，把某幾個系列的關卡強度乘上倍率
if (process.env.KS) { const ks = Object.fromEntries(process.env.KS.split(',').map((x) => x.split(':').map(Number))); for (const k in STAGES) { const st = STAGES[k]; if (ks[st.series]) st.diff *= ks[st.series]; } }
if (process.env.CK) { const ck = Object.fromEntries(process.env.CK.split(',').map((x) => x.split(':').map(Number))); for (const k in STAGES) { const st = STAGES[k]; if (ck[st.chapter]) { st.dens = st.dens || st.diff; st.diff *= ck[st.chapter]; } } }
if (process.env.CR) { const cr = Object.fromEntries(process.env.CR.split(',').map((x) => x.split(':').map(Number))); for (const k in STAGES) { const st = STAGES[k]; if (cr[st.chapter]) st.rate = (st.rate || 1) * cr[st.chapter]; } }
const chars = chs.split(','), out = [];
for (let ch = c0; ch <= c1; ch++) {
  let n = 0, won = 0, t = 0, mh = 0, dn = 0, tk = 0; const per = {};
  for (const sx of sts.split(',')) {
    const stage = STAGES[ch + '-' + sx]; if (!stage) continue;
    let sw = 0, sn = 0;
    for (const c of chars) for (let s = 0; s < +seedsN; s++) {
      let r; try { r = run(stage, Array.from({ length: +nP }, (_, i) => +nP > 1 ? chars[(chars.indexOf(c) + i) % chars.length] : c), ch, 1000 + s * 77 + ch); } catch (e) { console.log('ERROR', ch + '-' + sx, c, e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
      n++; sn++; won += r.won; sw += r.won; if (r.won) t += r.t; mh += r.minHp; dn += r.downs; tk += r.taken;
    }
    per[sx] = sn ? Math.round(sw / sn * 100) : 0;
    if (process.env.DETAIL) console.log(`  ${ch}-${sx} ${String(per[sx]).padStart(3)}%  ${stage.kind || ''} ${stage.layout} d${stage.diff} objs:${(stage.objs || []).map((o) => o.t + (o.n ? o.n : '')).join(',')} haz:${stage.hazard ? (stage.hazard.t || JSON.stringify(stage.hazard).slice(0, 30)) : '-'}`);
  }
  const pf = profile(ch);
  console.log(`ch${String(ch).padStart(2)} win ${String(Math.round(won / n * 100)).padStart(3)}%  [${Object.entries(per).map(([k, v]) => k + ':' + v).join(' ')}]  t ${won ? Math.round(t / won) : '-'}s  minHp ${(mh / n).toFixed(2)}  downs ${(dn / n).toFixed(2)}  taken ${(tk / n).toFixed(1)}x  | m${pf.m} r${pf.rank}${pf.evo ? ' evo' : ''}${pf.gear ? ' gear' + pf.gear.join('*') : ''}${pf.subs ? ' subs' : ''}`);
}
