import { createEffect, onCleanup, onMount } from "solid-js";
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { editorTheme, markdownHighlighting } from "../editor/editorTheme";
import { type Action, actionKeymap } from "../editor/actions";
import type { OpenDoc } from "../state/vault";
import { collapseOnSelectionFacet, livePreviewPlugin, editorTheme as liveTheme, markdownStylePlugin, mouseSelectingField } from "codemirror-live-markdown"

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
    collapseOnSelectionFacet.of(true),
    mouseSelectingField,
    livePreviewPlugin,
    markdownStylePlugin,
    liveTheme,
    actionKeymap(props.actions ?? []),
  ];

  onMount(() => {
    const view = new EditorView({ parent: container });

    createEffect(() => {
      const text = props.doc?.text ?? "";
      view.setState(EditorState.create({ doc: text, extensions }));
    });

    onCleanup(() => view.destroy());
  });

  return <div ref={container} class="editor" />;
}

export default Editor;
