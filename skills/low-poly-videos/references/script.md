# Writing `script.json`

## Writing the narration

Short declaratives work best. Each phrase is a separate take with a small pause after it, so the rhythm comes from where you break the lines.

- A phrase is 2 to 9 words. It must fit in three lines of caption, and `build_audio.py` warns when one will not.
- Each line is a separate take, so end every line at a natural stop. Splitting one sentence across two lines sounds choppy.
- Put a line's stressed idea at its end, since that is where the voice lands.
- Hook in the first line: state the rule or the strange fact, with no greeting and no "in this video".
- Speak to the viewer directly in choice and story formats.
- Plant the turn with a plain word like "but" or "then", and say the catch as flatly as the good news.

```
This planet is soft green hills.
A farmhouse on solid rock.
But the hills are limestone,
over caves a hundred metres deep.
Your floor is the roof.
```

That passage is an illustration only, so write new content for each video.

Spoken text goes through Kokoro. Avoid symbols, digits in awkward places and unusual abbreviations; write "a hundred metres", and spell uncommon names phonetically if they come out wrong. Quantities should feel plausible, and facts in explainers must be true.

## Schema

```json
{
  "title": "Pick a Door",
  "aspect": "9:16",
  "seed": 41,
  "mood": "wonder",
  "root": "D",
  "music_gain": 0.5,
  "caption_style": "phrase",
  "voice": { "gender": "male", "rate": -1, "pitch": 0.94 },
  "shots": [ ]
}
```

`caption_style` is `"phrase"` (one caption per line) or `"word"` (one word at a time). In word mode, wrap a keyword in asterisks to highlight it: `"Pour the *concrete* first."`

`voice` fields:

| Field | Meaning |
|---|---|
| `gender` | `male` (default voice `am_michael`) or `female` (default voice `af_heart`) |
| `name` | Optional specific Kokoro voice. US: `am_michael`, `am_onyx`, `am_puck`, `af_heart`, `af_bella`, `af_nicole`. British: `bm_george`, `bm_fable`, `bm_daniel`, `bf_emma`. |
| `rate` | -3 (slow) to 3 (fast). Each step is 6% speed. |
| `pitch` | Semitones up or down. Leave it out unless asked, because shifting makes the voice less natural. |

### Shot fields

| Field | Meaning |
|---|---|
| `id` | Unique name. It also seeds that shot's random generator, so scenes are repeatable. |
| `scene` | Key in `scenes.js`. Shots may share a scene and vary through `params`. |
| `params` | Object passed to the scene. |
| `title` | Large text for the whole shot. |
| `lines` | Spoken phrases. May be empty if `min_s` is set. |
| `min_s` | Minimum duration, for holding on an image. |
| `ambience`, `amb_gain` | Background loop for the shot. `amb_gain` is 0 to 1, default 0.5. |
| `music` | `{ "mood", "root", "gain" }` begins a new music section at this shot. |
| `sfx` | List of `{ "name", "at": secs }`, `{ "name", "on": "word" }` or `{ "name", "end": true }`, each with optional `gain` (0 to 1, default 0.6) and `pan`. |
| `word_y` | Word mode position: `high` or `low`. |

Music moods: `wonder`, `calm`, `melancholy`, `uneasy`, `dread`, `tense`, `playful`, `heroic`, `mystery`. Roots: `C` through `B`, with sharps.

One-shots: `whoosh`, `thud`, `impact`, `riser`, `rumble`, `blip`, `select`, `tick`, `countdown`, `door_creak`, `door_slam`, `footstep_grass`, `footstep_hard`, `splash`, `glass`, `crack`, `sparkle`, `boing`, `pop`, `scream_far`, `heartbeat`, `static_burst`, `gunshot`, `explosion`.

Ambiences: `wind`, `space`, `rain`, `sea`, `room`, `office`, `crickets`, `birds`, `fire`, `machine`, `cave`.

## Sound design habits

Give every shot an ambience unless it is a title card. Start a new music section at each emotional change; keep two or three moods per video. Use a `whoosh` on title cards, and place a sound effect on the exact word of a reveal using `"on": "word"`, with the spoken word given as the value of `on`. Keep `music_gain` near 0.5.

The narrator always comes first. The mixer holds music, ambience and effects at least 12 dB under the voice while it is speaking, so a loud effect placed under a word will be turned down. A big impact that should really hit needs a gap in the narration: place it between phrases or give the shot extra `min_s`.
