use crate::config::vaultregistry::VaultRegistry;
use crate::vault::vault::Vault;
use crate::watcher::watcher::VaultWatcher;
use std::sync::Mutex;

pub struct AppState {
    pub vault: Mutex<Option<Vault>>,
    /// Watches the open vault. Replacing it stops the old one.
    pub watcher: Mutex<Option<VaultWatcher>>,
    pub registry: Mutex<VaultRegistry>,
}
