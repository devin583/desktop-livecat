export type PetMotionName =
  | "idle"
  | "blink"
  | "typing_sync"
  | "pomodoro_focus"
  | "pomodoro_break"
  | "dragged"
  | "fall_recover"
  | "sleep";

export type PetPack = {
  id: string;
  name: string;
  version: string;
  artist: string;
  description: string;
  live2d_model: string | null;
  preview: string | null;
  source: string;
  tags: string[];
};

export type PomodoroState = {
  mode: "focus" | "break";
  focusMinutes: number;
  breakMinutes: number;
  remainingSeconds: number;
  running: boolean;
  completedToday: number;
  day: string;
};

export type AppState = {
  selectedPetId: string;
  scale: number;
  clickThrough: boolean;
  alwaysOnTop: boolean;
  lowPower: boolean;
  keyboardSyncEnabled: boolean;
  pomodoro: PomodoroState;
};

export type KeyboardStatus = {
  supported: boolean;
  backend: string;
  message: string;
};

export type TypingPulse = {
  at_ms: number;
  source: string;
};

export type RuntimeInfo = {
  appVersion: string;
  dataDir: string;
  petRoots: string[];
  portableMode: boolean;
};

export type PetMood = "idle" | "typing" | "focus" | "break" | "dragged";
