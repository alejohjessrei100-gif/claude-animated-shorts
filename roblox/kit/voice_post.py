"""voice_post.py: speed + pitch for an aligned narration (voice.wav + words.json from voice_fit.py / voice_make.py).
Usage: python3 kit/voice_post.py <in_dir> <out_dir> --speed 1.5 --semitones 2 [--clip 10 --name sample]
rubberband (tempo = speed, pitch = 2^(semitones/12)), loudnorm -16 LUFS, words.json times divided by the speed."""
import argparse, json, os, subprocess
ap = argparse.ArgumentParser(); ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--speed", type=float, default=1.5); ap.add_argument("--semitones", type=float, default=2.0)
ap.add_argument("--clip", type=float, default=0); ap.add_argument("--name", default="voice")
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
af = f"rubberband=tempo={a.speed}:pitch={2 ** (a.semitones / 12):.6f}:transients=crisp:detector=compound,loudnorm=I=-16:TP=-1.5:LRA=7"
cmd = ["ffmpeg", "-v", "error", "-y", "-i", os.path.join(a.inp, "voice.wav"), "-af", af, "-ar", "48000", "-ac", "1"]
ext = "mp3" if a.clip else "wav"
if a.clip: cmd += ["-t", str(a.clip), "-b:a", "192k"]
subprocess.run(cmd + [os.path.join(a.out, f"{a.name}.{ext}")], check=True)
if not a.clip:
    ws = json.load(open(os.path.join(a.inp, "words.json")))
    fw = [{**w, "start": round(w["start"] / a.speed, 3), "end": round(w["end"] / a.speed, 3)} for w in ws]
    json.dump(fw, open(os.path.join(a.out, "words.json"), "w"), indent=0)
    gaps = [fw[i + 1]["start"] - fw[i]["end"] for i in range(len(fw) - 1)]
    span = fw[-1]["end"] - fw[0]["start"]
    print(f"{a.name}.wav: {fw[-1]['end']:.2f} s of speech, {len(fw)} words, {len(fw) / span * 60:.0f} wpm, first word {fw[0]['start']:.2f} s, longest gap {max(gaps):.2f} s")
