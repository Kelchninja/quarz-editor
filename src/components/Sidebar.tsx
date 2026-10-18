import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { ChevronRight, FolderPlus, Plus } from "lucide-solid";
import type { NoteMeta, VaultMeta, VaultPath } from "../bindings";

type SidebarProps = {
  vault: VaultMeta;
  activePath?: string;
  onOpen: (path: string) => void;
  onNewNote?: () => void;
  // parent = Pfad des Elternordners, "" = oberste Ebene.
  onCreateFolder?: (name: string, parent: string) => void;
};

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

function Sidebar(props: SidebarProps) {
  const tree = createMemo(() =>
    buildTree(props.vault.notes, props.vault.folders),
  );
  const [expanded, setExpanded] = createSignal(new Set<string>());
  // Elternordner, in dem gerade ein neuer Ordner benannt wird.
  // null = keine Eingabe offen, "" = oberste Ebene.
  const [draftParent, setDraftParent] = createSignal<string | null>(null);
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
  function startDraftFolder() {
    const parent = selectedFolder() ?? "";
    if (parent) setExpanded(new Set(expanded()).add(parent));
    setDraftParent(parent);
  }

  function Item(itemProps: { node: TreeNode; depth: number }) {
    const node = itemProps.node;
    const isOpen = () => expanded().has(node.path);

    return (
      <li>
        <button
          class="tree-row"
          classList={{
            folder: node.isDir,
            active: !node.isDir && node.path === props.activePath,
            selected: node.isDir && node.path === selectedFolder(),
          }}
          style={{ "--depth": itemProps.depth }}
          onClick={() => {
            if (node.isDir) {
              setSelectedFolder(node.path);
              toggle(node.path);
            } else {
              props.onOpen(node.path);
            }
          }}
        >
          <span class="tree-chevron" classList={{ open: isOpen() }}>
            <Show when={node.isDir}>
              <ChevronRight size={14} />
            </Show>
          </span>
          <span class="tree-name">{node.name}</span>
        </button>

        <Show when={node.isDir && isOpen()}>
          <ul class="tree">
            <Show when={draftParent() === node.path}>
              <DraftFolder parent={node.path} depth={itemProps.depth + 1} />
            </Show>
            <For each={node.children}>
              {(child) => <Item node={child} depth={itemProps.depth + 1} />}
            </For>
          </ul>
        </Show>
      </li>
    );
  }

  // Eingabezeile für den Namen eines neuen Ordners, wie im Datei-Explorer.
  function DraftFolder(draftProps: { parent: string; depth: number }) {
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
      setDraftParent(null);
      props.onCreateFolder?.(
        input.value.trim() || "Neuer Ordner",
        draftProps.parent,
      );
    }

    function cancel() {
      done = true;
      setDraftParent(null);
    }

    return (
      <li>
        <div
          class="tree-row folder editing"
          style={{ "--depth": draftProps.depth }}
        >
          <span class="tree-chevron">
            <ChevronRight size={14} />
          </span>
          <input
            ref={input}
            class="tree-input"
            value="Neuer Ordner"
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

  return (
    <aside class="sidebar">
      <header class="sidebar-header">
        <span class="sidebar-title">{props.vault.name}</span>
        <button
          class="icon-button"
          aria-label="Neue Notiz"
          onClick={() => props.onNewNote?.()}
        >
          <Plus size={16} />
        </button>
        <button
          class="icon-button"
          aria-label="Neuer Ordner"
          onClick={startDraftFolder}
        >
          <FolderPlus size={16} />
        </button>
      </header>

      <ul class="tree">
        <Show when={draftParent() === ""}>
          <DraftFolder parent="" depth={0} />
        </Show>
        <For each={tree()}>{(node) => <Item node={node} depth={0} />}</For>
      </ul>
    </aside>
  );
}

// Macht aus den flachen Listen einen Baum.
function buildTree(notes: NoteMeta[], folders: VaultPath[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode[]>([["", root]]);

  function childrenOf(dirPath: string): TreeNode[] {
    const existing = dirs.get(dirPath);
    if (existing) return existing;

    const slash = dirPath.lastIndexOf("/");
    const node: TreeNode = {
      name: dirPath.slice(slash + 1),
      path: dirPath,
      isDir: true,
      children: [],
    };
    childrenOf(dirPath.slice(0, Math.max(slash, 0))).push(node);
    dirs.set(dirPath, node.children);
    return node.children;
  }

  // Legt jeden Ordner an, auch leere.
  for (const folder of folders) childrenOf(folder);

  for (const note of notes) {
    const slash = note.path.lastIndexOf("/");
    childrenOf(note.path.slice(0, Math.max(slash, 0))).push({
      name: note.title,
      path: note.path,
      isDir: false,
      children: [],
    });
  }

  sortTree(root);
  return root;
}

// Ordner zuerst, dann alphabetisch ("Notiz 2" vor "Notiz 10").
function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) =>
    a.isDir !== b.isDir
      ? a.isDir
        ? -1
        : 1
      : a.name.localeCompare(b.name, "de", { numeric: true }),
  );
  for (const node of nodes) sortTree(node.children);
}

export default Sidebar;
