# Portable Distribution

## Standard package

`desktop-livecat-v<version>-win11-x64-portable.zip`

- Contains the Tauri executable and bundled `pets/` resources.
- Assumes Win11 has Microsoft Edge WebView2 Runtime available.
- Requires no administrator permissions and no installer.

## Full offline package

`desktop-livecat-v<version>-win11-x64-full-offline.zip`

- Contains the standard package contents.
- Also includes Microsoft Fixed Version WebView2 Runtime under `runtime/webview2/`.
- Built when `WEBVIEW2_FIXED_RUNTIME_DIR` points to an approved extracted runtime directory.
- Tagged Windows releases fetch the current official x64 Fixed Version Runtime CAB from Microsoft's WebView2 download page, expand it, and set `WEBVIEW2_FIXED_RUNTIME_DIR` before packaging.
- On startup the app points WebView2 at that folder through `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER`, which is the WebView2-supported override for a fixed runtime.

## GitHub release flow

- Push a `v*` tag to run `.github/workflows/windows-release.yml`.
- The workflow builds on `windows-latest`, validates resource packs, builds Tauri, creates portable zip archives, uploads artifacts, and attaches zip files to a tagged GitHub Release.
- The standard package is always produced. The full-offline package is produced after the workflow resolves and expands the official Fixed Version Runtime CAB.
- `npm run verify:portable` checks archive contents before upload.

## Data migration

Copy these directories next to the executable:

- `pets/`: resource packs.
- `data/`: local state and settings.

## Upgrade flow

- The app checks GitHub Releases for newer tags and can open the latest release
  page from Settings or the tray menu.
- It does not replace the running executable. Users should close the app,
  extract the new zip, and keep or copy `data/` plus any custom pet folders.
- The Settings cache cleaner is intentionally conservative. It removes only
  `data/cache/`, `data/tmp/`, `data/update-downloads/`, and the app cache
  directory when present.
- Never delete `runtime/webview2/` during cleanup; full-offline packages need it
  for machines without a system WebView2 runtime.
