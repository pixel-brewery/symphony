# Repositories und Auslieferungsziele

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Das Delivery-Feature besitzt zwei Workspace-Bereiche derselben Karte: `repositories` (GitHub-Repositories, lokale Vorbereitung, Repository-Sheet) und `delivery` (Auslieferungsziele je Projekt mit Orbitvorschau). Funktional beschrieben sind sie unter [Repositories](../../project/workspaces/repositories.md) und [Delivery destinations](../../project/workspaces/delivery-destinations.md).

Garantien:

- Ein eingeschaltetes Repository ist die ausdrückliche Freigabe des Workspace für manuelle und automatische AI-Arbeit darin; es gibt keine zweite Freigabe.
- Lokale Vorbereitung führt keinen Projektcode aus und schreibt nur, wenn das Speicherkontingent des Workspace es erlaubt.
- Ein GitHub-Konto, das ein anderes Repository mitbenutzt, wird nie stillschweigend für beide umgeschrieben.
- Entfernen eines Repositories entfernt seine abhängige Konfiguration (Ziele, CI-Anbindung, ungenutztes Konto, Lieferzuordnung) in einem einzigen validierten Schreibvorgang und lässt die Arbeitskopie auf der Festplatte unberührt.
- Ein Auslieferungsziel wird nur gespeichert, wenn es sein Schema erfüllt und im Projekt nicht doppelt existiert. Konfiguration bestätigt nie eine Version.

## Repositories

### Liste und Laufzeitstatus

Die Liste enthält die `repositoryBindings` des Workspace. Der Zustand stammt aus dem Laufzeitstatus (`repositories.runtime.list`):

| Bedingung                                                    | Beschreibung           | Aktion                                                 |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------------------ |
| `enabled === false`                                          | `Disabled`             | –                                                      |
| kein Status oder `preparation.state === 'unprepared'`        | `Not prepared locally` | **Prepare locally**, sofern ein Laufzeitport existiert |
| `preparation.state === 'prepared'` und `preparation.managed` | `Prepared locally`     | **Refresh**                                            |
| `preparation.state === 'prepared'`, nicht verwaltet          | `Prepared locally`     | –                                                      |

Der Laufzeitspeicher führt höchstens eine Repository-Operation zugleich (`repositoryRuntimeBusy`); währenddessen sind Vorbereiten, Aktualisieren und **Edit** gesperrt.

### Vorbereiten (`repositories.prepare`)

1. Der Orchestrator prüft, dass das Kontingent des Workspace beschreibbar ist, sonst Abbruch mit einem Speicherstopp.
2. Ist der konfigurierte oder der verwaltete Pfad eine passende Arbeitskopie, holt er den Stand (`fetch`).
3. Sonst klont er mit `gh repo clone <owner>/<name>` (bei anderem Host mit Hostpräfix) ohne Checkout und mit deaktivierten Git-Hooks in das verwaltete Verzeichnis des Workspace. Ohne GitHub-Anmeldung für den Host scheitert er mit der Aufforderung, sich anzumelden.
4. Ein geänderter Pfad wird am Repository gespeichert. Der Renderer übernimmt den Status, lädt die Einstellungen neu, meldet `Repository prepared locally.` und benachrichtigt die Automatisierung über nicht vorbereitete Repositories für automatische Ausführungen.

Die Mitteilungsquelle `repository-preparation` liefert für jedes eingeschaltete, nicht vorbereitete Repository eines aktivierten Workspace einen Eintrag (`<Name> is not prepared locally`, Ort `[Workspace, 'Repositories']`) mit der Aktion **Prepare locally**.

### Sheet `repository`

Entwurf aus dem vorhandenen Repository, seiner GitHub-Verbindung und seiner CI-Anbindung, sonst Standardwerte: Host `github.com`, Zweig `main`, Protokoll `https`, `enabled: true`, CI an, Agentic Delivery aus, Anmelden aus.

Speichern verlangt nicht leeren Anzeigenamen, Besitzer und Namen. Fehlt etwas, ist **Save** gesperrt und `With missing details` nennt die fehlenden Angaben (`display-name` Display name, `owner` Owner, `name` Repository; siehe [Pflichtangaben in Sheets](README.md#pflichtangaben-in-sheets)). Die Kontowahl folgt dieser Entscheidung:

| Ausgangslage                                                                                                   | Verwendetes Konto                   |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Das Repository hat ein Konto, das kein anderes Repository verwendet.                                           | dieses Konto, mit den neuen Angaben |
| Das vorhandene Konto wird mitbenutzt und Host, Protokoll und Login stimmen weiterhin überein.                  | dieses Konto                        |
| Sonst gibt es genau ein Konto des Workspace mit gleichem Host, Protokoll und (falls angegeben) gleichem Login. | dieses Konto                        |
| Sonst                                                                                                          | neues Konto `github-<uuid>`         |

Geschrieben werden die Verbindung (`kind: 'github'`, Name aus vorhandenem Konto, Login oder Anzeigename), das Repository (`id` vorhanden oder `repository-<uuid>`, `provider: 'github'`, `defaultBranch` leer ⇒ `main`, `localPath`) und mit eingeschalteten Actions-Läufen die CI-Anbindung (`provider: 'github-actions'`, Name `<Anzeigename> Actions`, `agenticDeliveryEnabled`); ausgeschaltet wird die CI-Anbindung entfernt. Vor dem Speichern wird der Lieferumfang angeglichen ([Connected services](connected-services.md#angleichen-des-lieferumfangs)). Mit **Sign in after saving** startet nach erfolgreichem Speichern die Browseranmeldung für Host und Protokoll. Scheitert das Speichern, bleibt das Sheet offen und es wird nicht angemeldet.

Für ein vorhandenes Repository mit CI-Fähigkeit lädt das Sheet beim Öffnen den GitHub-Actions-Verbrauch (`refreshContinuousIntegrationUsage([id], true)`) und zeigt Konto, Minuten und Rücksetzdatum oder den Fehlertext.

### Entfernen

`repositoryRemovalBlockers(settings, id)` liefert die Namen der Lieferungen (`deliveryContexts`), deren einziges Repository dieses ist. Mit Blockern erscheint `remove-repository-blocked-<id>`. Sonst fragt `remove-repository-<id>`; bei Bestätigung speichert `withoutRepository`:

- das Repository, seine Auslieferungsziele und seine CI-Anbindungen werden entfernt;
- seine GitHub-Verbindung wird entfernt, wenn weder ein anderes Repository noch eine Work-Item-Quelle noch eine andere CI-Anbindung sie verwendet;
- jede Lieferung verliert die Repository-Id; war sie Standard, wird der Standard geleert.

Teams-Intakes, die das Repository als Ziel nennen, werden nicht angepasst; das Schema weist den Schreibvorgang dann ab.

## Auslieferungsziele

### Liste

`delivery` zeigt die Repositories des in der Einstellungssitzung gewählten Workspace als Projekte. Das gewählte Projekt liegt in einem Entwurf je Einstellungssitzung (`deliveryRepositoryId`), damit es ein Neu-Einhängen der Karte übersteht; ohne Wahl gilt das erste Repository. Die Liste zeigt die `deliveryTargets` mit gleicher `workspaceId` und `repositoryBindingId`. **Add destination** ist ohne Repository oder während eines Schreibvorgangs gesperrt.

### Sheet `delivery-target`

Entwurf aus dem Ziel der Anfrage (gleicher Workspace und gleiches Repository), sonst aus den Vorbelegungen der Anfrage (`production`, `displayName`, `environment`, `targetKind`), sonst `production` ⇒ Name `Production` und Umgebung `production`; Himmelskörper `sun`; Workflow leer.

| Regel            | Vertrag                                                                                                                                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema           | `{ id, workspaceId, repositoryBindingId, displayName, kind: 'environment' \| 'release-channel' \| 'installation', environment, production, celestialBody?, workflowId?, versionInput?, environmentInput?, operationInput? }`; Zeichenketten getrimmt und nicht leer; mit `workflowId` ist `versionInput` Pflicht |
| Körper           | `sun`, `mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`                                                                                                                                                                                                                             |
| Duplikat         | ein anderes Ziel desselben Workspace und Repositories mit gleichem `kind` und gleichem getrimmten `environment`; sperrt **Save**                                                                                                                                                                                 |
| Unbekanntes Ziel | eine `targetId`, die im Workspace und Repository nicht existiert, macht das Speichern unmöglich                                                                                                                                                                                                                  |
| Neue Id          | `destination-<uuid>`, einmal je geöffnetem Sheet                                                                                                                                                                                                                                                                 |
| Anwendungsebene  | höchstens 100 Ziele; jedes Ziel braucht eine eindeutige Id und ein Repository in seinem Workspace                                                                                                                                                                                                                |
| Workflows        | beim Öffnen aus dem Snapshot, auf Anforderung über `setup.repository.inspect`; jeweils nur aktive, manuell startbare Workflows dieses Repositories; Fehler setzen nur einen Hinweis                                                                                                                              |
| Workflowwechsel  | leert `versionInput`, `environmentInput` und `operationInput`; eine unbekannte Workflow-Id wird ignoriert                                                                                                                                                                                                        |
| Orbitvorschau    | nur für Production; Mitte: Vorschaubild des gewählten Körpers und Name (leer ⇒ `Production`); Ringe: die anderen Ziele desselben Workspace und Repositories, abwechselnd innerer und äußerer Ring; dekorativ (`aria-hidden`), jeder Wert ist auch ein Steuerelement                                              |

Speichern fügt das Ziel ein oder ersetzt es und schließt bei Erfolg. Abbruch verwirft den Entwurf.

### Entfernen

Rückfrage `remove-delivery-target-<id>` (`Remove <Name>?`, Ton `danger`, destruktiv, **Remove destination** / **Keep destination**); bei Bestätigung und freiem Schreiber wird nur dieses Ziel aus `deliveryTargets` entfernt. Ziele anderer Projekte bleiben.

### Routen-Initialisierer `delivery-settings-route`

Der Initialisierer wertet die Query-Parameter der Einstellungsroute aus, sobald `section=delivery` und mindestens einer der Editor-Schlüssel `repository`, `target`, `production`, `environment`, `name`, `kind` vorhanden ist:

1. Er verlangt einen bekannten `workspace`; das Repository zählt nur, wenn es zu diesem Workspace gehört.
2. Er bildet einen Schlüssel aus `workspace`, `repository`, `target`, `production`, `environment`, `name`, `kind` und verarbeitet jeden Schlüssel nur einmal.
3. Er öffnet den Workspace beim Bereich `delivery` und setzt das gewählte Projekt.
4. Mit Repository und `target=new` oder einer bekannten Ziel-Id öffnet er das Sheet mit `production === 'true'`, `environment`, `displayName = name` und `targetKind` (`release-channel` oder `installation`, sonst `environment`).
5. Danach entfernt er die Editor-Schlüssel mit `replaceUrl` aus der Adresse, damit dieselbe Anforderung später wieder ein Sheet öffnet.

Das Orbit sendet `target` als konfigurierte Id, `new` für ein nicht konfiguriertes gewähltes Ziel oder für ein Projekt ohne Production-Ziel und lässt `target` weg, wenn bereits ein Production-Ziel existiert und nichts gewählt ist.

### Repository-Schlüssel und Suche

`delivery-repository-route` (`withSettingsEditorRoute`) öffnet bei `section=repositories&repository=<id>` das `repository`-Sheet dieses Repository, sofern es zum genannten Workspace gehört, und entfernt den Schlüssel danach mit `replaceUrl`. `Search settings` findet jedes Repository (`repositorySearchEntries`: Beschreibung `<owner>/<name>`, Wert `Disabled` bei deaktiviertem Repository, `parameters: { repository }`) und jedes Lieferziel mit vorhandenem Repository (`deliveryTargetSearchEntries`: Gruppe = Repository-Name, Beschreibung `[Production · ]<Art>`, Wert = Umgebung bei `environment`, `parameters: { repository, target }`, ausgewertet vom obigen Initialisierer).

## Fehler und Wiederherstellung

| Fehlerfall                              | Erkennung                       | Öffentlicher Fehler                                           | Nebenwirkungen            | Wiederherstellung                      |
| --------------------------------------- | ------------------------------- | ------------------------------------------------------------- | ------------------------- | -------------------------------------- |
| Vorbereiten bei vollem Kontingent       | Speicherprüfung im Orchestrator | `Unable to prepare the repository locally.` mit Speicherstopp | keine                     | Speicher freigeben oder Grenze anheben |
| Vorbereiten ohne GitHub-Anmeldung       | fehlendes Token                 | wie oben mit Anmeldehinweis                                   | keine                     | anmelden, erneut vorbereiten           |
| Repository blockiert                    | `repositoryRemovalBlockers`     | Hinweis `This repository is still in use`                     | keine                     | weiteres Repository hinzufügen         |
| Repository ist Ziel eines Teams-Intakes | Schema                          | `Unable to save settings.`                                    | keine                     | Intake ändern                          |
| Doppeltes Ziel                          | Duplikatregel                   | Hinweis im Sheet, **Save** gesperrt                           | keine                     | vorhandenes Ziel bearbeiten            |
| Workflows nicht ladbar                  | Ausnahme der Inspektion         | Hinweis `When loading fails`                                  | keine                     | Konto prüfen, erneut laden             |
| Unbekanntes Repository in der Adresse   | Initialisierer                  | keiner                                                        | Bereich öffnet ohne Sheet | –                                      |

## Implementierungsabbildung in Symphony

| Verantwortung           | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                                          | Beleg                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Registrierung           | `libs/frontend/features/delivery/src/lib/provider/withDeliverySettings.ts`                                                                                                                                                                                                                                                          | –                                                                                                                         |
| Karte, Liste, Entfernen | `libs/frontend/features/delivery/src/lib/settings/{DeliverySettingsCardView,DeliverySettingsViewPresenter,deliverySettingsDraftFor}.ts`, `…/settings/repository-removal/*`                                                                                                                                                          | `DeliverySettingsViewPresenter.spec.ts`, `withoutRepository.spec.ts`, `apps/renderer-e2e/src/repository-settings.spec.ts` |
| Sheets                  | `…/settings/{DeliverySettingsEditorView,DeliverySettingsEditorViewPresenter}.ts`                                                                                                                                                                                                                                                    | `DeliverySettingsEditorViewPresenter.spec.ts`, `apps/renderer-e2e/src/orbit-destination-settings.spec.ts`                 |
| Routen-Initialisierer   | `…/settings/initializeDeliverySettingsRoute.ts`, `…/settings/resolveRepositoryEditorRoute.ts`, Sucheinträge `…/settings/{repositorySearchEntries,deliveryTargetSearchEntries}.ts`, Auslöser `libs/frontend/features/home/src/lib/view-presenters/OrbitViewPresenter.ts` (`configureDeliveryCommand`, `openDeliverySettingsCommand`) | `initializeDeliverySettingsRoute.spec.ts`                                                                                 |
| Zielschema              | `libs/configuration/features/delivery/src/lib/{DeliveryTargetSchema,OrbitCelestialBodySchema}.ts`                                                                                                                                                                                                                                   | `ApplicationSettingsSchema.spec.ts`                                                                                       |
| Vorbereitung            | `libs/frontend/features/workspace/src/lib/state/RepositoryRuntimeStore.ts`, `…/notifications/RepositoryPreparationNotificationSource.ts`, `libs/application/features/workspace/src/lib/RepositoryRuntimeService.ts`, `libs/providers/git/src/lib/managed-git-repository/ManagedGitRepository.ts`                                    | `RepositoryRuntimeStore.spec.ts`, `RepositoryPreparationNotificationSource.spec.ts`                                       |

## Verifikation und Akzeptanzkriterien

- Mehrere Repositories lassen sich in einem Workspace ohne zusätzliche AI-Freigabe hinzufügen; Repositories mit gleichem Host und Protokoll teilen ein GitHub-Konto.
- Ändert ein Repository die Kontoangaben eines mitbenutzten Kontos, erhält es ein eigenes Konto; das andere Repository und seine CI-Anbindung behalten ihres. Ein fehlgeschlagenes Speichern startet keine Anmeldung.
- Entfernen eines Repositories verlangt eine positive Bestätigung und lässt Ziele anderer Projekte bestehen.
- Ein Ziel mit leerem Namen, ohne Versionseingang bei gewähltem Workflow oder als Duplikat derselben Art und desselben Namens im Projekt ist nicht speicherbar.
- Nur aktive, manuell startbare Workflows des bearbeiteten Repositories sind wählbar; ein Workflowwechsel leert die Eingangsnamen.
- **Configure destination** im Orbit öffnet die Einstellungen beim Projekt mit dem Ziel-Sheet und Orbitvorschau; **Cancel** schreibt nichts; dieselbe Anforderung öffnet das Sheet erneut.
- Ein Repository außerhalb des angeforderten Workspace öffnet kein Ziel-Sheet.

## Verwandte Dokumentation

- [Workspaces in den Einstellungen](README.md)
- [Production orbit](../production-orbit.md)
- [Workspace-Modell](../workspace-model.md)
- [Lokale Repository-Verifikation](../local-repository-verification.md)
