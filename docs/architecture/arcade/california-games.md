# California Games (Atari Lynx)

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel, Umfang und Treuevertrag

California Games ist eine vollständig lokale, sandboxfähige Rekonstruktion der Atari-Lynx-Fassung von 1989. Sie stellt den sichtbaren Cartridge-Ablauf, vier Disziplinen, die dokumentierten Steuerungen und Zeitlimits, ereignisbezogene Top-3-Tafeln, Lynx-Farben, skalierte Sprites und synthetisiertes Vierkanal-Audio bereit. Ein ROM, Emulator, Original-Sample, Netzwerklaufzeit oder Node.js-Zugriff ist weder Voraussetzung noch Bestandteil.

Verbindliche Grenzen der Treue:

- Das originale Handbuch und die Lynx-Hardwareverträge bestimmen Ablauf, Steuerung, bekannte Punktregeln, Auflösung, Farbmodell, Spritefähigkeiten und Audioarchitektur.
- Öffentlich nicht dokumentierte Physikkonstanten, Streckenkoordinaten, Spritebytes, Kollisionsmasken, Noten/Registerfolgen und mehrere Punktdetails sind kalibrierte Rekonstruktionen. Die Implementierung behauptet keine Byte-, Frame-, Register- oder Cycle-Identität.
- Die Originalfarben im Spielfeld sind ein bewusstes **Differ** zum älteren monochromen Symphony-Arcade-Muster. Anwendungskopf, Bedienung, Anleitung und Fehlerzustand bleiben Mosaik Soho.
- Das Original verbindet je Spieler eine Lynx und ein Modul über ComLynx. Symphony adaptiert ein bis zwei Spieler auf eine gemeinsame Tastatur und einen Renderer. Ein serielles Netzwerkprotokoll wird nicht simuliert.

## Verantwortlichkeiten und Abhängigkeiten

| Fähigkeit                  | Eigentümer                                                 | Garantie                                                                              |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Zustandsautomat und Regeln | deterministisches, browserfreies Spielmodell               | gleicher Startzustand und gleiche Eingaben erzeugen gleiche Frames und Ergebnisse     |
| Logisches Bild             | indexierte Lynx-Oberfläche                                 | genau 160 × 102 logische Pixel, ein 4-bpp-Palettenindex je Pixel, begrenztes Zeichnen |
| Szenenprojektion           | game-lokaler Renderer                                      | vollständige Szene aus einem unveränderlichen Snapshot; keine Regelmutation           |
| Klang                      | game-lokaler Audioadapter                                  | vier mono gemischte Stimmen, Musik-/Effekt-Deduplizierung, Audio nur nach Geste       |
| Browserlebenszyklus        | gemeinsamer Arcade-Canvas-Controller und geschlossene View | Resize, Animation Frame, Tastatur, Fokusverlust, Pause, Audio und Disposal            |
| persistente Ergebnisse     | Arcade-Leaderboard                                         | validierte Einzelresultate, beste drei pro Disziplin                                  |
| Katalog und Route          | Arcade-Feature                                             | lazy Route `/main/arcade/california-games`, gebündeltes Cover, kein Runtime-Netzwerk  |

Die Spiel-View ist eine isolierte `.ts`/`.html`/`.scss`-Einheit und besitzt Commands und Signals direkt. Ein Game-ViewPresenter ist absichtlich nicht vorhanden. Modell, Renderer und Audio bleiben getrennte game-lokale Module, weil nur der Browserlebenszyklus zwischen den Arcade-Spielen stabil geteilt wird. Aus einem einzelnen Lynx-Titel wird keine globale Emulator- oder Konsolenabstraktion abgeleitet.

## Modell- und Zeitvertrag

Das Modell arbeitet intern mit festen Schritten von `1000 / 60` Millisekunden. `update(elapsed)` akzeptiert nur nichtnegative Zeit und übernimmt pro Browserframe höchstens 250 Millisekunden; dadurch verursacht ein angehaltener Renderer keine unbeschränkte Aufholschleife. `step()` stellt denselben einzelnen 60-Hz-Schritt für deterministische Hosts und Tests bereit. Im pausierten Zustand ändern beide Aufrufe keinen Spielzustand.

Der unveränderliche Snapshot enthält:

- `status`: `running` oder `paused`;
- `phase`: `intro`, `title`, `menu`, `countdown`, `playing`, `event-over`, `high-scores`;
- monotonen Framezähler, Spielerzahl, ausgewählte und laufende Disziplin;
- `flipped`, `godMode`, Countdown, Musikprogramm und monotone Musik-ID;
- monotone Ergebnis-ID, letzte Spielerresultate, vier Top-3-Tabellen und Hervorhebungen;
- eine diskriminierte `eventState`-Union mit genau den Zustandsfeldern der laufenden Disziplin;
- geordnete Soundereignisse mit monotoner ID.

Zustandsfolge:

| Ausgang       | Auslöser                      | Folge                                                   |
| ------------- | ----------------------------- | ------------------------------------------------------- |
| `intro`       | 150 Frames oder A/B           | `title`                                                 |
| `title`       | A/B                           | `menu`                                                  |
| `menu`        | Hoch/Runter                   | Auswahl zyklisch ändern                                 |
| `menu`        | A/B                           | Eventzustand anlegen, Musik wechseln, `countdown`       |
| `countdown`   | 180 Frames                    | `playing`                                               |
| `playing`     | Zeit, Ziel oder Ausfallgrenze | Ergebnisse rangieren, Ergebnis-ID erhöhen, `event-over` |
| `event-over`  | 105 Frames                    | `high-scores`                                           |
| `high-scores` | nach 30 Frames A/B            | Event freigeben, `menu`                                 |

`startNewGame({players})` startet am Intro, setzt Eingaben, Event und Bildschirmdrehung zurück und erhält die sitzungsbezogenen Top-3-Tabellen. `releaseInputs()` entfernt gehaltene und flankengesteuerte Eingaben atomar. `setGodMode()` verändert ausschließlich die Schadens-/Ausfallbehandlung. Pause ohne Option hält an oder setzt fort. Gehaltenes Option 1 plus Pause startet am Titel neu; Option 2 plus Pause dreht Bild und Richtungsinterpretation um.

## Eventverträge

### BMX

Zeitlimit 90 Sekunden, perspektivischer 2.800-Einheiten-Parcours und deterministische Hindernisliste. Hoch beschleunigt, Runter bremst, Links/Rechts lenken, A springt oder beendet eine Crashpause, B erhöht die Rotation in der Luft. Landungen werten volle Rotationen mit 10/50/100/200 Punkten; Hindernisse können springen, Punkte geben oder einen Crash auslösen. Das Ziel addiert verbleibende Sekunden und danach 25 Prozent des bis dahin erzielten Ergebnisses. Ohne God mode kostet ein Crash Zeit, aber kein Leben.

### Surfing

Zeitlimit 90 Sekunden. A startet vom Wartezustand und verengt gehaltene Kurven; Links/Rechts ändern den Winkel. Fahrtdauer, Richtungswechsel, Tube-Nähe und Aerials erhöhen die Punkte. Vier 360er geben 600, fünf 1.200 Punkte. Außerhalb des sicheren Winkel-/Wellenbereichs entsteht ein Wipeout; nach drei Wipeouts im Einzelspieler oder sechs im Zweispieler endet der Surfer. God mode begrenzt Position und Winkel, ohne einen Wipeout zu zählen. Die Pelikanprojektion erscheint in der Schlussphase.

### Half Pipe

Zeitlimit 75 Sekunden, Ende nach drei Stürzen. A oder B startet aus der Warteposition, rhythmisches Hoch pumpt, A löst Kick Turn oder Aerial aus, gehaltenes B am Rand einen Handplant. Dauer und Risiko bestimmen die rekonstruierten Punkte. Die Position in der Pipe projiziert Bewegungsbahn und dynamische Spriteskalierung; Option 2 bleibt zusätzlich als sichtbare Skalierungsreferenz erhalten. Nach einem Sturz kehrt der Spieler an den Rand zurück; God mode unterdrückt das endgültige Aus.

### Foot Bag

Zeitlimit 90 Sekunden. Links/Rechts bewegen, Hoch springt, Runter dreht, A startet und wählt lageabhängig Kick, Kopfstoß oder Catch; B kann im Zweispieler trippen. Bag-Position und -Geschwindigkeit laufen deterministisch. Erfolgreiche Aktionen erhöhen eine höchstens 1.000 Punkte große Kombination und addieren sie zum Gesamtwert; ein Drop setzt die Kombination zurück. Turn, Head, Catch, Heel Lift, Möwenschnabel und Trip verwenden die dokumentierten Boni. Wiederholungen und die Folgen Half Axle, Full Axle, Horseshoe, Jester, Double Arch und Doda erhöhen den Kombinationswert. God mode fängt einen sonst fallengelassenen Bag wieder ein.

## Renderingvertrag

Die logische Oberfläche speichert 16-Bit-Positionen nicht im Canvas, sondern genau einen Palettenindex pro Pixel. Öffentliche Primitive begrenzen jeden Schreibzugriff und stellen Pixel, Rechteck, Linie, Sprite mit transparenter Null, horizontales Spiegeln, X/Y-Skalierung, Scherung, Checker-Transparenz und Kollisionsmasken bereit. Der Renderer verändert nur seine wiederverwendete Oberfläche.

Jeder Frame wird vollständig aus dem Snapshot aufgebaut: Epyx-Intro, Titel, Strandmenü, Highscores, vier Events sowie Countdown-, Pause- und Event-over-Einblendung. Die Palette besitzt 16 aus dem Lynx-Look abgeleitete RGBA-Farben. Erst an der Browsergrenze wird ein ImageData erzeugt. Bei `flipped` wird die logische Ausgabe um 180 Grad gedreht. Ein 160 × 102 Offscreen-Canvas nimmt die RGBA-Daten auf; der sichtbare Canvas deaktiviert Interpolation und skaliert auf die komplette verfügbare Fläche unter dem Header. Resize bleibt Eigentum des gemeinsamen Controllers.

Wenn kein 2D-Kontext verfügbar ist, setzt die View ausschließlich den sichtbaren Fehlerzustand; Simulation und Navigation bleiben sicher. Renderer und Modell greifen weder auf DOM noch auf IPC zu; nur `draw` kennt den Canvas.

## Audiovertrag

Eine Stimme erzeugt bei 240 Sequenzschritten pro Sekunde Ton oder Rauschen aus Frequenzteiler, 12-Bit-LFSR, Integrationsmodus und vorzeichenbehafteter Lautstärke. Vier identische Stimmen werden auf einen begrenzten Mono-Puffer gemischt. Musikprogramme bestehen aus geordneten Noten-/Rauschereignissen und werden für Titel, Highscores und jede Disziplin als Schleife gerendert. Effekte liegen für Menü, Countdown, Sprung, Landung, Crash, Wipeout, Fall, Kick, Punkt, Ziel und weitere Ereignisse vor.

Der Browseradapter erzeugt den `AudioContext` erst nach einer Nutzeraktion, besitzt einen Master-Gain, cached PCM-Puffer und startet genau ein Musikprogramm. `musicId` erlaubt einen bewussten Neustart desselben Programms. Sound-IDs verhindern doppelte Effekte bei mehreren Draws desselben Snapshots. Pause stoppt Musik und Effekte und suspendiert den Context; Resume startet bei laufendem Modell neu. Mute setzt nur den Master-Gain. Reset löscht Phasen-/ID-Zustand, Dispose trennt alle Nodes und schließt den Context. Fehler beim Erzeugen, Resumen, Suspendieren oder Schließen beeinflussen die Simulation nicht.

## View, Eingabe und Ergebnisse

Der gemeinsame Canvas-Controller liest die dokumentierten Tastencodes. Spieler 1 verwendet Pfeile, Z/X und Q/E; Spieler 2 W/A/S/D, F/G und R/T. Die View dekodiert nur Spieler und Lynx-Schalter und übergibt beide an das Modell. P/Escape ruft den originalen Pausevertrag auf. Fokusverlust pausiert ohne Option-Chord, gibt Eingaben frei und suspendiert Audio. Die Anleitung pausiert nur ein zuvor laufendes Spiel und stellt genau diesen Zustand wieder her. Navigation und Zerstörung geben Eingaben sowie Browserressourcen frei.

Bei einer neuen `resultId` schreibt die View jeden Eintrag aus `latestResults` genau einmal. Der persistierte Vertrag lautet:

```text
{
  id: non-empty string,
  game: "california-games",
  completedAt: ISO date-time,
  event: "bmx" | "surfing" | "half-pipe" | "foot-bag",
  score: integer 0..1_000_000,
  player: 1 | 2,
  players: 1 | 2,
  elapsedSeconds: finite 0..90
}
```

Die verstrichene Zeit ist Eventlimit minus verbleibendem Timer. Der gemeinsame Speicher sortiert Punkte absteigend, Zeit bei Gleichstand aufsteigend und behält drei Einträge je Disziplin. Fehler oder fehlender Browser-Speicher verhindern den Spielfluss nicht; der Store behält ein valides Ergebnis mindestens für die Sitzung.

## Quellen, Assets und Offlinegarantie

Das Originalhandbuch und die Lynx-Hardwarereferenz sind Entwicklungsnachweise, keine Runtime-Abhängigkeiten. Das Cover wird mit unveränderten Abmessungen als WebP gebaut; Quelle, Original, Hash und Konvertierung stehen in `resources/arcade/README.md`. Der Renderer kopiert nur das WebP in das Anwendungspaket. Screenshots, Handbuch und Internetquellen werden nicht ausgeliefert oder zur Laufzeit geladen.

## Fehler- und Wiederherstellungsverhalten

| Fehler                  | Wirkung                                | Erhaltener Zustand                      | Wiederherstellung                                       |
| ----------------------- | -------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Canvas-Kontext fehlt    | sichtbarer Fehler statt Spielbild      | Route und Navigation                    | zu Arcade zurückkehren oder Renderer neu starten        |
| Audio ist gesperrt      | kein Ton                               | vollständiges Spiel                     | erneut mit sichtbarer Nutzeraktion aktivieren           |
| Fokus geht verloren     | Spiel pausiert, Tasten frei, Audio aus | kompletter Snapshot                     | P/Escape oder weiterführende Aktion                     |
| Persistenz schlägt fehl | Ergebnis nicht dauerhaft gespeichert   | Ergebnis in Sitzung und Cartridge-Top-3 | weiter spielen; späteres Ergebnis kann erneut speichern |
| große Frame-Lücke       | höchstens 250 ms werden aufgeholt      | deterministischer Zustand               | reguläre Frames laufen weiter                           |

## Verifikation und Akzeptanz

- Modelltests müssen jede Zustandskante, beide Spieler, Pause/Option-Chords, Flip, God mode, Zeitlimits, Ausfallgrenzen, dokumentierte Punktwerte und Top-3-Rangierung deterministisch belegen.
- Renderer-/Oberflächentests müssen 160 × 102, Palettenindices, Begrenzung, Spriteoperationen, alle Phasen, alle Events und gedrehte Ausgabe belegen.
- Audiotests müssen vier Stimmen, feste Wiedergabelängen, LFSR/Integrate, Programme, Effekte, ID-Deduplizierung, Mute, Pause, Reset und Disposal ohne echten Audioausgang belegen.
- Viewtests müssen Browserinput, Zwei-Spieler-Neustart, pausenerhaltende Anleitung, genau einmal geschriebene Ergebnisse und Ressourcenfreigabe belegen.
- Die Electron-Reise muss die Route aus dem Katalog öffnen, das originale Menü bedienen, ein Event starten, Pause/Flip/Anleitung/Ton/Zwei-Spieler-Wechsel prüfen und die vollflächige Canvas-Geometrie bestätigen.
