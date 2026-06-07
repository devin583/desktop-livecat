import type {
  AppState,
  FocusCompletionReview,
  FocusPanelTab,
  FocusRecord,
  FocusTimerMode,
  PetCareState,
  PetChatMessage,
  PetDiaryEntry,
  PetMemoryEvent,
  PetMemoryState,
  PetPack,
  PomodoroMode,
  PomodoroState,
  UpdateInfo,
} from "./types";

export const fallbackPet: PetPack = {
  id: "livecat-default",
  name: "Mochi Prototype",
  version: "0.2.0",
  artist: "Desktop LiveCat",
  description: "Original round-faced keyboard cat prototype.",
  render_mode: "live2d",
  artist_checklist: "artist/artist-checklist.md",
  artist_status: "source-ready",
  has_artist_checklist: true,
  has_live2d_model: false,
  has_parameter_spec: true,
  has_source_assets: true,
  has_spritesheet: false,
  live2d_model: "model/livecat.model3.json",
  persona: null,
  preview: "preview/livecat.svg",
  source: "bundled-fallback",
  spritesheet: null,
  tags: ["round", "keyboard", "live2d-ready"],
};

const maxDaySeconds = 24 * 60 * 60;
const maxRecords = 500;
const maxPetMemoryEvents = 160;
const maxPetChatMessages = 80;
const maxPetDiaryEntries = 45;
const deprecatedPetReplacement: Record<string, string> = {
  "gray-british-keyboard": "gray-british-keyboard-v2",
  "orange-tabby-keyboard": "orange-tabby-keyboard-v2",
};

export const todayKey = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

export const initialPomodoro: PomodoroState = {
  focusMode: "pomo",
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
  activeStartedAt: null,
  activePlannedSeconds: 25 * 60,
  pauseCount: 0,
  extraSeconds: 0,
  estimatedPomos: 0,
  estimatedMinutes: 0,
  completedToday: 0,
  focusSecondsToday: 0,
  breakSecondsToday: 0,
  focusSessionsInCycle: 0,
  currentTask: "",
  lastCompletedTask: "",
  records: [],
  completionReview: null,
  panelTab: "timer",
  day: todayKey(),
};

export const initialUpdateInfo: UpdateInfo = {
  status: "idle",
  currentVersion: "",
  latestVersion: null,
  releaseUrl: null,
  standardAssetUrl: null,
  fullOfflineAssetUrl: null,
  publishedAt: null,
  lastCheckedAt: null,
  ignoredVersion: null,
  error: null,
};

export const initialPetCare: PetCareState = {
  happiness: 68,
  fullness: 62,
  cleanliness: 74,
  energy: 70,
  bond: 0,
  level: 1,
  experience: 0,
  coins: 0,
  streak: 0,
  lastFocusDay: null,
  lastInteractionAt: null,
};

export const initialPetMemory: PetMemoryState = {
  events: [],
  chat: [],
  diary: [],
  lastDiaryDay: null,
};

export const initialState: AppState = {
  selectedPetId: "orange-tabby-keyboard-v2",
  language: "zh-CN",
  controlPanelTab: "interact",
  petCare: initialPetCare,
  petMemory: initialPetMemory,
  scale: 0.92,
  controlsOpen: false,
  clickThrough: false,
  alwaysOnTop: true,
  lowPower: false,
  keyboardSyncEnabled: true,
  update: initialUpdateInfo,
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
    update: {
      ...initialUpdateInfo,
      ...(input?.update ?? {}),
    },
    petCare: {
      ...initialPetCare,
      ...(input?.petCare ?? {}),
    },
    petMemory: {
      ...initialPetMemory,
      ...(input?.petMemory ?? {}),
    },
  };

  next.selectedPetId = deprecatedPetReplacement[next.selectedPetId] ?? next.selectedPetId;

  if (
    next.selectedPetId === "pixel-mochi" ||
    next.selectedPetId === "livecat-default" ||
    next.selectedPetId.startsWith("_")
  ) {
    next.selectedPetId = initialState.selectedPetId;
  }

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
  if (!["pomo", "stopwatch"].includes(next.pomodoro.focusMode)) {
    next.pomodoro.focusMode = "pomo";
  }
  if (!["25-5-15", "50-10-20", "90-20-30", "custom"].includes(next.pomodoro.presetId)) {
    next.pomodoro.presetId = "custom";
  }
  if (!["manual", "autoBreak", "autoNext"].includes(next.pomodoro.autoFlow)) {
    next.pomodoro.autoFlow = "manual";
  }
  next.pomodoro.panelTab = normalizePanelTab(next.pomodoro.panelTab) ?? "timer";
  if (!["zh-CN", "en-US"].includes(next.language)) {
    next.language = "zh-CN";
  }
  if (!["pet", "interact", "chat", "focus", "settings"].includes(next.controlPanelTab)) {
    next.controlPanelTab = "interact";
  }

  next.petCare.happiness = clampMinutes(next.petCare.happiness, 0, 100, initialPetCare.happiness);
  next.petCare.fullness = clampMinutes(next.petCare.fullness, 0, 100, initialPetCare.fullness);
  next.petCare.cleanliness = clampMinutes(
    next.petCare.cleanliness,
    0,
    100,
    initialPetCare.cleanliness,
  );
  next.petCare.energy = clampMinutes(next.petCare.energy, 0, 100, initialPetCare.energy);
  next.petCare.bond = clampMinutes(next.petCare.bond, 0, 9999, initialPetCare.bond);
  next.petCare.level = clampMinutes(next.petCare.level, 1, 999, initialPetCare.level);
  next.petCare.experience = clampMinutes(
    next.petCare.experience,
    0,
    999_999,
    initialPetCare.experience,
  );
  next.petCare.coins = clampMinutes(next.petCare.coins, 0, 999_999, initialPetCare.coins);
  next.petCare.streak = clampMinutes(next.petCare.streak, 0, 9999, initialPetCare.streak);
  next.petCare.lastFocusDay = normalizeDayString(next.petCare.lastFocusDay);
  next.petCare.lastInteractionAt = normalizeDateString(next.petCare.lastInteractionAt);
  next.petMemory.events = normalizePetMemoryEvents(next.petMemory.events);
  next.petMemory.chat = normalizePetChatMessages(next.petMemory.chat);
  next.petMemory.diary = normalizePetDiary(next.petMemory.diary);
  next.petMemory.lastDiaryDay = normalizeDayString(next.petMemory.lastDiaryDay);
  next.scale = Math.min(1.25, Math.max(0.65, Number(next.scale) || 1));
  next.controlsOpen = Boolean(next.controlsOpen);
  next.pomodoro.focusMinutes = clampMinutes(next.pomodoro.focusMinutes, 1, 180, 25);
  next.pomodoro.breakMinutes = clampMinutes(next.pomodoro.breakMinutes, 1, 90, 5);
  next.pomodoro.longBreakMinutes = clampMinutes(next.pomodoro.longBreakMinutes, 1, 120, 15);
  next.pomodoro.longBreakEvery = clampMinutes(next.pomodoro.longBreakEvery, 2, 12, 4);
  next.pomodoro.completedToday = clampMinutes(next.pomodoro.completedToday, 0, 999, 0);
  next.pomodoro.focusSecondsToday = clampSeconds(next.pomodoro.focusSecondsToday);
  next.pomodoro.breakSecondsToday = clampSeconds(next.pomodoro.breakSecondsToday);
  next.pomodoro.focusSessionsInCycle = clampMinutes(next.pomodoro.focusSessionsInCycle, 0, 99, 0);
  next.pomodoro.pauseCount = clampMinutes(next.pomodoro.pauseCount, 0, 999, 0);
  next.pomodoro.extraSeconds = clampSeconds(next.pomodoro.extraSeconds);
  next.pomodoro.estimatedPomos = clampMinutes(next.pomodoro.estimatedPomos, 0, 99, 0);
  next.pomodoro.estimatedMinutes = clampMinutes(next.pomodoro.estimatedMinutes, 0, 10_000, 0);
  next.pomodoro.currentTask = String(next.pomodoro.currentTask ?? "").slice(0, 80);
  next.pomodoro.lastCompletedTask = String(next.pomodoro.lastCompletedTask ?? "").slice(0, 80);
  next.update.status = normalizeUpdateStatus(next.update.status);
  next.update.currentVersion = String(next.update.currentVersion ?? "").slice(0, 32);
  next.update.latestVersion = normalizeNullableString(next.update.latestVersion, 64);
  next.update.releaseUrl = normalizeNullableString(next.update.releaseUrl, 300);
  next.update.standardAssetUrl = normalizeNullableString(next.update.standardAssetUrl, 300);
  next.update.fullOfflineAssetUrl = normalizeNullableString(next.update.fullOfflineAssetUrl, 300);
  next.update.publishedAt = normalizeDateString(next.update.publishedAt);
  next.update.lastCheckedAt = normalizeDateString(next.update.lastCheckedAt);
  next.update.ignoredVersion = normalizeNullableString(next.update.ignoredVersion, 64);
  next.update.error = normalizeNullableString(next.update.error, 240);
  next.pomodoro.records = normalizeFocusRecords(next.pomodoro.records);
  next.pomodoro.completionReview = normalizeCompletionReview(next.pomodoro.completionReview);
  if (
    next.pomodoro.completionReview &&
    todayKey(new Date(next.pomodoro.completionReview.completedAt)) !== day
  ) {
    next.pomodoro.completionReview = null;
  }
  next.pomodoro.activeStartedAt = normalizeDateString(next.pomodoro.activeStartedAt);
  next.pomodoro.activePlannedSeconds = clampSecondsWithFallback(
    next.pomodoro.activePlannedSeconds,
    resetPomodoroDuration(next.pomodoro),
  );
  next.pomodoro.remainingSeconds = clampSecondsWithFallback(
    next.pomodoro.remainingSeconds,
    next.pomodoro.focusMode === "stopwatch" ? 0 : resetPomodoroDuration(next.pomodoro),
  );
  return next;
}

function normalizeUpdateStatus(value: unknown): UpdateInfo["status"] {
  return value === "idle" ||
    value === "checking" ||
    value === "available" ||
    value === "upToDate" ||
    value === "failed"
    ? value
    : "idle";
}

function normalizeNullableString(value: unknown, maxLength: number) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
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

export function plannedFocusSeconds(pomodoro: PomodoroState, mode: PomodoroMode = pomodoro.mode) {
  if (pomodoro.focusMode === "stopwatch") {
    return Math.max(0, pomodoro.estimatedMinutes * 60);
  }
  return resetPomodoroDuration(pomodoro, mode);
}

export function trimFocusRecords(records: FocusRecord[]) {
  return records.slice(-maxRecords);
}

export function trimPetMemoryEvents(events: PetMemoryEvent[]) {
  return events.slice(-maxPetMemoryEvents);
}

export function trimPetChatMessages(messages: PetChatMessage[]) {
  return messages.slice(-maxPetChatMessages);
}

export function trimPetDiaryEntries(entries: PetDiaryEntry[]) {
  return entries.slice(-maxPetDiaryEntries);
}

function normalizeFocusRecords(input: PomodoroState["records"] | unknown): FocusRecord[] {
  if (!Array.isArray(input)) return [];
  return trimFocusRecords(input.map(normalizeFocusRecord).filter(Boolean) as FocusRecord[]);
}

function normalizeFocusRecord(input: unknown): FocusRecord | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Partial<FocusRecord>;
  const id = String(record.id ?? "").slice(0, 80);
  const endedAt = normalizeDateString(record.endedAt);
  const createdAt = normalizeDateString(record.createdAt) ?? endedAt;
  const focusMode = normalizeFocusMode(record.focusMode);
  const pomodoroMode = normalizePomodoroMode(record.pomodoroMode);
  if (!id || !endedAt || !createdAt || !focusMode || !pomodoroMode) return null;
  return {
    id,
    taskTitle: String(record.taskTitle ?? "").slice(0, 80),
    focusMode,
    pomodoroMode,
    startedAt: normalizeDateString(record.startedAt) ?? endedAt,
    endedAt,
    durationSeconds: clampSeconds(record.durationSeconds),
    plannedSeconds: clampSeconds(record.plannedSeconds),
    completed: Boolean(record.completed),
    manuallyAdjusted: Boolean(record.manuallyAdjusted),
    createdAt,
  };
}

function normalizeCompletionReview(
  input: PomodoroState["completionReview"] | unknown,
): FocusCompletionReview | null {
  if (!input || typeof input !== "object") return null;
  const review = input as Partial<FocusCompletionReview>;
  const recordId = String(review.recordId ?? "").slice(0, 80);
  const focusMode = normalizeFocusMode(review.focusMode);
  const nextMode = normalizePomodoroMode(review.nextMode);
  const completedAt = normalizeDateString(review.completedAt);
  if (!recordId || !focusMode || !nextMode || !completedAt) return null;
  return {
    recordId,
    taskTitle: String(review.taskTitle ?? "").slice(0, 80),
    focusMode,
    durationSeconds: clampSeconds(review.durationSeconds),
    plannedSeconds: clampSeconds(review.plannedSeconds),
    nextMode,
    completedAt,
  };
}

function normalizePetMemoryEvents(input: PetMemoryState["events"] | unknown): PetMemoryEvent[] {
  if (!Array.isArray(input)) return [];
  return trimPetMemoryEvents(input.map(normalizePetMemoryEvent).filter(Boolean) as PetMemoryEvent[]);
}

function normalizePetMemoryEvent(input: unknown): PetMemoryEvent | null {
  if (!input || typeof input !== "object") return null;
  const event = input as Partial<PetMemoryEvent>;
  const id = String(event.id ?? "").slice(0, 80);
  const at = normalizeDateString(event.at);
  const type =
    event.type === "care" || event.type === "chat" || event.type === "focus" || event.type === "system"
      ? event.type
      : null;
  if (!id || !at || !type) return null;
  return {
    id,
    type,
    at,
    petId: String(event.petId ?? "").slice(0, 80),
    label: String(event.label ?? "").slice(0, 160),
    emotion: normalizeNullableString(event.emotion, 48) ?? undefined,
    motion: normalizeNullableString(event.motion, 48) ?? undefined,
    hints: normalizeStringList(event.hints, 12, 80),
  };
}

function normalizePetChatMessages(input: PetMemoryState["chat"] | unknown): PetChatMessage[] {
  if (!Array.isArray(input)) return [];
  return trimPetChatMessages(input.map(normalizePetChatMessage).filter(Boolean) as PetChatMessage[]);
}

function normalizePetChatMessage(input: unknown): PetChatMessage | null {
  if (!input || typeof input !== "object") return null;
  const message = input as Partial<PetChatMessage>;
  const id = String(message.id ?? "").slice(0, 80);
  const at = normalizeDateString(message.at);
  const role = message.role === "user" || message.role === "pet" ? message.role : null;
  const text = String(message.text ?? "").trim().slice(0, 400);
  if (!id || !at || !role || !text) return null;
  return {
    id,
    role,
    text,
    at,
    emotion: normalizeNullableString(message.emotion, 48) ?? undefined,
    motion: normalizeNullableString(message.motion, 48) ?? undefined,
  };
}

function normalizePetDiary(input: PetMemoryState["diary"] | unknown): PetDiaryEntry[] {
  if (!Array.isArray(input)) return [];
  return trimPetDiaryEntries(input.map(normalizePetDiaryEntry).filter(Boolean) as PetDiaryEntry[]);
}

function normalizePetDiaryEntry(input: unknown): PetDiaryEntry | null {
  if (!input || typeof input !== "object") return null;
  const entry = input as Partial<PetDiaryEntry>;
  const day = normalizeDayString(entry.day);
  const updatedAt = normalizeDateString(entry.updatedAt);
  if (!day || !updatedAt) return null;
  return {
    day,
    summary: String(entry.summary ?? "").slice(0, 320),
    focusMinutes: clampMinutes(entry.focusMinutes, 0, 1440, 0),
    careEvents: clampMinutes(entry.careEvents, 0, 999, 0),
    mood: String(entry.mood ?? "").slice(0, 48),
    updatedAt,
  };
}

function clampMinutes(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function clampSeconds(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(maxDaySeconds, Math.max(0, Math.floor(numeric)));
}

function clampSecondsWithFallback(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return clampSeconds(fallback);
  return clampSeconds(numeric);
}

function normalizeDateString(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

function normalizeDayString(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function normalizeFocusMode(value: unknown): FocusTimerMode | null {
  return value === "pomo" || value === "stopwatch" ? value : null;
}

function normalizePomodoroMode(value: unknown): PomodoroMode | null {
  if (value === "focus" || value === "break" || value === "longBreak") return value;
  return null;
}

function normalizePanelTab(value: unknown): FocusPanelTab | null {
  if (value === "timer" || value === "stats" || value === "records") return value;
  return null;
}
