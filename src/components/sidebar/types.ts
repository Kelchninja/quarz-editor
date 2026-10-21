/** An entry in the sidebar's file tree. */
export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

/** A new entry that is still being named. `parent` is the folder path, "" for the top level. */
export type Draft = { kind: "folder" | "note"; parent: string };

/** What TreeItem and DraftEntry need from the sidebar. */
export type SidebarState = {
  activePath: () => string | undefined;
  expanded: () => Set<string>;
  toggle: (path: string) => void;
  selectedFolder: () => string | undefined;
  selectFolder: (path: string) => void;
  draft: () => Draft | null;
  closeDraft: () => void;
  openNote: (path: string) => void;
  createFolder: (name: string, parent: string) => void;
  createNote: (name: string, parent: string) => void;
};
