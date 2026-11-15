# Architektur

[← Übersicht](README.md)

## Schichten

Ein Aufruf aus dem Frontend geht immer denselben Weg: generierte Funktion in `bindings.ts` → Command → Helper mit Lock → Fachlogik → Dateisystem.

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
        cv["vault.rs · 9 Commands"]
        hp["helper.rs · with_vault / with_registry"]
    end
    subgraph APP["app.rs · AppState"]
        mv["Mutex‹Option‹Vault››"]
        mr["Mutex‹VaultRegistry›"]
    end
    subgraph DOM["Fachlogik"]
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

| Schicht | Aufgabe | Weiß nichts von |
|---|---|---|
| `commands/` | nimmt IPC-Aufrufe an, holt den Lock, wandelt Fehler in `String` um und loggt sie | Dateiformaten |
| `app.rs` | hält den gemeinsamen Zustand hinter Mutexen | Logik |
| `vault/`, `config/` | Fachlogik und Dateizugriffe | Tauri, IPC, Locks |
| `logging/` | `log_err`: Fehler loggen und als `String` weitergeben | – |

`Vault`, `VaultRegistry` und `VaultState` kennen Tauri nicht. Den Pfad zur Registry bestimmt nur `setup()` in `lib.rs`, danach merkt sich die Registry ihn selbst.

## AppState

```rust
pub struct AppState {
    pub vault: Mutex<Option<Vault>>,     // None = kein Vault offen → Picker
    pub registry: Mutex<VaultRegistry>,  // bekannte Vaults, zuletzt geöffnet
}
```

- Wird in `setup()` einmal mit `app.manage(...)` registriert. Commands bekommen ihn als `tauri::State<'_, AppState>`.
- `VaultState` liegt **nicht** im `AppState`. Er wird bei Bedarf direkt aus der Datei gelesen bzw. in sie geschrieben, die Wahrheit über offene Tabs liegt im Frontend.
- Kein Command hält beide Locks gleichzeitig. `open_vault` sperrt erst die Registry, gibt sie frei und sperrt dann den Vault. Deadlocks sind dadurch ausgeschlossen.

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
    c3 -- "2. Vault ersetzen" --> mv

    class mv,mr mem
    class c1,c2,c3 cmd
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
```

### Nebenläufigkeit

Alle Commands sind `async` und laufen auf dem Thread-Pool von Tauri. Der `std::sync::Mutex` wird für die **ganze** Operation gehalten, auch während des Plattenzugriffs. Commands auf denselben Vault laufen deshalb nacheinander, nie gleichzeitig. Bei der jetzigen Last (eine Speicherung alle paar hundert Millisekunden) ist das unkritisch.

Einzige Ausnahme: `open_vault` scannt den neuen Ordner **ohne** Lock. Erst danach wird der fertige `Vault` eingesetzt.

## Datenmodell

Grau gestrichelt: Typen, die existieren, aber nicht mehr benutzt werden.

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
        -bytes: BLAKE3, 32 Byte
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

### Was das Frontend sieht

Nur diese Typen gehen über die IPC-Grenze. `specta` erzeugt daraus TypeScript-Typen in `src/bindings.ts`:

| Rust | TypeScript | Hinweis |
|---|---|---|
| `VaultPath` | `string` | wird beim Empfang geprüft, siehe [Vault](vault.md#vaultpath) |
| `VaultMeta` | `{ name; notes: NoteMeta[]; folders: VaultPath[] }` | ganze Sicht auf den Vault, ohne Inhalte |
| `NoteMeta` | `{ path; title }` | `title` = Dateiname ohne `.md` |
| `VaultState` | `{ openNotes: VaultPath[]; lastFocusedNote: VaultPath \| null }` | camelCase per `serde(rename_all)` |
| `Result<T, String>` | `{ status: "ok", data: T } \| { status: "error", error: string }` | |

Die Sidebar baut ihren Baum selbst aus `notes` und `folders` (`buildTree.ts`). Das Backend liefert eine flache Liste.

## Ungenutzter Code

Liefert `cargo check` als Warnungen bzw. findet man per Suche:

| Was | Wo | Warum ungenutzt |
|---|---|---|
| `Note`, `NoteDocument`, `EntryMeta`, `Folder`, Trait `Editable` | `vault/note.rs`, `entry.rs`, `folder.rs` | Commands werfen die Rückgabewerte weg, von `NoteDocument` wird nur der Text gelesen |
| `ConfigDir`, `VaultNotFound`, `VaultAlreadyExists`, `InvalidVaultPath` | `config/vaultregistry.rs` | werden nie erzeugt |
| `tauri-plugin-opener` | `Cargo.toml`, `lib.rs`, Capabilities | Frontend importiert es nicht |
