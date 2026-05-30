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

## Data migration

Copy these directories next to the executable:

- `pets/`: resource packs.
- `data/`: local state and settings.
