import { createSignal, onMount, Show } from "solid-js";
import * as api from "../api";
import { commands, type VaultMeta } from "../bindings";
import Editor from "./Editor";
import "../App.css";
import Sidebar from "./Sidebar";


function App() {
  // signals
  const [content, setContent] = createSignal("");
  const [activePath, setActivePath] = createSignal<string>();
  const [vault, setVault] = createSignal<VaultMeta>();

  // functions
  async function openNote(path: string) {
    setActivePath(path);
    try {
      setContent(await api.openNote(path));
    } catch (error) {
      console.error(`Konnte ${path} nicht öffnen:`, error);
    }
  }

  async function loadVault() {
    const result = await commands.getVaultMeta();
    if (result.status === "ok") setVault(result.data);
    else console.error("Vault konnte nicht geladen werden:", result.error);
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

  // onMount / onCleanup
  onMount(() => {
    loadVault();
  });

  // JSX
  return (
    <main class="app">
      <Show when={vault()}>
        {(v) => (
          <Sidebar
            vault={v()}
            activePath={activePath()}
            onOpen={openNote}
            onCreateFolder={newFolder}
          />
        )}
      </Show>
      <Editor doc={content()} />
    </main>
  );
}

// "Name", sonst "Name 1", "Name 2", …
function freeName(taken: string[], base: string): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 1;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

export default App;
