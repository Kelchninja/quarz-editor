import { invoke } from "@tauri-apps/api/core";

// Typen
export type Entry = {
    path: string;
    isDir: boolean;
}

// Alle Aufrufe ans Rust-Backend an einer Stelle.
export const openNote = (path: string) => invoke<string>("open_note", { path });
export const getNoteTree = () => invoke<Entry[]>("get_note_tree");
