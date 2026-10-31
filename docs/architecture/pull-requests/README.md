# Pull-Request-Bildschirm

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der Bildschirm **Pull requests** projiziert die offenen Pull Requests des Workspace-Umfangs, ihre Workflow-Läufe und die Ausführungen, die sie veröffentlicht haben, in eine segmentierte Tabelle mit einem Inspektor. Das funktionale Verhalten steht im Produkthandbuch unter [Pull Requests](../../project/pull-requests/README.md). Der Bildschirm liest ausschließlich vorhandene Projektionen und löst ausschließlich vorhandene Befehle aus; er führt keine neue IPC-Anfrage ein.

Garantien:

- Ein Wert ohne Datengrundlage erscheint als `—`, nie als `0`, `Passed` oder `Mergeable`.
- Segmentzahlen, Tabellenzeilen und Inspektor beruhen auf derselben Zeilenprojektion; der Inspektor zeigt nie einen Pull Request, der unter den aktiven Filtern nicht sichtbar ist.
- **Repair with AI** startet nur, wo die Agentic-Delivery-Richtlinie der AI die Quellreparatur selbstständig erlauben würde. Die Schaltfläche erweitert keine Berechtigung und umgeht keine Prüfung des Solvers.
- Der GitHub-Synchronisierungsstand gehört der Statusleiste; der Bildschirm zeigt nur den handlungsfähigen Fehlerfall mit **Retry**.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Werkzeugleistenbeitrag, Segmente, Tabelle, Inspektor, Kontextmenü, Filtermenü, Sheet zum Anlegen, Adressparameter, Fehler- und Leerzustände.
- Nicht enthalten: das Laden und Überlagern der Pull-Request-Projektion im Orchestrator, die Agentic-Delivery-Schleife ([Agentic Delivery](../agentic-delivery.md)), lokale CI ([Managed Local CI](../managed-local-ci.md)) und der Fensterrahmen ([Fensterrahmen und Navigation](../window-and-navigation/README.md)).

## Verantwortungsgrenzen

| Verantwortung                      | Eigentümer                                         | Vertrag                                                                                                                                                                                                                                       |
| ---------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zustand, Projektionen, Befehle     | `PullRequestsViewPresenter` im Delivery-Feature    | Signale `rows`, `visibleRows`, `segmentCounts`, `selectedRow`, `repairBlock`; Befehle                                                                                                                                                         |
| Zeilenprojektion                   | reine Funktionen in `pullRequestRowPresentation`   | `resolvePullRequestChecks`, `summarizePullRequestChecks`, `resolvePullRequestMergeState`, `resolvePullRequestDelivery`, `resolvePullRequestRow`, `isPullRequestInSegment`, `resolvePullRequestRepairBlock`, `composePullRequestRepairRequest` |
| Beschriftungen, Varianten, Symbole | reine Pipes des Delivery-Features                  | `pullRequestChecksVariant`, `pullRequestMergeStateLabel`, `pullRequestMergeStateVariant`, `pullRequestCheckIcon`, `checkDuration`                                                                                                             |
| Daten                              | `DELIVERY_VIEW_CONTEXT` (die Anwendungsprojektion) | Snapshot: `pullRequests`, `ciRuns`, `localCiExecutions`, `executions`, `workItems`, `remoteData`; Einstellungen: `repositoryBindings`, `ciBindings`, `agentProfiles`, `runtime.agenticDelivery`                                               |
| CI-Befehle                         | `DELIVERY_CI_OPERATIONS` (optional)                | erneut ausführen, abbrechen, lokal ausführen, lokalen Lauf stoppen                                                                                                                                                                            |
| Branch-Aktualisierung              | `PullRequestStore`                                 | `updatePullRequestBranch`, gemeinsame Sperre `pullRequestBranchUpdatingId`                                                                                                                                                                    |
| AI-Reparatur                       | `EXECUTION_OPERATIONS` (optional)                  | `startSolver(false, workItemId, feedback)`                                                                                                                                                                                                    |

## Zeilenprojektion

Für jeden Pull Request entsteht eine Zeile aus vier Teilen.

**Checks.** Aus allen Workflow-Läufen desselben Repositories auf dem Quell-Branch wird je Workflow (`workflowId`, sonst Name) der neueste Lauf (Startzeit, sonst Endzeit) gewählt. Sein Zustand ist das neueste Ergebnis unter dem GitHub-Lauf, den lokalen Ausführungen dieses Laufs und dem gerade aktiven lokalen Lauf; die Quelle wird als `cloud` oder `local` mitgeführt. Sortierung: fehlgeschlagen, laufend, wartend, abgebrochen, erfolgreich, innerhalb der Gruppe nach Name. Ohne CI-Feature ist die Liste leer.

**Zusammenfassung.** Keine Checks ergeben `none`; mindestens ein Fehlschlag `failing` mit Anzahl und Namen; sonst ein wartender oder laufender Check `running`; sonst ausschließlich erfolgreiche Checks `passed`; sonst `cancelled`.

**Merge-Zustand.** Nicht offene Pull Requests behalten `merged` oder `closed`. Ein Entwurf ist `draft`. Sonst bestimmt der Basisstatus: `conflicting` → `conflict`, `behind` → `behind`, `current` → `ready` bei `passed`, sonst `mergeable`; `unknown` oder fehlend → `unknown` (`—`). Freigaben durch Reviewer liegen nicht vor und fließen nicht ein.

**Auslieferung.** Die neueste Ausführung, deren `pullRequest.externalUrl` gleich der URL des Pull Requests ist oder deren Nummer gleich ist und deren Bindungsschnappschuss das Repository enthält, bestimmt das Work Item. Schlüssel: `externalId` aus dem Snapshot, sonst aus dem Work-Item-Schnappschuss der Ausführung. Agent: Profil der neuesten Ausführung dieses Work Items mit `agentProfileId`. Reparatur: neueste Ausführung mit Flussrolle `ci-diagnosis` oder `ci-repair`. `active` ist wahr, solange eine Ausführung des Work Items `queued`, `running` oder `waiting` ist. Ohne veröffentlichende Ausführung gibt es kein Work Item, keinen Agenten und keine Reparatur.

`needsAction` ist wahr bei `failing`, `conflict` oder `behind`.

## Segmente, Filter und Auswahl

| Segment        | Regel                                   |
| -------------- | --------------------------------------- |
| `open`         | `state === 'open'` (Entwürfe inklusive) |
| `needs-action` | offen und `needsAction`                 |
| `drafts`       | offen und `draft`                       |

Segmentzahlen zählen alle Zeilen ohne Filter. Sichtbare Zeilen erfüllen das Segment und alle Filter (Autor, Zustand nach `pullRequestStateOf`, Basisstatus, Suchbegriff über Nummer, Titel, Autor, Branches und Zustand) und sind nach der gewählten Sortierung geordnet. Der Inspektor zeigt die ausgewählte sichtbare Zeile, sonst die erste sichtbare.

| Adressparameter | Wirkung                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `view`          | `needs-action` oder `drafts`; jeder andere oder fehlende Wert bedeutet `open`. Die Segmentwahl schreibt ihn (`open` entfernt ihn). |
| `pullRequest`   | wählt die Zeile mit dieser Id aus                                                                                                  |
| `state`, `base` | Filter, wie die Übersicht sie übergibt                                                                                             |
| `q`             | kontextbezogene Suche                                                                                                              |
| `create=true`   | öffnet das Sheet zum Anlegen und entfernt den Parameter                                                                            |

**Reset all filters** leert Autor, Zustand, Basis und Suche, nicht aber Segment und Sortierung.

## AI-Reparatur

`resolvePullRequestRepairBlock` liefert in dieser Reihenfolge: `unavailable` ohne Ausführungsfeature; `not-delivered` ohne Work Item; `policy`, wenn keine aktivierte CI-Anbindung desselben Workspaces und Repositories `agenticDeliveryEnabled` trägt oder `runtime.agenticDelivery` nicht gleichzeitig `enabled`, `sourceRepairEnabled` und `managedBranchUpdatesEnabled` erlaubt; `busy`, solange das Work Item aktiv ist; sonst keinen Grund. Die Schaltfläche erscheint nur bei `failing` und ist bei einem Grund gesperrt. Der Befehl prüft dieselben Bedingungen erneut, setzt `repairingPullRequestId` als Sperre gegen Doppelstarts und ruft `startSolver` mit einer Anfrage auf, die Nummer, Quell-Branch und Namen der fehlgeschlagenen Checks nennt. Der Orchestrator setzt die Revision auf dem beibehaltenen Implementierungs-Branch fort und prüft Stufe, Analyse, Lösungsskill, Iterationsgrenze und Freigabe der lokalen Ausführung wie bei jeder anderen Revision; Fehler meldet die Ausführungsschicht als Hinweis.

## Weitere Befehle

- **Refresh** und **Retry** rufen dieselbe Routenhydrierung auf und setzen währenddessen `isRefreshing`: Bootstrap abwarten, dann den Snapshot und danach die Workflow-Läufe aktualisieren. Die Läufe kommen zuletzt, weil eine Snapshot-Aktualisierung die ganze Projektion ersetzt und sonst die frischeren Läufe überschreiben würde, aus denen die Checks stammen.
- **Run checks locally** führt den ersten fehlgeschlagenen Check aus, sonst den neuesten Lauf des Branches; sie erscheint nur bei erlaubter lokaler CI und ist gesperrt, solange der lokale Runner einen anderen Lauf ausführt.
- **Update branch** ist nur bei `behind` möglich und durch die gemeinsame Sperre des `PullRequestStore` exklusiv.
- **New pull request** öffnet `PullRequestCreateDrawerView` über den `DialogService` als modales Sheet von 640 px Breite mit Kopf (`mosaik-dialog-header`), Inhalt und Fußzeile; ein zweiter Aufruf fordert Aufmerksamkeit für das offene Sheet an. Klicks außerhalb schließen nicht, **Escape** und **Cancel** schon. Der Mosaik-Dialog zentriert sich im Fenster; eine Verankerung direkt unter der Werkzeugleiste bietet seine öffentliche API nicht.

## Fehlerfälle

Ist `remoteData.pullRequests.state` nicht `current`, erscheint ein Hinweis mit Grund (`rate-limited`, `authentication-required`, `stale`, sonst nicht verfügbar), dem letzten erfolgreichen Abgleich und gegebenenfalls `retryAt` sowie **Retry**. Die zuletzt bekannte Projektion bleibt sichtbar.

## Abnahmekriterien

- Unit-Tests der Zeilenprojektion, der Dauer-Pipe und des Presenters (`PullRequestsViewPresenter.spec.ts`) decken Segmente, Adressparameter, Auswahl, Richtlinienprüfung der AI-Reparatur und die Aktualisierungssperre ab.
- Die End-to-End-Tests `pull-request-conflict-surface`, `pull-request-create`, `pull-requests-actions`, `branch-publication` und `collection-page-chrome` prüfen Basisstatus samt Aktualisierung, Segmentwechsel mit Adresse, Entwürfe, Inspektor, Kontextmenü, Werkzeugleistenbeitrag und Laufpanel.
