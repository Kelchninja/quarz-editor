# Quarz – Rust Backend

[🇩🇪 Deutsch](../de/README.md) · 🇬🇧 English

Documentation of the backend in `src-tauri/` (Tauri 2, Rust 2024).
State: version 0.1.0, November 2026.

The backend can:

- open a **vault** (a folder of Markdown notes) and index it in RAM,
- **read, create, save and rename** notes, and create folders,
- remember **which vault was open last** (`registry.json`),
- store the **open tabs** per vault (`.quarz/state.json`),
- write errors to a **log file**.

The frontend (SolidJS) talks to the backend exclusively through **Tauri commands**.

## Contents

| Page | What it covers |
|---|---|
| [Architecture](architecture.md) | Layers, modules, `AppState`, data model |
| [Startup](startup.md) | What happens at startup, which vault opens |
| [Commands](commands.md) | The IPC interface to the frontend, all 9 commands |
| [Vault](vault.md) | Index in RAM, scan, `VaultPath`, file operations |
| [Persistence](persistence.md) | Which files live where and how they are written |
| [Errors and logging](errors-and-logging.md) | Error types and the path of an error into the log |

The PlantUML diagrams in [`docs/diagrams/`](../../diagrams/) show an earlier state.

## Color legend

All diagrams use the same colors:

| Color | Meaning |
|---|---|
| 🔵 Blue | Frontend, IPC calls |
| 🟠 Orange | Commands, i.e. the entry into the backend |
| 🟣 Purple | State in RAM: `AppState`, mutex, vault index |
| 🔴 Red | **Disk access** (`std::fs`) |
| 🩵 Teal | Check, validation, decision |
| 🟡 Yellow | Logging |
| 🟢 Green | Success |
| 🩷 Pink, dashed | Error path |
| ⚪ Gray, dashed | Unused or ignored |

```mermaid
---
config:
  theme: dark
---
flowchart LR
    fe["Frontend / IPC"]:::fe
    cmd["Command"]:::cmd
    mem["RAM / mutex"]:::mem
    disk[("Disk")]:::disk
    chk{"Check"}:::check
    log["Logging"]:::log
    ok["Success"]:::ok
    err["Error"]:::err
    dead["unused"]:::dead

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
    classDef dead fill:#24262b,stroke:#5c6068,color:#8b8f98,stroke-dasharray:3 3
```

## The program in sketches

### Sketch 1: Who talks to whom

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    user(["User"])
    subgraph FE["Frontend · SolidJS"]
        ui["Sidebar · Tabs · Editor"]
        bind["bindings.ts<br/>generated"]
    end
    subgraph BE["Rust backend · Tauri"]
        cmds["9 commands"]
        state["AppState in RAM<br/>vault index + registry"]
        mods["Vault · VaultRegistry · VaultState"]
        logger["Logger"]
    end
    subgraph DISK["Disk"]
        notes[("Vault folder<br/>*.md")]
        reg[("registry.json")]
        ws[(".quarz/state.json")]
        logf[("quarz-editor.log")]
    end

    user --> ui
    ui --> bind
    bind -- "invoke (IPC)" --> cmds
    cmds --> state
    cmds --> mods
    mods --> notes
    mods --> reg
    mods --> ws
    cmds -.-> logger
    logger --> logf

    class ui,bind fe
    class cmds cmd
    class state,mods mem
    class notes,reg,ws disk
    class logger,logf log
    linkStyle 0,1,2 stroke:#4c8dff
    linkStyle 3,4 stroke:#a371f7
    linkStyle 5,6,7 stroke:#e5534b,stroke-width:2px
    linkStyle 8,9 stroke:#d4a72c

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
```

### Sketch 2: A session from startup to work

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart TD
    A(["App starts"]) --> B[("read registry.json")]
    B --> C{"last vault<br/>known?"}
    C -- yes --> D[("scan vault folder")]
    D -- ok --> E[("restore tabs from<br/>.quarz/state.json")]
    D -- "error, e.g. moved" --> P["Vault picker"]
    C -- no --> P
    P -- "pick folder" --> O[("open_vault:<br/>scan + save registry")]
    O --> E
    E --> W(["Working"])
    W -- "typing, 500 ms pause" --> S1[("save_note → note.md")]
    W -- "open/close/switch tab, 300 ms" --> S2[("save_vault_state → state.json")]
    S1 --> W
    S2 --> W

    class A,W,P fe
    class B,D,E,O,S1,S2 disk
    class C check
    linkStyle 4 stroke:#db61a2,stroke-dasharray:5 3
    linkStyle 9,10 stroke:#e5534b

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
```

### Sketch 3: Where the data lives

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    subgraph PC["This machine · app data folder com.kelchninja.quarz"]
        reg[("registry.json<br/>known vaults + last opened")]
        logf[("logs/quarz-editor.log")]
    end
    subgraph V["Vault folder, chosen freely"]
        md[("Notes *.md<br/>nested arbitrarily")]
        subgraph Q[".quarz, hidden"]
            st[("state.json<br/>open tabs + focus")]
        end
    end
    reg -- "path of the entry" --> md

    class reg,md,st disk
    class logf log
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
```

## Module overview

```
src-tauri/src/
├── main.rs              entry point, calls lib::run()
├── lib.rs               Tauri builder: plugins, setup(), commands, bindings export
├── app.rs               AppState: Mutex<Option<Vault>> + Mutex<VaultRegistry>
├── commands/
│   ├── vault.rs         all 9 Tauri commands
│   └── helper.rs        with_vault / with_registry (lock + access)
├── config/
│   ├── vaultregistry.rs VaultRegistry: load/save registry.json
│   └── vaultentry.rs    VaultEntry: id, path, name
├── logging/
│   └── logging.rs       log_err: log an error and turn it into a String
└── vault/
    ├── vault.rs         Vault: index, scan, file operations, VaultError
    ├── path.rs          VaultPath: validated, relative path
    ├── meta.rs          VaultMeta / NoteMeta: view for the frontend
    ├── vaultstate.rs    VaultState: .quarz/state.json
    ├── note.rs          ContentHash (+ unused: Note, NoteDocument)
    ├── entry.rs         unused: EntryMeta, Editable
    └── folder.rs        unused: Folder
```

## Dependencies

| Crate | Purpose |
|---|---|
| `tauri` 2 | App framework, windows, IPC, paths |
| `tauri-specta`, `specta`, `specta-typescript` | generate `src/bindings.ts` from the commands and types |
| `serde`, `serde_json` | JSON for IPC, `registry.json`, `state.json` |
| `thiserror` | error enums with messages |
| `walkdir` | recursive scan of the vault folder |
| `blake3` | `ContentHash` of a note |
| `uuid` | IDs of the vault entries in the registry |
| `log`, `tauri-plugin-log` | logging to the terminal and to a file |
| `tauri-plugin-dialog` | folder selection in the vault picker (used by the frontend) |
| `tauri-plugin-prevent-default` | suppresses browser shortcuts in the webview |
| `tauri-plugin-opener` | **unused**, left over from the template |
