use crate::vault::{folder::Folder, note::Note, path::VaultPath};

// enums

/// Ein Eintrag im Vault-Baum. Enthält nur leichte Daten, keinen Notiztext.
#[derive(Debug, Clone)]
pub enum VaultEntry {
    Folder(Folder),
    File(File),
}

#[derive(Debug, Clone)]
pub enum File {
    Note(Note), // Pdf(Pdf)
}

// structs

#[derive(Debug, Clone)]
pub struct EntryMeta {
    pub path: VaultPath,
    pub name: String,
}

// traits
pub trait Editable {
    fn source(&self) -> &str;
    fn set_source(&mut self, text: String);
}

// Implementations

impl EntryMeta {
    /// Name = letzter Teil des Pfads, z. B. "goober.md".
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

impl VaultEntry {
    pub fn meta(&self) -> &EntryMeta {
        match self {
            VaultEntry::Folder(folder) => &folder.meta,
            VaultEntry::File(file) => file.meta(),
        }
    }
}

impl File {
    pub fn meta(&self) -> &EntryMeta {
        match self {
            File::Note(note) => &note.meta,
            // File::Pdf(pdf) => &pdf.meta,
            // File::Image(image) => &image.meta,
        }
    }
}
