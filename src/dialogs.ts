import { open } from "@tauri-apps/plugin-dialog";

/** Opens the system folder dialog. Returns the chosen path, or undefined if cancelled. */
export async function pickFolder(title: string): Promise<string | undefined> {
  const path = await open({ directory: true, title });
  return typeof path === "string" ? path : undefined;
}
