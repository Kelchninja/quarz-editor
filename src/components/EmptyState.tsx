import { Show } from "solid-js";
import { FilePlus, FolderOpen, FolderPlus } from "lucide-solid";
import { t } from "../i18n";
import "../styles/empty.css";

type EmptyStateProps = {
  onNewNote: () => void;
  onNewFolder: () => void;
  /** Hidden if not given. */
  onOpenVault?: () => void;
};

/** Shown instead of the editor while no tab is open. */
function EmptyState(props: EmptyStateProps) {
  return (
    <div class="empty">
      <div class="empty-content">
        <div class="empty-header">
          <h2 class="empty-title">{t("empty.title")}</h2>
          <p class="empty-subtitle">{t("empty.subtitle")}</p>
        </div>

        <nav class="empty-actions" aria-label={t("empty.actions")}>
          <button class="empty-action primary" onClick={() => props.onNewNote()}>
            <FilePlus size={16} class="empty-action-icon" />
            <span class="empty-action-label">{t("empty.newNote")}</span>
            <kbd class="empty-kbd">{t("empty.newNoteShortcut")}</kbd>
          </button>
          <button class="empty-action" onClick={() => props.onNewFolder()}>
            <FolderPlus size={16} class="empty-action-icon" />
            <span class="empty-action-label">{t("empty.newFolder")}</span>
          </button>
          <Show when={props.onOpenVault}>
            <button class="empty-action" onClick={() => props.onOpenVault?.()}>
              <FolderOpen size={16} class="empty-action-icon" />
              <span class="empty-action-label">{t("empty.openVault")}</span>
            </button>
          </Show>
        </nav>
      </div>
    </div>
  );
}

export default EmptyState;
