"""Narration with Kokoro: free, local, no account. Each caption phrase is one take, so timing is exact.

  python tools/voice.py --download     fetch the two model files once (about 340 MB) into models/
  python tools/voice.py --list         voices that narrate well
"""
import hashlib
import os
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
MODELS = Path(os.environ.get("LOWPOLY_MODELS", Path(__file__).resolve().parent.parent / "models"))
BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
FILES = {"kokoro-v1.0.onnx": 300_000_000, "voices-v1.0.bin": 25_000_000}
DEFAULT = {"male": "am_michael", "female": "af_heart"}
VOICES = {
    "am_michael": "US male, steady narrator (default male)", "am_onyx": "US male, low and calm", "am_puck": "US male, lively",
    "am_fenrir": "US male, deeper", "af_heart": "US female, warm (default female)", "af_bella": "US female, bright",
    "af_nicole": "US female, soft and close", "bm_george": "UK male, documentary", "bm_fable": "UK male, storyteller",
    "bm_daniel": "UK male, neutral", "bf_emma": "UK female, calm",
}


def download():
    MODELS.mkdir(parents=True, exist_ok=True)
    for name, least in FILES.items():
        path = MODELS / name
        if path.exists() and path.stat().st_size >= least:
            print(f"{name}: already here")
            continue
        print(f"{name}: downloading...", flush=True)
        part = path.with_suffix(path.suffix + ".part")
        urllib.request.urlretrieve(BASE + name, part)
        if part.stat().st_size < least:
            part.unlink()
            sys.exit(f"{name}: the download came back too small, so it was discarded. Try again.")
        part.replace(path)
        print(f"{name}: {path.stat().st_size / 1e6:.1f} MB")


def _estimate_words(text, x, sr):
    """Kokoro gives no word timing, so spread the words over the spoken span by syllables, then snap each to the nearest dip."""
    toks = text.split()
    n = max(int(sr * .01), 1)
    e = np.sqrt(np.convolve(x.astype(float) ** 2, np.ones(n) / n, "same"))
    on = np.flatnonzero(e > .03 * e.max())
    a, b = (on[0], on[-1]) if len(on) else (0, len(x) - 1)
    weights = []
    for tok in toks:
        syllables = max(1, len(re.findall(r"[aeiouy]+", tok.lower())))
        weights.append((syllables + .12 * len(re.sub(r"\W", "", tok)), 1.0 if tok[-1] in ",.;:?!" else 0.0))
    total = sum(w + p for w, p in weights) or 1
    pos, out, last = 0.0, [], a
    reach = int(sr * .07)
    for i, (tok, (w, pause)) in enumerate(zip(toks, weights)):
        at = int(a + (b - a) * pos / total)
        if i:
            lo, hi = max(last + 1, at - reach), min(len(e) - 1, at + reach)
            if hi > lo:
                at = lo + int(np.argmin(e[lo:hi]))
        out.append((tok, at / sr))
        last = at
        pos += w + pause
    return out


def _clean(wav_path, pitch):
    """Trims silence, optionally shifts pitch in semitones, then gives the voice a slightly band-limited narrator colour."""
    sr, x = wavfile.read(wav_path)
    x = x.astype(float) / 32768
    idx = np.flatnonzero(np.abs(x) > .01)
    head, tail = 0, len(x)
    if len(idx):
        head, tail = max(idx[0] - 200, 0), min(idx[-1] + 1200, len(x))
    x = x[head:tail]
    stretch = 2 ** (pitch / 12)
    y = signal.resample(x, int(len(x) * SR / sr / stretch))
    b, a = signal.butter(2, [90 / (SR / 2), 6800 / (SR / 2)], "band")
    y = signal.lfilter(b, a, y)
    b, a = signal.butter(1, 2600 / (SR / 2), "high")
    y = y + .25 * signal.lfilter(b, a, y)
    frame = 512
    rms = np.sqrt(np.convolve(y ** 2, np.ones(frame) / frame, "same")) + 1e-5
    y = np.tanh(y * np.clip((rms / .12) ** (-.3), .6, 3) * 1.1) * .9
    n = int(.11 * SR)
    room = np.random.default_rng(3).normal(0, 1, n) * np.exp(-np.arange(n) / (.028 * SR))
    wet = signal.fftconvolve(y, room)[:len(y) + n]
    wet = wet / (np.abs(wet).max() + 1e-6) * .06
    out = np.zeros(len(y) + n)
    out[:len(y)] = y
    out[:len(wet)] += wet
    return out / (np.abs(out).max() + 1e-6) * .9, head / sr, stretch


def synth(phrases, gender, rate, pitch, cache, name=None):
    """Returns (audio, [(word, seconds), ...]) for every phrase, reusing earlier takes when nothing changed.

    rate runs from -3 (slow) to 3 (fast). pitch is in semitones and is best left at 0."""
    if not all((MODELS / f).exists() for f in FILES):
        sys.exit(f"Kokoro model files are missing from {MODELS}. Run: python tools/voice.py --download")
    cache.mkdir(parents=True, exist_ok=True)
    voice = name or DEFAULT[gender]
    speed = float(np.clip(1 + rate * .06, .7, 1.4))
    keys = [hashlib.sha1(f"{voice}|{speed}|{t}".encode("utf8")).hexdigest()[:16] for t in phrases]
    todo = {k: t for k, t in zip(keys, phrases) if not (cache / f"{k}.wav").exists()}
    if todo:
        from kokoro_onnx import Kokoro

        engine = Kokoro(str(MODELS / "kokoro-v1.0.onnx"), str(MODELS / "voices-v1.0.bin"))
        for k, text in todo.items():
            x, sr = engine.create(text, voice=voice, speed=speed, lang="en-gb" if voice[0] == "b" else "en-us")
            x = np.asarray(x, float)
            wavfile.write(cache / f"{k}.wav", sr, (np.clip(x, -1, 1) * 32767).astype(np.int16))
            (cache / f"{k}.words").write_text("\n".join(f"{w}\t{s}" for w, s in _estimate_words(text, x, sr)), encoding="utf8")
    out = []
    for k in keys:
        y, head, stretch = _clean(cache / f"{k}.wav", pitch)
        words = []
        for line in (cache / f"{k}.words").read_text(encoding="utf8").splitlines():
            w, s = line.rsplit("\t", 1)
            words.append((w, max(float(s) - head, 0) / stretch))
        out.append((y, words))
    return out


if __name__ == "__main__":
    if "--download" in sys.argv:
        download()
    elif "--list" in sys.argv:
        for name, about in VOICES.items():
            print(f"{name:12s} {about}")
    else:
        print(__doc__)
