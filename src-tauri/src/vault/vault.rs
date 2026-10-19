use walkdir::DirEntry;
use walkdir::WalkDir;

use crate::vault::folder::Folder;
use crate::vault::note::ContentHash;
use crate::vault::note::Note;
use crate::vault::note::NoteDocument;
use crate::vault::path::VaultPath;
use crate::vault::path::VaultPathError;
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

pub struct Vault {
    pub root: PathBuf,
    pub files: BTreeMap<VaultPath, ContentHash>,
    // Alle Ordner, auch leere.
    pub folders: BTreeSet<VaultPath>,
}

impl Vault {
    pub fn open(root: PathBuf) -> Result<Self, VaultError> {
        let (files, folders) = scan(&root)?;
        Ok(Self {
            root,
            files,
            folders,
        })
    }

    // pub fn create(root: PathBuf) -> Result<Self, VaultError> {}
    pub fn create_folder(&mut self, path: VaultPath) -> Result<Folder, VaultError> {
        let abs = path.to_absolute(&self.root);
        fs::create_dir(&abs)?;
        self.folders.insert(path.clone());
        Ok(Folder::new(path))
    }

    pub fn create_note(&mut self, path: VaultPath) -> Result<Note, VaultError> {
        // Ohne .md würde der Scan die Datei beim nächsten Start nicht finden.
        if !path.as_str().ends_with(".md") {
            return Err(VaultError::NotMarkdown(path.to_string()));
        }
        let abs = path.to_absolute(&self.root);
        fs::File::create_new(&abs)?;
        let hash = ContentHash::of("");
        self.files.insert(path.clone(), hash);
        Ok(Note::new(path, hash))
    }

    pub fn save_note(&mut self, content: &str, path: &VaultPath) -> Result<(), VaultError> {
        let hash = self
            .files
            .get_mut(&path)
            .ok_or_else(|| VaultError::NotFound(path.to_string()))?;

        let abs = path.to_absolute(&self.root);
        let tmp = abs.with_extension("md.tmp");
        fs::write(&tmp, content)?;
        fs::rename(&tmp, &abs)?;

        *hash = ContentHash::of(content);
        Ok(())
    }

    pub fn load(&self, path: VaultPath) -> Result<NoteDocument, VaultError> {
        let source = fs::read_to_string(path.to_absolute(&self.root))?;
        Ok(NoteDocument::new(path, source))
    }
}

fn is_hidden(entry: &DirEntry) -> bool {
    entry.depth() > 0 && entry.file_name().to_string_lossy().starts_with('.')
}

type ScanResult = (BTreeMap<VaultPath, ContentHash>, BTreeSet<VaultPath>);

fn scan(root: &Path) -> Result<ScanResult, VaultError> {
    let mut files = BTreeMap::new();
    let mut folders = BTreeSet::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.map_err(std::io::Error::from)?;

        // Tiefe 0 ist der Vault-Ordner selbst.
        if entry.depth() == 0 {
            continue;
        }

        if entry.file_type().is_dir() {
            folders.insert(VaultPath::from_absolute(root, entry.path())?);
            continue;
        }

        let is_md = entry.path().extension().is_some_and(|ext| ext == "md");
        if !entry.file_type().is_file() || !is_md {
            continue;
        }

        let text = fs::read_to_string(entry.path())?;
        let path = VaultPath::from_absolute(root, entry.path())?;
        files.insert(path, ContentHash::of(&text));
    }

    Ok((files, folders))
}

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Notiz nicht gefunden: {0}")]
    NotFound(String),

    #[error("Notizen müssen auf .md enden: {0}")]
    NotMarkdown(String),

    #[error(transparent)]
    Path(#[from] VaultPathError),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
