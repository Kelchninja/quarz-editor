use crate::app::AppState;
use crate::vault::meta::VaultMeta;
use crate::vault::path::VaultPath;

#[tauri::command]
#[specta::specta]
pub async fn open_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let abs: std::path::PathBuf = path.to_absolute(&state.vault.root);
    let note_content: String = std::fs::read_to_string(abs).map_err(|e| e.to_string())?;
    Ok(note_content)
}

#[tauri::command]
#[specta::specta]
pub async fn get_vault_meta(state: tauri::State<'_, AppState>) -> Result<VaultMeta, String> {
    let meta = VaultMeta::of(&state.vault);
    Ok(meta)
}
