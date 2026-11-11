#!/usr/bin/env python3
"""把 AI 生成的動作圖表（走路 4 格、攻擊 4 格）整理成遊戲用的等寬圖集。
用法：python3 tools/build_sprites.py <來源資料夾>
來源檔名：<角色id>_walk.png、<角色id>_attack.png（一列 4 格、透明背景）
輸出：assets/sprites/<id>_walk.png、<id>_attack.png 與 src/data/sprites.js
每一格會以「腳底中央」對齊，並把攻擊圖表的角色大小校正成和走路一致。"""
import sys, os, json, glob
import numpy as np
from PIL import Image

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'sprites')
TARGET = 250          # 圖集內角色身高（像素）
N = 4

def load(path):
    a = np.array(Image.open(path).convert('RGBA'))
    a[a[..., 3] < 40] = 0
    return a

def split(a):
    """依透明的直行空隙切成 4 格；切不出來就等分。"""
    occ = (a[..., 3] > 128).sum(axis=0) > 2
    runs, s = [], None
    for x, o in enumerate(occ):
        if o and s is None: s = x
        if not o and s is not None: runs.append([s, x]); s = None
    if s is not None: runs.append([s, len(occ)])
    # 合併太小的碎片到最近的大區塊
    big = [r for r in runs if r[1] - r[0] > a.shape[1] * 0.06]
    if len(big) == N:
        for r in runs:
            if r in big: continue
            c = (r[0] + r[1]) / 2
            b = min(big, key=lambda q: min(abs(q[0] - c), abs(q[1] - c)))
            b[0] = min(b[0], r[0]); b[1] = max(b[1], r[1])
        return [(b[0], b[1]) for b in big], True
    w = a.shape[1] // N
    return [(i * w, (i + 1) * w) for i in range(N)], False

def frames(a):
    cells, clean = split(a)
    out = []
    for x0, x1 in cells:
        c = a[:, x0:x1]
        m = c[..., 3] > 128
        ys, xs = np.where(m)
        c = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        m = c[..., 3] > 128
        h = c.shape[0]
        low = m[int(h * 0.82):]                     # 腳的位置：最下面 18% 的水平重心
        cols = np.where(low.any(axis=0))[0]
        ax = float(cols.mean()) if len(cols) else c.shape[1] / 2
        out.append((c, ax, h))
    return out, clean

def atlas(fr, scale):
    ims = []
    for c, ax, h in fr:
        im = Image.fromarray(c)
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        ims.append((im, ax * scale))
    half = max(max(ax, im.width - ax) for im, ax in ims)
    cw = int(half * 2 + 6); ch = max(im.height for im, _ in ims) + 4
    sheet = Image.new('RGBA', (cw * N, ch), (0, 0, 0, 0))
    for i, (im, ax) in enumerate(ims):
        sheet.alpha_composite(im, (round(i * cw + cw / 2 - ax), ch - 2 - im.height))
    return sheet, cw, ch

manifest = {}
for wp in sorted(glob.glob(os.path.join(SRC, '*_walk.png'))):
    cid = os.path.basename(wp)[:-9]
    ap = os.path.join(SRC, cid + '_attack.png')
    if not os.path.exists(ap): print('缺攻擊圖表', cid); continue
    wf, wc = frames(load(wp)); af, ac = frames(load(ap))
    walk_h = float(np.median([h for _, _, h in wf]))
    ready_h = af[-1][2]                              # 攻擊最後一格是預備姿勢，拿來對齊大小
    ws = TARGET / walk_h
    ratio = min(1.3, max(0.8, walk_h / ready_h))
    wsheet, wcw, wch = atlas(wf, ws); asheet, acw, ach = atlas(af, ws * ratio)
    wsheet.save(os.path.join(OUT, cid + '_walk.png'), optimize=True); asheet.save(os.path.join(OUT, cid + '_attack.png'), optimize=True)
    manifest[cid] = {'px': TARGET, 'walk': [wcw, wch], 'attack': [acw, ach]}
    print(f'{cid:12s} walk {wsheet.size} attack {asheet.size} 校正 x{ratio:.2f} 切格 {"空隙" if wc else "等分"}/{"空隙" if ac else "等分"}')

with open(os.path.join(ROOT, 'src', 'data', 'sprites.js'), 'w') as f:
    f.write('// 由 tools/build_sprites.py 產生，請勿手改。px = 圖集內角色身高；walk / attack = [單格寬, 高]\n')
    f.write('export const SPRITE_SHEETS = ' + json.dumps(manifest, indent=1) + ';\n')
print('角色數', len(manifest))
