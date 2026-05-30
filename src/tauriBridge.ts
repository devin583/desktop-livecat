import { invoke } from "@tauri-apps/api/core";

export async function safeInvoke<T>(command: string, args?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.warn(`Tauri command failed: ${command}`, error);
    return null;
  }
}
