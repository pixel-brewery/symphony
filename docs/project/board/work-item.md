# Work-Item-Bildschirm

Jedes Work Item hat einen eigenen Bildschirm im Hauptfenster. Er zeigt auf einen Blick, wie weit die Lieferung ist, ob die Checks bestehen, welche Akzeptanzkriterien erfüllt sind und wer daran arbeitet. Von hier aus bearbeitest du das Work Item, triffst die Entscheidungen des Workflows, startest oder erfasst Analyse und Umsetzung, übergibst die Arbeit an das AI-Team, prüfst ihr Ergebnis und schreibst in die Diskussion des Providers.

Der Bildschirm ersetzt die frühere Detailansicht, die sich als Seitenfenster über dem Board öffnete. Alles, was dort möglich war, ist hier erhalten.

## Öffnen

| Auslöser                                                                                                                            | Ergebnis                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Klick auf eine Karte im [Board](README.md)                                                                                          | Der Bildschirm des Work Items öffnet sich; **Back** führt zum Board zurück.                   |
| Ein Verweis auf ein Work Item, etwa aus der [Befehlspalette](../command-palette/README.md), der Inbox, Orbit oder **Pull requests** | Das Board leitet zum Bildschirm des Work Items weiter.                                        |
| Die Adresse `/main/board/<Work-Item-Id>`, etwa aus einem Lesezeichen                                                                | Der Bildschirm lädt das Board bei Bedarf und öffnet das Work Item.                            |
| **Back** und **Forward** in der Werkzeugleiste                                                                                      | Sie folgen der Historie zwischen Board und Work Items, auch von einem Work Item zum nächsten. |

Während das Work Item geladen wird, stehen Platzhalter an der Stelle des Inhalts.

## Aufbau

### Werkzeugleiste

Der Titel ist die Kennung des Work Items beim Provider, etwa `#142`; darunter steht `Board · <Spalte>`. Rechts liegen zwei Schaltflächen:

- **Open in GitHub**, **Open in Azure DevOps** oder **Open work item** öffnet das Work Item beim Provider (nur, wenn der Provider eine Adresse liefert).
- **Edit work item** schaltet in die Bearbeitung; während der Bearbeitung heißt dieselbe Schaltfläche **Preview** (siehe [Bearbeiten](#bearbeiten)).

### Hinweise oben

- **Probleme des Work Items:** Fehlt dem Work Item etwas, das die Lieferung blockiert oder unvollständig macht, erscheint je Problem ein Hinweis mit Zusammenfassung, Erklärung und **Next step**. Kann Symphony fehlende Feldwerte selbst ableiten, setzt **Repair n field(s)** sie in einem Schritt; das ist gesperrt, solange ein Schritt läuft oder gespeichert wird. Eine Reparatur überschreibt nie einen Wert, den jemand bewusst gesetzt hat.
- **Arbeit auf einer anderen Instanz:** Hält eine andere Symphony-Instanz das Work Item, erscheint **Analysis is running on another instance** beziehungsweise **Solution is running on another instance**, bei bekanntem Konto mit dessen Login. Analyse und Umsetzung lassen sich dann hier nicht starten; die Arbeit wird auf der anderen Instanz fortgesetzt oder abgebrochen.

### Kopf

Eine Zeile mit Chips nennt den Zustand des Work Items (etwa **Ready to analyze**, **Waiting for a decision**, **Analyzing**, **Solve failed**, **Closed**), seine Labels sowie Kennung und Pull-Request-Nummer, etwa `#142 · #87`. Darunter stehen der Titel und die Beschreibung, die als Markdown dargestellt wird. Ohne Beschreibung steht dort **No description yet. Edit the work item to add one.**

### Stufen der Lieferung

Ein Stepper zeigt die fünf Stufen **Analysis**, **Solution**, **Implementation**, **Checks** und **Acceptance**. Wie weit die Lieferung ist, bestimmt Symphony genauso wie für den Fortschrittsbalken der Karte im Board; Karte und Bildschirm zeigen daher immer denselben Stand. Erledigte Stufen tragen ein Häkchen, die aktuelle Stufe einen Punkt, eine an einem Fehler hängende Stufe ein Kreuz.

| Stufe              | Beschriftung unter dem Namen                                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Analysis**       | erledigt: Agent, sonst **Recorded manually** oder **Analyzed**, mit Datum; **Failed**; während eines Laufs `<Agent> · running`, **Queued** oder **Waiting to resume**; sonst **Next step** oder **Not started** |
| **Solution**       | erledigt: **Plan v<n>** mit der Version des Umsetzungsplans, sonst **Plan ready**; aktuell **In planning**; sonst **Not started**                                                                               |
| **Implementation** | erledigt: **PR #n**, **Recorded manually** oder **Implemented**; **Failed**; während eines Laufs wie bei **Analysis**; sonst **Next step** oder **Not started**                                                 |
| **Checks**         | mit Checks `n of m running`, sonst `n of m failed`, sonst `n of m passed`; ohne Checks **Passed** (Stufe erledigt) oder **No checks yet**                                                                       |
| **Acceptance**     | **Accepted** oder **You**                                                                                                                                                                                       |

### Laufender oder eingereihter Schritt

- Wartet ein Schritt auf einen freien Ausführungsplatz, erklärt eine Zeile das (oder nennt den letzten Fehler der Warteschlange); **Remove from queue** nimmt den Schritt wieder heraus.
- Läuft ein Schritt, zeigt ein Fortschrittsbalken die Arbeit an; **Cancel execution** bricht den Lauf ab.

### Entscheidung

Steht das Work Item in einer Stufe, die auf eine menschliche Entscheidung wartet, erscheint **Your decision** mit dem Hinweis **Nothing runs on this work item until you decide how it continues.** und einer Schaltfläche je Entscheidungsmöglichkeit des Workflows. Die Möglichkeit, die das Work Item weiterführt, ist hervorgehoben. Solange ein Schritt läuft, sind die Entscheidungen gesperrt.

### Checks

Sobald ein Pull Request existiert oder Checks vorliegen, erscheint **Checks** beziehungsweise **Checks on PR #n**:

- Darunter steht `Workflow runs on <Branch> · started <Uhrzeit>`, bei Ergebnissen aus der Verifikation **Verification report · <Zeitpunkt>** oder, solange auf dem Pull Request noch nichts lief, **No workflow has run on this pull request yet.**
- Die Tabelle zeigt je Workflow den neuesten Lauf auf dem Branch des Pull Requests mit **Check**, **Result** (`Passed`, `Running`, `Failed`, `Queued`, `Cancelled`) und **Time**, der Dauer des Laufs (bei einem laufenden Check bis jetzt). Lief noch kein Workflow, zeigt sie stattdessen die Prüfungen des neuesten Verifikationsberichts als `Passed` oder `Failed`.
- **View log** öffnet das Protokoll des laufenden Checks, sonst des ersten Checks.
- Bei einem Pull Request startet **Run remotely** seinen neuesten Workflow-Lauf auf GitHub erneut; während der Lauf läuft oder eingereiht ist, heißt die Schaltfläche **Stop run** und bricht ihn ab. Erlaubt der Workspace lokale CI, kommen **Run locally** beziehungsweise **Stop local runner** hinzu. Kennt Symphony für den Branch noch keinen Lauf oder ist der lokale Runner mit einem anderen Lauf beschäftigt, fehlt die jeweilige Schaltfläche. Während eine dieser Aktionen ausgeführt wird, sind alle gesperrt.

### Akzeptanzkriterien

Liegt ein Umsetzungsplan vor, listet **Acceptance criteria** seine Kriterien mit `n of m met`. Nennt der Plan eigene Kriterien für dieses Work Item, gelten diese. Ein Kriterium gilt als erfüllt, wenn der neueste Verifikationsbericht eine bestandene Prüfung mit demselben Wortlaut enthält (ohne Beachtung von Groß- und Kleinschreibung), oder sobald die Arbeit abgenommen wurde. Ein Kriterium, das die Verifikation nicht genannt hat, bleibt offen. Die Häkchen lassen sich nicht von Hand setzen.

### Schritte

Der Bereich **Steps** (**Run the analysis or the implementation, by hand or with AI**) bietet Analyse und Umsetzung an, soweit die aktuelle Stufe sie ausführt:

- **Analyze work item** beziehungsweise **Re-analyze work item**, wenn die Stufe analysiert. Mit **Manual** erfasst du unter **Analysis (Markdown)** deine eigene Analyse und speicherst sie mit **Record analysis** (**Record new analysis**, wenn schon eine vorliegt); dabei wird weder ein Skill noch Codex aufgerufen. Mit **With AI** startet der Analyse-Skill des Boards, optional mit **Analysis focus (optional)**; die Schaltfläche heißt je nach letztem Lauf **Analyze task**, **Re-analyze**, **Retry analysis** oder **Restart analysis**.
- **Implement fix** beziehungsweise **Rework implementation**, wenn die Stufe umsetzt und eine abgeschlossene Analyse vorliegt. **Manual** erfasst **Implementation notes (Markdown)** beziehungsweise **Rework notes (Markdown)** mit **Record implementation** oder **Record rework**, ohne Skill, Codex oder verwalteten Worktree. **With AI** startet den Lösungs-Skill in einem neuen, isolierten Worktree; nach einer erfolgreichen Umsetzung ist jede weitere eine Überarbeitung und verlangt **Changes for the Solver** (**Apply feedback**).
- Fehlt der passende Skill, nennt der Bereich das (**No analysis skill assigned**, **No solution skill assigned**) und bietet **Open Skills** an, das die Einstellungen bei **Skills** öffnet.
- Kann die aktuelle Stufe keinen Schritt ausführen, erklärt ein Satz den Grund: Sie wartet auf eine Entscheidung, sie führt weder Analyse noch Umsetzung aus, oder sie setzt um, aber es gibt noch keine abgeschlossene Analyse.

Vor einem Lauf mit AI prüft Symphony, dass das Work Item genau einem Repository zugeordnet ist (sonst **Choose one repository.**). Ist dieses Repository noch nicht lokal vorbereitet, fragt Symphony **Prepare <Repository> locally?** und bereitet es nach **Prepare locally** vor, ohne Projektcode, Installer, Git-Hooks oder Tests auszuführen. **Cancel** startet nichts.

Unter den Schritten stehen die Ergebnisse: **Analysis** und **Implementation** als Markdown mit ihrer Herkunft (**Generated by <Skill>**, **AI-generated result** oder **Recorded manually**) und bei einem gescheiterten Lauf **Run failed** mit der Fehlermeldung.

### AI-Team

Im Bereich **AI team** übergibst du das Work Item an einen Agenten; Symphony koordiniert dann die weiteren Schritte. Wähle unter **AI agent** einen aktiven Agenten des Workspace und, wenn der Workspace mehrere Teams hat, unter **Delivery team** das Team; **Assign task** (danach **Update assignment**) übergibt die Arbeit mit dem Titel des Work Items als Ziel. Die Kopfzeile nennt danach den Stand, etwa **Understanding the assignment**, **Implementing the changes** oder **Ready for your review**, und den verantwortlichen Agenten.

Steht die Arbeit zur Prüfung an, kannst du sie mit **Accept work** abnehmen oder mit **Request changes** zurückgeben. **Request changes** verlangt eine Beschreibung unter **What should be changed? (required only when requesting changes)** und startet anschließend eine Überarbeitung durch die AI mit genau diesem Text, sofern die Stufe das zulässt. Darunter stehen **Responsible agent**, **Currently working**, **Delivery team**, **Implementation limits** (Version des Umsetzungsplans und Zahl der Akzeptanzkriterien) sowie **Checks and handoffs**.

### Aktivität und Diskussion

**Activity** führt die Eröffnung des Work Items (**Opened #142**), die Ereignisse des neuesten Laufs und die Kommentare des Providers zu einer Liste zusammen, neueste zuerst. Kommentare erscheinen mit Autor, Zeitpunkt und als Markdown; bei einer Adresse öffnet **Open comment** sie beim Provider. Ohne Einträge steht **No activity on this work item yet.**

Unter **Add a comment** schreibst du einen Kommentar in Markdown; **Send** veröffentlicht ihn in der Diskussion des Providers, Symphony meldet **Comment published.** und der Kommentar erscheint in der Aktivität. Lehnt der Provider ab, meldet Symphony **Unable to publish the comment.** und dein Text bleibt im Feld stehen.

### Inspektor

Rechts fasst der Inspektor das Work Item zusammen:

| Feld             | Inhalt                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Column**       | Spalte im Board, sonst die Stufe, sonst **No column**                                                                                                      |
| **Agent**        | der Agent, der gerade arbeitet, sonst der verantwortliche Agent, sonst der Agent des neuesten Laufs; ein Punkt **Working now**, solange ein Lauf aktiv ist |
| **Skill**        | Rolle und Name des Skills des neuesten Laufs, etwa `Plan work · <Skill>`, sonst der Skill, den die Stufe verwenden würde                                   |
| **Pull request** | `#n` öffnet ihn auf GitHub, daneben der Stand der Checks; ohne Pull Request nach einer erfolgreichen Umsetzung **Create pull request**                     |
| **Branch**       | Branch der Umsetzung; nach dem Veröffentlichen als Link, vorher mit dem Hinweis **Local branch · available on GitHub after creating the pull request**     |
| **Repository**   | Repository des Work Items                                                                                                                                  |
| **Assignee**     | zugewiesene Personen, sonst **Not assigned**                                                                                                               |
| Daten            | **Created** mit Datum und **Changed** mit relativer Zeit                                                                                                   |

Ein fehlender Wert erscheint als `—`.

## Bearbeiten

1. **Edit work item** in der Werkzeugleiste zeigt Titel, Beschreibung und die Felder des Providers als Eingaben: **Title** (Pflicht), **Description** in Markdown, **Project fields** (darunter das Feld, das die Spalte bestimmt), **Labels** und **Assignees**.
2. **Preview** zeigt das Work Item mit deinen noch nicht gespeicherten Änderungen. Die Bearbeitung bleibt offen, bis du sie abschließt.
3. **Save changes** speichert beim Provider und meldet **Work item updated.**; ändert sich dabei die Spalte, zeigt die Werkzeugleiste sie sofort. **Cancel editing** verwirft alle Änderungen.

**Save changes** ist gesperrt, solange der Titel leer ist oder gespeichert wird. Schlägt das Speichern fehl, meldet Symphony **Unable to save the work item.** mit dem Grund; die Bearbeitung bleibt mit deinen Eingaben offen.

## Regeln

| Ausgangslage                                                    | Aktion                                       | Ergebnis                                                                              |
| --------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Die Stufe wartet auf eine Entscheidung.                         | Schritte ansehen                             | Kein Schritt wird angeboten; **Your decision** zeigt die Möglichkeiten.               |
| Die Stufe setzt um, es gibt keine abgeschlossene Analyse.       | Schritte ansehen                             | Die Umsetzung wird nicht angeboten; ein Satz nennt den Grund.                         |
| Ein Schritt läuft, wartet oder ist eingereiht.                  | Analyse, Umsetzung oder Entscheidung starten | gesperrt, bis der Schritt endet oder aus der Warteschlange genommen ist               |
| Eine andere Instanz hält das Work Item.                         | Analyse oder Umsetzung starten               | gesperrt; der Hinweis oben nennt die andere Instanz                                   |
| Die letzte Umsetzung war erfolgreich.                           | **With AI** umsetzen                         | nur mit einer Beschreibung der gewünschten Änderungen (Überarbeitung)                 |
| Eine Umsetzung ist erfolgreich, aber noch nicht veröffentlicht. | **Create pull request** im Inspektor         | Symphony veröffentlicht den Branch als Pull Request; der Inspektor zeigt danach `#n`. |
| Die Arbeit steht zur Prüfung an.                                | **Request changes** ohne Beschreibung        | gesperrt                                                                              |

## Sonder- und Fehlerfälle

### Unbekanntes Work Item

- Ausgangslage: Die Adresse nennt ein Work Item, das im geladenen Board nicht vorkommt, oder das Work Item verschwindet bei einer Aktualisierung.
- Systemverhalten: Der Bildschirm zeigt **This work item is not on the board** mit dem Hinweis, dass es geschlossen, auf ein anderes Board verschoben oder einem nicht gewählten Workspace zugeordnet sein kann.
- Verfügbare Aktion: **Back to board** öffnet das Board.

### Details oder Felder lassen sich nicht laden

- Systemverhalten: Symphony meldet **Unable to load work-item details.** beziehungsweise **Unable to load work-item metadata.** Der Bildschirm zeigt, was das Board bereits weiß; ohne Details fehlen die Kommentare.
- Verfügbare Aktion: den Bildschirm erneut öffnen.

### Nicht verfügbare Funktionen

Bietet die Installation keine Läufe an, fehlen **Steps** und **AI team**; ohne Workflow-Entscheidungen fehlt **Your decision**, ohne Veröffentlichung **Create pull request** und ohne CI-Anbindung die Schaltflächen zum Starten und Stoppen der Checks.

## Verwandte Features

- [Board](README.md)
- [Neues Work Item anlegen](new-work-item.md)
- [Pull Requests](../pull-requests/README.md)
- [Actions](../actions/README.md)
- [Overview und Inbox](../overview-and-inbox/README.md)
- [Hauptfenster und Navigation](../window-and-navigation/README.md)
