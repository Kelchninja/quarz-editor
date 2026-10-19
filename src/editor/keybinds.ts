// Schlüssel ist die id einer Action aus actions.ts.
// "Mod" = Cmd auf macOS, Strg sonst.
export const keybinds: Record<string, string> = {
  "note.save": "Mod-s",

  "tab.close": "Mod-w",
  // Ctrl statt Mod: Cmd+Tab gehört unter macOS dem System (App-Wechsel).
  "tab.next": "Ctrl-Tab",
  "tab.prev": "Ctrl-Shift-Tab",
  "tab.1": "Mod-1",
  "tab.2": "Mod-2",
  "tab.3": "Mod-3",
  "tab.4": "Mod-4",
  "tab.5": "Mod-5",
  "tab.6": "Mod-6",
  "tab.7": "Mod-7",
  "tab.8": "Mod-8",
  "tab.9": "Mod-9",
};
