import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const packRoot = join(process.cwd(), "pets", "livecat-default");
const sourceDir = join(packRoot, "source");
const layerDir = join(sourceDir, "layers");
const motionDir = join(packRoot, "motions");
const expressionDir = join(packRoot, "expressions");
const designDir = join(packRoot, "design");
const modelDir = join(packRoot, "model");

for (const dir of [sourceDir, layerDir, motionDir, expressionDir, designDir, modelDir]) {
  mkdirSync(dir, { recursive: true });
}

const canvas = { width: 1024, height: 1024 };
const palette = {
  line: "#5f3840",
  fur: "#f4ad91",
  furLight: "#ffd9bd",
  furDark: "#d87972",
  cream: "#fff0d6",
  creamDark: "#f0caa8",
  rose: "#e8888f",
  eye: "#3a2730",
  eyeBrown: "#7b4331",
  plum: "#38253a",
  plumMid: "#6c3e62",
  plumLight: "#a86788",
  key: "#eed7cf",
  shadow: "#2d1b28",
};

const layers = [];

function add(layer) {
  layers.push(layer);
}

function rect(x, y, width, height, rx, fill, attrs = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" ${attrs}/>`;
}

function ellipse(cx, cy, rx, ry, fill, attrs = "") {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${attrs}/>`;
}

function path(d, fill, attrs = "") {
  return `<path d="${d}" fill="${fill}" ${attrs}/>`;
}

function strokePath(d, stroke = palette.line, width = 10, attrs = "") {
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${attrs}/>`;
}

function layer(id, name, group, z, bbox, anchor, rig, parameters, svg) {
  add({ id, name, group, z, bbox, anchor, rig, parameters, svg });
}

layer(
  "tail_base",
  "Tail base",
  "Tail",
  10,
  [178, 526, 270, 230],
  [430, 682],
  "Root tail mesh. Bind to body and rotate with delayed follow.",
  ["ParamTailBaseAngle", "ParamBodyAngleZ"],
  [
    path(
      "M430 684 C350 704 286 700 235 654 C188 611 184 552 226 532 C272 510 310 556 286 603 C322 604 361 591 397 566 C421 601 436 639 430 684Z",
      palette.furDark,
      `stroke="${palette.line}" stroke-width="10" stroke-linejoin="round"`,
    ),
    path(
      "M396 565 C359 591 323 604 288 603 C303 574 293 545 266 532 C327 522 380 539 396 565Z",
      palette.fur,
      `opacity="0.78"`,
    ),
  ].join("\n"),
);

layer(
  "tail_mid",
  "Tail middle band",
  "Tail",
  11,
  [202, 555, 138, 110],
  [276, 612],
  "Independent middle tail band for secondary curl deformation.",
  ["ParamTailMidAngle"],
  [
    path(
      "M329 628 C290 671 229 665 210 626 C196 596 212 566 242 558 C268 586 296 610 329 628Z",
      palette.cream,
      `stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"`,
    ),
  ].join("\n"),
);

layer(
  "tail_tip",
  "Tail tip",
  "Tail",
  12,
  [186, 509, 130, 134],
  [282, 612],
  "Curl tip. Use smaller mesh and higher delayed spring than base.",
  ["ParamTailTipAngle"],
  [
    path(
      "M294 527 C323 554 311 612 273 634 C238 654 197 638 190 604 C218 603 251 590 264 560 C270 546 278 535 294 527Z",
      palette.furLight,
      `stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"`,
    ),
    path("M272 540 C292 558 291 592 267 612", "none", `stroke="${palette.cream}" stroke-width="9" stroke-linecap="round" opacity="0.65"`),
  ].join("\n"),
);

layer(
  "ear_left_outer",
  "Left outer ear",
  "Head/Ears",
  30,
  [319, 197, 146, 176],
  [412, 357],
  "Rotate at lower inner base. Keep behind head base.",
  ["ParamEarLAngle", "ParamAngleZ"],
  path(
    "M429 357 C366 337 332 287 326 205 C391 221 442 264 457 347 C449 354 440 357 429 357Z",
    palette.fur,
    `stroke="${palette.line}" stroke-width="10" stroke-linejoin="round"`,
  ),
);

layer(
  "ear_right_outer",
  "Right outer ear",
  "Head/Ears",
  31,
  [559, 197, 146, 176],
  [612, 357],
  "Rotate at lower inner base. Mirror left ear rig.",
  ["ParamEarRAngle", "ParamAngleZ"],
  path(
    "M595 357 C658 337 692 287 698 205 C633 221 582 264 567 347 C575 354 584 357 595 357Z",
    palette.fur,
    `stroke="${palette.line}" stroke-width="10" stroke-linejoin="round"`,
  ),
);

layer(
  "ear_left_inner",
  "Left inner ear",
  "Head/Ears",
  32,
  [345, 231, 88, 106],
  [405, 337],
  "Nested under outer ear. Subtle compression during ear twitch.",
  ["ParamEarLAngle"],
  path("M419 333 C377 319 353 285 351 238 C391 250 420 283 427 329Z", palette.rose, `opacity="0.72"`),
);

layer(
  "ear_right_inner",
  "Right inner ear",
  "Head/Ears",
  33,
  [591, 231, 88, 106],
  [619, 337],
  "Nested under outer ear. Mirror left inner ear.",
  ["ParamEarRAngle"],
  path("M605 333 C647 319 671 285 673 238 C633 250 604 283 597 329Z", palette.rose, `opacity="0.72"`),
);

layer(
  "body_base",
  "Body base",
  "Body",
  40,
  [352, 474, 320, 318],
  [512, 730],
  "Main torso mesh. Breathing expands vertically and slightly laterally.",
  ["ParamBreath", "ParamBodyAngleX", "ParamBodyAngleY", "ParamBodyAngleZ"],
  [
    ellipse(512, 638, 142, 154, palette.fur, `stroke="${palette.line}" stroke-width="10"`),
    path("M412 553 C454 504 574 500 620 552 C585 573 436 573 412 553Z", palette.furLight, `opacity="0.35"`),
  ].join("\n"),
);

layer(
  "body_side_shadow",
  "Body side shadow",
  "Body",
  41,
  [559, 522, 94, 218],
  [604, 650],
  "Dark side form. Keep as separate multiply-like layer for body turn.",
  ["ParamBodyAngleX", "ParamBreath"],
  path("M601 526 C641 572 656 665 624 734 C603 703 584 612 590 545Z", palette.furDark, `opacity="0.35"`),
);

layer(
  "chest_patch",
  "Chest patch",
  "Body",
  42,
  [426, 544, 172, 218],
  [512, 662],
  "Chest patch should lag behind torso only very slightly.",
  ["ParamBreath", "ParamBodyAngleY"],
  path(
    "M512 552 C579 577 604 681 548 756 C528 768 496 768 476 756 C420 681 445 577 512 552Z",
    palette.cream,
    `stroke="${palette.creamDark}" stroke-width="5" stroke-linejoin="round"`,
  ),
);

layer(
  "back_paw_left",
  "Left back paw",
  "Paws",
  50,
  [348, 712, 104, 94],
  [404, 770],
  "Back paw anchors pet on the desktop. Minimal motion.",
  ["ParamBodyAngleZ", "ParamSquash"],
  ellipse(401, 760, 48, 36, palette.cream, `stroke="${palette.line}" stroke-width="8"`),
);

layer(
  "back_paw_right",
  "Right back paw",
  "Paws",
  51,
  [572, 712, 104, 94],
  [620, 770],
  "Back paw anchors pet on the desktop. Mirror left.",
  ["ParamBodyAngleZ", "ParamSquash"],
  ellipse(623, 760, 48, 36, palette.cream, `stroke="${palette.line}" stroke-width="8"`),
);

layer(
  "keyboard_shadow",
  "Keyboard shadow",
  "Keyboard",
  60,
  [304, 802, 416, 72],
  [512, 838],
  "Grounding shadow. Do not bind to key press.",
  ["ParamSquash"],
  ellipse(512, 838, 204, 28, palette.shadow, `opacity="0.18"`),
);

layer(
  "keyboard_body",
  "Keyboard body",
  "Keyboard",
  61,
  [306, 708, 412, 138],
  [512, 782],
  "Rigid prop mesh with slight bounce during typing.",
  ["ParamKeyboardBounce", "ParamKeyboardPressL", "ParamKeyboardPressR"],
  [
    rect(316, 720, 392, 112, 22, palette.plum, `stroke="${palette.line}" stroke-width="9"`),
    rect(330, 732, 364, 72, 14, palette.plumMid, `opacity="0.45"`),
    rect(374, 815, 276, 16, 8, "#211625", `opacity="0.55"`),
  ].join("\n"),
);

const keyRows = [
  { y: 740, x: 342, count: 9, w: 30, h: 24, gap: 9 },
  { y: 772, x: 356, count: 8, w: 32, h: 24, gap: 10 },
  { y: 803, x: 386, count: 5, w: 46, h: 22, gap: 12 },
];

let keyIndex = 0;
for (const row of keyRows) {
  for (let index = 0; index < row.count; index += 1) {
    keyIndex += 1;
    const x = row.x + index * (row.w + row.gap);
    const id = `key_${keyIndex.toString().padStart(2, "0")}`;
    const isHome = keyIndex === 12 || keyIndex === 13;
    layer(
      id,
      `Keyboard key ${keyIndex.toString().padStart(2, "0")}`,
      "Keyboard/Keys",
      70 + keyIndex,
      [x - 4, row.y - 4, row.w + 8, row.h + 12],
      [x + row.w / 2, row.y + row.h / 2],
      isHome ? "Primary paw strike key. Give this key the strongest press curve." : "Individual key layer for rhythmic typing highlights.",
      isHome ? ["ParamKeyboardPressL", "ParamKeyboardPressR"] : ["ParamKeyboardBounce"],
      [
        rect(x, row.y, row.w, row.h, 6, isHome ? palette.plumLight : palette.key, `stroke="${palette.line}" stroke-width="4"`),
        rect(x + 4, row.y + 3, row.w - 8, 4, 2, "#ffffff", `opacity="0.24"`),
      ].join("\n"),
    );
  }
}

layer(
  "front_paw_left",
  "Left front paw",
  "Paws",
  110,
  [392, 624, 102, 162],
  [445, 650],
  "Typing paw. Rotate down onto left home keys, with squash at contact.",
  ["ParamPawLTap", "ParamKeyboardPressL", "ParamBodyAngleZ"],
  [
    path(
      "M447 627 C487 650 495 725 459 778 C437 789 406 777 400 750 C405 703 415 659 447 627Z",
      palette.cream,
      `stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"`,
    ),
    strokePath("M427 746 C436 754 450 754 459 746", palette.creamDark, 4),
  ].join("\n"),
);

layer(
  "front_paw_right",
  "Right front paw",
  "Paws",
  111,
  [530, 624, 102, 162],
  [579, 650],
  "Typing paw. Alternate with left paw on typing_sync motion.",
  ["ParamPawRTap", "ParamKeyboardPressR", "ParamBodyAngleZ"],
  [
    path(
      "M577 627 C537 650 529 725 565 778 C587 789 618 777 624 750 C619 703 609 659 577 627Z",
      palette.cream,
      `stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"`,
    ),
    strokePath("M597 746 C588 754 574 754 565 746", palette.creamDark, 4),
  ].join("\n"),
);

layer(
  "head_base",
  "Head base",
  "Head",
  120,
  [300, 280, 424, 330],
  [512, 455],
  "Main face mesh. Use ParamAngleX/Y/Z and keep muzzle/eyes as children.",
  ["ParamAngleX", "ParamAngleY", "ParamAngleZ"],
  [
    ellipse(512, 442, 202, 154, palette.fur, `stroke="${palette.line}" stroke-width="11"`),
    path("M338 421 C382 312 642 312 686 421 C640 367 386 367 338 421Z", palette.furLight, `opacity="0.42"`),
    path("M321 472 C379 587 645 587 703 472 C675 577 349 577 321 472Z", palette.furDark, `opacity="0.17"`),
  ].join("\n"),
);

layer(
  "cheek_fur_left",
  "Left cheek fur",
  "Head",
  121,
  [304, 426, 92, 90],
  [379, 474],
  "Small cheek silhouette pieces. Follow head angle, tiny squash on smile.",
  ["ParamAngleX", "ParamMouthForm"],
  path("M388 439 C364 452 336 455 312 447 C327 472 350 492 383 505 C374 481 380 459 388 439Z", palette.furDark, `opacity="0.55"`),
);

layer(
  "cheek_fur_right",
  "Right cheek fur",
  "Head",
  122,
  [628, 426, 92, 90],
  [645, 474],
  "Mirror cheek silhouette.",
  ["ParamAngleX", "ParamMouthForm"],
  path("M636 439 C660 452 688 455 712 447 C697 472 674 492 641 505 C650 481 644 459 636 439Z", palette.furDark, `opacity="0.55"`),
);

layer(
  "forehead_tuft",
  "Forehead tuft",
  "Head",
  123,
  [442, 251, 142, 128],
  [512, 360],
  "Hair tuft. Add delayed wobble for head motion.",
  ["ParamAngleZ", "ParamHairFront"],
  path(
    "M510 365 C476 338 468 298 493 259 C502 282 518 287 534 260 C541 296 535 335 510 365Z",
    palette.furLight,
    `stroke="${palette.line}" stroke-width="8" stroke-linejoin="round"`,
  ),
);

layer(
  "muzzle",
  "Muzzle",
  "Face",
  130,
  [436, 454, 152, 96],
  [512, 504],
  "Soft muzzle patch. Minor Y squash on mouth open.",
  ["ParamAngleX", "ParamMouthOpenY", "ParamMouthForm"],
  ellipse(512, 501, 70, 42, palette.cream, `stroke="${palette.creamDark}" stroke-width="4"`),
);

layer(
  "nose",
  "Nose",
  "Face",
  131,
  [491, 471, 42, 32],
  [512, 492],
  "Tiny nose. Follow muzzle, no independent mesh needed.",
  ["ParamMouthForm"],
  path("M493 481 C502 470 522 470 531 481 C526 497 498 497 493 481Z", palette.rose, `stroke="${palette.line}" stroke-width="4" stroke-linejoin="round"`),
);

layer(
  "mouth",
  "Mouth",
  "Face",
  132,
  [470, 498, 84, 56],
  [512, 520],
  "Smile curve. Add open-mouth replacement art if voice/TTS is added.",
  ["ParamMouthOpenY", "ParamMouthForm"],
  [
    strokePath("M512 500 C510 521 491 525 480 514", palette.line, 6),
    strokePath("M512 500 C514 521 533 525 544 514", palette.line, 6),
  ].join("\n"),
);

layer(
  "eye_left_white",
  "Left eye white",
  "Eyes/Left",
  140,
  [390, 392, 76, 96],
  [428, 442],
  "Eye white. Mask iris and highlight inside this boundary.",
  ["ParamEyeLOpen", "ParamEyeBallX", "ParamEyeBallY", "ParamAngleX"],
  ellipse(428, 442, 32, 42, "#fffaf2", `stroke="${palette.line}" stroke-width="7"`),
);

layer(
  "eye_right_white",
  "Right eye white",
  "Eyes/Right",
  141,
  [558, 392, 76, 96],
  [596, 442],
  "Eye white. Mirror left eye.",
  ["ParamEyeROpen", "ParamEyeBallX", "ParamEyeBallY", "ParamAngleX"],
  ellipse(596, 442, 32, 42, "#fffaf2", `stroke="${palette.line}" stroke-width="7"`),
);

layer(
  "iris_left",
  "Left iris",
  "Eyes/Left",
  142,
  [406, 409, 44, 64],
  [428, 442],
  "Iris should move inside eye mask with eyeball params.",
  ["ParamEyeBallX", "ParamEyeBallY", "ParamEyeLOpen"],
  [
    ellipse(428, 444, 19, 29, palette.eye),
    ellipse(428, 452, 15, 18, palette.eyeBrown, `opacity="0.68"`),
  ].join("\n"),
);

layer(
  "iris_right",
  "Right iris",
  "Eyes/Right",
  143,
  [574, 409, 44, 64],
  [596, 442],
  "Mirror iris movement.",
  ["ParamEyeBallX", "ParamEyeBallY", "ParamEyeROpen"],
  [
    ellipse(596, 444, 19, 29, palette.eye),
    ellipse(596, 452, 15, 18, palette.eyeBrown, `opacity="0.68"`),
  ].join("\n"),
);

layer(
  "eye_highlight_left",
  "Left eye highlight",
  "Eyes/Left",
  144,
  [415, 417, 28, 28],
  [428, 431],
  "Highlight follows iris at 60 percent strength.",
  ["ParamEyeBallX", "ParamEyeBallY"],
  ellipse(420, 426, 8, 9, "#ffffff"),
);

layer(
  "eye_highlight_right",
  "Right eye highlight",
  "Eyes/Right",
  145,
  [583, 417, 28, 28],
  [596, 431],
  "Mirror highlight.",
  ["ParamEyeBallX", "ParamEyeBallY"],
  ellipse(588, 426, 8, 9, "#ffffff"),
);

layer(
  "eyelid_left",
  "Left eyelid",
  "Eyes/Left",
  146,
  [388, 386, 82, 44],
  [428, 407],
  "Upper lid. Closes downward on ParamEyeLOpen.",
  ["ParamEyeLOpen"],
  path("M394 423 C407 388 449 388 462 423 C447 408 410 408 394 423Z", palette.fur, `stroke="${palette.line}" stroke-width="6" stroke-linejoin="round"`),
);

layer(
  "eyelid_right",
  "Right eyelid",
  "Eyes/Right",
  147,
  [554, 386, 82, 44],
  [596, 407],
  "Upper lid. Mirror left lid.",
  ["ParamEyeROpen"],
  path("M562 423 C575 388 617 388 630 423 C615 408 578 408 562 423Z", palette.fur, `stroke="${palette.line}" stroke-width="6" stroke-linejoin="round"`),
);

layer(
  "brow_left",
  "Left brow",
  "Face",
  150,
  [392, 357, 62, 36],
  [424, 380],
  "Soft expression brow. Keep subtle.",
  ["ParamBrowLY", "ParamBrowLForm"],
  strokePath("M402 382 C414 366 438 365 448 379", palette.furDark, 7),
);

layer(
  "brow_right",
  "Right brow",
  "Face",
  151,
  [570, 357, 62, 36],
  [600, 380],
  "Mirror brow.",
  ["ParamBrowRY", "ParamBrowRForm"],
  strokePath("M622 382 C610 366 586 365 576 379", palette.furDark, 7),
);

layer(
  "blush_left",
  "Left blush",
  "Face",
  160,
  [354, 481, 58, 34],
  [383, 498],
  "Expression tint. Fade for happy/break.",
  ["ParamCheek"],
  ellipse(383, 498, 26, 12, palette.rose, `opacity="0.35"`),
);

layer(
  "blush_right",
  "Right blush",
  "Face",
  161,
  [612, 481, 58, 34],
  [641, 498],
  "Mirror expression tint.",
  ["ParamCheek"],
  ellipse(641, 498, 26, 12, palette.rose, `opacity="0.35"`),
);

layer(
  "whiskers_left",
  "Left whiskers",
  "Face",
  170,
  [301, 476, 138, 68],
  [438, 505],
  "Three-stroke whisker layer. Keep vector-like and thin.",
  ["ParamAngleX", "ParamMouthForm"],
  [
    strokePath("M432 493 C392 477 346 476 310 488", palette.cream, 4),
    strokePath("M434 508 C392 506 346 517 312 537", palette.cream, 4),
  ].join("\n"),
);

layer(
  "whiskers_right",
  "Right whiskers",
  "Face",
  171,
  [585, 476, 138, 68],
  [586, 505],
  "Mirror whiskers.",
  ["ParamAngleX", "ParamMouthForm"],
  [
    strokePath("M592 493 C632 477 678 476 714 488", palette.cream, 4),
    strokePath("M590 508 C632 506 678 517 712 537", palette.cream, 4),
  ].join("\n"),
);

layers.sort((left, right) => left.z - right.z || left.id.localeCompare(right.id));

function svgDocument(body, viewBox = `0 0 ${canvas.width} ${canvas.height}`, width = canvas.width, height = canvas.height) {
  return [
    `<svg width="${width}" height="${height}" viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">`,
    '  <metadata>{"source":"Desktop LiveCat generated source layers","character":"Mochi Prototype"}</metadata>',
    body,
    "</svg>",
    "",
  ].join("\n");
}

const combinedBody = layers
  .map((item) => `  <g id="${item.id}" data-group="${item.group}" data-z="${item.z}">\n${indent(item.svg, 4)}\n  </g>`)
  .join("\n");

writeFileSync(join(sourceDir, "livecat-layers.svg"), svgDocument(combinedBody), "utf8");

for (const item of layers) {
  const [x, y, width, height] = item.bbox;
  const viewBox = `${x} ${y} ${width} ${height}`;
  const layerSvg = svgDocument(`  <g id="${item.id}">\n${indent(item.svg, 4)}\n  </g>`, viewBox, width, height);
  writeFileSync(join(layerDir, `${item.z.toString().padStart(3, "0")}_${item.id}.svg`), layerSvg, "utf8");
}

const layerMap = {
  schema: "desktop-livecat.live2dLayerMap.v1",
  character: "Mochi Prototype",
  canvas,
  files: {
    concept: "preview/livecat-ai-concept.png",
    combinedSvg: "source/livecat-layers.svg",
    parameterSpec: "model/livecat-parameter-spec.json",
  },
  importTarget: {
    cubismEditor: "5.x",
    preferredExchange: "PSD, RGB, 8bit/channel, sRGB",
    fallbackExchange: "transparent PNG layers assembled into PSD by preserving bbox placement",
    notes: [
      "Use the SVG source as editable upstream art, not as the direct Cubism import format.",
      "Flatten line and fill inside each named part before PSD import.",
      "Keep layer names stable after the first Cubism import to preserve re-import mapping.",
    ],
  },
  layers: layers.map((item) => ({
    id: item.id,
    name: item.name,
    group: item.group,
    z: item.z,
    file: `source/layers/${item.z.toString().padStart(3, "0")}_${item.id}.svg`,
    bbox: {
      x: item.bbox[0],
      y: item.bbox[1],
      width: item.bbox[2],
      height: item.bbox[3],
    },
    anchor: { x: item.anchor[0], y: item.anchor[1] },
    parameters: item.parameters,
    rig: item.rig,
  })),
};

writeFileSync(join(sourceDir, "livecat-layer-map.json"), `${JSON.stringify(layerMap, null, 2)}\n`, "utf8");
writeFileSync(join(sourceDir, "livecat-parts.csv"), csvForLayers(layers), "utf8");

const parameterSpec = {
  schema: "desktop-livecat.live2dParameterSpec.v1",
  character: "Mochi Prototype",
  standardParameters: [
    { id: "ParamAngleX", min: -30, default: 0, max: 30, use: "head horizontal turn" },
    { id: "ParamAngleY", min: -30, default: 0, max: 30, use: "head vertical turn" },
    { id: "ParamAngleZ", min: -30, default: 0, max: 30, use: "head tilt" },
    { id: "ParamBodyAngleX", min: -10, default: 0, max: 10, use: "body horizontal turn" },
    { id: "ParamBodyAngleY", min: -10, default: 0, max: 10, use: "body vertical turn" },
    { id: "ParamBodyAngleZ", min: -10, default: 0, max: 10, use: "body tilt" },
    { id: "ParamBreath", min: 0, default: 0.5, max: 1, use: "breathing" },
    { id: "ParamEyeLOpen", min: 0, default: 1, max: 1, use: "left blink" },
    { id: "ParamEyeROpen", min: 0, default: 1, max: 1, use: "right blink" },
    { id: "ParamEyeBallX", min: -1, default: 0, max: 1, use: "eye look x" },
    { id: "ParamEyeBallY", min: -1, default: 0, max: 1, use: "eye look y" },
    { id: "ParamMouthOpenY", min: 0, default: 0, max: 1, use: "mouth open" },
    { id: "ParamMouthForm", min: -1, default: 0, max: 1, use: "mouth smile/form" },
  ],
  customParameters: [
    { id: "ParamEarLAngle", min: -25, default: 0, max: 25, use: "left ear twitch" },
    { id: "ParamEarRAngle", min: -25, default: 0, max: 25, use: "right ear twitch" },
    { id: "ParamTailBaseAngle", min: -35, default: 0, max: 35, use: "tail base sway" },
    { id: "ParamTailMidAngle", min: -45, default: 0, max: 45, use: "tail middle follow" },
    { id: "ParamTailTipAngle", min: -55, default: 0, max: 55, use: "tail tip follow" },
    { id: "ParamPawLTap", min: 0, default: 0, max: 1, use: "left typing paw contact" },
    { id: "ParamPawRTap", min: 0, default: 0, max: 1, use: "right typing paw contact" },
    { id: "ParamKeyboardPressL", min: 0, default: 0, max: 1, use: "left key press" },
    { id: "ParamKeyboardPressR", min: 0, default: 0, max: 1, use: "right key press" },
    { id: "ParamKeyboardBounce", min: -1, default: 0, max: 1, use: "keyboard prop bounce" },
    { id: "ParamHairFront", min: -1, default: 0, max: 1, use: "forehead tuft lag" },
    { id: "ParamCheek", min: 0, default: 0, max: 1, use: "blush opacity" },
    { id: "ParamSquash", min: -1, default: 0, max: 1, use: "drag/fall squash and stretch" },
    { id: "ParamStretch", min: 0, default: 0, max: 1, use: "break stretch pose" },
  ],
  motionBindings: {
    idle: ["ParamBreath", "ParamAngleX", "ParamAngleY", "ParamTailBaseAngle", "ParamTailMidAngle", "ParamTailTipAngle"],
    blink: ["ParamEyeLOpen", "ParamEyeROpen"],
    typing_sync: ["ParamPawLTap", "ParamPawRTap", "ParamKeyboardPressL", "ParamKeyboardPressR", "ParamEarLAngle", "ParamEarRAngle"],
    pomodoro_focus: ["ParamBreath", "ParamEyeBallY", "ParamMouthForm", "ParamTailBaseAngle"],
    pomodoro_break: ["ParamStretch", "ParamMouthOpenY", "ParamTailBaseAngle", "ParamTailTipAngle", "ParamCheek"],
    dragged: ["ParamSquash", "ParamAngleZ", "ParamTailBaseAngle", "ParamTailTipAngle"],
    fall_recover: ["ParamSquash", "ParamBodyAngleZ", "ParamAngleZ"],
  },
};

writeFileSync(join(modelDir, "livecat-parameter-spec.json"), `${JSON.stringify(parameterSpec, null, 2)}\n`, "utf8");

writeMotion("idle", 4.0, true, [
  curve("ParamBreath", [
    [0, 0.42],
    [1, 1.0],
    [2, 0.5],
    [3, 0.18],
    [4, 0.42],
  ]),
  curve("ParamAngleX", [
    [0, -2],
    [1.4, 1.5],
    [2.8, 2.5],
    [4, -2],
  ]),
  curve("ParamAngleY", [
    [0, 0],
    [2, 2],
    [4, 0],
  ]),
  curve("ParamTailBaseAngle", [
    [0, -8],
    [1.4, 9],
    [2.8, 5],
    [4, -8],
  ]),
  curve("ParamTailMidAngle", [
    [0, 6],
    [1.4, -11],
    [2.8, -4],
    [4, 6],
  ]),
  curve("ParamTailTipAngle", [
    [0, 12],
    [1.4, -16],
    [2.8, -7],
    [4, 12],
  ]),
]);

writeMotion("blink", 0.34, false, [
  curve("ParamEyeLOpen", [
    [0, 1],
    [0.08, 0.12],
    [0.14, 0],
    [0.22, 0.08],
    [0.34, 1],
  ]),
  curve("ParamEyeROpen", [
    [0, 1],
    [0.08, 0.12],
    [0.14, 0],
    [0.22, 0.08],
    [0.34, 1],
  ]),
]);

writeMotion("typing_sync", 0.8, true, [
  curve("ParamPawLTap", [
    [0, 0],
    [0.1, 1],
    [0.22, 0.25],
    [0.4, 0],
    [0.8, 0],
  ]),
  curve("ParamPawRTap", [
    [0, 0],
    [0.4, 0],
    [0.5, 1],
    [0.62, 0.25],
    [0.8, 0],
  ]),
  curve("ParamKeyboardPressL", [
    [0, 0],
    [0.1, 1],
    [0.2, 0],
    [0.8, 0],
  ]),
  curve("ParamKeyboardPressR", [
    [0, 0],
    [0.5, 1],
    [0.6, 0],
    [0.8, 0],
  ]),
  curve("ParamKeyboardBounce", [
    [0, 0],
    [0.1, -0.35],
    [0.2, 0.12],
    [0.5, -0.35],
    [0.62, 0.08],
    [0.8, 0],
  ]),
  curve("ParamEarLAngle", [
    [0, 0],
    [0.24, 8],
    [0.5, -3],
    [0.8, 0],
  ]),
  curve("ParamEarRAngle", [
    [0, 0],
    [0.4, -2],
    [0.62, 8],
    [0.8, 0],
  ]),
]);

writeMotion("pomodoro_focus", 6.0, true, [
  curve("ParamBreath", [
    [0, 0.45],
    [2, 0.82],
    [4, 0.2],
    [6, 0.45],
  ]),
  curve("ParamEyeBallY", [
    [0, -0.15],
    [3.5, -0.25],
    [6, -0.15],
  ]),
  curve("ParamMouthForm", [
    [0, 0.1],
    [6, 0.1],
  ]),
  curve("ParamTailBaseAngle", [
    [0, -3],
    [3, 3],
    [6, -3],
  ]),
]);

writeMotion("pomodoro_break", 3.2, false, [
  curve("ParamStretch", [
    [0, 0],
    [0.6, 1],
    [1.8, 0.75],
    [3.2, 0],
  ]),
  curve("ParamMouthOpenY", [
    [0, 0],
    [0.5, 0.85],
    [1.25, 0.9],
    [2.2, 0.15],
    [3.2, 0],
  ]),
  curve("ParamEyeLOpen", [
    [0, 1],
    [0.55, 0.35],
    [1.3, 0.2],
    [2.4, 1],
    [3.2, 1],
  ]),
  curve("ParamEyeROpen", [
    [0, 1],
    [0.55, 0.35],
    [1.3, 0.2],
    [2.4, 1],
    [3.2, 1],
  ]),
  curve("ParamTailBaseAngle", [
    [0, -12],
    [0.8, 22],
    [2.1, -18],
    [3.2, 0],
  ]),
  curve("ParamTailTipAngle", [
    [0, 20],
    [0.8, -35],
    [2.1, 28],
    [3.2, 0],
  ]),
  curve("ParamCheek", [
    [0, 0],
    [0.6, 0.75],
    [2.5, 0.55],
    [3.2, 0],
  ]),
]);

writeMotion("dragged", 1.0, true, [
  curve("ParamSquash", [
    [0, 0.6],
    [0.5, -0.35],
    [1, 0.6],
  ]),
  curve("ParamAngleZ", [
    [0, -7],
    [0.5, 7],
    [1, -7],
  ]),
  curve("ParamTailBaseAngle", [
    [0, 18],
    [0.5, -18],
    [1, 18],
  ]),
  curve("ParamTailTipAngle", [
    [0, -28],
    [0.5, 28],
    [1, -28],
  ]),
]);

writeMotion("fall_recover", 1.4, false, [
  curve("ParamSquash", [
    [0, 0],
    [0.18, -0.9],
    [0.35, 0.45],
    [0.65, -0.18],
    [1.4, 0],
  ]),
  curve("ParamBodyAngleZ", [
    [0, 0],
    [0.22, -7],
    [0.42, 6],
    [0.7, -2],
    [1.4, 0],
  ]),
  curve("ParamAngleZ", [
    [0, 0],
    [0.22, 8],
    [0.42, -8],
    [0.7, 2],
    [1.4, 0],
  ]),
]);

writeExpression("focus.exp3.json", [
  parameter("ParamMouthForm", 0.15, "Add"),
  parameter("ParamEyeBallY", -0.18, "Add"),
  parameter("ParamCheek", 0.08, "Add"),
]);

writeExpression("break.exp3.json", [
  parameter("ParamMouthForm", 0.45, "Add"),
  parameter("ParamCheek", 0.55, "Add"),
  parameter("ParamEyeLOpen", 0.88, "Multiply"),
  parameter("ParamEyeROpen", 0.88, "Multiply"),
]);

writeExpression("sleepy.exp3.json", [
  parameter("ParamEyeLOpen", 0.55, "Multiply"),
  parameter("ParamEyeROpen", 0.55, "Multiply"),
  parameter("ParamMouthOpenY", 0.12, "Add"),
  parameter("ParamMouthForm", -0.08, "Add"),
]);

writeExpression("happy.exp3.json", [
  parameter("ParamMouthForm", 0.75, "Add"),
  parameter("ParamCheek", 0.8, "Add"),
  parameter("ParamEarLAngle", 6, "Add"),
  parameter("ParamEarRAngle", -6, "Add"),
]);

writeFileSync(join(designDir, "ai-prompts.md"), promptPack(), "utf8");

console.log(`Generated ${layers.length} source layers, 7 motions, 4 expressions, and parameter specs.`);

function indent(value, spaces) {
  return value
    .split("\n")
    .map((line) => `${" ".repeat(spaces)}${line}`)
    .join("\n");
}

function csvForLayers(items) {
  const header = ["z", "id", "name", "group", "file", "bbox", "anchor", "parameters", "rig"];
  const rows = items.map((item) => [
    item.z,
    item.id,
    item.name,
    item.group,
    `source/layers/${item.z.toString().padStart(3, "0")}_${item.id}.svg`,
    item.bbox.join(" "),
    item.anchor.join(" "),
    item.parameters.join(" "),
    item.rig,
  ]);
  return `${[header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function curve(id, points) {
  return { id, points };
}

function parameter(id, value, blend) {
  return { Id: id, Value: value, Blend: blend };
}

function linearSegments(points) {
  const [first, ...rest] = points;
  const segments = [first[0], first[1]];
  for (const [time, value] of rest) {
    segments.push(0, time, value);
  }
  return segments;
}

function writeMotion(name, duration, loop, curves) {
  const curveObjects = curves.map((item) => ({
    Target: "Parameter",
    Id: item.id,
    Segments: linearSegments(item.points),
  }));
  const totalPointCount = curves.reduce((sum, item) => sum + item.points.length, 0);
  const totalSegmentCount = curves.reduce((sum, item) => sum + Math.max(0, item.points.length - 1), 0);
  const motion = {
    Version: 3,
    Meta: {
      Duration: duration,
      Fps: 30,
      Loop: loop,
      AreBeziersRestricted: true,
      CurveCount: curveObjects.length,
      TotalSegmentCount: totalSegmentCount,
      TotalPointCount: totalPointCount,
      UserDataCount: 0,
      TotalUserDataSize: 0,
    },
    Curves: curveObjects,
    UserData: [],
  };
  writeFileSync(join(motionDir, `${name}.motion3.json`), `${JSON.stringify(motion, null, 2)}\n`, "utf8");
}

function writeExpression(fileName, parameters) {
  const expression = {
    Type: "Live2D Expression",
    FadeInTime: 0.25,
    FadeOutTime: 0.35,
    Parameters: parameters,
  };
  writeFileSync(join(expressionDir, fileName), `${JSON.stringify(expression, null, 2)}\n`, "utf8");
}

function promptPack() {
  return `# Mochi Prototype AI Prompt Pack

This file is the project-local prompt set used to reproduce and extend the Live2D source assets.

## Concept prompt

Create an original Live2D-ready desktop pet concept illustration: a small round-faced peach-and-cream cat named Mochi Prototype sitting beside a miniature dark plum keyboard. Front-facing 3/4 symmetry suitable for Live2D rigging, compact body, short legs, large readable dark eyes, independent triangular ears, segmented curled tail, front paws aligned to keyboard keys for typing animation. Clean anime-inspired mascot style, polished vector-like edges, soft warm shading, no resemblance to Pusheen, Neko Atsume, Hello Kitty, Chi's Sweet Home, or any existing character. Simple light neutral background, generous padding, no text, no watermark. Show full body and keyboard clearly.

## Negative prompt

photorealistic, existing mascot, famous character, logo, text, watermark, clothing, human features, complex background, side view, cropped paws, hidden keyboard, fused paws, extra tails, extra ears, unreadable eyes, painterly noise, heavy texture, cast shadow baked into character layers

## Layer generation prompt template

Generate only the Live2D part named "{{part_id}}" for the character Mochi Prototype. Keep it consistent with the project concept: peach-and-cream round desktop cat with dark plum keyboard, clean anime mascot style, simple cel shading, crisp edge line, transparent-ready isolated part. The part must be fully visible with 10 percent padding and no background. Preserve the original anchor intent: {{anchor_note}}. Do not include any other body parts except the overlap padding needed for Live2D deformation.

## Segmentation and cleanup notes

1. Use the concept image as the visual reference, not as direct final art.
2. Use SAM or Photoshop selections only for rough masks. Manually repaint hidden overlaps for ears, paws, tail, and keyboard contact.
3. Keep stable layer names from source/livecat-layer-map.json before importing into Cubism.
4. Export the PSD as RGB, 8bit/channel, sRGB. Flatten each named part internally before Cubism import.
5. In Cubism, create ArtMeshes from the PSD, then bind parameters from model/livecat-parameter-spec.json.
`;
}
