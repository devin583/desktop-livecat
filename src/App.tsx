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
  Coffee,
  Eye,
  FolderOpen,
  Gauge,
  Info,
  Keyboard,
  Languages,
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
  resetPomodoroDuration,
  secondsToClock,
  shouldAutoRunNext,
} from "./petState";
import { safeInvoke } from "./tauriBridge";
import type {
  AppState,
  AppLanguage,
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
    focus: "专注",
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
    openResources: "打开资源目录",
    installPet: "安装本地资源包",
    installPlaceholder: "路径或描述",
    pauseTimer: "暂停计时",
    petPack: "角色包",
    reloadPets: "重新加载角色",
    resetTimer: "重置计时",
    resourceStatus: "资源状态",
    scale: "角色缩放",
    skipTimer: "跳过计时",
    startTimer: "开始计时",
    task: "任务",
    top: "置顶",
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
    focus: "Focus",
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
    openResources: "Open resources",
    installPet: "Install local pet pack",
    installPlaceholder: "Path or prompt",
    pauseTimer: "Pause timer",
    petPack: "Pet pack",
    reloadPets: "Reload pets",
    resetTimer: "Reset timer",
    resourceStatus: "Resource status",
    scale: "Pet scale",
    skipTimer: "Skip timer",
    startTimer: "Start timer",
    task: "Task",
    top: "Toggle always on top",
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
        const elapsedKey =
          current.pomodoro.mode === "focus" ? "focusSecondsToday" : "breakSecondsToday";
        if (current.pomodoro.remainingSeconds > 1) {
          return {
            ...current,
            pomodoro: {
              ...current.pomodoro,
              remainingSeconds: current.pomodoro.remainingSeconds - 1,
              [elapsedKey]: current.pomodoro[elapsedKey] + 1,
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

        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            mode: nextMode,
            running: shouldAutoRunNext(current.pomodoro, nextMode),
            completedToday,
            focusSessionsInCycle: nextCycle,
            lastCompletedTask: completedFocus
              ? current.pomodoro.currentTask
              : current.pomodoro.lastCompletedTask,
            remainingSeconds: resetPomodoroDuration(current.pomodoro, nextMode),
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
    const label = `${modeLabel(state.pomodoro.mode, state.language)} ${secondsToClock(
      state.pomodoro.remainingSeconds,
    )}`;
    void safeInvoke("set_tray_status", { tooltip: `Desktop LiveCat - ${label}` });
  }, [state.language, state.pomodoro.mode, state.pomodoro.remainingSeconds]);

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
      if (action === "toggle") {
        return {
          ...current,
          pomodoro: { ...current.pomodoro, running: !current.pomodoro.running },
        };
      }

      const skippedFocus = action === "skip" && current.pomodoro.mode === "focus";
      const nextMode =
        action === "skip" ? nextPomodoroMode(current.pomodoro) : current.pomodoro.mode;
      const nextCycle = skippedFocus
        ? nextMode === "longBreak"
          ? 0
          : current.pomodoro.focusSessionsInCycle + 1
        : current.pomodoro.focusSessionsInCycle;

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          mode: nextMode,
          running: false,
          focusSessionsInCycle: nextCycle,
          remainingSeconds: resetPomodoroDuration(current.pomodoro, nextMode),
          completedToday: skippedFocus
            ? current.pomodoro.completedToday + 1
            : current.pomodoro.completedToday,
          lastCompletedTask: skippedFocus
            ? current.pomodoro.currentTask
            : current.pomodoro.lastCompletedTask,
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
        presetId: preset.id,
        focusMinutes: preset.focus,
        breakMinutes: preset.break,
        longBreakMinutes: preset.longBreak,
        mode: "focus",
        running: false,
        remainingSeconds: preset.focus * 60,
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
          remainingSeconds: resetPomodoroDuration(pomodoro),
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
    state.pomodoro.mode === "focus" &&
    state.pomodoro.remainingSeconds <= 60;
  const petMood: PetMood = dragged
    ? "dragged"
    : isTyping
    ? "typing"
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
  const showSpritesheet = shouldRenderSpritesheet(selectedPet, activityState);
  const showLive2DCanvas = selectedPet.render_mode !== "spritesheet";
  const resourceStatusTitle = selectedPet.has_spritesheet
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
                <small>{modeLabel(state.pomodoro.mode, state.language)}</small>
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

          <div className="timer-controls">
            <button
              type="button"
              aria-label={state.pomodoro.running ? t.pauseTimer : t.startTimer}
              onClick={() => pomodoroAction("toggle")}
            >
              {state.pomodoro.running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" aria-label={t.resetTimer} onClick={() => pomodoroAction("reset")}>
              <RotateCcw size={16} />
            </button>
            <button type="button" aria-label={t.skipTimer} onClick={() => pomodoroAction("skip")}>
              <SkipForward size={16} />
            </button>
          </div>

          <div className="preset-row">
            {pomodoroPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={state.pomodoro.presetId === preset.id ? "active" : ""}
                onClick={() => selectPreset(preset)}
              >
                {preset.id === "25-5-15" ? <TimerReset size={14} /> : <Coffee size={14} />}
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
              onChange={(event) => setDuration("focusMinutes", Number(event.currentTarget.value))}
            />
            <input
              aria-label={t.break}
              type="number"
              min="1"
              max="90"
              value={state.pomodoro.breakMinutes}
              onChange={(event) => setDuration("breakMinutes", Number(event.currentTarget.value))}
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

          <div className="duration-row">
            <input
              aria-label={t.task}
              type="text"
              maxLength={80}
              value={state.pomodoro.currentTask}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  pomodoro: { ...current.pomodoro, currentTask: event.currentTarget.value },
                }))
              }
            />
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
          </div>

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
                    autoFlow: event.currentTarget.value as AppState["pomodoro"]["autoFlow"],
                  },
                }))
              }
            >
              <option value="manual">{t.manual}</option>
              <option value="autoBreak">{t.autoBreak}</option>
              <option value="autoNext">{t.autoNext}</option>
            </select>
          </div>

          <div className="stats-row">
            <span>{state.pomodoro.completedToday}</span>
            <span>{minutesFromSeconds(state.pomodoro.focusSecondsToday)}m</span>
            <span>{minutesFromSeconds(state.pomodoro.breakSecondsToday)}m</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
