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

/// In-memory index of a vault folder on disk.
///
/// `files` maps every markdown note to its content hash,
/// `folders` contains all folders, including empty ones.
pub struct Vault {
    pub root: PathBuf,
    pub files: BTreeMap<VaultPath, ContentHash>,
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

    /// Creates an empty note at `path`.
    ///
    /// # Errors
    /// [`VaultError::NotMarkdown`] if `path` does not end with `.md`,
    /// otherwise the scan would not find the file on the next start.
    pub fn create_note(&mut self, path: VaultPath) -> Result<Note, VaultError> {
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

    /// Renames the note at `path` to `name` (without `.md`), in the same folder.
    ///
    /// # Errors
    /// [`VaultError::NotAllowed`] for an empty name or one containing `/`,
    /// [`VaultError::AlreadyExists`] if the target exists, since `fs::rename` would overwrite it.
    pub fn rename_note(&mut self, name: &str, path: &VaultPath) -> Result<(), VaultError> {
        if !path.as_str().ends_with(".md") {
            return Err(VaultError::NotMarkdown(path.to_string()));
        }
        if name.is_empty() || name.contains('/') {
            return Err(VaultError::NotAllowed(name.to_string()));
        }

        let file_name = format!("{name}.md");
        let new_path = match path.as_str().rsplit_once('/') {
            Some((parent, _)) => format!("{parent}/{file_name}"),
            None => file_name,
        };
        let new_path =
            VaultPath::try_from(new_path).map_err(|_| VaultError::NotAllowed(name.to_string()))?;

        if new_path == *path {
            return Ok(());
        }

        let hash = *self
            .files
            .get(path)
            .ok_or_else(|| VaultError::NotFound(path.to_string()))?;

        let abs = path.to_absolute(&self.root);
        let new_abs = new_path.to_absolute(&self.root);

        let only_case_changed = new_path.as_str().to_lowercase() == path.as_str().to_lowercase();
        if self.files.contains_key(&new_path) || (new_abs.exists() && !only_case_changed) {
            return Err(VaultError::AlreadyExists(new_path.to_string()));
        }

        fs::rename(&abs, &new_abs)?;

        self.files.remove(path);
        self.files.insert(new_path, hash);
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

/// Walks `root` recursively and collects all markdown notes and folders.
///
/// Hidden entries (starting with `.`) are skipped, `root` itself is not included.
fn scan(root: &Path) -> Result<ScanResult, VaultError> {
    let mut files = BTreeMap::new();
    let mut folders = BTreeSet::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.map_err(std::io::Error::from)?;

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

    #[error("Name is not allowed: {0}")]
    NotAllowed(String),

    #[error("Notiz existiert bereits: {0}")]
    AlreadyExists(String),
}
