import { onMount, Show } from "solid-js";
import Editor from "./components/Editor";
import TabBar from "./components/TabBar";
import Sidebar from "./components/sidebar/Sidebar";
import { createActions } from "./editor/actions";
import { createTabs } from "./state/tabs";
import { createVaultStore } from "./state/vault";
import "./styles/base.css";

function App() {
  const vault = createVaultStore();
  const tabs = createTabs(vault);
  const actions = createActions(tabs);

  onMount(() => {
    vault.loadVault();
  });

  return (
    <main class="app">
      <TabBar
        tabs={tabs.list()}
        activePath={tabs.activePath()}
        previewPath={tabs.previewPath()}
        onSelect={tabs.open}
        onPin={tabs.pin}
        onClose={tabs.close}
      />
      <div class="app-body">
        <Show when={vault.vault()}>
          {(v) => (
            <Sidebar
              vault={v()}
              activePath={tabs.activePath()}
              onOpen={tabs.open}
              onCreateFolder={vault.newFolder}
              onCreateNote={tabs.newNote}
            />
          )}
        </Show>
        <Editor tabs={tabs} actions={actions} />
      </div>
    </main>
  );
}

export default App;
