# Actions

**Actions** zeigt die GitHub-Actions-Läufe der Repositorys im gewählten Workspace – auf GitHub und auf dem verwalteten lokalen Runner. Du siehst auf einen Blick, was gerade läuft, was zuletzt fehlgeschlagen ist, und kannst Läufe starten, stoppen, wiederholen und ihre Protokolle öffnen.

## Was das Feature bietet

- **All runs** listet alle laufenden und eingereihten Läufe aller Workflows unter **Running now** und die abgeschlossenen Läufe aller Workflows unter **History**, neueste zuerst.
- Die Liste **WORKFLOWS** zeigt jeden Workflow mit einem Statuspunkt. Ein Klick zeigt seine Läufe und bei einem Fehlschlag des gewählten Laufs die **Diagnosis**.
- Workflows mit manuellem Start lassen sich mit **Run on GitHub** oder **Run locally** starten.
- Laufende Läufe lassen sich mit **Stop**, eingereihte mit **Cancel** beenden; abgeschlossene mit **Rerun on GitHub** oder **Rerun locally** wiederholen.
- Ein Klick auf einen Lauf öffnet seine Details mit Jobs, Schritten, verfügbarem Protokoll und ausstehenden Deployment-Freigaben. Ein Diagramm zeigt die Job-Abhängigkeiten, wenn die Workflow-Definition verfügbar ist.

## Voraussetzungen

- Der Workspace hat ein GitHub-Repository mit einer aktiven GitHub-Actions-Bindung.
- Für **Run locally** und **Rerun locally** muss **Local GitHub Actions** für den Workspace in den Einstellungen eingeschaltet sein. Die Jobs des Workflows müssen für den lokalen Runner von Symphony vorbereitet sein; der Schalter allein wandelt einen GitHub-gehosteten Job nicht in einen lokalen Lauf um. Der lokale Runner führt immer nur einen Lauf gleichzeitig aus.
- **Fix with AI** setzt voraus, dass der Lauf einen Pull Request von Symphony geprüft hat und dass **Fix failed checks** in **Settings › Automation** mindestens auf **Repair** steht.

## Aufbau

Beim Öffnen lädt Actions die Workflow-Liste zusammen mit den aktuellen Läufen. Auch ohne zuvor gespeicherte Daten erscheinen dadurch Workflows ohne bisherige Läufe. **Refresh** und **Retry** lesen ebenfalls beides neu; die automatische Aktualisierung der Läufe behält die vorhandene Workflow-Liste bei. Schlägt eine Aktualisierung fehl, bleiben zuletzt erfolgreich geladene Daten mit einem Hinweis verfügbar.

| Bereich            | Inhalt                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Werkzeugleiste     | Titel **Actions**, darunter Repository, Anzahl laufender und fehlschlagender Workflows (`example/project · 2 running · 1 failing`); rechts Filter und **Refresh**                                                                                                                       |
| Liste links        | **All runs** und darunter **WORKFLOWS** mit Statuspunkt: rot = letzter abgeschlossener Lauf fehlgeschlagen, grau = läuft gerade oder ohne abgeschlossenen Lauf, grün = letzter abgeschlossener Lauf erfolgreich. Fehlschlagende Workflows stehen oben.                                  |
| **All runs**       | **Running now · <n>** mit Workflow, Branch · Revision · Auslöser, Runner, Laufzeit (`running 2 min`, `waiting 3 min`), **View log** und **Stop** bzw. **Cancel**; **History** als Tabelle mit `Result`, `Workflow`, `Revision`, `Runner`, `Duration`, `Started` und **Show older runs** |
| Gewählter Workflow | Name und Workflow-Datei, **Run locally** und **Run on GitHub**, die Läufe des Workflows (`Result`, `Revision`, `Runner`, `Duration`, `Started`), bei einem Fehlschlag des gewählten Laufs das aufklappbare Banner **Diagnosis**                                                         |

Die Arbeitsfläche bleibt innerhalb der Fensterhöhe. Werkzeugleiste und Ansichtskopf bleiben beim Scrollen sichtbar. In **All runs** teilen sich **Running now** und **History** den verbleibenden Platz zu gleichen Teilen. In der Workflow-Ansicht nutzt die Lauftabelle den Platz unter dem Workflow-Kopf. Tabellenüberschriften bleiben beim Scrollen der Zeilen sichtbar. Das Formular **Run on GitHub** scrollt bei vielen Eingaben in einem begrenzten Bereich.

Bei einem fehlgeschlagenen gewählten Lauf steht unter der Tabelle ein violettes Banner **Diagnosis**. Es ist zunächst eingeklappt. Klappe es auf, um die Erklärung und gegebenenfalls den Grund für eine gesperrte Reparatur zu lesen. Längere Erklärungen scrollen innerhalb des Banners, während die Überschrift und **Fix with AI** erreichbar bleiben. Ohne eigene Wahl gilt der jüngste abgeschlossene Lauf, ersatzweise der erste Lauf des Workflows.

Statuspunkt und Workflow-Name liegen in derselben Auswahlfläche. Ein Klick auf einen der beiden Teile wählt den Workflow. Ein Tooltip zeigt beim Überfahren oder bei Tastaturfokus den vollständigen Namen, auch wenn er in der schmalen Liste abgeschnitten ist. Für deaktivierte Workflows enthält es zusätzlich `Disabled on GitHub`; ihre Historie bleibt auswählbar.

`Runner` nennt, wo ein Lauf ausgeführt wurde: `GitHub`, `Local runner` oder `GitHub + local`, wenn der lokale Runner denselben Lauf wiederholt hat. Bei `GitHub + local` zeigt `Result` das jüngere der beiden Ergebnisse.

## Läufe bedienen

- Ein Klick auf eine Zeile in **History** oder in der Lauftabelle eines Workflows öffnet das Protokoll direkt über der aktuellen Ansicht. Mit der Tastatur fokussierst du die Zeile und drückst Eingabe oder Leertaste.
- Rechtsklick oder Umschalt+F10 öffnet das Kontextmenü der Zeile. Es enthält **View log** und die für diesen Lauf verfügbaren Befehle wie **Open in GitHub**, **Stop**, **Cancel** oder die Wiederholungsoptionen.
- **Run on GitHub** öffnet ein Formular für Branch oder Revision und die Eingaben des Workflows; **Start workflow** startet den Lauf.
- Eine automatische lokale Übernahme kann auch in einem anderen aktivierten und freigegebenen Workspace stattfinden. Zum ausdrücklichen lokalen Start oder Wiederholen wählst du den Workspace des Laufs aus. Ein bereits protokollierter Übernahmeversuch wird nach einem Einrichtungsfehler für denselben GitHub-Lauf und Versuch nicht automatisch wiederholt; **Rerun locally** startet nach Beheben der Ursache einen neuen lokalen Versuch. Eine [Speicherablehnung vor der Einrichtung](../workspaces/local-github-actions.md#wenn-speicher-den-start-verhindert) bleibt dagegen für eine spätere automatische Übernahme geeignet.
- **Stop** beendet einen laufenden Lauf auf GitHub oder auf dem lokalen Runner, je nachdem, wo er gerade läuft. Ein lokaler Start, für den GitHub noch keinen Lauf angelegt hat, lässt sich erst danach stoppen.
- **Show older runs** blendet jeweils zehn weitere abgeschlossene Läufe ein. Symphony kennt die jüngsten Läufe, die GitHub je Repository liefert.

## Laufdetails und Protokoll

Oben im Drawer stehen der Workflow, die Quelle und ihr Status sowie bei bekannten GitHub-Läufen das Repository und der Branch. Neben **Schließen** stehen die verfügbaren Laufaktionen. Ein GitHub-Link öffnet den Lauf auf GitHub. **Rerun on GitHub** wiederholt einen beendeten Lauf, **Run locally** nutzt den eingeschalteten und freien lokalen Runner, und **Stop local runner** beendet dessen laufende Ausführung. Die GitHub-Befehle **Stop** und **Cancel** stehen im Kontextmenü der Lauftabelle.

Das kompakte Diagramm zeigt verfügbare Abhängigkeiten zwischen den Jobs. Ein Klick auf einen ausgeführten Job führt zu seinem Eintrag in **Action log**. Bei Matrix-Jobs wählst du dort im Diagramm die konkrete Ausführung aus. Den Inhalt des Diagramms kannst du durch Ziehen verschieben und mit Strg- oder Cmd-Scrollen vergrößern oder verkleinern. Die Liste unter dem Diagramm enthält alle gemeldeten Jobs, auch wenn sich ein Job keiner Definition im Diagramm zuordnen lässt. **Open job** öffnet den jeweiligen Job auf GitHub, wenn ein Link vorhanden ist.

Ausstehende Deployment-Freigaben zeigen ihre Zielumgebung und die genaue Revision. Wer die Freigabeberechtigung hat, kann nach Eingabe eines Grunds zustimmen oder ablehnen.

## Diagnose und Reparatur

Bei einem fehlgeschlagenen Lauf zeigt **Diagnosis** die Diagnose, die Symphony für Pull Requests aus eigener Arbeit automatisch erstellt, sobald **Fix failed checks** mindestens auf **Diagnose** steht. Läuft die Diagnose noch, steht dort `An agent is diagnosing this failure.`; gibt es keine, nennt Symphony den fehlgeschlagenen Schritt. Hat Symphony eine Reparatur gestartet, zeigt ein Abzeichen `Repairing`, `Repaired` oder `Repair failed`.

Für die automatische Diagnose liest Symphony die GitHub-Anbindungen getrennt.
Eine nicht erreichbare Anbindung hält die Prüfung anderer erreichbarer und
freigegebener Repositorys nicht auf. Scheitern alle tatsächlich abgefragten
Anbindungen oder erreicht GitHub sein Anfragelimit, bleibt der Abruf fehlgeschlagen.
Die Actions-Ansicht meldet weiterhin, wenn die Daten des gewählten Workspace nicht
aktuell sind.

**Fix with AI** startet eine Überarbeitung des Pull Requests, den der Lauf geprüft hat. Der Agent erhält den Workflow, die fehlgeschlagenen Schritte und den Protokollauszug als Rückmeldung. Ist das nicht möglich, zeigt das aufgeklappte Banner den Grund.

| Grund                                            | Hinweis                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Reparaturen sind in der Automation nicht erlaubt | `Fix with AI needs Fix failed checks set to Repair or Full.` und **Open Automation settings** |
| Ein Agent arbeitet bereits am Work Item          | `An agent is already working on this pull request.`                                           |
| Der Lauf prüfte keinen Pull Request von Symphony | `Fix with AI revises Symphony’s own pull requests; this run checked another branch.`          |
| Die Installation stellt keine AI-Agenten bereit  | `AI agents are not part of this Symphony setup.`                                              |

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
- Sind keine Jobs gemeldet, zeigt der Drawer `No jobs reported yet`. Scheitert der Abruf der Details und liegt kein Protokoll vor, zeigt er `Action log unavailable`. Öffne den Lauf über den GitHub-Link, wenn er verfügbar ist.
- Hat ein fehlgeschlagener Job keine Schritte und kein lesbares Fehlerprotokoll, übernimmt Symphony als Fehler markierte Meldungen seines GitHub-Checks in das Protokoll. So bleibt beispielsweise ein von GitHub verweigerter Start wegen eines Actions-Budgets erkennbar. Das Anzeigen dieser Ursache ändert weder das Budget noch die Runner-Auswahl des Workflows.

Das Laufpanel der Seitenleiste zeigt unter **Actions** die laufenden Läufe ebenfalls an; siehe [Hauptfenster und Navigation](../window-and-navigation/README.md).
