# Desktop LiveCat Asset Pipeline Standards

Version: 0.4.0
Last reviewed: 2026-06-07
Review cadence: every 5 hours through the pet knowledge automation
Confidence: high for current spritesheet constraints, composition diagnosis, and Live2D source requirements; medium for future Live2D/Rive/Spine tooling choice

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

## v0.9.4 Runtime Patch And Remaining Asset Debt

The v0.9.4 runtime fixes the most visible composition failures without pretending
the assets are complete:

- Synthetic spritesheet floor shadow is disabled. The V2 cat sheets already
  include keyboard/ground treatment, so a runtime pseudo-shadow created double
  shadow and top/crop artifacts during motion.
- Care, focus, completion, and failure feedback now use pet-stage overlays
  instead of editing the baked atlas. This prevents the cat and keyboard from
  being scaled together for local touch feedback.
- Deprecated supplied-cat IDs still migrate to V2 packs, and the default pack is
  `orange-tabby-keyboard-v2`.
- Growth values are stored in runtime state, not in the asset. The asset only
  needs anchors and expressive action states; XP/coins/streak remain product
  state.

The remaining debt is not solvable by CSS alone. The current V2 atlas can
represent basic moods, but `petting`, `feeding`, `playing`, `completion-eat`, and
`abandon-wilt` are semantic aliases over generic rows. The next asset pack must
provide either independent rows for those actions or a layered rig with named
pivots and state clips.

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

## 2026-06-07 Tooling Clarification

The current official docs make the tool boundaries more concrete than this file
previously stated.

- Live2D Cubism is not "any layered source is fine." Its official import path is
  PSD, and the documented safe conditions are RGB and 8bit/channel. The
  guaranteed-working authoring apps are Adobe Photoshop and Clip Studio Paint.
- Spine is strongest when the team wants skeletal animation plus explicit runtime
  control over animation blending, layering, and procedural manipulation. Its
  export contract is skeleton data plus a texture atlas, which matches the
  "source asset versus runtime package" split already used by this repo.
- Rive is strongest when the team wants interactive state machines authored by
  design and driven by runtime inputs. That is a compelling fit for vector-first
  pets or overlay widgets, not automatically for painterly raster cat assets.

The previous document was too vague on this last point. For Desktop LiveCat's
current raster-cat direction, Live2D remains the first premium-rig path, Spine
is the strongest alternate path when atlas-driven skeletal control matters, and
Rive is best reserved for vector-native variants or UI-like companion elements.

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

Starter packs should also stop being metadata-free. Even templates and sample
spritesheet packs should declare provisional composition metadata so artists and
validators start from the same contract as production packs.

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
- Template and sample packs should already include composition metadata so the
  artist handoff starts from the correct runtime assumptions.

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
  and iterative repair when grounded with references. Current OpenAI image docs
  also support using one or more reference images, which is useful for identity
  lock and prop consistency before atlas compilation.
- Live2D Cubism: best when the source is a clean layered PSD with parts separated
  for deformation. Standardize the handoff as PSD, RGB, 8bit/channel, sRGB.
- Spine: strong for skeletal 2D animation and atlas packaging.
- Rive: strong for interactive vector motion and state machines, but not the
  default recommendation for current raster-cat premium packs.
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
- Live2D Cubism, notes on PSD creation:
  https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/
- Spine documentation:
  https://us.esotericsoftware.com/spine-runtimes
- Spine runtimes guide:
  https://us.esotericsoftware.com/spine-using-runtimes
- Rive documentation:
  https://rive.app/docs/editor/state-machine/state-machine
- Unity Sprite Atlas manual:
  https://docs.unity.cn/Manual/sprite-atlas.html
- OpenAI image generation guide:
  https://developers.openai.com/api/docs/guides/image-generation

## Version Log

- 0.4.0, 2026-06-07: Tightened the Live2D source spec to PSD/RGB/8bit/sRGB,
  clarified when Spine or Rive are actually the right premium path, and required
  template/sample spritesheet packs to carry composition metadata from the
  start.
- 0.3.0, 2026-06-05: Added the v0.9.4 runtime patch notes, clarified that
  spritesheet shadow/crop fixes are runtime composition safeguards, and recorded
  the remaining need for action-specific rows or rigged layers.
- 0.2.0, 2026-06-03: Added asset taxonomy, source/runtime split, anchors,
  Pomodoro asset standard, AI generation request standard, and modern rigging
  tool notes. Cleaned the old 7-column supplied-cat path from production.
- 0.1.0, 2026-06-02: Recorded the initial composition diagnosis from the Foki
  design document and introduced `manifest.spritesheet.composition`.
