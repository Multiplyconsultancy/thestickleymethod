#!/usr/bin/env python3
"""
process_globe.py
Extract frames from 'globe spinning.gif', remove pure-black pixels only,
save as transparent PNGs in globe-frames/
"""
import os
from PIL import Image
import numpy as np

INPUT      = 'globe spinning.gif'
OUTPUT_DIR = 'globe-frames'
THRESHOLD  = 18   # pixels where R,G,B all < 18 → transparent (pure black only)

os.makedirs(OUTPUT_DIR, exist_ok=True)

img = Image.open(INPUT)
n = 0

try:
    while True:
        frame = img.copy().convert('RGBA')
        arr = np.array(frame, dtype=np.int32)

        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        brightness = (r + g + b) // 3

        # Hard cutoff: only pure black becomes transparent
        alpha = np.where(brightness < THRESHOLD, 0, 255).astype(np.uint8)

        out = arr.copy().astype(np.uint8)
        out[:, :, 3] = alpha

        out_frame = Image.fromarray(out, 'RGBA')
        out_path = os.path.join(OUTPUT_DIR, f'globe_{n:04d}.png')
        out_frame.save(out_path)
        n += 1
        img.seek(img.tell() + 1)
except EOFError:
    pass

print(f'✓ {n} frames → {OUTPUT_DIR}/')
