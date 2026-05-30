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
    use std::{ffi::c_void, mem::size_of, ptr};
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        OnceLock,
    };
    use tauri::Emitter;
    use windows_sys::Win32::{
        Devices::HumanInterfaceDevice::{HID_USAGE_GENERIC_KEYBOARD, HID_USAGE_PAGE_GENERIC},
        Foundation::{HWND, LPARAM, LRESULT, WPARAM},
        System::LibraryLoader::GetModuleHandleW,
        UI::{
            Input::{
                GetRawInputData, RegisterRawInputDevices, HRAWINPUT, RAWINPUT, RAWINPUTDEVICE,
                RAWINPUTHEADER, RID_INPUT, RIDEV_INPUTSINK, RIM_TYPEKEYBOARD,
            },
            WindowsAndMessaging::{
                CallNextHookEx, CreateWindowExW, DefWindowProcW, DispatchMessageW, GetMessageW,
                RegisterClassW, SetWindowsHookExW, TranslateMessage, HHOOK, HWND_MESSAGE, MSG,
                WH_KEYBOARD_LL, WM_INPUT, WM_KEYDOWN, WM_SYSKEYDOWN, WNDCLASSW, WS_OVERLAPPED,
            },
        },
    };

    static APP: OnceLock<AppHandle> = OnceLock::new();
    static STARTED: AtomicBool = AtomicBool::new(false);

    pub fn enable(app: AppHandle) -> KeyboardSyncStatus {
        let _ = APP.set(app);

        if !STARTED.swap(true, Ordering::SeqCst) {
            std::thread::spawn(|| {
                let raw_started = unsafe { run_raw_input_loop() };
                if !raw_started {
                    unsafe { run_hook_loop() };
                }
            });
        }

        KeyboardSyncStatus {
            supported: true,
            backend: "windows-raw-input",
            message: "Windows keyboard rhythm bridge is active. It emits timing pulses only and never stores key values.",
        }
    }

    unsafe fn run_raw_input_loop() -> bool {
        let class_name = encode_wide("DesktopLiveCatRawInput");
        let instance = GetModuleHandleW(ptr::null());
        let wnd_class = WNDCLASSW {
            lpfnWndProc: Some(raw_input_proc),
            hInstance: instance,
            lpszClassName: class_name.as_ptr(),
            ..std::mem::zeroed()
        };

        RegisterClassW(&wnd_class);

        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            ptr::null(),
            WS_OVERLAPPED,
            0,
            0,
            0,
            0,
            HWND_MESSAGE,
            ptr::null_mut(),
            instance,
            ptr::null(),
        );
        if hwnd.is_null() {
            STARTED.store(false, Ordering::SeqCst);
            return false;
        }

        let device = RAWINPUTDEVICE {
            usUsagePage: HID_USAGE_PAGE_GENERIC,
            usUsage: HID_USAGE_GENERIC_KEYBOARD,
            dwFlags: RIDEV_INPUTSINK,
            hwndTarget: hwnd,
        };

        let ok = RegisterRawInputDevices(&device, 1, size_of::<RAWINPUTDEVICE>() as u32) != 0;
        if !ok {
            STARTED.store(false, Ordering::SeqCst);
            return false;
        }

        let mut message: MSG = std::mem::zeroed();
        while GetMessageW(&mut message, ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }

        true
    }

    unsafe fn run_hook_loop() {
        let hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), ptr::null_mut(), 0);
        if hook.is_null() {
            STARTED.store(false, Ordering::SeqCst);
            return;
        }

        let mut message: MSG = std::mem::zeroed();
        while GetMessageW(&mut message, ptr::null_mut(), 0, 0) > 0 {
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
    }

    unsafe extern "system" fn raw_input_proc(
        hwnd: HWND,
        message: u32,
        w_param: WPARAM,
        l_param: LPARAM,
    ) -> LRESULT {
        if message == WM_INPUT && is_keyboard_down(l_param as HRAWINPUT) {
            emit_pulse("windows-raw-input");
        }

        DefWindowProcW(hwnd, message, w_param, l_param)
    }

    unsafe fn is_keyboard_down(input: HRAWINPUT) -> bool {
        let mut raw: RAWINPUT = std::mem::zeroed();
        let mut size = size_of::<RAWINPUT>() as u32;
        let read = GetRawInputData(
            input,
            RID_INPUT,
            &mut raw as *mut _ as *mut c_void,
            &mut size,
            size_of::<RAWINPUTHEADER>() as u32,
        );

        if read == u32::MAX || raw.header.dwType != RIM_TYPEKEYBOARD {
            return false;
        }

        let keyboard = unsafe { raw.data.keyboard };
        keyboard.Message == WM_KEYDOWN || keyboard.Message == WM_SYSKEYDOWN
    }

    unsafe extern "system" fn keyboard_proc(
        code: i32,
        w_param: WPARAM,
        l_param: LPARAM,
    ) -> LRESULT {
        if code >= 0 && (w_param as u32 == WM_KEYDOWN || w_param as u32 == WM_SYSKEYDOWN) {
            emit_pulse("windows-hook-fallback");
        }

        CallNextHookEx(ptr::null_mut() as HHOOK, code, w_param, l_param)
    }

    fn emit_pulse(source: &'static str) {
        if let Some(app) = APP.get() {
            let _ = app.emit(
                "keyboard-sync://pulse",
                TypingPulse {
                    at_ms: now_millis(),
                    source,
                },
            );
        }
    }

    fn encode_wide(value: &str) -> Vec<u16> {
        use std::os::windows::prelude::OsStrExt;
        std::ffi::OsStr::new(value)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect()
    }
}
