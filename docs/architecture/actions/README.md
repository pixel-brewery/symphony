# Actions-Bildschirm

**Dokumentstatus:** Implementierter Ist-Stand

Der Actions-Bildschirm (`/main/actions`, CI-Feature) projiziert GitHub-Actions-Läufe, lokale Runner-Ausführungen und agentische Diagnosen auf eine Übersicht aller Läufe und eine Workflow-Ansicht. Er besitzt keine eigene Persistenz; alle Daten stammen aus dem Orchestrations-Snapshot und den bestehenden CI-Anfragen.

Der vollständige Laufzeitvertrag für Runner, Freigaben, automatische Übernahme und Wiederholung steht unter [Managed local CI](managed-local-ci.md). Manuelle Befehle bleiben auf die im Hauptfenster ausgewählten Workspaces begrenzt. Die Hintergrundübernahme prüft stattdessen die dauerhafte Freigabe eines aktivierten Workspace für lokale CI; die Ansicht eines anderen Workspace entzieht diese Freigabe nicht.

## Implementierter Stand

### Zuständigkeiten

| Einheit                | Verantwortung                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ActionsView`          | Werkzeugleisten-Registrierung (`WindowToolbarDirective`), Workflow-Liste, veraltete Daten, Lade- und Leerzustand, Wahl der Unteransicht, gemeinsames Kontextmenü  |
| `ActionsAllRunsView`   | `Running now` und `History`                                                                                                                                       |
| `ActionsWorkflowView`  | Workflow-Kopf mit Dispatch, Lauftabelle und aufklappbares Diagnosebanner für einen fehlgeschlagenen ausgewählten Lauf                                             |
| `ActionDrawerView`     | Laufaktionen im Drawer-Kopf, Jobdiagramm, Timeline mit Jobs, Schritten und Protokoll sowie ausstehende Deployment-Freigaben                                       |
| `ActionsViewPresenter` | Zustand (Filter, Sortierung, Seitengröße, Laufwahl, Dispatch-Formular), Projektionen und alle Befehle; einzige Instanz je Route, von den Unteransichten injiziert |
| `actionsOverview/*`    | reine Projektionsfunktionen, je Datei eine, mit Spezifikation daneben                                                                                             |
| `pipes/*`              | reine Formatierungen (Ergebnis-Badge, Runner, Dauer, Startzeit, Revisionszeile, Workflow-Punkt, Schrittsymbol)                                                    |

Eingaben: `CiStore` (`runs`, `workflows`, `remoteData`, `localCiRunningRunId`, `localCiStartedAt`, `continuousIntegrationRunsBusy`, `localCiEnabledFor`) und der Port `CI_ACTION_CONTEXT` (Snapshot-Felder `localCiExecutions`, `executions`; Einstellungen `repositoryBindings`, `agentProfiles`, `runtime.agenticDelivery`). `ICiAgentExecution` ist eine strukturelle Teilmenge der Ausführungsdatensätze, damit das CI-Feature nicht vom Execution-Feature abhängt. `EXECUTION_OPERATIONS` wird optional injiziert.

### Initiales Laden und überlappende Aktualisierungen

Der Einstieg in Actions wartet auf die bestehende Anwendungsinitialisierung und fordert anschließend mit `ci.runs.refresh` und `includeWorkflowCatalog: true` Workflow-Definitionen und Läufe an. Der Hydratable-Ladezustand endet erst nach dieser Anfrage. Die Definitionen liefern auch Workflows ohne Läufe sowie deren Dispatch-Fähigkeiten. Manuelles `Refresh` und `Retry` nutzen dieselbe inklusive Anfrage; gewöhnliche Laufaktualisierungen behalten die gespeicherten Definitionen bei.

Ein gemeinsamer Projektionsbesitzer verwaltet je aktiver Scope-Kennung die laufende Provideranfrage und merkt, ob sie den Katalog einschließt. Eine Laufanfrage darf eine laufende inklusive Anfrage teilen. Eine inklusive Anfrage darf dagegen keine reine Laufanfrage als Erfüllung ihres Katalogbedarfs behandeln: Sie wartet deren Abschluss ab und startet danach einen vollständigen Read. Mehrere wartende inklusive Aufrufer teilen diesen nachfolgenden Read. Ein bereits laufender vollständiger Read wird im selben Scope von beiden Anfragearten geteilt.

Nach dem Warten wird der aktuelle Scope erneut bestimmt. Ein Read des vorherigen Scopes darf keine Projektion für den neu gewählten Scope speichern. Erfolgreiche Laufaktualisierungen speichern neue Läufe zusammen mit dem bisherigen Katalog; schlägt der anschließende Katalog-Read fehl, bleibt genau diese zuletzt gespeicherte Projektion mit dem bestehenden Fehler-/Veraltetstatus verfügbar. Ohne gespeicherte Projektion liefert die vorhandene Fehlerbehandlung leere Daten und den Fehlerstatus. Diese Reihenfolge ändert keine Provider-Timeouts, Wiederholungsregeln oder Pollingintervalle. Der aktuelle Besitzer ist `ContinuousIntegrationProjectionService`; der Route-Einstieg bleibt bei `hydrateActionsRoute` und `ActionsViewPresenter`.

### Höhenvertrag, Scrollen und Workflow-Auswahl

Die Actions-Route erhält eine begrenzte verfügbare Höhe aus der Fensterkomposition. Jeder beteiligte Flex-/Grid-Elterncontainer erlaubt mit Mindesthöhe null das Schrumpfen seiner Kinder und begrenzt äußeren Überlauf. Der Bildschirm darf durch zusätzliche Zeilen oder langen Text nicht höher als sein zugewiesener Bereich werden. Die Werkzeugleiste gehört weiterhin zum festen Fensterkopf. Der optionale Hinweis auf veraltete Daten, der Ansichtskopf und die Dispatch-Aktionen stehen außerhalb der jeweiligen Inhalts-Scroller.

`All runs` teilt den verbleibenden Platz in zwei gleich hohe Grid-Zeilen. Die erste besitzt den festen Titel `Running now` und eine intern scrollbar begrenzte Aktivitätsliste. Die zweite besitzt den festen Titel `History`, eine begrenzte Tabelle sowie bei Bedarf `Show older runs` außerhalb des Tabellen-Scrollers. Es entsteht dort kein zusätzliches Detail-/Logpanel.

Die Workflow-Ansicht hält Workflow-Name, Dateipfad und Dispatch-Aktionen fest. Ein offenes Dispatch-Formular nimmt höchstens 45 Prozent der Höhe ein und scrollt intern. Die Lauftabelle belegt den übrigen Platz abzüglich eines etwaigen Diagnosebanners. Die Mosaik-Tabelle ist die einzige Oberfläche mit Rahmen um das Grid. Ihr begrenzter Viewport scrollt vertikal und horizontal, der Tabellenkopf haftet oben. Die Virtualisierung rendert den sichtbaren Zeilenbereich und einen Überhang, sodass auch bei langen Historien nur ein Teil der Zeilen im DOM steht. Die Revisionsspalte behält mindestens 180 Pixel Breite.

Unter der Tabelle erscheint für einen ausgewählten fehlgeschlagenen Lauf ein Mosaik Banner mit `variant="highlight"` und `appearance="soft"`. Sein Kopf nennt den Lauf und hält die verfügbare Reparaturaktion sowie einen etwaigen Reparaturstatus sichtbar. Die Erklärung ist standardmäßig eingeklappt und an die Laufkennung gebunden. Beim Aufklappen scrollt der Erklärungsinhalt innerhalb eines auf 144 Pixel begrenzten Bereichs. Der Bereich darf den Tabellen-Viewport verkleinern, ohne den Workflow-Kopf oder die Tabelle aus dem Fenster zu schieben. Bei anderen Laufzuständen füllt die Tabelle diesen Platz.

Workflow-Punkt und Name sind über den öffentlichen `icon`- beziehungsweise `label`-Slot eines einzigen Mosaik-Buttons zusammengesetzt. Derselbe Button besitzt Auswahl, Hover, Tastaturbedienung und den vollständigen zugänglichen Namen. Ein explizites Mosaik-Tooltip umschließt den Button als sein öffentliches Control und zeigt den vollständigen Namen; deaktivierte Workflows ergänzen `Disabled on GitHub`. Der native öffentliche `trigger`-Tokenvertrag `hover focus` aktiviert beide Bedienwege; die Bibliothek übernimmt Platzierung, Randbegrenzung, Escape und Aufräumen beim Entfernen. Die Auswahl deaktivierter Workflows bleibt erlaubt, ihre Dispatch-Bedingungen bleiben unverändert.

### Laufzeilen (`buildActionRunRows`)

Jeder GitHub-Lauf erscheint genau einmal als `IActionRunRow`:

1. Lokale Ausführungen werden je `ciRunId` auf die jüngste (`startedAt`) des aktuellen `runAttempt` reduziert (Ausführungen ohne `runAttempt` zählen als Versuch 1) – dieselbe Paarung wie im Laufpanel.
2. Führt der lokale Runner den Lauf gerade aus (`localCiRunningRunId === run.id`), ist die Zeile `in-progress`, Runner `github-local`, Start = `localCiStartedAt`.
3. Sonst gilt das lokale Ergebnis, wenn der GitHub-Lauf nicht aktiv ist und `local.finishedAt >= run.finishedAt`; Start und Ende stammen dann aus der lokalen Ausführung. Mit lokaler Ausführung ist der Runner `github-local`, sonst `github`.
4. Lokale Ausführungen ohne GitHub-Lauf im Snapshot bleiben als `Local workflow` mit Runner `local` erhalten.
5. Ein aktiver lokaler Start ohne GitHub-Lauf (Anfrage-ID `workflow:<workflowId>` oder unbekannte Lauf-ID) erscheint als laufende Zeile mit Runner `local`.

Alle Zeilen sind absteigend nach `startedAt`, ersatzweise `finishedAt`, sortiert.

### Projektionen

| Projektion           | Regel                                                                                                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Filter               | `status` (aus `?status=` oder Menü), `actor`, `query` (`?q=`, kleingeschrieben) über Workflow, Titel, Autor, Ereignis, Branch, Revision, Status, Laufnummer                                                                                                                       |
| `Running now`        | gefilterte Zeilen mit `queued` oder `in-progress`; `in-progress` vor `queued`, dann neueste zuerst                                                                                                                                                                                |
| `History`            | gefilterte abgeschlossene Zeilen nach Startzeit (`started-descending` Standard); Seite = 10, `Show older runs` +10; `hasOlderRuns`, solange weitere existieren                                                                                                                    |
| Workflow-Punkt       | `failing`, wenn die abgeschlossene Zeile mit dem jüngsten `finishedAt` `failed` ist; sonst `running` bei einer aktiven Zeile; sonst `passing` bei `succeeded`; sonst `idle`                                                                                                       |
| Workflow-Reihenfolge | `failing`, `running`, `passing`, `idle`, innerhalb gleich nach Name                                                                                                                                                                                                               |
| Untertitel           | Repository-Anzeigename (bei mehreren `<n> repositories`), ` · <n> running` (aktive Zeilen, ungefiltert), ` · <n> failing` (Workflows mit Punkt `failing`)                                                                                                                         |
| Gewählter Lauf       | explizite Wahl, sonst `?run=`, sonst die jüngste abgeschlossene, sonst die erste Zeile des Workflows                                                                                                                                                                              |
| Fehlernachweise      | Die Workflow-Ansicht ermittelt bei `failed` den ersten fehlgeschlagenen Schritt, ersatzweise den fehlgeschlagenen Job. Der Auszug für Reparaturen nutzt `failureLog`, lokales `failureLog` oder `logOutput` in dieser Reihenfolge und begrenzt sich auf die letzten zwölf Zeilen. |

Der Presenter liest `ci.run.details` in der Workflow-Ansicht nur für den ausgewählten fehlgeschlagenen GitHub-Lauf. Der Schlüssel `<runId>:<runAttempt>:<status>` bindet das Ergebnis an die konkrete Auswahl. Ein Ergebnis für einen inzwischen abgewählten Lauf wird verworfen. Fehlt der Abruf, kann ein bereits vorhandener lokaler Fehlernachweis weiter als Reparaturkontext dienen.

### Adresse und Navigation

- `?workflow=<id>` wählt den Workflow; `selectWorkflowCommand` navigiert mit `queryParamsHandling: 'merge'` und entfernt `run`, damit Back/Forward die Auswahl schrittweise zurücknehmen. Unbekannte IDs zeigen `All runs`.
- `?workflow=<id>&dispatch=github` (Befehl `Run <workflow> on GitHub` der Befehlspalette) ist eine einmalige Absicht: Sobald die Workflows geladen sind, öffnet der Bildschirm das Dispatch-Formular dieses Workflows (unbekannte IDs: kein Formular) und entfernt `dispatch` mit `replaceUrl`; `workflow` bleibt als Auswahl stehen. Das Formular erscheint nur in der Ansicht seines eigenen Workflows.
- `?run=<ciRunId>` ohne `workflow` wählt den Workflow des Laufs und den Lauf. Den Drawer öffnet weiterhin die Shell (`PresenterViewPresenter`) einmal je Lauf-ID.
- Klick, Eingabetaste und Leertaste auf einer Laufzeile in History oder im Workflow-Grid führen in denselben Drawer. Die Workflow-Ansicht übernimmt die Laufkennung für die Auswahl und das Diagnosebanner. In beiden Fällen bleibt die aktuelle Route stehen.
- Ein Rechtsklick oder Umschalt+F10 öffnet ein gemeinsames ngPEL-Kontextmenü mit der betroffenen Zeile als Kontext. Beide Tabellen verwenden `ngpContextMenuTriggerFor`. Der Mosaik-Zeilenwert enthält das Laufobjekt, das die Integration aus dem Menüereignis ermittelt. Die Route stellt ein `ngp-context-menu` mit Mosaik Menu und Menu Items bereit. Die Menüöffnung löst weder eine Laufaktion noch die Drawer-Öffnung aus. Erst die Aktivierung eines Eintrags führt den Befehl für dessen Zeile aus.
- `View log` verwendet denselben Öffnungspfad. Die Route ruft `DrawerService` mit `ActionDrawerView` und der Projektion `toActionDrawerRun` auf. Ein bereits offener Drawer dieses Bildschirms erhält `requestAttention()`.

### Laufdetails, Diagramm und Protokoll

Der Drawer zeigt die verfügbare Zusammenfassung sofort. Seine feste Werkzeugleiste im `suffix`-Slot des Mosaik Drawer Header gruppiert den externen Lauflink, zulässige Wiederholungen, gegebenenfalls das Stoppen des lokalen Runners und Schließen. Remote Stop und Cancel gehören zum Kontextmenü der Laufzeile und zu den aktiven Läufen unter `Running now`. Ausstehende Deployment-Freigaben bleiben am Lauf, weil die Entscheidung an Zielumgebung und exakte Revision gebunden ist.

Der Drawer lädt Details über `ci.run.details`. Während dieses Abrufs nimmt für bekannte GitHub-Läufe ein Mosaik Skeleton die Diagrammhöhe von 12 rem ein. Die Action-Log-Überschrift bleibt an derselben Stelle. Ein Job-Platzhalter verwendet die Marker-, Titel- und Statusanordnung der echten Timeline, da die Job- und Schrittzahl vor dem Abruf unbekannt ist. Sobald die Details vorliegen, rendert der Drawer ihre Jobs und Schritte auch dann, wenn das vollständige Protokoll noch lädt. Ein leerer oder fehlgeschlagener Abruf zeigt einen passenden Leerzustand. Abgeschlossene Läufe lesen das Protokoll über den bestehenden geordneten Chunk-Vertrag. Der Drawer aktualisiert wartende und laufende Läufe etwa alle fünf Sekunden, bis kein weiterer aktiver Zustand vorliegt. Weitere verfügbare Chunks werden im Abstand von 250 Millisekunden gelesen. Ein fehlgeschlagener Abruf des vollständigen Protokolls wird bei einem abgeschlossenen Lauf beim nächsten Öffnen erneut versucht. Das Schließen räumt den Timer des Drawers auf.

Eine verfügbare Workflow-Definition mit Jobs wird als Mosaik Flow dargestellt. Das native Punktraster bewegt sich beim Verschieben und Zoomen mit. Eine bündige Mosaik Card mit Outline und direktem Content-Slot bildet den Außenrahmen des Viewports. Das Außenmaß beträgt wie beim Skeleton 12 rem. Die Darstellung nutzt die beim Lauf verwendete Definition, die daraus aufgelösten Abhängigkeiten und die tatsächlich gemeldeten Jobausführungen. Dagre misst und ordnet die Knoten von links nach rechts an. Die orthogonale Mosaik-Führung verbindet ausgehende Kanten über die Mitte der rechten Knotenseite und markiert jedes Ziel mit einem Pfeil. Bei parallelen Zielen in derselben Spalte teilen sich die Kanten dadurch den Stamm und zweigen erst zu den einzelnen Jobs ab. Der erste gemessene Ausschnitt startet mit Zoom 0,8. Passt das Diagramm mit Innenabstand vollständig hinein, wird es zentriert. Andernfalls zeigt der Ausschnitt den linken Rand des Diagramms und zentriert den ersten Job ohne eingehende Abhängigkeit vertikal. Danach bleiben Verschieben, Zoom und Fit per nativer Maus-, Touch- oder Tastaturbedienung von Mosaik verfügbar. Die optionalen Slots für Minimap und Zoomschaltflächen bleiben frei. Weitere Layout-Ereignisse lassen den gewählten Ausschnitt stehen.

Der Drawer fixiert Diagramm und Action-Log-Überschrift. Nur der Bereich mit der Timeline und etwaigen ausstehenden Freigaben scrollt. Job-, Schritt- und Protokollmarker verwenden die öffentliche große Markergröße und mittlere Symbolgröße. Ein aktivierter Einzeljob fokussiert den zugehörigen Eintrag und verschiebt ausschließlich den Log-Bereich. Matrix-Jobs mit Ausführungen bieten eine Auswahl der konkreten Ausführung. Die Timeline enthält auch nicht zugeordnete Jobs und unzugeordnetes Protokoll. Ein vorhandener Job-Link öffnet den Job auf GitHub. Die Graphprojektion benötigt keine neue Persistenz, keine geänderte IPC-Nachricht und keine eigene Workflow-Ausführung.

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

### Hintergrundabfrage mehrerer CI-Anbindungen

`GitHubCloudProvider.listRuns('operational')` liest die bestehenden aktivierten
GitHub-Actions-Bindungen unabhängig von der Auswahl im Hauptfenster. Die agentische
Automation benötigt diese Liste, bevor sie ihre Freigaben je Workspace und
Repository auf die Läufe anwendet. Ein gewöhnlicher Lesefehler einer einzelnen
Bindung, etwa ein nicht mehr verfügbares Repository mit HTTP 404, darf deshalb
erfolgreich gelesene Läufe anderer Bindungen nicht verwerfen.

Dieser operative Aufruf und die automatische lokale Laufentdeckung sammeln die
Ergebnisse der einzelnen Bindungen mit `Promise.allSettled`. Eine Bindung umfasst ihren bisherigen Abruf der jüngsten
50 Läufe und deren Projektion. Erfolgreiche Ergebnisse werden in Bindungsreihenfolge
zusammengeführt; ein erfolgreich gelesenes Repository ohne Läufe zählt als Erfolg.
Fehlt die zugeordnete Repository- oder GitHub-Verbindung, entsteht wie bisher kein
Abruf und damit auch kein erfolgreicher Leseversuch. Scheitern alle tatsächlichen
Leseversuche, wird der erste Fehler in Bindungsreihenfolge weitergegeben. Es gibt
keinen neuen Wiederholungs- oder Persistenzpfad.

Anfragelimits (`RemoteProviderRateLimitError`), ein veränderter Projektionsbereich
(`RemoteProjectionScopeChangedError`) und Abbrüche (`AbortError` oder `ABORT_ERR`)
bleiben Fehler des gesamten Aufrufs, auch wenn andere Bindungen lesbar waren.
Diese Prüfung folgt auch verschachtelten `Error.cause`-Ketten mit Zyklenschutz.
Bereits gestartete Anfragen laufen bis zu ihrem Ergebnis; es wird keine neue
Abbruchsteuerung eingeführt. Die vorhandene Kontoregelung begrenzt weiterhin die
GitHub-Anfragen.

Für jeden gewöhnlichen Bindungsfehler erhält der optionale interne Rückruf
`reportReadFailure` die Workspace-, CI-Bindungs- und Repository-Bindungskennung
sowie einen neu erzeugten generischen Fehler mit optionalem HTTP-Status. Rohe
Provider-Ausgaben werden nicht weitergereicht. Die Orchestrator-Komposition
schreibt dies als strukturiertes Ereignis `github.ci-run-read.failed` in das
bestehende Protokoll. Dieser Rückruf erzeugt keine neue UI-Meldung und keine
Snapshot-Felder.

Der Standardaufruf `listRuns()` beziehungsweise `listRuns('selected')` behält
seine strenge Fehlerbehandlung für die ausgewählten Workspaces. Sein vorhandener
Projektionscache und die Anzeige veralteter Daten ändern sich nicht; operative
Teilergebnisse werden nicht in diesen Cache geschrieben. Der separate Abruf
`listManagedLocalRunCandidates()` verwendet dieselbe Fehlerisolation ausschließlich
für aktivierte Workspaces mit `localCiEnabled: true`. Auch die anschließende
Prüfung wartender Jobs gibt globale Unterbrechungen weiter, statt einen
unterbrochenen Abruf als leeren Kandidatenbestand zu behandeln. Freigaben für
agentische Diagnose, Reparatur und lokale Runner gelten weiterhin unverändert.

Die Implementierung liegt in `GitHubCloudProvider` und dessen Optionen; die
Protokollanbindung liegt in `apps/orchestrator/src/main.ts`, der operative
Verbraucher in `AutomationService.processAgenticDeliveries`. Die benachbarte
Provider-Spezifikation muss einen isolierten Repository-Fehler mit gesunden
Läufen, einen leeren erfolgreichen Abruf, ausschließlich fehlgeschlagene Abrufe,
die strenge ausgewählte Ansicht, globale Unterbrechungen und die bereinigte
Bindungsdiagnose abdecken. Bestehende Konfigurationen, IPC-Schemas und gespeicherte
Projektionen benötigen keine Migration.

### Fehlerursachen vor dem ersten Job-Schritt

Ein GitHub-Lauf kann fehlschlagen, bevor ein Runner einen Schritt ausführt. Der
Job liefert dann keine Schritte und unter Umständen kein abrufbares
Ausführungsprotokoll. Beim Lesen seiner Details bleibt ein vorhandenes
Fehlerprotokoll vorrangig. Fehlt es, liest der GitHub-Adapter für höchstens fünf
Jobs mit `conclusion: failure`, leerer Schrittliste und Check-Run-Verweis die erste
Seite mit höchstens 100 Check-Run-Annotationen je Job. Nur nicht leere Meldungen
mit `annotation_level: failure` zählen; Warnungen und Hinweise werden verworfen.
Jobname, optionaler Annotationstitel und Meldung bilden je eine Zeile des
bestehenden Felds `failureLog`. Die vorhandene Begrenzung auf 64.000 Zeichen und
Zugangsdatenbereinigung gelten auch für diesen Ersatzinhalt. Der Actions-Bildschirm
nutzt ihn als Fehlernachweis für Diagnose und Reparatur. Der Drawer zeigt den verfügbaren Inhalt im Protokoll. Der IPC-Vertrag erhält kein zusätzliches Feld.

Scheitert der normale Abruf des Fehlerprotokolls, verwendet auch der bestehende
streambare Protokollabruf mit `kind: failure` dieses Detailergebnis als Ersatz.
Für `kind: output` bleibt ein gescheiterter Protokollabruf ein Fehler. Die
bestehenden geordneten Chunks von höchstens 60.000 Zeichen und der auf zehn
Fehlerprotokolle begrenzte Cache bleiben erhalten; es entsteht kein eigener
Darstellungs- oder Speicherpfad für Annotationen.

Der Adapter extrahiert aus dem Check-Run-Verweis nur die numerische Kennung und
rekonstruiert die Anfrage unter dem bereits autorisierten Repository und Host.
Er ruft keine vom Job gelieferte URL direkt auf. Die Annotationen verwenden den
bestehenden Anfrageregler des GitHub-Kontos. Ein fehlgeschlagener Abruf verwirft
die Job-Projektion nicht; bei einem Anfragelimit werden keine weiteren
Annotationen gelesen. Ohne geeignete Meldung bleibt das Fehlerprotokoll wie zuvor
nicht verfügbar. Dieser Leseweg startet keinen erneuten Workflow-Lauf und ändert
keine Actions-Budgets, Berechtigungen oder Repository-Dateien.

`GitHubCloudProvider.getRunDetails` und `getRunLogChunk` besitzen diesen Ersatzpfad. Seine benachbarte
Spezifikation muss vorhandene Fehlerprotokolle, Jobs mit Schritten, die Grenzen
von fünf Jobs und 100 Annotationen, das Verwerfen anderer Meldungsstufen,
Zugangsdatenbereinigung, unbrauchbare Check-Verweise sowie fehlschlagende und
limitierte Annotationen sowie den Fehlerprotokoll-Stream abdecken. Die Actions-Projektion verwendet für die Reparaturrückmeldung weiter die letzten zwölf Zeilen nach Entfernen äußerer Leerzeilen.

## Migrationsverträge und offene Punkte

- Das Seitenleisten-Abzeichen (`countFailingWorkflows`) zählt nur GitHub-Ergebnisse; Untertitel und Workflow-Punkte berücksichtigen ein neueres Ergebnis des lokalen Runners. Beide stimmen überein, sobald das Abzeichen dieselbe Zeilenprojektion nutzt.

- Das Laufpanel (`currentActionRuns` in der Shell) zeigt bei GitHub nur eingereihte Läufe nicht, `Running now` schon. Das Abnahmekriterium „dieselben laufenden und eingereihten Läufe“ verlangt, dass die Shell eingereihte Cloud-Läufe aufnimmt.
- Die Klassifizierung einer Diagnose (`source`, `workflow`, …) steht nur im Auslieferungsjournal, das der Snapshot nicht enthält; das Abzeichen `Source failure` des Entwurfs entfällt bis zu dessen Projektion.
- `Fix with AI` nutzt die bestehende Überarbeitung; eine eigene manuelle CI-Reparatur über das Auslieferungsjournal benötigt eine neue Orchestrierungsanfrage.

## Abnahme

- `/main/actions` öffnet `All runs`; `actions-running` listet alle aktiven Zeilen, `actions-history` die abgeschlossenen, neueste zuerst.
- Ein Einstieg ohne gespeicherten Katalog liest Workflow-Definitionen. Trifft er auf einen laufenden reinen Lauf-Read, folgt genau ein von inklusiven Aufrufern geteilter Katalog-Read. Ein Fehler erhält die zuletzt gespeicherten Läufe und Definitionen; ein Scope-Wechsel speichert keine alten Daten unter dem neuen Scope.
- Ein Workflow-Klick setzt `?workflow=`; Back führt zu `All runs` zurück.
- `?run=` öffnet den Drawer und wählt Workflow und Lauf.
- Filter, Suche und `?status=` grenzen alle Listen ein.
- Lange Lauflisten scrollen im begrenzten Mosaik-Viewport bei sichtbarem Tabellenkopf. Ein aufklappbares Diagnosebanner bleibt bei einem fehlgeschlagenen ausgewählten Lauf unter der Tabelle erreichbar.
- Einzelklick, Eingabetaste und Leertaste öffnen den Lauf in seiner aktuellen Ansicht. Rechtsklick und Umschalt+F10 öffnen das Menü der korrekten Zeile. Remote Stop und Cancel sind aus dem passenden Menüeintrag erreichbar.
- Der Drawer hält seine Aktionen neben Schließen. Jede Schaltfläche im Drawer-Kopf hat einen Mosaik Tooltip mit lokalisiertem Aktionsnamen für Hover und Tastaturfokus. Der Ladezustand reserviert dieselbe Höhe wie das gerahmte Diagramm mit Punktraster. Das kompakte Diagramm beginnt bei 80 Prozent Zoom. Job-Aktivierung per Maus und Tastatur fokussiert den richtigen Logeintrag, auch nach Matrix-Auswahl.
- Klick auf Statuspunkt und Name wählt dasselbe Workflow-Item; Hover und Tastaturfokus zeigen dessen vollständigen Namen, bei deaktivierten Workflows zusätzlich den Grund.
- Das simulierte Testprofil `SYMPHONY_SIMULATED_CI_LAYOUT_FIXTURE=1` liefert ausschließlich im simulierten CI-Adapter bis zu 120 Läufe je Workflow, eine kurze Verzögerung beim Laden der Laufdetails für die Skeleton-Prüfung, einen fehlgeschlagenen Lauf mit langem Protokoll und einen deaktivierten Workflow mit langem Namen. Ohne das Profil bleiben Katalog, Laufanzahl und Ergebniszustände unverändert. Der bestehende `SYMPHONY_SIMULATED_CI_JOB_COUNT` erzeugt lange Joblisten. Beide Einstellungen sind interne Teststeuerung und keine Produkteinstellungen.
- Spezifikationen: `libs/frontend/features/ci/src/lib/actions/view-presenters/**/*.spec.ts`, `libs/frontend/features/ci/src/lib/pipes/*.spec.ts`; E2E: `apps/renderer-e2e/src/actions-workflows.spec.ts`.
