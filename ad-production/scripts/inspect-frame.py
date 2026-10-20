#!/usr/bin/env python3
"""Report the bounding box of dark (product) pixels in a rendered frame.

Used during art direction to verify that the widget stays inside the safe
area and never bleeds off the frame unintentionally.
"""
import sys
from PIL import Image

for path in sys.argv[1:]:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    minx, maxx, miny, maxy = 10**9, -1, 10**9, -1
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            if r < 70 and g < 70 and b < 70:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    print(f"{path}: {w}x{h} dark-bbox x[{minx},{maxx}] y[{miny},{maxy}]")
