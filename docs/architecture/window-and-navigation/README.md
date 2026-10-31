# Fensterrahmen und Navigation des Hauptfensters

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der Fensterrahmen des Hauptfensters (Window Chrome) besteht aus einer Seitenleiste (Source List), einer einheitlichen Werkzeugleiste und einer Statusleiste. Er gehört der Präsentationsschicht des Renderers; die Bildschirme liefern nur Inhalte in klar begrenzte Verträge. Das funktionale Verhalten steht im Produkthandbuch unter [Hauptfenster und Navigation](../../project/window-and-navigation/README.md); das separate Einstellungsfenster beschreibt [Einstellungsfenster](settings-window.md).

Garantien:

- Jedes Hauptfensterziel stammt aus einem feature-eigenen Navigationsbeitrag. Der Rahmen kennt keine festen Ziele außer **Settings**.
- Eine Seitenleistenzahl ist entweder eine positive ganze Zahl aus der Datenquelle des Zielbereichs oder fehlt. Laden, Nichtverfügbarkeit und null erzeugen nie eine sichtbare `0`.
- Titel, Untertitel und Aktionen der Werkzeugleiste gehören dem aktuell aktiven Bildschirm. Ein Bildschirm, der zerstört wird, kann die Registrierung seines Nachfolgers nicht entfernen.
- **Back** und **Forward** spiegeln die tatsächliche Router-Historie des Fensters; sie sind gesperrt, wenn in die jeweilige Richtung kein Eintrag existiert.
- Der Synchronisierungshinweis der Statusleiste meldet nie einen besseren Stand als die schwächste der beiden GitHub-Datenquellen.
- Der Renderer sendet für Fenster- und Einstellungsaktionen nur benannte, schemavalidierte Desktop-Anfragen; er erhält keine Electron-Objekte, Fensteroptionen oder freien Routen.
- Der Rahmen selbst speichert nur zwei lokale Darstellungspräferenzen und keine fachlichen Daten; die Workspace-Auswahl speichert das Workspace-Feature über den Einstellungsschreiber.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Aufbau des Hauptfensters, Navigationsbeitragsvertrag, Seitenleistenzahlen, Workspace-Umschalter, Laufpanel, Werkzeugleistenregistrierung, Historie, Tastenkürzel, Statusleiste, Plattformrahmen (macOS-Ampelknöpfe, Window Controls Overlay unter Windows und Linux), Startziel und persistierte Darstellungspräferenzen.
- Nicht enthalten: Inhalte von Overview, Inbox, Board und weiteren Bildschirmen; Suche und Ergebnisse der [Befehlspalette](../../project/command-palette/README.md) (der Rahmen öffnet, schaltet und schließt sie nur); das Benachrichtigungscenter hinter der Glocke der Statusleiste; das Menüleisten-Menü (Tray); der innere Aufbau des Einstellungsfensters. Der Downloadablauf des Updates gehört zu [Anwendungsupdates](../application-updates/README.md); der Rahmen stellt nur dessen Zustand dar.

## Verantwortungsgrenzen

| Verantwortung                                  | Kanonischer Eigentümer                                                | Öffentlicher Vertrag                                             | Verbraucher                             |
| ---------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------- |
| Fensteraufbau, Historie, Tastenkürzel          | Presenter-View und ihr ViewPresenter im Präsentationspaket            | Router-Outlet, `WindowToolbar`, Navigationsregion `desktop-main` | alle Hauptfensterbildschirme            |
| Ziele der Seitenleiste                         | jeweiliges Produktfeature                                             | `INavigationItem` in Region `desktop-main`                       | Seitenleiste                            |
| Zahlen der Seitenleiste                        | Feature des Ziels                                                     | `count`-Funktion und `countTone` am Navigationsbeitrag           | Seitenleiste                            |
| Titel, Untertitel, Aktionen der Werkzeugleiste | jeweiliger Bildschirm                                                 | `WindowToolbarDirective` auf einem `ng-template`                 | Werkzeugleiste                          |
| Laufprojektion                                 | Execution-Feature (`buildRailRuns`), Agent-Aktivität im Domänenmodell | lesende Projektion über Snapshot und CI-Läufe                    | Laufpanel, Menüleisten-Menü             |
| Updatezustand                                  | Electron Main (Update-Koordinator), im Renderer `DesktopUpdateStore`  | `UpdateState` über die Desktop-Bridge                            | Statusleiste, Einstellungen, Menüleiste |
| Plattformrahmen                                | Electron Main                                                         | `BrowserWindow`-Optionen, CSS-`env(titlebar-area-*)`             | Haupt- und Einstellungsfenster          |
| Gemeinsame Uhr für relative Zeiten             | Frontend Core (`Clock`, `formatRelativeTime`)                         | Signal `now`, Pipe `relativeTime`                                | Statusleiste, Listen mit Altersangaben  |

Abhängigkeiten zeigen vom Rahmen zu den öffentlichen Verträgen der Features. Der Rahmen importiert keine Feature-Interna; Features importieren den Rahmen nicht.

## Architekturüberblick

```text
mosaik-app (hasHeader=false, hasNav=false)
└── Fensterinhalt (Spalte, volle Höhe)
    ├── Zeile
    │   ├── Seitenleiste 240 px            (nur wenn nicht ausgeblendet)
    │   │   ├── Kopfzeile 52 px            Ziehbereich, Platz für macOS-Ampelknöpfe, „Hide sidebar“
    │   │   ├── Workspace-Umschalter       (nur mit aktivem Workspace)
    │   │   ├── Navigation                 Gruppen und Ziele aus Region desktop-main
    │   │   ├── Laufpanel                  (nur wenn Execution- oder CI-Feature enthalten)
    │   │   └── „Settings“                 öffnet das Einstellungsfenster
    │   └── Inhaltsspalte
    │       ├── Werkzeugleiste 52 px       Ziehbereich: Show sidebar?, Back, Forward, Titel/Untertitel, Aktionen, Suchfeld
    │       └── main                       Router-Outlet, eigener Scrollbereich, aria-busy beim Laden
    ├── Statusleiste 28 px                 volle Fensterbreite
    └── Befehlspalette                     nur während sie geöffnet ist
```

Die Bereiche sind einfache Elemente mit `part`-Namen (`window-sidebar`, `window-toolbar`, `window-content`, `window-status-bar`, `workspace-switcher`, `run-switch`, `window-drag-region`, `window-no-drag`). Ein einziges globales Stylesheet ordnet ihnen Flächen, Linien und kompakte Steuerelementdichte zu; siehe [Gestaltungsvertrag](#gestaltungsvertrag).

## Verträge

### Navigationsbeitrag

Ein Feature trägt Ziele über `withNavigationItems` zur Navigationsregistrierung bei. Ein Ziel hat:

| Feld        | Pflicht | Bedeutung                                                                                  |
| ----------- | ------- | ------------------------------------------------------------------------------------------ |
| `key`       | ja      | stabile Kennung; Testkennung `navigation-<key>`, Zahl `navigation-count-<key>`             |
| `label`     | ja      | sichtbare Beschriftung und Rückfalltitel der Werkzeugleiste                                |
| `icon`      | ja      | registrierter Symbolname                                                                   |
| `route`     | ja      | bestehende Anwendungsroute                                                                 |
| `order`     | ja      | Position innerhalb der Region                                                              |
| `region`    | ja      | `desktop-main` für die Seitenleiste                                                        |
| `group`     | nein    | Überschrift der Gruppe, etwa `Delivery`                                                    |
| `count`     | nein    | reaktive Funktion; `undefined` blendet die Zahl aus                                        |
| `countTone` | nein    | `attention` (rotes, gefülltes kleines Abzeichen) oder `quiet` (neutrale Beschriftungszahl) |
| `isVisible` | nein    | reaktive Sichtbarkeitsbedingung                                                            |

Die Registrierung liefert für eine Region alle sichtbaren Ziele, sortiert nach `order` und bei Gleichstand nach `key`. Die Seitenleiste bildet daraus Gruppen: Ziele ohne `group` bilden die führende, unbeschriftete Gruppe; jede benannte Gruppe erscheint in der Reihenfolge ihres ersten Ziels. Eine Gruppe ohne sichtbares Ziel entsteht nicht. Das aktive Ziel bestimmt `routerLinkActive` und erhält `aria-current="page"` sowie die Darstellung `soft`; alle anderen Ziele sind `plain`.

Aktuelle Beiträge der Desktopkomposition:

| Feature  | `key`           | `label`         | `route`               | `order` | `group`    | Zahl und Ton                                                                               |
| -------- | --------------- | --------------- | --------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------ |
| Home     | `home`          | `Overview`      | `/main/home`          | 10      | –          | keine                                                                                      |
| Home     | `inbox`         | `Inbox`         | `/main/inbox`         | 20      | `Delivery` | `attention`; Anzahl der Entscheidungen der Inbox-Projektion; ohne Snapshot keine Zahl      |
| Work     | `board`         | `Board`         | `/main/board`         | 30      | `Delivery` | `quiet`; Anzahl der Work Items, die Aufmerksamkeit brauchen, sobald ein Snapshot existiert |
| Delivery | `pull-requests` | `Pull requests` | `/main/pull-requests` | 40      | `Delivery` | `quiet`; Pull Requests mit Zustand `open` im aktuellen Snapshot; ohne Snapshot keine Zahl  |
| CI       | `actions`       | `Actions`       | `/main/actions`       | 50      | `Delivery` | `attention`; Workflows, deren jüngster abgeschlossener Lauf `failed` ist                   |
| Home     | `orbit`         | `Orbit`         | `/main/orbit`         | 55      | `Delivery` | keine                                                                                      |
| Arcade   | `arcade`        | `Arcade`        | `/main/arcade`        | 60      | `More`     | keine; `isVisible` folgt der gespeicherten Arcade-Präferenz                                |

Jede `count`-Funktion gibt für den Wert `0` ebenfalls `undefined` zurück. Die Board-Zahl verwendet dieselbe Auswahl wie die Aufmerksamkeitskachel und der Kartenhinweis des Boards: ein Work Item zählt, wenn seine neueste Ausführung fehlgeschlagen ist oder wenn die Supervisor-Prüfung es nicht weiterbewegen würde (fehlende oder nicht bereite Analyse, kritische Risikoklasse, offene harte Abhängigkeit). Die Actions-Zahl gruppiert Läufe nach Repository-Bindung und Workflow-ID, ersatzweise Workflow-Namen, berücksichtigt nur abgeschlossene Läufe (`succeeded`, `failed`, `cancelled`), wählt je Gruppe den Lauf mit dem jüngsten `finishedAt`, ersatzweise `startedAt`, und zählt die Gruppen, deren gewählter Lauf `failed` ist.

Die Region `workspace-menu` existiert weiterhin in der Registrierung (Beitrag `setup` → `/main/setup`), wird aber von keiner Oberfläche des neuen Rahmens dargestellt. **Skills** hat keinen Navigationsbeitrag; die frühere Route `/main/skills` leitet auf `/main/settings?section=skills` um und öffnet damit das Einstellungsfenster im Bereich **Skills**.

### Workspace-Umschalter

- Sichtbar nur, wenn ein aktiver Workspace existiert.
- Zeigt das Kürzel als Avatar (die ersten zwei Zeichen, in Großbuchstaben), den Anzeigenamen und `owner/name` der ersten aktivierten Repository-Bindung dieses Workspace; ohne solche Bindung entfällt die Zeile.
- Das Menü listet alle aktivierten Workspaces (Name, Kürzel als Unterzeile, aktiver markiert), sofern das Workspace-Feature den Umfang ändern darf (`workspaceScopeAvailable`), gefolgt von einem Trenner und **Manage workspaces…**.
- Die Auswahl schließt das Menü und ruft `selectWorkspaceScope(workspaceId)` des Workspace-Features auf. Dieses ignoriert unbekannte, deaktivierte und bereits aktive Workspaces und speichert sonst über den einzigen Einstellungsschreiber `activeViewScope.workspaceIds = [workspaceId]`; eine gespeicherte Ansicht wird verworfen, eine Board-Auswahl bleibt nur, wenn sie zum neuen Workspace gehört. Der Rahmen wählt damit immer genau einen Workspace.
- **Manage workspaces…** sendet `settings.open` ohne Parameter.

### Werkzeugleistenregistrierung

`WindowToolbar` ist ein anwendungsweiter Dienst mit einer geordneten Liste von Registrierungen `{ owner, title, subtitle, actions? }`. `register(owner, …)` ersetzt eine bestehende Registrierung desselben Besitzers an ihrer Position oder hängt sie an; `unregister(owner)` entfernt nur Registrierungen dieses Besitzers. Angezeigt wird immer die letzte Registrierung. Ein Bildschirm verwendet die Direktive auf einem `ng-template`:

```html
<ng-template symphonyWindowToolbar [toolbarTitle]="'Board'" [toolbarSubtitle]="subtitle">
  <mosaik-button [label]="'New work item'" />
</ng-template>
```

Der Inhalt der Vorlage wird als Aktionen gerendert und behält die Bindungen des Bildschirms. `toolbarActions=false` registriert nur Titel und Untertitel. Die Direktive aktualisiert ihre Registrierung reaktiv und entfernt sie beim Zerstören. Ohne Registrierung zeigt die Werkzeugleiste das `label` des Seitenleistenziels, dessen `route` dem aktuellen Pfad (ohne Query) entspricht oder ihn als Präfix mit `/` enthält; sonst bleibt der Titel leer. Der Titel trägt `role="heading"` und `aria-level="1"`.

### Historie für Back und Forward

Der ViewPresenter führt eine eigene Liste der Router-Navigations-IDs mit aktuellem Index:

| Ereignis bei `NavigationEnd`                                               | Wirkung                                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Auslöser `popstate` mit wiederhergestellter ID, die in der Liste existiert | Index springt auf diese ID; die Liste bleibt unverändert.                                |
| Navigation mit `replaceUrl`                                                | Die ID an der aktuellen Position wird ersetzt; der Index bleibt.                         |
| jede andere Navigation                                                     | Alle Einträge hinter dem Index werden verworfen, die neue ID wird angehängt und aktuell. |

`canGoBack` gilt bei Index > 0, `canGoForward` bei Index < letzter Position. Die Befehle rufen `Location.back()` und `Location.forward()` auf. Entfernt ein Zielbildschirm eine Einmalabsicht wie `?create=true` per `replaceUrl`, ersetzt das den aktuellen Eintrag, statt einen zusätzlichen anzulegen.

### Laufpanel

Das Laufpanel liest die gemeinsame Laufprojektion (`buildRailRuns`) aus Ausführungen, Ausführungswarteschlange, Ereignissen, Work Items, CI-Läufen, lokalen CI-Ausführungen und dem aktiven lokalen Lauf. Die Projektion stellt wartende Schritte voran und hält danach höchstens 100 Einträge, neueste zuerst.

| Teil                  | Regel                                                                                                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schalter              | nur sichtbar, wenn Execution- und CI-Feature enthalten sind; Segmente `Agents` und `Actions`, das gewählte `soft` mit `aria-pressed`                                                                                                                                             |
| Startwert             | gespeicherter Wert, sonst `agents`, wenn das Execution-Feature enthalten ist, sonst `actions`                                                                                                                                                                                    |
| Agent-Zeilen          | jedes aktivierte Agent-Profil des aktiven Workspace; Zustand aus der Agent-Aktivitätsprojektion (`working`, `queued`, `needs-input`, `paused`, `blocked`, `failed`, `completed`, sonst `idle`); Rolle der aktuellen Arbeit bestimmt das Verb; Work-Item-Kennung aus `externalId` |
| Läufe heute           | Ausführungen dieses Profils mit `startedAt` ab lokaler Mitternacht des gemeinsamen Uhrwerts                                                                                                                                                                                      |
| Agent öffnen          | nur mit Ausführungs-ID der aktuellen Arbeit; öffnet den Ausführungs-Drawer oder lenkt die Aufmerksamkeit auf einen bereits offenen                                                                                                                                               |
| Wartende Schritte     | Projektionseinträge `kind = agent` mit `queueEntryId`; Entfernen ruft `execution-queue.remove` mit der Eintrags-ID und stoppt die Ereignisweitergabe                                                                                                                             |
| Aktuelle Action-Läufe | Einträge mit `kind ≠ agent`, die `active` sind (GitHub-Status `in-progress` oder der aktive lokale Lauf), danach der erste nicht aktive Eintrag mit Zustand `failed` (der jüngste Fehlschlag)                                                                                    |
| Segmentzahl           | Anzahl aktiver Action-Läufe; `Actions · <n>` nur bei n > 0                                                                                                                                                                                                                       |
| Lauf öffnen           | Eintrag mit Ausführungs-ID öffnet den Ausführungs-Drawer, sonst den Action-Drawer; ein bereits offener Drawer derselben Art wird nur hervorgehoben                                                                                                                               |
| Leer                  | Agents: `No agent in this workspace` und **Open AI team** (`settings.open` mit `workspace=<aktive ID>`, `section=team`); Actions: `No action is running`, `Runs appear here as soon as one starts.`                                                                              |

Ein Actions-Deep-Link `/main/actions?run=<ciRunId>` öffnet den Action-Drawer des passenden Projektionseintrags genau einmal je Lauf-ID, sobald der Eintrag existiert; ein Verlassen der Route oder ein Link ohne `run` setzt das zurück.

### Synchronisierungsstand

Quelle sind die Remote-Daten-Status `pullRequests` und `ciRuns` des Snapshots, jeweils `{ state: current | stale | unavailable, lastSuccessfulRefreshAt?, reason?: authentication-required | rate-limited, retryAt? }`.

1. Fehlen beide Quellen, entfällt der Hinweis.
2. Der Gesamtzustand ist `unavailable`, wenn eine Quelle `unavailable` ist, sonst `stale`, wenn eine Quelle `stale` ist, sonst `current`.
3. Die Zeitangabe ist die früheste vorhandene `lastSuccessfulRefreshAt`.
4. `rateLimited` gilt, wenn eine Quelle `reason = rate-limited` hat; deren `retryAt` wird als Uhrzeit gezeigt.
5. Anzeige in dieser Priorität: `current` → `Synced with GitHub <relative Zeit>`; `rateLimited` → `GitHub request limit reached[ · try again at <Uhrzeit>]`; `stale` → `GitHub sync paused[ · last synced <relative Zeit>]`; sonst `GitHub is unavailable`.
6. Außer bei `current` erscheint **Retry**. Es ruft `IPresentationContext.synchronize()` auf: zuerst die Snapshot-Aktualisierung über `OrchestrationSynchronizer.refresh()` (Work Items, Pull Requests), danach, wenn das CI-Feature enthalten ist, die CI-Lauf-Aktualisierung. Die Reihenfolge ist verbindlich, weil ein parallel eintreffender Snapshot die frischeren CI-Läufe ersetzen würde. Busy gilt, solange eine der beiden läuft; ein zweiter Klick währenddessen wird ignoriert.

Relative Zeiten verwenden eine gemeinsame Uhr, die alle 30 Sekunden tickt. `formatRelativeTime(wert, jetzt, mitSuffix)` liefert unter einer Minute `just now`, unter einer Stunde `<n> min ago`, unter einem Tag `<n> h ago`, ab dem Vortag `Yesterday`, unter sieben Tagen `<n> days ago` und danach `on <Mon> <Tag>` (`en-US`); ungültige oder fehlende Werte ergeben eine leere Zeichenfolge.

### Statusleiste: Version und Update

Ist ein Updatezustand bekannt, zeigt die Statusleiste `Symphony v<currentVersion>`. Die Updateschaltfläche folgt dem Zustand:

| `UpdateState.kind` | Darstellung                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `available`        | Nur-Symbol-Schaltfläche `download`, Beschriftung und Tooltip `Download Symphony <targetVersion>`; Klick startet den Download, solange der Store nicht beschäftigt ist                          |
| `downloading`      | dieselbe Schaltfläche gesperrt, Tooltip `Downloading the update…`; darüber ein `ProgressRing` 0–100 mit `role="progressbar"` und `aria-valuenow` in ganzen Prozent; ohne `progress` unbestimmt |
| `ready`            | beschriftete Schaltfläche **Restart to update** mit Symbol `sync`, `aria-label` `Install Symphony <targetVersion> and restart`, Busy während der Anfrage                                       |
| sonst              | keine Schaltfläche                                                                                                                                                                             |

Zwischen Synchronisierungshinweis und Version sitzt die Glocke **Notifications** (Symbol `bell`, `test-id="notification-bell"`) des Notification-Pakets mit ihrem Zähler; sie öffnet das Benachrichtigungscenter, dessen Inhalt nicht zu diesem Vertrag gehört.

### Tastenkürzel und Suchfeld

- Fensterweit im Renderer: Primärmodifikator (⌘ auf macOS, sonst Ctrl) ohne Alt und Shift. `K` schaltet die Befehlspalette um; `N` schließt die Palette und navigiert nach `/main/board?create=true`. Das Board öffnet daraufhin seinen Erstellungsdialog und entfernt den Parameter per `replaceUrl`.
- macOS wird über `navigator.platform` erkannt; davon hängen Kürzeltext und Ampelreserve ab.
- Das Suchfeld (`Search  ⌘K` beziehungsweise `Search  Ctrl+K`, `aria-haspopup="dialog"`) verhindert Fokus und Zeigerereignis, entfernt den Fokus und öffnet die Palette. Ein druckbares Zeichen ohne Modifikator öffnet sie mit diesem Zeichen als Startanfrage; `Enter` und `ArrowDown` öffnen sie leer.
- Das Anwendungsmenü von Electron Main trägt dieselben Kürzel als Accelerator (siehe [Einstellungsfenster](settings-window.md#anwendungsmenü)).

### Persistierte Darstellungspräferenzen

| Schlüssel im `localStorage` des Renderers | Werte                   | Standard                  | Wirkung                          |
| ----------------------------------------- | ----------------------- | ------------------------- | -------------------------------- |
| `presentation.isSidebarCollapsed`         | `'true'`, `'false'`     | `false`                   | Seitenleiste ausgeblendet        |
| `presentation.runView`                    | `'agents'`, `'actions'` | siehe Laufpanel-Startwert | gewähltes Segment des Laufpanels |

Andere Werte gelten als nicht gesetzt. Ist der Speicher nicht zugreifbar, gelten die Standards, und Änderungen werden nicht gespeichert. Es gibt keine weitere Persistenz für den Rahmen.

## Startziel und Routing

`presentationRoutes(children, windows)` ordnet die Feature-Seiten unter `main` und verwendet die erste konkrete Kindroute (mit Pfad, nicht `**`, ohne `redirectTo`) als Start- und Rückfallziel. Die Home-Routen beginnen mit `home`, sodass `''`, `main` und jede unbekannte Adresse nach `/main/home` führen; `/main/dashboard` leitet ebenfalls dorthin. Weitere Fenster wie `settings` sind Routen der obersten Ebene neben `main` und `menu-bar` und laden den Rahmen des Hauptfensters nicht. Eine Komposition ohne konkrete Seite wird beim Start abgewiesen.

## Plattformrahmen

Haupt- und Einstellungsfenster verwenden dieselben Fensteroptionen aus Electron Main:

| Plattform         | Optionen                                                                                                                                                                                                                                            | Renderer-Seite                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS             | `frame: false`, `titleBarStyle: hiddenInset`, `titleBarOverlay: true`, transparenter Hintergrund, `vibrancy: sidebar`, `visualEffectState: followWindow`, `trafficLightPosition { x: 20, y: 18 }` (16 px hohe Knöpfe mittig in der 52 px Kopfzeile) | Preload setzt `data-native-vibrancy="true"`; Dokumenthintergrund transparent. Bei ausgeblendeter Seitenleiste 80 px linke Reserve in der Werkzeugleiste. |
| Windows und Linux | `frame: false`, `titleBarStyle: hidden`, `titleBarOverlay { color: Hintergrund, symbolColor: Vordergrund, height: 52 }`, `autoHideMenuBar: true`, Hintergrund nach Systemerscheinungsbild                                                           | Die Werkzeugleiste reserviert rechts `12px + (100vw − titlebar-area-x − titlebar-area-width)`.                                                           |

Die Farben sind Sohos Rollen `background` (`#ffffff` hell, `#0a0a0a` dunkel) und `foreground` (`#0a0a0a` hell, `#fafafa` dunkel). Bei einer Änderung des Systemerscheinungsbilds setzt Main unter Windows und Linux Hintergrund und Overlay beider Fenster neu; das Menüleistenfenster erhält den neuen Hintergrund auf jeder Plattform, auf der es existiert. Werkzeugleiste und Seitenleistenkopf sind `app-region: drag`; Schaltflächen, Suchfeld, Dropdown-Schaltflächen und `window-no-drag`-Bereiche sind davon ausgenommen. Das Hauptfenster öffnet in 1440 × 940 px und lässt sich bis 400 × 270 px verkleinern.

## Gestaltungsvertrag

Alle Werte stammen aus Mosaik-Tokens; der Rahmen führt keine eigenen Farben, Radien oder Schatten ein.

| Bereich                          | Gestaltung                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Seitenleiste                     | Fläche `--mosaik-color-neutral-100`, rechte Linie `--mosaik-layout-thickness` in `--mosaik-scheme-highlight`                  |
| Fuß der Seitenleiste (Laufpanel) | obere Linie in `--mosaik-scheme-highlight`                                                                                    |
| Werkzeugleiste                   | untere Linie in `--mosaik-scheme-highlight`                                                                                   |
| Inhalt                           | Fläche `--mosaik-scheme-background`                                                                                           |
| Statusleiste                     | Fläche `--mosaik-color-neutral-100`, obere Linie, Text `--mosaik-scheme-lowlight` in `--mosaik-typography-caption`            |
| Workspace-Umschalter             | Fläche `--mosaik-scheme-surface`, Linie, Radius `--mosaik-layout-radius`                                                      |
| Laufschalter                     | Spur `--mosaik-color-neutral-200`; gewähltes Segment `--mosaik-scheme-surface` mit `--mosaik-elevation-light`; Segmente 24 px |
| Steuerelemente                   | Seitenleiste und Werkzeugleiste 32 px hoch, Suchfeld 32 px; Statusleiste 24 px                                                |
| Ausgewählte Zeile                | Darstellung `soft` mit Hintergrund `--mosaik-color-neutral-200`                                                               |

Die Dichte wird ausschließlich über öffentliche Custom Properties der Mosaik-Steuerelemente gesetzt.

## Fehler und Sonderfälle

| Fall                                   | Verhalten                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Kein Snapshot oder keine Einstellungen | keine Zahlen, keine Agent-Zeilen (Leerzustand), kein Synchronisierungshinweis |
| Kein aktiver Workspace                 | kein Workspace-Umschalter; Laufpanel zeigt den Agent-Leerzustand              |
| Execution- und CI-Feature fehlen       | kein Laufpanel                                                                |
| Nur eines der beiden Features          | kein Schalter; das vorhandene Segment wird gezeigt                            |
| GitHub-Lauf nur eingereiht (`queued`)  | erscheint nicht unter den aktuellen Action-Läufen und zählt nicht             |
| `settings.open` schlägt fehl           | keine Änderung am Rahmen und keine eigene Fehlermeldung des Rahmens           |
| Speicher nicht verfügbar               | Standardwerte, keine Persistenz                                               |

## Implementierungsabbildung in Symphony

| Verantwortung                                | Aktueller Pfad oder Symbol                                                                                                      | Beleg                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Fensteraufbau und Tastenkürzel               | `libs/frontend/presentation/src/lib/views/PresenterView.{ts,html}`                                                              | `apps/renderer-e2e/src/desktop.spec.ts`                         |
| Seitenleiste, Laufpanel, Statusleiste        | `libs/frontend/presentation/src/lib/views/{WindowSidebarView,RunPanelView,WindowStatusBarView}.*`                               | `desktop.spec.ts`                                               |
| Zustand, Historie, Projektionen              | `libs/frontend/presentation/src/lib/view-presenters/PresenterViewPresenter.ts`                                                  | `PresenterViewPresenter.spec.ts`                                |
| Tätigkeitstexte und Statuspunkte             | `libs/frontend/presentation/src/lib/pipes/AgentActivity{Label,Variant}Pipe.ts`                                                  | –                                                               |
| Navigationsvertrag und Registrierung         | `libs/frontend/core/src/navigation/{INavigationItem,NavigationRegistry}.ts`                                                     | `NavigationRegistry.spec.ts`                                    |
| Navigationsbeiträge                          | `libs/frontend/features/{home,work,delivery,ci,arcade}/src/lib/provider/with*Navigation.ts`                                     | `countFailingWorkflows.spec.ts`, `withArcadeNavigation.spec.ts` |
| Werkzeugleistenregistrierung                 | `libs/frontend/core/src/presentation/WindowToolbar{,Directive}.ts`                                                              | –                                                               |
| Uhr und relative Zeit                        | `libs/frontend/core/src/time/{Clock,formatRelativeTime}.ts`, `libs/frontend/ui/src/lib/pipes/RelativeTimePipe.ts`               | `formatRelativeTime.spec.ts`                                    |
| Start- und Rückfallroute                     | `libs/frontend/presentation/src/lib/routing/presentationRoutes.ts`, `libs/frontend/features/home/src/lib/routing/HomeRoutes.ts` | `presentationRoutes.spec.ts`                                    |
| Gestaltung                                   | `apps/renderer/src/styles/overrides/window-chrome.scss`, `apps/renderer/src/styles.scss`                                        | –                                                               |
| Plattformrahmen und Menü                     | `apps/desktop/src/main.ts` (`applicationWindowChrome`, `applyNativeThemeToWindows`, `configureApplicationMenu`)                 | –                                                               |
| Symbolregistrierung (`bell`, `panelLeft`, …) | `apps/renderer/src/configuration/ShellConfig.ts`                                                                                | –                                                               |

## Verifikation und Akzeptanzkriterien

- Nach dem Start zeigt das Hauptfenster Overview, der Titel lautet `Overview`, die Gruppe `Delivery` ist vorhanden, `navigation-skills` existiert nicht und `navigation-arcade` fehlt bei ausgeschalteter Arcade-Präferenz.
- Das aktive Ziel ist `soft`, alle anderen `plain`; ein Wechsel nach Board verschiebt die Hervorhebung.
- Eine Zahl erscheint nur für positive Werte und nie während des Ladens; ein Workflow, dessen jüngster abgeschlossener Lauf erfolgreich ist, zählt nicht, auch wenn ältere Läufe fehlgeschlagen sind.
- Ungruppierte Ziele führen die Seitenleiste an; Gruppen behalten die Reihenfolge ihres ersten Ziels.
- **Back** und **Forward** folgen der Historie; eine `replaceUrl`-Navigation erzeugt keinen neuen Eintrag.
- **Hide sidebar** entfernt die Seitenleiste, zeigt **Show sidebar** und bleibt nach einem Neustart erhalten.
- Der Laufschalter wechselt die Segmente; `Actions · <n>` nennt nur aktive Läufe; der jüngste Fehlschlag folgt den aktiven Läufen; ohne beide erscheint der Leerzustand.
- Der Synchronisierungshinweis meldet den schwächsten Zustand und die älteste Aktualisierung beider Quellen; **Retry** erscheint nur außerhalb von `current`.
- Ohne verfügbares Update zeigt die Statusleiste nur die Version; bei `downloading` mit `progress = 0.5` meldet der Ring `aria-valuenow = 50`.
- ⌘K beziehungsweise Ctrl+K öffnet und schließt die Palette; ⌘N beziehungsweise Ctrl+N öffnet das Board mit Erstellungsdialog.
- Unter Windows verdeckt das native Fensterbedienelement weder Suchfeld noch Aktionen; auf macOS liegen die Ampelknöpfe in der Seitenleistenkopfzeile.
- Kein Bildschirm des Rahmens enthält eine Spracheingabe; der Rahmen führt keine Farben außerhalb der Mosaik-Tokens ein.

## Bekannte Lücken

- Die Projekteinrichtung `/main/setup` hat nach dem Wegfall des Workspace-Menüs keinen sichtbaren Einstieg im Rahmen.

## Verwandte Dokumentation

- [Hauptfenster und Navigation](../../project/window-and-navigation/README.md)
- [Einstellungsfenster](settings-window.md)
- [Anwendungsupdates](../application-updates/README.md)
- [FLAMOX365-Referenzabgleich](../frontend-reference-flamox.md#2026-10-31-macos-window-chrome-settings-window-and-in-app-update-download)
