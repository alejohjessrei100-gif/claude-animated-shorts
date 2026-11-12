---
name: low-poly-videos
description: Makes complete narrated vertical videos (YouTube Shorts, TikTok, Reels) in a low-resolution, PS2-era low-poly 3D style, entirely in code on the user's own computer with Three.js, Remotion and a free local Kokoro voice. Writes the script, narration, music, sound effects, props and locations from a single idea. Use this whenever someone asks for a low-poly, PS2-style or retro 3D video or short, a "choose a planet" or "would you rather" video, a "how to build X" video, a faceless short in this look, or says things like "make a video about X" in a project containing this folder, even if they never name the tools.
---

# Low-Poly Videos

Turn a short request into a finished MP4. The user gives an idea and maybe a format; you decide everything else and only ask if the idea is unusable.

`SKILL` means the folder containing this file. Nothing is preinstalled here: this folder holds instructions, source code and visual examples, and you install the tools yourself the first time.

Everything is free and local. Never add a paid API, an API key or an AI image or video service.

## Read these

| When | File |
|---|---|
| First use on a computer | [references/setup.md](references/setup.md) |
| Before designing shots | [references/style.md](references/style.md), then look at `gallery/` and read the `examples/*.html` closest to your idea |
| Choosing structure | [references/formats.md](references/formats.md) |
| Writing the script | [references/script.md](references/script.md) |
| Writing scenes | [references/scene-kit.md](references/scene-kit.md) |
| Changing or debugging the engine | [references/engine.md](references/engine.md) |

The HTML files are short, self-contained demonstrations of one visual idea each. Read their code. They are not templates to copy into a video, and they are not a full video.

## The pipeline

Work in the studio folder created during setup (default `low-poly-studio/`). Run every command from its root. `PY` below means `.venv\Scripts\python.exe` on Windows and `.venv/bin/python` elsewhere.

A video has a name of letters, digits and hyphens, such as `pick-a-door`. Its files live in `src/videos/<name>/`.

### 1. Plan

Pick a format and length. If the user names none, use the format that suits the idea, 9:16, and 40 to 90 seconds. Invent original worlds, titles and lines. Facts in explainers must be true.

### 2. Write `src/videos/<name>/script.json`

Each entry in `lines` becomes one narrated take and one caption. Voice lengths set every shot's duration, so the script comes before any scene.

### 3. Build the audio and timeline

```bash
PY tools/build_audio.py <name>
```

This generates the voice, music, effects and the final mix, and writes `timeline.json`. It prints each shot's starting frame and how far the voice sits above everything else, which should be at least 9 dB. Treat every warning as a bug.

### 4. Write `src/videos/<name>/scenes.js`

```js
export const scenes = {
  meadow(ctx, params) {
    const {LOC, add, person, cam} = ctx;
    LOC.plains({light: 'day'});
    const you = add(person({pack: '#b0542e'}));
    you.rotation.y = Math.PI;
    return (t, p) => {            // t = seconds into the shot, p = 0 to 1
      you.pose({breathe: t});
      cam.set([0, 1.2, 9], [0, 5, -10], 40);
    };
  },
};
```

Each `scene` named in `script.json` must exist here. Derive all motion from `t` or `p` and use `ctx.r` for randomness, so that any frame can be rendered alone. Never use `Math.random()` or the clock.

### 5. Test stills and look at them

```bash
node tools/stills.mjs <name>
```

```bash
PY tools/sheet.py <name>
```

This renders the middle frame of every shot and joins them into `out/<name>/sheet.png`. Open that image and judge it honestly:

- Is the camera inside a wall or prop, or is something blocking the view?
- Is a person too large? They should usually fill a third of the frame height or less.
- Are lights blown out?
- Is text sitting on something bright or busy?
- Does each frame literally show what the narration says at that moment?

Fix `scenes.js` and repeat, normally two or three times. To inspect moments inside a shot, pass frames: `node tools/stills.mjs <name> 120,180`. If you cannot view images, say so to the user and ask them to check the sheet.

### 6. Render

```bash
npx remotion render src/index.js <name> out/<name>/<name>.mp4
```

On a machine with no working GPU add `--gl=swangle` (and set `GL=swangle` for `stills.mjs`). Expect it to be much slower, and tell the user.

### 7. Check, then deliver

```bash
PY tools/check.py <name>
```

It must print `"ok": true`. Then give the user the MP4 path, with a suggested title, caption and hashtags if it is for social media.

Say plainly that you cannot hear audio: the voice, music and effects were measured for level and balance, not listened to. Ask the user to judge them.

## Changes after review

- Wording, timing or voice: edit `script.json`, then redo steps 3, 5, 6 and 7. Shot lengths will change.
- Picture only: edit `scenes.js`, then redo steps 5, 6 and 7.
- Music, effects or ambience only: edit `script.json`, then redo steps 3, 6 and 7.
- A prop or location likely to recur: add it to `src/three/kit.js` so later videos benefit.

## Never

Use a paid service. Reuse another creator's script, characters, branding or worlds. Hand over a video whose stills you have not looked at. Let music or effects compete with the narrator. Install anything beyond what `references/setup.md` lists without asking.
