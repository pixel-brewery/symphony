# Mobile access

Mit **Mobile access** in den [Einstellungen](../window-and-navigation/settings.md) machst du Symphony für Telefone im selben privaten Netzwerk erreichbar. Nur Telefone, die du koppelst und auf dem Mac bestätigst, erhalten Zugang. Der Mac bleibt dabei der Ort, an dem die Arbeit läuft: Das Telefon zeigt und steuert sie nur. Die Werkzeugleiste beschreibt den Bereich mit `Pair phones on the local network.`

## Voraussetzungen

- Das Telefon ist im selben WLAN wie der Mac.
- Symphony läuft auf dem Mac weiter. Beendest du Symphony ganz oder schläft der Mac, ist der mobile Zugang nicht erreichbar; mit **Keep running in background** bleibt er verfügbar.

Der Hinweis **The Mac remains the task owner** im Bereich nennt beides.

## Zugang ein- und ausschalten

Die Gruppe **Local network access** enthält **Allow mobile access**. Der Schalter ist zunächst aus und gilt sofort:

| Zustand          | Statuszeile                   | Bedeutung                                                                            |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| aus              | `Mobile access is off`        | Symphony nimmt keine Verbindungen von Telefonen an.                                  |
| wird vorbereitet | `Preparing mobile access…`    | Symphony wählt das Netzwerk und startet den Zugang, auch nach einem Netzwerkwechsel. |
| bereit           | `Ready on this Wi-Fi network` | Telefone können gekoppelt werden und verbinden sich; der Punkt ist grün.             |
| wird beendet     | `Stopping mobile access…`     | Der Zugang wird geschlossen.                                                         |
| nicht verfügbar  | der konkrete Grund            | Symphony kann im aktuellen Netzwerk keinen Zugang bereitstellen; der Punkt ist gelb. |

Bleibt der Schalter eingeschaltet, startet Symphony den Zugang bei jedem weiteren Start selbst. Ausschalten trennt verbundene Telefone, verwirft offene Kopplungen und QR-Codes und verhindert den automatischen Start; gekoppelte Telefone bleiben gespeichert und können sich nach dem Einschalten wieder verbinden. Schlägt das Umschalten fehl, meldet Symphony `Unable to enable mobile access.` beziehungsweise `Unable to disable mobile access.`, und der Schalter zeigt wieder den bisherigen Zustand. Während eines Umschaltens ist er gesperrt.

## Telefon koppeln

Die Gruppe **Pair a phone** erscheint nur, solange der Zugang bereit ist.

1. Wähle **Pair a phone**. Symphony zeigt einen QR-Code mit `Scan with your phone` und darunter die **Pairing address** zum Kopieren, falls die Kamera nicht verfügbar ist.
2. Scanne den Code mit dem Telefon oder öffne die Adresse im Browser des Telefons. Das Telefon schlägt einen Gerätenamen vor.
3. Auf dem Mac erscheint die Anfrage mit dem Gerätenamen und `Verification code` mit einer sechsstelligen Zahl. Das Telefon zeigt denselben Code.
4. Stimmen die Codes überein, wähle **Approve**; sonst **Reject**.

Ergebnis: Das Telefon ist gekoppelt und erscheint unter **Paired phones**. Eine abgelehnte Anfrage verschwindet; der QR-Code ist danach nicht mehr verwendbar.

Ein QR-Code gilt fünf Minuten und nur für eine Kopplung. **Generate a new QR code** erzeugt jederzeit einen neuen. Eine Kopplungsanfrage kannst du auch in der [Mitteilungszentrale](../notifications-and-tray/README.md) mit **Approve** oder **Reject** beantworten. Die Bestätigung auf dem Mac ist die einzige Rückfrage dieses Bereichs; eine zusätzliche Rückfrage erscheint nicht.

Die Kopplung weist nach, dass das Telefon den QR-Code dieses Mac kannte und du es bestätigt hast. Sie stellt nicht fest, wer das Telefon benutzt.

## Gekoppelte Telefone verwalten

**Paired phones** erscheint, sobald mindestens ein Telefon gekoppelt ist, und zeigt je Telefon den Namen und `Connected` oder `Last connected <Datum, Uhrzeit>`. Symphony aktualisiert die Liste alle zwei Sekunden, solange der Zugang eingeschaltet ist und der Bereich offen ist.

- **Revoke** fragt zuerst **Revoke <Telefon>?** („The phone loses access at once and its connection ends. Pair it again to use Symphony on it.“) mit **Revoke** (rot) oder **Keep access**. Nach der Bestätigung verliert das Telefon sofort den Zugang: Seine Verbindung endet, und weitere Anfragen werden abgewiesen, ohne dass Symphony neu starten muss.
- **Revoke all phones** erscheint ab zwei gekoppelten Telefonen und fragt zuerst **Revoke all <n> phones?** mit **Revoke all phones** (rot) oder **Keep access**; nach der Bestätigung verlieren alle Telefone den Zugang.

**Keep access** und Escape ändern nichts. Ein entzogenes Telefon muss neu gekoppelt werden.

## Fehlerfälle

| Situation                                  | Meldung                                                                                | Folge                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Der Zustand lässt sich nicht laden.        | `Unable to load mobile access.`                                                        | Bis zum ersten Zustand steht `Checking mobile access…`. |
| Ein QR-Code lässt sich nicht erzeugen.     | `Unable to create a mobile pairing code.`                                              | Der bisherige Code bleibt; erneut versuchen.            |
| Eine Anfrage lässt sich nicht beantworten. | `Unable to update the mobile pairing request.`                                         | Die Anfrage bleibt offen, bis sie abläuft.              |
| Ein Entzug schlägt fehl.                   | `Unable to revoke the paired phone.` beziehungsweise `Unable to revoke paired phones.` | Die Liste bleibt unverändert; erneut versuchen.         |

## Verwandte Features

- [System: dieser Mac](README.md)
- [Einstellungen](../window-and-navigation/settings.md)
- [Mitteilungszentrale und Menüleistenpanel](../notifications-and-tray/README.md)
