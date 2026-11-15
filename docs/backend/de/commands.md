# Commands

[← Übersicht](README.md)

Commands sind die einzige Schnittstelle zwischen Frontend und Backend. Alle stehen in `commands/vault.rs`, registriert werden sie in `lib.rs` per `collect_commands!`. Das Frontend ruft sie über die generierten Funktionen in `src/bindings.ts` auf, zum Beispiel `commands.saveNote(text, path)`.

## Übersicht

| Command | Parameter | Rückgabe | Lock | Platte | Fehler geloggt |
|---|---|---|---|---|---|
| `open_vault` | `path: String` | `VaultMeta` | Registry, dann Vault | 🔴 scannt ganzen Ordner, schreibt `registry.json` | ja |
| `get_vault_meta` | – | `Option<VaultMeta>` | Vault | – | nein |
| `open_note` | `path: VaultPath` | `String` (Inhalt) | Vault | 🔴 liest `.md` | ja |
| `create_note` | `path: VaultPath` | `VaultMeta` | Vault | 🔴 legt leere Datei an | ja |
| `create_folder` | `path: VaultPath` | `VaultMeta` | Vault | 🔴 legt Ordner an | ja |
| `rename_note` | `name: String`, `path: VaultPath` | `VaultMeta` | Vault | 🔴 benennt Datei um | ja |
| `save_note` | `content: String`, `path: VaultPath` | `()` | Vault | 🔴 schreibt `.md` atomar | ja |
| `get_vault_state` | – | `VaultState` | Vault | 🔴 liest `.quarz/state.json` | kaputte Datei: ja |
| `save_vault_state` | `vault_state: VaultState` | `()` | Vault | 🔴 schreibt `.quarz/state.json` atomar | ja |

Alle Commands geben `Result<T, String>` zurück. Commands, die etwas am Vault ändern, liefern die neue `VaultMeta` mit, damit die Sidebar ohne zweiten Aufruf aktuell ist.

## Gemeinsames Muster

Fast jeder Command besteht aus `with_vault` plus einem Aufruf der Fachlogik plus `log_err`:

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
    lock -- "vergiftet" --> e1["Err(String)"]:::err
    lock -- ok --> some{"Vault offen?"}:::check
    some -- None --> e2["Err: No vault open"]:::err
    some -- Some --> f["Closure mit &mut Vault"]:::cmd
    f --> logic["Fachlogik, oft mit Plattenzugriff"]:::disk
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

| Helfer | Datei | Macht |
|---|---|---|
| `with_vault(state, f)` | `commands/helper.rs` | sperrt `state.vault`, gibt `"No vault open"` zurück, wenn `None`, ruft sonst `f(&mut Vault)` auf |
| `with_registry(state, f)` | `commands/helper.rs` | sperrt `state.registry` und ruft `f(&mut VaultRegistry)` auf |
| `log_err(context)` | `logging/logging.rs` | Closure für `map_err`: loggt `"{context}: {e}"` als Fehler und gibt `e.to_string()` zurück |

### Geprüfte Parameter

Parameter vom Typ `VaultPath` werden **beim Deserialisieren** geprüft, bevor der Command überhaupt läuft. Ein Pfad wie `../../etc/passwd` kommt nie im Command an, das Frontend bekommt direkt einen Fehler. Details unter [Vault → VaultPath](vault.md#vaultpath).

## open_vault

Öffnet einen neuen Vault aus dem Picker und merkt ihn sich in der Registry.

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
    box rgba(224,138,60,0.12) Rust-Backend
    participant C as open_vault
    participant V as Vault
    participant Reg as Mutex‹VaultRegistry›
    participant St as Mutex‹Option‹Vault››
    end
    box rgba(229,83,75,0.14) Platte
    participant D as Dateisystem
    end

    P->>C: openVault(path)
    rect rgba(229,83,75,0.16)
    C->>V: Vault::open(path), ohne Lock
    V->>D: scan()
    D-->>V: Ordner + Notizen
    end
    alt Scan fehlgeschlagen
        rect rgba(219,97,162,0.14)
        V-->>C: VaultError
        C-->>P: error, geloggt per log_err
        end
    else ok
        V-->>C: Vault
        C->>C: VaultMeta::of(&vault)
        rect rgba(163,113,247,0.16)
        C->>Reg: lock, remember(root)
        end
        rect rgba(229,83,75,0.16)
        Reg->>D: save(): registry.json atomar
        end
        Note over Reg,D: Fehler beim Speichern wird nur geloggt,<br/>der Vault öffnet trotzdem
        rect rgba(163,113,247,0.16)
        C->>St: lock, Some(vault) ersetzt den alten Vault
        end
        C-->>P: VaultMeta
    end
```

## save_note (Autosave)

Das Frontend ruft `save_note` 500 ms nach dem letzten Tastendruck auf, getrennt pro Notiz.

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
    box rgba(224,138,60,0.12) Rust-Backend
    participant C as save_note
    participant V as Vault
    end
    box rgba(229,83,75,0.14) Platte
    participant D as Dateisystem
    end

    E->>E: 500 ms ohne Tippen
    E->>T: save(path, text)
    T->>C: saveNote(content, path)
    rect rgba(163,113,247,0.16)
    C->>V: with_vault, lock
    V->>V: files.get_mut(path)
    end
    alt Notiz nicht im Index
        rect rgba(219,97,162,0.14)
        V-->>C: NotFound
        C-->>T: error
        end
    else bekannt
        rect rgba(229,83,75,0.16)
        V->>D: write(Notiz.md.tmp)
        V->>D: rename(Notiz.md.tmp → Notiz.md)
        end
        V->>V: ContentHash aktualisieren
        C-->>T: ok
        T->>T: savedText merken
    end
```

`save_note` legt keine Notiz an. Eine Notiz, die nicht im Index steht, wird abgelehnt. Die `.md.tmp`-Datei endet nicht auf `.md` und wird deshalb vom Scan ignoriert, falls sie nach einem Absturz liegen bleibt.

## rename_note

Benennt nur Notizen um, und nur innerhalb ihres Ordners. `name` ist der neue Name **ohne** `.md`.

```mermaid
---
config:
  theme: dark
---
flowchart TD
    s(["rename_note(name, path)"]):::cmd --> md{"path endet auf .md?"}:::check
    md -- nein --> e1["NotMarkdown"]:::err
    md -- ja --> nm{"name leer oder mit / ?"}:::check
    nm -- ja --> e2["NotAllowed"]:::err
    nm -- nein --> np{"Ordner + name.md<br/>gültiger VaultPath?"}:::check
    np -- nein --> e2
    np -- ja --> same{"gleich wie vorher?"}:::check
    same -- ja --> done["Ok, nichts zu tun"]:::ok
    same -- nein --> idx{"alter Pfad im Index?"}:::mem
    idx -- nein --> e3["NotFound"]:::err
    idx -- ja --> ex{"Ziel existiert schon?<br/>nur Groß/Klein geändert ist erlaubt"}:::disk
    ex -- ja --> e4["AlreadyExists"]:::err
    ex -- nein --> mv[("fs::rename")]:::disk
    mv --> up["Index: alten Pfad raus,<br/>neuen rein, Hash bleibt"]:::mem
    up --> meta["neue VaultMeta"]:::ok

    classDef cmd fill:#3a2a1c,stroke:#e08a3c,color:#dcdde0
    classDef mem fill:#2a2140,stroke:#a371f7,color:#dcdde0
    classDef disk fill:#3a1e22,stroke:#e5534b,color:#dcdde0
    classDef check fill:#163236,stroke:#39c5cf,color:#dcdde0
    classDef ok fill:#1c3326,stroke:#3fb27f,color:#dcdde0
    classDef err fill:#3a1c30,stroke:#db61a2,color:#dcdde0,stroke-dasharray:5 3
```

Die Prüfung „Ziel existiert schon“ ist nötig, weil `fs::rename` eine vorhandene Datei sonst still überschreibt. Die Ausnahme für Groß/Klein-Änderungen braucht Windows: Dort „existiert“ `notiz.md` schon, wenn man `Notiz.md` in `notiz.md` umbenennt.

## get_vault_state / save_vault_state

Merken sich die offenen Tabs pro Vault. Das Frontend ist die Wahrheit, das Backend liest und schreibt nur die Datei.

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
    box rgba(224,138,60,0.12) Rust-Backend
    participant G as get_vault_state
    participant S as save_vault_state
    participant VS as VaultState
    end
    box rgba(229,83,75,0.14) Platte
    participant D as .quarz/state.json
    end

    Note over T: nach Start oder open_vault
    T->>G: getVaultState()
    rect rgba(229,83,75,0.16)
    G->>VS: load(root)
    VS->>D: lesen + parsen
    end
    VS-->>G: State. Fehlt: leer. Kaputt: log + leer
    G->>G: retain_existing: nur Notizen, die im Index stehen
    G-->>T: VaultState
    T->>T: Tabs öffnen, Fokus setzen, restored = true
    loop bei jeder Tab-Änderung
        T->>T: 300 ms warten, Debounce
        T->>S: saveVaultState(state)
        rect rgba(229,83,75,0.16)
        S->>D: .quarz anlegen, tmp schreiben, umbenennen
        end
        S-->>T: ok oder error
    end
```

`retain_existing` entfernt Tabs von Notizen, die außerhalb der App gelöscht wurden. War die fokussierte Notiz darunter, bekommt der letzte verbleibende Tab den Fokus.

## get_vault_meta / open_note / create_note / create_folder

| Command | Ablauf |
|---|---|
| `get_vault_meta` | Lock, `VaultMeta::of(vault)` bzw. `None`, wenn kein Vault offen ist. Kein Plattenzugriff, das Frontend ruft es beim Start auf. |
| `open_note` | `fs::read_to_string` der Datei, gibt den Text zurück. Steht **nicht** im Index? Wird trotzdem gelesen, solange die Datei existiert. |
| `create_note` | Pfad muss auf `.md` enden, `File::create_new` (schlägt fehl, wenn es die Datei schon gibt), Hash des leeren Texts in den Index. Den freien Namen („Unbenannt 1.md“) sucht das Frontend aus. |
| `create_folder` | `fs::create_dir` (Elternordner muss existieren), Pfad in `folders`. |
