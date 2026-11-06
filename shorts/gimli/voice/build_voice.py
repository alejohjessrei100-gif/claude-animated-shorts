"""Turn an ElevenLabs with-timestamps response into voice.wav (48 kHz mono) + words.json.
Pauses longer than MAX_GAP between words are cut down to MAX_GAP (the style wants an almost pause-free read),
and word times are shifted to match. Usage: python3 build_voice.py resp.json"""
import json, base64, subprocess, sys, wave
import numpy as np
MAX_GAP = 0.16   # seconds kept between words after compression
LEAD = 0.05      # silence before the first word (voice starts at frame 1-2)
TAIL = 0.35
r = json.load(open(sys.argv[1]))
open('raw.mp3', 'wb').write(base64.b64decode(r['audio_base64']))
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'raw.mp3', '-ar', '48000', '-ac', '1', 'raw.wav'], check=True)
with wave.open('raw.wav') as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
a = r['alignment']
words = []; cur = ''; s = e = None
for c, t0, t1 in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
    if c.isspace():
        if cur: words.append([cur, s, e]); cur = ''
        continue
    if not cur: s = t0
    cur += c; e = t1
if cur: words.append([cur, s, e])
# build kept segments: from each word start to the next word start, capping the silent gap
segs = []; out = []; t_out = LEAD
pad = np.zeros(int(LEAD * sr), np.int16); pieces = [pad]
for i, (wd, s, e) in enumerate(words):
    nxt = words[i + 1][1] if i + 1 < len(words) else min(e + TAIL, len(x) / sr)
    gap = nxt - e
    keep_end = e + min(gap, MAX_GAP) if i + 1 < len(words) else nxt
    seg = x[int(s * sr):int(keep_end * sr)].copy()
    # 5 ms fades at cut points so trims never click
    f = int(0.005 * sr)
    if len(seg) > 2 * f and gap > MAX_GAP:
        seg[-f:] = (seg[-f:] * np.linspace(1, 0, f)).astype(np.int16)
    out.append({"word": wd, "start": round(t_out, 3), "end": round(t_out + (e - s), 3)})
    t_out += len(seg) / sr
    pieces.append(seg)
y = np.concatenate(pieces)
with wave.open('voice_raw_pacing.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes())
# loudness-normalise the voice stem to -16 LUFS (final mix is mastered to -14)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'voice_raw_pacing.wav', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '48000', '-ac', '1', 'voice.wav'], check=True)
json.dump(out, open('words.json', 'w'), indent=1)
dur = len(y) / sr
print(f"{len(out)} words, {dur:.2f} s, {len(out)/dur:.2f} w/s")
