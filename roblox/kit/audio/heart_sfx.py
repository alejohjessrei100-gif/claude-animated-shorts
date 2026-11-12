"""heart_sfx.py: lub-dub heartbeat thumps for episode 06 (The Loud Heart), synced to the on-screen rings.
Usage: python3 kit/audio/heart_sfx.py <episode dir> <schedule.json>
schedule: [[word_from, word_to, bpm, gain, echo], ...] (word indices; echo 1 adds a delayed, darker repeat = off the cliffs).
Beats land on k * 60/bpm (lub) and +0.2 s (dub), exactly where ep.js spawns rings. Writes audio/heart.wav (stereo, SR)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, write_wav, lp
ep, sched = sys.argv[1], json.load(open(sys.argv[2]))
words = json.load(open(os.path.join(ep, "voice", "words.json")))
DUR = words[-1]["end"] + 0.45; N = int(DUR * SR); out = np.zeros(N)
def thump(g, dark=False):
    n = int(0.28 * SR); t = np.arange(n) / SR
    f = 62 * np.exp(-t * 6) + 40; ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * (16 if not dark else 9)) + 0.25 * np.sin(2 * ph) * np.exp(-t * 30)
    x[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return g * x
def put(t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if 0 <= i < N: out[i:j] += x[: j - i]
for w0, w1, bpm, g, echo in sched:
    t0 = words[w0]["start"]; t1 = words[w1]["start"] if w1 < len(words) else DUR
    per = 60 / bpm; k = int(np.ceil(t0 / per))
    while k * per < t1:
        tb = k * per
        put(tb, thump(g)); put(tb + 0.2, thump(0.7 * g))
        if echo: put(tb + 0.42, thump(0.32 * g, True)); put(tb + 0.62, thump(0.22 * g, True))
        k += 1
out = lp(out, 900)
st = np.stack([out, out]) * 0.9
write_wav(os.path.join(ep, "audio", "heart.wav"), st)
print(f"heart.wav {DUR:.2f} s, peak {np.abs(st).max():.2f}")
