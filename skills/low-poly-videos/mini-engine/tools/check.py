"""Verifies a finished video against its timeline: size, length, audio present, loudness and voice clarity.

  python tools/check.py SLUG      expects out/SLUG/SLUG.mp4
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile

slug = sys.argv[1]
root = Path("src") / "videos" / slug
timeline = json.loads((root / "timeline.json").read_text(encoding="utf8"))
levels = json.loads((root / "levels.json").read_text(encoding="utf8"))
video = Path("out") / slug / f"{slug}.mp4"
npx = shutil.which("npx") or "npx"

info = subprocess.run([npx, "remotion", "ffmpeg", "-hide_banner", "-i", str(video)], capture_output=True, text=True, encoding="utf8", errors="replace").stderr
dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
res = re.search(r", (\d{3,5})x(\d{3,5})", info)
if not dur or not res:
    sys.exit(f"Could not read {video}:\n{info}")
seconds = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3])
got = [int(res[1]), int(res[2])]
want = [timeline["width"] * timeline["scale"], timeline["height"] * timeline["scale"]]

# Remotion's ffmpeg is a reduced build, so decode to a temporary WAV rather than a raw stream.
with tempfile.TemporaryDirectory() as d:
    wav = Path(d) / "a.wav"
    done = subprocess.run([npx, "remotion", "ffmpeg", "-y", "-v", "error", "-i", str(video), "-vn", "-ac", "2", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav", str(wav)], capture_output=True, text=True, encoding="utf8", errors="replace")
    if not wav.exists():
        sys.exit(f"Could not decode the audio of {video}: {done.stderr}")
    stereo = wavfile.read(wav)[1].astype(float) / 32768
    x = (stereo[:, 0] + stereo[:, 1]) / 2 ** .5   # the same downmix the master is measured on
rms = float(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9)) if len(x) else -120.0

ok = got == want and abs(seconds - timeline["seconds"]) < .25 and -16.5 < rms < -11 and levels["voice_over_everything_db"] >= 9
print(json.dumps({"ok": ok, "resolution": got, "seconds": round(seconds, 2), "planned_seconds": timeline["seconds"], "audio_rms_dbfs": round(rms, 1), "target_rms_dbfs": -13.8, **levels}, indent=1))
sys.exit(0 if ok else 1)
