import type { PetMood } from "./types";

export type Live2DRuntimeProbe = {
  renderer: "cubism-web-sdk" | "fallback-css";
  modelAvailable: boolean;
  runtimeAvailable: boolean;
  reason: string;
  status: "sdk-missing" | "model-missing" | "model-ready" | "fallback-active";
};

export type Live2DParameterFrame = {
  ParamAngleX: number;
  ParamAngleY: number;
  ParamBodyAngleX: number;
  ParamEyeLOpen: number;
  ParamEyeROpen: number;
  ParamBreath: number;
  ParamArmLA: number;
  ParamArmRA: number;
  ParamKeyboardPressL: number;
  ParamKeyboardPressR: number;
  ParamPawLTap: number;
  ParamPawRTap: number;
};

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

export async function probeLive2DRuntime(modelUrl: string | null): Promise<Live2DRuntimeProbe> {
  const runtimeAvailable = Boolean(window.Live2DCubismCore);
  if (!modelUrl) {
    return {
      renderer: "fallback-css",
      modelAvailable: false,
      runtimeAvailable,
      reason: "No Live2D model path is configured for this resource pack.",
      status: "model-missing",
    };
  }

  if (!runtimeAvailable) {
    return {
      renderer: "fallback-css",
      modelAvailable: false,
      runtimeAvailable,
      reason: "Live2D Cubism SDK runtime is not present in public/vendor/live2d.",
      status: "sdk-missing",
    };
  }

  try {
    const response = await fetch(modelUrl, { cache: "no-store" });
    return {
      renderer: response.ok ? "cubism-web-sdk" : "fallback-css",
      modelAvailable: response.ok,
      runtimeAvailable,
      reason: response.ok ? "Live2D model manifest is reachable." : "Live2D model manifest is missing.",
      status: response.ok ? "model-ready" : "model-missing",
    };
  } catch {
    return {
      renderer: "fallback-css",
      modelAvailable: false,
      runtimeAvailable,
      reason: "Live2D model manifest could not be fetched.",
      status: "fallback-active",
    };
  }
}

export function buildLive2DParameters(input: {
  lookX: number;
  lookY: number;
  typingRate: number;
  tapSide: "left" | "right" | null;
  mood: PetMood;
  now: number;
}): Live2DParameterFrame {
  const breath = (Math.sin(input.now / 680) + 1) / 2;
  const typing = input.mood === "typing" ? input.typingRate : 0;
  const alternating = Math.sin(input.now / Math.max(120, 240 - typing * 120));
  const breakStretch = input.mood === "break" ? 0.45 : input.mood === "longBreak" ? 0.7 : 0;
  const dragged = input.mood === "dragged" ? 0.65 : 0;
  const focusEnding = input.mood === "focusEnding" ? 0.3 : 0;
  const happy = input.mood === "happy" ? 0.22 : 0;
  const leftTap = input.tapSide === "left" ? 1 : 0;
  const rightTap = input.tapSide === "right" ? 1 : 0;

  return {
    ParamAngleX: clamp(input.lookX * 22 + dragged * 8 + happy * 4, -30, 30),
    ParamAngleY: clamp(-input.lookY * 16 - breakStretch * 4 + focusEnding * 3 - happy * 8, -30, 30),
    ParamBodyAngleX: clamp(input.lookX * 8 - dragged * 10 + focusEnding * 2, -15, 15),
    ParamEyeLOpen:
      input.mood === "focus" || input.mood === "focusEnding" ? 0.78 - focusEnding * 0.18 : 1,
    ParamEyeROpen:
      input.mood === "focus" || input.mood === "focusEnding" ? 0.78 - focusEnding * 0.18 : 1,
    ParamBreath: breath,
    ParamArmLA: clamp(leftTap || typing * Math.max(0, alternating) + breakStretch, 0, 1),
    ParamArmRA: clamp(rightTap || typing * Math.max(0, -alternating) + breakStretch * 0.35, 0, 1),
    ParamKeyboardPressL: leftTap,
    ParamKeyboardPressR: rightTap,
    ParamPawLTap: leftTap,
    ParamPawRTap: rightTap,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
