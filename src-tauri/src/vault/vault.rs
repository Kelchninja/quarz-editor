use walkdir::DirEntry;
use walkdir::WalkDir;

use crate::vault::note::ContentHash;
use crate::vault::path::VaultPath;
use crate::vault::path::VaultPathError;
use std::fs;
use std::{collections::BTreeMap, path::Path, path::PathBuf};

pub struct Vault {
    pub root: PathBuf,
    pub files: BTreeMap<VaultPath, ContentHash>,
}

impl Vault {
    pub fn open(root: PathBuf) -> Result<Self, VaultError> {
        let files = scan(&root)?;
        Ok(Self { root, files })
    }
}

fn is_hidden(entry: &DirEntry) -> bool {
    entry.depth() > 0 && entry.file_name().to_string_lossy().starts_with('.')
}

fn scan(root: &Path) -> Result<BTreeMap<VaultPath, ContentHash>, VaultError> {
    let mut files = BTreeMap::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.map_err(std::io::Error::from)?;

        let is_md = entry.path().extension().is_some_and(|ext| ext == "md");
        if !entry.file_type().is_file() || !is_md {
            continue;
        }

        let text = fs::read_to_string(entry.path())?;
        let path = VaultPath::from_absolute(root, entry.path())?;
        files.insert(path, ContentHash::of(&text));
    }

    Ok(files)
}

#[derive(Debug, thiserror::Error)]
pub enum VaultError {
    #[error("Notiz nicht gefunden: {0}")]
    NotFound(String),

    #[error(transparent)]
    Path(#[from] VaultPathError),

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
