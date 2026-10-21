type NoteTitleProps = {
  ref?: HTMLTextAreaElement | ((el: HTMLTextAreaElement) => void);
  value: string;
  /** Called on Enter or ArrowDown, to jump into the editor. */
  onLeave: () => void;
  /** Called with the entered text when the title loses focus. */
  onCommit: (value: string) => void;
};

/** Editable note title above the editor, like in Obsidian. */
function NoteTitle(props: NoteTitleProps) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.isComposing) return;
    if (e.key !== "Enter" && e.key !== "ArrowDown") return;
    // Otherwise the key reaches the editor after the focus change.
    e.preventDefault();
    props.onLeave();
  }

  return (
    <textarea
      rows={1}
      ref={props.ref}
      class="note-title"
      value={props.value}
      onKeyDown={onKeyDown}
      onBlur={(e) => props.onCommit(e.currentTarget.value)}
    />
  );
}

/** File name of `path` without folder and ".md". */
export function titleOf(path: string | undefined): string {
  return path?.split("/").pop()?.replace(/\.md$/, "") ?? "";
}

/** Focuses `input` with the cursor at the end of its text. */
export function focusAtEnd(input: HTMLTextAreaElement) {
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

export default NoteTitle;
