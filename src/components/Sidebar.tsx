import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { ChevronRight, FolderPlus, Plus } from "lucide-solid";
import type { NoteMeta, VaultMeta, VaultPath } from "../bindings";

type SidebarProps = {
  vault: VaultMeta;
  activePath?: string;
  onOpen: (path: string) => void;
  onNewNote?: () => void;
  onCreateFolder?: (name: string) => void;
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
  // true, solange der Name eines neuen Ordners eingegeben wird.
  const [draftFolder, setDraftFolder] = createSignal(false);

  function toggle(path: string) {
    const next = new Set(expanded());
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpanded(next);
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
          }}
          style={{ "--depth": itemProps.depth }}
          onClick={() =>
            node.isDir ? toggle(node.path) : props.onOpen(node.path)
          }
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
            <For each={node.children}>
              {(child) => <Item node={child} depth={itemProps.depth + 1} />}
            </For>
          </ul>
        </Show>
      </li>
    );
  }

  // Eingabezeile für den Namen eines neuen Ordners, wie im Datei-Explorer.
  function DraftFolder() {
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
      setDraftFolder(false);
      props.onCreateFolder?.(input.value.trim() || "Neuer Ordner");
    }

    function cancel() {
      done = true;
      setDraftFolder(false);
    }

    return (
      <li>
        <div class="tree-row folder" style={{ "--depth": 0 }}>
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
          onClick={() => setDraftFolder(true)}
        >
          <FolderPlus size={16} />
        </button>
      </header>

      <ul class="tree">
        <Show when={draftFolder()}>
          <DraftFolder />
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
