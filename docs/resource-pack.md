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
  source/
  design/
```

## Manifest

Required fields:

- `id`: stable lowercase identifier.
- `name`: display name.
- `version`: pack version.
- `artist`: asset owner or author.
- `live2d.modelJson`: path to the Cubism `.model3.json` file relative to the pack root.

Optional fields:

- `preview`: preview image path.
- `tags`: searchable labels.
- `artistWorkflow.status`: `missing`, `source-ready`, `psd-ready`, `rigging-ready`, or `runtime-ready`.
- `artistWorkflow.brief`: path to artist notes.
- `artistWorkflow.checklist`: path to the completed artist checklist.
- `artistWorkflow.primarySource`: path to the PSD, SVG source, or layer package.
- `motions`: named motion paths.
- `expressions`: named expression paths.
- `live2d.parameterSpec`: optional path to a project-local parameter plan.
- `live2d.sourceLayerMap`: optional path to the source-layer map used before Cubism export.
- `privacy.keyboardSync`: expected keyboard sync policy.

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
