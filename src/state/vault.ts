import { createSignal } from "solid-js";
import { commands, type VaultMeta } from "../bindings";

/** Vault data and all backend calls for notes and folders. Knows nothing about tabs. */
export function createVaultStore() {
  // signals
  const [vault, setVault] = createSignal<VaultMeta>();

  // vaults
  async function loadVault() {
    const result = await commands.getVaultMeta();
    if (result.status === "ok") setVault(result.data);
    else console.error("Could not load vault:", result.error);
  }

  async function openVault(path: string) {
    const result = await commands.openVault(path);
    if (result.status === "ok") setVault(result.data);
    else console.error("Could not open vault:", result.error);
  }

  // folders
  async function newFolder(name: string, parent: string) {
    const current = vault();
    if (!current) return;

    if (!isValidName(name)) {
      console.error(`Invalid folder name: ${name}`);
      return;
    }

    const base = parent ? `${parent}/${name}` : name;
    const path = freeName(current.folders, base);
    const result = await commands.createFolder(path);
    if (result.status === "ok") setVault(result.data);
    else console.error(`Could not create folder ${path}:`, result.error);
  }

  // notes
  /** Returns the path of the new note, or undefined on error. */
  async function newNote(name: string, parent: string): Promise<string | undefined> {
    const current = vault();
    if (!current) return undefined;

    if (!isValidName(name)) {
      console.error(`Invalid note name: ${name}`);
      return undefined;
    }

    const title = name.replace(/\.md$/, "");
    const base = parent ? `${parent}/${title}` : title;
    const taken = current.notes.map((note) => note.path);
    const path = freeName(taken, base, ".md");

    const result = await commands.createNote(path);
    if (result.status === "error") {
      console.error(`Could not create note ${path}:`, result.error);
      return undefined;
    }
    setVault(result.data);
    return path;
  }

  /** Returns the text of the note, or undefined on error. */
  async function readNote(path: string): Promise<string | undefined> {
    const result = await commands.openNote(path);
    if (result.status === "ok") return result.data;
    console.error(`Could not open ${path}:`, result.error);
    return undefined;
  }

  async function saveNote(path: string, text: string): Promise<boolean> {
    const result = await commands.saveNote(text, path);
    if (result.status === "ok") return true;
    console.error(`Could not save ${path}:`, result.error);
    return false;
  }

  /** Renames the note to `name` (without ".md"). Returns the new path, or undefined on error. */
  async function renameNote(path: string, name: string): Promise<string | undefined> {
    if (!isValidName(name)) {
      console.error(`Invalid note name: ${name}`);
      return undefined;
    }

    const result = await commands.renameNote(name, path);
    if (result.status === "error") {
      console.error(`Could not rename ${path}:`, result.error);
      return undefined;
    }
    setVault(result.data);

    const slash = path.lastIndexOf("/");
    return `${path.slice(0, slash + 1)}${name}.md`;
  }

  return {
    vault,
    loadVault,
    newFolder,
    newNote,
    readNote,
    saveNote,
    renameNote,
  };
}

export type VaultStore = ReturnType<typeof createVaultStore>;

// helpers
function isValidName(name: string): boolean {
  return !name.includes("/") && !name.includes("\\");
}

/** Returns `base + ext`, or `base 1 + ext`, `base 2 + ext`, … if taken. */
function freeName(taken: string[], base: string, ext = ""): string {
  const used = new Set(taken);
  if (!used.has(base + ext)) return base + ext;
  let n = 1;
  while (used.has(`${base} ${n}${ext}`)) n++;
  return `${base} ${n}${ext}`;
}
