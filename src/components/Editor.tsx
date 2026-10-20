import { createEffect, onCleanup, onMount } from "solid-js";
import { EditorView, basicSetup } from "codemirror";
import {
  editorTheme,
  markdownExt,
  markdownHighlighting,
} from "../editor/editorTheme";
import { type Action, actionKeymap } from "../editor/actions";
import type { Sessions } from "../editor/sessions";
import {
  collapseOnSelectionFacet,
  livePreviewPlugin,
  editorTheme as liveTheme,
  markdownStylePlugin,
  mouseSelectingField,
} from "codemirror-live-markdown";
import { autosave } from "../editor/autosave";

type EditorProps = {
  tabs: string[];
  activePath?: string;
  // Text für einen Tab, der noch keinen gespeicherten State hat.
  initialText: (path: string) => string;
  sessions: Sessions;
  actions?: Action[];
  onSave: (path: string, text: string) => void;
  // Bei jeder Textänderung, z. B. um einen Vorschau-Tab festzumachen.
  onEdit?: (path: string) => void;
};

function Editor(props: EditorProps) {
  // Solid setzt das beim Rendern auf das echte <div>.
  let container!: HTMLDivElement;
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
    actionKeymap(props.actions ?? []),
    autosave(() => props.activePath, props.onSave),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && props.activePath)
        props.onEdit?.(props.activePath);
    }),
  ];

  onMount(() => {
    const view = new EditorView({ parent: container });
    props.sessions.attach(view);

    // Geschlossene Tabs aus dem Cache werfen.
    createEffect(() => {
      props.sessions.retain(new Set(props.tabs));
    });

    // Bei jedem Tab-Wechsel den passenden State zeigen.
    createEffect(() => {
      const path = props.activePath;
      props.sessions.show(
        path,
        () => props.initialText(path ?? ""),
        extensions,
      );
    });

    onCleanup(() => view.destroy());
  });

  return (
    <>
      <input></input>
      <div ref={container} class="editor" />
    </>
  );
}

export default Editor;
