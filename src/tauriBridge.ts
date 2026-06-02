import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type Event as TauriEvent, type UnlistenFn } from "@tauri-apps/api/event";

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>) {
  if (!isTauri()) return null;

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.warn(`Tauri command failed: ${command}`, error);
    return null;
  }
}

export function safeListen<T>(
  event: string,
  handler: (event: TauriEvent<T>) => void,
): Promise<UnlistenFn | null> {
  if (!isTauri()) return Promise.resolve(null);

  try {
    return listen<T>(event, handler).catch((error) => {
      console.warn(`Tauri listener failed: ${event}`, error);
      return null;
    });
  } catch (error) {
    console.warn(`Tauri listener failed: ${event}`, error);
    return Promise.resolve(null);
  }
}
