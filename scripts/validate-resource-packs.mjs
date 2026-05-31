import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, relative } from "node:path";

const root = process.cwd();
const petsRoot = join(root, "pets");
const strict = process.env.STRICT_PET_ASSETS === "1" || process.argv.includes("--strict");
const artistAssetCheck = process.env.ARTIST_ASSET_CHECK === "1" || process.argv.includes("--artist");
const errors = [];
const warnings = [];

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

  if (manifest.preview !== undefined) {
    validatePath(packDir, folderName, manifest.preview, "preview", { required: true });
  }

  if (!manifest.live2d || typeof manifest.live2d !== "object" || Array.isArray(manifest.live2d)) {
    fail(`${folderName}: manifest.live2d must be an object.`);
  } else {
    if (!isNonEmptyString(manifest.live2d.modelJson)) {
      fail(`${folderName}: manifest.live2d.modelJson must be a non-empty string.`);
    } else {
      validatePath(packDir, folderName, manifest.live2d.modelJson, "live2d.modelJson", {
        required: strict,
        softMissing: "Cubism export is allowed to be absent before licensed model files are produced.",
      });
    }

    for (const [field, label] of [
      ["parameterSpec", "live2d.parameterSpec"],
      ["sourceLayerMap", "live2d.sourceLayerMap"],
    ]) {
      if (manifest.live2d[field] !== undefined) {
        const target = validatePath(packDir, folderName, manifest.live2d[field], label, {
          required: true,
        });
        if (target) readJson(target, `${folderName}/${manifest.live2d[field]}`);
      }
    }
  }

  validateNamedPathMap(packDir, folderName, manifest.motions, "motions", {
    required: true,
    json: true,
    expectedVersion: 3,
  });

  validateNamedPathMap(packDir, folderName, manifest.expressions, "expressions", {
    required: true,
    json: true,
  });

  if (manifest.privacy && manifest.privacy.storesKeyValues !== false) {
    fail(`${folderName}: privacy.storesKeyValues must be false for rhythm-only keyboard sync packs.`);
  }

  validateLayerMap(packDir, folderName, manifest.live2d?.sourceLayerMap);
  validateArtistWorkflow(packDir, folderName, manifest.artistWorkflow, manifest.live2d?.sourceLayerMap);
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

function validateArtistWorkflow(packDir, folderName, workflow, sourceLayerMapPath) {
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

  if (required && !isNonEmptyString(sourceLayerMapPath) && !existsSync(join(packDir, "source"))) {
    fail(`${folderName}: source assets or live2d.sourceLayerMap are required for artist asset checks.`);
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

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}
