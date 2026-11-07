# The Gimli Glider: build notes (2026-11-07)
- Final: `gimli_glider_1080p.mp4`, 1080x1920, 30 fps, 897 frames (29.9 s), h264 CRF 16 + AAC 320k, -14.1 LUFS, -1.2 dBTP.
- Picture: `video/src/videos/gimli/` (composition `GimliShort`): story.ts (17 shots, cameras, lens, jet poses), world.ts
  (procedural 767, cockpit, Gimli race day, apron, hangar, podium), cast.ts (staging), toon.ts (1983 cast, props), gfx.ts (effects).
- Rendered in this cloud container (no GPU, software WebGL): ~3 s/frame at 1080p, three chunks + two re-rendered patches
  (84-129 pull-back above the clouds, 370-405 kart lane) spliced frame-exact.
- Sound: `audio/gimli_sound.py` (synth SFX + original Bb score + mix), voice = user's ElevenLabs "Roger" read fitted by
  `video/scripts/voice_fit.py` (pauses cut, x1.25, offline PocketSphinx word timings).
- QA (short_qa.py): no black / white / frozen frames; frame-diff spikes only at planned cuts / impacts (370, 447-450, 512, 584).
- Known nit: the f72 engine-sputter puffs stream behind the nacelle (heard, not seen).
