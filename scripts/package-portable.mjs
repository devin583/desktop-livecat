import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const appVersion = `v${packageJson.version}`;
const out = path.join(root, "release");
const platformSuffix =
  process.platform === "win32" ? "win11-x64" : `${process.platform}-${process.arch}`;
const standard = path.join(out, `desktop-livecat-${appVersion}-${platformSuffix}-portable`);
const full = path.join(out, `desktop-livecat-${appVersion}-${platformSuffix}-full-offline`);
const exeCandidates = [
  path.join(root, "src-tauri", "target", "release", "desktop-livecat.exe"),
  path.join(root, "src-tauri", "target", "release", "desktop-livecat"),
];

function cleanOutput() {
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(out)) {
    if (!entry.startsWith("desktop-livecat-")) continue;
    const target = path.join(out, entry);
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function copyStandard(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  const exe = exeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!exe) {
    throw new Error("Run `npm run tauri:build` before packaging.");
  }
  fs.copyFileSync(exe, path.join(target, path.basename(exe)));
  copyDir(path.join(root, "pets"), path.join(target, "pets"));
  const dataDir = path.join(target, "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "README.txt"),
    "Desktop LiveCat stores portable offline settings in this folder. Keep this folder when upgrading.\n",
  );
  fs.copyFileSync(path.join(root, "docs", "distribution.md"), path.join(target, "README-portable.md"));
}

function resolveFixedRuntime(from) {
  if (fs.existsSync(path.join(from, "msedgewebview2.exe"))) return from;

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(from, entry.name);
    if (fs.existsSync(path.join(candidate, "msedgewebview2.exe"))) return candidate;
  }

  throw new Error(
    `WEBVIEW2_FIXED_RUNTIME_DIR must point to an extracted Fixed Version WebView2 runtime folder: ${from}`,
  );
}

function zipFolder(folder) {
  const zipPath = `${folder}.zip`;
  fs.rmSync(zipPath, { force: true });

  if (process.platform === "win32") {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${folder}\\*' -DestinationPath '${zipPath}' -Force`,
    ]);
  } else {
    execFileSync("zip", ["-qr", zipPath, path.basename(folder)], {
      cwd: path.dirname(folder),
    });
  }

  return zipPath;
}

cleanOutput();
copyStandard(standard);
const written = [zipFolder(standard)];

const fixedRuntime = process.env.WEBVIEW2_FIXED_RUNTIME_DIR;
if (fixedRuntime) {
  copyStandard(full);
  copyDir(resolveFixedRuntime(fixedRuntime), path.join(full, "runtime", "webview2"));
  written.push(zipFolder(full));
}

console.log(`Portable folders written under ${out}`);
console.log(`Archives:\n${written.map((item) => `- ${item}`).join("\n")}`);
