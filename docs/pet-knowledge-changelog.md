# Desktop LiveCat Pet Knowledge Changelog

This file tracks changes to the pet design and asset knowledge base. The
recurring research automation should append here whenever it updates product or
asset thinking.

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
