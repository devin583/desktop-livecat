import type { AppState, PetPack, PomodoroState } from "./types";

export const fallbackPet: PetPack = {
  id: "livecat-default",
  name: "Mochi Prototype",
  version: "0.2.0",
  artist: "Desktop LiveCat",
  description: "Original round-faced keyboard cat prototype.",
  live2d_model: "model/livecat.model3.json",
  preview: "preview/livecat.svg",
  source: "bundled-fallback",
  tags: ["round", "keyboard", "live2d-ready"],
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const initialPomodoro: PomodoroState = {
  mode: "focus",
  focusMinutes: 25,
  breakMinutes: 5,
  remainingSeconds: 25 * 60,
  running: false,
  completedToday: 0,
  day: todayKey(),
};

export const initialState: AppState = {
  selectedPetId: fallbackPet.id,
  scale: 1,
  clickThrough: false,
  alwaysOnTop: true,
  lowPower: false,
  keyboardSyncEnabled: true,
  pomodoro: initialPomodoro,
};

export function secondsToClock(seconds: number) {
  const bounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(bounded / 60);
  const rest = bounded % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function normalizeState(input: Partial<AppState> | null | undefined): AppState {
  const next: AppState = {
    ...initialState,
    ...(input ?? {}),
    pomodoro: {
      ...initialPomodoro,
      ...(input?.pomodoro ?? {}),
    },
  };

  const day = todayKey();
  if (next.pomodoro.day !== day) {
    next.pomodoro.completedToday = 0;
    next.pomodoro.day = day;
  }

  next.scale = Math.min(1.4, Math.max(0.65, Number(next.scale) || 1));
  next.pomodoro.focusMinutes = clampMinutes(next.pomodoro.focusMinutes, 1, 180, 25);
  next.pomodoro.breakMinutes = clampMinutes(next.pomodoro.breakMinutes, 1, 90, 5);
  next.pomodoro.remainingSeconds = Math.max(
    0,
    Math.floor(Number(next.pomodoro.remainingSeconds) || next.pomodoro.focusMinutes * 60),
  );
  return next;
}

export function resetPomodoroDuration(pomodoro: PomodoroState, mode = pomodoro.mode) {
  const minutes = mode === "focus" ? pomodoro.focusMinutes : pomodoro.breakMinutes;
  return Math.max(1, minutes) * 60;
}

function clampMinutes(value: number, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}
