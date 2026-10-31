# Automation

Der Bereich **Automation** im [Einstellungsfenster](../window-and-navigation/settings-window.md) legt fest, wie weit das AI-Team ohne dein Zutun arbeiten darf. Die Einstellungen gelten für alle Workspaces auf diesem Mac: ob Symphony den Backlog selbstständig abarbeitet, wie es auf fehlgeschlagene Checks seiner eigenen Pull Requests reagiert, ob GitHub-Kommentare Aufgaben starten dürfen und wo und wie lange Arbeitsbereiche erhalten bleiben.

## Was der Bereich bietet

- **Autonomous work**: unbeaufsichtigte Analyse, Umsetzung, Wiederholung und Pull-Request-Abgleich mit Intervall und der gemeinsamen Grenze für parallele Aufgaben.
- **Fix failed checks**: eine Stufenleiter von **Off** bis **Full**, mit der das AI-Team fehlgeschlagene Checks auf Pull Requests von Symphony beobachten, diagnostizieren, erneut ausführen und reparieren darf, samt **Budgets**.
- **Address reviews**: der Schalter für Rückmeldungen aus Pull-Request-Reviews.
- **GitHub commands**: ob berechtigte Kommentare in GitHub-Issues Aufgaben starten dürfen.
- **Execution**: Ablageort der Arbeitsbereiche, Aktualisierungsintervall, Umgang mit fehlgeschlagenen Arbeitsbereichen, Reparaturrunden der Prüfungen und das Aufräumen inaktiver Arbeitsbereiche.

Speichergrenzen und virtuelle Maschinen gehören zu diesem Mac und stehen unter [System](../system/README.md). Welche Agents die Schritte ausführen, regelt [AI team](../ai-team/README.md), wie sie es tun, [Skills](../skills/README.md).

## Bereich öffnen

| Weg                                                                                                             | Ergebnis                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Automation** unter **Symphony** in der Seitenleiste des Einstellungsfensters                                  | Der Bereich öffnet sich; die Werkzeugleiste beschreibt ihn mit `How far the AI team may work on its own, in every workspace.` |
| Ein Treffer in **Search settings**, etwa `Level` oder `Daily token budget`, und **Open**                        | Der Bereich **Automation** öffnet sich.                                                                                       |
| **Open Automation settings** in der Diagnose eines fehlgeschlagenen Laufs unter [Actions](../actions/README.md) | Das Einstellungsfenster öffnet sich bei **Automation**.                                                                       |

Der Schalter **Autonomous work** im [Menüleistenpanel](../notifications-and-tray/README.md#menüleistenpanel-macos) ändert dieselbe Einstellung wie **Run autonomous work** in diesem Bereich.

## Ändern und Speichern

- Jede Einstellung gilt sofort; es gibt keine **Save**-Schaltfläche. Zahlenfelder gelten, sobald du das Feld verlässt oder Enter drückst.
- Ein Wert außerhalb des erlaubten Bereichs wird auf die nächste Grenze gesetzt, Nachkommastellen werden abgeschnitten. Ein leeres Feld ändert nichts.
- Nach dem Speichern meldet Symphony **Settings saved.** Schlägt das Speichern fehl, meldet es **Unable to save settings.** mit dem Grund und zeigt wieder den gespeicherten Wert.
- Mehrere schnelle Änderungen hintereinander werden der Reihe nach gespeichert und bauen aufeinander auf.
- Jede gespeicherte Änderung stößt sofort einen Durchlauf der Hintergrundarbeit an. Wer **Run autonomous work** einschaltet, muss also nicht auf das nächste Intervall warten.

## Autonomous work

| Einstellung                          | Standard | Bereich    | Wirkung                                                                                                                                                                                                                                  |
| ------------------------------------ | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Run autonomous work**              | aus      | –          | Symphony analysiert Work Items im Backlog, setzt bereite Work Items um, wiederholt fehlgeschlagene Arbeit und gleicht den Stand der Pull Requests ab. Ausschalten startet keine neuen autonomen Aufgaben; laufende Arbeit endet regulär. |
| **Work interval (minutes)**          | 15       | 1 bis 1440 | Abstand zwischen zwei autonomen Durchläufen. Ein Durchlauf startet nur so viel Arbeit, wie freie Plätze bleiben.                                                                                                                         |
| **Maximum parallel tasks**           | 3        | 1 bis 32   | Gemeinsame Grenze für manuelle und autonome Analysen, Umsetzungen und Wiederholungen, über alle Workspaces.                                                                                                                              |
| **Serialize overlapping deliveries** | aus      | –          | Eine autonom gestartete Umsetzung, deren vorhergesagte Änderungen einen noch offenen Pull Request von Symphony überschneiden, wartet, bis diese Auslieferung abgeschlossen ist. Manuell gestartete Arbeit ist nicht betroffen.           |

Ein Work Item mit dem Label `autonomy:excluded` nimmt Symphony von der autonomen Auswahl aus.

Sind **Run autonomous work** oder **Allow GitHub commands** eingeschaltet und ist ein Repository eines Workspace mit aktiver Work-Item-Quelle noch nicht lokal vorbereitet, meldet Symphony einmal **Automatic AI work is waiting for local preparation.** mit den betroffenen Repositorys.

## Fix failed checks

Wenn ein Check auf einem Pull Request fehlschlägt, den Symphony aus einem Work Item erstellt hat, darf das AI-Team mit jeder Stufe einen Schritt weiter gehen. Das gilt nur für Repositorys, die es zusätzlich selbst erlauben: Im Repository-Sheet unter [Repositories](../workspaces/README.md) steht dafür **Allow agentic delivery for this repository**, sobald **Show GitHub Actions runs** eingeschaltet ist. Die Beschreibung von **Enable agentic delivery** nennt, wie viele Repositorys das erlauben, etwa `— 2 of 5 repositories do.`

### Stufen

**Level** wählt eine Stufe und setzt alle acht Schalter darunter auf einmal.

| Stufe        | Eingeschaltete Schalter                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Off**      | keiner                                                                                                                       |
| **Watch**    | **Enable agentic delivery**, **Observe failed actions**                                                                      |
| **Diagnose** | wie **Watch**, dazu **Use AI for diagnosis** und **Rerun transient and infrastructure failures**                             |
| **Repair**   | wie **Diagnose**, dazu **Update managed pull-request branches**, **Repair source failures** und **Repair workflow failures** |
| **Full**     | alle acht, also zusätzlich **Allow replacement pull requests**                                                               |
| **Custom**   | jede andere Auswahl                                                                                                          |

Eine Stufe ändert nur die acht Schalter. Die **Budgets**, **Listen for pull-request review feedback** und **Serialize overlapping deliveries** bleiben, wie sie sind. Neu ist alles aus, die Stufe steht also auf **Off**.

### Die Schalter

Die Schalter stehen auf einer Leiste in der Reihenfolge, in der sie aufeinander aufbauen. Ein gefüllter Punkt zeigt einen eingeschalteten Schalter, ein blasser Punkt einen, dessen Voraussetzung noch fehlt.

| Schalter                                        | Was das AI-Team damit darf                                                                                                                                          | Braucht                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Enable agentic delivery**                     | schaltet die Funktion insgesamt ein                                                                                                                                 | –                                                                     |
| **Observe failed actions**                      | Läufe auf Pull Requests von Symphony beobachten und den Grund eines Fehlschlags festhalten; ändert nie Code                                                         | **Enable agentic delivery**                                           |
| **Use AI for diagnosis**                        | einen festgehaltenen Fehlschlag von einem AI-Skill untersuchen lassen, innerhalb der Budgets                                                                        | **Observe failed actions**                                            |
| **Rerun transient and infrastructure failures** | bei einem vorübergehenden oder von der CI-Infrastruktur verursachten Fehler einmal einen erneuten Lauf anfordern statt zu reparieren                                | **Observe failed actions**                                            |
| **Update managed pull-request branches**        | Korrekturen auf den Branch des Pull Requests übertragen und die Basis hineinführen, wenn er zurückliegt – nie Rebase oder Force-Push, nur auf Branches von Symphony | **Observe failed actions**                                            |
| **Repair source failures**                      | Code oder Tests korrigieren, wenn die Diagnose die Ursache dort findet; ein Branch mit Konflikt zur Basis bekommt eine budgetierte Überarbeitung                    | **Update managed pull-request branches** und **Use AI for diagnosis** |
| **Repair workflow failures**                    | die Workflow-Konfiguration der CI korrigieren, wenn die Diagnose die Ursache dort findet                                                                            | **Update managed pull-request branches** und **Use AI for diagnosis** |
| **Allow replacement pull requests**             | einen neuen Pull Request öffnen, nur wenn der ursprüngliche geschlossen wurde und sein Branch nicht mehr aktualisiert werden kann                                   | **Repair source failures** oder **Repair workflow failures**          |

### Regeln

| Ausgangslage                               | Aktion                                      | Ergebnis                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| beliebig                                   | eine Stufe von **Off** bis **Full** wählen  | Die acht Schalter stehen wie in der Stufentabelle und werden sofort gespeichert.                                                                                                                                      |
| beliebig                                   | **Custom** wählen                           | Kein Schalter ändert sich; **Level** zeigt **Custom**, bis du einen Schalter oder eine andere Stufe wählst.                                                                                                           |
| eine Stufe ist gewählt                     | einen einzelnen Schalter umlegen            | **Level** zeigt die Stufe, der die neue Auswahl entspricht, sonst **Custom**.                                                                                                                                         |
| eine Voraussetzung eines Schalters ist aus | –                                           | Der Schalter ist gesperrt und nennt die erste fehlende Voraussetzung, etwa `Needs “Update managed pull-request branches”`.                                                                                            |
| abhängige Schalter sind an                 | eine Voraussetzung ausschalten              | Jeder Schalter, dem dadurch eine Voraussetzung fehlt, schaltet sich mit aus. Aus **Full** ergibt **Update managed pull-request branches** aus die Stufe **Diagnose**; **Enable agentic delivery** aus ergibt **Off**. |
| **Full**                                   | nur eine der beiden Reparaturen ausschalten | **Allow replacement pull requests** bleibt an, weil die andere Reparatur genügt; **Level** zeigt **Custom**.                                                                                                          |

### Was nach einem Fehlschlag geschieht

- Ohne **Run autonomous work** prüft Symphony fehlgeschlagene Checks etwa jede Minute, sobald **Enable agentic delivery** und **Observe failed actions** an sind; mit **Run autonomous work** im eingestellten Intervall.
- Fehlschläge, die schon bestehen, wenn Symphony die Läufe eines Repositorys zum ersten Mal beobachtet, hält es nur als Ausgangsstand fest; für sie startet weder ein erneuter Lauf noch eine Diagnose.
- Ein Berechtigungsfehler wartet immer auf dich. Ein vorübergehender oder Infrastrukturfehler bekommt höchstens einen erneuten Lauf, wenn **Rerun transient and infrastructure failures** an ist; repariert wird er nie.
- Eine Reparatur startet erst nach einer erfolgreichen Diagnose und nur, wenn die passende Reparatur und **Update managed pull-request branches** an sind.
- Symphony führt nie einen Merge des Pull Requests aus und überträgt nie auf den Standard-Branch.
- **Fix with AI** unter [Actions](../actions/README.md) und **Repair with AI** unter [Pull Requests](../pull-requests/README.md) stehen nur zur Verfügung, wenn die Leiste die jeweilige Reparatur erlaubt, also bei **Repair**, **Full** oder einer eigenen Auswahl mit Reparatur.

### Budgets

Die Budgets gelten nur für Diagnosen und Reparaturen (`Spent only by diagnosis and repairs.`).

| Einstellung                     | Standard | Bereich           | Wirkung                                                                                                                                    |
| ------------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Diagnosis token budget**      | 20000    | 1000 bis 1000000  | Richtwert für eine Diagnose. Verbraucht eine Diagnose mehr, stoppt Symphony diesen Fall ohne Reparatur.                                    |
| **Repair token budget**         | 80000    | 1000 bis 2000000  | Richtwert für eine Reparatur. Eine Reparatur startet nur, wenn das restliche Tagesbudget sie abdeckt.                                      |
| **Daily token budget**          | 200000   | 1000 bis 10000000 | Summe aller Tokens der Diagnosen und Reparaturen eines Tages (UTC). Reicht es nicht mehr, wartet der Fall auf einen späteren Durchlauf.    |
| **Maximum attempts per branch** | 2        | 1 bis 10          | Nach so vielen Versuchen auf einem Branch stoppt Symphony den Fall; bei einem Konflikt meldet es, dass der Pull Request weiter kollidiert. |
| **Maximum parallel repairs**    | 1        | 1 bis 16          | Weitere Reparaturen warten, bis eine laufende endet.                                                                                       |
| **Cooldown (minutes)**          | 15       | 1 bis 1440        | Ein gleicher Fehlschlag auf demselben Branch wird innerhalb dieser Zeit zurückgestellt.                                                    |

## Address reviews

**Listen for pull-request review feedback** (Standard aus) soll zugewiesenen Review-Skills erlauben, auf Kommentare von Reviewern zu reagieren. Symphony speichert die Einstellung; eine automatische Auswertung von Review-Kommentaren ist in der aktuellen Version noch nicht angebunden, der Schalter hat daher noch keine Wirkung.

## GitHub commands

**Allow GitHub commands** (Standard aus) erlaubt, dass berechtigte Kommentare in einem konfigurierten GitHub-Issue Aufgaben von Symphony starten und erfolgreiche Umsetzungen als Branch und Pull Request ausliefern. Die Einstellung ist unabhängig von **Run autonomous work**. Symphony liest neue Kommentare im Abstand von **Board refresh interval (minutes)**.

Unter **Commands** stehen die unterstützten Befehle:

| Befehl                       | Wirkung                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `@symphony your instruction` | gibt den Text als Hinweis an den nächsten passenden Schritt des Work Items weiter |
| `/symphony analyze`          | startet eine neue Analyse                                                         |
| `/symphony fix`              | startet die Umsetzung oder Überarbeitung, wenn eine erfolgreiche Analyse vorliegt |
| `/symphony retry`            | wiederholt den zuletzt fehlgeschlagenen Schritt                                   |
| `/symphony rerun-ci`         | führt den zuletzt fehlgeschlagenen GitHub-Actions-Lauf des Work Items erneut aus  |

## Execution

| Einstellung                              | Standard                                                 | Bereich    | Wirkung                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Managed root**                         | Ordner `workspaces` im Konfigurationsordner von Symphony | –          | Ort der Arbeitsbereiche. Die Ordnerschaltfläche **Choose managed execution root** öffnet die Ordnerauswahl; der gewählte Ordner gilt sofort. Ohne Wert steht `—`.                                                  |
| **Board refresh interval (minutes)**     | 15                                                       | 1 bis 1440 | Wie lange Daten aus GitHub als aktuell gelten und wie oft Symphony GitHub-Befehle und Rückmeldungen aus Teams abholt. Das Hauptfenster lädt seine Daten unabhängig davon höchstens alle 15 Minuten von selbst neu. |
| **Retain failed execution workspaces**   | an                                                       | –          | Ein fehlgeschlagener Arbeitsbereich bleibt für die Diagnose erhalten, statt nach dem Ende entfernt zu werden.                                                                                                      |
| **Verification repair attempts per run** | 2                                                        | 0 bis 10   | Wie oft eine Ausführung fehlschlagende Prüfungen des Repositorys an den Agent zurückgibt, bevor sie fehlschlägt. Bei 0 beendet der erste rote Check die Ausführung.                                                |
| **Clear inactive workspaces**            | –                                                        | –          | Entfernt Arbeitsbereiche ohne laufende Ausführung (siehe unten).                                                                                                                                                   |

### Inaktive Arbeitsbereiche aufräumen

1. **Clear inactive workspaces** (rot) öffnet die Rückfrage **Clear inactive execution workspaces?** mit dem Hinweis, dass laufende Ausführungen erhalten bleiben und lokale, nicht festgeschriebene Änderungen in inaktiven Arbeitsbereichen verloren gehen können.
2. **Keep workspaces** oder Escape bricht ohne Änderung ab. **Clear workspaces** räumt auf.
3. Symphony meldet **Workspaces cleared.** (bei einem **Workspace cleared.**) mit der Anzahl, `No inactive workspaces to clear.`, wenn nichts zu tun war, oder **Workspace cleanup incomplete.**, wenn sich einzelne Arbeitsbereiche nicht entfernen ließen. Bereits fehlende und aktive Arbeitsbereiche werden in der Meldung mitgezählt.

Die Zeile erscheint nur, wenn die Arbeitsbereichsverwaltung Teil dieser Symphony-Ausstattung ist.

## Suchen

Alle Einstellungen des Bereichs sind über **Search settings** auffindbar, gruppiert als `Automation › Autonomous work`, `Automation › Fix failed checks`, `Automation › Fix failed checks › Budgets`, `Automation › Address reviews`, `Automation › GitHub commands` und `Automation › Execution`. **Level** findest du auch mit `ladder`, `agentic delivery` oder `ci repair`, **Allow GitHub commands** auch mit den Befehlen, etwa `/symphony retry`. Die Treffer dieses Bereichs ändern nichts direkt; **Open** öffnet **Automation**.

## Sonder- und Fehlerfälle

### Speichern schlägt fehl

- Ausgangslage: Die Einstellungen lassen sich nicht speichern, etwa weil gerade ein Workspace gelöscht wird (`Wait for workspace deletion to finish before saving settings.`).
- Systemverhalten: Symphony meldet **Unable to save settings.** mit dem Grund.
- Folge: Das Steuerelement zeigt wieder den gespeicherten Wert, bei einer Stufe oder einem Leiterschalter die gespeicherte Leiste.
- Verfügbare Aktion: Später erneut ändern.

### Managed root während eines lokalen Laufs

- Ausgangslage: Local GitHub Actions führt gerade einen Lauf aus.
- Systemverhalten: Ein neuer **Managed root** wird mit `Stop the active local CI run before changing its configuration.` abgewiesen.
- Folge: Der bisherige Ordner bleibt.
- Verfügbare Aktion: Den lokalen Lauf stoppen und den Ordner erneut wählen.

### Ordnerauswahl abgebrochen

Brichst du die Ordnerauswahl ab, bleibt **Managed root** unverändert, und es wird nichts gespeichert.

### Aufräumen scheitert

Scheitert das Aufräumen ganz, meldet Symphony **Unable to clear managed workspaces.**; die Arbeitsbereiche bleiben, wie sie waren.

## Verwandte Features

- [Einstellungen im eigenen Fenster](../window-and-navigation/settings-window.md)
- [Actions](../actions/README.md)
- [Pull Requests](../pull-requests/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
- [Workspaces](../workspaces/README.md)
- [System](../system/README.md)
- [AI team](../ai-team/README.md)
- [Skills](../skills/README.md)
