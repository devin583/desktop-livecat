# Mochi Prototype AI Prompt Pack

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
