# The Pigeons Who Flew a Bomb: build notes (2026-11-07)
- Final: `pigeons_who_flew_a_bomb_1080p.mp4`, 1080x1920, 30 fps, 1335 frames (44.5 s), h264 CRF 18 + AAC 320k,
  -14.0 LUFS, true peak -1.6 dBTP, 37.8 MB.
- Story: Project Pigeon (B. F. Skinner, 1943): pigeons trained to peck a target on a screen steered a glide bomb; three per
  nose cone so two could outvote a wrong one; cancelled; Skinner's Ig Nobel Peace Prize (2024, accepted by his daughter).
  Facts and sources in `SCRIPT.md`.
- Voice: the user's ElevenLabs read, fitted to 44.5 s by `video/scripts/voice_fit.py` (word tails and onsets kept, x1.18).
- Picture: `video/src/videos/pigeon/` (composition `PigeonShort`). story.ts (19 shots, bomb flight, peck trains, screen
  drift/tilt, cameras, lens, iris), world.ts (sea range + bomb, cut-away nose cone with three stations, screens on pivots,
  3D lens beam, warhead with the yellow bands of US high-explosive bombs, Skinner's lab, war room, yard, award stage),
  cast.ts (staging; pigeon cards in front / side / back view, chosen per row so the three always match; leaning cards for
  high cameras; 3D arms for Skinner carrying a bird and the general's stamp), birds.ts (pigeon front/side/back + dog).
- Sound: `audio/pigeon_sound.py`: synth pecks on every screen hit, seed tick, flutters, the generals' laughs, lock-on beep,
  lens hum, screen servo, buzz + ding for the outvote, toss/crunch/bark, low boom on "explosives", stamp thud, applause
  and confetti pops; original score (D minor march -> F major fanfare). Mix per SKILL.md (music +3, SFX -6, voice as is).
- Render: 3 parallel chunks (~90 min) + one patch pass (436 frames in 7 ranges, ~35 min), spliced frame-exact.
- Review (SKILL.md 10b, `REVIEW.md`): two rounds. Round 1 (all 1335 frames) caught a near-static opening with the bomb cut
  off, Skinner's face cut and the ship screen edge-on, only one of the four generals in frame, an off-frame "?" on a 2 s
  dead hold, a card-view pop mid-glide, and a stamp hiding its own mark. Round 2 re-checked every patched range and seam:
  clean.
- Pre-render still rounds also caught: birds hidden behind screens (cameras moved behind/above), side birds cut in the
  row shots, the bomb's open tail, birds looking flat from steep angles (back-view card + lean), the trophy hidden
  behind the daughter's head, the boy and dog cut by the frame, Skinner loading the nose behind its shell.
