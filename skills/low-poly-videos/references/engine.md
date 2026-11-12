# How the engine works

Read this before changing the engine, or if you need to rebuild it on another stack. The `mini-engine` source is small enough to read in full.

## The flow

```
script.json
   | tools/build_audio.py        Kokoro takes -> shot and caption timing -> music, ambience, effects -> master
   v
timeline.json + levels.json + public/audio/<name>.wav
   |
   | Remotion asks for frame N   VideoComp -> renderer.renderFrame() + Captions
   v
out/<name>/<name>.mp4
```

The voice comes first because its length decides the length of every shot. Captions, cuts and sound therefore stay locked together without any manual syncing.

## Source map

| File | Job |
|---|---|
| `src/index.js`, `src/Root.jsx` | Register one Remotion composition per folder in `src/videos/` that has a `timeline.json` |
| `src/VideoComp.jsx` | One frame: the 3D canvas, the caption canvas and the audio |
| `src/three/renderer.js` | Finds the shot for a frame, builds or reuses its scene, runs post-processing |
| `src/three/kit.js` | Textures, skies, lights, locations, props, people, planets, particles, camera moves |
| `src/Captions.jsx` | Draws phrase, title and word captions as hard pixels |
| `tools/build_audio.py` | Timeline and mix |
| `tools/voice.py`, `music.py`, `sfx.py` | Kokoro narration; procedural music in 9 moods; 24 one-shots and 11 ambiences, all synthesised with numpy |
| `tools/stills.mjs`, `sheet.py`, `check.py` | Test frames, contact sheet, final verification |

## Rules the look depends on

1. Render at 270×480 for 9:16 (480×270, 360×360, 216×270 for the others) and upscale 4×, 4×, 3× or 5× with `image-rendering: pixelated`.
2. `renderer.toneMapping = NoToneMapping`. Passes in order: RenderPass, GTAOPass, UnrealBloomPass, OutputPass, then the Bayer dither ShaderPass last.
3. Frames are rendered as PNG and encoded at CRF 16 so the hard pixels survive.
4. Captions are drawn at render resolution with antialiasing thresholded away, and then upscaled like the picture. DOM text at full resolution looks wrong here.
5. Every frame is a pure function of its number. Remotion may ask for frames in any order.

## Rules the audio depends on

- `amb_gain` and sfx `gain` are always 0 to 1. `build_audio.py` rejects anything else.
- While the narrator speaks, music, ambience and effects are limited to 12 dB under the voice. This is why the narration stays clear whatever a script asks for. Do not remove it.
- The master targets -13.8 dB RMS, measured on a mono downmix.

## Remotion details that matter

- `Config.setConcurrency(1)` keeps a single WebGL context alive; a scene is reused across the frames of a shot and disposed when the shot changes.
- The canvas needs `preserveDrawingBuffer: true`, or screenshots come back blank.
- Scene building is synchronous, and fonts are the only `delayRender`.
- `require.context` finds videos at bundle time, so adding a video needs no registration.
- Composition ids allow only letters, digits and hyphens, which is why video names do too.
- `npx remotion ffmpeg` is a reduced build, lacking raw PCM output and audio analysis filters.

## Lessons from building it

Bugs that were actually hit, so that you need not repeat them:

| Problem | Cause | Fix now in place |
|---|---|---|
| Narration buried by effects | Volumes given in the wrong units | 0-to-1 gains, validated; voice-first limiter |
| A mix full of invalid samples | A fractional power of a slightly negative envelope | Envelope clipped; `build_audio.py` exits on NaN |
| Particles or custom meshes render black | BufferGeometry with no normals breaks the ambient occlusion pass | Always add a normal attribute |
| Long hair hid the face | A hair cap tilted past the eyes | Hair cap limited |
| Captions unreadable | Double-striking a thin pixel font fills its letters | VT323 drawn once |
| Interiors washed out | Point lights near the ceiling, strong panels and bloom | Tinted ceiling, lights lower, bloom 0.18 |
| Stars look like snow | Single pixels on a 1024-wide sky get magnified | 2048-wide sky when stars are on |
| Picture out of step with voice | Timing hand-written before the voice existed | Voice first, always |
