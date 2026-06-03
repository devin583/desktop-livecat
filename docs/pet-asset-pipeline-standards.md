# Desktop LiveCat Asset Pipeline Standards

Version: 0.2.0
Last reviewed: 2026-06-03
Review cadence: every 5 hours through the pet knowledge automation
Confidence: high for current spritesheet constraints, medium for future Live2D/Rive/Spine tooling choice

This document defines how Desktop LiveCat should classify, request, validate, and
package pet assets. It replaces the loose "make a cute sheet" approach with a
composition contract that the app, artists, and AI generation tools can all
understand.

## Core Diagnosis

The visible misalignment in the old cat packs was not just weak art quality. It
was a broken asset contract.

- Some sheets baked the keyboard into every frame while the runtime also rendered
  timer bubbles, reaction bubbles, and props as overlays.
- Legacy sheets included detached hearts, Z marks, anger marks, sparkles, and
  soft shadows. Those are not stable pet anatomy, so they drifted or fought with
  runtime effects.
- The old 7-column sheets did not declare whether the keyboard was the stable
  ground, whether effects were baked, or where overlays should anchor.
- Validation checked JSON and file existence, but it could not infer visual
  intent from an ambiguous flat image.

The result was predictable: cat, keyboard, timer, and decorations moved like
unrelated objects. Good desktop pets need a source asset system, not only a final
atlas.

## Answer To The "Is This Still Old Slicing?" Question

No, the target workflow should not be "ancient slicing only". Slicing is still a
valid runtime delivery format because it is portable, offline, cheap to render,
and easy to validate. But it should be treated as a compiled artifact, not the
source of truth.

Use three layers:

1. Source identity: reference photos, concept art, palette, proportions,
   expression sheet, and layered parts.
2. Animation source: Live2D, Spine, Rive, or a structured 2D rig with named
   pivots and state clips.
3. Runtime package: spritesheet/WebP atlas, manifest anchors, props, overlays,
   and validation media.

A single flat image can be animated with modern tools, but believable movement
still requires segmentation, pivots, occlusion rules, and identity locking. If
those are missing, the animation becomes sliding, squashy, or visually fake.

## Asset Taxonomy

| Category | Purpose | Required Standard |
| --- | --- | --- |
| Identity references | Preserve the user's real cats or intended mascot | 5 to 12 clear photos when available, including face, body, markings, sitting pose, and signature features |
| Canonical character sheet | Locks visual identity before animation | Front pose, side cues, expression variants, palette, proportions, no background clutter |
| Layered source | Enables local motion instead of whole-image motion | Head, body, ears, eyes, eyelids, pupils, brows, mouth, whiskers, paws, tail segments, keyboard, keys, tomato/focus prop separated |
| Rig metadata | Makes motion controllable | Named pivots, anchors, z-order, occlusion notes, scale, safe frame, baseline |
| Action library | Defines behavior, not just poses | Idle, petting, feeding, playing, typing, focus, break, completion, abandon, sleep, drag, recover |
| Props | Objects the pet owns | Tomato, fish, brush, wand, bell, timer chip, small reward effects, furniture |
| Runtime overlays | UI-like effects that must not be baked | Timer bubble, context hint, care reaction, progress marker, menu badges |
| Audio, future | Emotional punctuation | Short, optional, user-controllable, no required online dependency |
| QA artifacts | Lets us see failures before shipping | Contact sheet, motion preview, anchor overlay, transparent-pixel check, baseline drift report |

## Recommended Folder Shape

```text
pets/<pet-id>/
  manifest.json
  preview/
  source/
    references/
    character-sheet.png
    layered/
    layer-map.json
    parts.csv
    action-brief.md
  model/
  spritesheet/
    avatar.webp
    states.json
  props/
  overlays/
  qa/
    contact-sheet.png
    anchor-overlay.png
    motion-preview.mp4
```

Current V2 spritesheet packs do not need every future folder, but every new
premium pack should be able to explain which source asset produced the shipped
runtime artifact.

## Runtime Composition Contract

Every production spritesheet pack must declare composition under
`manifest.spritesheet`:

```json
{
  "composition": {
    "baseline": "keyboard",
    "bakedProps": ["computer-keyboard"],
    "detachedEffects": false,
    "runtimeOverlays": ["timer-bubble", "care-props", "reaction-bubble"]
  }
}
```

Rules:

- `baseline=keyboard` means the keyboard bottom edge is visual ground. The
  keyboard must not jump, squash, or drift during petting, feeding, praise, or
  focus.
- `bakedProps` lists props already inside image frames. If the keyboard is baked,
  runtime must not draw another keyboard over it.
- `detachedEffects=false` is required for production packs. Detached hearts,
  sparks, Z marks, speed lines, text, and floor shadows belong in runtime
  overlays or separate props.
- Legacy packs may use `detachedEffects=true` only while marked deprecated.
  Deprecated packs should not be selectable in production.

## Anchor Contract

Every nontrivial pack should expose anchors in the manifest or state metadata.

Required anchors:

- `head`: timer bubble and attention reactions.
- `mouth`: feeding, completion bite, tomato handoff.
- `pawLeft` and `pawRight`: petting, key press, toy contact.
- `bodyCenter`: drag, settle, reward burst.
- `keyboardBaseline`: stable bottom ground when a keyboard is baked.
- `timerProp`: tomato/timer object when focus is active.

No overlay should be positioned only by magic pixels in React/CSS. If an overlay
has no anchor, it is not integrated with the pet.

## Motion Source Standard

Short-term production can keep enhanced spritesheets:

- Transparent PNG/WebP.
- Current runtime cell: `192 x 208`.
- Preferred grid: `9 rows x 8 columns`.
- Higher source resolution should be at least 4x and downsampled cleanly.
- No baked detached effects or soft cast shadows.
- Keyboard baseline fixed unless the state explicitly represents drag or fall.

Long-term premium packs should use a layered rig:

- Head pivots at neck.
- Ears pivot at root.
- Paws pivot at shoulder or wrist.
- Tail uses at least root, middle, and tip segments.
- Pupils move inside eye whites.
- Keyboard body is stable; active keys can depress locally.
- Tomato/timer prop has its own anchor and growth states.

This supports Live2D, Spine, Rive, or a custom 2D parameter rig. The choice is a
tooling decision; the asset truth is the same: separated parts, pivots, anchors,
and state clips.

## State And Action Requirements

Minimum pet states:

- `idle`: breathing, blink, tail slow sway, ear micro-twitch.
- `petting`: head or body leans into touch, eyes soften, keyboard grounded.
- `feeding`: mouth/paw/tomato or food prop interaction, not a detached icon.
- `playing`: paw and gaze follow a toy path, no whole-widget bounce.
- `typing`: alternating paw loop with optional key depression.
- `focus`: calmer breath, focused eyes, timer/tomato visible as pet-owned prop.
- `break`: stretch, rest, or relaxed pose.
- `happy`: completion/praise with anticipation, peak, and settle.
- `sleepy`: lower head, slow breath, reduced eye openness.
- `failed`: softened disappointment, droopy ears, no harsh punishment symbol.
- `dragged` and `recover`: movement semantics for window drag only.

Fallback is allowed only when the fallback still reads as the intended action.
For example, feeding cannot be a generic happy loop plus a random floating food
icon. That is not an interaction.

## Pomodoro Asset Standard

Focus must become a visible pet loop:

1. Start focus: seed or tomato appears near the pet.
2. Running focus: tomato grows, timer chip fills, or a bubble follows the head
   anchor.
3. Last minute: pet becomes more alert without alarming motion.
4. Completion: cat eats or celebrates the tomato, then gains energy, experience,
   or coins.
5. Break: pet stretches, rests, or invites a short recovery.
6. Abandon: tomato wilts, cat looks mildly disappointed, no hard penalty.

The timer bubble is acceptable for the compact desktop widget, but a premium
asset pack should include tomato growth and bite/eat states so time becomes a
pet-owned object instead of an unrelated card.

## AI Generation Request Standard

When asking an AI product to create pet assets, request outputs in this order:

1. Identity lock: canonical character sheet from user cat photos or mascot brief.
2. Layered source: named parts, transparent background, no baked UI, no soft
   shadow, no floating symbols.
3. Action contact sheet: each action as key poses with fixed baseline and frame
   boundaries.
4. Rig handoff: pivots, anchors, z-order, occlusion notes, expression list.
5. Runtime atlas: only after the source and actions are approved.

Prompt constraints:

- Preserve exact face shape, markings, colors, body proportions, and keyboard
  design across all actions.
- Keep the keyboard baseline fixed.
- Move cat parts locally for touch actions.
- Separate UI-like feedback as props or overlays.
- Use transparent or clean chroma-key background for extraction.
- Do not include readable text, frame numbers, guide marks, detached hearts,
  detached sparkles, speed lines, floor shadows, or speech bubbles inside the
  pet frames.

Tool fit:

- `hatch-pet`: good for Codex-compatible atlases, deterministic frame extraction,
  QA contact sheets, and validation.
- ChatGPT image generation: useful for canonical art, row strips, prop sheets,
  and iterative repair when grounded with references.
- Live2D Cubism: best when the source is a clean layered PSD with parts separated
  for deformation.
- Spine: strong for skeletal 2D animation and atlas packaging.
- Rive: strong for interactive vector motion and state machines.
- Unity Sprite Atlas style packaging: useful mental model for treating atlases
  as packed runtime artifacts, not authoring truth.

## Acceptance Checklist

- The selected production pack is not tagged `deprecated` or `legacy`.
- If a keyboard is baked, runtime does not draw another keyboard over it.
- Petting changes cat anatomy or expression first; keyboard stays grounded.
- Timer, reactions, and props attach to declared anchors.
- No production frame contains detached decorative effects.
- Frame changes preserve silhouette, face, markings, palette, and baseline.
- Every care action has immediate feedback and a visible consequence.
- Validator catches composition metadata problems before release.
- QA contact sheet and motion preview are reviewed before shipping.

## Source Notes

- Local Foki design document: `/Users/dubhe/Desktop/设计文档.html`.
- Hatch-pet skill: `/Users/dubhe/.codex/skills/hatch-pet/SKILL.md`.
- Apple Human Interface Guidelines, context menus:
  https://developer.apple.com/design/human-interface-guidelines/context-menus
- Microsoft Windows app guidance, menus and context menus:
  https://learn.microsoft.com/windows/apps/design/controls/menus-and-context-menus
- Material Design motion principles:
  https://m2.material.io/design/motion/understanding-motion.html
- Material Design motion speed:
  https://m2.material.io/design/motion/speed.html
- Live2D Cubism manual:
  https://docs.live2d.com/en/cubism-editor-manual/
- Spine documentation:
  https://esotericsoftware.com/spine-documentation
- Rive documentation:
  https://rive.app/docs
- Unity Sprite Atlas manual:
  https://docs.unity3d.com/Manual/sprite-atlas.html

## Version Log

- 0.2.0, 2026-06-03: Added asset taxonomy, source/runtime split, anchors,
  Pomodoro asset standard, AI generation request standard, and modern rigging
  tool notes. Cleaned the old 7-column supplied-cat path from production.
- 0.1.0, 2026-06-02: Recorded the initial composition diagnosis from the Foki
  design document and introduced `manifest.spritesheet.composition`.
