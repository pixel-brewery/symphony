# Repositories

Der Bereich **Repositories** eines Workspace nimmt jedes GitHub-Repository auf, in dem die Agenten dieses Workspace arbeiten. Die Werkzeugleiste beschreibt ihn mit „Local source code and AI work approval.“. Ein hinzugefügtes und eingeschaltetes Repository steht den manuellen und automatischen AI-Aufgaben des Workspace zur Verfügung; eine zweite Freigabe ist nicht nötig.

## Aufbau

Die Gruppe **Repositories** („Add every source-code repository used by this workspace. Configured repositories are available to AI tasks.“) listet jedes Repository mit Namen und einer Beschreibung `owner/name · <Zustand>`:

| Zustand                | Bedeutung                                                                     | Aktion in der Zeile                                   |
| ---------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `Not prepared locally` | Symphony hat noch keine verwendbare lokale Arbeitskopie.                      | **Prepare locally**                                   |
| `Prepared locally`     | Eine Arbeitskopie ist vorbereitet.                                            | **Refresh**, wenn Symphony die Kopie selbst verwaltet |
| `Disabled`             | Das Repository ist ausgeschaltet und erhält keine Branches und Pull Requests. | –                                                     |

Jede Zeile hat außerdem **Edit** und eine Schaltfläche zum Entfernen. Die letzte Zeile **Add repository** („Add another GitHub repository to this workspace“) öffnet das Sheet zum Hinzufügen.

## Lokal vorbereiten

**Prepare locally** und **Refresh** holen den aktuellen Stand des Repositories auf diesen Mac, ohne Projektcode auszuführen:

- Gibt es bereits eine verwendbare Arbeitskopie – deine unter **Local checkout** angegebene oder eine von Symphony verwaltete –, aktualisiert Symphony sie.
- Sonst legt Symphony eine eigene Kopie im Speicher des Workspace an. Dafür muss das GitHub-Konto angemeldet sein; andernfalls nennt die Fehlermeldung den Host, bei dem du dich anmelden musst.

Währenddessen sind die anderen Repository-Aktionen gesperrt. Erfolg meldet **Repository prepared locally.**, ein Fehler **Unable to prepare the repository locally.** mit dem Grund. Ist der Speicher des Workspace voll, wird die Vorbereitung verweigert. Ein nicht vorbereitetes Repository meldet auch die [Mitteilungszentrale](../notifications-and-tray/README.md) mit **Prepare locally**; dort steht, ob automatische AI-Arbeit darauf wartet.

## Repository hinzufügen oder bearbeiten

Das Sheet **Add repository** beziehungsweise **Edit repository** („GitHub source control and Actions“) enthält:

| Feld                                           | Regel und Wirkung                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**, **Owner**, **Repository**    | Pflicht; bis alle angegeben sind, ist **Save** gesperrt und **Finish these details before saving** nennt im Rahmen **With missing details** die offenen Felder             |
| **Local checkout**                             | optional; eine vorhandene Arbeitskopie auf diesem Mac, gewählt über die Ordnerauswahl **Choose local repository**                                                          |
| **GitHub hostname**                            | Standard `github.com`                                                                                                                                                      |
| **GitHub account login**                       | optional; bestimmt, welches GitHub-Konto des Workspace verwendet wird                                                                                                      |
| **Default branch**                             | Standard `main`                                                                                                                                                            |
| **Git protocol**                               | **HTTPS** (Standard) oder **SSH**                                                                                                                                          |
| **Show GitHub Actions runs**                   | „Include workflow runs from this repository in delivery status.“ Standardmäßig eingeschaltet.                                                                              |
| **Allow agentic delivery for this repository** | nur bei eingeschalteten Actions-Läufen; nimmt das Repository in die global eingeschaltete Diagnose, Reparatur und Wiederholung auf ([Automation](../automation/README.md)) |
| **Sign in after saving**                       | öffnet nach dem Speichern die GitHub-Anmeldung im Browser                                                                                                                  |
| **Repository enabled**                         | „Allow this repository to receive implementation branches and pull requests.“                                                                                              |

Beim Bearbeiten eines vorhandenen Repositories zeigt das Sheet zusätzlich **GitHub Actions usage**: das Konto, **Monthly usage** mit verbleibendem Anteil, **Used minutes**, **Included minutes**, **Remaining minutes** und den nächsten Rücksetztermin. Fehlt die Angabe, steht **GitHub Actions usage unavailable** mit dem Grund; meldet GitHub keine enthaltene Menge, erklärt das ein Hinweis.

### Welches GitHub-Konto verwendet wird

Repositories desselben Hosts, Protokolls und – falls angegeben – Konto-Logins teilen sich ein GitHub-Konto des Workspace. Änderst du diese Angaben bei einem Repository, dessen Konto ein anderes Repository mitbenutzt, erhält es ein eigenes Konto; das andere Repository behält seines. Ein GitHub-Konto, das ein Repository verwendet, wird hier und nicht unter [Connected services](connected-services.md) gepflegt.

## Repository entfernen

| Ausgangslage                                                 | Rückfrage                                                                                                                                                                                                          | Ergebnis                                                                                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Die Lieferung des Workspace verwendet nur dieses Repository. | **This repository is still in use**: Zuerst muss dort ein weiteres Repository hinzukommen. Nur **OK**.                                                                                                             | Nichts wird entfernt.                                                                                                                                                                       |
| Sonst                                                        | **Remove …?**: Symphony entfernt das Repository aus dem Workspace und vergisst seinen lokalen Pfad; deine Arbeitskopie und ihre Git-Historie bleiben unangetastet. **Remove repository** oder **Keep repository**. | Das Repository, seine [Auslieferungsziele](delivery-destinations.md) und seine GitHub-Actions-Anbindung verschwinden. Sein GitHub-Konto wird mitentfernt, wenn nichts anderes es verwendet. |

Ist das Repository Ziel eines [Feedback-Intakes aus Microsoft Teams](connected-services.md#feedback-aus-microsoft-teams), scheitert das Entfernen mit **Unable to save settings.**; zuerst wird das Intake geändert oder entfernt.

## Verwandte Features

- [Workspaces](README.md)
- [Delivery destinations](delivery-destinations.md)
- [Local GitHub Actions](local-github-actions.md)
- [Pull Requests](../pull-requests/README.md)
- [Actions](../actions/README.md)
