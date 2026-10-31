# AI-Team

Im Bereich **AI team** eines Workspace legst du fest, welche AI-Agenten in diesem Workspace arbeiten und wer welchen Schritt eines Work Items übernimmt. Der Bereich zeigt den Lieferablauf mit dem verantwortlichen Agenten und seinen Backups je Schritt, jeden Agenten als Karte mit Konto, Modell, Aufwand, Verfügbarkeit und Ersatzkonten, und darunter die technische Einrichtung mit Positionen, AI-Diensten und Backup-Reihenfolge. **AI team**, [Skills](../skills/README.md) und [Automation](../automation/README.md) verwenden dieselben fünf Schritte: **AI team** sagt, wer einen Schritt erledigt, **Skills**, wie er erledigt wird, und **Automation**, wie weit er selbstständig laufen darf.

## Voraussetzungen

- Ein AI-Konto (Codex, Claude Code oder OpenCode) wird einmal unter **Connected services** des Workspace verbunden und steht dann allen Agenten dieses Workspace zur Verfügung (siehe [Workspaces](../workspaces/README.md)). Ohne Konto kann kein Agent gespeichert werden.
- Die Kommandozeile des gewählten Kontos muss auf diesem Mac installiert sein. Fehlt sie, bietet das Sheet die Installation mit Homebrew an; ohne installierte Kommandozeile lässt sich der Agent nicht speichern (siehe [Entwicklerwerkzeuge](../developer-tools/README.md)).
- Ist die AI-Anbindung in dieser Installation nicht verfügbar, bleiben **Add an AI agent** und das Bearbeiten von Agenten gesperrt; Lieferablauf und Karten bleiben lesbar.

## Bereich öffnen

| Weg                                                                  | Ergebnis                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| In den Einstellungen einen Workspace öffnen                          | **AI team** ist der erste Bereich, der sich zeigt.                                                         |
| **Open AI team** im Laufpanel des Hauptfensters                      | Die Einstellungen öffnen sich beim **AI team** des aktiven Workspace.                                      |
| Suche nach **Delivery flow**, **Agents** oder **Technical AI setup** | Der Treffer öffnet den Bereich des jeweiligen Workspace.                                                   |
| Link mit `?workspace=<Workspace>&section=team&agent=<Agent>`         | Das Fenster öffnet den Bereich und zusätzlich das Sheet dieses Agenten, sofern er zu dem Workspace gehört. |

Das Öffnen der Einstellungen selbst beschreibt [Einstellungen](../window-and-navigation/settings.md).

## Lieferablauf

**Delivery flow** zeigt die fünf Schritte eines Work Items untereinander und am Ende die Abnahme. Neben jedem Schritt steht der bevorzugte Agent mit Figur, Name und Berufsbezeichnung; nach **then** folgen die Backups in der Reihenfolge, in der sie übernehmen.

| Schritt                  | Wann                                                         | Zugehörige Verantwortung                                |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| **Create**               | Eine Anfrage wird zum Work Item.                             | **Create tickets**                                      |
| **Plan**                 | In **Qualified**, technische Analyse                         | **Plan work**                                           |
| **Implement and verify** | Von **Ready** bis **Progress**: Branch, Pull Request, Checks | **Implement changes**                                   |
| **Fix failed checks**    | Ein Check schlägt auf einem Pull Request von Symphony fehl.  | **Investigate failed checks**, **Repair failed checks** |
| **Address reviews**      | Eine Person kommentiert den Pull Request.                    | **Review changes**                                      |
| **Acceptance**           | Unabhängig geprüft, wartet auf dich                          | immer **You**                                           |

Regeln:

- Ein Schritt nennt jeden Agenten nur einmal. Bei **Fix failed checks** stehen die Agenten beider Verantwortungen hintereinander.
- Hat ein Schritt niemanden, erscheint **Nobody assigned**. Dieser Schritt kann dann von keinem Agenten ausgeführt werden.
- Wer einen Schritt erledigt, ergibt sich aus den Verantwortungen der Agenten (siehe unten). Den Lieferablauf selbst bearbeitest du nicht direkt.

## Agenten

**Agents** zeigt jeden Agenten des Workspace als Karte, geordnet nach seiner frühesten Verantwortung im Lieferablauf: bevorzugte Agenten vor Backups, Agenten ohne Zuständigkeit am Ende. Eine Karte zeigt:

- Figur, Name und Berufsbezeichnung, darunter die Berufsbeschreibung;
- das Konto, mit dem der Agent arbeitet, oder **No AI account**, dazu Modell und `<Aufwand> effort`;
- seine Verantwortungen als Chips;
- die Verfügbarkeit: **Available**, **Backup in use · preferred account out of quota**, **Out of quota** oder **Unavailable**, gegebenenfalls mit `· Intelligence <Wert>`;
- die Ersatzkonten als `Backup: …` oder **No backup account**.

Die Verfügbarkeit beruht auf den Nutzungsfenstern der Konten: Ein Konto ist erschöpft, wenn jedes gemeldete Fenster aufgebraucht ist. Ist das bevorzugte Konto erschöpft, aber ein Ersatzkonto nicht, meldet die Karte **Backup in use · preferred account out of quota**; sind alle erschöpft, **Out of quota**. Ein deaktivierter Agent ist **Unavailable**. Liegen keine Nutzungsdaten vor, gilt der Agent als **Available**.

Unter den Karten steht, sofern Bewertungen vorliegen, `Combined intelligence <Summe> · agent scores added up · intelligence index by Artificial Analysis`. Die Summe addiert die Bewertungen der aktiven Agenten, deren Modell und Aufwand bewertet sind. Steht keine Bewertungsquelle zur Verfügung, erscheint dort einmal der Grund, etwa ein fehlender Zugang oder ein erschöpftes Tageskontingent der Bewertungsquelle.

### Agent hinzufügen oder bearbeiten

**Add an AI agent** (Karte am Ende der Liste) öffnet das Sheet **Add AI agent**, der Stift einer Karte **Edit AI agent**. Das Sheet stellt vier nummerierte Fragen; rechts daneben zeigt **Preview** die entstehende Karte und aktualisiert sie bei jeder Eingabe.

1. **Which AI does this agent use?** – das Konto als Auswahlkarte; gibt es genau ein Konto, ist es vorausgewählt. Danach **Model** und **Effort** als Karten. Für Claude Code stehen **Fable**, **Opus**, **Sonnet** und **Haiku** zur Wahl, für Codex die Modelle, die das angemeldete Konto meldet, für OpenCode die Modelle der Kommandozeile, bei mehreren Anbietern mit Anbieterschaltflächen und ab mehr als zwölf Modellen mit **Filter models**. Meldet das Konto noch keine Modelle, erscheint ein Hinweis mit **Check again**. Ohne Konto erscheint **No AI account connected yet** mit **Connect an AI account**, das das Sheet schließt und unter **Connected services** das Verbinden eines Kontos öffnet.
2. **Who is this agent?** – **Agent name**, **Job title**, **Job description** und **Appearance** mit sechs Figuren (**Blue**, **Mint**, **Orange**, **Violet**, **Spark**, **Loop**).
3. **What does this agent do?** – die sechs Verantwortungen als Ankreuzkarten, jede mit dem Schritt, zu dem sie gehört. Ohne Auswahl erscheint **Choose at least one responsibility**.
4. **What happens when the AI is unavailable?** – jedes weitere Konto des Workspace mit einem Schalter als Ersatzkonto, für ein eingeschaltetes Ersatzkonto **Backup model** und **Backup effort**. Ohne weiteres Konto erklärt **No separate backup account yet**, dass das gewählte Konto der einzige Weg bleibt. **Expert settings** enthält **Routing goal** (Standard **Balanced**, außerdem **Best quality**, **Lowest cost**, **Protect account quotas**, **Most reliable**, **Fixed priority**), **Allowed paths**, **Forbidden paths**, **Maximum changed files** und **Maximum iterations**.

Die Vorschau zeigt Figur, Name (sonst **Unnamed agent**), Berufsbezeichnung (sonst **No job title yet**), Konto, Modell und Aufwand, unter **In the delivery flow** die Schritte der gewählten Verantwortungen (sonst **No step yet**) und unter **When unavailable** das erste Ersatzkonto mit Aufwand (sonst **No backup account**). Kann das gewählte Konto nicht laufen, warnt sie darunter: `<Konto> is not signed in` mit dem Hinweis, sich unter **Connected services** anzumelden, oder `<Kommandozeile> CLI is not installed`.

**Save** bleibt gesperrt, solange **Finish these details before saving** etwas aufzählt:

| Fehlende Angabe                         | Wann                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| **Agent name**                          | Name leer                                               |
| **Job title**                           | Berufsbezeichnung leer                                  |
| **At least one responsibility**         | keine Verantwortung angekreuzt                          |
| **A connected AI account**              | kein Konto gewählt                                      |
| `<Kommandozeile> CLI must be installed` | Kommandozeile des gewählten Kontos fehlt auf diesem Mac |
| **AI model**                            | OpenCode-Konto ohne gewähltes Modell                    |

Ein Konto, das nicht angemeldet ist, sperrt das Speichern nicht; die Vorschau warnt nur. **Install with Homebrew** fragt vorher `Install <Kommandozeile> CLI?` und installiert erst nach Bestätigung; die Schaltfläche ist nur aktiv, wenn Homebrew vorhanden ist und gerade keine andere Installation läuft.

### Was beim Speichern passiert

**Save** speichert den Agenten, seine Position, seine Konten und die Zuständigkeiten in einem Schritt und schließt das Sheet:

- Der Agent wird für jede angekreuzte Verantwortung bevorzugter Agent. Wer sie bisher hatte, rückt als erstes Backup nach, sofern seine Position diese Verantwortung erlaubt.
- Hat der Agent eine Verantwortung abgegeben, übernimmt das erste Backup, dessen Position sie erlaubt. Gibt es keines, steht der Schritt auf **Nobody assigned**.
- Das gewählte Konto ist der erste Ausführungsweg. Die Ersatzkonten folgen in ihrer bisherigen Reihenfolge, neu eingeschaltete dahinter.
- Für die Ausführung eines Schritts nimmt Symphony den Agenten, der dem Work Item bereits verantwortlich zugeordnet ist, sonst den ersten verwendbaren Agenten in der Reihenfolge bevorzugter Agent, dann Backups. Agenten, die deaktiviert sind oder deren Position die Verantwortung nicht erlaubt, werden übergangen.
- Ein neuer Agent erhält Schreibrecht in seinem Arbeitsverzeichnis und die Standardgrenzen: alle Pfade erlaubt, `.git/**`, `.env`, `.env.*` und `**/credentials/**` verboten, höchstens 100 geänderte Dateien und 8 Iterationen.

Symphony meldet **Settings saved.** Schlägt das Speichern fehl, meldet es **Unable to save settings.**; das Sheet bleibt mit deinen Eingaben offen. **Cancel**, Escape und das Schließsymbol verwerfen die Eingaben.

### Agent entfernen

Das Papierkorbsymbol einer Karte fragt `Remove <Name>?`: Symphony entfernt den Agenten, seine Position und seine Ausführungswege; seine Verantwortungen gehen an einen anderen Agenten, dessen Position sie erlaubt, und das AI-Konto bleibt verbunden. **Remove agent** entfernt, **Keep agent** bricht ab.

Statt der Frage erscheint der Hinweis **This agent cannot be removed** mit **OK**, wenn

- der Agent der letzte Agent des Workspace ist, oder
- eine Teams-Feedback-Aufnahme des Workspace eingeschaltet ist und nach dem Entfernen keine Zuständigkeit für **Create tickets** mit zugeordnetem Skill-Paket mehr bestünde. Die Aufnahme verlangt genau diese Zuständigkeit; die Meldung bittet, sie einem anderen Agenten zu geben oder die Aufnahme abzuschalten.

Eine Verantwortung, die keine verbleibende Position erlaubt, hat danach niemanden.

## Technische Einrichtung

**Technical AI setup** ist aufgeklappt und nur lesbar:

- **Positions and permissions** – jede Position mit Recht (**Read only** oder **Worktree write access**), erlaubten Verantwortungen und Beschreibung.
- **Available AI services** – jeder AI-Dienst des Workspace mit Anbieter, Laufzeit, Protokoll, Herkunft der Modelle (**Models from the connected account** oder **Configured models**) und Fähigkeiten.
- **Backup order** – je Agent die Konten in Reihenfolge (`1. <Konto>` …) mit Modell, Aufwand, Qualität, Kostenklasse und **Available** oder **Disabled**, dazu Routing-Ziel, Kostenregel, Sitzungsbindung und Parallelität.

Eine Position mit **Read only** kann nicht implementieren und keine fehlgeschlagenen Checks reparieren; Agenten dieser Position werden für diese Schritte übergangen.

## Rückfragen dieses Bereichs

| Rückfrage                        | Auslöser                                          | Antworten                              |
| -------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `Remove <Name>?`                 | Papierkorbsymbol einer Agentenkarte               | **Remove agent** (rot), **Keep agent** |
| **This agent cannot be removed** | Entfernen des letzten oder unersetzlichen Agenten | **OK**                                 |
| `Install <Kommandozeile> CLI?`   | **Install with Homebrew** im Agenten-Sheet        | **Install with Homebrew**, **Cancel**  |

## Verwandte Features

- [Einstellungen](../window-and-navigation/settings.md) – Öffnen und Verlassen, Suche, Sheets und das Sheet **Build your project team**
- [Skills](../skills/README.md) – wie jeder Schritt arbeitet
- [Automation](../automation/README.md) – wie weit jeder Schritt selbstständig läuft
- [Workspaces](../workspaces/README.md) – AI-Konten unter **Connected services**
- [Entwicklerwerkzeuge](../developer-tools/README.md)
