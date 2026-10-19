import { createSignal } from "solid-js";
import { commands, type VaultMeta } from "../bindings";

// Die geöffnete Notiz. Jedes Öffnen erzeugt ein neues Objekt, damit der
// Editor auch reagiert, wenn zwei Notizen denselben Text haben.
export type OpenDoc = { path: string; text: string };

// Zustand und Logik rund um den Vault. App.tsx erzeugt den Store einmal
// und reicht ihn weiter, statt selbst alles zu machen.
export function createVaultStore() {
  const [vault, setVault] = createSignal<VaultMeta>();
  const [doc, setDoc] = createSignal<OpenDoc>();
  const activePath = () => doc()?.path;

  async function loadVault() {
    const result = await commands.getVaultMeta();
    if (result.status === "ok") setVault(result.data);
    else console.error("Vault konnte nicht geladen werden:", result.error);
  }

  async function openNote(path: string) {
    const result = await commands.openNote(path);
    if (result.status === "ok") setDoc({ path, text: result.data });
    else console.error(`Konnte ${path} nicht öffnen:`, result.error);
  }

  async function saveNote(text: string) {
    const path = activePath();
    if (!path) return;
    const result = await commands.saveNote(text, path);
    if (result.status === "error") {
      console.error(`Konnte ${path} nicht speichern:`, result.error);
    }
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
      openNote(path);
    } else {
      console.error(`Notiz ${path} konnte nicht angelegt werden:`, result.error);
    }
  }

  return {
    vault,
    doc,
    activePath,
    loadVault,
    openNote,
    saveNote,
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
