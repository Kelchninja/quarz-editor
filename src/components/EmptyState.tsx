import { Show } from "solid-js";
import { FilePlus, FolderOpen, FolderPlus } from "lucide-solid";
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
          <h2 class="empty-title">Keine Notiz geöffnet</h2>
          <p class="empty-subtitle">Wähle links eine Notiz oder fang neu an.</p>
        </div>

        <nav class="empty-actions" aria-label="Schnellaktionen">
          <button class="empty-action primary" onClick={() => props.onNewNote()}>
            <FilePlus size={16} class="empty-action-icon" />
            <span class="empty-action-label">Neue Notiz erstellen</span>
            <kbd class="empty-kbd">Strg N</kbd>
          </button>
          <button class="empty-action" onClick={() => props.onNewFolder()}>
            <FolderPlus size={16} class="empty-action-icon" />
            <span class="empty-action-label">Neuen Ordner erstellen</span>
          </button>
          <Show when={props.onOpenVault}>
            <button class="empty-action" onClick={() => props.onOpenVault?.()}>
              <FolderOpen size={16} class="empty-action-icon" />
              <span class="empty-action-label">Anderen Vault öffnen</span>
            </button>
          </Show>
        </nav>
      </div>
    </div>
  );
}

export default EmptyState;
