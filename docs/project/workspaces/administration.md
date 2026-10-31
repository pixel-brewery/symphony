# Administration

Der Bereich **Administration** eines Workspace enthält seinen Speicher, die automatische Bündelung und die Aktionen für den Workspace selbst. Die Werkzeugleiste beschreibt ihn mit „Workspace storage, export, and deletion.“. Das gesamte Speicherbild dieses Mac mit allen Workspaces steht unter [System](../system/README.md).

## Speicher

Die Gruppe **Storage** zeigt den von Symphony verwalteten Speicher dieses Workspace als Balken gegen seine Grenze, etwa `4.2 GB of 20 GB · Within limit`. Die Legende nennt jeden Anteil mit seiner Größe und den freien Rest (**Available**):

| Anteil                  | Inhalt                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| **Cloned repositories** | die von Symphony verwalteten Kopien der Repositories                    |
| **Execution worktrees** | die isolierten Arbeitsbäume, in denen Agenten an Work Items arbeiten    |
| **Verification runs**   | Checkouts und Nachweise lokaler Verifikationen                          |
| **Agent runtimes**      | die isolierten Verzeichnisse der Claude-, Codex- und OpenCode-Werkzeuge |
| **Workspace database**  | die Datenbank mit Work Items, Ausführungen und Aktivität                |

Bis eine Messung abgeschlossen ist, steht **Measuring…** mit Platzhaltern an der Stelle des Balkens; Symphony zeigt nie eine ungemessene Summe.

| Belegung der Grenze | Zustand             |
| ------------------- | ------------------- |
| unter 60 %          | `Within limit`      |
| ab 60 %             | `Approaching limit` |
| ab 80 %             | `High usage`        |
| ab 95 %             | `Writes blocked`    |

Bei `Writes blocked` erscheint unter **When the limit is reached** die Meldung **Storage limit reached - new writes are blocked**: Inaktive Workspaces bereinigen oder die Grenze erst anheben, wenn genug freier Platz sicher ist. Neue Arbeit, die in diesen Workspace schreibt, etwa das [lokale Vorbereiten](repositories.md#lokal-vorbereiten), wird dann verweigert. Ab `Approaching limit` meldet die [Mitteilungszentrale](../notifications-and-tray/README.md) den Workspace; **Review storage** führt hierher.

**Maximum workspace size (GB)** legt die Grenze zwischen 2 und 1024 GB fest (neu: 20 GB). Sie gilt, wenn du das Feld verlässt oder Enter drückst. Ein Wert außerhalb des Bereichs oder mit Nachkommastellen wird nicht gespeichert; das Feld zeigt wieder die gespeicherte Grenze, ebenso nach einem Speicherfehler.

## Automatische Bündelung

**Automatically activate safe groups** in der Gruppe **Delivery grouping** ist standardmäßig aus. Vorschläge zur gemeinsamen Auslieferung erscheinen immer auf dem [Board](../board/README.md). Eingeschaltet dürfen vollständig kompatible Work Items ohne zweite Bestätigung einen gemeinsamen Lieferablauf starten. Der Schalter gilt sofort und nur für diesen Workspace.

## Workspace-Aktionen

| Aktion                      | Wirkung                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edit workspace**          | öffnet das Sheet **Edit workspace** mit Name, Kürzel, **Choose icon** für Symbol und Farbe sowie **Workspace enabled** ([Workspace anlegen oder bearbeiten](README.md#workspace-anlegen-oder-bearbeiten)) |
| **Use only this workspace** | „Scope Symphony to …“: Das Hauptfenster zeigt danach nur noch diesen Workspace. Ein deaktivierter Workspace kann nicht so gewählt werden.                                                                 |
| **Export workspace**        | wählt mit **Choose export destination for …** einen Ordner und schreibt dorthin ein Bündel `<name>-<Zeitstempel>.symphony-workspace.json`                                                                 |
| **Delete workspace**        | löscht den Workspace nach Rückfrage; gesperrt, solange es der einzige Workspace ist                                                                                                                       |

Export und Import schließen einander aus; während des Exports zeigt die Schaltfläche ihren Fortschritt.

### Was ein Export enthält

Das Bündel enthält die Konfiguration des Workspace: Workspace einschließlich Symbol, Emoji oder Monogramm und Farbe, Konten ohne gespeicherte Zugangsdaten, Boards, Repositories ohne lokale Pfade und Einrichtungsskripte, GitHub-Actions-Anbindungen, Organisation, Agenten, Team, Lieferablauf, ausgeschaltete Teams-Feedback-Intakes und die geteilten Skills, die das Team verwendet. Auslieferungsziele gehören nicht dazu. Symphony meldet `<Name> exported.` mit „Stored credential fields and machine-local paths were excluded.“ und gegebenenfalls der Zahl der mitgenommenen Skills. Einlesen beschreibt [Workspace importieren](README.md#workspace-importieren).

### Workspace löschen

**Delete workspace** fragt **Delete …?**: Symphony entfernt dauerhaft die Verbindungen, die Ausführungshistorie, die verwalteten Arbeitsbäume und die isolierten Daten der KI-Konten; konfigurierte Arbeitskopien deiner Repositories bleiben erhalten. **Delete workspace** bestätigt, **Keep workspace** bricht ab.

| Ausgangslage                                                                                     | Ergebnis                                                                                                       |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Löschen gelingt                                                                                  | **Workspace deleted.** – Konfiguration und von Symphony verwaltete lokale Daten sind entfernt.                 |
| Ein Entwurf eines Work Items läuft in diesem Workspace                                           | **Unable to delete the workspace.** mit der Bitte, den Entwurf abzuwarten oder abzubrechen                     |
| Verwaltete Arbeitsbäume konnten nicht entfernt werden, etwa weil eine Ausführung sie noch belegt | Das Löschen stoppt mit der Zahl der betroffenen Arbeitsbäume; die Konfiguration des Workspace bleibt erhalten. |
| Gerade wird schon ein Workspace gelöscht                                                         | Das Löschen wird abgewiesen, bis das erste abgeschlossen ist.                                                  |

## Verwandte Features

- [Workspaces](README.md)
- [System](../system/README.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
- [Board](../board/README.md)
