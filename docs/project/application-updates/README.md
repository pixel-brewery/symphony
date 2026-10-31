# Symphony aktualisieren

Symphony zeigt auf macOS und Windows an, wenn im ausgewählten Updatekanal eine neuere Version verfügbar ist. Du öffnest den Download aus der Anwendung und installierst die neue Version selbst. Symphony installiert diese Updates nicht automatisch.

## Voraussetzungen

- Du verwendest eine installierte Symphony-Version für macOS oder Windows mit eingerichteter Updateadresse. Entwicklungsbuilds bieten keine Updateprüfung.
- Eine Internetverbindung und ein erreichbarer Updatekanal sind erforderlich.
- Die öffentliche Verteilung unter Pixel Brewery muss Installer und Kanalinformationen erfolgreich veröffentlicht haben. Die vorbereitete Veröffentlichungskonfiguration allein stellt noch kein Update bereit.

Für öffentliche Downloads ist kein GitHub-Konto erforderlich. Aktuell werden Installer für ARM64 angeboten. Unter Linux erfolgt die Aktualisierung manuell über das veröffentlichte Debian-Paket; die Updateprüfung in der Anwendung ist dort deaktiviert.

## Neue Versionen finden und installieren

Symphony prüft kurz nach dem Start, danach stündlich sowie nach dem Aufwachen oder Entsperren des Rechners auf Updates. Eine neuere Version macht den Download im Anwendungskopf und unter **Settings → System → Updates** verfügbar. Auf macOS bietet auch das Menüleisten-Menü die passende Updateaktion an.

Für eine Prüfung zu einem selbst gewählten Zeitpunkt:

1. Öffne **Settings → System → Updates**.
2. Prüfe die angezeigte installierte Version und den gewählten Kanal.
3. Wähle **Check for updates**.
4. Bei einer neueren Version wähle die Schaltfläche **Download** mit der angezeigten Versionsnummer oder die Downloadaktion im Anwendungskopf.
5. Der Browser öffnet den Installerdownload. Öffne anschließend die heruntergeladene Datei und führe die Installation nach den Vorgaben deines Betriebssystems aus.
6. Starte die installierte neue Symphony-Version. Sie zeigt ihre eigene Versionsnummer an.

Eine manuell angeforderte Prüfung meldet das Ergebnis zusätzlich als Benachrichtigung. Automatische Prüfungen aktualisieren die Updateanzeige und Downloadaktion. Der Hinweis **Update download opened** bestätigt das Öffnen des Downloadaufrufs, nicht den Abschluss des Downloads oder der Installation. Bis du die neue Version startest, kann die bisherige Anwendung weiter auf das verfügbare Update hinweisen.

## Updatekanal wählen

Die Einstellung **Release channel** befindet sich ebenfalls unter **Settings → System → Updates**. Die Auswahl wird lokal gespeichert und beim nächsten Start wiederverwendet. Nach einem Kanalwechsel beginnt zeitnah eine neue Prüfung.

| Einstellung                              | Bedeutung                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Stable**                               | Standardkanal für veröffentlichte, geprüfte Versionen.                                     |
| **Canary - every successful main build** | Kanal für neue Versionen aus erfolgreichen Veröffentlichungen des Hauptentwicklungsstands. |

Beide Kanäle können dieselbe Version enthalten. Ein Kanalwechsel lädt keine Anwendung herunter und installiert keine andere Version. Symphony bietet nur Versionen an, deren Versionsnummer höher als die installierte ist; ein Wechsel auf einen älteren Kanalstand löst kein Downgrade aus. Während einer laufenden Prüfung ist die Kanalauswahl gesperrt.

## Ergebnisse und Fehler

| Situation                                                                    | Sichtbares Ergebnis                                                                   | Nächster Schritt                                                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Eine neuere Version ist veröffentlicht.                                      | Die Zielversion und eine Downloadaktion werden angezeigt.                             | Installer öffnen und manuell installieren.                                                                     |
| Der Kanal enthält dieselbe oder eine ältere Version.                         | Symphony meldet, dass die Anwendung aktuell ist.                                      | Keine Installation erforderlich. Die Aussage gilt für den gewählten Kanal.                                     |
| Die Prüfung läuft bereits.                                                   | Die Anwendung zeigt die laufende Prüfung; eine zweite Prüfung startet nicht parallel. | Ergebnis abwarten.                                                                                             |
| Der Kanal ist nicht erreichbar oder liefert ungeeignete Updateinformationen. | Die Prüfung schlägt mit einer Fehlermeldung fehl.                                     | Verbindung prüfen und **Check for updates** erneut wählen. Die nächste automatische Prüfung erfolgt weiterhin. |
| Der Browser öffnet den Installer nicht oder der Download bricht ab.          | Die verfügbare Version bleibt unverändert.                                            | Download erneut anfordern oder den Installer aus den offiziellen Releases beziehen.                            |
| Für den Build ist keine Updateadresse eingerichtet.                          | Die Anwendung meldet, dass kein Releasefeed konfiguriert ist.                         | Eine für die öffentliche Verteilung bereitgestellte Version manuell installieren.                              |

Die Anwendung führt den Installer nicht für dich aus. Hinweise und erforderliche Bestätigungen des Betriebssystems bleiben Teil der manuellen Installation.

## Erster Wechsel zur Pixel-Brewery-Verteilung

Bereits installierte Builds behalten die bei ihrer Auslieferung hinterlegte Updateadresse. Die Übertragung des Repositorys ändert diese Adresse in einer bestehenden Installation nicht.

Installiere beim erstmaligen Wechsel die erste unter Pixel Brewery bereitgestellte Symphony-Version manuell aus den [offiziellen Releases](https://github.com/pixel-brewery/symphony/releases). Dieser Download ist erst verfügbar, wenn die öffentliche Veröffentlichung erfolgt ist. Anschließend nutzt die neue Anwendung die für diese Verteilung eingerichtete Updateadresse.
