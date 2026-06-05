# Desktop LiveCat Pet Knowledge Changelog

This file tracks changes to the pet design and asset knowledge base. The
recurring research automation should append here whenever it updates product or
asset thinking.

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
