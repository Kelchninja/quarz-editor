use crate::config::vaultregistry::VaultRegistry;
use crate::vault::vault::Vault;
use std::sync::Mutex;

pub struct AppState {
    pub vault: Mutex<Option<Vault>>,
    pub registry: Mutex<VaultRegistry>,
}
