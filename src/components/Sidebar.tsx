import { createMemo, createSignal, For, Show } from "solid-js";
import { ChevronRight, FolderPlus, Plus } from "lucide-solid";
import type { NoteMeta, VaultMeta } from "../bindings";

type SidebarProps = {
  vault: VaultMeta;
  activePath?: string;
  onOpen: (path: string) => void;
  onNewNote?: () => void;
  onNewFolder?: () => void;
};

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

function Sidebar(props: SidebarProps) {
  const tree = createMemo(() => buildTree(props.vault.notes));
  const [expanded, setExpanded] = createSignal(new Set<string>());

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
          onClick={() => props.onNewFolder?.()}
        >
          <FolderPlus size={16} />
        </button>
      </header>

      <ul class="tree">
        <For each={tree()}>{(node) => <Item node={node} depth={0} />}</For>
      </ul>
    </aside>
  );
}

// Macht aus der flachen Notizliste einen Baum. Ordner entstehen aus den Pfaden.
function buildTree(notes: NoteMeta[]): TreeNode[] {
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
