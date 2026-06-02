# Desktop Pet Asset Pipeline Standards

This note records the current asset standard for Desktop LiveCat after reviewing
the local Foki Pomodoro Cat design document at `/Users/dubhe/Desktop/设计文档.html`.

## Diagnosis

The bad alignment in the legacy cat packs is not only an art-quality issue. It is
a broken composition contract:

- Some spritesheets bake the keyboard into every frame, while the runtime also
  renders timer bubbles, reaction bubbles, and props as separate overlays.
- Legacy sheets contain detached hearts, Z marks, anger marks, and sparkle marks.
  Those effects compete with runtime overlays and make interactions look random.
- The old 7-column sheets do not declare whether the keyboard is a stable
  baseline, whether effects are baked, or where UI overlays should attach.
- JSON validation previously checked frame indexes, but not visual composition.

The result is predictable: cats, keyboard, timer, and props drift because the app
does not know which visual elements are part of the pet and which are runtime UI.

## Design Principles

Use the Foki document as the interaction model, not as a literal CSS-only art
solution.

- Timer integration must be diegetic: focus time should become food, growth,
  energy, or a visible pet-owned prop, not an unrelated panel.
- The pet should always have a low-noise life layer: breathing, blinking, tail
  sway, ear twitch, and small gaze shifts.
- State changes need anticipation, main action, and settle. Avoid one-frame
  jumps or instant collapse.
- Negative feedback should be emotional, not punitive: droopy ears, lower energy,
  or a softened failed pose is enough.
- Desktop mode should stay small, while expanded mode can show home, shop,
  partner collection, data, and rewards.

## Runtime Composition Contract

Every spritesheet pack must declare composition under `manifest.spritesheet`:

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

- `baseline=keyboard` means the keyboard bottom edge is the visual ground. The
  keyboard should not jump, squash, or drift during petting, feeding, praise, or
  focus.
- `bakedProps` lists props already inside the image frames. If the keyboard is
  baked, the runtime must not draw another keyboard over it.
- `detachedEffects=false` is required for current production packs. Detached
  hearts, Z marks, anger marks, sparks, speed lines, or text belong in runtime
  overlays, not in the spritesheet.
- Legacy packs may set `detachedEffects=true` only when marked deprecated.

## Asset Tiers

### Tier 1: Enhanced Spritesheet

Fastest acceptable route.

- Transparent PNG/WebP.
- Prefer `9 rows x 8 columns`.
- Current runtime contract is `192 x 208` cells; future premium packs should use
  higher source resolution and downsample cleanly.
- Keyboard baseline must stay fixed.
- Cat motion can move head, paws, ears, tail, and body, but should not move the
  keyboard unless the state is explicitly drag/recover.
- No detached effects baked into frames.

Required states:

- `idle`: breathing, blink, tail slow sway.
- `tap_left` / `tap_right`: anticipation, key press, rebound, settle.
- `typing`: calm alternating paw loop.
- `focus`: slower breathing, focused eyes, subtle ear/tail variation.
- `break`: stretch or attention pose.
- `happy`: completion/praise with stable keyboard.
- `sleepy`: lower head, slower breath.
- `failed`: softened disappointment.
- care overlays: petting, feeding, playing, cleaning, praise, and attention can
  reuse stable rows only when no dedicated row exists.

### Tier 2: Layered Rig Pack

Preferred long-term route.

The artist or AI system outputs a layered source, not only a flat atlas:

- Head, body, ears, eyes, eyelids, pupils, brows, nose, mouth, whiskers.
- Left/right front paws, back paws, tail root, tail middle, tail tip.
- Keyboard body, key groups, individual active keys, keyboard shadow.
- Fish, wand, brush, bell, heart, tomato, timer chip, home props.
- Separate ground shadow.

Each moving part needs a pivot:

- head at neck, ears at root, paws at shoulder/wrist, tail at each segment join,
  pupils at eye center, keyboard keys at their press axis.

This tier supports Live2D, Spine, Rive, or a custom 2D parameter rig. It is the
only route that can reliably achieve "cat moves, keyboard remains grounded" with
smooth tail inertia and gaze tracking.

## Pomodoro Integration Standard

The Pomodoro loop should be a pet loop:

1. Start focus: seed or tomato appears near the pet.
2. During focus: tomato grows or timer chip fills while the cat enters a calmer
   focus state.
3. Completion: cat eats or celebrates the tomato, gains energy/experience/coins.
4. Break: cat stretches, rests, or invites the user to move.
5. Abandon/failure: tomato wilts, cat looks mildly disappointed, no hard penalty.

The timer bubble is acceptable for the current small desktop widget, but the
next asset set should include tomato/food states so time becomes a visible object
owned by the pet.

## Acceptance Checklist

- No selectable production pack has baked detached effects.
- If a sprite includes a keyboard, runtime does not draw another keyboard.
- Timer, reactions, and props attach near a declared head/body anchor, not fixed
  magic coordinates.
- Petting changes the cat first; keyboard remains visually grounded.
- Completion animation does not split the cat and keyboard into unrelated objects.
- Frame changes preserve silhouette, face, markings, palette, and baseline.
- Validator catches composition metadata problems before release.
