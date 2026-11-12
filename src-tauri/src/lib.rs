use std::sync::Mutex;

use specta_typescript::Typescript;
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};
use tauri_specta::{Builder, collect_commands};

use crate::{app::AppState, config::vaultregistry::VaultRegistry, vault::vault::Vault};

mod app;
mod commands;
mod config;
mod logging;
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

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout), // tauri dev terminal
                    Target::new(TargetKind::LogDir { file_name: None }), // log file
                ])
                .level(log::LevelFilter::Info)
                .build(), 
        )
        .setup(|app| {
            // app local data directory
            let local_data_dir = app
                .handle()
                .path()
                .app_local_data_dir()
                .map_err(|e| e.to_string())?;
            // registry
            let mut registry_path = local_data_dir.clone();
            registry_path.push("registry.json");
            let registry = VaultRegistry::load(&registry_path).unwrap_or_else(|e| {
                log::error!("{e}");
                VaultRegistry::empty(&registry_path)
            });
            // get last vault
            let vault = registry.last_vault().and_then(|entry| Vault::open(entry.path.clone())
            .inspect_err(|e| log::error!("{e}")).ok());

            app.manage(AppState {
                vault: Mutex::new(vault),
                registry: Mutex::new(registry),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_prevent_default::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
