import { batch, createSignal } from "solid-js";
import { createSessions } from "../editor/sessions";
import type { VaultStore } from "./vault";

/** Open tabs: which notes are open, and what is in them (via sessions). */
export function createTabs(vault: VaultStore) {
  // signals
  const [list, setList] = createSignal<string[]>([]);
  const [activePath, setActivePath] = createSignal<string>();
  // Replaced on the next open until edited, like in VS Code.
  const [previewPath, setPreviewPath] = createSignal<string>();

  // state
  const sessions = createSessions();
  // Last saved text per tab, to detect unsaved changes.
  const savedText = new Map<string, string>();

  // opening and closing
  async function open(path: string, pinned = false) {
    if (!list().includes(path)) {
      const text = await vault.readNote(path);
      if (text === undefined) return;
      savedText.set(path, text);

      const tabs = list();
      const preview = previewPath();
      const index = preview ? tabs.indexOf(preview) : -1;
      if (index !== -1) {
        savedText.delete(preview!);
        setList(tabs.map((p, i) => (i === index ? path : p)));
      } else {
        setList([...tabs, path]);
      }
      setPreviewPath(pinned ? undefined : path);
    } else if (pinned) {
      pin(path);
    }
    setActivePath(path);
  }

  async function newNote(name: string, parent: string) {
    const path = await vault.newNote(name, parent);
    if (path) open(path, true);
  }

  function pin(path: string) {
    if (previewPath() === path) setPreviewPath(undefined);
  }

  async function close(path: string) {
    await saveIfChanged(path);

    const tabs = list();
    const index = tabs.indexOf(path);
    if (index === -1) return;

    const rest = tabs.filter((p) => p !== path);
    savedText.delete(path);
    if (previewPath() === path) setPreviewPath(undefined);
    setList(rest);
    if (activePath() === path) setActivePath(rest[Math.min(index, rest.length - 1)]);
  }

  // content
  function initialText(path: string): string {
    return savedText.get(path) ?? "";
  }

  async function save(path: string, text: string) {
    if (await vault.saveNote(path, text)) savedText.set(path, text);
  }

  async function saveIfChanged(path: string) {
    const text = sessions.textOf(path);
    if (text !== undefined && text !== savedText.get(path)) await save(path, text);
  }

  /** Renames the note and moves its tab to the new path. Returns false on error. */
  async function rename(path: string, name: string): Promise<boolean> {
    await saveIfChanged(path);
    const newPath = await vault.renameNote(path, name);
    if (!newPath) return false;

    const text = savedText.get(path);
    savedText.delete(path);
    if (text !== undefined) savedText.set(newPath, text);

    // Sessions first, otherwise the editor shows a fresh state for the new path.
    sessions.rename(path, newPath);
    batch(() => {
      setList(list().map((p) => (p === path ? newPath : p)));
      if (previewPath() === path) setPreviewPath(newPath);
      if (activePath() === path) setActivePath(newPath);
    });
    return true;
  }

  // navigation
  function activate(index: number) {
    const path = list()[index];
    if (path) setActivePath(path);
  }

  function cycle(step: 1 | -1) {
    const tabs = list();
    const current = activePath();
    if (tabs.length === 0 || !current) return;
    const index = tabs.indexOf(current);
    setActivePath(tabs[(index + step + tabs.length) % tabs.length]);
  }

  return {
    list,
    activePath,
    previewPath,
    sessions,
    open,
    newNote,
    pin,
    close,
    initialText,
    save,
    rename,
    activate,
    cycle,
  };
}

export type Tabs = ReturnType<typeof createTabs>;
