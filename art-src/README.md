# 美術原始檔

AI 生成的原圖（未裁切、未縮小）與當時使用的提示詞（`p_*.txt`）。遊戲實際讀取的是 `assets/` 內處理過的版本，這個資料夾不會被遊戲載入。

| 資料夾 | 內容 | 轉成遊戲素材的工具 |
| --- | --- | --- |
| `characters/` | 角色 Q 版造型（生成動作圖表時的參考圖） | — |
| `animations/` | 角色走路／攻擊圖表（每張 4 格） | `python3 tools/build_sprites.py art-src/animations` |
| `monsters/` | 怪物與首領 | 見 `src/render/enemySprites.js` 開頭說明 |
| `map/<主題>/` | 三章場景：地面、牆面、屋頂、障礙物、貼花、招牌、燈 | `python3 tools/build_map.py art-src/map` |
| `ui/skills/`、`ui/icons/` | 技能、武器、被動、天賦圖示 | 縮成 160 / 128 像素 |
| `fx/` | 掉落物、特效、子彈、召喚物、選單背景 | 裁邊後縮小 |

畫風關鍵字（生成新素材時沿用）：2D anime / cartoon animation style, clean dark lineart, cel shading with 2-3 flat tones, NOT 3D, no realistic textures。
角色為約 2.3 頭身的 Q 版比例，面向右 3/4 視角，透明背景。
