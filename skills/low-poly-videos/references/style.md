# Visual style

The look is a contradiction, and that contradiction is the whole style: PS2-grade geometry and resolution lit like a modern game.

## What the engine handles automatically

| Element | Value |
|---|---|
| Render size | 270×480 for 9:16, upscaled 4× with nearest neighbour to 1080×1920 |
| Frame rate | 30 fps |
| Dither | 4×4 Bayer ordered dither, 40 levels per channel |
| Post | soft shadows, ambient occlusion, bloom, fog, environment reflections |
| Captions | pixel-style font with outline, upper third |

Do not add antialiasing tricks, film grain, vignette, chromatic aberration or lens flares. None of them are part of this look.

## What the scenes must do

**Keep assets simple and let light do the work.** Primitive shapes, small noisy textures and flat colours are correct. Add atmosphere, not polygons: fog depth, a long shadow, a glowing window, bloom on a light source.

**Compose vertically, with a small subject and a lot of sky.** Keep the horizon in the lower third for outdoor shots. A person usually fills a third of the frame height or less, and is often seen from behind. Reserve the upper third for captions, so it should be sky, ceiling or another plain area.

**Move the camera slowly or not at all.** Use a slow push, a slight drift or a slow orbit. Each shot should have one small motion. There are no handheld shakes, and no whip pans except as a joke in fast formats.

**Cut hard.** No fades, wipes or dissolves. Median shot length is about 4.5 to 5 seconds in calm formats and about 2 seconds in fast ones.

**Show what the narration says, literally.** If the line says "a farmhouse on solid rock," the frame shows a farmhouse on rock. When it turns ("but the hills are limestone"), the picture changes to prove it. A cross-section, a close-up or a change of light is how the script's turn lands.

**Light each location with intent.** Daylight is saturated and clean. Dread is overcast, dusk or a single light source in darkness. Interiors should be dim, with mean brightness around a quarter of full scale, with visible pools of light.

## Palette by mood

| Mood | Light preset | Colour |
|---|---|---|
| Appealing, paradise | `day` | saturated green and blue |
| Uneasy | `overcast` or `sunset` | desaturated, sickly green or orange haze |
| Dread | `night` or `dusk` | near black with one warm or cold source |
| Wonder, cosmic | `space` | deep blue and black, glowing planet rim |
| Bureaucratic, liminal | room interior | yellow-beige, fluorescent |
| Playful how-to | `day` | bright primaries, clean shadows |

## Common failures

- **Mannequin close-ups.** The figure holds up at small sizes and from behind. Avoid close-ups of faces and hands; cut to the object or place instead.
- **Empty frames.** A plain terrain and sky looks like a tech demo. Add a focal object, distant silhouettes and particles.
- **Overexposure indoors.** Keep emissive panels modest, because bloom spreads them quickly.
- **Text collisions.** The title sits above the caption automatically, so keep the region behind both uncluttered.
