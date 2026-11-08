# 01 The Floating Girl: build notes (2026-11-08)
- Final: `floating_girl_1080p60.mp4`, 1080x1920, 60 fps, 3442 frames (57.4 s), h264 CRF 18 + AAC 320k, -14.6 LUFS, -2.2 dBTP.
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
