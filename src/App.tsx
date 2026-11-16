import { Match, onMount, Switch } from "solid-js";
import VaultPicker from "./components/VaultPicker";
import Workspace from "./components/Workspace";
import { pickFolder } from "./dialogs";
import { createTabs } from "./state/tabs";
import { createVaultStore } from "./state/vault";
import "./styles/base.css";

function App() {
  const vault = createVaultStore();
  const tabs = createTabs(vault);

  /** Reopens the saved tabs, if a vault is open. */
  async function restoreTabs() {
    if (vault.vault()) await tabs.restore();
  }

  async function openVault(path: string) {
    // Before the switch, otherwise the backend would save old notes into the new vault.
    await tabs.saveAll();
    await vault.openVault(path);
    await restoreTabs();
  }

  /** Lets the user pick another vault folder and opens it. */
  async function switchVault() {
    const path = await pickFolder("Anderen Vault öffnen");
    if (path) await openVault(path);
  }

  onMount(async () => {
    await vault.loadVault();
    await restoreTabs();
  });

  return (
    <Switch>
      <Match when={vault.vault()}>
        {(meta) => <Workspace vault={meta()} tabs={tabs} onCreateFolder={vault.newFolder} onOpenVault={switchVault} />}
      </Match>
      {/* Only after the backend answered, otherwise the picker flashes on start. */}
      <Match when={vault.loaded()}>
        <VaultPicker onOpen={openVault} />
      </Match>
    </Switch>
  );
}

export default App;
