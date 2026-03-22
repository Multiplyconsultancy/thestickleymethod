"""
Crop and rotate transformation photos as specified.
Run from the TSM Website root directory.
"""
from PIL import Image
import os

base = "transformation"

def load(path):
    return Image.open(path).convert("RGB")

def save(img, path, ext=None):
    if ext is None:
        ext = os.path.splitext(path)[1].lower()
    fmt = "JPEG" if ext in (".jpg", ".jpeg") else "PNG"
    img.save(path, fmt, quality=92)
    print(f"  saved {path}  {img.size}")

def crop_pct(img, top=0, bottom=0, left=0, right=0):
    """Remove fractions from each edge."""
    w, h = img.size
    x1 = int(w * left)
    y1 = int(h * top)
    x2 = int(w * (1 - right))
    y2 = int(h * (1 - bottom))
    return img.crop((x1, y1, x2, y2))

# ── OVERALL ────────────────────────────────────────────────────────────────

print("Overall set1-after: crop top 5%, bottom 10%")
img = load(f"{base}/overall/set1-after.png")
img = crop_pct(img, top=0.05, bottom=0.10)
save(img, f"{base}/overall/set1-after.png")

print("Overall set3-after: crop bottom to match set3-before aspect ratio")
before3 = load(f"{base}/overall/set3-before.jpg")
after3  = load(f"{base}/overall/set3-after.jpg")
bw, bh = before3.size
aw, ah = after3.size
# Target displayed height = same as before when both at same display width
# displayed_h = display_w * (img_h / img_w)  →  after_h/after_w = before_h/before_w
target_h = int(aw * bh / bw)
if target_h < ah:
    after3 = after3.crop((0, 0, aw, target_h))
save(after3, f"{base}/overall/set3-after.jpg")

print("Overall set7-after: rotate 90° clockwise")
img = load(f"{base}/overall/set7-after.png")
img = img.rotate(-90, expand=True)   # negative angle = clockwise
save(img, f"{base}/overall/set7-after.png")

# ── JAWLINE ────────────────────────────────────────────────────────────────

print("Jaw set1 + set2: crop bottom 15%")
for s in ["set1", "set2"]:
    for side in ["before", "after"]:
        img = load(f"{base}/jaw/{s}-{side}.png")
        img = crop_pct(img, bottom=0.15)
        save(img, f"{base}/jaw/{s}-{side}.png")

print("Jaw set4-before: crop bottom 20%")
img = load(f"{base}/jaw/set4-before.png")
img = crop_pct(img, bottom=0.20)
save(img, f"{base}/jaw/set4-before.png")

# ── SKIN ───────────────────────────────────────────────────────────────────

print("Skin set1-before: crop top 10%, bottom 15%")
img = load(f"{base}/skin/set1-before.jpg")
img = crop_pct(img, top=0.10, bottom=0.15)
save(img, f"{base}/skin/set1-before.jpg")

print("Skin set1-after: crop top 10%, bottom 15%")
img = load(f"{base}/skin/set1-after.jpg")
img = crop_pct(img, top=0.10, bottom=0.15)
save(img, f"{base}/skin/set1-after.jpg")

print("Skin set2-before: crop top 20%, bottom 20%")
img = load(f"{base}/skin/set2-before.png")
img = crop_pct(img, top=0.20, bottom=0.20)
save(img, f"{base}/skin/set2-before.png")

print("Skin set2-after: crop bottom 10%")
img = load(f"{base}/skin/set2-after.png")
img = crop_pct(img, bottom=0.10)
save(img, f"{base}/skin/set2-after.png")

# ── PHYSIQUE ───────────────────────────────────────────────────────────────

print("Physique set1-after: crop bottom to match set1-before height")
before_p1 = load(f"{base}/physique/set1-before.jpg")
after_p1  = load(f"{base}/physique/set1-after.jpg")
bw, bh = before_p1.size
aw, ah = after_p1.size
target_h = int(aw * bh / bw)
if target_h < ah:
    after_p1 = after_p1.crop((0, 0, aw, target_h))
save(after_p1, f"{base}/physique/set1-after.jpg")

print("Physique set3-before: crop top 10%, bottom 10%")
img = load(f"{base}/physique/set3-before.png")
img = crop_pct(img, top=0.10, bottom=0.10)
save(img, f"{base}/physique/set3-before.png")

print("Physique set3-after: crop top 10%, bottom 10%")
img = load(f"{base}/physique/set3-after.png")
img = crop_pct(img, top=0.10, bottom=0.10)
save(img, f"{base}/physique/set3-after.png")

print("\nAll done.")
