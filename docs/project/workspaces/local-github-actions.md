# Local GitHub Actions

Im Bereich **Local GitHub Actions** entscheidest du, ob die GitHub-Actions-Workflows dieses Workspace auch auf diesem Mac laufen dürfen. Die Werkzeugleiste beschreibt ihn mit „Run eligible workflows of this workspace in a disposable Linux virtual machine on this Mac.“. Welche virtuelle Maschine dafür startet, legst du einmal für den ganzen Mac unter [System](../system/README.md) › **Virtual machines** fest.

## Aktivierung

**Enable local runs** in der Gruppe **Activation** schaltet lokale Läufe für diesen Workspace ein oder aus. Eingeschaltet bietet Symphony lokale Aktionen wie **Run locally** in [Actions](../actions/README.md) und [Pull Requests](../pull-requests/README.md) an und übernimmt automatisch eingereihte Workflows, die in GitHub ausdrücklich für den lokalen Runner von Symphony markiert sind.

Der Schalter gilt sofort. Scheitert das Speichern, zeigt er wieder den gespeicherten Stand. Solange ein lokaler Lauf ausgeführt wird, ist er gesperrt.

## Gastabbild

Die Gruppe **Guest image** wählt, welches veröffentlichte GitHub-Runner-Abbild der Workspace nachbildet. Symphony liest dessen Softwarebericht und installiert die angegebenen Pakete, die Node.js-Laufzeit und die Umgebung in der virtuellen Maschine.

| Zustand                                   | Anzeige                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Katalog wird geladen                      | „Loading the published runner image releases…“                                              |
| Lokale Läufe aus und kein Katalog geladen | „Enable local runs for this workspace to load the published runner image releases.“         |
| Lokale Läufe an, aber kein Katalog        | „No releases loaded yet. Choose Refresh catalog to read them from GitHub.“                  |
| Katalog geladen                           | **Runner image** listet die Releases, etwa `Ubuntu 24.04 · 20251020.1 · latest`             |
| Abbild festgelegt                         | Zusammenfassung `Ubuntu 24.04 · arm64` mit Paketzahl, Node.js-Version und Cloud-Abbild      |
| Noch nichts festgelegt                    | „Not pinned yet — the newest release is preselected and is pinned on the first run.“        |
| GitHub nicht erreichbar                   | unter **When GitHub cannot be reached**: **Showing the cached image catalog** mit dem Grund |

Die Wahl eines Releases legt es sofort für diesen Workspace fest und meldet **Guest image updated.**; ein späterer Wechsel auf GitHub ändert ein festgelegtes Abbild nicht. **Refresh catalog** liest die Releases neu. Während ein lokaler Lauf ausgeführt wird, ist die Auswahl gesperrt. Ein Fehler meldet **Unable to select the runner image.** beziehungsweise **Unable to load the runner image catalog.**.

## Einrichtung je Repository

Die Gruppe **Repository setup** enthält für jedes Repository des Workspace ein Feld `<owner>/<name> setup script`. Die Befehle laufen als Bash im Gast nach der Grundausstattung des Abbilds und vor jedem Workflow-Schritt. Das Feld bleibt leer, solange das Repository nichts braucht, was das Abbild nicht mitbringt; eine über `packageManager` angegebene Yarn-Version installiert Symphony selbst.

- Gespeichert wird, wenn du das Feld verlässt; Leerraum am Anfang und Ende wird entfernt, ein leeres Feld entfernt das Skript.
- Ein unverändertes Skript wird nicht erneut gespeichert. Scheitert das Speichern, zeigt das Feld wieder das gespeicherte Skript.
- Ein Skript darf höchstens 32 768 Zeichen haben. Während eines lokalen Laufs ist das Feld gesperrt.
- Ohne Repository steht „This workspace has no repository yet. Add one under Repositories.“

## Verwandte Features

- [System](../system/README.md)
- [Actions](../actions/README.md)
- [Repositories](repositories.md)
- [Workspaces](README.md)
