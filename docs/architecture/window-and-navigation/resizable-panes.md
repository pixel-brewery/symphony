# Größenveränderbare Bereiche und Scroll-Eingrenzung

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Jede Teilung zwischen Seitenleiste und Inhalt sowie zwischen einer Liste und ihrem Detail- oder Inspektorbereich ist größenveränderbar. Die Person zieht die Trennlinie oder verschiebt sie mit der Tastatur; Symphony merkt sich die Größe je Teilung auf diesem Gerät. Zugleich ist jeder Bereich sein eigener Scrollbereich, sodass Werkzeugleiste, Seitenleiste und Statusleiste nie aus dem Bild geschoben werden. Das funktionale Verhalten beschreibt [Bereiche anpassen und scrollen](../../project/window-and-navigation/resizable-panes.md).

Garantien:

- Jede Teilung hat einen festen Namen, eine Standardgröße und Grenzen. Der primäre Bereich öffnet in der zuletzt gezogenen Größe und ohne gemerkte Größe in der Standardgröße.
- Die Grenzen gelten immer, auch für eine gemerkte Größe, die in einem kleineren Fenster nicht mehr passt; die gemerkte Größe selbst wird dadurch nicht überschrieben.
- Der feste Bereich jeder Teilung behält bei einer Änderung der Fenstergröße seine Pixelbreite; der andere Bereich nimmt die Änderung auf.
- Eine gemerkte Größe ist eine positive ganze Pixelzahl. Fehlender, voller, gesperrter oder nicht vorhandener Speicher kostet nur die gemerkte Größe; Bereiche öffnen dann in der Standardgröße, und es entsteht kein Fehler.
- Weder Scrollen noch eine über den Rand gezogene Textauswahl noch eine Fokusverschiebung kann den Fensterrahmen oder einen Bereich als Ganzes verschieben. Nur die Scrollbereiche innerhalb der Bereiche scrollen, und ein Scrollbereich gibt sein Scrollende nicht an den umgebenden weiter.
- Der Trenner ist eine 1 px hohe Haarlinie in der Linienfarbe des Rahmens ohne Griffsymbol, mit einer 9 px breiten Zieh- und Klickfläche, und per Tastatur bedienbar.

## Geltungsbereich und Nicht-Ziele

- Enthalten: der konsumierte Teilungsvertrag, das Merken der Größe, die Liste der Teilungen mit Standardgrößen und Grenzen, die Gestaltung des Trenners, die Scroll-Eingrenzung von Fensterrahmen und Bereichen, die Kopfzeile der Inbox-Liste und das Scrollen der Seitenleistenziele.
- Nicht enthalten: Inhalte der Bereiche, das Scrollen der Board-Spalten ([Board](../board/README.md)), Drawer und Sheets, das Ein- und Ausblenden der Seitenleiste selbst ([Fensterrahmen und Navigation](README.md#persistierte-darstellungspräferenzen)).

## Verantwortungsgrenzen

| Verantwortung                                        | Kanonischer Eigentümer                                | Öffentlicher Vertrag                                                                                                                              | Verbraucher               |
| ---------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Teilung, Grenzen, Ziehen, Tastatur, Barrierefreiheit | Mosaik-Element `mosaik-split`                         | Slots `start`/`end`; Eigenschaften `position`, `lock`, `min`, `max`, `disabled`; Ereignis `splitReposition`; `positionInPixels`, `updateComplete` | Hauptfenster, Bildschirme |
| Gemerkte Größe                                       | Frontend Core (`PaneSizeDirective`, `PaneSizeMemory`) | `mosaik-split[symphonyPaneSize]` mit `symphonyPaneSize` und `paneSize`                                                                            | alle Teilungen            |
| Lokaler Speicher                                     | Frontend Core (`BROWSER_STORAGE`)                     | Web-Storage-Schnittstelle oder `undefined`                                                                                                        | `PaneSizeMemory`          |
| Trennergestaltung, Clipping der Bereiche             | globales Renderer-Stylesheet des Fensterrahmens       | `mosaik-split[part~='pane-split']` mit öffentlichen Custom Properties und Parts                                                                   | alle Teilungen            |
| Name, Standardgröße, Grenzen, fester Bereich         | der Bildschirm, der die Teilung besitzt               | Bindungen in seiner Vorlage                                                                                                                       | –                         |
| Scrollbereiche innerhalb der Bereiche                | der Bildschirm, der den Bereich besitzt               | Layout-Utilities in der Vorlage                                                                                                                   | –                         |

## Verträge

### Konsumierter Teilungsvertrag (Mosaik `mosaik-split`)

Eine Ersatzimplementierung muss dieselben Eigenschaften liefern:

- Zwei Bereiche (`slot="start"`, `slot="end"`) mit einem Trenner dazwischen, horizontal angeordnet.
- `lock`: `start` macht den Startbereich zum primären Bereich, `end` den Endbereich (Layout, Ziehen und Tastatur sind dann gespiegelt). In beiden Fällen bleibt die Pixelgröße des primären Bereichs bei einer Größenänderung des Behälters erhalten.
- `position`, `min`, `max`: CSS-Längen (Pixel oder Prozent der Behälterbreite) für den primären Bereich. Die Darstellung begrenzt die Größe auf `min` … `max` und auf den Behälter; Ziehen und Tastatur ebenso.
- `disabled`: der Trenner ist nicht fokussierbar und reagiert weder auf Ziehen noch auf Tasten.
- Trenner: `role="separator"`, fokussierbar (`tabindex="0"`), Beschriftung `Resize`, `aria-valuenow` in Prozent. Pfeil links/rechts verschiebt um 1 % der Behälterbreite, mit Shift um 10 %; Home und End springen an die Grenzen.
- `splitReposition` feuert bei jeder Positionsänderung (Ziehen, Tastatur, gesetzte Eigenschaft) mit der Position in Prozent; `positionInPixels` liefert die aktuelle Größe des primären Bereichs in Pixeln.
- `updateComplete` erfüllt sich nach dem ersten Rendern, wenn der Behälter vermessen ist.
- Öffentliche Gestaltungseingänge: Custom Properties `--split-divider-width`, `--split-divider-background-color`, `--split-divider-hit-area`; Parts `panel`, `divider`, `thumb`.

Die Teilungen verwenden keine Einklapplogik (`collapsible`) und keine Rastpunkte der Komponente.

### Größe merken (`PaneSizeDirective`)

- Selektor `mosaik-split[symphonyPaneSize]`.
- Eingaben: `symphonyPaneSize` (Pflicht, eindeutiger Name je Teilung) und `paneSize` (Pflicht, Standardgröße des primären Bereichs in Pixeln). `min`, `max`, `lock` und `disabled` bleiben Bindungen der Teilung selbst.
- Anwenden: Nach dem ersten Rendern – und erneut, wenn sich Name oder Standardgröße ändern – liest die Direktive die gemerkte Größe, ersatzweise die Standardgröße, wartet auf `updateComplete` und setzt erst dann `position = "<n>px"`. Eine früher gesetzte Position würde gegen die Breite 0 aufgelöst und den Bereich zusammengeklappt öffnen.
- Merken: Bei `splitReposition` speichert die Direktive `positionInPixels` unter ihrem Namen, aber erst, nachdem sie die Anfangsgröße angewandt hat. Ereignisse vor diesem Zeitpunkt (die Komponente meldet auch ihre Ausgangsposition) überschreiben die gemerkte Größe nicht. Weil das Ereignis jede Positionsänderung meldet, merkt sich Symphony auch Verschiebungen per Tastatur.
- Bei `lock="end"` ist der primäre Bereich der Endbereich; gemerkt wird also die Breite des Inspektors, nicht die der Liste.

### Speicherformat (`PaneSizeMemory`)

| Eigenschaft   | Wert                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Ort           | Web Storage des Renderers über `BROWSER_STORAGE` (Standard `window.localStorage`), je Gerät und Profil      |
| Schlüssel     | `symphony.pane.<Name>`, etwa `symphony.pane.inbox.list`                                                     |
| Wert          | Dezimalzahl aus Ziffern (`^\d+$`), größer als 0, in Pixeln                                                  |
| Lesen         | jeder andere Wert, ein fehlender Eintrag, ein fehlender Speicher oder eine Ausnahme ergibt „nicht gesetzt“  |
| Schreiben     | gerundet auf ganze Pixel; nicht endliche Werte und Werte ≤ 0 werden ignoriert; Ausnahmen werden verschluckt |
| Versionierung | keine; ein unbekannter oder veralteter Wert gilt als nicht gesetzt                                          |

Die gemerkten Größen sind reine Darstellungspräferenzen. Sie werden nicht mit dem Orchestrator, anderen Fenstern oder Geräten abgeglichen und nicht exportiert.

### Teilungen

| Name                      | Bildschirm    | Startbereich / Endbereich                | Fester Bereich | Standard | Minimum | Maximum | Besonderheit                                                                                                                                               |
| ------------------------- | ------------- | ---------------------------------------- | -------------- | -------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `window.sidebar`          | Hauptfenster  | Seitenleiste / Werkzeugleiste und Inhalt | Start          | 240 px   | 200 px  | 360 px  | Ausgeblendete Seitenleiste: Minimum und Maximum 0 px, Teilung gesperrt, Trennerbreite 0; der Bereich und die Linie verschwinden, die gemerkte Größe bleibt |
| `inbox.list`              | Inbox         | Liste / Detail                           | Start          | 400 px   | 300 px  | 60 %    | –                                                                                                                                                          |
| `pull-requests.inspector` | Pull requests | Liste / Inspektor                        | Ende           | 360 px   | 300 px  | 60 %    | Solange kein Pull Request gewählt ist oder die Liste lädt: Minimum und Maximum 0 px, gesperrt, Trennerbreite 0                                             |
| `actions.workflows`       | Actions       | Workflow-Liste / Inhalt                  | Start          | 220 px   | 180 px  | 40 %    | –                                                                                                                                                          |
| `orbit.inspector`         | Orbit         | Orbit-Diagramm / Inspektor               | Ende           | 340 px   | 280 px  | 50 %    | –                                                                                                                                                          |
| `work-item.inspector`     | Work item     | Hauptbereich / Inspektor                 | Ende           | 300 px   | 240 px  | 50 %    | –                                                                                                                                                          |

Prozentangaben beziehen sich auf die Breite der jeweiligen Teilung. Die Fensterteilung umfasst die Höhe zwischen Fensteroberkante und Statusleiste; die Statusleiste bleibt über die volle Fensterbreite.

### Gestaltung des Trenners

Alle Teilungen tragen `part="pane-split"`. Das Stylesheet des Fensterrahmens setzt dafür ausschließlich öffentliche Eingänge der Komponente und Mosaik-Tokens:

| Eingang                                                 | Wert                                                                          | Wirkung                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `--split-divider-width`                                 | `--mosaik-layout-thickness`                                                   | 1 px Haarlinie wie in den Artboards; ersetzt die frühere linke oder rechte Linie der Bereiche                         |
| `--split-divider-background-color`                      | `--mosaik-scheme-highlight`, bei Hover und Fokus `--mosaik-color-neutral-300` | Linie in der Rahmenfarbe, eine neutrale Stufe dunkler, solange der Zeiger darauf liegt oder sie den Tastaturfokus hat |
| `--split-divider-hit-area` und `::part(divider)::after` | 9 px, mittig über der Linie                                                   | Ziehen und Klicken etwa 4 px beiderseits der Linie                                                                    |
| `::part(thumb)`                                         | nicht dargestellt                                                             | kein Griffsymbol                                                                                                      |
| `::part(panel)`                                         | `overflow: clip`                                                              | siehe Scroll-Eingrenzung                                                                                              |

Die Flächen links und rechts zeichnen keine eigene Trennlinie mehr; Seitenleiste, Inbox-Liste, Actions-Workflow-Liste und die Inspektoren von Pull requests, Orbit und Work item haben ihre frühere Randlinie verloren.

### Scroll-Eingrenzung

- Der Fensterinhalt (`part="window"`) und jeder Bereich einer Teilung verwenden `overflow: clip` statt `overflow: hidden`. Ein Element mit `hidden` bleibt ein Scrollbehälter, den der Browser bei einer über den Rand gezogenen Textauswahl, bei `scrollIntoView` oder bei Fokuswechseln verschiebt; `clip` erzeugt keinen Scrollbehälter, sodass der Rahmen an seiner Stelle bleibt.
- Jeder Bereich bringt seinen eigenen Scrollbereich mit, in der Regel mit `overscroll-behavior: contain`, damit das Scrollende nicht an den umgebenden Bereich weitergegeben wird:

| Bereich                  | Scrollverhalten                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inhalt des Hauptfensters | eigener Scrollbereich unter der Werkzeugleiste (Router-Outlet)                                                                                        |
| Ziele der Seitenleiste   | scrollen für sich, wenn das Fenster zu niedrig ist; Workspace-Umschalter oben sowie Laufpanel und **Settings** unten bleiben stehen                   |
| Einstellungsnavigation   | scrollt unter dem fest stehenden **Search settings**                                                                                                  |
| Inbox-Liste              | Mosaik-Liste: der Filter `All · Decisions · Updates` ist ihre feste Kopfzeile, nur die Einträge scrollen                                              |
| Inbox-Detail             | scrollt für sich und nutzt die volle restliche Breite (die frühere Obergrenze von 760 px entfällt); Innenabstand 28 px oben und unten, 36 px seitlich |
| Pull requests            | Kopfleiste fest, Tabelle scrollt; der Inspektor scrollt für sich                                                                                      |
| Actions                  | Workflow-Liste und Inhalt scrollen je für sich                                                                                                        |
| Orbit                    | das Diagramm wird abgeschnitten statt gescrollt; der Inspektor scrollt vertikal für sich                                                              |
| Work item                | Hauptbereich und Inspektor scrollen je für sich                                                                                                       |

## Zustand und Lebenszyklus

| Zustand            | Eintritt                                             | Erlaubte Operationen                               | Übergang oder Ende                                       |
| ------------------ | ---------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Vermessung         | Teilung wird gerendert                               | keine Speicherung                                  | `updateComplete` erfüllt sich                            |
| Angewandt          | gemerkte oder Standardgröße gesetzt                  | Ziehen, Tastatur; jede Änderung wird gemerkt       | Bildschirm verlassen oder Name/Standard ändern sich      |
| Gesperrt (Größe 0) | Seitenleiste ausgeblendet, kein Pull Request gewählt | keine Bedienung; gemerkte Größe bleibt unverändert | Bedingung entfällt, Bereich erscheint in gemerkter Größe |

Gemerkte Größen haben kein Ablaufdatum und werden nur überschrieben; Löschen der Browserdaten des Renderers entfernt sie.

## Fehler und Wiederherstellung

| Fehlerfall                                                 | Erkennung                  | Öffentlicher Fehler | Nebenwirkungen                    | Wiederherstellung                  |
| ---------------------------------------------------------- | -------------------------- | ------------------- | --------------------------------- | ---------------------------------- |
| Speicher fehlt oder wirft beim Lesen                       | Ausnahme oder `undefined`  | keiner              | Standardgröße                     | –                                  |
| Speicher voll oder gesperrt beim Schreiben                 | Ausnahme                   | keiner              | Größe gilt nur bis zum Verlassen  | –                                  |
| Gespeicherter Wert ungültig (Text, 0, Bruch)               | Formatprüfung              | keiner              | Standardgröße                     | nächstes Ziehen überschreibt ihn   |
| Gemerkte Größe größer als das Maximum im aktuellen Fenster | Begrenzung der Darstellung | keiner              | Bereich erscheint in Maximalgröße | Fenster vergrößern oder neu ziehen |

## Implementierungsabbildung in Symphony

| Verantwortung                    | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                             | Beleg                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Größe merken                     | `libs/frontend/core/src/presentation/{PaneSizeDirective,PaneSizeMemory}.ts`, `libs/frontend/core/src/storage/BrowserStorageToken.ts`                                                                                                                                                   | `PaneSizeMemory.spec.ts`, `apps/renderer-e2e/src/resizable-panes.spec.ts` |
| Fensterteilung und Fensterinhalt | `libs/frontend/presentation/src/lib/views/PresenterView.html`, `WindowSidebarView.html`                                                                                                                                                                                                | –                                                                         |
| Teilungen der Bildschirme        | `libs/frontend/features/home/src/lib/views/{InboxView,OrbitView}.html`, `libs/frontend/features/delivery/src/lib/views/PullRequestsView.html`, `libs/frontend/features/ci/src/lib/actions/views/ActionsView.html`, `libs/frontend/features/work/src/lib/board/views/WorkItemView.html` | –                                                                         |
| Trenner und Clipping             | `apps/renderer/src/styles/overrides/window-chrome.scss` (Abschnitt „Resizable panes“)                                                                                                                                                                                                  | –                                                                         |
| Inbox-Liste als Mosaik-Liste     | `InboxView.{html,scss}`                                                                                                                                                                                                                                                                | –                                                                         |

## Verifikation und Akzeptanzkriterien

- Ohne gemerkte Größe öffnen die Bereiche in ihren Standardgrößen (Seitenleiste 240 px, Inbox-Liste 400 px, Pull-Request-Inspektor 360 px, Workflow-Liste 220 px, Orbit-Inspektor 340 px, Work-Item-Inspektor 300 px).
- Nach dem Ziehen eines Trenners und einem Neustart öffnet der Bereich in der gezogenen Größe; ein ungültiger oder fehlender Eintrag `symphony.pane.<Name>` führt zur Standardgröße.
- Ein Bereich lässt sich weder unter sein Minimum noch über sein Maximum ziehen; mit der Tastatur ebenso.
- Eine Änderung der Fensterbreite verändert die Breite des festen Bereichs nicht.
- Ausblenden der Seitenleiste entfernt Bereich und Linie; Einblenden zeigt sie in der zuvor gemerkten Breite. Ohne gewählten Pull Request gibt es keinen Inspektor und keine Linie.
- Ein Trenner ist mit Tab erreichbar, als `separator` beschriftet, mit den Pfeiltasten verschiebbar und zeichnet keinen Griff.
- Eine Textauswahl, die über den unteren oder rechten Rand eines Bereichs gezogen wird, verschiebt weder Werkzeugleiste noch Seitenleiste; nur der Scrollbereich des Bereichs scrollt.
- In der Inbox bleibt der Filter beim Scrollen der Liste sichtbar; das Detail scrollt unabhängig von der Liste.
- In einem niedrigen Fenster scrollen die Seitenleistenziele, während das Laufpanel sichtbar bleibt.

## Verwandte Dokumentation

- [Fensterrahmen und Navigation](README.md)
- [Einstellungen im Hauptfenster](settings.md)
- [Bereiche anpassen und scrollen](../../project/window-and-navigation/resizable-panes.md)
- [FLAMOX365-Referenzabgleich](../frontend-reference-flamox.md#2026-10-31-settings-in-the-main-window-and-resizable-panes)
