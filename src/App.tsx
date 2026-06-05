import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  BadgeCheck,
  BarChart3,
  BellRing,
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
  X,
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
import { safeInvoke, safeListen } from "./tauriBridge";
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
  PetCareState,
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
    closeControls: "收起面板",
    controls: "设置",
    controlPet: "角色",
    controlInteract: "互动",
    controlFocus: "专注",
    controlSettings: "设置",
    statusIdle: "猫咪空闲",
    statusTyping: "正在打字",
    statusDragged: "移动中",
    statusWatching: "看着你",
    statusPetting: "正在被摸",
    statusFeeding: "吃点东西",
    statusPlaying: "玩一会儿",
    statusCleaning: "整理毛毛",
    statusPraised: "被夸了",
    statusAttention: "休息提醒",
    statusFailed: "番茄枯萎",
    careBond: "亲密",
    careCleanliness: "清洁",
    careCoins: "金币",
    careEnergy: "精力",
    careExperience: "经验",
    careFullness: "饱腹",
    careHappiness: "开心",
    careLevel: "等级",
    careStreak: "连击",
    focusCompanion: "陪伴专注",
    focusCompletePet: "完成啦",
    focusResetPet: "重新准备",
    focusSkipPet: "切换节奏",
    focusStartPet: "准备专注",
    focusPausedPet: "等你回来",
    focusRunningPet: "陪你专注",
    focusReward: "专注奖励",
    focusTomatoComplete: "番茄成熟",
    focusTomatoGrowing: "番茄成长中",
    focusTomatoPaused: "番茄等你",
    focusTomatoWilted: "番茄枯萎",
    menuCare: "照顾",
    menuFocus: "番茄钟",
    menuSettings: "设置",
    menuOpenControls: "完整面板",
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
    closeControls: "Close panel",
    controls: "Settings",
    controlPet: "Pet",
    controlInteract: "Interact",
    controlFocus: "Focus",
    controlSettings: "Settings",
    statusIdle: "Idle cat",
    statusTyping: "Typing",
    statusDragged: "Moving",
    statusWatching: "Watching",
    statusPetting: "Petting",
    statusFeeding: "Feeding",
    statusPlaying: "Playing",
    statusCleaning: "Grooming",
    statusPraised: "Praised",
    statusAttention: "Break nudge",
    statusFailed: "Tomato wilted",
    careBond: "Bond",
    careCleanliness: "Clean",
    careCoins: "Coins",
    careEnergy: "Energy",
    careExperience: "XP",
    careFullness: "Full",
    careHappiness: "Happy",
    careLevel: "Level",
    careStreak: "Streak",
    focusCompanion: "Focus buddy",
    focusCompletePet: "Done",
    focusResetPet: "Reset",
    focusSkipPet: "Switching",
    focusStartPet: "Ready",
    focusPausedPet: "Waiting",
    focusRunningPet: "Focusing",
    focusReward: "Focus reward",
    focusTomatoComplete: "Tomato ripe",
    focusTomatoGrowing: "Tomato growing",
    focusTomatoPaused: "Tomato waiting",
    focusTomatoWilted: "Tomato wilted",
    menuCare: "Care",
    menuFocus: "Timer",
    menuSettings: "Settings",
    menuOpenControls: "Full panel",
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
  if (mood === "failed") return "failed";
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
  if (mood === "dragged") return t.statusDragged;
  if (mood === "watching_mouse") return t.statusWatching;
  if (mood === "petting") return t.statusPetting;
  if (mood === "feeding") return t.statusFeeding;
  if (mood === "playing") return t.statusPlaying;
  if (mood === "cleaning") return t.statusCleaning;
  if (mood === "praised" || mood === "happy") return t.statusPraised;
  if (mood === "failed") return t.statusFailed;
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
  if (pet.tags.includes("deprecated") || pet.tags.includes("legacy")) return false;
  if (pet.id === "replace-with-pet-id" || pet.id === "your-pet-id") return false;
  return pet.has_spritesheet || pet.has_live2d_model;
}

function petSortScore(pet: PetPack) {
  if (pet.id === initialState.selectedPetId) return 0;
  if (pet.id === "gray-british-keyboard-v2") return 1;
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

const browserPreviewPetIds = [
  "orange-tabby-keyboard-v2",
  "gray-british-keyboard-v2",
];

async function loadBrowserPreviewPetPacks() {
  const packs = await Promise.all(browserPreviewPetIds.map(loadBrowserPreviewPetPack));
  return packs.filter((pack): pack is PetPack => Boolean(pack));
}

async function loadBrowserPreviewPetPack(petId: string): Promise<PetPack | null> {
  try {
    const manifestResponse = await fetch(`/pets/${petId}/manifest.json`, { cache: "no-store" });
    if (!manifestResponse.ok) return null;
    const manifest = (await manifestResponse.json()) as Record<string, unknown>;
    const workflow = objectValue(manifest.artistWorkflow);
    const spritesheet = await hydrateBrowserPreviewSpritesheet(petId, objectValue(manifest.spritesheet));
    const renderMode = stringValue(manifest.renderMode);
    const artistChecklist = stringValue(workflow?.checklist) ?? null;
    const artistStatus = normalizeArtistStatus(stringValue(workflow?.status));

    return {
      id: stringValue(manifest.id) ?? petId,
      name: stringValue(manifest.name) ?? petId,
      version: stringValue(manifest.version) ?? "0.0.0",
      artist: stringValue(manifest.artist) ?? "Unknown",
      description: stringValue(manifest.description) ?? "",
      render_mode:
        renderMode === "live2d" || renderMode === "hybrid" || renderMode === "spritesheet"
          ? renderMode
          : spritesheet
            ? "spritesheet"
            : "live2d",
      artist_checklist: artistChecklist,
      artist_status: artistStatus,
      has_artist_checklist: Boolean(artistChecklist),
      has_live2d_model: false,
      has_parameter_spec: false,
      has_source_assets: Boolean(workflow?.primarySource),
      has_spritesheet: Boolean(spritesheet?.image),
      live2d_model: null,
      persona: personaValue(manifest.persona),
      preview: stringValue(manifest.preview),
      source: "browser-preview",
      spritesheet,
      tags: stringArrayValue(manifest.tags),
    };
  } catch {
    return null;
  }
}

async function hydrateBrowserPreviewSpritesheet(
  petId: string,
  input: Record<string, unknown> | null,
): Promise<PetPack["spritesheet"]> {
  if (!input) return null;
  const image = stringValue(input.image);
  if (!image) return null;
  const statesFile = stringValue(input.statesFile);
  const embeddedStates = objectValue(input.states) ?? {};
  let fileStates: Record<string, unknown> = {};

  if (statesFile) {
    try {
      const statesResponse = await fetch(`/pets/${petId}/${statesFile}`, { cache: "no-store" });
      if (statesResponse.ok) {
        fileStates = objectValue(await statesResponse.json()) ?? {};
      }
    } catch {
      fileStates = {};
    }
  }

  return {
    image,
    columns: positiveIntegerValue(input.columns, 1),
    rows: positiveIntegerValue(input.rows, 1),
    frameWidth: positiveIntegerValue(input.frameWidth, 192),
    frameHeight: positiveIntegerValue(input.frameHeight, 208),
    states: {
      ...embeddedStates,
      ...fileStates,
    } as NonNullable<PetPack["spritesheet"]>["states"],
    statesFile: statesFile ?? undefined,
  };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArrayValue(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function personaValue(value: unknown): PetPack["persona"] {
  const persona = objectValue(value);
  if (!persona) return null;
  const palette = stringArrayValue(persona.palette);
  return {
    name: stringValue(persona.name) ?? "Desktop Pet",
    species: stringValue(persona.species) ?? "cat",
    style: stringValue(persona.style) ?? "spritesheet",
    personality: stringValue(persona.personality) ?? "reactive desktop companion",
    palette: palette.length ? palette : ["#f6b56a", "#4d3541", "#fff7df"],
    accessories: stringArrayValue(persona.accessories),
  };
}

function positiveIntegerValue(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizeArtistStatus(value: string | null): PetPack["artist_status"] {
  return value === "missing" ||
    value === "source-ready" ||
    value === "psd-ready" ||
    value === "rigging-ready" ||
    value === "runtime-ready"
    ? value
    : "missing";
}

const nonPetPointerSelector =
  "button, input, select, textarea, .control-strip, .settings-toggle, .status-capsule, .update-nudge, .pet-context-menu, .pet-action-dock";

function isPetSurfacePointer(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (target.closest(nonPetPointerSelector)) return false;
  return Boolean(target.closest(".live2d-layer"));
}

type InteractionMood = Extract<
  PetMood,
  | "focus"
  | "petting"
  | "feeding"
  | "playing"
  | "cleaning"
  | "praised"
  | "attention_call"
  | "failed"
>;

type ActiveInteraction = {
  id: number;
  mood: InteractionMood;
  prop: "fish" | "wand" | "brush" | "heart" | "bell" | "tomato" | "wiltedTomato" | null;
  reaction: string;
  durationMs: number;
  until: number;
};

type PetContextMenuState = {
  x: number;
  y: number;
  maxHeight: number;
};

const interactionDurationMs: Record<InteractionMood, number> = {
  focus: 4600,
  petting: 5200,
  feeding: 5400,
  playing: 5200,
  cleaning: 4600,
  praised: 4200,
  attention_call: 4300,
  failed: 5200,
};

const interactionCareDelta: Record<
  InteractionMood,
  Partial<Record<Exclude<keyof PetCareState, "lastInteractionAt">, number>>
> = {
  focus: {},
  petting: { happiness: 10, energy: 2, bond: 2 },
  feeding: { fullness: 18, happiness: 4, energy: 2, bond: 1 },
  playing: { happiness: 14, fullness: -3, energy: -7, bond: 2 },
  cleaning: { cleanliness: 22, happiness: 3, energy: -2, bond: 1 },
  praised: { happiness: 12, energy: 3, bond: 3 },
  attention_call: { energy: 8, happiness: 2, bond: 1 },
  failed: { happiness: -6, energy: -2 },
};

function applyCareDelta(
  care: PetCareState,
  delta: Partial<Record<Exclude<keyof PetCareState, "lastInteractionAt">, number>>,
): PetCareState {
  return {
    ...care,
    happiness: clampCare(care.happiness + (delta.happiness ?? 0)),
    fullness: clampCare(care.fullness + (delta.fullness ?? 0)),
    cleanliness: clampCare(care.cleanliness + (delta.cleanliness ?? 0)),
    energy: clampCare(care.energy + (delta.energy ?? 0)),
    bond: Math.max(0, Math.min(9999, Math.round(care.bond + (delta.bond ?? 0)))),
    lastInteractionAt: new Date().toISOString(),
  };
}

function clampCare(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

type FocusReward = {
  bond: number;
  coins: number;
  energy: number;
  experience: number;
  fullness: number;
  happiness: number;
};

function focusRewardFromSeconds(seconds: number): FocusReward {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return {
    experience: minutes,
    coins: Math.max(1, Math.floor(minutes / 5)),
    energy: Math.max(4, Math.min(60, Math.round(minutes * 1.36))),
    fullness: Math.max(2, Math.min(35, Math.round(minutes * 0.42))),
    happiness: Math.max(4, Math.min(28, Math.round(minutes * 0.5))),
    bond: Math.max(1, Math.min(8, Math.floor(minutes / 12) + 1)),
  };
}

function levelRequirement(level: number) {
  return 40 + level * 30;
}

function addExperience(level: number, experience: number, amount: number) {
  let nextLevel = Math.max(1, Math.floor(level));
  let nextExperience = Math.max(0, Math.floor(experience + amount));
  while (nextExperience >= levelRequirement(nextLevel) && nextLevel < 999) {
    nextExperience -= levelRequirement(nextLevel);
    nextLevel += 1;
  }
  return { level: nextLevel, experience: nextExperience };
}

function previousDayKey(day: string) {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() - 1);
  return todayKey(date);
}

function nextStreak(care: PetCareState, focusDay: string) {
  if (care.lastFocusDay === focusDay) return care.streak;
  if (care.lastFocusDay === previousDayKey(focusDay)) return care.streak + 1;
  return 1;
}

function applyFocusReward(care: PetCareState, seconds: number, now = new Date()): PetCareState {
  const reward = focusRewardFromSeconds(seconds);
  const leveled = addExperience(care.level, care.experience, reward.experience);
  const focusDay = todayKey(now);
  return {
    ...care,
    happiness: clampCare(care.happiness + reward.happiness),
    fullness: clampCare(care.fullness + reward.fullness),
    cleanliness: clampCare(care.cleanliness + 2),
    energy: clampCare(care.energy + reward.energy),
    bond: Math.max(0, Math.min(9999, care.bond + reward.bond)),
    level: leveled.level,
    experience: leveled.experience,
    coins: Math.max(0, Math.min(999_999, care.coins + reward.coins)),
    streak: nextStreak(care, focusDay),
    lastFocusDay: focusDay,
    lastInteractionAt: now.toISOString(),
  };
}

function focusRewardLabel(seconds: number, language: AppLanguage) {
  const reward = focusRewardFromSeconds(seconds);
  const xp = language === "zh-CN" ? "经验" : "XP";
  const coins = language === "zh-CN" ? "金币" : "coins";
  return `+${reward.experience} ${xp} · +${reward.coins} ${coins}`;
}

function levelProgressPercent(care: PetCareState) {
  return Math.min(100, Math.round((care.experience / levelRequirement(care.level)) * 100));
}

function interactionReactionLabel(
  mood: InteractionMood,
  language: AppLanguage,
  delta = interactionCareDelta[mood],
) {
  if (mood === "failed") {
    return language === "zh-CN" ? "番茄枯萎 · 未获得奖励" : "Tomato wilted · no reward";
  }
  if (mood === "focus") {
    return language === "zh-CN" ? "准备专注" : "Ready to focus";
  }
  const positiveMetric =
    (delta.fullness ?? 0) > 0
      ? language === "zh-CN"
        ? "饱腹"
        : "full"
      : (delta.cleanliness ?? 0) > 0
        ? language === "zh-CN"
          ? "清洁"
          : "clean"
        : (delta.energy ?? 0) > 0
          ? language === "zh-CN"
            ? "精力"
            : "energy"
          : language === "zh-CN"
            ? "开心"
            : "happy";
  const amount = Math.max(
    delta.happiness ?? 0,
    delta.fullness ?? 0,
    delta.cleanliness ?? 0,
    delta.energy ?? 0,
    1,
  );
  const verb =
    language === "zh-CN"
      ? {
          petting: "舒服",
          feeding: "吃到啦",
          playing: "开玩",
          cleaning: "清爽",
          praised: "被夸",
          attention_call: "提醒",
          focus: "准备",
        }[mood]
      : {
          petting: "Purr",
          feeding: "Snack",
          playing: "Play",
          cleaning: "Groom",
          praised: "Praised",
          attention_call: "Nudge",
          focus: "Ready",
        }[mood];
  return language === "zh-CN" ? `${verb} +${amount} ${positiveMetric}` : `${verb} +${amount} ${positiveMetric}`;
}

const dragIntentDelayMs = 160;
const dragIntentDistancePx = 28;

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
  const [petMenu, setPetMenu] = useState<PetContextMenuState | null>(null);
  const [dragged, setDragged] = useState(false);
  const [installInput, setInstallInput] = useState("");
  const [installStatus, setInstallStatus] = useState("");
  const [cleanupStatus, setCleanupStatus] = useState("");
  const pulsesRef = useRef<number[]>([]);
  const lookThrottleRef = useRef(0);
  const pettingRef = useRef({ at: 0, x: 0, y: 0, distance: 0 });
  const dragCandidateRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const interactionTimeoutRef = useRef<number | null>(null);
  const interactionIdRef = useRef(0);
  const t = copy[state.language];

  const selectablePets = useMemo(() => orderPets(pets.filter(isSelectablePet)), [pets]);
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
  const plannedTimerSeconds =
    state.pomodoro.focusMode === "stopwatch"
      ? Math.max(1, plannedFocusSeconds(state.pomodoro, "focus") || state.pomodoro.remainingSeconds || 1)
      : Math.max(1, state.pomodoro.activePlannedSeconds || resetPomodoroDuration(state.pomodoro));
  const freshTimerSeconds = resetPomodoroDuration(state.pomodoro);
  const timerHasContext =
    state.pomodoro.running ||
    Boolean(state.pomodoro.completionReview) ||
    state.pomodoro.mode !== "focus" ||
    state.pomodoro.remainingSeconds !== freshTimerSeconds;
  const timerProgress =
    state.pomodoro.focusMode === "stopwatch"
      ? Math.min(1, state.pomodoro.remainingSeconds / plannedTimerSeconds)
      : Math.min(1, Math.max(0, 1 - state.pomodoro.remainingSeconds / plannedTimerSeconds));
  const timerBubbleTone = state.pomodoro.completionReview
    ? "complete"
    : state.pomodoro.running
      ? state.pomodoro.mode
      : "paused";
  const focusCompanionLabel = state.pomodoro.completionReview
    ? t.focusCompletePet
    : state.pomodoro.running
      ? t.focusRunningPet
      : timerHasContext
        ? t.focusPausedPet
        : t.focusCompanion;
  const careMeters = [
    ["happiness", t.careHappiness, state.petCare.happiness],
    ["fullness", t.careFullness, state.petCare.fullness],
    ["cleanliness", t.careCleanliness, state.petCare.cleanliness],
    ["energy", t.careEnergy, state.petCare.energy],
  ] as const;
  const focusRewardPreview = focusRewardLabel(plannedTimerSeconds, state.language);
  const tomatoStage =
    activeInteraction?.prop === "wiltedTomato"
      ? "wilted"
      : state.pomodoro.completionReview
        ? "complete"
        : state.pomodoro.mode !== "focus"
          ? "rest"
          : !state.pomodoro.running && timerHasContext
            ? "paused"
            : timerProgress >= 0.86
              ? "ripe"
              : timerProgress >= 0.18
                ? "growing"
                : "seed";
  const tomatoLabel =
    tomatoStage === "wilted"
      ? t.focusTomatoWilted
      : tomatoStage === "complete" || tomatoStage === "ripe"
        ? t.focusTomatoComplete
        : tomatoStage === "paused"
          ? t.focusTomatoPaused
          : t.focusTomatoGrowing;
  const showFocusTomato =
    timerHasContext &&
    (state.pomodoro.mode === "focus" ||
      Boolean(state.pomodoro.completionReview) ||
      activeInteraction?.prop === "wiltedTomato");

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

  const applyPetPacks = useCallback(
    (loaded: PetPack[]) => {
      const orderedPets = orderPets(loaded);
      setPets(orderedPets);
      const selectable = orderedPets.filter(isSelectablePet);
      setState((current) => {
        if (selectable.some((pet) => pet.id === current.selectedPetId)) return current;
        const fallback = selectable.find((pet) => pet.id === initialState.selectedPetId) ?? selectable[0];
        return fallback ? { ...current, selectedPetId: fallback.id } : current;
      });
    },
    [setState],
  );

  const refreshPets = useCallback(() => {
    return safeInvoke<PetPack[]>("list_pet_packs").then(async (nativePets) => {
      const loaded = nativePets?.length ? nativePets : await loadBrowserPreviewPetPacks();
      if (loaded.length) applyPetPacks(loaded);
      return loaded.length ? loaded : null;
    });
  }, [applyPetPacks]);

  useEffect(() => {
    void refreshPets();
    safeInvoke<RuntimeInfo>("runtime_info").then((info) => {
      if (info) setRuntimeInfo(info);
    });
  }, [refreshPets]);

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

    const unlistenPromise = safeListen<TypingPulse>("keyboard-sync://pulse", (event) => {
      registerPulse(event.payload.source);
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      registerPulse("browser-focus-fallback");
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      void unlistenPromise.then((unlisten) => unlisten?.());
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
          petCare: completedFocus
            ? applyFocusReward(current.petCare, plannedSeconds, now)
            : current.petCare,
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

  const triggerInteraction = useCallback(
    (
      mood: InteractionMood,
      prop: ActiveInteraction["prop"],
      options: { adjustCare?: boolean; closeMenu?: boolean; reaction?: string } = {},
    ) => {
      if (interactionTimeoutRef.current) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
      const id = interactionIdRef.current + 1;
      interactionIdRef.current = id;
      const durationMs = interactionDurationMs[mood];
      setActiveInteraction({
        id,
        mood,
        prop,
        reaction: options.reaction ?? interactionReactionLabel(mood, state.language),
        durationMs,
        until: Date.now() + durationMs,
      });
      if (options.adjustCare !== false) {
        setState((current) => ({
          ...current,
          petCare: applyCareDelta(current.petCare, interactionCareDelta[mood]),
        }));
      }
      if (options.closeMenu !== false) setPetMenu(null);
      interactionTimeoutRef.current = window.setTimeout(() => {
        setActiveInteraction(null);
        interactionTimeoutRef.current = null;
      }, durationMs);
    },
    [setState, state.language],
  );

  useEffect(() => {
    const review = state.pomodoro.completionReview;
    if (!review) return;
    triggerInteraction("praised", "heart", {
      adjustCare: true,
      closeMenu: false,
      reaction: `${t.focusCompletePet} · ${focusRewardLabel(review.durationSeconds, state.language)}`,
    });
  }, [state.pomodoro.completionReview?.recordId, triggerInteraction]);

  const setClickThroughPreview = () => {
    setState((current) => ({ ...current, clickThrough: true }));
    void safeInvoke("set_click_through", { enabled: true });
    window.setTimeout(() => {
      setState((current) => ({ ...current, clickThrough: false }));
      void safeInvoke("set_click_through", { enabled: false });
    }, 10_000);
  };

  const pomodoroAction = (action: "toggle" | "reset" | "skip") => {
    const skippingFocus =
      action === "skip" &&
      state.pomodoro.focusMode === "pomo" &&
      state.pomodoro.mode === "focus";
    if (action === "toggle") {
      triggerInteraction(
        state.pomodoro.running ? "attention_call" : state.pomodoro.mode === "focus" ? "focus" : "playing",
        state.pomodoro.running ? "bell" : state.pomodoro.mode === "focus" ? "tomato" : "wand",
        {
          adjustCare: false,
          closeMenu: false,
          reaction: state.pomodoro.running
            ? t.focusPausedPet
            : state.pomodoro.mode === "focus"
              ? t.focusStartPet
              : modeLabel(state.pomodoro.mode, state.language),
        },
      );
    } else if (action === "reset") {
      triggerInteraction("attention_call", "bell", {
        adjustCare: false,
        closeMenu: false,
        reaction: t.focusResetPet,
      });
    } else {
      triggerInteraction(
        skippingFocus ? "failed" : state.pomodoro.mode === "focus" ? "attention_call" : "praised",
        skippingFocus ? "wiltedTomato" : state.pomodoro.mode === "focus" ? "bell" : "heart",
        {
          adjustCare: skippingFocus,
          closeMenu: false,
          reaction: skippingFocus ? t.focusTomatoWilted : t.focusSkipPet,
        },
      );
    }

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
          petCare: applyFocusReward(current.petCare, extraSeconds, new Date(review.completedAt)),
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
      safeListen("tray://timer-toggle", () => pomodoroAction("toggle")),
      safeListen("tray://timer-reset", () => pomodoroAction("reset")),
      safeListen("tray://timer-skip", () => pomodoroAction("skip")),
      safeListen("tray://reload-pets", refreshPets),
      safeListen("tray://check-updates", () => checkForUpdates(true)),
      safeListen("tray://next-pet", selectNextPet),
      safeListen("tray://toggle-controls", () => {
        setState((current) => ({ ...current, controlsOpen: !current.controlsOpen }));
      }),
      safeListen("tray://click-through-off", () => {
        setState((current) => ({ ...current, clickThrough: false }));
      }),
    ];
    return () => {
      void Promise.all(listeners).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten?.());
      });
    };
  }, [checkForUpdates, refreshPets, selectNextPet]);

  useEffect(
    () => () => {
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
    },
    [],
  );

  const openPetContextMenu = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(nonPetPointerSelector) && !target.closest(".live2d-layer")) return;
    if (!target.closest(".live2d-layer")) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 252;
    const menuHeight = timerHasContext ? 520 : 430;
    const x = Math.min(Math.max(10, event.clientX - rect.left), Math.max(10, rect.width - menuWidth - 10));
    const y = Math.min(Math.max(10, event.clientY - rect.top), Math.max(10, rect.height - menuHeight - 10));
    const maxHeight = Math.max(240, rect.height - y - 10);
    setState((current) => ({ ...current, controlsOpen: false }));
    setPetMenu({ x, y, maxHeight });
  };

  const updateLook = (event: PointerEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest(nonPetPointerSelector)) return;
    const now = Date.now();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const boundedX = Math.max(-1, Math.min(1, x));
    const boundedY = Math.max(-1, Math.min(1, y));
    const pettingZone = boundedY > -0.35 && boundedY < 0.42 && Math.abs(boundedX) < 0.62;
    const dragCandidate = dragCandidateRef.current;
    const pointerDistance = dragCandidate
      ? Math.hypot(event.clientX - dragCandidate.x, event.clientY - dragCandidate.y)
      : 0;
    if (
      dragCandidate &&
      !dragged &&
      !pettingZone &&
      now - dragCandidate.at >= dragIntentDelayMs &&
      pointerDistance >= dragIntentDistancePx
    ) {
      if (interactionTimeoutRef.current) {
        window.clearTimeout(interactionTimeoutRef.current);
        interactionTimeoutRef.current = null;
      }
      setActiveInteraction(null);
      setDragged(true);
    }
    const throttleMs = state.lowPower || document.hidden ? 110 : 34;
    if (now - lookThrottleRef.current >= throttleMs) {
      lookThrottleRef.current = now;
      setLastMouseActivity(now);
      setLook({
        x: boundedX,
        y: boundedY,
      });
    }

    if (!state.lowPower && pettingZone) {
      const previous = pettingRef.current;
      const fresh = now - previous.at < 900;
      const dx = fresh ? boundedX - previous.x : 0;
      const dy = fresh ? boundedY - previous.y : 0;
      const distance = (fresh ? previous.distance : 0) + Math.hypot(dx, dy);
      pettingRef.current = { at: now, x: boundedX, y: boundedY, distance };
      if (distance > 0.55 && activeInteraction?.mood !== "petting") {
        pettingRef.current.distance = 0;
        dragCandidateRef.current = null;
        setDragged(false);
        triggerInteraction("petting", "heart");
      }
    }
  };

  const beginPetDrag = (event: PointerEvent<HTMLElement>) => {
    const target = event.target;
    if (petMenu && target instanceof Element && !target.closest(".pet-context-menu")) {
      setPetMenu(null);
    }
    if (isPetSurfacePointer(event)) {
      dragCandidateRef.current = { at: Date.now(), x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  };

  const endPetDrag = (event: PointerEvent<HTMLElement>) => {
    const candidate = dragCandidateRef.current;
    const pointerDistance = candidate
      ? Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y)
      : 0;
    dragCandidateRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (candidate && !dragged && pointerDistance < 14 && Date.now() - candidate.at < 520) {
      triggerInteraction("petting", "heart", { closeMenu: false });
    }
    setDragged(false);
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
          "--focus-progress": `${Math.round(timerProgress * 100)}%`,
        } as CSSProperties
      }
    >
      <section
        className={`pet-stage mood-${petMood} renderer-${showSpritesheet ? "spritesheet" : live2dProbe.renderer} ${
          state.controlsOpen ? "controls-open" : ""
        } ${activeTapSide ? `tap-${activeTapSide}` : ""} ${
          state.lowPower ? "low-power" : ""
        }`}
        aria-label={t.appStage}
        onContextMenu={openPetContextMenu}
        onPointerMove={updateLook}
        onPointerDown={beginPetDrag}
        onPointerUp={endPetDrag}
        onPointerCancel={endPetDrag}
        onPointerLeave={() => {
          dragCandidateRef.current = null;
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
            <div
              key={`prop-${activeInteraction.id}`}
              className={`interaction-prop prop-${activeInteraction.prop} mood-prop-${activeInteraction.mood}`}
              aria-hidden="true"
            >
              {activeInteraction.prop === "fish"
                ? <Fish size={15} />
                : activeInteraction.prop === "wand"
                  ? <Sparkles size={15} />
                  : activeInteraction.prop === "brush"
                    ? <BrushCleaning size={15} />
                    : activeInteraction.prop === "bell"
                      ? <BellRing size={15} />
                      : activeInteraction.prop === "tomato" || activeInteraction.prop === "wiltedTomato"
                        ? <span className="mini-tomato" />
                      : <Heart size={15} />}
            </div>
          ) : null}
          {activeInteraction ? (
            <div
              key={`reaction-${activeInteraction.id}`}
              className={`pet-reaction-bubble reaction-${activeInteraction.mood}`}
            >
              {activeInteraction.reaction}
            </div>
          ) : null}
          {showFocusTomato ? (
            <div
              className={`focus-tomato tomato-${tomatoStage}`}
              aria-label={tomatoLabel}
              title={tomatoLabel}
            >
              <span />
              <i />
            </div>
          ) : null}
          {timerHasContext ? (
            <div className={`pet-timer-bubble timer-${timerBubbleTone}`}>
              <div className="pet-timer-face">
                <span>{secondsToClock(state.pomodoro.remainingSeconds)}</span>
              </div>
              <div className="pet-timer-copy">
                <b>{focusCompanionLabel}</b>
                <small>{timerStageLabel}</small>
                {state.pomodoro.mode === "focus" || state.pomodoro.completionReview ? (
                  <small>{focusRewardPreview}</small>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="pet-action-dock"
          aria-label={t.menuCare}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={activeInteraction?.mood === "petting" ? "active" : ""}
            aria-label={t.interactPet}
            title={t.interactPet}
            onClick={() => triggerInteraction("petting", "heart", { closeMenu: false })}
          >
            <HandHeart size={15} />
          </button>
          <button
            type="button"
            className={activeInteraction?.mood === "feeding" ? "active" : ""}
            aria-label={t.interactFeed}
            title={t.interactFeed}
            onClick={() => triggerInteraction("feeding", "fish", { closeMenu: false })}
          >
            <Fish size={15} />
          </button>
          <button
            type="button"
            className={activeInteraction?.mood === "playing" ? "active" : ""}
            aria-label={t.interactPlay}
            title={t.interactPlay}
            onClick={() => triggerInteraction("playing", "wand", { closeMenu: false })}
          >
            <Joystick size={15} />
          </button>
        </div>

        {petMenu ? (
          <div
            className="pet-context-menu"
            style={{ left: petMenu.x, top: petMenu.y, maxHeight: petMenu.maxHeight } as CSSProperties}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="pet-context-head">
              <span>{selectedPet.name}</span>
              <b>{moodStatusLabel(petMood, state.language)}</b>
            </div>

            {timerHasContext ? (
              <div className="pet-context-section timer-quick-section">
                <div className="pet-context-label">{t.menuFocus}</div>
                <div className="context-timer">
                  <div className="context-timer-clock">
                    <span>{secondsToClock(state.pomodoro.remainingSeconds)}</span>
                    <small>{timerStageLabel}</small>
                  </div>
                  <div className="context-timer-actions">
                    <button type="button" onClick={() => pomodoroAction("toggle")}>
                      {state.pomodoro.running ? <Pause size={15} /> : <Play size={15} />}
                      <span>{state.pomodoro.running ? t.pauseTimer : t.startTimer}</span>
                    </button>
                    <button type="button" onClick={() => pomodoroAction("reset")}>
                      <RotateCcw size={15} />
                      <span>{t.resetTimer}</span>
                    </button>
                    <button type="button" onClick={() => pomodoroAction("skip")}>
                      <SkipForward size={15} />
                      <span>{state.pomodoro.mode === "focus" ? t.skipTimer : t.skipBreak}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pet-context-section">
              <div className="pet-context-label">{t.menuCare}</div>
              <div className="context-action-grid">
                <button
                  type="button"
                  className={activeInteraction?.mood === "petting" ? "active" : ""}
                  onClick={() => triggerInteraction("petting", "heart", { closeMenu: false })}
                >
                  <HandHeart size={15} />
                  <span>{t.interactPet}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "feeding" ? "active" : ""}
                  onClick={() => triggerInteraction("feeding", "fish", { closeMenu: false })}
                >
                  <Fish size={15} />
                  <span>{t.interactFeed}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "playing" ? "active" : ""}
                  onClick={() => triggerInteraction("playing", "wand", { closeMenu: false })}
                >
                  <Joystick size={15} />
                  <span>{t.interactPlay}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "cleaning" ? "active" : ""}
                  onClick={() => triggerInteraction("cleaning", "brush", { closeMenu: false })}
                >
                  <BrushCleaning size={15} />
                  <span>{t.interactClean}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "praised" ? "active" : ""}
                  onClick={() => triggerInteraction("praised", "heart", { closeMenu: false })}
                >
                  <Heart size={15} />
                  <span>{t.interactPraise}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "attention_call" ? "active" : ""}
                  onClick={() => triggerInteraction("attention_call", "bell", { closeMenu: false })}
                >
                  <BellRing size={15} />
                  <span>{t.interactCall}</span>
                </button>
              </div>
            </div>

            <div className="care-meter-grid">
              {careMeters.map(([key, label, value]) => (
                <div className={`care-meter care-${key}`} key={key}>
                  <span>{label}</span>
                  <i>
                    <b style={{ width: `${value}%` }} />
                  </i>
                </div>
              ))}
              <div className="care-bond">
                <span>{t.careBond}</span>
                <b>{state.petCare.bond}</b>
              </div>
              <div className="care-bond care-growth">
                <span>{t.careLevel}</span>
                <b>{state.petCare.level}</b>
              </div>
              <div className="care-bond care-growth">
                <span>{t.careCoins}</span>
                <b>{state.petCare.coins}</b>
              </div>
              <div className="care-bond care-growth">
                <span>{t.careStreak}</span>
                <b>{state.petCare.streak}</b>
              </div>
            </div>

            <div className="pet-context-section">
              <div className="pet-context-label">{t.menuSettings}</div>
              <div className="context-settings-grid">
                <button
                  type="button"
                  className={state.alwaysOnTop ? "active" : ""}
                  title={t.top}
                  onClick={() =>
                    setState((current) => ({ ...current, alwaysOnTop: !current.alwaysOnTop }))
                  }
                >
                  <Eye size={15} />
                </button>
                <button
                  type="button"
                  className={state.lowPower ? "active" : ""}
                  title={t.lowPower}
                  onClick={() => setState((current) => ({ ...current, lowPower: !current.lowPower }))}
                >
                  <Gauge size={15} />
                </button>
                <button type="button" title={t.clickThrough} onClick={setClickThroughPreview}>
                  <MousePointer2 size={15} />
                </button>
                <button
                  type="button"
                  title={t.menuOpenControls}
                  onClick={() => {
                    setPetMenu(null);
                    setState((current) => ({ ...current, controlsOpen: true }));
                  }}
                >
                  <Settings2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="status-capsule" title={`${t.compactStatus}: ${moodStatusLabel(petMood, state.language)}`}>
          <span>{moodStatusLabel(petMood, state.language)}</span>
          <b>{timerHasContext ? timerStageLabel : selectedPet.version}</b>
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
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() =>
            setState((current) => ({ ...current, controlsOpen: !current.controlsOpen }))
          }
        >
          <Settings size={16} />
        </button>

        <aside
          className={`control-strip ${state.controlsOpen ? "open" : ""}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="control-strip-head">
            <span>{selectedPet.name}</span>
            <button
              type="button"
              className="control-strip-close"
              aria-label={t.closeControls}
              title={t.closeControls}
              onClick={() => setState((current) => ({ ...current, controlsOpen: false }))}
            >
              <X size={15} />
            </button>
          </div>
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
            <button
              type="button"
              className="pet-current-card"
              aria-label={t.petPack}
              title={t.petPack}
              disabled={selectablePets.length <= 1}
              onClick={() => selectPetByIndex(selectedPetIndex + 1)}
            >
              <span>{selectedPet.name}</span>
              <b>{selectedPet.version}</b>
            </button>
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
              <div className="pet-growth-card">
                <div>
                  <span>{t.careLevel}</span>
                  <b>{state.petCare.level}</b>
                  <i>
                    <em style={{ width: `${levelProgressPercent(state.petCare)}%` }} />
                  </i>
                  <small>
                    {state.petCare.experience}/{levelRequirement(state.petCare.level)} {t.careExperience}
                  </small>
                </div>
                <div>
                  <span>{t.careCoins}</span>
                  <b>{state.petCare.coins}</b>
                  <small>{t.careStreak}: {state.petCare.streak}</small>
                </div>
              </div>
              {activeInteraction ? (
                <div
                  className={`interaction-status interaction-status-${activeInteraction.mood}`}
                  style={{ ["--interaction-duration" as string]: `${activeInteraction.durationMs}ms` }}
                >
                  <b>{moodStatusLabel(activeInteraction.mood, state.language)}</b>
                  <span>{activeInteraction.reaction}</span>
                  <i />
                </div>
              ) : null}
              <div className="interaction-grid">
                <button
                  type="button"
                  className={activeInteraction?.mood === "petting" ? "active" : ""}
                  title={t.interactPet}
                  onClick={() => triggerInteraction("petting", "heart", { closeMenu: false })}
                >
                  <HandHeart size={16} />
                  <span>{t.interactPet}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "feeding" ? "active" : ""}
                  title={t.interactFeed}
                  onClick={() => triggerInteraction("feeding", "fish", { closeMenu: false })}
                >
                  <Fish size={16} />
                  <span>{t.interactFeed}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "playing" ? "active" : ""}
                  title={t.interactPlay}
                  onClick={() => triggerInteraction("playing", "wand", { closeMenu: false })}
                >
                  <Joystick size={16} />
                  <span>{t.interactPlay}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "cleaning" ? "active" : ""}
                  title={t.interactClean}
                  onClick={() => triggerInteraction("cleaning", "brush", { closeMenu: false })}
                >
                  <BrushCleaning size={16} />
                  <span>{t.interactClean}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "praised" ? "active" : ""}
                  title={t.interactPraise}
                  onClick={() => triggerInteraction("praised", "heart", { closeMenu: false })}
                >
                  <Heart size={16} />
                  <span>{t.interactPraise}</span>
                </button>
                <button
                  type="button"
                  className={activeInteraction?.mood === "attention_call" ? "active" : ""}
                  title={t.interactCall}
                  onClick={() => triggerInteraction("attention_call", "bell", { closeMenu: false })}
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
                <small>
                  {t.focusReward}:{" "}
                  {focusRewardLabel(state.pomodoro.completionReview.durationSeconds, state.language)}
                </small>
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
