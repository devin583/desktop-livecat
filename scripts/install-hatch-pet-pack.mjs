import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const runDir = requiredArg(args, "run-dir");
const petId = requiredArg(args, "pet-id");
const name = requiredArg(args, "name");
const species = args.species ?? "cat";
const style = args.style ?? "hatch-pet sticker spritesheet";
const description =
  args.description ?? `Hatch-pet generated ${species} desktop pet converted for this app.`;
const personality = args.personality ?? "cute, focused, and expressive";
const palette = (args.palette ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const sourceReference = args["source-reference"] ?? null;

const workspaceRoot = process.cwd();
const targetDir = resolve(workspaceRoot, "pets", petId);
const spriteDir = join(targetDir, "spritesheet");
const previewDir = join(targetDir, "preview");
const artistDir = join(targetDir, "artist");
const sourceDir = join(targetDir, "source");

mkdirSync(spriteDir, { recursive: true });
mkdirSync(previewDir, { recursive: true });
mkdirSync(artistDir, { recursive: true });
mkdirSync(sourceDir, { recursive: true });

copyFileSync(resolve(runDir, "final", "spritesheet.webp"), join(spriteDir, "avatar.webp"));
copyOptional(resolve(runDir, "qa", "contact-sheet.png"), join(previewDir, "preview.png"));
if (sourceReference) {
  copyOptional(resolve(sourceReference), join(sourceDir, basename(sourceReference)));
}

writeJson(join(spriteDir, "states.json"), appStates());
writeJson(join(targetDir, "manifest.json"), {
  id: petId,
  name,
  version: "0.1.0",
  artist: "Codex hatch-pet + imagegen",
  description,
  preview: "preview/preview.png",
  renderMode: "spritesheet",
  tags: ["spritesheet", "keyboard", "cat", "hatch-pet", "v2"],
  persona: {
    name,
    species,
    style,
    personality,
    palette,
    accessories: ["computer keyboard"],
  },
  spritesheet: {
    image: "spritesheet/avatar.webp",
    columns: 8,
    rows: 9,
    frameWidth: 192,
    frameHeight: 208,
    statesFile: "spritesheet/states.json",
  },
  privacy: {
    keyboardSync: "rhythm-only",
    storesKeyValues: false,
  },
  artistWorkflow: {
    status: "runtime-ready",
    brief: "artist/spritesheet-handoff.md",
    checklist: "artist/artist-checklist.md",
    primarySource: sourceReference ? `source/${basename(sourceReference)}` : "hatch-pet",
    preferredDeliverable: "Hatch-pet 8 x 9 spritesheet, 192 x 208 cells",
  },
});

writeFileSync(
  join(artistDir, "spritesheet-handoff.md"),
  `# ${name} Hatch-Pet Handoff\n\nGenerated from ${runDir} and converted into this app's spritesheet pack shape.\n\nThe source atlas follows the Codex hatch-pet contract: 8 columns x 9 rows, 192 x 208 cells.\n`,
  "utf8",
);

writeFileSync(
  join(artistDir, "artist-checklist.md"),
  `# ${name} Checklist\n\n- [x] Hatch-pet atlas generated\n- [x] Transparent WebP copied into app pack\n- [x] App states mapped in spritesheet/states.json\n- [ ] App-specific petting/feeding/cleaning rows generated\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      targetDir,
      spritesheet: join(spriteDir, "avatar.webp"),
      states: join(spriteDir, "states.json"),
      manifest: join(targetDir, "manifest.json"),
    },
    null,
    2,
  ),
);

function appStates() {
  const idleDurations = [2600, 140, 120, 170, 3200, 980];
  return {
    idle: frames(0, 6, idleDurations, 0),
    tap_left: frames(7, 4, [82, 96, 128, 190], null, "typing"),
    tap_right: {
      frames: [
        { row: 7, column: 3, durationMs: 82 },
        { row: 7, column: 4, durationMs: 96 },
        { row: 7, column: 5, durationMs: 128 },
        { row: 7, column: 0, durationMs: 190 },
      ],
      loopStartIndex: null,
      fallback: "typing",
    },
    typing: frames(7, 6, [180, 140, 170, 140, 190, 280], 0),
    focus: frames(8, 6, [640, 520, 700, 620, 780, 1100], 0),
    break: frames(6, 6, [760, 620, 820, 900, 720, 1200], 0),
    happy: frames(4, 5, [220, 180, 300, 240, 1000], null, "idle"),
    sleepy: frames(5, 5, [720, 760, 860, 1300, 1800], 3, "idle"),
    failed: frames(5, 8, [260, 280, 320, 460, 820, 420, 520, 1100], null, "idle"),
    dragged: frames(1, 8, [160, 170, 180, 170, 190, 180, 210, 280], 0),
    watching_mouse: {
      frames: [
        { row: 0, column: 0, durationMs: 700 },
        { row: 0, column: 1, durationMs: 120 },
        { row: 0, column: 0, durationMs: 760 },
        { row: 0, column: 5, durationMs: 980 },
      ],
      loopStartIndex: 0,
    },
    petting: frames(6, 6, [420, 560, 760, 980, 760, 1400], 2, "happy"),
    feeding: frames(6, 6, [420, 520, 620, 720, 920, 1300], 3, "happy"),
    playing: frames(4, 5, [220, 180, 300, 280, 1100], 1, "happy"),
    cleaning: frames(8, 6, [480, 420, 620, 540, 680, 960], 2, "focus"),
    praised: frames(3, 4, [340, 300, 680, 1100], null, "happy"),
    attention_call: frames(3, 4, [300, 260, 560, 1100], null, "idle"),
  };
}

function frames(row, count, durations, loopStartIndex, fallback) {
  const state = {
    frames: Array.from({ length: count }, (_, column) => ({
      row,
      column,
      durationMs: durations[column] ?? durations.at(-1) ?? 140,
    })),
    loopStartIndex,
  };
  if (fallback) state.fallback = fallback;
  return state;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--") ? rawArgs[++index] : "true";
    parsed[key] = value;
  }
  return parsed;
}

function requiredArg(args, key) {
  if (!args[key]) {
    throw new Error(`Missing required --${key}`);
  }
  return args[key];
}

function copyOptional(source, target) {
  try {
    copyFileSync(source, target);
  } catch {
    // Preview/source copies are helpful but should not block pack installation.
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
