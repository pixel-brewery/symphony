# Workspaces

Ein Workspace ist die feste Grenze für ein Unternehmen oder ein Projekt. Er besitzt seine eigenen KI-Konten, Boards, Repositories, Auslieferungsziele, Ausführungen und seinen Speicher; nichts davon teilt er mit einem anderen Workspace. Workspaces verwaltest du im [Einstellungsfenster](../window-and-navigation/settings-window.md): Es öffnet sich auf der Liste **Workspaces**, und jeder Workspace hat dort seine eigenen Bereiche.

## Was das Feature bietet

- Eine Liste aller Workspaces mit einer einzeiligen Zusammenfassung und ihrem Zustand.
- Workspaces anlegen, umbenennen, einfärben und deaktivieren.
- Die Konfiguration eines Workspace als portables Bündel exportieren und auf diesem oder einem anderen Mac importieren.
- Sechs Bereiche je Workspace: **AI team**, **Connected services**, **Repositories**, **Delivery destinations**, **Local GitHub Actions** und **Administration**.

## Die Liste „Workspaces“

Das Einstellungsfenster öffnet sich auf **Workspaces**. Die Gruppe **Workspaces** trägt rechts **Import workspace** und **Add workspace**. Jede Zeile zeigt das Kürzel des Workspace als Kachel, seinen Namen und eine Zusammenfassung, etwa:

`2 agents · 1 AI account · 3 repositories, 1 not prepared locally · 4.2 GB of 20 GB`

| Teil der Zusammenfassung   | Bedeutung                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `agents`                   | Agenten des Workspace                                                                                              |
| `AI accounts`              | verbundene Konten für Codex, Claude Code und OpenCode                                                              |
| `repositories`             | Repositories des Workspace                                                                                         |
| `, n not prepared locally` | erscheint, sobald bekannt ist, dass Repositories noch keine lokale Arbeitskopie haben                              |
| `… of 20 GB`               | gemessener Speicher gegenüber der Grenze aus **Administration**; `—`, solange noch keine Messung abgeschlossen ist |

Rechts stehen der Zustand **Available** und **Open**. **Open** öffnet den Workspace bei **AI team**; seine Bereiche erscheinen als eingerückte Zeilen unter ihm in der Seitenleiste.

Deaktivierte Workspaces stehen getrennt unter der Überschrift **While a workspace is disabled**. Ihre Zeile sagt `Disabled · not used for configuration and task routing` und zeigt keinen Zustand; **Open** bleibt verfügbar, damit du sie wieder aktivieren kannst.

Unter der Liste erinnert ein Hinweis daran, dass Probleme – etwa ein nicht angemeldetes Konto oder ein nicht vorbereitetes Repository – nicht hier, sondern in der [Mitteilungszentrale](../notifications-and-tray/README.md) des Hauptfensters erscheinen.

## Workspace anlegen oder bearbeiten

**Add workspace** öffnet das Sheet **Add workspace**; **Edit workspace** unter [Administration](administration.md) öffnet dasselbe Sheet als **Edit workspace**. Es enthält:

| Feld                  | Regel                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Name**              | Pflichtfeld                                                                                    |
| **Short code**        | Pflichtfeld; wird beim Speichern in Großbuchstaben umgewandelt und auf acht Zeichen gekürzt    |
| **Color (hex)**       | Farbe als `#` mit sechs Hexadezimalziffern, vorbelegt mit `#4f6bed`                            |
| **Workspace enabled** | „Include this workspace in configuration and task routing.“ Ein neuer Workspace ist aktiviert. |

**Save** prüft die Eingaben. Fehlt etwas oder ist die Farbe ungültig, meldet das Sheet **Check the workspace** mit „Enter a name, a short code and a color such as #4f6bed.“ und bleibt offen. Scheitert das Speichern, meldet es **Unable to save settings.** mit „Your changes are still here. Try again.“. **Cancel** und Escape schließen ohne Änderung.

Ein neuer Workspace beginnt mit 20 GB Speichergrenze, ausgeschalteten lokalen GitHub-Actions-Läufen und ausgeschalteter automatischer Bündelung. Beim Bearbeiten bleiben diese Einstellungen unverändert.

Ein deaktivierter Workspace wird bei Konfiguration und Aufgabenverteilung nicht berücksichtigt, kann nicht mit **Use only this workspace** in den Fokus genommen werden und liefert keine Hinweise zu Repositories oder Speicher in die Mitteilungszentrale.

## Workspace importieren

1. **Import workspace** öffnet die Dateiauswahl **Choose Symphony workspace bundle** für eine Bündeldatei (`.json`).
2. Symphony fragt **Import workspace configuration?**: Ein passender Workspace wird durch die portable Konfiguration ersetzt; Geheimnisse, angemeldete Konten und lokale Repository-Pfade werden nie aus dem Bündel gelesen. **Import workspace** bestätigt, **Cancel** bricht ohne Änderung ab.
3. Während des Imports heißt die Schaltfläche **Importing workspace…**; ein Export ist in dieser Zeit gesperrt.

Ergebnis: Trägt das Bündel denselben Workspace wie ein vorhandener, ersetzt es dessen Konfiguration (`<Name> updated from bundle.`), sonst kommt ein neuer Workspace hinzu (`<Name> imported.`). Die Meldung nennt die nächsten Schritte, etwa „Sign in to 2 connections. Verify 3 local repository paths.“, oder „The workspace is ready to use.“. Ein importierter, aktivierter Workspace wird zum gewählten Workspace des Hauptfensters.

| Inhalt                              | Verhalten beim Import                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| KI-Konten und GitHub-Konten         | kommen ohne Anmeldung an; du meldest dich im Bereich [Connected services](connected-services.md) beziehungsweise bei den Repositories neu an |
| Repositories                        | behalten bei einem ersetzten Workspace ihren bisherigen lokalen Pfad; neue erhalten einen von Symphony verwalteten Pfad                      |
| Microsoft-Teams-Feedback-Intakes    | kommen ausgeschaltet an                                                                                                                      |
| Geteilte Skills, die das Team nutzt | werden übernommen, wenn noch kein Skill mit diesem Namen existiert                                                                           |
| Auslieferungsziele                  | gehören nicht zum Bündel; vorhandene Ziele bleiben erhalten                                                                                  |

Der Import scheitert mit **Unable to import the workspace.** und dem Grund, wenn

- gerade ein Workspace gelöscht wird,
- im betroffenen Workspace eine Ausführung oder ein Entwurf eines Work Items aktiv ist,
- ein geteilter Skill gleichen Namens mit anderem Inhalt bereits existiert,
- ein deaktivierter Workspace importiert würde und dadurch kein aktivierter Workspace mehr gewählt wäre.

Exportieren und Löschen beschreibt [Administration](administration.md).

## Bereiche eines Workspace

| Bereich                   | Inhalt                                                                                       | Seite                                             |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **AI team**               | Lieferablauf, Agenten und ihre Zuständigkeiten                                               | [AI-Team](../ai-team/README.md)                   |
| **Connected services**    | Boards, KI-Konten, Azure DevOps, Feedback aus Microsoft Teams                                | [Connected services](connected-services.md)       |
| **Repositories**          | GitHub-Repositories, lokale Vorbereitung und Freigabe für die AI-Arbeit                      | [Repositories](repositories.md)                   |
| **Delivery destinations** | Umgebungen, Release-Kanäle und Installationen je Projekt, Production in der Mitte des Orbits | [Delivery destinations](delivery-destinations.md) |
| **Local GitHub Actions**  | lokale Läufe einschalten, Gastabbild und Einrichtungsskripte je Repository                   | [Local GitHub Actions](local-github-actions.md)   |
| **Administration**        | Speicher und Grenze, automatische Bündelung, Bearbeiten, Fokus, Export und Löschen           | [Administration](administration.md)               |

Die Werkzeugleiste nennt den Bereich mit dem Namen des Workspace davor, etwa `Personal · Ticket sources, source control, and feedback intake.`. Einstellungen in den Bereichen gelten sofort; Bearbeiten und Anlegen öffnen Sheets, Entfernen fragt in einem Alert-Sheet nach. Beides beschreibt [Einstellungen im eigenen Fenster](../window-and-navigation/settings-window.md#ändern-und-bestätigen).

### Wege in einen Bereich

| Auslöser                                                                    | Ziel                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Open** in der Liste oder ein Workspace in der Seitenleiste                | **AI team** des Workspace                                |
| **Sign in** an einem nicht angemeldeten KI-Konto in der Mitteilungszentrale | **Connected services** des Workspace                     |
| **Review storage** an einer Speicherwarnung des Workspace                   | **Administration** des Workspace                         |
| **Configure destination** oder **Configure production** im Orbit            | **Delivery destinations** des Projekts mit offenem Sheet |
| **Delivery destinations in Settings** im Zielmenü des Orbits                | **Delivery destinations** des Projekts                   |
| **Expert settings / accounts** im Sheet **Build your project team**         | **Connected services** des gewählten Workspace           |
| ein Treffer in **Search settings**                                          | der Bereich des Treffers                                 |

Die Suche findet die Einstellungen dieser Bereiche je Workspace, etwa **Boards**, **Add a service**, **Repositories**, **Delivery destinations**, **Enable local runs**, **Runner image**, **Setup script**, **Maximum workspace size (GB)**, **Automatically activate safe groups**, **Export workspace** und **Delete workspace**, sowie **Add workspace** und **Import workspace**. Jeder dieser Treffer öffnet seinen Bereich; geändert wird dort.

## Verwandte Features

- [Einstellungen im eigenen Fenster](../window-and-navigation/settings-window.md)
- [AI-Team](../ai-team/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
- [System](../system/README.md)
- [Orbit](../orbit/README.md)
