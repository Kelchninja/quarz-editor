use crate::vault::{
    entry::{Editable, EntryMeta},
    path::VaultPath,
};
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

/// Eine Notiz im Vault-Baum, ohne Text.
#[derive(Debug, Clone)]
pub struct Note {
    // pub, weil File::meta() in entry.rs darauf zugreift.
    pub meta: EntryMeta,
    hash: ContentHash,
}

impl Note {
    pub fn new(path: VaultPath, hash: ContentHash) -> Self {
        Self {
            meta: EntryMeta::new(path),
            hash,
        }
    }

    pub fn path(&self) -> &VaultPath {
        &self.meta.path
    }

    pub fn hash(&self) -> ContentHash {
        self.hash
    }
}

// NoteDocument

/// Eine geöffnete Notiz mit ihrem Text. Gibt es nur für offene Notizen.
#[derive(Debug, Clone)]
pub struct NoteDocument {
    pub note: Note,
    source: String,
}

impl NoteDocument {
    pub fn new(path: VaultPath, source: String) -> Self {
        let note = Note::new(path, ContentHash::of(&source));
        Self { note, source }
    }
}

impl Editable for NoteDocument {
    fn source(&self) -> &str {
        &self.source
    }

    fn set_source(&mut self, text: String) {
        // Neuer Inhalt, also neuer Hash.
        self.note.hash = ContentHash::of(&text);
        self.source = text;
    }
}
