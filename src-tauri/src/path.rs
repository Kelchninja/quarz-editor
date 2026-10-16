use std::fmt;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

/// Pfad relativ zum Vault-Root, immer mit '/' getrennt, immer UTF-8.
/// Kein `.`, `..` oder leeres Segment, kann den Vault also nicht verlassen.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
// Deserialisieren läuft durch `TryFrom`, sonst könnte das Frontend `../..` schicken.
#[serde(try_from = "String")]
pub struct VaultPath(String);

impl VaultPath {
    /// Für Pfade vom Dateisystem (Dateibaum, Watcher).
    /// `root` und `abs` müssen gleich aufgebaut sein, Symlinks werden nicht aufgelöst.
    pub fn from_absolute(root: &Path, abs: &Path) -> Result<Self, VaultPathError> {
        // Komponentenweise: `/vault` ist kein Präfix von `/vault2/a.md`.
        let rel = abs
            .strip_prefix(root)
            .map_err(|_| VaultPathError::OutsideVault)?;

        // Bricht beim ersten Nicht-UTF-8-Segment ab.
        let segments = rel
            .components()
            .map(|c| c.as_os_str().to_str().ok_or(VaultPathError::NotUtf8))
            .collect::<Result<Vec<&str>, _>>()?;

        Self::try_from(segments.join("/"))
    }

    /// Nur im Vault-Service direkt vor `std::fs`-Aufrufen verwenden.
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

    fn try_from(s: String) -> Result<Self, Self::Error> {
        // Leerer String, `/abs`, `a//b` und `a/` ergeben leere Segmente.
        if !s.split('/').all(is_valid_segment) {
            return Err(VaultPathError::Invalid(s));
        }
        Ok(Self(s))
    }
}

/// Genau ein normaler Pfadbestandteil. Lehnt auch `C:` und `a\b` unter Windows ab.
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VaultPathError {
    OutsideVault,
    NotUtf8,
    Invalid(String),
}

impl fmt::Display for VaultPathError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OutsideVault => f.write_str("Pfad liegt außerhalb des Vaults"),
            Self::NotUtf8 => f.write_str("Pfad ist kein gültiges UTF-8"),
            Self::Invalid(p) => write!(f, "ungültiger Vault-Pfad: {p:?}"),
        }
    }
}

impl std::error::Error for VaultPathError {}

/// Unit Tests

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
