import { createSignal } from "solid-js";
import { commands, type VaultMeta } from "../bindings";

// Zustand und Logik rund um den Vault. App.tsx erzeugt den Store einmal
// und reicht ihn weiter, statt selbst alles zu machen.
export function createVaultStore() {
  const [vault, setVault] = createSignal<VaultMeta>();
  // Offene Tabs als Pfade, in Reihenfolge der Tab-Leiste.
  const [tabs, setTabs] = createSignal<string[]>([]);
  const [activePath, setActivePath] = createSignal<string>();
  // Vorschau-Tab wie in VS Code: wird beim nächsten Öffnen ersetzt,
  // bis man darin etwas ändert. Höchstens einer.
  const [previewPath, setPreviewPath] = createSignal<string>();
  // Zuletzt gespeicherter bzw. geladener Text pro Tab.
  // Damit weiß closeTab, ob es ungespeicherte Änderungen gibt.
  const savedText = new Map<string, string>();

  async function loadVault() {
    const result = await commands.getVaultMeta();
    if (result.status === "ok") setVault(result.data);
    else console.error("Vault konnte nicht geladen werden:", result.error);
  }

  // Öffnet die Notiz als Vorschau-Tab oder wechselt zu ihrem Tab.
  // Ein bestehender Vorschau-Tab wird dabei ersetzt.
  // `pinned`: gleich als festen Tab öffnen (z. B. bei neuen Notizen).
  async function openNote(path: string, pinned = false) {
    if (!tabs().includes(path)) {
      const result = await commands.openNote(path);
      if (result.status === "error") {
        console.error(`Konnte ${path} nicht öffnen:`, result.error);
        return;
      }
      savedText.set(path, result.data);

      const list = tabs();
      const preview = previewPath();
      const index = preview ? list.indexOf(preview) : -1;
      if (index !== -1) {
        // Vorschau-Tab an derselben Stelle ersetzen.
        savedText.delete(preview!);
        setTabs(list.map((p, i) => (i === index ? path : p)));
      } else {
        setTabs([...list, path]);
      }
      setPreviewPath(pinned ? undefined : path);
    } else if (pinned) {
      pinTab(path);
    }
    setActivePath(path);
  }

  // Macht aus dem Vorschau-Tab einen festen Tab.
  function pinTab(path: string) {
    if (previewPath() === path) setPreviewPath(undefined);
  }

  // Text, mit dem der Editor einen neuen Tab füllt.
  function initialText(path: string): string {
    return savedText.get(path) ?? "";
  }

  async function saveNote(path: string, text: string) {
    const result = await commands.saveNote(text, path);
    if (result.status === "ok") savedText.set(path, text);
    else console.error(`Konnte ${path} nicht speichern:`, result.error);
  }

  // Schließt einen Tab. `text` ist der aktuelle Inhalt aus dem Editor;
  // ist er geändert, wird vorher gespeichert.
  async function closeTab(path: string, text?: string) {
    if (text !== undefined && text !== savedText.get(path)) {
      await saveNote(path, text);
    }

    const list = tabs();
    const index = list.indexOf(path);
    if (index === -1) return;

    const rest = list.filter((p) => p !== path);
    savedText.delete(path);
    if (previewPath() === path) setPreviewPath(undefined);
    setTabs(rest);
    // Wie im Browser: der Tab rechts daneben wird aktiv, sonst der links.
    if (activePath() === path) setActivePath(rest[Math.min(index, rest.length - 1)]);
  }

  // Tab Nummer `index` (0-basiert) aktivieren, falls es ihn gibt.
  function activateTab(index: number) {
    const path = tabs()[index];
    if (path) setActivePath(path);
  }

  // Zum nächsten (+1) oder vorherigen (-1) Tab, am Ende wieder von vorn.
  function cycleTab(step: 1 | -1) {
    const list = tabs();
    const current = activePath();
    if (list.length === 0 || !current) return;
    const index = list.indexOf(current);
    setActivePath(list[(index + step + list.length) % list.length]);
  }

  async function newFolder(name: string, parent: string) {
    const current = vault();
    if (!current) return;

    if (name.includes("/") || name.includes("\\")) {
      console.error(`Ungültiger Ordnername: ${name}`);
      return;
    }

    // Gibt es den Namen schon, wird eine Zahl angehängt.
    const base = parent ? `${parent}/${name}` : name;
    const path = freeName(current.folders, base);
    const result = await commands.createFolder(path);
    if (result.status === "ok") setVault(result.data);
    else console.error(`Ordner ${path} konnte nicht angelegt werden:`, result.error);
  }

  async function newNote(name: string, parent: string) {
    const current = vault();
    if (!current) return;

    if (name.includes("/") || name.includes("\\")) {
      console.error(`Ungültiger Notizname: ${name}`);
      return;
    }

    // ".md" hängen wir selbst an, auch wenn es mit eingetippt wurde.
    const title = name.replace(/\.md$/, "");
    const base = parent ? `${parent}/${title}` : title;
    const taken = current.notes.map((note) => note.path);
    const path = freeName(taken, base, ".md");

    const result = await commands.createNote(path);
    if (result.status === "ok") {
      setVault(result.data);
      // Neue Notizen wie in VS Code gleich als festen Tab.
      openNote(path, true);
    } else {
      console.error(`Notiz ${path} konnte nicht angelegt werden:`, result.error);
    }
  }

  return {
    vault,
    tabs,
    activePath,
    previewPath,
    pinTab,
    loadVault,
    openNote,
    initialText,
    saveNote,
    closeTab,
    activateTab,
    cycleTab,
    newFolder,
    newNote,
  };
}

export type VaultStore = ReturnType<typeof createVaultStore>;

// "Name", sonst "Name 1", "Name 2", … (ext wird hinten angehängt, z. B. ".md")
function freeName(taken: string[], base: string, ext = ""): string {
  const used = new Set(taken);
  if (!used.has(base + ext)) return base + ext;
  let n = 1;
  while (used.has(`${base} ${n}${ext}`)) n++;
  return `${base} ${n}${ext}`;
}
