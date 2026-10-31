# Sheet „New work item“

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Das Sheet **New work item** ist der einzige Weg, im Hauptfenster ein Work Item anzulegen. Es erfasst ein Work Item von Hand oder als Entwurf des Erstellungsagenten, legt es beim Provider des Erstellungs-Boards in der gewählten Spalte an und startet auf Wunsch sofort die Analyse. Das funktionale Verhalten steht unter [Neues Work Item anlegen](../../project/board/new-work-item.md).

Garantien:

- Es ist höchstens ein Sheet offen. Jeder Auslöser endet in demselben Dienst; ein zweiter Aufruf fordert Aufmerksamkeit für das offene Sheet an.
- Ein fehlgeschlagenes Anlegen schließt das Sheet nicht und verwirft keine Eingabe; der Grund steht im Sheet.
- Die gewählte Spalte ist maßgeblich: Sie wird vor dem Anlegen in das Spaltenfeld des Providers geschrieben und nach dem Anlegen durchgesetzt, falls der Provider das Work Item anders platziert hat. Ein AI-Entwurf ändert sie nicht.
- Die Analyse nach dem Anlegen startet nur, wenn Läufe verfügbar sind, ein Analyse-Skill zugewiesen ist und die Stufe der gewählten Spalte die Rolle `analyze` ausführt, und nur über die lokale Ausführungsfreigabe und dieselbe Operation wie auf dem Work-Item-Bildschirm.
- Anlegen und Bearbeiten nutzen dasselbe Formular (`WorkItemForm`); Validierung, Metadaten und Mutation können nicht auseinanderlaufen.
- Ein Klick neben das Sheet verwirft nichts; nur **Cancel** und Escape schließen ohne Anlegen.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Öffnungsdienst und seine Optionen, Absicht `?create=true`, Formular, Spaltenwahl, AI-Entwurf, Analyse nach dem Anlegen, Fehlerdarstellung.
- Nicht enthalten: das Board und seine Sperre für **New work item** ([Board](README.md)), die Bearbeitung bestehender Work Items ([Work-Item-Bildschirm](work-item.md)), Anlegen in der mobilen Begleit-App, das Erzeugen des Entwurfs im Orchestrator und die Analyse selbst.

## Verantwortungsgrenzen

| Verantwortung                         | Kanonischer Eigentümer                   | Vertrag                                                                                                                                          |
| ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Öffnen, Einzelinstanz                 | `NewWorkItemSheet` (Root-Dienst)         | `open(options?: INewWorkItemSheetOptions): IDialogRef<INewWorkItemSheetOptions, IWorkItem>`                                                      |
| Optionen                              | `INewWorkItemSheetOptions`               | `{ columnId?: string; stageId?: string }`                                                                                                        |
| Zustand und Befehle                   | `NewWorkItemSheetViewPresenter`          | `inputMode`, `creatorStage`, `columns`, `selectedColumn`, `canAnalyzeAfterCreating`, `analyzeAfterCreating`, `canCreate`, `createError`; Befehle |
| Formular                              | `WorkItemForm`                           | Modell, Pflichtfelder, `loadMetadata`, `selectRepository`, `selectWorkflowStage`, `applyDraft`, `toMutation()`                                   |
| Weitere Felder                        | `WorkItemFieldsComponent`                | mit `showWorkItemType`, `showLabels: false`, `omitWorkflowState`, `aiDraft`                                                                      |
| Mutationen                            | `WorkStore`                              | `createWorkItem`, `moveWorkItem`, `draftIssue`, `cancelIssueDraft`, `startAnalyzer`, `workItemMutationError`, `workItemsBusy`, `issueDraftBusy`  |
| Auslöser ohne Zugriff auf das Feature | Board-Presenter über `watchCreateIntent` | Abfrageparameter `create=true` auf `/main/board`                                                                                                 |
| Erstellungs-Board                     | Anwendungsprojektion                     | `creationBoard` (gewähltes Board, sonst das einzige Board im Umfang), `canCreateWorkItem`                                                        |

## Auslöser

Alle Auslöser außerhalb des Boards navigieren zu `/main/board?create=true`, weil eine Feature-Bibliothek keine andere importiert und die Absicht so von jedem Ort und Prozess formulierbar ist:

| Auslöser                                                           | Weg                                                                                                                                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New work item** im Board                                         | `createTaskCommand()` → `NewWorkItemSheet.open({})`                                                                                                                        |
| **+** im Spaltenkopf                                               | `createTaskCommand(column)` → `open({ columnId, stageId? })`                                                                                                               |
| ⌘N / Ctrl+N im Hauptfenster                                        | Tastenbehandlung der Shell schließt die Befehlspalette und navigiert                                                                                                       |
| ⌘N / Ctrl+N im Einstellungsfenster, Menü **File › New Work Item…** | Anwendungsmenü in Electron Main zeigt das Hauptfenster und sendet `/main/board?create=true` ([Anwendungsmenü](../window-and-navigation/settings-window.md#anwendungsmenü)) |
| Befehlspalette `New work item…`                                    | Ergebnis mit Aktion `navigate` ([Befehlspalette](../command-palette/README.md))                                                                                            |
| Overview **New work item**                                         | Navigation aus dem Home-Feature                                                                                                                                            |
| Menüleistenpanel **New work item…** (⌘N im Panel)                  | `window.show { route: 'new-work-item' }`; Main zeigt das Hauptfenster und sendet `/main/board?create=true` ([Menüleistenpanel](../notifications-and-tray/README.md))       |

`watchCreateIntent` beobachtet die Abfrageparameter der Board-Route. Bei `create=true` entfernt es den Parameter sofort mit `replaceUrl` (die Absicht ist einmalig; Neuladen, Lesezeichen und **Back** öffnen das Sheet nicht erneut) und meldet die Absicht. Der Board-Presenter merkt sie sich (`_createIntent`) und wertet sie erst aus, sobald die Einstellungen geladen sind (`settings()` gesetzt), damit `canCreateWorkItem` während der Hydratisierung nicht fälschlich falsch ist. `canCreateWorkItem` ist wahr, wenn es ein Erstellungs-Board gibt oder genau ein Workspace gewählt ist und noch kein Board hat; dann öffnet der Presenter das Sheet ohne Spaltenvorgabe. Sonst meldet er eine Warnung (`NotificationService.showWarning`) mit dem Titel `Select one board to create a work item` und dem Grund in dieser Reihenfolge:

| Bedingung                                           | Inhalt                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `availableBoards().length > 1` (kein aktives Board) | `Several boards are in view. Choose one under Filter › Board, then create the work item.`                               |
| `activeViewScope.workspaceIds` leer                 | `No workspace is selected. Choose a workspace in the sidebar, then create the work item.`                               |
| sonst (mehrere Workspaces, keiner mit Board)        | `None of the selected workspaces has a board. Connect one in Settings › Connected services, or use only one workspace.` |

Die Schaltflächen im Board (`New work item`, Spalten-`+`) bleiben ohne Erstellungs-Board gesperrt und öffnen nichts.

## Öffnen

`NewWorkItemSheet.open` zeigt `NewWorkItemSheetView` über Mosaik `DialogService` als modales Sheet: eigener Hintergrund, `clickOutsideToClose: false`, `pressEscapeToClose: true`, Breite 600 px, mindestens 20 rem, höchstens 100 vw × 86 dvh. Der Dienst hält die Referenz bis zum Ereignis `closed`; solange sie besteht, ruft ein weiterer Aufruf `requestAttention()` und liefert dieselbe Referenz. Das Ergebnis des Dialogs ist das angelegte Work Item (`Cancel.positive(created)`) oder ein negativer Abbruch.

## Hydratisierung und Spaltenwahl

1. `onHydrate` lädt die Metadaten für den Erstellungsumfang: Workspace des Erstellungs-Boards, sonst aktiver Workspace; Quelle = Erstellungs-Board. Während der Hydratisierung zeigt das Sheet seine Beschriftungen mit Skeletten statt Eingaben.
2. Die Metadaten setzen Standards: Repository = gewähltes oder erstes Repository der Metadaten, Typ = gewählter, sonst Standardtyp, sonst erster Typ; jedes Projektfeld erhält seinen Wert oder einen leeren Wert, das Spaltenfeld (`role: 'workflow-state'`, `single-select`) die Option der Anfangsstufe des Workflows, sonst die erste Option.
3. Spalten = `states` der Metadaten, sonst die Board-Spalten des Erstellungs-Boards (ohne Board alle; Spalten ohne `sourceId` zählen immer).
4. Anfangsspalte: Spalte mit `options.columnId`, sonst Spalte mit `options.stageId` (ein zusammengeführtes Board zeigt je Stufe eine Spalte über mehrere Boards, deren Id zu einem anderen Board gehören kann), sonst Spalte der Anfangsstufe, sonst erste Spalte.
5. Jede Spaltenwahl setzt das Spaltenfeld auf die Option, deren `stageId` der Stufe der Spalte entspricht (`selectWorkflowStage`); hat der Provider kein solches Feld, bleibt nur die Wahl für die Nachplatzierung.
6. Ein anderes Repository lädt seine Metadaten genau einmal (laufende und geladene Repositories werden nicht erneut angefragt) und ergänzt die Standards.

## Formular und Validierung

| Feld          | Regel                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titel         | Pflicht; Meldung `Enter a work-item title.` nach Berührung; wird beim Anlegen getrimmt                                                                        |
| Beschreibung  | Markdown, höchstens 60 000 Zeichen                                                                                                                            |
| Repository    | Pflicht (`Choose a repository.` als Schema-Meldung); Auswahl gesperrt ohne Repositories                                                                       |
| Spalte        | Auswahl gesperrt ohne Spalten; Beschriftung `No column` ohne Wahl                                                                                             |
| Labels        | Menü `Add label` aus den Provider-Labels, Umschalten je Label                                                                                                 |
| `More fields` | sichtbar, wenn es außer dem Spaltenfeld weitere Projektfelder, Zuweisbare oder Typen gibt; enthält Typ (Pflicht), Projektfelder ohne Spaltenfeld, Zuweisungen |

`canCreate` = nicht speichernd ∧ nicht hydratisierend ∧ Formular sichtbar (manuell oder AI-Entwurf in Prüfung) ∧ Titel und Repository nach `trim` nicht leer. `workItemsBusy` ist auch während eines Metadatenladens gesetzt; so lange ist das Anlegen gesperrt.

Die Mutation (`toMutation()` ohne bestehendes Work Item) enthält Workspace, Quelle (Erstellungs-Board, sonst erste Quelle des aktiven Lieferkontexts, sonst erste aktive Quelle des Workspace), optional Typ, Titel, Beschreibung, Repository, die Repository-Bindungen des Workspace, deren Id, Anzeigename oder `owner/name` dem Repository entspricht, Projektfelder, Labels und Zuweisungen.

## AI-Entwurf

| Phase         | Anzeige                                                                                                                                                                                                       | Übergänge                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `prompt`      | Prompt `Describe the work item` (höchstens 50 000 Zeichen), Agentwahl bei mehr als einem Erstellungsagenten, Repository, Spalte, Analyseoption; ohne Erstellungs-Skill gesperrt mit Hinweis und `Open Skills` | Absenden → Entwurf; `Write it myself` → manuell                                  |
| Entwurf läuft | unbestimmter Fortschritt, `Drafting and classifying the work item…`, `Cancel generation`                                                                                                                      | Erfolg → `review`; Fehler oder Abbruch → `prompt` mit wiederhergestelltem Prompt |
| `review`      | Formular mit hervorgehobenen AI-Werten, `More fields` geöffnet, `Start over`                                                                                                                                  | `Start over` → `prompt`; `Create work item`                                      |

Erstellungsagenten sind aktive Profile des Erstellungs-Workspace, die in der Teamzuweisung der Rolle `work-item-creation` primär oder als Ersatz stehen; ohne Wahl entscheidet das Team. Die Anfrage `work-items.draft` trägt eine Operations-Id, Workspace, Quelle, Repository, Prompt, optional Agent, vorhandenen Titel und Beschreibung sowie die Projektfelder. `Cancel generation` ruft `work-items.draft.cancel` mit dieser Id auf; ein abgebrochener Entwurf meldet keinen Fehler. Das Übernehmen ersetzt Titel, Beschreibung, Projektfelder, Labels und Zuweisungen und setzt danach die gewählte Spalte erneut.

`Open Skills` schließt das Sheet und navigiert nach `/main/settings?section=skills`, was das Einstellungsfenster öffnet. Spracheingabe in den Prompt steht zur Verfügung, wenn die Desktop-Spracherkennung vorhanden ist; sie wird beim Schließen abgebrochen.

## Anlegen

1. Ist `canCreate` falsch, geschieht nichts. Sonst merkt sich der Presenter den Versuch (erst danach zeigt `createError` den `workItemMutationError`), die gewählte Spalte und ob analysiert werden soll.
2. `createWorkItem` ruft `work-items.create` auf. `WorkStore` leert vorher `workItemMutationError`, fügt das Ergebnis in die Projektion ein, wählt es aus und meldet `Work item created.`; eine Board-Aktualisierung, die vor dem Schreiben begann, wird danach wiederholt, damit sie das neue Work Item nicht verdrängt.
3. Misserfolg: `workItemMutationError` = Bedienermeldung des Fehlers, Toast `Unable to save the work item.`; das Sheet bleibt offen und zeigt `The work item was not created.` mit der Meldung, sonst `The provider refused the work item.`
4. Erfolg schließt das Sheet mit dem Work Item.
5. Liegt das Work Item weder in der Spalten-Id noch in der Stufe der gewählten Spalte, ruft der Presenter `moveWorkItem(id, columnId, label)` auf (Toast `Moved to <Spalte>.`). Scheitert das, wird die optimistische Verschiebung zurückgenommen, `Unable to move the work item.` gemeldet und die Analyse nicht gestartet.
6. Ist die Analyse gewünscht, holt der Presenter das Work Item aus dem Snapshot (sonst das Ergebnis), ruft die lokale Ausführungsfreigabe auf und startet bei Freigabe `startAnalyzer(false, id, undefined, approval || undefined)`.

### Analyseoption

`canAnalyzeAfterCreating` = Execution verfügbar ∧ Analyse-Skill in den Metadaten ∧ Stufe der gewählten Spalte führt `analyze` aus. Die Option ist standardmäßig angefordert; `analyzeAfterCreating` ist Anforderung ∧ Möglichkeit. Der Hinweis bei Unmöglichkeit folgt dieser Reihenfolge: keine Läufe → `Runs are not available in this installation.`; kein Skill → `Assign a skill to the Plan step to analyze new work items.`; Stufe `human-gate` → `<Spalte> waits for your decision before the analysis starts.`; sonst `<Spalte> does not run the analysis.` Die Beschriftung nennt den Primäragenten der Rolle `analysis` im Team des Erstellungs-Workspace, sonst `the analysis agent`.

## Fehler und Wiederherstellung

| Fehlerfall                     | Erkennung                           | Öffentlicher Fehler                                                                                                                             | Nebenwirkungen                                  | Wiederherstellung                                      |
| ------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Kein Erstellungs-Board         | `canCreateWorkItem` falsch          | gesperrte Board-Schaltflächen mit Tooltip; eine Absicht `create=true` meldet die Warnung `Select one board to create a work item` mit dem Grund | kein Sheet                                      | ein Board oder einen Workspace wählen, Board verbinden |
| Metadaten nicht ladbar         | `work-items.metadata` scheitert     | Toast `Unable to load work-item metadata.`                                                                                                      | Standards fehlen; Repository bleibt leer        | Sheet erneut öffnen                                    |
| Anlegen abgelehnt              | `work-items.create` scheitert       | Banner im Sheet und Toast                                                                                                                       | kein Work Item; alle Eingaben bleiben           | korrigieren, erneut anlegen                            |
| Nachplatzierung abgelehnt      | `work-items.move` scheitert         | Toast `Unable to move the work item.`                                                                                                           | Work Item in der Provider-Spalte; keine Analyse | im Board verschieben                                   |
| Freigabe verweigert            | Freigabe liefert `false`            | Warnung (`Choose one repository.`) oder keine                                                                                                   | Work Item angelegt, keine Analyse               | Analyse auf dem Work-Item-Bildschirm                   |
| Entwurf scheitert              | `work-items.draft` scheitert        | Toast `Unable to draft the work item.`                                                                                                          | Prompt wiederhergestellt                        | erneut absenden                                        |
| Abbruch des Entwurfs scheitert | `work-items.draft.cancel` scheitert | Toast `Unable to cancel issue drafting.`                                                                                                        | Entwurf läuft weiter                            | warten oder erneut abbrechen                           |

## Implementierungsabbildung in Symphony

| Verantwortung               | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                                                              | Beleg                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Öffnungsdienst und Optionen | `libs/frontend/features/work/src/lib/board/services/{NewWorkItemSheet,INewWorkItemSheetOptions}.ts`                                                                                                                                                                                                                                                     | `NewWorkItemSheet.spec.ts`                                                                                                                                         |
| Sheet                       | `libs/frontend/features/work/src/lib/board/views/dialogs/NewWorkItemSheetView.{ts,html,scss}`                                                                                                                                                                                                                                                           | `apps/renderer-e2e/src/issue-create-edit.spec.ts`                                                                                                                  |
| Presenter                   | `libs/frontend/features/work/src/lib/board/view-presenters/NewWorkItemSheetViewPresenter.ts`                                                                                                                                                                                                                                                            | `NewWorkItemSheetViewPresenter.spec.ts`                                                                                                                            |
| Formular                    | `view-presenters/workItemForm/WorkItemForm.ts`, `components/WorkItemFieldsComponent.{ts,html}`                                                                                                                                                                                                                                                          | `WorkItemForm.spec.ts`                                                                                                                                             |
| Store                       | `libs/frontend/features/work/src/lib/state/WorkStore.ts`                                                                                                                                                                                                                                                                                                | `WorkStore.spec.ts`                                                                                                                                                |
| Board-Auslöser und Absicht  | `view-presenters/BoardViewPresenter.ts` (`createTaskCommand`, `watchCreateIntent`), `libs/frontend/core/src/navigation/watchCreateIntent.ts`                                                                                                                                                                                                            | `BoardViewPresenter.spec.ts`                                                                                                                                       |
| Weitere Auslöser            | `libs/frontend/presentation/src/lib/views/PresenterView.ts` (⌘N), `apps/desktop/src/main.ts` (Menü, `window.show`), `libs/frontend/features/work/src/lib/search/projectWorkPaletteResults.ts`, `libs/frontend/features/home/src/lib/view-presenters/HomeViewPresenter.ts`, `libs/frontend/presentation/src/lib/view-presenters/MenuBarViewPresenter.ts` | `issue-create-edit.spec.ts` (⌘N), `home-widgets.spec.ts` (Overview, Absicht verlässt die Adresse), `command-palette.spec.ts` (Befehl sichtbar), `menu-bar.spec.ts` |
| Erstellungs-Board           | `libs/frontend/core/src/state/OrchestrationState.ts` (`creationBoard`, `canCreateWorkItem`)                                                                                                                                                                                                                                                             | –                                                                                                                                                                  |
| Ausführungsfreigabe         | `services/LocalExecutionApprovalService.ts`                                                                                                                                                                                                                                                                                                             | –                                                                                                                                                                  |

## Verifikation und Akzeptanzkriterien

- **New work item** im Board öffnet `new-work-item-sheet` im Modus `Write it myself` mit der Anfangsspalte; ein zweiter Aufruf öffnet kein zweites Sheet.
- Ohne Titel ist `Create work item` gesperrt; mit Titel ist es freigegeben.
- In einer Spalte mit Entscheidungsstufe ist die Analyseoption gesperrt und nennt `waits for your decision`; in einer analysierenden Spalte ist sie gesetzt.
- ⌘N öffnet dasselbe Sheet; eine gewählte Spalte und ein Label landen am angelegten Work Item; die Karte erscheint in dieser Spalte.
- Overview **New work item** öffnet das Sheet über dem Board, und die Adresse enthält danach kein `create` mehr.
- `create=true` ohne Erstellungs-Board öffnet kein Sheet und meldet genau eine Warnung mit dem passenden Grund; bei mehreren Boards unter **All boards** `Several boards are in view. …`.
- Ein Spalten-`+` startet in dieser Spalte, auch über die Stufe, wenn die Spalten-Id zu einem anderen Board gehört.
- Ein abgelehntes Anlegen lässt das Sheet offen, behält den Titel und zeigt die Meldung des Providers.
- Hat der Provider eine andere Spalte gewählt, wird das Work Item verschoben; ohne Anforderung startet keine Analyse; mit Anforderung läuft `startAnalyzer` erst nach der Freigabe.
- Ein AI-Entwurf füllt Titel, Beschreibung, Projektfelder, Labels und Zuweisungen, behält die gewählte Spalte und lässt sich mit `Cancel generation` abbrechen, wonach der Prompt erneut absendbar ist.

## Verwandte Dokumentation

- [Neues Work Item anlegen (Produkthandbuch)](../../project/board/new-work-item.md)
- [Board](README.md)
- [Work-Item-Bildschirm](work-item.md)
- [Befehlspalette](../command-palette/README.md)
- [Einstellungsfenster](../window-and-navigation/settings-window.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
