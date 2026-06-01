import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  BadgeCheck,
  BarChart3,
  BrushCleaning,
  Cat,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Coffee,
  Eye,
  ExternalLink,
  Fish,
  FolderOpen,
  Gauge,
  HandHeart,
  Heart,
  Info,
  Joystick,
  Keyboard,
  Languages,
  ListChecks,
  MousePointer2,
  Pause,
  Play,
  Plus,
  ScrollText,
  Settings2,
  ShieldCheck,
  Smile,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Settings,
  SkipForward,
  TimerReset,
  Trash2,
} from "lucide-react";
import { Live2DCanvas } from "./Live2DCanvas";
import { SpritesheetPet } from "./SpritesheetPet";
import type { Live2DRuntimeProbe } from "./live2dRuntime";
import {
  fallbackPet,
  initialState,
  nextPomodoroMode,
  normalizeState,
  plannedFocusSeconds,
  resetPomodoroDuration,
  secondsToClock,
  shouldAutoRunNext,
  todayKey,
  trimFocusRecords,
} from "./petState";
import { safeInvoke } from "./tauriBridge";
import type {
  AppState,
  AppLanguage,
  CleanupResult,
  ControlPanelTab,
  FocusPanelTab,
  FocusRecord,
  FocusTimerMode,
  KeyboardStatus,
  PetAnimationState,
  PetMood,
  PetPack,
  PomodoroMode,
  RuntimeInfo,
  TypingPulse,
  UpdateInfo,
} from "./types";
import "./App.css";

function usePersistedState() {
  const [state, setState] = useState<AppState>(initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    safeInvoke<AppState>("load_state").then((stored) => {
      if (cancelled) return;
      const fallback = readLocalState();
      setState(normalizeState(stored ?? fallback));
      hydratedRef.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem("desktop-livecat-state", JSON.stringify(state));
    void safeInvoke("save_state", { state });
  }, [state]);

  return [state, setState] as const;
}

function readLocalState() {
  const local = localStorage.getItem("desktop-livecat-state");
  if (!local) return initialState;
  try {
    return JSON.parse(local) as Partial<AppState>;
  } catch {
    return initialState;
  }
}

const pomodoroPresets = [
  { id: "25-5-15" as const, label: "25/5/15", focus: 25, break: 5, longBreak: 15 },
  { id: "50-10-20" as const, label: "50/10/20", focus: 50, break: 10, longBreak: 20 },
  { id: "90-20-30" as const, label: "90/20/30", focus: 90, break: 20, longBreak: 30 },
];

const latestReleaseApi = "https://api.github.com/repos/devin583/desktop-livecat/releases/latest";
const releasesLatestUrl = "https://github.com/devin583/desktop-livecat/releases/latest";
const autoUpdateCheckIntervalMs = 24 * 60 * 60 * 1000;

type DesktopKeyboardKey = {
  label: string;
  side: "left" | "right" | "space";
  size?: "mod" | "space";
  home?: boolean;
  tap?: boolean;
};

const desktopKeyboardRows: DesktopKeyboardKey[][] = [
  [
    { label: "Q", side: "left" },
    { label: "W", side: "left" },
    { label: "E", side: "left" },
    { label: "R", side: "left" },
    { label: "T", side: "left" },
    { label: "Y", side: "right" },
    { label: "U", side: "right" },
    { label: "I", side: "right" },
    { label: "O", side: "right" },
    { label: "P", side: "right" },
  ],
  [
    { label: "A", side: "left" },
    { label: "S", side: "left" },
    { label: "D", side: "left" },
    { label: "F", side: "left", home: true, tap: true },
    { label: "G", side: "left", tap: true },
    { label: "H", side: "right", tap: true },
    { label: "J", side: "right", home: true, tap: true },
    { label: "K", side: "right" },
    { label: "L", side: "right" },
  ],
  [
    { label: "Ctrl", side: "left", size: "mod" },
    { label: "Alt", side: "left", size: "mod" },
    { label: "", side: "space", size: "space" },
    { label: "Alt", side: "right", size: "mod" },
    { label: "Ctrl", side: "right", size: "mod" },
  ],
];

const copy = {
  "zh-CN": {
    appStage: "Desktop LiveCat 舞台",
    artistChecklist: "画师检查清单",
    binding: "绑定中",
    break: "休息",
    clickThrough: "预览点击穿透 10 秒",
    controls: "设置",
    controlPet: "角色",
    controlInteract: "互动",
    controlFocus: "专注",
    controlSettings: "设置",
    statusIdle: "猫咪空闲",
    statusTyping: "正在打字",
    statusWatching: "看着你",
    statusPetting: "正在被摸",
    statusFeeding: "吃点东西",
    statusPlaying: "玩一会儿",
    statusCleaning: "整理毛毛",
    statusPraised: "被夸了",
    statusAttention: "休息提醒",
    interactPet: "抚摸",
    interactFeed: "喂食",
    interactPlay: "玩耍",
    interactClean: "整理",
    interactPraise: "夸奖",
    interactCall: "提醒休息",
    interactHint: "互动会短暂触发动作，不会打断工作。",
    compactStatus: "状态",
    advancedTimer: "高级计时设置",
    currentPet: "打开当前角色",
    disabledKeyboard: "键盘节奏同步已关闭。",
    doneRest: "完成休息",
    estimateMinutes: "预估分钟",
    estimatePomos: "预估番茄",
    finishStopwatch: "保存专注",
    focus: "专注",
    focusDoneTitle: "专注完成",
    focusModePomo: "番茄",
    focusModeStopwatch: "正计时",
    focusRecords: "记录",
    focusStats: "统计",
    focusTimer: "计时",
    keyboard: "键盘节奏",
    keyboardBrowser:
      "当前使用焦点窗口兜底监听；Windows 原生桥接启动后会切到全局节奏监听。",
    keyboardNative: "Windows 键盘节奏桥接已启用，只发送节奏脉冲，不保存按键内容。",
    language: "切换语言",
    live2d: "Live2D",
    longBreak: "长休息",
    makeDraft: "根据描述创建本地草案",
    lowPower: "低功耗",
    manual: "手动",
    autoBreak: "休息自动",
    autoNext: "全自动",
    noChecklist: "没有画师清单",
    noRecords: "暂无记录",
    openResources: "打开资源目录",
    recordAdjusted: "补记",
    recordCompleted: "完成",
    recordIncomplete: "未完成",
    installPet: "安装本地资源包",
    installPlaceholder: "路径或描述",
    pauseTimer: "暂停计时",
    petPack: "角色包",
    petPosition: "角色序号",
    petNext: "下一个角色",
    petPrevious: "上一个角色",
    reloadPets: "重新加载角色",
    resetTimer: "重置计时",
    resourceStatus: "资源状态",
    scale: "角色缩放",
    sevenDays: "7 天",
    updateTitle: "版本更新",
    updateCheck: "检查更新",
    updateChecking: "正在检查",
    updateAvailable: "发现新版本",
    updateReady: "已是最新版",
    updateFailed: "检查失败",
    updateOpen: "打开下载页",
    updateIgnore: "忽略本版",
    updateLastChecked: "上次检查",
    updateNeverChecked: "尚未检查",
    updateCurrent: "当前版本",
    updateLatest: "最新版本",
    cleanupTitle: "清理运行缓存",
    cleanupAction: "清理缓存",
    cleanupDone: "已清理",
    cleanupFailed: "部分失败",
    cleanupHint: "保留配置、番茄钟记录、角色包和离线运行时。",
    skipTimer: "跳过计时",
    skipBreak: "跳过休息",
    startTimer: "开始计时",
    today: "今日",
    task: "任务",
    top: "置顶",
    untitledTask: "未命名专注",
    reviewContinue: "继续 +5",
    reviewAdjust: "补记 +5",
  },
  "en-US": {
    appStage: "Desktop LiveCat stage",
    artistChecklist: "Artist checklist",
    binding: "Binding",
    break: "Break",
    clickThrough: "Preview click-through for 10 seconds",
    controls: "Settings",
    controlPet: "Pet",
    controlInteract: "Interact",
    controlFocus: "Focus",
    controlSettings: "Settings",
    statusIdle: "Idle cat",
    statusTyping: "Typing",
    statusWatching: "Watching",
    statusPetting: "Petting",
    statusFeeding: "Feeding",
    statusPlaying: "Playing",
    statusCleaning: "Grooming",
    statusPraised: "Praised",
    statusAttention: "Break nudge",
    interactPet: "Pet",
    interactFeed: "Feed",
    interactPlay: "Play",
    interactClean: "Groom",
    interactPraise: "Praise",
    interactCall: "Break nudge",
    interactHint: "Interactions play short motions and stay out of the way.",
    compactStatus: "Status",
    advancedTimer: "Advanced timer",
    currentPet: "Open current pet",
    disabledKeyboard: "Keyboard rhythm sync is disabled.",
    doneRest: "Done, rest",
    estimateMinutes: "Estimated minutes",
    estimatePomos: "Estimated pomos",
    finishStopwatch: "Save focus",
    focus: "Focus",
    focusDoneTitle: "Focus complete",
    focusModePomo: "Pomo",
    focusModeStopwatch: "Stopwatch",
    focusRecords: "Records",
    focusStats: "Stats",
    focusTimer: "Timer",
    keyboard: "Keyboard rhythm",
    keyboardBrowser:
      "Keyboard rhythm uses focused-window fallback until the native bridge is active.",
    keyboardNative:
      "Windows keyboard rhythm bridge is active. It emits timing pulses only and never stores key values.",
    language: "Switch language",
    live2d: "Live2D",
    longBreak: "Long break",
    makeDraft: "Create local draft from description",
    lowPower: "Low power",
    manual: "manual",
    autoBreak: "break",
    autoNext: "next",
    noChecklist: "No artist checklist",
    noRecords: "No records yet",
    openResources: "Open resources",
    recordAdjusted: "adjusted",
    recordCompleted: "done",
    recordIncomplete: "incomplete",
    installPet: "Install local pet pack",
    installPlaceholder: "Path or prompt",
    pauseTimer: "Pause timer",
    petPack: "Pet pack",
    petPosition: "Pet position",
    petNext: "Next pet",
    petPrevious: "Previous pet",
    reloadPets: "Reload pets",
    resetTimer: "Reset timer",
    resourceStatus: "Resource status",
    scale: "Pet scale",
    sevenDays: "7d",
    updateTitle: "Version update",
    updateCheck: "Check updates",
    updateChecking: "Checking",
    updateAvailable: "Update available",
    updateReady: "Up to date",
    updateFailed: "Check failed",
    updateOpen: "Open download",
    updateIgnore: "Ignore this version",
    updateLastChecked: "Last checked",
    updateNeverChecked: "Never checked",
    updateCurrent: "Current",
    updateLatest: "Latest",
    cleanupTitle: "Clean runtime cache",
    cleanupAction: "Clean cache",
    cleanupDone: "Cleaned",
    cleanupFailed: "Partially failed",
    cleanupHint: "Keeps settings, focus records, pet packs, and offline runtime.",
    skipTimer: "Skip timer",
    skipBreak: "Skip break",
    startTimer: "Start timer",
    today: "Today",
    task: "Task",
    top: "Toggle always on top",
    untitledTask: "Untitled focus",
    reviewContinue: "Continue +5",
    reviewAdjust: "Adjust +5",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

function modeLabel(mode: PomodoroMode, language: AppLanguage) {
  const t = copy[language];
  if (mode === "focus") return t.focus;
  if (mode === "longBreak") return t.longBreak;
  return t.break;
}

function minutesFromSeconds(seconds: number) {
  return Math.floor(seconds / 60);
}

type FocusSummary = {
  completed: number;
  durationSeconds: number;
  plannedSeconds: number;
  adjusted: number;
};

function compactDuration(seconds: number, language: AppLanguage) {
  const minutes = seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
  if (minutes < 60) return language === "zh-CN" ? `${minutes} 分` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return language === "zh-CN" ? `${hours} 小时` : `${hours}h`;
  return language === "zh-CN" ? `${hours} 小时 ${rest} 分` : `${hours}h ${rest}m`;
}

function recordTimeLabel(record: FocusRecord) {
  const date = new Date(record.endedAt);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function summarizeFocusRecords(records: FocusRecord[], dayCount: number): FocusSummary {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - Math.max(0, dayCount - 1));
  const cutoffTime = cutoff.getTime();

  return records.reduce<FocusSummary>(
    (summary, record) => {
      const endedAt = Date.parse(record.endedAt);
      if (!Number.isFinite(endedAt) || endedAt < cutoffTime) return summary;
      return {
        completed: summary.completed + (record.completed ? 1 : 0),
        durationSeconds: summary.durationSeconds + record.durationSeconds,
        plannedSeconds: summary.plannedSeconds + record.plannedSeconds,
        adjusted: summary.adjusted + (record.manuallyAdjusted ? 1 : 0),
      };
    },
    { completed: 0, durationSeconds: 0, plannedSeconds: 0, adjusted: 0 },
  );
}

function createRecordId() {
  return `focus-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createFocusRecord(
  pomodoro: AppState["pomodoro"],
  options: {
    now: Date;
    durationSeconds: number;
    plannedSeconds?: number;
    completed: boolean;
    manuallyAdjusted?: boolean;
  },
): FocusRecord {
  const durationSeconds = Math.max(0, Math.floor(options.durationSeconds));
  const endedAt = options.now.toISOString();
  const startedAt =
    pomodoro.activeStartedAt ??
    new Date(options.now.getTime() - durationSeconds * 1000).toISOString();
  return {
    id: createRecordId(),
    taskTitle: pomodoro.currentTask.trim(),
    focusMode: pomodoro.focusMode,
    pomodoroMode: pomodoro.mode,
    startedAt,
    endedAt,
    durationSeconds,
    plannedSeconds: Math.max(0, Math.floor(options.plannedSeconds ?? pomodoro.activePlannedSeconds)),
    completed: options.completed,
    manuallyAdjusted: Boolean(options.manuallyAdjusted),
    createdAt: endedAt,
  };
}

function addSecondsToFocusRecord(records: FocusRecord[], recordId: string, seconds: number) {
  return records.map((record) =>
    record.id === recordId
      ? {
          ...record,
          durationSeconds: record.durationSeconds + seconds,
          manuallyAdjusted: true,
        }
      : record,
  );
}

async function sendFocusNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function keyboardMessage(status: KeyboardStatus, language: AppLanguage) {
  const t = copy[language];
  if (status.backend === "disabled") return t.disabledKeyboard;
  if (status.backend.startsWith("windows")) return t.keyboardNative;
  return t.keyboardBrowser;
}

function normalizeVersion(version: string | null | undefined) {
  return String(version ?? "")
    .trim()
    .replace(/^v/i, "");
}

function compareVersions(left: string | null | undefined, right: string | null | undefined) {
  const leftParts = normalizeVersion(left).split(/[.-]/).map(numberPart);
  const rightParts = normalizeVersion(right).split(/[.-]/).map(numberPart);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function numberPart(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function updateStatusLabel(update: UpdateInfo, language: AppLanguage) {
  const t = copy[language];
  if (update.status === "checking") return t.updateChecking;
  if (update.status === "available") return t.updateAvailable;
  if (update.status === "upToDate") return t.updateReady;
  if (update.status === "failed") return t.updateFailed;
  return t.updateNeverChecked;
}

function formatCheckedAt(value: string | null, language: AppLanguage) {
  if (!value) return copy[language].updateNeverChecked;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return copy[language].updateNeverChecked;
  return date.toLocaleString(language === "zh-CN" ? "zh-CN" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number, language: AppLanguage) {
  if (bytes < 1024) return language === "zh-CN" ? `${bytes} 字节` : `${bytes} B`;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function artistStatusLabel(status: PetPack["artist_status"], language: AppLanguage) {
  if (language === "en-US") return status;
  return {
    missing: "缺失",
    "source-ready": "源文件就绪",
    "psd-ready": "PSD 就绪",
    "rigging-ready": "绑定就绪",
    "runtime-ready": "运行就绪",
  }[status];
}

function activityStateFromMood(
  mood: PetMood,
  tapSide: "left" | "right" | null,
): PetAnimationState {
  if (mood === "typing" && tapSide === "left") return "tap_left";
  if (mood === "typing" && tapSide === "right") return "tap_right";
  if (mood === "typing") return "idle";
  if (mood === "focus" || mood === "focusEnding") return "focus";
  if (mood === "break" || mood === "longBreak") return "break";
  if (mood === "happy") return "happy";
  if (mood === "dragged") return "dragged";
  if (mood === "watching_mouse") return "watching_mouse";
  if (mood === "petting") return "petting";
  if (mood === "feeding") return "feeding";
  if (mood === "playing") return "playing";
  if (mood === "cleaning") return "cleaning";
  if (mood === "praised") return "praised";
  if (mood === "attention_call") return "attention_call";
  return "idle";
}

function shouldRenderSpritesheet(pet: PetPack, activityState: PetAnimationState) {
  if (!pet.has_spritesheet || !pet.spritesheet) return false;
  if (pet.render_mode === "spritesheet") return true;
  if (pet.render_mode === "hybrid") {
    return activityState !== "idle" || !pet.has_live2d_model;
  }
  return false;
}

function rendererLabel(pet: PetPack, language: AppLanguage) {
  if (language === "en-US") {
    if (pet.render_mode === "spritesheet") return "Spritesheet";
    if (pet.render_mode === "hybrid") return "Hybrid";
    return "Live2D";
  }
  if (pet.render_mode === "spritesheet") return "帧动画";
  if (pet.render_mode === "hybrid") return "混合";
  return "Live2D";
}

function moodStatusLabel(mood: PetMood, language: AppLanguage) {
  const t = copy[language];
  if (mood === "typing") return t.statusTyping;
  if (mood === "watching_mouse") return t.statusWatching;
  if (mood === "petting") return t.statusPetting;
  if (mood === "feeding") return t.statusFeeding;
  if (mood === "playing") return t.statusPlaying;
  if (mood === "cleaning") return t.statusCleaning;
  if (mood === "praised" || mood === "happy") return t.statusPraised;
  if (mood === "attention_call" || mood === "focusEnding") return t.statusAttention;
  if (mood === "focus") return modeLabel("focus", language);
  if (mood === "break" || mood === "longBreak") return modeLabel("break", language);
  return t.statusIdle;
}

function petOriginLabel(pet: PetPack, language: AppLanguage) {
  if (pet.tags.includes("user-supplied")) {
    return language === "zh-CN" ? "用户素材" : "User asset";
  }
  if (pet.source === "bundled-fallback") {
    return language === "zh-CN" ? "内置兜底" : "Built-in fallback";
  }
  return pet.artist;
}

function isSelectablePet(pet: PetPack) {
  if (pet.id.startsWith("_")) return false;
  if (pet.id === "pixel-mochi") return false;
  if (pet.id === "livecat-default") return false;
  if (pet.id === "replace-with-pet-id" || pet.id === "your-pet-id") return false;
  return pet.has_spritesheet || pet.has_live2d_model;
}

function petSortScore(pet: PetPack) {
  if (pet.id === initialState.selectedPetId) return 0;
  if (pet.id === "gray-british-keyboard") return 1;
  if (pet.has_spritesheet) return 10;
  if (pet.has_live2d_model) return 20;
  return 99;
}

function orderPets(pets: PetPack[]) {
  return [...pets].sort(
    (left, right) =>
      petSortScore(left) - petSortScore(right) ||
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
  );
}

type InteractionMood = Extract<
  PetMood,
  "petting" | "feeding" | "playing" | "cleaning" | "praised" | "attention_call"
>;

type ActiveInteraction = {
  mood: InteractionMood;
  prop: "fish" | "wand" | "brush" | "heart" | "bell" | null;
  until: number;
};

const interactionDurationMs: Record<InteractionMood, number> = {
  petting: 3200,
  feeding: 4600,
  playing: 4800,
  cleaning: 3600,
  praised: 2800,
  attention_call: 4200,
};

function App() {
  const [state, setState] = usePersistedState();
  const [pets, setPets] = useState<PetPack[]>([fallbackPet]);
  const [keyboardStatus, setKeyboardStatus] = useState<KeyboardStatus>({
    supported: false,
    backend: "browser-focus-fallback",
    message: "Keyboard rhythm uses focused-window fallback until the native bridge is active.",
  });
  const [failedSpritePetIds, setFailedSpritePetIds] = useState<Set<string>>(() => new Set());
  const [live2dProbe, setLive2dProbe] = useState<Live2DRuntimeProbe>({
    renderer: "fallback-css",
    modelAvailable: false,
    runtimeAvailable: false,
    reason: "Live2D runtime probe has not run yet.",
    status: "fallback-active",
  });
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [lastTypingPulse, setLastTypingPulse] = useState(0);
  const [lastTapSide, setLastTapSide] = useState<"left" | "right">("left");
  const [typingRate, setTypingRate] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [lastMouseActivity, setLastMouseActivity] = useState(0);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [dragged, setDragged] = useState(false);
  const [installInput, setInstallInput] = useState("");
  const [installStatus, setInstallStatus] = useState("");
  const [cleanupStatus, setCleanupStatus] = useState("");
  const pulsesRef = useRef<number[]>([]);
  const lookThrottleRef = useRef(0);
  const pettingRef = useRef({ at: 0, x: 0, y: 0, distance: 0 });
  const interactionTimeoutRef = useRef<number | null>(null);
  const t = copy[state.language];

  const selectablePets = useMemo(() => orderPets(pets.filter(isSelectablePet)), [pets]);
  const pickerPets = selectablePets.length ? selectablePets : [fallbackPet];
  const selectedPet = useMemo(
    () =>
      selectablePets.find((pet) => pet.id === state.selectedPetId) ??
      selectablePets.find((pet) => pet.id === initialState.selectedPetId) ??
      selectablePets[0] ??
      fallbackPet,
    [selectablePets, state.selectedPetId],
  );
  const selectedPetIndex = Math.max(
    0,
    selectablePets.findIndex((pet) => pet.id === selectedPet.id),
  );
  const todaySummary = useMemo(
    () => summarizeFocusRecords(state.pomodoro.records, 1),
    [state.pomodoro.records],
  );
  const weekSummary = useMemo(
    () => summarizeFocusRecords(state.pomodoro.records, 7),
    [state.pomodoro.records],
  );
  const latestRecords = useMemo(
    () => state.pomodoro.records.slice(-6).reverse(),
    [state.pomodoro.records],
  );
  const timerStageLabel =
    state.pomodoro.focusMode === "stopwatch"
      ? t.focusModeStopwatch
      : modeLabel(state.pomodoro.mode, state.language);
  const todayCompleted = Math.max(todaySummary.completed, state.pomodoro.completedToday);
  const todayFocusSeconds = Math.max(
    todaySummary.durationSeconds,
    state.pomodoro.focusSecondsToday,
  );
  const spriteAssetFailed = failedSpritePetIds.has(selectedPet.id);

  const registerPulse = useCallback((source = "browser-focus-fallback") => {
    const now = Date.now();
    pulsesRef.current = [...pulsesRef.current.filter((at) => now - at < 2600), now];
    setTypingRate(Math.min(1, pulsesRef.current.length / 16));
    setLastTypingPulse(now);
    setLastTapSide((side) => (side === "left" ? "right" : "left"));
    setKeyboardStatus((current) =>
      source === current.backend ? current : { ...current, backend: source },
    );
  }, []);

  const handleSpriteAssetError = useCallback((petId: string, imageUrl: string) => {
    console.warn(`Spritesheet asset failed to load for ${petId}: ${imageUrl}`);
    setFailedSpritePetIds((current) => {
      if (current.has(petId)) return current;
      const next = new Set(current);
      next.add(petId);
      return next;
    });
  }, []);

  const handleSpriteAssetLoad = useCallback((petId: string) => {
    setFailedSpritePetIds((current) => {
      if (!current.has(petId)) return current;
      const next = new Set(current);
      next.delete(petId);
      return next;
    });
  }, []);

  const selectPetByIndex = useCallback(
    (index: number) => {
      if (!selectablePets.length) return;
      const wrappedIndex = (index + selectablePets.length) % selectablePets.length;
      const pet = selectablePets[wrappedIndex];
      setState((current) => ({ ...current, selectedPetId: pet.id }));
    },
    [selectablePets, setState],
  );
  const selectNextPet = useCallback(() => {
    selectPetByIndex(selectedPetIndex + 1);
  }, [selectPetByIndex, selectedPetIndex]);

  useEffect(() => {
    safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (!loaded?.length) return;
      const orderedPets = orderPets(loaded);
      setPets(orderedPets);
      const selectable = orderedPets.filter(isSelectablePet);
      setState((current) => {
        if (selectable.some((pet) => pet.id === current.selectedPetId)) return current;
        const fallback = selectable.find((pet) => pet.id === initialState.selectedPetId) ?? selectable[0];
        return fallback ? { ...current, selectedPetId: fallback.id } : current;
      });
    });
    safeInvoke<RuntimeInfo>("runtime_info").then((info) => {
      if (info) setRuntimeInfo(info);
    });
  }, []);

  const refreshPets = useCallback(() => {
    return safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (loaded?.length) setPets(orderPets(loaded));
      return loaded ?? null;
    });
  }, []);

  useEffect(() => {
    if (!state.keyboardSyncEnabled) {
      setKeyboardStatus({
        supported: false,
        backend: "disabled",
        message: "Keyboard rhythm sync is disabled.",
      });
      return;
    }

    safeInvoke<KeyboardStatus>("enable_keyboard_sync").then((status) => {
      if (status) setKeyboardStatus(status);
    });

    const unlistenPromise = listen<TypingPulse>("keyboard-sync://pulse", (event) => {
      registerPulse(event.payload.source);
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      registerPulse("browser-focus-fallback");
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [registerPulse, state.keyboardSyncEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTypingPulse > 1200) {
        setTypingRate(0);
      }
      pulsesRef.current = pulsesRef.current.filter((at) => now - at < 2600);
    }, 220);
    return () => window.clearInterval(interval);
  }, [lastTypingPulse]);

  useEffect(() => {
    if (!lastMouseActivity) return undefined;
    const timeout = window.setTimeout(() => {
      setLook({ x: 0, y: 0 });
      setLastMouseActivity(0);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [lastMouseActivity]);

  useEffect(() => {
    if (!state.pomodoro.running) return;
    const interval = window.setInterval(() => {
      setState((current) => {
        if (!current.pomodoro.running) return current;
        const now = new Date();
        const nowIso = now.toISOString();
        const activeStartedAt = current.pomodoro.activeStartedAt ?? nowIso;

        if (current.pomodoro.focusMode === "stopwatch") {
          return {
            ...current,
            pomodoro: {
              ...current.pomodoro,
              mode: "focus",
              remainingSeconds: current.pomodoro.remainingSeconds + 1,
              focusSecondsToday: current.pomodoro.focusSecondsToday + 1,
              activeStartedAt,
              activePlannedSeconds: plannedFocusSeconds(current.pomodoro, "focus"),
            },
          };
        }

        const elapsedKey =
          current.pomodoro.mode === "focus" ? "focusSecondsToday" : "breakSecondsToday";
        const plannedSeconds =
          current.pomodoro.activePlannedSeconds ||
          resetPomodoroDuration(current.pomodoro, current.pomodoro.mode);
        if (current.pomodoro.remainingSeconds > 1) {
          return {
            ...current,
            pomodoro: {
              ...current.pomodoro,
              remainingSeconds: current.pomodoro.remainingSeconds - 1,
              [elapsedKey]: current.pomodoro[elapsedKey] + 1,
              activeStartedAt,
              activePlannedSeconds: plannedSeconds,
            },
          };
        }

        const completedFocus = current.pomodoro.mode === "focus";
        const nextMode = nextPomodoroMode(current.pomodoro);
        const completedToday =
          completedFocus
            ? current.pomodoro.completedToday + 1
            : current.pomodoro.completedToday;
        const nextCycle = completedFocus
            ? nextMode === "longBreak"
              ? 0
              : current.pomodoro.focusSessionsInCycle + 1
            : current.pomodoro.focusSessionsInCycle;
        const record = completedFocus
          ? createFocusRecord(current.pomodoro, {
              now,
              durationSeconds: plannedSeconds,
              plannedSeconds,
              completed: true,
            })
          : null;
        const nextPlannedSeconds = resetPomodoroDuration(current.pomodoro, nextMode);
        const runNext = shouldAutoRunNext(current.pomodoro, nextMode);

        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            mode: nextMode,
            running: runNext,
            completedToday,
            focusSessionsInCycle: nextCycle,
            lastCompletedTask: completedFocus
              ? current.pomodoro.currentTask
              : current.pomodoro.lastCompletedTask,
            remainingSeconds: nextPlannedSeconds,
            activeStartedAt: runNext ? nowIso : null,
            activePlannedSeconds: nextPlannedSeconds,
            pauseCount: 0,
            extraSeconds: 0,
            records: record
              ? trimFocusRecords([...current.pomodoro.records, record])
              : current.pomodoro.records,
            completionReview: record
              ? {
                  recordId: record.id,
                  taskTitle: record.taskTitle,
                  focusMode: record.focusMode,
                  durationSeconds: record.durationSeconds,
                  plannedSeconds: record.plannedSeconds,
                  nextMode,
                  completedAt: record.endedAt,
                }
              : null,
            [elapsedKey]: current.pomodoro[elapsedKey] + 1,
          },
        };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [setState, state.pomodoro.running]);

  useEffect(() => {
    void safeInvoke("set_pet_always_on_top", { enabled: state.alwaysOnTop });
  }, [state.alwaysOnTop]);

  useEffect(() => {
    void safeInvoke("set_tray_language", { language: state.language });
  }, [state.language]);

  useEffect(() => {
    if (!runtimeInfo?.appVersion) return;
    setState((current) =>
      current.update.currentVersion === runtimeInfo.appVersion
        ? current
        : {
            ...current,
            update: {
              ...current.update,
              currentVersion: runtimeInfo.appVersion,
            },
          },
    );
  }, [runtimeInfo?.appVersion, setState]);

  useEffect(() => {
    const label = `${timerStageLabel} ${secondsToClock(state.pomodoro.remainingSeconds)}`;
    void safeInvoke("set_tray_status", { tooltip: `Desktop LiveCat - ${label}` });
  }, [state.pomodoro.remainingSeconds, timerStageLabel]);

  const notifiedReviewRef = useRef<string | null>(null);

  useEffect(() => {
    const review = state.pomodoro.completionReview;
    if (!review || notifiedReviewRef.current === review.recordId) return;
    notifiedReviewRef.current = review.recordId;
    const task = review.taskTitle || t.untitledTask;
    void sendFocusNotification(
      t.focusDoneTitle,
      `${task} · ${compactDuration(review.durationSeconds, state.language)}`,
    );
  }, [state.language, state.pomodoro.completionReview, t.focusDoneTitle, t.untitledTask]);

  const setClickThroughPreview = () => {
    setState((current) => ({ ...current, clickThrough: true }));
    void safeInvoke("set_click_through", { enabled: true });
    window.setTimeout(() => {
      setState((current) => ({ ...current, clickThrough: false }));
      void safeInvoke("set_click_through", { enabled: false });
    }, 10_000);
  };

  const pomodoroAction = (action: "toggle" | "reset" | "skip") => {
    setState((current) => {
      const now = new Date();
      const nowIso = now.toISOString();
      if (action === "toggle") {
        if (current.pomodoro.running) {
          return {
            ...current,
            pomodoro: {
              ...current.pomodoro,
              running: false,
              pauseCount: current.pomodoro.pauseCount + 1,
            },
          };
        }

        const plannedSeconds =
          current.pomodoro.focusMode === "stopwatch"
            ? plannedFocusSeconds(current.pomodoro, "focus")
            : resetPomodoroDuration(current.pomodoro, current.pomodoro.mode);
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            running: true,
            activeStartedAt: current.pomodoro.activeStartedAt ?? nowIso,
            activePlannedSeconds: plannedSeconds,
            completionReview: null,
            remainingSeconds:
              current.pomodoro.focusMode === "pomo" && current.pomodoro.remainingSeconds <= 0
                ? plannedSeconds
                : current.pomodoro.remainingSeconds,
          },
        };
      }

      if (action === "reset") {
        const remainingSeconds =
          current.pomodoro.focusMode === "stopwatch"
            ? 0
            : resetPomodoroDuration(current.pomodoro, current.pomodoro.mode);
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            running: false,
            remainingSeconds,
            activeStartedAt: null,
            activePlannedSeconds:
              current.pomodoro.focusMode === "stopwatch"
                ? plannedFocusSeconds(current.pomodoro, "focus")
                : remainingSeconds,
            pauseCount: 0,
            extraSeconds: 0,
            completionReview: null,
          },
        };
      }

      if (current.pomodoro.focusMode === "stopwatch") {
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            mode: "focus",
            running: false,
            remainingSeconds: 0,
            activeStartedAt: null,
            activePlannedSeconds: plannedFocusSeconds(current.pomodoro, "focus"),
            pauseCount: 0,
            extraSeconds: 0,
            completionReview: null,
          },
        };
      }

      const skippedFocus =
        current.pomodoro.focusMode === "pomo" && current.pomodoro.mode === "focus";
      const nextMode: PomodoroMode =
        current.pomodoro.mode === "focus" ? "break" : "focus";
      const plannedSeconds =
        current.pomodoro.activePlannedSeconds ||
        resetPomodoroDuration(current.pomodoro, current.pomodoro.mode);
      const elapsedSeconds = Math.max(0, plannedSeconds - current.pomodoro.remainingSeconds);
      const incompleteRecord =
        skippedFocus && elapsedSeconds >= 60
          ? createFocusRecord(current.pomodoro, {
              now,
              durationSeconds: elapsedSeconds,
              plannedSeconds,
              completed: false,
              manuallyAdjusted: true,
            })
          : null;
      const nextRemaining = resetPomodoroDuration(current.pomodoro, nextMode);

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          mode: nextMode,
          running: false,
          remainingSeconds: nextRemaining,
          activeStartedAt: null,
          activePlannedSeconds: nextRemaining,
          pauseCount: 0,
          extraSeconds: 0,
          completionReview: null,
          records: incompleteRecord
            ? trimFocusRecords([...current.pomodoro.records, incompleteRecord])
            : current.pomodoro.records,
        },
      };
    });
  };

  const finishStopwatch = () => {
    setState((current) => {
      if (current.pomodoro.focusMode !== "stopwatch" || current.pomodoro.remainingSeconds <= 0) {
        return current;
      }

      const now = new Date();
      const plannedSeconds = plannedFocusSeconds(current.pomodoro, "focus");
      const record = createFocusRecord(current.pomodoro, {
        now,
        durationSeconds: current.pomodoro.remainingSeconds,
        plannedSeconds,
        completed: true,
      });

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          running: false,
          mode: "focus",
          remainingSeconds: 0,
          activeStartedAt: null,
          activePlannedSeconds: plannedSeconds,
          pauseCount: 0,
          completedToday: current.pomodoro.completedToday + 1,
          lastCompletedTask: current.pomodoro.currentTask,
          records: trimFocusRecords([...current.pomodoro.records, record]),
          completionReview: {
            recordId: record.id,
            taskTitle: record.taskTitle,
            focusMode: record.focusMode,
            durationSeconds: record.durationSeconds,
            plannedSeconds: record.plannedSeconds,
            nextMode: "break",
            completedAt: record.endedAt,
          },
        },
      };
    });
  };

  const switchFocusMode = (focusMode: FocusTimerMode) => {
    setState((current) => {
      if (current.pomodoro.focusMode === focusMode) return current;
      const pomodoro = {
        ...current.pomodoro,
        focusMode,
        mode: "focus" as PomodoroMode,
        running: false,
        activeStartedAt: null,
        pauseCount: 0,
        extraSeconds: 0,
        completionReview: null,
      };
      return {
        ...current,
        pomodoro: {
          ...pomodoro,
          remainingSeconds: focusMode === "stopwatch" ? 0 : resetPomodoroDuration(pomodoro),
          activePlannedSeconds:
            focusMode === "stopwatch"
              ? plannedFocusSeconds(pomodoro, "focus")
              : resetPomodoroDuration(pomodoro),
        },
      };
    });
  };

  const setFocusPanelTab = (panelTab: FocusPanelTab) => {
    setState((current) => ({
      ...current,
      pomodoro: { ...current.pomodoro, panelTab },
    }));
  };

  const setEstimate = (field: "estimatedPomos" | "estimatedMinutes", value: number) => {
    const max = field === "estimatedPomos" ? 99 : 10_000;
    const bounded = Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : 0;
    setState((current) => ({
      ...current,
      pomodoro: {
        ...current.pomodoro,
        [field]: bounded,
        activePlannedSeconds:
          current.pomodoro.focusMode === "stopwatch" && field === "estimatedMinutes"
            ? bounded * 60
            : current.pomodoro.activePlannedSeconds,
      },
    }));
  };

  const reviewAction = (action: "dismiss" | "continue5" | "adjust5" | "skipBreak") => {
    setState((current) => {
      const review = current.pomodoro.completionReview;
      if (!review) return current;

      if (action === "adjust5") {
        const extraSeconds = 5 * 60;
        const adjustedRecords = addSecondsToFocusRecord(
          current.pomodoro.records,
          review.recordId,
          extraSeconds,
        );
        const reviewDay = todayKey(new Date(review.completedAt));
        const isToday = reviewDay === todayKey();
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            records: adjustedRecords,
            focusSecondsToday: isToday
              ? current.pomodoro.focusSecondsToday + extraSeconds
              : current.pomodoro.focusSecondsToday,
            extraSeconds: current.pomodoro.extraSeconds + extraSeconds,
            completionReview: {
              ...review,
              durationSeconds: review.durationSeconds + extraSeconds,
            },
          },
        };
      }

      if (action === "continue5") {
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            focusMode: "pomo",
            mode: "focus",
            running: true,
            remainingSeconds: 5 * 60,
            activeStartedAt: new Date().toISOString(),
            activePlannedSeconds: 5 * 60,
            extraSeconds: current.pomodoro.extraSeconds + 5 * 60,
            completionReview: null,
          },
        };
      }

      if (action === "skipBreak") {
        const remainingSeconds = resetPomodoroDuration(current.pomodoro, "focus");
        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            mode: "focus",
            running: false,
            remainingSeconds,
            activeStartedAt: null,
            activePlannedSeconds: remainingSeconds,
            completionReview: null,
          },
        };
      }

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          completionReview: null,
        },
      };
    });
  };

  const selectPreset = (preset: (typeof pomodoroPresets)[number]) => {
    setState((current) => ({
      ...current,
      pomodoro: {
        ...current.pomodoro,
        focusMode: "pomo",
        presetId: preset.id,
        focusMinutes: preset.focus,
        breakMinutes: preset.break,
        longBreakMinutes: preset.longBreak,
        mode: "focus",
        running: false,
        remainingSeconds: preset.focus * 60,
        activeStartedAt: null,
        activePlannedSeconds: preset.focus * 60,
        pauseCount: 0,
        extraSeconds: 0,
        completionReview: null,
      },
    }));
  };

  const setDuration = (
    field: "focusMinutes" | "breakMinutes" | "longBreakMinutes",
    value: number,
  ) => {
    const max = field === "focusMinutes" ? 180 : 120;
    const bounded = Number.isFinite(value) ? Math.min(max, Math.max(1, Math.round(value))) : 1;
    setState((current) => {
      const pomodoro = {
        ...current.pomodoro,
        [field]: bounded,
        presetId: "custom" as const,
        running: false,
      };
      return {
        ...current,
        pomodoro: {
          ...pomodoro,
          remainingSeconds:
            pomodoro.focusMode === "stopwatch" ? pomodoro.remainingSeconds : resetPomodoroDuration(pomodoro),
          activePlannedSeconds:
            pomodoro.focusMode === "stopwatch"
              ? plannedFocusSeconds(pomodoro, "focus")
              : resetPomodoroDuration(pomodoro),
          activeStartedAt: null,
          completionReview: null,
        },
      };
    });
  };

  const revealResources = () => {
    void safeInvoke<string>("reveal_resources").then(() => refreshPets());
  };

  const revealCurrentPet = () => {
    void safeInvoke<string>("reveal_pet_pack", { petId: selectedPet.id }).then(() => refreshPets());
  };

  const installLocalPet = () => {
    const sourcePath = installInput.trim();
    if (!sourcePath) return;
    setInstallStatus(state.language === "zh-CN" ? "安装中" : "Installing");
    void safeInvoke<PetPack>("install_pet_from_path", { sourcePath }).then((pet) => {
      if (!pet) {
        setInstallStatus(state.language === "zh-CN" ? "安装失败" : "Install failed");
        return;
      }
      setInstallStatus(state.language === "zh-CN" ? "已安装" : "Installed");
      void refreshPets().then(() => {
        setState((current) => ({ ...current, selectedPetId: pet.id }));
      });
    });
  };

  const createDraftPet = () => {
    const prompt = installInput.trim();
    if (!prompt) return;
    setInstallStatus(state.language === "zh-CN" ? "创建中" : "Creating");
    void safeInvoke<PetPack>("create_spritesheet_draft", { prompt }).then((pet) => {
      if (!pet) {
        setInstallStatus(state.language === "zh-CN" ? "创建失败" : "Create failed");
        return;
      }
      setInstallStatus(state.language === "zh-CN" ? "草案已创建" : "Draft created");
      void refreshPets().then(() => {
        setState((current) => ({ ...current, selectedPetId: pet.id }));
      });
    });
  };

  const openExternal = useCallback((url: string | null | undefined) => {
    if (!url) return;
    void openUrl(url).catch(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }, []);

  const checkForUpdates = useCallback(
    async (force = false) => {
      const currentVersion = runtimeInfo?.appVersion || state.update.currentVersion;
      const checkedAt = new Date().toISOString();
      setState((current) => ({
        ...current,
        update: {
          ...current.update,
          status: "checking",
          currentVersion,
          error: null,
          ignoredVersion: force ? null : current.update.ignoredVersion,
        },
      }));

      try {
        const response = await fetch(latestReleaseApi, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const release = (await response.json()) as {
          tag_name?: string;
          html_url?: string;
          published_at?: string;
          assets?: Array<{ name?: string; browser_download_url?: string }>;
        };
        const latestVersion = normalizeVersion(release.tag_name);
        const standardAssetUrl =
          release.assets?.find(
            (asset) =>
              asset.name?.includes("win11-x64") &&
              !asset.name?.includes("full-offline") &&
              asset.name?.endsWith(".zip"),
          )?.browser_download_url ?? null;
        const fullOfflineAssetUrl =
          release.assets?.find(
            (asset) =>
              asset.name?.includes("win11-x64") &&
              asset.name?.includes("full-offline") &&
              asset.name?.endsWith(".zip"),
          )?.browser_download_url ?? null;

        setState((current) => {
          const newer = compareVersions(latestVersion, currentVersion) > 0;
          const ignored = !force && current.update.ignoredVersion === latestVersion;
          return {
            ...current,
            update: {
              ...current.update,
              status: newer && !ignored ? "available" : "upToDate",
              currentVersion,
              latestVersion,
              releaseUrl: release.html_url ?? releasesLatestUrl,
              standardAssetUrl,
              fullOfflineAssetUrl,
              publishedAt: release.published_at ?? null,
              lastCheckedAt: checkedAt,
              ignoredVersion: force ? null : current.update.ignoredVersion,
              error: null,
            },
          };
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          update: {
            ...current.update,
            status: "failed",
            currentVersion,
            lastCheckedAt: checkedAt,
            error: error instanceof Error ? error.message : String(error),
          },
        }));
      }
    },
    [runtimeInfo?.appVersion, setState, state.update.currentVersion],
  );

  useEffect(() => {
    if (!runtimeInfo?.appVersion) return;
    const lastChecked = Date.parse(state.update.lastCheckedAt ?? "");
    const fresh = Number.isFinite(lastChecked) && Date.now() - lastChecked < autoUpdateCheckIntervalMs;
    if (!fresh) void checkForUpdates(false);
  }, [checkForUpdates, runtimeInfo?.appVersion, state.update.lastCheckedAt]);

  const ignoreCurrentUpdate = () => {
    setState((current) => ({
      ...current,
      update: {
        ...current.update,
        status: "upToDate",
        ignoredVersion: current.update.latestVersion,
      },
    }));
  };

  const cleanRuntimeCache = () => {
    const preservedState = localStorage.getItem("desktop-livecat-state");
    let removedLocalKeys = 0;
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || key === "desktop-livecat-state") continue;
      if (key.startsWith("desktop-livecat") || key.startsWith("livecat")) {
        localStorage.removeItem(key);
        removedLocalKeys += 1;
      }
    }
    if (preservedState) localStorage.setItem("desktop-livecat-state", preservedState);

    setCleanupStatus(state.language === "zh-CN" ? "清理中" : "Cleaning");
    void safeInvoke<CleanupResult>("cleanup_runtime_cache").then((result) => {
      const removedItems = (result?.removedItems ?? 0) + removedLocalKeys;
      const removedBytes = result?.removedBytes ?? 0;
      const failedItems = result?.failedItems ?? [];
      const prefix =
        failedItems.length > 0
          ? state.language === "zh-CN"
            ? t.cleanupFailed
            : t.cleanupFailed
          : state.language === "zh-CN"
            ? t.cleanupDone
            : t.cleanupDone;
      setCleanupStatus(
        `${prefix}: ${removedItems} ${
          state.language === "zh-CN" ? "项" : "items"
        }, ${formatBytes(removedBytes, state.language)}`,
      );
    });
  };

  useEffect(() => {
    const listeners = [
      listen("tray://timer-toggle", () => pomodoroAction("toggle")),
      listen("tray://timer-reset", () => pomodoroAction("reset")),
      listen("tray://timer-skip", () => pomodoroAction("skip")),
      listen("tray://reload-pets", refreshPets),
      listen("tray://check-updates", () => checkForUpdates(true)),
      listen("tray://next-pet", selectNextPet),
      listen("tray://toggle-controls", () => {
        setState((current) => ({ ...current, controlsOpen: !current.controlsOpen }));
      }),
      listen("tray://click-through-off", () => {
        setState((current) => ({ ...current, clickThrough: false }));
      }),
    ];
    return () => {
      void Promise.all(listeners).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
    };
  }, [checkForUpdates, refreshPets, selectNextPet]);

  const triggerInteraction = useCallback((mood: InteractionMood, prop: ActiveInteraction["prop"]) => {
    if (interactionTimeoutRef.current) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
    setActiveInteraction({
      mood,
      prop,
      until: Date.now() + interactionDurationMs[mood],
    });
    interactionTimeoutRef.current = window.setTimeout(() => {
      setActiveInteraction(null);
      interactionTimeoutRef.current = null;
    }, interactionDurationMs[mood]);
  }, []);

  useEffect(
    () => () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
    },
    [],
  );

  const updateLook = (event: PointerEvent<HTMLElement>) => {
    const now = Date.now();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const boundedX = Math.max(-1, Math.min(1, x));
    const boundedY = Math.max(-1, Math.min(1, y));
    const throttleMs = state.lowPower || document.hidden ? 110 : 34;
    if (now - lookThrottleRef.current >= throttleMs) {
      lookThrottleRef.current = now;
      setLastMouseActivity(now);
      setLook({
        x: boundedX,
        y: boundedY,
      });
    }

    if (!state.lowPower && boundedY > -0.35 && boundedY < 0.42 && Math.abs(boundedX) < 0.62) {
      const previous = pettingRef.current;
      const fresh = now - previous.at < 900;
      const dx = fresh ? boundedX - previous.x : 0;
      const dy = fresh ? boundedY - previous.y : 0;
      const distance = (fresh ? previous.distance : 0) + Math.hypot(dx, dy);
      pettingRef.current = { at: now, x: boundedX, y: boundedY, distance };
      if (distance > 0.55 && activeInteraction?.mood !== "petting") {
        pettingRef.current.distance = 0;
        triggerInteraction("petting", "heart");
      }
    }
  };

  const isTyping = Date.now() - lastTypingPulse < 1200;
  const activeTapSide = Date.now() - lastTypingPulse < 220 ? lastTapSide : null;
  const watchingMouse = !state.lowPower && Date.now() - lastMouseActivity < 1500;
  const focusEnding =
    state.pomodoro.running &&
    state.pomodoro.focusMode === "pomo" &&
    state.pomodoro.mode === "focus" &&
    state.pomodoro.remainingSeconds <= 60;
  const petMood: PetMood = dragged
    ? "dragged"
    : activeInteraction && activeInteraction.until > Date.now()
    ? activeInteraction.mood
    : isTyping
    ? "typing"
    : state.pomodoro.completionReview
      ? "happy"
    : focusEnding
      ? "focusEnding"
      : state.pomodoro.running && state.pomodoro.mode === "focus"
      ? "focus"
      : state.pomodoro.mode === "longBreak"
        ? "longBreak"
        : state.pomodoro.mode === "break"
        ? "break"
    : state.pomodoro.remainingSeconds !== resetPomodoroDuration(state.pomodoro)
          ? "paused"
          : watchingMouse
            ? "watching_mouse"
          : "idle";
  const activityState = activityStateFromMood(petMood, activeTapSide);
  const showSpritesheet = !spriteAssetFailed && shouldRenderSpritesheet(selectedPet, activityState);
  const showLive2DCanvas = selectedPet.render_mode !== "spritesheet";
  const resourceStatusTitle = spriteAssetFailed
    ? state.language === "zh-CN"
      ? `帧动画图片加载失败，已退回内置猫：${selectedPet.spritesheet?.image ?? ""}`
      : `Spritesheet image failed; built-in cat fallback is active: ${
          selectedPet.spritesheet?.image ?? ""
        }`
    : selectedPet.has_spritesheet
      ? `${rendererLabel(selectedPet, state.language)}: ${selectedPet.spritesheet?.image ?? ""}`
      : live2dProbe.reason;

  return (
    <main
      className="pet-app"
      style={
        {
          "--pet-scale": state.scale,
          "--look-x": look.x,
          "--look-y": look.y,
        } as CSSProperties
      }
    >
      <section
        className={`pet-stage mood-${petMood} renderer-${showSpritesheet ? "spritesheet" : live2dProbe.renderer} ${
          state.controlsOpen ? "controls-open" : ""
        } ${activeTapSide ? `tap-${activeTapSide}` : ""} ${
          state.lowPower ? "low-power" : ""
        }`}
        data-tauri-drag-region
        aria-label={t.appStage}
        onPointerMove={updateLook}
        onPointerDown={() => setDragged(true)}
        onPointerUp={() => setDragged(false)}
        onPointerCancel={() => setDragged(false)}
        onPointerLeave={() => {
          setDragged(false);
          setLook({ x: 0, y: 0 });
        }}
      >
        <div className="live2d-layer" data-tauri-drag-region>
          {showLive2DCanvas && (
            <Live2DCanvas
              look={look}
              mood={petMood}
              onProbe={setLive2dProbe}
              pet={selectedPet}
              tapSide={activeTapSide}
              typingRate={typingRate}
            />
          )}
          {showSpritesheet ? (
            <SpritesheetPet
              animationState={activityState}
              lowPower={state.lowPower}
              onAssetError={handleSpriteAssetError}
              onAssetLoad={handleSpriteAssetLoad}
              pet={selectedPet}
            />
          ) : (
            <div className="cat" style={{ ["--typing-rate" as string]: typingRate }}>
              <div className="tail" />
              <div className="body">
                <div className="chest" />
              </div>
              <div className="paw paw-left" />
              <div className="paw paw-right" />
              <div className="head">
                <div className="ear ear-left" />
                <div className="ear ear-right" />
                <div className="face">
                  <div className="eye eye-left" />
                  <div className="eye eye-right" />
                  <div className="muzzle" />
                  <div className="mouth" />
                </div>
              </div>
              <div className="keyboard-prop" aria-hidden="true">
                {desktopKeyboardRows.map((row, rowIndex) => (
                  <div className={`keyboard-row keyboard-row-${rowIndex + 1}`} key={rowIndex}>
                    {row.map((keycap, keyIndex) => (
                      <span
                        className={[
                          "keycap",
                          `keycap-${keycap.side}`,
                          keycap.size ? `keycap-${keycap.size}` : "",
                          keycap.home ? "keycap-home" : "",
                          keycap.tap ? "keycap-tap" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={`${keycap.label}-${keyIndex}`}
                      >
                        <i>{keycap.label}</i>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <div className="timer-note">
                <b>{secondsToClock(state.pomodoro.remainingSeconds)}</b>
                <small>{timerStageLabel}</small>
              </div>
            </div>
          )}
          {activeInteraction?.prop ? (
            <div className={`interaction-prop prop-${activeInteraction.prop}`} aria-hidden="true">
              {activeInteraction.prop === "fish"
                ? "><>"
                : activeInteraction.prop === "wand"
                  ? "*"
                  : activeInteraction.prop === "brush"
                    ? "///"
                    : activeInteraction.prop === "bell"
                      ? "!"
                      : "love"}
            </div>
          ) : null}
        </div>

        <div className="status-capsule" title={`${t.compactStatus}: ${moodStatusLabel(petMood, state.language)}`}>
          <span>{moodStatusLabel(petMood, state.language)}</span>
          <b>{secondsToClock(state.pomodoro.remainingSeconds)}</b>
        </div>
        {state.update.status === "available" ? (
          <div className="update-nudge">
            <span>
              {t.updateAvailable}
              {state.update.latestVersion ? ` v${state.update.latestVersion}` : ""}
            </span>
            <button type="button" title={t.updateOpen} onClick={() => openExternal(state.update.releaseUrl)}>
              <ExternalLink size={13} />
            </button>
            <button type="button" title={t.updateIgnore} onClick={ignoreCurrentUpdate}>
              <CheckCircle2 size={13} />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={`settings-toggle ${state.controlsOpen ? "active" : ""}`}
          aria-label={t.controls}
          title={t.controls}
          onClick={() =>
            setState((current) => ({ ...current, controlsOpen: !current.controlsOpen }))
          }
        >
          <Settings size={16} />
        </button>

        <aside className="control-strip">
          <div className="control-tabs" role="tablist" aria-label={t.controls}>
            {[
              ["pet", Cat, t.controlPet],
              ["interact", HandHeart, t.controlInteract],
              ["focus", TimerReset, t.controlFocus],
              ["settings", Settings2, t.controlSettings],
            ].map(([tab, Icon, label]) => {
              const typedTab = tab as ControlPanelTab;
              const TabIcon = Icon as typeof Cat;
              return (
                <button
                  key={typedTab}
                  type="button"
                  className={state.controlPanelTab === typedTab ? "active" : ""}
                  aria-label={label as string}
                  title={label as string}
                  onClick={() => setState((current) => ({ ...current, controlPanelTab: typedTab }))}
                >
                  <TabIcon size={15} />
                  <span>{label as string}</span>
                </button>
              );
            })}
          </div>

          {state.controlPanelTab === "pet" ? (
            <>
          <div className="pet-picker-header">
            <span>{t.petPack}</span>
            <b title={t.petPosition}>
              {selectablePets.length ? `${selectedPetIndex + 1}/${selectablePets.length}` : "0/0"}
            </b>
          </div>
          <div className="pet-picker">
            <button
              type="button"
              aria-label={t.petPrevious}
              title={t.petPrevious}
              disabled={selectablePets.length <= 1}
              onClick={() => selectPetByIndex(selectedPetIndex - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <select
              value={selectedPet.id}
              onChange={(event) =>
                setState((current) => ({ ...current, selectedPetId: event.target.value }))
              }
              aria-label={t.petPack}
              title={t.petPack}
            >
              {pickerPets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={t.petNext}
              title={t.petNext}
              disabled={selectablePets.length <= 1}
              onClick={() => selectPetByIndex(selectedPetIndex + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="pet-meta" title={selectedPet.description || selectedPet.name}>
            <div>
              <span>{petOriginLabel(selectedPet, state.language)}</span>
              <b>{selectedPet.version}</b>
            </div>
            <div>
              <span>{rendererLabel(selectedPet, state.language)}</span>
              <b>{artistStatusLabel(selectedPet.artist_status, state.language)}</b>
            </div>
          </div>
            </>
          ) : null}

          {state.controlPanelTab === "settings" ? (
            <>
          <div className="icon-row">
            <button
              type="button"
              aria-label={t.top}
              title={t.top}
              className={state.alwaysOnTop ? "active" : ""}
              onClick={() =>
                setState((current) => ({ ...current, alwaysOnTop: !current.alwaysOnTop }))
              }
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              aria-label={t.clickThrough}
              title={t.clickThrough}
              className={state.clickThrough ? "active" : ""}
              onClick={setClickThroughPreview}
            >
              <MousePointer2 size={16} />
            </button>
            <button
              type="button"
              aria-label={t.keyboard}
              title={keyboardMessage(keyboardStatus, state.language)}
              className={isTyping ? "active" : ""}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  keyboardSyncEnabled: !current.keyboardSyncEnabled,
                }))
              }
            >
              <Keyboard size={16} />
            </button>
          </div>

          <div className="icon-row">
            <button type="button" aria-label={t.reloadPets} title={t.reloadPets} onClick={refreshPets}>
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              aria-label={t.openResources}
              title={runtimeInfo?.petRoots.join("\n") || t.openResources}
              onClick={revealResources}
            >
              <FolderOpen size={16} />
            </button>
            <button
              type="button"
              aria-label={t.currentPet}
              title={selectedPet.source}
              onClick={revealCurrentPet}
            >
              <ScrollText size={16} />
            </button>
          </div>

          <div className="icon-row">
            <button
              type="button"
              aria-label={t.lowPower}
              title={t.lowPower}
              className={state.lowPower ? "active" : ""}
              onClick={() => setState((current) => ({ ...current, lowPower: !current.lowPower }))}
            >
              <Gauge size={16} />
            </button>
            <button type="button" aria-label={t.resourceStatus} title={resourceStatusTitle}>
              <Info size={16} />
            </button>
            <button
              type="button"
              aria-label={t.artistChecklist}
              title={selectedPet.artist_checklist ?? t.noChecklist}
              className={selectedPet.has_artist_checklist ? "active" : ""}
            >
              <BadgeCheck size={16} />
            </button>
          </div>

          <div className="icon-row">
            <button
              type="button"
              aria-label={t.language}
              title={t.language}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  language: current.language === "zh-CN" ? "en-US" : "zh-CN",
                }))
              }
            >
              <Languages size={16} />
              <span>{state.language === "zh-CN" ? "中" : "EN"}</span>
            </button>
          </div>

          <div className={`update-card update-${state.update.status}`}>
            <div className="update-card-head">
              <span>
                <ShieldCheck size={14} />
                {t.updateTitle}
              </span>
              <b>{updateStatusLabel(state.update, state.language)}</b>
            </div>
            <div className="update-version-row">
              <span>{t.updateCurrent}</span>
              <b>v{normalizeVersion(runtimeInfo?.appVersion || state.update.currentVersion)}</b>
            </div>
            <div className="update-version-row">
              <span>{t.updateLatest}</span>
              <b>{state.update.latestVersion ? `v${state.update.latestVersion}` : "-"}</b>
            </div>
            <div className="update-version-row">
              <span>{t.updateLastChecked}</span>
              <b>{formatCheckedAt(state.update.lastCheckedAt, state.language)}</b>
            </div>
            {state.update.status === "failed" && state.update.error ? (
              <div className="update-message">{state.update.error}</div>
            ) : null}
            <div className="update-actions">
              <button
                type="button"
                title={t.updateCheck}
                disabled={state.update.status === "checking"}
                onClick={() => checkForUpdates(true)}
              >
                <RefreshCw size={14} />
                <span>{t.updateCheck}</span>
              </button>
              <button
                type="button"
                title={t.updateOpen}
                disabled={!state.update.releaseUrl}
                onClick={() => openExternal(state.update.releaseUrl)}
              >
                <ExternalLink size={14} />
                <span>{t.updateOpen}</span>
              </button>
              {state.update.status === "available" ? (
                <button type="button" title={t.updateIgnore} onClick={ignoreCurrentUpdate}>
                  <CheckCircle2 size={14} />
                  <span>{t.updateIgnore}</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="cleanup-card">
            <div>
              <b>{t.cleanupTitle}</b>
              <span>{t.cleanupHint}</span>
            </div>
            <button type="button" title={t.cleanupAction} onClick={cleanRuntimeCache}>
              <Trash2 size={14} />
              <span>{t.cleanupAction}</span>
            </button>
            {cleanupStatus ? <small>{cleanupStatus}</small> : null}
          </div>

          <div className="install-row">
            <input
              aria-label={t.installPlaceholder}
              type="text"
              maxLength={180}
              placeholder={t.installPlaceholder}
              value={installInput}
              onChange={(event) => setInstallInput(event.currentTarget.value)}
            />
            <button
              type="button"
              aria-label={t.installPet}
              title={t.installPet}
              onClick={installLocalPet}
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              aria-label={t.makeDraft}
              title={t.makeDraft}
              onClick={createDraftPet}
            >
              <Sparkles size={15} />
            </button>
          </div>
          {installStatus ? <div className="install-status">{installStatus}</div> : null}

          <input
            aria-label={t.scale}
            type="range"
            min="0.72"
            max="1.25"
            step="0.01"
            value={state.scale}
            onChange={(event) =>
              setState((current) => ({ ...current, scale: Number(event.target.value) }))
            }
          />
            </>
          ) : null}

          {state.controlPanelTab === "interact" ? (
            <div className="interaction-panel">
              <div className="interaction-hint">{t.interactHint}</div>
              <div className="interaction-grid">
                <button
                  type="button"
                  title={t.interactPet}
                  onClick={() => triggerInteraction("petting", "heart")}
                >
                  <HandHeart size={16} />
                  <span>{t.interactPet}</span>
                </button>
                <button
                  type="button"
                  title={t.interactFeed}
                  onClick={() => triggerInteraction("feeding", "fish")}
                >
                  <Fish size={16} />
                  <span>{t.interactFeed}</span>
                </button>
                <button
                  type="button"
                  title={t.interactPlay}
                  onClick={() => triggerInteraction("playing", "wand")}
                >
                  <Joystick size={16} />
                  <span>{t.interactPlay}</span>
                </button>
                <button
                  type="button"
                  title={t.interactClean}
                  onClick={() => triggerInteraction("cleaning", "brush")}
                >
                  <BrushCleaning size={16} />
                  <span>{t.interactClean}</span>
                </button>
                <button
                  type="button"
                  title={t.interactPraise}
                  onClick={() => triggerInteraction("praised", "heart")}
                >
                  <Heart size={16} />
                  <span>{t.interactPraise}</span>
                </button>
                <button
                  type="button"
                  title={t.interactCall}
                  onClick={() => triggerInteraction("attention_call", "bell")}
                >
                  <Smile size={16} />
                  <span>{t.interactCall}</span>
                </button>
              </div>
            </div>
          ) : null}

          {state.controlPanelTab === "focus" ? (
            <>
          <div className="focus-tabs">
            <button
              type="button"
              className={state.pomodoro.panelTab === "timer" ? "active" : ""}
              onClick={() => setFocusPanelTab("timer")}
            >
              <TimerReset size={14} />
              {t.focusTimer}
            </button>
            <button
              type="button"
              className={state.pomodoro.panelTab === "stats" ? "active" : ""}
              onClick={() => setFocusPanelTab("stats")}
            >
              <BarChart3 size={14} />
              {t.focusStats}
            </button>
            <button
              type="button"
              className={state.pomodoro.panelTab === "records" ? "active" : ""}
              onClick={() => setFocusPanelTab("records")}
            >
              <ListChecks size={14} />
              {t.focusRecords}
            </button>
          </div>

          {state.pomodoro.completionReview ? (
            <div className="review-card">
              <div>
                <b>{t.focusDoneTitle}</b>
                <span>
                  {state.pomodoro.completionReview.taskTitle || t.untitledTask} ·{" "}
                  {compactDuration(state.pomodoro.completionReview.durationSeconds, state.language)}
                </span>
              </div>
              <div className="review-actions">
                <button type="button" onClick={() => reviewAction("dismiss")}>
                  <CheckCircle2 size={14} />
                  {t.doneRest}
                </button>
                <button type="button" onClick={() => reviewAction("continue5")}>
                  <Play size={14} />
                  {t.reviewContinue}
                </button>
                <button type="button" onClick={() => reviewAction("adjust5")}>
                  <Plus size={14} />
                  {t.reviewAdjust}
                </button>
                <button type="button" onClick={() => reviewAction("skipBreak")}>
                  <SkipForward size={14} />
                  {t.skipBreak}
                </button>
              </div>
            </div>
          ) : null}

          {state.pomodoro.panelTab === "timer" ? (
            <>
              <div className="focus-mode-row">
                <button
                  type="button"
                  className={state.pomodoro.focusMode === "pomo" ? "active" : ""}
                  onClick={() => switchFocusMode("pomo")}
                >
                  <TimerReset size={14} />
                  {t.focusModePomo}
                </button>
                <button
                  type="button"
                  className={state.pomodoro.focusMode === "stopwatch" ? "active" : ""}
                  onClick={() => switchFocusMode("stopwatch")}
                >
                  <Gauge size={14} />
                  {t.focusModeStopwatch}
                </button>
              </div>

              <div className="timer-controls">
                <button
                  type="button"
                  aria-label={state.pomodoro.running ? t.pauseTimer : t.startTimer}
                  onClick={() => pomodoroAction("toggle")}
                >
                  {state.pomodoro.running ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  type="button"
                  aria-label={t.resetTimer}
                  onClick={() => pomodoroAction("reset")}
                >
                  <RotateCcw size={16} />
                </button>
                {state.pomodoro.focusMode === "stopwatch" ? (
                  <button
                    type="button"
                    aria-label={t.finishStopwatch}
                    disabled={state.pomodoro.remainingSeconds <= 0}
                    onClick={finishStopwatch}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={t.skipTimer}
                    onClick={() => pomodoroAction("skip")}
                  >
                    <SkipForward size={16} />
                  </button>
                )}
              </div>

              {state.pomodoro.focusMode === "pomo" ? (
                <>
                  <div className="preset-row">
                    {pomodoroPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={state.pomodoro.presetId === preset.id ? "active" : ""}
                        onClick={() => selectPreset(preset)}
                      >
                        {preset.id === "25-5-15" ? (
                          <TimerReset size={14} />
                        ) : (
                          <Coffee size={14} />
                        )}
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="duration-row">
                    <input
                      aria-label={t.focus}
                      type="number"
                      min="1"
                      max="180"
                      value={state.pomodoro.focusMinutes}
                      onChange={(event) =>
                        setDuration("focusMinutes", Number(event.currentTarget.value))
                      }
                    />
                    <input
                      aria-label={t.break}
                      type="number"
                      min="1"
                      max="90"
                      value={state.pomodoro.breakMinutes}
                      onChange={(event) =>
                        setDuration("breakMinutes", Number(event.currentTarget.value))
                      }
                    />
                    <input
                      aria-label={t.longBreak}
                      type="number"
                      min="1"
                      max="120"
                      value={state.pomodoro.longBreakMinutes}
                      onChange={(event) =>
                        setDuration("longBreakMinutes", Number(event.currentTarget.value))
                      }
                    />
                  </div>
                </>
              ) : null}

              <div className="duration-row task-row">
                <input
                  aria-label={t.task}
                  type="text"
                  maxLength={80}
                  placeholder={t.task}
                  value={state.pomodoro.currentTask}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      pomodoro: { ...current.pomodoro, currentTask: event.currentTarget.value },
                    }))
                  }
                />
                {state.pomodoro.focusMode === "pomo" ? (
                  <input
                    aria-label={t.longBreak}
                    type="number"
                    min="2"
                    max="12"
                    value={state.pomodoro.longBreakEvery}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        pomodoro: {
                          ...current.pomodoro,
                          longBreakEvery: Number.isFinite(Number(event.currentTarget.value))
                            ? Number(event.currentTarget.value)
                            : current.pomodoro.longBreakEvery,
                        },
                      }))
                    }
                  />
                ) : null}
              </div>

              <div className="duration-row estimate-row">
                <input
                  aria-label={t.estimatePomos}
                  type="number"
                  min="0"
                  max="99"
                  value={state.pomodoro.estimatedPomos}
                  onChange={(event) =>
                    setEstimate("estimatedPomos", Number(event.currentTarget.value))
                  }
                />
                <input
                  aria-label={t.estimateMinutes}
                  type="number"
                  min="0"
                  max="10000"
                  value={state.pomodoro.estimatedMinutes}
                  onChange={(event) =>
                    setEstimate("estimatedMinutes", Number(event.currentTarget.value))
                  }
                />
              </div>

              {state.pomodoro.focusMode === "pomo" ? (
                <div className="toggle-row">
                  <label>
                    <input
                      aria-label="Enable long break"
                      type="checkbox"
                      checked={state.pomodoro.longBreakEnabled}
                      onChange={(event) =>
                        setState((current) => ({
                          ...current,
                          pomodoro: {
                            ...current.pomodoro,
                            longBreakEnabled: event.currentTarget.checked,
                          },
                        }))
                      }
                    />
                    {state.language === "zh-CN" ? "长休" : "LB"}
                  </label>
                  <select
                    aria-label="Timer auto flow"
                    value={state.pomodoro.autoFlow}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        pomodoro: {
                          ...current.pomodoro,
                          autoFlow: event.currentTarget
                            .value as AppState["pomodoro"]["autoFlow"],
                        },
                      }))
                    }
                  >
                    <option value="manual">{t.manual}</option>
                    <option value="autoBreak">{t.autoBreak}</option>
                    <option value="autoNext">{t.autoNext}</option>
                  </select>
                </div>
              ) : null}

              <div className="stats-row">
                <span>{todayCompleted}</span>
                <span>{minutesFromSeconds(todayFocusSeconds)}m</span>
                <span>{minutesFromSeconds(state.pomodoro.breakSecondsToday)}m</span>
              </div>
            </>
          ) : state.pomodoro.panelTab === "stats" ? (
            <div className="focus-stat-grid">
              <div>
                <span>{t.today}</span>
                <b>{todayCompleted}</b>
                <small>{compactDuration(todayFocusSeconds, state.language)}</small>
              </div>
              <div>
                <span>{t.sevenDays}</span>
                <b>{weekSummary.completed}</b>
                <small>{compactDuration(weekSummary.durationSeconds, state.language)}</small>
              </div>
              <div>
                <span>{t.recordAdjusted}</span>
                <b>{weekSummary.adjusted}</b>
                <small>{compactDuration(weekSummary.plannedSeconds, state.language)}</small>
              </div>
            </div>
          ) : (
            <div className="records-list">
              {latestRecords.length ? (
                latestRecords.map((record) => (
                  <div className="record-row" key={record.id}>
                    <span>
                      <b>{record.taskTitle || t.untitledTask}</b>
                      <small>
                        {recordTimeLabel(record)} ·{" "}
                        {record.focusMode === "stopwatch"
                          ? t.focusModeStopwatch
                          : t.focusModePomo}{" "}
                        · {compactDuration(record.durationSeconds, state.language)}
                      </small>
                    </span>
                    <em>
                      {record.completed
                        ? record.manuallyAdjusted
                          ? t.recordAdjusted
                          : t.recordCompleted
                        : t.recordIncomplete}
                    </em>
                  </div>
                ))
              ) : (
                <div className="empty-records">{t.noRecords}</div>
              )}
            </div>
          )}
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default App;
