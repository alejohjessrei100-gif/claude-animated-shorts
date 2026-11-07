"""Sound for "Why Toast Lands Butter-Side Down" (44.5 s): synthesized SFX on every story beat, an original light score (Bb major,
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
FPS, TOTAL = 30, 1335
DUR = TOTAL / FPS
N = ns(DUR)
fr = lambda f: f / FPS
# beats (frames from story.ts / words.json)
B = dict(down=fr(71), tall=fr(98), lab=fr(126), robert=fr(170), pushing=fr(196), off=fr(228), over1=fr(255), over2=fr(276),
         colleagues=fr(292), lost=fr(318), line=fr(338), then=fr(388), happening=fr(412), wait=fr(431), butter=fr(449), nope=fr(498),
         class_=fr(513), tenK=fr(578), some=fr(622), letter=fr(642), drop11=fr(749), see=fr(764), tips=fr(786), spin=fr(829),
         floor=fr(940), ever=fr(956), coin=fr(977), early=fr(986), same=fr(1004), giantTable=fr(1025), tall3=fr(1112), tables=fr(1130),
         two=fr(1201), knock=fr(1250), swat=fr(1272), land17=fr(1288), giant=fr(1316), street=fr(1293))
# every slice landing (frames), from story.ts DROPS (lands = splat)
SPLATS = [71, 210, 242, 260, 256, 262, 268, 277, 283, 289, 940] + [540 + k * 5 + (k % 3) * 4 for k in range(14)]
R = rng(1995)


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


def splat(big=1.0):
    """buttered toast hitting a floor: a soft wet slap + a little crumb tick"""
    n = ns(0.35)
    t = np.arange(n) / SR
    body = lp(colored(n, R, 1.5), 900) * np.exp(-t / 0.045) * 1.2
    wet = bp(colored(n, R, 0.5), 1200, 4500) * np.exp(-t / 0.02) * 0.6
    thud = np.sin(2 * np.pi * (140 - 60 * t / 0.35) * t) * np.exp(-t / 0.05) * 0.6
    return (body + wet + thud) * big


def crunch(dur=0.22):
    n = ns(dur)
    x = np.zeros(n)
    for k in range(9):
        i = int(R.uniform(0, n - ns(0.02)))
        x[i:i + ns(0.02)] += hp(R.standard_normal(ns(0.02)), 1500) * np.exp(-np.arange(ns(0.02)) / SR / 0.004) * R.uniform(0.3, 1)
    return x


def chime(m, vel=0.6):
    return I.glock(I.m2f(m), vel, R, 1.2)


def crowd(n, cheer):
    base = bp(colored(n, R, 0.8), 300, 3000) * (0.6 + 0.4 * smooth_noise(n, R, 2.5))
    voices = np.zeros(n)
    for k in range(10):
        f = R.uniform(500, 1500)  # kids: higher formants
        voices += bp(colored(n, R, 0.5), f * 0.85, f * 1.15) * (0.5 + 0.5 * smooth_noise(n, R, R.uniform(1.5, 4)))
    return widen(base * (0.5 + cheer) + voices * 0.3 * (0.3 + cheer), R, amount=1.0)


def sfx():
    S = buf()
    t = np.arange(N) / SR
    # ---- room tones ----
    birds = np.zeros(N)
    for k in range(int(DUR * 1.5)):
        tb = R.uniform(0, DUR)
        n = ns(0.12); tt_ = np.arange(n) / SR
        f0 = R.uniform(2600, 4200)
        chirp = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * 18 * tt_)) / SR) * np.exp(-((tt_ - 0.06) / 0.03) ** 2)
        i = ns(tb); birds[i:i + n] += chirp[: max(0, min(n, N - i))]
    kitchen_day = span(widen(birds * 0.05, R), 0, fr(126), 0.05, 0.3) + span(widen(birds * 0.05, R), fr(956), fr(1293), 0.3, 0.3)
    place(S, kitchen_day, 0)
    hum = widen(lp(colored(N, R, 1.8), 250) * 0.5 + np.sin(2 * np.pi * 100 * t) * 0.02, R)
    place(S, span(hum * 0.05, fr(122), fr(517)), 0)
    for k in range(int((fr(517) - fr(126)) / 0.5)):  # the lab clock
        place(S, pan(clang(2400 if k % 2 else 2000, 0.06, 0.4, (1, 2.7)) * 0.4, 0.5), fr(126) + k * 0.5, 0.06)
    place(S, span(hum * 0.035, fr(760), fr(960)), 0)  # night kitchen
    # ---- every landing: splat + pow ----
    for k, f0 in enumerate(SPLATS):
        big = 1.0 if f0 in (71, 940) else 0.55
        place(S, pan(splat(big), R.uniform(-0.3, 0.3)), fr(f0), 0.5 if big == 1.0 else 0.32)
    # slow-mo slides before the hero splats: a low scrape
    for a, b in [(0, fr(42)), (fr(735), fr(786)), (fr(860), fr(910))]:
        n = ns(b - a)
        scr = bp(colored(n, R, 1.0), 300, 1500) * 0.4 * np.linspace(0.3, 1, n)
        place(S, pan(scr, -0.1), a, 0.12)
    # the hook tumble in slow motion: a deep whoosh
    place(S, pan(whoosh(1.0, 80, 900, 0.7), 0.1), fr(42), 0.35)
    # ---- lab: pushes, laughs (ha-ha bursts), the "?" boing, the scale wobble + ding on "Nope" ----
    for f0 in (196, 228, 246, 256, 262, 268, 277, 283, 289):
        place(S, pan(whoosh(0.22, 400, 3000, 0.4) * 0.6, 0.2), fr(f0) - 0.05, 0.18)
    for k in range(7):  # colleagues laughing: short voiced bursts
        n = ns(0.11); tt_ = np.arange(n) / SR
        ha = np.sin(2 * np.pi * (230 + 30 * (k % 2)) * tt_) * 0.5 + bp(colored(n, R, 0.5), 800, 2400) * 0.5
        ha *= np.sin(np.pi * tt_ / 0.11) ** 2
        place(S, pan(ha, 0.4), B["colleagues"] + 0.15 + k * 0.16, 0.12)
    n = ns(0.4); tb_ = np.arange(n) / SR
    boing = np.sin(2 * np.pi * np.cumsum(300 + 500 * np.exp(-tb_ / 0.08) * np.cos(2 * np.pi * 9 * tb_)) / SR) * np.exp(-tb_ / 0.15)
    place(S, pan(boing, 0.2), B["butter"] - 0.03, 0.14)
    place(S, pan(clang(1600, 0.8, 0.7, (1, 2.76, 5.4)) * 0.5, 0.1), B["nope"] - 0.02, 0.22)
    # ---- classroom: kids' chatter + laughter, marker squeak, the B slice lands (dry thump), a gasp ----
    cheer = curve(N, [(0, 0.3), (B["tenK"], 0.9), (fr(622), 0.4), (fr(760), 0.4)])
    place(S, span(crowd(N, cheer) * 0.08, B["class_"] - 0.1, fr(764), 0.25, 0.2), 0)
    for k in range(5):
        n = ns(0.16); tt_ = np.arange(n) / SR
        sq = np.sin(2 * np.pi * np.cumsum(1800 + 500 * np.sin(2 * np.pi * 7 * tt_)) / SR) * np.sin(np.pi * tt_ / 0.16) * 0.25
        place(S, pan(sq, 0.15), B["letter"] + k * 0.2, 0.1)
    place(S, pan(lp(burst(0.3, 60, 1200, 0.002, 0.05, 1.5), 1200), 0.0), B["drop11"], 0.45)
    gasp = bp(colored(ns(0.6), R, 0.4), 900, 4500) * np.concatenate([np.linspace(0, 1, ns(0.06)), np.exp(-np.arange(ns(0.54)) / SR / 0.2)])
    place(S, widen(gasp, R), B["drop11"] + 0.05, 0.12)
    # ---- explanation: a slow whoosh as it spins ----
    place(S, pan(whoosh(1.4, 100, 1400, 0.5), -0.2), B["tips"], 0.22)
    place(S, pan(whoosh(1.0, 100, 1400, 0.5), 0.2), fr(905), 0.2)
    # ---- coin: flick ting, spinning shimmer, slap catch ----
    place(S, pan(clang(3200, 0.6, 0.8, (1, 2.4, 4.1)) * 0.5, 0.2), B["coin"] - 0.28, 0.2)
    n = ns(0.7); tc_ = np.arange(n) / SR
    shimmer = np.sin(2 * np.pi * 5200 * tc_) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 13 * tc_))) * np.exp(-tc_ / 0.4) * 0.15
    place(S, pan(shimmer, 0.2), B["coin"] - 0.2, 0.1)
    place(S, pan(burst(0.12, 300, 3000, 0.001, 0.025, 0.8), 0.15), B["early"], 0.35)
    # ---- butter-up sparkles (3 m table, the swat) ----
    for f0 in (1111, 1288):
        for k, m in enumerate([84, 88, 91, 96]): place(S, pan(chime(m, 0.5), -0.4 + 0.25 * k), fr(f0) + k * 0.05, 0.08)
        place(S, pan(lp(burst(0.25, 60, 900, 0.002, 0.04, 1.5), 900), 0.0), fr(f0), 0.2)
    # ladder creak in the 3 m table shot
    n = ns(0.6); creak = bp(colored(n, R, 0.3), 500, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * np.arange(n) / SR)) * np.exp(-np.arange(n) / SR / 0.3)
    place(S, pan(creak, 0.3), fr(1030), 0.08)
    # ---- the swat ----
    place(S, pan(whoosh(0.3, 600, 6000, 0.35), -0.3), B["swat"] - 0.06, 0.4)
    place(S, pan(burst(0.06, 500, 5000, 0.0005, 0.012, 0.5), -0.2), B["swat"], 0.4)
    # ---- the giant: ground thump as we arrive, crunchy chomps ----
    place(S, st(lp(burst(0.8, 25, 160, 0.003, 0.25, 2.0), 160)), B["street"] + 0.1, 0.7)
    for k in range(5):
        place(S, pan(crunch(), 0.0), B["giant"] - 0.25 + k * 0.25, 0.35)
    birds2 = span(widen(birds * 0.06, R), B["street"], DUR, 0.2, 0.05)
    place(S, birds2, 0)
    return S


# ============================================================ music (original, F major, 120 bpm)
BPM = 120.0
Q = 60 / BPM


def m2f(m):
    return I.m2f(m)


def music():
    M = buf()
    r = rng(11)
    def note(fn, t0, gain=1.0, p=0.0):
        place(M, pan(fn, p) if np.ndim(fn) == 1 else fn, t0, gain)
    F_, C_, Dm, Bb = (41, [53, 57, 60]), (36, [52, 55, 60]), (38, [53, 57, 62]), (34, [53, 58, 62])
    prog = [F_, C_, Dm, Bb]
    theme = [72, 0, 69, 72, 74, 72, 69, 0, 67, 69, 72, 0, 65, 0, 67, 0]
    # A: kitchen hook (0 .. 4.2 s): staccato pizzicato + glock theme; the splat stops it dead for half a beat
    for k in range(int(fr(124) / (Q / 2))):
        tk = 0.02 + k * Q / 2
        if abs(tk - B["down"]) < 0.25: continue
        bass, tri = prog[(k // 8) % 4]
        if k % 2 == 0: note(I.pluck(m2f(bass), 0.8, r, 0.5), tk, 0.36, -0.2)
        m = theme[k % 16]
        if m: note(I.glock(m2f(m), 0.55, r, 0.8), tk, 0.11, 0.25)
    # B: night lab (4.2 .. 17.2 s): mysterious vibes + soft pizz walk, with a little pause on "Nope"
    walk = [41, 45, 48, 50, 46, 45, 43, 40]
    for k in range(int((fr(513) - fr(126)) / Q)):
        tk = fr(126) + k * Q
        if B["nope"] - 0.3 < tk < B["nope"] + 0.35: continue
        note(I.pluck(m2f(walk[k % 8]), 0.6, r, 0.5), tk, 0.26, -0.2)
        if k % 2 == 0: note(I.vibes(m2f([65, 69, 72, 69, 67, 70, 74, 70][(k // 2) % 8] + 12), 0.4, r, 1.4), tk, 0.1, 0.3)
    # C: classroom (17.1 .. 25.5 s): bouncy oom-pah with snare
    for k in range(int((fr(764) - fr(513)) / (Q / 2))):
        tk = fr(513) + k * Q / 2
        bass, tri = prog[(k // 4) % 4]
        if k % 2 == 0: note(I.brass(m2f(bass), Q * 0.4, 0.7, r, "tuba"), tk, 0.24, -0.15)
        else:
            for m in tri: note(I.brass(m2f(m), Q * 0.25, 0.4, r, "horn"), tk, 0.04, 0.25)
        if k % 4 == 2: note(I.snare(0.4, r, 0.2), tk, 0.08)
        m = theme[k % 16]
        if m and k % 2 == 0: note(I.glock(m2f(m + 12), 0.5, r, 0.6), tk, 0.08, 0.3)
    # D: explanation (25.5 .. 31.9 s): a soft thinking pad + slow tick, ends on the splat
    note(I.pad([m2f(53), m2f(60), m2f(65), m2f(69)], fr(940) - fr(764), 0.4, r, 0.6, 0.3, warm=1200), fr(764), 0.32)
    for k in range(int((fr(940) - fr(764)) / Q)):
        note(I.pluck(m2f(77 if k % 2 else 72), 0.4, r, 0.3), fr(764) + k * Q, 0.06, 0.3)
    # E: coin + giant table + tables (31.9 .. 42.6 s): the theme again, brighter, a step up on "three metres"
    for k in range(int((fr(1290) - fr(956)) / (Q / 2))):
        tk = fr(956) + k * Q / 2
        bass, tri = prog[(k // 8) % 4]
        up = 2 if tk > B["tall3"] - 0.1 else 0
        if k % 2 == 0: note(I.pluck(m2f(bass + up), 0.8, r, 0.5), tk, 0.32, -0.2)
        m = theme[k % 16]
        if m: note(I.glock(m2f(m + up), 0.55, r, 0.8), tk, 0.1, 0.25)
        if k % 8 == 4: note(I.brush(0.4, r, 0.3), tk, 0.08)
    # F: the giant: big brass tutti + timpani, final chord to the end
    for dt, m in [(0.0, 53), (0.25, 57), (0.5, 60), (0.75, 65)]:
        note(I.brass(m2f(m), 0.3 if dt < 0.75 else 1.0, 0.85, r, "stab" if dt < 0.75 else "horn"), B["street"] + dt, 0.18, 0.1)
        note(I.brass(m2f(m - 12), 0.3 if dt < 0.75 else 1.0, 0.7, r, "tuba"), B["street"] + dt, 0.12, -0.1)
    note(I.timpani(m2f(41), 0.8, r, 1.6), B["street"], 0.3)
    note(st(I.cymbal(0.6, r, 2.0)), B["giant"], 0.2)
    note(I.pad([m2f(41), m2f(53), m2f(57), m2f(60), m2f(65)], DUR - B["giant"] - 0.1, 0.55, r, 0.15, 0.2), B["giant"], 0.3)
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
    cues = ["# Gimli Glider: sound cues", "", *rows, "", "| beat | time (s) | sound |", "|---|---|---|"] + \
        [f"| {k} | {t:.2f} | |" for k, t in B.items()]
    open(os.path.join(HERE, "cues.md"), "w").write("\n".join(cues) + "\n")
    print("\n".join(rows))


if __name__ == "__main__":
    main()
