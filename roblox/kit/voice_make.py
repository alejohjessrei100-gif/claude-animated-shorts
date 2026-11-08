"""voice_make.py: TTS from script.txt -> voice.wav + words.json (per-word timings), the skill's Phase 4 step 2.
Usage: python3 kit/voice_make.py episodes/NN_slug [--speed 1.5] [--semitones 2] [--gap 0.12] [--voice pNInz6obpgDQGcFmaJgB]
- ElevenLabs /with-timestamps (the API key is injected by the environment's network secret for api.elevenlabs.io; it is
  never read or written here). Raw mp3 + alignment are cached in voice/raw.* so post settings can be changed for free.
- Pauses between words longer than --gap (raw seconds) are cut down to --gap (5 ms crossfades), so the read never stalls.
- Speed + pitch with ffmpeg rubberband (tempo = speed, pitch = 2^(semitones/12)), then loudnorm to -16 LUFS.
- words.json: [{"word", "start", "end"}] in final seconds; prints total length and the longest gap (target <= 0.25 s)."""
import argparse, base64, json, os, subprocess, sys, urllib.request
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("ep"); ap.add_argument("--speed", type=float, default=1.5); ap.add_argument("--semitones", type=float, default=2.0)
ap.add_argument("--gap", type=float, default=0.12); ap.add_argument("--voice", default="pNInz6obpgDQGcFmaJgB")
ap.add_argument("--model", default="eleven_multilingual_v2"); ap.add_argument("--out", default="voice")
ap.add_argument("--regen", action="store_true"); ap.add_argument("--clip", type=float, default=0, help="only the first N final seconds (samples)")
a = ap.parse_args()
vd = os.path.join(a.ep, "voice"); os.makedirs(vd, exist_ok=True)
raw_mp3, raw_al = os.path.join(vd, "raw.mp3"), os.path.join(vd, "raw_alignment.json")
text = open(os.path.join(a.ep, "script.txt")).read().strip()

if a.regen or not os.path.exists(raw_mp3):
    body = json.dumps({"text": text, "model_id": a.model,
                       "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 1.0}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice}/with-timestamps?output_format=mp3_44100_128",
                                 data=body, headers={"Content-Type": "application/json"}, method="POST")
    d = json.load(urllib.request.urlopen(req, timeout=300))
    open(raw_mp3, "wb").write(base64.b64decode(d["audio_base64"]))
    json.dump(d["alignment"], open(raw_al, "w"))
    print(f"generated {len(text)} characters")
al = json.load(open(raw_al))

# words from the character alignment
words, cur = [], None
for ch, s, e in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
    if ch.isspace():
        if cur: words.append(cur); cur = None
        continue
    if cur is None: cur = {"word": ch, "start": s, "end": e}
    else: cur["word"] += ch; cur["end"] = e
if cur: words.append(cur)

SR = 44100
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", raw_mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.float32).copy()
# cut long gaps: keep [start of speech .. end], each gap shortened to a.gap
keep, t0 = [], max(0.0, words[0]["start"] - 0.04)
shift, new_words = 0.0, []
segs = []
for i, w in enumerate(words):
    nxt = words[i + 1] if i + 1 < len(words) else None
    if nxt and nxt["start"] - w["end"] > a.gap:
        cut_a, cut_b = w["end"] + a.gap / 2, nxt["start"] - a.gap / 2
        segs.append((t0, cut_a)); t0 = cut_b
segs.append((t0, min(len(x) / SR, words[-1]["end"] + 0.15)))
out, fade = [], int(0.005 * SR)
tmap = []  # (raw_start, new_start) per segment
pos = 0.0
for s0, s1 in segs:
    seg = x[int(s0 * SR):int(s1 * SR)].copy()
    if len(seg) > 2 * fade: seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
    tmap.append((s0, s1, pos)); out.append(seg); pos += len(seg) / SR
y = np.concatenate(out)
def remap(t):
    for s0, s1, p in tmap:
        if t <= s1 + 1e-6: return p + max(0.0, t - s0)
    return pos
cut_wav = os.path.join(vd, "cut.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", cut_wav], input=y.astype(np.float32).tobytes(), check=True)
pitch = 2 ** (a.semitones / 12)
final = os.path.join(vd, f"{a.out}.wav")
af = f"rubberband=tempo={a.speed}:pitch={pitch:.6f}:transients=crisp:detector=compound,loudnorm=I=-16:TP=-1.5:LRA=7"
cmd = ["ffmpeg", "-v", "error", "-y", "-i", cut_wav, "-af", af, "-ar", "48000", "-ac", "1"]
if a.clip: cmd += ["-t", str(a.clip)]
subprocess.run(cmd + [final], check=True)
fw = [{"word": w["word"], "start": round(remap(w["start"]) / a.speed, 3), "end": round(remap(w["end"]) / a.speed, 3)} for w in words]
gaps = [fw[i + 1]["start"] - fw[i]["end"] for i in range(len(fw) - 1)]
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final], capture_output=True, text=True).stdout)
if not a.clip:
    json.dump(fw, open(os.path.join(vd, "words.json"), "w"), indent=0)
print(f"{a.out}.wav: {dur:.2f} s, {len(fw)} words, {len(fw) / (fw[-1]['end'] - fw[0]['start']) * 60:.0f} wpm, longest gap {max(gaps):.2f} s, "
      f"speed x{a.speed}, pitch {a.semitones:+g} st")
