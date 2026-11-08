"""music_make.py: the skill's audio recipe for one episode: ONE original music bed (a loop written at a slow tempo and sped
up ~1.35x, as the measured format does) about 12 dB under the voice, ONE sound accent on the key word, then the final mix.
Usage: python3 kit/audio/music_make.py <episode dir> [--accent-word flooded] [--bed-db -12]
Reads voice/voice.wav + voice/words.json; writes audio/music.wav, audio/accent.wav, audio/mix.wav (+ cues.md)."""
import argparse, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dsp import SR, ns, rng, lp, hp, bp, colored, place, st, pan, make_ir, convolve_st, integrated, true_peak, dbg, read_wav, write_wav, fades, curve
import instruments as I

ap = argparse.ArgumentParser(); ap.add_argument("ep"); ap.add_argument("--accent-word", default="flooded"); ap.add_argument("--bed-db", type=float, default=-12.0)
ap.add_argument("--speedup", type=float, default=1.35)
a = ap.parse_args()
words = json.load(open(os.path.join(a.ep, "voice", "words.json")))
DUR = words[-1]["end"] + 0.45
N = ns(DUR)
R = rng(2026)
m2f = I.m2f

# ---------------------------------------------------------------- the bed: A minor, Am F C G, written at 92 bpm, sped x1.35
BPM0 = 92.0
q = 60 / BPM0 / a.speedup  # quarter note in output seconds
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]  # Am F C G (root, triad)
mel = [76, 74, 72, 71, 72, 0, 69, 0, 72, 71, 69, 67, 69, 0, 0, 0]  # an original 2-bar hook, eighths


def bed():
    M = np.zeros((2, N))
    bars = int(DUR / (4 * q)) + 2
    lift = next((w["start"] for w in words if w["word"].lower().strip(".,") == "untied"), DUR * 0.77)  # the climax lifts
    for b in range(bars):
        t0 = b * 4 * q
        root, tri = prog[b % 4]
        hi = t0 >= lift - 0.05
        place(M, I.pad([m2f(n) for n in tri], 4 * q, 0.55 if hi else 0.4, R, 0.25, 0.5, warm=1300 if hi else 900), t0, 0.5)
        place(M, pan(I.pluck(m2f(root - 12), 0.8, R, 4 * q * 0.95, 0.35), -0.15), t0, 0.32)
        for k in range(8):  # eighth-note arpeggio
            n = tri[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12
            place(M, pan(I.pluck(m2f(n), 0.55, R, 0.7, 0.55), 0.25 if k % 2 else -0.05), t0 + k * q / 2, 0.15)
        if b >= 2:  # the hook comes in on bar 3 (music box), an octave up at the climax
            for k in range(8):
                n = mel[(b % 2) * 8 + k]
                if n: place(M, pan(I.musicbox(m2f(n + (12 if hi else 0)), 0.5, R, 1.2), 0.2), t0 + k * q / 2, 0.09 if not hi else 0.11)
    # end: everything rings out on A major (the hopeful last line)
    end = words[-4]["start"]
    M *= curve(N, [(0, 1), (end - 0.2, 1), (end + 0.3, 0.25), (DUR, 0.25)])[None, :]
    place(M, I.pad([m2f(57), m2f(61), m2f(64), m2f(69)], DUR - end + 0.4, 0.6, R, 0.2, 0.4, warm=1400), end, 0.6)
    place(M, pan(I.musicbox(m2f(81), 0.6, R, 2.0), 0.2), words[-1]["start"], 0.14)
    ir = make_ir(1.2, 9)
    return M + 0.25 * convolve_st(M, ir)[:, :N]


def accent(word):
    """one thunder hit on the key word"""
    S = np.zeros((2, N))
    w = next((x for x in words if x["word"].lower().strip(".,!?") == word), None)
    if not w: return S, None
    n = ns(2.6); t = np.arange(n) / SR
    crack = bp(colored(n, R, 0.6), 600, 5000) * np.exp(-t / 0.05) * 0.6
    rumble = lp(colored(n, R, 1.8), 160) * (1 - np.exp(-t / 0.05)) * np.exp(-t / 0.9) * 2.0
    place(S, st(crack + rumble), w["start"] - 0.05, 1.0)
    return S, w["start"]


v, sr = read_wav(os.path.join(a.ep, "voice", "voice.wav"))
assert sr == SR, sr
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
Lv = integrated(v)
M = bed(); S, at = accent(a.accent_word)
M = M * dbg((Lv + a.bed_db) - integrated(M))
if at is not None: S = S * dbg((Lv - 2) - integrated(S[:, ns(at):ns(at + 1.5)]))
mix0 = v + M + S
G = -14.0 - integrated(mix0)
y = mix0 * dbg(G)
pk = np.abs(y).max()
if pk > dbg(-1.5): y = np.tanh(y / dbg(-1.5)) * dbg(-1.5)  # gentle soft clip on rare peaks
tp = true_peak(y)
if tp > -1.05: y *= dbg(-1.1 - tp)
y = fades(y, 0.0, 0.05)
od = os.path.join(a.ep, "audio"); os.makedirs(od, exist_ok=True)
write_wav(os.path.join(od, "mix.wav"), y); write_wav(os.path.join(od, "music.wav"), M * dbg(G)); write_wav(os.path.join(od, "accent.wav"), S * dbg(G))
rows = [f"- mix {integrated(y):.1f} LUFS, true peak {true_peak(y):.1f} dBTP, {y.shape[1] / SR:.3f} s",
        f"- voice {integrated(v * dbg(G)):.1f} LUFS, music bed {integrated(M * dbg(G)):.1f} LUFS ({a.bed_db:+.0f} dB under the voice), accent '{a.accent_word}' at {at}"]
open(os.path.join(od, "cues.md"), "w").write("\n".join(rows) + "\n"); print("\n".join(rows))
