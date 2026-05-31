# Live2D Tooling

## Editor

Live2D Cubism Editor is not installed by this repository. Homebrew does not
currently expose a `live2d` or `cubism` cask on this machine.

Download the Editor from the official page:

- https://www.live2d.com/en/cubism/download/editor/

The macOS Apple Silicon installer is a `.pkg`; Windows uses `.exe`. The Editor
may require GUI installation, license agreement, and activation before exporting
runtime model files.

## Required Manual Step

After installing Cubism Editor:

1. Import `pets/<pet-id>/artist/source.psd`.
2. Bind parameters from `model/livecat-parameter-spec.json`.
3. Export the runtime model to `pets/<pet-id>/model/`.
4. Run:

```bash
STRICT_PET_ASSETS=1 npm run validate:pets
```

## SDK Runtime

The app is prepared to probe a Cubism Web runtime and a `.model3.json` file.
Do not commit proprietary SDK binaries unless their license allows it for this
repository and release mode.
