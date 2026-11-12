# Low-Poly Videos

An instruction package that lets an AI coding agent make finished vertical videos for YouTube Shorts, TikTok and Reels in a PS2-era low-poly 3D style. Give it one line, such as "pick a door, two strange worlds", and it writes the script and builds the narration, music, sound effects, props, locations and final MP4.

It is free and runs on your own computer: **Three.js** draws the picture, **Remotion** turns frames into video, and **Kokoro** speaks the narration. There are no API keys and no AI image or video services.

## Nothing is preinstalled

This folder contains only text, source code and a few reference images. On first use the agent follows [references/setup.md](references/setup.md) and downloads about 1 GB:

| What | Size | From |
|---|---|---|
| Three.js, Remotion, React, fonts | about 270 MB | npm |
| Chrome Headless Shell, used by Remotion to render | about 130 MB | fetched by Remotion on first render |
| Kokoro voice model | about 355 MB | kokoro-onnx GitHub releases |
| Python packages | about 345 MB | pip |

## How to use it

1. Put this folder anywhere in your project, or install it as a skill for your agent. For Claude Code, that means copying it to `.claude/skills/low-poly-videos/`.
2. Tell the agent: "Read LOW-POLY-VIDEOS/SKILL.md and README.md, then make a video about X."
3. The first run sets everything up. After that, just ask for videos.

**You need:** Node.js 22 or newer, Python 3.10 or newer, about 2 GB of free disk space and a computer with a GPU. Windows, macOS and Linux are supported by the tools; the package was tested end to end on Windows 11. Without a GPU it still works but renders far more slowly.

## What it makes

| Format | Example request | Feel |
|---|---|---|
| Choose | "Pick a door", "choose a planet" | Calm narrator, appealing worlds that turn unsettling |
| How to build | "How to build a tunnel" | Cheerful, fast cuts, cutaways, one word on screen at a time |
| Story | "A story about the last lighthouse" | A small narrative with a twist |
| Explainer | "What if the moon vanished" | One fact per shot, big visual scale |

Aspect ratios: 9:16 (default), 16:9, 1:1 and 4:5.

## What is in this folder

| Path | What it is |
|---|---|
| `SKILL.md` | The workflow the agent follows |
| `references/` | Setup, visual style, formats, script writing, scene API, engine design |
| `mini-engine/` | Source for the small engine, which the agent copies out and installs |
| `examples/*.html` | Seven short pages that each show one visual technique in code. Open one by double click (internet needed for Three.js from a CDN) |
| `gallery/` | Full-size frames showing the target look |

## Licences

The code, examples and images here are free to use in your own videos.

Installed on first use: Three.js (MIT), Kokoro-82M (Apache-2.0), kokoro-onnx (MIT), VT323 and Archivo Black fonts (SIL Open Font License).

**Remotion has its own licence.** It is free for individuals and for companies of up to three people; larger companies need a paid company licence. Check [remotion.dev/license](https://www.remotion.dev/license) if that might apply to you.

## Known limits

- An AI agent cannot hear the audio. Levels are measured automatically, but a person should listen to the result.
- Word-by-word captions use estimated word timing, because Kokoro does not report it.
- Characters are built from code. They look right when small or seen from behind, and more like mannequins up close.
