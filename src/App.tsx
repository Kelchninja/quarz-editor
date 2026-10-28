import { onMount, Show } from "solid-js";
import Editor from "./components/Editor";
import TabBar from "./components/TabBar";
import VaultPicker from "./components/VaultPicker";
import Sidebar from "./components/sidebar/Sidebar";
import { createTabs } from "./state/tabs";
import { createVaultStore } from "./state/vault";
import "./styles/base.css";

function App() {
  const vault = createVaultStore();
  const tabs = createTabs(vault);

  onMount(() => {
    vault.loadVault();
  });

  // Nothing until the backend answered, otherwise the picker flashes on start.
  return (
    <Show when={vault.loaded()}>
      <Show when={vault.vault()} fallback={<VaultPicker onOpen={vault.openVault} />}>
        {(v) => (
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
              <Sidebar
                vault={v()}
                activePath={tabs.activePath()}
                onOpen={tabs.open}
                onCreateFolder={vault.newFolder}
                onCreateNote={tabs.newNote}
              />
              <Editor tabs={tabs} />
            </div>
          </main>
        )}
      </Show>
    </Show>
  );
}

export default App;
