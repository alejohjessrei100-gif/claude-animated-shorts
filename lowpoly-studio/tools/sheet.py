"""Joins out/SLUG/stills/*.png into one contact sheet at out/SLUG/sheet.png, so a whole video can be inspected at a glance.

  python tools/sheet.py SLUG
"""
import sys
from pathlib import Path

from PIL import Image

slug = sys.argv[1]
files = sorted((Path("out") / slug / "stills").glob("*.png"))
if not files:
    sys.exit("No stills found. Run tools/stills.mjs first.")
first = Image.open(files[0])
per_row = 8
w = 270 if first.height > first.width else 400
h = round(w * first.height / first.width)
rows = (len(files) + per_row - 1) // per_row
sheet = Image.new("RGB", (w * min(per_row, len(files)), h * rows))
for i, f in enumerate(files):
    sheet.paste(Image.open(f).convert("RGB").resize((w, h), Image.NEAREST), (i % per_row * w, i // per_row * h))
out = Path("out") / slug / "sheet.png"
sheet.save(out)
print(out)
