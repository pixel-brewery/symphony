# Work-Item-Bildschirm

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der Work-Item-Bildschirm ist eine eigene Route des Hauptfensters, die ein Work Item mit seinen fünf Lieferstufen, Checks, Akzeptanzkriterien, Schritten, AI-Team-Übergabe, Aktivität und einem Inspektor darstellt und jede Mutation des Work Items anbietet. Er ersetzt das frühere Detail-Drawer `TaskDialogView` vollständig. Das funktionale Verhalten steht unter [Work-Item-Bildschirm](../../project/board/work-item.md).

Garantien:

- Die Route trägt die Work-Item-Id als genau ein URL-kodiertes Segment; Ids mit `/` oder `#` lösen auf genau ein Work Item auf und überstehen **Back** und **Forward**.
- Stepper und Board-Karte beruhen auf derselben Kartenprojektion (siehe [Board](README.md)); der Bildschirm kann keinen anderen Lieferstand zeigen als die Karte.
- Ein Akzeptanzkriterium ist nur erfüllt, wenn eine bestandene Verifikationsprüfung denselben Wortlaut trägt oder die Arbeit abgenommen ist. Nichts anderes setzt ein Häkchen; die Kriterien sind nicht von Hand änderbar.
- Ein Wert ohne Datengrundlage erscheint als `—` oder als ausdrücklicher Leerzustand, nie als erfundener Wert.
- Ein Befehl startet nur, was dieselbe Operation an anderer Stelle auch starten würde. Analyse und Umsetzung mit AI passieren immer die lokale Ausführungsfreigabe; Stufe, Skill, laufende Ausführung und fremde Koordination sperren die Schaltflächen, und die Start-Befehle prüfen diese Bedingungen erneut.
- Vom Provider abgelehnter Text (Kommentar, Bearbeitung) geht nicht verloren.
- Der Bildschirm führt keine neue IPC-Anfrage ein; er nutzt die vorhandenen Work-, Execution-, Workflow-, Publication- und CI-Operationen.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Route und Hydratisierung, Werkzeugleistenbeitrag, Projektionen für Stepper, Checks, Akzeptanzkriterien, Aktivität und Inspektor, Bearbeitungssitzung, Befehle und ihre Sperren, Fehler- und Leerzustände, Zuordnung der Fähigkeiten des früheren Drawers.
- Nicht enthalten: Board, Kartenprojektion, Board-Adressparameter wie `?item=` und `?process=true` ([Board](README.md)); das Sheet zum Anlegen ([Sheet „New work item“](new-work-item-sheet.md)); die Ausführung von Analyse, Umsetzung und Delegation im Orchestrator ([Ausführungslebenszyklus](../execution-lifecycle.md), [Agentic Delivery](../agentic-delivery.md)); der Fensterrahmen ([Fensterrahmen und Navigation](../window-and-navigation/README.md)).

## Verantwortungsgrenzen

| Verantwortung                              | Kanonischer Eigentümer                              | Vertrag                                                                                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route                                      | Work-Feature (`workRoutes`)                         | `board/:workItemId` lädt `WorkItemView` lazy; `board` bleibt das Board                                                                                                                                                                                                 |
| Zustand, Projektionen, Befehle             | `WorkItemViewPresenter`                             | Signale `workItem`, `notFound`, `column`, `stage`, `goal`, `executions`, `checks`, `cardState`, `stages`, `acceptanceCriteria`, `activity`, `inspectorAgent`, `currentSkill`, `health`; Befehle                                                                        |
| Formular                                   | `WorkItemForm` (geteilt mit dem Sheet)              | Modell `IWorkItemFormModel`, Pflichtfelder Titel und Repository, Provider-Metadaten, `toMutation(existing)`                                                                                                                                                            |
| Lieferstufen, Checks, Kriterien, Aktivität | reine Funktionen in `workItemDetail`                | `resolveWorkItemStages`, `resolveWorkItemChecks`, `resolveAcceptanceCriteria`, `resolveWorkItemActivity`                                                                                                                                                               |
| Kartenprojektion                           | `resolveBoardCardState` (Board)                     | `status`, `completedSteps`, `activeStep`, `blockedStep`                                                                                                                                                                                                                |
| Mutationen und Ladevorgänge                | `WorkStore`                                         | `loadWorkItemDetails`, `loadWorkItemMetadata`, `updateWorkItem`, `commentOnWorkItem`, `workItemsBusy`, `workItemCommentBusy`, `workItemMutationError`; Weitergabe an Execution- und Workflow-Operationen                                                               |
| Lokale Ausführungsfreigabe                 | `LocalExecutionApprovalService`                     | `request(item): '' \| false` (der Typ erlaubt zusätzlich `'once' \| 'repository'`, die derzeit nie geliefert werden)                                                                                                                                                   |
| CI-Befehle                                 | `WORK_CI_OPERATIONS` (optional)                     | `rerunCiRun`, `cancelCiRun`, `runCiLocally`, `cancelLocalCiRun`, `localCiEnabledFor`, `localCiRunningRunId`                                                                                                                                                            |
| Beschriftungen                             | reine Pipes des Work-Features und der UI-Bibliothek | `taskStatusPresentation`, `taskActionPresentation`, `taskEventPresentation`, `workItemCheckStatusLabel`, `workItemCheckDuration`, `goalStateLabel`, `skillFlowRoleLabel`, `ciRunStatusVariant`, `relativeTime`                                                         |
| Daten                                      | `WORK_TASK_CONTEXT`, `WORK_BOARD_CONTEXT`           | Snapshot (`workItems`, `executions`, `events`, `goals`, `workflow.stages`, `workItemReadiness`, `projectFields`, `boardColumns`, `pullRequests`, `ciRuns`), Einstellungen (`agentProfiles`, `agentTeams`, `repositoryBindings`, `deliveryContexts`, `workItemSources`) |

Produktfähigkeiten sind optional zusammengesetzt: `executionAvailable`, `workflowAvailable`, `publicationAvailable`, Skills-Katalog (`WORK_SKILLS_READ`) und CI (`WORK_CI_OPERATIONS`) können fehlen; der Bildschirm blendet die betroffenen Bereiche dann aus, statt gesperrte Hüllen zu zeigen.

## Route und Hydratisierung

1. Die Route `/main/board/:workItemId` liefert die Id als Signal aus `paramMap`.
2. `onHydrate` setzt die Sitzung zurück (Bearbeitung, Kommentarentwurf, Prompts, manuelle Texte, Eingabemodi auf `manual`) und hydratisiert das Board wie die Board-Route: vorhandenen Snapshot verwenden, sonst den Cache lesen, sonst die Provider-Projektion abwarten; danach im Hintergrund aktualisieren.
3. Fehlt die Id im Snapshot, markiert der Presenter die Id als hydratisiert; `notFound` wird wahr.
4. Sonst: Auswahl im `WorkStore` setzen, `work-items.detail` laden (vollständiges Work Item mit Diskussion), Kommentare zwischenspeichern, Formular mit dem gespeicherten Work Item füllen, Team (Team des Goals, sonst erstes Team des Workspace) und verantwortlichen Agenten (Agent des Goals, sonst erster passender Agent) vorbelegen, Ziel auf das Ziel des Goals oder den Titel setzen, dann `work-items.metadata` für Repository, Workspace und Quelle des Work Items laden.
5. Ändert sich nur die Id (Back, Forward, anderer Link), verwendet der Router die Komponente wieder; ein Effekt startet die Hydratisierung für die neue Id, damit nie das vorige Work Item stehen bleibt.

`notFound` ist `!isHydrating && hydratedId === workItemId && !workItem`. Verschwindet das Work Item später aus dem Snapshot, wechselt der Bildschirm daher ebenfalls in den Leerzustand. Bis das Work Item vorliegt, zeigt er ein Skelett (`task-loading-skeleton`).

Die Diskussion wird gesondert gehalten (`_loadedComments`), weil eine Board-Aktualisierung oder ein Speichern das Work Item als Zusammenfassung ohne Thread zurückliefert; `comments` ist `workItem.comments ?? loadedComments`.

## Werkzeugleiste

Der Bildschirm registriert seinen Beitrag über die Werkzeugleistenregistrierung des Fensters ([Werkzeugleistenregistrierung](../window-and-navigation/README.md#werkzeugleistenregistrierung)):

| Teil       | Wert                                                                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titel      | `externalId`, sonst `Work item`                                                                                                                                                                                                                                   |
| Untertitel | `Board · <Spaltenlabel \| Stufenlabel \| No column>`, ohne Work Item `Board`                                                                                                                                                                                      |
| Aktionen   | nur mit Work Item: Provider-Link (Tooltip `Open in GitHub` für `github-projects`, `Open in Azure DevOps` für `azure-devops`, sonst `Open work item`; nur mit `externalUrl`) und der Umschalter `Edit work item` / `Preview` (gesperrt während der Hydratisierung) |

Back und Forward gehören dem Fensterrahmen und folgen der Router-Historie ([Historie für Back und Forward](../window-and-navigation/README.md#historie-für-back-und-forward)).

## Projektionen

### Lieferstufen

`stages` entsteht aus der Kartenprojektion des Boards (`cardState`, berechnet aus Work Item, Workflow-Stufen, Ausführungen, Bereitschaft, `Needs you`-Zugehörigkeit, Pull Request und Lauf, fremder Koordination) und den Fakten des Work Items. Für den Index `i` der Stufen `analysis`, `solution`, `implementation`, `checks`, `acceptance` gilt:

| Bedingung                                                          | Zustand   |
| ------------------------------------------------------------------ | --------- |
| `i < completedSteps`                                               | `done`    |
| `i === blockedStep` und Kartenstatus `failed` oder `checks-failed` | `failed`  |
| `i === activeStep`                                                 | `current` |
| sonst                                                              | `pending` |

Ein `blockedStep` ohne Fehlerstatus (`waiting-for-you`) bleibt `current`. Zusatzfakten:

| Stufe            | Fakten                                                                                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analysis`       | Lauf: bei `done` die neueste abgeschlossene Analyse, sonst die neueste Analyse überhaupt (ein neuerer Versuch, der läuft oder scheiterte, wird benannt); `activity` = Laufzustand, Agent aus `bindingSnapshot.agentProfileId`, `manual` bei `mode === 'manual'`, `at` = Ende, sonst Start |
| `solution`       | `planVersion` = Version des Umsetzungsvertrags des Goals                                                                                                                                                                                                                                  |
| `implementation` | neuester Lauf `solution` oder `revision` mit denselben Lauffakten, dazu Pull-Request-Nummer und Branch                                                                                                                                                                                    |
| `checks`         | Anzahl gesamt, laufend (`queued` oder `in-progress`), fehlgeschlagen, erfolgreich aus der Check-Projektion                                                                                                                                                                                |
| `acceptance`     | keine                                                                                                                                                                                                                                                                                     |

Analysen sind Läufe ohne `kind` oder mit `kind === 'analysis'`; abgeschlossen ist eine Analyse mit `state === 'succeeded'`, Rolle `analysis` (oder ohne Rolle) und nicht leerer Zusammenfassung. Die Beschriftungen je Zustand stehen im Produkthandbuch.

### Checks

`resolveWorkItemChecks(pullRequest, branch, runs, report)`:

1. Quell-Branch = Branch des geladenen Pull Requests, sonst Branch des neuesten Umsetzungslaufs (`workspaceReference`).
2. Kandidaten sind Workflow-Läufe auf diesem Branch, mit Pull Request zusätzlich nur aus dessen Repository-Bindung.
3. Je Workflow (`workflowId`, sonst Name) gewinnt der Lauf mit dem jüngsten Zeitstempel (Start, sonst Ende). Ergebnis: Checks mit Quelle `workflow`, nach Name sortiert.
4. Gibt es keinen solchen Lauf, werden die Prüfungen des neuesten Verifikationsberichts des Goals zu Checks mit Quelle `verification` (`passed` → `succeeded`, sonst `failed`, Ende = Erfassungszeitpunkt des Berichts).
5. Ohne Branch, Pull Request und Bericht ist die Liste leer.

Der Abschnitt erscheint, wenn Checks existieren oder ein Pull Request referenziert ist. **View log** öffnet `externalUrl` des ersten laufenden oder eingereihten Workflow-Checks, sonst des ersten Checks. Die Dauer ist `—` ohne gültigen Start; ein laufender Check rechnet bis zur aktuellen Zeit (Takt 30 s); Ausgabe in `s`, `min` oder `h min`.

Die Laufaktionen stammen aus derselben Funktion wie das Pull-Request-Untermenü der Board-Karte (`resolveBoardPullRequestActions`) mit dem neuesten Lauf auf dem Pull-Request-Branch. Der Bildschirm entfernt `open` (der Inspektor verlinkt den Pull Request) und jede Aktion mit `blockedReason` (kein Lauf bekannt, Pull Request nicht geladen, lokaler Runner mit anderem Lauf beschäftigt). `remote` ruft `rerunCiRun` beziehungsweise bei laufendem oder eingereihtem Lauf `cancelCiRun` auf (Beschriftung `Stop run`), `local` ruft `runCiLocally` beziehungsweise `cancelLocalCiRun` auf; `local` existiert nur bei `localCiEnabledFor(workspaceId)`. Ohne Pull Request oder ohne CI-Feature gibt es keine Laufaktionen. Eine laufende Aktion sperrt alle (`isCheckActionBusy`).

### Akzeptanzkriterien

`resolveAcceptanceCriteria(workItemId, goal)` ist leer ohne Umsetzungsvertrag. Kriterien: `acceptanceCriteriaByWorkItem[workItemId]`, sonst `acceptanceCriteria` des Vertrags, in Planreihenfolge. `met` ist wahr, wenn `goal.state === 'achieved'` oder der neueste Verifikationsbericht eine Prüfung mit `state === 'passed'` und gleichem Label nach `trim` und `toLocaleLowerCase` enthält. Die Anzeige `n of m met` zählt `met`.

### Aktivität

`resolveWorkItemActivity(createdAt, events, comments)` vereinigt Ereignisse des neuesten Laufs (ohne `agent.progress` und `solver.progress`, nach `sequence` sortiert), Kommentare und – falls `createdAt` bekannt – die Eröffnung. Sortierung: neueste zuerst nach `Date.parse(at)`; bei Gleichstand gilt die Einfügereihenfolge Ereignisse, Kommentare, Eröffnung. Als Akteur eines Ereignisses mit Herkunft `agent` erscheint der arbeitende, sonst der verantwortliche Agent, sonst `Agent`; jede andere Herkunft erscheint als `Symphony`.

### Statuschip und Inspektor

Der Statuschip folgt `taskStatusPresentation` (Starten, fremde Instanz, ohne Lauf aus der Stufe: `Column is not mapped`, `Closed`, `Waiting for a decision`, `Ready to analyze`, `Waiting for implementation`, `<Stufe> runs no step`; mit Lauf `Analysis …`/`Solve …` je Laufzustand). Er unterscheidet sich bewusst vom Kartenstatus, weil er den Zustand des Schritts benennt.

| Inspektorfeld                          | Regel                                                                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Column                                 | Board-Spalte (`boardColumnId`), sonst Stufenlabel, sonst `No column`                                                                                                                                           |
| Agent                                  | `goal.executingAgentId`, sonst `goal.assignment.responsibleAgentId`, sonst Agent des neuesten Laufs; Punkt `Working now` bei Lauf `queued`, `running` oder `waiting`                                           |
| Skill                                  | Skill-Schnappschuss des neuesten Laufs mit `skillFlowRole` (sonst `analysis` beziehungsweise `solution` nach Laufart), sonst Analyse- oder Lösungsskill der Board-Metadaten, wenn die Stufe die Rolle ausführt |
| Pull request                           | Referenz des neuesten Umsetzungslaufs mit Check-Zusammenfassung; sonst `Create pull request`, wenn Publikation verfügbar ist und der Umsetzungslauf erfolgreich war                                            |
| Branch                                 | `workspaceReference` des neuesten Umsetzungslaufs; Link nur mit `pullRequest.branchUrl`                                                                                                                        |
| Repository, Assignee, Created, Changed | aus dem Work Item; Changed relativ zur aktuellen Zeit                                                                                                                                                          |

### Probleme und Reparaturen

`health` ruft die gemeinsame Work-Item-Inspektion mit Stufen, den Projektfeldern der Metadaten, den Ausführungen, der Bereitschaft und dem Spaltenlabel auf und liefert nur bei vorhandener Schwere ein Ergebnis. Solange der Bildschirm hydratisiert oder keine Metadaten vorliegen, entsteht kein Befund, weil die store-weiten Metadaten noch ein anderes Work Item beschreiben können. `Repair n field(s)` schreibt alle angebotenen Feldreparaturen in einer Aktualisierung; eine Reparatur setzt nur ableitbare Werte.

## Bearbeitungssitzung

| Zustand    | Eintritt                             | Anzeige                                                                            | Übergang                                                  |
| ---------- | ------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Lesen      | Hydratisierung, Speichern, Verwerfen | Titel und Markdown des gespeicherten Work Items                                    | `Edit work item` → Bearbeiten                             |
| Bearbeiten | Umschalter                           | Titel, Beschreibung, Projektfelder einschließlich Spaltenfeld, Labels, Zuweisungen | Umschalter → Vorschau; `Save changes`; `Cancel editing`   |
| Vorschau   | Umschalter in der Sitzung            | Titel und Beschreibung aus dem Formular (ungespeichert)                            | Umschalter → Bearbeiten; `Save changes`; `Cancel editing` |

`Save changes` ist nur bei vorhandenem Work Item, gefüllten Pflichtfeldern und ohne laufendes Speichern möglich und ruft `work-items.update` mit `toMutation(existing)` auf (Workspace, Quelle und Repository-Bindungen des bestehenden Work Items bleiben erhalten). Erfolg schließt die Sitzung; Misserfolg lässt sie offen. `Cancel editing` setzt das Formular auf das gespeicherte Work Item zurück.

## Befehle und Sperren

| Befehl                             | Voraussetzung                                                                                                                                                                         | Wirkung                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Entscheidung (`decideCommand`)     | Workflow verfügbar, Stufe `human-gate` mit Entscheidungen, kein laufender Schritt                                                                                                     | `decideWorkflow(workItemId, optionId)`                                                                                                          |
| Analyse (`startTaskCommand`)       | Execution verfügbar, kein Lauf, keine Warteschlange, kein Start im Gange, keine fremde Koordination, Stufe führt `analyze` aus; manuell: Text nicht leer; AI: Analyse-Skill vorhanden | manuell `completeManualAnalysis`; AI: Freigabe, dann `startAnalyzer(false, id, focus?, approval?)`                                              |
| Umsetzung (`startSolutionCommand`) | wie oben mit Rolle `solve` und abgeschlossener Analyse; AI: Lösungs-Skill und, wenn die letzte Umsetzung erfolgreich war, nicht leeres Feedback                                       | manuell `completeManualSolution`; AI: Freigabe, dann `startSolver(false, id, feedback?, approval?)`; fehlendes Feedback meldet eine Warnung     |
| Warteschlange entfernen            | Warteschlangeneintrag des Work Items                                                                                                                                                  | `removeQueueEntry(entryId)`                                                                                                                     |
| Lauf abbrechen                     | neuester Lauf `queued`, `running` oder `waiting`                                                                                                                                      | `cancelExecution(executionId)`                                                                                                                  |
| Delegieren                         | Execution verfügbar, Team und Agent gewählt                                                                                                                                           | `delegateWorkItem(id, teamId, agentId, objective)`                                                                                              |
| Prüfen                             | Goal im Zustand `reviewing`; `revision-required` verlangt Feedback                                                                                                                    | `reviewGoal(id, decision, message)`; nach erfolgreichem `revision-required` startet die Umsetzung im Modus AI mit dem Feedback (eigene Sperren) |
| Pull Request erstellen             | Publikation verfügbar, Umsetzungslauf `succeeded` mit Worktree-Pfad und Branch, noch ohne Pull Request, keine Veröffentlichung läuft                                                  | `publishPullRequest(executionId)`                                                                                                               |
| Reparieren                         | Reparaturen vorhanden, kein Lauf, keine Reparatur und kein Speichern im Gange                                                                                                         | alle Feldwerte setzen, `updateWorkItem`                                                                                                         |
| Kommentieren                       | Work Item vorhanden, Text nicht leer, kein Kommentar im Gange                                                                                                                         | `commentOnWorkItem(id, body)`; Erfolg ersetzt die zwischengespeicherte Diskussion und leert das Feld                                            |
| Skills öffnen                      | Skills-Katalog vorhanden                                                                                                                                                              | Navigation `/main/settings?section=skills`, die das Einstellungsfenster öffnet                                                                  |

Wählbare Agenten sind aktive Profile des Workspace des Work Items, eingeschränkt auf Primär- und Ersatzagenten der Zuweisungen des gewählten Teams. Wechselt das Team und passt der Agent nicht mehr, wird der erste passende Agent gewählt. Die Prüfnachricht ist `Goal approved from the task review.`, das Feedback oder `Revision required.` beziehungsweise `Goal blocked by the operator.`; `blocked` hat derzeit keine Schaltfläche.

Spracheingabe ist für den Analysefokus und das Feedback an den Solver verfügbar, wenn die Desktop-Spracherkennung vorhanden ist; sie hängt das Transkript an den Prompt an und wird beim Verlassen des Bildschirms abgebrochen.

### Lokale Ausführungsfreigabe

`LocalExecutionApprovalService.request(item)` liefert `false` (nichts starten) oder `''` (starten):

1. Ohne Work Item, Einstellungen oder Repository-Laufzeit: `false`.
2. Die Repository-Bindungen des Work Items müssen genau eine sein, sonst Warnung `Choose one repository.` / `Local AI execution requires one unambiguous repository binding.` und `false`.
3. Fehlt der Laufzeitstatus, wird er einmal aktualisiert; scheitert das, `false`.
4. Ist das Repository `unprepared`, fragt ein Nachrichtenfenster `Prepare <owner>/<name> locally?` (`Prepare locally` / `Cancel`, Escape schließt). Nur bei Zustimmung und erfolgreicher Vorbereitung geht es weiter.
5. Ergebnis `''`.

## Fehler und Wiederherstellung

| Fehlerfall                        | Erkennung                              | Öffentlicher Fehler                              | Nebenwirkungen                                                | Wiederherstellung                            |
| --------------------------------- | -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------- |
| Unbekannte Id                     | Id fehlt nach Hydratisierung           | Leerzustand `This work item is not on the board` | keine                                                         | `Back to board` navigiert nach `/main/board` |
| Details nicht ladbar              | `work-items.detail` scheitert          | Toast `Unable to load work-item details.`        | Bildschirm zeigt die Zusammenfassung ohne Diskussion          | erneut öffnen                                |
| Metadaten nicht ladbar            | `work-items.metadata` scheitert        | Toast `Unable to load work-item metadata.`       | Felder und Skills aus Metadaten fehlen oder sind veraltet     | erneut öffnen                                |
| Speichern abgelehnt               | `work-items.update` scheitert          | Toast `Unable to save the work item.` mit Grund  | `workItemMutationError` gesetzt; Sitzung und Eingaben bleiben | korrigieren und erneut speichern             |
| Kommentar abgelehnt               | `work-items.comment` scheitert         | Toast `Unable to publish the comment.`           | Text wird nach einem Frame wieder in das Feld gesetzt         | erneut senden                                |
| Fremde Instanz hält das Work Item | aktive Koordination ohne eigenen Claim | Banner mit Aktion und Konto                      | Analyse und Umsetzung gesperrt                                | auf der anderen Instanz fortsetzen           |
| Freigabe verweigert               | `request` liefert `false`              | Warnung oder keine                               | kein Lauf                                                     | Repository-Zuordnung prüfen, erneut starten  |
| Start abgelehnt                   | Operation liefert `false`              | Meldung der Execution-Schicht                    | kein Lauf                                                     | erneut starten                               |

Der Bildschirm zeigt keinen eigenen Hinweis auf eine nicht erreichbare Work-Item-Quelle; den Synchronisierungsstand tragen Board und Statusleiste.

## Zuordnung der Fähigkeiten von `TaskDialogView`

Das frühere Drawer (`TaskDialogView`, `TaskDialogViewPresenter`, `TaskDialogData` mit `{ mode: 'create' }` oder `{ mode: 'edit', workItemId }`, geöffnet über `DrawerService` mit 82 % Breite) ist entfernt. Jede Fähigkeit hat einen neuen Ort:

| Fähigkeit im Drawer                                                                                             | Neuer Ort                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Öffnen per Karte und `?item=`                                                                                   | Navigation auf `/main/board/<id>`; `?item=` ersetzt den Board-Eintrag in der Historie                                              |
| Modus `create` (Wahl manuell oder AI, Prompt, Agentwahl, Abbruch, Prüfen, `Start over`)                         | [Sheet „New work item“](new-work-item-sheet.md) mit `Write it myself` / `Draft with AI`                                            |
| Laden der Metadaten bei Repositorywechsel (`repositoryChangedCommand`)                                          | `WorkItemForm.selectRepository`                                                                                                    |
| Kopf mit Kennung, Branch, Repository und Status                                                                 | Werkzeugleistentitel, Chips (Status, Labels, Kennung · PR), Inspektor (Branch, Repository)                                         |
| Provider-Link (`Open in GitHub` …)                                                                              | Symbolschaltfläche in der Werkzeugleiste                                                                                           |
| Schließen (`closeCommand`, `task-drawer-close`)                                                                 | **Back** der Werkzeugleiste; im Sheet `Cancel` und Escape                                                                          |
| Problem-Banner und `Repair n field(s)`                                                                          | unverändert oben auf dem Bildschirm; Reparieren bleibt auf dem Bildschirm, statt mit `close: false` zu speichern                   |
| Banner fremder Instanz                                                                                          | unverändert oben                                                                                                                   |
| Lesen/Bearbeiten von Titel, Beschreibung, Feldern; `Preview`, `Cancel editing`, `Save changes`                  | Bearbeitungssitzung des Bildschirms mit Umschalter in der Werkzeugleiste; Speichern schließt nur die Sitzung, nicht den Bildschirm |
| Details (Repository, Status, Zuweisung, Erstellt/Geändert)                                                      | Inspektor und Statuschip                                                                                                           |
| Branch, `PR #n`, `Create pull request`                                                                          | Inspektor **Branch** und **Pull request**                                                                                          |
| Warteschlangenhinweis, `Remove from queue`, Fortschritt, `Cancel execution`                                     | Zeile unter dem Stepper                                                                                                            |
| `Checks` mit Verifikationsbericht                                                                               | Abschnitt **Checks** (Verifikationsprüfungen als Rückfall der Tabelle) und **Acceptance criteria**                                 |
| `Your decision` / `This work item waits for you`                                                                | Abschnitt **Your decision**                                                                                                        |
| `Step-by-step controls` (Analyse und Umsetzung, manuell oder AI, Fokus, Feedback, Spracheingabe, `Open Skills`) | Bereich **Steps** mit denselben Regeln                                                                                             |
| Ergebnisse `Analysis`, `Implementation`, `Task failed`                                                          | Karten **Analysis**, **Implementation**, **Run failed**                                                                            |
| `Assign to your AI team`, Prüfung, `Technical details`                                                          | Bereich **AI team** mit Auswahl, Prüfung und den Nachweiszeilen direkt darin                                                       |
| `Activity · n` mit Eröffnung, Ereignissen und getrennten Kommentaren; Kommentarfeld                             | **Activity** als eine nach Zeit sortierte Liste ohne Zähler; Kommentarfeld darunter                                                |
| Lokale Ausführungsfreigabe                                                                                      | `LocalExecutionApprovalService` (unverändert), auch für die Analyse nach dem Anlegen                                               |

Neu gegenüber dem Drawer sind der Stepper, die Check-Tabelle mit Laufaktionen, die Akzeptanzkriterien, die Inspektorfelder **Agent** und **Skill**, der Leerzustand für unbekannte Ids und die Wahl der Spalte sowie die Analyse beim Anlegen. Der Prozess-Drawer (`?process=true`) war nie Teil von `TaskDialogView` und bleibt beim Board.

## Implementierungsabbildung in Symphony

| Verantwortung                     | Aktueller Pfad oder Symbol                                                                                                                                             | Beleg                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route                             | `libs/frontend/features/work/src/lib/board/routing/WorkRoutes.ts`                                                                                                      | –                                                                                                                                                                      |
| Bildschirm                        | `libs/frontend/features/work/src/lib/board/views/WorkItemView.{ts,html,scss}`                                                                                          | `apps/renderer-e2e/src/ticket-detail-dialog.spec.ts`, `issue-create-edit.spec.ts`, `work-item-health.spec.ts`, `ticket-markdown.spec.ts`, `branch-publication.spec.ts` |
| Presenter                         | `libs/frontend/features/work/src/lib/board/view-presenters/WorkItemViewPresenter.ts`                                                                                   | `WorkItemViewPresenter.spec.ts`                                                                                                                                        |
| Formular und Felder               | `view-presenters/workItemForm/{WorkItemForm,IWorkItemFormModel,readEventText,readEventValue}.ts`, `components/WorkItemFieldsComponent.{ts,html}`                       | `WorkItemForm.spec.ts`                                                                                                                                                 |
| Detailprojektionen                | `view-presenters/workItemDetail/{resolveWorkItemStages,resolveWorkItemChecks,resolveAcceptanceCriteria,resolveWorkItemActivity}.ts`                                    | gleichnamige `*.spec.ts`                                                                                                                                               |
| Kartenprojektion und Laufaktionen | `view-presenters/boardCard/resolveBoardCardState.ts`, `view-presenters/boardPullRequestAction/resolveBoardPullRequestActions.ts`                                       | `resolveBoardCardState.spec.ts`                                                                                                                                        |
| Pipes                             | `pipes/{TaskStatusPresentationPipe,TaskActionPresentationPipe,TaskEventPresentationPipe,WorkItemCheckStatusLabelPipe,WorkItemCheckDurationPipe,GoalStateLabelPipe}.ts` | `WorkItemCheckDurationPipe.spec.ts`                                                                                                                                    |
| Store                             | `libs/frontend/features/work/src/lib/state/WorkStore.ts`                                                                                                               | `WorkStore.spec.ts`                                                                                                                                                    |
| Ausführungsfreigabe               | `services/{LocalExecutionApprovalService,LocalExecutionApproval}.ts`                                                                                                   | –                                                                                                                                                                      |
| Board-Hydratisierung              | `view-presenters/routeHydration/hydrateBoardRoute.ts`                                                                                                                  | –                                                                                                                                                                      |
| Früheres Drawer (entfernt)        | `views/dialogs/TaskDialogView.*`, `view-presenters/TaskDialogViewPresenter.ts`, `view-presenters/TaskDialogData.ts` im Stand des ersten Commits                        | –                                                                                                                                                                      |

## Verifikation und Akzeptanzkriterien

- Ein Klick auf eine Board-Karte zeigt `work-item-view` mit Titel `#<n>`, Untertitel `Board · <Spalte>`, Stepper, Inspektor und Aktivität; **Back** führt zum Board, **Forward** zurück zum selben Work Item.
- `#/main/board/does-not-exist` zeigt `work-item-not-found`; `Back to board` öffnet das Board.
- Ein Id-Wechsel bei wiederverwendeter Komponente lädt das neue Work Item, ohne das vorige zu zeigen.
- `Edit work item` → Eingaben → `Preview` zeigt den ungespeicherten Titel, `Save changes` und `Cancel editing` bleiben angeboten; `Cancel editing` stellt den gespeicherten Titel wieder her; `Save changes` mit geändertem Statusfeld zeigt danach `Board · <neue Spalte>`.
- Ein laufender Workflow-Check bietet `Stop run`, das `cancelCiRun` mit der Lauf-Id aufruft.
- Die Stufen folgen der Kartenprojektion; ein blockierter Schritt ist nur bei Fehlerstatus `failed`; eine abgeschlossene Lieferung zeigt fünf erledigte Stufen.
- Akzeptanzkriterien sind nur bei gleichlautender bestandener Prüfung oder abgenommenem Goal erfüllt; ohne Plan erscheint der Abschnitt nicht.
- Ein Work Item in einer Entscheidungsstufe zeigt keine Schritte, aber `task-no-step-available` und die Entscheidungen; nach der Freigabe stehen Analyse-Schritte zur Verfügung.
- Manuelle Analyse und Umsetzung erzeugen Läufe mit `mode: 'manual'` ohne Skill und ohne Worktree.
- Ein abgelehnter Kommentar steht danach wieder im Feld; ein angenommener erscheint in der Aktivität und leert das Feld.
- Problem-Banner scrollen mit dem Bildschirm und sind vollständig lesbar.

## Verwandte Dokumentation

- [Work-Item-Bildschirm (Produkthandbuch)](../../project/board/work-item.md)
- [Board](README.md)
- [Sheet „New work item“](new-work-item-sheet.md)
- [Fensterrahmen und Navigation](../window-and-navigation/README.md)
- [Pull-Request-Bildschirm](../pull-requests/README.md)
- [Workflow-Modell](../workflow-model.md)
- [Ausführungslebenszyklus](../execution-lifecycle.md)
- [Lokale Repository-Verifikation](../local-repository-verification.md)
