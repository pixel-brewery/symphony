# Symphony aktualisieren

Symphony zeigt auf macOS und Windows an, wenn im ausgewählten Updatekanal eine neuere Version verfügbar ist. Auf deinen Wunsch lädt Symphony das Installationsprogramm selbst herunter, zeigt den Fortschritt in der Statusleiste und prüft die Datei, bevor sie verwendet wird. Installiert wird erst, wenn du **Restart to update** wählst; Symphony startet dann das geprüfte Installationsprogramm und beendet sich. Ohne deine Bestätigung lädt oder installiert Symphony keine neue Version.

## Voraussetzungen

- Du verwendest eine installierte Symphony-Version für macOS oder Windows mit eingerichteter Updateadresse. Entwicklungsbuilds bieten keine Updateprüfung.
- Eine Internetverbindung und ein erreichbarer Updatekanal sind erforderlich.
- Die öffentliche Verteilung unter Pixel Brewery muss Installer und Kanalinformationen erfolgreich veröffentlicht haben. Die vorbereitete Veröffentlichungskonfiguration allein stellt noch kein Update bereit.

Für öffentliche Downloads ist kein GitHub-Konto erforderlich. Aktuell werden Installer für ARM64 angeboten. Unter Linux erfolgt die Aktualisierung manuell über das veröffentlichte Debian-Paket; die Updateprüfung in der Anwendung ist dort deaktiviert.

macOS downloads use an ad-hoc bundle seal and are not notarized; Windows and Debian installers are unsigned. Review the [public source](https://github.com/pixel-brewery/symphony) and published checksums. Download and run at your own discretion. The [MIT license](../../../LICENSE) provides the software as-is, without warranty. Gatekeeper or SmartScreen may require your explicit approval.

## Symphony manuell herunterladen

Die öffentliche [Downloadseite](https://pixel-brewery.github.io/symphony/) bietet die Installer für macOS mit Apple Silicon, Windows auf ARM64 und Linux auf ARM64 als Debian-Paket. Sie zeigt die Stable-Version mit Veröffentlichungsdatum, Dateigrößen und SHA-256-Prüfsummen sowie einen Link zu den Release Notes. Ist Canary auf einer anderen Version, steht dafür ein eigener Downloadbereich bereit. Sind beide Kanäle gleich, wird derselbe Download nicht doppelt angeboten.

Nach jeder vollständig veröffentlichten Version und nach einer neuen Stable-Auswahl wird die Downloadseite automatisch aktualisiert. Angezeigt werden ausschließlich vollständige veröffentlichte Versionen; Entwürfe erscheinen nicht. Schlägt das Erstellen oder Bereitstellen der Seite fehl, bleibt der bisher veröffentlichte Seitenstand verfügbar. Die [offiziellen Releases](https://github.com/pixel-brewery/symphony/releases) bieten die veröffentlichten Versionen weiterhin direkt an.

Wähle den Installer für dein Betriebssystem und prüfe vor dem Start bei Bedarf seine SHA-256-Prüfsumme. Der Download allein installiert nichts: Unter macOS öffnest du das Disk-Image und ersetzt Symphony im Ordner **Programme**; unter Windows startest du das Setup; unter Linux installierst du das Debian-Paket. Die Hinweise zur Signierung und mögliche Bestätigungen des Betriebssystems gelten auch für diese manuellen Downloads. Intel- beziehungsweise x64-Installer werden derzeit nicht angeboten.

## macOS: installieren und erstmals öffnen

Das Disk-Image zeigt oberhalb von Symphony und dem Programme-Ziel die Datei **Read me first - Open Symphony.txt**. Sie erklärt den ersten Start auf Deutsch und Englisch. Dafür brauchst du kein Apple-Developer-Konto und kein kostenpflichtiges Zertifikat.

1. Ziehe **Symphony.app** auf **Applications (Programme)** und warte, bis der Kopiervorgang abgeschlossen ist.
2. Öffne **Programme** im Finder und starte Symphony dort per Doppelklick.
3. Blockiert macOS den Start wegen eines nicht verifizierten Entwicklers, wähle **Fertig**.
4. Öffne **Systemeinstellungen → Datenschutz & Sicherheit**, scrolle zu **Sicherheit** und wähle beim Hinweis zu Symphony **Dennoch öffnen**.
5. Bestätige mit **Öffnen** und authentifiziere dich, falls macOS danach fragt. Danach lässt sich diese Symphony-Kopie normal starten.

**Dennoch öffnen** erscheint erst nach einem blockierten Start und nur für begrenzte Zeit. Fehlt die Taste, versuche erneut Schritt 2 und kehre danach zu den Systemeinstellungen zurück. Ein verwalteter Mac kann die Ausnahme untersagen. Die Anleitung führt keine Befehle aus und verändert keine allgemeinen Sicherheitseinstellungen. Den Ablauf für diese einzelne App beschreibt [Apple](https://support.apple.com/de-de/102445).

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

Installiere beim erstmaligen Wechsel eine unter Pixel Brewery bereitgestellte Symphony-Version manuell von der [Downloadseite](https://pixel-brewery.github.io/symphony/) oder aus den [offiziellen Releases](https://github.com/pixel-brewery/symphony/releases). Anschließend nutzt die neue Anwendung die für diese Verteilung eingerichtete Updateadresse.
