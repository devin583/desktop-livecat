use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize)]
pub struct KeyboardSyncStatus {
    pub supported: bool,
    pub backend: &'static str,
    pub message: &'static str,
}

#[cfg(windows)]
#[derive(Debug, Clone, Serialize)]
struct TypingPulse {
    at_ms: u128,
    source: &'static str,
}

pub fn enable(app: AppHandle) -> KeyboardSyncStatus {
    platform::enable(app)
}

#[cfg(windows)]
fn now_millis() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[cfg(not(windows))]
mod platform {
    use super::*;

    pub fn enable(_app: AppHandle) -> KeyboardSyncStatus {
        KeyboardSyncStatus {
            supported: false,
            backend: "browser-focus-fallback",
            message: "Global keyboard sync is only enabled in Windows builds; focused-window rhythm fallback is active.",
        }
    }
}

#[cfg(windows)]
mod platform {
    use super::*;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        OnceLock,
    };
    use tauri::Emitter;
    use windows_sys::Win32::{
        Foundation::{LPARAM, LRESULT, WPARAM},
        UI::WindowsAndMessaging::{
            CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage,
            HHOOK, MSG, WH_KEYBOARD_LL, WM_KEYDOWN, WM_SYSKEYDOWN,
        },
    };

    static APP: OnceLock<AppHandle> = OnceLock::new();
    static STARTED: AtomicBool = AtomicBool::new(false);

    pub fn enable(app: AppHandle) -> KeyboardSyncStatus {
        let _ = APP.set(app);

        if !STARTED.swap(true, Ordering::SeqCst) {
            std::thread::spawn(|| unsafe {
                let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), 0, 0);
                if hook == 0 {
                    STARTED.store(false, Ordering::SeqCst);
                    return;
                }

                let mut message: MSG = std::mem::zeroed();
                while GetMessageW(&mut message, 0, 0, 0) > 0 {
                    TranslateMessage(&message);
                    DispatchMessageW(&message);
                }
            });
        }

        KeyboardSyncStatus {
            supported: true,
            backend: "windows-hook-fallback",
            message: "Windows keyboard rhythm bridge is active. It emits timing pulses only and never stores key values.",
        }
    }

    unsafe extern "system" fn keyboard_proc(
        code: i32,
        w_param: WPARAM,
        l_param: LPARAM,
    ) -> LRESULT {
        if code >= 0 && (w_param as u32 == WM_KEYDOWN || w_param as u32 == WM_SYSKEYDOWN) {
            if let Some(app) = APP.get() {
                let _ = app.emit(
                    "keyboard-sync://pulse",
                    TypingPulse {
                        at_ms: now_millis(),
                        source: "windows-hook-fallback",
                    },
                );
            }
        }

        CallNextHookEx(0 as HHOOK, code, w_param, l_param)
    }
}
