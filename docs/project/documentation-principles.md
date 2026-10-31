# Grundsätze des Produkthandbuchs

Das Produkthandbuch erklärt das überprüfte Verhalten von Symphony. Es richtet sich an Anwender, Produktverantwortliche und Support und kann ohne Kenntnis des Quellcodes gelesen werden.

## Inhalte einer Funktionsbeschreibung

- Der Einstieg beschreibt den Nutzen und die tatsächlich verfügbaren Fähigkeiten.
- Voraussetzungen, Berechtigungen und erforderliche Konfiguration stehen vor dem Ablauf, den sie beeinflussen.
- Abläufe nennen die auslösende Aktion, die automatische Reaktion und das sichtbare Ergebnis. Beschriftungen entsprechen der Anwendung; die Erklärung ist auf Deutsch.
- Regeln unterscheiden verfügbare, gesperrte und noch nicht nutzbare Möglichkeiten. Bedingungen einer externen Bereitstellung werden ausdrücklich genannt.
- Fehlerfälle erklären, was erhalten bleibt und welche Wiederholung oder andere Handlung möglich ist.
- Geplante Funktionen, Vorschläge und nicht überprüfte Garantien werden nicht als bestehende Fähigkeiten dargestellt.

## Aufbau und Pflege

Jede Funktion hat einen eigenen Einstieg und ist nach ihrem Nutzerziel benannt. Vertiefende Seiten gehören zur selben Funktion und werden nur angelegt, wenn sie einen eigenständigen Ablauf erklären. Der [Handbucheinstieg](README.md) verlinkt verwendbare Funktionsseiten.

Aussagen werden gegen die Anwendung, ihre verbindlichen Verträge und geeignete Tests geprüft. Änderungen werden bei der betroffenen Funktion eingearbeitet; veraltete oder widersprüchliche Aussagen werden dort entfernt. Eine reine interne Umstrukturierung verlangt keine künstliche Änderung am beschriebenen Nutzerverhalten.

Quellcodeaufbau, interne Klassen und die technische Realisierung gehören in das [technische Handbuch](../architecture/README.md). Zugangsdaten, private Endpunkte, persönliche lokale Pfade und echte Nutzerdaten gehören in keine veröffentlichte Dokumentation. Lokale Links und Überschriftenziele werden vor Abschluss einer Dokumentationsänderung überprüft.
