# Commands

[← Overview](README.md)

Commands are the only interface between frontend and backend. They all live in `commands/vault.rs` and are registered in `lib.rs` via `collect_commands!`. The frontend calls them through the generated functions in `src/bindings.ts`, for example `commands.saveNote(text, path)`.

## Overview

| Command | Parameters | Returns | Lock | Disk | Errors logged |
|---|---|---|---|---|---|
| `open_vault` | `path: String` | `VaultMeta` | registry, then vault | 🔴 scans the whole folder, writes `registry.json` | yes |
| `get_vault_meta` | – | `Option<VaultMeta>` | vault | – | no |
| `open_note` | `path: VaultPath` | `String` (content) | vault | 🔴 reads `.md` | yes |
| `create_note` | `path: VaultPath` | `VaultMeta` | vault | 🔴 creates an empty file | yes |
| `create_folder` | `path: VaultPath` | `VaultMeta` | vault | 🔴 creates a folder | yes |
| `rename_note` | `name: String`, `path: VaultPath` | `VaultMeta` | vault | 🔴 renames the file | yes |
| `save_note` | `content: String`, `path: VaultPath` | `()` | vault | 🔴 writes `.md` atomically | yes |
| `get_vault_state` | – | `VaultState` | vault | 🔴 reads `.quarz/state.json` | broken file: yes |
| `save_vault_state` | `vault_state: VaultState` | `()` | vault | 🔴 writes `.quarz/state.json` atomically | yes |

All commands return `Result<T, String>`. Commands that change the vault return the new `VaultMeta`, so the sidebar is up to date without a second call.

## Common pattern

Almost every command consists of `with_vault`, one call into the domain logic, and `log_err`:

```rust
pub async fn create_note(path: VaultPath, state: tauri::State<'_, AppState>) -> Result<VaultMeta, String> {
    helper::with_vault(&state, |vault| {
        vault.create_note(path).map_err(log_err("create_note"))?;
        Ok(VaultMeta::of(vault))
    })
}
```

```mermaid
---
config:
  theme: dark
---
flowchart LR
    call(["Command"]):::cmd --> lock["state.vault.lock()"]:::mem
    lock -- "poisoned" --> e1["Err(String)"]:::err
    lock -- ok --> some{"vault open?"}:::check
    some -- None --> e2["Err: No vault open"]:::err
    some -- Some --> f["closure with &mut Vault"]:::cmd
    f --> logic["domain logic, often with disk access"]:::disk
    logic -- Err --> le["log_err(name)"]:::log
    le --> e3["Err(String)"]:::err
    logic -- Ok --> r["Ok(T)"]:::ok

    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

| Helper | File | Does |
|---|---|---|
| `with_vault(state, f)` | `commands/helper.rs` | locks `state.vault`, returns `"No vault open"` if `None`, otherwise calls `f(&mut Vault)` |
| `with_registry(state, f)` | `commands/helper.rs` | locks `state.registry` and calls `f(&mut VaultRegistry)` |
| `log_err(context)` | `logging/logging.rs` | closure for `map_err`: logs `"{context}: {e}"` as an error and returns `e.to_string()` |

### Validated parameters

Parameters of type `VaultPath` are validated **during deserialization**, before the command even runs. A path like `../../etc/passwd` never reaches the command; the frontend gets an error right away. Details in [Vault → VaultPath](vault.md#vaultpath).

## open_vault

Opens a new vault from the picker and remembers it in the registry.

```mermaid
---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    box rgba(76,141,255,0.14) Frontend
    participant P as VaultPicker
    end
    box rgba(224,138,60,0.12) Rust backend
    participant C as open_vault
    participant V as Vault
    participant Reg as Mutex‹VaultRegistry›
    participant St as Mutex‹Option‹Vault››
    end
    box rgba(229,83,75,0.14) Disk
    participant D as File system
    end

    P->>C: openVault(path)
    rect rgba(229,83,75,0.16)
    C->>V: Vault::open(path), without lock
    V->>D: scan()
    D-->>V: folders + notes
    end
    alt scan failed
        rect rgba(219,97,162,0.14)
        V-->>C: VaultError
        C-->>P: error, logged via log_err
        end
    else ok
        V-->>C: Vault
        C->>C: VaultMeta::of(&vault)
        rect rgba(163,113,247,0.16)
        C->>Reg: lock, remember(root)
        end
        rect rgba(229,83,75,0.16)
        Reg->>D: save(): registry.json atomically
        end
        Note over Reg,D: an error while saving is only logged,<br/>the vault opens anyway
        rect rgba(163,113,247,0.16)
        C->>St: lock, Some(vault) replaces the old vault
        end
        C-->>P: VaultMeta
    end
```

## save_note (autosave)

The frontend calls `save_note` 500 ms after the last keystroke, separately per note.

```mermaid
---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    box rgba(76,141,255,0.14) Frontend
    participant E as Editor · autosave
    participant T as tabs.save
    end
    box rgba(224,138,60,0.12) Rust backend
    participant C as save_note
    participant V as Vault
    end
    box rgba(229,83,75,0.14) Disk
    participant D as File system
    end

    E->>E: 500 ms without typing
    E->>T: save(path, text)
    T->>C: saveNote(content, path)
    rect rgba(163,113,247,0.16)
    C->>V: with_vault, lock
    V->>V: files.get_mut(path)
    end
    alt note not in index
        rect rgba(219,97,162,0.14)
        V-->>C: NotFound
        C-->>T: error
        end
    else known
        rect rgba(229,83,75,0.16)
        V->>D: write(note.md.tmp)
        V->>D: rename(note.md.tmp → note.md)
        end
        V->>V: update ContentHash
        C-->>T: ok
        T->>T: remember savedText
    end
```

`save_note` does not create notes. A note that isn't in the index is rejected. The `.md.tmp` file doesn't end in `.md` and is therefore ignored by the scan if it is left behind after a crash.

## rename_note

Renames notes only, and only within their folder. `name` is the new name **without** `.md`.

```mermaid
---
config:
  theme: dark
---
flowchart TD
    s(["rename_note(name, path)"]):::cmd --> md{"path ends with .md?"}:::check
    md -- no --> e1["NotMarkdown"]:::err
    md -- yes --> nm{"name empty or contains / ?"}:::check
    nm -- yes --> e2["NotAllowed"]:::err
    nm -- no --> np{"folder + name.md<br/>valid VaultPath?"}:::check
    np -- no --> e2
    np -- yes --> same{"same as before?"}:::check
    same -- yes --> done["Ok, nothing to do"]:::ok
    same -- no --> idx{"old path in index?"}:::mem
    idx -- no --> e3["NotFound"]:::err
    idx -- yes --> ex{"target already exists?<br/>case-only change is allowed"}:::disk
    ex -- yes --> e4["AlreadyExists"]:::err
    ex -- no --> mv[("fs::rename")]:::disk
    mv --> up["index: old path out,<br/>new path in, hash stays"]:::mem
    up --> meta["new VaultMeta"]:::ok

    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

The "target already exists" check is necessary because `fs::rename` would otherwise silently overwrite an existing file. The exception for case-only changes is needed on Windows: there, `note.md` already "exists" when you rename `Note.md` to `note.md`.

## get_vault_state / save_vault_state

Remember the open tabs per vault. The frontend is the source of truth; the backend only reads and writes the file.

```mermaid
---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    box rgba(76,141,255,0.14) Frontend
    participant T as tabs.ts
    end
    box rgba(224,138,60,0.12) Rust backend
    participant G as get_vault_state
    participant S as save_vault_state
    participant VS as VaultState
    end
    box rgba(229,83,75,0.14) Disk
    participant D as .quarz/state.json
    end

    Note over T: after startup or open_vault
    T->>G: getVaultState()
    rect rgba(229,83,75,0.16)
    G->>VS: load(root)
    VS->>D: read + parse
    end
    VS-->>G: state. Missing: empty. Broken: log + empty
    G->>G: retain_existing: only notes that are in the index
    G-->>T: VaultState
    T->>T: open tabs, set focus, restored = true
    loop on every tab change
        T->>T: wait 300 ms, debounce
        T->>S: saveVaultState(state)
        rect rgba(229,83,75,0.16)
        S->>D: create .quarz, write tmp, rename
        end
        S-->>T: ok or error
    end
```

`retain_existing` removes tabs of notes that were deleted outside the app. If the focused note was among them, the last remaining tab gets the focus.

## get_vault_meta / open_note / create_note / create_folder

| Command | Flow |
|---|---|
| `get_vault_meta` | lock, `VaultMeta::of(vault)`, or `None` if no vault is open. No disk access; the frontend calls it at startup. |
| `open_note` | `fs::read_to_string` of the file, returns the text. **Not** in the index? Still read, as long as the file exists. |
| `create_note` | path must end in `.md`, `File::create_new` (fails if the file already exists), hash of the empty text into the index. The frontend picks the free name ("Unbenannt 1.md"). |
| `create_folder` | `fs::create_dir` (parent folder must exist), path into `folders`. |
