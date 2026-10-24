use crate::vault::{folder::Folder, note::Note, path::VaultPath};

/// An entry in the vault tree. Holds only lightweight data, no note text.
#[derive(Debug, Clone)]
pub enum TreeEntry {
    Folder(Folder),
    File(FileEntry),
}

#[derive(Debug, Clone)]
pub enum FileEntry {
    Note(Note), // Pdf(Pdf)
}

#[derive(Debug, Clone)]
pub struct EntryMeta {
    pub path: VaultPath,
    pub name: String,
}

pub trait Editable {
    fn source(&self) -> &str;
    fn set_source(&mut self, text: String);
}

impl EntryMeta {
    /// Creates the metadata for `path`.
    ///
    /// `name` is the last segment of the path, e.g. `"goober.md"`.
    pub fn new(path: VaultPath) -> Self {
        let name = path
            .as_str()
            .rsplit('/')
            .next()
            .unwrap_or_default()
            .to_string();
        Self { path, name }
    }
}

impl TreeEntry {
    pub fn meta(&self) -> &EntryMeta {
        match self {
            TreeEntry::Folder(folder) => &folder.meta,
            TreeEntry::File(file) => file.meta(),
        }
    }
}

impl FileEntry {
    pub fn meta(&self) -> &EntryMeta {
        match self {
            FileEntry::Note(note) => &note.meta,
            // File::Pdf(pdf) => &pdf.meta,
            // File::Image(image) => &image.meta,
        }
    }
}
