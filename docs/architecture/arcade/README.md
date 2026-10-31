# Arcade

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Arcade ist ein optionales Renderer-Feature mit acht lokal gebündelten Spielen, einer Spielauswahl, einer persönlichen Bestenliste und einem sitzungsweisen God mode. Das funktionale Verhalten beschreibt [Arcade](../../project/arcade/README.md).

Garantien:

- Ohne eingeschaltete Präferenz ist keine Arcade-Route erreichbar und kein Navigations- oder Palettenbeitrag sichtbar. Die Präferenz ist standardmäßig aus.
- Die Spielauswahl ist ein statischer Katalog; sie liest keine Orchestrierungsdaten und löst keine IPC-Anfrage aus. Spiele, Titelbilder, Audio und Bestenliste kommen ohne Netzwerkzugriff aus.
- Die Bestenliste speichert nur validierte Ergebnisse beendeter Spiele, höchstens zehn je Spiel. Ein Speicher- oder Lesefehler verhindert weder das Spielen noch die Anzeige des Ergebnisses in der laufenden Sitzung.
- God mode wird nie persistiert und erweitert keine Fähigkeit außerhalb der Spielsimulationen.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Präferenz und ihr Einstellungsbeitrag, Navigationsbeitrag, Routenschutz, Spielauswahl, Bestenlisten-Dialog und -Speicher, God mode, Palettenbeiträge, gemeinsame Pausensteuerung der Spiele.
- Nicht enthalten: Regeln, Simulation, Rendering und Audio der einzelnen Spiele. Jedes Spiel besitzt sie in seinem eigenen Verzeichnis samt README mit Quellen und Treue-Checkliste; die Referenz- und Treueentscheidungen stehen im [FLAMOX365-Referenzvertrag](../frontend-reference-flamox.md). Der Fensterrahmen gehört zu [Fensterrahmen und Navigation](../window-and-navigation/README.md), die Palette zur [Befehlspalette](../command-palette/README.md), die Einstellungsoberfläche zu den [Einstellungen im Hauptfenster](../window-and-navigation/settings.md).

## Verantwortungsgrenzen

| Verantwortung                     | Kanonischer Eigentümer                         | Öffentlicher Vertrag                                                                                    | Verbraucher                                          |
| --------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Präferenz                         | Anwendungseinstellungen (`user.arcadeEnabled`) | `enabled: Signal<boolean>`, `setEnabled(boolean): Promise<boolean>` über den Arcade-Einstellungskontext | Navigation, Routenschutz, Palette, Einstellungskarte |
| Einstellungsbeitrag               | Arcade-Feature im Slot `Appearance`            | Karte `Navigation` mit `Show Arcade` und `God mode`, Sucheinträge                                       | Einstellungen                                        |
| Navigation                        | Arcade-Feature                                 | Eintrag `arcade` mit `isVisible`                                                                        | Seitenleiste                                         |
| Routen                            | Arcade-Feature                                 | `/main/arcade` und acht Kindrouten hinter einem `canMatch`-Schutz                                       | Router, Palette, Spielauswahl                        |
| Katalog und Bestenlisten-Aufruf   | Presenter der Spielauswahl                     | `games: readonly IArcadeGame[]`, `showLeaderboardCommand`                                               | Spielauswahl                                         |
| Ergebnisse                        | `ArcadeLeaderboardStore` (anwendungsweit)      | `entries: Signal<readonly ArcadeLeaderboardEntry[]>`, `add(entry): boolean`                             | Spiele (schreiben), Dialog (liest)                   |
| God mode                          | `ArcadeGodModeStore` (anwendungsweit)          | `sequence`, `progress`, `enabled`                                                                       | Spiele außer Pong, Einstellungskarte                 |
| Pausieren und Eingaben auf Canvas | gemeinsamer Canvas-Controller der Spiele       | Optionen `isActive`, `inputs`, `onInput`, `onTogglePause`                                               | alle acht Spiele                                     |

## Präferenz

- Persistiert als `user.arcadeEnabled: boolean` in den Anwendungseinstellungen. Das Schema setzt für fehlende Werte `false`; die Standardeinstellungen enthalten `false`. Ältere Konfigurationen ohne das Feld bleiben daher gültig und zeigen keine Arcade.
- Lesen: `enabled = settings()?.user.arcadeEnabled ?? false`.
- Schreiben: `setEnabled(next)` schreibt die vollständigen aktuellen Einstellungen mit geändertem `user.arcadeEnabled` über den einzigen Einstellungsschreiber zurück, der `Settings saved.` beziehungsweise `Unable to save settings.` meldet. Sind die Einstellungen noch nicht geladen, wirft der Aufruf, ohne zu schreiben.
- Der Schalter verwendet das Sofortspeichern der Einstellungen (`createImmediateSetting`): Er zeigt den neuen Wert sofort und stellt bei `false` oder einem Fehler den gespeicherten Wert wieder her. Weil die Einstellungen im Hauptfenster liegen, liest die Seitenleiste denselben gespeicherten Stand; die Änderung wirkt ohne Neuladen.

## Einstellungsbeitrag

Die Karte steht im Slot `Appearance` (Reihenfolge 100) als Gruppe `Navigation` (`Choose which optional destinations appear in Symphony.`):

| Zeile         | Sichtbar                   | Inhalt                                                                                                                                                                     |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Show Arcade` | immer                      | primärer Toggle Switch (`test-id="arcade-enabled-toggle"`)                                                                                                                 |
| `God mode`    | nur bei `enabled === true` | die zehn Tasten als Mosaik `Kbd`; die ersten `progress` Tasten in der Variante `success`. Beschreibung: Anleitung, nach Aktivierung `God mode is active for this session.` |

Sucheinträge für **Search settings**: `show-arcade` (Bezeichnung `Show Arcade`, Gruppe `Navigation`, Schlüsselwörter `games`, `arcade`, eigenständiges Steuerelement für die Änderung im Treffer) und `god-mode` (ohne Steuerelement; der Treffer öffnet `Appearance`).

## Navigation und Routen

Navigationseintrag: Schlüssel `arcade`, Beschriftung `Arcade`, Symbol `games`, Route `/main/arcade`, Reihenfolge 60, Gruppe `More`, `isVisible: () => enabled()`. Die Registrierung bleibt bestehen; nur die Sichtbarkeit folgt der Präferenz, ohne Einstellungen zu schreiben.

| Route                            | Inhalt                   |
| -------------------------------- | ------------------------ |
| `/main/arcade`                   | Spielauswahl             |
| `/main/arcade/pong`              | Pong                     |
| `/main/arcade/breakout`          | Breakout                 |
| `/main/arcade/pitfall`           | Pitfall!                 |
| `/main/arcade/pitfall-ii`        | Pitfall II: Lost Caverns |
| `/main/arcade/river-raid`        | River Raid               |
| `/main/arcade/seaquest`          | Seaquest                 |
| `/main/arcade/jungle-hunt`       | Jungle Hunt              |
| `/main/arcade/realsports-boxing` | RealSports Boxing        |

Jede Route wird getrennt nachgeladen. Der gemeinsame `canMatch`-Schutz wartet auf die einmalige Anwendungshydratisierung und prüft erst dann `user.arcadeEnabled === true`; andernfalls liefert er einen UrlTree auf `/main/home`. Ein Lesezeichen auf ein Spiel führt bei ausgeschalteter Präferenz damit zu Overview, bevor eine Spielkomponente geladen wird.

## Spielauswahl

Der Presenter liefert einen festen Katalog in dieser Anzeigereihenfolge:

| `id`                | `title`           | `fullTitle`              | Spieler |
| ------------------- | ----------------- | ------------------------ | ------- |
| `pong`              | Pong              | Pong                     | 2–2     |
| `breakout`          | Breakout          | Breakout                 | 1–4     |
| `pitfall`           | Pitfall!          | Pitfall!                 | 1–1     |
| `pitfall-ii`        | Pitfall II        | Pitfall II: Lost Caverns | 1–1     |
| `river-raid`        | River Raid        | River Raid               | 1–2     |
| `seaquest`          | Seaquest          | Seaquest                 | 1–2     |
| `jungle-hunt`       | Jungle Hunt       | Jungle Hunt              | 1–1     |
| `realsports-boxing` | RealSports Boxing | RealSports Boxing        | 1–2     |

`IArcadeGame` enthält `id`, `title`, `fullTitle`, `cover` (`arcade/<id>.webp`, ein gebündeltes Renderer-Asset), `minPlayers`, `maxPlayers` und den Befehl `play`, der auf `/main/arcade/<id>` navigiert.

Darstellung:

- Werkzeugleiste: Titel `Arcade`, Untertitel `<Anzahl> games`, Aktion `Leaderboard`.
- Überschrift `Choose a game`, Hinweis `A short break while your AI team works. Esc pauses a running game.`
- Liste (`role="list"`) mit einer Karte je Spiel: Titelbild im Seitenverhältnis 16:10 (`contain`, bei Ladefehler Mosaiks Fehlerdarstellung), Titel, Spielerzahl und `Play` mit dem zugänglichen Namen `Play <fullTitle>`.
- Spielerzahl: bei `minPlayers === maxPlayers` `1 player` beziehungsweise `<n> players`, sonst `<min>–<max> players`.
- Raster: höchstens vier gleich breite Spalten, jede mindestens 240 px; schmalere Bereiche umbrechen in weniger Spalten.

## Bestenliste

### Dialog

`Leaderboard` öffnet den Bestenlisten-Dialog über Mosaiks `DialogService` (Breite 52 rem, Höhe 90 dvh, Mindestbreite 20 rem, eigene Abdunklung, Schließen per Klick daneben und Escape, Fußzeile `Close`). Der Dialog erhält beim Öffnen eine Momentaufnahme von `entries()` und zeigt je Spiel einen Abschnitt in der Reihenfolge Pitfall!, Pitfall II: Lost Caverns, Breakout, RealSports Boxing, Jungle Hunt, Pong, Seaquest, River Raid, jeweils mit Rang, spielspezifischen Angaben und eigenem Leerzustand. Kein Spielbildschirm enthält eine Bestenliste.

### Speicher

- Ablage über die Browser-Speicher-Injektion der Anwendung (`BROWSER_STORAGE`, `getItem`/`setItem`) unter `symphony.arcade.leaderboard.v1` als JSON-Array.
- Lesen beim Erzeugen: Werte über 100 000 Zeichen, kein JSON oder kein Array ergeben eine leere Liste. Von den ersten 100 Elementen werden nur schemagültige Einträge mit noch nicht gesehener `id` übernommen. Gültige Einträge des früheren Schlüssels `symphony.arcade.pitfall.records.v1` (höchstens 20 000 Zeichen) werden als `game: 'pitfall'` übernommen.
- Schema: eine diskriminierte Union über `game` (`pitfall`, `pitfall-ii`, `breakout`, `realsports-boxing`, `jungle-hunt`, `pong`, `seaquest`, `river-raid`) mit `id`, `completedAt` und den spielspezifischen Feldern. Pong-Einträge sind nur gültig, wenn der Sieger die gewählte Zielpunktzahl erreicht hat.
- `add(entry)`: verwirft ungültige Einträge (`false`), ersetzt einen Eintrag mit derselben `id` statt ihn zu verdoppeln, rangiert neu und schreibt die ganze Liste. Ohne Speicher oder bei einem Schreibfehler liefert `add` `false`, die neue Rangliste bleibt aber im Speicher der Sitzung sichtbar.
- Rangfolge je Spiel, die besten zehn behalten, absteigend nach: Punktzahl (Pong: Abstand der Punkte, Breakout: beste Teampunktzahl, RealSports Boxing: höhere Punktzahl, sonst `score`); bei Pitfall! danach mehr Schätze und kürzere Zeit, bei Pitfall II mehr Goldbarren und kürzere Zeit; danach höheres Level, wo vorhanden; zuletzt der spätere Abschluss.

Die Spiele schreiben nur beendete Partien; nicht beendete Expeditionen und Matches werden nicht gespeichert. Eine Bestenliste online oder zwischen Computern gibt es nicht.

## God mode

- Folge der `KeyboardEvent.code`-Werte: `ArrowUp`, `ArrowUp`, `ArrowDown`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `ArrowLeft`, `ArrowRight`, `KeyB`, `KeyA`; angezeigt als `↑ ↑ ↓ ↓ ← → ← → B A`.
- Ein App-Initialisierer startet die Erkennung in jedem Renderer-Fenster außer dem Menüleistenfenster (`#/menu-bar`), unabhängig von der Präferenz. Ein `keydown`-Listener in der Capture-Phase des Dokuments verbraucht die Ereignisse nicht.
- Ignoriert werden Tastenwiederholungen und Ereignisse mit Alt, Ctrl, Meta oder Shift sowie jede Taste nach der Aktivierung. Eine passende Taste erhöht `progress` und startet einen Zwei-Sekunden-Timer neu, nach dessen Ablauf `progress` auf 0 fällt. Eine falsche Taste setzt `progress` auf 1, wenn sie der ersten Taste der Folge entspricht, sonst auf 0.
- Nach der zehnten Taste: `enabled = true`, Erfolgsmeldung `God mode activated`, Nachricht `{ kind: 'enabled' }` auf `BroadcastChannel('symphony.arcade-god-mode')`. Ein neu verbundenes Fenster sendet `{ kind: 'query' }`; aktive Fenster antworten mit `enabled`. Empfänger setzen `enabled` und `progress` auf vollständig, ohne erneut zu melden.
- Der Zustand lebt nur im Speicher der Fenster. Spiele außer Pong lesen `enabled` und schalten ihre Simulation entsprechend um. Seit die Einstellungen kein eigenes Fenster mehr haben, ist das Hauptfenster das einzige Fenster mit Erkennung; der Kanal verbindet dann keine zwei Fenster mehr, bleibt aber unschädlich.

## Palette und Pausensteuerung

- Mit eingeschalteter Präferenz und nicht leerer Eingabe liefert Arcade je passendem Spiel einen Befehl `Play <fullTitle>` (Gruppe `commands`, Symbol `games`, Navigation auf `/main/arcade/<id>`); bewertet werden `Play <Titel>` und die Schlüsselwörter `arcade`, `game`, `pinball`. Sonst liefert Arcade nichts (siehe [Befehlspalette](../command-palette/README.md)).
- Der gemeinsame Canvas-Controller schaltet bei `KeyP` oder `Escape` die Pause um, solange das Spiel aktiv ist, gibt dabei gehaltene Eingaben frei und ignoriert Kombinationen mit Alt, Ctrl oder Meta sowie Eingaben in interaktiven Elementen.

## Fehler und Wiederherstellung

| Fehlerfall                                  | Erkennung                      | Sichtbare Folge                                        | Nebenwirkungen                       | Wiederherstellung                       |
| ------------------------------------------- | ------------------------------ | ------------------------------------------------------ | ------------------------------------ | --------------------------------------- |
| Präferenz aus, Arcade-Link aufgerufen       | `canMatch` nach Hydratisierung | Overview                                               | keine; keine Spielkomponente geladen | Präferenz einschalten                   |
| Speichern der Präferenz scheitert           | Einstellungsschreiber          | `Unable to save settings.`, Schalter springt zurück    | keine Änderung der Einstellungen     | erneut umschalten                       |
| Gespeicherte Bestenliste beschädigt         | Länge, JSON, Schema            | ungültige Einträge fehlen                              | keine Reparatur beim Lesen           | neue Ergebnisse überschreiben die Liste |
| Speicher nicht verfügbar oder Schreibfehler | `add` liefert `false`          | Ergebnis bleibt bis zum Beenden sichtbar               | nichts persistiert                   | –                                       |
| Titelbild lädt nicht                        | Mosaik Image                   | Fehlerdarstellung statt Titelbild; `Play` funktioniert | keine                                | –                                       |
| Kein `BroadcastChannel`                     | Feature-Prüfung                | God mode gilt nur im aktivierenden Fenster             | keine                                | –                                       |

## Implementierungsabbildung in Symphony

| Verantwortung                   | Aktueller Pfad oder Symbol                                                                                                                                                                                                 | Beleg                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Komposition                     | `libs/frontend/features/arcade/src/lib/provider/{provideArcadeFeature,withArcadeNavigation,withArcadeSearch}.ts`                                                                                                           | `provideArcadeFeature.spec.ts`, `withArcadeNavigation.spec.ts`           |
| Präferenz und Einstellungskarte | `settings/{createArcadeSettingsContext,ArcadeSettingsViewSlotProvider,ArcadeSettingsCardView,ArcadeEnabledToggleView}*`; Schema `libs/configuration/composition/src/lib/application-settings/ApplicationSettingsSchema.ts` | `createArcadeSettingsContext.spec.ts`                                    |
| Routen                          | `routing/ArcadeRoutes.ts`                                                                                                                                                                                                  | `ArcadeRoutes.spec.ts`                                                   |
| Spielauswahl                    | `views/ArcadeView.*`, `view-presenters/{ArcadeViewPresenter,IArcadeGame}.ts`                                                                                                                                               | `ArcadeViewPresenter.spec.ts`                                            |
| Bestenliste                     | `leaderboard/*`                                                                                                                                                                                                            | `ArcadeLeaderboardStore.spec.ts`, `ArcadeLeaderboardEntrySchema.spec.ts` |
| God mode                        | `god-mode/*`                                                                                                                                                                                                               | `ArcadeGodModeStore.spec.ts`                                             |
| Palette                         | `search/{ArcadeSearchProvider,projectArcadePaletteResults}.ts`                                                                                                                                                             | `projectArcadePaletteResults.spec.ts`, `ArcadeSearchProvider.spec.ts`    |
| Spiele und Canvas-Steuerung     | `games/<id>/`, `games/shared/browser/ArcadeCanvasController.ts`                                                                                                                                                            | Modell- und View-Specs der Spiele, `ArcadeCanvasController.spec.ts`      |
| End-to-End                      | `apps/renderer-e2e/src/arcade-*.spec.ts`, Hilfen `enableArcade.ts`, `launchArcadeApp.ts`                                                                                                                                   | –                                                                        |

## Verifikation und Akzeptanzkriterien

- Bei ausgeschalteter Präferenz fehlt `navigation-arcade`, und `#/main/arcade/pitfall` endet auf `#/main/home` (`arcade-games.spec.ts`).
- Nach dem Einschalten in **Appearance** erscheint `navigation-arcade` im Hauptfenster ohne Neuladen; die Spielauswahl zeigt acht Karten mit geladenen Titelbildern, und jedes `Play` öffnet die Route des Spiels in hellem und dunklem Schema.
- Der Katalog nennt Reihenfolge, Titelbilder und Spielerzahlen wie oben; `Leaderboard` öffnet einen Dialog und navigiert nicht (`ArcadeViewPresenter.spec.ts`).
- Die Bestenliste behält je Spiel zehn Ergebnisse, ersetzt eine wiederholte `id`, übernimmt alte Pitfall-Einträge, ignoriert beschädigte Einträge und behält ein Ergebnis bei fehlendem Speicher für die Sitzung; Ergebnisse überstehen einen Neustart (`ArcadeLeaderboardStore.spec.ts`, `arcade-games.spec.ts`, `arcade-pitfall.spec.ts`).
- God mode aktiviert sich nur nach der vollständigen, ununterbrochenen Folge ohne Modifikatoren, fällt nach zwei Sekunden Pause zurück und erreicht bereits offene und später geöffnete Fenster (`ArcadeGodModeStore.spec.ts`).
- Die Palette bietet `Play …` nur mit Eingabe und eingeschalteter Präferenz an (`projectArcadePaletteResults.spec.ts`).

## Verwandte Dokumentation

- [Arcade](../../project/arcade/README.md)
- [Fensterrahmen und Navigation](../window-and-navigation/README.md)
- [Einstellungen im Hauptfenster](../window-and-navigation/settings.md)
- [Befehlspalette](../command-palette/README.md)
- [FLAMOX365-Referenzvertrag](../frontend-reference-flamox.md)
