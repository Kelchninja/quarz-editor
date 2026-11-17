import { EditorState, Transaction, type Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

/**
 * Cache for tabs: one EditorState (text, cursor, undo history) and scroll position per open note.
 * There is only one EditorView, a tab switch only swaps its state.
 */
export function createSessions() {
  const states = new Map<string, EditorState>();
  const scrolls = new Map<string, number>();
  let view: EditorView | undefined;
  let current: string | undefined;

  function attach(editorView: EditorView) {
    view = editorView;
  }

  /**
   * Stores the current tab's state, then shows `path`.
   * `initialText` is only used if there is no state for `path` yet.
   */
  function show(
    path: string | undefined,
    initialText: () => string,
    extensions: Extension[],
  ) {
    if (!view) return;
    // Already shown, e.g. after rename(). A new state would lose the undo history.
    if (path && path === current) return;

    if (current && current !== path) {
      states.set(current, view.state);
      scrolls.set(current, view.scrollDOM.scrollTop);
    }
    current = path;

    if (!path) {
      view.setState(EditorState.create({ doc: "", extensions }));
      return;
    }

    const state =
      states.get(path) ?? EditorState.create({ doc: initialText(), extensions });
    view.setState(state);

    // Scroll after the redraw, otherwise CodeMirror overwrites it.
    const scroll = scrolls.get(path) ?? 0;
    requestAnimationFrame(() => view?.scrollDOM.scrollTo({ top: scroll }));
  }

  /** Current text of a tab, even if it is not visible. */
  function textOf(path: string): string | undefined {
    if (path === current && view) return view.state.doc.toString();
    return states.get(path)?.doc.toString();
  }

  /**
   * Replaces the whole text of a tab, e.g. after a change outside Quarz.
   * Keeps the undo history. Marked as remote, so autosave and pin ignore it.
   */
  function setText(path: string, text: string) {
    if (path === current && view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        annotations: Transaction.remote.of(true),
      });
      return;
    }
    const state = states.get(path);
    if (state) {
      states.set(
        path,
        state.update({ changes: { from: 0, to: state.doc.length, insert: text } }).state,
      );
    }
  }

  /** Drops the states of closed tabs. */
  function retain(openPaths: Set<string>) {
    for (const path of [...states.keys()]) {
      if (!openPaths.has(path)) {
        states.delete(path);
        scrolls.delete(path);
      }
    }
    if (current && !openPaths.has(current)) current = undefined;
  }

  /** Moves the cached state of `oldPath` to `newPath`, after a rename. */
  function rename(oldPath: string, newPath: string) {
    const state = states.get(oldPath);
    if (state) states.set(newPath, state);
    const scroll = scrolls.get(oldPath);
    if (scroll !== undefined) scrolls.set(newPath, scroll);
    states.delete(oldPath);
    scrolls.delete(oldPath);
    if (current === oldPath) current = newPath;
  }

  return { attach, show, textOf, setText, retain, rename };
}

export type Sessions = ReturnType<typeof createSessions>;
