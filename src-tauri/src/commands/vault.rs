use crate::app::AppState;
use crate::vault::meta::VaultMeta;
use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;

#[tauri::command]
#[specta::specta]
pub async fn open_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    // Schloss nur für den Pfad öffnen, nicht während des Lesens.
    let abs: std::path::PathBuf = {
        let vault = state.vault.lock().map_err(|e| e.to_string())?;
        path.to_absolute(&vault.root)
    };
    let note_content: String = std::fs::read_to_string(abs).map_err(|e| e.to_string())?;
    Ok(note_content)
}

#[tauri::command]
#[specta::specta]
pub async fn get_vault_meta(state: tauri::State<'_, AppState>) -> Result<VaultMeta, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let meta = VaultMeta::of(&vault);
    Ok(meta)
}

#[tauri::command]
#[specta::specta]
pub async fn create_folder(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    vault.create_folder(path).map_err(|e| e.to_string())?;
    Ok(VaultMeta::of(&vault))
}
