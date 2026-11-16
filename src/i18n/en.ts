/** English texts. The reference: every other language must have the same keys. */
export const en = {
  picker: {
    logoAlt: "Quarz logo",
    subtitle: "Choose a folder for your notes.",
    missingTitle: "Last vault not found",
    openTitle: "Open folder as vault",
    openDesc: "Open an existing folder with Markdown notes.",
    openButton: "Open",
    createTitle: "Create new vault",
    createDesc: "Create a new, empty vault in a folder of your choice.",
    createButton: "Create",
    createDialog: "Choose an empty folder for the new vault",
  },
  tabs: {
    close: "Close tab",
  },
  sidebar: {
    newNote: "New note",
    newFolder: "New folder",
    defaultNoteName: "Untitled",
    defaultFolderName: "New folder",
  },
  empty: {
    title: "No note open",
    subtitle: "Pick a note on the left or start a new one.",
    actions: "Quick actions",
    newNote: "Create new note",
    newFolder: "Create new folder",
    openVault: "Open another vault",
    newNoteShortcut: "Ctrl N",
  },
};

export type Dict = typeof en;
