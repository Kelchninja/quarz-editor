use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

mod app;
mod commands;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::vault::open_note,
        commands::vault::get_vault_meta,
    ]);

    // Nur beim Entwickeln: schreibt die TS-Typen und Command-Funktionen.
    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("TypeScript-Bindings konnten nicht geschrieben werden");

    tauri::Builder::default()
        .manage(app::AppState {
            vault: vault::vault::Vault::open(std::path::PathBuf::from(
                "/Users/kelchninja/Documents/obsidian-vault",
            ))
            .expect("Vault couldnt be opened"),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
