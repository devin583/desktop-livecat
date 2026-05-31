import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const releaseDir = path.join(root, "release");
const archives = fs.existsSync(releaseDir)
  ? fs.readdirSync(releaseDir).filter((name) => name.endsWith(".zip")).sort()
  : [];

if (!archives.length) {
  throw new Error(`No portable archives found under ${releaseDir}`);
}

const failures = [];
for (const archiveName of archives) {
  const archive = path.join(releaseDir, archiveName);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "desktop-livecat-archive-"));
  try {
    extractZip(archive, temp);
    validateArchive(archiveName, temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`error: ${failure}`);
  process.exit(1);
}

console.log(`Verified portable archives:\n${archives.map((name) => `- ${name}`).join("\n")}`);

function extractZip(archive, destination) {
  if (process.platform === "win32") {
    execFileSync("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path '${archive}' -DestinationPath '${destination}' -Force`,
    ]);
  } else {
    execFileSync("unzip", ["-q", archive, "-d", destination]);
  }
}

function validateArchive(archiveName, rootDir) {
  const packageRoot = findPackageRoot(rootDir);
  expectDir(packageRoot, "pets", archiveName);
  expectDir(packageRoot, "data", archiveName);

  if (archiveName.includes("win11")) {
    expectFile(packageRoot, "desktop-livecat.exe", archiveName);
  } else {
    const hasUnixBinary = fs.existsSync(path.join(packageRoot, "desktop-livecat"));
    if (!hasUnixBinary) failures.push(`${archiveName}: missing desktop-livecat binary`);
  }

  if (archiveName.includes("full-offline")) {
    const runtimeRoot = path.join(packageRoot, "runtime", "webview2");
    if (!findFile(runtimeRoot, "msedgewebview2.exe")) {
      failures.push(`${archiveName}: missing runtime/webview2/msedgewebview2.exe`);
    }
  }
}

function findPackageRoot(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const directHasPets = entries.some((entry) => entry.name === "pets");
  if (directHasPets) return rootDir;

  const directory = entries.find((entry) => entry.isDirectory());
  if (!directory) return rootDir;
  return path.join(rootDir, directory.name);
}

function expectDir(rootDir, relativePath, archiveName) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) {
    failures.push(`${archiveName}: missing ${relativePath}/`);
  }
}

function expectFile(rootDir, relativePath, archiveName) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) {
    failures.push(`${archiveName}: missing ${relativePath}`);
  }
}

function findFile(rootDir, fileName) {
  if (!fs.existsSync(rootDir)) return false;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const source = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === fileName) return true;
    if (entry.isDirectory() && findFile(source, fileName)) return true;
  }
  return false;
}
