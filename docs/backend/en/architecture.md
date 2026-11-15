# Architecture

[← Overview](README.md)

## Layers

A call from the frontend always takes the same route: generated function in `bindings.ts` → command → helper with lock → domain logic → file system.

```mermaid
---
config:
  theme: dark
---
flowchart TB
    subgraph FE["Frontend"]
        store["state/vault.ts · state/tabs.ts"]
        bind["bindings.ts · tauri-specta"]
    end
    subgraph CMD["commands/"]
        cv["vault.rs · 9 commands"]
        hp["helper.rs · with_vault / with_registry"]
    end
    subgraph APP["app.rs · AppState"]
        mv["Mutex‹Option‹Vault››"]
        mr["Mutex‹VaultRegistry›"]
    end
    subgraph DOM["Domain logic"]
        vault["vault/vault.rs · Vault"]
        path["vault/path.rs · VaultPath"]
        meta["vault/meta.rs · VaultMeta"]
        vs["vault/vaultstate.rs · VaultState"]
        reg["config/vaultregistry.rs · VaultRegistry"]
    end
    lg["logging/ · log_err"]
    fs[("std::fs")]

    store --> bind
    bind -- invoke --> cv
    cv --> hp
    hp --> mv
    hp --> mr
    mv --> vault
    mr --> reg
    cv --> meta
    cv --> vs
    vault --> path
    vault --> fs
    vs --> fs
    reg --> fs
    cv -.-> lg

    class store,bind fe
    class cv,hp cmd
    class mv,mr mem
    class vault,path,meta,vs,reg check
    class fs disk
    class lg log
    linkStyle 0,1 stroke:#4c8dff
    linkStyle 3,4 stroke:#a371f7
    linkStyle 10,11,12 stroke:#e5534b,stroke-width:2px
    linkStyle 13 stroke:#d4a72c

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
```

| Layer | Job | Knows nothing about |
|---|---|---|
| `commands/` | accepts IPC calls, takes the lock, turns errors into `String` and logs them | file formats |
| `app.rs` | holds the shared state behind mutexes | logic |
| `vault/`, `config/` | domain logic and file access | Tauri, IPC, locks |
| `logging/` | `log_err`: log an error and pass it on as `String` | – |

`Vault`, `VaultRegistry` and `VaultState` don't know Tauri. Only `setup()` in `lib.rs` determines the path of the registry; after that the registry remembers it itself.

## AppState

```rust
pub struct AppState {
    pub vault: Mutex<Option<Vault>>,     // None = no vault open → picker
    pub registry: Mutex<VaultRegistry>,  // known vaults, last opened
}
```

- Registered once in `setup()` with `app.manage(...)`. Commands receive it as `tauri::State<'_, AppState>`.
- `VaultState` is **not** part of `AppState`. It is read from or written to the file directly when needed; the source of truth for open tabs is the frontend.
- No command holds both locks at once. `open_vault` locks the registry first, releases it, then locks the vault. This rules out deadlocks.

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    subgraph AS["AppState"]
        mv["Mutex‹Option‹Vault››"]
        mr["Mutex‹VaultRegistry›"]
    end
    c1["open_note · create_* · rename_note<br/>save_note · *_vault_state"] --> mv
    c2["get_vault_meta"] --> mv
    c3["open_vault"] -- "1. remember + save" --> mr
    c3 -- "2. replace vault" --> mv

    class mv,mr mem
    class c1,c2,c3 cmd
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
```

### Concurrency

All commands are `async` and run on Tauri's thread pool. The `std::sync::Mutex` is held for the **whole** operation, including disk access. Commands on the same vault therefore run one after another, never at the same time. With the current load (one save every few hundred milliseconds) this is not a problem.

The only exception: `open_vault` scans the new folder **without** a lock. Only then is the finished `Vault` put in place.

## Data model

Gray dashed: types that exist but are no longer used.

```mermaid
---
config:
  theme: dark
---
classDiagram
    direction LR
    class AppState {
        +vault: Mutex‹Option‹Vault››
        +registry: Mutex‹VaultRegistry›
    }
    class Vault {
        +root: PathBuf
        +files: BTreeMap‹VaultPath, ContentHash›
        +folders: BTreeSet‹VaultPath›
        +open(root) Vault
        +create_folder(path)
        +create_note(path)
        +save_note(content, path)
        +rename_note(name, path)
        +load(path) NoteDocument
    }
    class VaultPath {
        -inner: String
        +from_absolute(root, abs) VaultPath
        +to_absolute(root) PathBuf
        +as_str() str
    }
    class ContentHash {
        -bytes: BLAKE3, 32 bytes
        +of(source) ContentHash
    }
    class VaultRegistry {
        -path: PathBuf
        +last_opened: Option‹Uuid›
        +vaults: Vec‹VaultEntry›
        +empty(path) VaultRegistry
        +load(path) VaultRegistry
        +save()
        +remember(path)
        +last_vault() Option‹VaultEntry›
    }
    class VaultEntry {
        +id: Uuid
        +path: PathBuf
        +name: String
    }
    class VaultState {
        +open_notes: Vec‹VaultPath›
        +last_focused_note: Option‹VaultPath›
        +file(root) PathBuf
        +load(root) VaultState
        +save(root)
        +retain_existing(exists)
    }
    class VaultMeta {
        +name: String
        +notes: Vec‹NoteMeta›
        +folders: Vec‹VaultPath›
        +of(vault) VaultMeta
    }
    class NoteMeta {
        +path: VaultPath
        +title: String
    }
    class NoteDocument {
        +note: Note
        -source: String
    }
    class Note {
        +meta: EntryMeta
        -hash: ContentHash
    }
    class Folder {
        +meta: EntryMeta
    }
    class EntryMeta {
        +path: VaultPath
        +name: String
    }

    AppState *-- Vault
    AppState *-- VaultRegistry
    Vault o-- VaultPath
    Vault o-- ContentHash
    VaultRegistry *-- VaultEntry
    VaultState o-- VaultPath
    VaultMeta *-- NoteMeta
    VaultMeta ..> Vault : of()
    Vault ..> NoteDocument : load()
    Vault ..> Folder : create_folder()
    Vault ..> Note : create_note()
    NoteDocument *-- Note
    Note *-- EntryMeta
    Folder *-- EntryMeta

    style AppState fill:#2a2140,stroke:#a371f7,color:#dcdde0
    style Vault fill:#2a2140,stroke:#a371f7,color:#dcdde0
    style VaultRegistry fill:#2a2140,stroke:#a371f7,color:#dcdde0
    style VaultEntry fill:#2a2140,stroke:#a371f7,color:#dcdde0
    style VaultPath fill:#163236,stroke:#39c5cf,color:#dcdde0
    style ContentHash fill:#163236,stroke:#39c5cf,color:#dcdde0
    style VaultState fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    style VaultMeta fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    style NoteMeta fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    style NoteDocument fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
    style Note fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
    style Folder fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
    style EntryMeta fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
```

### What the frontend sees

Only these types cross the IPC boundary. `specta` generates TypeScript types for them in `src/bindings.ts`:

| Rust | TypeScript | Note |
|---|---|---|
| `VaultPath` | `string` | validated on receipt, see [Vault](vault.md#vaultpath) |
| `VaultMeta` | `{ name; notes: NoteMeta[]; folders: VaultPath[] }` | full view of the vault, without contents |
| `NoteMeta` | `{ path; title }` | `title` = file name without `.md` |
| `VaultState` | `{ openNotes: VaultPath[]; lastFocusedNote: VaultPath \| null }` | camelCase via `serde(rename_all)` |
| `Result<T, String>` | `{ status: "ok", data: T } \| { status: "error", error: string }` | |

The sidebar builds its tree itself from `notes` and `folders` (`buildTree.ts`). The backend returns a flat list.

## Unused code

Reported as warnings by `cargo check` or found by searching:

| What | Where | Why unused |
|---|---|---|
| `Note`, `NoteDocument`, `EntryMeta`, `Folder`, trait `Editable` | `vault/note.rs`, `entry.rs`, `folder.rs` | commands discard the return values; of `NoteDocument` only the text is read |
| `ConfigDir`, `VaultNotFound`, `VaultAlreadyExists`, `InvalidVaultPath` | `config/vaultregistry.rs` | never constructed |
| `tauri-plugin-opener` | `Cargo.toml`, `lib.rs`, capabilities | the frontend doesn't import it |
