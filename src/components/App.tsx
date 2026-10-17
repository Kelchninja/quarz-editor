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

  // onMount / onCleanup
  onMount(() => {
    loadVault();
    openNote("goober.md");
  });

  // JSX
  return (
    <main class="app">
      <Show when={vault()}>
        {(v) => (
          <Sidebar vault={v()} activePath={activePath()} onOpen={openNote} />
        )}
      </Show>
      <Editor doc={content()} />
    </main>
  );
}

export default App;
