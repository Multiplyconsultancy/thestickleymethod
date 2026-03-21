#!/usr/bin/env python3
"""
process_globe.py
Extract frames from 'globe spinning.gif', strip black/near-black pixels,
save as transparent PNGs in globe-frames/
"""
import os
from PIL import Image
import numpy as np

INPUT      = 'globe spinning.gif'
OUTPUT_DIR = 'globe-frames'
DARK_HARD  = 50   # pixels with brightness < 50  → fully transparent
DARK_SOFT  = 90   # pixels with brightness 50–90 → linear fade-in

os.makedirs(OUTPUT_DIR, exist_ok=True)

img = Image.open(INPUT)
n = 0

try:
    while True:
        frame = img.copy().convert('RGBA')
        arr = np.array(frame, dtype=np.int32)

        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        brightness = (r + g + b) // 3

        alpha = np.where(
            brightness < DARK_HARD,
            0,
            np.where(
                brightness < DARK_SOFT,
                ((brightness - DARK_HARD) * 255 // (DARK_SOFT - DARK_HARD)),
                255
            )
        ).astype(np.uint8)

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
