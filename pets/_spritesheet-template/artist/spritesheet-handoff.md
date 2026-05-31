# Your Pet Spritesheet Handoff

Canvas: 1536 x 1872. Grid: 8 columns x 9 rows. Cell: 192 x 208.

Keep the character inside each cell. Export transparent PNG, WebP, or SVG. Do not add scripts or external links.

| Row | State | What to draw |
| --- | --- | --- |
| 0 | idle | breathing, blink, tail settle |
| 1 | tap_left | left paw drops onto keys |
| 2 | tap_right | right paw drops onto keys |
| 3 | typing | alternating left and right rhythm |
| 4 | focus | quiet work loop with small timer |
| 5 | break | stretch, paw wave, softer eyes |
| 6 | happy | celebration bounce |
| 7 | sleepy | slow blink and low head |
| 8 | failed / dragged | surprised, squashed, recovery |

Typing must read as left and right paw strikes on a real computer keyboard. Draw row offsets, separated keycaps, a spacebar, and a cat-facing orientation; the keyboard is for the pet, not a front-facing label panel for the human viewer. The app alternates tap_left and tap_right from keyboard rhythm events and falls back to typing while the user is still active.
