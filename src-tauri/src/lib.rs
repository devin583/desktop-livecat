mod keyboard_sync;

use serde::Serialize;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, PhysicalPosition, Window,
};

#[derive(Debug, Serialize)]
struct PetPack {
    id: String,
    name: String,
    version: String,
    artist: String,
    description: String,
    live2d_model: Option<String>,
    preview: Option<String>,
    source: String,
    tags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct RuntimeInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    #[serde(rename = "dataDir")]
    data_dir: String,
    #[serde(rename = "petRoots")]
    pet_roots: Vec<String>,
    #[serde(rename = "portableMode")]
    portable_mode: bool,
}

#[tauri::command]
fn list_pet_packs(app: AppHandle) -> Vec<PetPack> {
    let roots = pet_roots(&app);
    let mut packs = Vec::new();
    for root in roots {
        collect_pet_packs(&root, &mut packs);
    }

    packs.sort_by(|left, right| left.id.cmp(&right.id));
    packs.dedup_by(|left, right| left.id == right.id);
    packs
}

#[tauri::command]
fn load_state(app: AppHandle) -> Value {
    let path = state_path(&app);
    fs::read_to_string(path)
        .ok()
        .and_then(|contents| serde_json::from_str(&contents).ok())
        .unwrap_or_else(default_state)
}

#[tauri::command]
fn save_state(app: AppHandle, state: Value) -> Result<(), String> {
    let path = state_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let contents = serde_json::to_string_pretty(&state).map_err(|error| error.to_string())?;
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn set_click_through(window: Window, enabled: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_pet_always_on_top(window: Window, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn enable_keyboard_sync(app: AppHandle) -> keyboard_sync::KeyboardSyncStatus {
    keyboard_sync::enable(app)
}

#[tauri::command]
fn runtime_info(app: AppHandle) -> RuntimeInfo {
    let data = state_path(&app)
        .parent()
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_default();
    let roots = pet_roots(&app)
        .into_iter()
        .map(|path| path.to_string_lossy().into_owned())
        .collect::<Vec<_>>();
    let portable_mode = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|parent| parent.join("data")))
        .is_some_and(|path| path.exists());

    RuntimeInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        data_dir: data,
        pet_roots: roots,
        portable_mode,
    }
}

#[tauri::command]
fn reveal_resources(app: AppHandle) -> Result<String, String> {
    let root = writable_pet_root(&app);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    reveal_path(&root)?;
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
fn set_tray_status(app: AppHandle, tooltip: String) -> Result<(), String> {
    let Some(tray) = app.tray_by_id("main") else {
        return Ok(());
    };

    tray.set_tooltip(Some(tooltip))
        .map_err(|error| error.to_string())
}

fn pet_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            roots.push(parent.join("pets"));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir.join("pets"));
    }

    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd.join("pets"));
        roots.push(cwd.join("public").join("pets"));
    }

    roots.sort();
    roots.dedup();
    roots
}

fn writable_pet_root(app: &AppHandle) -> PathBuf {
    for root in pet_roots(app) {
        if root.exists() || fs::create_dir_all(&root).is_ok() {
            return root;
        }
    }

    PathBuf::from("pets")
}

fn collect_pet_packs(root: &Path, packs: &mut Vec<PetPack>) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let manifest_path = path.join("manifest.json");
        let Ok(contents) = fs::read_to_string(&manifest_path) else {
            continue;
        };

        let Ok(manifest) = serde_json::from_str::<Value>(&contents) else {
            continue;
        };

        let id = manifest_string(&manifest, "id").unwrap_or_else(|| {
            path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("unknown-pet")
                .to_string()
        });

        let live2d_model = manifest
            .get("live2d")
            .and_then(|live2d| manifest_string(live2d, "modelJson"));

        packs.push(PetPack {
            id,
            name: manifest_string(&manifest, "name").unwrap_or_else(|| "Unnamed Pet".into()),
            version: manifest_string(&manifest, "version").unwrap_or_else(|| "0.0.0".into()),
            artist: manifest_string(&manifest, "artist").unwrap_or_else(|| "Unknown".into()),
            description: manifest_string(&manifest, "description").unwrap_or_default(),
            live2d_model,
            preview: manifest_string(&manifest, "preview"),
            source: path.to_string_lossy().into_owned(),
            tags: manifest
                .get("tags")
                .and_then(|tags| tags.as_array())
                .map(|tags| {
                    tags.iter()
                        .filter_map(|tag| tag.as_str().map(ToOwned::to_owned))
                        .collect()
                })
                .unwrap_or_default(),
        });
    }
}

fn manifest_string(value: &Value, key: &str) -> Option<String> {
    value.get(key)?.as_str().map(ToOwned::to_owned)
}

fn state_path(app: &AppHandle) -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let portable_dir = parent.join("data");
            if fs::create_dir_all(&portable_dir).is_ok() {
                return portable_dir.join("state.json");
            }
        }
    }

    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from(".desktop-livecat-data"))
        .join("state.json")
}

fn reveal_path(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn default_state() -> Value {
    json!({
        "selectedPetId": "livecat-default",
        "scale": 1.0,
        "clickThrough": false,
        "alwaysOnTop": true,
        "pomodoro": {
            "mode": "focus",
            "focusMinutes": 25,
            "breakMinutes": 5,
            "remainingSeconds": 1500,
            "running": false,
            "completedToday": 0,
            "day": ""
        }
    })
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let timer_toggle = MenuItem::with_id(app, "timer_toggle", "Start / pause timer", true, None::<&str>)?;
    let timer_reset = MenuItem::with_id(app, "timer_reset", "Reset timer", true, None::<&str>)?;
    let timer_skip = MenuItem::with_id(app, "timer_skip", "Skip timer", true, None::<&str>)?;
    let reload_pets = MenuItem::with_id(app, "reload_pets", "Reload pets", true, None::<&str>)?;
    let open_resources = MenuItem::with_id(app, "open_resources", "Open resources", true, None::<&str>)?;
    let click_through_off =
        MenuItem::with_id(app, "click_through_off", "Disable click-through", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &timer_toggle,
            &timer_reset,
            &timer_skip,
            &reload_pets,
            &open_resources,
            &click_through_off,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Desktop LiveCat")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "timer_toggle" => {
                let _ = app.emit("tray://timer-toggle", ());
            }
            "timer_reset" => {
                let _ = app.emit("tray://timer-reset", ());
            }
            "timer_skip" => {
                let _ = app.emit("tray://timer-skip", ());
            }
            "reload_pets" => {
                let _ = app.emit("tray://reload-pets", ());
            }
            "open_resources" => {
                let root = writable_pet_root(app);
                let _ = fs::create_dir_all(&root);
                let _ = reveal_path(&root);
            }
            "click_through_off" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_ignore_cursor_events(false);
                }
                let _ = app.emit("tray://click-through-off", ());
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(())
}

fn place_initial_pet(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(Some(monitor)) = window.current_monitor().or_else(|_| window.primary_monitor()) else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };

    let work = monitor.work_area();
    let x = work.position.x + work.size.width as i32 - size.width as i32 - 28;
    let y = work.position.y + work.size.height as i32 - size.height as i32 - 18;
    let _ = window.set_position(PhysicalPosition::new(x.max(work.position.x), y.max(work.position.y)));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            build_tray(app.handle())?;
            place_initial_pet(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_pet_packs,
            load_state,
            save_state,
            set_click_through,
            set_pet_always_on_top,
            enable_keyboard_sync,
            runtime_info,
            reveal_resources,
            set_tray_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Desktop LiveCat");
}
