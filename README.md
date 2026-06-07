# Desktop LiveCat

Win11-first portable Live2D desktop cat. The app is built with Tauri v2, Rust,
React, and TypeScript. It prioritizes direct execution from a zip, offline use,
copyable resource packs, and high-quality animated cat behavior.

## Current v0.9.8 status

- Transparent frameless desktop pet window.
- Tray menu for show, hide, disabling click-through, and quit.
- Default pet-first view with a collapsible settings panel, so the desktop pet
  does not boot into a large control overlay.
- Chinese and English UI toggle.
- Copyable `pets/` resource pack contract with `live2d`, `spritesheet`, and `hybrid`
  render modes.
- Illustrator handoff workflow with a template pack, checklist, and source/rigging docs.
- Built-in `pixel-mochi` spritesheet pet and `pets/_spritesheet-template/`
  artist handoff for 8 x 9 custom pets.
- Local custom-pet installer for pet folders, zip packages, and single image
  spritesheets. The optional draft creator turns a prompt into a fully local
  static resource pack without requiring network access at runtime.
- Animated original cat fallback with breathing, blinking, ear/tail secondary
  motion, pointer-following eyes, paws, keyboard prop, keyboard rhythm sync, and
  upgraded Pomodoro states. Keyboard sync now uses a sharper alternating paw
  strike inspired by BongoCat-style left/right hand presses.
- Rust persistence into portable `data/state.json` when possible.
- Windows keyboard rhythm bridge prefers Raw Input and falls back to a low-level
  hook only if Raw Input registration fails. It emits timing pulses only; it
  does not store key values. Non-Windows dev builds use a focused-window
  fallback.
- Live2D Cubism model slot and art/rig brief are ready. SDK binaries and
  third-party models are intentionally not committed.
- GitHub Actions checks run on macOS and Windows. Tagged releases build the
  Win11 portable package.
- The app can check GitHub Releases for new versions, open the download page,
  and clean safe runtime caches while preserving `data/`, custom `pets/`, and
  the full-offline WebView2 runtime.
- The old 7-column supplied-cat packs and their one-off import/refine scripts
  have been removed from production packaging. Existing local state still
  migrates their IDs to the V2 packs.
- The default selection is locked to the orange V2 cat, with the gray V2 cat
  next in the pet picker. Deprecated supplied-cat IDs are migrated to V2 packs
  before rendering.
- Pet care now has visible action feedback, longer reaction timing, active
  action state, care consequences, level, XP, coins, and focus streak rewards.
- Care interaction bubbles now route through the local Pet Brain response
  contract, carrying speech, emotion, motion, duration, and memory hints for
  future chat/memory integration.
- The control panel has a compact Chat tab. Local chat replies now use the same
  Pet Brain contract as care/focus actions, trigger pet bubbles/motions, write
  short conversation history, and maintain local memory plus a daily pet diary.
- Pomodoro state is rendered as a pet-owned tomato/timer overlay near the cat,
  with completion reward, pause/rest styling, and abandoned-focus wilt feedback.
- The runtime disables synthetic floor shadow for spritesheet cats so baked
  keyboard sprites do not show double shadow/crop artifacts.
- The full control panel no longer pushes the pet out of frame. When the panel
  is open, duplicate floating action/timer overlays are suppressed and the panel
  has its own close control.
- Right-click menus and the full control panel now use mouse-anchored floating
  placement with edge flipping, so Chat and Settings open near the triggering
  pet/context command instead of jumping to a fixed corner.
- The five-hour Codex knowledge review can now be imported into a main-repo
  automation ledger instead of staying hidden in isolated Codex worktrees.
- Desktop pet product thinking, interaction principles, Pomodoro integration,
  and asset-pipeline decisions are versioned in `docs/` for continued iteration.

## Run locally

```bash
npm install
npm run tauri:dev
```

For browser-only UI work:

```bash
npm run dev
```

## Build

```bash
npm run tauri:build
npm run package:portable
npm run verify:portable
```

`npm run tauri:build` intentionally uses `tauri build --no-bundle` so the default
deliverable stays a portable zip instead of an installer. The packaging script
uses versioned artifact names such as
`release/desktop-livecat-v0.9.8-win11-x64-portable.zip` on Windows. To include a
Fixed Version WebView2 Runtime in the full-offline folder locally, download and
extract Microsoft's official CAB, then set:

```bash
WEBVIEW2_FIXED_RUNTIME_DIR=/path/to/fixed-webview2 npm run package:portable
```

Tagged Windows releases run `npm run download:webview2-fixed` first, using
Microsoft's WebView2 download page as the source, so they also produce
`desktop-livecat-v0.9.8-win11-x64-full-offline.zip`.

## Upgrade

The app checks GitHub Releases at startup at most once every 24 hours and also
offers a manual check in Settings. For portable upgrades, close the app, extract
the new zip, and keep or copy these folders if they exist:

- `data/`
- custom pet folders under `pets/`

The Settings panel includes a safe cache cleaner. It removes only app cache/temp
folders and stale browser storage; it keeps settings, focus records, custom pet
packs, and `runtime/webview2/`.

## Resource migration

Copy these folders next to the executable to move a pet setup to another
machine:

- `pets/`
- `data/`

See [docs/resource-pack.md](docs/resource-pack.md) and
[docs/spritesheet-pets.md](docs/spritesheet-pets.md).

## Illustrator workflow

Give illustrators [docs/artist-handoff.md](docs/artist-handoff.md) and copy
`pets/_template/` for Live2D or `pets/_spritesheet-template/` for fast custom
spritesheet pets. For spritesheet pets the illustrator only needs to fill an
8 x 9 grid, export PNG/WebP/SVG, and update the preview. Engineering handles
validation, packaging, and optional Live2D binding.

```bash
ARTIST_ASSET_CHECK=1 npm run validate:pets
```

## Research and design

- [docs/research.md](docs/research.md)
- [docs/artist-handoff.md](docs/artist-handoff.md)
- [docs/live2d-rigging-handoff.md](docs/live2d-rigging-handoff.md)
- [docs/live2d-art-brief.md](docs/live2d-art-brief.md)
- [docs/live2d-tooling.md](docs/live2d-tooling.md)
- [docs/live2d-ai-generation-research.md](docs/live2d-ai-generation-research.md)
- [docs/pet-brain-body-roadmap.md](docs/pet-brain-body-roadmap.md)
- [docs/pet-product-design-knowledge.md](docs/pet-product-design-knowledge.md)
- [docs/pet-interaction-ux-knowledge.md](docs/pet-interaction-ux-knowledge.md)
- [docs/pet-asset-pipeline-standards.md](docs/pet-asset-pipeline-standards.md)
- [docs/pet-knowledge-changelog.md](docs/pet-knowledge-changelog.md)
- [docs/pet-knowledge-automation.md](docs/pet-knowledge-automation.md)
- [docs/keyboard-sync.md](docs/keyboard-sync.md)
- [docs/spritesheet-pets.md](docs/spritesheet-pets.md)
- [docs/win11-qa.md](docs/win11-qa.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/roadmap.md](docs/roadmap.md)
