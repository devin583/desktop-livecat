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
  MousePointer2,
  Pause,
  Play,
  ScrollText,
  RefreshCw,
  RotateCcw,
  SkipForward,
  TimerReset,
} from "lucide-react";
import { Live2DCanvas } from "./Live2DCanvas";
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
  KeyboardStatus,
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

function modeLabel(mode: PomodoroMode) {
  if (mode === "focus") return "Focus";
  if (mode === "longBreak") return "Long break";
  return "Break";
}

function minutesFromSeconds(seconds: number) {
  return Math.floor(seconds / 60);
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
  const [typingRate, setTypingRate] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [dragged, setDragged] = useState(false);
  const pulsesRef = useRef<number[]>([]);

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === state.selectedPetId) ?? pets[0] ?? fallbackPet,
    [pets, state.selectedPetId],
  );

  const registerPulse = useCallback((source = "browser-focus-fallback") => {
    const now = Date.now();
    pulsesRef.current = [...pulsesRef.current.filter((at) => now - at < 2600), now];
    setTypingRate(Math.min(1, pulsesRef.current.length / 16));
    setLastTypingPulse(now);
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
    safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (loaded?.length) setPets(loaded);
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
    const label = `${modeLabel(state.pomodoro.mode)} ${secondsToClock(state.pomodoro.remainingSeconds)}`;
    void safeInvoke("set_tray_status", { tooltip: `Desktop LiveCat - ${label}` });
  }, [state.pomodoro.mode, state.pomodoro.remainingSeconds]);

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
        className={`pet-stage mood-${petMood} renderer-${live2dProbe.renderer} ${
          state.lowPower ? "low-power" : ""
        }`}
        data-tauri-drag-region
        aria-label="Desktop LiveCat stage"
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
          <Live2DCanvas
            look={look}
            mood={petMood}
            onProbe={setLive2dProbe}
            pet={selectedPet}
            typingRate={typingRate}
          />
          <div className="cat" style={{ ["--typing-rate" as string]: typingRate }}>
            <div className="tail" />
            <div className="body">
              <div className="chest" />
              <div className="paw paw-left" />
              <div className="paw paw-right" />
            </div>
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
            <div className="keyboard-prop">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="timer-note">
              <b>{secondsToClock(state.pomodoro.remainingSeconds)}</b>
              <small>{modeLabel(state.pomodoro.mode)}</small>
            </div>
          </div>
        </div>

        <aside className="control-strip">
          <select
            value={selectedPet.id}
            onChange={(event) =>
              setState((current) => ({ ...current, selectedPetId: event.target.value }))
            }
            aria-label="Pet pack"
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
              <span>{selectedPet.has_live2d_model ? "Live2D" : "Binding"}</span>
              <b>{selectedPet.artist_status}</b>
            </div>
          </div>

          <div className="icon-row">
            <button
              type="button"
              aria-label="Toggle always on top"
              title="Toggle always on top"
              className={state.alwaysOnTop ? "active" : ""}
              onClick={() =>
                setState((current) => ({ ...current, alwaysOnTop: !current.alwaysOnTop }))
              }
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              aria-label="Preview click-through"
              title="Preview click-through for 10 seconds"
              className={state.clickThrough ? "active" : ""}
              onClick={setClickThroughPreview}
            >
              <MousePointer2 size={16} />
            </button>
            <button
              type="button"
              aria-label="Keyboard rhythm"
              title={keyboardStatus.message}
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
            <button type="button" aria-label="Reload pets" title="Reload pets" onClick={refreshPets}>
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              aria-label="Open resources"
              title={runtimeInfo?.petRoots.join("\n") || "Open resources"}
              onClick={revealResources}
            >
              <FolderOpen size={16} />
            </button>
            <button
              type="button"
              aria-label="Open current pet"
              title={selectedPet.source}
              onClick={revealCurrentPet}
            >
              <ScrollText size={16} />
            </button>
          </div>

          <div className="icon-row">
            <button
              type="button"
              aria-label="Low power"
              title="Low power"
              className={state.lowPower ? "active" : ""}
              onClick={() => setState((current) => ({ ...current, lowPower: !current.lowPower }))}
            >
              <Gauge size={16} />
            </button>
            <button type="button" aria-label="Resource status" title={live2dProbe.reason}>
              <Info size={16} />
            </button>
            <button
              type="button"
              aria-label="Artist checklist"
              title={selectedPet.artist_checklist ?? "No artist checklist"}
              className={selectedPet.has_artist_checklist ? "active" : ""}
            >
              <BadgeCheck size={16} />
            </button>
          </div>

          <input
            aria-label="Pet scale"
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
              aria-label={state.pomodoro.running ? "Pause timer" : "Start timer"}
              onClick={() => pomodoroAction("toggle")}
            >
              {state.pomodoro.running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" aria-label="Reset timer" onClick={() => pomodoroAction("reset")}>
              <RotateCcw size={16} />
            </button>
            <button type="button" aria-label="Skip timer" onClick={() => pomodoroAction("skip")}>
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
              aria-label="Focus minutes"
              type="number"
              min="1"
              max="180"
              value={state.pomodoro.focusMinutes}
              onChange={(event) => setDuration("focusMinutes", Number(event.currentTarget.value))}
            />
            <input
              aria-label="Break minutes"
              type="number"
              min="1"
              max="90"
              value={state.pomodoro.breakMinutes}
              onChange={(event) => setDuration("breakMinutes", Number(event.currentTarget.value))}
            />
            <input
              aria-label="Long break minutes"
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
              aria-label="Task label"
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
              aria-label="Long break every"
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
              LB
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
              <option value="manual">manual</option>
              <option value="autoBreak">break</option>
              <option value="autoNext">next</option>
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
