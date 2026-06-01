import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";

const root = process.cwd();
const petsRoot = join(root, "pets");
const strict = process.env.STRICT_PET_ASSETS === "1" || process.argv.includes("--strict");
const artistAssetCheck = process.env.ARTIST_ASSET_CHECK === "1" || process.argv.includes("--artist");
const errors = [];
const warnings = [];

const renderModes = new Set(["live2d", "spritesheet", "hybrid"]);
const animationStates = new Set([
  "idle",
  "typing",
  "tap_left",
  "tap_right",
  "focus",
  "break",
  "happy",
  "sleepy",
  "failed",
  "dragged",
  "watching_mouse",
  "petting",
  "feeding",
  "playing",
  "cleaning",
  "praised",
  "attention_call",
]);
const imageExtensions = new Set([".png", ".webp", ".jpg", ".jpeg", ".svg"]);

if (!existsSync(petsRoot)) {
  fail("Missing pets/ directory.");
} else {
  for (const entry of readdirSync(petsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;
    validatePack(join(petsRoot, entry.name), entry.name);
  }
}

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length) {
  for (const error of errors) {
    console.error(`error: ${error}`);
  }
  process.exit(1);
}

console.log(
  `Validated resource packs${strict ? " in strict mode" : ""}${
    artistAssetCheck ? " with artist asset checks" : ""
  }.`,
);

function validatePack(packDir, folderName) {
  const manifestPath = join(packDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    warn(`${folderName}: missing manifest.json.`);
    return;
  }

  const manifest = readJson(manifestPath, `${folderName}/manifest.json`);
  if (!manifest) return;

  for (const key of ["id", "name", "version", "artist"]) {
    if (!isNonEmptyString(manifest[key])) {
      fail(`${folderName}: manifest.${key} must be a non-empty string.`);
    }
  }

  if (isNonEmptyString(manifest.id) && manifest.id !== folderName) {
    warn(`${folderName}: manifest id "${manifest.id}" does not match folder name.`);
  }

  const renderMode = normalizeRenderMode(manifest, folderName);
  const expectsLive2D = renderMode === "live2d" || renderMode === "hybrid" || manifest.live2d !== undefined;
  const expectsSpritesheet =
    renderMode === "spritesheet" || renderMode === "hybrid" || manifest.spritesheet !== undefined;

  if (manifest.preview !== undefined) {
    validatePath(packDir, folderName, manifest.preview, "preview", { required: true });
  }

  let sourceLayerMapPath;
  if (expectsLive2D) {
    sourceLayerMapPath = validateLive2D(packDir, folderName, manifest.live2d, renderMode);
    validateNamedPathMap(packDir, folderName, manifest.motions, "motions", {
      required: true,
      json: true,
      expectedVersion: 3,
    });
    validateNamedPathMap(packDir, folderName, manifest.expressions, "expressions", {
      required: true,
      json: true,
    });
    validateLayerMap(packDir, folderName, sourceLayerMapPath);
  }

  if (expectsSpritesheet) {
    validateSpritesheet(packDir, folderName, manifest.spritesheet, renderMode);
  }

  if (manifest.privacy && manifest.privacy.storesKeyValues !== false) {
    fail(`${folderName}: privacy.storesKeyValues must be false for rhythm-only keyboard sync packs.`);
  }

  validatePersona(folderName, manifest.persona);
  validateArtistWorkflow(packDir, folderName, manifest.artistWorkflow, sourceLayerMapPath, renderMode);
}

function normalizeRenderMode(manifest, folderName) {
  if (manifest.renderMode !== undefined) {
    if (!renderModes.has(manifest.renderMode)) {
      fail(`${folderName}: manifest.renderMode must be live2d, spritesheet, or hybrid.`);
      return "live2d";
    }
    return manifest.renderMode;
  }

  if (manifest.live2d && manifest.spritesheet) return "hybrid";
  if (manifest.spritesheet && !manifest.live2d) return "spritesheet";
  return "live2d";
}

function validateLive2D(packDir, folderName, live2d, renderMode) {
  if (!live2d || typeof live2d !== "object" || Array.isArray(live2d)) {
    fail(`${folderName}: manifest.live2d must be an object for renderMode "${renderMode}".`);
    return undefined;
  }

  if (!isNonEmptyString(live2d.modelJson)) {
    fail(`${folderName}: manifest.live2d.modelJson must be a non-empty string.`);
  } else {
    validatePath(packDir, folderName, live2d.modelJson, "live2d.modelJson", {
      required: strict,
      softMissing: "Cubism export is allowed to be absent before licensed model files are produced.",
    });
  }

  for (const [field, label] of [
    ["parameterSpec", "live2d.parameterSpec"],
    ["sourceLayerMap", "live2d.sourceLayerMap"],
  ]) {
    if (live2d[field] !== undefined) {
      const target = validatePath(packDir, folderName, live2d[field], label, {
        required: true,
      });
      if (target) readJson(target, `${folderName}/${live2d[field]}`);
    }
  }

  return live2d.sourceLayerMap;
}

function validateSpritesheet(packDir, folderName, spritesheet, renderMode) {
  if (!spritesheet || typeof spritesheet !== "object" || Array.isArray(spritesheet)) {
    fail(`${folderName}: manifest.spritesheet must be an object for renderMode "${renderMode}".`);
    return;
  }

  if (!isNonEmptyString(spritesheet.image)) {
    fail(`${folderName}: manifest.spritesheet.image must be a non-empty string.`);
  } else {
    const imagePath = validatePath(packDir, folderName, spritesheet.image, "spritesheet.image", {
      required: true,
    });
    if (imagePath && !imageExtensions.has(extname(imagePath).toLowerCase())) {
      fail(`${folderName}: spritesheet.image must be png, webp, jpg, jpeg, or svg.`);
    }
  }

  for (const field of ["columns", "rows", "frameWidth", "frameHeight"]) {
    if (!isPositiveInteger(spritesheet[field])) {
      fail(`${folderName}: manifest.spritesheet.${field} must be a positive integer.`);
    }
  }

  let fileStates = {};
  if (spritesheet.statesFile !== undefined) {
    const statesFile = validatePath(packDir, folderName, spritesheet.statesFile, "spritesheet.statesFile", {
      required: true,
    });
    const loaded = statesFile ? readJson(statesFile, `${folderName}/${spritesheet.statesFile}`) : null;
    if (loaded && (!loaded || typeof loaded !== "object" || Array.isArray(loaded))) {
      fail(`${folderName}: spritesheet.statesFile must contain a JSON object.`);
    } else if (loaded) {
      fileStates = loaded;
    }
  }

  if (spritesheet.states !== undefined && (!spritesheet.states || typeof spritesheet.states !== "object" || Array.isArray(spritesheet.states))) {
    fail(`${folderName}: manifest.spritesheet.states must be an object when present.`);
    return;
  }

  const states = { ...fileStates, ...(spritesheet.states ?? {}) };
  if (!Object.keys(states).length) {
    fail(`${folderName}: manifest.spritesheet.states or spritesheet.statesFile must define at least idle.`);
    return;
  }

  if (!states.idle) {
    fail(`${folderName}: spritesheet states must include idle as the safe fallback state.`);
  }

  for (const state of animationStates) {
    if (!states[state]) {
      warn(`${folderName}: spritesheet state "${state}" is missing and will fall back to idle.`);
    }
  }

  for (const [stateName, stateSpec] of Object.entries(states)) {
    validateSpritesheetState(
      folderName,
      spritesheet,
      stateName,
      stateSpec,
      `spritesheet.states.${stateName}`,
    );
  }
}

function validateSpritesheetState(folderName, spritesheet, stateName, stateSpec, label) {
  if (!animationStates.has(stateName)) {
    fail(`${folderName}: ${label} is not a supported animation state.`);
    return;
  }
  if (!stateSpec || typeof stateSpec !== "object" || Array.isArray(stateSpec)) {
    fail(`${folderName}: ${label} must be an object.`);
    return;
  }
  if (!Array.isArray(stateSpec.frames) || !stateSpec.frames.length) {
    fail(`${folderName}: ${label}.frames must be a non-empty array.`);
    return;
  }

  stateSpec.frames.forEach((frame, index) => {
    const frameLabel = `${label}.frames[${index}]`;
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
      fail(`${folderName}: ${frameLabel} must be an object.`);
      return;
    }
    if (!isWholeNumber(frame.row) || frame.row < 0 || frame.row >= spritesheet.rows) {
      fail(`${folderName}: ${frameLabel}.row must be within 0..${spritesheet.rows - 1}.`);
    }
    if (!isWholeNumber(frame.column) || frame.column < 0 || frame.column >= spritesheet.columns) {
      fail(`${folderName}: ${frameLabel}.column must be within 0..${spritesheet.columns - 1}.`);
    }
    if (frame.durationMs !== undefined && (!Number.isFinite(frame.durationMs) || frame.durationMs <= 0)) {
      fail(`${folderName}: ${frameLabel}.durationMs must be a positive number when present.`);
    }
  });

  if (
    stateSpec.loopStartIndex !== undefined &&
    stateSpec.loopStartIndex !== null &&
    (!isWholeNumber(stateSpec.loopStartIndex) || stateSpec.loopStartIndex >= stateSpec.frames.length)
  ) {
    fail(`${folderName}: ${label}.loopStartIndex must point to an existing frame.`);
  }

  if (stateSpec.fallback !== undefined && !animationStates.has(stateSpec.fallback)) {
    fail(`${folderName}: ${label}.fallback is not a supported animation state.`);
  }
}

function validatePersona(folderName, persona) {
  if (persona === undefined) return;
  if (!persona || typeof persona !== "object" || Array.isArray(persona)) {
    fail(`${folderName}: manifest.persona must be an object when present.`);
    return;
  }
  for (const field of ["name", "species", "style", "personality"]) {
    if (persona[field] !== undefined && !isNonEmptyString(persona[field])) {
      fail(`${folderName}: manifest.persona.${field} must be a non-empty string when present.`);
    }
  }
  if (persona.palette !== undefined) {
    if (!Array.isArray(persona.palette) || !persona.palette.every(isNonEmptyString)) {
      fail(`${folderName}: manifest.persona.palette must be an array of non-empty color strings.`);
    }
  }
}

function validateNamedPathMap(packDir, folderName, value, label, options) {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${folderName}: manifest.${label} must be an object when present.`);
    return;
  }

  for (const [name, filePath] of Object.entries(value)) {
    if (!isNonEmptyString(filePath)) {
      fail(`${folderName}: manifest.${label}.${name} must be a non-empty string path.`);
      continue;
    }
    const resolved = validatePath(packDir, folderName, filePath, `${label}.${name}`, options);
    if (resolved && options.json) {
      const json = readJson(resolved, `${folderName}/${filePath}`);
      if (json && options.expectedVersion !== undefined && json.Version !== options.expectedVersion) {
        fail(`${folderName}: ${filePath} must have Version ${options.expectedVersion}.`);
      }
    }
  }
}

function validateLayerMap(packDir, folderName, layerMapPath) {
  if (!isNonEmptyString(layerMapPath)) return;
  const resolved = validatePath(packDir, folderName, layerMapPath, "live2d.sourceLayerMap", {
    required: true,
  });
  if (!resolved) return;

  const layerMap = readJson(resolved, `${folderName}/${layerMapPath}`);
  if (!layerMap) return;
  if (!Array.isArray(layerMap.layers)) {
    fail(`${folderName}: ${layerMapPath} must contain a layers array.`);
    return;
  }

  const ids = new Set();
  for (const item of layerMap.layers) {
    if (!isNonEmptyString(item.id)) {
      fail(`${folderName}: layer map contains a layer without a string id.`);
      continue;
    }
    if (ids.has(item.id)) {
      fail(`${folderName}: layer map contains duplicate id "${item.id}".`);
    }
    ids.add(item.id);

    if (!isNonEmptyString(item.file)) {
      fail(`${folderName}: layer "${item.id}" is missing file.`);
    } else {
      validatePath(packDir, folderName, item.file, `layer ${item.id}`, { required: true });
    }

    const bbox = item.bbox;
    if (
      !bbox ||
      !Number.isFinite(bbox.x) ||
      !Number.isFinite(bbox.y) ||
      !Number.isFinite(bbox.width) ||
      !Number.isFinite(bbox.height) ||
      bbox.width <= 0 ||
      bbox.height <= 0
    ) {
      fail(`${folderName}: layer "${item.id}" must have a positive bbox.`);
    }
  }
}

function validateArtistWorkflow(packDir, folderName, workflow, sourceLayerMapPath, renderMode) {
  if (workflow !== undefined && (!workflow || typeof workflow !== "object" || Array.isArray(workflow))) {
    fail(`${folderName}: manifest.artistWorkflow must be an object when present.`);
    return;
  }

  const required = artistAssetCheck;
  if (!workflow) {
    if (required) fail(`${folderName}: manifest.artistWorkflow is required for artist asset checks.`);
    return;
  }

  if (!isNonEmptyString(workflow.status)) {
    fail(`${folderName}: artistWorkflow.status must be a non-empty string.`);
  } else if (!["missing", "source-ready", "psd-ready", "rigging-ready", "runtime-ready"].includes(workflow.status)) {
    fail(`${folderName}: artistWorkflow.status has an unsupported value: ${workflow.status}`);
  }

  for (const [field, label] of [
    ["brief", "artistWorkflow.brief"],
    ["checklist", "artistWorkflow.checklist"],
    ["primarySource", "artistWorkflow.primarySource"],
  ]) {
    if (workflow[field] !== undefined) {
      validatePath(packDir, folderName, workflow[field], label, { required: true });
    } else if (required) {
      fail(`${folderName}: ${label} is required for artist asset checks.`);
    }
  }

  const hasLiveSource = isNonEmptyString(sourceLayerMapPath) || existsSync(join(packDir, "source"));
  const hasSpritesheetSource = isNonEmptyString(workflow.primarySource);
  if (required && renderMode !== "spritesheet" && !hasLiveSource) {
    fail(`${folderName}: source assets or live2d.sourceLayerMap are required for artist asset checks.`);
  }
  if (required && renderMode === "spritesheet" && !hasSpritesheetSource) {
    fail(`${folderName}: artistWorkflow.primarySource is required for spritesheet artist checks.`);
  }
}

function validatePath(packDir, folderName, filePath, label, options = {}) {
  if (!isSafeRelativePath(filePath)) {
    fail(`${folderName}: ${label} path "${filePath}" must stay inside the pack.`);
    return null;
  }

  const target = normalize(join(packDir, filePath));
  const rel = relative(packDir, target);
  if (rel.startsWith("..")) {
    fail(`${folderName}: ${label} path "${filePath}" escapes the pack.`);
    return null;
  }

  if (!existsSync(target)) {
    const message = `${folderName}: ${label} path is missing: ${filePath}`;
    if (options.required) {
      fail(message);
    } else if (options.softMissing) {
      warn(`${message}. ${options.softMissing}`);
    }
    return null;
  }

  if (!statSync(target).isFile()) {
    fail(`${folderName}: ${label} path is not a file: ${filePath}`);
    return null;
  }

  return target;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label}: invalid JSON (${error.message}).`);
    return null;
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRelativePath(value) {
  return isNonEmptyString(value) && !value.startsWith("/") && !value.includes("\\") && !value.includes("\0");
}

function isWholeNumber(value) {
  return Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}
