// 局外成長存檔（localStorage）。SAVE_VERSION 升版時在 migrate() 補欄位即可，舊存檔不會壞。
import { CHARS, CHAR_LIST, MASTERY } from '../data/characters.js';
import { TALENTS, emptyBonus } from '../data/upgrades.js';
import { STAGES, DIFFS } from '../data/chapters.js';

const KEY = 'untag_survivors_save';
export const SAVE_VERSION = 2;
const DEV = new URLSearchParams(location.search).get('dev') === '1';

function fresh() {
  return { v: SAVE_VERSION, name: '', coins: 0, talents: {}, chars: {}, unlocked: [], cleared: {}, char: 'tingge',
    settings: { sfx: 0.5, shake: true, dmgNum: true }, stats: { runs: 0, wins: 0, kills: 0 } };
}
function migrate(s) {
  const f = fresh();
  if ((s.v || 1) < 2 && Array.isArray(s.unlocked)) {        // v2：角色全面免費，退還先前花在解鎖上的金幣
    const PRICY = ['xia', 'yingzhang', 'tk', 'moumou', 'laojin', 'nongfu'];
    for (const id of s.unlocked) s.coins = (s.coins || 0) + (PRICY.includes(id) ? 900 : 600);
    s.unlocked = [];
  }
  for (const k in f) if (s[k] === undefined) s[k] = f[k];
  for (const k in f.settings) if (s.settings[k] === undefined) s.settings[k] = f.settings[k];
  s.v = SAVE_VERSION;
  return s;
}

export const save = {
  data: fresh(),
  load() {
    try { const raw = localStorage.getItem(KEY); if (raw) this.data = migrate(JSON.parse(raw)); } catch (e) { this.data = fresh(); }
    if (DEV) { this.data.coins = Math.max(this.data.coins, 99999); }
    if (!this.data.name) this.data.name = '玩家' + Math.floor(100 + Math.random() * 900);
    if (!this.isUnlocked(this.data.char)) this.data.char = 'tingge';
    return this.data;
  },
  write() { if (DEV) return; try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* 無痕模式等情況：忽略 */ } },
  reset() { this.data = fresh(); this.data.name = '玩家' + Math.floor(100 + Math.random() * 900); this.write(); },

  isUnlocked(id) { const c = CHARS[id]; return !!c && (DEV || !c.unlock || this.data.unlocked.includes(id)); },
  unlock(id) {
    const c = CHARS[id];
    if (this.isUnlocked(id) || this.data.coins < c.unlock) return false;
    this.data.coins -= c.unlock; this.data.unlocked.push(id); this.write();
    return true;
  },
  rank(id) { return (this.data.chars[id] && this.data.chars[id].rank) || 0; },
  charXp(id) { return (this.data.chars[id] && this.data.chars[id].xp) || 0; },
  addCharXp(id, xp) {
    const c = this.data.chars[id] || (this.data.chars[id] = { xp: 0, rank: 0 });
    c.xp += xp;
    let up = 0;
    while (c.rank < MASTERY.maxRank && c.xp >= MASTERY.need(c.rank)) { c.xp -= MASTERY.need(c.rank); c.rank++; up++; }
    return up;
  },
  talent(id) { return this.data.talents[id] || 0; },
  buyTalent(id) {
    const t = TALENTS.find((x) => x.id === id), lv = this.talent(id);
    if (!t || lv >= t.max) return false;
    const cost = t.cost(lv);
    if (this.data.coins < cost) return false;
    this.data.coins -= cost; this.data.talents[id] = lv + 1; this.write();
    return true;
  },
  // 帶進戰場的加成 = 天賦 + 該角色熟練度
  bonusFor(charId) {
    const b = emptyBonus();
    for (const t of TALENTS) { const lv = this.talent(t.id); if (lv) t.apply(b, lv); }
    const r = this.rank(charId);
    b.hp += r * MASTERY.perRank.hp; b.dmg += r * MASTERY.perRank.dmg;
    return b;
  },
  // 結算：回傳這一場拿到的東西
  settle(res) {
    const d = this.data, st = STAGES[res.stage], diff = DIFFS[res.diff], won = res.state === 'won';
    const first = won && !((d.cleared[res.stage] || 0) > res.diff);
    const b = this.bonusFor(res.myChar);
    let coins = res.coins + (won ? st.coins * diff.reward * (first ? 2 : 1) : st.coins * 0.12 * res.zones);
    coins = Math.round(coins * (1 + b.coin));
    const xp = Math.round((won ? 60 + st.diff * 40 : 15 + res.zones * 10) * diff.reward);
    d.coins += coins;
    const ranksUp = this.addCharXp(res.myChar, xp);
    if (won) d.cleared[res.stage] = Math.max(d.cleared[res.stage] || 0, res.diff + 1);
    d.stats.runs++; if (won) d.stats.wins++; d.stats.kills += res.kills;
    this.write();
    return { coins, xp, first, ranksUp, rank: this.rank(res.myChar) };
  },
};
export { CHAR_LIST, DEV };
