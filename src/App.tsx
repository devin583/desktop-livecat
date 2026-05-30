import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Coffee,
  Eye,
  Keyboard,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  TimerReset,
} from "lucide-react";
import { probeLive2DRuntime, type Live2DRuntimeProbe } from "./live2dRuntime";
import "./App.css";

type PetPack = {
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

type AppState = {
  selectedPetId: string;
  scale: number;
  clickThrough: boolean;
  alwaysOnTop: boolean;
  pomodoro: {
    mode: "focus" | "break";
    focusMinutes: number;
    breakMinutes: number;
    remainingSeconds: number;
    running: boolean;
    completedToday: number;
    day: string;
  };
};

type KeyboardStatus = {
  supported: boolean;
  backend: string;
  message: string;
};

type TypingPulse = {
  at_ms: number;
  source: string;
};

const fallbackPet: PetPack = {
  id: "livecat-default",
  name: "Mochi Prototype",
  version: "0.1.0",
  artist: "Desktop LiveCat",
  description: "Original round-faced keyboard cat prototype.",
  live2d_model: "model/livecat.model3.json",
  preview: "preview/livecat.svg",
  source: "bundled-fallback",
  tags: ["round", "keyboard", "live2d-ready"],
};

const todayKey = () => new Date().toISOString().slice(0, 10);

const initialState: AppState = {
  selectedPetId: fallbackPet.id,
  scale: 1,
  clickThrough: false,
  alwaysOnTop: true,
  pomodoro: {
    mode: "focus",
    focusMinutes: 25,
    breakMinutes: 5,
    remainingSeconds: 25 * 60,
    running: false,
    completedToday: 0,
    day: todayKey(),
  },
};

async function safeInvoke<T>(command: string, args?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.warn(`Tauri command failed: ${command}`, error);
    return null;
  }
}

function secondsToClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${rest
    .toString()
    .padStart(2, "0")}`;
}

function normalizePomodoro(state: AppState): AppState {
  const day = todayKey();
  if (state.pomodoro.day === day) return state;
  return {
    ...state,
    pomodoro: {
      ...state.pomodoro,
      completedToday: 0,
      day,
    },
  };
}

function usePersistedState() {
  const [state, setState] = useState<AppState>(initialState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    safeInvoke<AppState>("load_state").then((stored) => {
      if (cancelled) return;
      const local = localStorage.getItem("desktop-livecat-state");
      const fallback = local ? (JSON.parse(local) as AppState) : initialState;
      setState(normalizePomodoro(stored ?? fallback));
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
  const [lastTypingPulse, setLastTypingPulse] = useState(0);
  const [typingRate, setTypingRate] = useState(0);
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
    if (source !== keyboardStatus.backend) {
      setKeyboardStatus((current) => ({ ...current, backend: source }));
    }
  }, [keyboardStatus.backend]);

  useEffect(() => {
    safeInvoke<PetPack[]>("list_pet_packs").then((loaded) => {
      if (loaded?.length) setPets(loaded);
    });
  }, []);

  useEffect(() => {
    const modelPath = selectedPet.live2d_model
      ? `/pets/${selectedPet.id}/${selectedPet.live2d_model}`
      : null;
    void probeLive2DRuntime(modelPath).then(setLive2dProbe);
  }, [selectedPet.id, selectedPet.live2d_model]);

  useEffect(() => {
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
  }, [registerPulse]);

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
      const minutes =
        nextMode === "focus" ? current.pomodoro.focusMinutes : current.pomodoro.breakMinutes;

      return {
        ...current,
        pomodoro: {
          ...current.pomodoro,
          mode: nextMode,
          running: false,
          remainingSeconds: minutes * 60,
          completedToday:
            action === "skip" && current.pomodoro.mode === "focus"
              ? current.pomodoro.completedToday + 1
              : current.pomodoro.completedToday,
        },
      };
    });
  };

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

  const isTyping = Date.now() - lastTypingPulse < 1200;
  const petMood = isTyping
    ? "typing"
    : state.pomodoro.running && state.pomodoro.mode === "focus"
      ? "focus"
      : state.pomodoro.mode === "break"
        ? "break"
        : "idle";

  return (
    <main className="pet-app" style={{ ["--pet-scale" as string]: state.scale }}>
      <section
        className={`pet-stage mood-${petMood} renderer-${live2dProbe.renderer}`}
        data-tauri-drag-region
        aria-label="Desktop LiveCat stage"
      >
        <div className="live2d-layer" data-tauri-drag-region>
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
            >
              <Keyboard size={16} />
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
        </aside>
      </section>
    </main>
  );
}

export default App;
