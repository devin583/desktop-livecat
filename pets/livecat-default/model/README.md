# Live2D model slot

Place the official Cubism model files for this pet here:

- `livecat.model3.json`
- `livecat.moc3`
- `textures/`
- `physics3.json`
- `cdi3.json`

The repository intentionally ships without Cubism SDK binaries or third-party model files.
Use only original or explicitly licensed assets.

The pre-Cubism source kit for this model lives next to this directory:

- `../source/livecat-layer-map.json`
- `../source/livecat-layers.svg`
- `../source/layers/*.svg`
- `livecat-parameter-spec.json`
- `../motions/*.motion3.json`
- `../expressions/*.exp3.json`

Do not create a fake `livecat.model3.json`. Keep that file absent until Cubism
exports a real `.moc3` and texture set.
