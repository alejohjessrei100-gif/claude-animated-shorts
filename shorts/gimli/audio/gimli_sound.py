"""Sound for "The Gimli Glider" (29.9 s): synthesized SFX on every story beat, an original light score (Bb major,
112 bpm) that follows the picture, and the final mix with the voice.
Mix rule (SKILL.md): voice unchanged, music +3 dB and SFX -6 dB from the template's bed levels; music ducked under
speech; master to -14 LUFS integrated, true peak <= -1 dBTP; exact length 897 frames.
Run: python3 gimli_sound.py   (reads ../voice/voice.wav + words.json, writes mix.wav, stems/, cues.md)"""
import json, os
import numpy as np
from scipy import signal
from dsp import SR, ns, rng, lp, hp, bp, colored, smooth_noise, ramp, fades, pan, st, place, make_ir, convolve_st, integrated, \
    momentary_max, true_peak, dbg, read_wav, write_wav, modal, curve, widen
import instruments as I

HERE = os.path.dirname(os.path.abspath(__file__))
FPS, TOTAL = 30, 897
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
# beats (frames from story.ts / words.json)
B = dict(sputter=fr(72), pull=fr(84), flash=fr(168), engines=fr(212), quiet=fr(225), lucky=fr(243), gliders=fr(281), hobby=fr(300),
         unlucky=fr(315), family=fr(372), glides=fr(408), glide0=fr(406), collapse=fr(446), scrape=fr(474), slide0=fr(469), stop=fr(491),
         bbq=fr(515), explain=fr(537), kilo=fr(583), pounds=fr(645), takeoff=fr(663), off=fr(670), half=fr(697), punish0=fr(735),
         punished=fr(750), award0=fr(789), won=fr(805), award=fr(813))
R = rng(1983)


def buf():
    return np.zeros((2, N))


def env_ad(n, a, d):
    e = np.ones(n)
    ia = max(1, ns(a))
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:] = np.exp(-np.arange(n - ia) / SR / d)
    return e


def span(x, t0, t1, fin=0.15, fout=0.25):
    """keep x (stereo, full length) only between t0 and t1 with soft edges"""
    g = curve(N, [(0, 0), (t0, 0), (t0 + fin, 1), (t1 - fout, 1), (t1, 0), (DUR + 1, 0)])
    return x * g[None, :]


# ============================================================ SFX
def jet_bed(spool):
    """cruising jet: low rumble + broadband roar + fan whine (pitch follows spool 0..1)"""
    n = N
    rum = lp(colored(n, R, 2.0), 180) * 0.9
    roar = bp(colored(n, R, 1.0), 300, 2500) * 0.55
    ph = 2 * np.pi * np.cumsum(2300 * (0.55 + 0.45 * spool)) / SR
    whine = (np.sin(ph) + 0.4 * np.sin(2 * ph + 1)) * 0.05 * (0.4 + 0.6 * spool) * (1 + 0.1 * smooth_noise(n, R, 2))
    return widen((rum + roar) * spool + whine, R, amount=0.7)


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
    for k in range(6):  # sweeping band
        c0, c1 = int(k * n / 6), int((k + 1) * n / 6)
        f = lo + (hi - lo) * (k / 5) * (1 - abs(k / 5 - peak))
        out[c0:c1] = bp(x, max(60, f * 0.6), min(SR / 2.2, f * 1.6))[c0:c1]
    return out * e


def crowd(n, cheer):
    """murmuring crowd; `cheer` 0..1 (per sample) lifts it into a cheer"""
    base = bp(colored(n, R, 0.8), 250, 2600) * (0.6 + 0.4 * smooth_noise(n, R, 1.5))
    voices = np.zeros(n)
    for k in range(10):  # vowel-ish formant blobs
        f = R.uniform(350, 1100)
        voices += bp(colored(n, R, 0.5), f * 0.85, f * 1.15) * (0.5 + 0.5 * smooth_noise(n, R, R.uniform(1, 3)))
    return widen(base * (0.5 + cheer) + voices * 0.25 * (0.3 + cheer), R, amount=1.0)


def applause(n, dens=60):
    x = np.zeros(n)
    k = int(DUR * dens * 10)
    for t in R.integers(0, n - 400, k):
        x[t:t + 240] += hp(R.standard_normal(240), 900) * np.exp(-np.arange(240) / 40) * R.uniform(0.2, 1)
    return widen(lp(x, 7000), R, amount=1.0)


def kart(t_pass, v=17.0, dist=1.6, dur=2.4):
    """two-stroke kart buzzing past the lens with doppler"""
    n = ns(dur)
    t = np.arange(n) / SR - dur / 2
    rr = np.sqrt((v * t) ** 2 + dist ** 2)
    radial = v * v * t / rr
    f = 95 * 343 / (343 + radial)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 18)) * (1 + 0.3 * np.sign(np.sin(ph * 0.5)))
    amp = 1 / (rr + 0.8)
    x = lp(saw, 2500) * amp
    p = np.clip(-t * 1.2, -1, 1)
    return np.stack([x * np.sqrt(0.5 * (1 - p)), x * np.sqrt(0.5 * (1 + p))]), t_pass - dur / 2


def sfx():
    S = buf()
    t = np.arange(N) / SR
    # --- engines: cruise (shots 1-2, 4-5, 15), spool-down on "engines" -> silent on "quiet" ---
    spool = np.zeros(N)
    on = ((t < fr(130)) | ((t >= fr(168)) & (t < fr(226))) | ((t >= fr(697)) & (t < fr(735))))
    spool[on] = 1.0
    dn = (t >= B["engines"]) & (t < B["quiet"])
    spool[dn] = np.clip(1 - (t[dn] - B["engines"]) / (B["quiet"] - B["engines"]), 0, 1) ** 1.6
    spool[(t >= B["quiet"]) & (t < fr(697))] = 0
    sm = signal.sosfiltfilt(signal.butter(1, 12 / (SR / 2), output="sos"), spool)
    place(S, jet_bed(sm) * 0.16, 0)
    # high wind after the engines die (cockpit / glide) and in the glide-in
    wind = widen(bp(colored(N, R, 1.5), 150, 1800) * (0.6 + 0.4 * smooth_noise(N, R, 0.8)), R)
    place(S, span(wind * 0.07, B["quiet"] - 0.05, fr(315)) + span(wind * 0.11, fr(406), fr(441), 0.3, 0.1), 0)
    # sputter: three coughs on "fuel"
    for k, dt in enumerate([0.0, 0.17, 0.42]):
        c = burst(0.22, 60, 900, 0.004, 0.05, 1.5) * 1.4 + burst(0.22, 800, 5000, 0.001, 0.01) * 0.5
        place(S, pan(c, -0.4 + 0.4 * k), B["sputter"] + dt, 0.55)
    place(S, pan(burst(0.25, 60, 800, 0.004, 0.06, 1.5), 0.3), B["engines"] + 0.25, 0.4)  # last cough
    place(S, pan(whoosh(1.4, 150, 2200, 0.55), -0.2), B["pull"] - 0.1, 0.22)  # pull-back
    # flash shimmer
    sw = whoosh(0.7, 800, 8000, 0.9) * 0.4
    place(S, widen(sw, R), B["flash"] - 0.62, 0.35)
    for k, m in enumerate([82, 86, 89, 94]):
        place(S, pan(I.glock(I.m2f(m), 0.5, R, 1.2), -0.5 + k / 3), B["flash"] - 0.04 + k * 0.035, 0.12)
    # cockpit: master caution chimes, cabin hum
    for k in range(5):
        tc = B["quiet"] + 0.06 + k * 0.62
        place(S, pan(clang(1320, 0.5, 0.5, (1, 2.01)) * 0.35, 0.1), tc, 0.11)
        place(S, pan(clang(990, 0.5, 0.5, (1, 2.01)) * 0.35, 0.1), tc + 0.2, 0.11)
    # thought bubble: rising blip on "gliders"
    n = ns(0.18); tb = np.arange(n) / SR
    blip = np.sin(2 * np.pi * np.cumsum(500 + 1400 * tb / 0.18) / SR) * env_ad(n, 0.004, 0.05)
    place(S, pan(blip, -0.3), B["gliders"] - 0.05, 0.16)
    # race day: crowd + karts (shot 8), crowd gasp on "glides"
    cheer = curve(N, [(0, 0.2), (B["family"] - 0.3, 0.3), (B["family"] + 0.4, 0.8), (fr(406), 0.6), (B["glides"] + 0.2, 1.0), (fr(441), 0.4)])
    place(S, span(crowd(N, cheer) * 0.09, B["unlucky"] - 0.15, fr(441), 0.2, 0.2), 0)
    for f_pass, v, d in [(400, 9, 1.0), (412, 9, 2.2), (422, 10, 1.6)]:  # karts pass the low lens (world.ts KARTS)
        kx, t0 = kart(fr(f_pass), v, dist=d)
        place(S, kx, t0, 0.33)
    for f0, v in [(352, 15)]:
        kx, t0 = kart(fr(f0) + 8 / v, v, dist=7)
        place(S, kx, t0, 0.18)
    gasp = bp(colored(ns(0.9), R, 0.4), 600, 3500) * np.concatenate([np.linspace(0, 1, ns(0.08)), np.exp(-np.arange(ns(0.82)) / SR / 0.3)])
    place(S, widen(gasp, R), B["glides"] - 0.05, 0.14)
    # collapse: metal crunch + thud; scrape until the stop; a thump on "stop"
    place(S, pan(clang(140, 1.0, 1.0) * 0.5, -0.1), B["collapse"], 0.55); place(S, pan(burst(0.6, 80, 4000, 0.001, 0.12, 1.0) * 0.9, -0.1), B["collapse"], 0.55)
    place(S, st(lp(burst(0.5, 30, 200, 0.002, 0.15, 2.0), 200)), B["collapse"], 0.9)
    n = ns(B["stop"] + 0.2 - B["collapse"])
    ts = np.arange(n) / SR
    grind = bp(colored(n, R, 0.7), 900, 5200) * (0.6 + 0.4 * np.abs(smooth_noise(n, R, 18))) + lp(colored(n, R, 2.0), 160) * 0.8
    gk = np.clip(1 - ts / (B["stop"] - B["collapse"]), 0, 1) ** 0.6
    place(S, widen(grind * gk * 0.5, R), B["collapse"] + 0.02, 0.45)
    place(S, st(lp(burst(0.7, 25, 180, 0.003, 0.2, 2.0), 180)) * 1.1, B["stop"], 0.8); place(S, st(clang(95, 0.8, 0.6)) * 0.3, B["stop"], 0.8)
    # grill sizzle around the stop, a comic "ding" on "barbecues"
    sizzle = hp(colored(N, R, 0.0), 3000) * (0.4 + 0.6 * (R.random(N) < 0.02)) * 0.5
    place(S, span(widen(lp(sizzle, 9000), R) * 0.05, fr(469), fr(537), 0.3, 0.3), 0)
    place(S, pan(I.glock(I.m2f(91), 0.8, R, 1.4), 0.2), B["bbq"] - 0.03, 0.17)
    # apron (Montreal): airport hum, big weight clonk on "kilograms", little tink on "pounds"
    hum = widen(bp(colored(N, R, 1.2), 200, 3500) * 0.3 + np.sin(2 * np.pi * 1850 * t) * 0.01, R)
    place(S, span(hum * 0.06, B["explain"] - 0.1, fr(663)), 0)
    place(S, pan(clang(70, 1.4, 1.0, (1, 2.1, 3.3)) * 0.6, -0.2), B["kilo"] - 0.03, 0.55); place(S, pan(lp(burst(0.4, 30, 300, 0.002, 0.12, 2.0), 300) * 0.9, -0.2), B["kilo"] - 0.03, 0.55)
    place(S, pan(whoosh(0.35, 400, 3000, 0.8), -0.3), B["kilo"] - 0.32, 0.2)
    place(S, pan(clang(1750, 0.7, 0.7, (1, 2.76, 5.4)) * 0.6, 0.3), B["pounds"] - 0.03, 0.22)
    # takeoff roar
    roar = jet_bed(np.clip((t - B["takeoff"]) / 0.9, 0, 1)) * 1.0
    place(S, span(roar * 0.24, B["takeoff"] - 0.05, fr(697), 0.4, 0.08), 0)
    # wing tank slosh
    n = ns(fr(735) - fr(697))
    sl = lp(colored(n, R, 1.0), 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.38 * np.arange(n) / SR)) ** 2
    place(S, pan(sl * 0.4, -0.3), fr(697), 0.3)
    # hangar: finger-wag swishes on "punished", a low disapproving tom
    for k in range(4):
        place(S, pan(whoosh(0.18, 600, 4000, 0.5) * 0.5, 0.4 if k % 2 else 0.2), B["punished"] + k * 0.225, 0.14)
    # award: popper on "won", crowd cheer + applause to the end
    place(S, pan(burst(0.08, 400, 8000, 0.0005, 0.02) * 2.0, -0.2), B["won"] - 0.03, 0.5)
    crk = np.zeros(ns(0.8))
    for tt_ in R.uniform(0, 0.75, 40):
        i = ns(tt_); crk[i:i + 120] += hp(R.standard_normal(120), 3000) * np.exp(-np.arange(120) / 25)
    place(S, widen(crk * 0.35, R), B["won"] + 0.02, 0.4)
    ch2 = curve(N, [(0, 0), (B["award0"], 0.3), (B["won"], 1.0), (DUR, 0.8)])
    place(S, span(crowd(N, ch2) * 0.08 + applause(N) * 0.05 * ch2[None, :], B["award0"] - 0.1, DUR, 0.3, 0.3), 0)
    return S


# ============================================================ music
BPM = 112.0
Q = 60 / BPM


def m2f(m):
    return I.m2f(m)


def music():
    M = buf()
    r = rng(7)
    def note(fn, t0, gain=1.0, p=0.0):
        place(M, pan(fn, p) if np.ndim(fn) == 1 else fn, t0, gain)
    # ---- A: hook (0 .. flash) bouncy pizzicato + glock theme, Bb major ----
    prog = [(46, [58, 62, 65]), (41, [57, 60, 65]), (43, [58, 62, 67]), (39, [58, 63, 67])]  # Bb F Gm Eb (bass midi, triad)
    theme = [70, 74, 77, 74, 75, 74, 72, 70, 69, 72, 77, 72, 74, 0, 70, 0]
    t0 = 0.05
    beats = int((B["flash"] - 0.1 - t0) / Q)
    for k in range(beats):
        tk = t0 + k * Q
        bass, tri = prog[(k // 4) % 4]
        if k % 2 == 0: note(I.pluck(m2f(bass), 0.8, r, 0.6), tk, 0.42, -0.2)
        else: note(I.pluck(m2f(tri[k % 3] - 12), 0.55, r, 0.4), tk, 0.24, 0.2)
        m = theme[k % 16]
        if m: note(I.glock(m2f(m), 0.6, r, 1.0), tk, 0.13, 0.25)
        note(I.brush(0.35, r, 0.25), tk + Q / 2, 0.11, 0.0)
    note(st(I.cymbal(0.5, r, 2.0)) * np.linspace(0, 1, ns(2.0)) ** 2, B["flash"] - 1.9, 0.25)  # swell into the flash
    # ---- B: after the flash, light pulse, then it all winds down on the engines (tape-stop) ----
    for k in range(int((B["engines"] - B["flash"]) / Q) + 1):
        tk = B["flash"] + k * Q
        bass, tri = prog[(k // 4) % 4]
        note(I.pluck(m2f(bass), 0.7, r, 0.5), tk, 0.34, -0.2)
    down = I.pad([m2f(58), m2f(62), m2f(65)], B["quiet"] - B["engines"], 0.5, r, 0.05, 0.25)
    dn = down.shape[1]
    warp = np.cumsum(np.linspace(1.0, 0.25, dn)); warp = warp / warp[-1] * (dn - 1)  # pitch falls like a tape stop
    down = np.stack([np.interp(warp, np.arange(dn), down[c]) for c in range(2)]) * np.linspace(1, 0, dn) ** 1.5
    note(down, B["engines"], 0.5)
    # ---- C: "Luckily": playful glock arpeggio climbing (hobby!) ----
    arp = [65, 70, 74, 77, 74, 70, 72, 77, 81, 77, 82, 86]
    for k, m in enumerate(arp):
        note(I.glock(m2f(m), 0.55 + 0.03 * k, r, 1.0), B["lucky"] + 0.02 + k * Q / 2, 0.12, -0.3 + 0.05 * k)
    note(I.pad([m2f(58), m2f(65), m2f(70)], B["unlucky"] - B["lucky"] - 0.3, 0.35, r, 0.4, 0.4), B["lucky"], 0.28)
    # ---- D: "Unluckily": comic oom-pah tuba + snare for race day ----
    t = B["unlucky"]
    for k in range(int((fr(406) - t) / (Q / 1.0))):
        tk = t + k * Q
        bass, tri = prog[(k // 2) % 4]
        if k % 2 == 0: note(I.brass(m2f(bass - 12), Q * 0.55, 0.75, r, "tuba"), tk, 0.33, -0.15)
        else:
            for m in tri: note(I.brass(m2f(m - 12), Q * 0.35, 0.45, r, "horn"), tk, 0.06, 0.25)
        note(I.snare(0.35 + 0.2 * (k % 2), r, 0.2), tk + Q / 2, 0.1, 0.1)
    # ---- E: glide in: timpani roll + rising pad; cut on the collapse; ta-da on "barbecues" ----
    for (tk, v) in I.snare_roll(fr(406), B["collapse"], 0.15, 0.7, r, 22):
        note(I.timpani(m2f(41), v * 0.6, r, 0.5), tk, 0.12)
    note(I.pad([m2f(53), m2f(60), m2f(65)], B["collapse"] - fr(406), 0.5, r, 0.6, 0.05, warm=1400), fr(406), 0.3)
    note(st(I.cymbal(0.9, r, 2.6)), B["collapse"], 0.28)
    note(I.brass(m2f(34), 0.9, 0.9, r, "tuba", fall=-5), B["stop"], 0.32)  # a low "bwomp" on the stop
    for k, m in enumerate([70, 74, 77, 82]):
        note(I.pluck(m2f(m), 0.7, r, 0.8), B["bbq"] + 0.03 + k * 0.07, 0.2, -0.2 + 0.15 * k)
    # ---- F: explanation: pizzicato walk + vibes, tuba drop on "kilograms", high tink on "pounds" ----
    walk = [46, 50, 53, 55, 51, 50, 48, 45]
    for k in range(int((fr(735) - B["explain"]) / Q)):
        tk = B["explain"] + 0.04 + k * Q
        note(I.pluck(m2f(walk[k % 8]), 0.7, r, 0.5), tk, 0.3, -0.2)
        if k % 4 == 0: note(I.vibes(m2f([70, 69, 67, 69][(k // 4) % 4]), 0.4, r, 1.6), tk, 0.12, 0.3)
    note(I.brass(m2f(34), 0.8, 0.85, r, "tuba"), B["kilo"], 0.25)
    note(I.glock(m2f(94), 0.6, r, 1.0), B["pounds"], 0.08)
    # ---- G: "punished": sad trombone, three falling notes ----
    for k, m in enumerate([58, 57, 56]):
        note(I.brass(m2f(m - 12), 0.42 if k < 2 else 0.9, 0.7, r, "horn", fall=-1.2 if k == 2 else 0), B["punished"] - 0.1 + k * 0.45, 0.22)
    # ---- H: award fanfare to the end ----
    fan = [(0.0, 58, 0.3), (0.3, 62, 0.3), (0.6, 65, 0.3), (0.9, 70, 0.9), (1.9, 69, 0.3), (2.2, 70, 0.3), (2.5, 74, 1.4)]
    for dt, m, d in fan:
        note(I.brass(m2f(m), d, 0.85, r, "stab" if d < 0.5 else "horn"), B["won"] + dt, 0.2, 0.15)
        note(I.brass(m2f(m - 12), d, 0.6, r, "horn"), B["won"] + dt, 0.1, -0.15)
    note(st(I.cymbal(0.8, r, 2.4)), B["won"], 0.24)
    end = DUR - (B["won"] + 2.5)
    note(I.pad([m2f(46), m2f(58), m2f(62), m2f(65), m2f(70)], end - 0.2, 0.6, r, 0.2, 0.3), B["won"] + 2.5, 0.35)
    for k in range(int((DUR - B["award0"]) / Q)):
        tk = B["award0"] + k * Q
        bass, tri = prog[(k // 4) % 4]
        if B["won"] - 0.2 < tk < DUR - 0.6 and k % 2 == 0: note(I.timpani(m2f(bass - 2 if bass > 43 else bass), 0.5, r, 0.6), tk, 0.18)
        note(I.glock(m2f(tri[k % 3] + 12), 0.4, r, 0.9), tk, 0.07, 0.3)
    ir = make_ir(1.1, 3)
    wet = convolve_st(M, ir)[:, :N]
    return M + 0.22 * wet


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


def limiter(x, ceil_db=-1.2, look=0.004, rel=0.08):
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
    # bed levels relative to the voice: template music -14 LU (+3 dB rule -> -11), SFX events -4 LU momentary (-6 rule -> -10)
    m = m * duck(speech_spans(words))[None, :]
    m = m * dbg((Lv - 9.0) - integrated(m))  # bed after ducking: template -12 LU under the voice, +3 dB rule
    s = s * dbg((Lv + 3.0) - momentary_max(s)) * dbg(-6.0)  # loudest SFX hit: template +3 LU momentary, -6 dB rule
    mix0 = v + m + s
    G = -14.0 - integrated(mix0)
    for _ in range(6):
        y, g = limiter(mix0 * dbg(G))
        L = integrated(y)
        if abs(L + 14.0) < 0.05: break
        G += -14.0 - L
    y = fades(y, 0.0, 0.03)
    os.makedirs(os.path.join(HERE, "stems"), exist_ok=True)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    for name, x in [("voice", v), ("music", m), ("sfx", s)]: write_wav(os.path.join(HERE, "stems", name + ".wav"), x * dbg(G))
    rows = [f"- Integrated **{integrated(y):.1f} LUFS**, true peak **{true_peak(y):.1f} dBTP**, max limiter GR {-20 * np.log10(g.min()):.1f} dB",
            f"- Stems at mix gain: voice {integrated(v * dbg(G)):.1f}, music {integrated(m * dbg(G)):.1f}, sfx {integrated(s * dbg(G)):.1f} LUFS",
            f"- Length {y.shape[1] / SR:.4f} s ({TOTAL} frames at {FPS} fps), 48 kHz stereo 24-bit"]
    cues = ["# Gimli Glider: sound cues", "", *rows, "", "| beat | time (s) | sound |", "|---|---|---|"] + \
        [f"| {k} | {t:.2f} | |" for k, t in B.items()]
    open(os.path.join(HERE, "cues.md"), "w").write("\n".join(cues) + "\n")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
