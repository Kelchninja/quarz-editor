# Quarz – Rust-Backend

🇩🇪 Deutsch · [🇬🇧 English](../en/README.md)

Dokumentation des Backends in `src-tauri/` (Tauri 2, Rust 2024).
Stand: Version 0.1.0, November 2026.

Das Backend kann:

- einen **Vault** (Ordner mit Markdown-Notizen) öffnen und im RAM indizieren,
- Notizen **lesen, anlegen, speichern, umbenennen** und Ordner anlegen,
- sich merken, **welcher Vault zuletzt offen war** (`registry.json`),
- pro Vault die **offenen Tabs** speichern (`.quarz/state.json`),
- Fehler in eine **Logdatei** schreiben.

Das Frontend (SolidJS) spricht ausschließlich über **Tauri-Commands** mit dem Backend.

## Inhalt

| Seite | Worum es geht |
|---|---|
| [Architektur](architektur.md) | Schichten, Module, `AppState`, Datenmodell |
| [App-Start](start.md) | Was beim Start passiert, welcher Vault aufgeht |
| [Commands](commands.md) | Die IPC-Schnittstelle zum Frontend, alle 9 Commands |
| [Vault](vault.md) | Index im RAM, Scan, `VaultPath`, Dateioperationen |
| [Persistenz](persistenz.md) | Welche Dateien wo liegen und wie sie geschrieben werden |
| [Fehler und Logging](fehler-und-logging.md) | Fehlertypen und der Weg eines Fehlers bis ins Log |

Die PlantUML-Diagramme in [`docs/diagrams/`](../../diagrams/) zeigen einen früheren Stand.

## Farblegende

Alle Diagramme verwenden dieselben Farben:

| Farbe | Bedeutung |
|---|---|
| 🔵 Blau | Frontend, IPC-Aufrufe |
| 🟠 Orange | Commands, also der Einstieg ins Backend |
| 🟣 Lila | Zustand im RAM: `AppState`, Mutex, Vault-Index |
| 🔴 Rot | **Plattenzugriff** (`std::fs`) |
| 🩵 Türkis | Prüfung, Validierung, Entscheidung |
| 🟡 Gelb | Logging |
| 🟢 Grün | Erfolg |
| 🩷 Pink, gestrichelt | Fehlerpfad |
| ⚪ Grau, gestrichelt | ungenutzt oder ignoriert |

```mermaid
---
config:
  theme: dark
---
flowchart LR
    fe["Frontend / IPC"]:::fe
    cmd["Command"]:::cmd
    mem["RAM / Mutex"]:::mem
    disk[("Platte")]:::disk
    chk{"Prüfung"}:::check
    log["Logging"]:::log
    ok["Erfolg"]:::ok
    err["Fehler"]:::err
    dead["ungenutzt"]:::dead

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

## Das Programm in Skizzen

### Skizze 1: Wer redet mit wem

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    user(["Nutzer"])
    subgraph FE["Frontend · SolidJS"]
        ui["Sidebar · Tabs · Editor"]
        bind["bindings.ts<br/>generiert"]
    end
    subgraph BE["Rust-Backend · Tauri"]
        cmds["9 Commands"]
        state["AppState im RAM<br/>Vault-Index + Registry"]
        mods["Vault · VaultRegistry · VaultState"]
        logger["Logger"]
    end
    subgraph DISK["Platte"]
        notes[("Vault-Ordner<br/>*.md")]
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

### Skizze 2: Eine Sitzung von Start bis Arbeit

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart TD
    A(["App startet"]) --> B[("registry.json lesen")]
    B --> C{"letzter Vault<br/>bekannt?"}
    C -- ja --> D[("Vault-Ordner scannen")]
    D -- ok --> E[("Tabs aus .quarz/state.json<br/>wiederherstellen")]
    D -- "Fehler, z.B. verschoben" --> P["Vault-Picker"]
    C -- nein --> P
    P -- "Ordner wählen" --> O[("open_vault:<br/>scannen + Registry speichern")]
    O --> E
    E --> W(["Arbeiten"])
    W -- "tippen, 500 ms Pause" --> S1[("save_note → Notiz.md")]
    W -- "Tab auf/zu/wechseln, 300 ms" --> S2[("save_vault_state → state.json")]
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

### Skizze 3: Wo die Daten liegen

```mermaid
---
config:
  look: handDrawn
  theme: dark
---
flowchart LR
    subgraph PC["Dieser Rechner · App-Datenordner com.kelchninja.quarz"]
        reg[("registry.json<br/>bekannte Vaults + zuletzt geöffnet")]
        logf[("logs/quarz-editor.log")]
    end
    subgraph V["Vault-Ordner, frei gewählt"]
        md[("Notizen *.md<br/>beliebig verschachtelt")]
        subgraph Q[".quarz, versteckt"]
            st[("state.json<br/>offene Tabs + Fokus")]
        end
    end
    reg -- "path des Eintrags" --> md

    class reg,md,st disk
    class logf log
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
```

## Modulübersicht

```
src-tauri/src/
├── main.rs              Einstieg, ruft lib::run() auf
├── lib.rs               Tauri-Builder: Plugins, setup(), Commands, Bindings-Export
├── app.rs               AppState: Mutex<Option<Vault>> + Mutex<VaultRegistry>
├── commands/
│   ├── vault.rs         alle 9 Tauri-Commands
│   └── helper.rs        with_vault / with_registry (Lock + Zugriff)
├── config/
│   ├── vaultregistry.rs VaultRegistry: registry.json laden/speichern
│   └── vaultentry.rs    VaultEntry: id, path, name
├── logging/
│   └── logging.rs       log_err: Fehler loggen und in String umwandeln
└── vault/
    ├── vault.rs         Vault: Index, Scan, Dateioperationen, VaultError
    ├── path.rs          VaultPath: geprüfter, relativer Pfad
    ├── meta.rs          VaultMeta / NoteMeta: Sicht fürs Frontend
    ├── vaultstate.rs    VaultState: .quarz/state.json
    ├── note.rs          ContentHash (+ ungenutzt: Note, NoteDocument)
    ├── entry.rs         ungenutzt: EntryMeta, Editable
    └── folder.rs        ungenutzt: Folder
```

## Abhängigkeiten

| Crate | Wofür |
|---|---|
| `tauri` 2 | App-Rahmen, Fenster, IPC, Pfade |
| `tauri-specta`, `specta`, `specta-typescript` | erzeugen `src/bindings.ts` aus den Commands und Typen |
| `serde`, `serde_json` | JSON für IPC, `registry.json`, `state.json` |
| `thiserror` | Fehler-Enums mit Meldungstext |
| `walkdir` | rekursiver Scan des Vault-Ordners |
| `blake3` | `ContentHash` einer Notiz |
| `uuid` | IDs der Vault-Einträge in der Registry |
| `log`, `tauri-plugin-log` | Logging ins Terminal und in eine Datei |
| `tauri-plugin-dialog` | Ordnerauswahl im Vault-Picker (vom Frontend genutzt) |
| `tauri-plugin-prevent-default` | unterdrückt Browser-Shortcuts im Webview |
| `tauri-plugin-opener` | **ungenutzt**, Rest aus dem Template |
