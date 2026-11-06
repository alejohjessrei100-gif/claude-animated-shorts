# "The Gimli Glider" — script v2 (short cut, 2026-11-06)
Format: cartoon 3D story short, 20-30 s (~28 s at ~3.7 words/s), story mode, present tense, one steady narrator, English, no captions.

## Facts (checked 2026-11-06)
- Air Canada Flight 143, Boeing 767-233, Montreal → Edmonton (via Ottawa), 23 July 1983. 61 passengers + 8 crew = 69. [Wikipedia, CBC]
- The fuel quantity gauges were not working; fuel was measured by dripstick and converted by hand. [Wikipedia]
- The 767 was the airline's first aircraft to measure fuel in kilograms (Canada was converting to metric). [CBC archives]
- The crew used 1.77 (pounds per litre) as if it were kilograms per litre (~0.80): the plane carried ~22,300 lb (~10,100 kg)
  instead of the 22,300 kg needed, less than half. [Fear of Landing, View from the Wing, Wikipedia]
- Both engines quit at 41,000 ft, about halfway through the flight; most cockpit displays went dark. [Wikipedia, CBC]
- Captain Robert Pearson was an experienced glider pilot; he side-slipped to lose height. [Wikipedia]
- They landed at the former RCAF Station Gimli, then Gimli Motorsports Park, during a Winnipeg Sports Car Club family day,
  with families, campers and barbecues near the strip. The nose gear collapsed; minor injuries only, all 69 survived. [Wikipedia, Global News]
- Air Canada demoted Pearson for six months and suspended Quintal for two weeks; in 1985 they received the first-ever
  FAI Diploma for Outstanding Airmanship. [Wikipedia]
Sources: https://en.wikipedia.org/wiki/Gimli_Glider · https://www.cbc.ca/archives/when-a-metric-mix-up-led-to-the-gimli-glider-emergency-1.4754039
· https://fearoflanding.com/history/the-gimli-glider/ · https://globalnews.ca/news/9851380/gimli-marks-gimli-glider-anniversary

## Script (voice text) — v2 SHORT, 20-30 s (user request 2026-11-06)
In 1983, a passenger jet ran out of fuel at forty-one thousand feet, and everyone survived.
Halfway across Canada, both engines go quiet.
Luckily, the captain flies gliders as a hobby.
Unluckily, the nearest runway is hosting a family car race.
He glides in, the nose wheel collapses, and it scrapes to a stop in front of the barbecues.
You see, the plane measured fuel in kilograms, but the crew did the sums in pounds.
So it took off with less than half the fuel it needed.
The airline punished both pilots.
Then they won an award for some of the best flying anyone had ever seen.

## Voice (locked 2026-11-06)
- Source: `voice/voice_recording_elevenlabs_roger.mp3`, made by the user in ElevenLabs (Roger, Laid-Back Casual), 40.5 s.
- Fitted with `video/scripts/voice_fit.py --target 29.9`: offline PocketSphinx forced alignment of `voice.txt`,
  12 pauses cut to 0.14 s, then atempo x1.251 (pitch kept), loudness -16 LUFS → `voice/voice.wav` 29.9 s, 3.58 words/s.
- `voice/words.json` = word times in the fitted file (checked: every word span has speech, every pause is silent).
- Copy used by the composition: `video/public/gimli/voice.wav`. Picture timing is locked to words.json from here.

## Light plan
day (cruise, engines out) → golden (glide, landing, explanation) → day (punishment / award ending).
