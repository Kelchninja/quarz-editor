import { onMount, Show } from "solid-js";
import Editor from "./components/Editor";
import Sidebar from "./components/sidebar/Sidebar";
import { createActions } from "./editor/actions";
import { createVaultStore } from "./state/vault";
import "./styles/base.css";

// Nur Layout: Sidebar links, Editor rechts. Die Logik steckt im Store.
function App() {
  const store = createVaultStore();
  const actions = createActions(store);

  onMount(() => {
    store.loadVault();
  });

  return (
    <main class="app">
      <Show when={store.vault()}>
        {(v) => (
          <Sidebar
            vault={v()}
            activePath={store.activePath()}
            onOpen={store.openNote}
            onCreateFolder={store.newFolder}
            onCreateNote={store.newNote}
          />
        )}
      </Show>
      <Editor doc={store.doc()} actions={actions} />
    </main>
  );
}

export default App;
