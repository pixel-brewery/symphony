# Einstellungen im Hauptfenster

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Einstellungen sind eine Route des Hauptfensters. Solange sie geöffnet sind, ersetzt ihre Navigation die Ziele der Seitenleiste, und die Werkzeugleiste trägt Titel, Untertitel und Aktionen des gewählten Bereichs. Electron Main erzeugt dafür kein eigenes Fenster mehr; Auslöser außerhalb des Renderers zeigen das Hauptfenster und senden ihm ein Navigationsziel. Das funktionale Verhalten beschreibt [Einstellungen](../../project/window-and-navigation/settings.md); diese Seite ersetzt den früheren Vertrag des separaten Einstellungsfensters (Entscheidung vom 2026-10-31, siehe [Entscheidungen des Redesigns](../../workitems/macos-redesign/DECISIONS.md#settings-in-the-main-window-2026-10-31)).

Garantien:

- Es gibt genau ein Renderer-Fenster mit Einstellungen: das Hauptfenster. Jeder Auslöser – Seitenleiste, Laufpanel, Mitteilungszentrale, Menüleisten-Panel, Anwendungsmenü, `settings.open` – führt zur Route `/main/settings` dieses Fensters.
- Solange die Einstellungen geöffnet sind, zeigt die Seitenleiste unter ihrer 52 px hohen Kopfzeile ausschließlich die Einstellungsnavigation; Workspace-Umschalter, Hauptziele, Laufpanel und die Schaltfläche **Settings** sind nicht gerendert. Die Kopfzeile mit den macOS-Ampelknöpfen und **Hide sidebar** bleibt.
- **Back** der Werkzeugleiste ist während der Einstellungen immer bedienbar. Mit vorherigem Verlaufseintrag geht es dorthin zurück, ohne einen solchen Eintrag zum zuletzt gemerkten Bildschirm (`LastScreenMemory`, siehe [Letzten Bildschirm wieder öffnen](README.md#letzten-bildschirm-wieder-öffnen)) und ohne gemerkten Bildschirm nach `/main/home`.
- Ein Bildschirm, der zerstört wird, kann die Seitenleistennavigation seines Nachfolgers nicht entfernen; angezeigt wird immer die zuletzt registrierte.
- Über den Desktop-Navigationskanal erreicht nur `/main/settings` oder `/main/settings?` mit ein bis acht Paaren aus begrenzten Schlüsseln und URL-sicheren Werten den Renderer. Der frühere Fensterpfad `/settings…`, freie URLs und Dateipfade werden abgewiesen.
- Die Einstellungen erhalten keine Fähigkeiten über die des Hauptfensters hinaus; sie laufen in dessen Renderer mit dessen Preload und Isolation.
- Die gemeinsame Einstellungsoberfläche (Katalog, Seitenleiste, Suche, Sheets, Alert-Sheets, Sofortspeichern, Abgleich) beschreibt der Abschnitt [Einstellungsoberfläche](#einstellungsoberfläche). Inhalt und Regeln der einzelnen Bereiche gehören den Features und ihren eigenen Seiten.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Route und frühere Einstiegsrouten, Ersatz der Seitenleistennavigation, Werkzeugleistenregistrierung der Einstellungen, Rückweg über **Back**, Desktop-Auslöser (`settings.open`, `window.show { route: 'settings' }`, Menüeintrag **Settings…**), Navigationsallowlist und die Einstellungsoberfläche.
- Nicht enthalten: der übrige Fensterrahmen ([Fensterrahmen und Navigation](README.md)), Breite und Scrollverhalten der Seitenleiste ([Größenveränderbare Bereiche und Scroll-Eingrenzung](resizable-panes.md)), Inhalte der Bereiche (Seiten der Features).

## Verantwortungsgrenzen

| Verantwortung                                     | Kanonischer Eigentümer                                           | Öffentlicher Vertrag                                                                                                | Verbraucher                                               |
| ------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Auslöser außerhalb des Renderers                  | Electron Main                                                    | `settings.open`, `window.show { route: 'settings' }`, Anwendungsmenü **Settings…**                                  | Menüleisten-Panel, Mitteilungsquellen, Betriebssystemmenü |
| Anfrage- und Antwortschemas, Navigationsallowlist | Desktop-IPC-Vertragspaket                                        | `desktopRequestSchemas`, `desktopResponseSchemas`, Methodenenum, `DesktopNavigationPath`, `isDesktopNavigationPath` | Main, Preload, Renderer                                   |
| Navigationsereignis in den Renderer               | Preload                                                          | `window.desktop.onNavigate(listener)`                                                                               | Shell-Wurzel des Renderers                                |
| Route und frühere Einstiege                       | Setting-Paket (`settings`, `projects`), Skills- und Work-Feature | Kindrouten von `main`                                                                                               | Hauptfensterrouter, Lesezeichen, Feature-Links            |
| Ersatz der Seitenleistennavigation                | Frontend Core (`WindowSidebar`, `WindowSidebarDirective`)        | `ng-template[symphonyWindowSidebar]`, Signale `content` und `isReplaced`                                            | Seitenleiste des Hauptfensters, Rückweg                   |
| Darstellung des Ersatzes                          | Präsentationspaket (`WindowSidebarView`)                         | Container `test-id="window-sidebar-override"`                                                                       | –                                                         |
| Rückweg und Öffnen aus dem Rahmen                 | Präsentationspaket (`PresenterViewPresenter`)                    | `canGoBack`, `goBackCommand`, `openSettingsCommand`                                                                 | Werkzeugleiste, Seitenleiste, Workspace-Umschalter        |
| Titel, Untertitel, Aktionen in der Werkzeugleiste | Einstellungsoberfläche (`SettingsView`)                          | `WindowToolbarDirective`                                                                                            | Werkzeugleiste                                            |
| Auswertung von Zielort-Parametern                 | Einstellungsoberfläche und ihre Feature-Initialisierer           | Query-Parameter der Route `/main/settings`                                                                          | Einstellungsbereiche                                      |

Der Ersatzvertrag ist allgemein: Jeder geroutete Bildschirm des Hauptfensters kann eine eigene Navigation registrieren. Derzeit nutzt ihn nur Settings.

## Architekturüberblick

```text
Hauptfenster (Presenter-View)
├── Seitenleiste (Startbereich des Fenster-Splits)
│   ├── Kopfzeile 52 px            Ziehbereich, Platz für macOS-Ampelknöpfe, „Hide sidebar“ – bleibt immer
│   └── solange registriert:       Einstellungsnavigation (Search settings, Workspaces, Workspace-Bereiche, Symphony)
│       sonst:                     Workspace-Umschalter, Ziele, Laufpanel, „Settings“
└── Inhaltsspalte
    ├── Werkzeugleiste 52 px       Back (in Settings immer aktiv), Forward, Titel/Untertitel/Aktionen der Einstellungen, Suchfeld
    └── main (eigener Scrollbereich)
        └── Einstellungsansicht    Spalte höchstens 700 px, zentriert, Innenabstand 24/36/40 px
```

Die Einstellungsansicht deklariert Navigation und Werkzeugleisteninhalt als zwei `ng-template` in ihrer eigenen Vorlage. Beide behalten dadurch Bindungen und Provider der Ansicht (Sitzung, Suchindex, Presenter), werden aber außerhalb von ihr gerendert: die Navigation in der Seitenleiste, Titel und Aktionen in der Werkzeugleiste.

## Verträge

### Ersatz der Seitenleistennavigation

`WindowSidebar` ist ein anwendungsweiter Dienst mit einer geordneten Liste von Registrierungen `{ owner, content: TemplateRef }`.

| Operation             | Wirkung                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `register(owner, t)`  | entfernt eine bestehende Registrierung desselben Besitzers und hängt die neue ans Ende an |
| `unregister(owner)`   | entfernt nur die Registrierungen dieses Besitzers                                         |
| `content` (Signal)    | Vorlage der letzten Registrierung oder `undefined`                                        |
| `isReplaced` (Signal) | `true`, solange `content` gesetzt ist                                                     |

`WindowSidebarDirective` (Selektor `ng-template[symphonyWindowSidebar]`) registriert ihre Vorlage aus einem Effekt – nicht während die Vorlage des Bildschirms rendert, weil die Seitenleiste die Registrierung aus der Vorlage des Fensters liest – und entfernt sie beim Zerstören des Bildschirms. Ein Bildschirm, der nach dem Rendern seines Nachfolgers zerstört wird, entfernt daher nur die eigene Registrierung.

Die Seitenleiste rendert immer zuerst ihre 52 px hohe Kopfzeile. Ist `content` gesetzt, folgt nur ein füllender Container (`test-id="window-sidebar-override"`) mit dieser Vorlage; sonst folgen Workspace-Umschalter, Ziele, Abstandhalter, Laufpanel und **Settings**. Ist die Seitenleiste ausgeblendet, ist auch die Einstellungsnavigation nicht sichtbar; die Registrierung und damit der Rückweg über **Back** bleiben bestehen, und **Show sidebar** zeigt sie wieder.

### Rückweg über Back

`canGoBack` gilt, wenn der Verlaufsindex des Fensters größer als 0 ist oder `WindowSidebar.isReplaced()` gilt. Der Befehl ruft bei Index > 0 `Location.back()` auf, sonst `Router.navigateByUrl(LastScreenMemory.read() ?? '/main/home')`. Die übrige Historienführung (Liste der Navigations-IDs, `popstate`, `replaceUrl`) beschreibt [Historie für Back und Forward](README.md#historie-für-back-und-forward).

Folgen für die Einstellungen:

- Das Öffnen der Einstellungen ist eine normale Navigation und legt einen Verlaufseintrag an. **Back** führt danach zum Bildschirm, von dem aus sie geöffnet wurden.
- Ein Bereichswechsel in der Seitenleiste schreibt den Zielort mit `replaceUrl` und ersetzt damit den aktuellen Eintrag. **Back** verlässt die Einstellungen deshalb auch nach mehreren Bereichswechseln mit einem Schritt.
- **Open** auf einem Suchtreffer und dessen Brotkrume schreiben den Zielort als neuen Eintrag; **Back** führt dann zuerst zum vorherigen Ort innerhalb der Einstellungen.
- Wurden die Einstellungen als erster Eintrag des Fensters geöffnet (etwa über ein Navigationsziel direkt nach dem Start), führt **Back** zum zuletzt gemerkten Bildschirm, ohne einen solchen nach `/main/home`.
- **Forward** folgt unverändert der Historie und kann in die Einstellungen zurückführen; deren Zielort steht dann wieder in der URL.

### Werkzeugleiste

`SettingsView` registriert über `WindowToolbarDirective`:

| Zustand           | Titel                    | Untertitel                                                          | Aktionen                                                              |
| ----------------- | ------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Suche aktiv       | `Search settings`        | `<n> result[s] for “<Anfrage>” across every workspace and this Mac` | keine                                                                 |
| Workspace-Bereich | Bezeichnung des Bereichs | `<Workspace-Name> · <Beschreibung des Bereichs>`                    | Slot `settings.header-actions` (`test-id="settings-toolbar-actions"`) |
| globaler Bereich  | Bezeichnung des Bereichs | Beschreibung des Bereichs                                           | wie oben                                                              |
| kein Bereich      | `Settings`               | leer                                                                | wie oben                                                              |

Die Aktionen sind Mosaik-View-Slot-Einträge der Features mit der aktuellen Auswahl `{ workspaceId, sectionId }`. Die Bereiche selbst registrieren keine eigene Werkzeugleiste; eine solche Registrierung würde als letzte gewinnen und Titel und Untertitel der Einstellungen überdecken.

### Routen

| Route            | Eigentümer    | Verhalten                                                                                             |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `/main/settings` | Setting-Paket | lädt `SettingsView` (lazy) im Router-Outlet des Hauptfensters                                         |
| `/main/projects` | Setting-Paket | `redirectTo: 'settings'` für frühere Lesezeichen                                                      |
| `/main/skills`   | Skills        | `redirectTo: '/main/settings?section=skills'`                                                         |
| `/main/setup`    | Work          | Guard `openSetupSheetGuard`: `/main/settings?sheet=setup`, mit `workspace`, wenn der Aufruf ihn trägt |

Es gibt keine Route `settings` auf oberster Ebene mehr. `/settings` und `#/settings` fallen wie jede unbekannte Adresse auf die Startroute `/main/home`. Innerhalb des Renderers navigieren Feature-Links mit dem Router direkt nach `/main/settings` mit ihren Query-Parametern; diese Navigation durchläuft keinen Filter, weil sie den Renderer nicht verlässt. Unbekannte Schlüssel ignorieren die Einstellungen, unbekannte Bereiche und Workspaces wählen nichts aus.

Auslöser im Renderer:

| Auslöser                                                    | Ziel                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Settings** in der Seitenleiste, **Manage workspaces…**    | `navigateByUrl('/main/settings')`                                                 |
| **Open AI team** im Laufpanel                               | `/main/settings` mit `section=team` und, falls vorhanden, `workspace=<aktive ID>` |
| Befehlspalette `Settings…`, Skills-Treffer, **Open Skills** | `/main/settings` beziehungsweise `?section=skills`                                |
| Actions-Diagnose, Orbit-Ziele, Einrichtungs-Sheet           | `/main/settings` mit dem jeweiligen Bereich und Editor-Schlüssel                  |
| Behebungen der Mitteilungszentrale                          | `settings.open` mit `workspace`/`section`; Main sendet das Ziel zurück            |

### `settings.open`

- Kanal: der feste Desktop-Anfragekanal (`desktop:request`) mit dem korrelierten Desktop-Umschlag; die Methode ist im Methodenenum enthalten.
- Anfrage:

```ts
{
  parameters?: Record<
    string /* /^[a-z][a-zA-Z-]{0,31}$/ */,
    string /* /^[A-Za-z0-9._~-]{1,200}$/ */
  > /* höchstens 8 Einträge */;
}
```

- Wirkung: Main blendet das Menüleisten-Fenster aus, zeigt das Hauptfenster (erzeugt es, falls es nicht existiert; aktiviert die Anwendung auf macOS, stellt ein minimiertes Fenster wieder her und fokussiert es, außer im versteckten E2E-Modus) und sendet das Ziel auf `desktop:navigate`.
- Zielbildung: ohne Parameter `/main/settings`; sonst `/main/settings?<k>=<v>&…` mit `encodeURIComponent` (damit `~` erhalten bleibt), in der Reihenfolge der Einträge. Lehnt `isDesktopNavigationPath` das Ergebnis ab, sendet Main `/main/settings` ohne Zielort; die Einstellungen öffnen sich also trotzdem.
- Antwort: `{ completed: true }`, nachdem das Ziel gesendet ist. Die Antwort bestätigt nicht, dass der Renderer navigiert hat.
- Fehler: Preload validiert das Payload vor dem Senden und lehnt ein ungültiges mit einem Vertragsfehler ab. Main validiert jede Anfrage erneut vor jeder Nebenwirkung und beantwortet ein ungültiges Payload mit `DESKTOP_REQUEST_FAILED`; eine Anfrage aus einer unbekannten `WebContents` erhält `UNTRUSTED_RENDERER`.
- Parameter-Schlüssel sind bewusst offen: `workspace`, `section` und bereichseigene Schlüssel wie `repository` oder `target`. Die Bedeutung legen die Einstellungsbereiche fest.

### `window.show`

| `route`              | Wirkung in Main                                                                 |
| -------------------- | ------------------------------------------------------------------------------- |
| `current` (Standard) | Menüleisten-Fenster ausblenden, Hauptfenster zeigen                             |
| `settings`           | Menüleisten-Fenster ausblenden, Hauptfenster zeigen und `/main/settings` senden |
| `actions`            | wie oben mit `/main/actions`                                                    |
| `inbox`              | wie oben mit `/main/inbox`                                                      |
| `notifications`      | wie oben mit `/main/home?notifications=open`                                    |
| `new-work-item`      | wie oben mit `/main/board?create=true`                                          |

Antwort ist `{ completed: true }`. Das Menüleisten-Panel verwendet `settings` für seine Kopfschaltfläche **Settings** und den Befehl **Settings…**. Der Parameter `notifications=open` wird von keinem Bildschirm ausgewertet; das Ziel zeigt daher Overview.

### Navigationsallowlist

`DesktopNavigationPath` ist die geschlossene Menge der Ziele, die Main an das Hauptfenster senden darf:

- `/main/home`, `/main/inbox`, `/main/actions`, `/main/board?create=true`, `/main/home?notifications=open`
- `/main/settings` oder `/main/settings?` gefolgt von ein bis acht Paaren `<k>=<v>`, getrennt durch `&`, mit `k` nach `[a-z][a-zA-Z-]{0,31}` und `v` nach `[A-Za-z0-9._~-]{1,200}`. Prozentkodierte Werte, ein abschließender Schrägstrich, Unterpfade wie `/main/settings/team`, absolute URLs und der frühere Fensterpfad `/settings…` werden abgewiesen.

Main sendet Ziele auf dem festen Kanal `desktop:navigate`. Preload leitet ein empfangenes Ziel nur weiter, wenn `isDesktopNavigationPath` es akzeptiert; die Shell-Wurzel des Renderers navigiert dann mit `navigateByUrl`. Damit ist der Kanal auch dann begrenzt, wenn eine Nachricht nicht von der erwarteten Stelle stammt.

## Einstellungsoberfläche

Die Route rendert `SettingsView`. Die Ansicht stellt `SettingsHostSession`, `SettingsSearchIndex` und `SettingsViewPresenter` je Aufruf der Route bereit; sie leben, solange die Einstellungen geöffnet sind. Ein erneutes Öffnen nach dem Verlassen beginnt mit einer neuen Sitzung auf `Workspaces`. Die Ansicht registriert `SettingsSidebarView` als Seitenleistennavigation, Titel, Untertitel und Aktionen in der Werkzeugleiste und zeigt im Inhaltsbereich eine horizontal zentrierte Spalte von höchstens 700 px (`test-id="settings-content"`, `mx-auto`, Innenabstand 24 px oben, 36 px seitlich, 40 px unten), die im Scrollbereich des Hauptfensters liegt.

### Bereichskatalog und Karten

Features tragen Karten als `ISettingsViewContribution { id, slot, views }` bei (`withSettingsViews`). Jede Karte ist ein Mosaik-View-Slot-Eintrag (`id`, `order`, `canActivate(selection)`, `loadComponent`) mit zusätzlichen Einstellungsmetadaten:

```ts
interface ISettingsViewDefinition {
  id: string;
  order: number;
  section: {
    scope: 'global' | 'workspace';
    id: string;
    label: string;
    description: string;
    order: number;
  };
  canActivate: (selection: { workspaceId: string | null; sectionId: string }) => boolean;
  loadComponent: () => Promise<Type<unknown>>;
  search?: readonly ISettingsSearchEntry[];
  searchEntries?: () => Signal<readonly ISettingsSearchEntry[]>;
}
```

| Slot                                                                          | Inhalt                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `settings.global`                                                             | Karten globaler Bereiche                                       |
| `settings.workspace`                                                          | Karten der Workspace-Bereiche                                  |
| `settings.global.appearance`                                                  | optionale Karten innerhalb von **Appearance** (derzeit Arcade) |
| `settings.header-actions`                                                     | Werkzeugleistenaktionen eines Bereichs                         |
| `settings.workspace.services.{boards,account,feedback,available-connections}` | Unterbereiche von **Connected services**                       |

Regeln:

- Eine doppelte Karten-Id innerhalb eines Slots und zwei Karten desselben Bereichs mit abweichendem `scope`, `label`, `description` oder `order` sind Kompositionsfehler; der Katalog wirft beim Aufbau.
- `SettingsCatalog` leitet die Bereichsliste aus den registrierten Karten ab und sortiert nach `section.order`, bei Gleichstand nach Id. Ein Bereich existiert nur, wenn ein enthaltenes Feature eine Karte für ihn beiträgt.
- Die Kennungen sind stabile Lesezeichenwerte: global `workspaces`, `automation`, `skills`, `system`, `mobile`, `appearance`; je Workspace `team`, `services`, `repositories`, `delivery`, `local-ci`, `administration`.
- Das Inhaltsoutlet übergibt `{ workspaceId, sectionId }` (global mit `workspaceId: null`); Mosaik rendert die Karten, deren `canActivate` zutrifft, in `order`-Reihenfolge.
- Symbole (`SettingsSectionIconPipe`): `workspaces` folder, `automation` sync, `skills` skills, `system` settings, `mobile` cloudArrowRight, `appearance` weatherSunny, `team` bot, `services` disconnect, `repositories` branch, `delivery` flow, `local-ci` executionOutline, `administration` clipboardTask.

### Gruppen, Zeilen und bedingte Zustände

Karten setzen sich aus drei gemeinsamen Bausteinen zusammen:

- `symphony-settings-group` (`heading`, `description`, `framed = true`, `level = 'group' | 'section'`): Überschrift (Ebene 3 beziehungsweise 2), optionale Beschreibung, Aktionen im Slot `actions` und eine gerahmte Zeilenliste (`part="settings-group-rows"`, Oberfläche mit Haarlinienrahmen und Trennlinie zwischen Zeilen; eine leere Liste zeichnet nichts).
- `symphony-settings-row` (`label`, `description`, `labelParts`): Zeile mit führendem Slot `leading`, Bezeichnung und Hilfetext, Slot `detail` und dem Steuerelement rechts. `labelParts` rendert hervorgehobene Suchtreffer.
- `symphony-settings-conditional` (`condition`): ein Zustand, der nur in bestimmten Situationen erscheint, in einem gestrichelten Rahmen (`part="settings-conditional"`) mit der Bedingung als Überschrift, etwa `While a workspace is disabled`, `Without Homebrew`, `When storage is not writable`, `With the Custom preset` oder `Without results`.

### Seitenleiste der Einstellungen

`SettingsSidebarView` (`test-id="settings-sidebar"`, `role="navigation"`, `aria-label="Settings sections"`) füllt den Ersatzcontainer unter der Kopfzeile der Fensterseitenleiste und übernimmt deren Breite:

1. `Search settings` (`mosaik-searchbox`, `test-id="settings-search"`), fest oben.
2. Darunter eine eigene Scrollfläche (`test-id="settings-navigation"`) mit `Workspaces`, jedem Workspace ([gemeinsame farbige Workspace-Kachel](../workspaces/README.md#workspace-symbol-und-farbe) über `Avatar.src`, `part="workspace-tile"`, Name; `aria-expanded` am aufgeklappten) und unter dem konfigurierten – sonst dem im Hauptfenster aktiven, sonst dem ersten – Workspace dessen Workspace-Bereiche als eingerückte Zeilen, danach die Überschrift `Symphony` mit den übrigen globalen Bereichen in Katalogreihenfolge.

Zeilen sind Mosaik-Schaltflächen; der gewählte Bereich ist `soft` und trägt `aria-current="page"`, außer während einer Suche. Einen Workspace anklicken öffnet ihn auf `team`.

### Auswahl und Zielort

- `SettingsHostSession` hält den konfigurierten Workspace (Standard `null`), den globalen Bereich (Standard `workspaces`), den Workspace-Bereich (Standard `team`) und den Suchtext. `openWorkspace(id, section = 'team')`, `selectGlobal(section)` und `selectWorkspaceSection(section)` leeren die Suche. `openWorkspace` setzt den globalen Bereich auf `workspaces`.
- Abgleich mit dem Katalog: Ist der gewählte globale oder Workspace-Bereich nicht (mehr) beigetragen, fällt die Sitzung auf den ersten beigetragenen Bereich zurück. Abgleich mit der Konfiguration: Kommt nach der ersten geladenen Konfiguration ein Workspace hinzu, öffnet die Sitzung ihn auf `team`; verschwindet der konfigurierte Workspace, setzt sie ihn auf `null` und zeigt damit wieder `Workspaces`.
- `SettingsViewPresenter` wendet `?workspace=&section=` einmal je unterschiedlichem Zielort an, sobald die Konfiguration geladen ist: ein globaler Bereich wählt diesen, sonst öffnet ein bekannter Workspace den genannten Workspace-Bereich oder `team`. Umgekehrt schreibt er jede Auswahl (auch eine, die ein Feature direkt über die Sitzung trifft) mit `replaceUrl` in den Zielort zurück, damit eine spätere gleiche Anforderung wieder eine echte Navigation ist. Weitere Schlüssel werten die Routen-Initialisierer der Features aus (siehe [Editor-Schlüssel im Zielort](#editor-schlüssel-im-zielort)).
- Ein Zielort für die bereits geöffneten Einstellungen (etwa aus der Mitteilungszentrale) navigiert dieselbe Route mit neuen Query-Parametern; die Ansicht bleibt bestehen und wechselt zum genannten Ort. Ein Aufruf ohne Zielort behält den gezeigten Bereich, weil der Presenter den leeren Zielort sofort wieder mit der aktuellen Auswahl füllt.

### Suche

`SettingsSearchIndex` indiziert jeden Bereich selbst, die Einträge, die Karten in ihrer `ISettingsViewDefinition` beitragen, und die Einträge, die Features über `withSettingsSearch` einem fremden Bereich beitragen:

| Quelle                                                                   | Bedeutung                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search?: ISettingsSearchEntry[]` (Karte)                                | statische Einträge; in Workspace-Bereichen einmal je Workspace, außer der Eintrag nennt `workspaceId`                                                                                                                                                                                                                                                 |
| `searchEntries?: () => Signal<ISettingsSearchEntry[]>` (Karte)           | datenabhängige Einträge des eigenen Bereichs; die Fabrik läuft einmal im Injektionskontext des Index                                                                                                                                                                                                                                                  |
| `withSettingsSearch({ id, sectionId, searchEntries })` (Feature-Beitrag) | datenabhängige Einträge eines Features, das nur Fragmente in einen Bereich eines anderen Features zeichnet (etwa die AI-Konten, Boards und Intakes in `services`). Feature-Art `search`, Token `SETTINGS_SEARCH_CONTRIBUTIONS`; der Index führt die Fabrik einmal in seinem Injektionskontext aus und ordnet die Einträge dem Bereich `sectionId` zu. |

Ein `ISettingsSearchEntry` hat `id`, `label`, optional `description`, `group` (Brotkrumen-Fortsetzung, etwa `Fix failed checks › Budgets`), `keywords`, `value`, `workspaceId`, `parameters` (zusätzliche Zielort-Schlüssel beim Öffnen) und `loadControl` (eigenständige Komponente für die Änderung direkt im Treffer; sie liest ihren Treffer über `SETTINGS_SEARCH_RESULT`). Karten im Slot `SettingsViewSlot.Appearance` tragen `search` ebenso bei und gehören zu `Appearance`.

**Indexaufbau.** Für jeden Katalogbereich entsteht ein Bereichseintrag (`section-<id>`, Bezeichnung und Beschreibung des Bereichs) und je Karteneintrag ein Ergebnis. Globale Bereiche ergeben je Eintrag ein Ergebnis ohne Workspace; Workspace-Bereiche je konfiguriertem Workspace eines, mit dem Workspace-Namen vor der Brotkrume (ein Eintrag mit `workspaceId` nur für diesen Workspace). Brotkrume: `[Workspace-Name?] › Bereich › group?`; Schlüssel `<workspaceId>:<sectionId>:<viewId>:<entryId>` (bei Feature-Beiträgen steht die Beitrags-Id an der Stelle der Karten-Id). Der Index ist ein berechnetes Signal über Katalog, Konfiguration und dynamische Einträge. `searchEntries`-Fabriken werden einmal beim Erzeugen des Index für die dann registrierten Karten und Beiträge im Injektionskontext ausgeführt; ihr Signal wird bei jeder Suche gelesen. Ein Beitrag für einen nicht beigetragenen Bereich erscheint nicht.

**Abgleich.** Die Anfrage wird kleingeschrieben an Leerraum zerlegt, Duplikate entfernt und längere Wörter zuerst geprüft. Ein Ergebnis passt, wenn jedes Wort in Bezeichnung, Beschreibung, `value`, `keywords` oder Brotkrume vorkommt. Ergebnisse werden nach Workspace und Brotkrume gruppiert, in Indexreihenfolge; eine Gruppe erhält Rang 0, wenn die Bezeichnung mindestens eines Ergebnisses alle Wörter enthält, sonst Rang 1. Gruppen werden nach Rang und dann nach erstem Auftreten sortiert. Eine leere Anfrage liefert keine Gruppen und zeigt wieder den Bereich.

**Darstellung.** Über den Gruppen steht `Search covers labels, help texts and values. A result changes the setting in place; its breadcrumb opens the section it lives in.` Jede Gruppe zeigt ihre Brotkrume als Schaltfläche (Tooltip `Open section`), die das erste Ergebnis der Gruppe öffnet. `SettingsSearchHighlightPipe` zerlegt nur die Bezeichnung in Treffer- und Textteile (`mark[part~="settings-search-match"]`). Ein Ergebnis mit `loadControl` lädt sein Steuerelement in einem Injektor, der `SETTINGS_SEARCH_RESULT` bereitstellt; sonst erscheinen ein vorhandener `value` als Bildunterschrift (`settings-search-value-<key>`, neutrale Variante) und **Open**. Öffnen setzt die Sitzung (`openWorkspace` beziehungsweise `selectGlobal`) und schreibt den Zielort mit `parameters` als neuen Verlaufseintrag. Ohne Treffer zeigt ein bedingter Rahmen `Without results` die Zeile `No setting matches “…”` mit `Try another word.`

**Ist-Stand der Beiträge.** Steuerelemente im Treffer haben `Theme`, `Keep this Mac awake while tasks run` und `Show Arcade`. Datenabhängige Einträge (jeweils mit `workspaceId` des Objekts, außer Workspaces):

| Eigentümer | Bereich        | Quelle                                                    | Eintrag                                                                                                                                  | `value`                                               | `parameters`                              |
| ---------- | -------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| Delivery   | `repositories` | `searchEntries` der Karte (`repositorySearchEntries`)     | je Repository: Anzeigename, Beschreibung `<owner>/<name>`, Gruppe `Repositories`, Stichwörter Host und Standardbranch                    | `Disabled` nur bei deaktiviertem Repository           | `{ repository }`                          |
| Delivery   | `delivery`     | `searchEntries` der Karte (`deliveryTargetSearchEntries`) | je Lieferziel mit vorhandenem Repository: Anzeigename, Beschreibung `[Production · ]<Art>`, Gruppe = Anzeigename des Repository          | Umgebung bei `kind: 'environment'`                    | `{ repository, target }`                  |
| Team       | `team`         | `searchEntries` der Karte (`agentSearchEntries`)          | je Agent: Anzeigename, Beschreibung Stellenbezeichnung, Gruppe `Agents`                                                                  | `Disabled` nur bei deaktiviertem Agenten              | `{ agent }`                               |
| AI         | `services`     | `withSettingsSearch` (`aiAccountSearchEntries`)           | je Codex-, Claude-Code- oder OpenCode-Konto: Anzeigename, Beschreibung `<Laufzeit> account[ · <Gateway>]`, Gruppe `AI accounts`          | Anmeldestand (`aiAccountSignIn`), bei OpenCode keiner | `{ account }`                             |
| Work       | `services`     | `withSettingsSearch` (`workSettingsSearchEntries`)        | je nicht simuliertem Board (Beschreibung `workSourceOrigin`, Gruppe `Boards`) und je GitHub- oder Azure-DevOps-Konto (Gruppe `Accounts`) | Board: `Enabled` oder `Disabled`                      | `{ board }` beziehungsweise `{ account }` |
| Feedback   | `services`     | `withSettingsSearch` (`feedbackIntakeSearchEntries`)      | je Teams-Intake: Anzeigename, Beschreibung `Microsoft Teams feedback intake`, Gruppe `Feedback intake`                                   | `Enabled` oder `Disabled`                             | `{ intake }`                              |
| Workspace  | `workspaces`   | `searchEntries` der Karte (`workspaceSearchEntries`)      | je Workspace: Anzeigename, Beschreibung `Workspace · <Kürzel>`                                                                           | `Disabled` nur bei deaktiviertem Workspace            | `{ edit }`                                |

Die eigenen Bereiche eines Workspace findet die Suche über dessen Namen in der Brotkrume; der Workspace-Eintrag öffnet deshalb `Edit workspace`.

### Editor-Schlüssel im Zielort

`withSettingsEditorRoute({ id, section, parameter, matchesWithoutSection?, resolve })` registriert einen Routen-Initialisierer, der ein Feature-Sheet öffnet, wenn der Zielort den Schlüssel `parameter` im Bereich `section` trägt (mit `matchesWithoutSection` auch ohne `section`, weil die Einstellungen einen Workspace ohne Bereich auf `team` öffnen). `resolve()` läuft einmal im Injektionskontext der Route und liefert einen Auflöser `(value, workspaceId) => request | undefined`; er wird im Effekt gelesen, sodass eine Anforderung vor dem Laden der Konfiguration wartet, und liefert `undefined` für unbekannte oder fremde Objekte. Je Wert und Workspace öffnet der Initialisierer das Sheet einmal und entfernt danach den Schlüssel mit `replaceUrl` aus dem Zielort; fehlt der Schlüssel, setzt er sich zurück. Dieselbe Anforderung (etwa derselbe Suchtreffer) ist dadurch wieder eine echte Navigation und öffnet das Sheet erneut.

| Bereich        | Schlüssel                 | Eigentümer und Sheet                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repositories` | `repository`              | Delivery (`delivery-repository-route`): `repository`-Sheet                                                                                                                                                                                                                           |
| `delivery`     | `repository`, `target`, … | Delivery (`initializeDeliverySettingsRoute`): Projektwahl und `delivery-target`-Sheet                                                                                                                                                                                                |
| `team`         | `agent`                   | Team (`team-settings-route`, auch ohne `section`): `ai`-Sheet des Agenten, nur mit enthaltenem AI-Feature                                                                                                                                                                            |
| `services`     | `account`                 | AI (`ai-account-route`) für Codex-, Claude-Code- und OpenCode-Konten: `ai-account`-Sheet; Work (`work-account-route`) für Azure DevOps: Quellen-Sheet des Kontos, für GitHub: `repository`-Sheet des Repository, das das Konto nutzt, nur wenn der Repository-Editor registriert ist |
| `services`     | `board`                   | Work (`work-board-route`): `github-projects`- oder `azure-devops`-Sheet                                                                                                                                                                                                              |
| `services`     | `intake`                  | Feedback (`feedback-intake-route`): `teams-feedback`-Sheet                                                                                                                                                                                                                           |
| `workspaces`   | `edit`                    | Workspace (`workspace-editor-route`): `workspace`-Sheet (`Edit workspace`)                                                                                                                                                                                                           |
| beliebig       | `sheet=setup`             | Work (`work-setup-route`): `setup`-Sheet                                                                                                                                                                                                                                             |

### Sheets und Rückfragen

`showSettingsSheet(dialogs, component, data, width)` ist die einzige Stelle, die ein Sheet der Einstellungen erzeugt. Sie ruft Mosaik `DialogService.show` mit `hasBackdrop: true`, `backdropStrategy: 'own'`, `clickOutsideToClose: false`, `pressEscapeToClose: true`, `focusOnOpen: false`, `size: { width }` und `maxSize: { width: '96vw', height: '88dvh' }` auf und setzt `part="settings-sheet"` am Dialogelement; die Fensterstile setzen darüber nur öffentliche Dialogvariablen (Innenabstände 18/22/14/22 px, Abstand 14 px, Rahmen, Radius, Schatten). Sheets liegen über dem ganzen Hauptfenster.

- `SettingsEditorService` öffnet Feature-Editoren. Editoren werden mit `withSettingsEditor` als `ISettingsEditorDefinition { id, kind, workspaceSection?, width?, isRequest, loadComponent }` registriert; doppelte Ids oder zwei Editoren für dieselbe `kind` sind Kompositionsfehler. `open(request)` löst den Editor über `request.kind` auf (unbekannte `kind` oder abgewiesenes `isRequest` werfen), fordert bei einem bereits sichtbaren Sheet dessen Aufmerksamkeit an, statt ein zweites zu öffnen, ignoriert einen Aufruf während des Ladens, wechselt bei `workspaceSection` zuerst in diesen Bereich des angefragten Workspace und öffnet das Sheet mit `width` (Standard `SETTINGS_SHEET_WIDTH` = 640 px). Nach dem Schließen öffnet ein Ergebnis `{ next }` den Folgeeditor. Editoren verwenden `mosaikDialogHeader/Content/Footer`, `mosaik-dialog-header`, `DIALOG_REF` und `DIALOG_REF_DATA`. Ein Editor schließt sein Sheet erst nach erfolgreichem Speichern; bei einem Speicherfehler bleibt es mit den Eingaben offen, und der Speicherweg meldet den Fehler als Hinweis (etwa `Unable to save settings.` oder `Unable to save skill.`). Nur das Workspace-Sheet zeigt einen Speicher- oder Validierungsfehler zusätzlich als Banner im Sheet (`settings-editor-error`). Die Sheets für AI-Konto, Repository, Azure-DevOps-Quelle und Teams-Intake sperren **Save**, solange Pflichtangaben fehlen, und nennen diese in einem bedingten Rahmen `With missing details` als Warnmeldung `Finish these details before saving` (Feldbezeichnungen über eine reine Pipe je Feature, getrennt durch `·`).
- Registrierte Editoren: `workspace` (600 px), `ai` (Agent, 920 px), `ai-account` (780 px, Bereich `services`), `github-projects` und `azure-devops` (je 600 px), `teams-feedback` (600 px), `repository` (600 px), `delivery-target` (640 px), `setup` (760 px), `skill-role-instructions` (680 px), `skill-catalog` (720 px), `skill-editor` (720 px), `skill-import` (600 px).
- Mosaiks Dialog zentriert seine Fläche im Fenster und bietet keinen öffentlichen Eingang, sie an die Oberkante zu heften; Sheets sind daher zentriert. Sie verschieben den Fokus beim Öffnen nicht, weil Mosaik sonst ein Textfeld vor dem Rendern seines Eingabefelds fokussiert. Weil Mosaik die Vorlagen eines Dialogs erst nach dem ersten Rendern registriert, stoßen Editor- und Alert-Service in zwei aufeinanderfolgenden Animationsframes eine Änderungserkennung an.

### Alert-Sheets

`SettingsAlertService.confirm(alert): Promise<boolean>` zeigt eine Rückfrage als 420 px breites Sheet über `showSettingsSheet` und liefert `true` nur, wenn die Primärschaltfläche das Sheet schließt; **Cancel**, Escape und jedes andere Schließen liefern `false`. Ein Alert kann über einem offenen Editor-Sheet erscheinen.

```ts
interface ISettingsAlert {
  id: string; // Test-IDs settings-alert-{id}, -confirm, -cancel
  header: string; // die Frage
  message: string; // die Folgen
  tone?: 'warning' | 'danger' | 'info'; // Standard: destructive ? 'danger' : 'warning'
  confirmLabel: string;
  cancelLabel?: string; // fehlt: reiner Hinweis mit einer Schaltfläche
  destructive?: boolean; // Primärschaltfläche in der Gefahrvariante
}
```

Das Sheet hat die Rolle `alertdialog`, ein Symbol je Ton (`warning` warning, `danger` errorCircle, `info` info), Frage und Folgen und rechts unten die Schaltflächen (**Cancel** als Umriss, Primärschaltfläche ausgefüllt, `primary` oder bei `destructive` `danger`). Weil der Dialog die Vorlagen `mosaikDialogContent` und `mosaikDialogFooter` außerhalb der View rendert, deklariert jede Vorlage ihre `@let`-Werte (`alert`, `tone`) selbst; eine `@let`-Deklaration auf oberster Ebene wäre dort noch nicht initialisiert (Angular-Fehler NG0314). Der aufrufende Presenter führt die Aktion erst nach `true` aus; das Entfernen eines Lieferziels prüft danach zusätzlich, dass inzwischen kein anderer Speichervorgang läuft. Für Blockaden (letzter Agent, Konto oder Repository noch in Gebrauch) zeigt der Presenter statt der Rückfrage den Hinweis und führt nichts aus.

Bestand (21 Alerts an 25 Aufrufstellen):

| Id                                        | Frage                                  | Ton, destruktiv | Antworten                                 | Bereich                                                    |
| ----------------------------------------- | -------------------------------------- | --------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `workspace-import`                        | `Import workspace configuration?`      | info            | `Import workspace` / `Cancel`             | Workspaces                                                 |
| `delete-workspace-confirmation-<id>`      | `Delete <Workspace>?`                  | danger, ja      | `Delete workspace` / `Keep workspace`     | Administration                                             |
| `remove-agent-<id>`                       | `Remove <Agent>?`                      | danger, ja      | `Remove agent` / `Keep agent`             | AI team                                                    |
| `remove-agent-blocked-<id>`               | `This agent cannot be removed`         | warning         | `OK`                                      | AI team                                                    |
| `install-agent-runtime-<runtime>`         | `Install <Anbieter> CLI?`              | warning         | `Install with Homebrew` / `Cancel`        | AI team (Agent-Sheet), Connected services (AI-Konto-Sheet) |
| `remove-ai-account-<id>`                  | `Remove <Konto>?`                      | danger, ja      | `Remove account` / `Keep account`         | Connected services (Liste, AI-Konto-Sheet)                 |
| `remove-ai-account-blocked-<id>`          | `This account is still in use`         | warning         | `OK`                                      | Connected services (Liste, AI-Konto-Sheet)                 |
| `import-opencode-credentials-<id \| new>` | `Import current OpenCode sign-ins?`    | warning         | `Import into workspace` / `Cancel`        | Connected services (AI-Konto-Sheet)                        |
| `remove-board-<id>`                       | `Remove <Board>?`                      | danger, ja      | `Remove board` / `Keep board`             | Connected services (GitHub-Projects-Sheet)                 |
| `remove-azure-devops-source-<id>`         | `Remove <Quelle>?`                     | danger, ja      | `Remove source` / `Keep source`           | Connected services (Azure-DevOps-Sheet)                    |
| `remove-feedback-intake-<id>`             | `Remove <Intake>?`                     | danger, ja      | `Remove intake` / `Keep intake`           | Connected services (Teams-Intake-Sheet)                    |
| `remove-repository-<id>`                  | `Remove <Repository>?`                 | danger, ja      | `Remove repository` / `Keep repository`   | Repositories                                               |
| `remove-repository-blocked-<id>`          | `This repository is still in use`      | warning         | `OK`                                      | Repositories                                               |
| `remove-delivery-target-<id>`             | `Remove <Ziel>?`                       | danger, ja      | `Remove destination` / `Keep destination` | Delivery destinations                                      |
| `move-skill-to-trash`                     | `Move “<Name>” to trash?`              | danger, ja      | `Move to trash` / `Cancel`                | Skills (Skill-Sheet)                                       |
| `clear-workspaces-confirmation`           | `Clear inactive execution workspaces?` | danger, ja      | `Clear workspaces` / `Keep workspaces`    | Automation                                                 |
| `install-runtime-dependency-<id>`         | `Install <Werkzeug>?`                  | warning         | `Install with Homebrew` / `Cancel`        | System › Developer tools                                   |
| `remove-local-ci-instance-confirmation`   | `Remove this machine?`                 | danger, ja      | `Remove machine` / `Keep machine`         | System › Virtual machines                                  |
| `clear-local-ci-data-confirmation`        | `Clear local runner data?`             | danger, ja      | `Clear runner data` / `Keep data`         | System › Virtual machines                                  |
| `revoke-mobile-device-<id>`               | `Revoke <Telefon>?`                    | danger, ja      | `Revoke` / `Keep access`                  | Mobile access                                              |
| `revoke-all-mobile-devices`               | `Revoke all <n> phones?`               | danger, ja      | `Revoke all phones` / `Keep access`       | Mobile access                                              |

Kopplungsanfragen unter Mobile access werden in der Karte selbst mit **Approve** oder **Reject** entschieden. Die Installationsrückfrage der Mitteilungszentrale ist kein Alert-Sheet, sondern eine Mosaik-Message-Box.

### Sofortiges Speichern

Steuerelemente wenden ihren Wert beim Ändern an, Zahlenfelder beim Bestätigen (`(change)`). `createImmediateSetting(stored, equal = Object.is)` liefert `value` (Bindung des Steuerelements, ein mit dem gespeicherten Wert verknüpftes Signal), `saving` und `apply(next, persist)`:

1. Ist `next` gleich dem gespeicherten Wert, zeigt das Steuerelement ihn und `apply` liefert `true`, ohne zu speichern. Damit setzt ein ungültiger Wert, für den der Aufrufer den gespeicherten Wert erneut anwendet, die Anzeige ohne Schreibvorgang zurück.
2. Sonst zeigt es `next` sofort, setzt `saving` und ruft `persist(next)`.
3. Liefert `persist` `false`, zeigt es wieder den gespeicherten Wert; wirft `persist`, ebenso, und die Ausnahme wird weitergegeben. `saving` endet in jedem Fall.
4. Ändert sich der gespeicherte Wert später (Speichern, Abgleich aus einem anderen Renderer-Fenster), folgt `value` ihm.

Der einzige Schreiber der Anwendungseinstellungen ist `ConfigurationStore.saveSettings(settings, successMessage = 'Settings saved.')`: Er setzt `configurationBusy`, sendet `settings.save` mit den vollständigen Einstellungen, übernimmt die vom Orchestrator gespeicherte Fassung, aktualisiert Repository-Laufzeit und Speicherstatus, meldet die Erfolgsnachricht (abschaltbar) und liefert `true`. Bei einem Fehler meldet er `Unable to save settings.` mit der Fehlerbeschreibung und liefert `false`; der gespeicherte Zustand bleibt unverändert. Viele Karten sperren ihre Steuerelemente, solange `configurationBusy` gilt. Präferenzen, die nicht zu den Anwendungseinstellungen gehören (Wachhalten, Updatekanal, mobiler Zugang), schreiben über ihren eigenen Eigentümer; ihre Steuerelemente zeigen nach einem Fehler ebenfalls wieder den bestätigten Zustand. Die Karten unter [Einstellungen dieses Mac](../system/README.md) beschreiben das jeweils.

Weil die Einstellungen im Hauptfenster liegen, gilt eine Änderung dort ohne Umweg: Hauptfensterbildschirme, Seitenleiste und Theme lesen denselben `ConfigurationStore`. Die Hinweise der Einstellungen erscheinen als Toasts des Hauptfensters und damit auch im Toast-Verlauf seiner Mitteilungszentrale.

### Abgleich zwischen Renderer-Fenstern

`SettingsWindowSync` (über `provideSettings` in jedem Renderer-Fenster verbunden, heute Hauptfenster und macOS-Menüleisten-Panel) sendet geänderte Einstellungen über `BroadcastChannel('symphony.settings')` an die anderen Fenster und wendet empfangene mit `ConfigurationStore.applySettings` an, ohne sie zurückzusenden:

- Ein Effekt beobachtet `ConfigurationStore.settings()`. Er bildet einen JSON-Fingerabdruck; den ersten geladenen Stand eines Fensters sendet er nicht, jeden davon abweichenden späteren Stand als Nachricht `{ settings }`.
- Eine empfangene Nachricht ohne Objekt `settings` wird ignoriert. Eine gültige setzt zuerst den Fingerabdruck auf den empfangenen Stand und wendet ihn dann an; der Effekt erkennt ihn dadurch als bekannt und sendet nicht zurück.
- Ohne `BroadcastChannel` oder ohne `ConfigurationStore` (isolierte Komposition) verbindet sich der Abgleich nicht. Beim Zerstören des Injektors schließt er den Kanal.
- Der Abgleich überträgt nur den Einstellungsstand; jedes Fenster lädt Speicherstatus, Laufzeit- und Feature-Zustände selbst.

### Einrichtung als Sheet

`/main/setup` leitet über `openSetupSheetGuard` nach `/main/settings?sheet=setup`; der Routen-Initialisierer `work-setup-route` öffnet daraufhin in den Einstellungen das Sheet `setup` (`Build your project team`, 760 px). **Expert settings / accounts** schließt das Sheet und navigiert nach `/main/settings?workspace=<id>&section=services` (ohne gewählten Workspace `?section=workspaces`). Nach dem Start einer Analyse schließt das Sheet und sendet `window.show { route: 'current' }`; das Hauptfenster bleibt dabei in den Einstellungen (siehe [Bekannte Lücken](#bekannte-lücken)).

## Ausführungsabläufe

### Öffnen aus dem Hauptfenster

1. **Settings** in der Seitenleiste oder **Manage workspaces…** ruft `openSettingsCommand` auf; andere Auslöser navigieren mit ihrem Zielort (siehe [Routen](#routen)).
2. Der Router lädt `SettingsView` in das Router-Outlet; ein neuer Verlaufseintrag entsteht.
3. Die Ansicht registriert ihre Navigation und ihren Werkzeugleisteninhalt. Die Seitenleiste zeigt die Einstellungsnavigation, die Werkzeugleiste den Bereich; **Back** ist aktiv.
4. Nach dem Laden der Konfiguration wendet der Presenter den Zielort an und schreibt die Auswahl mit `replaceUrl` zurück.

### Öffnen von außerhalb des Renderers

1. Ein Auslöser fordert die Einstellungen an: `settings.open` aus dem Renderer (Mitteilungsquellen), `window.show { route: 'settings' }` aus dem Menüleisten-Panel oder der Menüeintrag **Settings…** (`CmdOrCtrl+,`).
2. Main blendet das Menüleisten-Fenster aus und zeigt das Hauptfenster; existiert es nicht (macOS nach dem Schließen), erzeugt und lädt Main es zuerst auf seiner Startroute.
3. Main sendet `/main/settings[?…]` auf `desktop:navigate`; Preload prüft das Ziel, die Shell-Wurzel navigiert.
4. Weiter wie beim Öffnen aus dem Hauptfenster.

### Verlassen

1. **Back** in der Werkzeugleiste: mit Verlaufseintrag `Location.back()`, sonst der zuletzt gemerkte Bildschirm oder `/main/home`. Jede andere Navigation aus den Einstellungen heraus (Befehlspalette, ⌘N, ein Navigationsziel von Main) verlässt sie ebenso.
2. Beim Zerstören der Ansicht entfernen beide Direktiven ihre Registrierungen; die Seitenleiste zeigt wieder Workspace-Umschalter, Ziele, Laufpanel und **Settings**. Sitzung und Suchindex der Einstellungen verfallen.

## Vertrauensgrenzen und geteilte Kanäle

- Haupt- und Menüleisten-Fenster gelten als vertrauenswürdige Absender für den Orchestrierungs- und den Desktop-Umschlag. Jede andere `WebContents` erhält `UNTRUSTED_RENDERER`.
- Native Pfadauswahl ist nur für das Hauptfenster zugelassen – die Einstellungen eingeschlossen – und wird an dieses gebunden; das Menüleisten-Fenster und jede andere `WebContents` erhalten einen Fehler.
- Native Lebenszyklus-Rückfragen (Beenden, Update-Neustart) werden immer an das Hauptfenster gebunden, solange es existiert, sonst ohne Elternfenster gezeigt.
- **Keep running in background** blendet das Hauptfenster aus.
- Aktivierung über das Dock und ein zweiter Programmstart zeigen das Hauptfenster in seinem aktuellen Zustand, also auch mit geöffneten Einstellungen. Unter Windows und Linux beendet sich die Anwendung, wenn das Hauptfenster geschlossen wird, weil dort kein weiteres Fenster existiert.

## Fehler und Wiederherstellung

| Fehlerfall                                         | Erkennung                              | Öffentlicher Fehler                                                              | Nebenwirkungen                                     | Wiederherstellung                      |
| -------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------- |
| Ungültige Parameter in `settings.open`             | Zod-Schema in Preload, erneut in Main  | Vertragsfehler im Preload, sonst `DESKTOP_REQUEST_FAILED`                        | keine; das Hauptfenster wird nicht gezeigt         | gültige Parameter senden               |
| Zusammengesetzter Zielort außerhalb der Allowlist  | `isDesktopNavigationPath` in Main      | keiner                                                                           | Einstellungen öffnen ohne Zielort                  | –                                      |
| Fremde Nachricht auf `desktop:navigate`            | `isDesktopNavigationPath` im Preload   | keiner                                                                           | keine Navigation                                   | –                                      |
| Früherer Fensterpfad `/settings…` im Renderer      | Router-Rückfallroute                   | keiner                                                                           | Navigation nach `/main/home`                       | `/main/settings` verwenden             |
| Unbekannter Bereich oder Workspace im Zielort      | Presenter findet keine Übereinstimmung | keiner                                                                           | Auswahl bleibt; Zielort wird mit ihr überschrieben | –                                      |
| Seitenleiste ausgeblendet                          | –                                      | keiner                                                                           | Einstellungsnavigation nicht sichtbar              | **Show sidebar** oder **Back**         |
| Einstellung lässt sich nicht speichern             | `saveSettings` liefert `false`         | `Unable to save settings.` mit Fehlerbeschreibung                                | keine                                              | Steuerelement zeigt gespeicherten Wert |
| Editor-Sheet scheitert beim Speichern              | Speicherweg liefert Misserfolg         | Hinweis (`Unable to save settings.` u. a.); im Workspace-Sheet zusätzlich Banner | keine; Sheet bleibt offen                          | Eingaben bleiben, erneut speichern     |
| Unbekannte Editor-`kind` oder ungültige Anfrage    | `SettingsEditorRegistry.resolve`       | Ausnahme (Programmierfehler)                                                     | kein Sheet                                         | Komposition korrigieren                |
| Doppelte Karte oder widersprüchliche Bereichsdaten | Katalog und Slot-Provider beim Aufbau  | Ausnahme (Kompositionsfehler)                                                    | Bereichsliste wird nicht gebildet                  | Komposition korrigieren                |
| Doppelter Routen-Initialisierer                    | Presenter beim Erzeugen                | Ausnahme (Kompositionsfehler)                                                    | Einstellungen öffnen nicht                         | Komposition korrigieren                |
| Fehlerhafte Nachricht auf dem Abgleichskanal       | `settings` fehlt oder ist kein Objekt  | keiner                                                                           | wird ignoriert                                     | –                                      |

## Versionierung, Migration und Rollback

- Das separate Einstellungsfenster ist entfernt: keine eigene Größe (früher 1000 × 760, mindestens 720 × 520), keine Einzelinstanzlogik, kein eigener Fenstertitel, kein eigener Platz in der Vertrauensliste und keine Elternrolle für Ordnerauswahl oder Lebenszyklus-Rückfragen. Die Renderer-Route `settings` auf oberster Ebene, `SettingsWindowView`, `settingsWindowRoutes` und der Guard `openSettingsWindowGuard`, der Hauptfensterlinks in eine `settings.open`-Anfrage umwandelte, existieren nicht mehr.
- Die Desktop-Methoden behalten Namen, Reihenfolge und Schemas. `settings.open` und `window.show { route: 'settings' }` bleiben gültig und führen jetzt ins Hauptfenster. Nur die Navigationsallowlist ändert ihr Settings-Ziel von `/settings…` auf `/main/settings…`; Main und Preload werden gemeinsam ausgeliefert, sodass kein gemischter Stand entsteht.
- Lesezeichen und Feature-Links auf `/main/settings`, `/main/projects`, `/main/skills` und `/main/setup` funktionieren unverändert und landen jetzt direkt in den Einstellungen des Hauptfensters.
- Es gibt keine persistierten Daten des früheren Fensters; ein Rückbau braucht keine Datenmigration.

## Implementierungsabbildung in Symphony

| Verantwortung                                 | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                                    | Beleg                                                                                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop-Auslöser, Menü, Kanäle                | `apps/desktop/src/main.ts` (`SETTINGS_NAVIGATION_PATH`, `settingsNavigationPath`, `showMainWindowAt`, `mainWindowDestination`, `configureApplicationMenu`, `showLifecycleMessageBox`, `isTrustedRenderer`)                                                                                                                    | `apps/renderer-e2e/src/settings.spec.ts`, `openSettings.ts`, `closeSettings.ts`, `desktop.spec.ts`                                                                         |
| Preload-Filter                                | `apps/desktop/src/preload.ts` (`onNavigate`)                                                                                                                                                                                                                                                                                  | –                                                                                                                                                                          |
| Schemas und Allowlist                         | `libs/ipc-contracts/desktop/src/lib/{DesktopRequestSchemas,DesktopResponseSchemas,DesktopRequestEnvelopeSchema,DesktopNavigationPath,isDesktopNavigationPath,IDesktopApi}.ts`                                                                                                                                                 | `DesktopRequestSchemas.spec.ts`, `isDesktopNavigationPath.spec.ts`, `DesktopRequestEnvelopeSchema.spec.ts`, `DesktopResponseSchemas.spec.ts`                               |
| Routen                                        | `libs/frontend/setting/src/routing/SettingsRoutes.ts`, `libs/frontend/features/skills/src/lib/routing/SkillsRoutes.ts`, `libs/frontend/features/work/src/lib/onboarding/routing/openSetupSheetGuard.ts`, `libs/frontend/presentation/src/lib/routing/presentationRoutes.ts`, `apps/renderer/src/configuration/ShellConfig.ts` | `presentationRoutes.spec.ts`                                                                                                                                               |
| Renderer-Navigation                           | `apps/renderer/src/views/ShellView.ts`                                                                                                                                                                                                                                                                                        | –                                                                                                                                                                          |
| Ersatz der Seitenleistennavigation            | `libs/frontend/core/src/presentation/{WindowSidebar,WindowSidebarDirective}.ts`, `libs/frontend/presentation/src/lib/views/WindowSidebarView.{ts,html}`                                                                                                                                                                       | `WindowSidebar.spec.ts`                                                                                                                                                    |
| Rückweg und Auslöser im Rahmen                | `PresenterViewPresenter.{canGoBack,goBackCommand,openSettingsCommand}`, `RunPanelView.openAiTeam`                                                                                                                                                                                                                             | `PresenterViewPresenter.spec.ts`                                                                                                                                           |
| Oberfläche und Auswahl                        | `libs/frontend/setting/src/views/{SettingsView,SettingsSidebarView,SettingsSearchView}`, `view-presenters/SettingsViewPresenter.ts`, `context/SettingsHostSession.ts`                                                                                                                                                         | `SettingsViewPresenter.spec.ts`, `SettingsHostSession.spec.ts`, `apps/renderer-e2e/src/settings.spec.ts`                                                                   |
| Suche                                         | `libs/frontend/setting/src/search/*`, `provider/{withSettingsSearch,SettingsSearchContributionsToken}.ts`, `pipes/SettingsSearchHighlightPipe.ts`, `components/SettingsSearchControlComponent.ts`; Beiträge `features/{delivery,team,ai,work,feedback,workspace}/src/lib/settings/*SearchEntries.ts`                          | `searchSettings.spec.ts`, `SettingsSearchIndex.spec.ts`, `SettingsSearchHighlightPipe.spec.ts`, `*SearchEntries.spec.ts`                                                   |
| Editor-Schlüssel im Zielort                   | `libs/frontend/setting/src/{provider/withSettingsEditorRoute,routing/ISettingsEditorRoute}.ts`; Auflöser `features/*/src/lib/settings/resolve*EditorRoute.ts`                                                                                                                                                                 | `withSettingsEditorRoute.spec.ts`, `resolveWorkAccountEditorRoute.spec.ts`                                                                                                 |
| Katalog, Slots, Kartenbausteine               | `libs/frontend/setting/src/{catalog/SettingsCatalog,constants/SettingsViewSlot,provider/*,models/*}.ts`, `components/{SettingsGroupComponent,SettingsRowComponent,SettingsConditionalComponent}`, `pipes/SettingsSectionIconPipe.ts`; Stile `apps/renderer/src/styles/overrides/window-chrome.scss`                           | `SettingsCatalog.spec.ts`, `provideSettings.spec.ts`, `SettingsEditorRegistry.spec.ts`                                                                                     |
| Sheets, Rückfragen, Sofortspeichern, Abgleich | `editor/SettingsEditorService.ts`, `sheets/showSettingsSheet.ts`, `alerts/SettingsAlertService.ts`, `views/SettingsAlertSheetView`, `view-presenters/SettingsAlertSheetViewPresenter.ts`, `forms/createImmediateSetting.ts`, `sync/SettingsWindowSync.ts`; Schreiber `libs/frontend/core/src/state/ConfigurationStore.ts`     | `SettingsEditorService.spec.ts`, `SettingsAlertService.spec.ts`, `SettingsAlertSheetViewPresenter.spec.ts`, `createImmediateSetting.spec.ts`, `SettingsWindowSync.spec.ts` |
| Einrichtungs-Sheet                            | `libs/frontend/features/work/src/lib/onboarding/{routing/openSetupSheetGuard,routing/initializeSetupSettingsRoute,view-presenters/SetupViewPresenter}.ts`, `provider/withWorkSettings.ts`                                                                                                                                     | `initializeSetupSettingsRoute.spec.ts`, `SetupViewPresenter.spec.ts`                                                                                                       |

## Verifikation und Akzeptanzkriterien

- **Settings** in der Seitenleiste öffnet `/main/settings` im Hauptfenster; es entsteht kein weiteres Fenster. Die Seitenleiste zeigt unter ihrer Kopfzeile nur die Einstellungsnavigation (`window-sidebar-override` mit `settings-sidebar`); `workspace-switcher`, `presenter-navigation`, das Laufpanel und `navigation-settings` sind nicht vorhanden.
- Die Werkzeugleiste zeigt Bereichsname und Beschreibung, bei Workspace-Bereichen mit vorangestelltem Workspace-Namen; während einer Suche `Search settings` und die Trefferzahl.
- **Back** ist in den Einstellungen aktiv, auch wenn sie der erste Eintrag des Fensters sind, und führt dann zum zuletzt gemerkten Bildschirm oder nach `/main/home`; mit Verlauf führt es zum vorherigen Bildschirm. Danach zeigt die Seitenleiste wieder ihre Ziele, und `window-sidebar-override` ist entfernt.
- Ein Bereichswechsel in der Seitenleiste legt keinen zusätzlichen Verlaufseintrag an; **Open** auf einem Suchtreffer legt einen an.
- `settings.open` mit Parametern zeigt das Hauptfenster mit den Einstellungen am Zielort; ohne Parameter öffnet es sie auf `Workspaces` oder behält bei bereits geöffneten Einstellungen den Bereich.
- `settings.open` mit neun Parametern, einem Schlüssel mit Großbuchstaben am Anfang oder einem Wert mit `%` wird ohne Fensteränderung abgewiesen.
- `isDesktopNavigationPath` akzeptiert die fünf festen Ziele und `/main/settings` mit bis zu acht gültigen Paaren und weist `/settings`, `#/settings`, Unterpfade, absolute URLs, Kodierungen, überzählige Paare und Nicht-Strings ab.
- `window.show` akzeptiert nur die sechs Ziele und verwendet ohne Angabe `current`; `settings` zeigt das Hauptfenster mit `/main/settings`.
- ⌘, beziehungsweise Ctrl+, öffnet die Einstellungen auf allen Plattformen im Hauptfenster; ⌘N beziehungsweise Ctrl+N aus den Einstellungen verlässt sie und öffnet das Anlegen eines Work Items auf dem Board.
- Ordnerauswahl ist aus den Einstellungen möglich und an das Hauptfenster gebunden; das Menüleisten-Fenster kann sie nicht anfordern.
- `#/main/settings?section=skills` öffnet die Einstellungen bei **Skills**; `#/main/skills` und `#/main/projects` landen in den Einstellungen.
- Die Einstellungen öffnen auf `Workspaces`; die Seitenleiste listet die globalen Bereiche `Workspaces`, `Automation`, `Skills`, `System`, `Mobile access`, `Appearance` in dieser Reihenfolge.
- Die Suche `storage` zeigt mindestens eine Gruppe mit markiertem Treffer; eine Suche ohne Treffer (`tokn`) zeigt `No setting matches “tokn”`; eine leere Suche zeigt wieder den Bereich.
- Ein Suchbegriff, der nur in einer Workspace-Einstellung vorkommt, liefert eine Gruppe je konfiguriertem Workspace mit dessen Namen in der Brotkrume.
- Die Suche nach dem Namen eines AI-Kontos (etwa `Default Codex account`) liefert einen Treffer unter `<Workspace> › Connected services › AI accounts`; **Open** öffnet das Sheet des Kontos, und derselbe Treffer öffnet es nach dem Schließen erneut.
- Repositories, Lieferziele, Agenten, Boards, GitHub- und Azure-DevOps-Konten, Teams-Intakes und Workspaces sind eigene Treffer und öffnen ihr Sheet; ein Treffer mit `value` zeigt ihn neben **Open**.
- **Add workspace** öffnet ein Sheet `mosaik-dialog[part~="settings-sheet"]`, ein Klick daneben schließt es nicht, Escape schließt es ohne Änderung; ein zweiter Editoraufruf öffnet kein zweites Sheet.
- Ein Alert liefert `true` nur für die Primärschaltfläche; Escape und **Cancel** führen die Aktion nicht aus.
- `createImmediateSetting`: Ein `persist`, das `false` liefert oder wirft, stellt den gespeicherten Wert wieder her; ein Wert gleich dem gespeicherten speichert nicht.
- Eine Änderung in den Einstellungen wirkt ohne Neuladen in Seitenleiste und Bildschirmen des Hauptfensters und erreicht das Menüleisten-Panel über den Abgleichskanal, ohne zurückgesendet zu werden.

## Bekannte Lücken

- Startet das Einrichtungs-Sheet eine Analyse, schließt es sich und fordert das Hauptfenster an, das bereits vorn ist; die Einstellungen bleiben geöffnet, und das Board mit der laufenden Analyse erscheint erst nach **Back** oder über die Seitenleiste. Die Annahme, dass das Hauptfenster hinter dem Sheet bereits das Board zeigt, stammt aus der Zeit des separaten Einstellungsfensters.

## Verwandte Dokumentation

- [Fensterrahmen und Navigation](README.md)
- [Größenveränderbare Bereiche und Scroll-Eingrenzung](resizable-panes.md)
- [Einstellungen](../../project/window-and-navigation/settings.md)
- Bereiche: [Workspaces](../workspaces/README.md), [AI-Team](../ai-team/README.md), [Skills](../skills/README.md), [Automation](../automation/README.md), [Einstellungen dieses Mac](../system/README.md)
- [IPC-Modell](../ipc-model.md)
- [Sicherheitsmodell](../security-model.md)
