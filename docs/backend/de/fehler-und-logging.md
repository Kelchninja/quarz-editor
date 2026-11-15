# Fehler und Logging

[← Übersicht](README.md)

## Fehlertypen

Jedes Modul hat ein eigenes Fehler-Enum mit `thiserror`. Über die IPC-Grenze geht immer nur ein `String`.

```mermaid
---
config:
  theme: dark
---
classDiagram
    direction LR
    class VaultError {
        <<enumeration>>
        NotFound(path)
        NotMarkdown(path)
        NotAllowed(name)
        AlreadyExists(path)
        Path(VaultPathError)
        Io(io.Error)
    }
    class VaultPathError {
        <<enumeration>>
        OutsideVault
        NotUtf8
        Invalid(String)
    }
    class VaultRegistryError {
        <<enumeration>>
        Read(path, io.Error)
        Write(path, io.Error)
        Parse(path, serde_json.Error)
        Serialize(serde_json.Error)
        ConfigDir(String)
        VaultNotFound(String)
        VaultAlreadyExists(String)
        InvalidVaultPath(PathBuf)
    }
    class VaultStateError {
        <<enumeration>>
        Read(path, io.Error)
        Write(path, io.Error)
        Parse(path, serde_json.Error)
        Serialize(serde_json.Error)
    }
    VaultError o-- VaultPathError : from

    style VaultError fill:#3a1c30,stroke:#db61a2,color:#dcdde0
    style VaultPathError fill:#163236,stroke:#39c5cf,color:#dcdde0
    style VaultRegistryError fill:#3a1c30,stroke:#db61a2,color:#dcdde0
    style VaultStateError fill:#3a1c30,stroke:#db61a2,color:#dcdde0
```

| Enum | Datei | Besonderheit |
|---|---|---|
| `VaultError` | `vault/vault.rs` | `Io` und `Path` per `#[from]`, deshalb reicht `?` |
| `VaultPathError` | `vault/path.rs` | entsteht beim Bauen eines `VaultPath`, auch beim Deserialisieren |
| `VaultRegistryError` | `config/vaultregistry.rs` | `Read`/`Write`/`Parse` mit Pfad, gesetzt per `map_err`. Die letzten vier Varianten sind ungenutzt |
| `VaultStateError` | `vault/vaultstate.rs` | gleich aufgebaut wie `VaultRegistryError` |

`Read` und `Write` haben denselben Quelltyp (`io::Error`). Deshalb wird mit `map_err` ausgewählt statt mit `#[from]`: `#[from]` könnte pro Quelltyp nur auf eine Variante zeigen.

## Weg eines Fehlers

Beispiel: `save_note` scheitert, weil die Datei schreibgeschützt ist.

```mermaid
---
config:
  theme: dark
---
flowchart LR
    io[("fs::write scheitert<br/>io::Error")]:::disk --> ve["VaultError::Io<br/>per ? und from"]:::err
    ve --> le["map_err(log_err('save_note'))"]:::log
    le --> logf[("Terminal + quarz-editor.log<br/>save_note: Zugriff verweigert")]:::log
    le --> str["String"]:::err
    str --> ipc["Err über IPC"]:::fe
    ipc --> ts["bindings.ts:<br/>status error"]:::fe
    ts --> ce["state/vault.ts:<br/>console.error, Rückgabe false"]:::fe

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

`log_err` ist eine kleine Fabrik für `map_err`-Closures:

```rust
pub fn log_err<E: std::fmt::Display>(context: &str) -> impl FnOnce(E) -> String + '_ {
    move |e| {
        log::error!("{context}: {e}");
        e.to_string()
    }
}
```

Damit wird jeder Fehler **genau einmal** geloggt, nämlich in Rust, wo der echte Fehler mit Pfad bekannt ist. Das `console.error` im Frontend erscheint nur in den DevTools.

## Wo Fehler behandelt werden

| Stelle | Fehler | Reaktion |
|---|---|---|
| `setup`: `app_local_data_dir()` | Pfad nicht bestimmbar | `?`, App startet nicht |
| `setup`: `VaultRegistry::load` | Datei kaputt oder unlesbar | `log::error!`, leere Registry |
| `setup`: `Vault::open` | letzter Vault fehlt oder ist unlesbar | `log::error!`, `vault = None` → Picker |
| `open_vault`: `registry.save()` | Registry nicht schreibbar | `log::error!`, Vault öffnet trotzdem |
| `get_vault_state`: `VaultState::load` | `state.json` kaputt | `log::error!`, leerer State |
| alle Commands: Fachlogik | `VaultError`, `VaultStateError` | `log_err`, Fehler ans Frontend |
| alle Commands: `lock()` | Mutex vergiftet (Panic in einem anderen Command) | `to_string`, **nicht** geloggt |
| `with_vault` | kein Vault offen | `"No vault open"`, nicht geloggt |
| Deserialisieren eines `VaultPath` | ungültiger Pfad | Tauri lehnt den Aufruf ab, der Command läuft nicht |

Grundsatz: Kann die App sinnvoll weitermachen, wird geloggt und ein Ersatzwert benutzt. Die App soll nie wegen einer kaputten Hilfsdatei unbenutzbar werden.

## Logging

Eingerichtet in `lib.rs` mit `tauri-plugin-log`:

```rust
tauri_plugin_log::Builder::new()
    .targets([
        Target::new(TargetKind::Stdout),                     // Terminal von tauri dev
        Target::new(TargetKind::LogDir { file_name: None }), // Datei, Name = productName
    ])
    .level(log::LevelFilter::Info)
    .build()
```

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    rs["Rust:<br/>log::error! · log::info! · log_err"]:::cmd --> logger["tauri-plugin-log<br/>Level ≥ Info"]:::log
    ts["Frontend:<br/>@tauri-apps/plugin-log<br/>noch nicht benutzt"]:::dead -.-> logger
    logger --> out["Terminal"]:::log
    logger --> file[("quarz-editor.log")]:::disk

    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef dead fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
```

| Eigenschaft | Wert |
|---|---|
| Level | `Info` und höher. `debug!`/`trace!` werden verworfen |
| Ziele | Terminal (nur sichtbar bei `tauri dev`) und Datei, Pfade unter [Persistenz → Pfade](persistenz.md#pfade) |
| Rotation | keine, die Datei wächst unbegrenzt |
| Frontend | Permission `log:default` und das npm-Paket sind da, das Frontend nutzt noch `console.error` |
| Panics | werden nicht geloggt. Im Release-Build gilt `panic = "abort"`, die App beendet sich dann ohne Eintrag |

Notizinhalte gehören nie ins Log, nur Pfade.
