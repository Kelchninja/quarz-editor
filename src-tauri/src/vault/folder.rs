use crate::vault::entry::{EntryMeta, VaultEntry};
use crate::vault::path::VaultPath;

#[derive(Debug, Clone)]
pub struct Folder {
    pub meta: EntryMeta,
    pub children: Vec<VaultEntry>,
}

impl Folder {
    /// Neuer, leerer Ordner.
    pub fn new(path: VaultPath) -> Self {
        Self {
            meta: EntryMeta::new(path),
            children: Vec::new(),
        }
    }
}
