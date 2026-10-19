import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import type { VaultStore } from "../state/vault";
import { keybinds } from "./keybinds";

// Ein Befehl der App. Die Taste dazu steht in keybinds.ts.
export type Action = {
  id: string;
  title: string; // für die Command-Palette später
  run: (view: EditorView) => void;
};

// Alle Befehle der App.
export function createActions(store: VaultStore): Action[] {
  return [
    {
      id: "note.save",
      title: "Notiz speichern",
      run: (view) => store.saveNote(view.state.doc.toString()),
    },
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
