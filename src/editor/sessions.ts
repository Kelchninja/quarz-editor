import { EditorState, type Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

// Cache für Tabs: pro offener Notiz ein EditorState (Text, Cursor, Undo-Verlauf)
// und die Scroll-Position. Es gibt nur einen EditorView, beim Tab-Wechsel
// wird nur sein State ausgetauscht.
export function createSessions() {
  const states = new Map<string, EditorState>();
  const scrolls = new Map<string, number>();
  let view: EditorView | undefined;
  let current: string | undefined;

  function attach(editorView: EditorView) {
    view = editorView;
  }

  // Merkt sich den Stand des aktuellen Tabs und zeigt dann `path`.
  // `initialText` wird nur gebraucht, wenn es für `path` noch keinen State gibt.
  function show(
    path: string | undefined,
    initialText: () => string,
    extensions: Extension[],
  ) {
    if (!view) return;

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

    // Erst nach dem Neuzeichnen scrollen, sonst überschreibt CodeMirror es.
    const scroll = scrolls.get(path) ?? 0;
    requestAnimationFrame(() => view?.scrollDOM.scrollTo({ top: scroll }));
  }

  // Aktueller Text eines Tabs, auch wenn er gerade nicht sichtbar ist.
  function textOf(path: string): string | undefined {
    if (path === current && view) return view.state.doc.toString();
    return states.get(path)?.doc.toString();
  }

  // Wirft gespeicherte States geschlossener Tabs weg.
  function retain(openPaths: Set<string>) {
    for (const path of [...states.keys()]) {
      if (!openPaths.has(path)) {
        states.delete(path);
        scrolls.delete(path);
      }
    }
    if (current && !openPaths.has(current)) current = undefined;
  }

  return { attach, show, textOf, retain };
}

export type Sessions = ReturnType<typeof createSessions>;
