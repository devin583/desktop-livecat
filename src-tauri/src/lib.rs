mod keyboard_sync;

use serde::Serialize;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Window,
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

#[tauri::command]
fn list_pet_packs(app: AppHandle) -> Vec<PetPack> {
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
    let click_through_off =
        MenuItem::with_id(app, "click_through_off", "Disable click-through", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &click_through_off, &quit])?;

    let mut tray = TrayIconBuilder::new()
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
            "click_through_off" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_ignore_cursor_events(false);
                }
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            build_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_pet_packs,
            load_state,
            save_state,
            set_click_through,
            set_pet_always_on_top,
            enable_keyboard_sync
        ])
        .run(tauri::generate_context!())
        .expect("error while running Desktop LiveCat");
}
