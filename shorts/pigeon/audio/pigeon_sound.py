"""Sound for "The Pigeons Who Flew a Bomb" (44.5 s): synthesized SFX on every story beat (pecks on the screens, the seed,
the generals' laughs, the dog's catch, the stamp, the applause), an original score (D minor march -> F major fanfare) that
follows the picture, and the final mix with the voice.
Mix rule (SKILL.md): voice unchanged, music +3 dB and SFX -6 dB from the template's bed levels; music ducked under speech;
master to -14 LUFS integrated, true peak <= -1 dBTP; exact length 1335 frames.
Run: python3 pigeon_sound.py   (reads ../voice/voice.wav + words.json, writes mix.wav, stems/, cues.md)"""
import json, os
import numpy as np
from scipy import signal
from dsp import SR, ns, rng, lp, hp, bp, colored, smooth_noise, fades, pan, st, place, make_ir, convolve_st, integrated, \
    momentary_max, true_peak, dbg, read_wav, write_wav, modal, curve, widen
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 1335
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
# beats (frames from story.ts BEAT / words.json)
B = dict(missile=fr(75), pigeons1=fr(120), y1943=fr(149), skinner=fr(220), peck1=fr(262), ship=fr(302), peck2=fr(329), seed=fr(349),
         straps=fr(369), bomb=fr(416), screen=fr(462), laugh=fr(500), pigeonsQ=fr(516), really=fr(539), tests=fr(565), locked=fr(615),
         target=fr(630), wait=fr(647), lens=fr(726), drifts=fr(793), pecks=fr(814), tilt=fr(826), steers=fr(863), wrong=fr(919),
         outvote=fr(954), dog=fr(989), treats=fr(1004), idea=fr(1021), explosives=fr(1053), cancelled=fr(1091), seriously=fr(1180),
         eighty=fr(1203), prize=fr(1263), ig=fr(1293), peace=fr(1308))
# places by time (story.ts SHOTS)
RANGE_SPANS = [(0, fr(90)), (fr(553), fr(615)), (fr(848), fr(890))]
CONE_SPANS = [(fr(90), fr(144)), (fr(433), fr(480)), (fr(615), fr(848)), (fr(890), fr(976)), (fr(1043), fr(1076))]
LAB_SPANS = [(fr(140), fr(433)), (fr(1118), fr(1207))]
WAR_SPANS = [(fr(476), fr(556)), (fr(1072), fr(1122))]
R = rng(1943)


def env_ad(n, a, d):
    e = np.ones(n)
    ia = max(1, ns(a))
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:] = np.exp(-np.arange(n - ia) / SR / d)
    return e


def span(x, t0, t1, fin=0.15, fout=0.25):
    g = curve(N, [(0, 0), (max(0, t0 - 1e-3), 0), (t0 + fin, 1), (t1 - fout, 1), (t1, 0), (DUR + 1, 0)])
    return x * g[None, :]


# ============================================================ peck times (story.ts peckAt, contact = pulse peak)
def train(t0, t1, gap, ph, dur=0.16):
    out, k = [], 0
    while t0 + ph + k * gap <= t1:
        out.append(t0 + ph + k * gap + dur / 2); k += 1
    return out


def peck_times():
    P = []
    for b in range(3):
        P += [(t, b) for t in train(fr(96), fr(144), 0.42, b * 0.13)]
        P += [(t, b) for t in train(fr(455), fr(480), 0.35, b * 0.1)]
        P += [(t, b) for t in train(fr(612), fr(647), 0.22, b * 0.07) if t > fr(615)]
    P += [(fr(806) + 0.1, 1), (fr(840) + 0.1, 1), (fr(912) + 0.1, 1), (fr(950) + 0.11, 0), (fr(950) + 0.11, 2), (fr(1048) + 0.1, 1)]
    lab = [(B[k] + 0.02, 1) for k in ("peck1", "ship", "peck2")] + [(B["peck1"] + 0.52, 1)]
    return P, lab


# ============================================================ SFX
def burst(dur, lo, hi, a=0.002, d=0.06, slope=1.0):
    n = ns(dur)
    return bp(colored(n, R, slope), lo, hi) * env_ad(n, a, d)


def clang(f0, dur, vel=1.0, ratios=(1, 2.32, 3.9, 5.6)):
    return modal(dur, [(f0 * r, vel / (i + 1), dur * 0.35 / (i + 1)) for i, r in enumerate(ratios)], R)


def whoosh(dur, lo=200, hi=3000, peak=0.6):
    n = ns(dur)
    t = np.linspace(0, 1, n)
    e = np.exp(-((t - peak) / 0.22) ** 2)
    x = colored(n, R, 1.0)
    out = np.zeros(n)
    for k in range(6):
        c0, c1 = int(k * n / 6), int((k + 1) * n / 6)
        f = lo + (hi - lo) * (k / 5) * (1 - abs(k / 5 - peak))
        out[c0:c1] = bp(x, max(60, f * 0.6), min(SR / 2.2, f * 1.6))[c0:c1]
    return out * e


def peck(hard=1.0):
    """a beak on a glass screen: a bright tock + a tiny click"""
    tock = modal(0.09, [(2350 * R.uniform(0.95, 1.05), 1.0, 0.018), (3900, 0.5, 0.01), (1150, 0.4, 0.025)], R)
    click = hp(R.standard_normal(ns(0.006)), 3000) * np.exp(-np.arange(ns(0.006)) / SR / 0.0012) * 0.5
    x = tock.copy(); x[:len(click)] += click
    return x * hard


def flutter(dur, rate=18.0):
    """wing flaps: band noise gated at the flap rate"""
    n = ns(dur); t = np.arange(n) / SR
    g = np.clip(np.sin(2 * np.pi * rate * t), 0, 1) ** 3
    return bp(colored(n, R, 0.8), 500, 3500) * g * np.sin(np.pi * t / dur) ** 0.5


def coo(t_len=0.6, f0=420):
    """a pigeon's soft 'hoo-oo'"""
    n = ns(t_len); t = np.arange(n) / SR
    f = f0 * (1 + 0.12 * np.sin(np.pi * t / t_len)) * (1 - 0.15 * t / t_len)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)
    am = (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * t / t_len) ** 1.2
    return lp(x * am, 1400) * 0.6


def laugh_burst(f0, n_ha=6, gap=0.17):
    """'ho ho ho': voiced bursts with a formant"""
    out = np.zeros(ns(n_ha * gap + 0.2))
    for k in range(n_ha):
        n = ns(0.13); t = np.arange(n) / SR
        ph = 2 * np.pi * np.cumsum(f0 * (1.05 - 0.1 * t / 0.13) * (1 - 0.03 * k)) / SR
        src = np.sign(np.sin(ph)) * 0.3 + np.sin(ph)
        v = bp(src, 300, 1100) + 0.4 * bp(colored(n, R, 0.5), 700, 2200)
        v *= np.sin(np.pi * t / 0.13) ** 2 * (1 - 0.08 * k)
        i = ns(k * gap); out[i:i + n] += v
    return out


def bark():
    n = ns(0.22); t = np.arange(n) / SR
    f = 520 * np.exp(-t / 0.12) + 260
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = np.sign(np.sin(ph)) * 0.5 + np.sin(ph)
    return (bp(src, 300, 2500) + 0.5 * bp(colored(n, R, 0.4), 800, 3000)) * env_ad(n, 0.005, 0.07) * 0.8


def crunch(dur=0.22):
    n = ns(dur)
    x = np.zeros(n)
    for k in range(9):
        i = int(R.uniform(0, n - ns(0.02)))
        x[i:i + ns(0.02)] += hp(R.standard_normal(ns(0.02)), 1500) * np.exp(-np.arange(ns(0.02)) / SR / 0.004) * R.uniform(0.3, 1)
    return x


def applause(n, amt):
    """many hand claps: dense band-noise ticks, density follows amt"""
    x = np.zeros(n)
    rate = 900  # claps per second at full
    times = np.sort(R.uniform(0, n / SR, int(rate * n / SR)))
    a = np.interp(times, np.arange(len(amt)) / SR, amt)
    for tt, aa in zip(times, a):
        if R.uniform() > aa: continue
        m = ns(0.012); i = ns(tt)
        if i + m >= n: continue
        x[i:i + m] += bp(R.standard_normal(m), R.uniform(900, 2600), 5200) * np.exp(-np.arange(m) / SR / 0.003) * R.uniform(0.3, 1)
    return widen(x, R, amount=1.0)


def servo(dur, f0=180, f1=260):
    n = ns(dur); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.3 + 0.2 * bp(colored(n, R, 0.5), 1500, 4000)
    return lp(x, 2500) * np.sin(np.pi * t / dur) ** 0.6 * 0.5


def sfx():
    S = np.zeros((2, N))
    t = np.arange(N) / SR
    # ---- room tones ----
    wind = widen(lp(colored(N, R, 1.6), 900) * (0.6 + 0.4 * smooth_noise(N, R, 0.7)), R, amount=1.0)
    for a, b in RANGE_SPANS: place(S, span(wind * 0.16, a, b, 0.05, 0.08), 0)
    hull = widen(lp(colored(N, R, 2.0), 220) + 0.04 * np.sin(2 * np.pi * 70 * t), R)
    for a, b in CONE_SPANS: place(S, span(hull * 0.12, a, b, 0.04, 0.06), 0)
    room = widen(lp(colored(N, R, 1.8), 300) * 0.5, R)
    for a, b in LAB_SPANS + WAR_SPANS: place(S, span(room * 0.06, a, b, 0.1, 0.15), 0)
    for k in range(int((fr(433) - fr(144)) / 0.5)):  # the lab clock
        place(S, pan(clang(2200 if k % 2 else 1900, 0.06, 0.4, (1, 2.7)) * 0.35, 0.5), fr(144) + k * 0.5, 0.05)
    for k in range(int((fr(1203) - fr(1122)) / 0.5)):
        place(S, pan(clang(2200 if k % 2 else 1900, 0.06, 0.4, (1, 2.7)) * 0.35, 0.5), fr(1122) + k * 0.5, 0.05)
    # ---- the bomb gliding: a long whoosh under each range shot, a deeper one as it banks ----
    place(S, pan(whoosh(2.8, 120, 1600, 0.55), 0.1), 0.1, 0.4)
    place(S, pan(whoosh(2.0, 150, 2200, 0.5), -0.1), fr(556), 0.4)
    place(S, pan(whoosh(1.4, 100, 1200, 0.45), 0.2), fr(850), 0.45)
    place(S, pan(servo(0.5, 160, 240), 0.1), fr(852), 0.3)  # the fins swing
    place(S, st(lp(burst(1.2, 25, 140, 0.01, 0.4, 2.0), 140)), B["missile"], 0.5)
    # ---- pecks ----
    P, lab = peck_times()
    for tp, b in P: place(S, pan(peck(0.9), (b - 1) * 0.45), tp, 0.35)
    for tp, b in lab: place(S, pan(peck(1.0), -0.2), tp, 0.42)
    # seed: hopper rattle, the seed ticks into the tray, a happy flutter
    place(S, pan(crunch(0.18) * 0.5, -0.3), B["seed"] - 0.28, 0.2)
    place(S, pan(clang(4200, 0.15, 0.7, (1, 2.6)), -0.3), B["seed"] - 0.02, 0.32)
    place(S, pan(flutter(0.9, 20), 0.0), B["seed"] + 0.05, 0.2)
    place(S, pan(clang(4200, 0.15, 0.7, (1, 2.6)), 0.0), fr(1052), 0.25)  # the helmeted pilot's seed
    # Skinner lifts a bird into the nose section: flutter, a buckle click
    place(S, pan(flutter(1.0, 22), 0.2), B["straps"] + 0.05, 0.22)
    place(S, pan(whoosh(0.5, 300, 2500, 0.4), 0.2), B["straps"] - 0.05, 0.18)
    place(S, pan(clang(3000, 0.07, 0.8, (1, 3.1)), 0.1), fr(402), 0.3)
    place(S, pan(coo(0.55, 400), 0.15), fr(408), 0.18)
    # ---- war room: the generals laugh, a desk slap ----
    place(S, pan(laugh_burst(140, 7, 0.16), -0.35), B["laugh"] - 0.05, 0.3)
    place(S, pan(laugh_burst(180, 6, 0.18), 0.35), B["laugh"] + 0.04, 0.24)
    place(S, pan(laugh_burst(120, 5, 0.2), 0.0), B["laugh"] + 0.1, 0.2)
    place(S, pan(lp(burst(0.12, 80, 900, 0.001, 0.04, 1.5), 900), -0.3), B["laugh"] + 0.3, 0.3)
    # ---- the lock-on: a two-tone beep on "target" ----
    for k, f0 in enumerate((1760, 2350)):
        n = ns(0.09); beep = np.sin(2 * np.pi * f0 * np.arange(n) / SR) * np.sin(np.pi * np.arange(n) / n) ** 0.3
        place(S, pan(beep, 0.1), B["target"] - 0.02 + k * 0.1, 0.12)
    # ---- iris "Wait": a quick swish closing in, a curious boing ----
    place(S, pan(whoosh(0.3, 800, 5000, 0.6), 0.0), B["wait"] - 0.12, 0.25)
    n = ns(0.45); tb_ = np.arange(n) / SR
    boing = np.sin(2 * np.pi * np.cumsum(330 + 420 * np.exp(-tb_ / 0.09) * np.cos(2 * np.pi * 8 * tb_)) / SR) * np.exp(-tb_ / 0.16)
    place(S, pan(boing, 0.2), B["wait"] + 0.35, 0.13)
    # ---- the explanation: the lens's light hums in, the image slides, the screen tilts (servo), the fins ----
    n = ns(fr(848) - B["lens"]); tl_ = np.arange(n) / SR
    hum = (np.sin(2 * np.pi * 880 * tl_) + 0.5 * np.sin(2 * np.pi * 1320.5 * tl_) + 0.3 * np.sin(2 * np.pi * 1762 * tl_)) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * tl_))
    hum *= np.minimum(1, tl_ / 0.4) * np.minimum(1, (tl_[-1] - tl_) / 0.2 + 1e-3)
    place(S, widen(hum * 0.05, R), B["lens"], 0.6)
    place(S, pan(whoosh(0.5, 400, 3000, 0.5), -0.3), B["drifts"] - 0.1, 0.18)
    place(S, pan(servo(0.7), 0.0), fr(818), 0.28)
    # ---- outvote: a sour buzz on the wrong peck, a pop on the "!", a bright ding when the two fix it ----
    n = ns(0.3); tz_ = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 150 * tz_)) * 0.4 * np.sin(np.pi * tz_ / 0.3) + np.sign(np.sin(2 * np.pi * 157 * tz_)) * 0.3 * np.sin(np.pi * tz_ / 0.3)
    place(S, pan(lp(buzz, 1800), 0.0), fr(915), 0.12)
    place(S, pan(clang(1400, 0.12, 0.6, (1, 2.0)), 0.05), B["wrong"] - 0.05, 0.1)
    for k, m in enumerate([84, 91]): place(S, pan(I.glock(I.m2f(m), 0.6, R, 1.0), 0.1), fr(951) + 0.08 + 0.07 * k, 0.12)
    # ---- the yard: birds, the toss, the catch (crunch), a happy bark ----
    birds = np.zeros(N)
    for k in range(int(DUR * 1.5)):
        tb = R.uniform(0, DUR)
        n = ns(0.12); tt_ = np.arange(n) / SR
        f0 = R.uniform(2600, 4200)
        chirp = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * 18 * tt_)) / SR) * np.exp(-((tt_ - 0.06) / 0.03) ** 2)
        i = ns(tb); birds[i:i + n] += chirp[: max(0, min(n, N - i))]
    place(S, span(widen(birds * 0.06, R), fr(972), fr(1043), 0.1, 0.1), 0)
    place(S, pan(whoosh(0.35, 500, 4000, 0.4), -0.2), B["treats"] - 0.04, 0.22)
    place(S, pan(crunch(0.25), 0.25), B["treats"] + 0.38, 0.4)
    place(S, pan(bark(), 0.25), B["idea"] - 0.15, 0.3)
    # ---- "explosives": a low boom under the pull back ----
    place(S, st(lp(burst(1.6, 25, 180, 0.005, 0.55, 2.0), 180)), B["explosives"] - 0.05, 0.6)
    # ---- the stamp ----
    place(S, pan(whoosh(0.3, 300, 2500, 0.6), 0.1), B["cancelled"] - 0.3, 0.25)
    place(S, st(lp(burst(0.35, 40, 600, 0.001, 0.08, 1.8), 600)), B["cancelled"], 0.7)
    place(S, pan(burst(0.08, 600, 5000, 0.0005, 0.02, 0.6), 0.1), B["cancelled"], 0.35)
    # ---- Skinner's sigh: a sad coo from the bird on his shoulder ----
    place(S, pan(coo(0.8, 360), -0.25), B["seriously"] + 0.25, 0.25)
    # ---- the stage: hall murmur, applause from "prize", a big cheer + confetti pops on "Peace Prize" ----
    murmur = widen(bp(colored(N, R, 0.8), 250, 1800) * (0.6 + 0.4 * smooth_noise(N, R, 2.0)), R, amount=1.0)
    place(S, span(murmur * 0.05, fr(1199), B["prize"] + 0.3, 0.3, 0.3), 0)
    amt = curve(N, [(0, 0), (B["prize"] - 0.1, 0), (B["prize"] + 0.4, 0.4), (B["peace"], 0.45), (DUR - 0.3, 0.7), (DUR, 1.0)])
    place(S, span(applause(N, amt) * 0.6, B["prize"] - 0.1, DUR, 0.05, 0.02), 0)  # under the last words: kept below the voice
    for k in range(6):
        place(S, pan(burst(0.05, 800, 6000, 0.0005, 0.012, 0.4), -0.6 + 0.24 * k), B["peace"] + 0.04 * k, 0.3)
    place(S, pan(flutter(1.2, 18), -0.3), B["peace"] + 0.05, 0.18)
    return S


# ============================================================ music (original: D minor march -> F major fanfare, 120 bpm)
BPM = 120.0
Q = 60 / BPM
m2f = I.m2f


def roll(dur, v0, v1, r):
    """a snare buzz roll rendered to a mono buffer of length dur"""
    x = np.zeros(ns(dur + 0.4))
    for tk, v in I.snare_roll(0.0, dur, v0, v1, r):
        y = I.snare(v, r, 0.12, buzz=True); i = max(0, ns(tk)); m = min(len(y), len(x) - i)
        x[i:i + m] += y[:m]
    return x


def music():
    M = np.zeros((2, N))
    r = rng(44)
    def note(fn, t0, gain=1.0, p=0.0):
        place(M, pan(fn, p) if np.ndim(fn) == 1 else fn, t0, gain)
    Dm, Gm, A7, Bb, F_, C_ = (38, [62, 65, 69]), (43, [62, 67, 70]), (45, [61, 64, 67]), (46, [62, 65, 70]), (41, [60, 65, 69]), (36, [60, 64, 67])
    march = [Dm, Dm, Gm, A7]
    tune = [74, 0, 74, 76, 77, 0, 76, 74, 73, 0, 69, 0, 74, 0, 0, 0]
    # A: the bomb over the sea (0 .. 3 s): snare roll + low ostinato, a timpani hit on "missile"
    for k in range(int(fr(88) / (Q / 2))):
        tk = 0.05 + k * Q / 2
        if k % 2 == 0: note(I.brass(m2f([38, 45][(k // 2) % 2]), Q * 0.4, 0.6, r, "tuba"), tk, 0.22, -0.15)
    note(roll(B["missile"] - 0.05, 0.1, 0.5, r), 0.0, 0.12)
    note(I.timpani(m2f(38), 0.9, r, 1.4), B["missile"], 0.32)
    # B: "the pilots were pigeons" (3 .. 4.8 s): a sly bassoon-ish pluck line + glock sting on "pigeons"
    for k, m in enumerate([50, 53, 57, 55, 53, 52, 50]):
        note(I.pluck(m2f(m), 0.7, r, 0.4), fr(92) + k * Q / 2, 0.3, -0.1)
    for k, m in enumerate([86, 81, 86]): note(I.glock(m2f(m), 0.6, r, 0.9), B["pigeons1"] + 0.02 + 0.12 * k, 0.12, 0.25)
    # C: Skinner's lab (4.8 .. 14.4 s): mysterious vibes over a pizz walk
    walk = [38, 41, 45, 48, 43, 46, 45, 40]
    for k in range(int((fr(433) - fr(148)) / Q)):
        tk = fr(148) + k * Q
        note(I.pluck(m2f(walk[k % 8]), 0.6, r, 0.5), tk, 0.24, -0.2)
        if k % 2 == 0: note(I.vibes(m2f([62, 65, 69, 65, 67, 70, 69, 64][(k // 2) % 8] + 12), 0.4, r, 1.4), tk, 0.09, 0.3)
    # D+F: the march (into the cone, the generals, the tests: 14.4 .. 21.5 s); a held chord on "Really?"
    for k in range(int((fr(647) - fr(433)) / (Q / 2))):
        tk = fr(433) + k * Q / 2
        if B["really"] - 0.1 < tk < B["tests"] - 0.25: continue
        bass, tri = march[(k // 4) % 4]
        if k % 2 == 0: note(I.brass(m2f(bass), Q * 0.4, 0.7, r, "tuba"), tk, 0.24, -0.15)
        else:
            for m in tri: note(I.brass(m2f(m), Q * 0.25, 0.4, r, "horn"), tk, 0.04, 0.25)
        if k % 4 == 2 or (tk > B["tests"] and k % 2 == 1): note(I.snare(0.4, r, 0.2), tk, 0.08)
        m = tune[k % 16]
        if m and tk > B["tests"] - 0.3: note(I.fife(m2f(m), Q * 0.45, 0.6, r), tk, 0.07, 0.3)
    note(I.pad([m2f(57), m2f(61), m2f(64), m2f(67)], B["tests"] - B["really"] - 0.2, 0.5, r, 0.05, 0.25), B["really"] + 0.05, 0.22)
    note(st(I.cymbal(0.6, r, 1.6)), B["target"], 0.14)
    # G: iris "Wait" (21.5 .. 23.7 s): the band stops; a single questioning pluck
    for k, m in enumerate([69, 72, 76]): note(I.pluck(m2f(m), 0.5, r, 0.6), B["wait"] + 0.6 + 0.18 * k, 0.12, 0.2)
    # H: the explanation (23.7 .. 29.7 s): a thinking pad + slow tick, a lift when it steers
    note(I.pad([m2f(50), m2f(57), m2f(62), m2f(65)], fr(848) - fr(711), 0.4, r, 0.6, 0.3, warm=1200), fr(711), 0.3)
    for k in range(int((fr(890) - fr(711)) / Q)):
        note(I.pluck(m2f(74 if k % 2 else 69), 0.4, r, 0.3), fr(711) + k * Q, 0.06, 0.3)
    note(I.pad([m2f(53), m2f(60), m2f(65), m2f(69)], fr(890) - fr(848), 0.45, r, 0.2, 0.25, warm=1600), fr(848), 0.3)
    # I: the outvote (29.7 .. 32.5 s): pizz staccato, two-note "tsk" when it goes wrong
    for k in range(int((fr(976) - fr(890)) / (Q / 2))):
        tk = fr(890) + k * Q / 2
        if k % 2 == 0: note(I.pluck(m2f([38, 45, 41, 45][(k // 2) % 4]), 0.6, r, 0.5), tk, 0.22, -0.2)
    # J: the yard (32.5 .. 34.8 s): the tune in F major on glock, bright
    ftune = [72, 0, 69, 72, 74, 72, 69, 0, 67, 69, 72, 0, 65, 0, 67, 0]
    for k in range(int((fr(1043) - fr(976)) / (Q / 2))):
        tk = fr(976) + k * Q / 2
        bass, _ = [F_, C_, Bb, C_][(k // 4) % 4]
        if k % 2 == 0: note(I.pluck(m2f(bass), 0.8, r, 0.5), tk, 0.3, -0.2)
        m = ftune[k % 16]
        if m: note(I.glock(m2f(m), 0.55, r, 0.8), tk, 0.1, 0.25)
    # K: "but with explosives" (34.8 .. 36.4 s): brass stab + timpani, a tense low pulse, cut dead by the stamp
    for dt, m in [(0.0, 50), (0.0, 57), (0.0, 62)]:
        note(I.brass(m2f(m), 0.5, 0.9, r, "stab"), B["explosives"] - 0.02 + dt, 0.12, 0.1)
    note(I.timpani(m2f(38), 0.9, r, 1.2), B["explosives"] - 0.02, 0.3)
    for k in range(int((B["cancelled"] - B["explosives"] - 0.6) / (Q / 2))):
        note(I.pluck(m2f(38), 0.5, r, 0.3), B["explosives"] + 0.5 + k * Q / 2, 0.14, -0.1)
    # L: cancelled + Skinner deflated (36.4 .. 40.1 s): a slow minor pad, the sad trombone on "seriously"
    note(I.pad([m2f(50), m2f(53), m2f(57), m2f(62)], fr(1203) - B["cancelled"] - 0.4, 0.4, r, 0.8, 0.5, warm=900), B["cancelled"] + 0.4, 0.26)
    for k, m in enumerate([58, 57, 56]):
        note(I.brass(m2f(m), 0.42, 0.6, r, "horn"), B["seriously"] - 1.1 + 0.45 * k, 0.12, 0.1)
    note(I.brass(m2f(55), 1.0, 0.6, r, "horn", fall=-3.0), B["seriously"] + 0.25, 0.12, 0.1)
    noteM = lambda fn, t0, gain=1.0, p=0.0: note(fn, t0, gain * 0.7, p)  # -3 dB: the fanfare sits under the punchline
    # M: the stage (40.1 .. 44.5 s): soft build, snare roll into "prize", fanfare in F, cymbal on "Peace", final chord
    noteM(I.pad([m2f(53), m2f(60), m2f(65)], B["prize"] - B["eighty"], 0.4, r, 0.6, 0.2, warm=1400), B["eighty"], 0.22)
    noteM(roll(B["prize"] - B["eighty"] - 0.6, 0.05, 0.6, r), B["eighty"] + 0.6, 0.1)
    fan = [(0.0, 65, 0.22), (0.22, 69, 0.22), (0.44, 72, 0.6), (1.1, 72, 0.18), (1.3, 74, 0.18), (1.5, 76, 0.6)]
    for dt, m, d in fan:
        noteM(I.brass(m2f(m), d, 0.85, r, "stab" if d < 0.3 else "horn"), B["prize"] + dt, 0.16, 0.1)
        noteM(I.brass(m2f(m - 12), d, 0.7, r, "tuba"), B["prize"] + dt, 0.1, -0.1)
    noteM(I.timpani(m2f(41), 0.8, r, 1.6), B["peace"], 0.3)
    noteM(st(I.cymbal(0.7, r, 2.2)), B["peace"], 0.2)
    for m in (53, 60, 65, 69, 72): noteM(I.brass(m2f(m), DUR - B["peace"] - 0.2, 0.7, r, "horn"), B["peace"], 0.06, 0.0)
    noteM(I.pad([m2f(41), m2f(53), m2f(57), m2f(60), m2f(65)], DUR - B["peace"] - 0.05, 0.55, r, 0.15, 0.3), B["peace"], 0.26)
    ir = make_ir(0.9, 4)
    wet = convolve_st(M, ir)[:, :N]
    return M + 0.2 * wet


# ============================================================ mix
def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        if sp and w["start"] - sp[-1][1] < merge: sp[-1][1] = w["end"]
        else: sp.append([w["start"], w["end"]])
    return sp


def duck(spans, depth=-6.0, att=0.06, rel=0.35):
    d = np.zeros(N)
    for a, b in spans:
        d[ns(max(0, a - 0.08)): ns(min(DUR, b + 0.12))] = 1
    k = signal.sosfiltfilt(signal.butter(1, 1 / (2 * np.pi * (att + rel) / 2) / (SR / 2), output="sos"), d)
    return dbg(depth * np.clip(k, 0, 1))


def limiter(x, ceil_db=-1.7, look=0.004, rel=0.08):
    c = dbg(ceil_db)
    pk = np.abs(x).max(axis=0)
    w = ns(look)
    pk = np.maximum.reduce([np.roll(pk, -i) for i in range(0, w, max(1, w // 16))])
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    out = np.empty_like(g); cur = 1.0; a = np.exp(-1 / (rel * SR))
    for i in range(len(g)):  # instant attack, smooth release
        cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]
        out[i] = cur
    return x * out[None, :], out


def main():
    v, sr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
    assert sr == SR
    v = st(v)[:, :N]
    v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
    words = json.load(open(os.path.join(HERE, "..", "voice", "words.json")))
    Lv = integrated(v)
    s = sfx(); m = music()
    # bed levels relative to the voice: template music -12 LU (+3 dB rule -> -9), SFX events +3 LU momentary (-6 rule)
    m = m * duck(speech_spans(words))[None, :]
    m = m * dbg((Lv - 9.0) - integrated(m))
    s = s * dbg((Lv + 3.0) - momentary_max(s)) * dbg(-6.0)
    mix0 = v + m + s
    G = -14.0 - integrated(mix0)
    for _ in range(6):
        y, g = limiter(mix0 * dbg(G))
        L = integrated(y)
        if abs(L + 14.0) < 0.05: break
        G += -14.0 - L
    tp = true_peak(y)
    if tp > -1.05:  # inter-sample peaks the sample limiter cannot see: trim the master so true peak <= -1 dBTP
        G += -1.1 - tp
        y = y * dbg(-1.1 - tp)
    y = fades(y, 0.0, 0.03)
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    for name, x in [("voice", v), ("music", m), ("sfx", s)]: write_wav(os.path.join(HERE, "stems", name + ".wav"), x * dbg(G))
    rows = [f"- Integrated **{integrated(y):.1f} LUFS**, true peak **{true_peak(y):.1f} dBTP**, max limiter GR {-20 * np.log10(g.min()):.1f} dB",
            f"- Stems at mix gain: voice {integrated(v * dbg(G)):.1f}, music {integrated(m * dbg(G)):.1f}, sfx {integrated(s * dbg(G)):.1f} LUFS",
            f"- Length {y.shape[1] / SR:.4f} s ({TOTAL} frames at {FPS} fps), 48 kHz stereo 24-bit"]
    cues = ["# The Pigeons Who Flew a Bomb: sound cues", "", *rows, "", "| beat | time (s) |", "|---|---|"] + \
        [f"| {k} | {t:.2f} |" for k, t in B.items()]
    open(os.path.join(HERE, "cues.md"), "w").write("\n".join(cues) + "\n")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
