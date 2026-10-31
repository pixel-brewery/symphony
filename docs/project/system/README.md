# System: dieser Mac

Der Bereich **System** in den [Einstellungen](../window-and-navigation/settings.md) beschreibt den Mac, auf dem Symphony läuft. Was hier steht, gilt für alle Workspaces zugleich: wie viel Speicher Symphony belegen darf, welche Programme bereitstehen, wie die virtuellen Maschinen für Local GitHub Actions ausgestattet sind, welche Versionen Symphony anbietet und ob der Mac während laufender Arbeit wach bleibt. Die Werkzeugleiste beschreibt den Bereich mit `This Mac: tools, storage, virtual machines, updates and sleep.`

## Aufbau

Der Bereich zeigt untereinander:

| Gruppe               | Inhalt                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **Storage**          | das ganze Speicherbild aller verwalteten Symphony-Daten mit den harten Grenzen                           |
| **Developer tools**  | Homebrew, Git, GitHub CLI, Codex CLI, Claude Code CLI und OpenCode CLI mit ihrem Zustand und **Refresh** |
| **Virtual machines** | Ausstattung, Wiederverwendung und Liste der Linux-Maschinen für Local GitHub Actions                     |
| **Updates**          | installierte Version, Zustand der Updateprüfung, **Check for updates** und **Release channel**           |
| **Sleep**            | **Keep this Mac awake while tasks run** mit dem aktuellen Zustand                                        |

Jede Einstellung gilt sofort; Zahlen gelten, sobald du das Feld verlässt oder Enter drückst (siehe [Ändern und bestätigen](../window-and-navigation/settings.md#ändern-und-bestätigen)).

## Storage

**Storage** zählt alle verwalteten Symphony-Daten auf diesem Mac nach ihrer tatsächlich belegten Größe. Die angekündigte Größe einer virtuellen Festplatte zählt nicht, nur der wirklich belegte Platz.

- Oben steht die Gesamtbelegung, etwa `18.4 GB of 50 GB · Within limit`, darunter ein Balken mit einem Abschnitt je Kategorie: **Application state** (Einstellungen, Datenbank, Protokolle, gemeinsame Werkzeug-Caches), **Managed workspaces**, **Local GitHub Actions** und, sofern vorhanden, **Browser data**. Die Legende nennt die Größe jeder Kategorie und **Available**, den Platz bis zur Grenze; ein Hinweis beim Zeigen erklärt jede Kategorie.
- Solange die erste Messung läuft, steht dort `Measuring…` mit Platzhaltern an Stelle des Balkens. Symphony misst erneut alle fünf Sekunden, solange der Bereich offen ist.
- **Managed workspaces** nennt jeden Workspace mit seiner Belegung und seiner eigenen Grenze, etwa `FLAMOX365 12.1 GB of 20 GB`. Die Grenze eines Workspace stellst du in seiner **Administration** ein; die Schaltfläche mit dem Namen des größten Workspace öffnet sie direkt (siehe [Administration](../workspaces/administration.md)).
- **Local GitHub Actions** nennt die Belegung, die Grenze und die Aufteilung (etwa Basisimage, Maschinenfestplatten, `actions/cache`-Einträge, Runner-Werkzeuge). Das Zahlenfeld daneben ist **Maximum Local GitHub Actions storage (GB)**.
- **Maximum managed storage (GB)** begrenzt alle verwalteten Daten zusammen; die Zeile nennt den freien Platz des Mac (`Mac free: …`).
- **Minimum Mac free space (GB)** ist die Reserve, die Symphony dem Mac lässt: Symphony hört auf zu schreiben, bevor der freie Platz darunter fällt.

| Einstellung                                    | Erlaubte Werte | Standard | Wirkung                                                                           |
| ---------------------------------------------- | -------------- | -------- | --------------------------------------------------------------------------------- |
| **Maximum managed storage (GB)**               | 5 bis 2048     | 50       | Grenze aller verwalteten Symphony-Daten auf diesem Mac                            |
| **Minimum Mac free space (GB)**                | 5 bis 512      | 20       | freier Platz, den Symphony auf dem Mac nie unterschreitet                         |
| **Maximum Local GitHub Actions storage (GB)**  | 8 bis 256      | 32       | Grenze für Basisimage, Maschinenfestplatten, `actions/cache` und Runner-Werkzeuge |
| Grenze eines Workspace (in **Administration**) | 2 bis 1024     | 20       | Grenze für Repositories, Worktrees, Prüfläufe und Datenbank dieses Workspace      |

Eine Zahl außerhalb des erlaubten Bereichs oder ein leeres Feld wird nicht gespeichert; das Feld zeigt wieder den bisherigen Wert. Dezimalzahlen werden auf ganze Gigabyte gerundet. Während eine Änderung gespeichert wird, sind die Felder gesperrt.

### Speicherzustand

| Belegung im Verhältnis zur Grenze | Anzeige               |
| --------------------------------- | --------------------- |
| unter 60 %                        | **Within limit**      |
| ab 60 %                           | **Approaching limit** |
| ab 80 %                           | **High usage**        |
| ab 95 %                           | **Writes blocked**    |

Der freie Platz des Mac wird an der Reserve gemessen: höchstens doppelt so viel wie die Reserve gilt als knapp, höchstens das 1,25-Fache als hoch, höchstens die Reserve selbst als gesperrt. Ein knapper Mac lässt auch die Gesamtanzeige entsprechend höher stehen.

Erreicht eine Grenze – gesamt, Local GitHub Actions, ein Workspace oder die Reserve des Mac – den gesperrten Zustand, nimmt Symphony keine neue schreibende Arbeit an. In einem gestrichelten Rahmen **When storage is not writable** erscheint dann `Alarm: new disk-writing work is blocked`: Symphony hat neue AI-Aufgaben, Worktrees, Prüfläufe und Local GitHub Actions angehalten, bis verwaltete Daten entfernt sind. Kann Symphony den Speicher nicht messen, gilt er vorsichtshalber ebenfalls als nicht beschreibbar.

Ist der Speicher knapp oder gesperrt, erscheint zusätzlich ein Eintrag in der [Mitteilungszentrale](../notifications-and-tray/README.md); **Review storage** öffnet diesen Bereich beziehungsweise die **Administration** des betroffenen Workspace.

Platz schaffst du unter [Automation](../automation/README.md) mit **Clear inactive workspaces**, hier unter **Virtual machines** mit **Clear runner data** oder durch das Entfernen einzelner Maschinen.

## Developer tools

**Developer tools** zeigt, welche lokalen Programme Symphony starten kann, und bietet für fehlende Werkzeuge **Install with Homebrew** an. Vor jeder Installation fragt Symphony nach (`Install <Werkzeug>?`). Ohne Homebrew erscheint im gestrichelten Rahmen **Without Homebrew** der Hinweis `Homebrew is required for one-click installation`; Symphony installiert Homebrew nie selbst. Erkennung, Installation und die Abgrenzung zur Anmeldung eines AI-Kontos beschreibt [Entwicklerwerkzeuge](../developer-tools/README.md).

## Virtual machines

**Virtual machines** beschreibt die wegwerfbaren Linux-Maschinen, in denen Local GitHub Actions auf diesem Mac laufen. Ob ein Workspace überhaupt lokal ausführen darf, entscheidest du im Workspace unter **Local GitHub Actions** (siehe [Local GitHub Actions](../workspaces/local-github-actions.md)).

| Zeile                             | Inhalt und Bedienung                                                                                                                                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Detected host capacity**        | logische CPUs, Arbeitsspeicher und der Platz, der nach der geschützten Reserve bleibt; während der Messung `Measuring this Mac…`                                                                                                                                            |
| **Resource preset**               | **Compact**, **Balanced** (Standard), **Performance** oder **Custom**, jeweils mit CPUs, Arbeitsspeicher, Festplatte und Cache. Eine Stufe, die dieser Mac nicht tragen kann, ist mit `unavailable on this Mac` gesperrt.                                                   |
| **Keep the virtual machine warm** | Aus (Standard): Symphony entfernt die Maschine nach Erfolg, Fehler oder Abbruch. Ein: Symphony behält eine eingerichtete Maschine mit ihrer ganzen Festplatte für den nächsten Lauf und setzt sie vor jedem Lauf zurück.                                                    |
| **Runner data**                   | der Ordner, in dem Symphony alle Runner-Daten ablegt                                                                                                                                                                                                                        |
| Maschinenliste                    | je Maschine **Workflow runner** oder **Machine from an earlier version**, Name, Zustand (`in use by the current run`, `kept warm for the next run`, `running without a Symphony run`, `left behind, no longer tracked`, `stopped, removable`) und Belegung, dazu **Remove** |
| ohne Maschine                     | `No machine exists right now` – der nächste lokale Lauf richtet eine ein                                                                                                                                                                                                    |

Mit **Custom** erscheint im gestrichelten Rahmen **With the Custom preset** je ein Schieberegler für **CPUs**, **Memory**, **Virtual disk** und **Shared cache**. Beim ersten Wechsel auf **Custom** übernehmen die Regler die Werte der bisher gewählten Stufe. Die Obergrenzen folgen der erkannten Ausstattung des Mac, Festplatte und Cache teilen sich die Grenze für Local GitHub Actions; der neue Wert gilt, sobald du den Regler loslässt. Die festen Grenzen und Reserven beschreibt das technische Handbuch unter [Managed Local CI](../../architecture/managed-local-ci.md).

Darunter stehen **Clear runner data** und **Refresh machines**:

- **Clear runner data** fragt `Clear local runner data?` und entfernt nach **Clear runner data** inaktive Linux-Instanzen, zwischengespeicherte Basisimages und Runner-Werkzeuge. Der nächste lokale Lauf lädt die geprüften Werkzeuge und das Image erneut. **Keep data** bricht ab.
- **Remove** an einer Maschine fragt `Remove this machine?`; **Remove machine** löscht sie samt Festplatte, **Keep machine** bricht ab. Der nächste Lauf, der eine Maschine braucht, richtet eine neue ein.
- **Refresh machines** liest die Maschinenliste neu ein.

| Ausgangslage                                                      | Verhalten                                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ein lokaler Lauf ist aktiv.                                       | **Resource preset**, **Keep the virtual machine warm**, die Regler und **Clear runner data** sind gesperrt; die Maschine dieses Laufs lässt sich nicht entfernen. |
| Eine Entfernung oder das Leeren läuft.                            | Weitere **Remove**-Schaltflächen sind gesperrt.                                                                                                                   |
| Maschinen sind weder in Gebrauch noch warm gehalten noch laufend. | Ein Hinweis meldet `1 machine is still using disk` beziehungsweise `n machines are still using disk`: Die automatische Bereinigung hat sie nicht entfernt.        |
| Local GitHub Actions hat seine Speichergrenze erreicht.           | `Local runner writes are blocked`: Vor dem nächsten lokalen Lauf müssen Runner-Daten entfernt werden.                                                             |
| Das Speichern einer Änderung schlägt fehl.                        | Symphony meldet den Fehler, und die Karte zeigt wieder die gespeicherte Ausstattung.                                                                              |

`actions/cache`-Einträge bleiben je Repository getrennt, bis sie ablaufen oder das Cache-Budget überschreiten.

## Updates

**Updates** zeigt den Zustand der Updateprüfung (etwa `Symphony is up to date.` oder `Version <Version> is available to download.`), die installierte Version, den Kanal und den Zeitpunkt der letzten Prüfung. **Check for updates** prüft sofort; während einer Prüfung, eines Downloads, bei einem bereiten Update und in Builds ohne Updateprüfung ist die Schaltfläche gesperrt. **Release channel** wählt **Stable** oder **Canary - every successful main build**; während einer Prüfung oder eines Downloads ist die Auswahl gesperrt.

Herunterladen und **Restart to update** geschehen in der Statusleiste des Hauptfensters, nicht in den Einstellungen. Kanäle, Zustände und Fehler beschreibt [Symphony aktualisieren](../application-updates/README.md).

## Sleep

Mit **Keep this Mac awake while tasks run** verhindert Symphony den Ruhezustand nur, solange Arbeit läuft, und gibt ihn frei, sobald die letzte Aufgabe endet. Als laufende Arbeit zählen Ausführungen, das Entwerfen von Work Items, Prüfläufe, lokale GitHub-Actions-Läufe und Werkzeuginstallationen; Symphony prüft das alle 15 Sekunden. Der Bildschirm darf dabei ausgehen, der Akkuverbrauch steigt, und ein geschlossener Deckel versetzt den Mac trotzdem in den Ruhezustand.

Die Einstellung ist zunächst ausgeschaltet. Sie gilt für diesen Mac, nicht für einen Workspace, und bleibt über einen Neustart erhalten.

| Zustand                                      | Statuszeile                                 | Zusatz                                                                                               |
| -------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| ausgeschaltet                                | `This Mac may sleep while Symphony works.`  | `Analysis, implementation, and local CI runs stop when macOS sleeps` und die Zahl laufender Aufgaben |
| eingeschaltet, keine Aufgabe läuft           | `Sleep is allowed while Symphony is idle.`  | `Sleep is blocked again as soon as the next task starts`                                             |
| eingeschaltet, mindestens eine Aufgabe läuft | `Sleep is blocked while tasks are running.` | `The display may still turn off, and a closed lid still sleeps`; der Punkt ist grün                  |

Lässt sich die Einstellung nicht ändern, meldet Symphony `Sleep prevention could not be changed.` und der Schalter zeigt wieder den bisherigen Zustand. Ist die Energieverwaltung nicht erreichbar, meldet Symphony `Sleep prevention is unavailable.`; bis zum ersten Zustand stehen Platzhalter an Stelle von Schalter und Statuszeile. Der Schalter lässt sich auch direkt in einem Treffer von **Search settings** umlegen.

## Rückfragen in diesem Bereich

| Auslöser                     | Rückfrage                  | Antworten                                      |
| ---------------------------- | -------------------------- | ---------------------------------------------- |
| **Install with Homebrew**    | `Install <Werkzeug>?`      | **Install with Homebrew** oder **Cancel**      |
| **Remove** an einer Maschine | `Remove this machine?`     | **Remove machine** (rot) oder **Keep machine** |
| **Clear runner data**        | `Clear local runner data?` | **Clear runner data** (rot) oder **Keep data** |

Escape antwortet wie die zweite Schaltfläche; es wird nichts geändert.

## Verwandte Features

- [Einstellungen](../window-and-navigation/settings.md)
- [Mobile access](mobile-access.md) und [Appearance](appearance.md)
- [Entwicklerwerkzeuge](../developer-tools/README.md)
- [Symphony aktualisieren](../application-updates/README.md)
- [Workspaces](../workspaces/README.md) mit [Local GitHub Actions](../workspaces/local-github-actions.md) und [Administration](../workspaces/administration.md)
- [Automation](../automation/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
