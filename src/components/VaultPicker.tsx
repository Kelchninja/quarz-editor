import { Show } from "solid-js";
import { FolderOpen, Plus, TriangleAlert } from "lucide-solid";
import logo from "../assets/kristall.svg";
import { pickFolder } from "../dialogs";
import { t } from "../i18n";
import "../styles/picker.css";

type VaultPickerProps = {
  /** Path of the last vault if it could not be opened. Shows a notice. */
  missingPath?: string;
  onOpen: (path: string) => void;
};

/** Start screen when no vault is open. */
function VaultPicker(props: VaultPickerProps) {
  async function openFolder(title: string) {
    const path = await pickFolder(title);
    if (path) props.onOpen(path);
  }

  return (
    <main class="picker">
      <div class="picker-content">
        <header class="picker-header">
          <img class="picker-logo" src={logo} alt={t("picker.logoAlt")} draggable={false} />
          <h1 class="picker-title">Quarz</h1>
          <p class="picker-subtitle">{t("picker.subtitle")}</p>
        </header>

        <Show when={props.missingPath}>
          {(path) => (
            <div class="picker-notice" role="alert">
              <TriangleAlert size={18} class="picker-notice-icon" />
              <div class="picker-notice-text">
                <span class="picker-notice-title">{t("picker.missingTitle")}</span>
                <span class="picker-notice-path">{path()}</span>
              </div>
            </div>
          )}
        </Show>

        <div class="picker-actions">
          <div class="picker-action">
            <div class="picker-action-text">
              <span class="picker-action-title">{t("picker.openTitle")}</span>
              <span class="picker-action-desc">{t("picker.openDesc")}</span>
            </div>
            <button
              class="picker-button primary"
              onClick={() => openFolder(t("picker.openTitle"))}
            >
              <FolderOpen size={16} />
              {t("picker.openButton")}
            </button>
          </div>
          <div class="picker-action">
            <div class="picker-action-text">
              <span class="picker-action-title">{t("picker.createTitle")}</span>
              <span class="picker-action-desc">{t("picker.createDesc")}</span>
            </div>
            {/* No Vault::create yet: an empty folder opened as a vault is a new vault. */}
            <button
              class="picker-button"
              onClick={() => openFolder(t("picker.createDialog"))}
            >
              <Plus size={16} />
              {t("picker.createButton")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default VaultPicker;
