# Keyboard Sync Design

Desktop LiveCat maps typing rhythm to cat paw motion without storing key values.

## Event policy

- Record only a timestamp pulse and event source.
- Ignore concrete key codes, text, scan codes, and active window titles.
- Stop typing animation after 1.2 seconds without a pulse.
- Increase paw speed from recent pulse density.

## Windows bridge

- Preferred final backend: Raw Input on Win11.
- Current v0.1 bridge: low-level hook fallback in Windows builds plus focused-window browser fallback for development and non-Windows builds.
- The app must expose a visible privacy switch before any future backend records more than rhythm.
