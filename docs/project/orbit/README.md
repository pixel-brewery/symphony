# Orbit

Der Bildschirm **Orbit** zeigt ein Projekt als Umlaufbahn um sein Production-Ziel. In der Mitte steht das Ziel, das Production darstellt; die übrigen Auslieferungsziele des Projekts kreisen auf eigenen Bahnen. Die Work Items liegen als Cluster auf einem Gürtel um die Mitte, je Board-Spalte einer und dazu **Needs attention**. So beantwortet Orbit auf einen Blick, wo die Arbeit steht, welche Version in Production bestätigt ist und welche Work Items noch nicht ausgeliefert sind. Von hier aus lässt sich ein Cluster auf dem Board öffnen und eine genaue Version an ein Ziel ausliefern.

## Voraussetzungen

- Mindestens ein aktiviertes Repository in den gewählten Workspaces. Orbit zeigt immer genau ein Projekt (Repository); bei mehreren Repositories wählst du es in der Werkzeugleiste.
- Für die Mitte und die Bahnen: Auslieferungsziele des Projekts unter **Settings › Delivery destinations** des Workspace (siehe [Workspaces](../workspaces/README.md)). Ohne ein Ziel, das Production darstellt, zeigt Orbit den Zustand **No production destination**.
- Für bestätigte Versionen ein GitHub-Konto, über das Symphony die Auslieferungsnachweise (Deployments, Releases, Installationsbelege) des Repositories lesen kann.

## Aufbau

### Werkzeugleiste

Der Titel lautet **Orbit**. Die Zeile darunter nennt ein Ziel und seinen Stand: das Ziel, das du im Orbit oder im Zielmenü gewählt hast, sonst das erste Production-Ziel in der Reihenfolge des Zielmenüs (Production-Ziele nach Namen sortiert).

| Untertitel                      | Bedeutung                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `<Ziel> · <Version>`            | Die aktuelle Version dieses Ziels ist bestätigt.                                                   |
| `<Ziel> · No confirmed version` | Für dieses Ziel liegt keine bestätigte Version vor.                                                |
| `<Ziel> · Not verified`         | Der letzte Abruf der Nachweise ist fehlgeschlagen; der zuletzt bekannte Stand ist nicht gesichert. |
| `No production destination`     | Für das Projekt ist kein Ziel als Production eingerichtet, und kein Ziel ist gewählt.              |

Bei mehreren Production-Zielen nennt der Untertitel also die bestätigte Version des gewählten Production-Ziels – ohne Wahl die des ersten –, nicht eine gemeinsame Angabe für alle.

Rechts liegen bei mehreren Repositories die Projektauswahl (**Project**) und danach die Zielsteuerung, eine Schaltfläche mit dem Namen des Production-Ziels (bei keinem oder mehreren Production-Zielen `Production`). Ihr Menü enthält:

- jedes Auslieferungsziel des Projekts, Production-Ziele zuerst, mit seiner Art (`Environment`, `Release channel` oder `Installation`) und gegebenenfalls `Production ·` davor. Die Wahl eines Ziels wählt es im Orbit aus und richtet die Ansicht darauf. Ohne Ziele steht dort **No delivery destinations are configured for this project.**
- **Refresh evidence**: ruft die Auslieferungsnachweise neu ab; während eines Abrufs gesperrt.
- **Delivery destinations in Settings**: öffnet das Einstellungsfenster bei den Auslieferungszielen des gezeigten Projekts, ohne ein Ziel zu bearbeiten.

### Diagramm

- **Mitte**: das Production-Ziel als Himmelskörper, standardmäßig die Sonne, beschriftet mit **Production**. Den Körper wählst du beim Production-Ziel in den Einstellungen. Unter der Beschriftung steht die bestätigte Version mit Datum (etwa `v2026.10.3 · confirmed Oct 30`), sonst `No confirmed version` oder `No destination configured`.
- **Weitere Ziele**: Umgebungen, Release-Kanäle und Installationen auf gestrichelten Bahnen, jeweils mit Namen und bestätigter Version. Bei mehreren Production-Zielen bleibt die Mitte eine Sonne, und die Production-Ziele stehen als eigene Körper gleichmäßig verteilt nahe der Mitte.
- **Cluster**: Die Work Items liegen auf einem durchgezogenen Gürtel um die Ziele. Jeder Cluster belegt einen Abschnitt, im Uhrzeigersinn von oben: zuerst die Board-Spalten in der Reihenfolge des aktiven Boards (einschließlich `No column`), zuletzt **Needs attention**. Leere Spalten erscheinen nicht. Ein Work Item, das Aufmerksamkeit braucht, steht nur in **Needs attention**, nicht zusätzlich in seiner Spalte; ob ein Work Item Aufmerksamkeit braucht, entscheidet dieselbe Regel wie beim Filter **Needs you** auf dem Board.
- **Cluster-Beschriftung**: `<Name> · <Anzahl>` außen am Abschnitt. **Needs attention** ist rot mit Warnsymbol, eine Spalte mit abgeschlossener Arbeit (etwa `Done`) grün, alle anderen neutral. Die Work Items eines Clusters übernehmen seine Farbe.

Du bewegst die Ansicht mit Ziehen, Mausrad oder Zwei-Finger-Geste. Die Karte unten links bietet **+** (näher heran), die aktuelle Vergrößerung gegenüber der eingepassten Ansicht (`100 %`; ein Klick kehrt zu 100 % zurück) und **Fit** (alles einpassen). Ein Klick auf ein Work Item oder eine Beschriftung wählt das Objekt für den Inspektor aus. Ein Doppelklick oder ⌘↵ beziehungsweise Ctrl+Enter auf einer Beschriftung richtet die Ansicht darauf aus. Wählst du ein Work Item aus, richtet sich die Ansicht immer auf es aus; die Auswahl eines Clusters oder Ziels im Diagramm bewegt die Ansicht nicht.

Aus der Entfernung zeigt das Diagramm keine Work-Item-Beschriftungen außer der des ausgewählten Work Items; näher heran erscheinen höchstens 14, ganz nah höchstens 18. Ziele und Cluster sind beschriftet, wo Platz ist.

Gelegentlich fliegen Raumschiffe mit den Figuren der aktivierten AI-Agenten aus dem Workspace des Projekts durch das Bild. Sie sind reine Dekoration, lassen sich nicht auswählen und verändern keine Arbeit. Bei reduzierter Bewegung im Betriebssystem bleiben sie aus.

### Inspektor

Rechts neben dem Diagramm liegt ein fester Inspektor. Er zeigt immer genau einen Inhalt, in dieser Rangfolge:

| Ausgewählt                                                  | Inhalt                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ein Ziel (auch das einzige Production-Ziel in der Mitte)    | **Production destination** oder **Selected destination** mit Nachweisen und Auslieferung |
| die Mitte, wenn kein oder mehrere Production-Ziele bestehen | **Selected destination** · **Production** mit dem Production-Zustand                     |
| ein Cluster                                                 | **Selected cluster**                                                                     |
| ein Work Item                                               | **Selected work item**                                                                   |
| nichts                                                      | der Cluster **Needs attention**, wenn es ihn gibt, sonst der erste Cluster               |

Ziel-, Production- und Work-Item-Ansicht haben eine Schließen-Schaltfläche (**Close**); sie und **Escape** heben die Auswahl auf, und der Inspektor zeigt wieder den voreingestellten Cluster. Die Auswahl auf dem Board bleibt dabei erhalten.

## Cluster prüfen und auf dem Board öffnen

Der Inspektor eines Clusters zeigt:

- den Namen des Clusters und eine Zusammenfassung: `All 12 work items are in the confirmed Production version.`, `3 of 12 work items are not in a confirmed Production version.` oder, solange die Nachweise laden oder nicht abrufbar sind, nur die Anzahl der Work Items. Ohne Production-Ziel steht dort **No production destination is configured for this project.**
- **Evidence collected** mit `n of m` und Fortschrittsbalken: wie viele Work Items des Clusters irgendein Ziel mit einem erfolgreichen Nachweis enthält. Solange die Nachweise nicht vorliegen, steht dort `—` ohne Balken.
- die Work Items des Clusters, das neueste Kennzeichen zuerst, mit Titel, Kennzeichen und Board-Spalte; sechs je Seite mit **Previous** und **Next**. Ein Klick wählt das Work Item aus.
- **Show on board**: öffnet das Board mit dem Spaltenfilter dieses Clusters, für **Needs attention** mit dem Filter **Needs you** (siehe [Board](../board/README.md)).

## Work Items finden und filtern

Die Karte oben links enthält **Find a work item** und die Stufenauswahl (**All stages** oder eine Workflow-Stufe). Gesucht wird in Kennzeichen, Titel und Labels. **Enter** wählt das Work Item aus, dessen Kennzeichen genau dem Suchtext entspricht, oder das einzige Ergebnis. Das Diagramm, die Cluster und ihre Zahlen zeigen nur die gefilterten Work Items; die verbleibenden ordnen sich innerhalb ihrer Cluster neu an. **Clear filters** erscheint, solange ein Filter aktiv ist.

Orbit teilt Suche, Stufe, Spalte und Label mit dem Board. Ein Filter, den du auf dem Board setzt, wirkt also auch hier und umgekehrt; das gilt auch für den Spaltenfilter, den **Show on board** setzt. Die Befehlspalette kann die Suche des Orbit mit `Filter Orbit by “…”` setzen (siehe [Befehlspalette](../command-palette/README.md)). Wählst du ein Work Item aus, das ein Filter gerade ausblendet, hebt Orbit die Filter auf.

## Work Item im Orbit

Der Inspektor eines Work Items zeigt Titel, Kennzeichen, Board-Spalte und `Work stage: <Stufe>` (`Unmapped`, wenn die Stufe nicht zum Workflow gehört). Darunter:

- **Review / answer / next stage** öffnet auf dem Board die Prozessansicht des Work Items, **Open ticket details** seinen eigenen Bildschirm (siehe [Work Item](../board/work-item.md)).
- jede Bestätigung als `<Ziel> · <Version> · <Art>` oder **No delivery of this ticket is currently confirmed.** Eine Arbeitsstufe bedeutet nie eine Auslieferung; nur ein Nachweis eines Ziels zählt.
- die Pull Requests seiner Ausführungen (öffnen GitHub) und die zugehörigen Workflow-Läufe (öffnen den Lauf in [Actions](../actions/README.md)).

## Ziele und Auslieferung

Der Inspektor eines Ziels nennt Projekt, Art, `Destination: …` und gegebenenfalls den verknüpften Workflow. Er zeigt `Confirmed version: …` mit Revision und Zeitpunkt oder **No current delivery is confirmed.** Konnte der Stand nicht geprüft werden, steht dort `Last confirmed version: …` und der Hinweis **This delivery status could not be verified. Refresh the evidence before relying on it.** Darunter folgen die Nachweise des Ziels, das neueste zuerst, mit ihren Work Items und **View evidence**.

Ist dem Ziel ein Auslieferungs-Workflow zugeordnet, kannst du eine genaue Version ausliefern:

1. Commit, Tag oder Branch in **Commit, tag or branch to resolve** eingeben und **Prepare delivery** wählen.
2. Symphony zeigt `Target`, die aufgelöste `Exact version` und den `Workflow`.
3. **Start this version** startet den Workflow für genau diese Version. Änderst du die Eingabe oder wählst ein anderes Ziel, verfällt die Vorbereitung. Passt sie beim Start nicht mehr zu Ziel, Eingabe oder Projekt, startet nichts, und Symphony meldet **The delivery target or version changed. Prepare a new delivery.**
4. Der Start erscheint als Eintrag mit Revision und Zustand, mit **Open deployment run**, sobald der Lauf bekannt ist.

Ein gestarteter Lauf bestätigt keine Auslieferung; erst der Nachweis des Ziels tut das. Ist der Ausgang eines Starts ungewiss, steht dort **The dispatch outcome is unconfirmed. Reconcile before starting again.** mit **Reconcile**, das den Lauf erneut prüft.

**Configure destination** öffnet das Einstellungsfenster mit dem Editor dieses Ziels. Bestehen kein oder mehrere Production-Ziele, zeigt die Auswahl der Mitte stattdessen den Production-Zustand, je Production-Ziel eine Schaltfläche und **Configure production**: Ohne Production-Ziel öffnet es einen vorausgefüllten, noch nicht gespeicherten Entwurf, bei mehreren die Liste der Ziele zur Wahl. Das Einrichten eines Ziels bestätigt nie eine Auslieferung.

## Zustände der Mitte

| Zustand                       | Anzeige im Inspektor                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kein Production-Ziel          | **No production destination is configured for this project.** und die Anleitung, in den Auslieferungszielen des Workspace ein Ziel als Production zu wählen |
| Eingerichtet, nicht bestätigt | **A production destination is configured, but its current version is not confirmed.**                                                                       |
| Nicht geprüft                 | **The last delivery status could not be verified. Refresh the evidence before relying on it.**                                                              |
| Bestätigt                     | `Confirmed destinations: n`                                                                                                                                 |

## Sonder- und Fehlerfälle

- **Nachweise nicht abrufbar:** Oben im Inspektor erscheint **Delivery evidence could not be refreshed. Check the GitHub account and retry.** Die eingerichteten Ziele bleiben sichtbar, ihr Stand gilt als nicht geprüft, und **Evidence collected** zeigt `—`. **Refresh evidence** versucht es erneut. Fehler einzelner Ziele erscheinen als eigene Hinweise.
- **Laufende Starts nicht abrufbar:** Symphony warnt **Delivery operations could not be refreshed. Retry before starting another deployment.**
- **Projekt- oder Workspace-Wechsel:** Orbit verwirft die Auswahl und ruft die Nachweise des neuen Projekts ab; eine späte Antwort für das vorige Projekt ändert nichts mehr.
- **Vorbereitung oder Start scheitert:** Symphony meldet **Unable to prepare delivery.** beziehungsweise **Delivery was not started.** mit dem Grund; **Reconcile** meldet bei einem Fehler **Unable to reconcile delivery.**
- **Keine Work Items:** Der Inspektor sagt **No tickets are available for this project yet.**; filtern die Filter alles weg, **No tickets match these filters.** mit **Clear filters**.
- **3D nicht verfügbar:** Kann das Diagramm nicht gezeichnet werden oder bricht die Grafik ab, steht dort **3D is unavailable** beziehungsweise **3D was interrupted** mit Schaltflächen für die Mitte, jedes Ziel und jeden Cluster sowie **Retry**. Über die Cluster bleibt jedes Work Item im Inspektor erreichbar.

## Was Orbit sich merkt

Bei jedem Öffnen ruft Orbit die Nachweise des Projekts ab und beginnt ohne ausgewähltes Ziel oder ausgewählten Cluster. Ein auf dem Board ausgewähltes Work Item des Projekts erscheint dabei im Inspektor. Solange Symphony läuft, behält Orbit das gewählte Projekt und je Workspace-Auswahl und Projekt die Kameraposition, auch wenn du zwischendurch andere Bildschirme öffnest. Nach einem Neustart beginnt Orbit mit dem ersten Projekt und der eingepassten Ansicht. Die Farben folgen dem Farbschema der Anwendung, auch beim Wechsel zwischen hell und dunkel; Auswahl und Ansicht bleiben dabei erhalten.

## Verwandte Features

- [Board](../board/README.md)
- [Work Item](../board/work-item.md)
- [Workspaces](../workspaces/README.md) mit den Auslieferungszielen
- [Overview und Inbox](../overview-and-inbox/README.md): die Karte **Production** fasst Orbit zusammen.
- [Actions](../actions/README.md)
- [Hauptfenster und Navigation](../window-and-navigation/README.md)
