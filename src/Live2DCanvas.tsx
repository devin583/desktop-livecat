import { useEffect, useMemo, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  buildLive2DParameters,
  probeLive2DRuntime,
  type Live2DParameterFrame,
  type Live2DRuntimeProbe,
} from "./live2dRuntime";
import type { PetMood, PetPack } from "./types";

type Live2DCanvasProps = {
  look: { x: number; y: number };
  mood: PetMood;
  onProbe: (probe: Live2DRuntimeProbe) => void;
  pet: PetPack;
  tapSide: "left" | "right" | null;
  typingRate: number;
};

export function Live2DCanvas({ look, mood, onProbe, pet, tapSide, typingRate }: Live2DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<Live2DParameterFrame | null>(null);
  const modelUrl = useMemo(() => buildModelUrl(pet), [pet]);

  useEffect(() => {
    let cancelled = false;
    void probeLive2DRuntime(modelUrl).then((probe) => {
      if (!cancelled) onProbe(probe);
    });
    return () => {
      cancelled = true;
    };
  }, [modelUrl, onProbe]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      frameRef.current = buildLive2DParameters({
        lookX: look.x,
        lookY: look.y,
        mood,
        now: performance.now(),
        tapSide,
        typingRate,
      });
      drawDiagnosticFrame(canvasRef.current, frameRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [look.x, look.y, mood, tapSide, typingRate]);

  return (
    <canvas
      ref={canvasRef}
      className="live2d-canvas"
      width={640}
      height={720}
      aria-hidden="true"
      data-model-url={modelUrl ?? ""}
    />
  );
}

function buildModelUrl(pet: PetPack) {
  if (!pet.live2d_model) return null;
  if (pet.source.includes("/") || pet.source.includes("\\")) {
    const sourceRoot = pet.source.replace(/[\\/]+$/, "");
    return convertFileSrc(`${sourceRoot}/${pet.live2d_model}`);
  }
  return `/pets/${pet.id}/${pet.live2d_model}`;
}

function drawDiagnosticFrame(canvas: HTMLCanvasElement | null, frame: Live2DParameterFrame | null) {
  if (!canvas || !frame) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 0.01;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, Math.max(1, frame.ParamBreath * canvas.width), 1);
  context.globalAlpha = 1;
}
