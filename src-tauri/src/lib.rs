mod path;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn open_note(
    path: path::VaultPath,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let abs: std::path::PathBuf = path.to_absolute(&state.vault_root);
    let note_content: String = std::fs::read_to_string(abs).map_err(|e| e.to_string())?;
    Ok(note_content)
}

struct AppState {
    vault_root: std::path::PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            vault_root: std::path::PathBuf::from("/Users/kelchninja/Documents/obsidian-vault"),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, open_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
