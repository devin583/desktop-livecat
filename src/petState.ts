import type { AppState, PetPack, PomodoroMode, PomodoroState } from "./types";

export const fallbackPet: PetPack = {
  id: "livecat-default",
  name: "Mochi Prototype",
  version: "0.2.0",
  artist: "Desktop LiveCat",
  description: "Original round-faced keyboard cat prototype.",
  artist_checklist: "artist/artist-checklist.md",
  artist_status: "source-ready",
  has_artist_checklist: true,
  has_live2d_model: false,
  has_parameter_spec: true,
  has_source_assets: true,
  live2d_model: "model/livecat.model3.json",
  preview: "preview/livecat.svg",
  source: "bundled-fallback",
  tags: ["round", "keyboard", "live2d-ready"],
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const initialPomodoro: PomodoroState = {
  mode: "focus",
  presetId: "25-5-15",
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  longBreakEnabled: true,
  autoFlow: "manual",
  remainingSeconds: 25 * 60,
  running: false,
  completedToday: 0,
  focusSecondsToday: 0,
  breakSecondsToday: 0,
  focusSessionsInCycle: 0,
  currentTask: "",
  lastCompletedTask: "",
  day: todayKey(),
};

export const initialState: AppState = {
  selectedPetId: fallbackPet.id,
  language: "zh-CN",
  scale: 0.92,
  controlsOpen: false,
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
    next.pomodoro.focusSecondsToday = 0;
    next.pomodoro.breakSecondsToday = 0;
    next.pomodoro.focusSessionsInCycle = 0;
    next.pomodoro.day = day;
  }

  if (!["focus", "break", "longBreak"].includes(next.pomodoro.mode)) {
    next.pomodoro.mode = "focus";
  }
  if (!["25-5-15", "50-10-20", "90-20-30", "custom"].includes(next.pomodoro.presetId)) {
    next.pomodoro.presetId = "custom";
  }
  if (!["manual", "autoBreak", "autoNext"].includes(next.pomodoro.autoFlow)) {
    next.pomodoro.autoFlow = "manual";
  }
  if (!["zh-CN", "en-US"].includes(next.language)) {
    next.language = "zh-CN";
  }

  next.scale = Math.min(1.4, Math.max(0.65, Number(next.scale) || 1));
  next.controlsOpen = Boolean(next.controlsOpen);
  next.pomodoro.focusMinutes = clampMinutes(next.pomodoro.focusMinutes, 1, 180, 25);
  next.pomodoro.breakMinutes = clampMinutes(next.pomodoro.breakMinutes, 1, 90, 5);
  next.pomodoro.longBreakMinutes = clampMinutes(next.pomodoro.longBreakMinutes, 1, 120, 15);
  next.pomodoro.longBreakEvery = clampMinutes(next.pomodoro.longBreakEvery, 2, 12, 4);
  next.pomodoro.focusSecondsToday = clampSeconds(next.pomodoro.focusSecondsToday);
  next.pomodoro.breakSecondsToday = clampSeconds(next.pomodoro.breakSecondsToday);
  next.pomodoro.focusSessionsInCycle = clampMinutes(next.pomodoro.focusSessionsInCycle, 0, 99, 0);
  next.pomodoro.currentTask = String(next.pomodoro.currentTask ?? "").slice(0, 80);
  next.pomodoro.lastCompletedTask = String(next.pomodoro.lastCompletedTask ?? "").slice(0, 80);
  next.pomodoro.remainingSeconds = Math.max(
    0,
    Math.floor(Number(next.pomodoro.remainingSeconds) || next.pomodoro.focusMinutes * 60),
  );
  return next;
}

export function resetPomodoroDuration(pomodoro: PomodoroState, mode: PomodoroMode = pomodoro.mode) {
  const minutes =
    mode === "focus"
      ? pomodoro.focusMinutes
      : mode === "longBreak"
        ? pomodoro.longBreakMinutes
        : pomodoro.breakMinutes;
  return Math.max(1, minutes) * 60;
}

export function nextPomodoroMode(pomodoro: PomodoroState): PomodoroMode {
  if (pomodoro.mode !== "focus") return "focus";
  const nextCycle = pomodoro.focusSessionsInCycle + 1;
  if (pomodoro.longBreakEnabled && nextCycle >= pomodoro.longBreakEvery) {
    return "longBreak";
  }
  return "break";
}

export function shouldAutoRunNext(pomodoro: PomodoroState, nextMode: PomodoroMode) {
  if (pomodoro.autoFlow === "autoNext") return true;
  return pomodoro.autoFlow === "autoBreak" && nextMode !== "focus";
}

function clampMinutes(value: number, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function clampSeconds(value: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(24 * 60 * 60, Math.max(0, Math.floor(numeric)));
}
