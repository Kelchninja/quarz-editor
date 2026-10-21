import { createEffect, onCleanup, onMount } from "solid-js";
import { EditorView, basicSetup } from "codemirror";
import {
  editorTheme,
  markdownExt,
  markdownHighlighting,
} from "../editor/editorTheme";
import { type Action, actionKeymap } from "../editor/actions";
import type { Tabs } from "../state/tabs";
import {
  collapseOnSelectionFacet,
  livePreviewPlugin,
  editorTheme as liveTheme,
  markdownStylePlugin,
  mathPlugin,
  mouseSelectingField,
} from "codemirror-live-markdown";
import { autosave } from "../editor/autosave";
import { titleKeymap } from "../editor/titleNavigation";
import NoteTitle, { focusAtEnd, titleOf } from "./NoteTitle";

type EditorProps = {
  tabs: Tabs;
  actions?: Action[];
};

function Editor(props: EditorProps) {
  // Solid assigns the real elements on render.
  let container!: HTMLDivElement;
  let titleInput!: HTMLTextAreaElement;
  const extensions = [
    basicSetup,
    markdownExt,
    editorTheme,
    markdownHighlighting,
    collapseOnSelectionFacet.of(true),
    mouseSelectingField,
    livePreviewPlugin,
    markdownStylePlugin,
    liveTheme,
    mathPlugin,
    actionKeymap(props.actions ?? []),
    titleKeymap(() => focusAtEnd(titleInput)),
    autosave(props.tabs.activePath, props.tabs.save),
    // Editing a preview tab pins it.
    EditorView.updateListener.of((update) => {
      const path = props.tabs.activePath();
      if (update.docChanged && path) props.tabs.pin(path);
    }),
  ];

  let view: EditorView | undefined;

  /** Moves the cursor to the start of the note and focuses the editor. */
  function focusEditor() {
    if (!view) return;
    view.dispatch({ selection: { anchor: 0 } });
    view.focus();
  }

  /** Renames the note when the title loses focus; resets the title on failure. */
  async function handleRename(value: string) {
    const path = props.tabs.activePath();
    // Pasted text may contain line breaks, file names must not.
    const name = value.replace(/\s*\n\s*/g, " ").trim();
    if (!path || name === "" || name === titleOf(path)) {
      titleInput.value = titleOf(path);
      return;
    }
    const ok = await props.tabs.rename(path, name);
    if (!ok) titleInput.value = titleOf(path);
  }

  onMount(() => {
    view = new EditorView({ parent: container });
    const { sessions } = props.tabs;
    sessions.attach(view);

    // Drop cached states of closed tabs.
    createEffect(() => {
      sessions.retain(new Set(props.tabs.list()));
    });

    // Show the matching state on every tab switch.
    createEffect(() => {
      const path = props.tabs.activePath();
      sessions.show(path, () => props.tabs.initialText(path ?? ""), extensions);
    });

    onCleanup(() => view?.destroy());
  });

  return (
    <div class="editor-pane">
      <NoteTitle
        ref={titleInput}
        value={titleOf(props.tabs.activePath())}
        onLeave={focusEditor}
        onCommit={handleRename}
      />
      <div ref={container} class="editor" />
    </div>
  );
}

export default Editor;
