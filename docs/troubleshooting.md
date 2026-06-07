# Troubleshooting

## App Does Not Start

- Use the full-offline zip if the machine may not have WebView2 Runtime.
- Keep `runtime/webview2/` next to the `.exe` in the full-offline package.
- Do not move the `.exe` out of the extracted folder.

## Pet Is Blank

- Check `pets/<pet-id>/manifest.json`.
- Check whether `live2d.modelJson` exists.
- If no Cubism export exists yet, fallback art should still render.

## Resource Pack Missing

- Put the pack under `pets/<pet-id>/`.
- Confirm `manifest.json` exists and `id` matches the folder name.
- Use the refresh button or tray reload item.

## Keyboard Sync Missing

- On Windows, the app prefers Raw Input and falls back to a low-level hook.
- It stores rhythm timing only, never key values.
- Disable and re-enable the keyboard button if the bridge starts after the UI.

## Full-Offline Package Too Large

- This is expected. It bundles Microsoft Fixed Version WebView2 Runtime so users
  do not need to install dependencies.

## Update Still Shows Old Behavior

- Confirm the zip filename includes the expected version, for example
  `desktop-livecat-v0.9.9-win11-x64-portable.zip`.
- Close every running Desktop LiveCat process before extracting the new package.
- Keep `data/` and custom `pets/`, but let bundled app files come from the new
  zip.
- In Settings, run "Clean runtime cache" and restart the app. This preserves
  settings and pet packs while clearing stale WebView/local storage cache.
