import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Coffee,
  Eye,
  FolderOpen,
  Gauge,
  Keyboard,
  MousePointer2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SkipForward,
  TimerReset,
} from "lucide-react";
import { probeLive2DRuntime, type Live2DRuntimeProbe } from "./live2dRuntime";
import {
  fallbackPet,
  initialState,
  normalizeState,
  resetPomodoroDuration,
  secondsToClock,
} from "./petState";
import { safeInvoke } from "./tauriBridge";
import type { AppState, KeyboardStatus, PetMood, PetPack, RuntimeInfo, TypingPulse } from "./types";
import "./App.css";

function usePersistedState() {
  const [state, setState] = useState<AppState>(initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    safeInvoke<AppState>("load_state").then((stored) => {
      if (cancelled) return;
      const local = localStorage.getItem("desktop-livecat-state");
      const fallback = local ? (JSON.parse(local) as Partial<AppState>) : initialState;
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
    const modelPath = selectedPet.live2d_model
      ? selectedPet.source.includes("/") || selectedPet.source.includes("\\")
        ? convertFileSrc(`${selectedPet.source}/${selectedPet.live2d_model}`)
        : `/pets/${selectedPet.id}/${selectedPet.live2d_model}`
      : null;
    void probeLive2DRuntime(modelPath).then(setLive2dProbe);
  }, [selectedPet.id, selectedPet.live2d_model, selectedPet.source]);

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
        if (current.pomodoro.remainingSeconds > 1) {
          return {
            ...current,
            pomodoro: {
              ...current.pomodoro,
              remainingSeconds: current.pomodoro.remainingSeconds - 1,
            },
          };
        }

        const nextMode = current.pomodoro.mode === "focus" ? "break" : "focus";
        const completedToday =
          current.pomodoro.mode === "focus"
            ? current.pomodoro.completedToday + 1
            : current.pomodoro.completedToday;
        const minutes =
          nextMode === "focus" ? current.pomodoro.focusMinutes : current.pomodoro.breakMinutes;

        return {
          ...current,
          pomodoro: {
            ...current.pomodoro,
            mode: nextMode,
            running: false,
            completedToday,
            remainingSeconds: minutes * 60,
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
    const label = `${state.pomodoro.mode === "focus" ? "Focus" : "Break"} ${secondsToClock(
      state.pomodoro.remainingSeconds,
    )}`;
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

      const nextMode =
        action === "skip"
          ? current.pomodoro.mode === "focus"
            ? "break"
            : "focus"
          : current.pomodoro.mode;

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          mode: nextMode,
          running: false,
          remainingSeconds: resetPomodoroDuration(current.pomodoro, nextMode),
          completedToday:
            action === "skip" && current.pomodoro.mode === "focus"
              ? current.pomodoro.completedToday + 1
              : current.pomodoro.completedToday,
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

  const selectPreset = (focusMinutes: number, breakMinutes: number) => {
    setState((current) => ({
      ...current,
      pomodoro: {
        ...current.pomodoro,
        focusMinutes,
        breakMinutes,
        mode: "focus",
        running: false,
        remainingSeconds: focusMinutes * 60,
      },
    }));
  };

  const setDuration = (field: "focusMinutes" | "breakMinutes", value: number) => {
    const bounded = Math.min(field === "focusMinutes" ? 180 : 90, Math.max(1, Math.round(value)));
    setState((current) => {
      const pomodoro = { ...current.pomodoro, [field]: bounded, running: false };
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
  const petMood: PetMood = dragged
    ? "dragged"
    : isTyping
    ? "typing"
    : state.pomodoro.running && state.pomodoro.mode === "focus"
      ? "focus"
      : state.pomodoro.mode === "break"
        ? "break"
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
          <canvas
            className="live2d-canvas"
            width={640}
            height={720}
            aria-hidden="true"
            title={live2dProbe.reason}
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
              <small>{state.pomodoro.completedToday}</small>
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
              aria-label="Low power"
              title="Low power"
              className={state.lowPower ? "active" : ""}
              onClick={() => setState((current) => ({ ...current, lowPower: !current.lowPower }))}
            >
              <Gauge size={16} />
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
            <button type="button" onClick={() => selectPreset(25, 5)}>
              <TimerReset size={14} />
              25/5
            </button>
            <button type="button" onClick={() => selectPreset(50, 10)}>
              <Coffee size={14} />
              50/10
            </button>
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
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
