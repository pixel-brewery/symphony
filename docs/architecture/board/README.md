# Board

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Das Board projiziert die Work Items des gewählten Workspace-Umfangs in die Spalten ihrer Tracker und macht drei Dinge ohne Öffnen sichtbar: was einen Menschen braucht, woran gerade ein Lauf arbeitet und wie weit jedes Work Item auf seinem Auslieferungsweg ist. Es ist zugleich die Bedienfläche für Verschieben, Starten von Stufenschritten, Zuweisen, Pull-Request-Aktionen, das Anlegen neuer Work Items und das Bündeln zu Auslieferungsgruppen. Das funktionale Verhalten beschreibt [Board](../../project/board/README.md). Der [Work-Item-Bildschirm](work-item.md) und das [Sheet zum Anlegen](new-work-item-sheet.md) haben eigene Verträge.

Garantien:

- Spalten kommen ausschließlich vom Tracker. Symphony erzeugt keine Workflow-Stufen-Spalten; das einzige synthetische Ziel ist **No column** für Work Items ohne Trackerspalte und existiert nur, solange es solche Work Items gibt.
- Segmentzahlen, Seitenleistenzahl und Kartenstatus beruhen auf denselben Mengen: Das Segment `Needs you`, die Zahl neben **Board** in der Seitenleiste und die Kartenstatus `Waiting for you`/`… failed` verwenden dieselbe Funktion; `Agents running` umfasst genau die Work Items, deren neueste Ausführung `running` oder `waiting` ist.
- Verschieben über das Kartenmenü zielt immer auf eine Spalte des eigenen Boards. Der Tracker ist für die Annahme autoritativ; ein abgelehntes Verschieben stellt die Karte wieder her.
- Ein Menüeintrag, der nicht ausführbar ist, bleibt sichtbar, gesperrt und nennt den Grund. Das Board startet keinen Schritt, den der Orchestrator nach demselben Regelwerk ablehnen würde, und umgeht keine Bestätigung.
- Je Karte und je Gruppe läuft höchstens eine Mutation gleichzeitig.
- Spaltenwahl des Bedieners hat Vorrang vor jeder Voreinstellung und jeder automatischen Aufklappung.
- Der Bildschirm liest ausschließlich die vorhandene Orchestrierungsprojektion und ruft vorhandene Operationen auf (`work-items.move`, `work-items.update`, `work-items.metadata`, Gruppen-, Ausführungs-, Workflow- und CI-Operationen).

## Geltungsbereich und Nicht-Ziele

- Enthalten: Werkzeugleistenbeitrag, Filterleiste mit Segmenten, Repository-Chip und Filtermenü, Spaltenlayout und Einklappen, Karten- und Stapelprojektion, Kartenmenü, Verschieben per Ziehen und Menü, Mehrfachauswahl und Auslieferungsgruppen auf dem Board, Einstieg in das Anlegen, Adressparameter, Lade-, Fehler- und Leerzustände.
- Nicht enthalten: der Work-Item-Bildschirm (`/main/board/:workItemId`), das Sheet zum Anlegen, das Laden und Abgleichen der Work Items im Orchestrator, die Workflow-Engine ([Workflow-Modell](../workflow-model.md)), die Agentic-Delivery-Schleife ([Agentic Delivery](../agentic-delivery.md)), die Seitenleistenzählung ([Fensterrahmen und Navigation](../window-and-navigation/README.md)) und das mobile Board der Begleit-App.

## Verantwortungsgrenzen

| Verantwortung                                    | Kanonischer Eigentümer                                                       | Öffentlicher Vertrag                                                                                                                                                  | Verbraucher                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Board-Umfang (Boards, aktives Board, Work Items) | Anwendungsprojektion                                                         | `availableBoards`, `activeBoard`, `scopedWorkItems`, `creationBoard`, `canCreateWorkItem`                                                                             | Board, Overview, Befehlspalette |
| Board-Wahl                                       | Workspace-Auswahl                                                            | `selectBoard(sourceId \| undefined)` schreibt `activeViewScope.workItemSourceId` in die Einstellungen                                                                 | Board                           |
| Spaltenlayout                                    | reine Funktion im Frontend-Kern                                              | `resolveBoardColumnLayout(providerColumns, selectedSourceId, items)` → `{ columns, columnIdFor, providerColumnFor }`                                                  | Board, Overview                 |
| Mengen `Needs you` und `Agents running`          | reine Funktionen im Frontend-Kern                                            | `workItemIdsNeedingAttention`, `workItemIdsInProgress`                                                                                                                | Board, Seitenleiste, Overview   |
| Bildschirmzustand, Filter, Auswahl, Befehle      | Board-Presenter                                                              | Signale und Befehle (siehe Implementierungsabbildung)                                                                                                                 | Board-Ansicht, Karteneintrag    |
| Sitzungsweite Filter                             | `WorkFilterStore` (`WORK_FILTERS`)                                           | `query`, `label`, `columnId`, `stageId`                                                                                                                               | Board, Orbit                    |
| Kartenzustand                                    | reine Funktion `resolveBoardCardState`                                       | `IBoardCardState`                                                                                                                                                     | Board-Presenter                 |
| Statusbeschriftung                               | reine Pipe `boardCardStatusPresentation`                                     | Label, Erscheinung, Variante, Symbol                                                                                                                                  | Karteneintrag                   |
| Stufenschritte                                   | Domänenfunktion `resolveWorkItemActions`                                     | `IWorkItemAction[]`; Board ergänzt Symbol, Variante und Sperrgrund                                                                                                    | Board, Work-Item-Bildschirm     |
| Pull-Request-Aktionen                            | reine Funktionen `resolveBoardPullRequest`, `resolveBoardPullRequestActions` | Kontext aus veröffentlichender Ausführung; Aktionen `open`, `remote`, `local`                                                                                         | Board                           |
| Spaltenwahl des Bedieners                        | `BoardColumnCollapseStore`                                                   | `isExpanded(columnId, expandedByDefault)`, `setExpanded(columnId, isExpanded)`; Persistenz im Browser-Speicher                                                        | Board-Presenter                 |
| Work-Item-Mutationen                             | `WorkStore`                                                                  | `moveWorkItem`, `moveDeliveryGroup`, `alignDeliveryGroup`, `updateWorkItem`, `loadWorkItemDetails`, `loadAssignableUsers`, Gruppenoperationen, Ausführungsoperationen | Board, Work-Item-Bildschirm     |
| Sheet zum Anlegen                                | `NewWorkItemSheet`                                                           | `open({ columnId?, stageId? })`, einzelne Instanz                                                                                                                     | Board, Befehle, Overview        |

Abhängigkeiten zeigen vom Board zu diesen Eigentümern. Ausführung, Workflow, Veröffentlichung und CI sind optionale Feature-Ports: Fehlt ein Feature im Produkt, entfallen seine Menüeinträge (`decide` ohne Workflow, `publish-pull-request` ohne Veröffentlichung, `analyze`/`solve`/`cancel`/`dequeue` ohne Ausführung, Pull-Request-Läufe ohne CI, **Show process** ohne Workflow).

## Datenquellen und Umfang

Das Board liest aus der Orchestrierungsprojektion: `workItems`, `boardColumns`, `projectFields`, `remoteData.workItems`, `executions`, `events`, `workflow` (Stufen und `initialStageId`), `workItemReadiness`, `deliveryGroups`, `deliveryGroupProposals`, `pullRequests`, `ciRuns`; aus den Einstellungen `workspaces`, `activeViewScope`, `connections`, `agentProfiles`; aus der Ausführung die Warteschlange.

| Begriff             | Regel                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `availableBoards`   | aktivierte Work-Item-Quellen der gewählten Workspaces, sortiert nach Workspace-Reihenfolge, dann Anzeigename                                     |
| `activeBoard`       | das Board mit `activeViewScope.workItemSourceId`, sonst keines (alle Boards zusammengeführt)                                                     |
| `scopedWorkItems`   | Work Items der gewählten Workspaces (Work Items ohne Workspace nur, wenn genau ein Workspace existiert), bei aktivem Board nur dessen Work Items |
| `creationBoard`     | aktives Board, sonst das einzige Board im Umfang                                                                                                 |
| `canCreateWorkItem` | `creationBoard` existiert, oder genau ein Workspace ist gewählt und hat kein Board (simulierter Tracker)                                         |

Der Werkzeugleistenbeitrag zeigt den Titel `Board`, als Untertitel `<Workspace-Namen, kommagetrennt> · <Anzahl scopedWorkItems> work items` (ohne gewählten Workspace `Select a workspace to load its work items.`, während des Ladens leer) und **Refresh work items and build runs**.

## Spaltenlayout

`resolveBoardColumnLayout` liefert die sichtbaren Spalten und zwei Zuordnungen:

1. Mit gewähltem Board: dessen Trackerspalten in Trackerreihenfolge.
2. Ohne gewähltes Board: Spalten aller Boards, zusammengeführt nach Schlüssel `stageId`, sonst `label:<Name klein, getrimmt>`. Eine zusammengeführte Spalte nimmt je Board höchstens eine Trackerspalte auf; sie trägt Id, Name und Stufe der ersten. Weitere Spalten desselben Boards mit gleichem Schlüssel werden eigene Spalten.
3. `columnIdFor(item)` bildet die Trackerspalte des Work Items auf die sichtbare Spalte ab; ohne bekannte Spalte `symphony:unassigned`. Gibt es mindestens ein solches Work Item, wird die Spalte `{ id: 'symphony:unassigned', label: 'No column' }` angehängt.
4. `providerColumnFor(item, columnId)` liefert die Trackerspalte desselben Boards innerhalb der sichtbaren Spalte. Melden die Spalten kein Board (simulierter Tracker), gilt die erste; sonst ist eine Spalte eines anderen Boards kein Ziel.

Verschiebeziele eines Work Items sind alle sichtbaren Spalten außer **No column**, für die `providerColumnFor` eine Spalte liefert, in Boardreihenfolge. **Move forward**/**Move backward** sind die Nachbarn der aktuellen Spalte in dieser Liste; an den Rändern entfällt der Name und der Eintrag ist gesperrt.

## Filterpipeline

`filteredWorkItems` filtert `scopedWorkItems` in dieser Reihenfolge; jede Bedingung ist nur aktiv, wenn gesetzt:

1. Segment `attention`: Id in der `Needs you`-Menge.
2. Segment `running`: Id in der `Agents running`-Menge.
3. Segment `mine`: eine zuständige Person, deren Login (klein) in `viewerLogins` liegt.
4. Repository-Chip: `item.repository` gleich dem gewählten Repository.
5. Stufe (sitzungsweit, aus Orbit): `item.stageId` gleich.
6. Label: in `item.labels`.
7. Zuständige Person: Login gleich.
8. Suche: der klein geschriebene, getrimmte Suchtext ist Teilzeichenkette der Verkettung aus `externalId`, Titel, Beschreibung, Repository, Implementierungs-Branch (Branch der neuesten Lösung oder Revision mit Arbeitsbereich), Suchtext der Projektfelder, Labels sowie Login und Anzeigename jeder zuständigen Person.

Die Spaltenfilterung wirkt nicht auf die Menge, sondern auf die gerenderten Spalten: Mit gesetzter Spalte wird nur diese gezeichnet. Spaltenzahlen zählen gefilterte Work Items einschließlich der Mitglieder gestapelter Gruppen.

`viewerLogins` sind die getrimmten, klein geschriebenen `accountLogin` aller GitHub-Verbindungen der gewählten Workspaces (ohne Workspace-Auswahl aller Verbindungen). `Mine` ist nur wählbar, wenn die Menge nicht leer ist; wird sie leer, fällt das Board auf `All` zurück.

Abgeleitete Optionen: Labels und Repositories sind die sortierten (ohne Groß-/Kleinschreibung) Werte der `scopedWorkItems`; zuständige Personen nach Anzeigename, sonst Login. Verschwindet ein gewählter Wert aus diesen Optionen, setzt das Board die Einschränkung zurück; eine gewählte Spalte nur, wenn Spalten geladen sind und sie fehlt.

`hasActiveFilters` umfasst Suche, Label, Person, Spalte, Repository, Segment ungleich `all` und Stufe. Die Zahl an **Filter** zählt nur Spalte, Label und Person.

Lebensdauer: Segment, Repository und Person gehören dem Presenter und gelten, solange der Bildschirm offen ist. Suche, Label, Spalte und Stufe gehören `WorkFilterStore`, sind anwendungsweit und teilen sich Board und Orbit für die Sitzung.

## Segmente

| Segment     | Menge                                                                                                                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `all`       | keine Einschränkung                                                                                                                                                                                                                                                                    |
| `attention` | `workItemIdsNeedingAttention(scopedWorkItems, executions, { stages, fields, readiness })`: neueste Ausführung (nach `startedAt`) `failed`, oder `inspectWorkItem(...).severity === 'blocker'` (fehlende oder nicht bereite Analyse, kritische Risikoklasse, offene harte Abhängigkeit) |
| `running`   | `workItemIdsInProgress`: neueste Ausführung des Work Items `running` oder `waiting`; `queued` zählt nicht. Nur die `workItemId` der Ausführung zählt, also bei einer Gruppe die führende Karte                                                                                         |
| `mine`      | siehe Filterpipeline                                                                                                                                                                                                                                                                   |

Segmente schließen sich gegenseitig aus. Die Beschriftung lautet `Needs you · n` beziehungsweise `Agents running · n`, wenn die Menge über den ganzen Umfang (ohne Filter) nicht leer ist, sonst ohne Zahl. `Mine` ist ohne `viewerLogins` gesperrt und trägt den Tooltip `Sign in to GitHub in the workspace settings to see the work assigned to you.`.

## Spalten einklappen

Entscheidung je Spalte:

```text
standardmäßig_eingeklappt := Spaltenstufe ist initialStageId
                             oder Stufe.kind == 'terminal'
                             oder Stufe.roles enthält 'analyze' und nicht 'solve'
eingeschränkt := Suche ≠ '' oder Segment ≠ all oder Label oder Person oder Spalte oder Stufe
standard_aufgeklappt := nicht standardmäßig_eingeklappt
                        oder (eingeschränkt und gefilterte Work Items der Spalte > 0)
aufgeklappt := false, wenn Spalte in collapsedIds
               true,  wenn Spalte in expandedIds
               sonst standard_aufgeklappt
```

Spalten ohne Stufe (auch **No column**) sind standardmäßig aufgeklappt. Der Repository-Chip zählt nicht als Einschränkung. Im ausgelieferten Ablauf sind `Backlog` (Anfangsstufe), `Qualified` (nur `analyze`) und `Done` (`terminal`) standardmäßig eingeklappt.

`setExpanded(columnId, true)` entfernt die Id aus `collapsedIds` und fügt sie `expandedIds` hinzu, `false` umgekehrt; ein unveränderter Zustand schreibt nichts. Beim Einklappen verlassen die gefilterten Work Items dieser Spalte die Auswahl.

Persistenzvertrag (Browser-`localStorage` des Renderers; ohne verfügbaren Speicher nur im Speicher):

| Schlüssel                  | Inhalt                                                             | Bedeutung                         |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| `board.collapsedColumnIds` | JSON-Array von Spalten-Ids, etwa `["ready","symphony:unassigned"]` | ausdrücklich eingeklappte Spalten |
| `board.expandedColumnIds`  | JSON-Array von Spalten-Ids                                         | ausdrücklich aufgeklappte Spalten |

Lesen: fehlender Wert, ungültiges JSON oder Nicht-Array ergibt eine leere Menge; Nicht-String-Einträge werden verworfen. Beide Schlüssel werden bei jeder Änderung vollständig geschrieben. Der ältere Schlüssel `board.collapsedColumnIds` behält seine Bedeutung, frühere ausdrückliche Einklappungen gelten daher weiter; der neue Schlüssel nimmt Aufklappungen standardmäßig eingeklappter Spalten auf. Stehen beide Einträge für eine Id, gewinnt das Einklappen. Die Ids gelten anwendungsweit, nicht je Workspace oder Board.

## Kartenprojektion

`resolveBoardCardState` erhält je Work Item: Stufen in Prozessreihenfolge, alle Ausführungen, Bereitschaft (`analysisStored`, `readyForSolve`), ob es in `Needs you` liegt, den Pull-Request-Kontext samt aufgelöstem Lauf, eine fremde Koordination und den Spaltennamen sowie den Agentennamen.

**Avatar:** Anzeigename des Agentenprofils (`bindingSnapshot.agentProfileId`) der neuesten Ausführung, sonst erste zuständige Person (Anzeigename oder Login, Avatar-URL), sonst keiner.

**Erledigte Schritte** (0–5; Schritte `Analysis`=0, `Solution`=1, `Implementation`=2, `Checks`=3, `Acceptance`=4):

| Lage                                        | Erledigt                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| aus Bereitschaft                            | `readyForSolve` → 2, sonst `analysisStored` → 1, sonst 0                                  |
| Stufe unbekannt                             | aus Bereitschaft                                                                          |
| Stufe `terminal`                            | 5                                                                                         |
| eine frühere Stufe trägt die Rolle `verify` | 4                                                                                         |
| Stufe trägt `verify`                        | 3, wenn ein Pull Request besteht oder eine `solution`/`revision` erfolgreich war, sonst 2 |
| Stufe trägt `solve`                         | max(2, aus Bereitschaft)                                                                  |
| sonst                                       | aus Bereitschaft                                                                          |

Stufen werden über `kind` und `roles` gelesen, nie über Ids. Ausgelieferter Ablauf: Backlog 0, Qualified 0, Ready 2, Progress 2/3, Acceptance 4, Done 5 (Backlog und Qualified mit Analyse 1 oder 2).

**Schritt einer Ausführung:** Eine Analyse (ohne `kind` oder `analysis`) arbeitet an `min(erledigt, 1)`; eine `solution`/`revision` an 3, wenn erledigt ≥ 3, sonst an 2. Aktiver Schritt ohne Lauf ist `min(erledigt, 4)`.

**Status** — die erste zutreffende Zeile gewinnt:

| Reihenfolge | Bedingung                                   | Status            | Beschriftung                                                   | Variante, Symbol      | Gesperrter Schritt     |
| ----------- | ------------------------------------------- | ----------------- | -------------------------------------------------------------- | --------------------- | ---------------------- |
| 1           | in `Needs you`, neueste Ausführung `failed` | `failed`          | `<Schritt> failed`                                             | danger, `errorCircle` | Schritt der Ausführung |
| 2           | in `Needs you`                              | `waiting-for-you` | `Waiting for you`                                              | danger, `errorCircle` | aktiver Schritt        |
| 3           | aktive fremde Koordination                  | `elsewhere`       | `Analyzing elsewhere` / `Solving elsewhere` [` · @<Besitzer>`] | warning, `warning`    | –                      |
| 4           | neueste Ausführung `running` oder `waiting` | `running`         | `<Schritt> running`                                            | info                  | –                      |
| 5           | Lauf des Pull Requests `in-progress`        | `running`         | `Checks running`                                               | info                  | –                      |
| 6           | neueste Ausführung `queued`                 | `queued`          | `<Schritt> queued`                                             | neutral, Umriss       | –                      |
| 7           | Lauf des Pull Requests `failed`             | `checks-failed`   | `Checks failed`                                                | danger, `errorCircle` | Checks                 |
| 8           | Basisstatus `conflicting`                   | `conflicting`     | `Conflicts with base`                                          | warning, `warning`    | –                      |
| 9           | Basisstatus `behind`                        | `behind-base`     | `Behind base`                                                  | warning               | –                      |
| 10          | Stufe `terminal`                            | `done`            | `Done`                                                         | neutral, Umriss       | –                      |
| 11          | erledigt = 4 und Stufe `human-gate`         | `ready-to-review` | `Ready to review`                                              | success               | –                      |
| 12          | Stufe trägt `solve`, nicht `verify`         | `ready-for-agent` | `Ready for an agent`                                           | neutral, Umriss       | –                      |
| 13          | sonst                                       | `stage`           | Spaltenname                                                    | neutral, Umriss       | –                      |

Eine Koordination ist fremd, wenn ihr Lease nicht abgelaufen ist und keine lokale Ausführung denselben Claim trägt. Beim Status `waiting-for-you` zeigt der Tooltip die Befunde der schwersten Stufe der Inspektion (höchstens drei, dann `and n more`) als `Blocked: <Befund> · <Befund>. Open the item for details.` beziehungsweise mit `Incomplete:`.

**Fortschrittsleiste:** fünf Segmente; Segment `i` ist gefüllt, wenn `i < erledigt` oder `i` der gesperrte Schritt ist, der gesperrte in danger. Text `n/5`, zugängliche Beschreibung `n of 5 delivery steps done`.

**Pull-Request-Kontext:** neueste Ausführung (`solution`, `revision` oder ohne `kind`) mit `pullRequest`; die Zusammenfassung ist der Pull Request mit gleicher `externalUrl`; der Lauf wird mit derselben Auflösung wie auf dem [Pull-Request-Bildschirm](../pull-requests/README.md) bestimmt.

**Zusatzhinweise:** Gehört das Work Item zu einer Gruppe im Zustand `paused`, erscheint **Group needs attention** und öffnet die Gruppe. Sonst erscheint bei einem offenen Gruppenvorschlag mit nicht leerer gemeinsamer Änderungsfläche und einer Beziehung außer `unrelated` und `duplicate` **Take together?** (Beziehung `joint-delivery`) oder **Critical path** und öffnet den Vorschlag.

Alle Projektionen (Befunde, Stufenschritte, Pull-Request-Kontext, Kartenzustand, Ausführungen je Work Item) werden einmal je Snapshot als Map berechnet, nicht je gerenderter Karte.

## Einträge, Stapel und Virtualisierung

Eine Spalte rendert eine Liste von Einträgen `{ id, kind: 'group', group } | { id, kind: 'item', item }`:

1. Kompakte Gruppen zuerst: Gruppen im Zustand `active` oder `synchronizing`, deren führende Karte eine Spalte hat, deren Mitglieder alle in dieser Spalte stehen und alle die Filter passieren. Sie erscheinen in der Spalte der führenden Karte als Stapel (`n tickets`, warning während `synchronizing`; Titel der führenden Karte; `Root · <Kennung> · <Repository>`; `Delivered in one shared workflow`; Titel der übrigen).
2. Danach die übrigen gefilterten Work Items in Snapshot-Reihenfolge, ohne Mitglieder kompakter Gruppen.

Jede aufgeklappte Spalte virtualisiert ihre Einträge mit einer Strategie für natürliche Höhen: Schätzung 160 px für ungemessene Einträge, 640 px Überhang, Messung gerenderter Einträge über `ResizeObserver`, verankerter erster sichtbarer Eintrag bei Höhenänderungen im vorderen Puffer. Schlüssel sind die Eintrags-Ids, damit Auswahl und Messungen das Recycling überstehen.

## Karte aktivieren und Kartenmenü

- Klick ohne Modifikator: Auswahl des Work Items im Store, Navigation nach `/main/board/<id>` (die Id ist ein kodiertes Segment). Klicks, deren Pfad durch Dropdown, Menü, Menüeintrag, Schaltfläche oder Checkbox führt, werden ignoriert.
- Klick mit ⌘, Ctrl oder Shift: Umschalten der Auswahl, keine Navigation.
- Rechtsklick oder **More actions**: lädt bei Bedarf die zuweisbaren Personen (mit erneutem Versuch nach einem Fehlschlag) und aktualisiert bei vorhandenem Pull Request die CI-Läufe, damit kein bereits gestarteter oder beendeter Lauf angeboten wird; öffnet dann das Menü.

Menüzusammensetzung:

1. Stufenschritte aus `resolveWorkItemActions` (gefiltert nach vorhandenen Features):

   | Lage                                                                      | Einträge                                                                                                                                                                                                                                                                                                                                                                                                                                  |
   | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | aktive fremde Koordination                                                | keine                                                                                                                                                                                                                                                                                                                                                                                                                                     |
   | aktive Ausführung                                                         | `Cancel run`                                                                                                                                                                                                                                                                                                                                                                                                                              |
   | Eintrag in der Warteschlange                                              | `Remove queued analysis` oder `Remove queued run`                                                                                                                                                                                                                                                                                                                                                                                         |
   | Stufe `human-gate`                                                        | je Entscheidung der Stufe ein Eintrag mit deren Label und Wirkung                                                                                                                                                                                                                                                                                                                                                                         |
   | Stufe führt `analyze` aus                                                 | `Analyze now`; nach Analyse `Re-analyze`; nach Fehlschlag `Retry analysis`; nach Abbruch `Restart analysis`                                                                                                                                                                                                                                                                                                                               |
   | Stufe führt `solve` aus                                                   | ohne abgeschlossene Analyse gesperrtes `Implement now` (`No completed analysis. Move the item back to <Analysestufe> first.`); sonst `Implement now`, `Repair implementation` (Fehlschlag mit beibehaltenem Arbeitsbereich), `Retry implementation`, `Restart implementation`, `Rework implementation` (nach Erfolg; verlangt Rückmeldung und ist auf dem Board gesperrt mit `Open the details to describe what the rework must change.`) |
   | neueste Lösung erfolgreich, Arbeitsbereich beibehalten, ohne Pull Request | zusätzlich `Create pull request`                                                                                                                                                                                                                                                                                                                                                                                                          |

   Symbole: Start `play`, Wiederholung `sync`, Abbruch `clear`, Veröffentlichung `add`, Entscheidung nach Wirkung (`advance` `checkmark`, `route` `sync`, `close` `clear`, `split` `add`, sonst `info`). Varianten: Abbruch danger, Veröffentlichung success, Entscheidung `advance` success, `close` danger, sonst Standard; Start und Wiederholung hervorgehoben.

2. `Move forward`, `Move backward`, `Move to` (Verschiebeziele, aktuelle Spalte markiert), sofern Ziele existieren.
3. `Assign to`, sobald die Personen des Bereichs `sourceId|workspaceId|repository` geladen sind. Das Board lädt jeden Bereich einmal zusammen mit den Work Items, ohne Fehlermeldung; das Öffnen des Menüs darf nach einem Fehlschlag erneut laden und meldet dann `Unable to load the assignable users.`. Umschalten lädt zuerst die vollständigen Details des Work Items, weil die Aktualisierung das ganze Work Item zurückschreibt, und sendet dann `updateWorkItem` mit allen Feldern, nur den Projektfeldern des eigenen Boards und der umgeschalteten Personenliste.
4. `Pull request #n`, wenn ein Pull-Request-Kontext existiert: `Open in GitHub`; `Run remotely`/`Cancel remote run` (abbrechen bei Lauf `queued` oder `in-progress`); bei erlaubter lokaler CI `Run locally`/`Stop local runner`. Sperrgründe: ohne Lauf `No workflow run exists for this branch yet.` (Pull Request bekannt) oder `This pull request is not in the loaded list.`; lokaler Runner mit anderem Lauf `The local runner is busy with another run.`. Ohne CI-Feature nur `Open in GitHub`.
5. `Select for delivery` (markiert bei Auswahl), `Open work item`, `Show process` (nur mit Workflow-Feature; öffnet den Ablauf in einem eigenen Drawer, ein zweiter Aufruf fordert Aufmerksamkeit für den offenen an), und bei vorhandener `externalUrl` Öffnen und Kopieren mit trackerabhängiger Beschriftung (`github-projects`: `Open in GitHub`/`Copy GitHub URL`; `azure-devops`: `Open in Azure DevOps`/`Copy Azure DevOps URL`; sonst `Open in browser`/`Copy URL`). Kopieren meldet `Link copied.` oder `Link not copied.` mit `The clipboard is not available.`.

Ausführung: Ein Eintrag mit Sperrgrund wird nicht ausgeführt. `analyze` und `solve` fordern zuerst die lokale Ausführungsfreigabe an: genau eine Repository-Bindung (sonst Warnung `Choose one repository.`), Laufzeitstatus des Repositorys, bei `unprepared` die Rückfrage `Prepare <owner>/<name> locally?` mit `Prepare locally`/`Cancel` und anschließender Vorbereitung. Danach `startAnalyzer` beziehungsweise `startSolver`, `cancelExecution`, `removeQueueEntry`, `publishPullRequest` oder `decideWorkflow`. Jede Mutation einer Karte läuft exklusiv unter ihrer Id (Gruppen unter der Gruppen-Id und der Id der führenden Karte); währenddessen ersetzt ein Fortschrittsring die Menüschaltfläche und alle Einträge sind gesperrt.

## Verschieben und Gruppieren

| Auslöser                                                           | Bedingung                                                   | Wirkung                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Menü `Move to`/`Move forward`/`Move backward`                      | nicht beschäftigt, Ziel ungleich aktueller Spalte           | offener Vorschlag mit gemeinsamer Änderungsfläche → Vorschlags-Drawer mit gewünschtem Ziel; sonst `moveWorkItem(id, providerColumnFor(item, ziel))`                                                                                                                                                                                                                                        |
| Karte in Spaltenfläche oder auf Streifen ziehen                    | Quelle ungleich Ziel                                        | Gruppe → Gruppenverschiebung; sonst Ziel = `providerColumnFor(item, sichtbare Spalten-Id)` (bei **All boards** die Spalte des eigenen Boards mit derselben Stufe, sonst demselben Namen); offener Vorschlag → Drawer mit diesem Ziel; ohne Ziel kein Verschieben und Hinweis `Not moved` / `The board of <Kennung> has no <Spalte> column.`; sonst `moveWorkItem(id, ziel.id, ziel.label)` |
| Karte oder Stapel auf eine andere Karte/einen Stapel fallen lassen | Ziel ungleich Quelle                                        | Gruppierungsabsicht: Ids `[Ziel (führende Karte des Zielstapels), …Quellmitglieder]`, dedupliziert → Moduswahl                                                                                                                                                                                                                                                                             |
| Gruppenmenü verschieben                                            | nicht beschäftigt, Ziel ungleich Spalte der führenden Karte | `moveDeliveryGroup(gruppe, führende Karte, providerColumnFor(führende Karte, ziel))`: verschiebt die führende Karte und gleicht danach alle Mitglieder an (`alignDeliveryGroup`)                                                                                                                                                                                                           |
| `Align to root column` im Gruppen-Drawer                           | Gruppe `paused`                                             | `alignDeliveryGroup`; erreichbar über **Group needs attention** auf den Mitgliedskarten. Das Stapelmenü hat den Eintrag nicht: eine angehaltene Gruppe wird nie als Stapel gezeichnet (nur `active`/`synchronizing` mit allen Mitgliedern in einer Spalte)                                                                                                                                 |

Ziehen ist für Karten gesperrt, deren neueste Ausführung `running` ist; diese Karten sind in ihrer Spalte angeheftet. Die Spaltensortierung beim Ziehen ist abgeschaltet; die Reihenfolge bestimmt der Snapshot.

`moveWorkItem` aktualisiert die Projektion sofort (Spalte und die Stufe der Zielspalte, ohne Stufe ungestuft), sendet `work-items.move`, ersetzt das Work Item durch die Antwort und meldet `Moved to <Spalte>.`; bei einem Fehler stellt es das vorige Work Item wieder her und meldet `Unable to move the work item.`. Eine Aktualisierung, die vor der Mutation begann, wird danach wiederholt, damit sie die Änderung nicht überschreibt. Die Auswahl des Work Items ändert sich durch Verschieben nicht.

Moduswahl `Group selected tickets` (modal, 34 rem, Escape schließt, Klick daneben nicht): `Copy directly without AI analysis` → `groupDeliveryDirectly(ids, root, quelle)`; `Analyze relationship with AI first` → `assessDeliveryGroup(ids, root, quelle)` und Öffnen des Vorschlags-Drawers. Quelle ist `manual-select` für die Auswahl und `manual-drag` für das Fallenlassen. Der Drawer bestätigt mit `Deliver together anyway` (Bestätigung durch den Bediener nötig), `Add to existing group`, `Group and move together` (mit gewünschtem Ziel; verschiebt nach der Bestätigung die Gruppe) oder `Take tickets together`; `Keep separate` lehnt den Vorschlag ab und führt ein gewünschtes Einzelverschieben aus; außerdem `Dissolve group` und `Align to root column` für bestehende Gruppen. Es ist höchstens ein Gruppen-Drawer offen.

## Auswahl und gemeinsame Auslieferung

Die Auswahl ist eine geordnete Liste stabiler Work-Item-Ids im Presenter, damit sie das Recycling der virtualisierten Karten übersteht; die erste Id ist die führende Karte. Die Flow-Board-Mehrfachauswahl ist nur aktiv, solange die Liste nicht leer ist.

Zulässigkeit von `Deliver together (n)` in Prüfreihenfolge:

| Regel                                                                      | Sperrgrund                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| mindestens 2 bekannte Work Items                                           | `Select at least two tickets.`                                                  |
| höchstens 10                                                               | `Select at most ten tickets.`                                                   |
| führende Karte hat `workspaceId`, `sourceId`, `repository`                 | `Delivery groups require a workspace, delivery source, and repository.`         |
| gleicher Workspace / gleiches Board / gleiches Repository wie die führende | `Selected tickets span more than one workspace.` / `… board.` / `… repository.` |
| kein Mitglied einer Gruppe außer `dissolved` und `completed`               | `<externalId> already delivers in a group.`                                     |

Die Auswahl leert sich nach erfolgreicher direkter Gruppierung, wenn eine aktive oder synchronisierende Gruppe alle ausgewählten Ids enthält, und über `Clear selection`. Ids, die der Snapshot nicht mehr enthält, fallen heraus. Das Fallenlassen auf eine Karte prüft diese Regeln im Renderer nicht; die Gruppierungsoperation des Orchestrators bleibt autoritativ.

## Adressparameter

| Parameter               | Wirkung                                                                                                                                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`                     | ist der Parameter vorhanden, setzt er die sitzungsweite Suche (auch leer)                                                                                                                                                                                                                                       |
| `column`                | ist der Parameter vorhanden, setzt er die Spalte; leer hebt sie auf                                                                                                                                                                                                                                             |
| `attention`             | nur wenn sich der Wert von `attention` gegenüber der zuletzt ausgewerteten Adresse ändert: `true` wählt `attention`, beendet `running` und `mine`, leert Spalte und Suche, sofern `column` beziehungsweise `q` fehlen, und leert Stufe und Label; `false` beendet `attention`; ein fehlender Wert ändert nichts |
| `item`                  | sobald der Snapshot das Work Item enthält und das Paar `item:process` noch nicht verarbeitet wurde: Auswahl im Store und Navigation nach `/main/board/<id>` mit `replaceUrl`                                                                                                                                    |
| `item` + `process=true` | nur mit Workflow-Feature: öffnet stattdessen den Ablauf-Drawer, das Board bleibt                                                                                                                                                                                                                                |
| `create=true`           | einmalige Absicht: der Parameter wird mit `replaceUrl` entfernt; sobald die Einstellungen geladen sind, öffnet der Presenter das Sheet bei `canCreateWorkItem`, sonst meldet er die Warnung `Select one board to create a work item` mit dem Grund ([Sheet zum Anlegen](new-work-item-sheet.md#auslöser))       |

`/main/stages` leitet nach `/main/board` um. Weil `attention` nur bei einer Änderung seines eigenen Werts ausgewertet wird, behält eine spätere Navigation, die nur andere Schlüssel setzt (etwa `?q=` aus der Befehlspalette oder `item`), das gewählte Segment; dieselbe Adresse erneut setzt ein vom Bediener gewähltes Segment nicht zurück. Erst ein neu erscheinendes `attention=true` wählt `Needs you` wieder.

## Anlegen

`New work item` (gesperrt während des Ladens und ohne `canCreateWorkItem`, Tooltip `Select one board to create a work item`) öffnet das Sheet ohne Vorgabe. Das `+` einer Spalte (`New work item in <Spalte>`) öffnet es mit `{ columnId, stageId }` der sichtbaren Spalte; die Stufe lässt das Sheet bei zusammengeführten Boards die Spalte des Anlege-Boards finden. Das Sheet existiert höchstens einmal; ein weiterer Aufruf fordert Aufmerksamkeit für das offene an. Vertrag des Sheets: [Neues Work Item](new-work-item-sheet.md).

## Hydrierung und Aktualisierung

1. Der Bildschirm startet die globale Initialisierung.
2. Liegt bereits ein Snapshot vor, gilt er sofort als geladen, und eine Provider-Aktualisierung läuft im Hintergrund.
3. Sonst wartet er auf die Initialisierung, liest danach den gespeicherten Snapshot (`refresh(false)`) und erst ohne Ergebnis den Provider (`refresh()`), dessen Ende er abwartet.

**Refresh work items and build runs** und **Retry now** rufen `refresh()` auf. Während des Ladens sind Aktualisieren, Repository-Chip, Filter und Anlegen gesperrt, `aria-busy` ist gesetzt und das Board zeigt ein Skelett in der Anatomie des fertigen Boards (zwei Streifen, vier Spalten mit je zwei Karten).

## Fehler und Leerzustände

| Fall                                | Erkennung                                              | Anzeige                                                                                                                                                                                                                                                        | Daten                    | Wiederherstellung   |
| ----------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------- |
| Anfragelimit                        | `remoteData.workItems.reason === 'rate-limited'`       | Banner `Provider request limit reached`; bei vorhandenen Work Items `Work items were last updated <Zeit>. Try again after <retryAt>.` (ohne `retryAt` `Try again later.`)                                                                                      | letzte Projektion bleibt | `Retry now`         |
| veraltet mit Work Items             | `state === 'stale'`, Umfang nicht leer                 | `Work item update paused`, `Work items were last updated <Zeit>. Use Retry now to try again.`                                                                                                                                                                  | letzte Projektion bleibt | `Retry now`         |
| nicht verfügbar                     | `state === 'unavailable'` oder `stale` ohne Work Items | Azure DevOps ohne Anmeldedaten (alle Quellen Azure, `authentication-required`): `Azure DevOps credential required`; sonst `Work items are temporarily unavailable`; Leerzustand `Work items unavailable` beziehungsweise `Azure DevOps work items unavailable` | keine                    | `Retry now`         |
| keine Work Items                    | Umfang leer                                            | `No work items found` / `Choose an active work-item source that contains visible items.`                                                                                                                                                                       | –                        | Quelle aktivieren   |
| Einschränkung ohne Treffer          | `hasActiveFilters`, gefiltert leer                     | `No matching tickets` / `Try All, or a different search, repository, column, label or assignee filter.`                                                                                                                                                        | –                        | Einschränkung lösen |
| Verschieben abgelehnt               | Fehler aus `work-items.move`                           | `Unable to move the work item.`                                                                                                                                                                                                                                | Karte zurückgesetzt      | erneut versuchen    |
| Personen nicht ladbar               | Fehler aus `work-items.metadata`                       | beim Laden still; beim Öffnen des Menüs `Unable to load the assignable users.`                                                                                                                                                                                 | `Assign to` fehlt        | Menü erneut öffnen  |
| Speichern einer Zuweisung scheitert | Fehler aus `work-items.update`                         | `Unable to save the work item.`                                                                                                                                                                                                                                | unverändert              | erneut versuchen    |

Eine leere Spalte zeigt `No items in <spaltenname klein>`.

## Implementierungsabbildung in Symphony

| Verantwortung                    | Aktueller Pfad oder Symbol                                                                                                                                                                          | Beleg                                                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route                            | `libs/frontend/features/work/src/lib/board/routing/WorkRoutes.ts` (`board`, `board/:workItemId`, `stages`)                                                                                          | –                                                                                                                                                   |
| Ansicht, Ziehen und Fallenlassen | `board/views/BoardView.{ts,html,scss}`                                                                                                                                                              | `apps/renderer-e2e/src/collection-page-chrome.spec.ts`, `board-virtualized-drag.spec.ts`                                                            |
| Karte, Stapel, Menüs             | `board/components/BoardColumnEntryComponent.{ts,html,scss}`                                                                                                                                         | `board-context-actions.spec.ts`                                                                                                                     |
| Presenter                        | `board/view-presenters/BoardViewPresenter.ts`, `BoardSegment.ts`, `IBoardColumnEntry.ts`                                                                                                            | `BoardViewPresenter.spec.ts`                                                                                                                        |
| Kartenzustand und Status         | `board/view-presenters/boardCard/*`, `board/pipes/BoardCardStatusPresentationPipe.ts`, `WorkItemHealthPresentationPipe.ts`                                                                          | `resolveBoardCardState.spec.ts`                                                                                                                     |
| Menüeinträge                     | `board/view-presenters/boardContextAction/*`, `boardPullRequestAction/*`, `libs/domain/features/execution/src/lib/actions/resolveWorkItemActions.ts`, `board/pipes/WorkItemLinkPresentationPipe.ts` | `resolveBoardContextActions.spec.ts`, `resolveBoardPullRequestActions.spec.ts`, `resolveBoardPullRequest.spec.ts`, `resolveWorkItemActions.spec.ts` |
| Spaltenwahl                      | `board/state/BoardColumnCollapseStore.ts`, `board/state/boardColumnCollapse/*`                                                                                                                      | `readCollapsedBoardColumnIds.spec.ts`, `persistCollapsedBoardColumnIds.spec.ts`, `board-column-collapse.spec.ts`                                    |
| Virtualisierung                  | `board/directives/DynamicSizeVirtualScroll{Directive,Strategy}.ts`                                                                                                                                  | `DynamicSizeVirtualScrollStrategy.spec.ts`, `board-scroll.spec.ts`                                                                                  |
| Hydrierung                       | `board/view-presenters/routeHydration/hydrateBoardRoute.ts`                                                                                                                                         | `hydrateBoardRoute.spec.ts`, `remote-projection.spec.ts`                                                                                            |
| Gruppen                          | `board/views/dialogs/DeliveryGroup{ModeDialog,Drawer}View.*`, `board/view-presenters/DeliveryGroup*`                                                                                                | `board-multi-select-bundling.spec.ts`                                                                                                               |
| Lokale Ausführungsfreigabe       | `board/services/LocalExecutionApprovalService.ts`                                                                                                                                                   | –                                                                                                                                                   |
| Sheet-Einstieg                   | `board/services/NewWorkItemSheet.ts`, `INewWorkItemSheetOptions.ts`; `libs/frontend/core/src/navigation/watchCreateIntent.ts`                                                                       | `home-widgets.spec.ts`                                                                                                                              |
| Mutationen                       | `libs/frontend/features/work/src/lib/state/WorkStore.ts`                                                                                                                                            | `WorkStore.spec.ts`                                                                                                                                 |
| Sitzungsweite Filter             | `libs/frontend/features/work/src/lib/state/WorkFilterStore.ts` (`WORK_FILTERS`)                                                                                                                     | `contextual-search.spec.ts`                                                                                                                         |
| Umfang, Layout, Mengen           | `libs/frontend/core/src/state/OrchestrationState.ts`, `libs/frontend/core/src/board/*`                                                                                                              | `resolveBoardColumnLayout.spec.ts`, `workItemIdsNeedingAttention.spec.ts`, `workItemIdsInProgress.spec.ts`                                          |
| Board-Wahl                       | `libs/frontend/features/workspace/src/lib/state/WorkspaceSelectionStore.ts` (`selectBoard`)                                                                                                         | –                                                                                                                                                   |
| Ports                            | `libs/frontend/features/work/src/lib/ports/IWorkBoardContext.ts`, `provider/provideWorkViewContexts.ts`                                                                                             | –                                                                                                                                                   |

## Verifikation und Akzeptanzkriterien

- Im ausgelieferten Ablauf sind `Backlog`, `Qualified` und `Done` beim ersten Öffnen eingeklappte Streifen mit Zahl, alle anderen Spalten aufgeklappt; ein Klick auf einen Streifen klappt auf, der Pfeil neben `+` klappt zu, und beide Entscheidungen überstehen einen Neustart.
- Eine Suche mit Treffer in einer nur standardmäßig eingeklappten Spalte klappt diese auf; eine ausdrücklich eingeklappte Spalte bleibt zu.
- Jedes Segment zeigt genau seine Menge; die Zahlen von `Needs you` und `Agents running` gelten für den ganzen Umfang; `Mine` ist ohne angemeldetes GitHub-Konto gesperrt und bleibt dann auf `All`.
- Der Repository-Chip zeigt nur Work Items seines Repositorys; ein verschwundenes Repository hebt die Einschränkung auf.
- Ein Klick auf eine Karte navigiert nach `/main/board/<id>` und öffnet keinen Dialog; ⌘-, Ctrl- oder Shift-Klick wählt nur aus; `?item=<id>` ersetzt den Board-Eintrag in der Historie durch den Work-Item-Bildschirm.
- Das `+` einer Spalte öffnet das Sheet mit `{ columnId, stageId }`; `?create=true` öffnet es und verschwindet aus der Adresse; ohne Erstellungs-Board meldet `?create=true` stattdessen den Grund.
- Der Status jeder Karte folgt der Reihenfolge der Statustabelle; die Fortschrittsleiste zeigt für den ausgelieferten Ablauf 0, 0, 2, 2, 4, 5 erledigte Schritte von Backlog bis Done.
- Ein Rechtsklick öffnet das Menü mit den Schritten der Stufe; ein gesperrter Eintrag nennt seinen Grund und startet nichts; während einer Aktion ist das Menü der Karte gesperrt.
- Eine gezogene Karte wechselt sofort die Spalte, der Tracker erhält die Zielspalte, und eine Ablehnung stellt die Karte wieder her.
- Unter **All boards** erhält der Tracker für eine gezogene Karte die Spalte ihres eigenen Boards mit der Stufe der Zielspalte; hat ihr Board keine solche Spalte, wird nichts verschoben und `Not moved` erscheint.
- `?attention=true` wählt `Needs you`; eine folgende Adresse nur mit `q` oder `item` behält das Segment; nach einem selbst gewählten `All` setzt eine weitere Adresse ohne neues `attention=true` es nicht zurück.
- Zwei ausgewählte Karten lassen sich mit Analyzer-Einschätzung zu einer Gruppe bündeln; die zuerst gewählte bleibt führend; nach der Bestätigung erscheint ein Stapel und keine Karte bleibt ausgewählt.
- Ohne Workflow-Feature öffnet weder `?item=…&process=true` noch `Show process` einen Ablauf.

## Verwandte Dokumentation

- [Board](../../project/board/README.md) (fachlich)
- [Work-Item-Bildschirm](work-item.md) und [Sheet zum Anlegen](new-work-item-sheet.md)
- [Fensterrahmen und Navigation](../window-and-navigation/README.md)
- [Befehlspalette](../command-palette/README.md)
- [Pull-Request-Bildschirm](../pull-requests/README.md)
- [Workflow-Modell](../workflow-model.md), [FlowBoard-Adaption](../flowboard-adaptation.md), [Agentic Delivery](../agentic-delivery.md)
- [Production Orbit](../production-orbit.md)
