# Desktop LiveCat

Win11-first portable Live2D desktop cat. The app is built with Tauri v2, Rust,
React, and TypeScript. It prioritizes direct execution from a zip, offline use,
copyable resource packs, and high-quality animated cat behavior.

## Current v0.5 status

- Transparent frameless desktop pet window.
- Tray menu for show, hide, disabling click-through, and quit.
- Copyable `pets/` resource pack contract.
- Animated original cat fallback with breathing, blinking, ear/tail secondary
  motion, pointer-following eyes, paws, keyboard prop, keyboard rhythm sync, and
  Pomodoro states.
- Rust persistence into portable `data/state.json` when possible.
- Windows keyboard rhythm bridge prefers Raw Input and falls back to a low-level
  hook only if Raw Input registration fails. It emits timing pulses only; it
  does not store key values. Non-Windows dev builds use a focused-window
  fallback.
- Live2D Cubism model slot and art/rig brief are ready. SDK binaries and
  third-party models are intentionally not committed.
- GitHub Actions checks run on macOS and Windows. Tagged releases build the
  Win11 portable package.

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
```

`npm run tauri:build` intentionally uses `tauri build --no-bundle` so the default
deliverable stays a portable zip instead of an installer. The packaging script
then writes `release/desktop-livecat-win11-x64.zip` on Windows. To include a
Fixed Version WebView2 Runtime in the full-offline folder, set:

```bash
WEBVIEW2_FIXED_RUNTIME_DIR=/path/to/fixed-webview2 npm run package:portable
```

## Resource migration

Copy these folders next to the executable to move a pet setup to another
machine:

- `pets/`
- `data/`

See [docs/resource-pack.md](docs/resource-pack.md) and
[docs/distribution.md](docs/distribution.md).

## Research and design

- [docs/research.md](docs/research.md)
- [docs/live2d-art-brief.md](docs/live2d-art-brief.md)
- [docs/live2d-ai-generation-research.md](docs/live2d-ai-generation-research.md)
- [docs/keyboard-sync.md](docs/keyboard-sync.md)
