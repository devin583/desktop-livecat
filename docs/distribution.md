# Portable Distribution

## Standard package

`desktop-livecat-win11-x64.zip`

- Contains the Tauri executable and bundled `pets/` resources.
- Assumes Win11 has Microsoft Edge WebView2 Runtime available.
- Requires no administrator permissions and no installer.

## Full offline package

`desktop-livecat-win11-x64-full-offline.zip`

- Contains the standard package contents.
- Also includes Microsoft Fixed Version WebView2 Runtime under `runtime/webview2/`.
- Built only when `WEBVIEW2_FIXED_RUNTIME_DIR` points to an approved local runtime directory.
- On startup the app points WebView2 at that folder through `WEBVIEW2_BROWSER_EXECUTABLE_FOLDER`, which is the WebView2-supported override for a fixed runtime.

## GitHub release flow

- Push a `v*` tag to run `.github/workflows/windows-release.yml`.
- The workflow builds on `windows-latest`, validates resource packs, builds Tauri, creates portable zip archives, uploads artifacts, and attaches zip files to a tagged GitHub Release.
- The standard package is always produced. The full-offline package is produced by the local packaging script when a Fixed Version WebView2 runtime directory is supplied.

## Data migration

Copy these directories next to the executable:

- `pets/`: resource packs.
- `data/`: local state and settings.
