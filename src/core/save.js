// 局外成長存檔（localStorage）。SAVE_VERSION 升版時在 migrate() 補欄位即可，舊存檔不會壞。
import { CHARS, CHAR_LIST, MASTERY } from '../data/characters.js';
import { TALENTS, TALENT_PAGES, emptyBonus } from '../data/upgrades.js';
import { STAGES, DIFFS } from '../data/chapters.js';
import { WEAPONS, SUB_WEAPONS } from '../data/weapons.js';
import { EL, EL_IDS, SLOTS, ARMOR_SLOTS, MAX_STAR, DROP, gearId } from '../data/gear.js';

const KEY = 'untag_survivors_save';
export const SAVE_VERSION = 2;
const DEV = new URLSearchParams(location.search).get('dev') === '1' || (typeof window !== 'undefined' && !!window.__TEST);

function fresh() {
  return { v: SAVE_VERSION, name: '', coins: 0, talents: {}, chars: {}, gear: {}, equip: {}, evos: {}, evoSel: {}, subSel: [], unlocked: [], cleared: {}, char: 'tingge',
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

const CODE_PREFIX = 'LUHAI1.';
function b64enc(str) { const u = new TextEncoder().encode(str); let b = ''; for (let i = 0; i < u.length; i++) b += String.fromCharCode(u[i]); return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64dec(str) { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new TextDecoder().decode(u); }
function checksum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
// 匯入的資料不可信：型別不對的欄位換回預設值，數字夾在合理範圍內，不認得的角色 / 天賦 / 關卡丟掉
function sanitize(s) {
  const f = fresh(), obj = (v) => v && typeof v === 'object' && !Array.isArray(v), int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(+v) || 0));
  for (const k of ['talents', 'chars', 'gear', 'equip', 'evos', 'evoSel', 'cleared', 'settings', 'stats']) if (!obj(s[k])) s[k] = f[k];
  for (const k of ['subSel', 'unlocked']) if (!Array.isArray(s[k])) s[k] = [];
  s.coins = int(s.coins, 0, 99999999); s.name = String(s.name || '').slice(0, 12);
  if (!CHARS[s.char]) s.char = 'tingge';
  const tl = {}; for (const t of TALENTS) if (s.talents[t.id]) tl[t.id] = int(s.talents[t.id], 0, t.max); s.talents = tl;
  const ch = {}; for (const id in s.chars) if (CHARS[id] && obj(s.chars[id])) ch[id] = { xp: int(s.chars[id].xp, 0, 1e7), rank: int(s.chars[id].rank, 0, MASTERY.maxRank) }; s.chars = ch;
  const cl = {}; for (const id in s.cleared) if (STAGES[id]) cl[id] = int(s.cleared[id], 0, DIFFS.length); s.cleared = cl;
  const gr = {}; for (const c in s.gear) if (CHARS[c] && obj(s.gear[c])) { gr[c] = {}; for (const g in s.gear[c]) { const [el, slot] = g.split('_'); if (EL[el] && SLOTS.some((x) => x.id === slot)) gr[c][g] = int(s.gear[c][g], 1, MAX_STAR); } } s.gear = gr;
  const eq = {}; for (const c in s.equip) if (CHARS[c] && obj(s.equip[c])) { eq[c] = {}; for (const slot in s.equip[c]) { const el = s.equip[c][slot]; if (SLOTS.some((x) => x.id === slot) && EL[el] && gr[c] && gr[c][gearId(el, slot)]) eq[c][slot] = el; } } s.equip = eq;
  const ev = {}; for (const c in s.evos) if (CHARS[c] && Array.isArray(s.evos[c])) ev[c] = s.evos[c].filter((w) => WEAPONS[w] && WEAPONS[w].evoOf); s.evos = ev;
  const es = {}; for (const c in s.evoSel) if (ev[c] && ev[c].includes(s.evoSel[c])) es[c] = s.evoSel[c]; s.evoSel = es;
  s.subSel = s.subSel.filter((id) => SUB_WEAPONS.includes(id)).slice(0, 4);
  s.unlocked = s.unlocked.filter((id) => CHARS[id]);
  for (const k of ['sfx', 'music']) s.settings[k] = Math.max(0, Math.min(1, +s.settings[k] || 0));
  for (const k of ['shake', 'dmgNum']) s.settings[k] = !!s.settings[k];
  for (const k of ['runs', 'wins', 'kills']) s.stats[k] = int(s.stats[k], 0, 1e9);
  return s;
}
function summary(d) {
  const cleared = Object.keys(d.cleared || {}), far = cleared.map((id) => STAGES[id]).filter(Boolean).reduce((m, st) => Math.max(m, st.chapter), 0);
  let gear = 0; for (const c in d.gear) gear += Object.keys(d.gear[c]).length;
  let evos = 0; for (const c in d.evos) evos += d.evos[c].length;
  return { name: d.name, coins: d.coins, cleared: cleared.length, chapter: far, talents: Object.values(d.talents || {}).reduce((a, b) => a + b, 0), ranks: Object.values(d.chars || {}).reduce((a, c) => a + (c.rank || 0), 0), gear, evos, runs: (d.stats && d.stats.runs) || 0 };
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
  // ── 存檔匯出 / 匯入 ──
  // 存檔碼 = "LUHAI1." + base64(JSON) + "." + 檢查碼。換瀏覽器、換裝置、清快取前先匯出，之後貼回來就能接續。
  exportCode() {
    const d = Object.assign({}, this.data, { exportedAt: Date.now() });
    const body = b64enc(JSON.stringify(d));
    return CODE_PREFIX + body + '.' + checksum(body);
  },
  // 只解析、不寫入：回傳 { ok, data, info } 或 { ok: false, err }。info 給畫面顯示「這份存檔裡有什麼」
  parseCode(str) {
    const t = String(str || '').replace(/\s+/g, '');
    if (!t) return { ok: false, err: '請先貼上存檔碼' };
    if (!t.startsWith(CODE_PREFIX)) return { ok: false, err: '這不是 LUHAI 的存檔碼' };
    const i = t.lastIndexOf('.'), body = t.slice(CODE_PREFIX.length, i), sum = t.slice(i + 1);
    if (i <= CODE_PREFIX.length || checksum(body) !== sum) return { ok: false, err: '存檔碼不完整或被改過（請確認整段都有複製到）' };
    let d;
    try { d = JSON.parse(b64dec(body)); } catch (e) { return { ok: false, err: '存檔碼內容讀不出來' }; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.coins !== 'number') return { ok: false, err: '存檔碼內容不正確' };
    if ((d.v || 1) > SAVE_VERSION) return { ok: false, err: '這份存檔來自比較新的遊戲版本，請先重新整理頁面更新遊戲' };
    delete d.exportedAt;
    d = sanitize(migrate(d));
    return { ok: true, data: d, info: summary(d) };
  },
  importCode(str) {
    const r = this.parseCode(str);
    if (!r.ok) return r;
    this.data = r.data;
    if (!this.data.name) this.data.name = '玩家' + Math.floor(100 + Math.random() * 900);
    if (!this.isUnlocked(this.data.char)) this.data.char = 'tingge';
    this.write();
    return r;
  },
  summary() { return summary(this.data); },
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
  // ── 副武器：基本 4 把一開始就有；章節副武器打倒特定首領（通關該關卡）後永久解鎖，全角色共用。出戰前最多選 4 把放進抽卡池 ──
  subUnlocked(id) { const u = WEAPONS[id].unlock; return !u || DEV || !!this.data.cleared[u]; },
  subPool() {
    const all = SUB_WEAPONS.filter((id) => this.subUnlocked(id)), sel = (this.data.subSel || []).filter((id) => all.includes(id));
    return sel.length ? sel : all;
  },
  toggleSub(id) {
    if (!this.subUnlocked(id)) return false;
    const s = (this.data.subSel || []).filter((x) => SUB_WEAPONS.includes(x) && this.subUnlocked(x)), i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1); else { if (s.length >= 4) return false; s.push(id); }
    this.data.subSel = s; this.write(); return true;
  },
  // ── 武器進化：每個角色在戰鬥中進化過一次就永久解鎖，之後可在角色頁選擇開場就用進化型態 ──
  evoUnlocked(charId, wid) { return DEV || (this.data.evos[charId] || []).includes(wid); },
  unlockEvo(charId, wid) {
    const a = this.data.evos[charId] || (this.data.evos[charId] = []);
    if (a.includes(wid)) return false;
    a.push(wid); if (!this.data.evoSel[charId]) this.data.evoSel[charId] = wid;      // 第一次解鎖：預設直接選用
    this.write(); return true;
  },
  evoSel(charId) { const w = this.data.evoSel[charId]; return w && this.evoUnlocked(charId, w) ? w : ''; },
  setEvoSel(charId, wid) { this.data.evoSel[charId] = wid && this.evoUnlocked(charId, wid) ? wid : ''; this.write(); },
  // 帶進戰場的加成 = 天賦 + 該角色熟練度 + 裝備
  bonusFor(charId) {
    const b = emptyBonus();
    for (const t of TALENTS) { const lv = this.talent(t.id); if (lv) t.apply(b, lv); }
    const r = this.rank(charId);
    b.hp += r * MASTERY.perRank.hp; b.dmg += r * MASTERY.perRank.dmg;
    b.gear = this.gearFor(charId); b.evo = this.evoSel(charId); b.subs = this.subPool();
    return b;
  },
  // 結算：回傳這一場拿到的東西
  settle(res) {
    const d = this.data, st = STAGES[res.stage], diff = DIFFS[res.diff], won = res.state === 'won';
    const first = won && !((d.cleared[res.stage] || 0) > res.diff);
    const b = this.bonusFor(res.myChar);
    let coins = res.coins + (won ? st.coins * diff.reward * (first ? 2 : 1) : st.coins * 0.12 * Math.max(0, res.zones));
    coins = Math.round(coins * (1 + b.coin) * (st.coinMul || 1));      // 金系列：金幣 +50%
    const xp = Math.round((won ? 60 + st.diff * 40 : 15 + res.zones * 10) * diff.reward);
    d.coins += coins;
    const ranksUp = this.addCharXp(res.myChar, xp);
    const newSubs = won && !d.cleared[res.stage] ? SUB_WEAPONS.filter((id) => WEAPONS[id].unlock === res.stage) : [];      // 第一次打倒這個首領：解鎖牠身上的副武器
    if (won) d.cleared[res.stage] = Math.max(d.cleared[res.stage] || 0, res.diff + 1);
    d.stats.runs++; if (won) d.stats.wins++; d.stats.kills += res.kills;
    // 裝備掉落（給這一場用的角色）：通關屬性章節才會掉。防具有機率（首領關必掉），武器配件只有首領關機率掉
    const drops = [];
    if (won && res.el && EL[res.el]) {
      const boss = st.kind === 'boss', luck = diff.reward;
      if (Math.random() < Math.min(1, (boss ? DROP.armorBoss : DROP.armor) * luck)) drops.push(this.addGear(res.myChar, res.el, ARMOR_SLOTS[Math.floor(Math.random() * 3)]));
      if (boss && (st.accSure || Math.random() < Math.min(1, DROP.acc * luck))) drops.push(this.addGear(res.myChar, res.el, 'acc'));
    }
    this.write();
    return { coins, xp, first, ranksUp, rank: this.rank(res.myChar), drops, newSubs };
  },
};
export { CHAR_LIST, DEV, EL_IDS };
