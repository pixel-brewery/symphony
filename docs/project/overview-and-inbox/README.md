# Overview und Inbox

**Overview** ist die Startseite von Symphony: Sie zeigt die ganze Auslieferung des aktiven Workspace auf einen Blick, ohne dass ein Bereich geöffnet werden muss. Die **Inbox** sammelt, was eine Entscheidung braucht, und berichtet, was zuletzt geschehen ist. Beide stehen ganz oben in der Seitenleiste: **Overview** als erstes Ziel, **Inbox** als erstes Ziel der Gruppe **Delivery**.

## Voraussetzungen

- Ein Workspace ist ausgewählt. Alle Zahlen beziehen sich auf seine Work Items, Pull Requests, Actions-Läufe und Agentenläufe.
- Was Symphony noch lädt, erscheint als Platzhalter (Skeleton) und wird ersetzt, sobald die Daten da sind.

## Overview

Symphony öffnet sich auf **Overview**. Die Werkzeugleiste zeigt den Titel `Overview` und darunter Workspace und Datum, zum Beispiel `FLAMOX365 · Thursday, October 30`.

### Begrüßung und Schnellaktionen

Unter der Begrüßung (`Good morning`, `Good afternoon`, `Good evening`) steht in einem Satz, was Aufmerksamkeit braucht: wie viele Entscheidungen in der Inbox warten, welcher Workflow gerade fehlschlägt und welcher Agent woran arbeitet, etwa `4 decisions wait for you. Deploy Dev is failing, and Claude Code is implementing CR-0602.`

| Schaltfläche      | Wirkung                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sync now**      | Lädt zuerst Work Items und Pull Requests, danach die Actions-Läufe neu von GitHub, wie die Aktualisierung in der Statusleiste, und liest anschließend die aufgezeichnete Historie für `Reporting` neu. |
| **Run workflow**  | Öffnet **Actions**, wo ein Workflow auf GitHub oder lokal gestartet wird.                                                                                                                              |
| **New work item** | Öffnet über dem **Board** das Blatt für ein neues Work Item.                                                                                                                                           |

### Karten

| Karte             | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **Open** führt zu |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `Waiting for you` | Die vier ältesten Entscheidungen der Inbox mit Symbol, Titel, Work Item und Alter, im Kopf Anzahl und Alter der ältesten. Ein Klick auf eine Zeile öffnet sie in der Inbox. Ohne Entscheidung steht dort, dass nichts wartet.                                                                                                                                                                                                                                                                                                                                                                                          | **Inbox**         |
| `Pull requests`   | Offene Pull Requests nach den Regeln des Bildschirms **Pull requests**: `Checks failing` (ein Check fehlgeschlagen), `Checks running` (ein Check wartet oder läuft), `Ready to merge` (kein Entwurf, Branch auf dem Stand der Basis, alle Checks erfolgreich; Freigaben liest Symphony nicht) und `Drafts`. `Waiting for your review` zählt die offenen Pull Requests, bei denen GitHub eine noch ausstehende Review-Anfrage an das GitHub-Konto des Workspace meldet. Kennt Symphony das Konto nicht (die GitHub-Verbindung nennt kein Konto), steht dort `—`. Anfragen an ein Team werden keiner Person zugerechnet. | **Pull requests** |
| `Production`      | Die bestätigte Production-Version mit Datum für das Projekt, das **Orbit** zeigt, dazu die Zahlen, die Orbit für seinen voreingestellten Cluster nennt (**Needs attention**, sonst den ersten Cluster): wie viele dieser Work Items nicht in der bestätigten Version enthalten sind, und `Evidence collected`, wie viele davon auf irgendeinem Ziel einen erfolgreichen Nachweis haben. Ohne Production-Ziel oder ohne bestätigten Stand gelten die Meldungen von Orbit.                                                                                                                                               | **Orbit**         |

### Reporting

Der Abschnitt `Reporting` vergleicht einen Zeitraum mit dem gleich langen Zeitraum davor. Der Umschalter `7 days`, `30 days`, `Quarter` (die letzten 90 Tage) gilt für alles darunter.

| Kachel / Diagramm    | Bedeutung                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Delivered`          | Work Items, deren letzter Wechsel in eine Endstufe (Done) in den Zeitraum fällt. Ein Work Item, das wieder geöffnet und erneut abgeschlossen wurde, zählt einmal, im Zeitraum seines letzten Abschlusses.                     |
| `Median lead time`   | Median der Tage vom ersten Wechsel nach Qualified bis zum Wechsel nach Done, über die im Zeitraum gelieferten Work Items, auf eine Nachkommastelle. Work Items ohne aufgezeichneten Wechsel nach Qualified zählen nicht mit.  |
| `Agent runs`         | Agentenläufe, die im Zeitraum begonnen haben, und wie viele davon ohne Eingriff auskamen (beim ersten Versuch erfolgreich und nie pausiert).                                                                                  |
| `Workflow success`   | Anteil der erfolgreichen an den erfolgreichen und fehlgeschlagenen Actions-Läufen, die im Zeitraum begonnen haben. Abgebrochene Läufe zählen nicht mit; jeder Wiederholungsversuch eines Laufs zählt als eigener Lauf.        |
| `Board`              | Ein Balken je Board-Spalte mit der Zahl der Work Items, dazu die Gesamtzahl und wie viele das Board unter **Needs you** führt. Ein Klick auf einen Balken öffnet das Board auf diese Spalte gefiltert.                        |
| `Delivered per week` | Work Items je Kalenderwoche (ISO, Montag bis Sonntag, Beschriftung `W44`) über die letzten acht Wochen, die laufende Woche hervorgehoben und mit Zahl. Gilt unabhängig vom gewählten Zeitraum.                                |
| `Workflow runs`      | Die Läufe des Zeitraums nach Ergebnis (`Succeeded`, `Failed`, `Cancelled`) mit Balken, Symbol und Zahl, dazu ein Satz, welcher Workflow die meisten Fehlschläge verursacht hat und wie viele Läufe gerade laufen oder warten. |

Jede Kachel mit einem Vergleich trägt ein Abzeichen mit der Veränderung: grün bei einer Verbesserung, rot bei einer Verschlechterung, neutral sonst. `Agent runs` ist immer neutral, weil mehr Läufe weder besser noch schlechter sind.

#### Woher die Historie kommt

- **Stufenwechsel**: Symphony zeichnet jeden Wechsel eines Work Items zwischen Workflow-Stufen auf, ob ein Agent, eine Entscheidung oder ein Verschieben auf dem Board ihn auslöst. Welche Stufe als Qualified und welche als Done gilt, ergibt sich aus dem Workflow: Done sind die Endstufen, Qualified ist die Stufe, in der die Analyse läuft (ohne Analysestufe die erste Stufe nach der Eingangsstufe).
- **Actions-Läufe**: GitHub liefert je Repository nur die neuesten Läufe. Symphony hält deshalb jeden abgeschlossenen Lauf (`Succeeded`, `Failed`, `Cancelled`), den eine Aktualisierung sieht, 200 Tage lang fest. Laufende und wartende Läufe werden aufgezeichnet, sobald eine spätere Aktualisierung sie abgeschlossen sieht.

Ein Zeitraum, der vor dem ersten aufgezeichneten Stufenwechsel bzw. vor dem Beginn des ersten aufgezeichneten Laufs beginnt, hat keinen Wert: `Delivered`, `Median lead time`, `Workflow success` und `Workflow runs` zeigen `—` und nennen, seit wann aufgezeichnet wird (`Recorded since Aug 19`), oder dass noch nichts aufgezeichnet ist. Reicht nur der vorige Zeitraum nicht zurück, steht der Wert ohne Abzeichen da (`vs. — the week before`). In `Delivered per week` bleiben Wochen ohne Balken, die vor der Aufzeichnung beginnen; ist keine ganze Woche aufgezeichnet, zeigt das Diagramm `—`. Eine Zahl ohne ausreichende Historie ist nie `0`.

Eine frische Installation zeigt diese Werte daher erst, wenn die Aufzeichnung den Zeitraum abdeckt: nach einer Woche für `7 days`, nach 30 Tagen für `30 days` usw. Läuft Symphony längere Zeit nicht, während in einem Repository mehr Läufe entstehen, als GitHub als neueste liefert, fehlen diese Läufe in der Aufzeichnung.

### Fehler und leere Zustände

- Eine Karte, deren Daten noch laden, zeigt Platzhalter. Beim Öffnen von Overview und bei jedem Wechsel des Zeitraums liest Symphony die Historie neu; währenddessen zeigen die betroffenen Kacheln und Diagramme Platzhalter.
- Kann GitHub die Pull Requests, die Actions-Läufe oder die Work Items gar nicht liefern, sagt die betroffene Karte das und bietet **Retry** an; die anderen Karten arbeiten weiter.
- Lässt sich die aufgezeichnete Historie nicht lesen, sagen `Delivered`, `Median lead time` und `Delivered per week` (Stufenwechsel) bzw. `Workflow success` und `Workflow runs` (Läufe) das und bieten **Retry** an.
- Lassen sich die Lieferungsnachweise für `Production` nicht lesen, bietet die Karte **Retry** an.
- Meldet ein externer Dienst eine Störung, steht der Hinweis zwischen Begrüßung und Karten.

## Inbox

Die Seitenleiste zeigt neben **Inbox** die Zahl der wartenden Entscheidungen; solange Symphony lädt oder nichts wartet, fehlt die Zahl. Die Werkzeugleiste zeigt `{n} need your decision · {m} updates`.

### Liste

Der Umschalter `All`, `Decisions`, `Updates` filtert die Liste; jede Schaltfläche nennt ihre Anzahl. Die Liste steht in zwei Gruppen, jeweils die neuesten zuerst, mit Symbol, Titel, Alter und einer Zeile darunter. Der gewählte Eintrag ist hervorgehoben.

`NEEDS YOUR DECISION`:

| Eintrag                              | Entsteht, wenn                                                                                                                                            | Alter seit       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `Choose how CR-… continues`          | ein Work Item in einer Umsetzungsstufe (zum Beispiel Ready) eine fertige Analyse hat, danach noch keine Umsetzung begann und kein Lauf läuft oder wartet. | Ende der Analyse |
| `Review delivered work`              | ein Work Item an einer Freigabestufe hinter der Umsetzung (zum Beispiel Acceptance) steht oder sein delegiertes Ziel auf eine Prüfung wartet.             | letzte Änderung  |
| `Deliver n work items together?`     | der Analyzer vorschlägt, mehrere Work Items gemeinsam auszuliefern, und noch niemand entschieden hat.                                                     | Vorschlag        |
| `<Workflow> failed` / `failed twice` | der jeweils letzte abgeschlossene Lauf eines Workflows fehlschlug.                                                                                        | Ende des Laufs   |

`UPDATES` berichtet aus den letzten sieben Tagen, was Agenten gestartet, beendet oder nicht geschafft haben (`Claude Code started implementation`, `Codex finished the analysis`), und zusammengeführte Pull Requests (`PR #705 merged`). Bei **Review delivered work** stehen **Accept** und **Request changes** direkt im Eintrag.

Ohne Eintrag zeigt die Liste `Nothing to decide`.

### Detailbereich

Der Detailbereich zeigt `Decision needed` oder `Update`, die Board-Spalte, Kennung und Pull-Request-Nummer in Festbreitenschrift, Titel und Beschreibung sowie die fünf Stufen `Analysis`, `Solution`, `Implementation`, `Checks`, `Acceptance` mit ihrem Stand. Eine Stufe, die das Work Item im Ablauf schon hinter sich hat, gilt als erledigt.

Unter `How should this continue?` stehen die Möglichkeiten zur Auswahl:

| Entscheidung                     | Möglichkeiten                                                                                                                                                                              | Bestätigen mit                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `Choose how … continues`         | **Assign to <Agent>** für jeden Agenten, den das Team des Workspace für die Umsetzung vorsieht; **Record the implementation yourself** mit Pflichtfeld für das Protokoll.                  | **Assign and start** / **Record implementation** |
| `Review delivered work`          | Die Entscheidungen der Freigabestufe (`Accept`, `Implementation is wrong`, …, mit optionaler Notiz) oder bei einem delegierten Ziel **Accept work** und **Request changes** (Pflichtfeld). | Name der gewählten Möglichkeit                   |
| `Deliver n work items together?` | **Deliver together**, **Keep them separate**                                                                                                                                               | Name der gewählten Möglichkeit                   |
| `<Workflow> failed`              | **Rerun on GitHub**, **Open in Actions** (Log, Diagnose und **Fix with AI**)                                                                                                               | Name der gewählten Möglichkeit                   |

Jede Möglichkeit führt genau den Befehl aus, den Board, Actions oder die Gruppenansicht ausführen, mit denselben Prüfungen: Symphony wendet die Automatisierungsrichtlinie an, und vor dem ersten Agentenlauf in einem noch nicht vorbereiteten Repository fragt Symphony wie auf dem Board, ob es lokal vorbereitet werden soll.

**Snooze until tomorrow** blendet den Eintrag bis zum nächsten Tag aus. Das gilt nur für die laufende Sitzung: Nach einem Neustart erscheint der Eintrag wieder.

`From the analysis` zeigt die Kernaussage der Analyse und die offenen Fragen (`Open: …`); **Open analysis** öffnet das Work Item auf dem Board.

## Grenzen

- `Delivered`, `Median lead time`, `Delivered per week`, `Workflow success` und `Workflow runs` reichen nur so weit zurück wie Symphonys eigene Aufzeichnung; davor zeigen sie `—`.
- `Waiting for your review` braucht das GitHub-Konto des Workspace und zählt nur persönliche, noch ausstehende Review-Anfragen; `Ready to merge` berücksichtigt keine Freigaben.
- Von einem Agenten gestellte Rückfragen und Entwürfe aus dem Teams-Eingang erscheinen noch nicht als Entscheidung.
- Ein Workflow-Fehlschlag nennt noch nicht die Diagnose des Laufs; sie steht in **Actions**.
