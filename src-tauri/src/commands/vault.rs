use crate::app::AppState;
use crate::vault::entry::Editable;
use crate::vault::meta::{NoteMeta, VaultMeta};
use crate::vault::path::VaultPath;

#[tauri::command]
#[specta::specta]
pub async fn open_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let doc = vault.load(path).map_err(|e| e.to_string())?;
    Ok(doc.source().to_string())
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

#[tauri::command]
#[specta::specta]
pub async fn create_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    vault.create_note(path).map_err(|e| e.to_string())?;
    Ok(VaultMeta::of(&vault))
}

#[tauri::command]
#[specta::specta]
pub async fn save_note(
    content: String,
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    vault
        .save_note(&content, &path)
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn change_note_meta(
    meta: NoteMeta,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault = state.vault.lock().map_err(|e| e.to_string())?;
    vault.loa
}
