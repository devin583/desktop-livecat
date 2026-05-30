import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const downloadPage = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/";

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/download-webview2-fixed-runtime.mjs --arch x64 --out <cab-path> [--meta <json-path>] [--dry-run]",
    "",
    "The script reads Microsoft's public WebView2 download page, selects the newest",
    "Fixed Version Runtime CAB for the requested architecture, and downloads it.",
  ].join("\n");
}

function decodeNuxtUrl(value) {
  return value.replaceAll("\\u002F", "/");
}

function findRuntime(html, arch) {
  const escapedArch = arch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `https:\\\\u002F\\\\u002Fmsedge\\.sf\\.dl\\.delivery\\.mp\\.microsoft\\.com\\\\u002Ffilestreamingservice\\\\u002Ffiles\\\\u002F[^"]+?Microsoft\\.WebView2\\.FixedVersionRuntime\\.(\\d+\\.\\d+\\.\\d+\\.\\d+)\\.${escapedArch}\\.cab`,
    "g",
  );

  const matches = [...html.matchAll(pattern)].map((match) => ({
    version: match[1],
    url: decodeNuxtUrl(match[0]),
  }));

  if (!matches.length) {
    throw new Error(`Could not find a Fixed Version WebView2 ${arch} CAB on ${downloadPage}`);
  }

  return matches.sort((a, b) => compareVersions(b.version, a.version))[0];
}

function compareVersions(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

async function main() {
  const arch = readArg("--arch", "x64");
  const out = readArg("--out");
  const meta = readArg("--meta");
  const dryRun = hasArg("--dry-run");

  if (hasArg("--help") || !out) {
    console.log(usage());
    process.exit(hasArg("--help") ? 0 : 1);
  }

  if (!["x64", "x86", "arm64"].includes(arch)) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  const pageResponse = await fetch(downloadPage, {
    headers: { "user-agent": "desktop-livecat-release/0.5" },
  });
  if (!pageResponse.ok) {
    throw new Error(`Failed to load ${downloadPage}: HTTP ${pageResponse.status}`);
  }

  const runtime = findRuntime(await pageResponse.text(), arch);
  const metadata = {
    architecture: arch,
    sourcePage: downloadPage,
    url: runtime.url,
    version: runtime.version,
  };

  if (meta) {
    fs.mkdirSync(path.dirname(meta), { recursive: true });
    fs.writeFileSync(meta, `${JSON.stringify(metadata, null, 2)}\n`);
  }

  if (dryRun) {
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const runtimeResponse = await fetch(runtime.url, {
    headers: { "user-agent": "desktop-livecat-release/0.5" },
  });
  if (!runtimeResponse.ok || !runtimeResponse.body) {
    throw new Error(`Failed to download ${runtime.url}: HTTP ${runtimeResponse.status}`);
  }

  await pipeline(Readable.fromWeb(runtimeResponse.body), fs.createWriteStream(out));
  console.log(`Downloaded WebView2 Fixed Version Runtime ${runtime.version} ${arch} to ${out}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
