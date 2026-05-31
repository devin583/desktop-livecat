import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type {
  PetAnimationState,
  PetPack,
  PetSpritesheetFrame,
  PetSpritesheetStateSpec,
} from "./types";

type SpritesheetPetProps = {
  animationState: PetAnimationState;
  className?: string;
  lowPower: boolean;
  pet: PetPack;
};

const defaultFrameDurationMs = 140;

export function SpritesheetPet({ animationState, className, lowPower, pet }: SpritesheetPetProps) {
  const sprite = pet.spritesheet;
  const [frame, setFrame] = useState<PetSpritesheetFrame>(() =>
    firstFrame(resolveState(sprite?.states.idle)),
  );
  const stateSpec = useMemo(
    () => resolveAnimationState(sprite, animationState),
    [animationState, sprite],
  );

  useEffect(() => {
    const frames = stateSpec.frames.length ? stateSpec.frames : [{ row: 0, column: 0 }];
    let cancelled = false;
    let timeout = 0;
    let index = 0;

    setFrame(frames[0]);
    if (frames.length <= 1 || lowPower) return undefined;

    const tick = () => {
      timeout = window.setTimeout(() => {
        if (cancelled) return;
        const nextIndex = index + 1;
        if (nextIndex >= frames.length) {
          index = stateSpec.loopStartIndex ?? 0;
        } else {
          index = nextIndex;
        }
        setFrame(frames[index]);
        tick();
      }, frames[index].durationMs ?? defaultFrameDurationMs);
    };

    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [lowPower, stateSpec]);

  if (!sprite) return null;

  const imageUrl = resolvePackAssetUrl(pet, sprite.image);
  const columns = Math.max(1, sprite.columns);
  const rows = Math.max(1, sprite.rows);
  const column = clampFrameIndex(frame.column, columns);
  const row = clampFrameIndex(frame.row, rows);
  const x = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;

  return (
    <div
      className={["spritesheet-pet", className].filter(Boolean).join(" ")}
      aria-label={pet.name}
      role="img"
      style={
        {
          "--sprite-image": `url("${imageUrl}")`,
          "--sprite-background-size": `${columns * 100}% ${rows * 100}%`,
          "--sprite-position": `${x}% ${y}%`,
          "--sprite-aspect": `${sprite.frameWidth} / ${sprite.frameHeight}`,
        } as CSSProperties
      }
    />
  );
}

function resolveAnimationState(
  sprite: PetPack["spritesheet"],
  state: PetAnimationState,
): PetSpritesheetStateSpec {
  const states = sprite?.states ?? {};
  return resolveState(states[state]) ?? resolveState(states[states[state]?.fallback ?? "idle"]) ?? defaultIdle();
}

function resolveState(spec: PetSpritesheetStateSpec | undefined | null) {
  if (!spec || !Array.isArray(spec.frames)) return null;
  return {
    frames: spec.frames
      .filter((frame) => Number.isFinite(frame.row) && Number.isFinite(frame.column))
      .map((frame) => ({
        row: Math.max(0, Math.floor(frame.row)),
        column: Math.max(0, Math.floor(frame.column)),
        durationMs: frame.durationMs,
      })),
    loopStartIndex:
      spec.loopStartIndex === null || spec.loopStartIndex === undefined
        ? 0
        : Math.max(0, Math.floor(spec.loopStartIndex)),
    fallback: spec.fallback,
  };
}

function defaultIdle(): PetSpritesheetStateSpec {
  return {
    frames: [
      { row: 0, column: 0, durationMs: 260 },
      { row: 0, column: 1, durationMs: 120 },
      { row: 0, column: 2, durationMs: 120 },
      { row: 0, column: 3, durationMs: 160 },
      { row: 0, column: 4, durationMs: 160 },
      { row: 0, column: 5, durationMs: 360 },
    ],
    loopStartIndex: 0,
  };
}

function firstFrame(spec: PetSpritesheetStateSpec | null) {
  return spec?.frames[0] ?? { row: 0, column: 0 };
}

function clampFrameIndex(value: number, max: number) {
  return Math.min(max - 1, Math.max(0, Math.floor(value)));
}

function resolvePackAssetUrl(pet: PetPack, path: string) {
  if (pet.source.includes("/") || pet.source.includes("\\")) {
    const sourceRoot = pet.source.replace(/[\\/]+$/, "");
    return convertFileSrc(`${sourceRoot}/${path}`);
  }
  return `/pets/${pet.id}/${path}`;
}
