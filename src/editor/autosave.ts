import type { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Speichert eine Notiz, sobald man `delay` ms lang nicht getippt hat.
export function autosave(
  activePath: () => string | undefined,
  save: (path: string, text: string) => void,
  delay = 500,
) {
  // Ein Timer pro Notiz, damit ein Tab-Wechsel nichts verschluckt.
  const timers = new Map<string, number>();

  return EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const path = activePath();
    if (!path) return;

    // Stand jetzt festhalten. Beim Speichern könnte schon ein anderer Tab offen sein.
    const state: EditorState = update.state;

    clearTimeout(timers.get(path));
    timers.set(
      path,
      setTimeout(() => {
        timers.delete(path);
        save(path, state.doc.toString());
      }, delay),
    );
  });
}