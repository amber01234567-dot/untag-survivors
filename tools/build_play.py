#!/usr/bin/env python3
"""產生單人測試頁 dist/play.html（index.html + 內嵌 CSS，開啟測試模式）。用法：python3 tools/build_play.py"""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'index.html')).read(); css = open(os.path.join(ROOT, 'css/style.css')).read().replace('url(../assets/', 'url(assets/')
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
body = re.sub(r'<script src="vendor/peerjs[^"]*"></script>\n?', '', body).replace('<script type="module" src="src/main.js"></script>', '<script>window.__TEST = true; window.__MAPPACK = true;</script>\n<script src="ui-inline.js"></script>\n<script type="module" src="src/main.js"></script>')
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist/play.html'), 'w').write('<title>LUHAI 測試版</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Noto+Serif+TC:wght@700;900&display=swap">\n<style>\n' + css + '\n</style>' + body)

# 圖示內嵌：assets/ui/icons、skills 底下的小圖全部包成一個 JS（測試頁有檔案數上限）
import base64, glob, json
ui = {}
for d in ('icons', 'skills'):
    for f in sorted(glob.glob(os.path.join(ROOT, 'assets/ui', d, '*.png'))):
        ui[d + '/' + os.path.basename(f)[:-4]] = 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode()
en = {os.path.basename(f)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob(os.path.join(ROOT, 'assets/enemies/*.png')))}
open(os.path.join(ROOT, 'dist/ui-inline.js'), 'w').write('window.__UI = ' + json.dumps(ui) + ';\nwindow.__EN = ' + json.dumps(en) + ';')
print('內嵌怪物圖', len(en))
fx = {os.path.basename(f)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob(os.path.join(ROOT, 'assets/fx/*.png')))}
open(os.path.join(ROOT, 'dist/fx-inline.js'), 'w').write('window.__FX = ' + json.dumps(fx) + ';')
print('內嵌特效圖', len(fx))
print('內嵌圖示', len(ui))

# 場景貼圖：每個主題打包成一個 JSON（dist/map/<主題>.json），進關卡才抓
os.makedirs(os.path.join(ROOT, 'dist/map'), exist_ok=True)
for d in sorted(glob.glob(os.path.join(ROOT, 'assets/map/*/'))):
    th = os.path.basename(d.rstrip('/'))
    pk = {os.path.basename(f)[:-4]: 'data:image/png;base64,' + base64.b64encode(open(f, 'rb').read()).decode() for f in sorted(glob.glob(d + '*.png'))}
    open(os.path.join(ROOT, 'dist/map', th + '.json'), 'w').write(json.dumps(pk))
print('場景包', len(glob.glob(os.path.join(ROOT, 'dist/map/*.json'))))

# 獨立造型：每款打包成一個 JSON（dist/skin/<造型>.json，內含 22 隻角色，轉成 WebP 縮小體積），商城或進場用到才抓
from PIL import Image
import io
SKIN_IDS = re.findall(r"\{ id: '([a-z0-9]+)'", open(os.path.join(ROOT, 'src/data/skins.js')).read())
SKIN_IDS = ['ice', 'fire', 'poison', 'gold', 'wind', 'earth', 'thunder'] + SKIN_IDS      # 屬性套裝也一起打包（原本是 154 張獨立 PNG，佔掉測試頁一半容量）
os.makedirs(os.path.join(ROOT, 'dist/skin'), exist_ok=True); n = 0
for sk in SKIN_IDS:
    fs = sorted(glob.glob(os.path.join(ROOT, 'assets/sprites', '*_' + sk + '.png')))
    if not fs: continue
    out = os.path.join(ROOT, 'dist/skin', sk + '.json')
    if os.path.exists(out) and os.path.getmtime(out) > max(os.path.getmtime(f) for f in fs): n += 1; continue
    pk = {}
    for f in fs:
        b = io.BytesIO(); Image.open(f).save(b, 'WEBP', quality=90, method=4)
        pk[os.path.basename(f)[:-4]] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    open(out, 'w').write(json.dumps(pk)); n += 1
print('造型包', n)
