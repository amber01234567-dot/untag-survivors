#!/usr/bin/env python3
"""把 AI 生成的場景素材整理成遊戲用的大小。
用法：python3 tools/build_map.py <來源資料夾>   （底下每個主題一個子資料夾）
檔名：floor / wall / roof、p1a p1b p1c（1x1 障礙物）、p22 p21 p31 p12、d1..d4（地面貼花）、s1..s3（招牌）、lamp"""
import sys, os, glob
import numpy as np
from PIL import Image
SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = {'p1a': 200, 'p1b': 200, 'p1c': 200, 'p22': 300, 'p21': 300, 'p31': 400, 'p12': 240, 'd1': 140, 'd2': 240, 'd3': 150, 'd4': 200, 's1': 180, 's2': 180, 's3': 180, 'lamp': 90}
for d in sorted(glob.glob(os.path.join(SRC, '*/'))):
    theme = os.path.basename(d.rstrip('/')); out = os.path.join(ROOT, 'assets', 'map', theme); os.makedirs(out, exist_ok=True); n = 0
    for p in sorted(glob.glob(d + '*.png')):
        k = os.path.basename(p)[:-4]; im = Image.open(p)
        if k in ('floor', 'roof'):
            im = im.convert('RGB'); w, h = im.size; m = round(w * 0.01); im.crop((m, m, w - m, h - m)).resize((512, 512), Image.LANCZOS).save(os.path.join(out, k + '.png'))
        elif k == 'wall':
            im = im.convert('RGB'); w, h = im.size; m = round(h * 0.02); im.crop((m, m, w - m, h - m)).resize((768, 256), Image.LANCZOS).save(os.path.join(out, k + '.png'))
        elif k in SIZE:
            a = np.array(im.convert('RGBA')); a[a[..., 3] < 40] = 0; ys, xs = np.where(a[..., 3] > 128)
            c = Image.fromarray(a).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)); s = SIZE[k] / max(c.size)
            c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS).save(os.path.join(out, k + '.png'), optimize=True)
        else: continue
        n += 1
    print(theme, n)
