import { For, Show } from "solid-js";
import { ChevronRight } from "lucide-solid";
import DraftEntry from "./DraftEntry";
import type { SidebarState, TreeNode } from "./types";

type TreeItemProps = {
  node: TreeNode;
  depth: number;
  state: SidebarState;
};

// Eine Zeile im Dateibaum. Ordner enthalten wieder TreeItems.
function TreeItem(props: TreeItemProps) {
  const node = props.node;
  const state = props.state;
  const isOpen = () => state.expanded().has(node.path);

  return (
    <li>
      <button
        class="tree-row"
        classList={{
          folder: node.isDir,
          active: !node.isDir && node.path === state.activePath(),
          selected: node.isDir && node.path === state.selectedFolder(),
        }}
        style={{ "--depth": props.depth }}
        onClick={() => {
          if (node.isDir) {
            state.selectFolder(node.path);
            state.toggle(node.path);
          } else {
            state.openNote(node.path);
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
          <Show when={state.draft()?.parent === node.path && state.draft()}>
            {(d) => <DraftEntry draft={d()} depth={props.depth + 1} state={state} />}
          </Show>
          <For each={node.children}>
            {(child) => <TreeItem node={child} depth={props.depth + 1} state={state} />}
          </For>
        </ul>
      </Show>
    </li>
  );
}

export default TreeItem;
