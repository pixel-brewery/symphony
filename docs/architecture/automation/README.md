# Automation-Einstellungen

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der globale Einstellungsbereich `automation` bearbeitet die anwendungsweite Laufzeitrichtlinie, die bestimmt, wie weit das AI-Team ohne Bedienung arbeitet: autonome Zyklen, die Agentic-Delivery-Richtlinie für fehlgeschlagene Checks („Fix failed checks“) samt Budgets, Review-Rückmeldungen, GitHub-Kommentarbefehle und die Ausführungsumgebung. Das funktionale Verhalten beschreibt [Automation](../../project/automation/README.md); Seitenleiste, Suche, Sheets und Rückfragen der Einstellungen beschreibt [Einstellungen im Hauptfenster](../window-and-navigation/settings.md).

Garantien:

- Jede Änderung gilt sofort und wird über den einzigen Settings-Schreiber gespeichert. Gespeichert wird nur die geänderte Größe, angewandt auf die zuletzt gespeicherten Einstellungen; schnelle Folgeänderungen werden in Reihenfolge gespeichert und bauen aufeinander auf.
- Scheitert ein Speichern, zeigt das Steuerelement wieder den gespeicherten Wert. Es bleibt kein ungespeicherter Wert sichtbar.
- Zahlen werden vor dem Speichern abgerundet und auf die Schemagrenzen begrenzt; leere oder nicht endliche Eingaben lösen kein Speichern aus.
- Die Stufe von „Fix failed checks“ wird nie gespeichert, sondern aus den acht Leiterschaltern abgeleitet. Eine Stufe ändert ausschließlich diese acht Schalter.
- Über die Oberfläche entsteht nie eine gespeicherte Richtlinie, in der ein Leiterschalter an ist, dessen Voraussetzung aus ist: Ein gesperrter Schalter lässt sich nicht einschalten, und das Ausschalten einer Voraussetzung schaltet jeden davon abhängigen Schalter mit aus.
- Inaktive Arbeitsbereiche werden nur nach ausdrücklicher Bestätigung entfernt.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Bereichsbeitrag und Suchindex, Darstellung, Presenter, Entwurfsspeicher mit Speicherwarteschlange, das Leitermodell (Stufen, Abhängigkeiten, Ableitung), der Laufzeitvertrag der bearbeiteten Schlüssel mit Standardwerten und Validierung, die Rückfrage zum Aufräumen und die unmittelbaren Folgen eines Speicherns im Orchestrator.
- Nicht enthalten: die Speichergrenzen (`managedStorageLimitGiB`, `minimumFreeDiskGiB`, Grenze von Local GitHub Actions), die dasselbe Feature im Bereich `system` beiträgt ([System](../system/README.md)); virtuelle Maschinen ([System](../system/README.md)); die Zustimmung je Repository `agenticDeliveryEnabled` an der CI-Anbindung ([Workspaces](../workspaces/README.md)); die Orchestrierungsschleifen selbst ([Agentic Delivery](../agentic-delivery.md), [Autonome Ausführung](../autonomous-execution.md), [Remote-Automatisierung](../remote-automation.md), [Managed Local CI](../managed-local-ci.md)).

## Verantwortungsgrenzen

| Verantwortung                      | Kanonischer Eigentümer                                                                 | Öffentlicher Vertrag                                                                                                       | Verbraucher                           |
| ---------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Bereich, Suchbeiträge, Reihenfolge | Automation-Feature (Settings-Beitrag)                                                  | `withSettingsViews` mit Bereich `{ scope: 'global', id: 'automation', order: 20 }` und `search`-Einträgen                  | Einstellungen, Suchindex              |
| Leitermodell                       | reine Funktionen des Automation-Features                                               | `agenticLadder`, `agenticLevelSwitches`, `agenticLevelOf`, `agenticSwitchBlocker`, `withAgenticLevel`, `withAgenticSwitch` | Presenter, Tests                      |
| Bedienzustand und Befehle          | `AutomationPolicySettingsViewPresenter`                                                | Signale `runtime`, `agenticLevel`, `agenticSwitchOn`, `agenticBlocker`, `agenticRepositories`; Befehle                     | Bereichsansicht                       |
| Entwurf und sofortiges Speichern   | `AutomationSettingsStore` (eine Instanz je Fenster, eine Sitzung je Einstellungsroute) | `beginSession`, `applyRuntime`, `applyAgenticDelivery`, `chooseWorkspaceRootCommand`, `confirmClearWorkspacesCommand`      | Presenter                             |
| Persistenz und Rückmeldung         | `ConfigurationStore` (einziger Settings-Schreiber)                                     | `saveSettings(settings)` → `settings.save`; Meldungen `Settings saved.` / `Unable to save settings.`                       | Entwurfsspeicher                      |
| Validierung und Standardwerte      | Konfigurationsschema der Anwendung                                                     | `runtimeSettingsSchema`, `agenticDeliveryPolicySchema`, `defaultAgenticDeliveryPolicy`                                     | Orchestrator, Renderer                |
| Auswertung der Richtlinie          | Orchestrator (Automation-Feature, Ausführungsdienste, GitHub-Provider)                 | liest `settingsState.current.runtime` bei jedem Zyklus                                                                     | –                                     |
| Aufräumen                          | Workspace-Feature                                                                      | `WORKSPACE_OPERATIONS.clearWorkspaces()` → `workspaces.clear`                                                              | Entwurfsspeicher (nur wenn vorhanden) |
| Ordnerauswahl                      | Orchestrierungsclient                                                                  | `selectPath({ kind: 'directory', title, defaultPath })`                                                                    | Entwurfsspeicher                      |

## Einstellungsvertrag

Alle Schlüssel liegen unter `settings.runtime`. Das Schema ist `strict`; unbekannte Schlüssel werden abgewiesen. Standardwerte gelten für fehlende Werte älterer Konfigurationsdateien.

### Laufzeit

| Schlüssel                           | Typ, Validierung              | Standard                            | Steuerelement (`test-id`)                                                         | Wirkung im Orchestrator                                                                                                                                                                                                  |
| ----------------------------------- | ----------------------------- | ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `autonomousExecutionEnabled`        | Boolean                       | `false`                             | **Run autonomous work** (`autonomous-execution`)                                  | Autonomer Zyklus wählt Arbeit aus (Analyse, Umsetzung, Wiederholung, Pull-Request-Abgleich). Auch `autonomy.set-enabled` des Menüleistenpanels schreibt diesen Schlüssel und erzwingt beim Einschalten einen Zyklus.     |
| `autonomousWorkIntervalMinutes`     | Ganzzahl 1–1440               | `15`                                | **Work interval (minutes)** (`autonomous-work-interval`)                          | Abstand der Zyklen bei eingeschalteter Autonomie; `autonomy.status.get` meldet `nextCycleAt`.                                                                                                                            |
| `maxParallelExecutions`             | Ganzzahl 1–32                 | `3`                                 | **Maximum parallel tasks** (`max-parallel-executions`)                            | Anwendungsweite Kapazität (`max(1, floor(n))`), gemeinsam für manuelle, entfernte und autonome Starts.                                                                                                                   |
| `automaticExecutionEnabled`         | Boolean                       | `false`                             | **Allow GitHub commands** (`automatic-github-execution`)                          | Abgleich der Kommentarbefehle aus GitHub im Abstand von `boardRefreshIntervalMinutes`; Mobilzugang meldet damit, ob Remote-Automatisierung aktiv ist.                                                                    |
| `workspaceRoot`                     | nicht leerer, getrimmter Text | `<Konfigurationsordner>/workspaces` | **Managed root** (`workspace-root`, Auswahl `choose-workspace-root`)              | Wurzel der verwalteten Arbeitsbereiche und des lokalen Runners. Der Orchestrator expandiert `~/`, legt den Ordner an und weist eine Änderung während eines aktiven lokalen CI-Laufs ab.                                  |
| `boardRefreshIntervalMinutes`       | Ganzzahl 1–1440               | `15`                                | **Board refresh interval (minutes)** (`board-refresh-interval`)                   | Höchstalter der Remote-Projektionen (Work Items, Pull Requests, CI-Läufe), Abfrageintervall der GitHub-Befehle und der Feedback-Quellen. Der Renderer aktualisiert seinen Snapshot zusätzlich alle `max(15, n)` Minuten. |
| `retainFailedWorkspaces`            | Boolean (Pflicht)             | `true`                              | **Retain failed execution workspaces** (`retain-failed-workspaces`)               | Ein fehlgeschlagener Arbeitsbereich wird nicht entfernt.                                                                                                                                                                 |
| `maximumVerificationRepairAttempts` | Ganzzahl 0–10                 | `2`                                 | **Verification repair attempts per run** (`maximum-verification-repair-attempts`) | Reparaturrunden der Lösungsschleife bei roten Repository-Prüfungen; `0` beendet die Ausführung beim ersten Fehlschlag.                                                                                                   |

`managedStorageLimitGiB` und `minimumFreeDiskGiB` gehören zum selben Objekt, werden aber im Bereich `system` bearbeitet.

### Agentic-Delivery-Richtlinie

`runtime.agenticDelivery` ist ein striktes Objekt; fehlt es, gilt `defaultAgenticDeliveryPolicy`.

| Schlüssel                         | Validierung               | Standard | Ort in der Oberfläche                                                                             |
| --------------------------------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| acht Leiterschalter (siehe unten) | Boolean (Pflicht)         | `false`  | Leiste unter **Fix failed checks**                                                                |
| `conflictSerializationEnabled`    | Boolean, Standard `false` | `false`  | **Serialize overlapping deliveries** (`agentic-conflict-serialization`) unter **Autonomous work** |
| `reviewFeedbackEnabled`           | Boolean (Pflicht)         | `false`  | **Listen for pull-request review feedback** (`agentic-review-feedback`) unter **Address reviews** |
| `diagnosisTokenBudget`            | Ganzzahl 1000–1000000     | `20000`  | **Diagnosis token budget** (`agentic-diagnosis-token-budget`)                                     |
| `repairTokenBudget`               | Ganzzahl 1000–2000000     | `80000`  | **Repair token budget** (`agentic-repair-token-budget`)                                           |
| `dailyTokenBudget`                | Ganzzahl 1000–10000000    | `200000` | **Daily token budget** (`agentic-daily-token-budget`)                                             |
| `maxAttempts`                     | Ganzzahl 1–10             | `2`      | **Maximum attempts per branch** (`agentic-max-attempts`)                                          |
| `maxParallelRepairs`              | Ganzzahl 1–16             | `1`      | **Maximum parallel repairs** (`agentic-max-parallel-repairs`)                                     |
| `cooldownMinutes`                 | Ganzzahl 1–1440           | `15`     | **Cooldown (minutes)** (`agentic-cooldown`)                                                       |

Die Richtlinie besitzt damit zehn Boolesche Schalter; acht bilden die Leiter, zwei (`conflictSerializationEnabled`, `reviewFeedbackEnabled`) stehen außerhalb und werden von keiner Stufe verändert.

## Leitermodell

### Leiterschalter

Reihenfolge, Abhängigkeiten und Beschriftung sind fest:

| Nr. | Schlüssel                       | Beschriftung                                | `test-id`                        | `requires` (alle)                                   | `requiresAnyOf` (mindestens einer)             |
| --- | ------------------------------- | ------------------------------------------- | -------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| 1   | `enabled`                       | Enable agentic delivery                     | `agentic-delivery-enabled`       | –                                                   | –                                              |
| 2   | `observeFailures`               | Observe failed actions                      | `agentic-observe-failures`       | `enabled`                                           | –                                              |
| 3   | `aiDiagnosisEnabled`            | Use AI for diagnosis                        | `agentic-ai-diagnosis`           | `observeFailures`                                   | –                                              |
| 4   | `ciRerunEnabled`                | Rerun transient and infrastructure failures | `agentic-ci-rerun`               | `observeFailures`                                   | –                                              |
| 5   | `managedBranchUpdatesEnabled`   | Update managed pull-request branches        | `agentic-managed-branch-updates` | `observeFailures`                                   | –                                              |
| 6   | `sourceRepairEnabled`           | Repair source failures                      | `agentic-source-repair`          | `managedBranchUpdatesEnabled`, `aiDiagnosisEnabled` | –                                              |
| 7   | `workflowRepairEnabled`         | Repair workflow failures                    | `agentic-workflow-repair`        | `managedBranchUpdatesEnabled`, `aiDiagnosisEnabled` | –                                              |
| 8   | `replacementPullRequestEnabled` | Allow replacement pull requests             | `agentic-replacement-pr`         | –                                                   | `sourceRepairEnabled`, `workflowRepairEnabled` |

### Stufen

| Stufe      | eingeschaltete Leiterschalter (alle anderen aus)       |
| ---------- | ------------------------------------------------------ |
| `off`      | –                                                      |
| `watch`    | 1, 2                                                   |
| `diagnose` | 1, 2, 3, 4                                             |
| `repair`   | 1–7                                                    |
| `full`     | 1–8                                                    |
| `custom`   | jede andere Kombination; keine eigene Schalterbelegung |

### Funktionen

- **Ableitung** `levelOf(policy)`: die erste Stufe in der Reihenfolge `off`, `watch`, `diagnose`, `repair`, `full`, deren Menge genau den eingeschalteten Leiterschaltern entspricht; sonst `custom`. Schalter außerhalb der Leiter und Budgets fließen nicht ein.
- **Sperrgrund** `blocker(policy, key)`: der erste Eintrag aus `requires` in Tabellenreihenfolge, der aus ist; sonst, wenn `requiresAnyOf` nicht leer ist und keiner davon an ist, dessen erster Eintrag; sonst keiner.
- **Stufe anwenden** `withLevel(policy, level)`: bei `custom` unverändert (identisches Objekt); sonst wird jeder der acht Schalter auf „in der Stufe enthalten“ gesetzt, alle anderen Felder bleiben.
- **Schalter setzen** `withSwitch(policy, key, value)`: Ist `value` wahr und `blocker(policy, key)` gesetzt, bleibt die Richtlinie unverändert (identisches Objekt). Sonst wird der Schalter gesetzt; beim Ausschalten wird anschließend bis zum Fixpunkt jeder eingeschaltete Leiterschalter mit Sperrgrund ausgeschaltet, in Tabellenreihenfolge.

Beispiele: Aus `full` ergibt `managedBranchUpdatesEnabled = false` die Schalter 6, 7 und 8 aus, also `diagnose`. Aus `full` ergibt `enabled = false` `off`. Aus `full` ergibt `sourceRepairEnabled = false` nur diesen Schalter aus; Schalter 8 bleibt wegen Schalter 7 an, die Stufe ist `custom`.

Die Abhängigkeiten bilden ab, was der Orchestrator je Pfad prüft (siehe [Auswertung](#auswertung-im-orchestrator)). Das Persistenzschema erzwingt sie nicht; eine von Hand bearbeitete Konfiguration kann einen Schalter ohne Voraussetzung enthalten. Die Oberfläche zeigt einen solchen Schalter eingeschaltet und gesperrt; die Wahl einer Stufe stellt eine gültige Belegung her.

### Darstellung und Befehle

- `agenticLevel` ist `custom`, solange die Bedienung **Custom** ausdrücklich gewählt hat (sitzungslokales Merkmal), sonst `levelOf(runtime.agenticDelivery)`.
- **Stufe wählen:** Das Merkmal wird auf „Custom gewählt“ gesetzt, wenn `custom` gewählt wurde, sonst zurückgesetzt. `custom` und die bereits abgeleitete Stufe speichern nichts; jede andere Stufe wird mit `withLevel` angewandt und gespeichert.
- **Schalter umlegen:** ohne Wirkung, wenn der Wert bereits gilt; sonst wird das Merkmal zurückgesetzt und `withSwitch` angewandt und gespeichert.
- Jede Sprosse zeigt einen Punkt mit `data-state` `on`, `blocked` (Sperrgrund vorhanden) oder `off` und, außer bei der letzten, eine Linie mit `data-on`. Ein Schalter mit Sperrgrund ist `disabled`, seine Beschriftung neutral, und darunter steht `Needs “<Beschriftung des Sperrgrunds>”` (`<test-id>-needs`).
- Die Beschreibung von Schalter 1 endet mit ` — <erlaubt> of <gesamt> repositories do.`, sobald Repository-Anbindungen existieren, sonst mit `.`. `gesamt` ist die Zahl aller Repository-Anbindungen aller Workspaces; `erlaubt` die Zahl derer, für die mindestens eine aktivierte CI-Anbindung `agenticDeliveryEnabled` trägt.

## Ausführungsabläufe

### Bereich laden

1. Der Bereich ist aktiv, wenn die Auswahl `section === 'automation'` ohne Workspace ist. Er wird verzögert geladen.
2. Der Presenter beginnt beim Erzeugen eine Sitzung des Entwurfsspeichers für die aktuelle Einstellungssitzung. Eine neue Sitzung übernimmt `runtime` aus den gespeicherten Einstellungen, ohne geladene Einstellungen die eingebauten Standardwerte; Bereichswechsel innerhalb derselben Sitzung behalten den Entwurf.
3. Sind noch keine Einstellungen geladen, hydriert der Presenter die Konfiguration über den `ConfigurationStore`.
4. Ändern sich die gespeicherten Einstellungen (eigenes Speichern, anderes Fenster), übernimmt der Entwurf sie nur, solange keine Speicherung aussteht.

### Sofortiges Speichern

1. `applyRuntime(patch)` beziehungsweise `applyAgenticDelivery(update)` setzt den angezeigten Entwurf sofort.
2. Die Speicherung wird an eine Warteschlange gehängt und ein Zähler ausstehender Speicherungen erhöht.
3. Ist sie an der Reihe, liest sie die aktuell gespeicherten Einstellungen. Fehlen sie, endet sie mit `false` ohne Schreibzugriff. Sonst wendet sie `patch` beziehungsweise `update` auf die **gespeicherte** Laufzeit an und übergibt die vollständigen Einstellungen an `saveSettings`.
4. `saveSettings` sendet `settings.save`, übernimmt die Antwort, aktualisiert Repository-Laufzeit und Speicherstand still, prüft die Vorbereitung der Repositorys für automatische Arbeit und meldet `Settings saved.`.
5. Bei `false` oder einer Ausnahme meldet der Schreiber `Unable to save settings.` mit der bedienbaren Fehlermeldung. Der Entwurf stellt die betroffenen Schlüssel (`patch`) beziehungsweise das gesamte `agenticDelivery`-Objekt aus den gespeicherten Einstellungen wieder her.
6. Der Zähler sinkt; erst bei null übernimmt der Entwurf wieder gespeicherte Einstellungen.

Zahlen werden beim `change`-Ereignis des Zahlenfelds übernommen. Der Rohwert wird gelesen; `''`, `null` und `undefined` werden ignoriert, nicht endliche Werte ebenfalls. Der Wert wird abgerundet und auf die Schemagrenzen der Tabelle begrenzt; entspricht er dem angezeigten Wert, wird nicht gespeichert.

### Folgen im Orchestrator

`settings.save` weist das Speichern ab, solange ein Workspace gelöscht wird (`Wait for workspace deletion to finish before saving settings.`), und solange ein lokaler CI-Lauf aktiv ist, wenn sich Local-CI-relevante Werte einschließlich des aufgelösten `workspaceRoot` ändern (`Stop the active local CI run before changing its configuration.`). Andernfalls normalisiert es Pfade, validiert gegen das Schema, legt die Arbeitsbereichswurzel an, speichert, verwirft Modellsperren und Kontopausen, räumt berechtigte Arbeitsbereiche auf und stößt, wenn sich außer dem aktiven Ansichtsumfang irgendetwas geändert hat, sofort den Abgleich der GitHub-Befehle, den Feedback-Abgleich und einen autonomen Zyklus an.

### Auswertung im Orchestrator

| Bedingung                                                             | Wirkung                                                                                                                                                                                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| weder `autonomousExecutionEnabled` noch `enabled && observeFailures`  | kein autonomer Zyklus                                                                                                                                                                                                             |
| `enabled && observeFailures`, Autonomie aus                           | Zyklus frühestens alle 60 Sekunden (Hintergrundtakt 30 Sekunden), nur Agentic Delivery und Branch-Aktualisierung                                                                                                                  |
| `autonomousExecutionEnabled`                                          | Zyklus im Abstand `autonomousWorkIntervalMinutes`; nach Agentic Delivery folgen Pull-Request-Abgleich, Warteschlange und Auswahl bis zur Kapazität                                                                                |
| erste Beobachtung einer CI-Anbindung                                  | vorhandene Fehlschläge werden als `baseline` festgehalten und gestoppt                                                                                                                                                            |
| Klassifikation `authorization`                                        | Stopp für die Bedienung                                                                                                                                                                                                           |
| Klassifikation `transient` oder `infrastructure`                      | ein journalisierter erneuter Lauf, wenn `ciRerunEnabled`; sonst Stopp                                                                                                                                                             |
| `source`, `workflow`, `unknown` ohne `aiDiagnosisEnabled`             | Stopp „AI diagnosis is disabled by policy.“                                                                                                                                                                                       |
| Diagnose möglich                                                      | Start nur, wenn `diagnosisTokenBudget` in das Tagesbudget passt; eine Diagnose über ihrem Budget stoppt den Fall                                                                                                                  |
| Reparatur                                                             | nur bei `managedBranchUpdatesEnabled` und `workflowRepairEnabled` (Klasse `workflow`) beziehungsweise `sourceRepairEnabled` (Klassen `source`, `unknown`), bei Tagesbudget für `repairTokenBudget` und unter `maxParallelRepairs` |
| Pull Request hinter der Basis                                         | Branch-Aktualisierung über den Provider bei `managedBranchUpdatesEnabled`                                                                                                                                                         |
| Pull Request mit Konflikt                                             | budgetierte Konfliktrevision bei `sourceRepairEnabled`, sonst sichtbarer Zyklusfehler; höchstens `maxAttempts` Versuche                                                                                                           |
| Auslieferung einer Reparatur ohne offenen Pull Request für den Branch | neuer Pull Request nur bei `replacementPullRequestEnabled`, sonst Fehler „The managed pull request is no longer open and replacement pull requests are disabled.“ (GitHub-Provider)                                               |
| gleicher Fehlerfingerabdruck auf demselben Branch                     | innerhalb `cooldownMinutes` zurückgestellt                                                                                                                                                                                        |
| `attempt > maxAttempts`                                               | Stopp „Maximum repair attempts reached.“                                                                                                                                                                                          |
| `conflictSerializationEnabled`                                        | eine autonome Umsetzung mit überschneidender Änderungsfläche zu einer laufenden Auslieferung wird zurückgestellt                                                                                                                  |
| `reviewFeedbackEnabled`                                               | derzeit kein Verbraucher                                                                                                                                                                                                          |

Das Tagesbudget ist die Summe der Tokens aller Ausführungen mit Ursprung `agentic-delivery`, die am aktuellen UTC-Datum gestartet wurden, zuzüglich des angefragten Phasenbudgets. Die Phasenbudgets gehen zusätzlich als Richtwert in die Anfrage an den Agenten ein. Details der Schleife stehen in [Agentic Delivery](../agentic-delivery.md), die Auswahl der autonomen Arbeit in [Autonome Ausführung](../autonomous-execution.md), die Kommentarbefehle in [Remote-Automatisierung](../remote-automation.md).

### Arbeitsbereichswurzel wählen

1. Die Ordnerschaltfläche ruft `selectPath({ kind: 'directory', title: 'Choose managed execution root', defaultPath })` mit der aktuellen Wurzel als Vorgabe; der Dialog gehört zum anfragenden Fenster.
2. Ist inzwischen eine andere Einstellungssitzung aktiv, wird das Ergebnis verworfen.
3. Bei Abbruch oder ohne Pfad geschieht nichts; sonst `applyRuntime({ workspaceRoot })`.

### Inaktive Arbeitsbereiche aufräumen

1. Die Zeile erscheint nur, wenn `WORKSPACE_OPERATIONS` bereitgestellt ist; der Befehl ist sonst nicht ausführbar.
2. `SettingsAlertService.confirm` zeigt die Rückfrage (siehe unten). Nur die Primärschaltfläche führt fort.
3. `clearWorkspaces()` sendet `workspaces.clear`, ist während eines laufenden Aufräumens gesperrt und meldet aus `{ removed, missing, skipped, failed }`: bei `failed > 0` die Warnung `Workspace cleanup incomplete.`, sonst bei `removed > 0` `Workspace cleared.` beziehungsweise `Workspaces cleared.`, sonst `No inactive workspaces to clear.`; Details `<n> removed · <n> already absent · <n> active and skipped · <n> could not be removed`, soweit vorhanden. Ein Fehler meldet `Unable to clear managed workspaces.`. Danach wird der Speicherstand still aktualisiert.

## Suchbeiträge

Der Bereich selbst ist unter `Automation` auffindbar. Statische Einträge (ohne `loadControl`, daher öffnet **Open** den Bereich):

| Gruppe (Brotkrume nach `Automation ›`) | Einträge (`id` → Bezeichnung)                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Autonomous work`                      | `autonomous-execution` → Run autonomous work; `autonomous-work-interval` → Work interval (minutes); `max-parallel-executions` → Maximum parallel tasks; `conflict-serialization` → Serialize overlapping deliveries                                                                                                                  |
| `Fix failed checks`                    | `agentic-level` → Level (Schlüsselwörter `agentic delivery`, `ladder`, `ci repair`); `agentic-delivery-enabled`, `agentic-observe-failures`, `agentic-ai-diagnosis`, `agentic-ci-rerun`, `agentic-managed-branch-updates`, `agentic-source-repair`, `agentic-workflow-repair`, `agentic-replacement-pr` mit den Leiterbeschriftungen |
| `Fix failed checks › Budgets`          | `agentic-diagnosis-token-budget`, `agentic-repair-token-budget`, `agentic-daily-token-budget`, `agentic-max-attempts`, `agentic-max-parallel-repairs`, `agentic-cooldown` mit den Budgetbeschriftungen                                                                                                                               |
| `Address reviews`                      | `review-feedback` → Listen for pull-request review feedback                                                                                                                                                                                                                                                                          |
| `GitHub commands`                      | `github-commands` → Allow GitHub commands (Schlüsselwörter `@symphony`, `/symphony analyze`, `/symphony fix`, `/symphony retry`)                                                                                                                                                                                                     |
| `Execution`                            | `workspace-root` → Managed root; `board-refresh-interval` → Board refresh interval (minutes); `retain-failed-workspaces` → Retain failed execution workspaces; `verification-repair-attempts` → Verification repair attempts per run; `clear-workspaces` → Clear inactive workspaces                                                 |

## Rückfragen

| `id`                            | Titel                                | Nachricht                                                                                                  | Primär (gefährlich) | Abbrechen       |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------- | --------------- |
| `clear-workspaces-confirmation` | Clear inactive execution workspaces? | Running executions are preserved. Local uncommitted changes in inactive managed workspaces may be removed. | Clear workspaces    | Keep workspaces |

## Fehler und Wiederherstellung

| Fehlerfall                                        | Erkennung                                     | Öffentlicher Fehler                                                                   | Nebenwirkungen                             | Wiederherstellung                               |
| ------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| Speichern abgewiesen (Schema, Löschung, Local CI) | `settings.save` wirft                         | `Unable to save settings.` mit Grund                                                  | keine Persistenz                           | Entwurf zeigt gespeicherten Wert; erneut ändern |
| Einstellungen nicht geladen                       | kein gespeicherter Stand in der Warteschlange | keiner                                                                                | kein Schreibzugriff                        | Hydrierung lädt die Konfiguration               |
| Leere oder ungültige Zahl                         | Rohwertprüfung                                | keiner                                                                                | kein Speichern                             | gültige Zahl eingeben                           |
| Schalter ohne Voraussetzung einschalten           | `blocker` gesetzt                             | keiner (Schalter gesperrt, `Needs “…”`)                                               | keine                                      | Voraussetzung einschalten                       |
| Ordnerauswahl abgebrochen oder Sitzung gewechselt | Ergebnis `canceled` oder Sitzungsvergleich    | keiner                                                                                | kein Speichern                             | –                                               |
| Aufräumen abgelehnt                               | Rückfrage liefert `false`                     | keiner                                                                                | keine                                      | –                                               |
| Aufräumen teilweise oder ganz gescheitert         | Ergebnis `failed > 0` oder Ausnahme           | `Workspace cleanup incomplete.` beziehungsweise `Unable to clear managed workspaces.` | entfernte Arbeitsbereiche bleiben entfernt | erneut aufräumen                                |

## Implementierungsabbildung in Symphony

| Verantwortung                 | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                               | Beleg                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Bereichs- und Suchbeitrag     | `libs/frontend/features/automation/src/lib/provider/withAutomationSettings.ts`, `provideAutomationFeature.ts`                                                                                                                                                                                                            | `libs/frontend/setting/src/search/SettingsSearchIndex.spec.ts`                                                    |
| Ansicht                       | `libs/frontend/features/automation/src/lib/settings/AutomationPolicySettingsView.{ts,html,scss}`, `pipes/AgenticSwitchLabelPipe.ts`                                                                                                                                                                                      | `AgenticSwitchLabelPipe.spec.ts`                                                                                  |
| Presenter                     | `settings/AutomationPolicySettingsViewPresenter.ts`                                                                                                                                                                                                                                                                      | `AutomationPolicySettingsViewPresenter.spec.ts`                                                                   |
| Leitermodell                  | `state/agentic-ladder/{AgenticLadder,AgenticLevel,AgenticLevelSwitches,AgenticSwitch,IAgenticRung,agenticLevelOf,agenticSwitchBlocker,withAgenticLevel,withAgenticSwitch}.ts`                                                                                                                                            | `agenticLevelOf.spec.ts`, `agenticSwitchBlocker.spec.ts`, `withAgenticLevel.spec.ts`, `withAgenticSwitch.spec.ts` |
| Entwurf, Speichern, Aufräumen | `state/AutomationSettingsStore.ts`, `adapters/AutomationSettingsContext.ts`, `ports/IAutomationSettingsContext.ts`                                                                                                                                                                                                       | `AutomationSettingsStore.spec.ts`                                                                                 |
| Vorbereitungshinweis          | `state/RepositoryPreparationPolicy.ts`                                                                                                                                                                                                                                                                                   | `RepositoryPreparationPolicy.spec.ts`                                                                             |
| Settings-Schreiber            | `libs/frontend/core/src/state/ConfigurationStore.ts`                                                                                                                                                                                                                                                                     | –                                                                                                                 |
| Schema und Standardwerte      | `libs/configuration/composition/src/lib/application-settings/{ApplicationSettingsSchema,createDefaultApplicationSettings}.ts`, `libs/configuration/features/automation/src/lib/AgenticDeliveryPolicySchema.ts`, `libs/domain/features/automation/src/lib/model/{IAgenticDeliveryPolicy,DefaultAgenticDeliveryPolicy}.ts` | –                                                                                                                 |
| Speichern im Orchestrator     | `apps/orchestrator/src/composition/createSettingsRequests.ts`, `settings-background-synchronization/needsSettingsBackgroundSynchronization.ts`                                                                                                                                                                           | –                                                                                                                 |
| Zyklen und Auswertung         | `apps/orchestrator/src/features/automation/provideAutomationOrchestratorFeature.ts`, `libs/application/features/automation/src/lib/AutomationService.ts`, `libs/providers/github/src/lib/github-cloud-provider/GitHubCloudProvider.ts`                                                                                   | `AutomationService.spec.ts`                                                                                       |
| Aufräumen                     | `libs/frontend/features/workspace/src/lib/state/WorkspaceStore.ts` (`clearWorkspaces`)                                                                                                                                                                                                                                   | –                                                                                                                 |
| Ende-zu-Ende                  | `apps/renderer-e2e/src/agentic-delivery-settings.spec.ts`, `desktop.spec.ts`, `settings.spec.ts`                                                                                                                                                                                                                         | –                                                                                                                 |

## Verifikation und Akzeptanzkriterien

- Eine neue Konfiguration zeigt alle zehn Schalter aus und **Level** auf **Off**; **Observe failed actions** ist gesperrt mit `Needs “Enable agentic delivery”`; der Bereich hat keine Speichern-Schaltfläche.
- **Diagnose** speichert genau `enabled`, `observeFailures`, `aiDiagnosisEnabled`, `ciRerunEnabled` als `true` und die übrigen Leiterschalter als `false`; danach sind beide Reparaturen mit `Needs “Update managed pull-request branches”` und der Ersatz-Pull-Request mit `Needs “Repair source failures”` gesperrt.
- Ein einzelner Schalterwechsel aus einer Stufe zeigt **Custom**, sofern die Belegung keiner Stufe entspricht; **Custom** zu wählen speichert nichts.
- Aus **Full** schaltet das Ausschalten von **Update managed pull-request branches** beide Reparaturen und den Ersatz-Pull-Request ab und ergibt **Diagnose**; **Off** lässt Budgets, Review-Rückmeldung und Serialisierung unverändert.
- Ein gesperrter Schalter lässt sich nicht einschalten; `withSwitch` liefert dann dieselbe Richtlinie.
- `99` in **Maximum parallel tasks** wird als `32` gespeichert; ein leeres Feld speichert nichts.
- Ein gescheitertes Speichern stellt den gespeicherten Wert wieder her; zwei schnelle Änderungen ergeben zwei Speicherungen, deren zweite auf der ersten aufbaut.
- **Clear inactive workspaces** entfernt nichts ohne Bestätigung und ist ohne Arbeitsbereichsverwaltung nicht sichtbar.
- Ein Zahlenwechsel und ein Schalterwechsel melden jeweils `Settings saved.`; die fünf Befehle erscheinen als Code-Chips von `@symphony your instruction` bis `/symphony rerun-ci`.

## Offene Entscheidungen

- `reviewFeedbackEnabled` wird gespeichert und angezeigt, aber von keiner Orchestrierungskomponente gelesen; es gibt keine Erfassung von Review-Ereignissen. Ob der Schalter bis dahin sichtbar bleiben soll, ist nicht entschieden.
- Die Leiterabhängigkeiten sind eine Garantie der Oberfläche, nicht des Persistenzschemas. Ob `settings.save` eine ungültige Belegung normalisieren oder abweisen soll, ist nicht entschieden.

## Verwandte Dokumentation

- [Automation](../../project/automation/README.md)
- [Einstellungen im Hauptfenster](../window-and-navigation/settings.md)
- [Agentic Delivery](../agentic-delivery.md)
- [Autonome Ausführung](../autonomous-execution.md)
- [Remote-Automatisierung](../remote-automation.md)
- [Managed Local CI](../managed-local-ci.md)
- [Pull-Request-Bildschirm](../pull-requests/README.md)
- [Actions-Bildschirm](../actions/README.md)
- [System](../system/README.md)
- [Workspaces](../workspaces/README.md)
