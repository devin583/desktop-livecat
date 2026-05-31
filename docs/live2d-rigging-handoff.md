# Live2D Rigging Handoff

This guide connects illustrator assets to Desktop LiveCat runtime assets.

## Input

- `artist/source.psd`
- `artist/asset-brief.md`
- `artist/artist-checklist.md`
- `model/livecat-parameter-spec.json`
- `motions/*.motion3.json`
- `expressions/*.exp3.json`

## Cubism Import

- Use Live2D Cubism Editor 5.x.
- Import PSD as RGB, 8 bit/channel, sRGB.
- Preserve layer names during re-import.
- Mesh major deforming parts manually: head, body, front paws, tail, eyelids,
  ears, muzzle.
- Keep keyboard body mostly rigid; individual keys only need small press/bounce
  deformation.

## Required Parameters

Bind the standard Cubism parameters:

- `ParamAngleX`, `ParamAngleY`, `ParamAngleZ`
- `ParamBodyAngleX`, `ParamBodyAngleY`, `ParamBodyAngleZ`
- `ParamBreath`
- `ParamEyeLOpen`, `ParamEyeROpen`
- `ParamEyeBallX`, `ParamEyeBallY`
- `ParamMouthOpenY`, `ParamMouthForm`

Bind project-specific parameters from `model/livecat-parameter-spec.json`:

- `ParamPawLTap`, `ParamPawRTap`
- `ParamKeyboardPressL`, `ParamKeyboardPressR`, `ParamKeyboardBounce`
- `ParamEarLAngle`, `ParamEarRAngle`
- `ParamTailBaseAngle`, `ParamTailMidAngle`, `ParamTailTipAngle`
- `ParamSquash`, `ParamStretch`, `ParamCheek`

## Export

Export runtime files into:

```text
pets/<pet-id>/model/
  livecat.model3.json
  livecat.moc3
  textures/
  physics3.json
  cdi3.json
```

Do not hand-create `.moc3` or `.model3.json`. They must come from Cubism.

## Runtime Check

After export:

```bash
STRICT_PET_ASSETS=1 npm run validate:pets
npm run check
```

The app should switch from `Binding` or `model-missing` to a Live2D-ready state
once the model manifest is present and the Cubism Web runtime is available.
