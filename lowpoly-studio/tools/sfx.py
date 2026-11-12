"""Sound effects generated from code. One-shots return a mono array; ambiences take a length and loop-free fill it."""
import numpy as np
from scipy import signal

SR = 44100


def _t(s):
    return np.arange(int(s * SR)) / SR


def _bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [max(lo, 10) / (SR / 2), min(hi, SR * .45) / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def _lp(x, fc):
    b, a = signal.butter(2, fc / (SR / 2))
    return signal.lfilter(b, a, x)


def _n(rng, s):
    return rng.normal(0, 1, int(s * SR))


def _norm(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-9) * peak


def _sweep(t, f0, f1):
    return np.sin(2 * np.pi * np.cumsum(f0 + (f1 - f0) * t / t[-1]) / SR)


# ------------------------------------------------------------------ one-shots
def whoosh(r):
    t = _t(.7)
    return _norm(_bp(_n(r, .7), 300, 2600) * np.sin(np.pi * t / t[-1]) ** 2)


def thud(r):
    t = _t(.5)
    return _norm(np.sin(2 * np.pi * (46 * t + 9 * (1 - np.exp(-t * 20)))) * np.exp(-t * 9) + _lp(_n(r, .5), 500) * np.exp(-t * 34) * .7)


def impact(r):
    t = _t(1.6)
    return _norm(_lp(_n(r, 1.6), 900) * np.exp(-t * 7) + np.sin(2 * np.pi * 42 * t) * np.exp(-t * 3) * 1.3)


def riser(r):
    t = _t(2.2)
    return _norm(_sweep(t, 90, 900) * (t / t[-1]) ** 2 * .6 + _bp(_n(r, 2.2), 900, 4800) * (t / t[-1]) ** 3)


def rumble(r):
    t = _t(3)
    return _norm(_lp(_n(r, 3), 95) * np.sin(np.pi * t / t[-1]))


def blip(r):
    t = _t(.09)
    return _norm(np.sign(np.sin(2 * np.pi * 1320 * t)) * np.exp(-t * 34))


def select(r):
    t = _t(.26)
    f = np.where(t < .09, 880, 1320)
    return _norm(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 9))


def tick(r):
    t = _t(.06)
    return _norm(_bp(_n(r, .06), 1800, 5200) * np.exp(-t * 110))


def countdown(r):
    t = _t(.28)
    return _norm(np.sin(2 * np.pi * 660 * t) * np.exp(-t * 12) + np.sin(2 * np.pi * 1320 * t) * np.exp(-t * 18) * .3)


def door_creak(r):
    t = _t(1.4)
    f = 170 + 80 * np.sin(2 * np.pi * 2.1 * t) + 18 * r.normal(0, 1, len(t)).cumsum() / np.sqrt(len(t))
    y = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (.4 + .6 * (np.sin(2 * np.pi * 22 * t) > 0))
    return _norm(_bp(y, 240, 2700) * np.clip(np.sin(np.pi * t / t[-1]), 0, 1) ** .6)


def door_slam(r):
    t = _t(.8)
    return _norm(_lp(_n(r, .8), 1500) * np.exp(-t * 26) + np.sin(2 * np.pi * 86 * t) * np.exp(-t * 11) * 1.2)


def footstep_grass(r):
    t = _t(.2)
    return _norm(_bp(_n(r, .2), 700, 5200) * np.exp(-t * 28))


def footstep_hard(r):
    t = _t(.14)
    return _norm(_lp(_n(r, .14), 1500) * np.exp(-t * 60) + np.sin(2 * np.pi * 150 * t) * np.exp(-t * 48))


def splash(r):
    t = _t(1.1)
    return _norm(_bp(_n(r, 1.1), 400, 5000) * np.exp(-t * 3.5) * (1 - np.exp(-t * 60)))


def glass(r):
    t = _t(.9)
    y = sum(np.sin(2 * np.pi * r.uniform(2400, 7400) * t + r.uniform(0, 6)) * np.exp(-t * r.uniform(6, 24)) for _ in range(14))
    return _norm(y + _n(r, .9) * np.exp(-t * 40) * 2)


def crack(r):
    t = _t(.3)
    return _norm(_bp(_n(r, .3), 500, 5000) * np.exp(-t * 18) * (r.random(len(t)) > .75))


def sparkle(r):
    t = _t(1.2)
    y = np.zeros(len(t))
    for k in range(9):
        at = int(k * .09 * SR)
        n = len(t) - at
        tt = np.arange(n) / SR
        y[at:] += np.sin(2 * np.pi * 1400 * 2 ** (k * 2 / 12) * tt) * np.exp(-tt * 9)
    return _norm(y)


def boing(r):
    t = _t(.5)
    return _norm(np.sin(2 * np.pi * np.cumsum(220 + 150 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 3)) / SR) * np.exp(-t * 5))


def pop(r):
    t = _t(.08)
    return _norm(np.sin(2 * np.pi * np.cumsum(900 - 8000 * t) / SR) * np.exp(-t * 50))


def scream_far(r):
    t = _t(2)
    f = 720 + 120 * np.sin(2 * np.pi * 5.4 * t)
    return _norm(_bp(signal.sawtooth(2 * np.pi * np.cumsum(f) / SR), 700, 2600) * np.sin(np.pi * t / t[-1]) ** 2)


def heartbeat(r):
    t = _t(.8)
    y = np.sin(2 * np.pi * 54 * t) * (np.exp(-t * 20) + np.exp(-np.maximum(t - .26, 0) * 20) * (t > .26) * .8)
    return _norm(y)


def static_burst(r):
    t = _t(.6)
    return _norm(_bp(_n(r, .6), 1200, 6500) * (r.random(len(t)) > .3) * np.minimum(1, (t[-1] - t) * 20))


def gunshot(r):
    t = _t(.9)
    return _norm(_n(r, .9) * np.exp(-t * 20) + np.sin(2 * np.pi * 72 * t) * np.exp(-t * 9) * 2)


def explosion(r):
    t = _t(2.8)
    return _norm(_lp(_n(r, 2.8), 520) * np.exp(-t * 1.9) * (1 - np.exp(-t * 90)))


ONE_SHOTS = {f.__name__: f for f in (whoosh, thud, impact, riser, rumble, blip, select, tick, countdown, door_creak, door_slam, footstep_grass, footstep_hard, splash, glass, crack, sparkle, boing, pop, scream_far, heartbeat, static_burst, gunshot, explosion)}


# ------------------------------------------------------------------ ambiences
def wind(r, s):
    t = _t(s)
    return _lp(_n(r, s), 480) * (.55 + .45 * np.sin(2 * np.pi * .13 * t + 1) * np.sin(2 * np.pi * .31 * t))


def space(r, s):
    t = _t(s)
    return _lp(_n(r, s), 130) * (.8 + .2 * np.sin(2 * np.pi * .07 * t)) + np.sin(2 * np.pi * 58 * t) * .012


def rain(r, s):
    return _bp(_n(r, s), 1200, 6800) * .6


def sea(r, s):
    t = _t(s)
    return _bp(_n(r, s), 180, 2000) * (.3 + .7 * (.5 + .5 * np.sin(2 * np.pi * .16 * t)) ** 2)


def room(r, s):
    t = _t(s)
    return _lp(_n(r, s), 260) * .5 + (np.sin(2 * np.pi * 60 * t) + .5 * np.sin(2 * np.pi * 120 * t)) * .02


def office(r, s):
    t = _t(s)
    return _lp(_n(r, s), 900) * .3 + np.sin(2 * np.pi * 120 * t) * .018 + np.sin(2 * np.pi * 240 * t) * .009


def crickets(r, s):
    t = _t(s)
    return _bp(_n(r, s), 3800, 5400) * (np.sin(2 * np.pi * 46 * t) > .5) * (np.sin(2 * np.pi * 1.8 * t) > -.2) * .5 + _lp(_n(r, s), 200) * .25


def birds(r, s):
    t = _t(s)
    y = _lp(_n(r, s), 600) * .2
    for _ in range(int(s * .9)):
        at = int(r.uniform(0, max(s - .5, .1)) * SR)
        n = int(.26 * SR)
        tt = np.arange(n) / SR
        c = np.sin(2 * np.pi * np.cumsum(r.uniform(2400, 3900) + 700 * np.sin(2 * np.pi * 21 * tt)) / SR) * np.sin(np.pi * tt / tt[-1])
        y[at:at + n] += c[:len(y[at:at + n])] * .3
    return y


def fire(r, s):
    y = _lp(_n(r, s), 340) * .7
    pops = (r.random(len(y)) > .9993).astype(float)
    return y + _bp(signal.lfilter([1], [1, -.97], pops), 900, 5000) * 1.2


def machine(r, s):
    t = _t(s)
    return (signal.sawtooth(2 * np.pi * 55 * t) * .08 + _lp(_n(r, s), 700) * .35) * (.78 + .22 * (np.sin(2 * np.pi * 3.2 * t) > 0))


def cave(r, s):
    t = _t(s)
    y = _lp(_n(r, s), 170) * .55
    for _ in range(int(s * .35)):
        at = int(r.uniform(0, max(s - 1, .1)) * SR)
        n = int(.6 * SR)
        tt = np.arange(n) / SR
        d = np.sin(2 * np.pi * (1500 + 500 * tt) * tt) * np.exp(-tt * 12)
        y[at:at + n] += d[:len(y[at:at + n])] * .4
    return y


AMBIENCES = {f.__name__: f for f in (wind, space, rain, sea, room, office, crickets, birds, fire, machine, cave)}
