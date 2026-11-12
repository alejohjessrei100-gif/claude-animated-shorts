"""Original background music, generated from code. A mood + a root note + a duration gives a stereo cue."""
import numpy as np
from scipy import signal

SR = 44100
SCALES = {"major": [0, 2, 4, 5, 7, 9, 11], "lydian": [0, 2, 4, 6, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "phrygian": [0, 1, 3, 5, 7, 8, 10], "dorian": [0, 2, 3, 5, 7, 9, 10]}
ROOTS = {"C": 48, "C#": 49, "D": 50, "D#": 51, "E": 52, "F": 53, "F#": 54, "G": 55, "G#": 56, "A": 45, "A#": 46, "B": 47}
MOODS = {
    "wonder": dict(bpm=72, scale="lydian", prog=[0, 5, 3, 4], bars=2, layers=("pad", "bell", "bass")),
    "calm": dict(bpm=66, scale="major", prog=[0, 3, 5, 3], bars=2, layers=("pad", "keys", "bass")),
    "melancholy": dict(bpm=64, scale="minor", prog=[0, 5, 2, 6], bars=2, layers=("pad", "keys", "bass")),
    "uneasy": dict(bpm=60, scale="phrygian", prog=[0, 1, 0, 3], bars=2, layers=("detune", "wrongbell", "sub")),
    "dread": dict(bpm=48, scale="phrygian", prog=[0, 1, 0, 1], bars=4, layers=("drone", "swell", "heart")),
    "tense": dict(bpm=96, scale="minor", prog=[0, 5, 0, 1], bars=1, layers=("detune", "pulse", "sub")),
    "playful": dict(bpm=118, scale="major", prog=[0, 3, 4, 0], bars=1, layers=("pluckbass", "marimba", "kit")),
    "heroic": dict(bpm=84, scale="major", prog=[0, 4, 5, 3], bars=2, layers=("brass", "bass", "timp")),
    "mystery": dict(bpm=70, scale="dorian", prog=[0, 6, 3, 0], bars=2, layers=("pad", "wrongbell", "bass")),
}


def lp(x, fc):
    b, a = signal.butter(1, min(fc, SR * .45) / (SR / 2))
    return signal.lfilter(b, a, x)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def saw(f, t):
    return 2 * (t * f % 1) - 1


def tri(f, t):
    return 2 * np.abs(2 * (t * f % 1) - 1) - 1


def adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(int(a * SR), n), min(int(r * SR), n)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


class Bus:
    def __init__(self, n):
        self.L, self.R = np.zeros(n), np.zeros(n)

    def put(self, y, at, pan=0.0, gain=1.0):
        at = int(at)
        if at >= len(self.L):
            return
        y = y[:len(self.L) - at] * gain
        self.L[at:at + len(y)] += y * (1 - pan) * .7
        self.R[at:at + len(y)] += y * (1 + pan) * .7


def chord(scale, deg, root, count=3):
    s = SCALES[scale]
    return [root + s[(deg + 2 * i) % 7] + 12 * ((deg + 2 * i) // 7) for i in range(count)]


def t_of(n):
    return np.arange(n) / SR


def pad(b, notes, at, n, bright, detune=.003, gain=.15):
    t = t_of(n)
    for k, m in enumerate(notes):
        f = hz(m)
        y = saw(f * (1 - detune), t) + saw(f * (1 + detune), t + .01)
        b.put(lp(y, bright) * adsr(n, .7, .9), at, pan=(k - 1) * .45, gain=gain)


def bell(b, m, at, rng, gain=.2, off=0.0):
    n = int(2.4 * SR)
    t = t_of(n)
    f = hz(m) * (1 + off)
    y = np.sin(2 * np.pi * f * t + 1.6 * np.exp(-t * 5) * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 2.4)
    b.put(y, at, pan=float(rng.uniform(-.6, .6)), gain=gain)


def tone(b, m, at, dur, kind, gain, decay=None, pan=0.0, a=.008):
    n = int(dur * SR)
    t = t_of(n)
    f = hz(m)
    y = {"sine": np.sin(2 * np.pi * f * t), "tri": tri(f, t), "saw": lp(saw(f, t), f * 4)}[kind]
    e = adsr(n, a, .03)
    if decay:
        e = e * np.exp(-t * decay)
    b.put(y * e, at, pan=pan, gain=gain)


def kit_hit(b, kind, at, rng, gain):
    if kind == "kick":
        n = int(.2 * SR)
        t = t_of(n)
        y = np.sin(2 * np.pi * (50 * t + 28 * (1 - np.exp(-t * 34)))) * np.exp(-t * 18)
    elif kind == "snare":
        n = int(.14 * SR)
        t = t_of(n)
        y = (rng.normal(0, 1, n) * .7 + np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 30)
    else:
        n = int(.04 * SR)
        y = np.diff(rng.normal(0, 1, n + 1)) * np.exp(-t_of(n) * 130) * .7
    b.put(y, at, gain=gain, pan=.12 if kind == "hat" else 0)


def render(mood, root_name, dur, seed):
    """Returns an N x 2 float array."""
    cfg = MOODS[mood]
    rng = np.random.default_rng(seed)
    n = int(dur * SR) + SR * 3
    b = Bus(n)
    root = ROOTS[root_name]
    beat = 60 / cfg["bpm"]
    bar_s = beat * 4 * cfg["bars"]
    scale = cfg["scale"]
    layers = cfg["layers"]
    bars = int(dur / bar_s) + 2
    motif = rng.integers(0, 7, 8)                       # one short theme, repeated with small changes: reads as a song
    for i in range(bars):
        at = i * bar_s * SR
        deg = cfg["prog"][i % len(cfg["prog"])]
        notes = chord(scale, deg, root)
        nlen = int(bar_s * SR * 1.02)
        if "pad" in layers:
            pad(b, [m + 12 for m in notes], at, nlen, 1300)
        if "detune" in layers:
            pad(b, [m + 12 for m in notes], at, nlen, 900, detune=.011, gain=.16)
        if "brass" in layers:
            pad(b, [m + 12 for m in notes], at, nlen, 2400, gain=.16)
        if "drone" in layers:
            pad(b, [root - 12, root - 11 + (i % 2), root + 7 - 12], at, nlen, 300, detune=.008, gain=.28)
        if "bass" in layers:
            tone(b, notes[0] - 12, at, bar_s, "sine", .3, a=.09)
        if "sub" in layers:
            tone(b, notes[0] - 24, at, bar_s, "sine", .34, a=.3)
        if "swell" in layers:
            m = int(bar_s * SR)
            noise = lp(rng.normal(0, 1, m), 500) * np.sin(np.pi * np.arange(m) / m) ** 2
            b.put(noise, at, gain=.5)
        if "heart" in layers:
            for q in (0, 2):
                for off in (0, .28):
                    tone(b, root - 24, at + (q * beat * 2 + off) * SR, .24, "sine", .55, decay=14)
        steps = int(cfg["bars"] * 8)
        step = bar_s / steps * SR
        s = SCALES[scale]
        for j in range(steps):
            pos = at + j * step
            p = motif[(j + (i % 4 == 3) * 2) % 8]
            m = root + 24 + s[(deg + p) % 7]
            if "bell" in layers and j % 3 == 0:
                bell(b, m, pos, rng)
            if "wrongbell" in layers and j % 5 == 0:
                bell(b, m + 12, pos, rng, gain=.13, off=float(rng.uniform(-.018, .018)))
            if "keys" in layers and j % 2 == 0:
                tone(b, m, pos, 1.6, "tri", .16, decay=2.4, pan=float(rng.uniform(-.4, .4)))
            if "marimba" in layers and (j % 2 == 0 or rng.random() < .3):
                tone(b, m, pos, .3, "sine", .3, decay=13, pan=float(rng.uniform(-.3, .3)))
            if "pulse" in layers:
                tone(b, notes[0] - 12 + (j % 8 == 7) * 12, pos, .11, "saw", .16, decay=12)
            if "pluckbass" in layers and j % 2 == 0:
                tone(b, notes[(j // 2) % 3] - 12, pos, .22, "tri", .36, decay=8)
            if "kit" in layers:
                if j % 4 == 0:
                    kit_hit(b, "kick", pos, rng, .55)
                if j % 4 == 2:
                    kit_hit(b, "snare", pos, rng, .3)
                kit_hit(b, "hat", pos, rng, .22)
            if "timp" in layers and j % 8 == 0:
                tone(b, notes[0] - 12, pos, .7, "sine", .5, decay=5)
    m = np.stack([b.L, b.R], 1)
    # Sampler colour: the band limit and slight grit of late-90s console audio.
    hold = 2
    m = np.repeat(m[::hold], hold, axis=0)[:n]
    if len(m) < n:
        m = np.vstack([m, np.zeros((n - len(m), 2))])
    m = np.round(m * 2048) / 2048
    for c in range(2):
        m[:, c] = lp(m[:, c], 7800)
    return m[:int(dur * SR)]
