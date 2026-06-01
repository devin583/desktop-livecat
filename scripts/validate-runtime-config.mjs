import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const configPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoPath = path.join(root, "src-tauri", "Cargo.toml");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const cargo = fs.readFileSync(cargoPath, "utf8");
const failures = [];

const assetProtocol = config.app?.security?.assetProtocol;
if (!assetProtocol?.enable) {
  failures.push("src-tauri/tauri.conf.json must enable app.security.assetProtocol for local pet images.");
}

const scope = Array.isArray(assetProtocol?.scope) ? assetProtocol.scope : [];
for (const required of ["$EXE/pets/**", "$RESOURCE/pets/**"]) {
  if (!scope.includes(required)) {
    failures.push(`assetProtocol.scope must include ${required}.`);
  }
}

if (!/tauri\s*=\s*\{[^}]*features\s*=\s*\[[^\]]*"protocol-asset"/s.test(cargo)) {
  failures.push("src-tauri/Cargo.toml tauri dependency must include the protocol-asset feature.");
}

if (failures.length) {
  for (const failure of failures) console.error(`error: ${failure}`);
  process.exit(1);
}

console.log("Validated runtime asset protocol config.");
