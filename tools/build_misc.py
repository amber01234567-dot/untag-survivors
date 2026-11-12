#!/usr/bin/env python3
"""把 AI 生成的單張素材裁邊、縮小後放進 assets/。
用法：python3 tools/build_misc.py <種類> <來源資料夾>
種類：enemies（怪物 170px、首領 300px → assets/enemies）、fx（dev_* 機關 → assets/fx，240px）、icons（→ assets/ui/icons，128px 不去背）"""
import sys, os, glob
import numpy as np
from PIL import Image
kind, src = sys.argv[1], sys.argv[2]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOSS = {'golem', 'champ', 'warden', 'rig', 'wormqueen', 'colossus'}
out = os.path.join(ROOT, 'assets', {'enemies': 'enemies', 'fx': 'fx', 'icons': 'ui/icons'}[kind]); n = 0
for p in sorted(glob.glob(os.path.join(src, '*.png'))):
    k = os.path.basename(p)[:-4]; im = Image.open(p)
    if kind == 'icons':
        im.convert('RGB').resize((128, 128), Image.LANCZOS).save(os.path.join(out, k + '.png'), optimize=True); n += 1; continue
    if (kind == 'fx') != k.startswith('dev_'): continue
    a = np.array(im.convert('RGBA')); a[a[..., 3] < 40] = 0; ys, xs = np.where(a[..., 3] > 128)
    c = Image.fromarray(a).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)); s = (240 if kind == 'fx' else 300 if k in BOSS else 170) / max(c.size)
    c.resize((round(c.width * s), round(c.height * s)), Image.LANCZOS).save(os.path.join(out, k + '.png'), optimize=True); n += 1
print(kind, n)
