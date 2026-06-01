# Desktop LiveCat

Win11-first portable Live2D desktop cat. The app is built with Tauri v2, Rust,
React, and TypeScript. It prioritizes direct execution from a zip, offline use,
copyable resource packs, and high-quality animated cat behavior.

## Current v0.8.1 status

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
`release/desktop-livecat-v0.8.1-win11-x64-portable.zip` on Windows. To include a
Fixed Version WebView2 Runtime in the full-offline folder locally, download and
extract Microsoft's official CAB, then set:

```bash
WEBVIEW2_FIXED_RUNTIME_DIR=/path/to/fixed-webview2 npm run package:portable
```

Tagged Windows releases run `npm run download:webview2-fixed` first, using
Microsoft's WebView2 download page as the source, so they also produce
`desktop-livecat-v0.8.1-win11-x64-full-offline.zip`.

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
- [docs/keyboard-sync.md](docs/keyboard-sync.md)
- [docs/spritesheet-pets.md](docs/spritesheet-pets.md)
- [docs/win11-qa.md](docs/win11-qa.md)
- [docs/troubleshooting.md](docs/troubleshooting.md)
- [docs/roadmap.md](docs/roadmap.md)
