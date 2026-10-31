# Bereiche anpassen und scrollen

Wo Symphony zwei Bereiche nebeneinander zeigt – die Seitenleiste neben dem Inhalt oder eine Liste neben ihren Details –, kannst du die Breite selbst festlegen. Symphony merkt sich die Breite und öffnet den Bereich beim nächsten Mal wieder so. Jeder Bereich scrollt für sich, sodass Werkzeugleiste, Seitenleiste und Statusleiste immer an ihrem Platz bleiben.

## Breite ändern

1. Zeige auf die feine Linie zwischen zwei Bereichen. Die Linie wird etwas dunkler; du kannst sie ein paar Pixel links oder rechts davon greifen, ein Griffsymbol gibt es nicht.
2. Ziehe die Linie an die gewünschte Stelle.
3. Symphony merkt sich die Breite auf diesem Rechner, getrennt für jeden Bereich, und stellt sie nach einem Wechsel des Bildschirms oder einem Neustart wieder her.

Mit der Tastatur erreichst du die Linie mit Tab. Die Pfeiltasten links und rechts verschieben sie in kleinen Schritten, mit Shift in größeren; Home und End setzen sie an die Grenzen. Auch diese Breite merkt sich Symphony.

## Welche Bereiche sich anpassen lassen

| Bildschirm        | Anpassbarer Bereich                   | Standardbreite | Möglicher Bereich          |
| ----------------- | ------------------------------------- | -------------- | -------------------------- |
| Hauptfenster      | Seitenleiste                          | 240 px         | 200 bis 360 px             |
| **Inbox**         | Liste der Entscheidungen und Updates  | 400 px         | 300 px bis 60 % der Breite |
| **Pull requests** | Inspektor des gewählten Pull Requests | 360 px         | 300 px bis 60 % der Breite |
| **Actions**       | Liste der Workflows                   | 220 px         | 180 px bis 40 % der Breite |
| **Orbit**         | Inspektor neben dem Orbit             | 340 px         | 280 px bis 50 % der Breite |
| Work item         | Inspektor rechts                      | 300 px         | 240 px bis 50 % der Breite |

Vergrößerst oder verkleinerst du das Fenster, behält der anpassbare Bereich seine Breite; der andere Bereich wächst oder schrumpft. Passt eine gemerkte Breite in einem kleineren Fenster nicht mehr, zeigt Symphony den Bereich so breit wie erlaubt und behält die gemerkte Breite für ein größeres Fenster.

## Regeln

| Ausgangslage                                                 | Systemverhalten                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Du hast einen Bereich noch nie angepasst.                    | Er öffnet in seiner Standardbreite.                                                             |
| Die Seitenleiste ist ausgeblendet (**Hide sidebar**).        | Seitenleiste und Linie verschwinden. **Show sidebar** zeigt sie wieder in der gemerkten Breite. |
| In **Pull requests** ist kein Pull Request gewählt.          | Es gibt keinen Inspektor und keine Linie; die Liste nutzt die ganze Breite.                     |
| Die Einstellungen sind offen.                                | Ihre Bereichsliste steht in der Seitenleiste und hat deren Breite.                              |
| Symphony kann die Breite auf diesem Rechner nicht speichern. | Die Bereiche öffnen in ihrer Standardbreite; es erscheint kein Fehler.                          |

## Scrollen

- Werkzeugleiste, Seitenleiste und Statusleiste scrollen nie mit. Auch eine Textauswahl, die du über den Rand eines Bereichs hinaus ziehst, schiebt sie nicht aus dem Bild.
- Jeder Bereich scrollt für sich. Erreichst du das Ende eines Bereichs, scrollt nicht stattdessen der Bereich daneben oder dahinter.
- Ist das Fenster niedrig, scrollen die Ziele der Seitenleiste; das Laufpanel und **Settings** bleiben unten sichtbar.
- In der **Inbox** bleibt der Filter **All**, **Decisions** und **Updates** oben stehen, nur die Einträge darunter scrollen. Die Details des gewählten Eintrags scrollen unabhängig von der Liste und nutzen die ganze verbleibende Breite.
- In **Pull requests**, **Actions** und im Work item scrollen Liste, Inhalt und Inspektor jeweils für sich. Im **Orbit** scrollt der Inspektor für sich, das Orbit-Diagramm daneben bleibt stehen.

## Verwandte Features

- [Hauptfenster und Navigation](README.md)
- [Einstellungen](settings.md)
- [Overview und Inbox](../overview-and-inbox/README.md)
- [Pull Requests](../pull-requests/README.md)
- [Actions](../actions/README.md)
- [Orbit](../orbit/README.md)
