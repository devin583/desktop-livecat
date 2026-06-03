# Desktop LiveCat Pet Knowledge Changelog

This file tracks changes to the pet design and asset knowledge base. The
recurring research automation should append here whenever it updates product or
asset thinking.

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
