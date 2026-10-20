use crate::vault::{
    entry::{Editable, EntryMeta},
    path::VaultPath,
};
use blake3;

/// BLAKE3 hash of a note's content.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct ContentHash([u8; 32]);

impl ContentHash {
    pub fn of(source: &str) -> Self {
        Self(blake3::hash(source.as_bytes()).into())
    }
}

/// A note in the vault tree, without text.
#[derive(Debug, Clone)]
pub struct Note {
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

/// An opened note with its text. Only exists for open notes.
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

    /// Replaces the text and updates the content hash.
    fn set_source(&mut self, text: String) {
        self.note.hash = ContentHash::of(&text);
        self.source = text;
    }
}
