# Connected services

Der Bereich **Connected services** eines Workspace zeigt, woher die Arbeit kommt, worauf die Agenten laufen und welches Feedback Symphony aufnimmt. Die Werkzeugleiste beschreibt ihn mit „Ticket sources, source control, and feedback intake.“. Alles hier gehört ausschließlich zu diesem Workspace.

## Aufbau

Der Bereich besteht aus bis zu vier Gruppen in dieser Reihenfolge.

| Gruppe                 | Inhalt                                                                                                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Boards**             | Jedes Board ist ein GitHub Project oder eine Azure-DevOps-Abfrage, etwa `GitHub Project · org example · #3 · Enabled` oder `Azure DevOps · Platform · Disabled`, jeweils mit **Edit**. Darunter **GitHub Projects board** mit **Add board**. |
| **Connected services** | Die Konten des Workspace: KI-Konten, Azure-DevOps-Konten und GitHub-Konten, die kein Repository verwendet. Die Gruppe fehlt, solange es keines gibt.                                                                                         |
| **Feedback intake**    | Jeder Microsoft-Teams-Kanal, aus dem Symphony Feedback aufnimmt, etwa `Microsoft Teams · Enabled · example/web`, mit **Edit**; darunter **Microsoft Teams** mit **Connect**.                                                                 |
| **Add a service**      | **Codex**, **Claude Code** und **OpenCode** mit **Connect** sowie **Azure DevOps** („Add a work-item account“) mit **Connect**.                                                                                                              |

Ein GitHub-Konto, das ein Repository verwendet, erscheint nicht hier, sondern wird mit dem Repository unter [Repositories](repositories.md) gepflegt.

### Zeilen der KI-Konten

| Beschreibung                                   | Bedeutung                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `Codex · Signed in`, `Claude Code · Signed in` | Das Konto ist angemeldet und kann Agenten ausführen.               |
| `… · Not signed in`                            | Das Konto braucht eine neue Anmeldung.                             |
| `… · Sign-in not checked yet`                  | Der Anmeldestand wurde noch nicht abgefragt.                       |
| `… · CLI not installed`                        | Das Kommandozeilenwerkzeug fehlt auf diesem Mac.                   |
| `OpenCode` oder `OpenCode · <Gateway>`         | OpenCode braucht keine Anmeldung; ein Firmen-Gateway wird genannt. |

Jede Zeile hat **Edit** und eine Schaltfläche zum Entfernen. In **Add a service** nennen die Zeilen, was ein Konto braucht („ChatGPT subscription or OpenAI API key“, „Claude subscription“, „Provider sign-ins stored by OpenCode“), ergänzt um ` · Checking CLI…` oder ` · CLI not installed`. Nicht angemeldete Konten meldet zusätzlich die [Mitteilungszentrale](../notifications-and-tray/README.md) mit **Sign in**.

## KI-Konto verbinden

**Connect** in **Add a service** öffnet das Sheet **Connect AI account**.

1. **AI provider**: Codex, Claude Code oder OpenCode. Ein Anbieter, dessen CLI fehlt, ist gesperrt; darunter steht er mit „Install the … CLI before connecting an account.“ und **Install with Homebrew**. Nach der Rückfrage **Install … CLI?** installiert Homebrew das Werkzeug, Symphony prüft es und wählt den Anbieter. Ohne Homebrew erscheint **Homebrew is required for one-click installation**.
2. **Account name** ist Pflicht; fehlt er, nennt **Finish these details before saving** die offenen Angaben.
3. **Sign-in** hängt vom Anbieter ab:

| Anbieter    | Anmeldung                                                                                                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Codex       | **Sign in with** **ChatGPT subscription (browser)** oder **OpenAI API key**. **Sign in with ChatGPT** speichert das Konto und öffnet die Anmeldung im Browser; Symphony prüft den Stand danach alle drei Sekunden, höchstens zehn Minuten lang. **Sign in with API key** übergibt den Schlüssel einmal an die Codex CLI; Symphony speichert ihn nicht. |
| Claude Code | **Sign in with Claude** speichert das Konto und öffnet die Anmeldung im Browser. Den danach angezeigten Code fügst du unter **Authorization code from Claude** ein und schließt mit **Finish sign-in** ab. Die Anmeldung gilt nur für diesen Workspace.                                                                                                |
| OpenCode    | Keine Anmeldung nötig; **Save** legt das Konto an. **Import sign-ins** übernimmt nach der Rückfrage **Import current OpenCode sign-ins?** die auf diesem Mac gespeicherten Anbieter-Anmeldungen als isolierte Kopie in dieses Konto.                                                                                                                   |

4. **Expert settings** nehmen optional eine **Credential reference (optional)** auf – den Namen einer Umgebungsvariablen mit einem API-Schlüssel – und für OpenCode **Gateway ID**, **Gateway name** und **Gateway URL** eines Firmen-Gateways.

Ein neues Codex- oder Claude-Code-Konto hat keine **Save**-Schaltfläche: Es entsteht mit dem Start der Anmeldung und bleibt nur bestehen, wenn die Anmeldung gelingt. Schlägt der Start fehl oder schließt du das Sheet vor dem Abschluss, entfernt Symphony das vorläufige Konto wieder.

### Vorhandenes Konto bearbeiten

**Edit** öffnet das Sheet **Edit AI account**. Der Anbieter ist dann fest. **Refresh** fragt den Anmeldestand neu ab, **Disconnect** meldet ein angemeldetes Konto ab, **Save** übernimmt Namen und Experteneinstellungen, **Remove account** steht unten links.

## KI-Konto entfernen

Entfernen ist über die Zeile oder **Remove account** im Sheet möglich.

| Ausgangslage                                                  | Rückfrage                                                                                                                                                                      | Ergebnis                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Mindestens ein Agent hätte ohne dieses Konto kein Konto mehr. | **This account is still in use** nennt die Agenten und bittet, sie zuerst auf ein anderes KI-Konto zu verlegen; nur **OK**.                                                    | Nichts wird entfernt.                                                                                     |
| Jeder betroffene Agent hat noch ein anderes Konto.            | **Remove …?**: Symphony meldet das Konto ab, löscht seine isolierten Daten im Workspace und streicht es aus jeder Ersatzreihenfolge. **Remove account** oder **Keep account**. | Das Konto verschwindet; Agenten laufen auf ihren anderen Konten weiter, die Ersatzreihenfolge rückt nach. |

## Boards

### GitHub Projects

**Add board** oder **Edit** an einem GitHub-Board öffnet **Add GitHub Projects board** beziehungsweise **Edit GitHub Projects board**.

- Ohne GitHub-Konto im Workspace erscheint **No GitHub account in this workspace**: Zuerst wird ein Repository hinzugefügt, dessen GitHub-Konto das Project liest.
- **Board name** und **GitHub account**. Ein anderes Konto lädt die Liste der Projects neu.
- **Choose project** listet die Projects, die dem angemeldeten Konto gehören oder mit Repositories des Workspace verknüpft sind, für Organisationen und Benutzer. Die Suche („Title, owner or number“) grenzt ein, **Reload** lädt neu, **Use** wählt ein Project (danach **Selected**); geschlossene Projects tragen `(closed)`. Die Wahl übernimmt den Titel als Board-Namen, solange du ihn nicht selbst geändert hast, und liest die Spalten.
- Kann die Liste nicht geladen werden, erscheint **Projects could not be loaded** mit dem Grund. Ohne Treffer bietet **Enter project manually** die Eingabe von **Owner type** (**User** oder **Organization**), **Owner login** und **Project number** mit **Read columns**.
- **Board enabled** schaltet das Board ein oder aus.

**Save** ist erst möglich, wenn Name, Konto, Besitzer und eine Project-Nummer größer null vorliegen. **Remove board** unten links fragt bei einem vorhandenen Board zuerst **Remove …?** („Symphony stops reading this GitHub Project. Its work items stay in GitHub, but they no longer appear on the Board, the Overview or the Orbit.“) mit **Remove board** (rot) oder **Keep board**. Nach der Bestätigung verschwindet das Board; war es im Hauptfenster gewählt, wird die Board-Auswahl dort aufgehoben.

### Spalten zuordnen

Im Abschnitt **Columns** wird jede Spalte des Anbieters zu einer Board-Spalte. Je Spalte wählst du einen Zustand des Arbeitsablaufs oder **Not mapped**. Symphony errät zur Laufzeit nichts: Nur die Zuordnung sagt, welche Spalte bereit, in Arbeit oder fertig bedeutet. Umbenannte Spalten behalten ihre Zuordnung.

| Ausgangslage                                                                   | Verhalten                                                                                                                                    |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Die Spalte hatte schon eine Zuordnung.                                         | Sie bleibt erhalten.                                                                                                                         |
| Neue Spalte mit Vorschlag des Anbieters                                        | Der Vorschlag ist vorausgewählt.                                                                                                             |
| Ein automatisierter Zustand hat keine Spalte.                                  | **No column is mapped to …**: Automatisierte Zustände brauchen eine Spalte, damit Symphony Work Items dorthin bewegen und aufnehmen kann.    |
| Die Spalten können nicht gelesen werden.                                       | **Columns could not be read** mit dem Grund; die gespeicherten Zuordnungen bleiben beim Speichern erhalten. **Reload columns** liest erneut. |
| Ein älteres Leseergebnis trifft nach dem Wechsel zu einem anderen Project ein. | Es wird verworfen; nur das zuletzt gewählte Project zählt.                                                                                   |

### Azure DevOps

**Connect** an **Azure DevOps** oder **Edit** an einem Azure-Board beziehungsweise -Konto öffnet **Add Azure DevOps source** oder **Edit Azure DevOps source** mit **Display name**, **Organization**, **Project**, **Team (optional)**, **Saved query ID (optional)**, **WIQL (used when no query ID is set)**, **Kanban board ID (optional, needs a team)**, den Spaltenzuordnungen und **Source enabled**.

- **Authentication** zeigt `Not connected`, `Connected · PAT in secure storage`, `Connected · environment credential` oder `Connected · temporary Microsoft Entra token` und bei bestehender Verbindung **Disconnect**.
- Ein persönliches Zugriffstoken fügst du unter **Personal access token** (später **Replace personal access token**) ein. **Save and connect** beziehungsweise **Verify and replace PAT** speichert die Quelle, prüft das Token und legt es im Schlüsselbund des Betriebssystems ab; in den Einstellungen steht es nie. Danach wird das Feld geleert.
- Spalten lassen sich erst lesen, wenn die Quelle einmal gespeichert ist („Save the source first, then reopen it to read and map its columns.“).
- **Save** ist erst möglich, wenn **Display name**, **Organization**, **Project** und eine gespeicherte Abfrage oder WIQL angegeben sind. Fehlt etwas, nennt **Finish these details before saving** im Rahmen **With missing details** die offenen Angaben, etwa `Display name · Organization · Project` oder `Saved query ID or WIQL`.

**Remove source** unten links erscheint bei einer gespeicherten Quelle. Es fragt zuerst **Remove …?** („Symphony stops reading this Azure DevOps query and deletes the stored personal access token. Its work items stay in Azure DevOps, but they no longer appear on the Board, the Overview or the Orbit.“) mit **Remove source** (rot) oder **Keep source**. Nach der Bestätigung löscht Symphony das hinterlegte Token aus dem Schlüsselbund, sofern keine andere Quelle das Konto nutzt, und entfernt dann die Quelle und ihr nicht mehr genutztes Konto; war sie im Hauptfenster als Board gewählt, wird die Auswahl aufgehoben. Lässt sich das Token nicht löschen, bleibt die Quelle bestehen.

## Feedback aus Microsoft Teams

**Connect** an **Microsoft Teams** oder **Edit** an einem Intake öffnet **Add Microsoft Teams feedback intake** beziehungsweise **Edit Microsoft Teams feedback intake**. Symphony liest einen Teams-Kanal und legt ein GitHub-Work-Item an, wenn auf einer FLAMOX365-Feedbackkarte `@Symphony` erwähnt wird. Voraussetzung ist eine Microsoft-Entra-Anwendung mit der Berechtigung `ChannelMessage.Read.Group` für das Team; ihr Client-Secret liegt in einer Umgebungsvariablen.

| Feld                                                       | Regel                                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**                                           | Pflicht; vorbelegt mit `FLAMOX365 feedback`                                                                                                    |
| **Microsoft Entra tenant ID**, **Application / client ID** | Pflicht                                                                                                                                        |
| **Client secret credential reference**                     | Pflicht; der Name einer Umgebungsvariablen, etwa `env:TEAMS_FEEDBACK_CLIENT_SECRET`, nie das Secret selbst                                     |
| **Team ID**, **Channel ID**                                | Pflicht                                                                                                                                        |
| **Target GitHub Project**                                  | Pflicht; ein eingeschaltetes GitHub-Projects-Board dieses Workspace                                                                            |
| **Target GitHub repository**                               | Pflicht; ein eingeschaltetes GitHub-Repository dieses Workspace                                                                                |
| **Create work items from @Symphony feedback requests**     | schaltet die Aufnahme ein; vorhandene Nachrichten werden zur Ausgangslage und nie nachträglich importiert. Ein neues Intake ist ausgeschaltet. |

Eingeschaltet lässt sich ein Intake nur speichern, wenn das [AI-Team](../ai-team/README.md) des Workspace einen Agenten mit Skill für die Work-Item-Erstellung (**Create**) hat; sonst meldet Symphony **Unable to save settings.** mit dem Hinweis, zuerst einen Work Item Creator einzurichten. Solange ein Intake ein Board oder Repository als Ziel nennt, lässt sich dieses Ziel weder ausschalten noch entfernen.

**Test connection** liest den Kanal einmal und meldet das Ergebnis. **Save** und **Test connection** sind erst mit allen Pflichtangaben möglich; bis dahin nennt **Finish these details before saving** im Rahmen **With missing details** die offenen Felder, etwa `Team ID · Channel ID`. Ist die Aufnahme eingeschaltet, prüft Symphony beim Speichern zuerst die Verbindung und speichert nicht, wenn der Kanal nicht gelesen werden kann (**Unable to read the configured Microsoft Teams channel.**). **Remove intake** unten links fragt zuerst **Remove …?** („Symphony stops reading this Microsoft Teams channel. Work items it already created stay in GitHub.“) mit **Remove intake** (rot) oder **Keep intake**.

## Sonder- und Fehlerfälle

- Scheitert das Speichern eines Sheets, bleibt es mit deinen Eingaben offen und Symphony meldet **Unable to save settings.**.
- **Edit** an einem GitHub-Konto, das kein Repository verwendet, öffnet ein leeres Sheet **Add repository**.

## Verwandte Features

- [Workspaces](README.md)
- [Repositories](repositories.md)
- [AI-Team](../ai-team/README.md)
- [Entwicklerwerkzeuge](../developer-tools/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
