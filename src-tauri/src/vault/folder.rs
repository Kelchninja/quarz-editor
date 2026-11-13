use crate::vault::entry::EntryMeta;
use crate::vault::path::VaultPath;

#[derive(Debug, Clone)]
pub struct Folder {
    pub meta: EntryMeta,
}

impl Folder {
    /// Creates a new folder.
    pub fn new(path: VaultPath) -> Self {
        Self {
            meta: EntryMeta::new(path),
        }
    }
}
