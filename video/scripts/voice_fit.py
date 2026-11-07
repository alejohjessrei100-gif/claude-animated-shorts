"""Fit a narration to the short's length and make words.json, fully offline.
1. Force-aligns the known script (voice.txt) to the recording with PocketSphinx (pip install pocketsphinx).
2. Shortens every pause between words to GAP_AFTER + GAP_BEFORE (cuts land in silence, 5 ms fades).
3. Speeds the result up with ffmpeg atempo (pitch kept) to --target seconds, if it is longer.
4. Writes voice.wav (48 kHz mono, -16 LUFS) + words.json [{word,start,end}] in output time.
Usage: python3 voice_fit.py <recording> <voice.txt> <outdir> [--target 29.0]"""
import json, re, subprocess, sys, wave, tempfile, os
import numpy as np
from pocketsphinx import Decoder

GAP_AFTER, GAP_BEFORE, LEAD, TAIL = 0.08, 0.06, 0.05, 0.30
SPOKEN = {"1983": "nineteen eighty three", "1995": "nineteen ninety five", "1943": "nineteen forty three", "forty-one": "forty one",
          "schoolkids": "school kids", "metres": "meters"}  # digits must be spelled out; extend per script

rec, txt, out = sys.argv[1:4]
target = float(sys.argv[sys.argv.index("--target") + 1]) if "--target" in sys.argv else 29.0
tmp = tempfile.mkdtemp()
w16, w48, cut = (os.path.join(tmp, n) for n in ("v16.wav", "v48.wav", "cut.wav"))
ff = lambda *a: subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], check=True)
ff("-i", rec, "-ar", "16000", "-ac", "1", w16)
ff("-i", rec, "-ar", "48000", "-ac", "1", w48)

# ---- 1. forced alignment of the known script ----
orig = re.findall(r"[A-Za-z0-9'\-]+", open(txt).read())
norm, owner = [], []
for i, w in enumerate(orig):
    # spelled-out forms first, then hyphenated words split into their parts (butter-side -> butter side)
    for p in SPOKEN.get(w.lower(), w.lower().strip("'").replace("-", " ")).split():
        norm.append(p); owner.append(i)
d = Decoder(bestpath=False)
PRON = {"ig": "IH G", "pecks": "P EH K S"}  # words missing from the dictionary, as CMU phones; extend per script
for wd in sorted(set(norm)):
    if d.lookup_word(wd) is None and wd in PRON:
        d.add_word(wd, PRON[wd], True); continue
    if d.lookup_word(wd) is None:  # e.g. "unluckily" = "un" + known stem
        stem = wd[2:] if wd.startswith("un") else ""
        if stem and d.lookup_word(stem): d.add_word(wd, "AH N " + d.lookup_word(stem), True)
        else: sys.exit(f"word not in the dictionary: {wd} (spell it out in SPOKEN)")
d.set_align_text(" ".join(norm))
with wave.open(w16) as f: pcm = f.readframes(f.getnframes())
for _ in range(2):  # pass 1 decodes, pass 2 (after set_alignment) gives the word segmentation
    d.start_utt(); d.process_raw(pcm, full_utt=True); d.end_utt(); d.set_alignment()
segs = [(s.name.split("(")[0], s.start / 100, (s.start + s.duration) / 100) for s in d.get_alignment()]
segs = [s for s in segs if s[0] not in ("<sil>", "<s>", "</s>", "(NULL)")]
assert [s[0] for s in segs] == norm, "alignment does not match the script"
words = []  # [word, start, end] in recording time, spoken parts merged back
for (_, s, e), i in zip(segs, owner):
    if words and words[-1][3] == i: words[-1][2] = e
    else: words.append([orig[i], s, e, i])

# ---- 2. keep intervals: every pause longer than GAP_AFTER+GAP_BEFORE is cut down to that ----
with wave.open(w48) as f:
    sr = f.getframerate(); x = np.frombuffer(f.readframes(f.getnframes()), np.int16).astype(np.float32)
dur = len(x) / sr
def sound_end(t0, t_max):
    """the aligner can end a word early (a trailing "s", a question lift): keep going in 10 ms steps until the
    level falls below -42 dBFS, so a cut never clips a word's tail"""
    t = t0
    while t < t_max:
        seg = x[int(t * sr):int((t + 0.01) * sr)] / 32768.0
        if seg.size == 0 or 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12) < -42: break
        t += 0.01
    return t
def sound_start(t1, t_min):
    """and a word can start before its aligned onset: walk back until the level falls below -42 dBFS"""
    t = t1
    while t > t_min:
        seg = x[int((t - 0.01) * sr):int(t * sr)] / 32768.0
        if seg.size == 0 or 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12) < -42: break
        t -= 0.01
    return t
keep, a = [], max(0.0, words[0][1] - GAP_BEFORE)
for cur, nxt in zip(words, words[1:]):
    e = sound_end(cur[2], nxt[1])
    s0 = sound_start(nxt[1], e)
    if s0 - e > GAP_AFTER + GAP_BEFORE:
        keep.append((a, e + GAP_AFTER)); a = s0 - GAP_BEFORE
        nxt[1] = s0  # the next word's timing starts where its sound does
keep.append((a, min(words[-1][2] + TAIL, dur)))
fade = int(0.005 * sr); parts = [np.zeros(int(LEAD * sr), np.float32)]; offs = []; t = LEAD
for a, b in keep:
    seg = x[int(a * sr):int(b * sr)].copy()
    seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
    offs.append((a, b, t)); parts.append(seg); t += len(seg) / sr
y = np.concatenate(parts)
def remap(tt):
    for a, b, o in offs:
        if a - 1e-6 <= tt <= b + 1e-6: return o + (tt - a)
    raise ValueError(tt)
with wave.open(cut, "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes(np.clip(y, -32768, 32767).astype(np.int16).tobytes())
cut_len = len(y) / sr

# ---- 3. speed up to the target length (pitch kept), 4. loudness ----
speed = max(1.0, cut_len / target)
os.makedirs(out, exist_ok=True)
ff("-i", cut, "-af", f"atempo={speed:.4f},loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", "48000", "-ac", "1", os.path.join(out, "voice.wav"))
res = [{"word": w, "start": round(remap(s) / speed, 3), "end": round(remap(e) / speed, 3)} for w, s, e, _ in words]
json.dump(res, open(os.path.join(out, "words.json"), "w"), indent=1)
print(f"recording {dur:.2f}s -> pauses cut {cut_len:.2f}s -> x{speed:.3f} -> {cut_len/speed:.2f}s, "
      f"{len(res)} words, {len(res)/(cut_len/speed):.2f} words/s, {len(keep)-1} pauses shortened")
