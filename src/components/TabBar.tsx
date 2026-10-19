import { For, Show } from "solid-js";
import { Plus, X } from "lucide-solid";
import "../styles/tabs.css";

type TabBarProps = {
  tabs: string[];
  activePath?: string;
  previewPath?: string;
  onSelect: (path: string) => void;
  onPin?: (path: string) => void;
  onClose: (path: string) => void;
  onNew?: () => void;
};

// "Ordner/Notiz.md" → "Notiz"
function tabTitle(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function TabBar(props: TabBarProps) {
  return (
    <nav class="tab-bar">
      {/* Liegt in public/, wird deshalb mit "/" ab der Wurzel geladen. */}
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
                // Mittlere Maustaste schließt, wie im Browser.
                if (e.button === 1) {
                  e.preventDefault();
                  props.onClose(path);
                }
              }}
              onClick={() => props.onSelect(path)}
              // Doppelklick macht einen Vorschau-Tab fest, wie in VS Code.
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
                  // Sonst würde der Klick den Tab zusätzlich auswählen.
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

      <button class="tab-new" aria-label="Neue Notiz" onClick={() => props.onNew?.()}>
        <Plus size={16} />
      </button>
    </nav>
  );
}

export default TabBar;
