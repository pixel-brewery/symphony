# Einstellungen im eigenen Fenster

Die Einstellungen von Symphony öffnen sich auf macOS, Windows und Linux in einem eigenen Fenster **Settings**. Das Hauptfenster bleibt dabei auf seinem aktuellen Bildschirm, sodass du Einstellungen ändern und das Ergebnis gleichzeitig im Hauptfenster verfolgen kannst. Es gibt immer höchstens ein Einstellungsfenster.

## Einstellungen öffnen

| Auslöser                                                                                                                       | Ergebnis                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Settings** unten in der Seitenleiste                                                                                         | Das Einstellungsfenster öffnet sich oder kommt nach vorn.                |
| **Manage workspaces…** im Workspace-Umschalter                                                                                 | wie oben                                                                 |
| **Settings…** im Programmmenü (macOS) oder ⌘, beziehungsweise Ctrl+,                                                           | wie oben, auch wenn gerade das Einstellungsfenster selbst vorn ist       |
| **Settings** im Menüleisten-Menü (macOS)                                                                                       | wie oben; das Menüleisten-Menü schließt sich                             |
| Ein Verweis in der Anwendung auf eine bestimmte Einstellung, etwa **Open AI team** im Laufpanel oder ein Suchtreffer zu Skills | Das Einstellungsfenster öffnet sich an der genannten Stelle.             |
| Ein früheres Lesezeichen oder ein Link auf die Einstellungsseite des Hauptfensters                                             | Das Einstellungsfenster öffnet sich, bei Angabe an der genannten Stelle. |

Ein neues Einstellungsfenster öffnet sich in 1000 × 760 px. Du kannst es frei vergrößern und bis auf 720 × 520 px verkleinern. Der Fenstertitel lautet immer **Settings**. Die Fensterbedienelemente entsprechen denen des [Hauptfensters](README.md#plattformen).

## Aufbau des Fensters

Die Seitenleiste beginnt mit **Search settings**. Darunter stehen **Workspaces** – dort öffnet sich das Fenster – und jeder Workspace mit seinem Kürzel. Unter dem Workspace, den du gerade einstellst, erscheinen seine Bereiche **AI team**, **Connected services**, **Repositories**, **Delivery destinations**, **Local GitHub Actions** und **Administration** als eingerückte Zeilen; solange du keinen Workspace geöffnet hast, stehen sie unter dem Workspace, der im Hauptfenster aktiv ist. Einen Workspace öffnen zeigt zuerst **AI team**. Unter der Überschrift **Symphony** folgen **Automation**, **Skills**, **System**, **Mobile access** und **Appearance**. Der gewählte Bereich ist in der Seitenleiste hervorgehoben. Die Werkzeugleiste nennt den Bereich und beschreibt ihn in einer Zeile, bei Workspace-Bereichen mit dem Namen des Workspace davor; rechts stehen die Aktionen des Bereichs.

| Bereich                                                                                                                                   | Inhalt                                                                                                                                                             | Beschreibung                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **Workspaces** sowie **Connected services**, **Repositories**, **Delivery destinations**, **Local GitHub Actions** und **Administration** | jeder Workspace mit Agenten, KI-Konten, Repositories, belegtem Speicher und Zustand, **Import workspace** und **Add workspace**; die Einstellungen eines Workspace | [Workspaces](../workspaces/README.md)       |
| **AI team**                                                                                                                               | wer welchen Schritt des Lieferablaufs übernimmt, die Agenten und die technische AI-Einrichtung                                                                     | [AI-Team](../ai-team/README.md)             |
| **Skills**                                                                                                                                | wie jeder Schritt ausgeführt wird, samt Rollen und Skill-Paketen                                                                                                   | [Skills](../skills/README.md)               |
| **Automation**                                                                                                                            | wie weit das AI-Team in allen Workspaces selbstständig arbeiten darf                                                                                               | [Automation](../automation/README.md)       |
| **System**                                                                                                                                | dieser Mac: **Storage**, **Developer tools**, **Virtual machines**, **Updates** und **Sleep**                                                                      | [System: dieser Mac](../system/README.md)   |
| **Mobile access**                                                                                                                         | Telefone im lokalen Netzwerk koppeln und verwalten                                                                                                                 | [Mobile access](../system/mobile-access.md) |
| **Appearance**                                                                                                                            | Farbschema und **Show Arcade**                                                                                                                                     | [Appearance](../system/appearance.md)       |

Gruppen stehen in gerahmten Listen mit einer Zeile je Einstellung. Was nur in bestimmten Situationen erscheint, steht in einem gestrichelten Rahmen, über dem die Bedingung steht, etwa **While a workspace is disabled**, **Without Homebrew** oder **When storage is not writable**.

## Einstellungen suchen

Tippe in **Search settings**. Statt eines Bereichs zeigt das Fenster dann die passenden Einstellungen aus allen Bereichen und allen Workspaces; die Werkzeugleiste nennt `Search settings` und die Trefferzahl, etwa `<n> results for “storage” across every workspace and this Mac`.

- Gesucht wird in Bezeichnung, Hilfetext, Wert und Ort einer Einstellung sowie in hinterlegten Stichwörtern wie `dark`, `canary` oder `Homebrew`. Groß- und Kleinschreibung spielen keine Rolle; jedes eingegebene Wort muss vorkommen. Auch die Bereiche selbst sind Treffer, etwa **System** bei der Suche `mac`.
- Auch einzelne Einträge sind Treffer: jedes Repository (mit `Besitzer/Repository`), jedes Lieferziel (gruppiert nach seinem Projekt, mit seiner Umgebung als Wert), jeder Agent (mit Stellenbezeichnung), jedes AI-Konto (mit dem Anmeldestand als Wert, etwa `Signed in`), jedes Board (mit `Enabled` oder `Disabled`), jedes GitHub- und Azure-DevOps-Konto, jedes Microsoft-Teams-Intake (mit `Enabled` oder `Disabled`) und jeder Workspace. Deaktivierte Repositories, Agenten und Workspaces tragen den Wert `Disabled`. Der Wert steht im Treffer links neben **Open**.
- Die Treffer stehen in Gruppen nach ihrem Ort, etwa `Automation › Fix failed checks › Budgets` oder `FLAMOX365 › Local GitHub Actions › Activation`. Einstellungen eines Workspace-Bereichs erscheinen einmal je Workspace, mit dessen Namen vorn. Gruppen, deren Bezeichnungen alle Wörter enthalten, stehen oben. Die passenden Stellen der Bezeichnung sind markiert.
- Drei Einstellungen lassen sich direkt im Treffer ändern: **Theme**, **Keep this Mac awake while tasks run** und **Show Arcade**. Jeder andere Treffer öffnet mit **Open** seinen Bereich; ein Klick auf den Ort über der Gruppe (**Open section**) ebenso. Ein einzelner Eintrag öffnet zusätzlich sein Sheet: das Repository, das Lieferziel, den Agenten, das AI-Konto, das Board (GitHub Projects oder Azure DevOps), das Konto, das Teams-Intake oder bei einem Workspace **Edit workspace**. Derselbe Treffer öffnet das Sheet auch ein zweites Mal.
- Ohne Treffer zeigt das Fenster in einem gestrichelten Rahmen **Without results** `No setting matches “…”` mit `Try another word.`
- Ein Klick auf einen Bereich in der Seitenleiste oder das Leeren des Suchfelds beendet die Suche.

## Ändern und bestätigen

- Jede Einstellung gilt, sobald du sie änderst; Zahlen gelten, sobald du das Feld verlässt oder Enter drückst. Es gibt keine **Save**-Schaltflächen mehr in den Bereichen. Das Steuerelement zeigt den neuen Wert sofort. Symphony meldet **Settings saved.**; schlägt das Speichern fehl, meldet es **Unable to save settings.** mit dem Grund und zeigt wieder den vorherigen Wert.
- Bearbeiten und Anlegen, etwa **Add workspace**, öffnet ein Sheet über dem Fenster mit **Cancel** und **Save** unten rechts. Escape schließt es ohne Änderung, ein Klick neben das Sheet schließt es nicht. Fehlen Pflichtangaben, bleibt **Save** gesperrt, und die Sheets für AI-Konto, Repository, Azure-DevOps-Quelle und Teams-Intake nennen sie in einem gestrichelten Rahmen **With missing details** unter **Finish these details before saving**. Schlägt das Speichern fehl, bleibt das Sheet mit deinen Eingaben offen, und Symphony meldet den Fehler, etwa mit **Unable to save settings.**; das Sheet eines Workspace nennt ihn zusätzlich direkt im Sheet.
- Es ist höchstens ein Sheet zum Bearbeiten offen. Ein weiterer Aufruf lässt das offene Sheet auf sich aufmerksam machen, statt ein zweites zu öffnen. Manche Sheets führen nach dem Speichern direkt in ein Folge-Sheet. Gehört ein Sheet zu einem Workspace-Bereich, etwa das AI-Konto zu **Connected services**, wechselt das Fenster dorthin, bevor das Sheet erscheint.
- Rückfragen erscheinen als kleine Sheets mit Symbol, Frage, Folgen und den Antworten unten rechts; Entfernen oder Löschen ist rot hervorgehoben. Escape antwortet wie die zweite Schaltfläche, ohne etwas zu ändern. Ein reiner Hinweis, warum etwas gerade nicht geht, hat nur **OK**.
- **Set up a project** (früher eine eigene Seite) öffnet im Einstellungsfenster das Sheet **Build your project team**.

### Rückfragen

| Bereich                                                            | Auslöser                                           | Rückfrage                              | Antworten                                              |
| ------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| **Workspaces**                                                     | **Import workspace** nach der Dateiauswahl         | `Import workspace configuration?`      | **Import workspace** oder **Cancel**                   |
| **Administration**                                                 | Workspace löschen                                  | `Delete <Workspace>?`                  | **Delete workspace** (rot) oder **Keep workspace**     |
| **AI team**                                                        | Agent entfernen                                    | `Remove <Agent>?`                      | **Remove agent** (rot) oder **Keep agent**             |
| **AI team**                                                        | Agent entfernen, der nicht entfernt werden darf    | `This agent cannot be removed`         | **OK**                                                 |
| **AI team** (Agent-Sheet), **Connected services** (AI-Konto-Sheet) | fehlende AI-CLI installieren                       | `Install <Anbieter> CLI?`              | **Install with Homebrew** oder **Cancel**              |
| **Connected services** (Liste und AI-Konto-Sheet)                  | AI-Konto entfernen                                 | `Remove <Konto>?`                      | **Remove account** (rot) oder **Keep account**         |
| **Connected services** (Liste und AI-Konto-Sheet)                  | AI-Konto entfernen, auf dem noch Agenten laufen    | `This account is still in use`         | **OK**                                                 |
| **Connected services** (AI-Konto-Sheet, OpenCode)                  | vorhandene OpenCode-Anmeldungen übernehmen         | `Import current OpenCode sign-ins?`    | **Import into workspace** oder **Cancel**              |
| **Connected services** (GitHub-Projects-Sheet)                     | **Remove board**                                   | `Remove <Board>?`                      | **Remove board** (rot) oder **Keep board**             |
| **Connected services** (Azure-DevOps-Sheet)                        | **Remove source**                                  | `Remove <Quelle>?`                     | **Remove source** (rot) oder **Keep source**           |
| **Connected services** (Teams-Intake-Sheet)                        | **Remove intake**                                  | `Remove <Intake>?`                     | **Remove intake** (rot) oder **Keep intake**           |
| **Repositories**                                                   | Repository entfernen                               | `Remove <Repository>?`                 | **Remove repository** (rot) oder **Keep repository**   |
| **Repositories**                                                   | Repository entfernen, das noch allein genutzt wird | `This repository is still in use`      | **OK**                                                 |
| **Delivery destinations**                                          | Lieferziel entfernen                               | `Remove <Ziel>?`                       | **Remove destination** (rot) oder **Keep destination** |
| **Skills** (Skill-Sheet)                                           | Skill-Paket löschen                                | `Move “<Name>” to trash?`              | **Move to trash** (rot) oder **Cancel**                |
| **Automation**                                                     | **Clear inactive workspaces**                      | `Clear inactive execution workspaces?` | **Clear workspaces** (rot) oder **Keep workspaces**    |
| **System**                                                         | **Install with Homebrew** bei einem Werkzeug       | `Install <Werkzeug>?`                  | **Install with Homebrew** oder **Cancel**              |
| **System**                                                         | **Remove** an einer virtuellen Maschine            | `Remove this machine?`                 | **Remove machine** (rot) oder **Keep machine**         |
| **System**                                                         | **Clear runner data**                              | `Clear local runner data?`             | **Clear runner data** (rot) oder **Keep data**         |
| **Mobile access**                                                  | **Revoke** an einem Telefon                        | `Revoke <Telefon>?`                    | **Revoke** (rot) oder **Keep access**                  |
| **Mobile access**                                                  | **Revoke all phones**                              | `Revoke all <n> phones?`               | **Revoke all phones** (rot) oder **Keep access**       |

Was die einzelne Aktion bewirkt, beschreibt die Seite des jeweiligen Bereichs. Kopplungsanfragen unter **Mobile access** bestätigst du mit **Approve** oder **Reject**.

## Regeln

| Ausgangslage                                                       | Aktion                               | Ergebnis                                                                          |
| ------------------------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------- |
| Kein Einstellungsfenster ist offen.                                | Einstellungen ohne Zielangabe öffnen | Ein neues Fenster öffnet sich am Anfang der Einstellungen.                        |
| Kein Einstellungsfenster ist offen.                                | Einstellungen mit Zielangabe öffnen  | Ein neues Fenster öffnet sich direkt an der Zielstelle.                           |
| Das Einstellungsfenster ist offen.                                 | Einstellungen ohne Zielangabe öffnen | Das vorhandene Fenster kommt nach vorn und behält den gerade gezeigten Bereich.   |
| Das Einstellungsfenster ist offen.                                 | Einstellungen mit Zielangabe öffnen  | Das vorhandene Fenster kommt nach vorn und wechselt zur Zielstelle.               |
| Das Fenster ist minimiert.                                         | Einstellungen öffnen                 | Das Fenster wird wiederhergestellt und erhält den Fokus.                          |
| Ein Link nennt eine ungültige Zielangabe.                          | Link öffnen                          | Ungültige Angaben werden ignoriert; das Fenster öffnet sich ohne sie.             |
| Symphony startet mit einem Link auf die frühere Einstellungsseite. | Start                                | Das Hauptfenster zeigt **Overview**, das Einstellungsfenster öffnet sich daneben. |
| Das Fenster ist offen.                                             | Ein Workspace kommt hinzu            | Das Fenster öffnet den neuen Workspace auf **AI team**.                           |
| Ein Workspace ist im Fenster geöffnet.                             | Der Workspace wird gelöscht          | Das Fenster kehrt zu **Workspaces** zurück.                                       |

Das Einstellungsfenster lässt sich unabhängig vom Hauptfenster schließen. Beim nächsten Öffnen beginnt es wieder in der Standardgröße.

## Zusammenspiel mit dem Hauptfenster

- Änderungen wirken sofort in beiden Fenstern: Das Hauptfenster übernimmt etwa ein neues Farbschema oder **Show Arcade**, ohne neu zu laden. Fortschritt laufender Ausführungen und der Updatezustand erreichen auch das Einstellungsfenster.
- Ordnerauswahl für Repositories und Workspaces öffnet sich über dem Fenster, in dem du sie angestoßen hast.
- Eine Rückfrage des Betriebssystems, die entsteht, während das Einstellungsfenster vorn ist, etwa beim Beenden mit noch laufenden Aufgaben, erscheint an diesem Fenster.
- ⌘N beziehungsweise Ctrl+N im Einstellungsfenster holt das Hauptfenster nach vorn und öffnet dort das Anlegen eines Work Items.
- Wählst du beim Beenden **Keep running in background**, blendet Symphony beide Fenster aus und arbeitet weiter.
- Das Programm-Symbol im Dock oder ein zweiter Programmstart holt das Hauptfenster nach vorn, nicht das Einstellungsfenster.

Unter Windows und Linux beendet sich Symphony erst, wenn sowohl das Hauptfenster als auch das Einstellungsfenster geschlossen sind.

## Verwandte Features

- [Hauptfenster und Navigation](README.md)
- [Workspaces](../workspaces/README.md), [AI-Team](../ai-team/README.md), [Skills](../skills/README.md) und [Automation](../automation/README.md)
- [System: dieser Mac](../system/README.md), [Mobile access](../system/mobile-access.md) und [Appearance](../system/appearance.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
- [Symphony aktualisieren](../application-updates/README.md)
