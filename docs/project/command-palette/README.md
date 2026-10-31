# Befehlspalette

Die Befehlspalette findet Work Items, Pull Requests und Actions-Läufe und startet Befehle, ohne dass dafür erst ein Bildschirm geöffnet werden muss. Sie erscheint als Fenster in der Mitte über dem abgedunkelten Hauptfenster und wird vollständig mit der Tastatur bedient.

## Was das Feature bietet

- Work Items des gewählten Workspace-Bereichs nach Kennung, Titel, Repository, Labels, Zuständigen, Projektfeldern oder Beschreibung finden und auf dem **Board** öffnen.
- Pull Requests nach Nummer, Titel, Autor, Branch oder Zustand finden und in **Pull requests** öffnen.
- GitHub-Actions-Läufe nach Workflow, Titel, Laufnummer, Branch, Revision, Auslöser oder Zustand finden und ihre Details öffnen.
- Befehle ausführen: ein Work Item anlegen, mit GitHub synchronisieren, einen Workflow starten, die Einstellungen öffnen, zu jedem Ziel der Seitenleiste wechseln, ein Arcade-Spiel starten oder ein installiertes Skill in den Einstellungen öffnen.
- Die Suche des gerade geöffneten Bildschirms (**Board**, **Pull requests**, **Actions**, **Orbit**) setzen und wieder aufheben.

## Voraussetzungen

- Die Befehlspalette gehört zum Hauptfenster und steht auch in den Einstellungen zur Verfügung. Im Menüleisten-Menü gibt es sie nicht.
- Ergebnisse stammen aus den Daten, die Symphony bereits geladen hat. Was noch lädt, erscheint, sobald es da ist, auch während die Palette offen ist.

## Öffnen und schließen

| Aktion                                                 | Ergebnis                                                                                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| ⌘K auf macOS, Ctrl+K unter Windows und Linux           | Öffnet die Palette mit leerem Suchfeld; das Suchfeld hat den Fokus. Bei offener Palette schließt dasselbe Kürzel sie wieder. |
| Klick in das Suchfeld **Search ⌘K** der Werkzeugleiste | Öffnet die Palette mit leerem Suchfeld.                                                                                      |
| Ein Zeichen in das Suchfeld der Werkzeugleiste tippen  | Öffnet die Palette mit diesem Zeichen als Suchanfang.                                                                        |
| **esc** oder ein Klick auf den abgedunkelten Bereich   | Schließt die Palette, ohne etwas zu öffnen. Der Fokus kehrt dorthin zurück, wo er vorher war.                                |
| Ein Ergebnis öffnen                                    | Schließt die Palette und führt das Ergebnis aus.                                                                             |

## Ergebnisse

Die Ergebnisse stehen in Gruppen, immer in dieser Reihenfolge. Leere Gruppen entfallen.

| Gruppe          | Zeile                                                                                                                                                                                                           | Öffnen bewirkt                                      | Höchstens |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------- |
| `WORK ITEMS`    | Kennung · Titel; darunter die Board-Spalte und, falls zutreffend, `agent running` oder `waiting for you`                                                                                                        | Öffnet **Board** mit dem Work Item.                 | 5         |
| `PULL REQUESTS` | `#Nummer` · Titel; darunter der Zustand (`Open`, `Draft`, `Merged`, `Closed`) und bei offenen Pull Requests der Stand der Prüfungen (`1 check failing`, `2 checks failing`, `checks running`, `checks passing`) | Öffnet **Pull requests**, gefiltert auf die Nummer. | 5         |
| `ACTION RUNS`   | Workflow · Titel des Laufs; darunter Zustand, Branch und Laufnummer                                                                                                                                             | Öffnet **Actions** mit den Details des Laufs.       | 4         |
| `COMMANDS`      | Name des Befehls, rechts sein Tastenkürzel, falls es eines gibt                                                                                                                                                 | Siehe [Befehle](#befehle).                          | 12        |

`waiting for you` erscheint, wenn das Board das Work Item unter **Needs you** führt: Der letzte Lauf ist fehlgeschlagen, oder das Work Item darf so nicht weiterlaufen. Arbeitet gerade ein Agent daran, steht stattdessen `agent running`. Der Stand der Prüfungen fasst den jeweils letzten Lauf jedes Workflows auf dem Branch des Pull Requests zusammen.

## Suche und Reihenfolge

| Regel                      | Wirkung                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Mehrere Wörter             | Jedes Wort muss vorkommen; die Reihenfolge der Wörter spielt keine Rolle. Groß- und Kleinschreibung spielen keine Rolle.                  |
| Kennung, Nummer und Titel  | Treffer am Wortanfang in Kennung, Nummer oder Titel stehen vor Treffern mitten im Wort und vor Treffern in weiteren Angaben.              |
| Genaue Kennung oder Nummer | Eine vollständig eingegebene Kennung wie `#138` oder `CR-0589` oder eine Pull-Request-Nummer bringt die Zeile an den Anfang ihrer Gruppe. |
| Offene Pull Requests       | Bei gleich guter Übereinstimmung steht ein offener Pull Request vor einem zusammengeführten oder geschlossenen.                           |
| Actions-Läufe              | Bei gleich guter Übereinstimmung steht der neuere Lauf zuerst.                                                                            |
| Leeres Suchfeld            | Die Palette zeigt nur Befehle.                                                                                                            |

Beim Tippen springt die Auswahl auf die erste Zeile.

## Tastatur

| Taste                     | Wirkung                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ↓ und ↑                   | Bewegen die Auswahl eine Zeile weiter; nach der letzten Zeile geht es mit der ersten weiter und umgekehrt.                       |
| ↵                         | Öffnet die ausgewählte Zeile. Rechts an der ausgewählten Zeile steht `↵`, sofern sie kein eigenes Kürzel zeigt.                  |
| ⌘↵ beziehungsweise Ctrl+↵ | Öffnet die ausgewählte Zeile wie ↵. Symphony hat nur ein Hauptfenster, deshalb öffnet die Palette nichts in einem neuen Fenster. |
| esc                       | Schließt die Palette.                                                                                                            |
| Tab                       | Bleibt im Suchfeld; der Fokus verlässt die Palette nicht.                                                                        |

Die Fußzeile nennt `↑↓ to move · ↵ to open`. Mit der Maus wählt das Überfahren eine Zeile aus, ein Klick öffnet sie.

## Befehle

| Befehl                            | Erscheint                                                                                                      | Wirkung                                                                                                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Filter <Bildschirm> by “<Text>”` | Mit Suchtext auf **Board**, **Pull requests**, **Actions** und **Orbit**; immer als erster Befehl              | Filtert den geöffneten Bildschirm nach dem Text, wie es das frühere Suchfeld tat.                            |
| `Clear the <Bildschirm> filter`   | Ohne Suchtext auf einem dieser Bildschirme, solange er gefiltert ist; darunter `Filtered by “<Text>”`          | Hebt den Filter wieder auf.                                                                                  |
| `New work item…` mit ⌘N / Ctrl+N  | Ohne Suchtext und bei passender Eingabe (etwa `new`, `create`)                                                 | Öffnet **Board** mit dem Dialog zum Anlegen eines Work Items.                                                |
| `Sync now`                        | Ohne Suchtext und bei passender Eingabe (etwa `sync`, `refresh`, `github`)                                     | Lädt die Pull Requests und die GitHub-Actions-Läufe neu. Der Stand erscheint in der Statusleiste.            |
| `Run workflow…`                   | Solange mindestens ein Workflow von Hand gestartet werden kann                                                 | Öffnet **Actions**; dort startet **Run on GitHub** oder **Run locally** den Workflow mit seiner Bestätigung. |
| `Run <Workflow> on GitHub`        | Bei passender Eingabe für jeden aktiven Workflow, der von Hand gestartet werden kann, höchstens drei           | Öffnet **Actions**; gestartet wird der Workflow erst dort nach der Bestätigung von Revision und Eingaben.    |
| `Settings…` mit ⌘, / Ctrl+,       | Ohne Suchtext und bei passender Eingabe, auch für die Bereiche der Einstellungen (etwa `skills`, `appearance`) | Öffnet die Einstellungen.                                                                                    |
| `Go to <Ziel>`                    | Für jedes Ziel, das die Seitenleiste gerade zeigt, in ihrer Reihenfolge                                        | Wechselt zu diesem Bildschirm.                                                                               |
| `Play <Spiel>`                    | Nur bei passender Eingabe und nur, wenn **Arcade** eingeschaltet ist                                           | Öffnet den Titelbildschirm des Spiels.                                                                       |
| `Open <Skill> in Settings`        | Bei passender Eingabe für installierte Skills, höchstens drei                                                  | Öffnet die Einstellungen bei **Skills**.                                                                     |

Ohne Suchtext stehen die Befehle in dieser Reihenfolge: das Aufheben eines aktiven Filters, `New work item…`, `Sync now`, `Run workflow…`, `Settings…`, dann `Go to …` für jedes Ziel der Seitenleiste.

Die Palette startet keinen Agenten- oder CI-Ablauf an der Bestätigung vorbei. Befehle, die eine Bestätigung oder eine Prüfung der Automatisierungsrichtlinien brauchen, öffnen den Bildschirm, auf dem diese Bestätigung stattfindet.

## Sonder- und Fehlerfälle

### Keine Treffer

- Ausgangslage: Der Suchtext passt zu keinem Work Item, Pull Request, Lauf oder Befehl.
- Systemverhalten: Die Palette zeigt `No results for “<Text>”` mit dem Hinweis `Try a work item id, a pull request number or a command such as New work item.`
- Folge: ↵ öffnet nichts.
- Verfügbare Aktion: Den Suchtext ändern. Auf **Board**, **Pull requests**, **Actions** und **Orbit** steht stattdessen immer `Filter <Bildschirm> by “<Text>”` zur Wahl.

### Daten werden noch geladen

- Ausgangslage: Symphony hat Work Items, Pull Requests oder Läufe noch nicht geladen.
- Systemverhalten: Die fehlende Gruppe erscheint nicht; die Befehle stehen sofort zur Verfügung.
- Folge: Sobald die Daten da sind, ergänzt die offene Palette die Treffer.

### Synchronisierung schlägt fehl

- Ausgangslage: `Sync now` erreicht GitHub nicht.
- Systemverhalten: Die Palette ist bereits geschlossen. Die Statusleiste zeigt den Synchronisierungszustand mit **Retry**, Fehler meldet Symphony wie bei jeder anderen Aktualisierung.

## Verwandte Features

- [Hauptfenster und Navigation](../window-and-navigation/README.md): Seitenleiste, Suchfeld der Werkzeugleiste und Tastenkürzel.
