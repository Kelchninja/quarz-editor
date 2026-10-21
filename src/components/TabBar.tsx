import { For, Show } from "solid-js";
import { X } from "lucide-solid";
import "../styles/tabs.css";

type TabBarProps = {
  tabs: string[];
  activePath?: string;
  previewPath?: string;
  onSelect: (path: string) => void;
  onPin?: (path: string) => void;
  onClose: (path: string) => void;
};

/** "folder/note.md" → "note" */
function tabTitle(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function TabBar(props: TabBarProps) {
  return (
    <nav class="tab-bar">
      <img class="app-logo" src="/quarz-no-text.png" alt="Quarz" draggable={false} />

      <For each={props.tabs}>
        {(path) => {
          const active = () => path === props.activePath;
          return (
            <div
              class="tab"
              classList={{ active: active(), preview: path === props.previewPath }}
              title={path}
              onMouseDown={(e) => {
                // Middle click closes, like in browsers.
                if (e.button === 1) {
                  e.preventDefault();
                  props.onClose(path);
                }
              }}
              onClick={() => props.onSelect(path)}
              onDblClick={() => props.onPin?.(path)}
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
                  props.onClose(path);
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
