# Delivery destinations

Im Bereich **Delivery destinations** legst du je Projekt fest, welche Umgebungen, Release-Kanäle und Installationen im [Orbit](../orbit/README.md) erscheinen und welches Ziel Production darstellt. Die Werkzeugleiste beschreibt ihn mit „Production, environments, release channels, and deployment workflows.“. Ein Ziel zu konfigurieren bestätigt keine ausgelieferte Version; das tun nur Auslieferungsnachweise.

## Voraussetzungen

- Ein Projekt ist ein Repository des Workspace. Ohne Repository erscheint unter **Without a project** der Hinweis „Add a project under Repositories before configuring its destinations.“ mit **Open repositories**, und **Add destination** ist gesperrt.

## Aufbau

Die Gruppe **Delivery destinations** trägt **Add destination**. Darunter wählt **Project** das Repository, dessen Ziele angezeigt und bearbeitet werden; die Wahl bleibt erhalten, solange das Einstellungsfenster offen ist. Jede Zeile zeigt den Namen und `Environment · production · Production` (Art, Name beim Anbieter, gegebenenfalls Production), bei einem Auslieferungs-Workflow `Workflow: <Workflow>`, das Abzeichen **Production** sowie **Edit** und **Remove**.

Hat das Projekt noch kein Ziel, steht unter **A project without destinations**: „No destinations are configured for this project. Add one and mark it as Production to configure the centre of the orbit.“

## Ziel anlegen oder bearbeiten

**Add destination** oder **Edit** öffnet das Sheet **Add delivery destination** beziehungsweise **Edit delivery destination** mit dem Projektnamen darunter.

| Feld                                                                                  | Regel                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Display name**                                                                      | Pflicht                                                                                                                                              |
| **Destination type**                                                                  | **Environment**, **Release channel** oder **Installation**                                                                                           |
| **Environment name**, **Release channel name** oder **Installation destination name** | Pflicht; der exakte Name, unter dem dein Auslieferungsanbieter das Ziel führt                                                                        |
| **Represents Production at the centre of the orbit**                                  | macht das Ziel zur Mitte des Orbits                                                                                                                  |
| **Body at the centre of the orbit**                                                   | nur für Production: **Sun**, **Mercury**, **Venus**, **Earth**, **Mars**, **Jupiter**, **Saturn**, **Uranus** oder **Neptune**, jeweils mit Vorschau |

Bei einem Production-Ziel zeigt der Kopf des Sheets eine **Orbit preview**: den gewählten Himmelskörper in der Mitte mit dem Namen des Ziels und die übrigen Ziele des Projekts auf zwei Ringen. Die Vorschau folgt jeder Änderung.

Ein neues Production-Ziel ist mit dem Namen `Production`, dem Umgebungsnamen `production` und der Sonne vorbelegt.

### Auslieferungs-Workflow

Der aufklappbare Abschnitt **Deployment workflow (optional)** („Enable starting an exact version from the orbit“) verbindet das Ziel mit einem GitHub-Actions-Workflow:

1. **Load project workflows** lädt die aktiven, manuell startbaren Workflows des Projekts. Kann das nicht geschehen, verweist ein Hinweis unter **When loading fails** auf das GitHub-Konto unter Repositories.
2. **Workflow** wählt einen davon oder **No deployment workflow**. Ein gespeicherter, noch nicht geprüfter Workflow erscheint als **Configured workflow (reload to verify)**.
3. Mit Workflow sind **Exact version input (required)**, **Destination input (optional)** und **Operation ID input (optional)** die Eingabenamen des Workflows. Die Operation-ID muss im Laufnamen des Workflows vorkommen, damit ein unterbrochener Start zugeordnet werden kann. Ein anderer Workflow leert die drei Felder.

### Hinweise im Sheet

| Ausgangslage                                                         | Hinweis                                                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Dieses Projekt hat schon ein Ziel derselben Art mit demselben Namen. | „This destination is already configured for this project. Edit the existing destination instead.“ **Save** ist gesperrt.    |
| **Release channel**                                                  | Stable folgt dem neuesten GitHub-Release; andere Kanäle stehen in `.symphony/release-channels.json` des Repositories.       |
| **Installation**                                                     | Eine Installation braucht einen ausdrücklichen Installationsnachweis; ein veröffentlichtes Release gilt nicht als Nachweis. |

**Save** ist erst möglich, wenn Name und Zielname ausgefüllt sind, ein gewählter Workflow seinen Versionseingang hat und kein gleiches Ziel existiert. **Cancel** und Escape verwerfen den Entwurf.

## Ziel entfernen

**Remove** fragt **Remove …?**: Die Konfiguration verschwindet aus Symphony; Auslieferungshistorie und ausgelieferte Anwendung bleiben erhalten. **Remove destination** (rot) bestätigt, **Keep destination** bricht ab. Wird ein Repository entfernt, verschwinden seine Ziele mit.

## Aus dem Orbit konfigurieren

**Configure destination** an einem Ziel und **Configure production** im Orbit öffnen das Einstellungsfenster in diesem Bereich beim Projekt:

- Ein konfiguriertes Ziel öffnet sich zum Bearbeiten.
- Ein im Orbit gezeigtes, aber noch nicht konfiguriertes Ziel öffnet sich als neues Ziel, vorbelegt mit Name, Art und Zielname aus dem Orbit.
- Ist kein Ziel gewählt und hat das Projekt noch kein Production-Ziel, öffnet sich ein neues Production-Ziel; hat es schon eines, öffnet sich nur die Liste.

Dasselbe Ziel lässt sich danach erneut aus dem Orbit öffnen. **Delivery destinations in Settings** im Zielmenü des Orbits öffnet nur die Liste des Projekts.

## Verwandte Features

- [Orbit](../orbit/README.md)
- [Repositories](repositories.md)
- [Workspaces](README.md)
