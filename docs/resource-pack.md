# Resource Pack Contract

Desktop LiveCat uses copyable offline resource packs:

```text
pets/<pet-id>/
  manifest.json
  model/
  motions/
  expressions/
  audio/
  preview/
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
- `motions`: named motion paths.
- `privacy.keyboardSync`: expected keyboard sync policy.

## Portability

Copy `pets/` and `data/` to another machine to migrate pets and local state.
Resource packs must not execute code. Behavior must be represented as data that the app validates.
