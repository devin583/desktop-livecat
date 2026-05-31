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
  artist_checklist: string | null;
  artist_status: "missing" | "source-ready" | "psd-ready" | "rigging-ready" | "runtime-ready";
  has_artist_checklist: boolean;
  has_live2d_model: boolean;
  has_parameter_spec: boolean;
  has_source_assets: boolean;
  live2d_model: string | null;
  preview: string | null;
  source: string;
  tags: string[];
};

export type PomodoroMode = "focus" | "break" | "longBreak";

export type PomodoroAutoFlow = "manual" | "autoBreak" | "autoNext";

export type PomodoroState = {
  mode: PomodoroMode;
  presetId: "25-5-15" | "50-10-20" | "90-20-30" | "custom";
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  longBreakEnabled: boolean;
  autoFlow: PomodoroAutoFlow;
  remainingSeconds: number;
  running: boolean;
  completedToday: number;
  focusSecondsToday: number;
  breakSecondsToday: number;
  focusSessionsInCycle: number;
  currentTask: string;
  lastCompletedTask: string;
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
  fixedWebView2Runtime: string | null;
  petRoots: string[];
  portableMode: boolean;
};

export type PetMood =
  | "idle"
  | "typing"
  | "focus"
  | "focusEnding"
  | "break"
  | "longBreak"
  | "paused"
  | "dragged";
