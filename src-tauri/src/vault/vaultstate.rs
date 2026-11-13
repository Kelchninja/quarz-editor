use serde::Deserialize;
use serde::Serialize;

use crate::vault::path::VaultPath;

/// Which notes are open in a vault, so they can be restored on the next start.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct VaultState {
    /// Open tabs, in tab order.
    pub open_notes: Vec<VaultPath>,
    /// The note that was active last, `None` if no tab was open.
    pub last_focused_note: Option<VaultPath>,
}
