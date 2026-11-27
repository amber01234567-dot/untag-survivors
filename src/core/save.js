// 局外成長存檔（localStorage）。SAVE_VERSION 升版時在 migrate() 補欄位即可，舊存檔不會壞。
import { CHARS, CHAR_LIST, MASTERY } from '../data/characters.js';
import { TALENTS, TALENT_PAGES, emptyBonus } from '../data/upgrades.js';
import { STAGES, DIFFS } from '../data/chapters.js';
import { EL, EL_IDS, SLOTS, ARMOR_SLOTS, MAX_STAR, DROP, gearId } from '../data/gear.js';

const KEY = 'untag_survivors_save';
export const SAVE_VERSION = 2;
const DEV = new URLSearchParams(location.search).get('dev') === '1' || (typeof window !== 'undefined' && !!window.__TEST);

function fresh() {
  return { v: SAVE_VERSION, name: '', coins: 0, talents: {}, chars: {}, gear: {}, equip: {}, unlocked: [], cleared: {}, char: 'tingge',
    settings: { sfx: 0.5, music: 0.35, shake: true, dmgNum: true }, stats: { runs: 0, wins: 0, kills: 0 } };
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
    const pg = TALENT_PAGES.find((x) => x.id === (t.page || 1));
    if (pg && pg.req && !DEV && !this.data.cleared[pg.req]) return false;
    const cost = t.cost(lv);
    if (this.data.coins < cost) return false;
    this.data.coins -= cost; this.data.talents[id] = lv + 1; this.write();
    return true;
  },
  // ── 裝備：每個角色各自的背包。gear = { 角色: { '<屬性>_<部位>': 星數 } }；equip = { 角色: { 部位: 屬性 } } ──
  star(charId, el, slot) { const g = this.data.gear[charId]; return (g && g[gearId(el, slot)]) || 0; },
  gearCount(charId) { return Object.keys(this.data.gear[charId] || {}).length; },
  // 取得一件（給指定角色）：沒有就 1 星，重複取得升星（滿星後不再變化）
  addGear(charId, el, slot) {
    const g = this.data.gear[charId] || (this.data.gear[charId] = {}), id = gearId(el, slot), cur = g[id] || 0;
    g[id] = Math.min(MAX_STAR, cur + 1);
    return { el, slot, star: g[id], isNew: !cur, maxed: cur >= MAX_STAR };
  },
  equipped(charId, slot) { const e = this.data.equip[charId]; const el = e && e[slot]; return el && this.star(charId, el, slot) ? el : null; },
  setEquip(charId, slot, el) {
    const e = this.data.equip[charId] || (this.data.equip[charId] = {});
    if (el && this.star(charId, el, slot)) e[slot] = el; else delete e[slot];
    this.write();
  },
  // 這個角色帶進戰場的裝備：{ 部位: [屬性, 星數] }
  gearFor(charId) {
    const g = {};
    for (const s of SLOTS) { const el = this.equipped(charId, s.id); if (el) g[s.id] = [el, this.star(charId, el, s.id)]; }
    return g;
  },
  // 帶進戰場的加成 = 天賦 + 該角色熟練度 + 裝備
  bonusFor(charId) {
    const b = emptyBonus();
    for (const t of TALENTS) { const lv = this.talent(t.id); if (lv) t.apply(b, lv); }
    const r = this.rank(charId);
    b.hp += r * MASTERY.perRank.hp; b.dmg += r * MASTERY.perRank.dmg;
    b.gear = this.gearFor(charId);
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
    // 裝備掉落（給這一場用的角色）：通關屬性章節才會掉。防具有機率（首領關必掉），武器配件只有首領關機率掉
    const drops = [];
    if (won && res.el && EL[res.el]) {
      const boss = st.kind === 'boss', luck = diff.reward;
      if (Math.random() < Math.min(1, (boss ? DROP.armorBoss : DROP.armor) * luck)) drops.push(this.addGear(res.myChar, res.el, ARMOR_SLOTS[Math.floor(Math.random() * 3)]));
      if (boss && Math.random() < Math.min(1, DROP.acc * luck)) drops.push(this.addGear(res.myChar, res.el, 'acc'));
    }
    this.write();
    return { coins, xp, first, ranksUp, rank: this.rank(res.myChar), drops };
  },
};
export { CHAR_LIST, DEV, EL_IDS };
