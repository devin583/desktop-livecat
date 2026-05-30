# Keyboard Sync Design

Desktop LiveCat maps typing rhythm to cat paw motion without storing key values.

## Event policy

- Record only a timestamp pulse and event source.
- Ignore concrete key codes, text, scan codes, and active window titles.
- Stop typing animation after 1.2 seconds without a pulse.
- Increase paw speed from recent pulse density.

## Windows bridge

- Current Win11 backend: Raw Input registered against a hidden message-only window.
- Fallback backend: `WH_KEYBOARD_LL` low-level hook if Raw Input registration fails.
- Development fallback: focused-window browser events on non-Windows builds and while the native bridge is unavailable.
- The app exposes a keyboard rhythm toggle and must never record text, key codes, scan codes, or window titles.
