# Feature-Leitfaden

Dieser Leitfaden wird beim Neuaufbau eines Produktfeatures unter `docs/project` verwendet.

## Ordneraufbau

Pro Produktfeature wird ein Ordner angelegt:

```text
docs/project/<feature>/
├── README.md
├── <capability>.md
└── <another-capability>.md
```

Die `README.md` ist der stabile Einstieg. Eine Fähigkeit wird nur dann auf eine eigene Seite aufgeteilt, wenn sie einen eigenen Ablauf, eigene Regeln, Konfiguration oder Sonderfälle besitzt. Verhalten bleibt bei dem Feature, das die Benutzeraktion und das Ergebnis fachlich besitzt.

## Vorlage für einen Feature-Einstieg

```markdown
# <Feature-Name>

<Ein Absatz zu Zweck und fachlichem Nutzen.>

## Was das Feature bietet

- <Fähigkeit als Ergebnis aus Anwendersicht.>

## Akteure und Berechtigungen

| Akteur oder Berechtigung | Möglichkeiten | Einschränkungen |
| ------------------------ | ------------- | --------------- |

## Voraussetzungen

- <Erforderlicher Zustand, Daten, Konfiguration oder Tarifumfang.>

## Hauptablauf

### <Anwendungsfall>

1. <Auslöser oder Benutzeraktion.>
2. <Beobachtbares Systemverhalten.>
3. <Automatische Folgen.>

Ergebnis: <Entstandener Zustand und nächste Möglichkeiten.>

## Konfiguration

| Einstellung | Geltungsbereich | Änderbar durch | Standard | Wirkung und Wirksamkeit |
| ----------- | --------------- | -------------- | -------- | ----------------------- |

## Regeln und Entscheidungen

| Ausgangslage | Aktion oder Ereignis | Systemreaktion | Ergebnis oder Ausnahme |
| ------------ | -------------------- | -------------- | ---------------------- |

## Zustände

| Zustand | Bedeutung | Mögliche Folgezustände |
| ------- | --------- | ---------------------- |

## Sonder- und Fehlerfälle

### <Fall>

- Ausgangslage:
- Systemverhalten:
- Folge:
- Verfügbare Aktion:

## Verwandte Features

- [<Feature>](../<feature>/README.md)
```

Es werden nur Abschnitte verwendet, die konkrete Informationen hinzufügen. Optionale Abschnitte werden nicht mit allgemeiner Prosa gefüllt. Vertiefungsseiten können dieselben Bausteine nutzen, wiederholen aber nicht den Einstieg.

## Qualitätsfrage

Eine Seite ist bereit, wenn Dritte ohne Kenntnis der Quellcode-Struktur beantworten können, was das Verhalten auslöst, was das System automatisch tut, welche Regeln und Konfiguration gelten, welches Ergebnis sichtbar wird und was in Sonderfällen passiert.
