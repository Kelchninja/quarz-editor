# App-Start

[← Übersicht](README.md)

Der Start entscheidet, ob der Nutzer direkt im zuletzt geöffneten Vault landet oder den Vault-Picker sieht. Der Code steht in `lib.rs` → `run()` → `setup()`.

## Ablauf

```mermaid
---
config:
  theme: dark
---
sequenceDiagram
    autonumber
    participant M as main.rs
    box rgba(224,138,60,0.12) Rust-Backend
    participant R as lib.rs · run()
    participant S as setup()
    participant Reg as VaultRegistry
    participant V as Vault
    end
    box rgba(229,83,75,0.14) Platte
    participant D as Dateisystem
    end
    box rgba(76,141,255,0.14) Frontend
    participant F as App.tsx
    end

    M->>R: run()
    opt nur im Debug-Build
        rect rgba(229,83,75,0.16)
        R->>D: src/bindings.ts schreiben
        end
    end
    R->>R: Plugins: log, dialog, opener, prevent-default
    R->>S: setup(app)
    S->>S: app_local_data_dir() + "registry.json"
    rect rgba(229,83,75,0.16)
    S->>Reg: load(registry_path)
    Reg->>D: öffnen + JSON parsen
    D-->>Reg: Inhalt, NotFound oder Fehler
    end
    Reg-->>S: Registry (Fehler: log + empty)
    S->>Reg: last_vault()
    Reg-->>S: Option‹VaultEntry›
    opt letzter Vault bekannt
        rect rgba(229,83,75,0.16)
        S->>V: Vault::open(entry.path)
        V->>D: scan(): Ordner + alle *.md lesen
        D-->>V: Dateien
        end
        V-->>S: Vault (Fehler: log + None)
    end
    rect rgba(163,113,247,0.16)
    S->>S: app.manage(AppState)
    end
    R->>F: Fenster öffnen, Frontend lädt
    F->>R: getVaultMeta()
    R-->>F: VaultMeta oder null
    alt Vault offen
        F->>R: getVaultState(), dann openNote je Tab
    else kein Vault
        F->>F: VaultPicker anzeigen
    end
```

Die Plugins werden **vor** `setup()` initialisiert. Deshalb funktioniert `log::error!` schon im `setup`.

## Entscheidungen beim Start

```mermaid
---
config:
  theme: dark
---
flowchart TD
    start(["setup()"]):::cmd --> dir["app_local_data_dir()"]:::check
    dir -- Fehler --> abort["setup gibt Err zurück,<br/>App startet nicht"]:::err
    dir -- ok --> load[("registry.json lesen")]:::disk
    load -- "fehlt, erster Start" --> empty1["leere Registry"]:::mem
    load -- "kaputt oder nicht lesbar" --> log1["log::error!"]:::log
    log1 --> empty2["VaultRegistry::empty(path)"]:::mem
    load -- ok --> regok["geladene Registry"]:::mem
    empty1 --> last{"last_vault()"}:::check
    empty2 --> last
    regok --> last
    last -- None --> none["vault = None"]:::mem
    last -- "Some(entry)" --> open[("Vault::open → scan")]:::disk
    open -- "Fehler, z.B. Ordner verschoben" --> log2["log::error!"]:::log
    log2 --> none
    open -- ok --> some["vault = Some(Vault)"]:::ok
    none --> manage["app.manage(AppState)"]:::mem
    some --> manage
    manage --> fe{"Frontend:<br/>getVaultMeta()"}:::fe
    fe -- null --> picker["VaultPicker"]:::fe
    fe -- VaultMeta --> editor["Editor, Tabs wiederherstellen"]:::fe

    classDef fe fill:#1e2a40,stroke:#4c8dff,color:#dcdde0
    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef log fill:#3a3216,stroke:#d4a72c,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

| Situation | Ergebnis |
|---|---|
| Erster Start, `registry.json` fehlt | leere Registry → Picker. Die Datei entsteht beim ersten `open_vault`. |
| `registry.json` kaputt | Fehler im Log, leere Registry → Picker. Beim nächsten `open_vault` wird die Datei überschrieben. |
| Letzter Vault existiert nicht mehr | Fehler im Log, `vault = None` → Picker. Der alte Eintrag bleibt in der Registry. |
| Alles da | Vault ist sofort offen, das Frontend stellt die Tabs aus `.quarz/state.json` wieder her. |
| App-Datenordner nicht bestimmbar | `setup` schlägt fehl, die App startet nicht. Kommt praktisch nicht vor. |

## Bindings

Im Debug-Build schreibt `run()` bei **jedem Start** `src/bindings.ts` neu, mit allen Commands und den Typen, die `#[derive(specta::Type)]` haben. Wer einen Command oder Typ ändert, startet einfach `npm run tauri dev`. Im Release-Build passiert das nicht.
