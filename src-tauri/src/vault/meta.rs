use serde::Serialize;

use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;

/// Lightweight view of a note for the frontend, without content.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
    pub path: VaultPath,
    pub title: String,
}

impl NoteMeta {
    /// Creates the metadata for `path`.
    ///
    /// `title` is the file name without `.md`.
    pub fn new(path: VaultPath) -> Self {
        let file_name = path.as_str().rsplit('/').next().unwrap_or_default();
        let title = file_name
            .strip_suffix(".md")
            .unwrap_or(file_name)
            .to_string();
        Self { path, title }
    }
}

/// Lightweight view of the vault for the frontend.
#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct VaultMeta {
    pub name: String,
    pub notes: Vec<NoteMeta>,
    pub folders: Vec<VaultPath>,
}

impl VaultMeta {
    pub fn of(vault: &Vault) -> Self {
        let name = vault
            .root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        let notes = vault.files.keys().cloned().map(NoteMeta::new).collect();
        let folders = vault.folders.iter().cloned().collect();

        Self {
            name,
            notes,
            folders,
        }
    }
}
