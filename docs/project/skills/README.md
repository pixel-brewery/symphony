# Skills

Der Bereich **Skills** zeigt, wie jeder Schritt des Lieferablaufs arbeitet. Jeder Schritt führt eine oder mehrere eingebaute Prozessrollen von Symphony aus. Du kannst die Anweisungen einer Rolle ergänzen, ohne ihre Rechte zu verändern, und einem Schritt ein Skill-Paket für einen optionalen AI-Schritt zuordnen. Die installierten Skill-Pakete, die früher eine eigene Seite hatten, werden hier verwaltet. Wer einen Schritt erledigt, steht unter [AI team](../ai-team/README.md), wie weit er selbstständig läuft, unter [Automation](../automation/README.md).

## Bereich öffnen

**Skills** steht in den Einstellungen unter der Überschrift **Symphony** und gilt nicht für einen einzelnen Workspace. Wege dorthin:

- die Zeile **Skills** in der Seitenleiste der Einstellungen;
- die Suche in den Einstellungen nach **Edit instructions**, **Add skills**, **New skill** oder **Import skill**;
- in der [Befehlspalette](../command-palette/README.md) der Eintrag `Open <Skill> in Settings` zu einem installierten Paket;
- ein früheres Lesezeichen auf die Seite **Skills** des Hauptfensters oder ein Link mit `section=skills`: Die Einstellungen öffnen sich bei **Skills**.

Im Hauptfenster gibt es keinen eigenen Eintrag **Skills** mehr.

## Geltungsbereich

| Was                                     | Gilt für                                                                                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| eingebaute Prozessrollen                | alle Workspaces; sie werden mit Symphony ausgeliefert und versioniert                                                                                                                                                                   |
| deine Ergänzungen einer Rolle           | alle Workspaces dieser Installation                                                                                                                                                                                                     |
| installierte Skill-Pakete               | die gemeinsam genutzten Skills dieser Installation (**Shared**), dazu die Pakete im Ordner `.agents/skills` des Standard-Repositorys des im Hauptfenster gewählten Workspace (**Project**) und eines älteren Skill-Ordners (**Legacy**) |
| Zuordnung eines Pakets zu einem Schritt | das AI-Team jedes eingeschalteten Workspace, in dem jemand für diesen Schritt zuständig ist – dasselbe Team, aus dem Symphony die Skills eines Work Items dieses Workspace nimmt                                                        |

Ein zugeordnetes Paket erscheint im Block seines Schritts, sobald ein Workspace es dort verwendet; haben Workspaces verschiedene Pakete am selben Schritt, zeigt der Bereich das des ersten Workspace. Wählst du ein Paket aus, gilt es danach für alle Workspaces, deren AI-Team den Schritt besetzt hat.

## Aufbau

Ein Satz oben erklärt das Prinzip. Darunter folgt ein Block je Schritt in der Reihenfolge des Lieferablaufs, jeweils mit Symbol, Name und Zeitpunkt des Schritts:

| Schritt                  | Prozessrollen                                                                           | Optionaler AI-Schritt für ein Paket            |
| ------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Create**               | **Create** – **Reads only**                                                             | **Create with AI**                             |
| **Plan**                 | **Analyze** – **Reads only**                                                            | **Analyze with AI**                            |
| **Implement and verify** | **Solve** – **Changes files**, **Publishes pull requests**; **Verify** – **Reads only** | **Implement with AI**                          |
| **Fix failed checks**    | **Diagnose CI** – **Reads only**; **Repair CI** – **Changes files**                     | **Diagnose CI with AI**, **Repair CI with AI** |
| **Address reviews**      | **Address reviews** – **Changes files**, **Publishes pull requests**                    | **Address reviews with AI**                    |

Jede Prozessrolle erscheint als Zeile mit Name, Version (`v…`), Rechten, Beschreibung und dem Stand deiner Ergänzungen: **Built-in instructions only** oder `Built-in instructions · your additions: <n> line(s) added` (gezählt werden nicht leere Zeilen). **Edit instructions** öffnet ihr Sheet.

Ein zugeordnetes Skill-Paket erscheint im Block seines Schritts mit Name, Herkunft (**Shared**, **Project**, **Legacy** oder **Built-in**), Beschreibung, technischem Namen, Anzahl der Ressourcen und Aufrufart (**automatic + explicit** oder **explicit only**). Ein Klick auf den Namen öffnet **Skill details**, **Deactivate** löst die Zuordnung. Hat ein optionaler AI-Schritt kein Paket, zeigt der Block **No skill package** mit `Optional: a package that runs as …` und **Add skill**.

Hat kein Schritt ein Paket, steht am Ende **No installed skills** mit dem Hinweis auf **Add skills**. Konnten die Prozessrollen nicht geladen werden, steht dort **No roles loaded**; das Wiederöffnen der Einstellungen lädt sie erneut.

Die Werkzeugleiste des Bereichs enthält **Refresh installed skills** (Symbol), **Import skill**, **Add skills** und **New skill**.

## Anweisungen einer Rolle ergänzen

**Edit instructions** öffnet das Sheet `<Rolle> · instructions` mit Schritt, Version und Rechten der Rolle. Der Umschalter wechselt zwischen

- **Built-in instructions** – die mitgelieferten Anweisungen, nur lesbar, und
- **Your additions** – deine Ergänzungen in **Additional instructions**; mit diesem Teil öffnet sich das Sheet.

Deine Ergänzungen werden unter den eingebauten Anweisungen angehängt, unter einer Überschrift, die sie als nachrangig kennzeichnet. Sie verfeinern, wie die Rolle arbeitet; sie können ihre Rechte und ihren Ergebnisvertrag nicht erweitern, weil Symphony die Rechte unabhängig von den Anweisungen durchsetzt. Ergänzungen sind auf 20 000 Zeichen begrenzt; Leerraum am Anfang und Ende wird entfernt.

| Aktion     | Wirkung                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Save**   | speichert die Ergänzungen, meldet **Instructions saved.** mit **The role uses them on its next run.** und schließt das Sheet. |
| **Reset**  | entfernt die Ergänzungen; nur möglich, wenn Ergänzungen gespeichert sind.                                                     |
| **Cancel** | schließt ohne Änderung, ebenso Escape.                                                                                        |

Schlägt das Speichern fehl, meldet Symphony **Unable to save the additional instructions.**; das Sheet bleibt mit deinem Text offen.

## Skill-Paket einem Schritt zuordnen

**Add skills** in der Werkzeugleiste oder **Add skill** in einem Schritt öffnet das Sheet **Add skills**. Es listet alle gefundenen Pakete, die noch keinem Schritt zugeordnet sind, als Karten mit Name, technischem Namen, Herkunft, Beschreibung, Ressourcen und Aufrufart. **Search available skills…** filtert nach Name, Beschreibung und Herkunft.

1. In **Use in flow** wählst du den optionalen AI-Schritt. Kommt das Sheet von **Add skill** eines Schritts, ist dessen erster freier AI-Schritt vorgewählt.
2. Ist der Schritt schon belegt, nennt die Karte `Replaces <Paket> in this flow step.`
3. **Activate** ordnet das Paket zu. Das Paket verschwindet aus der Liste und erscheint im Block seines Schritts.

| Ausgangslage                                                                   | Ergebnis von **Activate**                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schritt frei                                                                   | **Skill activated and assigned to the selected flow step.**                                                                                                                                                                                                                        |
| Schritt mit einem anderen Paket belegt                                         | Das neue Paket ersetzt das alte, das damit deaktiviert ist: **Skill assigned to the selected flow step. The previous skill was deactivated.**                                                                                                                                      |
| kein Schritt gewählt                                                           | **Activate** ist gesperrt.                                                                                                                                                                                                                                                         |
| einige Workspaces haben für den Schritt niemanden                              | Das Paket gilt in den übrigen Workspaces; die Erfolgsmeldung nennt die ausgelassenen: `Not attached in <Workspaces>: nobody works on <Schritt> there.`                                                                                                                             |
| in keinem Workspace ist jemand für den Schritt zuständig (**Nobody assigned**) | Nichts ändert sich. Statt einer Erfolgsmeldung warnt **Nobody works on <Schritt>**: `No AI team has someone on <Schritt>. Assign an agent to it under AI team, then attach the skill.` Ohne Workspace mit AI-Team: `Add a workspace with an AI team first, then attach the skill.` |

Jeder optionale AI-Schritt hat höchstens ein Paket, und ein Paket gehört zu höchstens einem Schritt. Die Zuordnung macht den AI-Schritt verfügbar, schaltet aber keine Automatisierung ein; ob Symphony ihn selbstständig ausführt, regelt [Automation](../automation/README.md).

Ohne Treffer zeigt das Sheet **No matching skills**; sind alle gefundenen Pakete zugeordnet, **All discovered skills are active** mit dem Hinweis, ein Paket zu deaktivieren, damit es wieder erscheint.

**Deactivate** an einem Paket löst seine Zuordnung in allen Workspaces sofort und ohne Rückfrage und meldet **Skill deactivated.** Das Paket bleibt installiert und steht wieder in **Add skills**.

## Skill-Paket ansehen und bearbeiten

Der Name eines Pakets öffnet **Skill details**:

- **Use in flow** verschiebt das Paket in allen Workspaces, die den Schritt besetzt haben, in einen anderen optionalen AI-Schritt; ein dort zugeordnetes Paket wird dabei deaktiviert. Für Schritte ohne Zuständigen gelten dieselben Meldungen wie bei **Activate**.
- **SKILL.md** (**Required**) mit **Name**, **Description and trigger conditions** und **Markdown instructions**.
- **agents/openai.yaml** (**Recommended**) mit **OpenAI metadata YAML** für Anzeige und Aufrufregel.
- **Resources** mit Skripten, Referenzen und Assets des Pakets; **Add text resource** legt eine Textdatei unter `references/` an, jede Ressource hat **Package path**, **Kind** (**Script**, **Reference**, **Asset**) und bei Text **Resource content**. Binäre Assets bleiben unverändert erhalten.
- **Save skill** speichert das Paket, meldet **Skill saved.** und schließt das Sheet.

Nur Pakete mit der Herkunft **Shared** sind bearbeitbar. Pakete aus dem Projekt oder aus einem älteren Skill-Ordner sind nur lesbar; **Install shared copy** übernimmt eine Kopie in die gemeinsam genutzten Skills, die du dann bearbeiten kannst. Für **Shared**-Pakete gibt es zusätzlich **Portable package**: **Destination root** wählt einen Ordner, **Export folder** legt das Paket dort ab, **Move to trash** entfernt es nach der Rückfrage `Move “<Name>” to trash?`. Das Paket landet im wiederherstellbaren Papierkorb der gemeinsam genutzten Skills und läuft nicht mehr in seinem Schritt.

## Neues Skill und Import

- **New skill** öffnet dasselbe Sheet als **New skill** mit einer Vorlage (`new-skill`, Beschreibung, Anweisungsgerüst, Metadaten). **Save skill** legt ein **Shared**-Paket an; ein neues Paket ist noch keinem Schritt zugeordnet.
- **Import skill** öffnet das Sheet **Import skill**. **Skill folder path** wählt über die Ordnerauswahl einen Ordner mit `SKILL.md` und Ressourcen; **Import skill** übernimmt ihn als **Shared**-Paket, meldet **Skill imported.** und schließt das Sheet. Ohne gewählten Ordner bleibt die Schaltfläche gesperrt.

Schlägt Speichern oder Import fehl, meldet Symphony **Unable to save skill.** beziehungsweise **Unable to import skill.** mit dem Grund; das Sheet bleibt offen.

## Rückfragen dieses Bereichs

| Rückfrage                 | Auslöser                               | Antworten                           |
| ------------------------- | -------------------------------------- | ----------------------------------- |
| `Move “<Name>” to trash?` | **Move to trash** in **Skill details** | **Move to trash** (rot), **Cancel** |

## Verwandte Features

- [AI-Team](../ai-team/README.md) – wer jeden Schritt erledigt
- [Automation](../automation/README.md) – wann AI-Schritte selbstständig laufen
- [Einstellungen](../window-and-navigation/settings.md)
- [Befehlspalette](../command-palette/README.md)
