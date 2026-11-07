---
name: "roblox-story-shorts"
description: "Build viral Roblox-style story Shorts 100% in code (three.js) — format analysis, fable script, avatar/town kit, voice, captions, QA contact sheet, 60fps render."
---

# Roblox-Style Story Shorts — 100% Code Pipeline

Make blocky-avatar narrated story Shorts (9:16, ~60–100 s) entirely in code: three.js scene + TTS voice + burned-in captions, rendered headless to MP4. No Roblox game, no Roblox Studio, no animation skills.

Core idea: **1 format, repeated every day → repeat it → automate it.** Keep the *format* of the winning channel, never its content (not their lines, rules, or characters).

## Phase 1 — Find and measure the format

1. Pull a successful channel's Shorts list with views:
   `yt-dlp --flat-playlist --print "%(view_count)s\t%(duration)s\t%(title)s" https://youtube.com/@CHANNEL/shorts > list.tsv`
   Summarize: total Shorts, how many >1M, >10M, best, median. Present as a bar summary.
2. Pick the top ~15 videos and measure every word, every cut, every sound. Build `docs/metrics_table.md` with columns:
   `title | dur s | views M | words | wpm | words 0–3 s | words 0–10 s | first word s | pauses ≥0.3 s/min | pauses ≥0.6 s | shots | median shot s | music key | LUFS`
3. Extract the shared story skeleton (e.g. "15/15 open with *In this town…* / *In this world…*").

### Reference numbers measured in the video (target these)
- ~95 s, ~280 words, **~223 wpm from the very first frame**, first word at 0.0 s, almost no pauses (longest gap ≈0.24 s)
- **Median shot 1.4 s** — the camera never stops moving
- **One music track, ~12 dB under the voice**; almost no sound effects (1 accent max)
- Captions: **one word at a time**, centered, big

## Phase 2 — Script (the formula)

The fable beat sheet (position in video):
| % | Beat |
|---|---|
| 0% | **The rule** — "In this town, [crazy rule]." |
| 20% | **The hero, worst at the rule** |
| 55% | **The adults try and fail** |
| 80% | **The hero's flaw saves everyone** |
| end | **Callback** — last line twists the rule |

Expanded 9-beat table used in `episodes/NN_slug/script.md`:
1. Rule (0 s) · 2. Origin (0–6 s) · 3. Consequences (6–20 s) · 4. "Then there's me" — hero intro (~22%) · 5. Ally + planted line (~30%) · 6. Trigger (~38%) · 7. Adults fail (45–65%) · 8. Flaw saves (70–90%) · 9. Callback (last line)

Example: "In this town, the more friends you have, the taller you grow." Hero Milo has zero friends, size of a shoe. Grandma's planted line "Small keys open big doors." The mayor sneezes, the golden key falls down the drain, kids locked in school; adults fail; Milo fits in the drain and saves everyone → "Now I have four hundred friends. Grandma had to buy taller doors."

Rules: first person, plain words, no pauses, ~280 words. Write `script.md` (beats table) + `script.txt` (voice text only). Check the premise against the 15 measured videos so it fits the format but copies nothing.

## Phase 3 — Reusable kit (`kit/`, stays across episodes)

| File | Contents |
|---|---|
| `10_core.js` | renderer, light, sky, 1080×1920 canvas |
| `20_r6.js` | R6 avatar (head, torso, 2 arms, 2 legs — boxes), shirt/pants/skin colors, ~15 face decals (canvas textures), hats/hair/accessories, `POSES` (idle, talk, point, wave, armsUp, kick, sneeze, shrug, hug, climb, sit, lookUp, duck…) |
| `30_post.js` | depth of field (on close-ups), bloom |
| `40_cam.js` | camera moves (push, pull, slide, orbit) + captions |
| `45_town.js` | street, houses, bakery, school, drain — boxes + canvas textures (brick, siding, shingle) |
| `voice_make.py` | TTS from script.txt → wav + word timestamps |
| `check.mjs` | QA contact sheet |
| `render.mjs` | headless frame render → MP4 |

Build order for the avatar (show progress): six grey blocks → colors → faces → poses.

Caption spec: Poppins ~800 weight, size 112 px, baseline y≈1222 of 1920, black stroke 13 px drawn twice, soft shadow rgba(0,0,0,.55) blur 14, white fill. One word at a time, synced to word timestamps.

## Phase 4 — Episode (`episodes/NN_slug/`, only this changes)

1. `script.md` + `script.txt`
2. `python kit/voice_make.py episodes/NN_slug` → voice + per-word timings (verify total ≈ target, longest gap ≤0.25 s)
3. `src/70_shots.js`: **one shot per noun**, each pinned to a word with `W('word')` so cuts land on the voice. Each shot: `{ at:[x,y,z], dist, yaw, pitch, move:'push'|'pull'|'slideL'…, K }` plus `key(character, t, {pose, face})` and optional `cue()` SFX. Expect ~60–70 shots for 95 s.
4. Music: one bed track (original jingle, sped ~1.35×, looped), ~12 dB under voice. One SFX boom on the key word only. Respect TTS/music credit caps (stop when cap is reached).

**Tip #1 — make the rule visible.** If the rule is about height, character heights literally follow it (Mayor 900 friends → 24 studs, Jenny 200 → 13, mailman 5 → 2.6, Milo 0 → 0.9).

## Phase 5 — QA (before rendering)

- `window.CAMCHECK()`: sample each shot at u = 0.02/0.5/0.98; flag cameras inside solid boxes, below ground, or outside tunnels. Fix every hit.
- **Tip #2 — make a contact sheet first:** `node ../../kit/check.mjs ep.html qa/sheet` → one frame per shot in a grid with the caption word. Scan for blocked shots, empty frames, wrong faces.
- Common breaks seen: camera inside a house; a window frame that was a solid box (fix = one line); doors rendering black; characters blocking the subject. Compare before/after frames.

## Phase 6 — Render

`FPS=60 node render.mjs ep.html 1080` → 1080×1920, 60 fps, mux voice + music. Do a side-by-side vs a reference Short (theirs/ours) to check pacing and look.

## Daily loop
New episode = new `script.txt` + new `70_shots.js`; kit stays. Target 5–10 videos/day once the kit is solid.

## Notes
- Needs a code environment: Node + three.js + headless browser (Puppeteer/Playwright), Python, ffmpeg, a TTS provider with word timestamps (e.g. ElevenLabs), optional yt-dlp.
- Keep characters, towns and music original. Do not reuse another creator's lines, rules, characters or audio.