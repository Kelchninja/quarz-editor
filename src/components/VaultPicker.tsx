import { Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Plus, TriangleAlert } from "lucide-solid";
import logo from "../assets/kristall.svg";
import "../styles/picker.css";

type VaultPickerProps = {
  /** Path of the last vault if it could not be opened. Shows a notice. */
  missingPath?: string;
  onOpen: (path: string) => void;
};

/** Start screen when no vault is open. */
function VaultPicker(props: VaultPickerProps) {
  async function pickFolder(title: string) {
    const path = await open({ directory: true, title });
    if (typeof path === "string") props.onOpen(path);
  }

  return (
    <main class="picker">
      <div class="picker-content">
        <header class="picker-header">
          <img class="picker-logo" src={logo} alt="Quarz-Logo" draggable={false} />
          <h1 class="picker-title">Quarz</h1>
          <p class="picker-subtitle">Wähle einen Ordner für deine Notizen.</p>
        </header>

        <Show when={props.missingPath}>
          {(path) => (
            <div class="picker-notice" role="alert">
              <TriangleAlert size={18} class="picker-notice-icon" />
              <div class="picker-notice-text">
                <span class="picker-notice-title">Letzter Vault nicht gefunden</span>
                <span class="picker-notice-path">{path()}</span>
              </div>
            </div>
          )}
        </Show>

        <div class="picker-actions">
          <div class="picker-action">
            <div class="picker-action-text">
              <span class="picker-action-title">Ordner als Vault öffnen</span>
              <span class="picker-action-desc">
                Einen bestehenden Ordner mit Markdown-Notizen öffnen.
              </span>
            </div>
            <button
              class="picker-button primary"
              onClick={() => pickFolder("Ordner als Vault öffnen")}
            >
              <FolderOpen size={16} />
              Öffnen
            </button>
          </div>
          <div class="picker-action">
            <div class="picker-action-text">
              <span class="picker-action-title">Neuen Vault erstellen</span>
              <span class="picker-action-desc">
                Einen neuen, leeren Vault in einem Ordner deiner Wahl anlegen.
              </span>
            </div>
            {/* No Vault::create yet: an empty folder opened as a vault is a new vault. */}
            <button
              class="picker-button"
              onClick={() => pickFolder("Leeren Ordner für den neuen Vault wählen")}
            >
              <Plus size={16} />
              Erstellen
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default VaultPicker;
