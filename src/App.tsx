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
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Coffee,
  Eye,
  FolderOpen,
  Gauge,
  Info,
  Keyboard,
  Languages,
  ListChecks,
  MousePointer2,
  Pause,
  Play,
  Plus,
  ScrollText,
  Sparkles,
  RefreshCw,
  RotateCcw,
  Settings,
  SkipForward,
  TimerReset,
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
    reloadPets: "重新加载角色",
    resetTimer: "重置计时",
    resourceStatus: "资源状态",
    scale: "角色缩放",
    sevenDays: "7 天",
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
    reloadPets: "Reload pets",
    resetTimer: "Reset timer",
    resourceStatus: "Resource status",
    scale: "Pet scale",
    sevenDays: "7d",
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
  if (mood === "typing") return "typing";
  if (mood === "focus" || mood === "focusEnding") return "focus";
  if (mood === "break" || mood === "longBreak") return "break";
  if (mood === "happy") return "happy";
  if (mood === "dragged") return "dragged";
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
  const [dragged, setDragged] = useState(false);
  const [installInput, setInstallInput] = useState("");
  const [installStatus, setInstallStatus] = useState("");
  const pulsesRef = useRef<number[]>([]);
  const t = copy[state.language];

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === state.selectedPetId) ?? pets[0] ?? fallbackPet,
    [pets, state.selectedPetId],
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

  useEffect(() => {
    safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (loaded?.length) setPets(loaded);
    });
    safeInvoke<RuntimeInfo>("runtime_info").then((info) => {
      if (info) setRuntimeInfo(info);
    });
  }, []);

  const refreshPets = useCallback(() => {
    return safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (loaded?.length) setPets(loaded);
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

  useEffect(() => {
    const listeners = [
      listen("tray://timer-toggle", () => pomodoroAction("toggle")),
      listen("tray://timer-reset", () => pomodoroAction("reset")),
      listen("tray://timer-skip", () => pomodoroAction("skip")),
      listen("tray://reload-pets", refreshPets),
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
  }, [refreshPets]);

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

  const updateLook = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    setLook({
      x: Math.max(-1, Math.min(1, x)),
      y: Math.max(-1, Math.min(1, y)),
    });
  };

  const isTyping = Date.now() - lastTypingPulse < 1200;
  const activeTapSide = Date.now() - lastTypingPulse < 170 ? lastTapSide : null;
  const focusEnding =
    state.pomodoro.running &&
    state.pomodoro.focusMode === "pomo" &&
    state.pomodoro.mode === "focus" &&
    state.pomodoro.remainingSeconds <= 60;
  const petMood: PetMood = dragged
    ? "dragged"
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
        </div>

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
          <select
            value={selectedPet.id}
            onChange={(event) =>
              setState((current) => ({ ...current, selectedPetId: event.target.value }))
            }
            aria-label={t.petPack}
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>

          <div className="pet-meta" title={selectedPet.description || selectedPet.name}>
            <div>
              <span>{selectedPet.artist}</span>
              <b>{selectedPet.version}</b>
            </div>
            <div>
              <span>{rendererLabel(selectedPet, state.language)}</span>
              <b>{artistStatusLabel(selectedPet.artist_status, state.language)}</b>
            </div>
          </div>

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
        </aside>
      </section>
    </main>
  );
}

export default App;
