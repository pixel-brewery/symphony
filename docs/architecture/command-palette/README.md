# Befehlspalette

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Befehlspalette ist das ⌘K-Overlay des Hauptfensters. Sie sammelt bei jeder Eingabe Zeilen aus den Produktfeatures (Work Items, Pull Requests, Actions-Läufe und Befehle), ordnet sie in feste Gruppen, führt eine Tastaturauswahl und öffnet die gewählte Zeile. Das Produktverhalten steht im Produkthandbuch unter [Befehlspalette](../../project/command-palette/README.md); Öffnen und Schließen über Kürzel und Suchfeld gehören dem [Fensterrahmen](../window-and-navigation/README.md).

Garantien:

- Jede Datenzeile stammt aus dem Feature, das die Daten besitzt. Die Palette kennt keine Work Items, Pull Requests oder Läufe und importiert kein Feature.
- Eine Zeile führt beim Öffnen entweder eine In-App-Navigation zu einer bestehenden Route aus oder einen bestehenden Feature-Ablauf, der keine Bestätigung braucht. Abläufe mit Bestätigung oder Automatisierungsprüfung (Workflow starten, Agent starten) öffnen den Bildschirm, der diese Bestätigung führt; die Palette ruft nie die bestätigungspflichtige Operation selbst auf.
- Die Palette schließt immer, bevor eine Zeile ausgeführt wird, und führt eine Zeile höchstens einmal aus.
- Die Gruppenreihenfolge ist fest; jede Gruppe hat eine Obergrenze; eine Zeilenkennung erscheint höchstens einmal.
- Ein angezeigtes Tastenkürzel funktioniert tatsächlich an anderer Stelle (Fensterrahmen oder Anwendungsmenü).
- Die Palette persistiert nichts und zeigt keine Zugangsdaten.
- Die bestehende Kontextsuche (`q`-Parameter auf Board, Pull requests, Actions und Orbit) bleibt über denselben `SearchManager` erreichbar.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Ergebnisvertrag, Beitrag der Features über ihre Suchanbieter, Bewertung von Treffern, Gruppierung und Begrenzung, Navigationsbefehle aus der Seitenleistenregistrierung, Kontextfilter, Tastatur- und Zeigerbedienung, Fokusführung, Leer- und Trefferlos-Zustand.
- Nicht enthalten: das Kürzel ⌘K/Ctrl+K und das Suchfeld der Werkzeugleiste (Fensterrahmen), der Erstellungsdialog für Work Items, die Bestätigung eines Workflow-Starts (Actions), das Einstellungsfenster.

## Verantwortungsgrenzen

| Verantwortung                               | Kanonischer Eigentümer                                  | Öffentlicher Vertrag                                                    | Verbraucher                     |
| ------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| Offen/geschlossen, Startanfrage             | Suchcapability (`CommandPalette`, Root-Dienst)          | `open(query?)`, `close()`, `toggle()`, Signale `isOpen`, `initialQuery` | Fensterrahmen, Palettenansicht  |
| Ergebniszeilen eines Features               | jeweiliges Feature                                      | optionale Methode `paletteResults` am `ISearchProvider`                 | Palettenansicht                 |
| Bewertung eines Treffers                    | Suchcapability (`scorePaletteMatch`)                    | reine Funktion                                                          | Features, Palette               |
| Gruppierung, Begrenzung, Auswahl, Ausführen | Palettenansicht und ihr ViewPresenter                   | Template-Vertrag mit `test-id`-Attributen                               | Benutzer                        |
| Navigationsziele                            | Features über `INavigationItem` (Region `desktop-main`) | `NavigationRegistry.byRegion`                                           | Palette (`Go to …`)             |
| Kontextsuche                                | Suchcapability (`SearchManager`)                        | `search(query)` mit `contextualPaths` der Anbieter                      | Palette (`Filter …`, `Clear …`) |

Abhängigkeiten zeigen von den Features zur Suchcapability (Vertrag und Bewertungsfunktion), nie umgekehrt.

## Architekturüberblick

```text
Fensterrahmen ── ⌘K / Suchfeld ──▶ CommandPalette (isOpen, initialQuery)
                                         │ isOpen
                                         ▼
                              Palettenansicht + ViewPresenter
                                         │ je Eingabe (Signal-berechnet)
       ┌─────────────────────────┬───────┴──────────────┬─────────────────────────────┐
       ▼                         ▼                      ▼                             ▼
 Kontextfilter            ISearchProvider[]        NavigationRegistry          (Settings…)
 (SearchManager)          .paletteResults()        Region desktop-main
       └──────────────── Zeilen ─┴──────────────────────┴─────────────────────────────┘
                                         ▼
                      Gruppieren · Sortieren · Begrenzen · Auswahl
                                         ▼
                  Öffnen: close() → Router.navigate | Feature-Ablauf
```

Die Ergebnisse sind ein berechnetes Signal über der Eingabe und den Signalen, die die Anbieter lesen. Ändern sich Feature-Daten bei offener Palette, aktualisiert sich die Liste ohne erneute Eingabe.

## Verträge

### Ergebniszeile `IPaletteResult`

| Feld        | Pflicht | Bedeutung                                                                                                                                                       |
| ----------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`        | ja      | Featureübergreifend eindeutig, Präfix nach Art: `work-item:`, `pull-request:`, `action-run:`, `command:`, `navigation:`. Doppelte Kennungen: die erste gewinnt. |
| `group`     | ja      | `work-items`, `pull-requests`, `action-runs` oder `commands`.                                                                                                   |
| `icon`      | ja      | registrierter Symbolname.                                                                                                                                       |
| `reference` | nein    | Kennung vor dem Titel (`CR-0589`, `#712`, Workflowname). Die Ansicht setzt `reference · title` zusammen.                                                        |
| `title`     | ja      | Name der Zeile oder Befehlsbezeichnung.                                                                                                                         |
| `facts`     | nein    | kurze Angaben der zweiten Zeile; die Ansicht verbindet sie mit `·`.                                                                                             |
| `shortcut`  | nein    | Taste zusammen mit dem Primärmodifikator (⌘ auf macOS, sonst Ctrl). Nur setzen, wenn das Kürzel funktioniert.                                                   |
| `rank`      | ja      | Trefferqualität; höher steht innerhalb der Gruppe weiter oben. Ohne Eingabe `0` (Beitragsreihenfolge).                                                          |
| `action`    | ja      | `{ kind: 'navigate', path, queryParams? }` oder `{ kind: 'execute', execute }`.                                                                                 |

`execute` ist nur für Abläufe ohne Bestätigung zulässig. Ein abgelehntes Versprechen wird verworfen; der Feature-Ablauf meldet seinen Fehler selbst.

### Anbieterbeitrag `ISearchProvider.paletteResults(query, normalizedQuery)`

- `query` ist die getrimmte Eingabe, `normalizedQuery` dieselbe Eingabe in Kleinbuchstaben nach Gebietsschema.
- Mit leerer `normalizedQuery` liefert ein Anbieter nur die Befehle, die beim Öffnen stehen sollen; Datenzeilen nur bei Eingabe.
- Ein Anbieter filtert und bewertet selbst (mit `scorePaletteMatch`) und darf vorab begrenzen; die Palette begrenzt zusätzlich je Gruppe.
- Die Methode liest Signale und hat keine Seiteneffekte.
- Anbieter werden in aufsteigendem `order` abgefragt; bei gleichem Rang bestimmt diese Reihenfolge die Position.

### Bewertung `scorePaletteMatch(normalizedQuery, primary, secondary?)`

1. Die Eingabe wird an Leerraum in Begriffe geteilt; ohne Begriff ist das Ergebnis `0`.
2. Primärfelder (Kennung, Nummer, Titel) werden kleingeschrieben verbunden und an Leerraum sowie `· : / \ , ; # ( ) [ ] { } " ' “ ”` in Wörter geteilt. Bindestriche trennen nicht (`cr-0589` bleibt ein Wort).
3. Je Begriff: Wortanfang in einem Primärfeld `+3`, sonst Vorkommen im Primärtext `+2`, sonst Vorkommen in den Sekundärfeldern `+1`, sonst Ergebnis `0` (jeder Begriff ist Pflicht).
4. Entspricht ein Primärfeld genau der Eingabe oder `#` plus Eingabe, kommen `+5` hinzu.
5. Fehlende oder leere Felder werden ignoriert; Zahlen werden als Text verglichen.

### Gruppierung

| Reihenfolge | Gruppe          | Überschrift     | Obergrenze |
| ----------- | --------------- | --------------- | ---------- |
| 1           | `work-items`    | `WORK ITEMS`    | 5          |
| 2           | `pull-requests` | `PULL REQUESTS` | 5          |
| 3           | `action-runs`   | `ACTION RUNS`   | 4          |
| 4           | `commands`      | `COMMANDS`      | 12         |

Innerhalb einer Gruppe stabil absteigend nach `rank`; leere Gruppen entfallen. Jede Gruppe kennt ihren Startindex in der flachen Tastaturreihenfolge.

### Zeilenquellen in Beitragsreihenfolge

1. **Kontextfilter**, nur wenn die beim Öffnen aktive Route einem `contextualPaths`-Eintrag eines Anbieters entspricht und ein `SearchManager` existiert. Mit Eingabe: `Filter <Ziel> by “<Eingabe>”` mit höchstem Rang, Ausführung `SearchManager.search(Eingabe)`. Ohne Eingabe und mit gesetztem `q`: `Clear the <Ziel> filter` mit `Filtered by “<q>”`, Ausführung `SearchManager.search('')`. `<Ziel>` ist die Bezeichnung des Seitenleistenziels mit genau dieser Route.
2. **Feature-Anbieter** (siehe nächste Tabelle).
3. **Seitenleiste**: `Settings…` (Kürzel `,`, Route `/main/settings`, die das Einstellungsfenster öffnet; zusätzlich gefunden über die Bereichsnamen) und `Go to <Bezeichnung>` je sichtbarem Ziel der Region `desktop-main` in deren Reihenfolge.

### Beiträge der Features

| Feature  | Zeilen                                                                                                                                                                                                                                                                                                                                              | Ausführung                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Work     | Work Items des Workspace-Bereichs; primär Kennung und Titel, sekundär Repository, Projektfelder, Labels, Zuständige, Beschreibung; Fakten: Board-Spalte nach der Spaltenauflösung des Boards, dann `agent running` (neueste Ausführung läuft oder wartet) vor `waiting for you` (Attention-Regel des Boards). Befehl `New work item…` (Kürzel `N`). | `/main/board?item=<id>` beziehungsweise `/main/board?create=true`                                                                              |
| Delivery | Pull Requests; primär `#Nummer` und Titel, sekundär Autor, Branches, Zustandsbezeichnung; offene erhalten `+1`. Fakten: Zustandsbezeichnung, bei offenen der Prüfstand aus dem jeweils neuesten Lauf je Workflow auf Repository und Quellbranch. Befehl `Sync now`.                                                                                 | `/main/pull-requests?q=<Nummer>`; `Sync now` ruft parallel die erzwungene Snapshot-Aktualisierung und die Aktualisierung der Actions-Läufe auf |
| CI       | Läufe; primär Workflowname, Titel, `#Laufnummer`, sekundär Auslöser, Ereignis, Branch, Revision, Zustand; Gleichstand nach Startzeit absteigend. `Run <Workflow> on GitHub` für aktive, manuell startbare Workflows (höchstens drei). `Run workflow…`, solange einer manuell startbar ist.                                                          | `/main/actions?run=<id>` (der Fensterrahmen öffnet daraufhin die Laufdetails); `/main/actions?workflow=<id>&dispatch=github`; `/main/actions`  |
| Arcade   | `Play <Spiel>` für die acht Spiele, nur mit Eingabe und eingeschalteter Arcade-Präferenz.                                                                                                                                                                                                                                                           | `/main/arcade/<spiel>`                                                                                                                         |
| Skills   | `Open <Skill> in Settings` für installierte Pakete (höchstens drei), nur mit Eingabe.                                                                                                                                                                                                                                                               | `/main/settings?section=skills`                                                                                                                |
| Home     | keine eigenen Zeilen; Overview, Inbox und Orbit erscheinen als `Go to …`, die Orbit-Kontextsuche als Kontextfilter.                                                                                                                                                                                                                                 | –                                                                                                                                              |

## Ausführungsabläufe

### Öffnen

1. Der Fensterrahmen ruft `open(query)`; die Ansicht wird nur während `isOpen` gerendert, jeder Öffnungsvorgang erzeugt einen neuen Presenter.
2. Der Presenter übernimmt `initialQuery` als Eingabe und merkt sich die Route zum Öffnungszeitpunkt (für den Kontextfilter).
3. Nach dem ersten Rendern erhält das Suchfeld den Fokus; gelingt das vor der Initialisierung des inneren Eingabefelds nicht, wird es im nächsten Frame wiederholt.

### Tastatur

| Taste (ohne Eingabemethoden-Komposition)   | Befehl     | Wirkung                                                  |
| ------------------------------------------ | ---------- | -------------------------------------------------------- |
| ↓ ohne Alt und Shift                       | `next`     | Auswahl +1 mit Umlauf; Standardaktion verhindert         |
| ↑ ohne Alt und Shift                       | `previous` | Auswahl −1 mit Umlauf                                    |
| ↵ ohne Alt und Shift, auch mit ⌘ oder Ctrl | `open`     | öffnet die Auswahl (kein zweites Hauptfenster vorhanden) |
| Escape                                     | `close`    | schließt; Weitergabe des Ereignisses gestoppt            |
| Tab, Shift+Tab                             | `stay`     | Fokus bleibt im Suchfeld                                 |
| alle anderen                               | –          | gehören dem Suchfeld                                     |

Jede Änderung der Eingabe setzt die Auswahl auf die erste Zeile; schrumpft die Liste, wird die Auswahl auf die letzte Zeile begrenzt. Die ausgewählte Zeile wird nach jedem Rendern mit `block: nearest` sichtbar gehalten. Überfahren mit dem Zeiger wählt aus, ein Klick öffnet; `mousedown` verhindert, dass der Fokus das Suchfeld verlässt.

### Öffnen einer Zeile

1. `close()` der Palette.
2. `navigate`: `Router.navigate([path], { queryParams })`. `execute`: Aufruf im nächsten Mikrotask, Ablehnung wird verworfen.

### Schließen

Beim Zerstören der Ansicht erhält das zuvor fokussierte Element den Fokus zurück, sofern es noch im Dokument ist und nicht `aria-haspopup="dialog"` trägt (das Suchfeld der Werkzeugleiste würde die Palette sonst erneut öffnen).

## Zustände der Ansicht

| Zustand       | Bedingung                         | Darstellung                                              |
| ------------- | --------------------------------- | -------------------------------------------------------- |
| Befehle       | leere Eingabe                     | nur Gruppe `COMMANDS`                                    |
| Treffer       | Eingabe und mindestens eine Zeile | Gruppen in fester Reihenfolge, erste Zeile ausgewählt    |
| Keine Treffer | Eingabe und keine Zeile           | Leerzustand `No results for “<Eingabe>”`; ↵ ohne Wirkung |

## Darstellung

Abgedunkelter Hintergrund (`mosaik-backdrop`, Schwarz mit 32 % ohne Unschärfe), darauf zentriert 110 px unter der Fensteroberkante eine 640 px breite `mosaik-card` mit Erhebung `extrabold`: Kopf mit `mosaik-searchbox` (Darstellung `plain`) und `esc`-Taste, Inhalt als `listbox` mit `option`-Zeilen (Auswahl `aria-selected`, Fläche `neutral-100`), Fuß mit `↑↓ to move · ↵ to open` auf `neutral-50`. Tastenkürzel als eine `mosaik-kbd`-Taste mit Text (`⌘N` auf macOS, sonst `Ctrl+N`), weil ein Wertearray je Taste eine eigene Kappe zeichnet. Die Überschrift des Trefferlos-Zustands steckt im Slot `header`, weil die leere Ansicht bei geänderter `header`-Eingabe nicht neu zeichnet. Eine unsichtbare `aria-live`-Region nennt die ausgewählte Zeile mit Position, weil das Eingabefeld im Shadow DOM liegt und `aria-activedescendant` die Optionen nicht erreicht.

## Sicherheit und Daten

- Keine neue Persistenz, kein neuer IPC-Kanal. Alle Wirkungen laufen über bestehende Routen, `SearchManager` und bestehende Feature-Operationen.
- Bestätigungspflichtige Abläufe werden ausschließlich durch Navigation zu ihrem Bildschirm erreicht.
- Angezeigt werden nur Titel, Kennungen, Zustände, Branches und Beschreibungen, die die Features ohnehin darstellen.

## Offene Integrationspunkte

- **Actions** wertet `workflow` und `dispatch=github` derzeit nicht aus; `Run <Workflow> on GitHub` öffnet daher **Actions** ohne vorgewählten Workflow. Vorgesehen ist, dass Actions bei diesen Parametern seinen bestehenden Startbefehl ausführt, der die Bestätigung von Revision und Eingaben zeigt, und die Parameter danach entfernt.
- `Hide sidebar` ist kein Palettenbefehl, weil der Zustand der Seitenleiste nur im ViewPresenter des Fensterrahmens existiert.
- `⌘↵ to open in a new window` aus dem Entwurf entfällt, solange Symphony kein zweites Hauptfenster öffnen kann.

## Implementierungskarte

| Verantwortung                    | Ort                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verträge                         | `libs/frontend/search/src/lib/models/` (`IPaletteResult`, `PaletteResultGroup`, `PaletteResultAction`, `IPaletteSection`, `ISearchProvider`)                                                                      |
| Bewertung, Gruppierung, Tastatur | `libs/frontend/search/src/lib/palette/` (`scorePaletteMatch`, `projectPaletteSections`, `resolvePaletteKeyCommand`, `movePaletteSelection`, `projectNavigationPaletteResults`, `projectContextualPaletteResults`) |
| Presenter und Ansicht            | `libs/frontend/search/src/lib/view-presenters/CommandPaletteViewPresenter.ts`, `libs/frontend/search/src/lib/views/CommandPaletteView.*`, `libs/frontend/search/src/lib/pipes/PaletteGroupLabelPipe.ts`           |
| Feature-Beiträge                 | `libs/frontend/features/{work,delivery,ci,arcade,skills}/src/lib/search/` (`project*PaletteResults` und der jeweilige `*SearchProvider`)                                                                          |

## Verifikation

- Unit-Tests neben jeder Datei unter `palette/`, `pipes/`, `view-presenters/`, `views/` sowie neben jeder `project*PaletteResults`-Funktion und den erweiterten Suchanbietern.
- End-to-End: `apps/renderer-e2e/src/command-palette.spec.ts` (⌘K, Eingabe, Pfeiltasten mit Umlauf, Esc, Trefferlos-Zustand, Suchfeld der Werkzeugleiste, Navigationsbefehl, Kürzel als Umschalter, ↵ öffnet ein Work Item) und `apps/renderer-e2e/src/contextual-search.spec.ts` (Filtern und Aufheben auf Board, Pull requests, Actions und Orbit über die Palette).
- Abnahme: ⌘K öffnet mit fokussiertem Suchfeld; ↑/↓ laufen um; ↵ öffnet und schließt; Esc schließt ohne Wirkung; ohne Treffer erscheint der Leerzustand; kein bestätigungspflichtiger Ablauf startet direkt aus der Palette.
