import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import type { VaultStore } from "../state/vault";
import type { Sessions } from "./sessions";
import { keybinds } from "./keybinds";

// Ein Befehl der App. Die Taste dazu steht in keybinds.ts.
export type Action = {
  id: string;
  title: string; // für die Command-Palette später
  run: (view: EditorView) => void;
};

// Alle Befehle der App.
export function createActions(store: VaultStore, sessions: Sessions): Action[] {
  // Mod+1 … Mod+9 springen zu Tab 1 … 9.
  const tabNumbers: Action[] = Array.from({ length: 9 }, (_, i) => ({
    id: `tab.${i + 1}`,
    title: `Zu Tab ${i + 1}`,
    run: () => store.activateTab(i),
  }));

  return [
    {
      id: "note.save",
      title: "Notiz speichern",
      run: (view) => {
        const path = store.activePath();
        if (path) store.saveNote(path, view.state.doc.toString());
      },
    },
    {
      id: "tab.close",
      title: "Tab schließen",
      run: () => {
        const path = store.activePath();
        if (path) store.closeTab(path, sessions.textOf(path));
      },
    },
    { id: "tab.next", title: "Nächster Tab", run: () => store.cycleTab(1) },
    { id: "tab.prev", title: "Vorheriger Tab", run: () => store.cycleTab(-1) },
    ...tabNumbers,
  ];
}

// Baut aus den Actions eine CodeMirror-Keymap.
// Prec.high: unsere Tasten gewinnen gegen die Standard-Tasten von CodeMirror.
export function actionKeymap(actions: Action[]) {
  const bindings = actions
    .filter((action) => keybinds[action.id])
    .map((action) => ({
      key: keybinds[action.id],
      preventDefault: true,
      run: (view: EditorView) => {
        action.run(view);
        return true;
      },
    }));

  return Prec.high(keymap.of(bindings));
}
