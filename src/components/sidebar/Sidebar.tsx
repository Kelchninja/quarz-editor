import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { FolderPlus, Plus } from "lucide-solid";
import type { VaultMeta } from "../../bindings";
import { buildTree } from "./buildTree";
import DraftEntry from "./DraftEntry";
import TreeItem from "./TreeItem";
import type { Draft, SidebarState } from "./types";
import "../../styles/sidebar.css";

type SidebarProps = {
  vault: VaultMeta;
  activePath?: string;
  onOpen: (path: string) => void;
  // parent = Pfad des Elternordners, "" = oberste Ebene.
  onCreateFolder?: (name: string, parent: string) => void;
  onCreateNote?: (name: string, parent: string) => void;
};

function Sidebar(props: SidebarProps) {
  const tree = createMemo(() =>
    buildTree(props.vault.notes, props.vault.folders),
  );
  const [expanded, setExpanded] = createSignal(new Set<string>());
  // Offene Namenseingabe, null = keine.
  const [draft, setDraft] = createSignal<Draft | null>(null);
  // Zuletzt angeklickter Ordner.
  const [selectedFolder, setSelectedFolder] = createSignal<string>();

  // Klick irgendwo anders hebt die Ordner-Markierung auf.
  // Ausnahmen: Ordnerzeilen und die Buttons oben, damit "Neuer Ordner" sie noch kennt.
  function clearSelection(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest(".tree-row.folder, .icon-button")) {
      setSelectedFolder(undefined);
    }
  }

  onMount(() => document.addEventListener("mousedown", clearSelection));
  onCleanup(() => document.removeEventListener("mousedown", clearSelection));

  function toggle(path: string) {
    const next = new Set(expanded());
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
  }

  // Startet die Eingabe im markierten Ordner und klappt ihn auf.
  function startDraft(kind: Draft["kind"]) {
    const parent = selectedFolder() ?? "";
    if (parent) setExpanded(new Set(expanded()).add(parent));
    setDraft({ kind, parent });
  }

  // Wird an TreeItem und DraftEntry weitergereicht.
  const state: SidebarState = {
    activePath: () => props.activePath,
    expanded,
    toggle,
    selectedFolder,
    selectFolder: setSelectedFolder,
    draft,
    closeDraft: () => setDraft(null),
    openNote: (path) => props.onOpen(path),
    createFolder: (name, parent) => props.onCreateFolder?.(name, parent),
    createNote: (name, parent) => props.onCreateNote?.(name, parent),
  };

  return (
    <aside class="sidebar">
      <header class="sidebar-header">
        <span class="sidebar-title">{props.vault.name}</span>
        <button
          class="icon-button"
          aria-label="Neue Notiz"
          onClick={() => startDraft("note")}
        >
          <Plus size={16} />
        </button>
        <button
          class="icon-button"
          aria-label="Neuer Ordner"
          onClick={() => startDraft("folder")}
        >
          <FolderPlus size={16} />
        </button>
      </header>

      <ul class="tree">
        <Show when={draft()?.parent === "" && draft()}>
          {(d) => <DraftEntry draft={d()} depth={0} state={state} />}
        </Show>
        <For each={tree()}>
          {(node) => <TreeItem node={node} depth={0} state={state} />}
        </For>
      </ul>
    </aside>
  );
}

export default Sidebar;
