# Desktop LiveCat Pet Knowledge Changelog

This file tracks changes to the pet design and asset knowledge base. The
recurring research automation should append here whenever it updates product or
asset thinking.

## 2026-06-10

Version: 0.13.0
Confidence: high that queued action affordance improves interaction closure;
medium that the current dot treatment is the final visual language before
authored body-part action assets exist

Changes:

- Added a visible pending state for queued care actions. When the user taps a
  different action before the current reaction has held long enough, the next
  action now marks its button with a small breathing dot and soft border instead
  of feeling ignored.
- Shared the pending/active state across the compact pet dock, the right-click
  care menu, and the full interaction panel so all command surfaces tell the
  same interaction story.
- Cleared pending state through the same queue cancellation path used by drag,
  Pet Brain replies, and direct action execution, avoiding stale UI when an
  interaction is interrupted.
- Kept the affordance text-free and low-noise. This is a runtime closure cue,
  not a substitute for authored transition poses.

## 2026-06-10

Version: 0.12.0
Confidence: high that gaze easing improves perceived smoothness without adding
feature noise; medium that full intent still needs authored eye/head/timer
glance poses in premium assets

Changes:

- Changed pointer gaze from direct `look` assignment to a target/current model
  driven by `requestAnimationFrame`, so the head and eyes ease toward the
  pointer instead of snapping.
- Reused the same gaze target path for idle return and pointer leave, making the
  pet settle back to neutral rather than instantly resetting to center.
- Kept low-power and hidden-tab behavior immediate, avoiding unnecessary frame
  work when the app is not actively interactive.
- This is a runtime smoothness improvement only. It does not replace authored
  gaze, eyelid, ear, or head-turn assets.

## 2026-06-10

Version: 0.11.0
Confidence: high that drag release needs a quiet recovery cue for desktop-pet
physicality; medium that the current floor-ring cue is enough before authored
drag/recover body frames exist

Changes:

- Added a low-noise drag-release settle cue: after a real drag, the pet now gets
  a short floor-ring recovery beat instead of snapping silently back to idle.
- Kept the settle cue separate from care reactions and speech bubbles, so
  dragging does not create chatty or decorative noise.
- Avoided whole-cat or keyboard squash for spritesheet pets; the cue sits under
  the pet as an environmental recovery signal until premium drag/recover assets
  can move body parts independently.
- Skipped the cue in low-power mode and cleared it when a new drag starts.

## 2026-06-10

Version: 0.10.0
Confidence: high that low-noise touch affordance improves interaction
discoverability; medium that the current single head/body cue is enough before
premium hit-area assets exist

Changes:

- Added a text-free pet touch cue that appears only when the pointer is inside
  the current petting zone and no panel, menu, drag, or active reaction owns the
  interaction.
- Hid the cue as soon as a care reaction, Pet Brain reply, context menu, or drag
  intent takes over, keeping it as an affordance rather than another persistent
  decoration.
- Removed a duplicate interaction-timeout cleanup effect so the new queue,
  cooldown, and touch affordance logic share one cleanup path.
- Kept this as a discoverability improvement, not a final hit-area system. The
  next step is still authored head/body/paw/tail zones in premium assets.

## 2026-06-07

Version: 0.9.0
Confidence: high that action lock/cooldown is necessary for a smoother Codex-like
pet rhythm; medium that this first runtime slice is sufficient without authored
per-body-part animation assets

Changes:

- Added the first Motion Queue v2 runtime slice for care/chat reactions: active
  interactions now have minimum readable hold windows, per-action cooldowns, and
  a queued handoff path so repeated clicks do not restart the same motion and
  different actions do not hard-cut each other immediately.
- Made reaction bubbles and floating props inherit the Pet Brain interaction
  duration instead of fading on a fixed short CSS timer. This keeps feeding,
  playing, praise, focus, and failed-focus feedback visible for the full
  reaction beat.
- Cleared queued interactions when a drag intent takes over, preventing stale
  care actions from firing after the user starts dragging the pet.
- Kept this as a runtime pacing improvement only. It does not replace the
  missing premium body assets for independent head, paw, ear, tail, mouth, and
  keyboard motion.

## 2026-06-07

Version: 0.8.0
Confidence: high that v0.9.9 is the correct Pet Brain foundation before adding
any cloud or local model provider; high that explicit profile facts should be
separated from volatile chat history; medium that the current regex extraction is
enough only for the first local slice, not for full memory intelligence

Changes:

- Added a provider-ready Pet Brain chat adapter and schema normalizer. Candidate
  responses must resolve to bounded speech, known emotion, known motion, bounded
  bubble duration, and short memory hints before the UI uses them.
- Kept the deterministic local provider as the default so the app remains
  offline and testable while the runtime contract is hardened for future AI
  providers.
- Added the first Memory v2 profile slice: explicit user names and preferences
  persist as bounded facts separate from transient chat events and the daily
  diary.
- Surfaced profile memory in the Chat tab so the user can see what the pet
  thinks it remembers instead of hiding it in local state.
- Browser-verified that telling the pet "我叫杜比，我喜欢安静的提醒" writes the
  expected name and preference, and asking "我是谁？" replies with "我记得你是
  杜比" without corrupting the stored name to "谁".
- Proposed an automation update so the five-hour review can make low-risk,
  scoped product iterations after research, validation, and changelog updates.
  The Codex App requires this worktree automation change to be approved as a
  suggested update rather than applied immediately.

## 2026-06-07

Version: 0.7.0
Confidence: high that the fixed-corner control panel was the wrong spatial
model; high that mouse-anchored placement better matches Windows context-menu
expectations for this desktop-pet surface

Changes:

- Replaced fixed top-right control-panel placement for click/context launches
  with mouse-anchored floating placement and edge flipping.
- Reused the same placement helper for pet right-click menus and full control
  panels so Chat and Settings no longer jump away from the triggering command.
- Verified in browser coordinates that right-click Chat opened the full panel
  near the context command (`topRightFixed=false`) and selected the Chat tab.
- Verified right-click Settings opened the full panel near the settings command
  (`topRightFixed=false`) and selected the Settings tab.
- Updated `docs/pet-brain-body-roadmap.md` with the next Windows-mainline plan:
  AI-backed Pet Brain adapter, memory v2, motion queue v2, surface polish, and
  one premium layered-body proof.

## 2026-06-07

Version: 0.6.0
Confidence: high that v0.9.7 closes the first chat/memory runtime loop; medium
that the next best body-runtime step should be Live2D before more spritesheet
iteration

Changes:

- Added a compact Chat tab to the desktop control panel and kept it inside the
  small pet surface instead of adding another detached utility window.
- Added a right-click pet command that opens the Chat tab, keeping Talk/Ask Pet
  reachable from the character body rather than only from the full panel.
- Added local chat replies through the same Pet Brain response contract used by
  care and focus actions, so chat can trigger speech bubbles, emotion, motion,
  duration, and memory hints without granting raw text direct UI control.
- Added persisted local `petMemory` with bounded care/chat/focus events, short
  chat history, daily pet diary entries, and a user-visible clear-memory command.
- Routed care and focus interactions into memory events so the chat surface can
  refer to recent pet context instead of behaving like an isolated text box.
- Browser-verified the Windows-first local preview at
  `http://127.0.0.1:1420/`; the chat tab wrote conversation history, updated the
  diary, stored a recent memory clue, and triggered a focus bubble.

## 2026-06-07

Version: 0.5.0
Confidence: high that the first Pet Brain and visible review-loop foundation is
the correct next implementation layer; medium that the final chat provider and
premium body runtime should be chosen before prototyping

Changes:

- Added `docs/pet-brain-body-roadmap.md` to define the Pet Body, Pet Brain,
  Pet Memory, and Pet Tools layers, with explicit acceptance gates for local
  brain, visible automation, chat, memory, and premium body work.
- Added `src/petBrain.ts` and routed local care interactions through a shared
  `speech`, `emotion`, `motion`, `bubbleDurationMs`, and `memoryHints` response
  object. This is the local deterministic contract that later AI chat responses
  should also satisfy.
- Added `scripts/import-knowledge-review.mjs` and the `npm run knowledge:import`
  script so the five-hour Codex knowledge review can be imported into
  `docs/pet-knowledge-automation.md` instead of staying hidden in an isolated
  Codex worktree.
- Imported the latest review from
  `/Users/dubhe/.codex/automations/desktop-livecat-pet-knowledge-review/memory.md`
  into the main repository.
- Updated spritesheet generators and hatch-pet installation so generated
  manifests include `spritesheet.composition` metadata from the start.
- Added the new roadmap and automation ledger to the README research/design
  index.

## 2026-06-07

Version: 0.4.0
Confidence: high that the menu-scope and asset-source corrections are durable;
medium that Rive should stay secondary until a vector-first pet variant is
actually prototyped

Changes:

- Updated `docs/pet-product-design-knowledge.md` with a stricter right-click
  rule: context menus are command surfaces, not mini panels, and the default
  top-level action count should stay short.
- Updated `docs/pet-interaction-ux-knowledge.md` with a new 0.9.6 interaction
  decision: care-first command-only menus, contextual timer quick actions, and
  panel-first placement for planning/configuration.
- Updated `docs/pet-asset-pipeline-standards.md` to harden the Live2D handoff
  contract around PSD, RGB, 8bit/channel, and sRGB, and to narrow the correct
  roles of Live2D, Spine, and Rive instead of treating them as interchangeable.
- Added composition metadata to the current sample/template spritesheet manifests
  so the knowledge base no longer demands a contract that its own starter packs
  fail to declare.

Sources reviewed:

- Apple Human Interface Guidelines, context menus:
  https://developer.apple.com/design/human-interface-guidelines/context-menus
- Microsoft Windows app guidance, menus and context menus:
  https://learn.microsoft.com/windows/apps/design/controls/menus-and-context-menus
- Live2D Cubism, notes on PSD creation:
  https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/
- Spine runtimes:
  https://us.esotericsoftware.com/spine-runtimes
- Spine runtimes guide:
  https://us.esotericsoftware.com/spine-using-runtimes
- Rive state machine overview:
  https://rive.app/docs/editor/state-machine/state-machine
- Unity Sprite Atlas manual:
  https://docs.unity.cn/Manual/sprite-atlas.html
- OpenAI image generation guide:
  https://developers.openai.com/api/docs/guides/image-generation
- Deskgator product page:
  https://mydeskgator.com/
- Idle Pomodoro Pet product page:
  https://haveanaverageday.itch.io/idle-pomodoro-pet
- Desktop Pet product page:
  https://desktoppet.app/
- Paw-Paw product page:
  https://paw-paw.pet/

Open questions:

- The resource-pack generators and installer scripts still appear to emit
  spritesheet manifests without composition metadata. The docs and starter packs
  are now aligned, but the generation path may still lag behind.
- The current recommendation keeps Rive secondary for premium raster cats. That
  should be revisited only after a vector-first pet prototype or a UI-overlay
  companion variant exists.

## 2026-06-05

Version: 0.3.0
Confidence: high that v0.9.5 fixes the control-panel layout regression visible
in the Win11 desktop photo

Changes:

- Fixed the control panel layout regression where opening the panel translated
  the full pet layer left and made the cat, timer bubble, action dock, and panel
  feel detached.
- Added an in-panel close button and hid the floating settings gear while the
  panel is open, so the gear no longer overlaps the tab row.
- Suppressed duplicate floating action buttons, timer bubble, and tomato prop
  while the full control panel is open. The panel already contains those controls
  and status details.
- Disabled hover tooltips on visible control tabs so labels such as `互动` no
  longer appear as black boxes over the tab row.
- Normalized persisted pet scale to the same maximum as the settings slider
  (`1.25`) so stale state cannot reopen an oversized, cramped desktop pet.

## 2026-06-05

Version: 0.2.0
Confidence: high that v0.9.4 improves runtime interaction clarity; medium that
the current V2 spritesheets can reach the desired cuteness without new
action-specific source art

Changes:

- Implemented v0.9.4 product decisions: active care actions, longer reaction
  timing, failed/wilt feedback, pet-owned tomato focus, and persistent growth
  rewards.
- Fixed two QA findings from the v0.9.4 visual pass: abandoned focus no longer
  grants XP/coins from remaining time, and the right-click focus menu now clamps
  its height so it does not fall below the pet window.
- Updated `docs/pet-product-design-knowledge.md`,
  `docs/pet-interaction-ux-knowledge.md`, and
  `docs/pet-asset-pipeline-standards.md` with the runtime fix boundary and the
  next asset requirements.
- Rechecked the existing recurring Codex automation
  `desktop-livecat-pet-knowledge-review`; it remains the five-hour review loop
  for research, document updates, and changelog entries.
- Left untracked custom pet folder `pets/axiom-lynx/` untouched.

Sources reviewed:

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

## 2026-06-03

Version: 0.1.0
Confidence: high that the cleaned legacy path is unused by current production selection; medium that the next premium asset format should be chosen only after more art trials

Changes:

- Removed the deprecated `pets/gray-british-keyboard` and
  `pets/orange-tabby-keyboard` production packs. Their IDs remain mapped to V2 in
  runtime state migration.
- Removed the obsolete `import:incoming` and `refine:supplied-cats` scripts that
  produced old 7-column supplied-cat packs.
- Updated README and package metadata toward v0.9.3 so docs and release names no
  longer imply the project is stuck at v0.8.1.
- Added `docs/pet-product-design-knowledge.md` for product, motion,
  anthropomorphism, interaction, and Pomodoro integration theory.
- Expanded `docs/pet-asset-pipeline-standards.md` with asset taxonomy, source
  versus runtime split, anchor contract, AI generation request standard, and
  modern rigging tool notes.
- Created the recurring Codex automation
  `desktop-livecat-pet-knowledge-review` to revisit and update this knowledge
  base every five hours in an isolated worktree.

Recurring review protocol:

- Re-read current product docs before changing them.
- Use web search and cite sources, preferring official docs, primary product
  pages, or clearly identified design references.
- Append new evidence and decisions here.
- Bump the relevant document version when a durable decision changes.
- Keep app-code changes out of the automation unless the user explicitly asks
  for implementation.
- Do not touch untracked custom pet folders unless the user explicitly includes
  them.
