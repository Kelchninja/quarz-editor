use serde::Serialize;

use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;

/// Leichte Sicht auf eine Notiz fürs Frontend, ohne Inhalt.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
    pub path: VaultPath,
    pub title: String,
}

impl NoteMeta {
    pub fn new(path: VaultPath) -> Self {
        // Titel = Dateiname ohne ".md".
        let file_name = path.as_str().rsplit('/').next().unwrap_or_default();
        let title = file_name.strip_suffix(".md").unwrap_or(file_name).to_string();
        Self { path, title }
    }
}

/// Leichte Sicht auf den Vault fürs Frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultMeta {
    pub name: String,
    pub notes: Vec<NoteMeta>,
}

impl VaultMeta {
    pub fn of(vault: &Vault) -> Self {
        let name = vault
            .root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        let notes = vault.files.keys().cloned().map(NoteMeta::new).collect();

        Self { name, notes }
    }
}
