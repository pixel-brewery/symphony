# AI-Team-Einstellungen

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der Workspace-Bereich **AI team** des Einstellungsfensters projiziert die Agentenorganisation eines Workspace – Positionen, Agentenprofile, Ausführungswege (Route Policies), Lieferteam und Provider-Manifeste – in einen Lieferablauf je Schritt, Agentenkarten und eine nur lesbare technische Übersicht. Er besitzt das Sheet zum Anlegen und Bearbeiten eines Agenten und das Entfernen eines Agenten. Das funktionale Verhalten steht unter [AI-Team](../../project/ai-team/README.md).

Garantien:

- Jede Änderung wird als **ein** vollständiger Settings-Schnappschuss über den einzigen Settings-Schreiber gespeichert. Position, Agentenprofil, Ausführungsweg, Provider-Manifeste, Lieferteam und Lieferkontext ändern sich gemeinsam oder gar nicht; die serverseitige Schemavalidierung bleibt die letzte Instanz.
- Kein Agent wird gespeichert ohne Name, Berufsbezeichnung, mindestens eine Verantwortung, ein AI-Konto desselben Workspace und eine installierte Kommandozeile dieses Kontos; bei OpenCode zusätzlich ohne Modell.
- Eine Verantwortung wird nur einem Agenten zugewiesen, dessen Position sie erlaubt. Primär- und Backup-Agenten einer Verantwortung sind eindeutig und gehören zum Workspace des Teams.
- Entfernen hinterlässt keinen Workspace ohne Agenten und keine eingeschaltete Teams-Feedback-Aufnahme ohne Zuständigkeit **work-item-creation** mit zugeordnetem Skill-Paket.
- Lieferablauf, Skills und Automation verwenden dieselbe Schrittdefinition; Name, Beschreibung und Symbol eines Schritts können zwischen den Bereichen nicht abweichen.
- Der Bereich zeigt keine Zugangsdaten. Er liest Nutzungsfenster und Modellbewertungen nur zur Anzeige.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Abschnittsbeitrag `team`, Suchbeiträge, Routen-Initialisierer für `agent`, Lieferablauf, Agentenkarten mit Verfügbarkeit und Intelligenzwert, Agenten-Sheet mit Vorschau, Entfernen mit Sperrregeln, technische Übersicht.
- Nicht enthalten: Verbinden und Anmelden von AI-Konten (Bereich **Connected services**, siehe [Workspaces](../workspaces/README.md)), die Einrichtung **Build your project team** ([Einstellungsfenster](../window-and-navigation/settings-window.md)), Sheet-, Rückfrage- und Suchmechanik des Fensters ([Einstellungsfenster](../window-and-navigation/settings-window.md)), Prozessrollen und Skill-Pakete ([Skills](../skills/README.md)), Richtlinien der Selbstständigkeit ([Automation](../automation/README.md)), Kontoauswahl und Failover zur Laufzeit ([Provider-Modell](../provider-model.md)).

## Verantwortungsgrenzen

| Verantwortung                         | Kanonischer Eigentümer                                    | Öffentlicher Vertrag                                                                                                   | Verbraucher                           |
| ------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Schrittdefinition des Lieferablaufs   | UI-Bibliothek (`deliveryFlowSteps`, `deliveryFlowStepOf`) | fünf Schritte mit `id`, `label`, `description`, `icon`, `skillFlowRoles`, `processRoles`                               | AI team, Skills, Automation, Sheet    |
| Verantwortungsreihenfolge             | Skills-Domäne (`skillFlowRoles`)                          | geordnete Liste der sechs Skill-Flow-Rollen                                                                            | Projektionen, Sheet, Synchronisierung |
| Bereich, Projektionen, Befehle        | `TeamSettingsViewPresenter` im Team-Feature               | Signale `deliveryFlow`, `workspaceOrganization`, `agentAvailability`, `agentIntelligence`, `teamIntelligence`; Befehle | `TeamSettingsCardView`                |
| Organisation, Lieferablauf, Entfernen | reine Funktionen des Team-Features                        | `projectWorkspaceOrganization`, `projectDeliveryFlow`, `agentRemovalBlockers`, `withoutAgent`                          | Presenter                             |
| Agenten-Sheet                         | `TeamSettingsEditorViewPresenter`                         | Editor-Anfrage `{ kind: 'ai', workspaceId, agentProfileId?, connectionId? }`                                           | `SettingsEditorService`               |
| Team- und Lieferkontext-Abgleich      | `synchronizeWorkspaceTeamConfiguration`                   | reine Funktion über den Settings-Schnappschuss                                                                         | Sheet, Einrichtung                    |
| Settings-Lesen und -Schreiben         | `ConfigurationStore` über `TEAM_SETTINGS_CONTEXT`         | `settings()`, `saveSettings(next)` mit `Settings saved.` / `Unable to save settings.`                                  | Presenter, Sheet                      |
| AI-Operationen (optional)             | AI-Feature über `AI_OPERATIONS`                           | Codex-Konfiguration, verfügbare Modelle, Nutzungsfenster, Modellbewertung                                              | Presenter, Sheet                      |
| Modellbewertung                       | Orchestrator, Provider Artificial Analysis                | Anfrage `ai.intelligence.get { targets }`                                                                              | AI-Feature                            |
| Auswahl eines Agenten zur Laufzeit    | Konfigurationskomposition (`agentExecutionTargetsFor`)    | geordnete Ausführungsziele je Rolle                                                                                    | Ausführungsbindung, Analyzer          |

Das Team-Feature hängt nur von den Ports ab. Fehlt das AI-Feature in der Produktkomposition, liefert der Kontext neutrale Werte (`aiAvailable: false`, leere Modelle, keine Nutzung); der Bereich bleibt lesbar, Anlegen und Bearbeiten sind gesperrt.

## Persistierter Vertrag

Der Bereich liest und schreibt Teile des Anwendungs-Settings-Schnappschusses. Alle Objekte tragen `workspaceId`; Verweise dürfen keine Workspace-Grenze überschreiten.

| Objekt               | Für diesen Bereich relevante Felder                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `connections`        | AI-Konten mit `kind` `codex`, `claude` oder `opencode`, `displayName`, optional `credentialRef`, bei OpenCode optional `gateway { providerId, displayName }`                                                                                                                                                        |
| `positions`          | `displayName`, `description`, `authority` (`read-only` \| `worktree-write`), `allowedRoles` und `responsibilities` (Skill-Flow-Rollen), `requiredCapabilities`, `allowedPathPatterns`, `forbiddenPathPatterns`, `maximumChangedFiles`, `maximumDiffLines`, `maximumIterations`                                      |
| `agentProfiles`      | `displayName`, `positionId`, `routePolicyId`, `qualificationTags`, `appearance { figure: 'dot', color, accessories }`, `enabled`                                                                                                                                                                                    |
| `agentRoutePolicies` | `displayName`, `strategy`, `costPolicy` (`any` \| `free-only` \| `local-only`), `sessionAffinity`, `maxParallelExecutions`, `candidates[]` mit `aiConnectionId`, `model`, `reasoningEffort`, `costClass`, `providerId`, `capabilities`, `qualityScore`, `contextWindow`, `freeTierEvidence?`, `priority`, `enabled` |
| `providerManifests`  | je Workspace und `providerId`: `runtime`, `protocol`, `capabilities`, `modelDiscovery` (`runtime` \| `configured`), `officialApi`                                                                                                                                                                                   |
| `agentTeams`         | `assignments[]` mit `role`, `primaryAgentId`, `fallbackAgentIds`, `skillId`                                                                                                                                                                                                                                         |
| `deliveryContexts`   | `workItemSourceIds`, `repositoryBindingIds`, `ciBindingIds`, `agentTeamId`, `defaultRepositoryBindingId?`, `enabled`                                                                                                                                                                                                |

Serverseitige Invarianten, auf die sich der Bereich verlässt: eindeutige Rollen je Team; Primär- und Backup-Agenten einer Zuständigkeit eindeutig, bekannt, im selben Workspace und von ihrer Position für die Rolle zugelassen; Kandidaten nur auf AI-Konten desselben Workspace, `providerId` passend zum Konto und zu einem Manifest, Fähigkeiten innerhalb des Manifests; `free-tier` nur mit freigegebenem Nachweis; `free-only` nur mit `free-tier`- oder `local`-Kandidaten, `local-only` nur mit `local`; eine eingeschaltete Teams-Feedback-Aufnahme verlangt im Lieferkontext ihres Workspace eine Zuständigkeit `work-item-creation` mit `skillId`.

## Schritte des Lieferablaufs

| `id`              | `label`                | `description`                                     | `skillFlowRoles`            | `processRoles`              |
| ----------------- | ---------------------- | ------------------------------------------------- | --------------------------- | --------------------------- |
| `create`          | `Create`               | `A request becomes a work item`                   | `work-item-creation`        | `create`                    |
| `plan`            | `Plan`                 | `Qualified · technical analysis`                  | `analysis`                  | `analyze`                   |
| `implement`       | `Implement and verify` | `Ready → Progress · branch, pull request, checks` | `solution`                  | `solve`, `verify`           |
| `fix-checks`      | `Fix failed checks`    | `A check fails on a Symphony pull request`        | `ci-diagnosis`, `ci-repair` | `ci-diagnosis`, `ci-repair` |
| `address-reviews` | `Address reviews`      | `A reviewer comments on the pull request`         | `pull-request-review`       | `pull-request-review`       |

`deliveryFlowStepOf(role)` liefert den Schritt zu einer Skill-Flow-Rolle oder Prozessrolle, sonst `undefined`. Die Reihenfolge der Skill-Flow-Rollen ist `work-item-creation`, `analysis`, `solution`, `ci-diagnosis`, `ci-repair`, `pull-request-review`; ihre Beschriftungen sind `Create tickets`, `Plan work`, `Implement changes`, `Investigate failed checks`, `Repair failed checks`, `Review changes`. Die Abnahme (`Acceptance`, `Independently verified · waits for you`, Chip `You`) ist kein Schritt der Definition, sondern ein fester Abschluss der Darstellung.

## Projektionen

### Organisation eines Workspace

`projectWorkspaceOrganization(settings, workspaceId)` filtert alle Objekte auf den Workspace und liefert:

- **Agenten** sortiert nach dem kleinsten Rang ihrer Zuständigkeiten in der Rollenreihenfolge: als Primär-Agent vor als Backup, ohne Zuständigkeit am Ende in gespeicherter Reihenfolge.
- je Agent: Position (fehlt sie, `Position unavailable`), Verantwortungen = `allowedRoles` der Position in Rollenreihenfolge, Konto = `aiConnectionId` des aktivierten Kandidaten mit kleinster `priority`, dessen Modell und Aufwand, Ersatzkonten = alle übrigen aktivierten Kandidaten auf AI-Konten in Prioritätsreihenfolge.
- **Positionen**, **Teams** mit Anzeigenamen (unbekannter Agent `Unavailable`), **Provider** aus den Manifesten, **Routen** mit Kandidaten in Prioritätsreihenfolge (unbekanntes Konto `Unavailable account`, fehlende Qualität 50).

### Lieferablauf

`projectDeliveryFlow(organization)` bildet je Schritt die Agentenliste: für jede Skill-Flow-Rolle des Schritts in Definitionsreihenfolge die erste Zuständigkeit dieser Rolle über alle Teams, daraus Primär-Agent und Backups; die Liste wird dedupliziert und auf bekannte Agenten reduziert. Eine leere Liste wird als Chip `Nobody assigned` dargestellt, mehrere Agenten mit `then` dazwischen.

### Verfügbarkeit

Ein Konto ist erschöpft, wenn es mindestens ein Nutzungsfenster meldet und alle Fenster `remainingPercent <= 0` haben.

| Bedingung (in dieser Reihenfolge)                             | Zustand         | Beschriftung                                     | Punkt   |
| ------------------------------------------------------------- | --------------- | ------------------------------------------------ | ------- |
| Profil `enabled` ist falsch                                   | `unavailable`   | `Unavailable`                                    | neutral |
| bevorzugtes Konto nicht erschöpft (oder kein Konto)           | `available`     | `Available`                                      | success |
| bevorzugtes Konto erschöpft, mindestens ein Ersatzkonto nicht | `backup-in-use` | `Backup in use · preferred account out of quota` | warning |
| alle Konten erschöpft                                         | `out-of-quota`  | `Out of quota`                                   | danger  |

Weil sonst niemand die Nutzungsfenster lädt, fordert der Presenter beim Anzeigen für jedes Codex-, Claude- und OpenCode-Konto ohne geladene und ohne laufende Abfrage die Nutzung einmal an.

### Intelligenzwert

- Ziele sind alle eindeutigen Paare aus `model` und `reasoningEffort` (fehlend `null`) aktivierter Kandidaten mit Modell, stabil sortiert. Der Presenter fragt nur bei geänderter Zielmenge erneut an, damit das Tageskontingent der Bewertungsquelle geschont wird.
- Der Wert eines Agenten ist der Index für genau sein Modell und seinen Aufwand, gerundet; sonst keiner. Die Summe addiert die Werte aktivierter Agenten mit Wert; ohne einen Wert gibt es keine Summe.
- Der Orchestrator liest den Katalog der Bewertungsquelle seitenweise (höchstens zehn Seiten) und hält ihn zwölf Stunden. Ohne konfigurierten Zugang (`SYMPHONY_ARTIFICIAL_ANALYSIS_API_KEY`), bei erschöpftem Anfragelimit (HTTP 429) oder anderem Fehler liefert er unbewertete Ziele mit `error`; der Bereich zeigt diesen Text einmal unter den Karten.

## Agenten-Sheet

### Anfrage und Öffnen

- Anfrage `{ kind: 'ai', workspaceId: string (nicht leer), agentProfileId?: string, connectionId?: string }`, geprüft vor dem Laden der Komponente. Registriert als Settings-Editor mit 920 px Breite.
- **Add an AI agent** sendet nur `workspaceId`, der Stift einer Karte zusätzlich `agentProfileId`. Beide sind gesperrt, solange das AI-Feature fehlt.
- Der Routen-Initialisierer `team-settings-route` (`withSettingsEditorRoute` mit `section: 'team'`, `parameter: 'agent'`, `matchesWithoutSection: true`, Auflöser `resolveAgentEditorRoute`) liest `workspace` und `agent` aus den Parametern der Route `/settings`, mit `section=team` oder ohne Bereich (dann öffnet das Fenster den Workspace auf `team`). Gehört das Profil zu diesem Workspace und ist das AI-Feature vorhanden, öffnet er nach dem Laden der Konfiguration das Sheet einmal je Paar `<workspace>:<agent>` und entfernt `agent` danach mit `replaceUrl` aus der Adresse; dieselbe Anforderung, etwa derselbe Suchtreffer, öffnet das Sheet dadurch erneut. Unbekannte oder fremde Paare bleiben wirkungslos.
- Suche: Neben den statischen Einträgen trägt die Karte über `searchEntries` (`agentSearchEntries`) je Agent einen Eintrag bei (Anzeigename, Stellenbezeichnung als Beschreibung, Gruppe `Agents`, Wert `Disabled` bei deaktiviertem Agenten, `workspaceId`, `parameters: { agent }`).

### Entwurf

Der Entwurf wird beim Öffnen aus dem Schnappschuss gebildet: Profil aus `agentProfileId`, sonst über `connectionId` gefundener Weg; Konto = Kandidat mit kleinster Priorität, sonst bei genau einem AI-Konto im Workspace dieses Konto. Neue Agenten erhalten eine neue Profil-Id und eine daraus abgeleitete Standardfigur, Strategie `balanced`, Sitzungsbindung an, Parallelität 1, Qualität 50, erlaubte Pfade `**`, verbotene Pfade `.git/**`, `.env`, `.env.*`, `**/credentials/**`, höchstens 100 Dateien, 20 000 Diff-Zeilen und 8 Iterationen. Verantwortungen sind die `allowedRoles` der bisherigen Position. Jede Feldänderung erhöht eine Entwurfsrevision, von der Validierung und Vorschau abhängen.

### Modell und Aufwand

| Kontoart    | Modelle                                                                                                                                      | Aufwand                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Codex       | aus der Codex-Konfiguration des angemeldeten Kontos; bis dahin Hinweis mit **Check again**                                                   | aus derselben Konfiguration          |
| Claude Code | fest: `fable`, `opus`, `sonnet`, `haiku`                                                                                                     | fest: `low`, `medium`, `high`, `max` |
| OpenCode    | von der Kommandozeile gemeldet; Anbieterwahl ab zwei Anbietern, Suchfeld ab mehr als 12 Modellen; bei nur einem Anbieter ohne Anbieterpräfix | fest: `low`, `medium`, `high`, `max` |

Ein Kontowechsel übernimmt Modell und Aufwand eines bereits konfigurierten Kandidaten dieses Kontos, entfernt das Konto aus den Ersatzkonten und lädt die Konfiguration des neuen Kontos. Ersatzkonten haben eigene Modell- und Aufwandswahl; Aufwand dort immer fest.

### Validierung und Vorschau

| Fehler           | Bedingung                                                            | Text                                                       |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `agent-name`     | Name nach Trimmen leer                                               | `Agent name`                                               |
| `position`       | Berufsbezeichnung leer                                               | `Job title`                                                |
| `responsibility` | keine Verantwortung                                                  | `At least one responsibility`                              |
| `account`        | kein Konto                                                           | `A connected AI account`                                   |
| `runtime-<kind>` | Konto gewählt, Kommandozeile laut Laufzeitgesundheit nicht verfügbar | `<Codex \| Claude Code \| OpenCode> CLI must be installed` |
| `model`          | OpenCode ohne Modell                                                 | `AI model`                                                 |

`Save` ist gesperrt bei mindestens einem Fehler, fehlendem AI-Feature, laufendem Speichern oder solange die gemeinsame Editor-Sperre (`editorBusy`: laufendes Settings-Speichern, laufende Skill-Operation oder laufender Test der Feedback-Aufnahme) gesetzt ist. Die Vorschau zeigt die Schritte, deren Skill-Flow-Rollen sich mit den gewählten Verantwortungen überschneiden, das erste Ersatzkonto mit Aufwand und eine Warnung `cli-missing` (sperrt das Speichern) oder `not-signed-in` (nur Codex und Claude, sperrt nicht). **Install with Homebrew** ist nur bei nativer Installationsfähigkeit, verfügbarem Homebrew und ohne laufende Installation aktiv, fragt mit einer Rückfrage nach, installiert, lädt danach die Kontoverbindungen und bei passender Kontoart die Konfiguration neu.

### Speichern

1. Abbruch ohne Wirkung, wenn Fehler bestehen oder das Konto nicht zu diesem Workspace gehört.
2. Position: bestehende aktualisieren, sonst neu mit `authority: 'worktree-write'`. `responsibilities` und `allowedRoles` werden auf die gewählten Verantwortungen gesetzt, `requiredCapabilities` auf `coding`, `reasoning`, `tool-calling`; Pfadlisten werden an Komma oder Zeilenumbruch getrennt, getrimmt und dedupliziert; Grenzen werden ganzzahlig und nicht negativ (Iterationen mindestens 1).
3. Ausführungsweg: bestehender oder neuer mit `displayName` `<Name> route`, gewählter Strategie, Kandidat 0 auf dem gewählten Konto (bestehende Kandidaten-Id und Kostenklasse werden wiederverwendet), danach je Ersatzkonto ein Kandidat mit Priorität `index + 1`. Die Kostenklasse eines neuen Kandidaten folgt der Kontoart: Codex mit API-Schlüssel oder Zugangsverweis `paid`, sonst `subscription-included`; Claude mit Zugangsverweis `paid`, sonst `subscription-included`; OpenCode mit Gateway oder Zugangsverweis `paid`, sonst `unknown`. `free-tier` wird nie abgeleitet. Die Kostenregel wird `local-only` beziehungsweise `free-only`, wenn alle Kandidaten `local` beziehungsweise `free-tier` sind, sonst `any`.
4. Profil mit Name, Position, Weg, `qualificationTags` = Verantwortungen und Figur; `enabled` bleibt erhalten, neu `true`.
5. Provider-Manifeste je verwendetem `providerId` anlegen oder übernehmen (OpenCode-Gateway als `openai-compatible-gateway`, sonst die Kontoart; Modellherkunft `runtime` für Codex und OpenCode ohne Gateway, sonst `configured`).
6. Team und Lieferkontext abgleichen (siehe unten) und den ganzen Schnappschuss speichern. Erfolg schließt das Sheet; ein Fehler lässt Sheet und Entwurf unverändert offen.

### Team-Abgleich

`synchronizeWorkspaceTeamConfiguration(settings, workspaceId, preferredProfileId, preferredRoles, preferredSkillIds)` berücksichtigt nur aktivierte Profile des Workspace und bildet je Skill-Flow-Rolle in Rollenreihenfolge höchstens eine Zuständigkeit:

| Lage                                                                                      | Primär-Agent                                                                                         | Backups                                                        |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Rolle unter `preferredRoles`                                                              | der gespeicherte Agent                                                                               | bisheriger Primär-Agent (falls anders), dann bisherige Backups |
| Rolle nicht gewählt, bisheriger Primär-Agent ist ein anderer und erlaubt                  | unverändert                                                                                          | bisherige Backups                                              |
| Rolle nicht gewählt, bisheriger Primär-Agent ist der gespeicherte oder nicht mehr erlaubt | erster aus bisherigem Primär-Agent und Backups, der nicht der gespeicherte ist und die Rolle erlaubt | übrige bisherige Backups                                       |
| kein geeigneter Agent                                                                     | Zuständigkeit entfällt                                                                               | –                                                              |

Backups werden immer auf erlaubte, eindeutige und vom Primär-Agenten verschiedene Agenten gefiltert. `skillId` bleibt erhalten; für gewählte Rollen gewinnt ein übergebener Wert. Das Team behält Id und Namen, neu `Default delivery team`. Der Lieferkontext des Workspace wird neu aus allen aktivierten Arbeitsquellen, Repository- und CI-Bindungen gebildet, mit dem ersten Repository als Standard.

## Entfernen

1. `agentRemovalBlockers` prüft: kein weiteres Profil im Workspace → `last-agent`; sonst wird `withoutAgent` angewandt, und bei eingeschalteter Teams-Feedback-Aufnahme des Workspace ohne Zuständigkeit `work-item-creation` mit `skillId` in einem aktivierten Lieferkontext → `work-item-creation`.
2. Mit Sperrgrund erscheint ein reiner Hinweis (`remove-agent-blocked-<id>`); nichts wird gespeichert.
3. Sonst fragt `remove-agent-<id>` nach. Erst nach Bestätigung speichert der Bereich `withoutAgent(settings, id)`:
   - Profil entfernen; Position und Ausführungsweg nur entfernen, wenn kein anderes Profil sie verwendet.
   - Den Agenten aus allen Backup-Listen streichen. Zuständigkeiten, deren Primär-Agent er war, gehen an das erste Backup, sonst an das erste übrige Profil, das aktiviert ist, im Workspace des Teams liegt und dessen Position die Rolle erlaubt; dieses wird aus den Backups entfernt. Ohne Kandidat entfällt die Zuständigkeit.
   - AI-Konten bleiben unverändert.

## Laufzeitverbrauch der Zuständigkeiten

`agentExecutionTargetsFor(settings, role, workspaceId, teamId)` bildet aus der Zuständigkeit die geordneten Ausführungsziele: Primär-Agent, dann Backups; nur aktivierte Profile des Team-Workspace mit Position und Weg im selben Workspace, deren Position die Rolle erlaubt; für `solution` und `ci-repair` nur Positionen mit `worktree-write`. Je Agent folgen seine aktivierten Kandidaten nach Priorität, gefiltert nach Kostenregel und geforderten Fähigkeiten, nur auf AI-Konten desselben Workspace. Die Ausführungsbindung nimmt das Ziel des dem Work Item verantwortlich zugeordneten Agenten, sonst das erste Ziel; ohne Ziel entsteht keine Bindung.

## Suche und Adressparameter

| Suchbeitrag (je Workspace) | Beschreibung                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `Delivery flow`            | `Who works on each step of a work item, and the backup after them.`                         |
| `Agents`                   | `Configure the AI agents in this workspace, their positions, responsibilities, and skills.` |
| `Technical AI setup`       | `Positions, providers, models, and automatic backup routes`                                 |

| Parameter der Route `/settings` | Wirkung                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `workspace`, `section=team`     | wählt den Bereich (Auswertung durch das Einstellungsfenster) |
| `agent`                         | öffnet zusätzlich das Sheet dieses Agenten, siehe oben       |

**Open AI team** im Laufpanel des Hauptfensters sendet `settings.open` mit `section: 'team'` und, falls vorhanden, dem aktiven Workspace.

## Rückfragen

| Id                                | Titel                          | Art                    | Schaltflächen                     |
| --------------------------------- | ------------------------------ | ---------------------- | --------------------------------- |
| `remove-agent-<agentId>`          | `Remove <Name>?`               | destruktiv             | `Remove agent`, `Keep agent`      |
| `remove-agent-blocked-<agentId>`  | `This agent cannot be removed` | Hinweis, Ton `warning` | `OK`                              |
| `install-agent-runtime-<runtime>` | `Install <Label> CLI?`         | Ton `warning`          | `Install with Homebrew`, `Cancel` |

## Fehler und Wiederherstellung

| Fehlerfall                            | Erkennung                      | Öffentlicher Fehler                                   | Nebenwirkungen                         | Wiederherstellung                       |
| ------------------------------------- | ------------------------------ | ----------------------------------------------------- | -------------------------------------- | --------------------------------------- |
| Speichern abgelehnt (Schema, IPC)     | `saveSettings` liefert `false` | Hinweis `Unable to save settings.` mit Grund          | keine; Sheet und Entwurf bleiben offen | korrigieren und erneut speichern        |
| Settings beim Entfernen nicht geladen | `requireSettings`              | Ausnahme im Befehl                                    | keine                                  | Bereich neu öffnen                      |
| Kommandozeile fehlt                   | Laufzeitgesundheit             | Warnung im Sheet, Validierungsfehler                  | Speichern gesperrt                     | Installation über Homebrew oder manuell |
| Codex-Modelle fehlen                  | leere Konfiguration            | Hinweis `Models appear once the account is signed in` | keine                                  | anmelden, **Check again**               |
| Bewertungsquelle nicht verfügbar      | `error` im Bewertungsbericht   | Text unter den Karten                                 | keine Werte                            | Zugang konfigurieren, Limit abwarten    |
| AI-Feature fehlt                      | `aiAvailable === false`        | gesperrte Schaltflächen                               | keine Abfragen                         | –                                       |

## Implementierungsabbildung in Symphony

| Verantwortung                   | Aktueller Pfad oder Symbol                                                                                                                                                                                                                 | Beleg                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Beitrag, Initialisierer, Editor | `libs/frontend/features/team/src/lib/provider/withTeamSettings.ts`, `settings/resolveAgentEditorRoute.ts` (über `withSettingsEditorRoute`), `settings/agentSearchEntries.ts`, `settings/isTeamSettingsEditorRequest.ts`                    | `apps/renderer/src/configuration/ApplicationProductComposition.spec.ts`                                                                                                      |
| Bereich                         | `settings/TeamSettingsCardView.{ts,html}`, `settings/TeamSettingsViewPresenter.ts`                                                                                                                                                         | `apps/renderer-e2e/src/workspace-organization-settings.spec.ts`                                                                                                              |
| Schrittdefinition               | `libs/frontend/ui/src/lib/delivery-flow/{DeliveryFlowSteps,IDeliveryFlowStep,deliveryFlowStepOf,DeliveryFlowStepPipe}.ts`, `libs/domain/features/skills/src/lib/SkillFlowRoles.ts`, `libs/frontend/ui/src/lib/pipes/skillFlowRoleLabel.ts` | `deliveryFlowStepOf.spec.ts`                                                                                                                                                 |
| Projektionen                    | `settings/workspace-organization/projectWorkspaceOrganization.ts`, `settings/delivery-flow/projectDeliveryFlow.ts`, `settings/model-intelligence/*`                                                                                        | `projectWorkspaceOrganization.spec.ts`, `projectDeliveryFlow.spec.ts`, `agentIntelligenceIndex.spec.ts`, `modelIntelligenceTargets.spec.ts`, `teamIntelligenceTotal.spec.ts` |
| Entfernen                       | `settings/agent-removal/{agentRemovalBlockers,withoutAgent}.ts`                                                                                                                                                                            | `agentRemovalBlockers.spec.ts`, `withoutAgent.spec.ts`                                                                                                                       |
| Agenten-Sheet                   | `settings/TeamSettingsEditorView.{ts,html}`, `settings/TeamSettingsEditorViewPresenter.ts`                                                                                                                                                 | `TeamSettingsEditorViewPresenter.spec.ts`, `apps/renderer-e2e/src/desktop.spec.ts`, `opencode-settings.spec.ts`                                                              |
| Team-Abgleich                   | `libs/frontend/features/team/src/lib/configuration/synchronizeWorkspaceTeamConfiguration.ts`                                                                                                                                               | `TeamSettingsEditorViewPresenter.spec.ts`, `workspace-organization-settings.spec.ts`                                                                                         |
| Kontext ohne AI-Feature         | `provider/createTeamSettingsContext.ts`                                                                                                                                                                                                    | `ApplicationProductComposition.spec.ts`                                                                                                                                      |
| Schemainvarianten               | `libs/configuration/composition/src/lib/application-settings/ApplicationSettingsSchema.ts`                                                                                                                                                 | Schematests der Konfigurationskomposition                                                                                                                                    |
| Ausführungsziele                | `libs/configuration/composition/src/lib/workspace-selection/agentExecutionTargetsFor.ts`, `apps/orchestrator/src/features/execution/createExecutionBindings.ts`                                                                            | –                                                                                                                                                                            |
| Modellbewertung                 | `libs/providers/artificial-analysis/src/lib/artificial-analysis-model-intelligence/ArtificialAnalysisModelIntelligence.ts`                                                                                                                 | Provider-Tests                                                                                                                                                               |

## Verifikation und Akzeptanzkriterien

- Der Bereich zeigt fünf Schritte und die Abnahme mit `You`; je Schritt erst den Primär-Agenten, dann Backups, jeden Agenten einmal; ohne Zuständigkeit `Nobody assigned`.
- Agentenkarten sind nach Verantwortung geordnet: Primär vor Backup, ohne Zuständigkeit zuletzt.
- Ein erschöpftes bevorzugtes Konto mit nutzbarem Ersatzkonto ergibt `Backup in use · preferred account out of quota`; ohne Nutzungsdaten `Available`.
- Das Sheet speichert erst, wenn Name, Berufsbezeichnung, Verantwortung, Konto und installierte Kommandozeile vorliegen; ein nicht angemeldetes Konto warnt nur.
- Die Vorschau zeigt bei angekreuztem `Implement changes` den Schritt `Implement and verify` und ändert Name und Figur sofort.
- Ein gespeicherter Agent mit `solution` wird Primär-Agent dieser Zuständigkeit; der bisherige wird erstes Backup; `skillId` bleibt `null`, wenn vorher keines zugeordnet war.
- Ein abgelehntes Speichern lässt das Sheet mit dem Entwurf offen.
- Entfernen des letzten Agenten oder des unersetzlichen Erstellers bei eingeschalteter Feedback-Aufnahme speichert nichts und zeigt den Hinweis; bestätigtes Entfernen übergibt Zuständigkeiten nur an zugelassene Agenten und lässt AI-Konten bestehen.
- Ohne AI-Feature lädt der Bereich, `Add an AI agent` und Bearbeiten sind gesperrt.

## Verwandte Dokumentation

- [AI-Team](../../project/ai-team/README.md)
- [Skills-Einstellungen](../skills/README.md)
- [Automation](../automation/README.md)
- [Workspaces](../workspaces/README.md)
- [Einstellungsfenster](../window-and-navigation/settings-window.md)
- [Provider-Modell](../provider-model.md)
