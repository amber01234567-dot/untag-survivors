#!/usr/bin/env python3
"""產生單人測試頁 dist/play.html（index.html + 內嵌 CSS，開啟測試模式）。用法：python3 tools/build_play.py"""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, 'index.html')).read(); css = open(os.path.join(ROOT, 'css/style.css')).read().replace('url(../assets/', 'url(assets/')
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
body = re.sub(r'<script src="vendor/peerjs[^"]*"></script>\n?', '', body).replace('<script type="module" src="src/main.js"></script>', '<script>window.__TEST = true;</script>\n<script src="ui-inline.js"></script>\n<script type="module" src="src/main.js"></script>')
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
print('內嵌圖示', len(ui))
