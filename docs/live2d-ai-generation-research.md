# Live2D AI Generation Research

Research date: 2026-05-31
Project target: Desktop LiveCat, a portable Live2D desktop cat with keyboard rhythm and Pomodoro states.

## Bottom line

The reliable path is not prompt-to-Live2D-model. That is still a weak fantasy for production-quality Cubism work. The reliable path is:

1. Generate or sketch a controlled concept image.
2. Convert that concept into a strict part list.
3. Produce or repaint separated PSD/PNG layers.
4. Import the PSD into Live2D Cubism Editor.
5. Bind standard and custom parameters.
6. Export `.moc3`, `.model3.json`, textures, physics, expressions, and motions.
7. Load those exported files through the app resource pack contract.

Confidence: high.

## What the sources actually say

- Live2D Cubism Editor imports PSDs and turns PSD layers into ArtMeshes. The editor supports Photoshop-style group hierarchies, but the lowest layer in each group becomes the texture, so line/fill stacks should be merged for import.
  Source: https://docs.live2d.com/en/cubism-editor-manual/psd-import/
  Confidence: high.

- Cubism-compatible PSDs should be PSD format, RGB color mode, and 8bit/channel. Live2D documents Photoshop and CLIP STUDIO PAINT as confirmed applications for PSD creation.
  Source: https://docs.live2d.com/en/cubism-editor-manual/precautions-for-psd-data/
  Confidence: high.

- Material separation is explicitly necessary for Live2D modeling. Live2D describes it as dividing the illustration into parts such as eyelashes, eyeballs, and outlines; more detailed separation can improve model quality.
  Source: https://docs.live2d.com/4.2/en/cubism-editor-manual/divide-the-material/
  Confidence: high.

- Live2D has an official Photoshop material separation plugin workflow with Cut Out and Transparency Fill features. This is useful for part extraction, but it is still a PSD preparation tool, not a full rigging generator.
  Source: https://docs.live2d.com/en/cubism-editor-manual/material-separation-ps-plugin-manual/
  Confidence: high.

- Cubism parameter IDs should stay close to the standard list where possible. The standard list includes `ParamAngleX`, `ParamAngleY`, `ParamAngleZ`, `ParamEyeLOpen`, `ParamEyeROpen`, `ParamEyeBallX`, `ParamEyeBallY`, `ParamMouthOpenY`, `ParamMouthForm`, and related IDs.
  Source: https://docs.live2d.com/en/cubism-editor-manual/standard-parameter-list/
  Confidence: high.

- In the Web SDK flow, `.model3.json` tracks file references for the model; vertex/object movement is recorded in `.moc3`, while physics and user data are separate files.
  Source: https://docs.live2d.com/en/cubism-sdk-manual/model-web/
  Confidence: high.

- ControlNet is the main research-backed way people add spatial controls to text-to-image generation. It is useful when you need a generated cat to preserve a fixed pose, silhouette, edge map, or segmentation layout.
  Source: https://arxiv.org/abs/2302.05543
  Confidence: high.

- Meta's Segment Anything Model can produce masks from point/box prompts and can generate masks for many objects. It is useful for rough cutouts, but it will not know Live2D deformation overlap requirements.
  Sources: https://segment-anything.metademolab.com/ and https://github.com/facebookresearch/segment-anything
  Confidence: high for segmentation capability, medium for Live2D usefulness.

- LayerDiffuse-style transparent layer generation can help produce transparent assets from diffusion models, but it is best treated as experimental for Live2D production because clean deformation overlap and stable layer naming still need human or deterministic cleanup.
  Source: https://arxiv.org/abs/2402.17113
  Confidence: medium.

## Common AI generation schemes

### 1. Concept-first, manual/assisted separation

Workflow: image model creates a polished character concept; artist or Photoshop/CSP separates parts; Cubism rigger binds parameters.

Pros:
- Highest visual consistency.
- Lowest risk of malformed Cubism assets.
- Best fit for a small mascot like this project.

Cons:
- Not fully automatic.
- Needs manual repainting of hidden overlaps.

Use here: recommended.
Confidence: high.

### 2. Stable Diffusion or other diffusion model with ControlNet

Workflow: define a pose/silhouette guide, generate many controlled candidates, pick one, then use masks and inpainting for part cleanup.

Pros:
- Good for iterating style while keeping the cat and keyboard in a stable pose.
- Can enforce front/three-quarter pose better than pure prompt generation.

Cons:
- Layer consistency is not guaranteed.
- Repeated generation can alter eyes, paws, ears, and keyboard geometry.

Use here: good for variants, not for direct final assets.
Confidence: medium-high.

### 3. SAM/selection-driven cutout plus inpainting

Workflow: segment ears, eyes, paws, tail, body, keyboard; export masks; manually repaint missing overlap; assemble PSD.

Pros:
- Fast first pass for rough part boundaries.
- Good for concept-to-layer conversion.

Cons:
- Masks follow visible pixels only. Live2D needs hidden pixels behind moving parts.
- Thin lines, whiskers, eyelids, and keycaps need manual correction.

Use here: acceptable as acceleration after the layer map is fixed.
Confidence: medium.

### 4. Official Live2D material separation Photoshop plugin

Workflow: use Live2D's Photoshop plugin to cut out parts and fill transparent gaps, then import PSD into Cubism.

Pros:
- Directly aligned with Cubism's PSD workflow.
- Better than generic AI masking for hidden-area fill.

Cons:
- Requires Photoshop and the plugin.
- Still does not rig, mesh, or animate automatically.

Use here: recommended if Photoshop is available.
Confidence: high.

### 5. Prompt-to-layer generation

Workflow: ask an image model to generate each named part separately on transparent/chroma background.

Pros:
- Highly automatable.
- Works for simple props and repeated keycaps.

Cons:
- Part-to-part style drift is severe.
- Anchors and overlaps can become inconsistent.
- Bad for eyes, mouth, paws, and fur seams unless constrained with a reference image and strict masks.

Use here: only for variants of simple parts, not the base model.
Confidence: medium.

### 6. One-click AI Live2D model generation

Workflow: prompt in, `.moc3` out.

Current judgment: do not build the project around this. The public, dependable workflow still requires Cubism import, parameter binding, deformation, motion tuning, and export. Any tool claiming full automation should be treated as a prototype unless it can produce inspectable `.cmo3`/`.moc3` output with stable parameters and clean deformations.

Use here: rejected for the base plan.
Confidence: high.

## Recommended project pipeline

For Desktop LiveCat, the best path is:

1. Keep `pets/livecat-default/preview/livecat-ai-concept.png` as the visual reference.
2. Keep `pets/livecat-default/source/livecat-layers.svg` as deterministic editable source art.
3. Use `pets/livecat-default/source/livecat-layer-map.json` as the authoritative layer order, bbox, anchor, and rigging notes.
4. Assemble or repaint those layers into a PSD using Photoshop or CLIP STUDIO PAINT.
5. Import PSD into Cubism Editor.
6. Create the parameters in `pets/livecat-default/model/livecat-parameter-spec.json`.
7. Bind the motions in `pets/livecat-default/motions/*.motion3.json`.
8. Export the real runtime model into `pets/livecat-default/model/livecat.model3.json`, `livecat.moc3`, `textures/`, `physics3.json`, and `cdi3.json`.

This keeps AI in the part of the pipeline where it is strong: ideation, style exploration, rough separation, and inpainting. It keeps Cubism in the part where it is non-negotiable: mesh deformation, parameter binding, motion fidelity, and runtime export.

Confidence: high.

## Generated project assets

- AI concept image: `pets/livecat-default/preview/livecat-ai-concept.png`
- Combined editable source: `pets/livecat-default/source/livecat-layers.svg`
- Per-part source layers: `pets/livecat-default/source/layers/*.svg`
- Layer map: `pets/livecat-default/source/livecat-layer-map.json`
- Parts table: `pets/livecat-default/source/livecat-parts.csv`
- Parameter spec: `pets/livecat-default/model/livecat-parameter-spec.json`
- Motion specs: `pets/livecat-default/motions/*.motion3.json`
- Expression specs: `pets/livecat-default/expressions/*.exp3.json`
- Prompt pack: `pets/livecat-default/design/ai-prompts.md`
- Asset generator: `scripts/generate-livecat-assets.mjs`
- Pack validator: `scripts/validate-resource-packs.mjs`

## Quality bar for the generated Live2D model

- Paw strikes must visibly contact the keyboard home keys.
- Tail must have at least base, middle, and tip deformation with delayed motion.
- Ears must rotate independently and should not mirror perfectly all the time.
- Blink must close upper lids, not scale the whole eye flat.
- Focus mode should be lower motion, not just idle slowed down.
- Break mode should visibly stretch/yawn/wave.
- Drag and fall recovery need squash, tail lag, and return-to-idle cleanup.
- Final `.model3.json` must reference exported textures and `.moc3`; do not fake it with a JSON placeholder.
