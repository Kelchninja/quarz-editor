import { Transaction, type EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/** True if the update only came from outside Quarz, see `sessions.setText`. */
export function isRemote(update: { transactions: readonly Transaction[] }): boolean {
  return update.transactions.every((tr) => tr.annotation(Transaction.remote));
}

/** Saves a note once nothing was typed for `delay` ms. */
export function autosave(
  activePath: () => string | undefined,
  save: (path: string, text: string) => void,
  delay = 500,
) {
  // One timer per note, so a tab switch doesn't drop a save.
  const timers = new Map<string, number>();

  return EditorView.updateListener.of((update) => {
    // The text is already on disk.
    if (!update.docChanged || isRemote(update)) return;
    const path = activePath();
    if (!path) return;

    // Capture now, another tab may be open when the timer fires.
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