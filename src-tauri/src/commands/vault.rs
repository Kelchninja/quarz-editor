use crate::app::AppState;
use crate::commands::helper;
use crate::vault::entry::Editable;
use crate::vault::meta::VaultMeta;
use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;

use std::path::PathBuf;

#[tauri::command]
#[specta::specta]
pub async fn open_vault(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    let new_vault = Vault::open(PathBuf::from(path)).map_err(|e| e.to_string())?;
    let meta = VaultMeta::of(&new_vault);
    *state.vault.lock().map_err(|e| e.to_string())? = Some(new_vault);
    Ok(meta)
}

#[tauri::command]
#[specta::specta]
pub async fn open_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    helper::with_vault(&state, |vault| {
        let doc = vault.load(path).map_err(|e| e.to_string())?;
        Ok(doc.source().to_string())
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_vault_meta(
    state: tauri::State<'_, AppState>,
) -> Result<Option<VaultMeta>, String> {
    let guard = state.vault.lock().map_err(|e| e.to_string())?;
    Ok(guard.as_ref().map(VaultMeta::of))
}

#[tauri::command]
#[specta::specta]
pub async fn create_folder(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    helper::with_vault(&state, |vault| {
        vault.create_folder(path).map_err(|e| e.to_string())?;
        Ok(VaultMeta::of(vault))
    })
}

#[tauri::command]
#[specta::specta]
pub async fn create_note(
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    helper::with_vault(&state, |vault| {
        vault.create_note(path).map_err(|e| e.to_string())?;
        Ok(VaultMeta::of(vault))
    })
}

#[tauri::command]
#[specta::specta]
pub async fn rename_note(
    name: String,
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    helper::with_vault(&state, |vault| {
        vault.rename_note(&name, &path).map_err(|e| e.to_string())?;
        Ok(VaultMeta::of(vault))
    })
}

#[tauri::command]
#[specta::specta]
pub async fn save_note(
    content: String,
    path: VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    helper::with_vault(&state, |vault| {
        vault
            .save_note(&content, &path)
            .map_err(|e| e.to_string())
    })
}
