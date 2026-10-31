# Workspaces in den Einstellungen

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Einstellungen verwalten Workspaces über einen globalen Bereich `workspaces` (Verzeichnis, Anlegen, Import) und fünf workspace-gebundene Bereiche, die verschiedene Features beitragen: `services`, `repositories`, `delivery`, `local-ci` und `administration`. Der sechste Workspace-Bereich `team` gehört dem [AI-Team](../ai-team/README.md). Das funktionale Verhalten beschreibt das Produkthandbuch unter [Workspaces](../../project/workspaces/README.md).

Garantien:

- Jede Änderung ist ein Lesen-Ändern-Schreiben des vollständigen, zuletzt geladenen Einstellungsaggregats über den einzigen Einstellungsschreiber (`settings.save`). Der Orchestrator validiert das Aggregat vor dem Speichern; eine abgewiesene Änderung hinterlässt den gespeicherten Zustand unverändert.
- Ein Bereich ändert ausschließlich Datensätze mit der `workspaceId` des in der Einstellungssitzung gewählten Workspace. Die Auswahl der Einstellungssitzung ist unabhängig vom aktiven Workspace-Umfang des Hauptfensters.
- Sofort wirksame Steuerelemente zeigen nach einem Speicherfehler wieder den gespeicherten Wert; Sheets bleiben nach einem Speicherfehler mit ihrem Entwurf offen.
- Geheimnisse gelangen nie in die Einstellungen oder ein Exportbündel: Azure-DevOps-Tokens liegen im Schlüsselbund des Betriebssystems, ein OpenAI-API-Schlüssel wird einmal an die CLI übergeben, Konten tragen höchstens den Namen einer Umgebungsvariablen als Referenz.
- Entfernen und Löschen geschieht nur nach einer positiven Antwort in einem Alert-Sheet. Ein blockiertes Entfernen erklärt den Grund und schreibt nichts.
- Speicherzahlen erscheinen nur auf Grundlage einer abgeschlossenen Messung; davor zeigt die Oberfläche `—` beziehungsweise `Measuring…`.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Abschnittsregistrierung, Workspace-Verzeichnis, Workspace-Sheet, Export, Import und Löschen, Administration, die Workspace-Seite der lokalen GitHub Actions sowie die Vertiefungen [Connected services](connected-services.md) und [Repositories und Auslieferungsziele](repositories-and-destinations.md).
- Nicht enthalten: die gemeinsame Mechanik der Einstellungen mit Seitenleiste, Suche, Sheets, Alert-Sheets, Sofortspeichern und Abgleich zwischen Renderer-Fenstern ([Einstellungen im Hauptfenster](../window-and-navigation/settings.md)); der Bereich `team` ([AI-Team](../ai-team/README.md)); das Speicherbild und die virtuellen Maschinen dieses Mac ([System](../system/README.md)); die Laufzeit lokaler CI ([Managed Local CI](../managed-local-ci.md)); die Teams-Feedback-Aufnahme im Hintergrund ([Teams-Feedback-Intake](../teams-feedback-intake.md)); Isolation und Ausführungsgrenzen eines Workspace ([Workspace-Modell](../workspace-model.md)); Auslieferungsnachweise im Orbit ([Production orbit](../production-orbit.md)).

## Verantwortungsgrenzen

| Verantwortung                                                  | Kanonischer Eigentümer  | Öffentlicher Vertrag                                                                                                                        | Verbraucher                            |
| -------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Bereichskatalog, Slots, Editor-Registry, Routen-Initialisierer | Setting-Paket           | `withSettingsViews`, `withSettingsEditor`, `withSettingsRouteInitializer`, `SettingsViewSlot`, `SettingsEditorService.open`                 | alle hier beschriebenen Features       |
| Verzeichnis, Workspace-Sheet, Administration, Transfer         | Workspace-Feature       | Bereiche `workspaces`, `services` (Rahmen), `administration`; Editor `workspace`; `WorkspaceStore`                                          | Einstellungen                          |
| Boards, Azure DevOps, nicht verwendete GitHub-Konten           | Work-Feature            | Slot-Beiträge in `services`; Editoren `github-projects`, `azure-devops`                                                                     | Bereich `services`                     |
| KI-Konten                                                      | AI-Feature              | Slot-Beiträge in `services`; Editor `ai-account`                                                                                            | Bereich `services`, AI-Team            |
| Feedback aus Microsoft Teams                                   | Feedback-Feature        | Slot-Beitrag in `services`; Editor `teams-feedback`                                                                                         | Bereich `services`                     |
| Repositories, Auslieferungsziele                               | Delivery-Feature        | Bereiche `repositories`, `delivery`; Editoren `repository`, `delivery-target`; Initialisierer `delivery-settings-route`                     | Einstellungen, Orbit                   |
| Lokale GitHub Actions je Workspace                             | CI-Feature              | Bereich `local-ci`                                                                                                                          | Einstellungen                          |
| Validierung und Persistenz                                     | Orchestrator            | `settings.save` mit dem Anwendungseinstellungsschema; `workspaces.export`, `workspaces.import`, `workspaces.delete`, `repositories.prepare` | alle Features                          |
| Lieferumfang und Team eines Workspace angleichen               | Team-Feature (optional) | `synchronizeDeliveryContext(settings, workspaceId)`                                                                                         | Repository-, Board- und Konto-Editoren |

Features hängen nur vom Setting-Paket und ihren eigenen Ports ab; der Workspace-Rahmen von `services` kennt die beitragenden Features nicht, sondern fragt die Slot-Registry, ob Beiträge vorhanden sind.

## Abschnittsregistrierung

Ein Feature registriert einen Bereich mit `withSettingsViews({ id, slot, views })`. Jeder View-Eintrag trägt `id`, `order`, optional `section` (`scope`, `id`, `label`, `description`, `order`), statische Sucheinträge `search`, `canActivate(selection)` und `loadComponent()`. Die Auswahl ist `{ sectionId, workspaceId }`; ein globaler Bereich ist aktiv bei `workspaceId === null`, ein Workspace-Bereich bei gesetzter `workspaceId`.

| Bereich `id`     | Scope       | Beschriftung              | Beschreibung in der Werkzeugleiste                                                          | `order` | Eigentümer |
| ---------------- | ----------- | ------------------------- | ------------------------------------------------------------------------------------------- | ------- | ---------- |
| `workspaces`     | `global`    | **Workspaces**            | Open or add a separate company workspace.                                                   | 10      | Workspace  |
| `team`           | `workspace` | **AI team**               | Agents, responsibilities, skills, and backup order.                                         | 10      | Team       |
| `services`       | `workspace` | **Connected services**    | Ticket sources, source control, and feedback intake.                                        | 20      | Workspace  |
| `repositories`   | `workspace` | **Repositories**          | Local source code and AI work approval.                                                     | 30      | Delivery   |
| `delivery`       | `workspace` | **Delivery destinations** | Production, environments, release channels, and deployment workflows.                       | 40      | Delivery   |
| `local-ci`       | `workspace` | **Local GitHub Actions**  | Run eligible workflows of this workspace in a disposable Linux virtual machine on this Mac. | 50      | CI         |
| `administration` | `workspace` | **Administration**        | Workspace storage, export, and deletion.                                                    | 60      | Workspace  |

Die gültigen Workspace-Bereichskennungen sind die geschlossene Liste `team`, `services`, `repositories`, `delivery`, `local-ci`, `administration`. Ein Zielort ist `?workspace=<id>&section=<Bereich>`; die Auswertung beschreibt [Einstellungen im Hauptfenster](../window-and-navigation/settings.md#auswahl-und-zielort). Auslöser im Hauptfenster: die Mitteilungsquelle der KI-Konten (`section=services`), die Speicherdruck-Quelle (`section=administration`, sonst `section=system`), das Orbit (`section=delivery` mit Editor-Schlüsseln) und das Einrichtungs-Sheet (`section=services`).

### Sucheinträge

Die folgenden Einträge sind statisch und werden daher einmal je Workspace indiziert. Keiner trägt `loadControl`; jeder Treffer öffnet seinen Bereich. Dazu kommen datenabhängige Einträge je Objekt mit dessen `workspaceId` und einem Editor-Schlüssel in `parameters`, der zusätzlich das Sheet öffnet: Workspaces (`workspaces`, `{ edit }`), Repositories (`repositories`, `{ repository }`), Lieferziele (`delivery`, `{ repository, target }`), AI-Konten, Boards, GitHub- und Azure-DevOps-Konten sowie Teams-Intakes (`services`, `{ account }`, `{ board }`, `{ intake }`). Beiträge, Werte und Routen beschreibt [Einstellungen im Hauptfenster](../window-and-navigation/settings.md#suche).

| Bereich          | Einträge (`label`)                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspaces`     | Add workspace, Import workspace                                                                                                                                                        |
| `services`       | Boards, Connected services, Feedback intake, Add a service                                                                                                                             |
| `repositories`   | Repositories                                                                                                                                                                           |
| `delivery`       | Delivery destinations                                                                                                                                                                  |
| `local-ci`       | Enable local runs (Gruppe Activation), Runner image (Guest image), Setup script (Repository setup)                                                                                     |
| `administration` | Maximum workspace size (GB) (Storage), Automatically activate safe groups (Delivery grouping), Edit workspace, Use only this workspace, Export workspace, Delete workspace (Workspace) |

### Editoren

`withSettingsEditor({ id, kind, width, workspaceSection?, isRequest, loadComponent })` registriert ein Sheet. `SettingsEditorService.open(request, onSection?)` wählt den Editor über `isRequest`, öffnet höchstens ein Sheet (ein zweiter Aufruf fordert Aufmerksamkeit für das offene an) und ruft `onSection(workspaceId, workspaceSection)` auf, wenn der Editor einen Bereich deklariert – so springt das Fenster beim Öffnen des KI-Konto-Sheets aus einem anderen Bereich nach `services`.

| `kind`            | Eigentümer | Breite | Anfrage                                                                                                 |
| ----------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `workspace`       | Workspace  | 600 px | `{ workspaceId? }`; ohne Id anlegen                                                                     |
| `ai-account`      | AI         | 780 px | `{ workspaceId, connectionId?, runtime? }`; `workspaceSection: 'services'`                              |
| `github-projects` | Work       | 600 px | `{ workspaceId, sourceId? }`                                                                            |
| `azure-devops`    | Work       | 600 px | `{ workspaceId, sourceId? }`                                                                            |
| `teams-feedback`  | Feedback   | 600 px | `{ workspaceId, sourceId? }`                                                                            |
| `repository`      | Delivery   | 600 px | `{ workspaceId, repositoryBindingId? }`                                                                 |
| `delivery-target` | Delivery   | 640 px | `{ workspaceId, repositoryBindingId, targetId?, production?, environment?, displayName?, targetKind? }` |

### Rückfragen

Alle Rückfragen laufen über `SettingsAlertService.confirm`. Ohne `cancelLabel` ist die Rückfrage ein Hinweis mit nur **OK**.

| `id`                                    | Titel                             | Ton                  | Primär / Abbruch                      | Bereich               |
| --------------------------------------- | --------------------------------- | -------------------- | ------------------------------------- | --------------------- |
| `workspace-import`                      | Import workspace configuration?   | `info`               | Import workspace / Cancel             | Workspaces            |
| `delete-workspace-confirmation-<id>`    | Delete <Name>?                    | `danger`, destruktiv | Delete workspace / Keep workspace     | Administration        |
| `remove-ai-account-blocked-<id>`        | This account is still in use      | `warning`            | OK                                    | Connected services    |
| `remove-ai-account-<id>`                | Remove <Name>?                    | `danger`, destruktiv | Remove account / Keep account         | Connected services    |
| `install-agent-runtime-<runtime>`       | Install <CLI> CLI?                | `warning`            | Install with Homebrew / Cancel        | KI-Konto-Sheet        |
| `import-opencode-credentials-<id\|new>` | Import current OpenCode sign-ins? | `warning`            | Import into workspace / Cancel        | KI-Konto-Sheet        |
| `remove-repository-blocked-<id>`        | This repository is still in use   | `warning`            | OK                                    | Repositories          |
| `remove-repository-<id>`                | Remove <Name>?                    | `danger`, destruktiv | Remove repository / Keep repository   | Repositories          |
| `remove-board-<id>`                     | Remove <Name>?                    | `danger`, destruktiv | Remove board / Keep board             | GitHub-Projects-Sheet |
| `remove-azure-devops-source-<id>`       | Remove <Name>?                    | `danger`, destruktiv | Remove source / Keep source           | Azure-DevOps-Sheet    |
| `remove-feedback-intake-<id>`           | Remove <Name>?                    | `danger`, destruktiv | Remove intake / Keep intake           | Teams-Intake-Sheet    |
| `remove-delivery-target-<id>`           | Remove <Name>?                    | `danger`, destruktiv | Remove destination / Keep destination | Delivery destinations |

Jedes Entfernen in diesen Bereichen schreibt erst nach `true`; Abbruch und Escape ändern nichts.

### Pflichtangaben in Sheets

Die Sheets für KI-Konto, Repository, Azure-DevOps-Quelle und Teams-Intake berechnen ihre fehlenden Pflichtangaben als Liste von Kennungen in Formularreihenfolge (Draft-Projektion, die jeder Feldänderung folgt). Solange die Liste nicht leer ist, ist **Save** gesperrt (beim Teams-Intake auch **Test connection**), und ein bedingter Rahmen `With missing details` zeigt die Warnmeldung `Finish these details before saving` mit den Feldbezeichnungen, die eine reine Pipe je Feature mit `·` verbindet:

| Sheet        | Kennung → Bezeichnung                                                                                                                                                                                                                                                             | Pipe                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Repository   | `display-name` Display name, `owner` Owner, `name` Repository                                                                                                                                                                                                                     | `repositoryValidationIssuesLabel`         |
| Azure DevOps | `display-name` Display name, `organization` Organization, `project` Project, `query` Saved query ID or WIQL (weder Abfrage-Id noch WIQL)                                                                                                                                          | `azureDevOpsValidationIssuesLabel`        |
| Teams-Intake | `display-name`, `tenant-id` Microsoft Entra tenant ID, `client-id` Application / client ID, `credential-ref` Client secret credential reference, `team-id` Team ID, `channel-id` Channel ID, `target-project` Target GitHub Project, `target-repository` Target GitHub repository | `teamsFeedbackValidationIssuesLabel`      |
| KI-Konto     | `account-name` AI account name, fehlende CLI des Anbieters                                                                                                                                                                                                                        | `aiValidationIssuesLabel` (`frontend-ui`) |

Getrimmte Leerwerte gelten als fehlend.

## Workspace-Verzeichnis

Die Projektion erzeugt je konfiguriertem Workspace in Konfigurationsreihenfolge einen Eintrag:

| Feld                     | Regel                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `agents`                 | Anzahl `agentProfiles` mit dieser `workspaceId`                                                                                           |
| `aiAccounts`             | Anzahl `connections` dieses Workspace mit `kind` aus `codex`, `claude`, `opencode`                                                        |
| `repositories`           | Anzahl `repositoryBindings` dieses Workspace                                                                                              |
| `unpreparedRepositories` | Anzahl Laufzeitstatus dieses Workspace mit `preparation.state === 'unprepared'`; `undefined`, solange kein Laufzeitspeicher vorhanden ist |
| `storage`                | Workspace-Eintrag des Speicherstatus, nur wenn `measured` wahr ist                                                                        |

Aktivierte Einträge stehen in der Gruppe, deaktivierte unter der Bedingung `While a workspace is disabled`. Die Zusammenfassung lautet `<n> agent(s) · <n> AI account(s) · <n> repositor(y|ies)[, <n> not prepared locally] · <Größe|—> of <Grenze> GB`; bei deaktivierten `Disabled · not used for configuration and task routing`. **Open** ruft `openWorkspace(id)` der Einstellungssitzung nur für eine bekannte Id auf; der Standardbereich ist `team`. Der Text für ein leeres Verzeichnis existiert, ist aber unerreichbar, weil das Schema mindestens einen Workspace verlangt.

## Workspace-Sheet

1. Der Entwurf entsteht aus dem Workspace der Anfrage, sonst aus `{ displayName: '', shortCode: '', color: '#4f6bed', enabled: true }`. Fehlen die Einstellungen beim Öffnen, lädt das Sheet sie und erzeugt den Entwurf neu (Ladeplatzhalter währenddessen).
2. **Save** ist gesperrt, solange gespeichert wird oder ein anderer Settings-Editor schreibt. Validierung: `displayName.trim()` nicht leer, `shortCode.trim().toLocaleUpperCase().slice(0, 8)` nicht leer, `color` erfüllt `^#[0-9a-fA-F]{6}$`. Bei Verstoß setzt das Sheet den Fehler `invalid` und schreibt nichts.
3. Der Datensatz: `id` vorhanden oder `workspace-<uuid>`, `isolation: 'strict'`; `storageLimitGiB` (Standard 20), `localCiEnabled` (Standard `false`), `automaticDeliveryGroupingEnabled` (Standard `false`) und ein vorhandenes `localCiImage` bleiben beim Bearbeiten erhalten. Ein neuer Workspace wird angehängt. Ist `activeViewScope.workspaceIds` leer, wird er zum aktiven Umfang.
4. Gelingt das Speichern, schließt das Sheet; sonst setzt es den Fehler `save` und behält den Entwurf.

Schemagrenzen des Workspace: `displayName` und `shortCode` nicht leer, `shortCode` höchstens 8 Zeichen, `storageLimitGiB` ganzzahlig 2–1024.

## Export, Import und Löschen

`WorkspaceStore` serialisiert Export und Import über `workspaceTransferBusy` (`'import'` oder die exportierte Workspace-Id) und das Löschen über `workspaceDeletionBusy`. Jeder Fehler wird mit einer festen Überschrift und der bereinigten Ursache gemeldet.

### Export (`workspaces.export`)

1. Ordnerauswahl `Choose export destination for <Name>`; Abbruch beendet ohne Wirkung.
2. Der Orchestrator baut ein Bündel `{ format: 'symphony.workspace', version: 2, exportedAt, workspace, connections, workItemSources, repositoryBindings, ciBindings, positions, providerManifests, agentRoutePolicies, agentProfiles, agentTeams, deliveryContexts, feedbackIntakeSources, skills }`, jeweils gefiltert auf den Workspace.
3. Portabilität: Konten verlieren Referenzen auf Zugangsdaten (Codex und Claude tragen `credentialSource: 'isolated'`, GitHub nur Host und Protokoll, Azure DevOps Organisation und optional Mandant, OpenCode ein Gateway); Repositories verlieren `localPath` und das lokale Einrichtungsskript; Teams-Intakes verlieren die Secret-Referenz und sind `enabled: false`. Auslieferungsziele sind nicht enthalten. `skills` enthält jeden Benutzer-Skill, auf den eine Teamzuordnung verweist; fehlt ein solcher, scheitert der Export.
4. Dateiname `<slug>-<YYYYMMDDTHHMMSSZ>.symphony-workspace.json`; der Slug ist der normalisierte Name in Kleinbuchstaben, höchstens 48 Zeichen, sonst `workspace`.
5. Meldung `<Name> exported.` mit dem Hinweis auf ausgeschlossene Zugangsdaten und Pfade und der Zahl eingebetteter Skills.

### Import (`workspaces.import`)

1. Dateiauswahl `Choose Symphony workspace bundle` (Filter `json`), danach Rückfrage `workspace-import`. Abbruch an beiden Stellen schreibt nichts.
2. Der Orchestrator weist ab, solange ein Workspace gelöscht wird, im Bündel-Workspace eine Ausführung aktiv ist oder ein Work-Item-Entwurf läuft.
3. Das Bündel wird gegen sein Schema geprüft. Der Plan ersetzt alle Datensätze mit der Workspace-Id des Bündels durch die importierten (gleiche Id ⇒ `replaced`). Repositories erhalten den bisherigen `localPath` derselben Repository-Id, sonst einen verwalteten Standardpfad. Ein aktivierter Workspace wird zum einzigen aktiven Umfang; ein deaktivierter darf nur importiert werden, wenn danach noch ein aktivierter Workspace gewählt bleibt. Das Ergebnis muss das vollständige Anwendungseinstellungsschema erfüllen, sonst scheitert der Import ohne Schreiben.
4. Geteilte Skills werden validiert. Existiert derselbe Name mit anderem Inhalt, scheitert der Import vor jedem Schreiben; fehlende werden gespeichert.
5. Nach dem Speichern stößt der Orchestrator Workspace-Bereinigung, Ausführungswarteschlange, Remote-Automatisierung, Feedback-Aufnahme und den autonomen Zyklus an. Der Renderer übernimmt die Einstellungen, setzt die Board-Auswahl zurück, verwirft die Anbieterkonfiguration und aktualisiert Snapshot, Konfiguration und alle registrierten Aktualisierungsteilnehmer.
6. Meldung `<Name> imported.` beziehungsweise `<Name> updated from bundle.` mit den Folgeschritten `Sign in to <n> connection(s).`, `Verify <n> local repository path(s).`, `<n> shared skill(s) imported.`, sonst `The workspace is ready to use.`.

### Löschen (`workspaces.delete`)

1. **Delete workspace** ist gesperrt, solange nur ein Workspace existiert oder ein Löschen läuft; danach Rückfrage `delete-workspace-confirmation-<id>`.
2. Der Orchestrator weist ab, solange ein anderes Löschen läuft oder ein Work-Item-Entwurf im Workspace aktiv ist. Er entfernt zuerst die verwalteten Arbeitsbäume; wurden welche übersprungen oder schlugen fehl, stoppt er mit ihrer Zahl und stellt die Einstellungen wieder her.
3. Danach entfernt er die Workspace-Konfiguration, die operativen Daten, Abkühl- und Routenzustände, Laufzeit- und Projektionscaches, schließt die Workspace-Datenbank und löscht die Speicherpfade des Workspace. Konfigurierte Repository-Checkouts außerhalb dieser Pfade bleiben.
4. Der Renderer verfährt wie nach einem Import und meldet `Workspace deleted.`.

## Administration

| Steuerelement                          | Vertrag                                                                                                                                                                                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Speicherbalken                         | Workspace-Eintrag des Speicherstatus mit den Segmenten `repositories`, `executions`, `verification`, `runtimes`, `database` und dem freien Rest; ohne Messung Platzhalter                                                                                   |
| **Maximum workspace size (GB)**        | `createImmediateSetting(storageLimitGiB ?? 20)`; beim Bestätigen gilt der Wert nur als ganze Zahl in 2–1024, sonst wird der gespeicherte Wert angewendet (gleicher Wert ⇒ kein Schreiben); gesperrt, solange der Schreiber arbeitet                         |
| Meldung `When the limit is reached`    | sichtbar bei Druck `critical`                                                                                                                                                                                                                               |
| **Automatically activate safe groups** | `createImmediateSetting(automaticDeliveryGroupingEnabled ?? false)`; ignoriert Ereignisse, während der Schreiber arbeitet oder die Workspace-Id nicht mehr passt; ein von Mosaik zurückgespiegeltes `checked` mit gleichem Wert schreibt nicht              |
| **Use only this workspace**            | setzt `activeViewScope.workspaceIds` auf `[id]`, leert `savedViewId`, behält die Board-Auswahl nur, wenn sie zu diesem Workspace gehört, lädt dessen Snapshot-Cache und aktualisiert; ohne Wirkung für deaktivierte oder bereits zuerst gewählte Workspaces |

Druckstufen eines Kontingents: Anteil an der Grenze ≥ 95 % `critical`, ≥ 80 % `danger`, ≥ 60 % `warning`, sonst `healthy`; ein Workspace kann zusätzlich eine Mindeststufe tragen. Beschriftungen: `Within limit`, `Approaching limit`, `High usage`, `Writes blocked`, ohne Wert `Measuring…`. Schreibende Operationen eines Workspace prüfen vor der Nebenwirkung, dass sein Kontingent nicht `critical` ist.

## Lokale GitHub Actions eines Workspace

Die automatische Kandidatensuche bestimmt vor allen GitHub-Abfragen die Workspaces mit `localCiEnabled: true` und liest ausschließlich deren aktivierte GitHub-Actions-Anbindungen. Der aktive Anzeigeumfang des Hauptfensters begrenzt diese Suche nicht. Eine Anbindung eines lokal nicht freigegebenen Workspace wird dafür nicht abgefragt; ihr Zugriffsfehler kann die freigegebenen Workspaces deshalb nicht blockieren. Fehler einer tatsächlich abgefragten Anbindung bleiben Fehler der Kandidatensuche. Die normalen Laufabfragen behalten ihren bestehenden ausgewählten beziehungsweise operativen Umfang.

Der Bereich `local-ci` teilt sich den Presenter mit der Karte **Virtual machines** unter System. Seine Entwürfe (Maschinenwerte, Aktivierung je Workspace, Skripte je Repository) liegen in einem Entwurfsobjekt je Einstellungssitzung und überleben das Neu-Einhängen der Karten. Sobald neue Einstellungen ankommen, werden die Entwürfe aus ihnen neu gebildet. Der Presenter aktualisiert den Speicherstatus alle fünf Sekunden leise.

| Steuerelement         | Vertrag                                                                                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Enable local runs** | setzt `workspaces[i].localCiEnabled` sofort; gleicher Wert schreibt nicht; Fehlschlag stellt den gespeicherten Wert wieder her; nach erfolgreichem Einschalten wird der Abbildkatalog geladen, falls er fehlt; gesperrt, solange ein lokaler Lauf aktiv ist |
| **Runner image**      | `local-ci.image.select { workspaceId, releaseTag }` legt das aufgelöste Abbild am Workspace fest; ohne festgelegtes Abbild ist das neueste Release vorausgewählt; gleiches Release schreibt nicht                                                           |
| **Refresh catalog**   | `local-ci.images.list { refresh: true }`; der Katalog trägt bei unerreichbarem GitHub `staleReason` und kommt aus dem Cache                                                                                                                                 |
| Einrichtungsskript    | Eingabe ändert nur den Entwurf; beim Verlassen wird getrimmt verglichen, ein geänderter Wert als `localCiSetupScript` gespeichert, ein leerer entfernt das Feld; Fehlschlag stellt den gespeicherten Wert wieder her; höchstens 32 768 Zeichen              |

## Fehler und Wiederherstellung

| Fehlerfall                                              | Erkennung              | Öffentlicher Fehler                                                               | Nebenwirkungen                                  | Wiederherstellung                    |
| ------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| Ungültiges Aggregat                                     | Schema im Orchestrator | `Unable to save settings.` mit Ursache                                            | keine                                           | Eingabe korrigieren                  |
| Ungültige Workspace-Eingabe                             | Sheet-Validierung      | `Check the workspace`                                                             | keine                                           | Eingabe korrigieren                  |
| Speichergrenze außerhalb 2–1024                         | Presenter              | keiner                                                                            | keine; Feld zeigt den gespeicherten Wert        | gültigen Wert eingeben               |
| Import während Löschen, aktiver Ausführung oder Entwurf | Orchestrator           | `Unable to import the workspace.` mit Ursache                                     | keine                                           | warten und wiederholen               |
| Skill-Namenskonflikt beim Import                        | Orchestrator           | `Unable to import the workspace.` mit Ursache                                     | keine                                           | Skill umbenennen oder entfernen      |
| Löschen mit nicht entfernbaren Arbeitsbäumen            | Bereinigungsergebnis   | `Unable to delete the workspace.` mit Anzahl                                      | bereits entfernte Arbeitsbäume bleiben entfernt | Ausführungen beenden, erneut löschen |
| Export mit fehlendem referenziertem Skill               | Orchestrator           | `Unable to export the workspace.` mit Skill-Id                                    | keine Datei                                     | Teamzuordnung korrigieren            |
| Abbildauswahl oder Katalog scheitert                    | CI-Store               | `Unable to select the runner image.` / `Unable to load the runner image catalog.` | keine                                           | erneut wählen oder aktualisieren     |

## Implementierungsabbildung in Symphony

| Verantwortung                       | Aktueller Pfad oder Symbol                                                                                                                                                                                                  | Beleg                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Registrierung Workspace-Bereiche    | `libs/frontend/features/workspace/src/lib/provider/withWorkspaceSettings.ts`                                                                                                                                                | `SettingsCatalog.spec.ts`                                                                                                       |
| Verzeichnis                         | `libs/frontend/features/workspace/src/lib/settings/{WorkspaceDirectoryCardView,WorkspaceDirectoryViewPresenter,IWorkspaceDirectoryEntry}.ts`                                                                                | `WorkspaceDirectoryViewPresenter.spec.ts`, `apps/renderer-e2e/src/workspace-settings-navigation.spec.ts`                        |
| Workspace-Sheet                     | `…/settings/{WorkspaceSettingsEditorView,WorkspaceSettingsEditorViewPresenter,isWorkspaceSettingsEditorRequest}.ts`                                                                                                         | `WorkspaceSettingsEditorViewPresenter.spec.ts`                                                                                  |
| Administration                      | `…/settings/{WorkspaceAdministrationCardView,WorkspaceSettingsViewPresenter}.ts`, `libs/frontend/ui/src/lib/components/storage-breakdown/StorageBreakdownComponent.ts`                                                      | `WorkspaceSettingsViewPresenter.spec.ts`, `apps/renderer-e2e/src/workspace-administration.spec.ts`, `storage-breakdown.spec.ts` |
| Transfer und Löschen (Renderer)     | `libs/frontend/features/workspace/src/lib/state/WorkspaceStore.ts`, `WorkspaceSelectionStore.ts`                                                                                                                            | `WorkspaceStore.spec.ts`, `WorkspaceSelectionStore.spec.ts`                                                                     |
| Transfer und Löschen (Orchestrator) | `apps/orchestrator/src/features/workspace/provideWorkspaceOrchestratorFeature.ts`, `apps/orchestrator/src/composition/createWorkspaceDeletionCoordinator.ts`, `libs/configuration/composition/src/lib/workspace-transfer/*` | Specs unter `workspace-transfer`                                                                                                |
| Schema                              | `libs/configuration/features/workspace/src/lib/WorkspaceSchema.ts`, `libs/configuration/composition/src/lib/application-settings/ApplicationSettingsSchema.ts`                                                              | `ApplicationSettingsSchema.spec.ts`                                                                                             |
| Speicherdruck                       | `apps/orchestrator/src/storage-governor/{StorageGovernor,quotaPressure}.ts`, `libs/frontend/ui/src/lib/pipes/StoragePressureLabelPipe.ts`                                                                                   | Specs des Storage-Governors                                                                                                     |
| Lokale CI je Workspace              | `libs/frontend/features/ci/src/lib/provider/withCiSettings.ts`, `…/settings/{CiSettingsViewPresenter,ciSettingsDraftFor}.ts`, `…/settings/views/WorkspaceLocalCi*`                                                          | `CiSettingsViewPresenter.spec.ts`, `apps/renderer-e2e/src/local-ci-settings.spec.ts`, `local-ci-setup-script.spec.ts`           |

## Verifikation und Akzeptanzkriterien

- Die Einstellungen öffnen auf `workspaces`; **Open** zeigt die sechs Workspace-Bereiche als eingerückte Zeilen, wählt `team` und schreibt `?workspace=<id>&section=team`.
- Die Zusammenfassung zählt Agenten, KI-Konten und Repositories je Workspace, nennt nicht vorbereitete Repositories erst mit bekanntem Laufzeitstatus und zeigt `—` ohne Messung; deaktivierte Workspaces stehen getrennt.
- Ein Workspace-Sheet mit leerem Namen, leerem Kürzel oder ungültiger Farbe schreibt nichts und bleibt offen; ein Speicherfehler behält den Entwurf; Umbenennen ändert weder Speichergrenze noch lokale CI, Bündelung oder aktiven Umfang.
- Import und Löschen schreiben erst nach Bestätigung; ein abgebrochener Import ändert nichts.
- Eine Speichergrenze außerhalb 2–1024 wird nicht gespeichert; ein fehlgeschlagenes Speichern zeigt wieder den gespeicherten Wert; die Bündelung speichert sofort und ignoriert zurückgespiegelte Ereignisse.
- **Enable local runs** speichert nur den betroffenen Workspace und zeigt nach einem Fehlschlag den gespeicherten Wert; ein Einrichtungsskript wird getrimmt beim Verlassen gespeichert, ein leeres entfernt.
- Ein exportiertes Bündel enthält weder Zugangsdatenreferenzen noch lokale Pfade, Einrichtungsskripte oder Auslieferungsziele.

## Verwandte Dokumentation

- [Workspaces (Produkthandbuch)](../../project/workspaces/README.md)
- [Connected services](connected-services.md)
- [Repositories und Auslieferungsziele](repositories-and-destinations.md)
- [Einstellungen im Hauptfenster](../window-and-navigation/settings.md)
- [Workspace-Modell](../workspace-model.md)
- [Managed Local CI](../managed-local-ci.md)
