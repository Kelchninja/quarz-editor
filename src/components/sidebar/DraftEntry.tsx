import { onMount, Show } from "solid-js";
import { ChevronRight } from "lucide-solid";
import type { Draft, SidebarState } from "./types";

type DraftEntryProps = {
  draft: Draft;
  depth: number;
  state: SidebarState;
};

// Eingabezeile für den Namen eines neuen Ordners oder einer Notiz,
// wie im Datei-Explorer.
function DraftEntry(props: DraftEntryProps) {
  const { kind, parent } = props.draft;
  const defaultName = kind === "folder" ? "Neuer Ordner" : "Unbenannt";
  let input!: HTMLInputElement;
  let done = false;

  onMount(() => {
    input.focus();
    input.select();
  });

  // Enter und Fokusverlust landen hier. `done` verhindert doppeltes Anlegen,
  // weil nach Enter beim Verschwinden des Felds noch ein blur kommt.
  function commit() {
    if (done) return;
    done = true;
    props.state.closeDraft();
    const name = input.value.trim() || defaultName;
    if (kind === "folder") props.state.createFolder(name, parent);
    else props.state.createNote(name, parent);
  }

  function cancel() {
    done = true;
    props.state.closeDraft();
  }

  return (
    <li>
      <div
        class="tree-row editing"
        classList={{ folder: kind === "folder" }}
        style={{ "--depth": props.depth }}
      >
        <span class="tree-chevron">
          <Show when={kind === "folder"}>
            <ChevronRight size={14} />
          </Show>
        </span>
        <input
          ref={input}
          class="tree-input"
          value={defaultName}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
        />
      </div>
    </li>
  );
}

export default DraftEntry;
