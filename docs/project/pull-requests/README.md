# Pull Requests

Der Bildschirm **Pull requests** zeigt die offenen Pull Requests der GitHub-Repositories in den gewählten Workspaces. Er beantwortet drei Fragen auf einen Blick: Welche Pull Requests brauchen eine Handlung, woran scheitern sie, und welcher Work Item und welcher Agent stehen dahinter. Von hier aus lassen sich Pull Requests anlegen, Branches aktualisieren, Checks erneut oder lokal ausführen und fehlgeschlagene Checks durch die AI reparieren.

## Voraussetzungen

- Mindestens ein aktiviertes GitHub-Repository in den gewählten Workspaces. Ohne ein solches Repository ist **New pull request** gesperrt und nennt den Grund.
- Für die Spalte **Checks** und die Checkliste eine CI-Anbindung (GitHub Actions) des Repositories.
- **Run checks locally** erscheint nur, wenn der Workspace lokale CI erlaubt.
- **Repair with AI** setzt voraus, dass Symphony den Pull Request aus einem Work Item veröffentlicht hat und die Automatisierungsrichtlinie die AI-Reparatur erlaubt (siehe unten).

## Aufbau

Die Werkzeugleiste trägt den Titel **Pull requests**, darunter das Repository (bei mehreren die Anzahl) und die Zahl der offenen Pull Requests, etwa `example/platform · 14 open`. Rechts daneben liegen das Filtermenü und **Refresh pull requests**. Der Synchronisierungsstand mit GitHub steht in der Statusleiste, nicht auf dem Bildschirm.

### Segmente

| Segment              | Inhalt                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Open · n**         | alle offenen Pull Requests einschließlich Entwürfen, wie GitHub sie zählt                                                   |
| **Needs action · n** | offene Pull Requests mit fehlgeschlagenen Checks, einem Konflikt mit dem Basis-Branch oder einem Branch hinter seiner Basis |
| **Drafts · n**       | Entwürfe                                                                                                                    |

Die Zahlen gelten für alle Pull Requests im Workspace-Umfang, unabhängig von Filtern. Das gewählte Segment bleibt in der Adresse (`?view=needs-action` oder `?view=drafts`) und folgt **Back** und **Forward**.

### Tabelle

| Spalte           | Bedeutung                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pull request** | Titel, Nummer und Quell-Branch                                                                                                                                                                                             |
| **Item**         | Schlüssel des Work Items, das Symphony mit diesem Pull Request ausgeliefert hat; `—`, wenn der Pull Request nicht aus Symphony stammt                                                                                      |
| **Checks**       | `n failing`, `Running`, `Passed` oder `Cancelled` aus dem jeweils neuesten Lauf jedes Workflows auf dem Branch; ein neueres Ergebnis des lokalen Runners zählt vor dem GitHub-Lauf; `—` ohne Lauf                          |
| **Merge**        | `Draft`, `Conflict`, `Behind base`, `Mergeable` oder `Ready` (aktuell zur Basis und alle Checks bestanden); `—`, solange GitHub den Stand zur Basis nicht bestimmt hat. Freigaben durch Reviewer werden nicht ausgewertet. |
| **Agent**        | Agent der letzten Ausführung des zugehörigen Work Items                                                                                                                                                                    |
| **Updated**      | letzte Änderung des Pull Requests                                                                                                                                                                                          |

Ein Klick oder **Enter** auf eine Zeile öffnet den Pull Request im Inspektor rechts; ohne Auswahl zeigt er die erste Zeile. Die Adresse `?pullRequest=<id>` wählt einen Pull Request direkt aus. Ein Rechtsklick oder das Menü **More actions** am Zeilenende bietet **Open in GitHub**, **Open work item**, **Update branch**, **Run remotely** oder **Cancel remote run** sowie bei lokaler CI **Run locally** oder **Stop local runner**.

### Inspektor

Der Inspektor nennt Repository und Nummer, Titel sowie `Quell-Branch → Basis-Branch`. Darunter erscheinen nur zutreffende Hinweise:

- **n checks failing** mit den betroffenen Workflows oder dem Stand einer laufenden oder abgebrochenen AI-Reparatur.
- **Behind base** mit **Update branch**.
- **Conflicts with …**: Der Konflikt wird in GitHub oder auf dem Branch gelöst.

Die Liste **Checks** zeigt jeden Workflow mit Zustand, Dauer und gegebenenfalls `Local runner`. Darunter folgen **Repair with AI** (nur bei fehlgeschlagenen Checks), **Run checks locally** beziehungsweise **Stop local run**, **Update branch** (nur hinter der Basis) und **Open in GitHub**.

## Filtern und Suchen

Das Filtermenü in der Werkzeugleiste grenzt nach **State**, **Base** und **Author** ein und sortiert nach Aktualisierung oder Erstellung. Ein aktiver Filter hebt das Filtersymbol hervor. Die Adressparameter `?state=` und `?base=` (von der Übersicht übergeben) und die kontextbezogene Suche `?q=` wirken wie bisher. Findet ein Filter nichts, bietet **Reset all filters** den Rückweg.

## Pull Request anlegen

**New pull request** öffnet ein Sheet über dem Bildschirm. Dort werden Repository, Basis- und Vergleichs-Branch gewählt; Symphony zeigt, ob die Branches zusammengeführt werden können und welche Commits hinzukommen, und schlägt einen Titel vor. **Create draft pull request** legt einen Entwurf an. **Escape** und **Cancel** schließen das Sheet; ein Klick daneben verwirft die Eingaben nicht. Ist bereits ein Pull Request für dieselben Branches offen, führt **Open PR #n** zu ihm. Die Absicht `?create=true` öffnet das Sheet ebenfalls.

## Fehlgeschlagene Checks mit AI reparieren

**Repair with AI** beauftragt den Solver, die fehlgeschlagenen Checks auf dem beibehaltenen Branch des Work Items zu beheben. Die Schaltfläche ist nur freigegeben, wenn:

- Symphony den Pull Request aus einem Work Item veröffentlicht hat,
- für das Repository Agentic Delivery an der CI-Anbindung aktiv ist und die Stufe unter **Settings › Automation › Fix failed checks** Quellreparaturen auf verwalteten Branches erlaubt (**Repair**, **Full** oder eine eigene Auswahl mit **Repair source failures**, siehe [Automation](../automation/README.md#fix-failed-checks)),
- für das Work Item gerade keine Ausführung läuft oder wartet.

Ist eine Bedingung nicht erfüllt, bleibt die Schaltfläche gesperrt und nennt den Grund. Die AI darf damit nur, was sie nach der Richtlinie auch selbstständig dürfte; die üblichen Prüfungen des Solvers (Stufe des Work Items, Analyse, Lösungsskill, Iterationsgrenze, Freigabe der lokalen Ausführung) gelten unverändert, eine Ablehnung wird gemeldet.

## Fehler und leere Zustände

- Ist die Synchronisierung mit GitHub pausiert, nicht verfügbar oder durch das Anfragelimit gebremst, erscheint über der Tabelle ein Hinweis mit dem letzten Synchronisierungszeitpunkt beziehungsweise dem frühesten Wiederholungszeitpunkt und **Retry**. Die zuletzt bekannten Pull Requests bleiben sichtbar.
- Ohne offene Pull Requests erscheint **No open pull requests**; ein leeres Segment sagt **Nothing needs action** oder **No draft pull requests**.
- Während des ersten Ladens stehen Platzhalterzeilen an der Stelle der Tabelle.
