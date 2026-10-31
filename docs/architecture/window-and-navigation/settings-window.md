# Einstellungsfenster

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Einstellungen sind auf jeder Plattform ein eigenes natives Fenster neben dem Hauptfenster. Electron Main besitzt dieses Fenster; Renderer fordern es nur über eine benannte, schemavalidierte Desktop-Anfrage an. Das funktionale Verhalten beschreibt [Einstellungen im eigenen Fenster](../../project/window-and-navigation/settings-window.md).

Garantien:

- Es existiert höchstens ein Einstellungsfenster. Eine weitere Anforderung fokussiert das vorhandene Fenster, statt ein zweites zu erzeugen.
- Das Fenster lädt dasselbe Renderer-Bundle mit demselben Preload und denselben Isolationseinstellungen wie das Hauptfenster. Es erhält keine zusätzlichen Fähigkeiten.
- Ein Zielort gelangt nur als bekannte Route `/settings` mit höchstens acht Parametern aus URL-sicheren Zeichen in das Fenster. Weder Renderer noch Navigationskanal können eine freie URL, einen Dateipfad oder eine andere Route erzwingen.
- Die frühere Einstellungsroute des Hauptfensters bleibt als Einstieg erhalten und öffnet das Fenster, ohne das Hauptfenster zu verlassen.
- Die gemeinsame Einstellungsoberfläche (Katalog, Seitenleiste, Suche, Sheets, Alert-Sheets, Sofortspeichern, Abgleich zwischen Fenstern) beschreibt der Abschnitt [Einstellungsoberfläche](#einstellungsoberfläche). Inhalt und Regeln der einzelnen Bereiche gehören den Features und ihren eigenen Seiten; das Fenster liefert ihnen Route, Query-Parameter und die gemeinsamen Bausteine.

## Verantwortungsgrenzen

| Verantwortung                                     | Kanonischer Eigentümer                                 | Öffentlicher Vertrag                                                                                                | Verbraucher                                        |
| ------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Lebenszyklus, Größe, Plattformrahmen              | Electron Main                                          | `settings.open`, `window.show { route: 'settings' }`, Anwendungsmenü                                                | Hauptfenster, Menüleisten-Menü, Betriebssystemmenü |
| Anfrage- und Antwortschemas, Navigationsallowlist | Desktop-IPC-Vertragspaket                              | `desktopRequestSchemas`, `desktopResponseSchemas`, Methodenenum, `DesktopNavigationPath`, `isDesktopNavigationPath` | Main, Preload, Renderer                            |
| Navigationsereignis in einen Renderer             | Preload                                                | `window.desktop.onNavigate(listener)`                                                                               | Shell-Wurzel des Renderers                         |
| Route des Fensters                                | Setting-Paket                                          | Route `settings` auf oberster Ebene (`settingsWindowRoutes`)                                                        | Einstellungsfenster                                |
| Weiterleitung früherer Hauptfensterrouten         | Setting-Paket                                          | Guard `openSettingsWindowGuard` auf `main/settings` und `main/projects`                                             | Lesezeichen, Feature-Links                         |
| Auswertung von Zielort-Parametern                 | Einstellungsoberfläche und ihre Feature-Initialisierer | Query-Parameter der Route `settings`                                                                                | Einstellungsbereiche                               |

## Verträge

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

- Antwort: `{ completed: true }`, sobald das Fenster geladen und, außer im versteckten E2E-Modus, sichtbar und fokussiert ist.
- Fehler: Preload validiert das Payload vor dem Senden und lehnt ein ungültiges mit einem Vertragsfehler ab. Main validiert jede Anfrage erneut vor jeder Nebenwirkung und beantwortet ein ungültiges Payload mit `DESKTOP_REQUEST_FAILED`; eine Anfrage aus einer unbekannten `WebContents` erhält `UNTRUSTED_RENDERER`.
- Parameter-Schlüssel sind bewusst offen: `workspace`, `section` und bereichseigene Schlüssel wie `repository` oder `target`. Das Fenster leitet sie unverändert an seine Route weiter; die Bedeutung legen die Einstellungsbereiche fest.

Main bildet aus den Parametern `/settings?<k>=<v>&…` mit `encodeURIComponent` (damit `~` erhalten bleibt) und prüft das Ergebnis erneut mit `isDesktopNavigationPath`. Ohne Parameter oder bei negativem Ergebnis öffnet es das Fenster ohne Zielort.

### `window.show`

| `route`              | Wirkung in Main                                                         |
| -------------------- | ----------------------------------------------------------------------- |
| `current` (Standard) | Menüleisten-Fenster ausblenden, Hauptfenster zeigen                     |
| `settings`           | Menüleisten-Fenster ausblenden, Einstellungsfenster ohne Zielort zeigen |
| `actions`            | Hauptfenster zeigen und `/main/actions` senden                          |
| `inbox`              | Hauptfenster zeigen und `/main/inbox` senden                            |
| `notifications`      | Hauptfenster zeigen und `/main/home?notifications=open` senden          |
| `new-work-item`      | Hauptfenster zeigen und `/main/board?create=true` senden                |

Antwort ist `{ completed: true }`. Das Menüleisten-Menü verwendet derzeit `current`, `settings` und `actions`. Der Parameter `notifications=open` wird von keinem Bildschirm ausgewertet; das Ziel zeigt daher Overview.

### Navigationsallowlist

`DesktopNavigationPath` ist die geschlossene Menge der Ziele, die Main an ein Renderer-Fenster senden darf:

- `/main/home`, `/main/inbox`, `/main/actions`, `/main/board?create=true`, `/main/home?notifications=open`
- `/settings` oder `/settings?` gefolgt von ein bis acht Paaren `<k>=<v>`, getrennt durch `&`, mit `k` nach `[a-z][a-zA-Z-]{0,31}` und `v` nach `[A-Za-z0-9._~-]{1,200}`. Prozentkodierte Werte werden abgewiesen.

Main sendet Ziele auf dem festen Kanal `desktop:navigate`. Preload leitet ein empfangenes Ziel nur weiter, wenn `isDesktopNavigationPath` es akzeptiert; die Shell-Wurzel des Renderers navigiert dann mit `navigateByUrl`. Damit ist der Kanal auch dann begrenzt, wenn eine Nachricht nicht von der erwarteten Stelle stammt.

### Routen

| Route            | Fenster             | Verhalten                                                                                                                                                                                                                                 |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/settings`      | Einstellungsfenster | lädt die Einstellungsoberfläche in einer eigenen `mosaik-app` ohne den Rahmen des Hauptfensters (`test-id="settings-window"`)                                                                                                             |
| `/main/settings` | Hauptfenster        | Guard: übernimmt gültige Query-Parameter (Schlüssel- und Wertregel wie oben, höchstens die ersten acht), sendet `settings.open`; bei bereits erfolgter Erstnavigation wird die Navigation abgebrochen, sonst nach `/main/home` umgeleitet |
| `/main/projects` | Hauptfenster        | wie `/main/settings`                                                                                                                                                                                                                      |

Feature-Links, die früher in die Einstellungsseite führten (etwa Suchtreffer für Skills mit `section=skills` oder die Einrichtungsansicht), funktionieren dadurch unverändert und öffnen das Fenster am Zielort.

## Einstellungsoberfläche

Die Route `settings` rendert `SettingsWindowView` (eigene `mosaik-app`) mit `SettingsView`: links die Seitenleiste (`SettingsSidebarView`, 232 px, `part="window-sidebar"`, 52 px hohe Kopfzeile als Ziehbereich für die Ampeltasten), rechts eine 52 px hohe Werkzeugleiste (`part="window-toolbar window-drag-region"`) und der scrollende Inhalt (`part="route-scroll"`, Spalte höchstens 700 px, Innenabstand 24/36/40 px).

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

### Auswahl und Zielort

- `SettingsHostSession` (je Fenster) hält den konfigurierten Workspace, den globalen Bereich, den Workspace-Bereich und den Suchtext. `openWorkspace(id, section = 'team')`, `selectGlobal(section)` und `selectWorkspaceSection(section)` leeren die Suche. `openWorkspace` setzt den globalen Bereich auf `workspaces`.
- Abgleich mit dem Katalog: Ist der gewählte globale oder Workspace-Bereich nicht (mehr) beigetragen, fällt die Sitzung auf den ersten beigetragenen Bereich zurück. Abgleich mit der Konfiguration: Kommt nach der ersten geladenen Konfiguration ein Workspace hinzu, öffnet die Sitzung ihn auf `team`; verschwindet der konfigurierte Workspace, setzt sie ihn auf `null` und zeigt damit wieder `Workspaces`.
- `SettingsViewPresenter` wendet `?workspace=&section=` einmal je unterschiedlichem Zielort an, sobald die Konfiguration geladen ist: ein globaler Bereich wählt diesen, sonst öffnet ein bekannter Workspace den genannten Workspace-Bereich oder `team`. Umgekehrt schreibt er jede Auswahl (auch eine, die ein Feature direkt über die Sitzung trifft) mit `replaceUrl` in den Zielort zurück, damit eine spätere gleiche Anforderung aus dem Hauptfenster wieder eine echte Navigation ist. Weitere Schlüssel werten die Routen-Initialisierer der Features aus (siehe [Editor-Schlüssel im Zielort](#editor-schlüssel-im-zielort)).
- Die Seitenleiste zeigt `Search settings`, `Workspaces`, jeden Workspace (Kürzel-Kachel `part="workspace-tile"`, Name) und unter dem konfigurierten – sonst dem aktiven – Workspace dessen Workspace-Bereiche als eingerückte Zeilen, danach die Überschrift `Symphony` mit den übrigen globalen Bereichen in Katalogreihenfolge. Die Symbole ordnet `SettingsSectionIconPipe` den Bereichskennungen zu.
- Die Werkzeugleiste zeigt Bereichsname und Beschreibung, bei Workspace-Bereichen mit vorangestelltem Workspace-Namen; während einer Suche `Search settings` und `{n} results for “…” across every workspace and this Mac`. Aktionen kommen aus dem Slot `SettingsViewSlot.HeaderActions` und aus `WindowToolbarDirective`-Registrierungen der Bereiche.

### Suche

`SettingsSearchIndex` (je Fenster) indiziert jeden Bereich selbst, die Einträge, die Karten in ihrer `ISettingsViewDefinition` beitragen, und die Einträge, die Features über `withSettingsSearch` einem fremden Bereich beitragen:

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

`withSettingsEditorRoute({ id, section, parameter, matchesWithoutSection?, resolve })` registriert einen Routen-Initialisierer, der ein Feature-Sheet öffnet, wenn der Zielort den Schlüssel `parameter` im Bereich `section` trägt (mit `matchesWithoutSection` auch ohne `section`, weil das Fenster einen Workspace ohne Bereich auf `team` öffnet). `resolve()` läuft einmal im Injektionskontext der Route und liefert einen Auflöser `(value, workspaceId) => request | undefined`; er wird im Effekt gelesen, sodass eine Anforderung vor dem Laden der Konfiguration wartet, und liefert `undefined` für unbekannte oder fremde Objekte. Je Wert und Workspace öffnet der Initialisierer das Sheet einmal und entfernt danach den Schlüssel mit `replaceUrl` aus dem Zielort; fehlt der Schlüssel, setzt er sich zurück. Dieselbe Anforderung (etwa derselbe Suchtreffer) ist dadurch wieder eine echte Navigation und öffnet das Sheet erneut.

| Bereich        | Schlüssel                 | Eigentümer und Sheet                                                                                                                                                                                                                                                                 |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repositories` | `repository`              | Delivery (`delivery-repository-route`): `repository`-Sheet                                                                                                                                                                                                                           |
| `delivery`     | `repository`, `target`, … | Delivery (`initializeDeliverySettingsRoute`, unverändert): Projektwahl und `delivery-target`-Sheet                                                                                                                                                                                   |
| `team`         | `agent`                   | Team (`team-settings-route`, auch ohne `section`; ersetzt `initializeTeamSettingsRoute`): `ai`-Sheet des Agenten, nur mit enthaltenem AI-Feature                                                                                                                                     |
| `services`     | `account`                 | AI (`ai-account-route`) für Codex-, Claude-Code- und OpenCode-Konten: `ai-account`-Sheet; Work (`work-account-route`) für Azure DevOps: Quellen-Sheet des Kontos, für GitHub: `repository`-Sheet des Repository, das das Konto nutzt, nur wenn der Repository-Editor registriert ist |
| `services`     | `board`                   | Work (`work-board-route`): `github-projects`- oder `azure-devops`-Sheet                                                                                                                                                                                                              |
| `services`     | `intake`                  | Feedback (`feedback-intake-route`): `teams-feedback`-Sheet                                                                                                                                                                                                                           |
| `workspaces`   | `edit`                    | Workspace (`workspace-editor-route`): `workspace`-Sheet (`Edit workspace`)                                                                                                                                                                                                           |
| beliebig       | `sheet=setup`             | Work (`work-setup-route`): `setup`-Sheet                                                                                                                                                                                                                                             |

### Sheets und Rückfragen

`showSettingsSheet(dialogs, component, data, width)` ist die einzige Stelle, die ein Sheet des Einstellungsfensters erzeugt. Sie ruft Mosaik `DialogService.show` mit `hasBackdrop: true`, `backdropStrategy: 'own'`, `clickOutsideToClose: false`, `pressEscapeToClose: true`, `focusOnOpen: false`, `size: { width }` und `maxSize: { width: '96vw', height: '88dvh' }` auf und setzt `part="settings-sheet"` am Dialogelement; die Fensterstile setzen darüber nur öffentliche Dialogvariablen (Innenabstände 18/22/14/22 px, Abstand 14 px, Rahmen, Radius, Schatten).

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

Kopplungsanfragen unter Mobile access werden in der Karte selbst mit **Approve** oder **Reject** entschieden. Die Installationsrückfrage der Mitteilungszentrale im Hauptfenster ist kein Alert-Sheet, sondern eine Mosaik-Message-Box dieses Fensters.

### Sofortiges Speichern

Steuerelemente wenden ihren Wert beim Ändern an, Zahlenfelder beim Bestätigen (`(change)`). `createImmediateSetting(stored, equal = Object.is)` liefert `value` (Bindung des Steuerelements, ein mit dem gespeicherten Wert verknüpftes Signal), `saving` und `apply(next, persist)`:

1. Ist `next` gleich dem gespeicherten Wert, zeigt das Steuerelement ihn und `apply` liefert `true`, ohne zu speichern. Damit setzt ein ungültiger Wert, für den der Aufrufer den gespeicherten Wert erneut anwendet, die Anzeige ohne Schreibvorgang zurück.
2. Sonst zeigt es `next` sofort, setzt `saving` und ruft `persist(next)`.
3. Liefert `persist` `false`, zeigt es wieder den gespeicherten Wert; wirft `persist`, ebenso, und die Ausnahme wird weitergegeben. `saving` endet in jedem Fall.
4. Ändert sich der gespeicherte Wert später (Speichern, Abgleich aus einem anderen Fenster), folgt `value` ihm.

Der einzige Schreiber der Anwendungseinstellungen ist `ConfigurationStore.saveSettings(settings, successMessage = 'Settings saved.')`: Er setzt `configurationBusy`, sendet `settings.save` mit den vollständigen Einstellungen, übernimmt die vom Orchestrator gespeicherte Fassung, aktualisiert Repository-Laufzeit und Speicherstatus, meldet die Erfolgsnachricht (abschaltbar) und liefert `true`. Bei einem Fehler meldet er `Unable to save settings.` mit der Fehlerbeschreibung und liefert `false`; der gespeicherte Zustand bleibt unverändert. Viele Karten sperren ihre Steuerelemente, solange `configurationBusy` gilt. Präferenzen, die nicht zu den Anwendungseinstellungen gehören (Wachhalten, Updatekanal, mobiler Zugang), schreiben über ihren eigenen Eigentümer; ihre Steuerelemente zeigen nach einem Fehler ebenfalls wieder den bestätigten Zustand. Die Karten unter [Einstellungen dieses Mac](../system/README.md) beschreiben das jeweils.

### Fensterübergreifender Abgleich

`SettingsWindowSync` (über `provideSettings` in jedem Fenster verbunden) sendet geänderte Einstellungen über `BroadcastChannel('symphony.settings')` an die anderen Fenster und wendet empfangene mit `ConfigurationStore.applySettings` an, ohne sie zurückzusenden:

- Ein Effekt beobachtet `ConfigurationStore.settings()`. Er bildet einen JSON-Fingerabdruck; den ersten geladenen Stand eines Fensters sendet er nicht, jeden davon abweichenden späteren Stand als Nachricht `{ settings }`.
- Eine empfangene Nachricht ohne Objekt `settings` wird ignoriert. Eine gültige setzt zuerst den Fingerabdruck auf den empfangenen Stand und wendet ihn dann an; der Effekt erkennt ihn dadurch als bekannt und sendet nicht zurück.
- Ohne `BroadcastChannel` oder ohne `ConfigurationStore` (isolierte Komposition) verbindet sich der Abgleich nicht. Beim Zerstören des Injektors schließt er den Kanal.
- Der Abgleich überträgt nur den Einstellungsstand; jedes Fenster lädt Speicherstatus, Laufzeit- und Feature-Zustände selbst.

### Einrichtung als Sheet

`/main/setup` leitet über `openSetupSheetGuard` nach `/main/settings?sheet=setup`; der Routen-Initialisierer `work-setup-route` öffnet daraufhin im Einstellungsfenster das Sheet `setup` (`Build your project team`, 760 px). **Expert settings / accounts** schließt das Sheet und öffnet `Connected services` des gewählten Workspace; nach dem Start einer Analyse kommt das Hauptfenster nach vorn.

## Ausführungsablauf

1. Ein Auslöser fordert das Fenster an: `settings.open` aus einem Renderer, `window.show { route: 'settings' }` aus dem Menüleisten-Menü oder der Menüeintrag **Settings…**. Main blendet bei Renderer-Anfragen zuerst das Menüleisten-Fenster aus.
2. Existiert ein nicht zerstörtes Einstellungsfenster, wartet Main auf dessen erstes Laden. Mit Zielort sendet es diesen als Navigationsereignis; ohne Zielort behält das Fenster seinen Zustand.
3. Andernfalls erzeugt Main das Fenster und lädt die Route `#<Zielort>` oder `#/settings`; in der Entwicklung über die konfigurierte Renderer-URL, sonst aus den paketierten Dateien. Ein Fehler beim ersten Laden wird abgefangen, damit das Fenster trotzdem erscheint; ein später erfolgreicher Neuladeversuch kann den Inhalt nachliefern.
4. Außer im versteckten E2E-Modus aktiviert Main auf macOS die Anwendung (reguläre Aktivierungsrichtlinie, Dock sichtbar, Fokus übernehmen), stellt ein minimiertes Fenster wieder her, zeigt und fokussiert es.
5. Beim Schließen setzt Main seinen Fensterverweis und das gespeicherte Ladeversprechen zurück, sofern das geschlossene Fenster noch das aktuelle ist.

## Fenstereigenschaften

- Größe 1000 × 760 px beim Erzeugen, Mindestgröße 720 × 520 px, frei veränderbar; keine Speicherung von Größe oder Position.
- Erzeugt mit `show: false`; erst Schritt 4 zeigt es.
- Titel `Settings`. Main verhindert `page-title-updated`, damit der Dokumenttitel des Renderers den Fenstertitel nicht überschreibt.
- Plattformrahmen und Theme-Neuzeichnung wie beim Hauptfenster (siehe [Plattformrahmen](README.md#plattformrahmen)).
- `webPreferences`: Preload der Anwendung, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`.
- Neue Fenster werden verweigert und ihre URL höchstens extern geöffnet; jede Navigation weg von der aktuellen URL wird verhindert und höchstens extern geöffnet.
- Scheitert das Laden einer Datei-URL unterhalb des paketierten Renderer-Verzeichnisses mit Fehlercode −6, lädt Main den Renderer-Index mit derselben Hash-Route neu.

## Vertrauensgrenzen und geteilte Kanäle

- Haupt-, Einstellungs- und Menüleisten-Fenster gelten als vertrauenswürdige Absender für den Orchestrierungs- und den Desktop-Umschlag. Jede andere `WebContents` erhält `UNTRUSTED_RENDERER`.
- Native Pfadauswahl ist für Haupt- und Einstellungsfenster zugelassen, nicht für das Menüleisten-Fenster; der Dialog wird an das anfragende Fenster gebunden.
- Ausführungsereignisse und Updatezustände sendet Main an alle Renderer-Fenster, also auch an das Einstellungsfenster.
- Native Lebenszyklus-Rückfragen (Beenden, Update-Neustart) werden an das Einstellungsfenster gebunden, wenn es fokussiert ist, sonst an das Hauptfenster.
- **Keep running in background** blendet Haupt- und Einstellungsfenster aus.
- Aktivierung über das Dock und ein zweiter Programmstart zeigen das Hauptfenster, nicht das Einstellungsfenster. Unter Windows und Linux beendet sich die Anwendung, wenn alle Fenster geschlossen sind.

## Anwendungsmenü

| Plattform         | Menü                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| macOS             | Programmmenü: About, Trenner, **Settings…** (`CmdOrCtrl+,`), Trenner, Hide, Hide Others, Show All, Trenner, Quit. **File**: **New Work Item…** (`CmdOrCtrl+N`), Trenner, Close. Danach Edit, View, Window, Help.                                                               |
| Windows und Linux | **File**: **New Work Item…** (`CmdOrCtrl+N`), **Settings…** (`CmdOrCtrl+,`), Trenner, Quit. Danach Edit, View, Window. Das Menü ersetzt Electrons Standardmenü und wird wegen der rahmenlosen Fenster nicht als Menüleiste gezeichnet; Accelerator und Rollen bleiben wirksam. |

**Settings…** öffnet das Einstellungsfenster ohne Zielort. **New Work Item…** zeigt das Hauptfenster und sendet `/main/board?create=true`.

## Fehler und Wiederherstellung

| Fehlerfall                                         | Erkennung                             | Öffentlicher Fehler                                                              | Nebenwirkungen                             | Wiederherstellung                        |
| -------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------- |
| Ungültige Parameter in `settings.open`             | Zod-Schema in Preload, erneut in Main | Vertragsfehler im Preload, sonst `DESKTOP_REQUEST_FAILED`                        | keine                                      | gültige Parameter senden                 |
| Ungültige Parameter in einem Hauptfensterlink      | Guard filtert                         | keiner                                                                           | Fenster öffnet mit den gültigen Parametern | –                                        |
| Zusammengesetzter Zielort außerhalb der Allowlist  | `isDesktopNavigationPath` in Main     | keiner                                                                           | Fenster öffnet ohne Zielort                | –                                        |
| Fremde Nachricht auf `desktop:navigate`            | `isDesktopNavigationPath` im Preload  | keiner                                                                           | keine Navigation                           | –                                        |
| Erstes Laden scheitert                             | Ladeversprechen abgelehnt             | keiner                                                                           | Fenster wird trotzdem gezeigt              | Datei-Ladewiederholung bei Fehlercode −6 |
| Fenster während des Öffnens zerstört               | `isDestroyed()`                       | keiner                                                                           | kein Anzeigen                              | erneut anfordern                         |
| Einstellung lässt sich nicht speichern             | `saveSettings` liefert `false`        | `Unable to save settings.` mit Fehlerbeschreibung                                | keine                                      | Steuerelement zeigt gespeicherten Wert   |
| Editor-Sheet scheitert beim Speichern              | Speicherweg liefert Misserfolg        | Hinweis (`Unable to save settings.` u. a.); im Workspace-Sheet zusätzlich Banner | keine; Sheet bleibt offen                  | Eingaben bleiben, erneut speichern       |
| Unbekannte Editor-`kind` oder ungültige Anfrage    | `SettingsEditorRegistry.resolve`      | Ausnahme (Programmierfehler)                                                     | kein Sheet                                 | Komposition korrigieren                  |
| Doppelte Karte oder widersprüchliche Bereichsdaten | Katalog und Slot-Provider beim Aufbau | Ausnahme (Kompositionsfehler)                                                    | Bereichsliste wird nicht gebildet          | Komposition korrigieren                  |
| Fehlerhafte Nachricht auf dem Abgleichskanal       | `settings` fehlt oder ist kein Objekt | keiner                                                                           | wird ignoriert                             | –                                        |

## Versionierung und Kompatibilität

Die Desktop-Methoden behalten ihre bisherige Reihenfolge; `settings.open` ist am Ende angehängt. `window.show` erweitert sein Enum um `inbox`, `notifications` und `new-work-item`; der Standard bleibt `current`. Das frühere Navigationsziel `/main/settings` wird von Main nicht mehr gesendet; ältere Renderer-Links darauf bleiben über den Guard gültig.

## Implementierungsabbildung in Symphony

| Verantwortung                                 | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                                | Beleg                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fensterlebenszyklus, Menü, Kanäle             | `apps/desktop/src/main.ts` (`showSettingsWindow`, `createSettingsWindow`, `settingsNavigationPath`, `mainWindowDestination`, `configureApplicationMenu`, `isTrustedRenderer`)                                                                                                                                             | `apps/renderer-e2e/src/openSettingsWindow.ts`, `desktop.spec.ts`                                                                                                           |
| Preload-Filter                                | `apps/desktop/src/preload.ts` (`onNavigate`)                                                                                                                                                                                                                                                                              | –                                                                                                                                                                          |
| Schemas und Allowlist                         | `libs/ipc-contracts/desktop/src/lib/{DesktopRequestSchemas,DesktopResponseSchemas,DesktopRequestEnvelopeSchema,DesktopNavigationPath,isDesktopNavigationPath,IDesktopApi}.ts`                                                                                                                                             | `DesktopRequestSchemas.spec.ts`, `isDesktopNavigationPath.spec.ts`, `DesktopRequestEnvelopeSchema.spec.ts`, `DesktopResponseSchemas.spec.ts`                               |
| Routen und Guard                              | `libs/frontend/setting/src/routing/{SettingsRoutes,SettingsWindowRoutes,openSettingsWindowGuard}.ts`, `libs/frontend/presentation/src/lib/routing/presentationRoutes.ts`, `apps/renderer/src/configuration/ShellConfig.ts`                                                                                                | `presentationRoutes.spec.ts`                                                                                                                                               |
| Renderer-Navigation                           | `apps/renderer/src/views/ShellView.ts`                                                                                                                                                                                                                                                                                    | –                                                                                                                                                                          |
| Auslöser im Hauptfenster                      | `PresenterViewPresenter.openSettingsCommand`, `RunPanelView.openAiTeam`                                                                                                                                                                                                                                                   | `PresenterViewPresenter.spec.ts`                                                                                                                                           |
| Fensteroberfläche und Auswahl                 | `libs/frontend/setting/src/views/{SettingsWindowView,SettingsView,SettingsSidebarView,SettingsSearchView}`, `view-presenters/SettingsViewPresenter.ts`, `context/SettingsHostSession.ts`                                                                                                                                  | `SettingsViewPresenter.spec.ts`, `SettingsHostSession.spec.ts`, `apps/renderer-e2e/src/settings-window.spec.ts`                                                            |
| Suche                                         | `libs/frontend/setting/src/search/*`, `provider/{withSettingsSearch,SettingsSearchContributionsToken}.ts`, `pipes/SettingsSearchHighlightPipe.ts`, `components/SettingsSearchControlComponent.ts`; Beiträge `features/{delivery,team,ai,work,feedback,workspace}/src/lib/settings/*SearchEntries.ts`                      | `searchSettings.spec.ts`, `SettingsSearchIndex.spec.ts`, `SettingsSearchHighlightPipe.spec.ts`, `*SearchEntries.spec.ts`                                                   |
| Editor-Schlüssel im Zielort                   | `libs/frontend/setting/src/{provider/withSettingsEditorRoute,routing/ISettingsEditorRoute}.ts`; Auflöser `features/*/src/lib/settings/resolve*EditorRoute.ts`                                                                                                                                                             | `withSettingsEditorRoute.spec.ts`, `resolveWorkAccountEditorRoute.spec.ts`                                                                                                 |
| Katalog, Slots, Kartenbausteine               | `libs/frontend/setting/src/{catalog/SettingsCatalog,constants/SettingsViewSlot,provider/*,models/*}.ts`, `components/{SettingsGroupComponent,SettingsRowComponent,SettingsConditionalComponent}`, `pipes/SettingsSectionIconPipe.ts`; Stile `apps/renderer/src/styles/overrides/window-chrome.scss`                       | `SettingsCatalog.spec.ts`, `provideSettings.spec.ts`, `SettingsEditorRegistry.spec.ts`                                                                                     |
| Sheets, Rückfragen, Sofortspeichern, Abgleich | `editor/SettingsEditorService.ts`, `sheets/showSettingsSheet.ts`, `alerts/SettingsAlertService.ts`, `views/SettingsAlertSheetView`, `view-presenters/SettingsAlertSheetViewPresenter.ts`, `forms/createImmediateSetting.ts`, `sync/SettingsWindowSync.ts`; Schreiber `libs/frontend/core/src/state/ConfigurationStore.ts` | `SettingsEditorService.spec.ts`, `SettingsAlertService.spec.ts`, `SettingsAlertSheetViewPresenter.spec.ts`, `createImmediateSetting.spec.ts`, `SettingsWindowSync.spec.ts` |
| Einrichtungs-Sheet                            | `libs/frontend/features/work/src/lib/onboarding/{routing/openSetupSheetGuard,routing/initializeSetupSettingsRoute,views/SetupView}.ts`, `provider/withWorkSettings.ts`                                                                                                                                                    | `initializeSetupSettingsRoute.spec.ts`, `SetupViewPresenter.spec.ts`                                                                                                       |

## Verifikation und Akzeptanzkriterien

- **Settings** in der Seitenleiste öffnet ein neues Fenster mit der Route `#/settings` und `test-id="settings-window"`; ein zweiter Klick liefert dasselbe Fenster.
- Ein offenes Fenster wechselt bei `settings.open` mit Parametern zum Zielort und behält ohne Parameter seinen Bereich.
- `settings.open` mit neun Parametern, einem Schlüssel mit Großbuchstaben am Anfang oder einem Wert mit `%` wird ohne Fensteränderung abgewiesen.
- `isDesktopNavigationPath` akzeptiert die fünf festen Ziele und `/settings` mit bis zu acht gültigen Paaren und weist unbekannte Routen, Kodierungen, überzählige Paare und Nicht-Strings ab.
- `window.show` akzeptiert nur die sechs Ziele und verwendet ohne Angabe `current`.
- `#/main/settings?section=skills` im Hauptfenster öffnet das Einstellungsfenster mit `section=skills`, während das Hauptfenster seinen Bildschirm behält.
- Das Einstellungsfenster verwendet dieselben `webPreferences` wie das Hauptfenster und kann Ordner auswählen; das Menüleisten-Fenster kann es nicht.
- ⌘, beziehungsweise Ctrl+, öffnet das Fenster auf allen Plattformen; ⌘N beziehungsweise Ctrl+N aus dem Einstellungsfenster öffnet im Hauptfenster das Anlegen eines Work Items.
- Das Fenster öffnet auf `Workspaces`; die Seitenleiste listet die globalen Bereiche `Workspaces`, `Automation`, `Skills`, `System`, `Mobile access`, `Appearance` in dieser Reihenfolge.
- Die Suche `storage` zeigt mindestens eine Gruppe mit markiertem Treffer; eine Suche ohne Treffer (`tokn`) zeigt `No setting matches “tokn”`; eine leere Suche zeigt wieder den Bereich.
- Ein Suchbegriff, der nur in einer Workspace-Einstellung vorkommt, liefert eine Gruppe je konfiguriertem Workspace mit dessen Namen in der Brotkrume.
- Die Suche nach dem Namen eines AI-Kontos (etwa `Default Codex account`) liefert einen Treffer unter `<Workspace> › Connected services › AI accounts`; **Open** öffnet das Sheet des Kontos, und derselbe Treffer öffnet es nach dem Schließen erneut.
- Repositories, Lieferziele, Agenten, Boards, GitHub- und Azure-DevOps-Konten, Teams-Intakes und Workspaces sind eigene Treffer und öffnen ihr Sheet; ein Treffer mit `value` zeigt ihn neben **Open**.
- **Add workspace** öffnet ein Sheet `mosaik-dialog[part~="settings-sheet"]`, ein Klick daneben schließt es nicht, Escape schließt es ohne Änderung; ein zweiter Editoraufruf öffnet kein zweites Sheet.
- Ein Alert liefert `true` nur für die Primärschaltfläche; Escape und **Cancel** führen die Aktion nicht aus.
- `createImmediateSetting`: Ein `persist`, das `false` liefert oder wirft, stellt den gespeicherten Wert wieder her; ein Wert gleich dem gespeicherten speichert nicht.
- Eine Änderung im Einstellungsfenster erreicht das Hauptfenster ohne Neuladen und wird nicht zurückgesendet; das erste Laden eines Fensters wird nicht gesendet.

## Verwandte Dokumentation

- [Fensterrahmen und Navigation](README.md)
- [Einstellungen im eigenen Fenster](../../project/window-and-navigation/settings-window.md)
- Bereiche: [Workspaces](../workspaces/README.md), [AI-Team](../ai-team/README.md), [Skills](../skills/README.md), [Automation](../automation/README.md), [Einstellungen dieses Mac](../system/README.md)
- [IPC-Modell](../ipc-model.md)
- [Sicherheitsmodell](../security-model.md)
