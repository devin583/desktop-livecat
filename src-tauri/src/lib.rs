mod keyboard_sync;

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Component, Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
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
    render_mode: String,
    artist_checklist: Option<String>,
    artist_status: String,
    has_artist_checklist: bool,
    has_live2d_model: bool,
    has_parameter_spec: bool,
    has_source_assets: bool,
    has_spritesheet: bool,
    live2d_model: Option<String>,
    persona: Option<Value>,
    preview: Option<String>,
    source: String,
    spritesheet: Option<Value>,
    tags: Vec<String>,
}

#[derive(Debug, Serialize)]
struct RuntimeInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    #[serde(rename = "dataDir")]
    data_dir: String,
    #[serde(rename = "fixedWebView2Runtime")]
    fixed_webview2_runtime: Option<String>,
    #[serde(rename = "petRoots")]
    pet_roots: Vec<String>,
    #[serde(rename = "portableMode")]
    portable_mode: bool,
}

#[derive(Debug, Serialize)]
struct CleanupResult {
    #[serde(rename = "removedItems")]
    removed_items: u32,
    #[serde(rename = "removedBytes")]
    removed_bytes: u64,
    #[serde(rename = "failedItems")]
    failed_items: Vec<String>,
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
        fixed_webview2_runtime: fixed_webview2_runtime_dir()
            .map(|path| path.to_string_lossy().into_owned()),
        pet_roots: roots,
        portable_mode,
    }
}

#[tauri::command]
fn cleanup_runtime_cache(app: AppHandle) -> CleanupResult {
    let mut result = CleanupResult {
        removed_items: 0,
        removed_bytes: 0,
        failed_items: Vec::new(),
    };

    let mut targets = Vec::new();
    if let Some(data_dir) = state_path(&app).parent() {
        for name in ["cache", "tmp", "update-downloads"] {
            targets.push(data_dir.join(name));
        }
    }

    if let Ok(cache_dir) = app.path().app_cache_dir() {
        targets.push(cache_dir);
    }

    for target in targets {
        remove_cleanup_target(&target, &mut result);
    }

    result
}

#[tauri::command]
fn reveal_resources(app: AppHandle) -> Result<String, String> {
    let root = writable_pet_root(&app);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    reveal_path(&root)?;
    Ok(root.to_string_lossy().into_owned())
}

#[tauri::command]
fn reveal_pet_pack(app: AppHandle, pet_id: String) -> Result<String, String> {
    for root in pet_roots(&app) {
        let candidate = root.join(&pet_id);
        if candidate.join("manifest.json").is_file() {
            reveal_path(&candidate)?;
            return Ok(candidate.to_string_lossy().into_owned());
        }
    }

    Err(format!("Pet pack not found: {pet_id}"))
}

#[tauri::command]
fn read_pet_asset_data_url(
    app: AppHandle,
    pet_id: String,
    relative_path: String,
) -> Result<String, String> {
    let pack_dir =
        find_pet_pack_dir(&app, &pet_id).ok_or_else(|| format!("Pet pack not found: {pet_id}"))?;
    let asset_path = resolve_pet_asset_path(&pack_dir, &relative_path)?;
    let mime = image_mime(&asset_path)
        .ok_or_else(|| format!("Unsupported pet asset type: {relative_path}"))?;
    let bytes = fs::read(&asset_path).map_err(|error| error.to_string())?;
    Ok(format!(
        "data:{mime};base64,{}",
        general_purpose::STANDARD.encode(bytes)
    ))
}

#[tauri::command]
fn install_pet_from_path(app: AppHandle, source_path: String) -> Result<PetPack, String> {
    let source = PathBuf::from(source_path.trim());
    if !source.exists() {
        return Err("Source path does not exist.".into());
    }

    let root = writable_pet_root(&app);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let target = if source.is_dir() {
        let manifest_dir = if source.join("manifest.json").is_file() {
            source.clone()
        } else {
            find_manifest_dir(&source)
                .ok_or_else(|| "Directory does not contain a pet manifest.".to_string())?
        };
        copy_manifest_pack(&manifest_dir, &root)?
    } else if is_zip_path(&source) {
        let temp = import_temp_dir(&app, "zip")?;
        extract_zip_archive(&source, &temp)?;
        let manifest_dir = find_manifest_dir(&temp)
            .ok_or_else(|| "Zip does not contain a pet manifest.".to_string())?;
        copy_manifest_pack(&manifest_dir, &root)?
    } else if is_supported_image_path(&source) {
        install_single_spritesheet_image(&source, &root)?
    } else {
        return Err("Source must be a pet folder, .zip, .png, .webp, .jpg, .jpeg, or .svg.".into());
    };

    read_pet_pack(&target).ok_or_else(|| "Installed pet could not be read.".into())
}

#[tauri::command]
fn create_spritesheet_draft(app: AppHandle, prompt: String) -> Result<PetPack, String> {
    let root = writable_pet_root(&app);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let name = prompt_name(&prompt);
    let pet_id = unique_pet_id(&root, &sanitize_pet_id(&name));
    let target = root.join(&pet_id);
    let palette = palette_from_prompt(&prompt);
    write_spritesheet_pack(&target, &pet_id, &name, &prompt, &palette)?;
    read_pet_pack(&target).ok_or_else(|| "Created pet draft could not be read.".into())
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

fn find_pet_pack_dir(app: &AppHandle, pet_id: &str) -> Option<PathBuf> {
    for root in pet_roots(app) {
        let direct = root.join(pet_id);
        if direct.join("manifest.json").is_file()
            && read_pet_pack(&direct).is_some_and(|pack| pack.id == pet_id)
        {
            return Some(direct);
        }

        let Ok(entries) = fs::read_dir(&root) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() || !path.join("manifest.json").is_file() {
                continue;
            }
            if read_pet_pack(&path).is_some_and(|pack| pack.id == pet_id) {
                return Some(path);
            }
        }
    }

    None
}

fn resolve_pet_asset_path(pack_dir: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let relative = Path::new(relative_path.trim());
    if relative.as_os_str().is_empty() {
        return Err("Pet asset path is empty.".into());
    }
    if relative
        .components()
        .any(|component| !matches!(component, Component::Normal(_) | Component::CurDir))
    {
        return Err("Pet asset path must stay inside the pet pack.".into());
    }

    let pack_root = pack_dir.canonicalize().map_err(|error| error.to_string())?;
    let asset = pack_root
        .join(relative)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !asset.starts_with(&pack_root) {
        return Err("Pet asset path escapes the pet pack.".into());
    }

    Ok(asset)
}

fn image_mime(path: &Path) -> Option<&'static str> {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("png") => Some("image/png"),
        Some("webp") => Some("image/webp"),
        Some("jpg") | Some("jpeg") => Some("image/jpeg"),
        Some("svg") => Some("image/svg+xml"),
        _ => None,
    }
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
        if path
            .file_name()
            .and_then(|name| name.to_str())
            .is_some_and(|name| name.starts_with('_'))
        {
            continue;
        }

        if let Some(pack) = read_pet_pack(&path) {
            packs.push(pack);
        }
    }
}

fn read_pet_pack(path: &Path) -> Option<PetPack> {
    let manifest_path = path.join("manifest.json");
    let contents = fs::read_to_string(&manifest_path).ok()?;
    let manifest = serde_json::from_str::<Value>(&contents).ok()?;

    let id = manifest_string(&manifest, "id").unwrap_or_else(|| {
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("unknown-pet")
            .to_string()
    });

    let render_mode = manifest_string(&manifest, "renderMode")
        .filter(|mode| matches!(mode.as_str(), "live2d" | "spritesheet" | "hybrid"))
        .unwrap_or_else(|| {
            if manifest.get("spritesheet").is_some() && manifest.get("live2d").is_none() {
                "spritesheet".into()
            } else {
                "live2d".into()
            }
        });
    let live2d_model = manifest
        .get("live2d")
        .and_then(|live2d| manifest_string(live2d, "modelJson"));
    let parameter_spec = manifest
        .get("live2d")
        .and_then(|live2d| manifest_string(live2d, "parameterSpec"));
    let source_layer_map = manifest
        .get("live2d")
        .and_then(|live2d| manifest_string(live2d, "sourceLayerMap"));
    let spritesheet = hydrate_spritesheet(path, manifest.get("spritesheet").cloned());
    let spritesheet_image = spritesheet
        .as_ref()
        .and_then(|sheet| manifest_string(sheet, "image"));
    let artist_workflow = manifest.get("artistWorkflow");
    let artist_checklist =
        artist_workflow.and_then(|workflow| manifest_string(workflow, "checklist"));
    let artist_status = artist_workflow
        .and_then(|workflow| manifest_string(workflow, "status"))
        .unwrap_or_else(|| "missing".into());

    Some(PetPack {
        id,
        name: manifest_string(&manifest, "name").unwrap_or_else(|| "Unnamed Pet".into()),
        version: manifest_string(&manifest, "version").unwrap_or_else(|| "0.0.0".into()),
        artist: manifest_string(&manifest, "artist").unwrap_or_else(|| "Unknown".into()),
        description: manifest_string(&manifest, "description").unwrap_or_default(),
        render_mode,
        artist_checklist: artist_checklist.clone(),
        artist_status,
        has_artist_checklist: artist_checklist
            .as_ref()
            .is_some_and(|file| path.join(file).is_file()),
        has_live2d_model: live2d_model
            .as_ref()
            .is_some_and(|file| path.join(file).is_file()),
        has_parameter_spec: parameter_spec
            .as_ref()
            .is_some_and(|file| path.join(file).is_file()),
        has_source_assets: source_layer_map
            .as_ref()
            .is_some_and(|file| path.join(file).is_file())
            || path.join("source").is_dir(),
        has_spritesheet: spritesheet_image
            .as_ref()
            .is_some_and(|file| path.join(file).is_file()),
        live2d_model,
        persona: manifest.get("persona").cloned(),
        preview: manifest_string(&manifest, "preview"),
        source: path.to_string_lossy().into_owned(),
        spritesheet,
        tags: manifest
            .get("tags")
            .and_then(|tags| tags.as_array())
            .map(|tags| {
                tags.iter()
                    .filter_map(|tag| tag.as_str().map(ToOwned::to_owned))
                    .collect()
            })
            .unwrap_or_default(),
    })
}

fn copy_manifest_pack(source: &Path, root: &Path) -> Result<PathBuf, String> {
    let manifest =
        fs::read_to_string(source.join("manifest.json")).map_err(|error| error.to_string())?;
    let mut manifest_json =
        serde_json::from_str::<Value>(&manifest).map_err(|error| error.to_string())?;
    let base_id = manifest_string(&manifest_json, "id")
        .or_else(|| {
            source
                .file_name()
                .and_then(|name| name.to_str())
                .map(ToOwned::to_owned)
        })
        .unwrap_or_else(|| "custom-pet".into());
    let pet_id = unique_pet_id(root, &sanitize_pet_id(&base_id));
    let target = root.join(&pet_id);
    copy_dir_recursive(source, &target)?;
    if let Some(object) = manifest_json.as_object_mut() {
        object.insert("id".into(), Value::String(pet_id));
        fs::write(
            target.join("manifest.json"),
            serde_json::to_string_pretty(&manifest_json).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(target)
}

fn hydrate_spritesheet(pack_dir: &Path, spritesheet: Option<Value>) -> Option<Value> {
    let mut sheet = spritesheet?;
    let Some(states_file) = manifest_string(&sheet, "statesFile") else {
        return Some(sheet);
    };
    let states_path = pack_dir.join(states_file);
    let file_states = fs::read_to_string(states_path)
        .ok()
        .and_then(|contents| serde_json::from_str::<Value>(&contents).ok());
    let Some(file_states) = file_states else {
        return Some(sheet);
    };
    if !file_states.is_object() {
        return Some(sheet);
    }
    let Some(sheet_object) = sheet.as_object_mut() else {
        return Some(sheet);
    };

    let mut states = sheet_object
        .get("states")
        .cloned()
        .filter(|value| value.is_object())
        .unwrap_or_else(|| serde_json::json!({}));
    if let (Some(states_object), Some(file_object)) =
        (states.as_object_mut(), file_states.as_object())
    {
        for (name, state) in file_object {
            states_object.insert(name.clone(), state.clone());
        }
    }

    sheet_object.insert("states".into(), states);
    Some(sheet)
}

fn install_single_spritesheet_image(source: &Path, root: &Path) -> Result<PathBuf, String> {
    let stem = source
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("custom-pet");
    let pet_id = unique_pet_id(root, &sanitize_pet_id(stem));
    let target = root.join(&pet_id);
    let image_extension = source
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or("png")
        .to_ascii_lowercase();
    let sprite_dir = target.join("spritesheet");
    let preview_dir = target.join("preview");
    fs::create_dir_all(&sprite_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&preview_dir).map_err(|error| error.to_string())?;
    let image_path = format!("spritesheet/avatar.{image_extension}");
    fs::copy(source, target.join(&image_path)).map_err(|error| error.to_string())?;
    fs::copy(
        source,
        preview_dir.join(format!("preview.{image_extension}")),
    )
    .map_err(|error| error.to_string())?;
    write_manifest_only(
        &target,
        &pet_id,
        stem,
        "Imported static spritesheet. Use the template handoff to replace it with a full animated sheet.",
        &image_path,
        &format!("preview/preview.{image_extension}"),
        &["custom", "spritesheet", "imported"],
        default_spritesheet_states(),
        None,
    )?;
    write_artist_handoff(&target, stem)?;
    Ok(target)
}

fn write_spritesheet_pack(
    target: &Path,
    pet_id: &str,
    name: &str,
    prompt: &str,
    palette: &[String; 4],
) -> Result<(), String> {
    fs::create_dir_all(target.join("spritesheet")).map_err(|error| error.to_string())?;
    fs::create_dir_all(target.join("preview")).map_err(|error| error.to_string())?;
    fs::create_dir_all(target.join("artist")).map_err(|error| error.to_string())?;
    let states = default_spritesheet_states();
    fs::write(
        target.join("spritesheet").join("avatar.svg"),
        render_spritesheet_svg(name, palette),
    )
    .map_err(|error| error.to_string())?;
    fs::write(
        target.join("spritesheet").join("template.svg"),
        render_template_svg(),
    )
    .map_err(|error| error.to_string())?;
    fs::write(
        target.join("spritesheet").join("states.json"),
        serde_json::to_string_pretty(&states).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    fs::write(
        target.join("preview").join("preview.svg"),
        render_preview_svg(name, palette),
    )
    .map_err(|error| error.to_string())?;
    write_manifest_only(
        target,
        pet_id,
        name,
        prompt,
        "spritesheet/avatar.svg",
        "preview/preview.svg",
        &["custom", "spritesheet", "text-draft", "offline"],
        states,
        Some(json!({
            "name": name,
            "species": infer_species(prompt),
            "style": "codex-style desktop spritesheet",
            "personality": prompt.trim().chars().take(160).collect::<String>(),
            "palette": palette,
            "accessories": infer_accessories(prompt)
        })),
    )?;
    write_artist_handoff(target, name)?;
    Ok(())
}

fn write_manifest_only(
    target: &Path,
    pet_id: &str,
    name: &str,
    description: &str,
    image_path: &str,
    preview_path: &str,
    tags: &[&str],
    states: Value,
    persona: Option<Value>,
) -> Result<(), String> {
    let manifest = json!({
        "id": pet_id,
        "name": name,
        "version": "0.1.0",
        "artist": "Desktop LiveCat Draft",
        "description": description,
        "preview": preview_path,
        "renderMode": "spritesheet",
        "tags": tags,
        "persona": persona.unwrap_or_else(|| json!({
            "name": name,
            "species": "desktop pet",
            "style": "spritesheet",
            "personality": "local imported pet",
            "palette": ["#ffd9bf", "#8b5f6a", "#fff7e8"]
        })),
        "spritesheet": {
            "image": image_path,
            "columns": 8,
            "rows": 9,
            "frameWidth": 192,
            "frameHeight": 208,
            "statesFile": "spritesheet/states.json",
            "states": states
        },
        "privacy": {
            "keyboardSync": "rhythm-only",
            "storesKeyValues": false
        },
        "artistWorkflow": {
            "status": "source-ready",
            "brief": "artist/spritesheet-handoff.md",
            "checklist": "artist/artist-checklist.md",
            "primarySource": image_path
        }
    });
    fs::write(
        target.join("manifest.json"),
        serde_json::to_string_pretty(&manifest).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn write_artist_handoff(target: &Path, name: &str) -> Result<(), String> {
    fs::create_dir_all(target.join("artist")).map_err(|error| error.to_string())?;
    fs::write(
        target.join("artist").join("spritesheet-handoff.md"),
        format!(
            "# {name} Spritesheet Handoff\n\nDraw or replace `spritesheet/avatar.svg` with a 8 x 9 PNG/WebP/SVG sheet. Each cell is 192 x 208. Keep the same state map in `spritesheet/states.json`.\n\nRows: idle, tap-left, tap-right, typing, focus, break, happy, sleepy, failed/dragged.\n"
        ),
    )
    .map_err(|error| error.to_string())?;
    fs::write(
        target.join("artist").join("artist-checklist.md"),
        "- [ ] All 8 x 9 cells are filled.\n- [ ] Idle loop breathes naturally.\n- [ ] Left and right typing taps read clearly.\n- [ ] Focus and break states are distinct.\n- [ ] Preview is readable at desktop-pet size.\n",
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn copy_dir_recursive(source: &Path, target: &Path) -> Result<(), String> {
    fs::create_dir_all(target).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let source_path = entry.path();
        let target_path = target.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_recursive(&source_path, &target_path)?;
        } else if source_path.is_file() {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::copy(&source_path, &target_path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

fn find_manifest_dir(root: &Path) -> Option<PathBuf> {
    find_manifest_dir_with_depth(root, 0)
}

fn find_manifest_dir_with_depth(root: &Path, depth: usize) -> Option<PathBuf> {
    if depth > 4 {
        return None;
    }
    if root.join("manifest.json").is_file() {
        return Some(root.to_path_buf());
    }
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            if let Some(found) = find_manifest_dir_with_depth(&path, depth + 1) {
                return Some(found);
            }
        }
    }
    None
}

fn import_temp_dir(app: &AppHandle, label: &str) -> Result<PathBuf, String> {
    let base = state_path(app)
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from(".desktop-livecat-data"))
        .join("imports");
    fs::create_dir_all(&base).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    let path = base.join(format!("{label}-{stamp}"));
    fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path)
}

fn extract_zip_archive(source: &Path, target: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
        ])
        .arg(source)
        .arg(target)
        .status()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    let status = Command::new("ditto")
        .arg("-x")
        .arg("-k")
        .arg(source)
        .arg(target)
        .status()
        .map_err(|error| error.to_string())?;

    #[cfg(all(unix, not(target_os = "macos")))]
    let status = Command::new("unzip")
        .arg("-q")
        .arg(source)
        .arg("-d")
        .arg(target)
        .status()
        .map_err(|error| error.to_string())?;

    if status.success() {
        Ok(())
    } else {
        Err("Zip extraction failed.".into())
    }
}

fn is_zip_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("zip"))
}

fn is_supported_image_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "png" | "webp" | "jpg" | "jpeg" | "svg"
            )
        })
        .unwrap_or(false)
}

fn unique_pet_id(root: &Path, requested: &str) -> String {
    let base = if requested.is_empty() {
        "custom-pet"
    } else {
        requested
    };
    if !root.join(base).exists() {
        return base.to_string();
    }
    for index in 2..1000 {
        let candidate = format!("{base}-{index}");
        if !root.join(&candidate).exists() {
            return candidate;
        }
    }
    format!("{base}-{}", std::process::id())
}

fn sanitize_pet_id(input: &str) -> String {
    let mut out = String::new();
    for character in input.to_ascii_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            out.push(character);
        } else if matches!(character, ' ' | '_' | '-') && !out.ends_with('-') {
            out.push('-');
        }
    }
    out.trim_matches('-').chars().take(48).collect()
}

fn prompt_name(prompt: &str) -> String {
    let trimmed = prompt.trim();
    if trimmed.is_empty() {
        return "Custom Pet".into();
    }
    let candidate = trimmed
        .split(['。', '.', ',', '，', '\n'])
        .next()
        .unwrap_or(trimmed)
        .trim();
    let clipped = candidate.chars().take(24).collect::<String>();
    if clipped.is_empty() {
        "Custom Pet".into()
    } else {
        clipped
    }
}

fn infer_species(prompt: &str) -> String {
    let lower = prompt.to_ascii_lowercase();
    if lower.contains("cat") || prompt.contains('猫') {
        "cat".into()
    } else if lower.contains("dog") || prompt.contains('狗') {
        "dog".into()
    } else if lower.contains("duck") || prompt.contains('鸭') {
        "duck".into()
    } else if lower.contains("owl") || prompt.contains("猫头鹰") || prompt.contains('鸮') {
        "owl".into()
    } else {
        "desktop companion".into()
    }
}

fn infer_accessories(prompt: &str) -> Vec<String> {
    let mut items = Vec::new();
    if prompt.contains("键盘") || prompt.to_ascii_lowercase().contains("keyboard") {
        items.push("keyboard".into());
    }
    if prompt.contains("番茄") || prompt.to_ascii_lowercase().contains("pomodoro") {
        items.push("timer note".into());
    }
    if prompt.contains("蝴蝶结") || prompt.to_ascii_lowercase().contains("ribbon") {
        items.push("ribbon".into());
    }
    items
}

fn palette_from_prompt(prompt: &str) -> [String; 4] {
    let lower = prompt.to_ascii_lowercase();
    if lower.contains("blue") || prompt.contains('蓝') {
        [
            "#b8ddff".into(),
            "#4d82a8".into(),
            "#203c56".into(),
            "#fff7df".into(),
        ]
    } else if lower.contains("green") || prompt.contains('绿') {
        [
            "#c8e8bf".into(),
            "#5f9f6d".into(),
            "#284936".into(),
            "#fff7df".into(),
        ]
    } else if lower.contains("purple") || prompt.contains('紫') {
        [
            "#dbc6ff".into(),
            "#866ab8".into(),
            "#382a56".into(),
            "#fff7df".into(),
        ]
    } else if lower.contains("black") || prompt.contains('黑') {
        [
            "#4f4b55".into(),
            "#2c2830".into(),
            "#f3d38a".into(),
            "#fff2d8".into(),
        ]
    } else {
        [
            "#ffd9bf".into(),
            "#ef9d91".into(),
            "#4d3541".into(),
            "#fff7df".into(),
        ]
    }
}

fn default_spritesheet_states() -> Value {
    json!({
        "idle": state_frames(0, 6, 0, Some(0), None),
        "tap_left": state_frames(1, 5, 0, None, Some("typing")),
        "tap_right": state_frames(2, 5, 0, None, Some("typing")),
        "typing": state_frames(3, 8, 0, Some(0), None),
        "focus": state_frames(4, 6, 0, Some(0), None),
        "break": state_frames(5, 6, 0, Some(0), None),
        "happy": state_frames(6, 6, 0, Some(0), None),
        "sleepy": state_frames(7, 6, 0, Some(0), None),
        "failed": state_frames(8, 6, 0, None, Some("idle")),
        "dragged": state_frames(8, 6, 0, Some(0), None),
        "watching_mouse": state_frames(0, 1, 0, Some(0), None),
        "petting": state_frames(6, 2, 0, Some(0), Some("happy")),
        "feeding": state_frames(6, 2, 2, Some(0), Some("happy")),
        "playing": state_frames(6, 3, 0, Some(0), Some("happy")),
        "cleaning": state_frames(4, 1, 0, Some(0), Some("focus")),
        "praised": state_frames(6, 2, 4, Some(0), Some("happy")),
        "attention_call": state_frames(5, 2, 0, Some(0), Some("break"))
    })
}

fn state_frames(
    row: u32,
    count: u32,
    start: u32,
    loop_start_index: Option<u32>,
    fallback: Option<&str>,
) -> Value {
    let frames = (0..count)
        .map(|index| json!({ "row": row, "column": start + index, "durationMs": if index + 1 == count { 240 } else { 120 } }))
        .collect::<Vec<_>>();
    let mut state = serde_json::Map::new();
    state.insert("frames".into(), Value::Array(frames));
    state.insert(
        "loopStartIndex".into(),
        loop_start_index.map_or(Value::Null, |index| json!(index)),
    );
    if let Some(fallback) = fallback {
        state.insert("fallback".into(), json!(fallback));
    }
    Value::Object(state)
}

fn render_spritesheet_svg(name: &str, palette: &[String; 4]) -> String {
    let mut cells = String::new();
    for row in 0..9 {
        for column in 0..8 {
            let x = column * 192;
            let y = row * 208;
            cells.push_str(&render_sprite_cell(x, y, row, column, palette));
        }
    }
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1872" viewBox="0 0 1536 1872">
<title>{}</title>
<rect width="1536" height="1872" fill="none"/>
{}
</svg>
"##,
        xml_escape(name),
        cells
    )
}

fn render_sprite_cell(x: u32, y: u32, row: u32, column: u32, palette: &[String; 4]) -> String {
    let bob = ((column % 3) as i32 - 1) * 2;
    let paw_left = if row == 1 || (row == 3 && column % 2 == 0) {
        18
    } else {
        0
    };
    let paw_right = if row == 2 || (row == 3 && column % 2 == 1) {
        18
    } else {
        0
    };
    let eye_scale = if row == 7 {
        5
    } else if row == 8 {
        10
    } else {
        18
    };
    let mouth = if row == 6 {
        "M84 106 Q96 118 108 106"
    } else {
        "M86 108 Q96 116 106 108"
    };
    let timer = if row == 4 || row == 5 {
        r##"<rect x="116" y="138" width="46" height="28" rx="6" fill="#fff6d7" stroke="#5a3d47" stroke-width="3"/><path d="M128 151h22" stroke="#5a3d47" stroke-width="3" stroke-linecap="round"/>"##
    } else {
        ""
    };
    format!(
        r##"<g transform="translate({x} {y})">
<ellipse cx="96" cy="178" rx="58" ry="12" fill="#2b2430" opacity=".16"/>
<path d="M128 119 C168 112 175 142 143 151" fill="none" stroke="{primary}" stroke-width="18" stroke-linecap="round"/>
<ellipse cx="96" cy="{body_y}" rx="52" ry="58" fill="{primary}"/>
<ellipse cx="96" cy="{head_y}" rx="58" ry="48" fill="{primary}"/>
<path d="M54 {ear_y} L72 {ear_tip} L86 {ear_y}" fill="{secondary}"/>
<path d="M106 {ear_y} L120 {ear_tip} L138 {ear_y}" fill="{secondary}"/>
<ellipse cx="76" cy="{eye_y}" rx="8" ry="{eye_scale}" fill="{dark}"/>
<ellipse cx="116" cy="{eye_y}" rx="8" ry="{eye_scale}" fill="{dark}"/>
<ellipse cx="96" cy="98" rx="24" ry="18" fill="{cream}"/>
<path d="{mouth}" fill="none" stroke="{dark}" stroke-width="4" stroke-linecap="round"/>
<rect x="42" y="147" width="108" height="28" rx="8" fill="{dark}"/>
<rect x="53" y="152" width="17" height="17" rx="4" fill="{cream}" transform="translate(0 {key_l})"/>
<rect x="76" y="152" width="17" height="17" rx="4" fill="{cream}" transform="translate(0 {key_l})"/>
<rect x="99" y="152" width="17" height="17" rx="4" fill="{cream}" transform="translate(0 {key_r})"/>
<rect x="122" y="152" width="17" height="17" rx="4" fill="{cream}" transform="translate(0 {key_r})"/>
<ellipse cx="66" cy="{paw_left_y}" rx="15" ry="23" fill="{cream}" transform="rotate({left_rot} 66 {paw_left_y})"/>
<ellipse cx="126" cy="{paw_right_y}" rx="15" ry="23" fill="{cream}" transform="rotate({right_rot} 126 {paw_right_y})"/>
{timer}
</g>
"##,
        x = x,
        y = y,
        primary = palette[0],
        secondary = palette[1],
        dark = palette[2],
        cream = palette[3],
        body_y = 111 + bob,
        head_y = 66 + bob,
        ear_y = 36 + bob,
        ear_tip = 12 + bob,
        eye_y = 64 + bob,
        eye_scale = eye_scale,
        mouth = mouth,
        key_l = if paw_left > 0 { 4 } else { 0 },
        key_r = if paw_right > 0 { 4 } else { 0 },
        paw_left_y = 130 + bob + paw_left,
        paw_right_y = 130 + bob + paw_right,
        left_rot = if paw_left > 0 { 18 } else { 6 },
        right_rot = if paw_right > 0 { -18 } else { -6 },
        timer = timer
    )
}

fn render_template_svg() -> String {
    let mut grid = String::new();
    let labels = [
        "idle",
        "tap-left",
        "tap-right",
        "typing",
        "focus",
        "break",
        "happy",
        "sleepy",
        "failed",
    ];
    for row in 0..9 {
        for column in 0..8 {
            grid.push_str(&format!(
                r##"<rect x="{}" y="{}" width="192" height="208" fill="none" stroke="#c7b8ad" stroke-width="2"/>"##,
                column * 192,
                row * 208
            ));
        }
        grid.push_str(&format!(
            r##"<text x="12" y="{}" font-family="Arial" font-size="24" fill="#6a535b">{}</text>"##,
            row * 208 + 34,
            labels[row as usize]
        ));
    }
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1872" viewBox="0 0 1536 1872"><rect width="1536" height="1872" fill="#fffaf0"/>{grid}</svg>"##
    )
}

fn render_preview_svg(name: &str, palette: &[String; 4]) -> String {
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="384" height="416" viewBox="0 0 384 416">
<rect width="384" height="416" rx="28" fill="#fffaf0"/>
{}
<text x="192" y="382" text-anchor="middle" font-family="Arial" font-size="24" fill="{}">{}</text>
</svg>"##,
        render_sprite_cell(96, 80, 0, 0, palette),
        palette[2],
        xml_escape(name)
    )
}

fn xml_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
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

fn remove_cleanup_target(target: &Path, result: &mut CleanupResult) {
    if !target.exists() {
        return;
    }

    let Some(name) = target.file_name().and_then(|name| name.to_str()) else {
        return;
    };
    if !matches!(
        name,
        "cache" | "tmp" | "update-downloads" | "Desktop LiveCat"
    ) {
        return;
    }

    let bytes = directory_size(target);
    let removed = if target.is_dir() {
        fs::remove_dir_all(target)
    } else {
        fs::remove_file(target)
    };

    match removed {
        Ok(()) => {
            result.removed_items += 1;
            result.removed_bytes += bytes;
        }
        Err(error) => result
            .failed_items
            .push(format!("{}: {}", target.to_string_lossy(), error)),
    }
}

fn directory_size(path: &Path) -> u64 {
    if let Ok(metadata) = fs::metadata(path) {
        if metadata.is_file() {
            return metadata.len();
        }
    }

    let mut total = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            total += directory_size(&entry.path());
        }
    }
    total
}

#[cfg(target_os = "windows")]
fn fixed_webview2_runtime_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let root = exe.parent()?.join("runtime").join("webview2");
    if root.join("msedgewebview2.exe").is_file() {
        return Some(root);
    }

    fs::read_dir(root)
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .find(|path| path.join("msedgewebview2.exe").is_file())
}

#[cfg(not(target_os = "windows"))]
fn fixed_webview2_runtime_dir() -> Option<PathBuf> {
    None
}

#[cfg(target_os = "windows")]
fn configure_fixed_webview2_runtime() {
    if std::env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER").is_some() {
        return;
    }

    if let Some(runtime) = fixed_webview2_runtime_dir() {
        std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", runtime);
    }
}

#[cfg(not(target_os = "windows"))]
fn configure_fixed_webview2_runtime() {}

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
        "selectedPetId": "orange-tabby-keyboard-v2",
            "language": "zh-CN",
            "controlPanelTab": "interact",
            "scale": 0.92,
            "controlsOpen": false,
        "clickThrough": false,
        "alwaysOnTop": true,
            "lowPower": false,
            "keyboardSyncEnabled": true,
            "update": {
                "status": "idle",
                "currentVersion": "",
                "latestVersion": null,
                "releaseUrl": null,
                "standardAssetUrl": null,
                "fullOfflineAssetUrl": null,
                "publishedAt": null,
                "lastCheckedAt": null,
                "ignoredVersion": null,
                "error": null
            },
            "pomodoro": {
            "focusMode": "pomo",
            "mode": "focus",
            "presetId": "25-5-15",
            "focusMinutes": 25,
            "breakMinutes": 5,
            "longBreakMinutes": 15,
            "longBreakEvery": 4,
            "longBreakEnabled": true,
            "autoFlow": "manual",
            "remainingSeconds": 1500,
            "running": false,
            "activeStartedAt": null,
            "activePlannedSeconds": 1500,
            "pauseCount": 0,
            "extraSeconds": 0,
            "estimatedPomos": 0,
            "estimatedMinutes": 0,
            "completedToday": 0,
            "focusSecondsToday": 0,
            "breakSecondsToday": 0,
            "focusSessionsInCycle": 0,
            "currentTask": "",
            "lastCompletedTask": "",
            "records": [],
            "completionReview": null,
            "panelTab": "timer",
            "day": ""
        }
    })
}

#[derive(Clone, Copy)]
struct TrayLabels {
    show: &'static str,
    hide: &'static str,
    timer_toggle: &'static str,
    timer_reset: &'static str,
    timer_skip: &'static str,
    next_pet: &'static str,
    reload_pets: &'static str,
    check_updates: &'static str,
    toggle_controls: &'static str,
    open_resources: &'static str,
    click_through_off: &'static str,
    quit: &'static str,
}

fn tray_labels(language: &str) -> TrayLabels {
    if language == "en-US" {
        return TrayLabels {
            show: "Show",
            hide: "Hide",
            timer_toggle: "Start / pause timer",
            timer_reset: "Reset timer",
            timer_skip: "Skip timer",
            next_pet: "Next pet",
            reload_pets: "Reload pets",
            check_updates: "Check for updates",
            toggle_controls: "Toggle controls",
            open_resources: "Open resources",
            click_through_off: "Disable click-through",
            quit: "Quit",
        };
    }

    TrayLabels {
        show: "显示",
        hide: "隐藏",
        timer_toggle: "开始 / 暂停计时",
        timer_reset: "重置计时",
        timer_skip: "跳过计时",
        next_pet: "切换角色",
        reload_pets: "重新加载角色",
        check_updates: "检查更新",
        toggle_controls: "显示 / 隐藏设置",
        open_resources: "打开资源目录",
        click_through_off: "关闭点击穿透",
        quit: "退出",
    }
}

fn tray_menu(app: &AppHandle, labels: TrayLabels) -> tauri::Result<Menu<tauri::Wry>> {
    let show = MenuItem::with_id(app, "show", labels.show, true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", labels.hide, true, None::<&str>)?;
    let timer_toggle =
        MenuItem::with_id(app, "timer_toggle", labels.timer_toggle, true, None::<&str>)?;
    let timer_reset =
        MenuItem::with_id(app, "timer_reset", labels.timer_reset, true, None::<&str>)?;
    let timer_skip = MenuItem::with_id(app, "timer_skip", labels.timer_skip, true, None::<&str>)?;
    let next_pet = MenuItem::with_id(app, "next_pet", labels.next_pet, true, None::<&str>)?;
    let reload_pets =
        MenuItem::with_id(app, "reload_pets", labels.reload_pets, true, None::<&str>)?;
    let check_updates = MenuItem::with_id(
        app,
        "check_updates",
        labels.check_updates,
        true,
        None::<&str>,
    )?;
    let toggle_controls = MenuItem::with_id(
        app,
        "toggle_controls",
        labels.toggle_controls,
        true,
        None::<&str>,
    )?;
    let open_resources = MenuItem::with_id(
        app,
        "open_resources",
        labels.open_resources,
        true,
        None::<&str>,
    )?;
    let click_through_off = MenuItem::with_id(
        app,
        "click_through_off",
        labels.click_through_off,
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", labels.quit, true, None::<&str>)?;
    Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &timer_toggle,
            &timer_reset,
            &timer_skip,
            &next_pet,
            &reload_pets,
            &check_updates,
            &toggle_controls,
            &open_resources,
            &click_through_off,
            &quit,
        ],
    )
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = tray_menu(app, tray_labels("zh-CN"))?;

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
            "next_pet" => {
                let _ = app.emit("tray://next-pet", ());
            }
            "reload_pets" => {
                let _ = app.emit("tray://reload-pets", ());
            }
            "check_updates" => {
                let _ = app.emit("tray://check-updates", ());
            }
            "toggle_controls" => {
                let _ = app.emit("tray://toggle-controls", ());
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

#[tauri::command]
fn set_tray_language(app: AppHandle, language: String) -> Result<(), String> {
    let menu = tray_menu(&app, tray_labels(&language)).map_err(|error| error.to_string())?;
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn place_initial_pet(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(Some(monitor)) = window
        .current_monitor()
        .or_else(|_| window.primary_monitor())
    else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };
    let _ = window.set_shadow(false);

    let work = monitor.work_area();
    let x = work.position.x + work.size.width as i32 - size.width as i32 - 28;
    let y = work.position.y + work.size.height as i32 - size.height as i32 - 18;
    let _ = window.set_position(PhysicalPosition::new(
        x.max(work.position.x),
        y.max(work.position.y),
    ));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_fixed_webview2_runtime();

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
            cleanup_runtime_cache,
            reveal_resources,
            reveal_pet_pack,
            read_pet_asset_data_url,
            install_pet_from_path,
            create_spritesheet_draft,
            set_tray_language,
            set_tray_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Desktop LiveCat");
}
