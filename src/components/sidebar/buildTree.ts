import type { NoteMeta, VaultPath } from "../../bindings";
import type { TreeNode } from "./types";

/** Builds a tree from the flat lists of notes and folders. */
export function buildTree(notes: NoteMeta[], folders: VaultPath[]): TreeNode[] {
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

  // Creates every folder, including empty ones.
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

/** Folders first, then alphabetical ("Note 2" before "Note 10"). */
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
