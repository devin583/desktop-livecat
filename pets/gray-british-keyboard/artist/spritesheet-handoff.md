# Gray British Keyboard Spritesheet Handoff

Imported from a supplied 7 x 9 image grid and converted into a local transparent PNG spritesheet.

Canvas: 7 columns x 9 rows. Frame size is recorded in manifest.json.

| Row | State | Meaning |
| --- | --- | --- |
| 0 | idle | idle loop |
| 1 | tap_left | left paw key press |
| 2 | tap_right | right paw key press |
| 3 | typing | sustained alternating typing |
| 4 | focus | focused typing with small sparkle accents |
| 5 | break | break, stretch, yawn, or relaxed gesture |
| 6 | happy | happy hearts |
| 7 | sleepy | sleeping or drowsy state |
| 8 | failed | angry, blocked, or failed state |

Keyboard sync uses only rhythm pulses. It does not store key values.
