# Desktop LiveCat Product Design Knowledge

Version: 0.3.0
Last reviewed: 2026-06-07
Review cadence: every 5 hours through the pet knowledge automation
Confidence: high for interaction hierarchy, context-menu scope, and runtime integration; medium for final emotional tuning until more custom action assets exist

This document captures the product theory for Desktop LiveCat: how the pet should
feel alive, how Pomodoro should become part of the pet, and how future iterations
should decide whether a feature belongs in care, focus, settings, or assets.

## Product Thesis

Desktop LiveCat is not a Pomodoro panel with a cat skin. It should be a desktop
companion where focus, care, mood, and reward form one closed loop.

The strongest design line is from the local Foki design document:

- Focus time becomes food.
- Food changes the pet's energy and mood.
- Mood gives immediate emotional feedback.
- Growth, rewards, and streaks make the loop persistent.

If a timer only appears as an independent card, the integration has failed. If a
care action only changes a menu value, the interaction has failed. If touching a
cat compresses the whole cat plus keyboard as one flat bitmap, the animation
contract has failed.

## Reference Model

Useful references and what to borrow:

| Reference | Keep | Do Not Copy Blindly |
| --- | --- | --- |
| QQ Pet | Closed care loop, needs, mood, growth, games, soft companionship | Interruptive old desktop behavior, cluttered menus, obsolete UI chrome |
| Foki design doc | Time as tomato/food, energy, growth, streaks, warm feedback | Its pure CSS asset approach as final production format |
| Material motion | Anticipation, clear easing, scale-aware motion durations | Generic enterprise UI feeling |
| Apple and Microsoft context menus | Right-click should be short, contextual, and task-related | Turning context menus into full settings panels |
| MacPet and Idle Pomodoro Pet examples | Pet plus focus can be one emotional loop | Treating pet as decorative timer mascot only |
| Live2D, Spine, Rive | Layered motion, pivots, state machines | Overcommitting to one rigging tool before assets are ready |

## Design Layers

The pet experience should be built from five layers.

1. Life baseline: always-on breathing, blink, gaze, tail, ear, and slight posture
   variation. This proves the pet is alive even when the user does nothing.
2. Direct care: petting, feeding, playing, praise, cleaning, attention. These are
   pet-first actions and should produce local body/expression movement.
3. Focus loop: start, pause, resume, complete, abandon, break, long break. These
   are task rhythm actions and should surface only when there is timer context.
4. Growth loop: energy, mood, experience, coins, streak, unlocks, home/furniture.
   These make repeated use meaningful.
5. System controls: settings, pet selection, scale, update, cache, quit. These
   should stay out of the emotional care menu unless context demands them.

## Anthropomorphism Rules

The pet should feel intentional, not human in a forced way.

- Intent starts in the eyes. Gaze should lead or follow actions: look at food,
  look toward the pointer with easing, glance at the timer near completion.
- Ears and tail are emotional amplifiers. They should move with different timing
  from the head so the pet does not feel like one rigid sticker.
- The pet owns important objects. Tomato, timer chip, bell, toy, and food should
  anchor to mouth, paw, head, or desk, not float as unrelated UI.
- Local touch causes local response. Petting should move head, ears, eyelids,
  body lean, or paws. It should not compress the entire cat and keyboard.
- Small imperfection makes life. Add anticipation, follow-through, settle,
  asymmetric blink timing, and occasional idle variation.
- Do not over-interrupt. Desktop pets become annoying when they demand attention
  too often. Use gentle cues by default and stronger cues only when user action
  has already opened a focus or care loop.

## Motion Timing Standard

Motion should use different scales for UI, reactions, and ambient life.

| Motion Type | Duration | Notes |
| --- | --- | --- |
| Context menu reveal | 120 to 220 ms | UI motion, low personality |
| Small touch response | 180 to 320 ms | Immediate feedback, local body part |
| Pet reaction beat | 450 to 900 ms | Anticipation, main action, settle |
| Completion celebration | 1.2 to 3.6 s | Rewarding but not disruptive |
| Idle loop | 2.4 to 6.0 s | Slow, layered, low-noise |
| Sleepy or focus loop | 4.0 to 9.0 s | Slower breathing and reduced motion |

Recommended easing:

- Small UI reveal: ease-out.
- Pet anticipation: ease-in for the preparation.
- Pet main response: spring-like or emphasized ease-out.
- Settle: slow ease-out with a held final pose.

Do not use instant one-frame swaps for emotional actions. Do not let every
animated layer start and stop at the same time.

## Interaction Hierarchy

Left click and hover:

- Primary direct touch should pet or nudge the cat.
- Touch zones can specialize later: head petting, paw tap, tail attention,
  keyboard typing sync.
- Visual feedback must arrive within roughly 100 to 250 ms.

Right click:

- Default menu: care actions plus a compact focus entry.
- During active focus: quick timer controls can appear above or below care
  actions, such as pause, resume, add five minutes, end focus, start break.
- Settings should be reachable from the context menu but should not look like a
  primary pet action.
- Right-click remains a command surface, not a micro-panel. Apple and Microsoft
  both treat context menus as shortcuts to item-related actions, so sliders,
  long descriptions, confirmations, or arbitrary status cards do not belong
  there.
- Keep the default top-level menu short: usually 4 to 6 primary commands plus
  separators or one contextual timer section. If the user needs planning,
  explanation, history, or dense configuration, push that into the focus panel
  or settings.

Focus panel:

- Full Pomodoro configuration belongs here: duration, task, estimates, records,
  stats, auto-flow, long break rules.
- The focus panel is a planning surface, not the pet's emotional surface.

Settings:

- Global app and resource controls live here.
- The visible settings button should not dominate the pet. Context menu access
  and a quieter icon are better than a large floating control.

## Pomodoro Integration Model

Good integration makes the timer a pet-owned story.

| Timer State | Pet Expression | Object Treatment | Reward/Consequence |
| --- | --- | --- | --- |
| Ready | Curious, waiting | Seed or tomato prompt near paw/head | None |
| Focus started | Prepared, leaning in | Tomato appears or timer chip lights up | Energy intent starts |
| Running | Calm, focused | Tomato grows or bubble counts down | Low-noise progress |
| Last minute | Alert but not anxious | Tomato almost ripe | Anticipation |
| Paused | Looking back or waiting | Bubble dims, timer chip paused | No penalty |
| Completed | Happy, eats or celebrates tomato | Tomato consumed | Energy, XP, coins, streak |
| Break | Stretching or resting | Timer uses warmer/rest color | Recovery |
| Abandoned | Soft disappointment | Tomato wilts | No reward, no harsh punishment |

The number can appear above or near the head, but only when it is anchored to the
pet and visually belongs to the current state. A detached corner timer is a tool
feature, not pet integration.

## 2026-06-07 Durable Market Read

Current desktop-pet products still support the same product thesis instead of
refuting it.

- Deskgator positions itself as a desktop companion whose focused work changes
  the pet's animation state, including a dedicated flow animation and break
  animation after focused work.
- Idle Pomodoro Pet makes the right-click menu a compact timer launcher, then
  turns focus and break into character behavior: sleeping during focus,
  wandering during breaks, and care/play/feed loops after the timer.
- Desktop Pet app and similar current products keep advertising the same bundle:
  cute animated companion, Pomodoro timer, reminders, and soft productivity
  cues. The market is not rewarding "plain timer with mascot skin"; it keeps
  rewarding a joined pet-plus-focus loop.

This does not mean copying those products. It means the present market still
supports the same structural bet: pet behavior is the product, timer controls
are only one subsystem.

## v0.9.4 Runtime Decision

The v0.9.4 implementation treats focus as a pet-owned loop instead of a parallel
timer panel:

- Focus start creates a tomato/timer prop near the pet.
- Running focus changes the tomato stage and keeps the number inside the pet
  stage, not in a detached dashboard.
- Completion applies XP, coins, energy, fullness, happiness, bond, and streak.
- Completion review can convert extra focus minutes into additional reward.
- Abandoning a focus session creates a wilted-tomato failure beat and avoids
  reward, making the consequence visible without harsh punishment.
- Care actions keep their active state and visible reaction until the motion
  duration completes, so the UI no longer snaps back to the first option.

This is still a runtime overlay solution. It is the correct near-term fix
because the current V2 spritesheets do not contain independent petting, feeding,
playing, tomato-eating, or failure-eat animation rows. The next premium asset
pack must move those beats into source animation or rigged layers instead of
using generic row aliases plus CSS props.

## Menu And Action Design Decisions

- Care and focus should not be mixed as one flat list. They can share a context
  menu only when grouped by context.
- The action menu must not reset to the first option after a click. Selection and
  consequence should remain legible until the animation completes.
- Every action needs three outputs: motion feedback, state/value consequence, and
  recovery path.
- If a command has no visible pet consequence, it should move to settings or the
  focus panel.

## Design Debt Backlog

- Expand the first text-free petting cue into authored per-action touch zones
  for head, body, paw, tail, and keyboard interactions.
- Expand the first runtime action cooldown/animation lock and drag-release cue
  into a fuller motion queue with authored anticipation, contact, hold, and
  settle phases.
- Add `petting`, `feeding`, `playing`, and `completion-eat` states to premium
  assets instead of reusing generic happy/focus loops.
- Move settings access toward context menu plus subtle icon treatment.
- Add anchor-based timer and prop placement so bubbles follow the pet instead of
  fixed coordinates.
- Add a richer growth layer: energy, mood, XP, coins, streak, and home/furniture.
- Decide whether the default menu should hard-cap its top-level actions in code
  or rely on design review only. The current knowledge says it should stay
  short; enforcement is still a product/tooling decision.

## Source Notes

- Local Foki design document: `/Users/dubhe/Desktop/设计文档.html`.
- QQ Pet overview:
  https://zh.wikipedia.org/wiki/QQ%E5%AE%A0%E7%89%A9
- Virtual pet overview:
  https://en.wikipedia.org/wiki/Virtual_pet
- Apple Human Interface Guidelines, context menus:
  https://developer.apple.com/design/human-interface-guidelines/context-menus
- Microsoft Windows app guidance, menus and context menus:
  https://learn.microsoft.com/windows/apps/design/controls/menus-and-context-menus
- Material Design motion principles:
  https://m2.material.io/design/motion/understanding-motion.html
- Material Design motion speed:
  https://m2.material.io/design/motion/speed.html
- MacPet Pomodoro pet example:
  https://mac-pet.com/pomodoro-mac/
- Idle Pomodoro Pet example:
  https://haveanaverageday.itch.io/idle-pomodoro-pet
- Deskgator product page:
  https://mydeskgator.com/
- Desktop Pet product page:
  https://desktoppet.app/

## Version Log

- 0.3.0, 2026-06-07: Added the context-menu scope rule from current Apple and
  Microsoft guidance, recorded the short-menu budget, and added a durable market
  read from current desktop-pet products reinforcing the pet-owned focus loop.
- 0.2.0, 2026-06-05: Recorded the v0.9.4 runtime decision: tomato-owned focus,
  pet growth rewards, active action state, failure/wilt feedback, and the
  remaining requirement for true action-specific assets.
- 0.1.0, 2026-06-03: Captured the product thesis, design layers,
  anthropomorphism rules, motion timing, interaction hierarchy, Pomodoro
  integration model, and current design debt backlog.
