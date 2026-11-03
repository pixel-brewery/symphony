# Mitteilungszentrale und Menüleistenpanel

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die Mitteilungszentrale zeigt im Hauptfenster, was an Einrichtung und System Aufmerksamkeit braucht (fehlende CLIs, abgemeldete AI-Konten, nicht vorbereitete Repositories, Kopplungsanfragen, Speicherdruck), und die Hinweise des Tages, die als Toasts erschienen sind. Das Menüleistenpanel (Tray) zeigt laufende Arbeit, Ausführungsplätze, `Needs you`, autonomes Arbeiten, das Update und die Anwendungsbefehle. Das Produktverhalten steht im Produkthandbuch unter [Mitteilungszentrale und Menüleistenpanel](../../project/notifications-and-tray/README.md).

Garantien:

- Jedes Problem stammt aus dem Feature, das den zugrunde liegenden Zustand besitzt. Die Mitteilungsbibliothek kennt keine Features; Features tragen Quellen über einen Multi-Provider bei.
- Eine Behebung ruft den bestehenden Befehl des Features mit dessen bestehender Bestätigung auf oder öffnet den Ort in den Einstellungen des Hauptfensters (`settings.open` mit `workspace`/`section`; Main sendet das Ziel `/main/settings?…` zurück). Keine Behebung umgeht eine Bestätigung.
- Ein Problem bleibt sichtbar, solange der Zustand besteht; „gelesen“ entfernt nur die Markierung.
- Der Toast-Verlauf liegt nur im Speicher des jeweiligen Fensters, gilt nur für den laufenden Tag (höchstens 50 Einträge) und wird nicht persistiert.
- Quellen laden ihren Zustand still: Ein Abruf- oder Transportfehler erzeugt keinen Toast, und eine fehlschlagende Quelle behält ihre letzten Einträge. Eine bestätigte neue Speicherblockierung darf über den bestehenden Benachrichtigungsdienst einen Fehlerhinweis auslösen.
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

| Feld       | Bedeutung                                                                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Über alle Quellen eindeutig, mit Präfix der Quelle (`developer-tools:codex`, `ai-account:<id>`, `repository-preparation:<id>`, `mobile-pairing:<id>`, `storage:managed`, `storage:filesystem`, `storage:blocked`, `storage:local-ci`, `storage:workspace:<id>`). |
| `severity` | `error` (verhindert Arbeit), `warning` (hält Arbeit auf), `info` (wartet auf eine Entscheidung). Sortierung: `error`, `warning`, `info`, innerhalb gleicher Stufe in Quellenreihenfolge.                                                                         |
| `title`    | Problem in einem Satz.                                                                                                                                                                                                                                           |
| `location` | Ort als Pfad, äußerer Teil zuerst; die Ansicht verbindet mit `›`.                                                                                                                                                                                                |
| `detail`   | Optional: Folge oder nötiger Kontext; die Ansicht hängt ihn mit `·` an.                                                                                                                                                                                          |
| `scope`    | `{ kind: 'workspace', workspaceId, name }` oder `{ kind: 'mac' }`; der Kopf nennt die Workspaces und zuletzt `this Mac` (`Intl.ListFormat`, Englisch).                                                                                                           |
| `actions`  | `INotificationAction`: `id`, `label`, `emphasis` (`primary` = solid/primary, `secondary` = outline, `danger` = plain/danger), optional `busy`, `disabled`.                                                                                                       |

### Quelle (`INotificationSource`)

- `items: Signal<readonly INotificationItem[]>` – aus dem Zustand des Features abgeleitet.
- `refresh?(): Promise<void>` – lädt den Zustand still; aufgerufen beim Öffnen der Zentrale und im Menüleistenpanel. `NotificationCentre.refresh` teilt Aufrufe innerhalb von 10 Sekunden.
- `connect?(): void` – startet eigene Aktualisierungen einmal je Fenster (Kopplungsanfragen: alle 4 Sekunden bei eingeschaltetem Mobile access, sonst alle 60 Sekunden; Speicher: alle 10 Sekunden bei aktiviertem Local GitHub Actions in mindestens einem eingeschalteten Workspace, sonst alle 60 Sekunden).
- `perform(itemId, actionId)` – führt die Behebung aus.

Registrierung im Feature: `...with<Feature>Notifications().provide()` in den Basis-Providern von `provide<Feature>Feature`; `withNotificationSources({ id, sources })` stellt jede Quellklasse bereit und hängt sie per `useExisting` an `NOTIFICATION_SOURCES`.

### Regeln der Quellen

| Quelle          | Regel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer tools | Gesundheit aus der Snapshot-Projektion, sonst aus dem eigenen `health.get` (Fenster ohne Snapshot). Pflicht: Git immer; GitHub CLI bei einer GitHub-Verbindung; Codex/Claude/OpenCode, wenn ein Konto dieser Art in einem aktivierten Workspace existiert. Mit Homebrew `install` (Rückfrage `Install <Tool>?`, `Install with Homebrew`/`Cancel`), sonst `open` → `settings.open { section: 'system' }`.                                                                                                                                            |
| AI-Konten       | Codex- und Claude-Konten aktivierter Workspaces, deren CLI vorhanden ist und deren Kontostatus `authenticated: false` meldet. Detail nennt die aktivierten Agents, deren Routing einen aktivierten Kandidaten mit diesem Konto hat. `sign-in` → `settings.open { workspace, section: 'services' }`.                                                                                                                                                                                                                                                 |
| Repositories    | Aktivierte Repositories aktivierter Workspaces mit bestätigtem Zustand `unprepared`; ohne gelesenen Zustand kein Eintrag. Detail unterscheidet automatisches Arbeiten (`AUTOMATION_PREPARATION.unpreparedAutomaticRepositories`). `prepare` → `prepareRepository`.                                                                                                                                                                                                                                                                                  |
| Mobile access   | Bei eingeschaltetem Zugang jede `pendingPairings`-Anfrage; `approve`/`reject` → `decideMobilePairing`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Speicher        | Kontingente und Workspaces nur mit abgeschlossener Belegungsmessung; die unabhängig bekannte Mac-Reserve und die Local-CI-Zulassung bleiben auch während einer ausstehenden Inventur sichtbar. Verwalteter Speicher nutzt seine tatsächliche Belegung gegenüber der Grenze statt des mit dem Dateisystem kombinierten Drucks. `critical` → `error`, sonst `warning`; zusätzlich gesperrtes Schreiben ohne erklärende kritische Stufe. `review` → `settings.open` mit `section: 'system'` beziehungsweise `workspace` + `section: 'administration'`. |

### Speicherzulassung und sofortige Local-CI-Meldung

`StoragePressureNotificationSource` übernimmt `storageStatus.localCiAdmission` aus derselben Backend-Entscheidung, die einen lokalen Start zulässt oder ablehnt. Die Quelle führt keine CI-Operation aus und erfasst keinen Ausführungsversuch. Der Local-CI-Eintrag setzt `settings.workspaces.some(workspace => workspace.enabled && workspace.localCiEnabled)` voraus; allgemeine Speicher- und Workspace-Meldungen bleiben davon unabhängig.

| Zulassungszustand                                | Projektion                                                                                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `permitted`                                      | kein Local-CI-Problem; ein vorheriger Blockierschlüssel wird gelöscht                                                                                                                                                            |
| `blocked`, `filesystem-reserve`                  | `storage:local-ci`, `error`, **Local GitHub Actions needs more free space**; die vier Byte-Werte `availableBytes`, `reserveBytes`, `requiredGrowthBytes`, `shortfallBytes` werden über den bestehenden Größenformatierer benannt |
| `blocked`, `managed-limit` oder `local-ci-limit` | eigener ursachenspezifischer Titel; dieselben Budgetwerte, ohne eine Kontingentsperre als fehlenden Mac-Speicher auszugeben; ein freier-Speicher-Fehlbetrag von null bleibt als solcher erkennbar                                |
| `blocked`, `workspace-limit`                     | ursachenspezifischer Titel; sofern der Workspace bekannt ist, Name, Workspace-Scope und Ort `Administration`; **Review storage** öffnet dessen Administration                                                                    |
| `unknown`, `allocation-pending`                  | kein erfundener Fehler oder erfolgreicher Start; die noch unbekannte Kontingentlage löscht keinen zuvor bestätigten Toast-Blockierschlüssel; ein tatsächlich feststehender Reservefehler kommt bereits als `blocked` an          |
| `unknown`, `measurement-failed`                  | **Local GitHub Actions cannot check storage**; nur die bekannte Reserve wird als Zahl dargestellt; keine erfundenen freien Bytes, Wachstumskosten oder Fehlbeträge                                                               |

Die Quelle verwendet das bestehende `connect`-/`DestroyRef`-Lebenszyklusmuster der mobilen Kopplungsquelle. `NotificationBellViewPresenter` verbindet die Quellen bereits beim Aufbau der Glocke, ohne Öffnen des Popovers. `connect` ist idempotent und beginnt mit einer stillen Aktualisierung; eine noch laufende Aktualisierung wird mit manuellen Zentrumsabrufen geteilt. Erst nach ihrem Abschluss wird der nächste Timeout geplant. Nach Zerstörung wird der Timer entfernt; auch ein später endender Abruf startet keinen weiteren Timer oder Toast. Transportfehler behalten den zuletzt bestätigten Zustand und werden beim nächsten Intervall erneut gelesen.

Ein gebundener Effekt beobachtet Zustands- und Einstellungsänderungen. Ein neuer Blockierschlüssel ruft den bestehenden `NotificationService.showError` auf und verweist auf die Speichereinstellungen. Der Schlüssel enthält ausschließlich die bestätigte Ursache, gegebenenfalls den betroffenen Workspace und die vom Speicherwächter bestätigte Reserve; `availableBytes`, `requiredGrowthBytes`, `shortfallBytes`, Messzeitpunkt und noch nicht durch einen neuen Status bestätigte Renderer-Einstellungen gehören ausdrücklich nicht hinein. Dadurch aktualisieren schwankender freier Speicher und veränderte Wachstumsschätzungen den persistenten Eintrag, ohne Toasts zu wiederholen. Eine Änderung von Ausstattung oder Kontingent im Renderer erzeugt allein keinen neuen Toast aus einem alten Status. Bestätigte Freigabe oder Deaktivierung löscht den Schlüssel; eine neu bestätigte Ursache, ein anderer betroffener Workspace oder eine geänderte bestätigte Reserve wird neu gemeldet. Die Benachrichtigungsweitergabe läuft außerhalb der Signal-Abhängigkeitsverfolgung. Ein historischer Toast bleibt unabhängig vom inzwischen behobenen Problem im vorhandenen Tagesverlauf.

Verwaltete Kontingentmeldungen verwenden für ihre Darstellung das genaue Verhältnis `allocatedBytes / max(1, limitBytes)` mit den bestehenden Grenzen 60/80/95 Prozent, nicht den gerundeten `usagePercent` oder den durch die Mac-Reserve erhöhten globalen Druck. Die generische Reserve-Meldung lautet bei kritischem Druck **This Mac has reached its free-space reserve**, nicht „kein freier Speicher“. Eine fehlgeschlagene Messung erzeugt keine generische Null-Byte-Aussage. Die bestehende Review-Aktion, Benachrichtigungszentrale und Mosaik-Toast-Darstellung bleiben die einzigen Oberflächen; es entstehen keine weiteren Views oder Steuerelemente.

Die angrenzende `StoragePressureNotificationSource.spec.ts` deckt Reservefehler während ausstehender Inventur, alle Kontingentgründe, korrekte Review-Ziele, unbekannte Messwerte, tatsächliche statt gerundete Kontingentbelegung, deaktivierte Workspaces, Erholung, Toast-Deduplizierung sowie gemeinsame Abrufe, Wiederholung und Zerstörung ab. Der Backend-Vertrag und die Ressourcenberechnung bleiben in [System](../system/README.md) und [Managed Local CI](../actions/managed-local-ci.md).

### Fehlergruppen und bestätigte Erholung

Ein Fehlerhinweis besteht aus `kind: 'error'`, `title`, `content` und optional `groupKey`. Der Schlüssel bezeichnet eine Fehlerepisode einer Verantwortung und Ressource; Repository-Inspektionen verwenden Workspace-Id und Bindungs-Id, nicht den gerade sichtbaren Workspace oder nur einen Anzeigenamen. Titel und Inhalt bilden innerhalb dieses Schlüssels den Diagnose-Fingerabdruck. Andere Ressourcen, andere Diagnosen und andere Meldungsarten bleiben getrennt.

Der bestehende Dispatcher `NotificationService` merkt sich höchstens 50 zuletzt verwendete explizite Fehlergruppen pro Fenster. Ein unveränderter Fingerabdruck wird an jeden Interceptor mit `repeated: true` weitergegeben. Der Toast-Interceptor zeigt dafür keine zweite Einblendung; der Verlauf verarbeitet jedes Vorkommen. `resolveError(groupKey)` entfernt nach bestätigter Erholung den Fingerabdruck, damit eine spätere Wiederkehr erneut sichtbar meldet. Bei Erreichen der Grenze wird der älteste Fingerabdruck verworfen; sein späteres Wiederauftreten darf wieder melden. Ein geänderter Fingerabdruck meldet ebenfalls erneut. Fehler einzelner Bedienaktionen ohne expliziten Episodenschlüssel werden nicht dauerhaft stummgeschaltet.

Der Tagesverlauf kombiniert Fehler mit gleichem optionalem Gruppenschlüssel, gleichem Titel und gleichem Inhalt in einem Eintrag mit stabiler Id. `occurrences` beginnt bei eins, zählt jedes weitere Vorkommen bis höchstens `Number.MAX_SAFE_INTEGER` und wird ab zwei Vorkommen angezeigt. `occurredAt` ist der letzte Zeitpunkt; der aktualisierte Eintrag steht vorn. Eine Wiederholung derselben Episode erhält den bisherigen Gelesen-Zustand und erzeugt keinen neuen ungelesenen Punkt. Eine neue Episode nach bestätigter Erholung verwendet wieder den tatsächlichen Fensterfokus und kann damit erneut ungelesen sein. Gleichlautende Erfolgs-, Info- oder Warnmeldungen bleiben eigenständige Bedienergebnisse. Vorherige Tagesgrenze, Obergrenze von 50 Verlaufseinträgen, **Clear read** und fensterlokale Lebensdauer gelten weiter. Fehlergruppen sind nicht portabel gespeichert und ändern weder Einstellungen noch zugrunde liegende Ressourcen.

Ein nicht lesbares lokales Repository bleibt außerdem als beständiger Fehler unter **Needs attention** sichtbar: Workspace-Scope, Ort `[Workspace, 'Repositories']`, Repository-Name und begrenzte Diagnose. **Open repository settings** navigiert innerhalb des Renderers nach `/main/settings` und übergibt Workspace- und Repository-Id als Query-Werte; auch gültige Ids mit Trennzeichen bleiben erhalten. Eine bloß fehlende Kopie behält die bisherige Vorbereitung mit **Prepare locally**. Damit kann ein Inspektionsfehler weder als erfolgreich gelesene Konfiguration verschwinden noch durch erneute Vorbereitung unbeabsichtigt Git-Metadaten ersetzen. Die Quelle löscht ihren offenen Fehler bei bestätigter Erholung oder beim Entfernen/Deaktivieren der betroffenen Konfiguration; historische Vorkommen bleiben nach den Tagesregeln erhalten.

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
