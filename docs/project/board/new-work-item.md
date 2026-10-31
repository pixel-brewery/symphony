# Neues Work Item anlegen

Neue Work Items entstehen im Sheet **New work item** über dem Board. Du schreibst das Work Item selbst oder lässt es vom Agenten für den Schritt **Create** entwerfen, wählst Repository und Spalte und kannst die Analyse direkt nach dem Anlegen starten. Symphony legt das Work Item beim Provider des Boards an, also etwa als Issue in einem GitHub-Projekt.

## Voraussetzungen

- Das Work Item braucht ein Board, auf dem es landet: Entweder ist genau ein Board gewählt beziehungsweise nur eines im Workspace-Umfang vorhanden, oder genau ein Workspace ist gewählt und hat noch kein Board. Sonst ist **New work item** im Board gesperrt und nennt **Select one board to create a work item**.
- Für **Draft with AI** muss dem Schritt **Create** ein Skill zugewiesen sein (siehe [Skills](../skills/README.md)).
- Für die Analyse nach dem Anlegen müssen Läufe verfügbar sein, dem Schritt **Plan** ein Skill zugewiesen sein und die gewählte Spalte die Analyse ausführen.

## Sheet öffnen

| Auslöser                                                                                    | Ergebnis                                                                                                              |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **New work item** in der Werkzeugleiste des [Boards](README.md)                             | Das Sheet öffnet sich mit der Anfangsspalte des Workflows.                                                            |
| **+** im Kopf einer Board-Spalte (**New work item in <Spalte>**)                            | Das Sheet öffnet sich mit dieser Spalte.                                                                              |
| ⌘N beziehungsweise Ctrl+N im Hauptfenster, auch in den Einstellungen                        | Das Hauptfenster kommt nach vorn, wechselt zum Board und öffnet das Sheet; offene Einstellungen schließen sich dabei. |
| **New Work Item…** im Menü **File** (macOS)                                                 | wie oben                                                                                                              |
| `New work item…` in der [Befehlspalette](../command-palette/README.md)                      | wie oben                                                                                                              |
| **New work item** unter den Schnellaktionen von [Overview](../overview-and-inbox/README.md) | wie oben                                                                                                              |
| **New work item…** im [Menüleistenpanel](../notifications-and-tray/README.md)               | wie oben                                                                                                              |
| die Adresse `/main/board?create=true`                                                       | wie oben; der Parameter wird danach aus der Adresse entfernt, damit **Back** das Sheet nicht erneut öffnet.           |

Es ist immer höchstens ein Sheet offen. Ein weiterer Auslöser hebt das offene Sheet hervor, statt ein zweites zu öffnen.

Fehlt ein Board, auf dem das Work Item landen kann, öffnet keiner der Auslöser das Sheet. **New work item** und das **+** der Spalten sind dann gesperrt (Tooltip „Select one board to create a work item“). Die Auslöser außerhalb des Boards (Tastenkürzel, Menü, Befehlspalette, Overview, Menüleistenpanel, Adresse) warten, bis die Einstellungen geladen sind, und melden dann einen Hinweis **Select one board to create a work item** mit dem Grund:

| Lage                                                         | Hinweis                                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Mehrere Boards sind im Blick und **All boards** ist gewählt. | „Several boards are in view. Choose one under Filter › Board, then create the work item.“                               |
| Kein Workspace ist gewählt.                                  | „No workspace is selected. Choose a workspace in the sidebar, then create the work item.“                               |
| Keiner der gewählten Workspaces hat ein Board.               | „None of the selected workspaces has a board. Connect one in Settings › Connected services, or use only one workspace.“ |

## Aufbau

Oben rechts im Sheet wählst du, wie das Work Item entsteht: **Write it myself** (Standard) oder **Draft with AI**. Während das Sheet die Felder des Providers lädt, stehen Platzhalter an der Stelle der Eingaben; die Beschriftungen bleiben sichtbar.

| Feld                              | Bedeutung                                                                                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**                         | Pflichtfeld. Bleibt es leer, meldet das Feld nach dem Verlassen **Enter a work-item title.**                                                                                                                    |
| **Description**                   | Beschreibung in Markdown (**Markdown is rendered when the work item is viewed.**)                                                                                                                               |
| **Repository**                    | Repository, zu dem das Work Item gehört; vorbelegt mit dem ersten Repository des Boards. Ein anderes Repository lädt dessen Felder nach. Ohne Repository bleibt die Auswahl gesperrt (**Choose a repository**). |
| **Column**                        | Spalte, in der das Work Item beginnt; vorbelegt mit der Spalte des Auslösers, sonst der Anfangsspalte des Workflows, sonst der ersten Spalte                                                                    |
| **Labels**                        | **Add label** wählt Labels aus den Labels des Providers; gewählte Labels erscheinen als Chips.                                                                                                                  |
| **More fields**                   | erscheint, wenn der Provider weitere Felder anbietet: **Work item type**, die **Project fields** (ohne das Feld, das die Spalte bestimmt) und **Assignees**                                                     |
| **Analyze with … after creating** | startet die Analyse direkt nach dem Anlegen; die Beschriftung nennt den Agenten des Schritts **Plan**, etwa **Analyze with Codex after creating**. Ist die Analyse möglich, ist das Kästchen gesetzt.           |

**Cancel** und Escape schließen das Sheet ohne Änderung. Ein Klick neben das Sheet schließt es nicht, damit Eingaben nicht versehentlich verloren gehen. **Create work item** ist gesperrt, solange Titel oder Repository fehlen, ein AI-Entwurf noch nicht vorliegt, die Felder noch laden oder gespeichert wird.

## Ablauf

### Selbst schreiben

1. Titel und gegebenenfalls Beschreibung, Repository, Spalte, Labels und weitere Felder eintragen.
2. **Create work item** legt das Work Item beim Provider an; Symphony meldet **Work item created.** und schließt das Sheet.
3. Hat der Provider das Work Item nicht schon in der gewählten Spalte angelegt, verschiebt Symphony es dorthin und meldet **Moved to <Spalte>.**
4. Ist **Analyze with … after creating** gesetzt, startet Symphony die Analyse auf demselben Weg wie **Analyze task** auf dem [Work-Item-Bildschirm](work-item.md#schritte), einschließlich der Prüfung des Repositorys und der Rückfrage zum lokalen Vorbereiten.

Ergebnis: Das Work Item steht auf dem Board in der gewählten Spalte.

### Mit AI entwerfen

1. **Draft with AI** zeigt **Describe the work item** zusammen mit **Repository**, **Column** und der Analyse nach dem Anlegen; Titel, Beschreibung, Labels und weitere Felder erscheinen erst mit dem Entwurf. Beschreibe Problem, erwartetes Verhalten, Kontext und Einschränkungen. Hat der Schritt **Create** mehrere Agenten, wählst du unter **AI agent**, wer entwirft; sonst nennt das Sheet den Agenten.
2. Absenden startet den Entwurf für das gewählte Repository (**Drafting and classifying the work item…**). **Cancel generation** bricht ihn ab; Symphony meldet **Issue drafting cancelled.**
3. Ist der Entwurf fertig, meldet Symphony **Issue draft ready.** und das Sheet zeigt ihn mit Titel, Beschreibung, Feldern, Labels und Zuweisungen zum Prüfen; die vom Agenten gefüllten Werte sind hervorgehoben und **More fields** ist geöffnet. Die gewählte Spalte bleibt erhalten, auch wenn der Entwurf eine andere vorschlägt.
4. Du kannst alles ändern und legst das Work Item mit **Create work item** an wie oben. **Start over** kehrt zur Beschreibung zurück.

Ohne Skill für **Create** ist die Beschreibung gesperrt; das Sheet nennt **Assign a skill to the Create step before drafting with AI.** und bietet **Open Skills** an, das das Sheet schließt und die Einstellungen bei **Skills** öffnet.

## Regeln für die Analyse nach dem Anlegen

| Ausgangslage                                                 | Kästchen          | Hinweis darunter                                                 |
| ------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------- |
| Läufe sind in der Installation nicht verfügbar.              | gesperrt          | **Runs are not available in this installation.**                 |
| Dem Schritt **Plan** ist kein Skill zugewiesen.              | gesperrt          | **Assign a skill to the Plan step to analyze new work items.**   |
| Die gewählte Spalte wartet auf eine Entscheidung.            | gesperrt          | **<Spalte> waits for your decision before the analysis starts.** |
| Die gewählte Spalte führt keine Analyse aus.                 | gesperrt          | **<Spalte> does not run the analysis.**                          |
| Die gewählte Spalte analysiert und ein Skill ist zugewiesen. | gesetzt, änderbar | –                                                                |

## Sonder- und Fehlerfälle

### Der Provider lehnt das Work Item ab

- Systemverhalten: Das Sheet bleibt offen, behält alle Eingaben und zeigt **The work item was not created.** mit dem Grund des Providers; zusätzlich meldet Symphony **Unable to save the work item.**
- Verfügbare Aktion: Eingaben korrigieren und erneut **Create work item** wählen.

### Verschieben in die gewählte Spalte scheitert

- Systemverhalten: Das Work Item ist angelegt und bleibt in der Spalte, die der Provider gewählt hat; Symphony meldet **Unable to move the work item.** Eine angeforderte Analyse startet dann nicht.
- Verfügbare Aktion: das Work Item im Board verschieben und die Analyse auf seinem Bildschirm starten.

### Die Analyse startet nicht

- Ausgangslage: Das Work Item ist keinem oder mehreren Repositories zugeordnet, die Vorbereitung des Repositorys wird abgelehnt oder scheitert, oder die Ausführung lehnt den Start ab.
- Systemverhalten: Das Work Item bleibt angelegt; Symphony meldet den Grund, etwa **Choose one repository.**
- Verfügbare Aktion: die Analyse auf dem [Work-Item-Bildschirm](work-item.md) starten.

### Der Entwurf scheitert

- Systemverhalten: Symphony meldet **Unable to draft the work item.** (nach **Cancel generation** nicht); deine Beschreibung bleibt im Feld stehen.
- Verfügbare Aktion: erneut absenden oder mit **Write it myself** selbst schreiben.

## Verwandte Features

- [Board](README.md)
- [Work-Item-Bildschirm](work-item.md)
- [Skills](../skills/README.md)
- [Hauptfenster und Navigation](../window-and-navigation/README.md#tastenkürzel-und-menü)
- [Einstellungen](../window-and-navigation/settings.md)
