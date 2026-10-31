# Symphony aktualisieren

Symphony zeigt auf macOS und Windows an, wenn im ausgewählten Updatekanal eine neuere Version verfügbar ist. Auf deinen Wunsch lädt Symphony das Installationsprogramm selbst herunter, zeigt den Fortschritt in der Statusleiste und prüft die Datei, bevor sie verwendet wird. Installiert wird erst, wenn du **Restart to update** wählst; Symphony startet dann das geprüfte Installationsprogramm und beendet sich. Ohne deine Bestätigung lädt oder installiert Symphony keine neue Version.

## Voraussetzungen

- Du verwendest eine installierte Symphony-Version für macOS oder Windows mit eingerichteter Updateadresse. Entwicklungsbuilds bieten keine Updateprüfung.
- Eine Internetverbindung und ein erreichbarer Updatekanal sind erforderlich.
- Die öffentliche Verteilung unter Pixel Brewery muss Installer und Kanalinformationen erfolgreich veröffentlicht haben. Die vorbereitete Veröffentlichungskonfiguration allein stellt noch kein Update bereit.

Für öffentliche Downloads ist kein GitHub-Konto erforderlich. Aktuell werden Installer für ARM64 angeboten. Unter Linux erfolgt die Aktualisierung manuell über das veröffentlichte Debian-Paket; die Updateprüfung in der Anwendung ist dort deaktiviert.

## Neue Versionen finden

Symphony prüft etwa 15 Sekunden nach dem Start, danach stündlich sowie nach dem Aufwachen oder Entsperren des Rechners auf Updates. Ist eine neuere Version verfügbar, erscheint rechts in der [Statusleiste](../window-and-navigation/README.md#statusleiste) neben `Symphony v<Version>` eine Downloadschaltfläche mit dem Downloadsymbol. Ihr Hinweistext lautet `Download Symphony <Version>`. Dieselbe Aktion bietet auf macOS das Menüleisten-Menü (**Download update** mit der Versionsnummer). **Settings → System → Updates** zeigt nur den Zustand; Download und Neustart gehören der Statusleiste. Ohne verfügbares Update zeigt die Statusleiste keine Updateschaltfläche.

Für eine Prüfung zu einem selbst gewählten Zeitpunkt öffne **Settings → System → Updates**, prüfe die angezeigte installierte Version und den gewählten Kanal und wähle **Check for updates**. Eine manuell angeforderte Prüfung meldet ihr Ergebnis zusätzlich als Benachrichtigung; automatische Prüfungen aktualisieren nur die Anzeige.

## Update herunterladen und installieren

1. Wähle die Downloadschaltfläche in der Statusleiste oder auf macOS **Download update** im Menüleisten-Menü.
2. Symphony lädt das Installationsprogramm im Hintergrund. In der Statusleiste füllt sich ein Fortschrittsring um das Downloadsymbol in ganzen Prozentschritten; die Schaltfläche ist währenddessen gesperrt. Die Einstellungen zeigen `Downloading a new version in the background…`, das Menüleisten-Menü `Downloading update…`. Du kannst Symphony währenddessen normal weiter verwenden.
3. Nach dem Download prüft Symphony, ob die Datei genau die vom Updatekanal angekündigte Größe und Prüfsumme hat. Nur eine vollständig übereinstimmende Datei wird behalten.
4. Die Schaltfläche in der Statusleiste wird zu **Restart to update**. Im Menüleisten-Menü heißt die Aktion **Restart and update to** mit der Versionsnummer; die Einstellungen zeigen `Version <Version> is ready to install.` Ein zusätzliches Hinweisfenster erscheint für ein so heruntergeladenes Update nicht.
5. Wähle **Restart to update**, wenn du bereit bist. Symphony prüft zuerst, ob noch Aufgaben laufen (siehe unten).
6. Symphony öffnet das geprüfte Installationsprogramm und beendet sich, damit die neue Version die alte ersetzen kann. Auf macOS öffnet sich das Disk-Image: Kopiere Symphony in den Ordner **Programme**, ersetze die vorhandene Version und starte Symphony anschließend. Unter Windows startet das Installationsprogramm und führt die Installation aus.
7. Die neue Symphony-Version zeigt ihre eigene Versionsnummer in der Statusleiste.

Hinweise und erforderliche Bestätigungen des Betriebssystems, etwa für eine nicht von Apple beglaubigte Anwendung, bleiben Teil der Installation.

### Laufende Aufgaben vor dem Neustart

| Ausgangslage                                                                                                                      | Rückfrage                          | Wahl und Ergebnis                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Keine Aufgabe läuft.                                                                                                              | keine                              | Symphony startet das Installationsprogramm und beendet sich.                                                                         |
| Nur Ausführungen von Agents laufen.                                                                                               | **Tasks are still running**        | **Pause tasks and update** pausiert die Läufe; sie setzen nach dem nächsten Start automatisch fort. **Later** verschiebt das Update. |
| Zusätzlich läuft ein Work-Item-Entwurf, eine lokale Verifikation, ein lokaler GitHub-Actions-Lauf oder eine Werkzeuginstallation. | **Tasks are still running**        | **Cancel tasks and update** bricht die laufenden Aufgaben ab. **Later** verschiebt das Update.                                       |
| Symphony kann die laufenden Aufgaben nicht sicher prüfen.                                                                         | **Update restart is not safe yet** | **Keep Symphony open**; das Update bleibt bereit.                                                                                    |

Nach **Later** meldet Symphony `Update postponed.`; **Restart to update** bleibt verfügbar, bis du das Update installierst, den Kanal wechselst oder Symphony beendest.

## Updatekanal wählen

Die Einstellung **Release channel** befindet sich ebenfalls unter **Settings → System → Updates**. Die Auswahl wird lokal gespeichert und beim nächsten Start wiederverwendet. Nach einem Kanalwechsel beginnt nach etwa einer Sekunde eine neue Prüfung.

| Einstellung                              | Bedeutung                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Stable**                               | Standardkanal für veröffentlichte, geprüfte Versionen.                                     |
| **Canary - every successful main build** | Kanal für neue Versionen aus erfolgreichen Veröffentlichungen des Hauptentwicklungsstands. |

Beide Kanäle können dieselbe Version enthalten. Ein Kanalwechsel lädt keine Anwendung herunter und installiert keine andere Version; ein bereits heruntergeladenes, noch nicht installiertes Update wird dabei verworfen. Symphony bietet nur Versionen an, deren Versionsnummer höher als die installierte ist; ein Wechsel auf einen älteren Kanalstand löst kein Downgrade aus. Während einer laufenden Prüfung und während eines Downloads ist die Kanalauswahl gesperrt.

## Zustände

| Zustand         | Statusleiste                                                       | Einstellungen                                             | Folgezustände                           |
| --------------- | ------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------- |
| Aktuell         | nur `Symphony v<Version>`                                          | `Symphony is up to date.`                                 | Prüfung                                 |
| Prüfung läuft   | nur `Symphony v<Version>`                                          | `Checking for updates…`                                   | Aktuell, Verfügbar, Fehler              |
| Verfügbar       | Downloadschaltfläche                                               | `Version <Version> is available to download.`             | Download läuft                          |
| Download läuft  | gesperrte Downloadschaltfläche mit sich füllendem Fortschrittsring | `Downloading a new version in the background…`            | Bereit, Fehler                          |
| Bereit          | **Restart to update**                                              | `Version <Version> is ready to install.`                  | Installation, nach Kanalwechsel Aktuell |
| Fehler          | nur `Symphony v<Version>`                                          | die Fehlermeldung                                         | nächste Prüfung                         |
| Nicht verfügbar | nur `Symphony v<Version>`                                          | Grund, etwa Entwicklungsbuild oder fehlende Updateadresse | –                                       |

## Ergebnisse und Fehler

| Situation                                                                                                                | Sichtbares Ergebnis                                                                                                                                         | Nächster Schritt                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Der Kanal enthält dieselbe oder eine ältere Version.                                                                     | Symphony meldet, dass die Anwendung aktuell ist.                                                                                                            | Keine Installation erforderlich. Die Aussage gilt für den gewählten Kanal.                                       |
| Die Prüfung läuft bereits.                                                                                               | Die Anwendung zeigt die laufende Prüfung; eine zweite Prüfung startet nicht parallel.                                                                       | Ergebnis abwarten.                                                                                               |
| Der Kanal ist nicht erreichbar oder liefert ungeeignete Updateinformationen.                                             | Die Prüfung schlägt mit einer Fehlermeldung fehl.                                                                                                           | Verbindung prüfen und **Check for updates** erneut wählen. Die nächste automatische Prüfung erfolgt weiterhin.   |
| Der Download bricht ab, erhält 60 Sekunden lang keine Daten oder die Datei stimmt nicht mit Größe und Prüfsumme überein. | Die Downloadschaltfläche verschwindet; die Einstellungen zeigen `Symphony could not download the available update.` Die unvollständige Datei wird gelöscht. | **Check for updates** wählen oder die nächste automatische Prüfung abwarten; danach den Download erneut starten. |
| Symphony wird während des Downloads beendet.                                                                             | Der Download wird abgebrochen und die unvollständige Datei gelöscht.                                                                                        | Nach dem nächsten Start bietet die nächste Prüfung das Update erneut an.                                         |
| Das heruntergeladene Installationsprogramm lässt sich nicht öffnen.                                                      | Symphony bleibt geöffnet, meldet `No update is ready to install.` und zeigt in den Einstellungen `Symphony could not start the update installation.`        | Erneut prüfen und herunterladen oder den Installer aus den offiziellen Releases beziehen.                        |
| Symphony wird mit einem bereiten, nicht installierten Update neu gestartet.                                              | Das Update ist nicht mehr bereit.                                                                                                                           | Die nächste Prüfung bietet es erneut zum Download an.                                                            |
| Für den Build ist keine Updateadresse eingerichtet.                                                                      | Die Anwendung meldet, dass kein Releasefeed konfiguriert ist.                                                                                               | Eine für die öffentliche Verteilung bereitgestellte Version manuell installieren.                                |

Bietet eine ältere Updateadresse noch kein Installer-Manifest an, verwendet Symphony das native Updateverfahren des Betriebssystems: Es lädt die neue Version selbstständig, der Fortschrittsring dreht sich dabei ohne Prozentangabe, und nach dem Download fragt das Hinweisfenster **Symphony update ready** mit **Restart and update** oder **Later**.

## Erster Wechsel zur Pixel-Brewery-Verteilung

Bereits installierte Builds behalten die bei ihrer Auslieferung hinterlegte Updateadresse. Die Übertragung des Repositorys ändert diese Adresse in einer bestehenden Installation nicht.

Installiere beim erstmaligen Wechsel die erste unter Pixel Brewery bereitgestellte Symphony-Version manuell aus den [offiziellen Releases](https://github.com/pixel-brewery/symphony/releases). Dieser Download ist erst verfügbar, wenn die öffentliche Veröffentlichung erfolgt ist. Anschließend nutzt die neue Anwendung die für diese Verteilung eingerichtete Updateadresse.
