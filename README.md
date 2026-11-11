# UNTAG 倖存戰線

4 人連線合作的關卡型 2D 倖存者遊戲（網頁版）。純靜態網站，不需要後端：房主的瀏覽器就是主機（WebRTC P2P）。

## 立刻開始

```bash
node tools/serve.mjs 8080      # 任何靜態伺服器都可以，例如 npx serve .
# 開啟 http://localhost:8080
```

- **單人**：主選單 →「單人出擊」。
- **連線**：一人按「建立房間」，把房號或邀請連結傳給朋友；朋友輸入房號按「加入房間」→「準備」，房主按「出擊」。
- **操作**：`WASD` / 方向鍵移動、攻擊全自動、`空白鍵` 技能、`Q` 寶具、`Esc` 選單。手機為左側虛擬搖桿 + 右下技能鈕。

### 網址參數

| 參數 | 用途 |
| --- | --- |
| `?room=ABCDE` | 預填房號（邀請連結） |
| `?dev=1` | 開發模式：全角色解鎖、金幣 99999、**不寫入存檔** |
| `?quick=1-1,tingge` | 跳過選單直接開一場單人（可加 `&diff=1`、`&fastult=1`） |
| `?net=local` | 同一台電腦不同分頁用 BroadcastChannel 連線（不經網路，測試用） |
| `?peerhost=..&peerport=..` | 改用自架的 PeerServer 訊號伺服器（預設用 PeerJS 公用雲端） |

## 部署

整個資料夾就是網站。丟到 GitHub Pages / Cloudflare Pages / Netlify 任一靜態空間即可（**必須是 HTTPS**，WebRTC 才能用）。
`tools/` 只是開發工具，不必部署。

連線說明：玩家之間是 P2P 直連，「配對」這一步借用 PeerJS 的公用訊號伺服器。少數網路環境（公司 / 校園防火牆、對稱型 NAT）可能連不上；
若遇到，可以自架 `peer` 訊號伺服器（`tools/` 內已裝好：`node tools/node_modules/peer/dist/bin/peerjs.js --port 9000`）並用 `?peerhost=` 指過去。

## 專案結構

```
index.html / css/            版面與樣式
vendor/peerjs.min.js         WebRTC 連線函式庫
assets/sheets/               角色設定圖（圖鑑內可點開）
src/
  data/      ← 內容都在這裡（角色 / 武器 / 敵人 / 關卡 / 天賦），加新東西幾乎只改這層
  sim/       權威模擬（只在房主端跑）：世界、玩家、武器行為、技能、敵人 AI、關卡流程、地圖生成
  net/       連線：傳輸層、快照協定、插值視圖、房間與對局執行期
  render/    繪製：Q 版角色、敵人貼圖、分層地圖、特效、主渲染器
  ui/        選單、HUD、輸入
  core/      工具、存檔、音效
tools/       serve.mjs（靜態伺服器）、simtest.mjs（無頭機器人模擬，調平衡用）、chibi-preview.html（角色外觀預覽）
```

## 系統設計

### 兩層關卡結構
- **外層：世界節點圖**（`data/chapters.js` 的 `CHAPTERS`）。每章是一張有向圖，`next` 指向可前往的節點，形成分歧路線；節點有戰鬥 / 菁英 / 寶藏 / 首領四種，每關有 普通 / 困難 / 地獄 三種難度（星數）。
- **內層：關卡內拓樸**（`LAYOUTS`）。區域擺在粗網格上，`links` 是通道；`req` 指定要先淨化哪些區域閘門才開，所以可以做出直線、分岔、樞紐、環狀等流程。
- **分層地圖**（`sim/levelgen.js` → `render/map.js`）：碰撞層（牆 / 地板 / 障礙 / 閘門）、障礙物外觀層、地面貼花層、牆面裝飾與燈光層、角色上方的遮蔽層、動態光照層。地圖由「拓樸 + seed」生成，房主與客戶端用同一顆 seed 得到相同地圖，不必傳輸地圖資料。

### 局外成長（`core/save.js`）
- **金幣**：通關獎勵（首次通關 ×2）+ 場上掉落。
- **天賦**（`data/upgrades.js` 的 `TALENTS`）：全角色共用的永久加成。
- **角色熟練度**：用哪個角色打就累積該角色經驗，每階 生命 / 傷害 +3%（`MASTERY`）。
- **角色解鎖**：`unlock` 欄位為價格，0 = 初始可用。
- 存檔在 localStorage，帶版本號與 `migrate()`，之後加欄位不會弄壞舊存檔。

### 局內成長
隊伍共享經驗與等級，升級時每人各自三選一：專屬武器升級（7 級）、通用副武器（最多 2 把）、被動（最多 6 種）。
淨化區域、擊敗菁英會掉寶箱（全隊各多選一次）。第 2、3 章開場有「戰前補給」。

### 連線模型
房主權威 + 快照插值：
- 房主以 60Hz 跑模擬，每 3 tick 廣播一份二進位快照（敵人 10 bytes / 隻、子彈 9 bytes / 顆）。
- 客戶端只送輸入（30Hz），畫面延遲約 120ms 做插值；自己的移動有本地預測 + 伺服器校正，所以操作不會黏。
- 房主自己也走同一條「快照 → 插值視圖」路徑，兩邊畫面邏輯一致。
- 模擬由 Web Worker 計時推動，房主分頁切到背景也不會讓所有人卡住。

## 擴充指南

### 新增角色
1. `src/data/characters.js` 加一筆 `C({...})`：數值、`weapon`、`skill`、`ult`、解鎖價格。
2. 武器：`src/data/weapons.js` 加一筆 `W(...)`。能用現有行為（`melee` 近戰揮砍、`gun` 射擊、`beam` 光束、`orbit` 環繞、`mine` 地雷、`pulse` 範圍脈衝、`drone` 無人機、`cats` 召喚、`wisp` 鬼火…）組出來的話，只要填數值與每級加成；全新機制才需要在 `src/sim/weapons.js` 的 `BEH` 加一個行為。
3. 技能 / 寶具：在 `src/sim/skills.js` 的 `SKILLS` 加同名函式，用現成積木（`W.aoe`、`W.addZone`、`W.shoot`、`dash`、`addBuff`、`minion`…）拼。
4. 外觀：在 `src/render/chibi.js` 的 `LOOKS` 加同名函式（沒有的話會自動顯示剪影佔位，不影響遊玩）。畫的時候開 `http://localhost:8080/tools/chibi-preview.html` 可即時預覽各種姿勢。設定圖放 `assets/sheets/<id>.jpg` 並在角色資料加 `sheet: true`，圖鑑就會顯示。

### 新增敵人
`src/data/enemies.js` 加一筆（**加在清單最後**，順序是網路同步索引），`ai` 選現有行為（`chase` / `swarm` / `shooter` / `charger` / `exploder` / `blink` / `flee`…），再到 `src/render/enemySprites.js` 的 `DRAW` 畫外觀。

### 新增關卡 / 章節
`src/data/chapters.js`：在章節的 `nodes` 加節點（選 `layout`、填 `objs` 目標與 `pool` 敵人池、`pos` 與 `next`）。新的拓樸加在 `LAYOUTS`；新主題的地面 / 牆面 / 障礙物畫法加在 `src/render/map.js` 的 `THEMES`。

### 其他可擴充點
- 目標類型：`src/sim/stagectl.js`（目前有 殲滅 / 生存 / 巢穴 / 菁英 / 首領 / 攔截）。
- 被動與天賦：`src/data/upgrades.js` 直接往表裡加。
- 快照欄位：`src/net/protocol.js`，改動時把 `PROTO` 加一（不同版本的玩家會被擋在房外並提示重新整理）。

## 調平衡

```bash
node tools/simtest.mjs 1-4 all            # 每個角色用機器人跑一次 1-4
node tools/simtest.mjs 2-B tingge,laijie 2 0 0.5   # 2 人、普通難度、局外養成 50% 的狀態打 2-B
```
輸出通關與否、時間、等級、最低血量、各自傷害 / 治療，用來粗估難度曲線。

## 版權

版權所有，未經同意不得使用本專案的程式碼與美術素材。詳見 [LICENSE.md](LICENSE.md)。
