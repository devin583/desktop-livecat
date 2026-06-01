import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

const root = process.cwd();
const petIds = ["orange-tabby-keyboard", "gray-british-keyboard"];
const columns = 7;
const rows = 9;

for (const petId of petIds) {
  const packDir = join(root, "pets", petId);
  const manifestPath = join(packDir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const sheetPath = join(packDir, manifest.spritesheet.image);
  const sheet = PNG.sync.read(readFileSync(sheetPath));
  const frameWidth = manifest.spritesheet.frameWidth;
  const frameHeight = manifest.spritesheet.frameHeight;

  if (sheet.width !== frameWidth * columns || sheet.height !== frameHeight * rows) {
    throw new Error(`${petId}: unexpected sheet size ${sheet.width}x${sheet.height}`);
  }

  const refined = new PNG({ width: sheet.width, height: sheet.height });
  refined.data.fill(0);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      refineCell(sheet, refined, row, column, frameWidth, frameHeight);
    }
  }

  writeFileSync(sheetPath, PNG.sync.write(refined));
  writeFileSync(
    join(packDir, "spritesheet", "states.json"),
    JSON.stringify(buildStates(), null, 2),
  );

  manifest.version = "0.2.0";
  manifest.artistWorkflow = {
    ...manifest.artistWorkflow,
    status: "runtime-ready",
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function refineCell(source, target, row, column, frameWidth, frameHeight) {
  const components = findComponents(source, row, column, frameWidth, frameHeight);
  const largest = components[0];
  const keep = new Set(
    components
      .filter((component) => shouldKeepComponent(component, largest, frameWidth, frameHeight))
      .map((component) => component.id),
  );
  const keepPixels = new Uint8Array(frameWidth * frameHeight);
  for (const component of components) {
    if (!keep.has(component.id)) continue;
    for (const pixel of component.pixels) keepPixels[pixel] = 1;
  }

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      if (!keepPixels[y * frameWidth + x]) continue;
      const sourceOffset = sourceOffsetFor(source, row, column, x, y, frameWidth, frameHeight);
      const targetOffset = sourceOffsetFor(target, row, column, x, y, frameWidth, frameHeight);
      target.data[targetOffset] = source.data[sourceOffset];
      target.data[targetOffset + 1] = source.data[sourceOffset + 1];
      target.data[targetOffset + 2] = source.data[sourceOffset + 2];
      target.data[targetOffset + 3] = source.data[sourceOffset + 3];
    }
  }
}

function findComponents(source, row, column, frameWidth, frameHeight) {
  const visited = new Uint8Array(frameWidth * frameHeight);
  const components = [];

  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const index = y * frameWidth + x;
      if (visited[index] || alphaAt(source, row, column, x, y, frameWidth, frameHeight) <= 8) {
        continue;
      }

      const id = components.length + 1;
      const pixels = [];
      const queue = [index];
      visited[index] = id;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let edgePixels = 0;

      for (let read = 0; read < queue.length; read += 1) {
        const point = queue[read];
        const px = point % frameWidth;
        const py = Math.floor(point / frameWidth);
        pixels.push(point);
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
        if (px <= 1 || py <= 1 || px >= frameWidth - 2 || py >= frameHeight - 2) edgePixels += 1;

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= frameWidth || ny >= frameHeight) continue;
          const next = ny * frameWidth + nx;
          if (
            visited[next] ||
            alphaAt(source, row, column, nx, ny, frameWidth, frameHeight) <= 8
          ) {
            continue;
          }
          visited[next] = id;
          queue.push(next);
        }
      }

      components.push({
        id,
        pixels,
        area: pixels.length,
        minX,
        minY,
        maxX,
        maxY,
        edgePixels,
      });
    }
  }

  return components.sort((left, right) => right.area - left.area);
}

function shouldKeepComponent(component, largest, frameWidth, frameHeight) {
  if (!largest) return false;
  if (component.id === largest.id) return true;

  const width = component.maxX - component.minX + 1;
  const height = component.maxY - component.minY + 1;
  const touchesTop = component.minY <= 1;
  const touchesSide = component.minX <= 1 || component.maxX >= frameWidth - 2;
  const thinEdgeFragment = component.edgePixels > 0 && (height <= 12 || width <= 10);

  if (touchesTop && height <= 14) return false;
  if (touchesSide && component.area <= 180) return false;
  if (thinEdgeFragment && component.area <= 260) return false;

  const expandedMain = {
    minX: Math.max(0, largest.minX - 48),
    minY: Math.max(0, largest.minY - 48),
    maxX: Math.min(frameWidth - 1, largest.maxX + 48),
    maxY: Math.min(frameHeight - 1, largest.maxY + 48),
  };

  return (
    component.area >= 14 &&
    component.minX <= expandedMain.maxX &&
    component.maxX >= expandedMain.minX &&
    component.minY <= expandedMain.maxY &&
    component.maxY >= expandedMain.minY
  );
}

function alphaAt(source, row, column, x, y, frameWidth, frameHeight) {
  return source.data[sourceOffsetFor(source, row, column, x, y, frameWidth, frameHeight) + 3];
}

function sourceOffsetFor(image, row, column, x, y, frameWidth, frameHeight) {
  return ((row * frameHeight + y) * image.width + column * frameWidth + x) * 4;
}

function buildStates() {
  return {
    idle: {
      frames: [
        { row: 0, column: 0, durationMs: 3600 },
        { row: 0, column: 1, durationMs: 220 },
        { row: 0, column: 2, durationMs: 180 },
        { row: 0, column: 1, durationMs: 240 },
        { row: 0, column: 0, durationMs: 4200 },
        { row: 0, column: 5, durationMs: 320 },
        { row: 0, column: 6, durationMs: 1200 },
      ],
      loopStartIndex: 0,
    },
    tap_left: oneShot(1, [0, 1, 2, 3], [50, 55, 70, 120]),
    tap_right: oneShot(2, [0, 1, 2, 3], [50, 55, 70, 120]),
    typing: {
      frames: [{ row: 3, column: 0, durationMs: 900 }],
      loopStartIndex: 0,
    },
    focus: loop(4, [0, 1, 2, 3, 4, 5, 6], [1600, 520, 900, 1400, 650, 1500, 900]),
    break: loop(5, [0, 1, 2, 3, 4, 5, 6], [1300, 850, 1200, 900, 1600, 1300, 1500]),
    happy: loop(6, [0, 1, 2, 3, 4, 5, 6], [360, 220, 220, 260, 320, 400, 900]),
    sleepy: loop(7, [0, 1, 2, 3, 4, 5, 6], [1800, 1000, 1600, 900, 1800, 2200, 1600]),
    failed: oneShot(8, [0, 1, 2, 3], [240, 260, 320, 800]),
    dragged: loop(8, [4, 5, 6], [700, 720, 900]),
  };
}

function loop(row, columnsList, durations) {
  return {
    frames: columnsList.map((column, index) => ({
      row,
      column,
      durationMs: durations[index],
    })),
    loopStartIndex: 0,
  };
}

function oneShot(row, columnsList, durations) {
  return {
    frames: columnsList.map((column, index) => ({
      row,
      column,
      durationMs: durations[index],
    })),
    loopStartIndex: null,
    fallback: "idle",
  };
}
