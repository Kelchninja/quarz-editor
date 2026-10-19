import { createEffect, onCleanup, onMount } from "solid-js";
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { editorTheme, markdownHighlighting } from "../editor/editorTheme";
import { hideHeadingMarks } from "../editor/livePreview";
import { type Action, actionKeymap } from "../editor/actions";
import type { OpenDoc } from "../state/vault";

type EditorProps = {
  doc?: OpenDoc;
  actions?: Action[];
};

function Editor(props: EditorProps) {
  // Solid setzt das beim Rendern auf das echte <div>.
  let container!: HTMLDivElement;
  const extensions = [
    basicSetup,
    markdown(),
    editorTheme,
    markdownHighlighting,
    hideHeadingMarks,
    actionKeymap(props.actions ?? []),
  ];

  onMount(() => {
    const view = new EditorView({ parent: container });

    // Läuft bei jedem Öffnen einer Notiz, weil doc dann ein neues Objekt ist.
    createEffect(() => {
      const text = props.doc?.text ?? "";
      view.setState(EditorState.create({ doc: text, extensions }));
    });

    onCleanup(() => view.destroy());
  });

  return <div ref={container} class="editor" />;
}

export default Editor;
