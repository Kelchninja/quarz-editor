use crate::vault::entry::{EntryMeta, TreeEntry};
use crate::vault::path::VaultPath;

#[derive(Debug, Clone)]
pub struct Folder {
    pub meta: EntryMeta,
    pub children: Vec<TreeEntry>,
}

impl Folder {
    /// Creates a new, empty folder.
    pub fn new(path: VaultPath) -> Self {
        Self {
            meta: EntryMeta::new(path),
            children: Vec::new(),
        }
    }
}
