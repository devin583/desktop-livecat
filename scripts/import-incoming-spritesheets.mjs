import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const root = process.cwd();
const incomingRoot = join(root, "incoming");
const columns = 7;
const rows = 9;

const packs = [
  {
    id: "gray-british-keyboard",
    match: " (1).png",
    name: "Gray British Keyboard",
    species: "gray British-style cat",
    style: "soft gray-and-white cartoon keyboard cat spritesheet",
    personality: "calm, plush, focused, and gently reactive",
    palette: ["#5c5f63", "#f4efe6", "#f4c08f", "#252b31"],
    description:
      "Gray-and-white keyboard cat spritesheet from the supplied ChatGPT image grid, cleaned into a local transparent resource pack.",
  },
  {
    id: "orange-tabby-keyboard",
    match: " (2).png",
    name: "Orange Tabby Keyboard",
    species: "orange tabby cat",
    style: "warm orange tabby cartoon keyboard cat spritesheet",
    personality: "curious, expressive, energetic, and typing-focused",
    palette: ["#b77a38", "#5f3c20", "#f5d1a0", "#222930"],
    description:
      "Orange tabby keyboard cat spritesheet from the supplied ChatGPT image grid, cleaned into a local transparent resource pack.",
  },
];

const stateRows = [
  ["idle", "idle loop"],
  ["tap_left", "left paw key press"],
  ["tap_right", "right paw key press"],
  ["typing", "sustained alternating typing"],
  ["focus", "focused typing with small sparkle accents"],
  ["break", "break, stretch, yawn, or relaxed gesture"],
  ["happy", "happy hearts"],
  ["sleepy", "sleeping or drowsy state"],
  ["failed", "angry, blocked, or failed state"],
];

function main() {
  const files = readdirSync(incomingRoot).filter((file) => file.toLowerCase().endsWith(".png"));
  for (const pack of packs) {
    const sourceName = files.find((file) => file.includes(pack.match));
    if (!sourceName) {
      throw new Error(`Missing incoming image matching "${pack.match}".`);
    }
    const sourcePath = join(incomingRoot, sourceName);
    const source = PNG.sync.read(readFileSync(sourcePath));
    const transparent = removeConnectedCheckerboard(source);
    const frameWidth = Math.ceil(source.width / columns);
    const frameHeight = Math.ceil(source.height / rows);
    const avatar = normalizeGrid(transparent, frameWidth, frameHeight);
    const packDir = join(root, "pets", pack.id);

    for (const dir of ["artist", "preview", "source", "spritesheet"]) {
      mkdirSync(join(packDir, dir), { recursive: true });
    }

    writeFileSync(join(packDir, "spritesheet", "avatar.png"), PNG.sync.write(avatar));
    writeFileSync(join(packDir, "spritesheet", "states.json"), JSON.stringify(buildStates(), null, 2));
    writeFileSync(join(packDir, "preview", "preview.png"), PNG.sync.write(renderPreview(avatar, frameWidth, frameHeight)));
    writeFileSync(join(packDir, "manifest.json"), JSON.stringify(buildManifest(pack, frameWidth, frameHeight), null, 2));
    writeFileSync(join(packDir, "artist", "spritesheet-handoff.md"), handoffMarkdown(pack));
    writeFileSync(join(packDir, "artist", "artist-checklist.md"), checklistMarkdown());
    copyFileSync(sourcePath, join(packDir, "source", "original-grid.png"));
  }
}

function removeConnectedCheckerboard(source) {
  const png = new PNG({ width: source.width, height: source.height });
  source.data.copy(png.data);
  const visited = new Uint8Array(source.width * source.height);
  const queue = [];

  for (let x = 0; x < source.width; x += 1) {
    pushIfBackground(source, visited, queue, x, 0);
    pushIfBackground(source, visited, queue, x, source.height - 1);
  }
  for (let y = 1; y < source.height - 1; y += 1) {
    pushIfBackground(source, visited, queue, 0, y);
    pushIfBackground(source, visited, queue, source.width - 1, y);
  }

  for (let read = 0; read < queue.length; read += 1) {
    const index = queue[read];
    const x = index % source.width;
    const y = Math.floor(index / source.width);
    pushIfBackground(source, visited, queue, x + 1, y);
    pushIfBackground(source, visited, queue, x - 1, y);
    pushIfBackground(source, visited, queue, x, y + 1);
    pushIfBackground(source, visited, queue, x, y - 1);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (!visited[index]) continue;
    png.data[index * 4 + 3] = 0;
  }

  return png;
}

function pushIfBackground(source, visited, queue, x, y) {
  if (x < 0 || y < 0 || x >= source.width || y >= source.height) return;
  const index = y * source.width + x;
  if (visited[index]) return;
  const offset = index * 4;
  if (!isCheckerboardPixel(source.data[offset], source.data[offset + 1], source.data[offset + 2])) return;
  visited[index] = 1;
  queue.push(index);
}

function isCheckerboardPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const neutral = max - min <= 16;
  return neutral && min >= 224;
}

function normalizeGrid(source, frameWidth, frameHeight) {
  const out = new PNG({ width: frameWidth * columns, height: frameHeight * rows });
  out.data.fill(0);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const sx0 = Math.round((column * source.width) / columns);
      const sx1 = Math.round(((column + 1) * source.width) / columns);
      const sy0 = Math.round((row * source.height) / rows);
      const sy1 = Math.round(((row + 1) * source.height) / rows);
      const sw = sx1 - sx0;
      const sh = sy1 - sy0;
      const tx0 = column * frameWidth + Math.floor((frameWidth - sw) / 2);
      const ty0 = row * frameHeight + Math.floor((frameHeight - sh) / 2);
      blit(source, out, sx0, sy0, tx0, ty0, sw, sh);
    }
  }

  return out;
}

function blit(source, target, sx, sy, tx, ty, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = ((sy + y) * source.width + sx + x) * 4;
      const targetX = tx + x;
      const targetY = ty + y;
      if (targetX < 0 || targetY < 0 || targetX >= target.width || targetY >= target.height) continue;
      const targetOffset = (targetY * target.width + targetX) * 4;
      target.data[targetOffset] = source.data[sourceOffset];
      target.data[targetOffset + 1] = source.data[sourceOffset + 1];
      target.data[targetOffset + 2] = source.data[sourceOffset + 2];
      target.data[targetOffset + 3] = source.data[sourceOffset + 3];
    }
  }
}

function renderPreview(sheet, frameWidth, frameHeight) {
  const preview = new PNG({ width: 384, height: 416 });
  fill(preview, 0xff, 0xfa, 0xf0, 0xff);
  const scale = Math.min(320 / frameWidth, 300 / frameHeight);
  const drawWidth = Math.round(frameWidth * scale);
  const drawHeight = Math.round(frameHeight * scale);
  const dx = Math.round((preview.width - drawWidth) / 2);
  const dy = 54;

  for (let y = 0; y < drawHeight; y += 1) {
    for (let x = 0; x < drawWidth; x += 1) {
      const sx = Math.min(frameWidth - 1, Math.floor(x / scale));
      const sy = Math.min(frameHeight - 1, Math.floor(y / scale));
      const sourceOffset = (sy * sheet.width + sx) * 4;
      alphaBlend(preview, dx + x, dy + y, sheet.data, sourceOffset);
    }
  }

  return preview;
}

function fill(png, r, g, b, a) {
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = r;
    png.data[offset + 1] = g;
    png.data[offset + 2] = b;
    png.data[offset + 3] = a;
  }
}

function alphaBlend(target, x, y, sourceData, sourceOffset) {
  if (x < 0 || y < 0 || x >= target.width || y >= target.height) return;
  const alpha = sourceData[sourceOffset + 3] / 255;
  if (alpha <= 0) return;
  const targetOffset = (y * target.width + x) * 4;
  target.data[targetOffset] = Math.round(sourceData[sourceOffset] * alpha + target.data[targetOffset] * (1 - alpha));
  target.data[targetOffset + 1] = Math.round(sourceData[sourceOffset + 1] * alpha + target.data[targetOffset + 1] * (1 - alpha));
  target.data[targetOffset + 2] = Math.round(sourceData[sourceOffset + 2] * alpha + target.data[targetOffset + 2] * (1 - alpha));
  target.data[targetOffset + 3] = 255;
}

function buildStates() {
  const state = (row, count = columns, options = {}) => {
    const spec = {
      frames: Array.from({ length: count }, (_, column) => ({
        row,
        column,
        durationMs: column + 1 === count ? 220 : 115,
      })),
      loopStartIndex: options.loopStartIndex === undefined ? 0 : options.loopStartIndex,
    };
    if (options.fallback) spec.fallback = options.fallback;
    return spec;
  };

  return {
    idle: state(0),
    tap_left: state(1, columns, { loopStartIndex: null, fallback: "typing" }),
    tap_right: state(2, columns, { loopStartIndex: null, fallback: "typing" }),
    typing: state(3),
    focus: state(4),
    break: state(5),
    happy: state(6),
    sleepy: state(7),
    failed: state(8, columns, { loopStartIndex: null, fallback: "idle" }),
    dragged: state(8),
  };
}

function buildManifest(pack, frameWidth, frameHeight) {
  return {
    id: pack.id,
    name: pack.name,
    version: "0.1.0",
    artist: "User supplied via ChatGPT Image",
    description: pack.description,
    preview: "preview/preview.png",
    renderMode: "spritesheet",
    tags: ["spritesheet", "keyboard", "cat", "pomodoro", "offline", "user-supplied"],
    persona: {
      name: pack.name,
      species: pack.species,
      style: pack.style,
      personality: pack.personality,
      palette: pack.palette,
      accessories: ["computer keyboard"],
    },
    spritesheet: {
      image: "spritesheet/avatar.png",
      columns,
      rows,
      frameWidth,
      frameHeight,
      statesFile: "spritesheet/states.json",
      states: buildStates(),
    },
    privacy: {
      keyboardSync: "rhythm-only",
      storesKeyValues: false,
    },
    artistWorkflow: {
      status: "source-ready",
      brief: "artist/spritesheet-handoff.md",
      checklist: "artist/artist-checklist.md",
      primarySource: "source/original-grid.png",
      preferredDeliverable: "Transparent PNG/WebP spritesheet or 7 x 9 animation grid",
    },
  };
}

function handoffMarkdown(pack) {
  return `# ${pack.name} Spritesheet Handoff

Imported from a supplied 7 x 9 image grid and converted into a local transparent PNG spritesheet.

Canvas: ${columns} columns x ${rows} rows. Frame size is recorded in manifest.json.

| Row | State | Meaning |
| --- | --- | --- |
${stateRows.map((row, index) => `| ${index} | ${row[0]} | ${row[1]} |`).join("\n")}

Keyboard sync uses only rhythm pulses. It does not store key values.
`;
}

function checklistMarkdown() {
  return `- [x] Character reads as a cat.
- [x] Keyboard reads as a computer keyboard.
- [x] Left and right typing rows are visually distinct.
- [x] Imported grid has been converted to transparent PNG.
- [ ] Hand-clean any remaining checkerboard edge halos if the source is replaced by a true transparent file later.
`;
}

main();
