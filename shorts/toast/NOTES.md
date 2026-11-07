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

## v2 (2026-11-07, user review: clipping, glitches, hands not touching the bread)
- Boxes closed underneath (tables/desks/seats were see-through from low angles); chairs moved behind the kids; plate moved
  off the slice's path; classroom crane below the wall tops.
- Glitches: crossfaded scenes shared global light uniforms (one drew with the other's light), now re-applied per scene
  before rendering; toast piles fixed per shot on a jittered grid (no popping, no overlapping slices); splats lifted off
  the rug (z-fighting); the iris fades out instead of snapping open.
- Hands: drawn on the flat cards they were always hidden behind the tabletop. Every push, the swat and the marker now use a
  real 3D arm from the shoulder to the slice (world.ts Arm3D, cast.ts pushing()); the dad pushes the hook slice.
- Re-encoded at CRF 18 (40.5 MB, under GitHub's 50 MB guideline). QA: no black/white/frozen frames.
