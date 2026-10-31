# Arcade

**Arcade** ist eine Sammlung von acht klassischen Spielen für eine kurze Pause, während das AI-Team arbeitet. Arcade ist ausgeschaltet, bis du es in den Einstellungen einblendest. Die Spiele laufen vollständig auf diesem Computer; Ergebnisse bleiben lokal und werden mit niemandem geteilt.

## Arcade einblenden

1. Öffne die Einstellungen und wähle **Appearance** (siehe [Appearance](../system/appearance.md)).
2. Schalte in der Gruppe **Navigation** den Schalter **Show Arcade** ein.

Die Änderung gilt sofort und in allen Fenstern, und Symphony meldet **Settings saved.** In der Seitenleiste erscheint die Gruppe `More` mit **Arcade**, und die Befehlspalette bietet bei passender Eingabe `Play <Spiel>` an (siehe [Befehlspalette](../command-palette/README.md)). Den Schalter findest du auch über **Search settings**, etwa mit dem Suchwort `games`, und kannst ihn direkt im Treffer umlegen.

| Zustand von **Show Arcade** | Seitenleiste                      | Aufruf eines Arcade-Links oder Lesezeichens |
| --------------------------- | --------------------------------- | ------------------------------------------- |
| aus (Standard)              | kein Eintrag, keine Gruppe `More` | Symphony zeigt **Overview**.                |
| ein                         | **Arcade** in der Gruppe `More`   | Die Arcade oder das Spiel öffnet sich.      |

Schlägt das Speichern fehl, meldet Symphony **Unable to save settings.**, und der Schalter springt zurück.

## Ein Spiel wählen

Der Bildschirm **Arcade** trägt in der Werkzeugleiste die Zahl der Spiele (`8 games`) und rechts **Leaderboard**. Darunter steht **Choose a game** mit dem Hinweis, dass **Esc** ein laufendes Spiel pausiert. Jedes Spiel erscheint als Karte mit Titelbild, Titel, Spielerzahl und **Play**; bei schmalem Fenster rücken die Karten in weniger Spalten.

| Spiel             | Spieler |
| ----------------- | ------- |
| Pong              | 2       |
| Breakout          | 1–4     |
| Pitfall!          | 1       |
| Pitfall II        | 1       |
| River Raid        | 1–2     |
| Seaquest          | 1–2     |
| Jungle Hunt       | 1       |
| RealSports Boxing | 1–2     |

**Play** öffnet den Titelbildschirm des Spiels. Mehrere Spieler teilen sich eine Tastatur oder spielen abwechselnd, je nach Spiel.

## Spielen

- Jedes Spiel erklärt seine Steuerung unter **How to play** und hat ein eigenes Menü.
- **Esc** oder **P** pausiert ein laufendes Spiel und setzt es fort.
- **All games** führt zurück zur Auswahl.

## Leaderboard

**Leaderboard** öffnet eine Übersicht **Your best results from every Arcade game.** mit einem Abschnitt je Spiel. Jeder Abschnitt zeigt die zehn besten zu Ende gespielten Partien dieses Spiels, das beste zuerst, mit Punkten oder Spielstand und Datum sowie den Angaben, die zum Spiel gehören (etwa gefundene Schätze, Level, Spieler oder Sieger). Ohne Ergebnis steht dort etwa **No finished games yet.**

- Gezählt werden nur zu Ende gespielte Spiele; ein vorzeitig verlassenes Spiel erscheint nicht. Bei Pitfall II zählen nur vollständig abgeschlossene Expeditionen.
- Die Ergebnisse bleiben auf diesem Computer gespeichert und überstehen einen Neustart von Symphony.
- Kann Symphony ein Ergebnis nicht speichern, läuft das Spiel trotzdem weiter; das Ergebnis bleibt bis zum Beenden sichtbar.
- **Close**, **Escape** oder ein Klick neben die Übersicht schließen sie.

## God mode

Solange Arcade eingeblendet ist, zeigt **Appearance** unter **Show Arcade** die Zeile **God mode** mit einer Tastenfolge (↑ ↑ ↓ ↓ ← → ← → B A). Tippe die Tasten nacheinander ohne Umschalt-, Steuerungs-, Wahl- oder Befehlstaste; jede richtige Taste wird grün markiert. Nach zwei Sekunden ohne passende Taste beginnt die Folge von vorn. Die Folge wird in jedem Symphony-Fenster außer dem Menüleistenpanel erkannt, auch während Arcade ausgeblendet ist.

Nach der letzten Taste meldet Symphony **God mode activated**, und die Zeile sagt **God mode is active for this session.** God mode gilt für die laufende Sitzung in allen Fenstern, auch in später geöffneten, und wirkt in allen Spielen außer Pong. Nach einem Neustart von Symphony ist er wieder aus.

## Verwandte Features

- [Einstellungen im eigenen Fenster](../window-and-navigation/settings-window.md)
- [Appearance](../system/appearance.md)
- [Hauptfenster und Navigation](../window-and-navigation/README.md)
- [Befehlspalette](../command-palette/README.md)
