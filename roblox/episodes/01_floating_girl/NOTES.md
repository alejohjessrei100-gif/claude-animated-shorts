# 01 The Floating Girl: build notes (2026-11-08)
- Final: `floating_girl_1080p60.mp4` (v2), 1080x1920, 60 fps, 3442 frames (57.4 s), h264 CRF 18 + AAC 320k, -14.5 LUFS, -1.7 dBTP.
- Format: measured on @kalemod's top 15 Shorts (docs/metrics_table.md): ~60 s, ~260 wpm, third person, "In this world" rule
  fable with a twist last line. Script is original (docs/SCRIPT_OPTIONS.md #1).
- Voice: the user's ElevenLabs "Adam - Radio Announcer" recording, force-aligned offline (270/270 words), pauses trimmed,
  x1.5 and +4 semitones (user's pick from the -2/0/+2/+4 samples) -> 285 wpm, longest gap 0.13 s.
- Picture: kit/ (10_core, 20_r6 avatar, 40_cam, 45_town, 50_runtime) + ep.js: 46 shots pinned to word indices, one-word
  Poppins captions per the skill spec. The rule is visible: sad people hover; Pip floats on a string.
- Sound: kit/audio/music_make.py: one original A-minor loop sped x1.35, 12 dB under the voice, one thunder accent on "flooded".
- Render: 3 parallel lanes at ~2-3 s/frame (~45 min for the whole video).
- Review: three every-frame rounds (REVIEW.md). Caught: the rule not reading, a camera inside the fire truck (0.25 s red
  flash), sky through a missing classroom wall, a boy hidden behind Pip, the hug covering her face, rain bars on the lens.

## v2 (2026-11-08, user changes)
- Voice pitch +6 semitones (was +4); still x1.5, 57.4 s, same word timings.
- Music: the user's track (TEMPOREX - Numbers, instrumental) at 50% linear gain under the voice, faded out at the end; the
  thunder accent on "flooded" kept. The track is commercial: YouTube may claim it (user's call).
- Captions at half size (56 px), outline and shadow scaled to match.
- Shading: stronger warm key, weaker fill, cool rim light, half-res GTAO contact shading (creases, under arms, feet on the
  ground); the sky shader pre-darkened so the AO output pass keeps its colour; flood water made matte (no sun glare).
- Shoulders: the sleeve, arm and torso tops were coplanar and z-fought; the sleeves now sit 0.03 above, the arms 0.01 off.
- Kit: a warm-up render before each capture (objects first shown on a fresh page, like the rain, skipped their first frame).
- Review: two more every-frame rounds (REVIEW.md rounds 4-5).
