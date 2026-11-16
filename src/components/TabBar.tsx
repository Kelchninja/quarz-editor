import { For, Show } from "solid-js";
import { X } from "lucide-solid";
import logo from "../assets/kristall-small.svg";
import type { Tabs } from "../state/tabs";
import "../styles/tabs.css";

type TabBarProps = {
  tabs: Tabs;
};

/** "folder/note.md" → "note" */
function tabTitle(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function TabBar(props: TabBarProps) {
  return (
    <nav class="tab-bar">
      <img class="app-logo" src={logo} alt="Quarz" draggable={false} />

      <For each={props.tabs.list()}>
        {(path) => {
          const active = () => path === props.tabs.activePath();
          return (
            <div
              class="tab"
              classList={{ active: active(), preview: path === props.tabs.previewPath() }}
              title={path}
              onMouseDown={(e) => {
                // Middle click closes, like in browsers.
                if (e.button === 1) {
                  e.preventDefault();
                  props.tabs.close(path);
                }
              }}
              onClick={() => props.tabs.open(path)}
              onDblClick={() => props.tabs.pin(path)}
            >
              <Show when={active()}>
                <span class="tab-dot" />
              </Show>
              <span class="tab-title">{tabTitle(path)}</span>
              <button
                class="tab-close"
                aria-label="Tab schließen"
                onClick={(e) => {
                  // Otherwise the click would also select the tab.
                  e.stopPropagation();
                  props.tabs.close(path);
                }}
              >
                <X size={14} />
              </button>
            </div>
          );
        }}
      </For>
    </nav>
  );
}

export default TabBar;
