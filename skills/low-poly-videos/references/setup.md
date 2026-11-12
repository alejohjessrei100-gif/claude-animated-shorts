# First-time setup

Do this once per computer. About 1 GB of downloads, usually 5 to 15 minutes. Tell the user that before you start.

`SKILL` is the folder holding `SKILL.md`. Everything below is free. If a step needs an administrator password or a system-wide install, ask the user first.

## 1. Check the prerequisites

```bash
node -v
```

```bash
python --version
```

Node must be 22 or newer. Python must be 3.10 or newer (on macOS and Linux the command may be `python3`). If either is missing, install it from nodejs.org or python.org, or with the system's package manager. There is no need to install ffmpeg or Chrome: Remotion brings its own.

On Linux, Remotion's browser also needs some system libraries; if the first render reports missing `.so` files, see remotion.dev/docs/miscellaneous/linux-dependencies.

## 2. Create the studio

Make a folder for the working project outside `SKILL`, default name `low-poly-studio` next to it, and copy the **contents** of `SKILL/mini-engine` into it, including the hidden `.gitignore`.

```bash
mkdir -p low-poly-studio
cp -r SKILL/mini-engine/. low-poly-studio/
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force low-poly-studio
Copy-Item -Recurse -Force SKILL\mini-engine\* low-poly-studio\
Copy-Item -Force SKILL\mini-engine\.gitignore low-poly-studio\
```

Run everything from here on inside `low-poly-studio`.

## 3. Install the JavaScript side

```bash
npm install
```

Versions are pinned in `package.json`. Keep every `remotion` and `@remotion/*` package on exactly the same version, or Remotion refuses to run. A warning that esbuild's install script was not approved is harmless.

## 4. Install the Python side

Windows:

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r tools/requirements.txt
```

macOS and Linux:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r tools/requirements.txt
```

If pip cannot find a build of `onnxruntime` for this Python version, install Python 3.12 and rebuild `.venv` with it.

## 5. Download the Kokoro voice

```bash
PY tools/voice.py --download
```

`PY` is the venv Python above. This fetches `kokoro-v1.0.onnx` (about 325 MB) and `voices-v1.0.bin` (about 28 MB) into `models/`. To keep one copy for several studios, set the environment variable `LOWPOLY_MODELS` to a shared folder.

## 6. Prove it works

The studio ships with a sample script and scenes called `pick-a-door`.

```bash
PY tools/build_audio.py pick-a-door
```

Expected: about 44 s, 1325 frames, 13 shots, and voice over everything else of about 11 dB.

```bash
node tools/stills.mjs pick-a-door
```

The first run downloads Chrome Headless Shell (about 130 MB). Expected: 13 PNGs in `out/pick-a-door/stills/`.

```bash
PY tools/sheet.py pick-a-door
```

Open `out/pick-a-door/sheet.png` and compare it with `SKILL/gallery/contact-sheet.png`. They should look the same: rooms, meadow, office, each with hard pixels and captions.

```bash
npx remotion render src/index.js pick-a-door out/pick-a-door/pick-a-door.mp4
```

```bash
PY tools/check.py pick-a-door
```

It must print `"ok": true`. Setup is finished. On a Windows PC with a GPU this render took about 2.5 minutes.

## If something fails

| Symptom | Cause and fix |
|---|---|
| A WebGL or GPU error, or black frames | Headless Chrome could not use the GPU. Try `--gl=swangle` on render and `GL=swangle` for `stills.mjs`. On Windows and macOS, `angle` is normally right. |
| `delayRender` timeout | A shot takes too long to build, usually on software rendering. Add `--timeout=300000`. |
| Remotion version mismatch | Delete `node_modules` and `package-lock.json`, restore the exact versions and run `npm install`. |
| `Kokoro model files are missing` | Run step 5. |
| A download comes back too small | The network failed. Run the same command again; it resumes by re-fetching the missing file. |
| `Requested output format ... is not known` or a missing filter from `npx remotion ffmpeg` | Remotion's ffmpeg is a reduced build. Decode to a WAV file instead of raw audio, and avoid filters. `tools/check.py` already does this. |
| A composition is not found | The name in the command must match the folder in `src/videos/`, and that folder needs a `timeline.json` from `build_audio.py`. |
