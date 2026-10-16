import { createEffect, onCleanup, onMount } from "solid-js";
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { editorTheme, markdownHighlighting } from "../editor/editorTheme";
import { hideHeadingMarks } from "../editor/livePreview";
import { EditorState } from "@codemirror/state";

type EditorProps = {
  doc: string;
};

function Editor(props: EditorProps) {

  // Solid setzt das beim Rendern auf das echte <div>.
  let container!: HTMLDivElement;
  const extensions = [basicSetup, markdown(), editorTheme, markdownHighlighting, hideHeadingMarks];

  onMount(() => {
    const view = new EditorView({parent: container});

    createEffect(() => {
      view.setState(EditorState.create({ doc: props.doc, extensions }));
    });

    onCleanup(() => view.destroy());
  });

  return <div ref={container} class="editor" />;
}

export default Editor;
