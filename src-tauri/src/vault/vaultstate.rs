use std::fs;
use std::io::BufReader;
use std::io::ErrorKind::NotFound;
use std::path::{Path, PathBuf};

use serde::Deserialize;
use serde::Serialize;

use crate::vault::path::VaultPath;

/// Hidden folder inside the vault for app data. Skipped by the vault scan.
const STATE_DIR: &str = ".quarz";
const STATE_FILE: &str = "state.json";

/// Workspace of a vault: which notes are open and which one had focus.
///
/// Stored in `<vault>/.quarz/state.json`.
/// `default` lets older files without newer fields still load.
#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase", default)]
pub struct VaultState {
    /// Open tabs, in tab order.
    pub open_notes: Vec<VaultPath>,
    /// The note that was active last, `None` if no tab was open.
    pub last_focused_note: Option<VaultPath>,
}

impl VaultState {
    /// Path of the state file for the vault at `root`.
    pub fn file(root: &Path) -> PathBuf {
        root.join(STATE_DIR).join(STATE_FILE)
    }

    /// Loads the state of the vault at `root`.
    ///
    /// Returns an empty state if the vault has no state file yet.
    ///
    /// # Errors
    /// [`VaultStateError::Read`] if the file exists but cannot be opened,
    /// [`VaultStateError::Parse`] if it is not valid JSON.
    pub fn load(root: &Path) -> Result<Self> {
        let path = Self::file(root);
        let file = match fs::File::open(&path) {
            Ok(f) => f,
            Err(e) if e.kind() == NotFound => return Ok(Self::default()),
            Err(source) => return Err(VaultStateError::Read { path, source }),
        };
        serde_json::from_reader(BufReader::new(file))
            .map_err(|source| VaultStateError::Parse { path, source })
    }

    /// Writes the state to `<root>/.quarz/state.json` and creates the folder if needed.
    ///
    /// Writes to a `.tmp` file first and renames it, so a crash while writing
    /// does not destroy the old file.
    ///
    /// # Errors
    /// [`VaultStateError::Write`] if the folder or the file cannot be written,
    /// [`VaultStateError::Serialize`] if the state cannot be turned into JSON.
    pub fn save(&self, root: &Path) -> Result<()> {
        let path = Self::file(root);
        let write_err = |source: std::io::Error| VaultStateError::Write {
            path: path.clone(),
            source,
        };

        if let Some(dir) = path.parent() {
            fs::create_dir_all(dir).map_err(write_err)?;
        }
        let json = serde_json::to_vec_pretty(self)?;
        let tmp = path.with_extension("json.tmp");
        fs::write(&tmp, json).map_err(write_err)?;
        fs::rename(&tmp, &path).map_err(write_err)
    }

    /// Drops notes for which `exists` returns false, e.g. deleted outside the app.
    ///
    /// If the focused note was dropped, the last open note gets the focus.
    pub fn retain_existing(&mut self, exists: impl Fn(&VaultPath) -> bool) {
        self.open_notes.retain(|p| exists(p));
        let focus_is_open = self
            .last_focused_note
            .as_ref()
            .is_some_and(|p| self.open_notes.contains(p));
        if !focus_is_open {
            self.last_focused_note = self.open_notes.last().cloned();
        }
    }
}

pub type Result<T, E = VaultStateError> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub enum VaultStateError {
    #[error("Cannot read vault state {path}: {source}")]
    Read {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Cannot write vault state {path}: {source}")]
    Write {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    #[error("Vault state {path} is not valid JSON: {source}")]
    Parse {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },

    #[error("Failed to serialize vault state: {0}")]
    Serialize(#[from] serde_json::Error),
}
