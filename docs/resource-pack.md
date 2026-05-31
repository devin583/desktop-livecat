# Resource Pack Contract

Desktop LiveCat uses copyable offline resource packs:

```text
pets/<pet-id>/
  manifest.json
  artist/
  model/
  motions/
  expressions/
  audio/
  preview/
  spritesheet/
  source/
  design/
```

## Manifest

Required fields:

- `id`: stable lowercase identifier.
- `name`: display name.
- `version`: pack version.
- `artist`: asset owner or author.
- `renderMode`: `live2d`, `spritesheet`, or `hybrid`.

For `live2d` and `hybrid` packs:

- `live2d.modelJson`: path to the Cubism `.model3.json` file relative to the pack root.

For `spritesheet` and `hybrid` packs:

- `spritesheet.image`: path to a PNG/WebP/JPG/SVG spritesheet.
- `spritesheet.columns`: default `8`.
- `spritesheet.rows`: default `9`.
- `spritesheet.frameWidth`: default `192`.
- `spritesheet.frameHeight`: default `208`.
- `spritesheet.states`: state-to-frame mapping. `idle` is the required safe fallback.

Optional fields:

- `preview`: preview image path.
- `tags`: searchable labels.
- `persona.name`: display identity used by custom-pet creation.
- `persona.species`: species or object type.
- `persona.style`: art direction notes.
- `persona.personality`: behavior notes.
- `persona.palette`: color tokens for the artist or draft generator.
- `artistWorkflow.status`: `missing`, `source-ready`, `psd-ready`, `rigging-ready`, or `runtime-ready`.
- `artistWorkflow.brief`: path to artist notes.
- `artistWorkflow.checklist`: path to the completed artist checklist.
- `artistWorkflow.primarySource`: path to the PSD, SVG source, or layer package.
- `motions`: named motion paths.
- `expressions`: named expression paths.
- `live2d.parameterSpec`: optional path to a project-local parameter plan.
- `live2d.sourceLayerMap`: optional path to the source-layer map used before Cubism export.
- `privacy.keyboardSync`: expected keyboard sync policy.

## Spritesheet runtime

The default custom-pet template is an 8 x 9 grid. Rows map to these states:

| Row | State | Use |
| --- | --- | --- |
| 0 | `idle` | breathing, blink, natural loop |
| 1 | `tap_left` | left paw key strike |
| 2 | `tap_right` | right paw key strike |
| 3 | `typing` | sustained alternating typing |
| 4 | `focus` | Pomodoro focus loop |
| 5 | `break` | Pomodoro break loop |
| 6 | `happy` | completion or positive command |
| 7 | `sleepy` | low-energy idle |
| 8 | `failed` / `dragged` | failure, surprise, drag recovery |

The renderer uses CSS `background-position` frame playback, so the image must
keep each pose aligned inside its cell. Missing non-idle states are allowed;
runtime falls back to `idle`.

Single image imports are treated as inert spritesheet packs. The app creates a
manifest and artist handoff around the image, then the artist can replace it
with a full 8 x 9 sheet later.

## Live2D source assets

`artist/` contains illustrator-owned handoff files: PSD, preview, checklist, and
brief. The illustrator does not need AI tools or code access.

`source/` and `design/` are pre-Cubism production assets. They may contain SVG
source layers, layer maps, CSV review tables, prompt packs, and concept images.
Runtime code must treat these as inert data. The actual Live2D runtime model is
still exported from Cubism into `model/` as `.model3.json`, `.moc3`, textures,
and optional physics/expression/motion files.

Run the resource validator before packaging:

```bash
npm run validate:pets
```

For checking illustrator handoff completeness without requiring a Cubism export:

```bash
ARTIST_ASSET_CHECK=1 npm run validate:pets
```

For release-grade checks that require the Cubism export to exist:

```bash
STRICT_PET_ASSETS=1 npm run validate:pets
```

## Portability

Copy `pets/` and `data/` to another machine to migrate pets and local state.
Resource packs must not execute code. Behavior must be represented as data that the app validates.

At runtime the app exposes pack files to the WebView through Tauri's local asset URL conversion, so packs can live next to the executable or inside bundled app resources without needing a local HTTP server.
