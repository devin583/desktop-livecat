# Win11 QA Checklist

Use this checklist on a clean Windows 11 x64 machine.

## Packages

- `desktop-livecat-win11-x64.zip` runs by double-clicking the `.exe`.
- `desktop-livecat-win11-x64-full-offline.zip` runs without installing WebView2.
- App starts while disconnected from the network.

## Desktop Behavior

- Transparent frameless window has no black background.
- Pet is always on top when enabled.
- Click-through preview disables itself after 10 seconds.
- Tray menu can show, hide, reload pets, open resources, and control timer.
- App survives display scale changes at 100%, 125%, and 150%.
- App survives taskbar on bottom, top, left, and right.
- App remains usable after entering and leaving fullscreen apps.

## Input

- Fast typing increases paw rhythm.
- Slow typing produces slower paw motion.
- Long key hold does not act like a key logger.
- English and Chinese IME input both trigger rhythm only.
- Keyboard sync disabled means no typing animation.

## Data

- Copying `pets/` and `data/` to another machine preserves resource packs and
  settings.
- Deleting `data/state.json` recreates a valid default state.
- Missing Live2D model shows fallback art instead of a blank window.
