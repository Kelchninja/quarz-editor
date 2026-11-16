use std::path::PathBuf;

use serde::{Serialize, Deserialize};
use crate::vault::path::VaultPath;

#[derive(Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct NoteChanged {
    pub path: VaultPath,
}

#[derive(Clone, Serialize, Deserialize, specta::Type, tauri_specta::Event)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryChanged {
    pub path: PathBuf,
}

