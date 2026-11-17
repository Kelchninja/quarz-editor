use std::collections::BTreeSet;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::time::Duration;

use notify_debouncer_full::notify::{self, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    new_debouncer, DebounceEventResult, DebouncedEvent, Debouncer, RecommendedCache,
};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use crate::app::AppState;
use crate::events::vault::NoteChanged;
use crate::vault::note::ContentHash;
use crate::vault::path::VaultPath;
use crate::vault::vault::Vault;

/// Watches a vault folder as long as it lives. Dropping it stops watching.
pub type VaultWatcher = Debouncer<RecommendedWatcher, RecommendedCache>;

/// Starts watching `root` recursively.
///
/// Changes are applied to the vault index in [`AppState`] and sent to the frontend as events.
pub fn watch(app: AppHandle, root: PathBuf) -> notify::Result<VaultWatcher> {
    let watch_root = root.clone();
    let mut debouncer = new_debouncer(
        Duration::from_millis(300),
        None,
        move |result: DebounceEventResult| match result {
            Ok(events) => handle(&app, &root, &events),
            Err(errors) => errors.iter().for_each(|e| log::error!("watcher: {e}")),
        },
    )?;
    debouncer.watch(&watch_root, RecursiveMode::Recursive)?;
    Ok(debouncer)
}

/// Runs on the watcher's thread for every batch of debounced events.
fn handle(app: &AppHandle, root: &Path, events: &[DebouncedEvent]) {
    // A set: one save often fires several events for the same file.
    let paths: BTreeSet<VaultPath> = events
        .iter()
        .flat_map(|event| event.paths.iter())
        .filter_map(|abs| VaultPath::from_absolute(root, abs).ok())
        .filter(is_relevant)
        .collect();
    if paths.is_empty() {
        return;
    }

    let state = app.state::<AppState>();
    let changed: Vec<VaultPath> = {
        let Ok(mut guard) = state.vault.lock() else {
            log::error!("watcher: vault mutex poisoned");
            return;
        };
        // Events of a vault that was closed in the meantime.
        let Some(vault) = guard.as_mut().filter(|v| v.root.as_path() == root) else {
            return;
        };
        paths.into_iter().filter(|path| update(vault, path)).collect()
    }; // Lock released before emitting.

    for path in changed {
        if let Err(e) = (NoteChanged { path }).emit(app) {
            log::error!("watcher: could not emit NoteChanged: {e}");
        }
    }
}

/// Only visible markdown notes: skips `.quarz/`, `.md.tmp` from saving, images etc.
fn is_relevant(path: &VaultPath) -> bool {
    let s = path.as_str();
    s.ends_with(".md") && !s.split('/').any(|segment| segment.starts_with('.'))
}

/// Applies the state of `path` on disk to the vault index.
///
/// Returns `true` only if the content of a known note changed from outside.
/// Our own saves already updated the hash, so they return `false`.
fn update(vault: &mut Vault, path: &VaultPath) -> bool {
    match fs::read_to_string(path.to_absolute(&vault.root)) {
        Ok(text) => {
            let hash = ContentHash::of(&text);
            match vault.files.insert(path.clone(), hash) {
                Some(old) => old != hash,
                None => {
                    log::info!("watcher: note created: {path}");
                    false
                }
            }
        }
        Err(e) if e.kind() == ErrorKind::NotFound => {
            if vault.files.remove(path).is_some() {
                log::info!("watcher: note removed: {path}");
            }
            false
        }
        Err(e) => {
            log::error!("watcher: could not read {path}: {e}");
            false
        }
    }
}
