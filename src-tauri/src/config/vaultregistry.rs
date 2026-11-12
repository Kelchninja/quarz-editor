use std::fs;
use std::fs::create_dir_all;
use std::io::BufReader;
use std::io::ErrorKind::NotFound;
use std::path::Path;
use std::path::PathBuf;

use super::vaultentry::VaultEntry;
use serde::Deserialize;
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct VaultRegistry {
    #[serde(skip)]
    path: PathBuf,
    pub last_opened: Option<uuid::Uuid>,
    pub vaults: Vec<VaultEntry>,
}

impl VaultRegistry {
    /// Creates an empty registry that is stored at `path`.
    pub fn empty(path: &Path) -> Self {
        Self { path: path.to_path_buf(), ..Default::default() }
    }

    /// Loads the registry from the JSON file at `path`.
    ///
    /// Returns an empty registry if the file does not exist yet (first start).
    /// Remembers `path`, so [`Self::save`] writes back to the same file.
    ///
    /// # Errors
    /// [`VaultRegistryError::Read`] if the file exists but cannot be opened,
    /// [`VaultRegistryError::Parse`] if it is not valid JSON.
    pub fn load(path: &Path) -> Result<Self> {
        let mut reg: Self = match fs::File::open(path) {
            Ok(file) => serde_json::from_reader(BufReader::new(file))
                .map_err(|source| VaultRegistryError::Parse { path: path.into(), source })?,
            Err(e) if e.kind() == NotFound => Self::default(),
            Err(source) => return Err(VaultRegistryError::Read { path: path.into(), source }),
        };
        reg.path = path.to_path_buf();
        Ok(reg)
    }

    /// Writes the registry as JSON to the file it was loaded from and creates missing parent folders.
    ///
    /// Writes to a `.tmp` file first and renames it, so a crash while writing
    /// does not destroy the old file.
    ///
    /// # Errors
    /// [`VaultRegistryError::Write`] if a folder or the file cannot be written,
    /// [`VaultRegistryError::Serialize`] if the registry cannot be turned into JSON.
    pub fn save(&self) -> Result<()> {
        let path = self.path.as_path();
        let write_err = |source: std::io::Error| VaultRegistryError::Write { path: path.into(), source };

        if let Some(dir) = path.parent() {
            create_dir_all(dir).map_err(write_err)?;
        }
        let json = serde_json::to_vec_pretty(self)?;
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, json).map_err(write_err)?;
        fs::rename(&tmp, path).map_err(write_err)
    }

    /// Marks the vault at `path` as last opened.
    ///
    /// Adds a new entry with a fresh id if the vault is not registered yet.
    /// Only changes the registry in memory, call [`Self::save`] afterwards.
    pub fn remember(&mut self, path: &Path) {
        let id = match self.vaults.iter().find(|v| v.path == path) {
            Some(entry) => entry.id,
            None => {
                let entry = VaultEntry {
                    id: Uuid::new_v4(),
                    path: path.to_path_buf(),
                    name: path.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                };
                let id = entry.id;
                self.vaults.push(entry);
                id
            }
        };
        self.last_opened = Some(id);
    }

    /// Returns the entry of the last opened vault, or `None` if there is none.
    pub fn last_vault(&self) -> Option<&VaultEntry> {
        let id = self.last_opened?;
        self.vaults.iter().find(|v| v.id == id)
    }
}

pub type Result<T, E = VaultRegistryError> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum VaultRegistryError {
    // Access to the registry file
    #[error("Cannot read registry file {path}: {source}")]
    Read {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Cannot write registry file {path}: {source}")]
    Write {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Registry file {path} is not valid JSON: {source}")]
    Parse {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },

    #[error("Failed to serialize registry: {0}")]
    Serialize(#[from] serde_json::Error),

    #[error("Cannot determine config directory: {0}")]
    ConfigDir(String),

    #[error("Vault {0} is not registered")]
    VaultNotFound(String),

    #[error("Vault {0} is already registered")]
    VaultAlreadyExists(String),

    #[error("Vault path {0} does not exist or is not a directory")]
    InvalidVaultPath(PathBuf),
}
