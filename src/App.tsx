import { onMount, Show } from "solid-js";
import Editor from "./components/Editor";
import TabBar from "./components/TabBar";
import Sidebar from "./components/sidebar/Sidebar";
import { createActions } from "./editor/actions";
import { createSessions } from "./editor/sessions";
import { createVaultStore } from "./state/vault";
import "./styles/base.css";

// Nur Layout: oben die Tab-Leiste über die ganze Breite, darunter Sidebar
// und Editor. Die Logik steckt im Store, die Editor-States in den Sessions.
function App() {
  const store = createVaultStore();
  const sessions = createSessions();
  const actions = createActions(store, sessions);

  function closeTab(path: string) {
    store.closeTab(path, sessions.textOf(path));
  }

  onMount(() => {
    store.loadVault();
  });

  return (
    <main class="app">
      <TabBar
        tabs={store.tabs()}
        activePath={store.activePath()}
        previewPath={store.previewPath()}
        onSelect={store.openNote}
        onPin={store.pinTab}
        onClose={closeTab}
        onNew={() => store.newNote("Unbenannt", "")}
      />
      <div class="app-body">
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
        <Editor
          tabs={store.tabs()}
          activePath={store.activePath()}
          initialText={store.initialText}
          sessions={sessions}
          actions={actions}
          onSave={store.saveNote}
          onEdit={store.pinTab}
        />
      </div>
    </main>
  );
}

export default App;
