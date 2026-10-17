mod app;
mod commands;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(app::AppState {
            vault: vault::vault::Vault::open(std::path::PathBuf::from(
                "/Users/kelchninja/Documents/obsidian-vault",
            ))
            .expect("Vault couldnt be opened"),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![commands::vault::open_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
