// Ein Eintrag im Dateibaum der Sidebar.
export type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
};

// Eine Eingabe für einen neuen Eintrag, der noch benannt wird.
// parent = Pfad des Elternordners, "" = oberste Ebene.
export type Draft = { kind: "folder" | "note"; parent: string };

// Was TreeItem und DraftEntry von der Sidebar brauchen.
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
