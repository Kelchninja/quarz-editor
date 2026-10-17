use crate::vault::path::VaultPath;
use blake3;

// ContentHash
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ContentHash([u8; 32]); // blake3

impl ContentHash {
    pub fn of(source: &str) -> Self {
        Self(blake3::hash(source.as_bytes()).into())
    }
}

// Note

pub struct Note {
    path: VaultPath,
    source: String,
    hash: ContentHash,
}

impl Note {
    pub fn new(path: VaultPath, source: String) -> Self {
        let hash = ContentHash::of(&source);
        Self { path, source, hash }
    }
    pub fn path(&self) -> &VaultPath {
        &self.path
    }

    pub fn source(&self) -> &str {
        &self.source
    }

    pub fn hash(&self) -> ContentHash {
        self.hash
    }
}
