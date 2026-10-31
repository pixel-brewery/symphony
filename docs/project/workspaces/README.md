# Workspaces

Ein Workspace ist die feste Grenze für ein Unternehmen oder ein Projekt. Er besitzt seine eigenen KI-Konten, Boards, Repositories, Auslieferungsziele, Ausführungen und seinen Speicher; nichts davon teilt er mit einem anderen Workspace. Workspaces verwaltest du in den [Einstellungen](../window-and-navigation/settings.md): Sie öffnen sich auf der Liste **Workspaces**, und jeder Workspace hat dort seine eigenen Bereiche.

## Was das Feature bietet

- Eine Liste aller Workspaces mit einer einzeiligen Zusammenfassung und ihrem Zustand.
- Workspaces anlegen, umbenennen, mit Symbol, Emoji oder Monogramm und Farbe gestalten sowie deaktivieren.
- Die Konfiguration eines Workspace als portables Bündel exportieren und auf diesem oder einem anderen Mac importieren.
- Sechs Bereiche je Workspace: **AI team**, **Connected services**, **Repositories**, **Delivery destinations**, **Local GitHub Actions** und **Administration**.

## Die Liste „Workspaces“

Die Einstellungen öffnen sich auf **Workspaces**. Die Gruppe **Workspaces** trägt rechts **Import workspace** und **Add workspace**. Jede Zeile zeigt die gewählte Workspace-Kachel, seinen Namen und eine Zusammenfassung, etwa:

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
| **Choose icon**       | öffnet die Auswahl von Symbol, Emoji oder Monogramm samt Farbe; daneben steht die Vorschau     |
| **Workspace enabled** | „Include this workspace in configuration and task routing.“ Ein neuer Workspace ist aktiviert. |

**Save** prüft die Eingaben. Fehlt etwas oder ist die Farbe ungültig, meldet das Sheet **Check the workspace** mit „Enter a name and a short code, and choose a valid icon color.“ und bleibt offen. Scheitert das Speichern, meldet es **Unable to save settings.** mit „Your changes are still here. Try again.“. **Cancel** und Escape schließen ohne Änderung.

Ein neuer Workspace beginnt mit 20 GB Speichergrenze, ausgeschalteten lokalen GitHub-Actions-Läufen und ausgeschalteter automatischer Bündelung. Beim Bearbeiten bleiben diese Einstellungen und die bisher gewählte Kachel unverändert, solange du sie nicht selbst änderst.

Ein deaktivierter Workspace wird bei Konfiguration und Aufgabenverteilung nicht berücksichtigt, kann nicht mit **Use only this workspace** in den Fokus genommen werden und liefert keine Hinweise zu Repositories oder Speicher in die Mitteilungszentrale.

### Symbol und Farbe wählen

**Choose icon** öffnet **Choose workspace icon** mit einer Vorschau und drei Möglichkeiten:

| Auswahl      | Bedienung und Regel                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Icons**    | Ein vorgeschlagenes Symbol wählen oder mit **Search icons** nach einem verfügbaren Symbol suchen.                                                                                  |
| **Emoji**    | Ein vorgeschlagenes Emoji wählen oder unter **Paste an emoji** genau ein Emoji einfügen. Zusammengehörende Folgen wie Flaggen, Hauttöne und verbundene Emoji zählen als ein Emoji. |
| **Monogram** | Unter **Letters** ein oder zwei Buchstaben oder Zahlen eingeben; Buchstaben erscheinen in Großschreibung.                                                                          |

Für **Icons** und **Monogram** kannst du eine Farbe aus der Palette oder eine eigene Farbe wählen. Die Kachel zeigt das Symbol beziehungsweise die Buchstaben in dieser Farbe auf einem dezent getönten Grund. Emoji behalten ihre eigenen Farben; die Farbauswahl ist dabei ausgeblendet.

**Save icon** übernimmt die gültige Auswahl in den Workspace-Entwurf. Dauerhaft gilt sie erst nach **Save** im darunterliegenden Workspace-Sheet. **Cancel**, Escape oder das Schließen der Symbolauswahl verwerfen deren Änderungen. Brichst du anschließend das Workspace-Sheet ab, wird auch eine bereits übernommene Auswahl verworfen. Ungültige Eingaben zeigen einen Hinweis; **Save icon** bleibt gesperrt.

Die gespeicherte Kachel erscheint im Workspace-Umschalter samt dessen Menü, in der Einstellungsseitenleiste und in der Workspace-Liste. Ohne eigene Auswahl stehen die ersten beiden Zeichen des Kürzels in Großbuchstaben in der bereits gespeicherten Workspace-Farbe; bei einem neuen Workspace ist diese Farbe `#4f6bed`. Kann ein gespeichertes Symbol nicht dargestellt werden, erscheint das Kürzel. Symbol und Farbe gehören auch zum Export und Import des Workspace.

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

Die Werkzeugleiste nennt den Bereich mit dem Namen des Workspace davor, etwa `Personal · Ticket sources, source control, and feedback intake.`. Einstellungen in den Bereichen gelten sofort; Bearbeiten und Anlegen öffnen Sheets, Entfernen fragt in einem Alert-Sheet nach. Beides beschreibt [Einstellungen](../window-and-navigation/settings.md#ändern-und-bestätigen).

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

- [Einstellungen](../window-and-navigation/settings.md)
- [AI-Team](../ai-team/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
- [System](../system/README.md)
- [Orbit](../orbit/README.md)
