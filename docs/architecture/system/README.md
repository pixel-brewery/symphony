# Einstellungen dieses Mac: System, Mobile access und Appearance

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Die globalen Einstellungsbereiche **System**, **Mobile access** und **Appearance** gelten für die ganze Installation auf diesem Rechner, nicht für einen Workspace. Sie sind Beiträge mehrerer Features zum Einstellungsfenster und verwenden dessen gemeinsame Mechanik (Katalog, Suche, Sofortspeichern, Alert-Sheets), die [Einstellungsfenster](../window-and-navigation/settings-window.md) beschreibt. Das funktionale Verhalten steht unter [System: dieser Mac](../../project/system/README.md), [Mobile access](../../project/system/mobile-access.md) und [Appearance](../../project/system/appearance.md).

Garantien:

- Jede Karte liest nur vorhandene Zustände (Anwendungseinstellungen, Speicherstatus, Laufzeitzustand, Energie-, Update- und Mobilzustand) und schreibt nur über den Eigentümer des jeweiligen Zustands. Es gibt keinen zweiten Einstellungsschreiber.
- Eine gescheiterte Änderung lässt das Steuerelement den gespeicherten Wert zeigen; ein ungültiger Wert in einem Zahlenfeld wird nie gespeichert und nie still auf eine Grenze gekürzt, sondern verworfen.
- Ein Speicherstatus, der nicht gemessen werden kann, gilt als nicht beschreibbar (fail closed).
- Entfernen und Leeren virtueller Maschinen sowie Werkzeuginstallationen laufen nur nach einer bestätigten Rückfrage. Kopplungsentscheidungen und der Entzug gekoppelter Telefone laufen ohne zusätzliche Rückfrage.
- Energieverwaltung und Updatekanal sind Präferenzen des Desktop-Hauptprozesses; sie gehören nicht zu den Anwendungseinstellungen und reisen nicht mit einem Workspace-Export.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Bereichsregistrierung und Suchbeiträge der drei Bereiche; Karten **Storage**, **Developer tools**, **Virtual machines**, **Updates**, **Sleep**; **Mobile access**; **Color theme** und der Appearance-Slot mit **Navigation** (Arcade).
- Nicht enthalten: die Fenstermechanik ([Einstellungsfenster](../window-and-navigation/settings-window.md)), CLI-Erkennung und -Installation ([Entwicklerwerkzeuge](../developer-tools/README.md)), Updatezustände, Download und Installation ([Anwendungsupdates](../application-updates/README.md)), Ausführung und Isolation der lokalen Runner ([Managed Local CI](../managed-local-ci.md)), das Kopplungs- und Sitzungsprotokoll des Telefons ([Mobile companion phase 1](../mobile-companion-phase-1.md)), die Arcade-Spiele ([Arcade](../arcade/README.md)) und die Workspace-eigene Speichergrenze in **Administration** ([Workspaces](../workspaces/README.md)).

## Verantwortungsgrenzen

| Verantwortung                         | Kanonischer Eigentümer                                                   | Öffentlicher Vertrag                                                                        | Verbraucher                                   |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Speichermessung, Druck, Schreibsperre | Speicherwächter im Orchestrator                                          | `storage.status.get` → Speicherstatus                                                       | Storage-Karte, Mitteilungszentrale, Admission |
| Speichergrenzen                       | Anwendungseinstellungen                                                  | `runtime.managedStorageLimitGiB`, `runtime.minimumFreeDiskGiB`, `localCi.storageLimitGiB`   | Speicherwächter, Storage-Karte                |
| Ausstattung lokaler Runner            | Anwendungseinstellungen, CI-Feature                                      | `localCi.resourcePreset`, `localCi.reuseVirtualMachine`, `localCi.customResources`          | Runner-Start, Virtual-machines-Karte          |
| Maschinenliste, Entfernen, Leeren     | CI-Feature (`CiStore`)                                                   | Liste, `removeLocalCiInstance(name)`, `clearLocalCiData()`, `refreshLocalCiInstances(true)` | Virtual-machines-Karte                        |
| Wachhalten                            | Desktop-Hauptprozess (`KeepAwakeCoordinator`)                            | Desktop-Anfragen `power.get`, `power.keep-awake.set`; Ereignis `onPowerState`               | Sleep-Karte, Suchtreffer                      |
| Updatezustand und Kanal               | Desktop-Hauptprozess, im Renderer `DesktopUpdateStore`                   | siehe [Anwendungsupdates](../application-updates/README.md)                                 | Updates-Karte, Statusleiste, Menüleiste       |
| Mobiler Zugang und Kopplung           | `MobileAccessService` im Orchestrator, im Renderer `MobileAccessStore`   | `mobile-access.*`-Anfragen (siehe unten)                                                    | Mobile-Karte, Mitteilungszentrale             |
| Farbschema                            | Anwendungseinstellungen `user.theme`, angewendet von `DesktopThemeStore` | `ThemeService.applyTheme('light' \| 'dark')`                                                | alle Renderer-Fenster                         |
| Arcade-Sichtbarkeit                   | Anwendungseinstellungen `user.arcadeEnabled`, Arcade-Feature             | `IArcadeSettingsContext` `{ enabled, setEnabled }`                                          | Navigation, Appearance-Karte                  |

## Bereichsregistrierung

Jede Karte ist ein `ISettingsViewDefinition` im globalen Slot. Alle Karten eines Bereichs tragen identische Bereichsmetadaten, sonst bricht der Katalog mit einem Fehler ab. Eine Karte wird gezeigt, wenn `canActivate` für `{ sectionId, workspaceId: null }` zutrifft; die Reihenfolge innerhalb des Bereichs folgt `order`.

| Bereich (`id`, Reihenfolge) | Beschreibung                                                     | Karten (`order`)                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `system`, 40                | `This Mac: tools, storage, virtual machines, updates and sleep.` | Storage (10, Automation-Feature), Developer tools (20, Platform), Virtual machines (30, CI), Updates (40, Update), Sleep (50, Interaction) |
| `mobile`, 50                | `Pair phones on the local network.`                              | Mobile access (10, Mobile)                                                                                                                 |
| `appearance`, 60            | `Choose how Symphony looks.`                                     | Color theme (10, Platform); darin der Slot `settings.global.appearance` mit optionalen Karten, derzeit Arcade (100)                        |

Suchbeiträge (`search`) dieser Bereiche:

| Bereich    | Einträge (Gruppe)                                                                                                                                                                                                                                                                                                                    | Steuerelement im Treffer                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| System     | `Maximum managed storage (GB)`, `Minimum Mac free space (GB)`, `Maximum Local GitHub Actions storage (GB)` (Storage); `Developer tools`; `Resource preset`, `Keep the virtual machine warm`, `Clear runner data` (Virtual machines); `Check for updates`, `Release channel` (Updates); `Keep this Mac awake while tasks run` (Sleep) | nur `Keep this Mac awake while tasks run` |
| Mobile     | `Allow mobile access` (Local network access), `Pair a phone`, `Paired phones`                                                                                                                                                                                                                                                        | keines                                    |
| Appearance | `Theme` (Color theme); `Show Arcade`, `God mode` (Navigation, aus dem Appearance-Slot)                                                                                                                                                                                                                                               | `Theme`, `Show Arcade`                    |

## Storage

### Speicherstatus

`storage.status.get` liefert ohne Parameter:

```ts
{
  measuredAt: string /* ISO-Zeitpunkt */;
  measured: boolean; // false, solange keine vollständige Messung vorliegt
  writable: boolean;
  global: StorageUsage;   // id 'global', Label 'Application storage'
  localCi: StorageUsage;  // id 'local-ci', Label 'Local GitHub Actions'
  workspaces: StorageUsage[]; // id 'workspace:<id>', Label = Workspace-Name, workspaceId
  localCiCapacity: { logicalCpus; totalMemoryBytes; availableStorageBytes; presets: { compact; balanced; performance; custom } };
  filesystem: { availableBytes; reserveBytes; pressure: StoragePressure };
  error?: string;
}
StorageUsage = { id; label; workspaceId?; allocatedBytes; limitBytes; usagePercent /* 0..100 */; pressure; segments: { id; label; description; allocatedBytes }[] }
StoragePressure = 'healthy' | 'warning' | 'danger' | 'critical'
```

Regeln des Produzenten:

- Gezählt werden physisch belegte Blöcke, nicht die angekündigte Größe dünn belegter Disk-Images.
- Gesamtbelegung `global` mit den Segmenten `application-state` (Rest: alles im Konfigurationsverzeichnis, das keinem anderen Segment gehört), `workspaces` (Summe aller Workspace-Gruppen), `local-ci` und optional `browser-data` (Profil des eingebetteten Chromium). Die Segmentsumme ist gleich der Gesamtbelegung.
- `local-ci`-Segmente: Instanzen, Basisimage, `actions/cache`-Einträge, Runner-Werkzeuge, Runner-Home, übrige Runner-Daten.
- Kontingentdruck: Anteil an der Grenze `< 60 %` → `healthy`, `≥ 60 %` → `warning`, `≥ 80 %` → `danger`, `≥ 95 %` → `critical`.
- Druck des Dateisystems gegenüber der Reserve `minimumFreeDiskGiB`: frei `≤ Reserve` → `critical`, `≤ 1,25 × Reserve` → `danger`, `≤ 2 × Reserve` → `warning`, sonst `healthy`. Der Druck von `global` ist das Maximum aus Kontingent- und Dateisystemdruck.
- `writable` ist genau dann wahr, wenn weder `global`, das Dateisystem, `localCi` noch ein Workspace `critical` ist.
- Scheitert die Messung, liefert der Produzent `measured: false`, `writable: false`, alle Nutzungen mit `pressure: 'critical'` und Grenze 0 sowie `error`.

### Karte

- Anzeige der Gesamtbelegung über eine gemeinsame Speicheraufschlüsselung: ohne Status oder ohne `measured` eine Ladeansicht (`Measuring…`, Skelett mit der Anatomie aus 10-px-Balken und Legende); sonst `<Belegung> of <Grenze> GB · <Druckbezeichnung>` (`Within limit`, `Approaching limit`, `High usage`, `Writes blocked`), ein Segmentbalken mit Maximum = Grenze, ein Legendeneintrag je Segment mit mehr als 0 Byte (Beschreibung als Tooltip) und `Available` = `max(0, Grenze − Belegung)`.
- **Managed workspaces**: je konfiguriertem Workspace `<Name> <Belegung> of <Grenze> GB`, Belegung `—` ohne Messung, verbunden mit `·`; die Schaltfläche mit dem größten Workspace ruft `openWorkspace(id, 'administration')` der Fenstersitzung auf.
- **Local GitHub Actions**: Belegung (oder `—`), Grenze und die Segmente über 0 Byte.
- Polling: Solange die Karte existiert, fordert sie alle 5 s den Status still an (ohne Fehlermeldung); `dispose` beendet das Intervall.
- Bei `storageStatus` mit `writable: false` erscheint der bedingte Rahmen `When storage is not writable` mit `Alarm: new disk-writing work is blocked`.

| Feld                                          | Einstellungspfad                 | Bereich | Standard |
| --------------------------------------------- | -------------------------------- | ------- | -------- |
| **Maximum managed storage (GB)**              | `runtime.managedStorageLimitGiB` | 5–2048  | 50       |
| **Minimum Mac free space (GB)**               | `runtime.minimumFreeDiskGiB`     | 5–512   | 20       |
| **Maximum Local GitHub Actions storage (GB)** | `localCi.storageLimitGiB`        | 8–256   | 32       |

Jedes Feld ist ein `createImmediateSetting` über dem gespeicherten Wert. Beim Bestätigen (`change`) wird der Wert als Zahl gelesen; ist er endlich und im Bereich, wird er gerundet und als vollständige Einstellungen mit nur diesem Pfad geändert gespeichert, sonst wird der gespeicherte Wert erneut angewendet (keine Speicherung, Anzeige zurückgesetzt). Alle Felder sind gesperrt, solange irgendein Einstellungsschreibvorgang läuft. Dieselben Grenzen erzwingt das Einstellungsschema beim Speichern.

## Developer tools

Die Karte zeigt die sechs Werkzeuge `homebrew`, `git`, `github-cli`, `codex`, `claude`, `opencode` aus dem Laufzeitzustand; Installationsbefehle gibt es für alle außer Homebrew. **Install with Homebrew** erscheint nur bei fehlendem Werkzeug mit Installationsbefehl, ist ohne Homebrew oder während einer anderen Installation gesperrt und läuft erst nach dem Alert `install-runtime-dependency-<id>`. Ohne Homebrew erscheint der bedingte Rahmen `Without Homebrew`. Erkennung, Installation und Fehler: [Entwicklerwerkzeuge](../developer-tools/README.md).

## Virtual machines

- Zeilen: erkannte Kapazität aus `localCiCapacity`, **Resource preset** (`compact`, `balanced`, `performance`, `custom`; eine nicht unterstützte Stufe ist gesperrt und kann nicht gewählt werden), **Keep the virtual machine warm** (`reuseVirtualMachine`), **Runner data** (`<runtime.workspaceRoot>/local-ci`), Maschinenliste.
- Mit `custom` erscheinen vier Regler im bedingten Rahmen `With the Custom preset`: CPUs (min. 2), Memory (min. 8 GB), Virtual disk (min. 8 GB), Shared cache (min. 1 GB). Die Obergrenze jedes Reglers folgt aus der erkannten Kapazität und den übrigen Werten; Werte werden auf ganze Zahlen abgerundet und zwischen Minimum und Obergrenze begrenzt. Wechselt die Stufe erstmals auf `custom`, werden die aufgelösten Werte der bisherigen Stufe (bei bereits `custom` von `compact`) als `customResources` übernommen. Die Regler speichern beim Loslassen (`pointerup`, `keyup`).
- Speichern: Änderungen an Stufe, Wiederverwendung und Reglern werden in einer Warteschlange nacheinander gespeichert; ein Schritt ohne Unterschied zum gespeicherten `localCi` entfällt. Scheitert das Speichern, übernimmt die Karte wieder den gespeicherten `localCi`-Stand.
- Sperren: Stufe, Wiederverwendung und Regler während eines Einstellungsschreibvorgangs oder eines laufenden lokalen Laufs; **Clear runner data** während einer Bereinigung oder eines laufenden lokalen Laufs; **Remove** für eine Maschine in Gebrauch, während einer Entfernung oder Bereinigung.
- Maschinenzustand (erste zutreffende Regel): `busy` → `in use by the current run`, `keptWarm` → `kept warm for the next run`, `status === 'running'` → `running without a Symphony run`, `status === 'missing'` → `left behind, no longer tracked`, sonst `stopped, removable`. Zweck `workflow-runner` heißt **Workflow runner**, jeder andere **Machine from an earlier version**.
- Als liegengeblieben gilt eine Maschine, die weder `keptWarm` noch `busy` noch `running` ist; ab einer solchen Maschine erscheint ein Warnhinweis. Bei `localCi.pressure === 'critical'` erscheint `Local runner writes are blocked`.
- Alerts: `remove-local-ci-instance-confirmation` vor `removeLocalCiInstance(name)`, `clear-local-ci-data-confirmation` vor `clearLocalCiData()`. **Refresh machines** lädt die Liste mit erzwungener Aktualisierung.

Fixe Profilgrenzen, Kapazitätsreserven und die Laufzeitprüfung einer gespeicherten Custom-Konfiguration beschreibt [Managed Local CI](../managed-local-ci.md).

## Updates

Die Karte liest `DesktopUpdateStore.state()`. Status und Details werden aus dem Updatezustand abgeleitet (`Current version <v> · <channel> channel · Checked <Zeit>`). **Check for updates** ist nur in `idle`, `available` und `failed` freigegeben; **Release channel** (`stable`, `canary`) ist in `checking` und `downloading` gesperrt und ruft `setChannel`. Download und Installation bietet die Karte nicht an; sie gehören der Statusleiste und dem Menüleistenpanel. Zustände, Kanalwirkung und Fehler: [Anwendungsupdates](../application-updates/README.md).

## Sleep

- Vertrag: `power.get {}` und `power.keep-awake.set { enabled: boolean }` auf dem Desktop-Umschlag liefern `PowerState { keepAwakeWhileBusy: boolean; engaged: boolean; activeTaskCount: number }`; Main sendet jede Zustandsänderung an alle Renderer-Fenster (`onPowerState`).
- Main liest die Präferenz beim Start aus `keep-awake.json` im Konfigurationsverzeichnis (`{ "version": 1, "keepAwakeWhileBusy": boolean }`, Dateimodus 0600, atomar über eine temporäre Datei geschrieben). Fehlt die Datei oder ist sie ungültig, gilt `false`.
- Solange die Präferenz aktiv ist, fragt Main alle 15 s den Orchestrator nach aktiven Operationen und zählt Ausführungen, Work-Item-Entwürfe, Prüfläufe, lokale CI-Läufe und Werkzeuginstallationen. Bei aktiver Präferenz und mindestens einer Aufgabe hält Main eine Energiesperre vom Typ „App-Suspendierung verhindern“ (System wach, Bildschirm darf schlafen), sonst gibt es sie frei. Ein vorübergehender Abfragefehler ändert den Zustand nicht. Eine Änderung der Präferenz löst sofort eine Abfrage aus.
- Renderer: Der Schalter ist ein `createImmediateSetting` über `keepAwakeWhileBusy`; das Speichern gilt als erfolgreich, wenn der zurückgemeldete Zustand den neuen Wert trägt. Fehler melden `Sleep prevention could not be changed.` beziehungsweise beim Laden `Sleep prevention is unavailable.`; bis zum ersten Zustand zeigen Schalter und Statuszeile Skelette. Derselbe Schalter ist das Steuerelement des Suchtreffers.

## Mobile access

| Anfrage                                     | Wirkung                                                                                                               | Antwort                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `mobile-access.status.get`                  | aktueller Zustand                                                                                                     | Status                      |
| `mobile-access.enable` / `.disable`         | speichert die Präferenz; Ausschalten verwirft Herausforderungen, offene Kopplungen und Verbindungen, nicht die Geräte | Status                      |
| `mobile-access.pairing.create`              | neue Herausforderung, nur im Zustand `available`, Lebensdauer 5 min                                                   | `{ pairingUrl, expiresAt }` |
| `mobile-access.pairing.approve` / `.reject` | `{ pairingId }`                                                                                                       | Status                      |
| `mobile-access.device.revoke`               | `{ deviceId }`; unbekannte Id ist ein Fehler; trennt die Verbindung                                                   | Status                      |
| `mobile-access.devices.revoke-all`          | entfernt alle Geräte                                                                                                  | Status                      |

Status: `{ enabled, state: 'disabled' | 'starting' | 'rebinding' | 'available' | 'stopping' | 'unavailable', origin?, unavailableReason?, pendingPairings: { id, deviceName, verificationCode /* sechs Ziffern */, requestedAt, expiresAt }[], devices: { id, name, pairedAt, lastSeenAt?, connected }[] }`. Eine aktivierte Präferenz startet beim Laden des Dienstes im Zustand `starting`.

Renderer-Regeln: Der Schalter ist ein `createImmediateSetting` über `enabled` und ist während jeder Umschaltung, Herausforderungserzeugung gesperrt (`mobileAccessBusy`); eine zweite Anfrage während `busy` wird verworfen. Ausschalten leert die angezeigte Herausforderung. Während `enabled` fragt die Karte alle 2 s still den Status ab. **Pair a phone** erscheint nur in `available`; Anfragen in `pendingPairings` erscheinen mit **Reject** und **Approve**; **Paired phones** ab einem Gerät, **Revoke all phones** ab zwei. Entzüge fragen zuerst über `SettingsAlertService.confirm` (`revoke-mobile-device-<id>`: `Revoke <Name>?`, **Revoke** / **Keep access**; `revoke-all-mobile-devices`: `Revoke all <n> phones?`, **Revoke all phones** / **Keep access**; jeweils `danger`, destruktiv) und senden die Anfrage erst nach Bestätigung; die Kopplungsentscheidung läuft ohne Alert. Fehlertexte: `Unable to load mobile access.`, `Unable to enable mobile access.`, `Unable to disable mobile access.`, `Unable to create a mobile pairing code.`, `Unable to update the mobile pairing request.`, `Unable to revoke the paired phone.`, `Unable to revoke paired phones.` Protokoll, Sicherheitsgrenzen und Sitzungen: [Mobile companion phase 1](../mobile-companion-phase-1.md).

## Appearance

- `user.theme` ist `'light' | 'dark' | 'system'` (Standard einer neuen Installation `light`). Das Segment ist ein `createImmediateSetting` und speichert die vollständigen Einstellungen mit geändertem `user.theme`; nur diese drei Werte werden angenommen.
- `DesktopThemeStore` (in jedem Renderer-Fenster) wendet bei jeder Änderung `light` oder `dark` an; bei `system` folgt es `prefers-color-scheme: dark` und hört auf dessen Änderung, bis sich die Präferenz ändert. Es schreibt die Präferenz zusätzlich in `localStorage` (`orchestration.theme-mode`), damit der nächste Fensterstart vor dem Laden der Einstellungen im richtigen Schema zeichnet; ein Speicherfehler dort ist folgenlos. Native Fensterhintergründe und Fensterbedienelemente folgen dem Betriebssystemschema.
- Der Slot `settings.global.appearance` nimmt optionale Karten auf, die nicht zum Platform-Feature gehören. Ihre `search`-Einträge zählen zum Bereich Appearance.
- Arcade: `user.arcadeEnabled` (Standard `false`). Der Schalter ist ein `createImmediateSetting` über `IArcadeSettingsContext.setEnabled`; die Navigationsbeiträge lesen dieselbe Präferenz, sodass **Arcade** in der Gruppe `More` des Hauptfensters über den fensterübergreifenden Einstellungsabgleich sofort erscheint oder verschwindet. Die Zeile **God mode** erscheint nur bei aktivem Arcade und zeigt Folge, Fortschritt und Sitzungsaktivierung des Arcade-Feature-Zustands.

## Fehler und Wiederherstellung

| Fehlerfall                                      | Erkennung                       | Sichtbarer Fehler                                        | Nebenwirkungen                   | Wiederherstellung                      |
| ----------------------------------------------- | ------------------------------- | -------------------------------------------------------- | -------------------------------- | -------------------------------------- |
| Zahlenwert außerhalb des Bereichs oder leer     | Prüfung beim Bestätigen         | keiner; Feld zeigt den gespeicherten Wert                | keine Speicherung                | gültigen Wert eingeben                 |
| Einstellungsspeichern scheitert                 | `saveSettings` liefert `false`  | `Unable to save settings.` mit Detail                    | keine                            | Steuerelement zeigt gespeicherten Wert |
| Speichermessung scheitert                       | Produzent fängt die Ausnahme    | Ladeansicht bleibt; Alarm `When storage is not writable` | schreibende Arbeit gesperrt      | nächste Messung                        |
| Energiesperre nicht änderbar                    | Desktop-Anfrage scheitert       | `Sleep prevention could not be changed.`                 | Präferenz unverändert            | erneut umschalten                      |
| Mobiler Zugang nicht umschaltbar                | Orchestrator-Anfrage scheitert  | `Unable to enable/disable mobile access.`                | Präferenz unverändert            | erneut umschalten                      |
| Kopplungscode nicht erzeugbar                   | Zustand nicht `available` u. a. | `Unable to create a mobile pairing code.`                | bisherige Herausforderung bleibt | erneut erzeugen                        |
| Rückfrage abgelehnt oder mit Escape geschlossen | Alert liefert `false`           | keiner                                                   | keine                            | –                                      |

## Implementierungsabbildung in Symphony

| Verantwortung                     | Aktueller Pfad oder Symbol                                                                                                                                                                                                                                                                                                                                                                                                                                       | Beleg                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Bereichs- und Kartenregistrierung | `libs/frontend/features/automation/src/lib/provider/withAutomationSettings.ts`, `features/platform/src/lib/provider/withPlatformSettings.ts`, `features/ci/src/lib/provider/withCiSettings.ts`, `libs/frontend/update/src/lib/provider/withUpdateSettings.ts`, `libs/frontend/interaction/src/lib/provider/withPowerSettings.ts`, `features/mobile/src/lib/provider/withMobileSettings.ts`, `features/arcade/src/lib/settings/ArcadeSettingsViewSlotProvider.ts` | `apps/renderer-e2e/src/settings-window.spec.ts`                                                              |
| Storage-Karte                     | `features/automation/src/lib/settings/StorageSafetySettingsView*`, `pipes/StorageShareSummaryPipe.ts`, `libs/frontend/ui/src/lib/components/storage-breakdown/*`                                                                                                                                                                                                                                                                                                 | `StorageSafetySettingsViewPresenter.spec.ts`, `storageBreakdownEntries.spec.ts`, `storage-breakdown.spec.ts` |
| Speicherwächter                   | `apps/orchestrator/src/storage-governor/StorageGovernor.ts`, `quotaPressure.ts`; Schema `libs/ipc-contracts/features/platform/src/lib/StorageStatusSchema.ts`                                                                                                                                                                                                                                                                                                    | `StorageGovernor.spec.ts`                                                                                    |
| Virtual machines                  | `features/ci/src/lib/settings/views/VirtualMachinesCardView*`, `VirtualMachinesCardViewPresenter.ts`, `CiSettingsViewPresenter.ts`, `pipes/*`                                                                                                                                                                                                                                                                                                                    | `CiSettingsViewPresenter.spec.ts`, `local-ci-settings.spec.ts`, `local-ci-recovery.spec.ts`                  |
| Updates                           | `libs/frontend/update/src/lib/views/UpdateSettingsCardView*`, `view-presenters/UpdateSettingsCardViewPresenter.ts`, `pipes/*`                                                                                                                                                                                                                                                                                                                                    | `DesktopUpdateStore.spec.ts`                                                                                 |
| Sleep                             | `libs/frontend/interaction/src/lib/{views,view-presenters,pipes,state}/*`; `apps/desktop/src/keep-awake/KeepAwakeCoordinator.ts`, `main.ts` (`readKeepAwake`, `writeKeepAwake`, `scheduleActiveTaskRefresh`)                                                                                                                                                                                                                                                     | `KeepAwakeCoordinator.spec.ts`, `keep-awake-settings.spec.ts`                                                |
| Mobile access                     | `features/mobile/src/lib/settings/MobileSettingsCardView*`, `state/MobileAccessStore.ts`, `pipes/MobileAccessStatusLabelPipe.ts`; `libs/application/features/mobile/src/lib/MobileAccessService.ts`; Schemas `libs/mobile-contracts`                                                                                                                                                                                                                             | `MobileSettingsCardViewPresenter.spec.ts`, `mobile-pairing.spec.ts`                                          |
| Appearance                        | `features/platform/src/lib/settings/{AppearanceSettingsView,ThemeSegmentView}*`, `state/AppearanceSettingsStore.ts`, `theme/DesktopThemeStore.ts`; `features/arcade/src/lib/settings/*`                                                                                                                                                                                                                                                                          | `createArcadeSettingsContext.spec.ts`, `feature-settings-composition.spec.ts`                                |

## Verifikation und Akzeptanzkriterien

- **System** zeigt in dieser Reihenfolge Storage, Developer tools, Virtual machines, Updates und Sleep; die Sidebar listet die globalen Bereiche `Workspaces`, `Automation`, `Skills`, `System`, `Mobile access`, `Appearance`.
- Die Legende der Gesamtbelegung nennt nach der ersten Messung `Application state`, `Managed workspaces`, `Local GitHub Actions` und `Available`; die Segmentsumme entspricht der Gesamtbelegung.
- Ein Grenzwert außerhalb des Bereichs löst keine Speicherung aus und zeigt den gespeicherten Wert; ein gültiger Wert wird gerundet gespeichert und mit `Settings saved.` bestätigt.
- Ein Speicherstatus mit `writable: false` zeigt den Alarm; eine gescheiterte Messung ist nie beschreibbar.
- Eine Maschine in Gebrauch kann nicht entfernt werden; **Clear runner data** ist während eines lokalen Laufs gesperrt; Entfernen und Leeren laufen nur nach bestätigtem Alert.
- **Keep this Mac awake while tasks run** ist ohne `keep-awake.json` aus; Einschalten schreibt `{ "version": 1, "keepAwakeWhileBusy": true }` und zeigt bei Leerlauf `Sleep is allowed while Symphony is idle.`; Ausschalten schreibt `false`.
- **Pair a phone** erscheint nur in `available`; ein Gerät ist erst nach **Approve** gekoppelt; **Revoke** entfernt es erst nach bestätigter Rückfrage; **Keep access** sendet nichts.
- **System** im Theme-Segment folgt einem Wechsel des Betriebssystemschemas ohne Neuladen; **Show Arcade** blendet den Eintrag im Hauptfenster ohne Neuladen ein und aus und bleibt über einen Neustart erhalten.

## Verwandte Dokumentation

- [Einstellungsfenster](../window-and-navigation/settings-window.md)
- [System: dieser Mac](../../project/system/README.md), [Mobile access](../../project/system/mobile-access.md), [Appearance](../../project/system/appearance.md)
- [Entwicklerwerkzeuge](../developer-tools/README.md), [Anwendungsupdates](../application-updates/README.md), [Managed Local CI](../managed-local-ci.md), [Mobile companion phase 1](../mobile-companion-phase-1.md)
