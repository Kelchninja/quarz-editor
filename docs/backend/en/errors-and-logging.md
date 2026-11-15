# Errors and logging

[← Overview](README.md)

## Error types

Every module has its own error enum built with `thiserror`. Only a `String` ever crosses the IPC boundary.

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

| Enum | File | Notable |
|---|---|---|
| `VaultError` | `vault/vault.rs` | `Io` and `Path` via `#[from]`, so `?` is enough |
| `VaultPathError` | `vault/path.rs` | raised when constructing a `VaultPath`, also during deserialization |
| `VaultRegistryError` | `config/vaultregistry.rs` | `Read`/`Write`/`Parse` carry the path, set via `map_err`. The last four variants are unused |
| `VaultStateError` | `vault/vaultstate.rs` | built the same way as `VaultRegistryError` |

`Read` and `Write` have the same source type (`io::Error`). That's why the variant is chosen with `map_err` instead of `#[from]`: `#[from]` can only point to one variant per source type.

## Path of an error

Example: `save_note` fails because the file is read-only.

```mermaid
---
config:
  theme: dark
---
flowchart LR
    io[("fs::write fails<br/>io::Error")]:::disk --> ve["VaultError::Io<br/>via ? and from"]:::err
    ve --> le["map_err(log_err('save_note'))"]:::log
    le --> logf[("terminal + quarz-editor.log<br/>save_note: access denied")]:::log
    le --> str["String"]:::err
    str --> ipc["Err over IPC"]:::fe
    ipc --> ts["bindings.ts:<br/>status error"]:::fe
    ts --> ce["state/vault.ts:<br/>console.error, returns false"]:::fe

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

`log_err` is a small factory for `map_err` closures:

```rust
pub fn log_err<E: std::fmt::Display>(context: &str) -> impl FnOnce(E) -> String + '_ {
    move |e| {
        log::error!("{context}: {e}");
        e.to_string()
    }
}
```

This way every error is logged **exactly once**, namely in Rust, where the real error and its path are known. The `console.error` in the frontend only shows up in the DevTools.

## Where errors are handled

| Location | Error | Reaction |
|---|---|---|
| `setup`: `app_local_data_dir()` | path cannot be determined | `?`, app does not start |
| `setup`: `VaultRegistry::load` | file broken or unreadable | `log::error!`, empty registry |
| `setup`: `Vault::open` | last vault missing or unreadable | `log::error!`, `vault = None` → picker |
| `open_vault`: `registry.save()` | registry not writable | `log::error!`, vault opens anyway |
| `get_vault_state`: `VaultState::load` | `state.json` broken | `log::error!`, empty state |
| all commands: domain logic | `VaultError`, `VaultStateError` | `log_err`, error to the frontend |
| all commands: `lock()` | mutex poisoned (panic in another command) | `to_string`, **not** logged |
| `with_vault` | no vault open | `"No vault open"`, not logged |
| deserializing a `VaultPath` | invalid path | Tauri rejects the call, the command does not run |

Principle: if the app can reasonably continue, the error is logged and a fallback value is used. The app should never become unusable because of a broken auxiliary file.

## Logging

Set up in `lib.rs` with `tauri-plugin-log`:

```rust
tauri_plugin_log::Builder::new()
    .targets([
        Target::new(TargetKind::Stdout),                     // terminal of tauri dev
        Target::new(TargetKind::LogDir { file_name: None }), // file, name = productName
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
    rs["Rust:<br/>log::error! · log::info! · log_err"]:::cmd --> logger["tauri-plugin-log<br/>level ≥ Info"]:::log
    ts["Frontend:<br/>@tauri-apps/plugin-log<br/>not used yet"]:::dead -.-> logger
    logger --> out["Terminal"]:::log
    logger --> file[("quarz-editor.log")]:::disk

    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef dead fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
```

| Property | Value |
|---|---|
| Level | `Info` and above. `debug!`/`trace!` are discarded |
| Targets | terminal (only visible with `tauri dev`) and file, paths in [Persistence → Paths](persistence.md#paths) |
| Rotation | none, the file grows without limit |
| Frontend | the `log:default` permission and the npm package are present; the frontend still uses `console.error` |
| Panics | are not logged. Release builds use `panic = "abort"`, so the app exits without an entry |

Note contents never go into the log, only paths.
