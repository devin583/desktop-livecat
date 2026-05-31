# Spritesheet Custom Pets

Spritesheet pets are the fast customization path for Desktop LiveCat. They do
not replace Live2D; they give illustrators and non-technical users a way to ship
a cute, reactive desktop pet with a single local image and a small manifest.

## Runtime Contract

The app supports three render modes:

- `live2d`: high quality Cubism model, with CSS fallback if the model is absent.
- `spritesheet`: WebP/PNG/JPG/SVG frame playback through CSS background position.
- `hybrid`: Live2D for the main body and spritesheet states for short actions.

Daily runtime must stay offline. AI or chat generation can create a pack, but
the result must be saved under `pets/<pet-id>/` before it is used.

## Folder Layout

```text
pets/<pet-id>/
  manifest.json
  spritesheet/
    avatar.webp
    template.svg
    states.json
  preview/
    preview.png
  artist/
    spritesheet-handoff.md
    artist-checklist.md
```

`pets/_spritesheet-template/` is the handoff pack. Copy it, rename the folder,
change `manifest.id`, and replace `spritesheet/avatar.webp` or point the
manifest at a PNG/SVG file.

## Default Template

Canvas: `1536 x 1872`.
Grid: `8 x 9`.
Cell: `192 x 208`.

| Row | State | Expected Motion |
| --- | --- | --- |
| 0 | `idle` | breathing, blink, tail settle |
| 1 | `tap_left` | left paw presses the left key group |
| 2 | `tap_right` | right paw presses the right key group |
| 3 | `typing` | alternating key rhythm while input continues |
| 4 | `focus` | low-distraction Pomodoro focus loop |
| 5 | `break` | stretch, paw wave, rest reminder |
| 6 | `happy` | success or completion bounce |
| 7 | `sleepy` | slow blink or low-energy idle |
| 8 | `failed` / `dragged` | surprise, squashed, or recovery pose |

The keyboard effect should be pose-driven. Do not rely on moving a paw layer
with CSS; the left and right strike frames need to be visibly different in the
sheet.

## Manifest Fields

```json
{
  "renderMode": "spritesheet",
  "persona": {
    "name": "Pixel Mochi",
    "species": "cat",
    "style": "rounded desktop spritesheet",
    "personality": "focused and reactive",
    "palette": ["#ffd8bf", "#ef9d91", "#2f2430", "#fff6dd"]
  },
  "spritesheet": {
    "image": "spritesheet/avatar.webp",
    "columns": 8,
    "rows": 9,
    "frameWidth": 192,
    "frameHeight": 208,
    "statesFile": "spritesheet/states.json",
    "states": {
      "idle": {
        "frames": [{ "row": 0, "column": 0, "durationMs": 120 }],
        "loopStartIndex": 0
      }
    }
  }
}
```

`idle` is required. Other states may be omitted; the app falls back to `idle`.
Use `"loopStartIndex": null` for one-shot actions such as `tap_left`,
`tap_right`, or `failed`; add `"fallback": "typing"` or `"fallback": "idle"`
to define the loop that should take over after the one-shot finishes.

## Installer

The settings panel accepts:

- A local directory containing `manifest.json`.
- A `.zip` containing a pet pack.
- A single `.png`, `.webp`, `.jpg`, `.jpeg`, or `.svg` image.

Single image imports become a spritesheet pack with generated manifest,
`states.json`, preview, and artist handoff files. The image is never executed as
code.

## Draft Creator

The prompt button creates a deterministic local SVG draft from text. This is not
a network AI call. It exists to prove the Codex-style flow: chat description to
persona spec to local resource pack. A later AI generator can replace this
stage, but the saved pack format should stay the same.

## Validation

Run:

```bash
npm run validate:pets
```

Strict release checks can still require Live2D exports:

```bash
STRICT_PET_ASSETS=1 npm run validate:pets
```

Artist handoff checks:

```bash
ARTIST_ASSET_CHECK=1 npm run validate:pets
```
