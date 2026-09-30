#!/usr/bin/env python3
"""
TSM Phoenix Frame — White Background Removal
Inputs:  "frames copy/frame_0001.webp" … "frames copy/frame_0121.webp"
Outputs: "frames/frame_0001.png" … "frames/frame_0121.png"  (RGBA, transparent bg)

Install deps first if needed:
    pip3 install Pillow numpy
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install Pillow numpy")
    from PIL import Image
    import numpy as np

SRC_DIR = Path("frames copy")
OUT_DIR = Path("frames")
OUT_DIR.mkdir(exist_ok=True)

# ── Tuning ────────────────────────────────────────────────────────────────────
WHITE_HARD  = 238   # pixels with ALL channels above this → fully transparent
WHITE_SOFT  = 210   # pixels between SOFT and HARD → partial alpha (edge feather)
# ─────────────────────────────────────────────────────────────────────────────


def remove_white_bg(img: Image.Image) -> Image.Image:
    """Return a copy of img with white/near-white pixels made transparent."""
    rgba = img.convert("RGBA")
    arr  = np.array(rgba, dtype=np.float32)

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Per-pixel minimum channel value (shadows are dark in at least one channel)
    min_ch = np.minimum(np.minimum(r, g), b)

    # Build alpha channel
    alpha = np.ones(min_ch.shape, dtype=np.float32) * 255.0

    # Hard zone → transparent
    hard_mask = min_ch >= WHITE_HARD
    alpha[hard_mask] = 0.0

    # Soft zone → linear fade  (WHITE_SOFT .. WHITE_HARD)
    soft_mask = (min_ch >= WHITE_SOFT) & (~hard_mask)
    alpha[soft_mask] = (
        255.0 * (1.0 - (min_ch[soft_mask] - WHITE_SOFT) / (WHITE_HARD - WHITE_SOFT))
    )

    arr[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))  # 4-channel array → RGBA automatically


def main():
    # Collect source files — prefer .webp, fall back to .png
    webp_files = sorted(SRC_DIR.glob("frame_*.webp"))
    png_files  = sorted(SRC_DIR.glob("frame_*.png"))

    # Build a dict: stem → path  (webp takes priority over png)
    sources: dict[str, Path] = {}
    for p in png_files:
        sources[p.stem] = p
    for p in webp_files:
        sources[p.stem] = p          # webp overwrites png if both exist

    if not sources:
        print(f"ERROR: No frame_*.webp / frame_*.png files found in '{SRC_DIR}'")
        sys.exit(1)

    total = len(sources)
    print(f"Found {total} frames in '{SRC_DIR}' — writing transparent PNGs to '{OUT_DIR}/'")

    for i, (stem, src_path) in enumerate(sorted(sources.items()), 1):
        out_path = OUT_DIR / f"{stem}.png"

        # Skip if already processed (re-run safety)
        if out_path.exists() and out_path.stat().st_size > 0:
            if i % 20 == 0 or i == total:
                print(f"  [{i}/{total}] skipped (already exists): {out_path.name}")
            continue

        img    = Image.open(src_path)
        result = remove_white_bg(img)
        result.save(out_path, "PNG", optimize=False)

        if i % 10 == 0 or i == total:
            print(f"  [{i}/{total}] {src_path.name} → {out_path.name}")

    print(f"\nDone! {total} transparent PNGs in '{OUT_DIR}/'")
    print("Tip: open frames/frame_0060.png to verify — phoenix should appear")
    print("     on a transparent (checkerboard) background.\n")


if __name__ == "__main__":
    # Must run from the project root (where 'frames copy/' lives)
    if not SRC_DIR.exists():
        print(f"ERROR: Cannot find '{SRC_DIR}'. Run this script from the TSM Website folder.")
        sys.exit(1)
    main()
