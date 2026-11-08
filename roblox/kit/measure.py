"""Phase 1 metrics from YouTube auto-captions (json3 word timings) + info.json.
Usage: python3 kit/measure.py <list.tsv> <caption_dir> <out.md>
Video/audio could not be downloaded from this container (googlevideo blocked), so shots / music key / LUFS are not measured;
pauses are estimated from caption word start times (auto-captions give starts, not ends)."""
import json, os, re, statistics, sys

lst, cdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
rows = [l.rstrip("\n").split("\t", 3) for l in open(lst) if l.strip()]
allv = sorted([(int(r[0]) if r[0].isdigit() else 0, r[2], r[3]) for r in rows], reverse=True)


def words_of(path):
    d = json.load(open(path))
    ws = []
    for e in d.get("events", []):
        for s in e.get("segs", []) or []:
            t = s.get("utf8", "").strip()
            if not t or t.startswith("[") and t.endswith("]"):
                continue
            for k, part in enumerate(t.split()):
                ws.append(((e["tStartMs"] + s.get("tOffsetMs", 0)) / 1000 + 0.01 * k, part))
    return ws


def bar(v, vmax, w=40):
    return "#" * max(1, round(w * v / vmax))


lines = ["# @kalemod: format measurements", ""]
views = [x[0] for x in allv]
lines += [f"Shorts: **{len(allv)}**; total views **{sum(views)/1e6:.0f} M**; >=1 M: **{sum(v >= 1e6 for v in views)}**; "
          f">=10 M: **{sum(v >= 1e7 for v in views)}**; best **{max(views)/1e6:.1f} M**; median **{statistics.median(views)/1e6:.2f} M**", "",
          "View buckets:", "```"]
for lo, hi, name in [(1e7, 1e12, ">=10M"), (5e6, 1e7, "5-10M"), (1e6, 5e6, "1-5M"), (5e5, 1e6, "0.5-1M"), (1e5, 5e5, "100-500k"), (0, 1e5, "<100k")]:
    n = sum(lo <= v < hi for v in views)
    lines.append(f"{name:>9} {n:4d} {bar(n, len(views))}")
lines += ["```", ""]

hdr = "| title | dur s | views M | words | wpm | words 0-3 s | words 0-10 s | first word s | pauses >=0.3 s/min (est.) | pauses >=0.6 s (est.) | POV | opening | [music] tags |"
lines += ["## Top Shorts", "", hdr, "|" + "---|" * hdr.count("|")[:-1] if False else "|" + "|".join(["---"] * 13) + "|"]
agg = []
for v, vid, title in allv[:15]:
    cp, ip = os.path.join(cdir, f"{vid}.en-orig.json3"), os.path.join(cdir, f"{vid}.info.json")
    if not os.path.exists(cp):
        lines.append(f"| {title} | | {v/1e6:.1f} | (captions not fetched) |||||||||")
        continue
    info = json.load(open(ip)) if os.path.exists(ip) else {}
    dur = info.get("duration") or 0
    ws = words_of(cp)
    n = len(ws)
    t0, t1 = ws[0][0], ws[-1][0]
    span = max(1e-3, t1 - t0 + 0.35)
    wpm = n / span * 60
    md = span / n  # mean word slot
    gaps = [ws[i + 1][0] - ws[i][0] - md for i in range(n - 1)]
    p3, p6 = sum(g >= 0.3 for g in gaps), sum(g >= 0.6 for g in gaps)
    text = " ".join(w for _, w in ws)
    low = " " + text.lower() + " "
    fp = len(re.findall(r"\b(i|my|me|i'm|i've)\b", low)); tp = len(re.findall(r"\b(he|she|his|her|they)\b", low))
    pov = "1st" if fp > tp else "3rd"
    opening = " ".join(w for _, w in ws[:5])
    music = json.dumps(json.load(open(cp))).count("[music]") + json.dumps(json.load(open(cp))).count("[Music]")
    agg.append(dict(dur=dur, words=n, wpm=wpm, w3=sum(t < 3 for t, _ in ws), w10=sum(t < 10 for t, _ in ws), first=t0, p3=p3 / (span / 60), p6=p6, pov=pov))
    lines.append(f"| {title} | {dur} | {v/1e6:.1f} | {n} | {wpm:.0f} | {agg[-1]['w3']} | {agg[-1]['w10']} | {t0:.2f} | {p3/(span/60):.1f} | {p6} | {pov} | {opening} | {music} |")
    open(os.path.join(cdir, f"{vid}.txt"), "w").write(text + "\n")
if agg:
    med = lambda k: statistics.median(a[k] for a in agg)
    lines += ["", f"**Medians over {len(agg)} videos:** duration {med('dur'):.0f} s, {med('words'):.0f} words, {med('wpm'):.0f} wpm, "
              f"{med('w3'):.0f} words in the first 3 s, {med('w10'):.0f} in the first 10 s, first word at {med('first'):.2f} s, "
              f"~{med('p3'):.1f} pauses >=0.3 s per minute (est.), POV: {sum(a['pov'] == '3rd' for a in agg)}/{len(agg)} third person.",
              "", "Not measured (video/audio download blocked in this container): shots, median shot length, music key, LUFS."]
open(out, "w").write("\n".join(lines) + "\n")
print("\n".join(lines[-4:]))
