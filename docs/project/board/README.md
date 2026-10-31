# Board

Das **Board** zeigt die Work Items der gewählten Workspaces in den Spalten ihres Trackers, etwa eines GitHub Projects oder eines Azure-DevOps-Boards. Es beantwortet auf einen Blick, was dich braucht, woran gerade ein Agent arbeitet und wie weit jedes Work Item auf dem Weg von der Analyse bis zur Abnahme ist. Vom Board aus öffnest du ein Work Item, verschiebst es in eine andere Spalte, startest den nächsten Schritt, legst neue Work Items an und bündelst zusammengehörige Work Items zu einer gemeinsamen Auslieferung.

## Was das Feature bietet

- Vier Segmente grenzen das Board auf alles, auf das, was dich braucht, auf laufende Agents oder auf deine eigenen Work Items ein.
- Ein Repository-Chip und das Menü **Filter** grenzen nach Repository, Board, Spalte, Label und zuständiger Person ein.
- Spalten für noch nicht analysierte und für abgeschlossene Arbeit sind zunächst schmale Streifen; jede Spalte lässt sich auf- und zuklappen, und deine Wahl bleibt erhalten.
- Jede Karte zeigt Kennung, Titel, wer daran arbeitet, einen Statushinweis und den Fortschritt über fünf Auslieferungsschritte.
- Das Kartenmenü bietet die Schritte, die die Spalte des Work Items erlaubt, Verschieben, Zuweisen, Aktionen des Pull Requests und Verweise in den Tracker.
- Mehrere Karten lassen sich auswählen und als Gruppe gemeinsam ausliefern.
- **New work item** und das **+** jeder Spalte öffnen das Anlegen eines Work Items.

## Voraussetzungen

- Ein gewählter Workspace mit mindestens einer aktiven Work-Item-Quelle (Board). Ohne gewählten Workspace nennt die Werkzeugleiste **Select a workspace to load its work items.**
- Zum Anlegen muss feststehen, in welches Board ein neues Work Item gehört: Es ist im Menü **Filter** gewählt, oder der Umfang enthält nur ein Board. Ein einzelner Workspace ohne eingerichtetes Board (simulierter Tracker) kann ebenfalls anlegen. Sonst ist **New work item** gesperrt und nennt **Select one board to create a work item**.
- Das Segment **Mine** setzt voraus, dass in den Einstellungen des Workspace ein GitHub-Konto angemeldet ist (siehe [Workspaces](../workspaces/README.md)).
- Schritte wie **Analyze now** oder **Implement now** brauchen ein eindeutig zugeordnetes Repository; ist es noch nicht lokal vorbereitet, fragt Symphony zuerst **Prepare … locally?**.

## Aufbau

Die Werkzeugleiste trägt den Titel **Board** und darunter die gewählten Workspaces mit der Zahl ihrer Work Items, etwa `Example · 42 work items`. Rechts liegt **Refresh work items and build runs**. Der Synchronisierungsstand mit GitHub steht in der [Statusleiste](../window-and-navigation/README.md), nicht auf dem Bildschirm.

Darunter liegt die Filterleiste: links die Segmente, danach die gerade wirksamen Einschränkungen und die Aktionen einer Auswahl, rechts der Repository-Chip, **Filter** und **New work item**. Die Spalten folgen darunter in der Reihenfolge des Trackers.

### Segmente

| Segment                | Inhalt                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **All**                | alle Work Items im Umfang                                                                                                                                                                                                                                           |
| **Needs you · n**      | Work Items, deren letzter Lauf fehlgeschlagen ist oder die Symphony so nicht weiterbewegen würde, etwa weil die Analyse fehlt oder noch nicht als bereit gilt, ein kritisches Risiko gemeldet ist oder eine harte Abhängigkeit offen ist                            |
| **Agents running · n** | Work Items, an denen gerade ein Lauf arbeitet oder auf seine Fortsetzung wartet; eingereihte Läufe zählen nicht                                                                                                                                                     |
| **Mine**               | Work Items, die einem der GitHub-Konten zugewiesen sind, mit denen die gewählten Workspaces angemeldet sind; Groß- und Kleinschreibung des Kontonamens spielt keine Rolle. Ohne angemeldetes Konto ist das Segment gesperrt und nennt den Weg in die Einstellungen. |

Die Zahlen gelten für alle Work Items im Umfang, unabhängig von Filtern; ohne Treffer entfällt die Zahl. Es ist immer genau ein Segment gewählt. Dieselbe Auswahl wie **Needs you** zählt die Seitenleiste neben **Board**.

### Repository und Filter

- Der Repository-Chip erscheint, sobald Work Items einem Repository zugeordnet sind. Er zeigt das gewählte Repository, bei nur einem Repository dieses, sonst **All repositories**. Sein Menü bietet **All repositories** und jedes Repository der Work Items.
- **Filter** öffnet ein Menü mit **Columns**, **Labels** und **Assignees**, jeweils mit **All …** und den vorhandenen Werten. Enthalten die gewählten Workspaces mehr als ein Board, steht zuoberst **Board** mit **All boards** („Merge every board in the selected workspaces“) und jedem Board samt Herkunft, etwa `GitHub Project · example #3`. Die Board-Wahl wird gespeichert und gilt auch für Overview und nach einem Neustart.
- Sind Spalte, Label oder zuständige Person gewählt, heißt die Schaltfläche **Filter · n**. Eine gewählte Spalte blendet alle anderen Spalten aus.
- Bei **All boards** führt das Board die Spalten mehrerer Boards zusammen: Spalten derselben Workflow-Stufe, sonst gleichen Namens, erscheinen als eine Spalte. Work Items ohne Spalte im Tracker (bei GitHub „No status“) sammelt die Spalte **No column**, die nur dann erscheint.
- Eine Suche erscheint als Chip `“Suchtext”`; ein Klick hebt sie auf. Gesucht wird in Kennung, Titel, Beschreibung, Repository, Implementierungs-Branch, Projektfeldern, Labels und zuständigen Personen. Die Suche setzt du über die [Befehlspalette](../command-palette/README.md) mit **Filter Board by “…”**.
- Hast du in [Orbit](../orbit/README.md) eine Stufe gewählt, gilt sie auch hier und erscheint als **Clear stage filter**.

Segment, Repository und zuständige Person gelten nur, solange das Board geöffnet ist. Suche, Spalte, Label und die Stufe aus Orbit bleiben für die laufende Sitzung erhalten und gelten auch in Orbit.

### Spalten

Jede Spalte zeigt ihren Namen und die Zahl ihrer sichtbaren Work Items, daneben **+** (**New work item in …**) und einen Pfeil zum Einklappen (**Collapse …**). Eine leere Spalte sagt **No items in …**.

Eine eingeklappte Spalte ist ein schmaler Streifen mit der Zahl und dem senkrecht laufenden Namen. Ein Klick, **Enter** oder die Leertaste klappt sie auf; Karten lassen sich auch auf einen Streifen ziehen.

| Ausgangslage                                                                                            | Darstellung                                                                            |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Spalte der Anfangsstufe des Workflows, einer Stufe, die nur analysiert, oder einer abschließenden Stufe | zunächst eingeklappt; im ausgelieferten Ablauf **Backlog**, **Qualified** und **Done** |
| jede andere Spalte, auch **No column**                                                                  | zunächst aufgeklappt                                                                   |
| Du hast eine Spalte auf- oder zugeklappt.                                                               | Deine Wahl gilt, bis du sie änderst, auch nach einem Neustart.                         |
| Suche, Segment, Spalten-, Label-, Personen- oder Stufenfilter findet Work Items in einer Spalte.        | Eine nur standardmäßig eingeklappte Spalte klappt auf, solange die Einschränkung gilt. |
| Du hast diese Spalte ausdrücklich zugeklappt.                                                           | Sie bleibt auch bei Treffern zu; die Zahl auf dem Streifen zeigt die Treffer.          |
| Der Repository-Chip schränkt ein.                                                                       | Eingeklappte Spalten bleiben eingeklappt.                                              |
| Du klappst eine Spalte zu, deren Karten ausgewählt sind.                                                | Diese Karten verlassen die Auswahl.                                                    |

Lange Spalten scrollen für sich; auch Spalten mit Hunderten von Karten bleiben flüssig.

## Die Karte

Eine Karte zeigt:

- oben die Kennung des Work Items in Festbreitenschrift, beim Überfahren **More actions** und rechts den Avatar: den Agent des letzten Laufs, sonst die erste zuständige Person,
- den Titel,
- einen Statushinweis, gegebenenfalls mit einem Gruppenhinweis daneben,
- eine Fortschrittsleiste aus fünf Abschnitten für **Analysis**, **Solution**, **Implementation**, **Checks** und **Acceptance** mit der Angabe `n/5`.

### Statushinweis

Der Hinweis nennt das Erste, was in dieser Reihenfolge zutrifft:

| Lage                                                                                 | Hinweis                                                                         |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Das Work Item gehört zu **Needs you**, und sein letzter Lauf ist fehlgeschlagen.     | **‹Schritt› failed**, rot                                                       |
| Das Work Item gehört aus einem anderen Grund zu **Needs you**.                       | **Waiting for you**, rot; beim Überfahren nennt ein Hinweis bis zu drei Gründe  |
| Ein anderer Rechner führt gerade die Analyse oder Umsetzung aus.                     | **Analyzing elsewhere** oder **Solving elsewhere**, gegebenenfalls mit `@Konto` |
| Ein Lauf arbeitet daran oder wartet auf Fortsetzung.                                 | **‹Schritt› running**                                                           |
| Die Checks des Pull Requests laufen.                                                 | **Checks running**                                                              |
| Ein Lauf ist eingereiht.                                                             | **‹Schritt› queued**                                                            |
| Die Checks des Pull Requests sind fehlgeschlagen.                                    | **Checks failed**, rot                                                          |
| Der Pull Request hat einen Konflikt mit seiner Basis oder liegt hinter ihr.          | **Conflicts with base** beziehungsweise **Behind base**                         |
| Das Work Item steht in der abschließenden Spalte.                                    | **Done**                                                                        |
| Alles bis auf die Abnahme ist erledigt, und die Spalte wartet auf eine Entscheidung. | **Ready to review**                                                             |
| Die Spalte setzt um, prüft aber nicht.                                               | **Ready for an agent**                                                          |
| sonst                                                                                | der Name der Spalte                                                             |

‹Schritt› ist der Auslieferungsschritt, an dem der Lauf arbeitet: eine Analyse arbeitet an **Analysis** oder, wenn eine Analyse bereits vorliegt, an **Solution**; eine Umsetzung an **Implementation** oder, wenn sie schon umgesetzt ist, an **Checks**. Die roten Hinweise sowie **Analyzing elsewhere**, **Solving elsewhere** und **Conflicts with base** tragen zusätzlich ein Symbol, damit die Farbe nicht allein die Bedeutung trägt.

Neben dem Hinweis kann erscheinen:

- **Group needs attention**, wenn das Work Item zu einer angehaltenen Gruppe gehört; der Hinweis öffnet die Gruppe.
- **Take together?** oder **Critical path**, wenn eine offene Analyse dieses Work Item mit anderen über eine gemeinsame Änderungsfläche verbindet; der Hinweis öffnet die Einschätzung („Review the shared change surface before moving this ticket.“).

### Fortschritt

Erledigte Schritte sind gefüllt; ein Schritt, der auf dich wartet oder fehlgeschlagen ist, ist rot gefüllt. Der Fortschritt folgt der Spalte und wird durch den Stand der Analyse ergänzt. Im ausgelieferten Ablauf:

| Spalte                     | Erledigt                                                                  |
| -------------------------- | ------------------------------------------------------------------------- |
| **Backlog**, **Qualified** | 0, mit gespeicherter Analyse 1, mit einer als bereit geltenden Analyse 2  |
| **Ready**                  | 2                                                                         |
| **Progress**               | 2; sobald ein Pull Request besteht oder eine Umsetzung erfolgreich war, 3 |
| **Acceptance**             | 4                                                                         |
| **Done**                   | 5                                                                         |

## Work Item öffnen

Ein Klick auf eine Karte öffnet den [Work-Item-Bildschirm](work-item.md); **Back** führt zurück auf das Board. Ein Klick mit ⌘ (Ctrl außerhalb von macOS) oder Shift öffnet die Karte nicht, sondern nimmt sie in die Auswahl auf oder heraus. Klicks auf Schaltflächen und Menüs in der Karte öffnen sie ebenfalls nicht.

## Kartenmenü

Ein Rechtsklick auf die Karte oder **More actions** öffnet das Menü. Es enthält, soweit zutreffend:

1. **Die Schritte der Spalte.** Läuft gerade etwas, nur **Cancel run**; ist ein Schritt eingereiht, nur **Remove queued analysis** beziehungsweise **Remove queued run**. Sonst die Entscheidungen einer Spalte, die auf dich wartet (im ausgelieferten Ablauf etwa **Approve**, **Ask a question**, **Split**, **Accept** oder **Implementation is wrong**), in einer analysierenden Spalte **Analyze now**, **Re-analyze**, **Retry analysis** oder **Restart analysis**, in einer umsetzenden Spalte **Implement now**, **Repair implementation**, **Retry implementation**, **Restart implementation** oder **Rework implementation**, und nach einer erfolgreichen Umsetzung ohne Pull Request **Create pull request**. Bearbeitet ein anderer Rechner das Work Item, entfallen diese Einträge.
2. **Move forward** und **Move backward** mit dem Namen der Nachbarspalte sowie **Move to** mit allen Spalten des eigenen Boards; die aktuelle ist markiert.
3. **Assign to** mit den Personen, die der Tracker für dieses Repository zulässt; ein Klick weist zu oder nimmt die Zuweisung zurück.
4. **Pull request** `#n`, sobald Symphony einen Pull Request für das Work Item veröffentlicht hat: **Open in GitHub**, **Run remotely** oder **Cancel remote run** und, wenn der Workspace lokale CI erlaubt, **Run locally** oder **Stop local runner**. Sie wirken wie auf dem Bildschirm [Pull Requests](../pull-requests/README.md).
5. **Select for delivery**, **Open work item** und **Show process**; hat das Work Item eine Adresse im Tracker, außerdem **Open in GitHub** und **Copy GitHub URL** (Azure DevOps: **Open in Azure DevOps**, **Copy Azure DevOps URL**; sonst **Open in browser**, **Copy URL**).

Ein Eintrag, der gerade nicht möglich ist, bleibt sichtbar, ist gesperrt und nennt den Grund, etwa **No completed analysis. Move the item back to Qualified first.**, **No workflow run exists for this branch yet.** oder **The local runner is busy with another run.** **Rework implementation** verlangt eine Beschreibung der Nacharbeit und verweist deshalb auf den Work-Item-Bildschirm. Solange eine Aktion an der Karte läuft, ersetzt ein Fortschrittsring die Menüschaltfläche, und alle weiteren Aktionen dieser Karte sind gesperrt.

## Verschieben

- Ziehe eine Karte in eine andere Spalte oder auf einen eingeklappten Streifen. Die Karte wechselt sofort; Symphony schreibt die Spalte in den Tracker und meldet **Moved to …**. Lehnt der Tracker ab, kehrt die Karte zurück, und Symphony meldet **Unable to move the work item.**
- Bei **All boards** landet eine gezogene Karte in der Spalte ihres eigenen Boards mit derselben Workflow-Stufe (sonst demselben Namen), auch wenn die zusammengeführte Spalte zuerst von einem anderen Board stammt. Hat ihr Board keine solche Spalte, bleibt sie stehen, und Symphony meldet **Not moved** („The board of ‹Kennung› has no ‹Spalte› column.“).
- **Move forward**, **Move backward** und **Move to** im Kartenmenü verschieben ebenso, immer in eine Spalte des eigenen Boards.
- Eine Karte, an der gerade ein Lauf arbeitet, bleibt oben in ihrer Spalte und lässt sich nicht ziehen.
- Verbindet eine offene Einschätzung das Work Item mit anderen (**Take together?** oder **Critical path**), verschiebt Symphony nicht sofort, sondern öffnet die Einschätzung mit dem gewünschten Ziel: Die Bestätigung, etwa **Group and move together**, gruppiert und verschiebt alle gemeinsam, **Keep separate** verwirft die Einschätzung und verschiebt nur dieses Work Item.

## Gemeinsam ausliefern

Zusammengehörige Work Items können als Gruppe in einem gemeinsamen Ablauf ausgeliefert werden.

1. Wähle Karten mit ⌘-Klick, Shift-Klick oder **Select for delivery**. Sobald eine Karte ausgewählt ist, trägt jede Karte ein Auswahlkästchen, und ausgewählte Karten sind kräftiger umrandet. Die zuerst gewählte Karte wird die führende Karte der Gruppe.
2. Die Filterleiste zeigt **Deliver together (n)** und **Clear selection**. **Deliver together** ist nur freigegeben, wenn die Auswahl zulässig ist; sonst nennt sie den Grund.
3. **Deliver together** fragt **Group selected tickets**: **Copy directly without AI analysis** gruppiert sofort, **Analyze relationship with AI first** lässt zuerst die AI die Beziehung einschätzen und öffnet danach die Einschätzung zur Bestätigung. Findet die AI nur schwache Hinweise, heißt die Bestätigung **Deliver together anyway**.
4. Ist die Gruppe entstanden, endet die Auswahl.

Eine Karte auf eine andere Karte oder einen Stapel zu ziehen, stellt dieselbe Frage; die Zielkarte, bei einem Stapel dessen führende Karte, wird führend.

| Regel für die Auswahl                                                  | Grund, wenn sie verletzt ist                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| mindestens zwei, höchstens zehn Work Items                             | **Select at least two tickets.** beziehungsweise **Select at most ten tickets.**    |
| die führende Karte hat Workspace, Board und Repository                 | **Delivery groups require a workspace, delivery source, and repository.**           |
| alle aus demselben Workspace, demselben Board und demselben Repository | **Selected tickets span more than one workspace.** (entsprechend Board, Repository) |
| keines gehört bereits zu einer bestehenden Gruppe                      | **‹Kennung› already delivers in a group.**                                          |

Eine aktive Gruppe, deren Work Items alle in derselben Spalte stehen und sichtbar sind, erscheint als Stapel: **n tickets**, der Titel der führenden Karte, `Root · ‹Kennung› · ‹Repository›`, **Delivered in one shared workflow** und darunter die übrigen Titel. Ein Klick öffnet die Gruppe; ihr Menü **More group actions** bietet Verschieben, **Open group details**, **Show shared process**, die Pull-Request-Aktionen der führenden Karte und **Dissolve group…**. Ziehst du einen Stapel bei **All boards**, gilt dieselbe Zuordnung zur Spalte des eigenen Boards wie bei einer Karte. Eine Gruppe wird immer als Ganzes verschoben: Symphony verschiebt die führende Karte und bringt danach die übrigen in dieselbe Spalte. Blendet eine Einschränkung einen Teil der Gruppe aus, erscheinen ihre sichtbaren Work Items einzeln. Ist eine Gruppe angehalten, weil ihre Work Items auseinandergelaufen sind, erscheint sie nicht als Stapel; ihre Karten stehen einzeln und tragen **Group needs attention**. Ein Klick darauf öffnet die Gruppe, in der **Align to root column** alle in die Spalte der führenden Karte bringt und **Dissolve group** sie auflöst.

## Neues Work Item anlegen

**New work item** öffnet das Sheet zum Anlegen; das **+** einer Spalte öffnet es mit dieser Spalte vorausgewählt. Weitere Wege und das Sheet selbst beschreibt [Neues Work Item](new-work-item.md).

## Adressen

Andere Bildschirme öffnen das Board mit einer Einschränkung, etwa Overview über seine Spaltenbalken oder Orbit über **Show on board**. Diese Adressen lassen sich auch als Lesezeichen verwenden:

| Adresse                             | Wirkung                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/main/board?column=<Spalte>`       | zeigt nur diese Spalte; ein leerer Wert hebt die Einschränkung auf                                                                                                                                                         |
| `/main/board?attention=true`        | wählt **Needs you**; hebt Stufe und Label auf, ebenso Spalte und Suche, sofern die Adresse sie nicht selbst setzt. `attention=false` beendet **Needs you**                                                                 |
| `/main/board?q=<Text>`              | setzt die Suche                                                                                                                                                                                                            |
| `/main/board?item=<Work Item>`      | öffnet den Work-Item-Bildschirm dieses Work Items; **Back** führt nicht auf das Board zurück, sondern dorthin, wo du vorher warst                                                                                          |
| `/main/board?item=<…>&process=true` | bleibt auf dem Board und öffnet den Ablauf des Work Items                                                                                                                                                                  |
| `/main/board?create=true`           | öffnet das Sheet zum Anlegen und entfernt den Parameter, damit Neuladen oder **Back** es nicht erneut öffnet; kann kein Board das Work Item aufnehmen, sagt ein Hinweis, warum (siehe [Neues Work Item](new-work-item.md)) |
| `/main/stages`                      | frühere Adresse; führt auf das Board                                                                                                                                                                                       |

Ein unbekanntes Work Item in `item` öffnet nichts; das Board bleibt sichtbar. **Needs you** wählt nur eine Adresse, in der `attention=true` neu erscheint. Ändert sich die Adresse später nur in anderen Angaben, etwa durch eine Suche aus der Befehlspalette (`q`) oder ein geöffnetes Work Item (`item`), bleibt das gewählte Segment erhalten; dieselbe Adresse noch einmal setzt ein inzwischen selbst gewähltes Segment nicht zurück.

## Fehler und leere Zustände

- Während des ersten Ladens zeigt das Board seine Spalten und Karten als Platzhalter; Repository-Chip, **Filter**, **New work item** und **Refresh work items and build runs** sind bis dahin gesperrt. Liegt bereits ein gespeicherter Stand vor, erscheint er sofort und wird im Hintergrund aktualisiert.
- Kann der Tracker gerade nicht aktualisiert werden, erscheint über den Spalten ein Hinweis mit **Retry now**: **Work item update paused** mit dem Zeitpunkt der letzten Aktualisierung, **Provider request limit reached** mit dem frühesten Wiederholungszeitpunkt, **Azure DevOps credential required** oder **Work items are temporarily unavailable**. Die zuletzt bekannten Work Items bleiben sichtbar.
- Ohne Work Items zeigt das Board **No work items found** („Choose an active work-item source that contains visible items.“), bei erfolglosen Einschränkungen **No matching tickets** („Try All, or a different search, repository, column, label or assignee filter.“) und ohne jeden geladenen Stand **Work items unavailable** mit dem Weg zur Behebung.
- Verschwindet eine gewählte Spalte, ein Label, ein Repository oder eine Person aus den Daten, hebt das Board diese Einschränkung auf. Verliert ein Workspace sein GitHub-Konto, endet **Mine**.
- **Copy GitHub URL** meldet **Link copied.**; ist die Zwischenablage nicht verfügbar, **Link not copied.**

## Verwandte Features

- [Work-Item-Bildschirm](work-item.md) und [Neues Work Item](new-work-item.md)
- [Hauptfenster und Navigation](../window-and-navigation/README.md)
- [Befehlspalette](../command-palette/README.md)
- [Pull Requests](../pull-requests/README.md)
- [Overview und Inbox](../overview-and-inbox/README.md)
- [Orbit](../orbit/README.md)
