export type Live2DRuntimeProbe = {
  renderer: "cubism-web-sdk" | "fallback-css";
  modelAvailable: boolean;
  runtimeAvailable: boolean;
  reason: string;
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
    };
  }

  if (!runtimeAvailable) {
    return {
      renderer: "fallback-css",
      modelAvailable: false,
      runtimeAvailable,
      reason: "Live2D Cubism SDK runtime is not present in public/vendor/live2d.",
    };
  }

  try {
    const response = await fetch(modelUrl, { cache: "no-store" });
    return {
      renderer: response.ok ? "cubism-web-sdk" : "fallback-css",
      modelAvailable: response.ok,
      runtimeAvailable,
      reason: response.ok ? "Live2D model manifest is reachable." : "Live2D model manifest is missing.",
    };
  } catch {
    return {
      renderer: "fallback-css",
      modelAvailable: false,
      runtimeAvailable,
      reason: "Live2D model manifest could not be fetched.",
    };
  }
}
