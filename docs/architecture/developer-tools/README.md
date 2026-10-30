# Lokale Entwicklerwerkzeuge und CLI-Erkennung

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Verantwortungen

Die Werkzeugerkennung bestimmt, welches lokal vorhandene Programm Symphony für eine unterstützte CLI verwenden kann. Ein GUI-Start mit eingeschränktem Suchpfad darf eine vorhandene unterstützte Codex-Installation nicht allein deshalb als fehlend behandeln. Bestehende Suchpfade behalten ihren Vorrang. Die Erkennung wählt nur reguläre Dateien, für die die Betriebssystemprüfung auf Ausführbarkeit erfolgreich ist.

Erkennung, Verfügbarkeitsprüfung und Installation haben getrennte Aufgaben:

| Aufgabe               | Vertrag                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Erkennung             | Einen ausführbaren Kandidaten in festgelegter Reihenfolge auswählen.                                                                     |
| Verfügbarkeitsprüfung | Das ausgewählte Programm ausschließlich mit der zugelassenen Versionsabfrage prüfen und ein begrenztes Ergebnis liefern.                 |
| Installation          | Nach ausdrücklicher Bestätigung ein unterstütztes Werkzeug mit einem festen Homebrew-Rezept installieren und anschließend erneut prüfen. |
| Authentifizierung     | Das konkrete workspacegebundene AI-Konto prüfen oder verbinden. Eine erfolgreiche Versionsabfrage ersetzt diese Aufgabe nicht.           |

Die Suche installiert oder aktualisiert keine Programme, startet keine Desktopanwendung und ändert keine Konten, Anmeldedaten oder Providerprofile. Die Anmelde-, Modell- und Ausführungsregeln der [Providerintegration](../provider-model.md) bleiben eigenständig. Die funktionale Bedienung steht unter [Entwicklerwerkzeuge](../../project/developer-tools/README.md).

## Suchreihenfolge

Für die erlaubten Befehle `brew`, `git`, `gh`, `codex`, `claude` und `opencode` werden Kandidaten in dieser Reihenfolge geprüft. Der erste reguläre, ausführbare Dateikandidat gewinnt; fehlende, unzugängliche oder nur als Verzeichnis vorhandene Kandidaten werden übersprungen.

1. Verzeichnisse aus dem übergebenen Prozess-`PATH`.
2. Der ermittelte Login-Shell-`PATH`, wenn der Prozess nur die Standard-Systemverzeichnisse erhalten hat.
3. Die bekannten Werkzeugverzeichnisse `/opt/homebrew/bin` und `/usr/local/bin`.
4. Unter dem übergebenen `HOME`: `.volta/bin`, `.local/bin`, `.yarn/bin`, `.bun/bin`, `.npm-global/bin` und `Library/pnpm`.
5. Zusätzliche absolute Paketmanager-Präfixe: `npm_config_prefix` beziehungsweise `NPM_CONFIG_PREFIX`, gefolgt von `HOMEBREW_PREFIX`. Auf Unix wird deren `bin`-Unterverzeichnis verwendet; beim npm-Präfix auf Windows das Präfixverzeichnis selbst. Relative Präfixe werden ignoriert.
6. Die festen befehlsspezifischen Systemkandidaten, etwa `/usr/bin/git`.
7. Zusätzliche Codex-Kandidaten und anschließend unterstützte macOS-App-Bundles wie nachfolgend beschrieben.

Die gemeinsame Verzeichnisliste ist dedupliziert. `CODEX_INSTALL_DIR` und der Windows-Installationsort unter `LOCALAPPDATA/Programs/OpenAI/Codex/bin` gehören ausschließlich zum Codex-Fallback; sie verändern weder den Suchpfad anderer Werkzeuge noch deren Kindprozessumgebung. Auf Windows werden für Codex in einem Suchverzeichnis `codex.exe` und danach `codex` geprüft.

Die Dateiprüfung folgt einem Dateilink zum Ziel und verlangt eine reguläre Datei sowie erfolgreichen `X_OK`-Zugriff. Sie ist keine Prüfung der Herausgebersignatur oder der Authentifizierung. Das Hauptprogramm von `OpenCode.app` bleibt von der CLI-Erkennung ausgeschlossen; OpenCode benötigt weiterhin seine separate CLI.

## Codex innerhalb von macOS-Anwendungen

Nach erfolglosen normalen und installationsspezifischen Dateikandidaten prüft Symphony zuerst `/Applications` und danach `$HOME/Applications`, jeweils `Codex.app` vor `ChatGPT.app`. Für jedes ausgewählte App-Bundle gilt dieselbe Reihenfolge:

| Priorität | Kandidat relativ zu `Contents/Resources`                    |
| --------- | ----------------------------------------------------------- |
| 1         | Zulässiger `entrypoint` aus `codex-cli/codex-package.json`. |
| 2         | `codex-cli/bin/codex`.                                      |
| 3         | `codex-cli/CodexCLI.app/Contents/MacOS/codex`.              |
| 4         | Historischer Einstieg `codex`.                              |

Das Paketmanifest muss eine reguläre Datei sein und darf höchstens 16 KiB umfassen. Akzeptiert wird nur ein JSON-Objekt mit `layoutVersion: 1` und einem nicht leeren relativen `entrypoint`. Absolute Pfade, Steuerzeichen, Rückwärtsschrägstriche und ein lexikalisch normalisiertes Ziel außerhalb des zugehörigen `codex-cli`-Verzeichnisses werden verworfen. Die Pfadgrenze wird ohne Auflösung von Dateilinks geprüft; für das Ausführungsziel gilt weiterhin die oben beschriebene Dateiprüfung. Ein ungültiges, unbekanntes oder fehlendes Manifest verhindert die anschließende Prüfung der bekannten Layouts nicht. Auch ein Manifestziel muss die reguläre Ausführbarkeitsprüfung bestehen.

Wenn diese App-Pfade keinen Treffer liefern, liest Symphony über macOS Launch Services die registrierten Anwendungen für `com.openai.codex` und `com.openai.chat`. Dadurch können unterstützte umbenannte oder verschobene Anwendungen gefunden werden. Es findet keine rekursive Suche über beliebige Verzeichnisse statt.

Die native Abfrage verwendet ein festes JavaScript-for-Automation-Programm über `/usr/bin/osascript` und `NSWorkspace`. Sie startet die gefundenen Apps nicht und übernimmt höchstens zwei absolute, auf `.app` endende Pfade mit jeweils maximal 4096 Zeichen und ohne Steuerzeichen. Dieselbe Manifest- und Layoutprüfung wird anschließend auf diese App-Wurzeln angewendet. Nicht registrierte Installationen außerhalb der bekannten Orte benötigen einen erreichbaren CLI-Eintrag oder eine ausdrücklich unterstützte Installationsangabe; eine vollständige Dateisystemerkennung wird nicht zugesichert.

## Grenzen, Cache und Fehler

| Vorgang                 | Grenze und Verhalten                                                                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login-Shell-Umgebung    | Nur bei einem reinen System-`PATH`; interaktiver Login-Aufruf, danach normaler Login-Aufruf. Jeder Versuch ist auf 5 Sekunden und 1 MiB Ausgabe begrenzt. Fehler lassen die übrigen Kandidaten bestehen. |
| Login-Shell-Cache       | Ein Ergebnis pro Orchestratorprozess. Ein Neustart liest eine inzwischen geänderte Shell-Umgebung neu.                                                                                                   |
| App-Paketmanifest       | Maximal 16 KiB; fehlende oder ungültige Metadaten werden übersprungen.                                                                                                                                   |
| Launch-Services-Abfrage | Maximal 1,5 Sekunden und 16 KiB Ausgabe; Fehler oder unbrauchbare Antworten ergeben keine zusätzlichen Kandidaten. Kein Metadaten-Cache.                                                                 |
| Versionsprozess         | Der fest zugelassene Aufruf `--version` hat ein Zeitlimit von 10 Sekunden. Das ist kein Gesamtzeitlimit der vorhergehenden Suche.                                                                        |
| Homebrew-Installation   | Festes Rezept, maximal 15 Minuten und 1 MiB Ausgabe; Abbruchsignal und eine aktive Installation werden vom Orchestrator verwaltet.                                                                       |

Dateikandidaten und native Anwendungsregistrierung werden bei einer erneuten Auflösung wieder geprüft. Die normale Statusaktualisierung löscht den Login-Shell-Cache nicht und führt keine Reparatur der Benutzerumgebung durch.

Die Versionsprüfung erhält dieselbe wiederhergestellte Werkzeug-Suchpfadliste wie die Agentenausführung. Dadurch kann auch ein gefundener npm-Launcher mit `#!/usr/bin/env node` seine Laufzeit über die ergänzten Werkzeugverzeichnisse finden. Die übrige übergebene Umgebung bleibt erhalten; Codex-spezifische Fallback-Verzeichnisse werden diesem gemeinsamen Kindprozess-`PATH` nicht hinzugefügt.

Ohne Treffer bleibt beim erlaubten Codex-Befehl der normale Befehlsname als letzter Startversuch erhalten. OpenCode meldet dagegen ausdrücklich eine fehlende separate CLI. Ein fehlgeschlagener Versionsprozess, Startfehler oder Timeout ergibt `{ available: false }`. Bei Erfolg wird `{ available: true, version }` aus der getrimmten Standardausgabe gebildet. Die Oberfläche zeigt deren erste nicht leere Zeile als Version an; ohne nutzbaren Text bleibt es bei **Installed**. **Not installed** bedeutet daher keinen Beweis, dass auf dem gesamten Rechner keine Datei dieses Werkzeugs existiert.

## Transport, Installation und Anmeldung

Die Rendereransicht fordert über den validierten Vertrag `health.get` einen Status an. Die Antwort enthält Werkzeugverfügbarkeit und optionale Versionsausgaben; ein erfolgreicher Codex-Status setzt keinen Kontostatus auf angemeldet. Ausgewählte AI-Konten und ihre Authentifizierung bleiben an ihre bisherigen Workspace- und Providergrenzen gebunden.

`runtime-dependencies.install` akzeptiert nur `git`, `gh`, `codex`, `claude` oder `opencode`. Der Orchestrator serialisiert Installationen. Vor der Installation werden ein bereits verfügbares Ziel und fehlendes Homebrew abgewiesen. Paketnamen und Argumente sind fest hinterlegt; die Oberfläche kann kein beliebiges Paket übergeben. Nach erfolgreicher Installation muss dieselbe Verfügbarkeitsprüfung bestehen. Die Erkennung einer mitgelieferten Codex CLI veranlasst keine zusätzliche Installation. Spätere Aktualisierungen bleiben beim jeweiligen Installationsweg oder bei der ausliefernden Desktopanwendung.

## Implementierungsabbildung

| Verantwortung                                         | Aktueller Eigentümer                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Normale Suchverzeichnisse und Shell-Lebenszyklus      | [toolchainDirectories](../../../libs/providers/core/src/lib/toolchain-environment/toolchainDirectories.ts), [readLoginShellPath](../../../libs/providers/core/src/lib/toolchain-environment/readLoginShellPath.ts) und [LoginShellDirectoryCache](../../../libs/providers/core/src/lib/toolchain-environment/LoginShellDirectoryCache.ts). |
| Erlaubte Befehle und Auswahl einer ausführbaren Datei | [resolveAllowedCommand](../../../libs/providers/core/src/lib/command-health/resolveAllowedCommand.ts).                                                                                                                                                                                                                                     |
| Codex-Paketmanifest und unterstützte Bundle-Einstiege | [codexApplicationCandidates](../../../libs/providers/core/src/lib/command-health/codexApplicationCandidates.ts).                                                                                                                                                                                                                           |
| Native App-Registrierung                              | [registeredCodexApplications](../../../libs/providers/core/src/lib/command-health/registeredCodexApplications.ts).                                                                                                                                                                                                                         |
| Versionsprüfung und bestätigte Installation           | [inspectAllowedCommand](../../../libs/providers/core/src/lib/command-health/inspectAllowedCommand.ts) und [installAllowedCommandWithHomebrew](../../../libs/providers/core/src/lib/command-health/installAllowedCommandWithHomebrew.ts).                                                                                                   |
| Orchestratorstatus und AI-Kommandoauswahl             | [readRuntimeHealth](../../../apps/orchestrator/src/features/platform/readRuntimeHealth.ts) und [provideAiOrchestratorFeature](../../../apps/orchestrator/src/features/ai/provideAiOrchestratorFeature.ts).                                                                                                                                 |
| Nutzeraktionen und Darstellung                        | [DeveloperToolsSettingsView](../../../libs/frontend/features/platform/src/lib/settings/DeveloperToolsSettingsView.html) und [PlatformStore](../../../libs/frontend/features/platform/src/lib/state/PlatformStore.ts).                                                                                                                      |

## Akzeptanzkriterien

- Ein gültiges Codex-Programm im übergebenen Suchpfad behält Vorrang vor einem später gefundenen App-Bundle.
- Bei einem GUI-Systempfad werden unterstützte aktuelle und historische Codex-/ChatGPT-Bundle-Einstiege im System- oder Benutzer-Programmeordner gefunden.
- Ein zulässiger Version-1-Manifesteinstieg kann ein verändertes inneres Paketlayout beschreiben; ungültige oder ausbrechende Angaben werden übersprungen.
- Verschobene unterstützte Apps können über die begrenzte native Registrierung gefunden werden; ein Timeout blockiert die Suche nicht unbegrenzt.
- Ein ausführbares Verzeichnis wird nicht als CLI-Datei akzeptiert. Ein nicht ausführbarer Kandidat verhindert keinen späteren gültigen Treffer.
- Ein fehlgeschlagener Lookup startet keine Installation, Anmeldung oder Desktopanwendung und ändert keine Konten oder Profile.
- Gemeinsame Paketmanager-Präfixe bleiben nachrangig; Codex-spezifische Installationsorte ändern die Suchpfade anderer Werkzeuge nicht.
- Erfolgreiche Werkzeugerkennung und erfolglose Kontoanmeldung bleiben getrennte Ergebnisse. Die bestehende Konto- und Modellauswahl wird dadurch nicht umgeschrieben.
