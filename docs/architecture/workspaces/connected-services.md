# Connected services

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der Workspace-Bereich `services` bündelt Beiträge mehrerer Features in einer Karte: Boards und Azure-DevOps-Konten (Work), KI-Konten (AI), Feedback aus Microsoft Teams (Feedback). Der Rahmen gehört dem Workspace-Feature und kennt keinen Anbieter. Das funktionale Verhalten steht unter [Connected services](../../project/workspaces/connected-services.md).

Garantien:

- Jede Zeile und jedes Sheet arbeitet nur mit Datensätzen des gewählten Workspace; ein Konto wird nur gefunden, wenn `id` und `workspaceId` übereinstimmen.
- Ein KI-Konto, dessen Anmeldung nicht abgeschlossen wurde, bleibt nicht in den Einstellungen.
- Ein KI-Konto wird nicht entfernt, solange danach ein Agent keinen Routenkandidaten mehr hätte.
- Ein fehlgeschlagenes Lesen der Anbieterspalten verwirft keine gespeicherte Spaltenzuordnung.
- Tokens, API-Schlüssel und Client-Secrets werden nie in den Einstellungen gespeichert.

## Komposition

Der Rahmen rendert vier Mosaik-View-Slots mit der Auswahl `{ workspaceId, sectionId: 'services', connectionId?, connectionKind? }`:

| Slot                                                | Beiträge (Reihenfolge)                                                         | Gruppe im Rahmen                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `settings.workspace.services.boards`                | Work: Boards                                                                   | eigene Gruppe **Boards** des Beitrags                                                |
| `settings.workspace.services.account`               | AI für `codex`, `claude`, `opencode`; Work für `github`, `azure-devops`        | Gruppe **Connected services**, einmal je Konto                                       |
| `settings.workspace.services.feedback`              | Feedback: Teams-Intakes                                                        | eigene Gruppe **Feedback intake** des Beitrags                                       |
| `settings.workspace.services.available-connections` | AI (`order` 10): Codex, Claude Code, OpenCode; Work (`order` 20): Azure DevOps | ungerahmte Gruppe **Add a service**; die Slot-Ausgabe ist die gemeinsame Zeilenliste |

Der Rahmen zeigt die Gruppen **Boards**, **Connected services** und **Add a service** nur, wenn die Slot-Registry Beiträge kennt; **Connected services** zusätzlich nur bei mindestens einem Konto. Die Kontenliste sind die `connections` des Workspace in gespeicherter Reihenfolge ohne die Konten, die ein Repository als `sourceControlConnectionId` verwendet. Solche GitHub-Konten pflegt der Repository-Editor.

## KI-Konten

### Zeilen

Beschreibung eines Kontos: `<Laufzeit> · <Anmeldung>` mit den Laufzeitbezeichnungen `Codex`, `Claude Code`, `OpenCode`. Für Codex und Claude lautet die Anmeldung `CLI not installed` (CLI fehlt), `Sign-in not checked yet` (kein Kontostatus), `Signed in` oder `Not signed in`. OpenCode zeigt nur die Laufzeit und gegebenenfalls ` · <Gatewayname>`. Verfügbare Laufzeiten zeigen ihren Bedarf und ` · Checking CLI…` ohne Gesundheitsdaten beziehungsweise ` · CLI not installed`.

### Sheet `ai-account`

| Phase                  | Regel                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anbieterwahl           | nur für neue Konten; ein Anbieter ohne verfügbare CLI ist gesperrt. Fehlende CLIs bieten die Homebrew-Installation (nur mit verfügbarem Homebrew und nativer Installationsfähigkeit), nach Bestätigung `install-agent-runtime-<runtime>`; danach werden die Verbindungen neu gelesen und der Anbieter gewählt.                                                                    |
| Validierung            | `account-name` bei leerem Namen; ein Laufzeitfehler, wenn die CLI des gewählten Anbieters fehlt. Ohne offene Punkte darf gespeichert werden.                                                                                                                                                                                                                                      |
| Direktes Speichern     | nur für ein vorhandenes Konto oder OpenCode (**Save**).                                                                                                                                                                                                                                                                                                                           |
| Verbinden              | Codex mit API-Schlüssel braucht einen Schlüssel; Claude braucht die CLI; OpenCode verbindet nicht. Verbinden speichert zuerst das Konto (`saveAiAccountConnection`, inklusive Angleichen des Lieferumfangs), markiert ein neues Codex- oder Claude-Konto als vorläufig und startet die Anmeldung: Codex `mode: 'api-key'` oder `mode: 'chatgpt'`, Claude mit anschließendem Code. |
| Browseranmeldung Codex | Abfrage der Verbindungen alle 3 s, höchstens 10 min oder bis die Anmeldung bestätigt ist; der Abfragetakt endet mit dem Sheet.                                                                                                                                                                                                                                                    |
| Vorläufiges Konto      | Scheitert der Start der Anmeldung oder schließt das Sheet, bevor die Anmeldung bestätigt ist, entfernt das Sheet das Konto ohne Erfolgsmeldung. Ein laufender Verbindungsvorgang wird vorher abgewartet. Ein API-Schlüsselkonto gilt nach erfolgreichem Start als verbunden; der Schlüssel wird aus dem Entwurf gelöscht.                                                         |
| OpenCode-Import        | Rückfrage `import-opencode-credentials-<id\|new>`, dann speichern und die Anbieter-Anmeldungen dieses Mac in das isolierte Konto kopieren.                                                                                                                                                                                                                                        |
| Experteneinstellungen  | `credentialRef` (Name einer Umgebungsvariablen) und für OpenCode `gateway { id, displayName, url }`.                                                                                                                                                                                                                                                                              |

### Entfernen

`aiAccountRemovalBlockers(settings, accountId)` liefert die Namen aller Agentenprofile, deren Routenrichtlinie nach Entfernen dieses Kontos keinen Kandidaten mehr hätte (die Richtlinie enthielt das Konto, und alle Kandidaten verweisen darauf). Mit Blockern erscheint `remove-ai-account-blocked-<id>` und nichts geschieht. Sonst fragt `remove-ai-account-<id>`; bei Bestätigung meldet Symphony ein angemeldetes Codex- oder Claude-Konto ab und speichert `withoutAiAccount`: Das Konto verschwindet aus `connections`, seine Kandidaten aus allen Routenrichtlinien, und die verbleibenden Kandidaten erhalten fortlaufende Prioritäten ab 0.

## Boards (Work-Item-Quellen)

Die Gruppe **Boards** listet `workItemSources` des Workspace außer `provider: 'simulated'`.

| Anbieter          | Zusammenfassung                                                          | Editor            |
| ----------------- | ------------------------------------------------------------------------ | ----------------- |
| `github-projects` | `GitHub Project · <org\|user> <owner> · #<number> · <Enabled\|Disabled>` | `github-projects` |
| `azure-devops`    | `Azure DevOps · <project> · <Enabled\|Disabled>`                         | `azure-devops`    |

Konto-Zeilen des Work-Features: Azure DevOps (`Azure DevOps · <organization>`) öffnet den Editor der zugehörigen Quelle; GitHub (`GitHub · <host> · @<login>`) öffnet den Repository-Editor des Repositories mit diesem Konto, sonst ein leeres Repository-Sheet. **Edit** an GitHub-Konten ist gesperrt, wenn kein Repository-Editor registriert ist.

### Sheet `github-projects`

1. Konten: GitHub-Verbindungen des Workspace. Ohne Konto zeigt das Sheet nur den Hinweis, zuerst ein Repository hinzuzufügen.
2. `listGitHubProjects { workspaceId, connectionId }` liefert Kandidaten und gegebenenfalls einen Fehlertext; ein Kontowechsel leert und lädt neu. Die Suche filtert ohne Groß-/Kleinschreibung über Titel, Besitzer, `#Nummer` und URL.
3. Die Wahl eines Kandidaten setzt `ownerType`, `owner`, `projectNumber`, übernimmt den Titel als Namen, solange der Name nicht von Hand geändert wurde, leert die Zuordnungen und liest die Spalten.
4. Manuelle Eingabe: `ownerType` `user` oder `organization`, `owner`, `projectNumber` (nur positive ganze Zahlen, sonst 0).
5. Speichern verlangt nicht leeren Namen, Konto, Besitzer und `projectNumber > 0`. Datensatz: `{ id: vorhanden | board-<uuid>, workspaceId, connectionId, provider: 'github-projects', displayName, ownerType, owner, projectNumber, columnMappings?, enabled }`; danach Angleichen des Lieferumfangs, Speichern, Schließen und Aktualisieren der Projektion.
6. **Remove board** (nur bei vorhandener Quelle) fragt zuerst `remove-board-<id>` (`Remove <Name>?`, `danger`, destruktiv, **Remove board** / **Keep board**). Erst nach Bestätigung entfernt es die Quelle, leert `activeViewScope.workItemSourceId`, wenn sie gewählt war, gleicht den Lieferumfang an, speichert, schließt und aktualisiert.

### Sheet `azure-devops`

- Entwurf: `displayName`, `organization`, `project`, `team`, `queryId`, `wiql`, `boardId`, `enabled`, Spaltenzuordnungen; `tenantId` und `credentialRef` werden aus der vorhandenen Verbindung übernommen, aber nicht angezeigt.
- Speichern verlangt nicht leeren Namen, Organisation und Projekt sowie `queryId` oder `wiql`. Fehlt etwas, ist **Save** gesperrt und `With missing details` nennt die fehlenden Angaben (`display-name`, `organization`, `project`, `query`; siehe [Pflichtangaben in Sheets](README.md#pflichtangaben-in-sheets)). Es schreibt die Verbindung `{ id: vorhanden | ado-<uuid>, kind: 'azure-devops', displayName, organization, tenantId?, credentialRef? }` und die Quelle `{ id: vorhanden | work-source-<uuid>, provider: 'azure-devops', project, team?, queryId | wiql, boardId?, columnMappings?, enabled }`; `queryId` hat Vorrang vor `wiql`.
- **Save and connect** verlangt zusätzlich ein Token, speichert ohne zu schließen und übergibt das Token an die Verbindungsprüfung, die es im Schlüsselbund ablegt. Bei Erfolg wird das Tokenfeld geleert und der Entwurf neu gebildet. **Disconnect** entfernt die hinterlegte Anmeldung. Anmeldestatus: `Not connected`, `Connected · environment credential`, `Connected · temporary Microsoft Entra token`, sonst `Connected · PAT in secure storage`.
- Spalten lassen sich nur für eine gespeicherte Quelle lesen.
- **Remove source** erscheint nur für eine gespeicherte Azure-DevOps-Quelle und fragt zuerst `remove-azure-devops-source-<id>` (`Remove <Name>?`, `danger`, destruktiv, **Remove source** / **Keep source**). Nach Bestätigung (gesperrt, solange das Sheet arbeitet):
  1. Hat die Verbindung ein `credentialRef` und nutzt keine andere Quelle sie, ruft das Sheet zuerst `azure-devops.logout { connectionId }` auf, das das Token aus dem Schlüsselbund löscht. Scheitert das, endet die Entfernung ohne Änderung.
  2. Aus dem danach aktuellen Aggregat entfernt es die Quelle, leert `activeViewScope.workItemSourceId`, wenn sie gewählt war, und entfernt die Verbindung, sofern keine andere Quelle sie nutzt.
  3. Angleichen des Lieferumfangs, Speichern, Schließen und Aktualisieren der Projektion.

### Spaltenzuordnung

`listWorkItemSourceColumns { source }` erhält einen Entwurf der Quelle und liefert Spalten (`id`, `label`, optional `suggestedStageId`) oder einen Fehler. Jede Leseanfrage trägt eine fortlaufende Nummer; nur die Antwort der neuesten Anfrage verändert den Entwurf. Bei Erfolg erhält jede Spalte die bisherige Zuordnung, sonst den Vorschlag, sonst `''` (nicht zugeordnet). Bei Fehler bleiben die Zuordnungen im Entwurf und werden unverändert gespeichert. Zuordnungsziele sind die Stufen des Arbeitsablaufs; gespeichert werden nur zugeordnete Spalten als `{ columnId, stageId }`. Eine Warnung nennt jede Stufe mit `kind: 'automated'` ohne Spalte.

## Feedback aus Microsoft Teams

| Regel          | Vertrag                                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zielkandidaten | eingeschaltete `github-projects`-Quellen und eingeschaltete `github`-Repositories des Workspace; ein neuer Entwurf wählt jeweils den ersten                                                                                                                                   |
| Entwurf        | `displayName` (Standard `FLAMOX365 feedback`), `tenantId`, `clientId`, `credentialRef`, `teamId`, `channelId`, beide Ziele, `enabled` (Standard `false`)                                                                                                                      |
| Prüfen         | `feedback-intake.test { source }` erst mit allen Pflichtangaben; Erfolg meldet die Antwort, Fehler `Unable to read the configured Microsoft Teams channel.`                                                                                                                   |
| Speichern      | **Save** gesperrt, bis alle Pflichtangaben vorliegen (`validationIssues`, angezeigt in `With missing details`); bei `enabled` zuerst Prüfen, ein Fehlschlag verhindert das Speichern; Datensatz `{ id: vorhanden \| feedback-intake-<uuid>, provider: 'microsoft-teams', … }` |
| Entfernen      | **Remove intake** fragt zuerst `remove-feedback-intake-<id>` (`Remove <Name>?`, `danger`, destruktiv, **Remove intake** / **Keep intake**) und entfernt den Datensatz erst nach Bestätigung                                                                                   |
| Schema         | Ziele müssen im selben Workspace existieren und eingeschaltet sein; ein eingeschaltetes Intake braucht `credentialRef` und eine aktive Lieferung des Workspace, deren Team die Rolle `work-item-creation` mit Skill besetzt                                                   |

Weil das Schema die Ziele prüft, scheitert jede Änderung, die ein Ziel eines Intakes entfernt oder ausschaltet, am Einstellungsschreiber.

## Angleichen des Lieferumfangs

Repository-, Board- und KI-Konto-Editoren rufen vor dem Speichern `synchronizeDeliveryContext(settings, workspaceId)` auf. Ist das Team-Feature vorhanden und hat der Workspace ein eingeschaltetes Agentenprofil, setzt die Funktion die eingeschaltete Lieferung des Workspace auf alle eingeschalteten Quellen, Repositories und CI-Anbindungen des Workspace, verwendet das erste eingeschaltete Repository als Standard und erhält oder erzeugt das Team (`Default delivery team`) mit zulässigen Zuordnungen. Ohne Team-Feature oder Agentenprofil bleibt das Aggregat unverändert.

## Fehler und Wiederherstellung

| Fehlerfall                                    | Erkennung                       | Öffentlicher Fehler                                      | Nebenwirkungen                   | Wiederherstellung       |
| --------------------------------------------- | ------------------------------- | -------------------------------------------------------- | -------------------------------- | ----------------------- |
| Anmeldung startet nicht                       | Rückgabe der Verbindungsanfrage | Fehlermeldung der AI-Schicht                             | vorläufiges Konto wird entfernt  | erneut verbinden        |
| Sheet vor Abschluss der Anmeldung geschlossen | Schließen-Ereignis              | keiner                                                   | vorläufiges Konto wird entfernt  | erneut verbinden        |
| Konto blockiert                               | `aiAccountRemovalBlockers`      | Hinweis `This account is still in use`                   | keine                            | Agenten umstellen       |
| Projektliste nicht lesbar                     | Fehlertext der Anfrage          | `Projects could not be loaded`                           | keine                            | **Reload** oder manuell |
| Spalten nicht lesbar                          | Fehlertext der Anfrage          | `Columns could not be read`                              | gespeicherte Zuordnungen bleiben | **Reload columns**      |
| Teams-Prüfung scheitert                       | Testanfrage                     | `Unable to read the configured Microsoft Teams channel.` | nichts gespeichert               | Angaben korrigieren     |
| Ziel eines Intakes entfernt                   | Schema                          | `Unable to save settings.`                               | keine                            | Intake zuerst ändern    |
| Token beim Entfernen nicht löschbar           | `azure-devops.logout` scheitert | Meldung der Abmeldung                                    | Quelle und Konto bleiben         | erneut entfernen        |

## Implementierungsabbildung in Symphony

| Verantwortung                | Aktueller Pfad oder Symbol                                                                                                                                                   | Beleg                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rahmen                       | `libs/frontend/features/workspace/src/lib/settings/{WorkspaceServicesCardView,WorkspaceServicesViewPresenter}.ts`, `libs/frontend/setting/src/constants/SettingsViewSlot.ts` | `WorkspaceServicesViewPresenter.spec.ts`                                                                                                                                                            |
| KI-Konten                    | `libs/frontend/features/ai/src/lib/provider/{provideAiServiceViews,withAiSettings}.ts`, `…/ai/src/lib/settings/*`, `…/settings/ai-account-removal/*`                         | `AiAccountSettingsEditorViewPresenter.spec.ts`, `aiAccountRemovalBlockers.spec.ts`, `withoutAiAccount.spec.ts`, `apps/renderer-e2e/src/opencode-settings.spec.ts`, `workspace-ai-isolation.spec.ts` |
| Boards und Azure DevOps      | `libs/frontend/features/work/src/lib/provider/{provideWorkServiceViews,withWorkSettings}.ts`, `…/work/src/lib/settings/*`                                                    | `WorkSourceSettingsEditorViewPresenter.spec.ts`                                                                                                                                                     |
| Teams-Feedback               | `libs/frontend/features/feedback/src/lib/provider/provideFeedbackFeature.ts`, `…/feedback/src/lib/settings/*`                                                                | `FeedbackSettingsEditorViewPresenter.spec.ts`                                                                                                                                                       |
| Schema der Intakes           | `libs/configuration/composition/src/lib/application-settings/ApplicationSettingsSchema.ts`                                                                                   | `ApplicationSettingsSchema.spec.ts`                                                                                                                                                                 |
| Angleichen des Lieferumfangs | `libs/frontend/features/team/src/lib/configuration/synchronizeWorkspaceTeamConfiguration.ts`, `libs/frontend/features/workspace/src/lib/adapters/WorkspaceContext.ts`        | keine eigene Spec                                                                                                                                                                                   |

## Verifikation und Akzeptanzkriterien

- Die Kontenliste enthält kein GitHub-Konto, das ein Repository verwendet, und behält die gespeicherte Reihenfolge.
- Ohne registrierte Work-Beiträge fehlen die Gruppe **Boards** und die Azure-DevOps-Zeile, ohne dass der Rahmen Anbieterwissen braucht.
- Ein neues Codex- oder Claude-Konto, dessen Anmeldung fehlschlägt oder dessen Sheet vorher geschlossen wird, ist danach nicht in den Einstellungen; ein API-Schlüsselkonto bleibt und sein Schlüssel ist aus dem Entwurf gelöscht.
- Entfernen eines KI-Kontos, das der einzige Kandidat eines Agenten ist, schreibt nichts.
- Eine verspätete Spaltenantwort für ein vorher gewähltes Project ändert den Entwurf nicht; ein Lesefehler speichert die alten Zuordnungen unverändert.
- Ein eingeschaltetes Teams-Intake wird nur nach erfolgreicher Prüfung gespeichert.
- **Remove board**, **Remove source** und **Remove intake** schreiben nur nach bestätigter Rückfrage; eine abgelehnte Rückfrage ändert nichts.
- Das Entfernen einer Azure-DevOps-Quelle, deren Konto ein Token hat und von keiner anderen Quelle genutzt wird, ruft zuerst `azure-devops.logout` auf und entfernt danach Quelle und Konto; teilt eine andere Quelle das Konto, bleiben Konto und Token.
- Azure-DevOps- und Teams-Sheets sperren **Save**, solange Pflichtangaben fehlen, und nennen sie.

## Verwandte Dokumentation

- [Workspaces in den Einstellungen](README.md)
- [Connected services (Produkthandbuch)](../../project/workspaces/connected-services.md)
- [Teams-Feedback-Intake](../teams-feedback-intake.md)
- [AI-Team](../ai-team/README.md)
- [Provider-Modell](../provider-model.md)
