//! helper functions for commands/ only

use crate::app::AppState;
use crate::vault::vault::Vault;

pub fn with_vault<T>(
    state: &AppState,
    f: impl FnOnce(&mut Vault) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = state.vault.lock().map_err(|e| e.to_string())?;
    let vault = guard.as_mut().ok_or("No vault open")?;
    f(vault)
}