# Mitteilungszentrale und Menüleistenpanel

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Mitteilungszentrale zeigt im Hauptfenster, was an Einrichtung und System Aufmerksamkeit braucht (fehlende CLIs, abgemeldete AI-Konten, nicht vorbereitete Repositories, Kopplungsanfragen, Speicherdruck), und die Hinweise des Tages, die als Toasts erschienen sind. Das Menüleistenpanel (Tray) zeigt laufende Arbeit, Ausführungsplätze, `Needs you`, autonomes Arbeiten, das Update und die Anwendungsbefehle. Das Produktverhalten steht im Produkthandbuch unter [Mitteilungszentrale und Menüleistenpanel](../../project/notifications-and-tray/README.md).

Garantien:

- Jedes Problem stammt aus dem Feature, das den zugrunde liegenden Zustand besitzt. Die Mitteilungsbibliothek kennt keine Features; Features tragen Quellen über einen Multi-Provider bei.
- Eine Behebung ruft den bestehenden Befehl des Features mit dessen bestehender Bestätigung auf oder öffnet den Ort in den Einstellungen des Hauptfensters (`settings.open` mit `workspace`/`section`; Main sendet das Ziel `/main/settings?…` zurück). Keine Behebung umgeht eine Bestätigung.
- Ein Problem bleibt sichtbar, solange der Zustand besteht; „gelesen“ entfernt nur die Markierung.
- Der Toast-Verlauf liegt nur im Speicher des jeweiligen Fensters, gilt nur für den laufenden Tag (höchstens 50 Einträge) und wird nicht persistiert.
- Quellen laden ihren Zustand still (Fehler erzeugen keinen Toast); eine fehlschlagende Quelle behält ihre letzten Einträge.
- Das Menüleistenpanel hydratisiert die Anwendung nicht (`ApplicationBootstrap` und `OrchestrationSynchronizer` werden dort nicht konstruiert).

## Verantwortungsgrenzen

| Verantwortung                       | Kanonischer Eigentümer                                                           | Öffentlicher Vertrag                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problemvertrag und Registrierung    | Mitteilungsbibliothek (`@symphony/frontend-notification`)                        | `INotificationSource`, `INotificationItem`, `NOTIFICATION_SOURCES`, `withNotificationSources`                                                     |
| Zustand der Mitteilungszentrale     | `NotificationCentre` (Root-Dienst je Fenster)                                    | `items`, `attentionCount`, `unreadCount`, `notices`, `isOpen`, `open/close/toggle`, `markAllAsRead`, `clearRead`, `perform`, `refresh`, `connect` |
| Toast-Verlauf                       | `NotificationHistory` (Root-Dienst, zweiter `NOTIFICATION_INTERCEPTORS`-Eintrag) | `push`, `notices`, `markAllAsRead`, `clearRead`, `prune`                                                                                          |
| Fehlende CLIs                       | Platform (`DeveloperToolsNotificationSource`)                                    | Quelle; Installation über `PlatformStore.installRuntimeDependency`                                                                                |
| Abgemeldete AI-Konten               | AI (`AiAccountNotificationSource`)                                               | Quelle; Anmeldung in den Einstellungen                                                                                                            |
| Nicht vorbereitete Repositories     | Workspace (`RepositoryPreparationNotificationSource`)                            | Quelle; `RepositoryRuntimeStore.prepareRepository`                                                                                                |
| Kopplungsanfragen                   | Mobile (`MobilePairingNotificationSource`)                                       | Quelle; `MobileAccessStore.decideMobilePairing`                                                                                                   |
| Speicherdruck                       | Automation (`StoragePressureNotificationSource`)                                 | Quelle über `ConfigurationStore.storageStatus`                                                                                                    |
| Glocke und Popover                  | `NotificationBellView` + `NotificationBellViewPresenter`                         | Element `symphony-notification-bell` (Export `@symphony/frontend-notification/views`)                                                             |
| Inbox-Zusammenfassung für das Panel | Feature mit der Inbox-Projektion (noch offen)                                    | Port `INBOX_SUMMARY` / `IInboxSummary` in `@symphony/frontend-core`                                                                               |
| Menüleistenpanel                    | Präsentation (`MenuBarView` + `MenuBarViewPresenter`)                            | Route `#/menu-bar`, `window.show`, `menu-bar.resize`, `menu-bar.status.set`                                                                       |

Abhängigkeiten zeigen von den Features zur Mitteilungsbibliothek. Die Mitteilungsbibliothek hängt nicht von `@symphony/frontend-core` ab (Core verwendet `NotificationService`); deshalb nutzt der ViewPresenter der Glocke keine `Command`-Objekte, sondern die Befehle des Root-Dienstes `NotificationCentre`.

## Verträge

### Problem (`INotificationItem`)

| Feld       | Bedeutung                                                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Über alle Quellen eindeutig, mit Präfix der Quelle (`developer-tools:codex`, `ai-account:<id>`, `repository-preparation:<id>`, `mobile-pairing:<id>`, `storage:managed                   | filesystem | blocked | workspace:<id>`). |
| `severity` | `error` (verhindert Arbeit), `warning` (hält Arbeit auf), `info` (wartet auf eine Entscheidung). Sortierung: `error`, `warning`, `info`, innerhalb gleicher Stufe in Quellenreihenfolge. |
| `title`    | Problem in einem Satz.                                                                                                                                                                   |
| `location` | Ort als Pfad, äußerer Teil zuerst; die Ansicht verbindet mit `›`.                                                                                                                        |
| `detail`   | Optional: Folge oder nötiger Kontext; die Ansicht hängt ihn mit `·` an.                                                                                                                  |
| `scope`    | `{ kind: 'workspace', workspaceId, name }` oder `{ kind: 'mac' }`; der Kopf nennt die Workspaces und zuletzt `this Mac` (`Intl.ListFormat`, Englisch).                                   |
| `actions`  | `INotificationAction`: `id`, `label`, `emphasis` (`primary` = solid/primary, `secondary` = outline, `danger` = plain/danger), optional `busy`, `disabled`.                               |

### Quelle (`INotificationSource`)

- `items: Signal<readonly INotificationItem[]>` – aus dem Zustand des Features abgeleitet.
- `refresh?(): Promise<void>` – lädt den Zustand still; aufgerufen beim Öffnen der Zentrale und im Menüleistenpanel. `NotificationCentre.refresh` teilt Aufrufe innerhalb von 10 Sekunden.
- `connect?(): void` – startet eigene Aktualisierungen einmal je Fenster (Kopplungsanfragen: alle 4 Sekunden bei eingeschaltetem Mobile access, sonst alle 60 Sekunden).
- `perform(itemId, actionId)` – führt die Behebung aus.

Registrierung im Feature: `...with<Feature>Notifications().provide()` in den Basis-Providern von `provide<Feature>Feature`; `withNotificationSources({ id, sources })` stellt jede Quellklasse bereit und hängt sie per `useExisting` an `NOTIFICATION_SOURCES`.

### Regeln der Quellen

| Quelle          | Regel                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer tools | Gesundheit aus der Snapshot-Projektion, sonst aus dem eigenen `health.get` (Fenster ohne Snapshot). Pflicht: Git immer; GitHub CLI bei einer GitHub-Verbindung; Codex/Claude/OpenCode, wenn ein Konto dieser Art in einem aktivierten Workspace existiert. Mit Homebrew `install` (Rückfrage `Install <Tool>?`, `Install with Homebrew`/`Cancel`), sonst `open` → `settings.open { section: 'system' }`. |
| AI-Konten       | Codex- und Claude-Konten aktivierter Workspaces, deren CLI vorhanden ist und deren Kontostatus `authenticated: false` meldet. Detail nennt die aktivierten Agents, deren Routing einen aktivierten Kandidaten mit diesem Konto hat. `sign-in` → `settings.open { workspace, section: 'services' }`.                                                                                                      |
| Repositories    | Aktivierte Repositories aktivierter Workspaces mit bestätigtem Zustand `unprepared`; ohne gelesenen Zustand kein Eintrag. Detail unterscheidet automatisches Arbeiten (`AUTOMATION_PREPARATION.unpreparedAutomaticRepositories`). `prepare` → `prepareRepository`.                                                                                                                                       |
| Mobile access   | Bei eingeschaltetem Zugang jede `pendingPairings`-Anfrage; `approve`/`reject` → `decideMobilePairing`.                                                                                                                                                                                                                                                                                                   |
| Speicher        | Nur gemessener Status. Verwalteter Speicher und Mac-Speicher je Druckstufe (`critical` → `error`, sonst `warning`), gesperrtes Schreiben ohne erklärende kritische Stufe, Workspaces aktivierter Workspaces. `review` → `settings.open` mit `section: 'system'` beziehungsweise `workspace` + `section: 'administration'`.                                                                               |

### Öffnen über die URL

Das Hauptfenster öffnet die Zentrale, wenn eine Navigation `?notifications=open` trägt (der Hauptprozess navigiert für `window.show { route: 'notifications' }` nach `/main/home?notifications=open`). `NotificationBellViewPresenter` öffnet die Zentrale und ersetzt die URL ohne diesen Parameter (`replaceUrl`).

### Popover

Das Popover ist ein CDK-Overlay (`cdkConnectedOverlay`) am Ursprung der Glocke: rechte Kante 4 px rechts der Glocke, Unterkante 8 px über ihr, Breite 400 px, Höhe höchstens Fensterhöhe − 48 px mit scrollender Liste. Escape und Klick außerhalb schließen; `cdkTrapFocus` mit Autofokus führt den Fokus hinein und zurück. Fläche, Rahmen, Radius und Schatten setzt die View-SCSS am `part` `notification-centre` ausschließlich mit `--mosaik-*`-Token.

## Menüleistenpanel

- Laden: `ConfigurationStore.refreshSettings`, `execution-state.get`, `autonomy.status.get` parallel, danach `ci.runs.refresh`, `NotificationCentre.refresh` und `INBOX_SUMMARY.refresh` (falls bereitgestellt). Erneut bei `visibilitychange` (sichtbar) und Ausführungsereignissen (nur Ausführung/Autonomie).
- Agents: `projectAgentActivity` über den Ausführungszustand für die aktivierten Profile des aktiven Workspace; aufgeführt werden Agents mit laufender Arbeit und solche mit heute beendeter Arbeit, geordnet `needs-input`, `working`, `paused`, `blocked`, `queued`, `failed`, `completed`. Work-Item-Kennung und -Titel aus `workItemSnapshot` beziehungsweise dem Warteschlangeneintrag.
- Actions: laufende und wartende Läufe, dann beendete, insgesamt mindestens alle aktuellen und höchstens vier Zeilen.
- Ausführungsplätze: `mosaik-progress-bar` mit `segments` = Kapazität (als Attribut gesetzt, weil der Angular-Wrapper `segments` nicht weiterreicht).
- Befehle: `window.show` mit `current`, `settings`, `actions`, `inbox`, `notifications`, `new-work-item`; `app.quit`. ⌘O, ⌘N, ⌘, und ⌘Q werden im Panel per `document:keydown` behandelt.
- Höhe: `menu-bar.resize` mit der Inhaltshöhe zwischen 180 und 760 Pixeln.
- Erscheinungsbild: Das Panel folgt dem Erscheinungsbild der Anwendung (`DesktopThemeStore` über die geladenen Einstellungen); die Fläche ist `--mosaik-scheme-surface`.

## Offene Integrationspunkte

- `INBOX_SUMMARY` wird noch von keinem Feature bereitgestellt; bis dahin entfällt die Zeile **Inbox** im Panel.
- Der Toast-Verlauf ist fensterlokal. Weil die Einstellungen im Hauptfenster liegen, erscheinen ihre Hinweise (etwa `Settings saved.`) im Verlauf der Zentrale; Hinweise des Menüleisten-Panels erscheinen dort nicht.

## Implementierungskarte

- `libs/frontend/notification/src/lib/` – Modelle, `sources/INotificationSource.ts`, `provider/withNotificationSources.ts`, `state/NotificationCentre.ts`, `state/NotificationHistory.ts`, Pipes, `views/NotificationBellView.*`, `view-presenters/NotificationBellViewPresenter.ts`.
- `libs/frontend/features/{platform,ai,workspace,mobile,automation}/src/lib/notifications/` – Quellen; Registrierung in `provider/with<Feature>Notifications.ts`.
- `libs/frontend/core/src/state/IInboxSummary.ts`, `InboxSummaryToken.ts` – Port für die Inbox-Zusammenfassung.
- `libs/frontend/presentation/src/lib/views/MenuBarView.*`, `view-presenters/MenuBarViewPresenter.ts`, `pipes/AgentFinishedWorkLabelPipe.ts`, `pipes/AgentActivityIconPipe.ts`.

## Verifikation

- Unit-Tests neben jeder Produktionsdatei (Zentrale, Verlauf, Pipes, Glocken-Presenter, jede Quelle, Panel-Presenter).
- E2E: `apps/renderer-e2e/src/notification-centre.spec.ts` (Glocke, Popover-Lage, Probleme, Toast-Verlauf, gelesen/aufräumen, Escape, URL-Öffnung, Behebung) und `apps/renderer-e2e/src/menu-bar.spec.ts` (Panel-Bereiche, Erscheinungsbild hell/dunkel, Segmentumschaltung, Größe, `Notifications` öffnet die Zentrale, `Settings…` öffnet die Einstellungen im Hauptfenster).
