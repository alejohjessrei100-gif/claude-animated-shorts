"""Sound for "The Skyscraper That Cooked a Car": synthesized SFX + an original comic score, ducked under the voice.
Everything is generated here with the bridge short's own DSP kit (dsp.py, sfx_gen.py, instruments.py); timings come
from the picture (timeline.json exported from story.ts) and the voice word timings (voice/words.json).
Standard mix (SKILL.md): music +3 dB, SFX -6 dB, voice unchanged. Output: mix.wav (48 kHz, exact length), stems, mp3
for the phone site, cues.md."""
import json, os, subprocess
import numpy as np
from dsp import SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st, colored, smooth_noise, \
    integrated, true_peak, read_wav, write_wav, momentary_max, modal, phase
import sfx_gen as G
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, "timeline.json")))
WORDS = json.load(open(os.path.join(HERE, "../voice/words.json")))
FPS, TOTAL = TL["FPS"], TL["TOTAL"]
DUR = TOTAL / FPS
B = TL["BEAT"]
SH = {s["id"]: s for s in TL["SHOTS"]}
fr = lambda f: f / FPS
N = ns(DUR)
CUES = []


def madd(*xs):
    """sum mono or stereo arrays of different lengths (zero-padded)"""
    xs = [np.asarray(x, float) for x in xs]
    stereo = any(x.ndim == 2 for x in xs)
    xs = [st(x) if stereo else x for x in xs]
    n = max(x.shape[-1] for x in xs)
    out = np.zeros((2, n) if stereo else n)
    for x in xs:
        out[..., : x.shape[-1]] += x
    return out


def bus():
    return np.zeros((2, N))


def norm_ev(x, lufs=-20.0):
    m = momentary_max(st(x))
    return x * dbg(lufs - m) if np.isfinite(m) else x


# ================================================================ SFX
sfx, beds = bus(), bus()


def ev(t, x, db=0.0, p=0.0, name="", lufs=-20.0):
    y = norm_ev(x, lufs) * dbg(db)
    place(sfx, pan(y, p) if np.ndim(y) == 1 else y, t)
    CUES.append((t, name or "event", db))


def bed(t0, t1, x, db, name):
    n = ns(t1 - t0)
    y = st(x)[:, :n]
    y = fades(y, 0.3, 0.5)
    m = integrated(y)
    place(beds, y * dbg(db - m), t0)
    CUES.append((t0, f"bed: {name} ({t1 - t0:.1f}s)", db))


def sizzle(dur, r, level=1.0, crackle=60.0):
    """frying / hot-metal sizzle: bright hiss with random crackle pops"""
    n = ns(dur)
    hiss = bp(colored(n, r, 0.2), 3000, 11000, 2) * (0.6 + 0.4 * smooth_noise(n, r, 2.0))
    pops = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm); L = min(ns(0.004), n - k)
        if L > 4: pops[k:k + L] += r.uniform(0.3, 1.0) * np.exp(-np.arange(L) / (0.0008 * SR)) * r.choice([-1, 1])
        tm += r.exponential(1.0 / crackle)
    return (hiss * 0.5 + hp(pops, 1500, 2) * 0.8) * level


def droop(r, d=0.9):
    """soft plastic sagging: a slow descending rubbery squeak + a wet drip"""
    t = tt(d)
    f = 520 * np.exp(-1.4 * t)
    sq = np.sin(phase(f)) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.5) * (0.6 + 0.4 * np.sin(phase(np.full(len(t), 23.0))))
    drip = np.zeros(len(t)); k = ns(d * 0.65)
    dt = tt(0.12)[: len(t) - k]; drip[k:k + len(dt)] = np.sin(phase(900 * (1 + 3 * dt))) * np.exp(-dt / 0.03)
    return madd(lp(sq, 2500, 1), drip * 0.7)


def tink(r, f0=2400):
    return modal(0.5, [(f0, 0.7, 0.05), (f0 * 2.76, 0.4, 0.02), (f0 * 5.4, 0.2, 0.01)], r)


def crack_egg(r):
    t = tt(0.25)
    nz = r.standard_normal(len(t))
    c = bp(nz, 1500, 7000, 2) * (np.exp(-t / 0.006) + 0.6 * np.exp(-np.maximum(t - 0.05, 0) / 0.005) * (t > 0.05))
    plop = np.sin(phase(300 * (1 - 0.5 * t))) * np.exp(-np.maximum(t - 0.12, 0) / 0.04) * (t > 0.12) * 0.5
    return madd(c, plop)


def rise_tone(d, f0, f1, r, wob=0.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d) * (1 + wob * np.sin(phase(np.full(len(t), 7.0))))
    return np.sin(phase(f)) * np.clip(t / 0.05, 0, 1) * np.clip((d - t) / 0.08, 0, 1)


def ding(r, f=1760):
    return madd(I.glock(f, 0.9, r, 1.6), 0.5 * I.triangle(0.6, r, 1.4, f * 1.5))


def flash_hit(r):
    t = tt(1.2)
    return madd(lp(colored(len(t), r, 0.0), 6000, 1) * np.exp(-t / 0.18) * 0.7, 0.6 * I.cymbal(0.6, r, 1.2, 1.0))


def clank(r, big=1.0):
    return madd(G.hammer_hit(r, big) * 0.9, 0.5 * modal(0.8, [(620, 0.8, 0.12), (1460, 0.6, 0.08), (2950, 0.3, 0.05)], r))


def rustle(r, d=0.5):
    n = ns(d)
    return bp(colored(n, r, 0.3), 1500, 8000, 2) * (0.5 + 0.5 * smooth_noise(n, r, 18)) * np.clip(np.arange(n) / ns(0.05), 0, 1) * np.linspace(1, 0.2, n)


def traffic(dur, r):
    """city street bed: low traffic rumble, a car passing every few seconds, distant horn, pigeons"""
    n = ns(dur)
    out = st(lp(colored(n, r, 1.2), 400, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.2))) * 0.8
    out += G.breeze(dur, r, 0.25, 0.15, 900)
    tm = r.uniform(0.5, 2.0)
    while tm < dur - 2:
        d = r.uniform(2.2, 3.5)
        w = G.whoosh(d, r, peak=0.5, f_lo=200, f_hi=1500, width=0.6, tail=0.4, air=0.1)
        place(out, w * 0.45, tm)
        tm += r.uniform(2.5, 5.5)
    for k in range(int(dur / 9)):
        place(out, pan(G.bird_chirps(3.0, r, 0.6, "sparrow") * 0.15, r.uniform(-0.8, 0.8)), r.uniform(0, dur - 3))
    return out


def murmur(dur, r, voices=7):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        base, scale = (r.uniform(95, 140), 1.0) if v % 2 else (r.uniform(175, 235), 1.15)
        y = G.babble(dur, r, base, scale, r.uniform(3.6, 4.8), r.uniform(0.55, 0.8), fmax=3400)
        out += pan(lp(y, r.uniform(2200, 3400), 1) * r.uniform(0.3, 1.0), r.uniform(-0.85, 0.85))
    return out


def pool_bed(dur, r):
    out = G.water_bed(dur, r, 0.6, 0.5) * 0.6
    out += G.breeze(dur, r, 0.4, 0.2, 1100)
    out += pan(G.crickets(dur, r, 2) * 0.05, 0.4)
    return out


r = rng(7)
# ---- beds
city_end = fr(SH[14]["a"]) + 0.15
bed(0.0, city_end, traffic(city_end, rng(11)), -32, "City street: traffic rumble, passing cars, sparrows")
bed(fr(SH[3]["a"]), fr(SH[13]["a"]), murmur(fr(SH[13]["a"] - SH[3]["a"]), rng(12)), -40, "people on the pavement murmuring")
bed(fr(SH[14]["a"]) - 0.1, fr(SH[15]["a"]) + 0.1, G.breeze(fr(SH[15]["a"] - SH[14]["a"]) + 0.2, rng(13), 0.5, 0.2, 1100) + pan(G.bird_chirps(fr(SH[15]["a"] - SH[14]["a"]) + 0.2, rng(14), 0.7, "blackbird") * 0.3, -0.3), -33, "park: breeze and a blackbird")
bed(fr(SH[15]["a"]), fr(SH[18]["a"]) + 0.15, traffic(fr(SH[18]["a"] - SH[15]["a"]) + 0.15, rng(15)), -33, "City street again")
bed(fr(SH[18]["a"]), fr(SH[19]["a"]) + 0.1, st(lp(colored(ns(fr(SH[19]["a"] - SH[18]["a"]) + 0.1), rng(16), 1.5), 300, 2)), -42, "studio room tone")
bed(fr(SH[19]["a"]) - 0.1, DUR, pool_bed(DUR - fr(SH[19]["a"]) + 0.1, rng(17)), -30, "Las Vegas pool: water lapping, warm breeze, crickets")
# sizzle on the car: hook, then the melt beats
bed(0.0, fr(SH[1]["b"]) + 0.1, sizzle(fr(SH[1]["b"]) + 0.1, rng(21), 1.0, 40), -30, "hot-metal sizzle on the car (hook)")
bed(fr(SH[5]["a"]), fr(SH[9]["b"]), sizzle(fr(SH[9]["b"] - SH[5]["a"]), rng(22), 1.0, 70), -31, "the car sizzling (melt beats)")
bed(B["cracks"] + 0.35, fr(SH[10]["b"]), sizzle(fr(SH[10]["b"]) - B["cracks"] - 0.35, rng(23), 1.0, 140), -26, "the egg frying in the pan")
# ---- events
ev(fr(TL["FLASH_AT"]) - 0.02, flash_hit(rng(31)), -2, 0, "white flash after the hook")
ev(B["melted"] - 0.05, droop(rng(32), 0.8), -4, 0.2, "the car panel sags (hook)")
cut_frames = sorted(set([s["a"] for s in TL["SHOTS"][1:]] + [c for i, c in enumerate(TL["CUTS"]) if i == 0 or TL["CUTS"][i - 1] != c - 1]))
for f in cut_frames:
    ev(fr(f) - 0.18, G.whoosh(0.55, rng(f), peak=0.32, f_lo=400, f_hi=2600, width=0.7, tail=0.2, air=0.2), -12, 0.0, f"whoosh into cut {f}")
# the car rolls in and parks, door, steps
park_t = B["parks"] + 0.2
eng = lp(colored(ns(3.2), rng(41), 1.0), 260, 2) * np.linspace(1, 0.2, ns(3.2)) + 0.4 * np.sin(phase(np.linspace(70, 40, ns(3.2))))
ev(fr(SH[4]["a"]), eng, -10, -0.5, "Jaguar engine rolling in, slowing to a stop")
ev(park_t, modal(0.4, [(90, 1.0, 0.05), (210, 0.5, 0.03)], rng(42)), -14, 0, "handbrake / settle")
ev(park_t + 1.1, modal(0.5, [(140, 1.0, 0.06), (480, 0.5, 0.03), (1200, 0.3, 0.01)], rng(43)), -10, 0.2, "car door shuts")
for k in range(5):
    ev(B["heads"] + k * 0.42, G.stroll_step(rng(50 + k), 0.4), -18, 0.3, "his footsteps leaving")
for k in range(4):
    ev(fr(SH[5]["a"]) + 0.2 + k * 0.45, G.stroll_step(rng(60 + k), 0.4), -18, 0.3, "his footsteps returning")
ev(B["back"] - 0.03, rise_tone(0.25, 900, 600, rng(73)), -16, 0, "his double-take")
# melt beats
ev(B["drooped"] - 0.4, droop(rng(80), 1.1), -2, 0.15, "the wing mirror droops like ice cream")
ev(B["slid"] - 0.2, rise_tone(0.5, 700, 380, rng(81), 0.03), -10, -0.1, "the badge slides")
ev(B["off"] + 0.25, tink(rng(82), 2600), -4, -0.2, "badge clinks off")
ev(B["off"] + 0.55, tink(rng(83), 3100), -9, -0.25, "badge bounce on the road")
ev(B["bubbling"] - 0.4, G.bubbles(2.6, rng(84), 18, 250, 1800), -2, 0.1, "paint blisters bubbling")
# thermometer
ev(B["thermo"] - 0.1, rise_tone(B["ninety"] - B["thermo"] + 0.1, 380, 1500, rng(90), 0.01), -12, 0, "thermometer rising")
ev(B["ninety"] - 0.03, ding(rng(91), 1760), -4, 0, "ding at ninety-one")
# egg
ev(B["cracks"], crack_egg(rng(100)), -4, -0.1, "egg cracks")
ev(B["cracks"] + 0.35, sizzle(0.6, rng(102), 1.0, 300), -6, 0, "egg hits the pan")
ev(B["fries"] - 0.05, ding(rng(103), 2093), -8, 0.1, "it actually fries")
# luckily / unluckily
ev(B["unluckily"] + 2.0, madd(G.whoa(rng(110), 150), 0.7 * G.whoa(rng(111), 210)), -8, -0.4, "stall vendor + passers-by yelp")
ev(B["unluckily"] + 2.3, sizzle(2.5, rng(112), 1.0, 90), -12, -0.4, "stall awning sizzling")
# explanation
for k, t0 in enumerate([fr(SH[13]["a"]) + 0.4, fr(SH[15]["a"]) + 0.4]):
    ev(t0, madd(rise_tone(1.4, 900, 2400, rng(120 + k)) * 0.6, G.whoosh(1.4, rng(122 + k), peak=0.7, f_lo=1500, f_hi=6000, width=0.5, tail=0.2, air=0.4)), -12, 0, "light rays sweep in")
ev(B["spoon"] - 0.05, madd(I.glock(I.m2f(84), 0.8, rng(125), 1.4), I.glock(I.m2f(88), 0.6, rng(126), 1.4)), -8, 0.2, "spoon pops up (twinkle)")
ev(B["squeezes"], rise_tone(1.1, 400, 1400, rng(127)), -14, 0, "light squeezed to a point")
ev(B["tiny"] - 0.1, madd(sizzle(0.8, rng(128), 1.0, 200), 0.5 * flash_hit(rng(129))[..., :ns(0.8)]), -8, 0, "leaf goes pfff")
# owners / fins / architect
ev(B["paid"] - 0.05, rustle(rng(130), 0.6), -12, 0.2, "cheque rustle")
for k in range(4):
    ev(B["fins"] + k * 0.38, clank(rng(140 + k), 1.0 - 0.1 * k), -10 - 2 * k, (-1) ** k * 0.4, "fins clanking on")
ev(B["architect"] - 0.05, rise_tone(0.6, 300, 220, rng(150), 0.04), -16, 0, "uh-oh")
# Vegas
ev(B["cooking"] - 0.05, sizzle(1.6, rng(160), 1.0, 160), -6, 0, "sunbathers sizzling")
ev(B["cooking"] + 0.35, G.oof(rng(161), "oof") if hasattr(G, "oof") else G.whoa(rng(161)), -12, -0.3, "ouch")
ev(B["pool"] + 0.25, G.whoa(rng(162), 200), -8, 0.1, "yelp as he leaps")
ev(B["pool"] + 0.55, G.splash_big(rng(163)), -2, 0, "splash into the pool")
sfx_all = sfx + beds * dbg(6)  # beds are set relative to the -6 dB event rule (not reduced)

# ================================================================ MUSIC (original, ~116 bpm, Bb major comic march)
BPM = 116.0
BEATS = 60.0 / BPM
mus = bus()
mr = rng(300)
m2f = I.m2f


def note(x, t, g=1.0, p=0.0):
    place(mus, (x * g) if np.ndim(x) == 2 else pan(x * g, p), t)


def bars(t0, t1):
    """bar start times between t0 and t1 on the global grid (bar = 4 beats)"""
    k0 = int(np.ceil(t0 / (4 * BEATS)))
    out = []
    t = k0 * 4 * BEATS
    while t < t1 - 1e-6:
        out.append(t); t += 4 * BEATS
    return out


# chords per bar (root midi, kind)
PROG = [(46, "M"), (51, "M"), (53, "M"), (46, "M"), (43, "m"), (51, "M"), (53, "7"), (46, "M")]
TRI = {"M": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 10]}
# theme (scale degrees as midi offsets from Bb4=70), 8th-note grid per bar: (step 0..7, midi, length in 8ths)
THEME = [
    [(0, 74, 1), (1, 77, 1), (2, 79, 2), (4, 77, 1), (5, 74, 1), (6, 72, 2)],
    [(0, 70, 1), (1, 72, 1), (2, 74, 2), (4, 75, 2), (6, 74, 2)],
    [(0, 72, 1), (1, 74, 1), (2, 76, 1), (3, 77, 1), (4, 79, 2), (6, 81, 2)],
    [(0, 82, 3), (3, 77, 1), (4, 74, 2), (6, 70, 2)],
]


def oompah(t, root, kind, vel=0.6, pah=True):
    note(I.brass(m2f(root - 12), BEATS * 0.8, vel, mr, "tuba"), t, 1.0)
    note(I.brass(m2f(root - 12 + 7), BEATS * 0.8, vel * 0.85, mr, "tuba"), t + 2 * BEATS, 1.0)
    if pah:
        for b in (1, 3):
            for iv in TRI[kind]:
                note(I.pluck(m2f(root + 12 + iv), vel * 0.5, mr, 0.35, 0.6), t + b * BEATS, 0.55, 0.25)


def drums(t, vel=0.5, fill=False):
    for b in range(4):
        note(I.brush(vel * (0.9 if b % 2 else 0.6), mr, 0.3), t + b * BEATS, 0.6, -0.2)
    if fill:
        for k in range(4):
            note(I.snare(vel * (0.5 + 0.12 * k), mr, 0.25), t + 3 * BEATS + k * BEATS / 4, 0.7, -0.1)


def theme_bar(t, i, vel=0.7, inst="glock", transpose=0):
    for step, m, ln in THEME[i % 4]:
        d = ln * BEATS / 2
        if inst == "glock":
            x = I.glock(m2f(m + transpose), vel, mr, max(0.6, d * 2))
        elif inst == "horn":
            x = I.brass(m2f(m - 12 + transpose), d * 0.9, vel, mr, "horn")
        else:
            x = I.pluck(m2f(m + transpose), vel, mr, max(0.4, d * 1.5), 0.7)
        note(x, t + step * BEATS / 2, 0.8, 0.15)


def section(t0, t1, k0=0, vel=0.6, mel=True, inst="glock", pah=True, fill_every=4):
    for k, t in enumerate(bars(t0, t1)):
        root, kind = PROG[(k + k0) % 8]
        oompah(t, root, kind, vel, pah)
        drums(t, vel * 0.8, fill=(k % fill_every == fill_every - 1))
        if mel:
            theme_bar(t, k + k0, vel + 0.1, inst)


def stinger(t, chord=(70, 74, 77), vel=0.8, kind="stab"):
    for m in chord:
        note(I.brass(m2f(m), 0.35, vel, mr, kind), t, 0.7)
    note(I.cymbal(0.4, mr, 1.0, 0.9), t, 0.4)


def wah_fall(t, start=58, steps=4):
    for k in range(steps):
        note(I.brass(m2f(start - k), BEATS * (0.9 if k < steps - 1 else 2.0), 0.7, mr, "horn", fall=0.0 if k < steps - 1 else -2.0), t + k * BEATS * 0.75, 0.9)


hook_end = fr(TL["FLASH_AT"])
# hook: low pad + rising tension, stab on the flash
note(I.pad([m2f(46), m2f(53), m2f(58)], hook_end, 0.5, mr, att=1.2, rel=0.3), 0.0, 0.7)
for k in range(8):
    note(I.pluck(m2f(58 + [0, 3, 5, 7, 8, 10, 12, 15][k]), 0.5, mr, 0.4, 0.8), 0.5 + k * 0.5, 0.6, 0.2)
stinger(hook_end - 0.02, (70, 74, 77, 82), 0.9)
# A: the City (to "comes back")
section(hook_end, B["back"] - 0.2, 0, 0.6)
# melt beats: sparse tiptoe plucks + a sad horn on each melt
for k, t in enumerate(bars(B["back"], B["thermo"])):
    root, kind = PROG[(k + 4) % 8]
    for b in range(4):
        note(I.pluck(m2f(root + (12 if b % 2 else 0)), 0.55, mr, 0.3, 0.5), t + b * BEATS, 0.7)
for t0, m in [(B["drooped"], 62), (B["slid"], 61), (B["bubbling"], 60)]:
    note(I.brass(m2f(m), 0.7, 0.6, mr, "soft", fall=-3.0), t0, 0.8, -0.2)
# B: thermometer + reporter (more energy)
section(B["thermo"], B["luckily"] - 0.1, 2, 0.68, inst="pluck")
stinger(B["ninety"], (72, 76, 79), 0.85)
stinger(B["fries"], (70, 74, 77, 82), 0.75)
# luckily (stop-time: a happy plink) / unluckily (wah-wah)
note(I.glock(m2f(82), 0.7, mr, 1.2), B["luckily"], 0.8)
note(I.glock(m2f(86), 0.6, mr, 1.2), B["luckily"] + BEATS / 2, 0.8)
section(B["luckily"] + 2 * BEATS, B["unluckily"] - 0.1, 4, 0.5, mel=False)
wah_fall(B["unluckily"], 58, 4)
section(B["unluckily"] + 3.2, fr(SH[13]["a"]), 6, 0.5, mel=False)
# explanation: wonder (vibes arpeggio over a pad)
exp0, exp1 = fr(SH[13]["a"]), fr(SH[16]["a"])
note(I.pad([m2f(51), m2f(58), m2f(62), m2f(67)], exp1 - exp0, 0.45, mr, att=0.8, rel=1.0), exp0, 0.6)
arp = [63, 67, 70, 74, 70, 67]
k = 0
t = exp0
while t < exp1 - 0.3:
    note(I.vibes(m2f(arp[k % 6] + (5 if t > fr(SH[14]["a"]) and t < fr(SH[15]["a"]) else 0)), 0.45, mr, 1.2), t, 0.6, 0.3 * np.sin(k))
    k += 1; t += BEATS / 2
# owners + fins: theme back with horns
section(exp1, B["architect"] - 0.4, 0, 0.66, inst="horn")
stinger(B["visor"], (70, 74, 77, 82), 0.8)
# architect: a held, suspicious chord
note(I.pad([m2f(49), m2f(55), m2f(58), m2f(64)], fr(SH[19]["a"]) - B["architect"] + 0.6, 0.5, mr, att=0.15, rel=0.5), B["architect"] - 0.2, 0.7)
note(I.timpani(m2f(41), 0.7, mr, 1.6), B["architect"] - 0.05, 0.6)
# Vegas: theme in a lazy, sunny variation, ends on the splash
section(fr(SH[19]["a"]), B["pool"] + 0.3, 0, 0.6, inst="pluck", fill_every=2)
stinger(B["pool"] + 0.55, (70, 74, 77, 82, 86), 1.0)
note(I.timpani(m2f(34), 0.9, mr, 2.0), B["pool"] + 0.55, 0.7)
mus[:, ns(DUR - 0.25):] *= np.linspace(1, 0, N - ns(DUR - 0.25))
# room
mus = mus + convolve_st(mus, make_ir(1.3, 5, hf=1.3)) * 0.18

# ================================================================ voice, ducking, mix
vx, vsr = read_wav(os.path.join(HERE, "../voice/voice.wav"))
assert vsr == SR, vsr
v = st(vx.mean(axis=0))[:, :N]
v = np.pad(v, ((0, 0), (0, max(0, N - v.shape[1]))))
spans, cur = [], None
for w in WORDS:
    if cur and w["s"] - cur[1] < 0.3: cur[1] = w["e"]
    else:
        if cur: spans.append(cur)
        cur = [w["s"], w["e"]]
spans.append(cur)
duck = np.zeros(N)
for a, b in spans:
    duck[max(0, ns(a - 0.08)):ns(b + 0.12)] = 1.0
from scipy.ndimage import uniform_filter1d
duck = np.clip(uniform_filter1d(duck, ns(0.12)), 0, 1)
# music ducks 7 dB under speech, SFX 3 dB
mus_d = mus * dbg(-7 * duck)
sfx_d = sfx_all * dbg(-3 * duck)
# reference levels: voice as recorded (~ -18 LUFS), music bed -26 then +3 dB, SFX -6 dB (rule)
v_l = integrated(v)
m_l = integrated(mus_d)
mus_g = mus_d * dbg((v_l - 9.5) - m_l) * dbg(3)
sfx_g = sfx_d * dbg(-6) * dbg(8)
mix = v + mus_g + sfx_g


def limiter(x, ceil_db=-1.0):
    peak = np.max(np.abs(x), axis=0)
    g = np.minimum(1.0, dbg(ceil_db) / np.maximum(peak, 1e-9))
    g = -uniform_filter1d(-g, ns(0.004)) if False else np.minimum.accumulate(g[::-1])[::-1] * 0 + g
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, ns(0.006))
    g = uniform_filter1d(g, ns(0.006))
    return x * g


target = -14.0
mix = mix * dbg(target - integrated(mix))
mix = limiter(mix, -1.8)
mix = fades(mix, 0.005, 0.25)
write_wav(os.path.join(HERE, "mix.wav"), mix)
os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
for name, x in [("voice", v), ("music", mus_g), ("sfx", sfx_g)]:
    write_wav(os.path.join(HERE, "stems", f"{name}.wav"), x * dbg(target - integrated(v + mus_g + sfx_g)))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(HERE, "mix.wav"), "-b:a", "192k",
                os.path.join(HERE, "../app/public/fry/mix.mp3")], check=True)
with open(os.path.join(HERE, "cues.md"), "w") as f:
    f.write(f"# Sound cues: The Skyscraper That Cooked a Car\nLength {DUR:.3f} s, 48 kHz. Integrated {integrated(mix):.1f} LUFS, true peak {true_peak(mix):.1f} dBTP.\n")
    f.write(f"Stems (relative): voice {integrated(v):.1f}, music {integrated(mus_g):.1f}, sfx {integrated(sfx_g):.1f} LUFS.\n\n| time | cue | dB |\n|---|---|---|\n")
    for t, nme, db in sorted(CUES):
        f.write(f"| {t:6.2f} | {nme} | {db:+.0f} |\n")
print("mix", round(integrated(mix), 2), "LUFS, TP", round(true_peak(mix), 2), "| voice", round(integrated(v), 1), "music", round(integrated(mus_g), 1), "sfx", round(integrated(sfx_g), 1), "| dur", mix.shape[1] / SR)
