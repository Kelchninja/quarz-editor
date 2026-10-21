import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import type { Tabs } from "../state/tabs";
import { keybinds } from "./keybinds";

/** An app command. Its key is defined in keybinds.ts. */
export type Action = {
  id: string;
  /** For the command palette later. */
  title: string;
  run: (view: EditorView) => void;
};

export function createActions(tabs: Tabs): Action[] {
  const tabNumbers: Action[] = Array.from({ length: 9 }, (_, i) => ({
    id: `tab.${i + 1}`,
    title: `Zu Tab ${i + 1}`,
    run: () => tabs.activate(i),
  }));

  return [
    {
      id: "note.save",
      title: "Notiz speichern",
      run: (view) => {
        const path = tabs.activePath();
        if (path) tabs.save(path, view.state.doc.toString());
      },
    },
    {
      id: "tab.close",
      title: "Tab schließen",
      run: () => {
        const path = tabs.activePath();
        if (path) tabs.close(path);
      },
    },
    { id: "tab.next", title: "Nächster Tab", run: () => tabs.cycle(1) },
    { id: "tab.prev", title: "Vorheriger Tab", run: () => tabs.cycle(-1) },
    ...tabNumbers,
  ];
}

/**
 * Builds a CodeMirror keymap from the actions.
 * Prec.high, so our keys win over CodeMirror's default keys.
 */
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
