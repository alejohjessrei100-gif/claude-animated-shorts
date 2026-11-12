"""Turns src/videos/SLUG/script.json into a timeline and a finished mix. Voice length decides shot length.

  python tools/build_audio.py SLUG

Writes src/videos/SLUG/timeline.json, src/videos/SLUG/levels.json and public/audio/SLUG.wav. Run from the project root.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
from scipy import ndimage, signal
from scipy.io import wavfile

import music
import sfx
import voice

SR = 44100
FPS = 30
ASPECTS = {"9:16": (270, 480, 4), "16:9": (480, 270, 4), "1:1": (360, 360, 3), "4:5": (216, 270, 5)}
PHRASE_GAP, HEAD, TAIL = .16, .18, .32
AMB_FULL, SFX_FULL = .09, .45   # what amb_gain = 1 and sfx gain = 1 mean: ambience RMS and effect peak
VOICE_MARGIN_DB = 12            # how far below the narrator everything else is held while they speak
TARGET_DB = -13.8               # mono downmix RMS of the style's reference videos
MAX_PHRASE_CHARS = 75           # about three caption lines


def seeded(seed, name):
    return np.random.default_rng(int(hashlib.sha1(f"{seed}|{name}".encode()).hexdigest()[:8], 16))


def strip_marks(s):
    return s.replace("*", "")


def short_rms(x):
    n = int(.05 * SR)
    return np.sqrt(np.maximum(signal.fftconvolve(x ** 2, np.ones(n) / n, "same"), 0))


def build(slug):
    root = Path.cwd() / "src" / "videos" / slug
    if not re.fullmatch(r"[a-zA-Z0-9-]+", slug):
        sys.exit("A video name may contain only letters, digits and hyphens.")
    sc = json.loads((root / "script.json").read_text(encoding="utf-8-sig"))
    w, h, scale = ASPECTS[sc.get("aspect", "9:16")]
    seed = sc.get("seed", 1)
    vo = sc.get("voice", {})
    style = sc.get("caption_style", "phrase")

    for s in sc["shots"]:
        for label, v in [("amb_gain", s.get("amb_gain", .5))] + [(f"sfx {c['name']} gain", c.get("gain", .6)) for c in s.get("sfx", [])]:
            if not 0 <= v <= 1:
                sys.exit(f"shot {s['id']}: {label} is {v}; it must be between 0 and 1")
        for c in s.get("sfx", []):
            if c["name"] not in sfx.ONE_SHOTS:
                sys.exit(f"shot {s['id']}: unknown sound effect '{c['name']}'")
        if s.get("ambience") and s["ambience"] not in sfx.AMBIENCES:
            sys.exit(f"shot {s['id']}: unknown ambience '{s['ambience']}'")

    phrases = [strip_marks(l) for s in sc["shots"] for l in s.get("lines", [])]
    if style == "phrase":
        for p in phrases:
            if len(p) > MAX_PHRASE_CHARS:
                print(f"WARNING: too long for three caption lines, split it: {p}")
    takes = voice.synth(phrases, vo.get("gender", "male"), vo.get("rate", -1), vo.get("pitch", 0), Path.cwd() / ".cache" / "takes", vo.get("name"))

    shots, captions, placed, cues, k, t = [], [], [], [], 0, 0.0
    for s in sc["shots"]:
        start = t
        cur = start + (HEAD if s.get("lines") else 0)
        word_at = {}
        ypos = s.get("word_y", "low")
        for raw in s.get("lines", []):
            y, words = takes[k]
            k += 1
            dur = len(y) / SR
            placed.append((cur, y))
            if style == "word":
                toks = raw.split()
                times = [q[1] for q in words] if len(words) == len(toks) else [dur * i / len(toks) for i in range(len(toks))]
                for i, tk in enumerate(toks):
                    a = cur + times[i]
                    b = cur + (times[i + 1] if i + 1 < len(toks) else dur + .05)
                    captions.append({"from": round(a * FPS), "to": max(round(b * FPS), round(a * FPS) + 3), "text": strip_marks(tk), "kind": "word", "hi": "*" in tk, "y": ypos})
            else:
                captions.append({"from": round(cur * FPS), "to": round((cur + dur + PHRASE_GAP) * FPS), "text": strip_marks(raw), "kind": "phrase"})
            for q in words:
                word_at.setdefault(re.sub(r"\W", "", q[0]).lower(), cur + q[1])
            cur += dur + PHRASE_GAP
        end = max(cur + (TAIL - PHRASE_GAP if s.get("lines") else 0), start + s.get("min_s", 0))
        fr0, fr1 = round(start * FPS), round(end * FPS)
        t = fr1 / FPS
        if s.get("title"):
            captions.append({"from": fr0, "to": fr1, "text": s["title"], "kind": "title"})
        shots.append({"id": s["id"], "scene": s["scene"], "from": fr0, "to": fr1, "params": s.get("params", {})})
        for c in s.get("sfx", []):
            if "on" in c:
                when = word_at.get(re.sub(r"\W", "", c["on"]).lower())
                if when is None:
                    sys.exit(f"shot {s['id']}: cue word '{c['on']}' is not in its narration")
            elif c.get("end"):
                when = t - .05
            else:
                when = start + c.get("at", 0)
            cues.append((when, c))

    total = t
    N = int(total * SR) + SR
    timeline = {"slug": slug, "fps": FPS, "width": w, "height": h, "scale": scale, "frames": round(total * FPS), "seconds": round(total, 2), "caption_style": style, "shots": shots, "captions": captions}

    vtrack = np.zeros(N)
    for at, y in placed:
        i = int(at * SR)
        vtrack[i:i + len(y)] += y[:N - i]

    # Music: one cue per section, crossfaded.
    sections = []
    for s, sh in zip(sc["shots"], shots):
        if s.get("music") or not sections:
            m = s.get("music") or {}
            sections.append({"t": sh["from"] / FPS, "mood": m.get("mood", sc.get("mood", "calm")), "root": m.get("root", sc.get("root", "D")), "gain": m.get("gain", 1.0)})
    mtrack = np.zeros((N, 2))
    fade = int(1.2 * SR)
    for i, sec in enumerate(sections):
        next_t = sections[i + 1]["t"] if i + 1 < len(sections) else total + 1
        y = music.render(sec["mood"], sec["root"], next_t - sec["t"] + 1.3, seed * 97 + i) * sec["gain"]
        y[:min(fade, len(y))] *= np.linspace(0, 1, min(fade, len(y)))[:, None]
        y[-fade:] *= np.linspace(1, 0, fade)[:, None]
        at = int(sec["t"] * SR)
        n = min(len(y), N - at)
        mtrack[at:at + n] += y[:n]

    # Room tone and weather per shot.
    amb = np.zeros(N)
    for s, sh in zip(sc["shots"], shots):
        name = s.get("ambience")
        if not name:
            continue
        a, b = int(sh["from"] / FPS * SR), int(sh["to"] / FPS * SR)
        y = sfx.AMBIENCES[name](seeded(seed, name + s["id"]), (b - a + 8000) / SR)
        y = y / (np.sqrt((y ** 2).mean()) + 1e-9) * s.get("amb_gain", .5) * AMB_FULL
        fd = min(3000, len(y) // 3)
        y[:fd] *= np.linspace(0, 1, fd)
        y[-fd:] *= np.linspace(1, 0, fd)
        n = min(len(y), N - a)
        amb[a:a + n] += y[:n]

    fx = np.zeros((N, 2))
    for i, (when, c) in enumerate(cues):
        y = sfx.ONE_SHOTS[c["name"]](seeded(seed, f"{c['name']}{i}")) * c.get("gain", .6) * SFX_FULL
        at = max(int(when * SR), 0)
        n = min(len(y), N - at)
        pan = c.get("pan", 0)
        fx[at:at + n, 0] += y[:n] * (1 - pan)
        fx[at:at + n, 1] += y[:n] * (1 + pan)

    # Music dips under the narrator.
    env = np.abs(vtrack)
    b, a = signal.butter(1, 6 / (SR / 2))
    duck = 1 - .5 * np.clip(signal.filtfilt(b, a, env) * 8, 0, 1)
    mrms = np.sqrt((mtrack ** 2).mean()) + 1e-9
    bed = mtrack / mrms * .082 * sc.get("music_gain", .5) * duck[:, None] + amb[:, None] + fx
    v = vtrack * .95

    # The narrator always wins: while they speak, everything else is held well below them.
    vr = short_rms(v)
    held = ndimage.maximum_filter1d(vr, int(.25 * SR))
    threshold = .2 * np.percentile(vr[vr > 1e-4], 95)
    speaking = held > threshold
    br = short_rms((bed[:, 0] + bed[:, 1]) / 2)
    g = np.minimum(1, np.where(speaking, held * 10 ** (-VOICE_MARGIN_DB / 20), 1e9) / (br + 1e-9))
    g = ndimage.minimum_filter1d(g, int(.06 * SR))
    b, a = signal.butter(1, 25 / (SR / 2))
    bed = bed * np.clip(signal.filtfilt(b, a, g), 0, 1)[:, None]

    active = vr > threshold
    bed_mono = (bed[:, 0] + bed[:, 1]) / 2
    levels = {"voice_over_everything_db": round(float(20 * np.log10(np.sqrt((v[active] ** 2).mean()) / (np.sqrt((bed_mono[active] ** 2).mean()) + 1e-9))), 1)}

    mix = bed + v[:, None]
    head = int(.02 * SR)
    mix[:head] *= np.linspace(0, 1, head)[:, None]
    mix = mix[:int(total * SR)]
    tail = min(int(.25 * SR), len(mix))
    mix[-tail:] *= np.linspace(1, 0, tail)[:, None]
    for _ in range(4):
        mono = (mix[:, 0] + mix[:, 1]) / 2 ** .5
        mix = mix * 10 ** ((TARGET_DB - 20 * np.log10(np.sqrt((mono ** 2).mean()) + 1e-9)) / 20)
        mix = np.tanh(mix * 1.1) / 1.1
    mix = np.clip(mix / max(np.abs(mix).max() / .97, 1), -1, 1)
    if np.isnan(mix).any():
        sys.exit("The mix contains invalid samples.")

    (root / "timeline.json").write_text(json.dumps(timeline, indent=1), encoding="utf8")
    (root / "levels.json").write_text(json.dumps(levels), encoding="utf8")
    out = Path.cwd() / "public" / "audio" / f"{slug}.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(out, SR, (mix * 32767).astype(np.int16))

    print(f"{slug}: {total:.1f} s, {timeline['frames']} frames, {len(shots)} shots, {len(captions)} captions")
    print(f"voice over everything else: {levels['voice_over_everything_db']} dB")
    for sh in shots:
        print(f"  {sh['id']:<14} {sh['scene']:<16} from frame {sh['from']:<6} {(sh['to'] - sh['from']) / FPS:5.1f} s")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(sys.argv[1])
