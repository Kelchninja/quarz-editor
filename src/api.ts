import { invoke } from "@tauri-apps/api/core";

// Alle Aufrufe ans Rust-Backend an einer Stelle.
export const openNote = (path: string) => invoke<string>("open_note", { path });
