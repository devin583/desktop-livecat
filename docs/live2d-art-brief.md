# Original Live2D Cat Art Brief

## Character direction

- Original small cat named Mochi Prototype.
- Round face, short legs, soft tail, compact body, sitting beside a miniature
  computer keyboard with recognizable key rows, spacebar, and home-key area.
- Large readable eyes, simple muzzle, independent ear and tail movement.
- Palette: warm peach, cream, muted rose, dark graphite keyboard body, and warm
  cream keycaps. Avoid direct resemblance to Pusheen, Neko Atsume, Hello Kitty,
  Chi's Sweet Home, or any protected character.

## Required Live2D parts

- Head: face base, left/right ears, inner ears, muzzle, nose, mouth, blush, optional cheek fur.
- Eyes: left/right white, iris, highlight, eyelid, lower lid.
- Body: torso, chest patch, left/right front paws, left/right back paws.
- Tail: at least three deformable sections for secondary motion.
- Prop: keyboard body, row-group key layers, spacebar, and individual home-key
  layers for paw-tapping feedback.

## Generated source kit

The current project now includes a reproducible source kit for this brief:

- Concept reference: `pets/livecat-default/preview/livecat-ai-concept.png`
- Combined SVG source: `pets/livecat-default/source/livecat-layers.svg`
- Individual SVG source parts: `pets/livecat-default/source/layers/*.svg`
- Layer map and rig notes: `pets/livecat-default/source/livecat-layer-map.json`
- Parts table for review or PSD assembly: `pets/livecat-default/source/livecat-parts.csv`
- Cubism parameter plan: `pets/livecat-default/model/livecat-parameter-spec.json`
- AI prompt pack: `pets/livecat-default/design/ai-prompts.md`

The SVG files are editable upstream art. They are not the final Cubism import
format. Convert or repaint them into a Photoshop/CLIP STUDIO PSD with stable
part names before importing into Cubism Editor.

## Included concept asset

- `pets/livecat-default/preview/livecat-ai-concept.png` is a non-final concept reference for silhouette, facial softness, and keyboard pose.
- It is not treated as a riggable source file. The production source must be a layered PSD/Clip Studio file following `pets/livecat-default/source/livecat-layer-map.json`.

## Required motions

- `idle`: breathing, tiny head drift, subtle tail sway.
- `typing_sync`: alternating paws, key bounce, ears responding to rhythm.
- `pomodoro_focus`: low-distraction typing and occasional glance.
- `pomodoro_break`: stretch, yawn, tail curl, paw wave.
- `dragged`: body squash, paws tucked, tail lag.
- `fall_recover`: landing squash, head shake, return to idle.

## Rig quality bar

- 30fps and 60fps must both feel intentional.
- No flat body translation without secondary movement.
- Paw strikes must land on keyboard keys, not float above them.
- Ear and tail movement should be offset from body motion to avoid puppet-like stiffness.
