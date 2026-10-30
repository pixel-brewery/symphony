# Entwicklerwerkzeuge erkennen und installieren

Symphony verwendet lokal installierte Programme für Git-Repositories, GitHub und AI-Konten. Unter **Settings → System → Developer tools** prüfst du, welche Programme die Anwendung starten kann. Eine erfolgreiche Werkzeugprüfung bestätigt die Installation und gegebenenfalls die Version; sie bestätigt keine Anmeldung bei einem Anbieter.

## Werkzeugstatus prüfen

1. Öffne **Settings → System → Developer tools**.
2. Wähle **Refresh**, um Homebrew, Git, GitHub CLI, Codex CLI, Claude Code CLI und OpenCode CLI erneut zu prüfen.
3. **Installed** mit einer Versionsangabe bedeutet, dass die lokale Versionsabfrage erfolgreich war.
4. **Not installed** bedeutet, dass Symphony die Verfügbarkeit nicht bestätigen konnte. Das kann auch an einer nicht auffindbaren oder nicht startbaren Installation liegen.

Die Prüfung installiert keine Programme und startet keine Anmeldung. Ein im Terminal funktionierender Befehl muss auch für die Anwendung erreichbar sein; ein Terminalalias allein ist kein Nachweis einer ausführbaren CLI-Datei.

## Codex auf dem Mac erkennen

Symphony berücksichtigt neben den normalen Befehlsuchpfaden auch bekannte Codex-Installationen innerhalb von **Codex** und **ChatGPT**. Dazu gehören aktuelle und ältere unterstützte App-Aufbauten im allgemeinen oder persönlichen Programmeordner. Bei Bedarf fragt Symphony zusätzlich die macOS-Anwendungsregistrierung ab. Die betreffende Anwendung wird dabei nicht geöffnet.

So kann eine mitgelieferte Codex CLI auch erkannt werden, wenn Symphony über Finder oder Dock gestartet wurde und der Befehl in dessen Suchpfad fehlt. Entscheidend bleibt, dass die Installation eine unterstützte, ausführbare CLI enthält und die Versionsprüfung erfolgreich ist.

Nach einer Installation oder einem Verschieben kannst du **Refresh** verwenden. Wenn du die Befehlsuchpfade deiner Shell nach dem Start geändert hast, starte Symphony neu, damit diese Umgebung neu eingelesen wird. Eine Installation in einem beliebigen anderen Ordner wird nicht automatisch gefunden: Sie muss über die Befehlsuche erreichbar oder als unterstützte OpenAI-Anwendung bei macOS registriert sein.

## Installation und Aktualisierung

Auf dem Mac bietet Symphony für fehlende unterstützte Werkzeuge **Install with Homebrew** an. Voraussetzung ist eine vorhandene Homebrew-Installation. Symphony installiert Homebrew nicht selbst.

Nach deiner Bestätigung installiert Symphony das ausgewählte Werkzeug mit einem festgelegten Paket und prüft anschließend erneut dessen Verfügbarkeit. Während der Installation sind weitere Installationsaktionen gesperrt. Ein Fehler wird angezeigt; du kannst danach den Werkzeugstatus erneut prüfen.

Die Aktualisierung eines bereits installierten Werkzeugs erfolgt über dessen bisherigen Installationsweg. Wird eine CLI von einer Desktopanwendung mitgeliefert, gehört deren Aktualisierung zur betreffenden Anwendung. Die Werkzeugprüfung führt selbst keine Updates aus.

## Codex gefunden und Codex angemeldet

Die gefundene Codex CLI und das in Symphony verbundene AI-Konto werden getrennt geprüft:

| Beobachtung                                  | Bedeutung                                                                       | Nächster Schritt                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Codex CLI zeigt **Installed**.               | Die Anwendung konnte die CLI-Versionsabfrage ausführen.                         | Das gewünschte AI-Konto separat prüfen oder verbinden.                                      |
| Das AI-Konto ist nicht angemeldet.           | Ein ausführbares Programm allein stellt noch keinen angemeldeten Zugang bereit. | Unter **Connected services** das gewünschte AI-Konto öffnen und dessen Anmeldung verwenden. |
| Die CLI bleibt **Not installed**.            | Die Verfügbarkeitsprüfung hat keinen erfolgreichen Nachweis geliefert.          | Installation und Erreichbarkeit prüfen, dann **Refresh** wählen.                            |
| Eine Prüfung oder Installation schlägt fehl. | Der vorherige Kontostatus wird dadurch nicht repariert.                         | Den gemeldeten Werkzeugfehler beheben und die passende Prüfung erneut ausführen.            |

Eine erfolgreiche Erkennung übernimmt keine Anmeldung aus einer anderen Anwendung, ändert kein AI-Konto und bestätigt keine Modellverfügbarkeit oder verbleibende Kontokapazität.
