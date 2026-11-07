# Why Toast Lands Butter-Side Down: build notes (2026-11-07)
- Final: `toast_butter_side_down_1080p.mp4`, 1080x1920, 30 fps, 1335 frames (44.5 s), h264 CRF 16 + AAC 320k, -14.3 LUFS, TP -1.1 dBTP.
- Style source: the 20 reference videos (references/), not the bridge look: close framing, dense lit sets (kitchen, night lab,
  classroom, street), constant camera motion, acting on every line, lip sync on quoted lines, spotlight iris close-ups,
  reference-size captions.
- Picture: `video/src/videos/toast/` (composition `ToastShort`): story.ts (18 shots, toast drop physics, cameras, lens, iris),
  world.ts (sets, 3D toast slices, piles, scale, giant table), cast.ts (staging, lip sync from voiceEnv.json), toon.ts
  (talking mouths, glasses, reach arms, held props, 1995/2001 cast), gfx.ts (splat, pow, spin arrow, path, sparkles, textures).
- Voice: user's ElevenLabs "Adam" read (58.8 s) fitted to 44.5 s by `video/scripts/voice_fit.py` (23 pauses cut, x1.19).
- Sound: `audio/toast_sound.py` (synth SFX on every landing and beat, original F-major score per scene, mix rules from SKILL.md).
- Render: 3 chunks + one patch (693-750: push-in added so shot 11 never holds dead still). Container restart cost one chunk.
- QA: no black / white / frozen frames; frame-diff spikes only at planned iris open/close and the coin reveal.
