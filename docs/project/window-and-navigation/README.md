# Hauptfenster und Navigation

Das Hauptfenster von Symphony ist wie eine macOS-Anwendung aufgebaut: links eine Seitenleiste mit Workspace-Umschalter, Zielen und laufender Arbeit, oben eine einheitliche Werkzeugleiste und unten eine Statusleiste über die volle Fensterbreite. So bleiben das gewählte Ziel, der Stand der GitHub-Synchronisierung und verfügbare Updates sichtbar, ohne dass ein Bildschirm diese Hinweise selbst anzeigen muss. Die [Einstellungen](settings.md) öffnen sich im selben Fenster; solange sie offen sind, zeigt die Seitenleiste ihre Bereiche. Die Breite der Seitenleiste und der Listen kannst du selbst anpassen ([Bereiche anpassen und scrollen](resizable-panes.md)).

## Was das Feature bietet

- Symphony startet auf **Overview** und führt alle Bereiche in einer Seitenleiste zusammen, die 240 px breit beginnt und sich zwischen 200 und 360 px anpassen lässt.
- Zahlen in der Seitenleiste zeigen, wo etwas auf dich wartet, ohne dass du den Bereich öffnen musst.
- Das Laufpanel zeigt wahlweise, woran deine Agents arbeiten (**Agents**), oder welche GitHub-Actions-Läufe gerade laufen (**Actions**).
- Die 52 px hohe Werkzeugleiste bietet **Back** und **Forward**, den Titel des Bildschirms, dessen Aktionen und das Suchfeld für die Befehlspalette.
- Die 28 px hohe Statusleiste zeigt den GitHub-Synchronisierungsstand, die installierte Version und die Updateschaltfläche.
- Die Seitenleiste lässt sich ausblenden; die Wahl bleibt nach einem Neustart erhalten.
- Tastenkürzel und Menüeinträge öffnen die Befehlspalette, das Anlegen eines Work Items und die Einstellungen.
- Werkzeugleiste, Seitenleiste und Statusleiste bleiben beim Scrollen stehen; jeder Bereich scrollt für sich.

## Aufbau des Fensters

| Bereich        | Lage                                      | Inhalt                                                                                                |
| -------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Seitenleiste   | links, 240 px breit, anpassbar            | **Hide sidebar**, Workspace-Umschalter, Ziele mit Zahlen, Laufpanel, unten fest **Settings**          |
| Werkzeugleiste | oben über dem Inhalt, 52 px hoch          | **Back**, **Forward**, Titel und Untertitel, Aktionen des Bildschirms, Suchfeld                       |
| Inhalt         | zwischen Werkzeugleiste und Statusleiste  | der geöffnete Bildschirm, zum Beispiel Overview oder Board                                            |
| Statusleiste   | unten über die gesamte Breite, 28 px hoch | GitHub-Synchronisierung links; **Notifications**, `Symphony v<Version>` und Updateschaltfläche rechts |

Die Werkzeugleiste und die Kopfzeile der Seitenleiste dienen zugleich als Titelleiste: Du kannst das Fenster dort verschieben, die Schaltflächen bleiben bedienbar. Zwischen Seitenleiste und Inhalt liegt eine feine Linie; ziehst du sie, ändert sich die Breite der Seitenleiste, und Symphony merkt sich die neue Breite ([Bereiche anpassen und scrollen](resizable-panes.md)).

Solange die [Einstellungen](settings.md) offen sind, zeigt die Seitenleiste unter ihrer Kopfzeile nur deren Bereiche; Workspace-Umschalter, Ziele, Laufpanel und **Settings** erscheinen wieder, sobald du die Einstellungen mit **Back** verlässt.

## Start und frühere Adressen

Symphony öffnet nach dem Start den Bildschirm, den du zuletzt offen hattest, etwa **Inbox**, **Board**, **Pull requests** oder einen geöffneten Work Item. Die Einstellungen zählen dabei nicht: Beendest du Symphony in den Einstellungen, öffnet es beim nächsten Start den Bildschirm, von dem du in die Einstellungen gewechselt bist. Geöffnete Blätter wie **New work item** oder die Benachrichtigungen öffnen sich nicht erneut. Beim allerersten Start, oder wenn der gemerkte Bildschirm nicht mehr angeboten wird, öffnet Symphony **Overview**. Ein früheres Lesezeichen auf das Dashboard und jede unbekannte Adresse im Hauptfenster führen ebenfalls zu Overview. Verweise auf die Einstellungsseite, auf **Projects** oder **Skills** öffnen die [Einstellungen](settings.md) im Hauptfenster.

## Seitenleiste

### Workspace wechseln

Die Karte oben in der Seitenleiste zeigt den aktiven Workspace: sein Kürzel als Kachel (die ersten beiden Zeichen in Großbuchstaben), seinen Namen und das erste aktivierte Repository als `owner/name`. Hat der Workspace kein aktiviertes Repository, entfällt diese Zeile.

1. Wähle den Pfeil **Switch workspace** auf der Karte.
2. Das Menü listet alle aktivierten Workspaces mit Namen und Kürzel; der aktive Workspace ist markiert.
3. Wähle einen Workspace. Alle Bildschirme und das Laufpanel zeigen danach dessen Arbeit. Die Auswahl wird gespeichert und gilt auch nach einem Neustart.

Der letzte Menüeintrag **Manage workspaces…** öffnet die Einstellungen. Solange kein Workspace aktiv ist, zeigt die Seitenleiste keine Karte.

### Ziele

| Eintrag           | Gruppe     | Öffnet                           | Zahl rechts in der Zeile                                                                     |
| ----------------- | ---------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| **Overview**      | –          | die Startseite                   | keine                                                                                        |
| **Inbox**         | `Delivery` | die Inbox                        | Entscheidungen, die in der Inbox auf dich warten, als rotes Hinweisabzeichen                 |
| **Board**         | `Delivery` | das Board                        | Work Items, die dich brauchen, als ruhige Zahl                                               |
| **Pull requests** | `Delivery` | die Pull-Request-Liste           | offene Pull Requests als ruhige Zahl                                                         |
| **Actions**       | `Delivery` | die GitHub-Actions-Übersicht     | Workflows, deren letzter abgeschlossener Lauf fehlgeschlagen ist, als rotes Hinweisabzeichen |
| **Orbit**         | `Delivery` | Orbit                            | keine                                                                                        |
| **Arcade**        | `More`     | Arcade                           | keine; Eintrag und Gruppe erscheinen nur, wenn Arcade in den Einstellungen eingeschaltet ist |
| **Settings**      | unten fest | die [Einstellungen](settings.md) | keine                                                                                        |

Die Zeile des geöffneten Bereichs ist hervorgehoben. **Skills** ist kein Eintrag der Hauptnavigation mehr; installierte Skill-Pakete werden in den Einstellungen im Bereich **Skills** verwaltet.

### Regeln für die Zahlen

| Ausgangslage                                                         | Anzeige                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| Die Daten des Bereichs sind noch nicht geladen oder nicht verfügbar. | Keine Zahl. Symphony zeigt nie eine irreführende Null. |
| Die Zahl ist null.                                                   | Keine Zahl.                                            |
| Mindestens ein Eintrag zählt.                                        | Die Zahl erscheint am rechten Rand der Zeile.          |

Ein Work Item zählt auf **Board**, wenn sein letzter Lauf fehlgeschlagen ist oder wenn Symphony es nicht weiterbewegen würde, etwa weil eine Analyse fehlt oder noch nicht als bereit gilt, ein kritisches Risiko gemeldet ist oder eine harte Abhängigkeit offen ist. Es ist dieselbe Auswahl, die das Board mit seinem Hinweis auf der Karte kennzeichnet. Ein Workflow zählt auf **Actions** einmal, wenn sein jüngster abgeschlossener Lauf fehlgeschlagen ist; ein späterer erfolgreicher oder abgebrochener Lauf nimmt ihn wieder heraus.

### Seitenleiste ausblenden

1. Wähle **Hide sidebar** oben rechts in der Seitenleiste.
2. Die Seitenleiste und die Linie daneben verschwinden; die Werkzeugleiste zeigt am Anfang **Show sidebar**.
3. **Show sidebar** blendet sie in der zuletzt gewählten Breite wieder ein.

Symphony merkt sich die Wahl auf diesem Rechner und stellt sie nach einem Neustart wieder her.

### Ziele scrollen

Ist das Fenster so niedrig, dass nicht alle Ziele Platz haben, scrollt die Liste der Ziele für sich. Workspace-Umschalter, Laufpanel und **Settings** bleiben dabei sichtbar.

## Laufpanel

Das Laufpanel steht unten in der Seitenleiste über **Settings**. Der Schalter **Agents | Actions** wechselt zwischen den beiden Ansichten; Symphony merkt sich die gewählte Ansicht. Ist eine Liste länger als der verfügbare Platz, lässt sie sich innerhalb des Panels scrollen.

### Agents

Jede aktivierte Agent-Zeile des aktiven Workspace zeigt Avatar, Namen, die aktuelle Tätigkeit und einen Statuspunkt. Die Tätigkeit nennt, woran der Agent gerade arbeitet, zum Beispiel `Implementing` gefolgt von der Kennung des Work Items. Ein Agent ohne aktuelle Arbeit zeigt `Idle · <n> runs today` mit der Zahl seiner heute gestarteten Läufe.

| Zustand                                  | Tätigkeitstext                                                                                                              | Statuspunkt |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Arbeitet                                 | je nach Schritt `Drafting`, `Analyzing`, `Implementing`, `Revising`, `Diagnosing`, `Repairing` oder `Addressing reviews on` | blau        |
| Wartet auf einen freien Ausführungsplatz | `Queued for`                                                                                                                | neutral     |
| Wartet auf dich                          | `Waiting for you on`                                                                                                        | gelb        |
| Blockiert                                | `Blocked on`                                                                                                                | gelb        |
| Pausiert                                 | `Paused on`                                                                                                                 | neutral     |
| Fehlgeschlagen                           | `Failed on`                                                                                                                 | rot         |
| Abgeschlossen                            | `Finished`                                                                                                                  | neutral     |
| Ohne Arbeit                              | `Idle · <n> runs today`                                                                                                     | neutral     |

Ein Klick auf einen Agent mit laufender oder zuletzt bearbeiteter Ausführung öffnet deren Ausführungsdetails. Unter den Agents stehen Schritte, die auf einen freien Ausführungsplatz warten, mit dem Hinweis `Queued · waiting for a free slot`. **Remove from the queue** zieht einen solchen Schritt zurück, bevor er startet.

Hat der aktive Workspace keinen aktivierten Agent, zeigt das Panel **No agent in this workspace** mit dem Hinweis, ein AI-Konto zu verbinden und unter **Settings › AI team** einen Agent anzulegen. **Open AI team** öffnet die Einstellungen an dieser Stelle.

### Actions

Die Ansicht **Actions** zeigt die GitHub-Actions-Läufe, die gerade ausgeführt werden oder eingereiht sind, laufende mit einem drehenden Fortschrittsring, sowie darunter den jüngsten fehlgeschlagenen Lauf mit seinem Statussymbol. Jede Zeile nennt den Workflow, den Zustand und die Quelle (`GitHub`, `Local runner` oder `Action` für einen GitHub-Lauf mit lokaler Ausführung). Ein Klick öffnet die Details des Laufs mit seinen Jobs, Schritten und dem Protokoll. Die Beschriftung **Actions · <n>** nennt, wie viele Läufe gerade ausgeführt werden oder warten.

Läuft nichts und ist kein Lauf fehlgeschlagen, zeigt das Panel **No action is running** und `Runs appear here as soon as one starts.` Läufe, die bei GitHub eingereiht sind, erscheinen ebenfalls und zählen in **Actions · <n>** mit. Die vollständige Laufhistorie steht im Bereich **Actions**.

## Werkzeugleiste

- **Back** und **Forward** folgen der Navigationsgeschichte dieses Fensters. Am Anfang beziehungsweise Ende der Geschichte sind sie gesperrt. In den Einstellungen ist **Back** immer bedienbar und der Weg zurück zu deiner Arbeit; ohne vorherigen Bildschirm führt es zu **Overview**.
- Der Titel ist der Name des geöffneten Bildschirms. Ein Bildschirm kann einen eigenen Titel, einen einzeiligen Untertitel und eigene Aktionen in die Werkzeugleiste stellen; ohne eigene Angabe erscheint der Name des Seitenleisteneintrags.
- Das Suchfeld **Search ⌘K** (unter Windows und Linux **Search Ctrl+K**) nimmt selbst keinen Text auf. Ein Klick, der Fokus oder ein getipptes Zeichen öffnet die [Befehlspalette](../command-palette/README.md); ein getipptes Zeichen wird dabei als Suchanfang übernommen.

Die frühere Kopfzeile mit mittiger Navigation, Workspace-Menü, Suche und Spracheingabe gibt es nicht mehr. Die Spracheingabe ist aus dem Fensterrahmen entfernt; die Diktierfunktion für AI-Eingaben im Work-Item-Dialog bleibt erhalten.

## Statusleiste

### GitHub-Synchronisierung

Links zeigt die Statusleiste, wie aktuell die Pull-Request- und Actions-Daten von GitHub sind. Maßgeblich ist der langsamere der beiden Bereiche: Die Zeitangabe nennt die ältere der beiden letzten erfolgreichen Aktualisierungen.

| Situation                                   | Anzeige                                                                     | Aktion    |
| ------------------------------------------- | --------------------------------------------------------------------------- | --------- |
| Beide Bereiche sind aktuell.                | `Synced with GitHub <Zeit> ago`, etwa `Synced with GitHub 2 min ago`        | –         |
| GitHub hat das Anfragelimit erreicht.       | `GitHub request limit reached`, wenn bekannt mit `· try again at <Uhrzeit>` | **Retry** |
| Mindestens ein Bereich ist veraltet.        | `GitHub sync paused`, wenn bekannt mit `· last synced <Zeit> ago`           | **Retry** |
| Mindestens ein Bereich ist nicht verfügbar. | `GitHub is unavailable`                                                     | **Retry** |
| Es gibt noch keine GitHub-Daten.            | Kein Synchronisierungshinweis.                                              | –         |

**Retry** synchronisiert erneut mit GitHub – Work Items, Pull Requests und die GitHub-Actions-Läufe, wie **Sync now** – und zeigt währenddessen einen Ladezustand. Die Zeitangaben schreiten ohne Neuladen fort.

### Benachrichtigungen, Version und Update

Rechts stehen die Glocke **Notifications**, die installierte Version als `Symphony v<Version>` und, solange eine neuere Version verfügbar ist oder bereitsteht, die Updateschaltfläche. Die Glocke zeigt als Zahl, wie viele Hinweise Aufmerksamkeit brauchen, und öffnet per Klick das Benachrichtigungscenter. Download, Fortschritt und **Restart to update** beschreibt [Symphony aktualisieren](../application-updates/README.md).

## Tastenkürzel und Menü

| Kürzel macOS | Kürzel Windows und Linux | Wirkung                                                                                             |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------- |
| ⌘K           | Ctrl+K                   | Öffnet die [Befehlspalette](../command-palette/README.md) oder schließt sie wieder.                 |
| ⌘N           | Ctrl+N                   | Holt das Hauptfenster nach vorn, öffnet **Board** und dort den Dialog zum Anlegen eines Work Items. |
| ⌘,           | Ctrl+,                   | Holt das Hauptfenster nach vorn und öffnet die [Einstellungen](settings.md).                        |

Auf macOS stehen **Settings…** im Programmmenü und **New Work Item…** im Menü **File**. Unter Windows und Linux zeigt Symphony keine Menüleiste; die Kürzel funktionieren trotzdem, weil dieselben Einträge im unsichtbaren Menü **File** liegen. ⌘K und ⌘N wirken auch in den Einstellungen; ⌘N verlässt sie dabei und öffnet das Board.

## Plattformen

Der Aufbau ist auf allen Plattformen gleich; nur die Fensterbedienelemente folgen dem Betriebssystem.

| Plattform         | Fensterbedienelemente                                                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS             | Die drei Fensterknöpfe sitzen in der Kopfzeile der Seitenleiste. Bei ausgeblendeter Seitenleiste hält die Werkzeugleiste links Platz für sie frei.                                                                                                |
| Windows und Linux | Minimieren, Maximieren und Schließen sitzen rechts in der Werkzeugleiste in deren Höhe. Die Werkzeugleiste hält dort Platz frei, sodass das Suchfeld nicht verdeckt wird. Die Knöpfe folgen dem hellen oder dunklen Erscheinungsbild des Systems. |

## Sonder- und Fehlerfälle

### Daten noch nicht geladen

- Ausgangslage: Symphony startet oder ein Bereich kann seine Daten nicht lesen.
- Systemverhalten: Die Seitenleiste zeigt für diesen Bereich keine Zahl; die Statusleiste zeigt den Synchronisierungsstand erst, wenn GitHub-Daten vorliegen.
- Folge: Die übrigen Zahlen und Bereiche bleiben nutzbar.
- Verfügbare Aktion: Bei einem veralteten oder nicht verfügbaren GitHub-Stand **Retry** in der Statusleiste.

### Kein Agent im Workspace

- Ausgangslage: Der aktive Workspace hat keinen aktivierten Agent.
- Systemverhalten: Das Laufpanel zeigt **No agent in this workspace**.
- Verfügbare Aktion: **Open AI team** öffnet die Einstellungen des Workspace bei **AI team**.

### Bildschirme ohne Seitenleisteneintrag

- Ausgangslage: Ein Bildschirm ist nur über einen Link erreichbar, etwa die Projekteinrichtung.
- Systemverhalten: Keine Zeile der Seitenleiste ist hervorgehoben; ohne eigenen Titel des Bildschirms bleibt der Titel in der Werkzeugleiste leer.

## Verwandte Features

- [Einstellungen](settings.md)
- [Bereiche anpassen und scrollen](resizable-panes.md)
- [Symphony aktualisieren](../application-updates/README.md)
