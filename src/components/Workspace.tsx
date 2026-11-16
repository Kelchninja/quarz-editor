import { Match, Switch } from "solid-js";
import type { VaultMeta } from "../bindings";
import type { Tabs } from "../state/tabs";
import Editor from "./Editor";
import TabBar from "./TabBar";
import Sidebar, { type SidebarApi } from "./sidebar/Sidebar";
import EmptyState from "./EmptyState";

type WorkspaceProps = {
  vault: VaultMeta;
  tabs: Tabs;
  onCreateFolder: (name: string, parent: string) => void;
  onOpenVault?: () => void;
};

/** Main layout of an open vault: tab bar on top, sidebar and editor below. */
function Workspace(props: WorkspaceProps) {
  let sidebar: SidebarApi | undefined;

  return (
    <main class="app">
      <TabBar tabs={props.tabs} />
      <div class="app-body">
        <Sidebar
          vault={props.vault}
          activePath={props.tabs.activePath()}
          onOpen={props.tabs.open}
          onCreateFolder={props.onCreateFolder}
          onCreateNote={props.tabs.newNote}
          ref={(api) => (sidebar = api)}
        />
        <Switch>
          <Match when={props.tabs.activePath()}>
            <Editor tabs={props.tabs} onNewNote={() => sidebar?.startDraft("note")} />
          </Match>
          <Match when={!props.tabs.activePath()}>
            <EmptyState
              onNewNote={() => sidebar?.startDraft("note")}
              onNewFolder={() => sidebar?.startDraft("folder")}
              onOpenVault={props.onOpenVault}
            />
          </Match>
        </Switch>
      </div>
    </main>
  );
}

export default Workspace;
