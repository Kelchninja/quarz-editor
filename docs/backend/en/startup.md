# Startup

[← Overview](README.md)

Startup decides whether the user lands directly in the vault opened last or sees the vault picker. The code lives in `lib.rs` → `run()` → `setup()`.

## Flow

```mermaid
---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    participant M as main.rs
    box rgba(224,138,60,0.12) Rust backend
    participant R as lib.rs · run()
    participant S as setup()
    participant Reg as VaultRegistry
    participant V as Vault
    end
    box rgba(229,83,75,0.14) Disk
    participant D as File system
    end
    box rgba(76,141,255,0.14) Frontend
    participant F as App.tsx
    end

    M->>R: run()
    opt debug build only
        rect rgba(229,83,75,0.16)
        R->>D: write src/bindings.ts
        end
    end
    R->>R: plugins: log, dialog, opener, prevent-default
    R->>S: setup(app)
    S->>S: app_local_data_dir() + "registry.json"
    rect rgba(229,83,75,0.16)
    S->>Reg: load(registry_path)
    Reg->>D: open + parse JSON
    D-->>Reg: content, NotFound or error
    end
    Reg-->>S: registry (error: log + empty)
    S->>Reg: last_vault()
    Reg-->>S: Option‹VaultEntry›
    opt last vault known
        rect rgba(229,83,75,0.16)
        S->>V: Vault::open(entry.path)
        V->>D: scan(): read folders + all *.md
        D-->>V: files
        end
        V-->>S: vault (error: log + None)
    end
    rect rgba(163,113,247,0.16)
    S->>S: app.manage(AppState)
    end
    R->>F: open window, frontend loads
    F->>R: getVaultMeta()
    R-->>F: VaultMeta or null
    alt vault open
        F->>R: getVaultState(), then openNote per tab
    else no vault
        F->>F: show VaultPicker
    end
```

Plugins are initialized **before** `setup()`. That's why `log::error!` already works in `setup`.

## Decisions at startup

```mermaid
---
config:
  theme: dark
---
flowchart TD
    start(["setup()"]):::cmd --> dir["app_local_data_dir()"]:::check
    dir -- error --> abort["setup returns Err,<br/>app does not start"]:::err
    dir -- ok --> load[("read registry.json")]:::disk
    load -- "missing, first start" --> empty1["empty registry"]:::mem
    load -- "broken or unreadable" --> log1["log::error!"]:::log
    log1 --> empty2["VaultRegistry::empty(path)"]:::mem
    load -- ok --> regok["loaded registry"]:::mem
    empty1 --> last{"last_vault()"}:::check
    empty2 --> last
    regok --> last
    last -- None --> none["vault = None"]:::mem
    last -- "Some(entry)" --> open[("Vault::open → scan")]:::disk
    open -- "error, e.g. folder moved" --> log2["log::error!"]:::log
    log2 --> none
    open -- ok --> some["vault = Some(Vault)"]:::ok
    none --> manage["app.manage(AppState)"]:::mem
    some --> manage
    manage --> fe{"Frontend:<br/>getVaultMeta()"}:::fe
    fe -- null --> picker["VaultPicker"]:::fe
    fe -- VaultMeta --> editor["Editor, restore tabs"]:::fe

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

| Situation | Result |
|---|---|
| First start, `registry.json` missing | empty registry → picker. The file is created on the first `open_vault`. |
| `registry.json` broken | error in the log, empty registry → picker. The file is overwritten on the next `open_vault`. |
| Last vault no longer exists | error in the log, `vault = None` → picker. The old entry stays in the registry. |
| Everything present | the vault is open right away, the frontend restores the tabs from `.quarz/state.json`. |
| App data folder cannot be determined | `setup` fails, the app does not start. Practically never happens. |

## Bindings

In a debug build, `run()` rewrites `src/bindings.ts` on **every start**, with all commands and the types that have `#[derive(specta::Type)]`. After changing a command or type, simply run `npm run tauri dev`. Release builds don't do this.
