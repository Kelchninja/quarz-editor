import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";
import type { Tabs } from "../state/tabs";

/** What an action can reach besides the editor. */
export type ActionContext = {
  tabs: Tabs;
  focusTitle: () => void;
};

type Action = {
  title: string;
  description: string;
  /** "Mod" is Cmd on macOS, Ctrl elsewhere. */
  key?: string;
  /** Return `false` to let CodeMirror handle the key instead. */
  run: (view: EditorView, ctx: ActionContext) => boolean | void;
};

export const actions = {
  "note.save": {
    title: "Save note",
    description: "Saves the currently open note.",
    key: "Mod-s",
    run: (view, { tabs }) => {
      const path = tabs.activePath();
      if (path) tabs.save(path, view.state.doc.toString());
    },
  },
  "note.focusTitle": {
    title: "Go to title",
    description: "Moves the cursor from the first line of the note into the title.",
    key: "ArrowUp",
    run: (view, { focusTitle }) => {
      if (!isOnFirstVisualLine(view)) return false;
      focusTitle();
    },
  },
  "tab.close": {
    title: "Close tab",
    description: "Closes the active tab.",
    key: "Mod-w",
    run: (_view, { tabs }) => {
      const path = tabs.activePath();
      if (path) tabs.close(path);
    },
  },
  // Ctrl instead of Mod: macOS uses Cmd+Tab for switching apps.
  "tab.next": {
    title: "Next tab",
    description: "Switches to the next tab.",
    key: "Ctrl-Tab",
    run: (_view, { tabs }) => tabs.cycle(1),
  },
  "tab.prev": {
    title: "Previous tab",
    description: "Switches to the previous tab.",
    key: "Ctrl-Shift-Tab",
    run: (_view, { tabs }) => tabs.cycle(-1),
  },
} satisfies Record<string, Action>;

/**
 * Prec.highest, so our keys win over CodeMirror's default keys
 * (its own ArrowUp would otherwise run first).
 */
export function actionKeymap(ctx: ActionContext) {
  const bindings = Object.values(actions)
    .filter((action) => action.key)
    .map((action) => ({
      key: action.key,
      // No preventDefault: it would block CodeMirror's ArrowUp when run returns false.
      run: (view: EditorView) => action.run(view, ctx) !== false,
    }));

  return Prec.highest(keymap.of(bindings));
}

/**
 * Returns true if the cursor is empty and in the first visual line of the note.
 * Wrapped lines count as several lines.
 */
function isOnFirstVisualLine(view: EditorView): boolean {
  const { main } = view.state.selection;
  if (!main.empty) return false;
  return view.moveToLineBoundary(main, false, true).head === 0;
}
