// 圖示：assets/ui/ 底下的圖片；圖還沒做的項目會自動退回文字符號。
//   skills/<技能id>   icons/w_<武器id>  icons/p_<被動id>  icons/t_<天賦id>  icons/s_heal、s_coin
const IN = (typeof window !== 'undefined' && window.__UI) || null;      // 測試頁把圖示內嵌成一個檔（減少檔案數）
export const U = (p) => (IN && IN[p]) || new URL(`../../assets/ui/${p}.png`, import.meta.url).href;
export const icon = (path, glyph, col, cls = '', extra = '') =>
  `<span class="glyph ${cls}" style="--c:${col}"><img alt="" src="${U(path)}" onerror="this.remove()"><b>${glyph}</b>${extra}</span>`;
export const optIcon = (o) => (o.k === 'w' ? 'icons/w_' + o.id : o.k === 'p' ? 'icons/p_' + o.id : 'icons/s_' + o.k);
