use crate::vault::path::VaultPath;

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
