# Orbit: astronomische 3D-Arbeitslandschaft

Stand: 2026-10-09. Die Recherche nach der erneuten Rückmeldung des Nutzers ist
inzwischen Grundlage der **integrierten 3D-Ansicht im Originalprojekt Symphony**.
Dieses Dokument bewahrt die damaligen Befunde, Technikvergleiche und Entwurfsoptionen.
Das tatsächlich umgesetzte Verhalten und seine Prüfzuständigkeiten stehen in
[Production orbit](production-orbit.md). Es gibt weiterhin keinen vergleichenden
Engine-Benchmark oder ein gemessenes Bildratenversprechen.

Produktkorrektur vom 10.10.2026: Im Orbit werden vorerst keine Mitarbeiter
angezeigt. Figuren, Mitarbeitergruppen, Übergaben und die Mitarbeiterkategorie
im Explorer entfallen dort. Team und Stages bleiben die Arbeitsansichten für
Mitarbeiter; ihre gespeicherten Figuren und Zustände bleiben erhalten. Frühere
Figurenentwürfe in diesem Forschungsdokument beschreiben den überholten Vorschlag.

## Entscheidung und verbindliche Richtung

Orbit soll eine echte, räumlich erfahrbare **3D-Hauptansicht** werden: Sonne,
Planeten beziehungsweise Auslieferungsziele, Umlaufbahnen, räumlicher Ticketgürtel,
Perspektive, Beleuchtung und Kamerafokus. Eine schräg projizierte Sammlung
gewöhnlicher Karten erfüllt dieses Ziel nicht. Die frühere Empfehlung einer
vorrangigen D3-/SVG-Ansicht mit optionalem 3D ist durch die Nutzerentscheidung überholt.

**Umgesetzt: das bereits installierte Three.js 0.186.1 für eine vollständige
WebGL-Szene verwenden.** Angular bleibt für Anwendung, Beschriftungen,
Suche und Bedienung zuständig. Babylon.js und PlayCanvas sind
geeignete Alternativen; ein Wechsel bringt bisher keinen belegten Vorteil für
die benötigten Fähigkeiten.

Soho bleibt die aktuelle Designbasis von Shell, Einstellungen, Board und
Bedienflächen, nachweisbar in DESIGN.md und ShellConfig.ts. Seit der Korrektur
vom 10.10.2026 übernimmt auch der 3D-Viewport das aktive helle oder dunkle
Seitenschema vollständig. Eine separate dunkle Szene ist nicht mehr vorgesehen.
Mosaik wird nicht verändert.

## Produktintegration und historischer Prototyp

`/main/orbit` lädt jetzt den Symphony-eigenen `OrbitCanvasComponent` mit echter
PerspectiveCamera, WebGL-Sonne, Zielkörpern, gekippten Bahnen, InstancedMesh-Tickets
und nativer Auswahl. Die reine Projektion `projectOrbitScene` verwendet dieselben
Aufträge und Auslieferungsnachweise wie die vorhandenen
Stores. Overview bleibt unter `/main/home` ein eigener Hauptpunkt; Team, Stages
und Einrichtung sind über das Workspace-Menü erreichbar. Die doppelte lokale
Navigation, der Spatial-Schalter und das untere Ticketgrid sind entfernt.

Die Integration verwendet unabhängige ID-basierte Weltpositionen und sechzehn
räumliche Ticketsektoren. Neue IDs verschieben vorhandene Tickets nicht. Ein
Ticket behält seinen Arbeitsort; bestätigte Auslieferungsorte werden als separate
Beziehungen gezeigt. Bei mehreren Production-Zielen bleibt die Sonne ein zentraler
Verbund mit einzeln erreichbaren Zielkörpern. Der bei Bedarf geöffnete Explorer
bietet Tickets und Ziele mit denselben IDs und Befehlen an.

Die tatsächliche Electron-Reise prüft 1.000 Tickets bei 25 konfigurierten Mitarbeitern,
200 Actions-Jobs,
native GPU-Auswahl, Kamera, wiederholten Fokus, WebGL-Kontextverlust und
Wiederherstellung. Sie verwendet ausdrücklich deterministische Provider-/CLI-
Fixtures. Ein externer Produktionsdeploy und ein geräteübergreifender
Leistungsbenchmark werden dadurch nicht behauptet.

Der damalige eigenständige Three.js-Konzeptprototyp hatte eine WebGL-Szene sowie
Zoom, Suche und Auswahl. Seine **551 Demo-Tickets waren illustrative Daten**;
auch dargestellte Ziele und Auslieferungsstände waren keine Live-Nachweise.
Die optionalen lokalen Dateinamen waren
`output/orbit-research/orbit-3d-concept.html` und
`output/orbit-research/orbit-3d-runtime-check.json`. Diese ignorierten
Forschungsartefakte und ihr ad hoc ausgeführter Browsercheck gehören nicht zum
getrackten Quellstand und sind in einem frischen Checkout nicht verfügbar.
Die Produktintegration verwendet sie nicht als Laufzeit oder Datenquelle.

Die historische Abnahme hielt 551 Instanzen, keinen horizontalen Overflow und
kein Startblick-Clipping bei 1024/736/320 Pixel Breite, Instanzklick,
Zoom/Drag/Pinch, Auswahl, stabile Label-Fokus-ID und Reduced Motion bei leerem
`runtimeErrors`-Array fest. Diese Aufzeichnung ist kein heute nachprüfbarer
Archivnachweis und belegt weder die Produktintegration noch eine bestimmte
Bildrate oder das Leistungsbudget des fertigen Produkts.

Für eine reproduzierbare Prüfung der aktuellen Produktansicht die im Lockfile
festgelegten Abhängigkeiten installieren, `yarn build` und anschließend `yarn e2e`
ausführen. Die getrackten Electron-Reisen
[orbit-redesign.spec.ts](../../apps/renderer-e2e/src/orbit-redesign.spec.ts) und
[orbit-appearance.spec.ts](../../apps/renderer-e2e/src/orbit-appearance.spec.ts)
definieren die deterministischen Daten, WebGL-Interaktionen und aktuellen
Screenshot-Ausgaben. Die
[Playwright-Konfiguration](../../apps/renderer-e2e/playwright.config.ts) besitzt
die isolierten CLI-Fixtures und die serielle Ausführung. Diese Prüfung erzeugt
aktuelle lokale Evidenz und stellt den historischen Konzeptprototyp oder seine
damaligen JSON-Ergebnisse nicht wieder her.

## Historischer Befund im Original und in den Screenshots

Die folgende Tabelle beschreibt den Stand vor der 3D-Integration. Die entfernte
Scheinprojektion und das untere Grid gehören nicht mehr zur Orbit-Laufzeit.

Der erste Screenshot zeigt 551 Tickets, eine einzelne Zusammenfassung „Not
delivered“, eine kleine Production-Karte ohne bestätigten Stand und verstreute
Figuren. Große Teile der Fläche bleiben leer. Unten stehen paginierte,
abgeschnittene Ticketzeilen. Eine lokale Navigation wiederholt Board und Overview
unter der Hauptnavigation. „Connect a project“ führt zur Einrichtung, die der
zweite Screenshot zeigt.

„No confirmed destination“ beweist im Screenshot allein nicht, dass keine Ziele
konfiguriert sind. Fehlende Konfiguration, fehlender Nachweis und fehlgeschlagene
Nachweisabfrage müssen getrennt untersucht und dargestellt werden.

| Eigentümer                                   | Verifiziertes Problem                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LandscapeCanvasComponent.html                | Ziele, Gruppen und Tickets sind gleichartige 11 rem breite Mosaik-Karten; fester 2.000-Pixel-Raum, keine Sonnengestalt.                                              |
| projectLandscape.ts                          | ID-Winkel ohne Kollisionslösung; Radiusbegrenzung kann Ziele auf dieselbe Bahn legen; bei mehreren bestätigten Orten bestimmt der erste Nachweis die Ticketposition. |
| projectLandscape.ts, Gruppierung             | Mehr als 30 Tickets werden aggregiert; geöffnete Gruppen zeigen 20 Objekte bei 40er-Seitenschritten. Annäherung erschließt damit nicht alle lokalen Tickets.         |
| projectLandscape.ts, Mitarbeiter             | Position nach Listenindex auf Radius 940 statt an tatsächlicher Arbeit.                                                                                              |
| projectSpatialScene.ts                       | OrthographicCamera und Matrixprojektion liefern erneut DOM-Positionen/SVG-Pfade; kein Renderer, keine Scene, Meshes oder Raycasts.                                   |
| OrbitView.html / LandscapeCanvasComponent.ts | Canvas neben unterem Pager/Grid und mehreren Scrollbereichen; Fit hat eine Mindestskalierung, die bei kleinen Viewports Ausschnitte abschneiden kann.                |
| PresenterView.html / HomeRoutes.ts           | Hauptpunkt Home wurde zu Orbit; /main/home und HomeView bestehen weiter. Zusätzlich lokale Doppel-Navigation.                                                        |
| OrbitViewPresenter.ts                        | Nachweise bei Initialisierung und manuell geladen; Szenenfilter/Cache müssen beim Scope-Wechsel verhindern, dass alte Projekt-/Workspace-Nachweise weitergelten.     |

Die vollständigen Eigentümerpfade sind
libs/frontend/ui/src/lib/components/landscape/,
libs/frontend/features/home/src/lib/view-presenters/,
libs/frontend/features/home/src/lib/views/OrbitView.html und
libs/frontend/presentation/src/lib/views/PresenterView.html.
GitHubDeliveryAdapter liest konfigurierte Ziele und tatsächliche Deployment-
Nachweise; eine automatische Entdeckung sämtlicher deklarierter GitHub-
Environments ist damit noch nicht belegt.

## Bildsprache und zwei räumliche Varianten

Die erste Kamera zeigt Sonne, echte Zielkörper, Vorder-/Rückbögen und einen
dichten äußeren Arbeitsgürtel. Planetenoberflächen, beleuchtete Seiten, Verdeckung
und Perspektive erklären Tiefe. Größen und Abstände dienen der Bedienbarkeit,
nicht einer maßstäblichen astronomischen Simulation.

Eine warme Sonne mit begrenzter Korona, ein ruhiger dunkler Szenenhintergrund,
wenige klare Lichtquellen und scharfe Beschriftungen schaffen den gewünschten
räumlichen Eindruck. Dekorative Sterne sind nie Tickets, nicht auswählbar und
dürfen Arbeit nicht überdecken. Die Wirkung entsteht durch Körper, Licht und
Kamerafokus; Tickets müssen nicht dauerhaft kreisen. Ihre Arbeitsposition bleibt
bei Updates wiedererkennbar.

[NASA Eyes](https://science.nasa.gov/eyes/) ist die visuelle Primärreferenz für
Sonne, Bahnen, räumlichen Fokus und datenbasierte Objekte. Die Anwendung wurde
während der Recherche im Browser angesehen. Die Übertragung auf Symphony ist
ein eigener Entwurf, kein von NASA geliefertes Produktkonzept.

| Variante                    | Bild und Bedienung                                                                                                                         | Zweck                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Systempanorama              | Große Production-Sonne, vollständig erkennbare Bahnen, Zielplaneten und äußerer Ticketgürtel; Auswahl fokussiert einen Körper oder Sektor. | Hauptübersicht: Wo ist eine Änderung bestätigt, und welche Arbeit steht noch außen? |
| Blick aus dem Arbeitsgürtel | Tickets und tätige Figuren im räumlichen Vordergrund; Sonne und Ziele bleiben Orientierung im Hintergrund; Gesamtsystem führt zurück.      | Nahansicht für Aufträge mit stärkerem räumlichem Eindruck.                          |

Beide Varianten sind echte 3D. Die Nahansicht kann ein Kamerazustand des Panoramas
sein und benötigt keine zweite Produktnavigation.

## Informationshierarchie und wahrheitsgemäße Daten

Die Szene projiziert vorhandene Daten. Sie erzeugt keine fachlichen Zustände.

| Objekt                       | Bedeutung und Daten                                                                                                                                                                     | Fehlende oder mehrdeutige Daten                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Production-Sonne             | Explizit ausgewähltes Production-Ziel, aktuelle gültige Revision/Version. Bei mehreren Production-Zielen ist die Auswahl sichtbar.                                                      | Ohne Ziel: „Production · Ziel noch nicht zugeordnet“. Mit Ziel ohne Nachweis: „Stand nicht bestätigt“. Keine erfundene Version. |
| Umgebungsplanet und Bahn     | Tatsächlich konfiguriertes IDeliveryTarget der Art environment; Name, stabile Position, tatsächlicher Stand. Abstand ist Gestaltungsordnung, keine behauptete lineare Release-Pipeline. | Konfigurierte Umgebung bleibt sichtbar und unbestätigt; kein Erfolgssymbol ohne Nachweis.                                       |
| Release-/Installationsmarker | Ziel der Art release-channel oder installation, unterscheidbar von Umgebung.                                                                                                            | Veröffentlichung bestätigt weder Deployment noch Installation.                                                                  |
| Revisionsanker / Änderungen  | IDeliveryEvidence mit Revision, tatsächlicher Version, Ziel und belegten workItemIds.                                                                                                   | Versuch bleibt Versuch; CI-Erfolg allein ist kein Auslieferungsnachweis.                                                        |
| Ticketkörper                 | Echtes IWorkItem; ohne bestätigten Ort liegt seine Arbeitsrepräsentation im äußeren Gürtel. Stage ist ein eigenes Feld.                                                                 | „Keine Auslieferung bestätigt“ behauptet nicht „Nie ausgeliefert“, wenn Nachweise fehlen.                                       |
| PNG-Mitarbeiter              | Bestehendes Profil plus IAgentActivity.work; AgentFigureComponent bleibt der Renderer.                                                                                                  | Frei: gemeinsamer ruhiger Team-Anker. Stale: letzter bekannter Stand, keine Arbeitsanimation.                                   |

Ein Ticket behält genau eine fachliche Identität. Bei mehreren bestätigten Zielen
zeigt Auswahl alle tatsächlichen Orte über Nachweismarker derselben Ticket-ID.
Mehrere Marker erhöhen die Arbeitsanzahl nicht. Ein zufällig zuerst gefundener
Nachweis bestimmt nicht allein die Darstellung.

Stage, Mitarbeiterarbeit und Auslieferungsort bleiben getrennt. Eine fertige
Analyse ist kein Deployment. Szenendrag verschiebt keine Provider-Stage oder
Umgebung; fachliche Änderungen benutzen weiterhin bestehende geprüfte Befehle.
Die aktuelle Nachweisfunktion wählt erfolgreiche Auslieferungen nach tatsächlichem
Auslieferungszeitpunkt, nicht nach höchster Versionsnummer. Inaktivierung und
widersprüchliche Antworten brauchen vor Übernahme einen gesonderten Falltest.

## Kernfall: 551 Tickets und kein bestätigtes Ziel

1. Die Kamera umfasst eine erkennbare Production-Sonne und einen räumlichen
   Gürtel aus den **551 echten Ticketobjekten**. Der Inhalt bestimmt die
   Anfangsausrichtung, kein starres 2.000-Pixel-Quadrat.
2. Aus der Ferne gliedert sich der Gürtel in wenige benannte Gruppen mit exakten
   Zählwerten, beispielsweise nach konfigurierter Stage. Kleine Ticketkörper
   zeigen die Menge; nicht 551 gleichzeitig sichtbare Textkarten.
3. Annäherung erschließt Sektoren, Gruppen und anschließend einzelne Tickets.
   Suche fokussiert jedes Ticket direkt. Kein „Next“ und kein Ticketgrid unter
   der Szene sind für die Erreichbarkeit erforderlich.
4. Bei **null konfigurierten Zielen** werden keine Preview-, Test- oder Staging-
   Planeten erfunden. Der Arbeitsgürtel ist Arbeit, kein Deployment-Ziel.
   Die Production-Sonne ist ausdrücklich ein noch unzugeordneter Bezugspunkt.
5. Bei **konfigurierten, unbestätigten Zielen** bleiben genau diese Planeten und
   Bahnen sichtbar. Eine fehlgeschlagene Abfrage kennzeichnet den betroffenen
   Nachweisstatus, statt Ziele verschwinden zu lassen.
6. Figuren stehen an tatsächlichen Aufträgen beziehungsweise deren Gruppen.
   Freie Figuren teilen einen Team-Anker. Parallele Arbeit behält einzelne
   Bindungen, ohne Mitarbeiter mehrfach zu zählen.

Bei einem vollständig leeren Projekt bleiben Sonne und räumliche Orientierung
plus knappe Leermeldung. Null Filtertreffer zeigen Filtergrund und Rücksetzen.
Orbit startet keinen Einrichtungsablauf und zeigt kein „Connect a project“.

## Navigation und Interaktion

> Stand 2026-10-31: Symphony startet auf Overview (`/main/home`). Die Navigation
> ist die Seitenleiste des Hauptfensters mit Overview, der Gruppe `Delivery`
> (Inbox, Board, Pull requests, Actions, Orbit) und `More` (Arcade); das
> Workspace-Menü und die Shell-Rail sind durch Workspace-Umschalter und Laufpanel
> ersetzt. Verbindlich ist [Fensterrahmen und Navigation](window-and-navigation/README.md);
> der folgende Abschnitt gibt den damaligen Recherchestand wieder.

**Overview und Orbit bleiben getrennte Hauptziele** neben Board, Pull Requests
und Actions. Overview: /main/home; Orbit: /main/orbit; Board: /main/board.
Die integrierte App startet entsprechend dem angenommenen Umsetzungsplan unter
`/main/orbit`; die bisherige Overview bleibt separat erreichbar.

Die lokale Zeile „Production orbit / Stages / Employees / Board / Overview /
Connect a project“ entfällt. Das Workspace-Menü bietet Einrichtung, Stages und
Employees an; bestehende Deep-Links bleiben erreichbar. Das alte abgeschnittene,
paginierte Grid unter der Szene entfällt vollständig.

Der Viewport nutzt den verfügbaren Inhaltsraum. Die bestehende Shell-Rail bleibt
erreichbar, benötigt im Panorama aber keine automatisch offene zweite Runs-
Zusammenfassung. Details erscheinen auf Auswahl und geben anschließend Platz zurück.

Szenenbedienung: Projekt, Suche/Filter, Gesamtsystem, Annäherung/Entfernung,
bei Bedarf Nachweisaktualisierung. „Spatial“ entfällt als Modusknopf.
Maus-/Touchgesten für Drehung, Pan und Zoom sind begrenzt und nachvollziehbar;
Reset bleibt erreichbar. App-/Betriebssystem-Zoom wird nicht unbemerkt abgefangen.
[OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) dokumentiert
Orbit, Zoom, Pan und Grenzen; Fokus und Tastaturalternativen sind Produktarbeit.

Klick wählt und öffnet Details. Gruppenwahl oder ausdrückliches Fokussieren führt
zum Ausschnitt. Ein einfacher Ticketklick erzeugt keinen überraschenden langen
Kameraflug. Die Details besitzen eine explizite Schließen-Aktion. Bestehende
Prozess-/Ticketlinks und Zurück-Navigation bleiben nutzbar.

Semantischer Zoom besitzt drei Stufen mit Hysterese:

- **System:** Sonne, echte Ziele, wenige Gruppen und exakte Zählwerte.
- **Sektor:** lokale Ticketkörper, Untergruppen und zugeordnete Mitarbeiter.
- **Auftrag:** Kennung/Titel, Stage, Mitarbeiter und Nachweise der Auswahl;
  vollständige Befehle in vorhandenen Details.

Projizierte Größe und Labelabstand bestimmen Sichtbarkeit, nicht nur ein globaler
Zoomwert. Auswahl überlebt den Gruppenwechsel. Gruppen zählen dieselben gefilterten
IDs wie Suche und Board.
[GitHub Nexts Codebase-Visualisierung](https://githubnext.com/projects/repo-visualization/)
inspiriert Gesamtform und gezielt eingeblendete Beziehungen. Die Übertragung
auf Tickets und Nachweise ist eine eigene Entwurfsentscheidung.

## Frischer Vergleich der 3D-Technik

Kein vergleichender Symphony-Benchmark wurde durchgeführt. Aussagen über höhere
Bildrate oder kleinere Pakete wären derzeit unbelegt.

| Engine                        | Dokumentierte Fähigkeiten                                             | Bewertung für Symphony                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Three.js, installiert 0.186.1 | WebGL2, Perspektive, Materialien, Instancing, Picking und LOD.        | Empfehlung: vorhandene Abhängigkeit und Angular-Aufbau weiterverwenden; echte Szene neu aufbauen.                                                |
| Babylon.js                    | Orbitalkamera, Mesh-Picking, Thin Instances, Optimierungswerkzeuge.   | Geeignet; Engine-Wechsel bedeutet neue Integration. Thin Instances sind nicht pauschal besser für häufig geänderte Ticketmengen.                 |
| PlayCanvas Engine             | Standalone-Nutzung, Instancing, Posteffekte, Rendern auf Anforderung. | Auch ohne Cloud-Editor geeignet; Entity-/Asset-/Lifecycle-Anbindung zusätzlich nötig. Erst wechseln, wenn ein Prototyp konkreten Vorteil belegt. |

Three.js beschreibt den [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
als WebGL2-Renderer.
[InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) reduziert Draw
Calls für gleiche Geometrie mit verschiedenen Transformationen.
[Raycaster](https://threejs.org/docs/pages/Raycaster.html) liefert bei Instanzen
eine instanceId für die Abbildung auf Ticket-IDs.
[LOD](https://threejs.org/docs/pages/LOD.html) wechselt Geometriedetails nach
Distanz. Fachliche Gruppenauflösung bleibt eigene Logik.

Das offizielle [Scene-Graph-Tutorial](https://threejs.org/manual/pages/scenegraph.html)
zeigt Sonne, Erde und Mond mit Kugelgeometrie, Licht, Perspektivkamera und
lokalen Koordinatensystemen. Es ist eine konkrete technische Ausgangsbasis
für die räumliche Komposition; eine dauerhafte Rotation der Tickets wird daraus
nicht übernommen. Das Beispiel
[Instancing und Raycasting](https://threejs.org/examples/webgl_instancing_raycast.html)
zeigt die Auswahl einzelner Instanzen als Grundlage für den Ticketgürtel.

Babylons [Kameradokumentation](https://doc.babylonjs.com/features/featuresDeepDive/cameras/camera_introduction/)
beschreibt ArcRotateCamera als orbitalen Kameratyp.
[Mesh Picking](https://doc.babylonjs.com/features/featuresDeepDive/mesh/interactions/picking_collisions/)
deckt Auswahl ab.
[Thin Instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/)
vermeiden einzelne JavaScript-Objekte; dokumentierte Nachteile sind gemeinsame
Sichtbarkeit und aufwendigeres Hinzufügen/Entfernen. Sie werden für statische Mengen
empfohlen.
[Szenenoptimierung](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/)
beschreibt unter anderem Material-/Matrix-Freeze und begrenztes Picking.

PlayCanvas dokumentiert [Standalone-Nutzung](https://developer.playcanvas.com/user-manual/engine/standalone/)
und [Hardware-Instancing](https://developer.playcanvas.com/user-manual/graphics/advanced-rendering/hardware-instancing/).
[Posteffekte](https://developer.playcanvas.com/user-manual/graphics/posteffects/)
umfassen HDR-Bloom.
Die [Optimierungsrichtlinien](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
beschreiben autoRender = false und renderNextFrame, warnen aber auch vor
Posteffekten, vielen Lichtern und hoher Pixeldichte.

D3, PixiJS und Cytoscape bleiben für andere Darstellungen brauchbar, beantworten
aber nicht die ausdrückliche Forderung nach einer astronomischen 3D-Szene.
Keine der drei untersuchten Engines erfordert eine zusätzliche UI-Framework-Hülle,
einen allgemeinen internen HTTP-Server oder eine notwendige Cloud-Laufzeit.

## Ursprünglicher Engineeringplan innerhalb der vorhandenen Architektur

Die folgenden Entwurfsoptionen begründeten die Umsetzung. Das aktuelle
Produktverhalten ist oben und in `production-orbit.md` festgehalten; zusätzliche
Qualitätsmodi, Bloom und Geometrie-LOD sind keine zugesicherten Produktfunktionen.

### Daten und Zuständigkeiten

OrchestrationStore, Workflow, WorkLandscapeStore, IDeliverySnapshot,
currentDeliveryEvidence, Auftragsbefehle und AgentFigureComponent bleiben
Ausgangspunkte. Eine reine Orbit-Projektion liefert stabile Referenzen,
Gruppierung und Weltkoordinaten. Rendererzustand gehört nicht in Provider- oder
Domänenobjekte. Keine neuen IPC-/Providerverträge sind für die 3D-Basis erforderlich.

Repository-/Workspace-Wechsel invalidiert ausstehende Leseantworten, Auswahl und
Nachweiscaches des vorherigen Scopes beziehungsweise bindet sie an ihren Scope.
Ein verspäteter Erfolg von Projekt A darf im Sonnensystem von B keine Version
anzeigen. Bestehende sichere Mutationsbefehle bleiben unverändert.

Ein route-lokal geladener Symphony-Canvas besitzt Renderer, Scene,
PerspectiveCamera, Controls und Picking; der Presenter behält Zustand/Befehle.
Unabhängige ID-basierte Winkel, Radius und Höhe ersetzen die alte Listenposition.
Neue Tickets verschieben vorhandene Objekte nicht. Bahnen wachsen
mit Zielen/Belegung, ohne festen Maximalradius und ohne dauernd laufendes Force-Layout.

### Szene und Mengen

Sonne und Planeten sind Meshes, Bahnen räumliche Geometrie. Licht/Korona beginnen
gezielt und begrenzt; teure Posteffekte sind ein messbarer Qualitätsmodus.
Ticketkörper teilen Geometrien/Materialien in InstancedMesh-Batches nach räumlichen
Sektoren. ID-Zuordnung und Bounding-Information werden bei Änderungen konsistent
erneuert. Auswahl kann eigene Hervorhebungsgeometrie besitzen, ohne alle Instanzen
in Einzelmeshes umzubauen. Geometrie-LOD und semantische Gruppen sind getrennt.

200 Jobs liegen im zugehörigen Actions-Kontext, nicht als 200 permanente Karten
zwischen Tickets. Reale laufende Deployments können zielbezogene Verbindung und
Fortschritt erhalten; ein gestarteter Lauf bewegt keinen Nachweis vorzeitig auf
Erfolg.

### PNG-Figuren und zugängliche DOM-Ebene

AgentFigureComponent bleibt unverändert für Figur/States zuständig. Weltanker
folgen tatsächlicher Arbeit; dieselbe Perspektivkamera projiziert sie in CSS-
Viewportkoordinaten. PNGs bleiben aufrecht, gut treffbar und wiedererkennbar.

[CSS2DRenderer](https://threejs.org/docs/pages/CSS2DRenderer.html) und
[CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html) unterstützen laut
aktueller Dokumentation nur 100 Prozent Browser-/Display-Zoom. Eigene Angular-DOM-
Projektion ist deshalb vorzuziehen und bei Browserzoom, Retina-/Display-Skalierung,
Resize und Rail-Änderungen zu prüfen. Labelkollision, Frustum und Verdeckung sind
explizit: Figuren hinter Planeten erscheinen nicht aufgeklebt davor.

Raycasting prüft nur auswählbare Objekte. Pointer-Up ohne Kameradrag löst Auswahl
aus. Im Überblick sind Gruppen große Trefferziele; nahe Tickets erhalten
skalierte Pick-Bereiche. Sterne/Korona fangen keine Klicks ab.

Ein bei Bedarf geöffneter Suchdialog/Objektbaum gehört zur Szene und enthält
System, echte Ziele, Gruppen, Tickets und Mitarbeiter. Er nutzt dieselben IDs,
Filter und Befehle. Tastaturfokus und Szene sind gekoppelt; verdeckte Auswahl wird
ins Blickfeld geholt. Das ist die gleichwertige Tastatur-/Screenreaderbedienung,
keine zweite permanente Ticketwand unter dem Canvas.

### Renderbudget und Lebenszyklus

Ein gemeinsamer Invalidierungsplan rendert nach Daten-, Kamera-, Größen- oder
Qualitätsänderung. Dämpfung/kurze Übergänge halten Frames nur begrenzt aktiv.
DOM-Spriteanimation braucht ohne Kamerabewegung keine neue WebGL-Szene.
[Rendering on Demand](https://threejs.org/manual/pages/rendering-on-demand.html)
beschreibt dieses Vorgehen für überwiegend ruhige Anwendungen.

Reduzierte Bewegung entfernt automatische Kameraflüge, Pulsieren und Übergabeflüge;
die 3D-Information bleibt bedienbar. Verdeckte/minimierte Fenster pausieren.
Pixeldichte, Bloom-Auflösung und Labelmenge erhalten begrenzte Qualitätsstufen.

Beim Routenwechsel werden Listener, Beobachter, Controls, Geometrien, Materialien,
Texturen und Renderziele freigegeben.
[Cleanup](https://threejs.org/manual/pages/cleanup.html) dokumentiert die notwendige
explizite Ressourcenbereinigung. Fehlendes WebGL2 oder Kontextverlust führt zum
handlungsfähigen Objektbaum mit denselben Daten/Befehlen; Wiederherstellung
startet keine Ausführung.

## Etappen, Risiken und Abnahme

1. **Konzeptvalidierung:** vorhandenen WebGL-Prototyp visuell und fachlich
   beurteilen; 551 Tickets ohne Ziele und mehrere konfigurierte Ziele abdecken.
   Perspektive/Licht/Gürtel später auch im integrierten Electron beurteilen;
   Prototypdaten nicht als echte Nachweise ausgeben.
2. **Fachliche Projektion:** Live-Daten, Mehrfachnachweise, Scope-Isolation,
   stabile Plätze, Suche und reale Mitarbeiterarbeit.
3. **Interaktion:** Instanz-Picking, semantischer Zoom, gekoppelte Auswahl,
   vorhandene Details und gleichwertiger Tastaturzugriff.
4. **Shell:** Overview erhalten, Orbit separat oben, lokale Doppel-Navigation,
   Einrichtung und unteres Ticketgrid entfernen; Soho/Deep-Links prüfen.
5. **Belastung und Paket:** Qualitätsstufen, Hintergrundpause, Kontextverlust,
   Ressourcenfreigabe und tatsächliches Electron-Paket.

| Risiko                                     | Gegenmaßnahme / Abnahme                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Leerer Orbit bei 551 Tickets               | Exakter Gürtel mit allen IDs, Gruppen→Sektor→Ticket durch Zoom/Suche; kein Pager unter der Szene.                                      |
| Fehlende oder veraltete Nachweise          | Unzugeordnet, unbestätigt, veraltet und Abfragefehler getrennt; keine erfundenen Zielkörper oder Versionen.                            |
| Projektwechsel / verspätete Antworten      | Kein Nachweis, Mitarbeiteranker oder Treffer aus fremdem Repository-/Workspace-Scope.                                                  |
| Mehrfachauslieferung / alte Version erneut | Alle bestätigten Orte sichtbar, Ticketzahl eindeutig; gültiger Auslieferungszeitpunkt statt höchster Version.                          |
| Labels und Auswahl verdeckt                | Sichtbarkeits-/Kollisionsregeln; Suche/Objektbaum fokussiert jedes Objekt, auch hinter anderen Körpern.                                |
| Drag wird als Klick interpretiert          | Keine Auftragsöffnung nach Kamerabewegung; vergrößerte Pick-Bereiche ohne falsche Nachbarwahl.                                         |
| Layout springt bei Refresh                 | Plätze, Kamera und Auswahl stabil; neue IDs verschieben nicht das ganze System.                                                        |
| 1.000 Tickets, 25 Mitarbeiter, 200 Jobs    | Vollständige Daten, bounded DOM-Labels, Instancing und jobbezogene Detailöffnung; reale parallele Arbeit korrekt.                      |
| Kleine Fenster / Skalierung                | 1.040 × 700, große Fenster, Rail offen/zu, 125–200 Prozent Browserzoom und Retina-/Display-Skalierung ohne Clipping/versetzte Treffer. |
| Bewegung / Energieverbrauch                | Reduced Motion vollständig bedienbar; ruhige/verdeckte Szene ohne permanente Frameschleife; bestehende Figurenpausen erhalten.         |
| GPU-/Lifecycle-Probleme                    | Kontextverlust bedienbar; wiederholter Routenwechsel ohne stetig wachsende Listener-/GPU-Bestände.                                     |
| Navigation / Theme                         | Overview, Orbit, Board separat; keine lokale Doppelzeile, kein Connect-a-project, kein unteres Ticketgrid; Soho bleibt.                |

Flüssige Kamerabewegung auf dem gewählten Referenz-Mac, unmittelbares
Auswahlfeedback und eine nach Beruhigung stoppende Renderfolge sind Messziele,
**noch kein Nachweis**. Gerät, Pixeldichte, Fenstergröße, Qualitätsmodus und
Verteilung werden mit Messergebnissen dokumentiert. Bei Abweichungen zuerst
Labels, Posteffekte, Auflösung und Batches messen; nicht auf Verdacht die Engine
austauschen.

Benachbarte Projektions-/Komponentenspezifikationen und die Electron-Reise
`orbit-redesign.spec.ts` prüfen das integrierte Verhalten. `yarn agents:check`,
`yarn verify`, `yarn e2e` und `yarn forge:package` bleiben die verbindlichen
Abschlussgates. Die reine Paketierung der Figuren ersetzt die native
WebGL-/Electron-Abnahme nicht.

## Referenzentscheidung und Grenzen

Gelesen wurden FLAMOX365 PresenterView.html, TaskListView.html und
libs/frontend/pet sowie Mosaiks öffentliche FlowBoard-, Avatar- und Persona-
Verträge. Shell, Befehle, Auswahl und Details bleiben bewährte Muster.
Astronomische Szenenkomposition ist ein beabsichtigtes **Differ**;
die projizierten Ticket- und Zielbeschriftungen ein **Adapt** der öffentlichen
Mosaik-Bedienelemente. Figuren werden nach der Produktkorrektur ausschließlich
außerhalb des Orbits angezeigt.
Die umgesetzten Entscheidungen sind in
[frontend-reference-flamox.md](frontend-reference-flamox.md) als Adopt, Adapt und
Differ festgehalten. Die Orbit-Integration verändert keine Referenzrepositorys.

Provider, Git, Persistenz und CLI-Aufgaben bleiben im Orchestrator beziehungsweise
den Providerbibliotheken. Angular bleibt sandboxed. Weiter offen sind ein
vergleichender Engine-Benchmark, geräteübergreifende Leistungswerte und ein
Zeitbenchmark für die Einrichtung mit realen externen Konten. Der getrennte
Prototyp bleibt die historische Grundlage; die Produktansicht läuft im
ursprünglichen Symphony-Projekt.
