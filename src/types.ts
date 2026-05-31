export type PetMotionName =
  | "idle"
  | "blink"
  | "typing_sync"
  | "pomodoro_focus"
  | "pomodoro_break"
  | "dragged"
  | "fall_recover"
  | "sleep";

export type PetRenderMode = "live2d" | "spritesheet" | "hybrid";

export type PetAnimationState =
  | "idle"
  | "typing"
  | "tap_left"
  | "tap_right"
  | "focus"
  | "break"
  | "happy"
  | "sleepy"
  | "failed"
  | "dragged";

export type PetActivityState = PetAnimationState;

export type PetSpritesheetFrame = {
  row: number;
  column: number;
  durationMs?: number;
};

export type PetSpritesheetStateSpec = {
  frames: PetSpritesheetFrame[];
  loopStartIndex?: number | null;
  fallback?: PetAnimationState;
};

export type PetSpritesheetSpec = {
  image: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  states: Partial<Record<PetAnimationState, PetSpritesheetStateSpec>>;
  statesFile?: string;
};

export type PetPersonaSpec = {
  name: string;
  species: string;
  style: string;
  personality: string;
  palette: string[];
  accessories?: string[];
};

export type PetInstallSource = {
  type: "directory" | "zip" | "spritesheet-image";
  path: string;
  petId?: string;
  name?: string;
  description?: string;
  species?: string;
};

export type PetPack = {
  id: string;
  name: string;
  version: string;
  artist: string;
  description: string;
  render_mode: PetRenderMode;
  artist_checklist: string | null;
  artist_status: "missing" | "source-ready" | "psd-ready" | "rigging-ready" | "runtime-ready";
  has_artist_checklist: boolean;
  has_live2d_model: boolean;
  has_parameter_spec: boolean;
  has_source_assets: boolean;
  has_spritesheet: boolean;
  live2d_model: string | null;
  persona: PetPersonaSpec | null;
  preview: string | null;
  source: string;
  spritesheet: PetSpritesheetSpec | null;
  tags: string[];
};

export type PomodoroMode = "focus" | "break" | "longBreak";

export type PomodoroAutoFlow = "manual" | "autoBreak" | "autoNext";

export type AppLanguage = "zh-CN" | "en-US";

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
  language: AppLanguage;
  scale: number;
  controlsOpen: boolean;
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
