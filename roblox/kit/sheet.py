"""sheet.py <list.json> <prefix>: tile [file, label] frames into contact sheets (6 x 2 per sheet, labels burned in)."""
import json, sys
from PIL import Image, ImageDraw, ImageFont
items, pre = json.load(open(sys.argv[1])), sys.argv[2]
F = ImageFont.load_default(size=22); cw, ch, cols, rows = 270, 480, 6, 2
for k in range(0, len(items), cols * rows):
    S = Image.new("RGB", (cols * cw, rows * ch), "white"); d = ImageDraw.Draw(S)
    for i, (f, lab) in enumerate(items[k:k + cols * rows]):
        x, y = (i % cols) * cw, (i // cols) * ch
        S.paste(Image.open(f).convert("RGB").resize((cw - 4, ch - 4)), (x + 2, y + 2))
        d.rectangle([x + 2, y + 2, x + 8 + 11 * len(lab), y + 28], fill="black"); d.text((x + 6, y + 3), lab, fill="white", font=F)
    S.save(f"{pre}_{k // (cols * rows):02d}.jpg", quality=86)
print(f"{len(items)} frames -> {(len(items) + cols * rows - 1) // (cols * rows)} sheets")
