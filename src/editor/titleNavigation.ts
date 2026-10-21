import { Prec } from "@codemirror/state";
import { type EditorView, keymap } from "@codemirror/view";

/**
 * Returns `true` if the cursor is empty and in the first visual line of the note.
 * Wrapped lines count as several lines.
 */
export function isOnFirstVisualLine(view: EditorView): boolean {
  const { main } = view.state.selection;
  if (!main.empty) return false;
  return view.moveToLineBoundary(main, false, true).head === 0;
}

/**
 * ArrowUp in the first visual line of the note calls `focusTitle`.
 * Prec.highest, otherwise CodeMirror's own ArrowUp handles the key first.
 */
export function titleKeymap(focusTitle: () => void) {
  return Prec.highest(
    keymap.of([
      {
        key: "ArrowUp",
        run: (view) => {
          if (!isOnFirstVisualLine(view)) return false;
          focusTitle();
          return true;
        },
      },
    ]),
  );
}
