use std::path::PathBuf;
use std::sync::Mutex;

use specta_typescript::Typescript;
use tauri_specta::{Builder, collect_commands};

use crate::app::AppState;
use crate::vault::vault::Vault;

mod app;
mod commands;
mod config;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::vault::open_note,
        commands::vault::get_vault_meta,
        commands::vault::create_folder,
        commands::vault::create_note,
        commands::vault::save_note,
        commands::vault::rename_note,
        commands::vault::open_vault
    ]);

    // Debug builds only: writes the TS types and command functions.
    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("TypeScript-Bindings konnten nicht geschrieben werden");

    let vault = Vault::open(PathBuf::from("/Users/kelchninja/Documents/obsidian-vault"))
        .expect("Vault couldnt be opened");

    tauri::Builder::default()
        .manage(AppState {
            vault: Mutex::new(vault),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_prevent_default::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
