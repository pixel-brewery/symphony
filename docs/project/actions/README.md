# Actions

**Actions** zeigt die GitHub-Actions-Läufe der Repositorys im gewählten Workspace – auf GitHub und auf dem verwalteten lokalen Runner. Du siehst auf einen Blick, was gerade läuft, was zuletzt fehlgeschlagen ist, und kannst Läufe starten, stoppen, wiederholen und ihre Protokolle öffnen.

## Was das Feature bietet

- **All runs** listet alle laufenden und eingereihten Läufe aller Workflows unter **Running now** und die abgeschlossenen Läufe aller Workflows unter **History**, neueste zuerst.
- Die Liste **WORKFLOWS** zeigt jeden Workflow mit einem Statuspunkt; ein Klick zeigt nur diesen Workflow mit seinen Läufen, den Schritten des gewählten Laufs, einem Protokollauszug und bei einem Fehlschlag der **Diagnosis**.
- Workflows mit manuellem Start lassen sich mit **Run on GitHub** oder **Run locally** starten.
- Laufende Läufe lassen sich mit **Stop**, eingereihte mit **Cancel** beenden; abgeschlossene mit **Rerun on GitHub** oder **Rerun locally** wiederholen.
- **View log** öffnet die Details eines Laufs mit Jobs, Abhängigkeitsgraph, Schritten, vollständigem Protokoll und ausstehenden Deployment-Freigaben.

## Voraussetzungen

- Der Workspace hat ein GitHub-Repository mit einer aktiven GitHub-Actions-Bindung.
- Für **Run locally** und **Rerun locally** muss **Local GitHub Actions** für den Workspace in den Einstellungen eingeschaltet sein. Der lokale Runner führt immer nur einen Lauf gleichzeitig aus.
- **Fix with AI** setzt voraus, dass der Lauf einen Pull Request von Symphony geprüft hat und dass **Fix failed checks** in **Settings › Automation** mindestens auf **Repair** steht.

## Aufbau

| Bereich            | Inhalt                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Werkzeugleiste     | Titel **Actions**, darunter Repository, Anzahl laufender und fehlschlagender Workflows (`ruederennes/flamox · 2 running · 1 failing`); rechts Filter und **Refresh**                                                                                                                    |
| Liste links        | **All runs** und darunter **WORKFLOWS** mit Statuspunkt: rot = letzter abgeschlossener Lauf fehlgeschlagen, grau = läuft gerade oder ohne abgeschlossenen Lauf, grün = letzter abgeschlossener Lauf erfolgreich. Fehlschlagende Workflows stehen oben.                                  |
| **All runs**       | **Running now · <n>** mit Workflow, Branch · Revision · Auslöser, Runner, Laufzeit (`running 2 min`, `waiting 3 min`), **View log** und **Stop** bzw. **Cancel**; **History** als Tabelle mit `Result`, `Workflow`, `Revision`, `Runner`, `Duration`, `Started` und **Show older runs** |
| Gewählter Workflow | Name und Workflow-Datei, **Run locally** und **Run on GitHub**, die Läufe des Workflows (`Result`, `Revision`, `Runner`, `Duration`, `Started`), die Schritte des gewählten Laufs, ein Protokollauszug und bei einem Fehlschlag die **Diagnosis**                                       |

`Runner` nennt, wo ein Lauf ausgeführt wurde: `GitHub`, `Local runner` oder `GitHub + local`, wenn der lokale Runner denselben Lauf wiederholt hat. Bei `GitHub + local` zeigt `Result` das jüngere der beiden Ergebnisse.

## Läufe bedienen

- Ein Klick auf eine Zeile in **History** öffnet den Workflow mit diesem Lauf. Läufe ohne bekannten Workflow öffnen direkt ihr Protokoll.
- In der Lauftabelle eines Workflows wählt ein Klick (oder die Eingabetaste) den Lauf, dessen Schritte darunter stehen. Ohne Auswahl zeigt Symphony den jüngsten abgeschlossenen Lauf.
- **Run on GitHub** öffnet ein Formular für Branch oder Revision und die Eingaben des Workflows; **Start workflow** startet den Lauf.
- **Stop** beendet einen laufenden Lauf auf GitHub oder auf dem lokalen Runner, je nachdem, wo er gerade läuft. Ein lokaler Start, für den GitHub noch keinen Lauf angelegt hat, lässt sich erst danach stoppen.
- **Show older runs** blendet jeweils zehn weitere abgeschlossene Läufe ein. Symphony kennt die jüngsten Läufe, die GitHub je Repository liefert.

## Diagnose und Reparatur

Bei einem fehlgeschlagenen Lauf zeigt **Diagnosis** die Diagnose, die Symphony für Pull Requests aus eigener Arbeit automatisch erstellt, sobald **Fix failed checks** mindestens auf **Diagnose** steht. Läuft die Diagnose noch, steht dort `An agent is diagnosing this failure.`; gibt es keine, nennt Symphony den fehlgeschlagenen Schritt. Hat Symphony eine Reparatur gestartet, zeigt ein Abzeichen `Repairing`, `Repaired` oder `Repair failed`.

**Fix with AI** startet eine Überarbeitung des Pull Requests, den der Lauf geprüft hat. Der Agent erhält den Workflow, die fehlgeschlagenen Schritte und den Protokollauszug als Rückmeldung. Ist das nicht möglich, steht der Grund unter den Schaltflächen:

| Grund                                            | Hinweis                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Reparaturen sind in der Automation nicht erlaubt | `Fix with AI needs Fix failed checks set to Repair or Full.` und **Open Automation settings** |
| Ein Agent arbeitet bereits am Work Item          | `An agent is already working on this pull request.`                                           |
| Der Lauf prüfte keinen Pull Request von Symphony | `Fix with AI revises Symphony’s own pull requests; this run checked another branch.`          |

**Rerun on GitHub** wiederholt den Lauf, **Open in GitHub** öffnet ihn auf GitHub.

## Filter, Suche und Verweise

- Der Filter in der Werkzeugleiste grenzt alle Listen nach **Status** und **Author** ein und sortiert die abgeschlossenen Läufe nach Startzeit.
- Die Kacheln auf **Overview** öffnen Actions bereits nach Status gefiltert.
- Die Suche (`⌘K`) findet Läufe nach Workflow, Titel, Branch, Revision, Autor oder Status und öffnet Actions mit diesem Suchbegriff.
- Die gewählte Ansicht steht in der Adresse; **Back** und **Forward** wechseln zwischen **All runs** und zuvor gewählten Workflows.
- Der Befehl **Run <Workflow> on GitHub** der Befehlspalette öffnet Actions mit diesem Workflow und dem Formular für Branch oder Revision; gestartet wird erst mit **Start workflow**.
- Ein Verweis auf einen bestimmten Lauf öffnet dessen Details und wählt im Hintergrund den Workflow und den Lauf.

## Fehler und leere Zustände

- Sind die Daten von GitHub nicht aktuell oder nicht verfügbar, zeigt Actions oben einen Hinweis mit dem Zeitpunkt der letzten Aktualisierung und **Retry**. Bei erreichtem GitHub-Anfragelimit nennt der Hinweis, ab wann ein neuer Versuch möglich ist.
- Läuft nichts, zeigt **Running now** `Nothing is running`; ohne abgeschlossene Läufe zeigt **History** `No finished runs yet`. Mit aktivem Filter nennen beide, dass kein Lauf dem Filter entspricht.
- Ohne Workflows und Läufe zeigt Actions `No Actions workflows`.
- Liefert GitHub die Jobs eines Laufs nicht, steht unter dem Lauf `Steps unavailable`; **View log** und **Open in GitHub** bleiben verfügbar.

Das Laufpanel der Seitenleiste zeigt unter **Actions** die laufenden Läufe ebenfalls an; siehe [Hauptfenster und Navigation](../window-and-navigation/README.md).
