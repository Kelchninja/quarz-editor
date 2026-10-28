use super::vaultentry::VaultEntry;
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct VaultRegistry {
    pub last_opened: Option<String>,
    pub vaults: Vec<VaultEntry>,
}

