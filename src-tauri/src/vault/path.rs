use std::fmt;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Path relative to the vault root, always separated by `/` and always UTF-8.
///
/// Contains no `.`, `..` or empty segments, so it can never leave the vault.
/// Deserialization goes through [`TryFrom`], otherwise the frontend could send `../..`.
#[derive(
    Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, specta::Type,
)]
#[serde(try_from = "String")]
pub struct VaultPath(String);

impl VaultPath {
    /// Creates a vault path from a filesystem path (file tree, watcher).
    ///
    /// `root` and `abs` must be built the same way, symlinks are not resolved.
    ///
    /// # Errors
    /// [`VaultPathError::OutsideVault`] if `abs` is not inside `root`,
    /// [`VaultPathError::NotUtf8`] if a segment is not valid UTF-8.
    pub fn from_absolute(root: &Path, abs: &Path) -> Result<Self, VaultPathError> {
        // Component-wise: `/vault` is not a prefix of `/vault2/a.md`.
        let rel = abs
            .strip_prefix(root)
            .map_err(|_| VaultPathError::OutsideVault)?;

        let segments = rel
            .components()
            .map(|c| c.as_os_str().to_str().ok_or(VaultPathError::NotUtf8))
            .collect::<Result<Vec<&str>, _>>()?;

        Self::try_from(segments.join("/"))
    }

    /// Converts to an absolute filesystem path below `root`.
    ///
    /// Only use inside the vault service, directly before `std::fs` calls.
    pub fn to_absolute(&self, root: &Path) -> PathBuf {
        let mut abs = root.to_path_buf();
        abs.extend(self.0.split('/'));
        abs
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for VaultPath {
    type Error = VaultPathError;

    /// Validates every `/`-separated segment.
    ///
    /// An empty string, `/abs`, `a//b` and `a/` are rejected because they contain empty segments.
    fn try_from(s: String) -> Result<Self, Self::Error> {
        if !s.split('/').all(is_valid_segment) {
            return Err(VaultPathError::Invalid(s));
        }
        Ok(Self(s))
    }
}

/// Returns `true` if `segment` is exactly one normal path component.
///
/// Also rejects `C:` and `a\b` on Windows.
fn is_valid_segment(segment: &str) -> bool {
    let mut components = Path::new(segment).components();
    matches!(
        (components.next(), components.next()),
        (Some(Component::Normal(_)), None)
    )
}

impl fmt::Display for VaultPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum VaultPathError {
    #[error("Pfad liegt außerhalb des Vaults")]
    OutsideVault,

    #[error("Pfad ist kein gültiges UTF-8")]
    NotUtf8,

    #[error("ungültiger Vault-Pfad: {0:?}")]
    Invalid(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vp(s: &str) -> Result<VaultPath, VaultPathError> {
        VaultPath::try_from(s.to_string())
    }

    #[test]
    fn from_absolute_strips_root() {
        let p =
            VaultPath::from_absolute(Path::new("/vault"), Path::new("/vault/projekte/quarz.md"))
                .unwrap();
        assert_eq!(p.as_str(), "projekte/quarz.md");
    }

    #[test]
    fn from_absolute_rejects_outside_and_root() {
        let root = Path::new("/vault");
        assert_eq!(
            VaultPath::from_absolute(root, Path::new("/other/a.md")),
            Err(VaultPathError::OutsideVault)
        );
        assert_eq!(
            VaultPath::from_absolute(root, Path::new("/vault2/a.md")),
            Err(VaultPathError::OutsideVault)
        );
        assert!(VaultPath::from_absolute(root, root).is_err());
    }

    #[test]
    fn roundtrip() {
        let root = Path::new("/vault");
        let abs = Path::new("/vault/a/b.md");
        let p = VaultPath::from_absolute(root, abs).unwrap();
        assert_eq!(p.to_absolute(root), abs);
    }

    #[test]
    fn try_from_rejects_invalid() {
        for bad in [
            "",
            "/abs.md",
            "../x.md",
            "a/../b.md",
            "./a.md",
            "a//b.md",
            "a/",
        ] {
            assert!(vp(bad).is_err(), "sollte abgelehnt werden: {bad:?}");
        }
        assert!(vp("Bücher/Notiz mit Leerzeichen.md").is_ok());
    }

    #[test]
    fn deserialize_validates() {
        assert!(serde_json::from_str::<VaultPath>(r#""a/b.md""#).is_ok());
        assert!(serde_json::from_str::<VaultPath>(r#""../../etc/passwd""#).is_err());
    }

    #[test]
    fn serializes_as_plain_string() {
        let p = vp("a/b.md").unwrap();
        assert_eq!(serde_json::to_string(&p).unwrap(), r#""a/b.md""#);
    }
}
