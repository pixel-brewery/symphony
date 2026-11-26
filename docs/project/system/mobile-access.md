# Mobile access

Mit **Mobile access** in den [Einstellungen](../window-and-navigation/settings.md) machst du Symphony für Browser im selben privaten Netzwerk erreichbar. Du koppelst einen Browser durch Scannen eines von Symphony erzeugten QR-Codes oder Öffnen seiner Kopplungsadresse. Eine zusätzliche Bestätigung auf dem Mac ist nicht erforderlich. Der Mac führt die Arbeit aus; der Browser zeigt und steuert den freigegebenen Umfang. Das funktioniert auf einem Telefon und ebenso in einem Browser auf einem anderen Rechner.

## Voraussetzungen

- Das Gerät erreicht den Mac im selben privaten WLAN oder LAN.
- Symphony läuft auf dem Mac weiter. Beendest du Symphony ganz oder schläft der Mac, ist der Zugang nicht erreichbar; mit **Keep running in background** bleibt er bei weiter laufendem Mac verfügbar.

Du brauchst keine eigene Domäne und keinen gehosteten Dienst. Der erste lokale Stand verwendet unverschlüsseltes HTTP und ist ein Entwicklungs-PoC für ein ausdrücklich vertrautes Testnetz mit synthetischen oder nicht sensiblen Daten. Die Kopplung begrenzt den Zugang, macht die Netzwerkübertragung aber nicht verschlüsselt.

## Zugang ein- und ausschalten

Die Gruppe **Local network access** enthält **Allow mobile access**. Der Schalter ist zunächst aus und gilt nach erfolgreichem Speichern:

| Zustand          | Statuszeile                   | Bedeutung                                                                  |
| ---------------- | ----------------------------- | -------------------------------------------------------------------------- |
| aus              | `Mobile access is off`        | Symphony nimmt keine Browserverbindungen an.                               |
| wird vorbereitet | `Preparing mobile access…`    | Symphony wählt das private Netzwerk und startet den Zugang.                |
| bereit           | `Ready on this Wi-Fi network` | Browser können gekoppelt werden und sich verbinden.                        |
| wird beendet     | `Stopping mobile access…`     | Der Zugang wird geschlossen.                                               |
| nicht verfügbar  | der konkrete Grund            | Die Aktivierung oder der Netzwerkzugang konnte nicht abgeschlossen werden. |

Bleibt der Schalter eingeschaltet, startet Symphony den Zugang bei jedem weiteren Start selbst. Ist das private Netzwerk vorübergehend nicht verfügbar, bleibt der Wunsch gespeichert; Symphony versucht den Zugang beim nächsten Netzwerkabgleich wiederherzustellen.

Ausschalten beendet die Browserverbindungen, verwirft offene Einladungen und verhindert den automatischen Start. Gekoppelte Geräte bleiben gespeichert und können sich nach dem Einschalten wieder verbinden. Bei einem Fehler erscheint `Unable to enable mobile access.` beziehungsweise `Unable to disable mobile access.`. Kann das Ausschalten nicht gespeichert werden, bleibt der Zugang in der laufenden Symphony-Sitzung trotzdem geschlossen; der Schalter kann noch den bisher gespeicherten Wunsch zeigen. Prüfe den Fehler und wiederhole das Speichern. Während einer Umschaltung ist der Schalter gesperrt.

## Browser koppeln

Die Gruppe **Pair a phone** erscheint, solange der Zugang bereit ist.

1. Wähle **Pair a phone**. Symphony zeigt einen QR-Code mit `Scan with your phone` und darunter die **Pairing address** zum Kopieren.
2. Scanne den Code mit dem gewünschten Gerät oder öffne die vollständige Adresse in seinem Browser.
3. Nach erfolgreicher Kopplung öffnet sich der freigegebene mobile Bereich. Der Browser erscheint unter **Paired phones**; auf dem Mac ist kein **Approve** erforderlich.

Ein QR-Code gilt fünf Minuten und kann genau einen Browser koppeln. **Generate a new QR code** erzeugt eine weitere Einladung. Teile die vollständige Kopplungsadresse nur mit dem Gerät, das Zugang bekommen soll. Wer sie innerhalb ihrer Gültigkeit als Erster verwendet, kann diesen Zugang erhalten. Das weist den Besitz der Einladung nach und stellt keine persönliche Identität fest.

Lädt der Browser während der Kopplung neu oder geht eine Antwort verloren, kann derselbe Kopplungsversuch bis zum Ablauf fortgesetzt werden. Ein bereits gekoppelter Browser braucht beim normalen Wiederöffnen keinen neuen QR-Code. Nach einem Entzug, dem Löschen seiner Browserdaten oder einem Wechsel der erreichbaren Rechneradresse kann eine neue Kopplung nötig sein.

## Gekoppelte Geräte verwalten

**Paired phones** erscheint, sobald mindestens ein Browser gekoppelt ist, und zeigt je Gerät den Namen sowie `Connected` oder `Last connected <Datum, Uhrzeit>`. Symphony aktualisiert die Liste alle zwei Sekunden, solange der Zugang eingeschaltet und der Bereich offen ist.

- **Revoke** fragt zuerst **Revoke <Gerät>?** mit **Revoke** oder **Keep access**. Nach erfolgreichem Speichern verliert das Gerät sofort den Zugang. Seine Verbindung endet, und weitere Anfragen werden ohne Neustart abgewiesen.
- **Revoke all phones** erscheint ab zwei Geräten und fragt zuerst **Revoke all <n> phones?** mit **Revoke all phones** oder **Keep access**. Nach erfolgreichem Speichern verlieren alle Geräte den Zugang und offene Einladungen werden ungültig.

**Keep access** und Escape ändern nichts. Ein entzogenes Gerät muss neu gekoppelt werden. Schlägt das Speichern eines Entzugs fehl, zeigt Symphony einen Fehler und bestätigt keinen Entzug; erneut versuchen.

Nach einem erfolgreichen Entzug werden noch nicht zugelassene Analysen, Lösungen und Ticketverschiebungen nicht mehr gestartet. Bereits zugelassene Ausführungen behalten ihren Ablauf; beende sie bei Bedarf über ihre normale Abbruchaktion.

## Arbeiten und Verbindung wiederherstellen

Der Browser zeigt die vom Mac ausgewählten Workspaces mit Board, Tickets, Mitarbeitern und aktuellen beziehungsweise wartenden Ausführungen. Er kann ausschließlich die gerade angebotenen Aktionen starten. Ändert sich ein Ticket zwischen Anzeige und Ausführung, prüft der Mac die Aktion erneut und kann sie als nicht mehr verfügbar ablehnen. Private Kontozugänge, Dateien und die vollständigen Desktop-Einstellungen sind über diesen Zugang nicht erreichbar.

Bei einem Verbindungsabbruch versucht der Browser begrenzt, die Sitzung und die aktuellen Daten wiederherzustellen. Schreibaktionen werden dabei nicht automatisch erneut ausgeführt. Ist bei einer gestarteten Aktion die Antwort verloren gegangen, prüfe zuerst ihren aktuellen Zustand, bevor du sie erneut auslöst.

Ein Fehler beim Laden der Übersicht löscht eine bereits erfolgreiche Kopplung nicht. Verwende die angebotene Wiederholen-Aktion. Sie stellt auch den Empfang weiterer Änderungen neu her, wenn die automatischen Verbindungsversuche bereits beendet sind. Schreibaktionen werden dabei weiterhin nicht erneut ausgelöst. Nach einem erfolgreichen Geräteentzug verschwindet der bisherige Inhalt und der Browser benötigt eine neue Einladung.

## Fehlerfälle

| Situation                                                                        | Folge und Wiederherstellung                                                                                                                                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Der Zustand lässt sich nicht laden.                                              | `Unable to load mobile access.`; bis zum ersten Zustand steht `Checking mobile access…`.                                                                        |
| Ein QR-Code lässt sich nicht erzeugen.                                           | `Unable to create a mobile pairing code.`; bisherigen noch gültigen Code verwenden oder erneut versuchen.                                                       |
| Die Einladung ist abgelaufen oder wurde durch einen anderen Versuch verbraucht.  | Neuen QR-Code auf dem Mac erzeugen und im gewünschten Browser öffnen.                                                                                           |
| Die Übersicht lässt sich nach der Kopplung nicht laden.                          | Fehleransicht verwenden und den Abruf wiederholen; eine erfolgreiche Kopplung bleibt erhalten.                                                                  |
| Ein Entzug schlägt fehl.                                                         | `Unable to revoke the paired phone.` beziehungsweise `Unable to revoke paired phones.`; der bisherige Zugang bleibt bis zu einem erfolgreichen Entzug erhalten. |
| Der Mac schläft, Symphony ist beendet oder die private Netzwerkverbindung fehlt. | Mac und Symphony wieder verfügbar machen; bei geänderter Adresse einen neuen QR-Code verwenden.                                                                 |

## Verwandte Features

- [System: dieser Mac](README.md)
- [Einstellungen](../window-and-navigation/settings.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
