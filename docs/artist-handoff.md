# Artist Handoff Guide

This guide is for illustrators who can draw and organize layers but do not need
to know AI tools or application code.

## Goal

Create an original desktop cat character that can later be rigged in Live2D
Cubism and dropped into `pets/<pet-id>/`.

## Required Deliverables

- Layered PSD, RGB, 8 bit/channel, sRGB, transparent background.
- Preview PNG, 1024 x 1024 or larger, showing the complete character.
- Completed `artist/artist-checklist.md`.
- Short character notes in `artist/asset-brief.md`: name, palette, personality,
  intended expressions, and any motion notes.

## Canvas

- Preferred canvas: 1024 x 1024 px.
- Keep the full body, tail, paws, and keyboard visible.
- Leave at least 80 px padding around the character.
- Do not bake large cast shadows into character layers; put shadow on its own
  layer if needed.

## Layer Rules

- Every moving part must be its own named layer or group.
- Keep hidden overlap art. Ears, paws, tail, head, eyelids, and muzzle need
  extra painted area under neighboring parts.
- Do not merge left and right eyes, ears, paws, eyelids, brows, or irises.
- Draw the prop as a readable computer keyboard, not generic toy blocks. Include
  row offsets, distinct keycaps, a spacebar, and small F/J home-key marks when
  scale permits.
- Keep keyboard body separate from keys. The two home-key clusters under the
  paws should be separate layers.
- Use stable names after first handoff. Renaming layers breaks Cubism re-import.

## Minimum Parts

- Head base, left/right ears, inner ears, forehead tuft if any.
- Eye whites, irises, highlights, upper eyelids, brows.
- Muzzle, nose, mouth, blush, whiskers.
- Body base, chest patch, left/right front paws, left/right back paws.
- Tail base, tail middle, tail tip.
- Keyboard body, keyboard shadow, individual key layers.

## Naming

Use lowercase IDs from `source/livecat-parts.csv` when possible:

```text
head_base
eye_left_white
iris_left
eyelid_left
front_paw_left
keyboard_body
key_12
tail_tip
```

Human-readable layer names are fine, but keep the ID prefix:

```text
120_head_base
140_eye_left_white
110_front_paw_left
```

## What Not To Do

- Do not copy existing IP or recognizable mascot shapes.
- Do not flatten the whole character into one illustration.
- Do not crop paws, tail, keyboard, or ears.
- Do not include text, logos, watermarks, or UI labels in the art.
- Do not use AI-specific files as required deliverables.

## Handoff Folder

Put illustrator files here:

```text
pets/<pet-id>/artist/
  asset-brief.md
  artist-checklist.md
  source.psd
  preview.png
```

Engineering will handle `manifest.json`, Live2D parameter binding, app loading,
and release packaging.
