use crate::app::AppState;
use crate::commands::helper;
use crate::logging::logging::log_err;
use crate::vault::entry::Editable;
use crate::vault::meta::VaultMeta;
use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;
use crate::vault::vaultstate::VaultState;

use std::path::PathBuf;

#[tauri::command]
#[specta::specta]
pub async fn open_vault(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<VaultMeta, String> {
    let new_vault = Vault::open(PathBuf::from(path)).map_err(log_err("open_vault"))?;
    let meta = VaultMeta::of(&new_vault);
    helper::with_registry(&state, |reg| {
        reg.remember(&new_vault.root);
        if let Err(e) = reg.save() {
            log::error!("{e}");
        }
        Ok(())
    })?;
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
        let doc = vault.load(path).map_err(log_err("open_note"))?;
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
        vault.create_folder(path).map_err(log_err("create_folder"))?;
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
        vault.create_note(path).map_err(log_err("create_note"))?;
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
        vault.rename_note(&name, &path).map_err(log_err("rename_note"))?;
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
        vault.save_note(&content, &path).map_err(log_err("save_note"))
    })
}

/// Open tabs of the current vault. Notes that no longer exist are left out.
/// A broken state file is logged and treated as empty.
#[tauri::command]
#[specta::specta]
pub async fn get_vault_state(state: tauri::State<'_, AppState>) -> Result<VaultState, String> {
    helper::with_vault(&state, |vault| {
        let mut vault_state = VaultState::load(&vault.root).unwrap_or_else(|e| {
            log::error!("{e}");
            VaultState::default()
        });
        vault_state.retain_existing(|path| vault.files.contains_key(path));
        Ok(vault_state)
    })
}

#[tauri::command]
#[specta::specta]
pub async fn save_vault_state(
    vault_state: VaultState,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    helper::with_vault(&state, |vault| {
        vault_state
            .save(&vault.root)
            .map_err(log_err("save_vault_state"))
    })
}
