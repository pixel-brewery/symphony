# Actions-Bildschirm

Der Actions-Bildschirm (`/main/actions`, CI-Feature) projiziert GitHub-Actions-Läufe, lokale Runner-Ausführungen und agentische Diagnosen auf eine Übersicht aller Läufe und eine Workflow-Ansicht. Er besitzt keine eigene Persistenz; alle Daten stammen aus dem Orchestrations-Snapshot und den bestehenden CI-Anfragen.

## Implementierter Stand

### Zuständigkeiten

| Einheit                | Verantwortung                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActionsView`          | Werkzeugleisten-Registrierung (`WindowToolbarDirective`), Workflow-Liste, Hinweis bei veralteten Daten, Lade- und Leerzustand, Wahl der Unteransicht              |
| `ActionsAllRunsView`   | `Running now` und `History`                                                                                                                                       |
| `ActionsWorkflowView`  | Workflow-Kopf mit Dispatch, Lauftabelle, Schritte, Protokollauszug, `Diagnosis`                                                                                   |
| `ActionsViewPresenter` | Zustand (Filter, Sortierung, Seitengröße, Laufwahl, Dispatch-Formular), Projektionen und alle Befehle; einzige Instanz je Route, von den Unteransichten injiziert |
| `actionsOverview/*`    | reine Projektionsfunktionen, je Datei eine, mit Spezifikation daneben                                                                                             |
| `pipes/*`              | reine Formatierungen (Ergebnis-Badge, Runner, Dauer, Startzeit, Revisionszeile, Workflow-Punkt, Schrittsymbol)                                                    |

Eingaben: `CiStore` (`runs`, `workflows`, `remoteData`, `localCiRunningRunId`, `localCiStartedAt`, `continuousIntegrationRunsBusy`, `localCiEnabledFor`) und der Port `CI_ACTION_CONTEXT` (Snapshot-Felder `localCiExecutions`, `executions`; Einstellungen `repositoryBindings`, `agentProfiles`, `runtime.agenticDelivery`). `ICiAgentExecution` ist eine strukturelle Teilmenge der Ausführungsdatensätze, damit das CI-Feature nicht vom Execution-Feature abhängt. `EXECUTION_OPERATIONS` wird optional injiziert.

### Laufzeilen (`buildActionRunRows`)

Jeder GitHub-Lauf erscheint genau einmal als `IActionRunRow`:

1. Lokale Ausführungen werden je `ciRunId` auf die jüngste (`startedAt`) des aktuellen `runAttempt` reduziert (Ausführungen ohne `runAttempt` zählen als Versuch 1) – dieselbe Paarung wie im Laufpanel.
2. Führt der lokale Runner den Lauf gerade aus (`localCiRunningRunId === run.id`), ist die Zeile `in-progress`, Runner `github-local`, Start = `localCiStartedAt`.
3. Sonst gilt das lokale Ergebnis, wenn der GitHub-Lauf nicht aktiv ist und `local.finishedAt >= run.finishedAt`; Start und Ende stammen dann aus der lokalen Ausführung. Mit lokaler Ausführung ist der Runner `github-local`, sonst `github`.
4. Lokale Ausführungen ohne GitHub-Lauf im Snapshot bleiben als `Local workflow` mit Runner `local` erhalten.
5. Ein aktiver lokaler Start ohne GitHub-Lauf (Anfrage-ID `workflow:<workflowId>` oder unbekannte Lauf-ID) erscheint als laufende Zeile mit Runner `local`.

Alle Zeilen sind absteigend nach `startedAt`, ersatzweise `finishedAt`, sortiert.

### Projektionen

| Projektion           | Regel                                                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter               | `status` (aus `?status=` oder Menü), `actor`, `query` (`?q=`, kleingeschrieben) über Workflow, Titel, Autor, Ereignis, Branch, Revision, Status, Laufnummer                 |
| `Running now`        | gefilterte Zeilen mit `queued` oder `in-progress`; `in-progress` vor `queued`, dann neueste zuerst                                                                          |
| `History`            | gefilterte abgeschlossene Zeilen nach Startzeit (`started-descending` Standard); Seite = 10, `Show older runs` +10; `hasOlderRuns`, solange weitere existieren              |
| Workflow-Punkt       | `failing`, wenn die abgeschlossene Zeile mit dem jüngsten `finishedAt` `failed` ist; sonst `running` bei einer aktiven Zeile; sonst `passing` bei `succeeded`; sonst `idle` |
| Workflow-Reihenfolge | `failing`, `running`, `passing`, `idle`, innerhalb gleich nach Name                                                                                                         |
| Untertitel           | Repository-Anzeigename (bei mehreren `<n> repositories`), ` · <n> running` (aktive Zeilen, ungefiltert), ` · <n> failing` (Workflows mit Punkt `failing`)                   |
| Gewählter Lauf       | explizite Wahl, sonst `?run=`, sonst die jüngste abgeschlossene, sonst die erste Zeile des Workflows                                                                        |
| Schritte             | ein Job: seine Schritte (ohne Schritte: der Job selbst); mehrere Jobs: je Job eine Kopfzeile und eingerückte Schritte                                                       |
| Protokollauszug      | nur bei `failed` (`failureLog`, sonst lokales `failureLog`, sonst `logOutput`) oder aktiven Läufen (`logOutput`); die letzten 12 Zeilen ohne Leerzeilen an den Rändern      |

Die Details (`ci.run.details`) werden je Schlüssel `<runId>:<runAttempt>:<status>` einmal geladen; aktive Läufe werden alle 10 s erneut gelesen. Ein Fehler setzt `Steps unavailable`.

### Adresse und Navigation

- `?workflow=<id>` wählt den Workflow; `selectWorkflowCommand` navigiert mit `queryParamsHandling: 'merge'` und entfernt `run`, damit Back/Forward die Auswahl schrittweise zurücknehmen. Unbekannte IDs zeigen `All runs`.
- `?workflow=<id>&dispatch=github` (Befehl `Run <workflow> on GitHub` der Befehlspalette) ist eine einmalige Absicht: Sobald die Workflows geladen sind, öffnet der Bildschirm das Dispatch-Formular dieses Workflows (unbekannte IDs: kein Formular) und entfernt `dispatch` mit `replaceUrl`; `workflow` bleibt als Auswahl stehen. Das Formular erscheint nur in der Ansicht seines eigenen Workflows.
- `?run=<ciRunId>` ohne `workflow` wählt den Workflow des Laufs und den Lauf. Den Drawer öffnet weiterhin die Shell (`PresenterViewPresenter`) einmal je Lauf-ID.
- `View log` öffnet `ActionDrawerView` direkt über `DrawerService` mit `toActionDrawerRun`; ein bereits offener Drawer dieses Bildschirms erhält `requestAttention()`.

### Befehle und Bedingungen (`resolveActionRunControls`)

| Befehl             | Bedingung                                                                                 | Wirkung                                |
| ------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| `View log`         | GitHub-Lauf oder lokale Ausführung vorhanden                                              | Action-Drawer                          |
| `Stop`             | Zeile `in-progress`; lokal laufend nur mit GitHub-Lauf, sonst GitHub-Status `in-progress` | `ci.local.cancel` bzw. `ci.cancel`     |
| `Cancel`           | Zeile und GitHub-Lauf `queued`                                                            | `ci.cancel`                            |
| `Rerun on GitHub`  | GitHub-Lauf abgeschlossen, nicht lokal laufend                                            | `ci.rerun`                             |
| `Rerun locally`    | GitHub-Lauf, lokaler Runner für den Workspace aktiv und frei                              | `ci.local.run`                         |
| `Open in GitHub`   | `externalUrl` vorhanden                                                                   | `ExternalLinkService.open`             |
| `Run on GitHub`    | `supportsManualDispatch` und `state === 'active'`                                         | Formular, dann `ci.workflow.dispatch`  |
| `Run locally`      | wie oben, lokaler Runner aktiv und frei                                                   | `ci.workflow.local.run`                |
| `Refresh`, `Retry` | immer (gesperrt während einer Aktualisierung)                                             | `ci.runs.refresh` mit Workflow-Katalog |

### Diagnose (`findAgenticRecovery`)

Die agentische Auslieferung kennzeichnet jede Ausführung, die sie für einen fehlgeschlagenen Lauf startet, mit `agenticDeliveryId = agentic:<workspaceId>:<repositoryBindingId>:<runId>:<runAttempt>`. Der Bildschirm wählt die jüngste Ausführung mit `skillFlowRole = ci-diagnosis` (Text = `summary`, bei Fehler `error`) und `ci-repair` (Abzeichen) mit genau diesem Schlüssel. Der Agentenname stammt aus `bindingSnapshot.agentProfileId`.

### Fix with AI (`resolveFixWithAi`, `composeFixFeedback`)

1. Ohne `EXECUTION_OPERATIONS`: `unavailable`.
2. Quelle = jüngste erfolgreiche `solution`/`revision`-Ausführung mit `pullRequest`, `workspaceReference === run.branch`, gleichem Workspace und (falls gebunden) gleicher Repository-Bindung; fehlt sie: `no-pull-request`.
3. Policy `runtime.agenticDelivery`: `enabled && managedBranchUpdatesEnabled && (sourceRepairEnabled || workflowRepairEnabled)` (Stufe `Repair`); sonst `policy`.
4. Eine Ausführung des Work Items in `queued`, `running` oder `waiting`: `busy`.
5. Sonst `available`: `startSolver(false, workItemId, feedback)` startet die bestehende Überarbeitung; die Rückmeldung nennt Workflow, Branch, Revision, fehlgeschlagene Schritte und den als nicht vertrauenswürdig markierten Protokollauszug, höchstens 20.000 Zeichen. Freigaben und Kapazität prüft der Orchestrator wie bei jedem Start.

### Fehlerbehandlung

`remoteData.state !== 'current'` zeigt `actions-stale-data` mit letzter erfolgreicher Aktualisierung, bei `rate-limited` mit `retryAt`, und `Retry`. Fehler der Befehle meldet `CiStore` als Benachrichtigung.

## Migrationsverträge und offene Punkte

- Das Seitenleisten-Abzeichen (`countFailingWorkflows`) zählt nur GitHub-Ergebnisse; Untertitel und Workflow-Punkte berücksichtigen ein neueres Ergebnis des lokalen Runners. Beide stimmen überein, sobald das Abzeichen dieselbe Zeilenprojektion nutzt.

- Das Laufpanel (`currentActionRuns` in der Shell) zeigt bei GitHub nur eingereihte Läufe nicht, `Running now` schon. Das Abnahmekriterium „dieselben laufenden und eingereihten Läufe“ verlangt, dass die Shell eingereihte Cloud-Läufe aufnimmt.
- Die Klassifizierung einer Diagnose (`source`, `workflow`, …) steht nur im Auslieferungsjournal, das der Snapshot nicht enthält; das Abzeichen `Source failure` des Entwurfs entfällt bis zu dessen Projektion.
- `Fix with AI` nutzt die bestehende Überarbeitung; eine eigene manuelle CI-Reparatur über das Auslieferungsjournal benötigt eine neue Orchestrierungsanfrage.

## Abnahme

- `/main/actions` öffnet `All runs`; `actions-running` listet alle aktiven Zeilen, `actions-history` die abgeschlossenen, neueste zuerst.
- Ein Workflow-Klick setzt `?workflow=`; Back führt zu `All runs` zurück.
- `?run=` öffnet den Drawer und wählt Workflow und Lauf.
- Filter, Suche und `?status=` grenzen alle Listen ein.
- Spezifikationen: `libs/frontend/features/ci/src/lib/actions/view-presenters/**/*.spec.ts`, `libs/frontend/features/ci/src/lib/pipes/*.spec.ts`; E2E: `apps/renderer-e2e/src/actions-workflows.spec.ts`.
