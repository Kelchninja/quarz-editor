import type { Entry } from "./api";

// Platzhalter, bis get_note_tree in Rust existiert.
export const mockNotes: Entry[] = [
  { path: "Datenbanken", isDir: true },
  { path: "Datenbanken/Normalformen.md", isDir: false },
  { path: "Datenbanken/Vorlesung DB – Woche 4.md", isDir: false },
  { path: "Datenbanken/Datenmodell Shop.md", isDir: false },
  { path: "Internetprogrammierung", isDir: true },
  { path: "Internetprogrammierung/Praktikum – Tutorium.md", isDir: false },
  { path: "Internetprogrammierung/HTTP & REST.md", isDir: false },
  { path: "Projekte", isDir: true },
  { path: "Projekte/quarz-editor.md", isDir: false },
  { path: "Projekte/Archiv", isDir: true },
  { path: "Projekte/Archiv/Altes Projekt.md", isDir: false },
  { path: "Tagesnotizen", isDir: true },
  { path: "Tagesnotizen/2026-10-15.md", isDir: false },
  { path: "Tagesnotizen/2026-10-16.md", isDir: false },
  { path: "Leer", isDir: true },
  { path: "Ideen.md", isDir: false },
  { path: "Leseliste.md", isDir: false },
  { path: "goober.md", isDir: false },
];
