import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const frame = { width: 192, height: 208, columns: 8, rows: 9 };
const states = {
  idle: stateFrames(0, 6),
  tap_left: stateFrames(1, 5, { loopStartIndex: null, fallback: "typing" }),
  tap_right: stateFrames(2, 5, { loopStartIndex: null, fallback: "typing" }),
  typing: stateFrames(3, 8),
  focus: stateFrames(4, 6),
  break: stateFrames(5, 6),
  happy: stateFrames(6, 6),
  sleepy: stateFrames(7, 6),
  failed: stateFrames(8, 6, { loopStartIndex: null, fallback: "idle" }),
  dragged: stateFrames(8, 6),
};

const rows = [
  ["idle", "breathing, blink, tail settle"],
  ["tap_left", "left paw drops onto keys"],
  ["tap_right", "right paw drops onto keys"],
  ["typing", "alternating left and right rhythm"],
  ["focus", "quiet work loop with small timer"],
  ["break", "stretch, paw wave, softer eyes"],
  ["happy", "celebration bounce"],
  ["sleepy", "slow blink and low head"],
  ["failed / dragged", "surprised, squashed, recovery"],
];

const palette = {
  line: "#3f2c33",
  fur: "#f3a547",
  fur2: "#d8742d",
  stripe: "#9f5128",
  cream: "#fff1d5",
  key: "#fff0d7",
  dark: "#202631",
  blue: "#83b8ff",
  rose: "#a95a55",
};

function main() {
  writePixelMochi();
  writeTemplatePack();
}

function writePixelMochi() {
  const pack = join(root, "pets", "pixel-mochi");
  ensurePackDirs(pack);
  writeFileSync(join(pack, "spritesheet", "avatar.svg"), renderSpritesheetSvg("Mochi Tabby"));
  writeFileSync(join(pack, "spritesheet", "template.svg"), renderTemplateSvg());
  writeFileSync(join(pack, "spritesheet", "states.json"), JSON.stringify(states, null, 2));
  writeFileSync(join(pack, "preview", "preview.svg"), renderPreviewSvg("Mochi Tabby"));
  writeFileSync(join(pack, "artist", "spritesheet-handoff.md"), handoffMarkdown("Mochi Tabby"));
  writeFileSync(join(pack, "artist", "artist-checklist.md"), checklistMarkdown());
  writeFileSync(
    join(pack, "manifest.json"),
    JSON.stringify(
      {
        id: "pixel-mochi",
        name: "Mochi Tabby",
        version: "0.6.3",
        artist: "Desktop LiveCat",
        description:
          "Built-in orange tabby spritesheet cat sample for Codex-style custom pets, BongoCat-like typing taps, cat-facing keyboard, Pomodoro focus, and break states.",
        preview: "preview/preview.svg",
        renderMode: "spritesheet",
        tags: ["spritesheet", "keyboard", "pomodoro", "offline", "template"],
        persona: {
          name: "Mochi Tabby",
          species: "cat",
          style: "orange tabby desktop spritesheet",
          personality: "focused, soft, and reactive to keyboard rhythm",
          palette: [palette.fur, palette.fur2, palette.stripe, palette.dark, palette.cream],
          accessories: ["cat-facing computer keyboard", "timer note"],
        },
        spritesheet: {
          image: "spritesheet/avatar.svg",
          columns: frame.columns,
          rows: frame.rows,
          frameWidth: frame.width,
          frameHeight: frame.height,
          statesFile: "spritesheet/states.json",
          states,
        },
        privacy: {
          keyboardSync: "rhythm-only",
          storesKeyValues: false,
        },
        artistWorkflow: {
          status: "source-ready",
          brief: "artist/spritesheet-handoff.md",
          checklist: "artist/artist-checklist.md",
          primarySource: "spritesheet/avatar.svg",
          preferredDeliverable: "PNG/WebP/SVG spritesheet, 8 x 9 cells, 192 x 208 each",
        },
      },
      null,
      2,
    ),
  );
}

function writeTemplatePack() {
  const pack = join(root, "pets", "_spritesheet-template");
  ensurePackDirs(pack);
  writeFileSync(join(pack, "spritesheet", "template.svg"), renderTemplateSvg());
  writeFileSync(join(pack, "spritesheet", "states.json"), JSON.stringify(states, null, 2));
  writeFileSync(join(pack, "preview", "preview.svg"), renderTemplatePreviewSvg());
  writeFileSync(join(pack, "artist", "spritesheet-handoff.md"), handoffMarkdown("Your Pet"));
  writeFileSync(join(pack, "artist", "artist-checklist.md"), checklistMarkdown());
  writeFileSync(
    join(pack, "manifest.json"),
    JSON.stringify(
      {
        id: "your-pet-id",
        name: "Your Pet",
        version: "0.1.0",
        artist: "Artist Name",
        description: "Copy this folder, rename the id, and replace spritesheet/avatar.png or avatar.webp.",
        preview: "preview/preview.svg",
        renderMode: "spritesheet",
        tags: ["spritesheet", "template", "offline"],
        persona: {
          name: "Your Pet",
          species: "cat",
          style: "desktop spritesheet",
          personality: "short character notes",
          palette: ["#ffd8bf", "#ef9d91", "#2f2430", "#fff6dd"],
        },
        spritesheet: {
          image: "spritesheet/avatar.webp",
          columns: frame.columns,
          rows: frame.rows,
          frameWidth: frame.width,
          frameHeight: frame.height,
          statesFile: "spritesheet/states.json",
          states,
        },
        privacy: {
          keyboardSync: "rhythm-only",
          storesKeyValues: false,
        },
        artistWorkflow: {
          status: "source-ready",
          brief: "artist/spritesheet-handoff.md",
          checklist: "artist/artist-checklist.md",
          primarySource: "spritesheet/template.svg",
          preferredDeliverable: "PNG/WebP/SVG spritesheet, 8 x 9 cells, 192 x 208 each",
        },
      },
      null,
      2,
    ),
  );
}

function ensurePackDirs(pack) {
  for (const dir of ["spritesheet", "preview", "artist"]) {
    mkdirSync(join(pack, dir), { recursive: true });
  }
}

function stateFrames(row, count, options = {}) {
  const spec = {
    frames: Array.from({ length: count }, (_, index) => ({
      row,
      column: index,
      durationMs: index + 1 === count ? 220 : 110,
    })),
    loopStartIndex: options.loopStartIndex === undefined ? 0 : options.loopStartIndex,
  };
  if (options.fallback) spec.fallback = options.fallback;
  return spec;
}

function renderSpritesheetSvg(title) {
  let cells = "";
  for (let row = 0; row < frame.rows; row += 1) {
    for (let column = 0; column < frame.columns; column += 1) {
      cells += renderCell(column * frame.width, row * frame.height, row, column);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1872" viewBox="0 0 1536 1872">
<title>${escapeXml(title)}</title>
<rect width="1536" height="1872" fill="none"/>
${cells}</svg>
`;
}

function renderCell(x, y, row, column) {
  const bob = ((column % 4) - 1.5) * 2;
  const typeBeat = row === 3 ? column % 2 : -1;
  const leftDown = row === 1 || typeBeat === 0;
  const rightDown = row === 2 || typeBeat === 1;
  const focus = row === 4;
  const rest = row === 5;
  const happy = row === 6;
  const sleepy = row === 7;
  const failed = row === 8;
  const eyeH = sleepy ? 4 : failed ? 14 : happy ? 17 : 18;
  const mouth = happy ? "M84 104 Q96 120 108 104" : failed ? "M88 113 Q96 104 104 113" : "M86 108 Q96 116 106 108";
  const stretch = rest ? 12 : 0;
  const keyboard = renderTinyKeyboard(leftDown, rightDown);
  const timer = focus || rest
    ? `<rect x="116" y="138" width="48" height="28" rx="6" fill="${palette.cream}" stroke="${palette.line}" stroke-width="3"/><path d="M129 151h21" stroke="${palette.line}" stroke-width="3" stroke-linecap="round"/>`
    : "";
  return `<g transform="translate(${x} ${y})">
<ellipse cx="96" cy="180" rx="62" ry="12" fill="${palette.dark}" opacity=".16"/>
<path d="M130 114 C171 102 178 143 141 153" fill="none" stroke="${palette.fur2}" stroke-width="16" stroke-linecap="round"/>
<ellipse cx="96" cy="${112 + bob - stretch / 2}" rx="${50 + stretch / 3}" ry="${56 - stretch / 4}" fill="${palette.fur}"/>
<ellipse cx="96" cy="${66 + bob - stretch}" rx="54" ry="46" fill="${palette.fur}"/>
<ellipse cx="96" cy="${126 + bob - stretch / 3}" rx="28" ry="34" fill="${palette.cream}" opacity=".9"/>
<path d="M54 ${35 + bob - stretch} L70 ${6 + bob - stretch} L86 ${38 + bob - stretch}Z" fill="${palette.fur2}"/>
<path d="M106 ${38 + bob - stretch} L122 ${6 + bob - stretch} L138 ${35 + bob - stretch}Z" fill="${palette.fur2}"/>
<path d="M63 ${35 + bob - stretch} L70 ${18 + bob - stretch} L78 ${37 + bob - stretch}Z" fill="#ffd0b5"/>
<path d="M114 ${37 + bob - stretch} L122 ${18 + bob - stretch} L130 ${35 + bob - stretch}Z" fill="#ffd0b5"/>
<path d="M76 ${24 + bob - stretch} L83 ${48 + bob - stretch}M96 ${18 + bob - stretch} V51M116 ${24 + bob - stretch} L109 ${48 + bob - stretch}" stroke="${palette.stripe}" stroke-width="4" stroke-linecap="round" opacity=".8"/>
<ellipse cx="76" cy="${65 + bob - stretch}" rx="8" ry="${eyeH}" fill="${palette.dark}"/>
<ellipse cx="116" cy="${65 + bob - stretch}" rx="8" ry="${eyeH}" fill="${palette.dark}"/>
<ellipse cx="96" cy="${99 + bob - stretch}" rx="25" ry="18" fill="${palette.cream}"/>
<path d="M70 ${101 + bob - stretch} H43M72 ${108 + bob - stretch} H46M122 ${101 + bob - stretch} H149M120 ${108 + bob - stretch} H146" stroke="${palette.line}" stroke-width="3" stroke-linecap="round" opacity=".75"/>
<path d="${mouth}" fill="none" stroke="${palette.line}" stroke-width="4" stroke-linecap="round"/>
${keyboard}
<ellipse cx="66" cy="${128 + bob + (leftDown ? 19 : 0)}" rx="14" ry="23" fill="${palette.cream}" transform="rotate(${leftDown ? 18 : 5} 66 ${128 + bob})"/>
<ellipse cx="126" cy="${128 + bob + (rightDown ? 19 : 0)}" rx="14" ry="23" fill="${palette.cream}" transform="rotate(${rightDown ? -18 : -5} 126 ${128 + bob})"/>
${timer}
</g>
`;
}

function renderTinyKeyboard(leftDown, rightDown) {
  const firstRow = [48, 62, 76, 90, 104, 118, 132].map((keyX) =>
    `<rect x="${keyX}" y="149" width="10" height="8" rx="2" fill="${palette.key}" opacity=".92"/>`,
  ).join("");
  const secondRow = [55, 69, 83, 97, 111, 125].map((keyX, index) => {
    const press = (index === 2 && leftDown) || (index === 3 && rightDown);
    return `<rect x="${keyX}" y="${160 + (press ? 4 : 0)}" width="11" height="8" rx="2" fill="${palette.key}"/>`;
  }).join("");
  return `<path d="M38 145H154L163 177H29Z" fill="${palette.dark}"/>
<path d="M45 150H147L152 171H40Z" fill="#343b48" opacity=".9"/>
${firstRow}
${secondRow}
<rect x="70" y="170" width="52" height="7" rx="3" fill="${palette.key}" opacity=".95"/>`;
}

function renderTemplateSvg() {
  let grid = "";
  for (let row = 0; row < frame.rows; row += 1) {
    for (let column = 0; column < frame.columns; column += 1) {
      grid += `<rect x="${column * frame.width}" y="${row * frame.height}" width="${frame.width}" height="${frame.height}" fill="none" stroke="#c7b8ad" stroke-width="2"/>`;
    }
    grid += `<text x="12" y="${row * frame.height + 34}" font-family="Arial" font-size="24" fill="#6a535b">${rows[row][0]}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1872" viewBox="0 0 1536 1872"><rect width="1536" height="1872" fill="#fffaf0"/>${grid}</svg>
`;
}

function renderPreviewSvg(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="416" viewBox="0 0 384 416">
<rect width="384" height="416" rx="28" fill="#fffaf0"/>
${renderCell(96, 80, 0, 0)}
<text x="192" y="382" text-anchor="middle" font-family="Arial" font-size="24" fill="${palette.line}">${escapeXml(name)}</text>
</svg>
`;
}

function renderTemplatePreviewSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="416" viewBox="0 0 384 416">
<rect width="384" height="416" rx="28" fill="#fffaf0"/>
<rect x="48" y="48" width="288" height="252" fill="none" stroke="#c7b8ad" stroke-width="4"/>
<path d="M48 132H336M48 216H336M144 48V300M240 48V300" stroke="#c7b8ad" stroke-width="3"/>
<text x="192" y="350" text-anchor="middle" font-family="Arial" font-size="24" fill="#6a535b">8 x 9 spritesheet</text>
</svg>
`;
}

function handoffMarkdown(name) {
  return `# ${name} Spritesheet Handoff

Canvas: 1536 x 1872. Grid: 8 columns x 9 rows. Cell: 192 x 208.

Keep the character inside each cell. Export transparent PNG, WebP, or SVG. Do not add scripts or external links.

| Row | State | What to draw |
| --- | --- | --- |
${rows.map((row, index) => `| ${index} | ${row[0]} | ${row[1]} |`).join("\n")}

Typing must read as left and right paw strikes on a real computer keyboard. Draw row offsets, separated keycaps, a spacebar, and a cat-facing orientation; the keyboard is for the pet, not a front-facing label panel for the human viewer. The app alternates tap_left and tap_right from keyboard rhythm events and falls back to typing while the user is still active.
`;
}

function checklistMarkdown() {
  return `- [ ] Every cell has the same canvas size and alignment.
- [ ] Idle loops without a visible jump.
- [ ] tap_left and tap_right clearly press different key groups.
- [ ] The keyboard reads as a computer keyboard with row offsets and a spacebar.
- [ ] Keyboard labels or marks face the pet direction, not the viewer direction.
- [ ] typing alternates left/right and does not look like sliding.
- [ ] focus and break are readable at small desktop size.
- [ ] failed/dragged has a recovery-friendly pose.
- [ ] Preview is legible at 384 x 416.
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main();
