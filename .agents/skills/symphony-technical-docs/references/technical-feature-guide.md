# Leitfaden für technische Features

Verwende diesen Leitfaden, wenn technische Symphony-Dokumentation unter `docs/architecture` neu aufgebaut oder grundlegend überarbeitet wird.

## Ablage

```text
docs/architecture/
├── README.md
└── <feature>/
    ├── README.md
    ├── <eigenstaendiger-vertrag>.md
    └── <migration>.md
```

Die Feature-`README.md` ist der stabile Einstieg und enthält den vollständigen technischen Gesamtvertrag. Weitere Seiten sind nur sinnvoll, wenn ein eigenständig implementierbarer Vertrag, eine erhebliche Variante oder eine Migration den Einstieg sonst unübersichtlich macht. Die Ordnerstruktur folgt technischen oder fachlichen Features, nicht Repository-Schichten.

## Dokumentstatus

Jede technische Feature- oder Vertiefungsseite beginnt direkt nach der Hauptüberschrift mit genau einem Status:

```markdown
**Dokumentstatus:** Implementierter Ist-Stand
```

Zulässig sind:

| Status                         | Bedeutung                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `Implementierter Ist-Stand`    | Alle als vorhanden beschriebenen Pfade und Garantien sind in der aktuellen Umsetzung verifiziert.                               |
| `Verbindliche Zielarchitektur` | Die Seite definiert das akzeptierte Ziel, behauptet aber nicht, dass dieses Ziel bereits vollständig umgesetzt ist.             |
| `Migrationsvertrag`            | Die Seite definiert Ausgangszustand, Zielzustand, Übergangsregeln, Kompatibilitätsfenster, Rückbau und nachweisbaren Abschluss. |

Analysen, POCs, unverbindliche Optionen und ungeklärte Vorschläge werden nicht durch eine dieser Bezeichnungen künstlich kanonisch. Sie bleiben außerhalb des technischen Handbuchs, bis ihr Status geklärt ist.

## Portabler Aufbau

Die folgende Vorlage ist ein Baukasten. Abschnitte ohne konkrete Aussage werden weggelassen; die Kernfragen zu Ziel, Umfang, Eigentum, Verträgen, Fehlern und Verifikation müssen dennoch beantwortet sein.

```markdown
# <Technisches Feature oder Capability>

**Dokumentstatus:** <Implementierter Ist-Stand | Verbindliche Zielarchitektur | Migrationsvertrag>

## Ziel und Garantien

<Welches technische Ergebnis besitzt die Capability? Welche Garantien erhalten Verbraucher, und was darf niemals passieren?>

## Geltungsbereich und Nicht-Ziele

- Enthalten: <Runtimes, Anwendungsfälle und Verträge>
- Nicht enthalten: <bewusst ausgeschlossene Verantwortlichkeiten>

## Verantwortungsgrenzen

| Verantwortung | Kanonischer Eigentümer | Öffentlicher Vertrag | Verbraucher |
| ------------- | ---------------------- | -------------------- | ----------- |

<Abhängigkeiten zeigen zum Eigentümer; volatile Provider- oder Frameworkdetails bleiben an dessen Rand.>

## Architekturüberblick

<Kompakte Erklärung oder Diagramm der Komponenten, Datenflüsse und Vertrauensgrenzen.>

## Ausführungsabläufe

### <Ablauf>

1. <Auslöser und Eingaben>
2. <Validierung und Entscheidungen>
3. <Transaktionale oder synchrone Arbeit>
4. <Folgen nach erfolgreichem Commit>
5. <Ergebnis für den Verbraucher>

## Verträge

### <API, Event, Persistenz, Provider oder interner Port>

- Bedeutung und Version:
- Eingaben und Validierung:
- Ausgaben:
- Fehler und Retry-Fähigkeit:
- Reihenfolge, Idempotenz und Kompatibilität:

<Bei Mehrdeutigkeit ein kompaktes Schema oder vollständiges Beispiel ergänzen.>

## Zustand und Lebenszyklus

| Zustand oder Phase | Eintritt | Erlaubte Operationen | Übergang oder Ende |
| ------------------ | -------- | -------------------- | ------------------ |

<Eigentum, Aufbewahrung, Ablauf, Löschung und Wiederherstellung erläutern.>

## Richtlinien und Sicherheitsgrenzen

- Authentifizierung und Berechtigungen:
- Mandanten- und Ressourcenisolation:
- Feature-, Tarif-, Entitlement-, Quota- oder Rate-Limit-Gates:
- Datenschutz, Geheimnisse und Protokollierung:
- Garantierte Nebenwirkungsfreiheit bei Ablehnung:

## Konsistenz, Parallelität und Idempotenz

<Transaktionsgrenze, Revisionen, Sperren, Reihenfolge, Duplikate, Replays, Teilfehler und Reconciliation.>

## Fehler und Wiederherstellung

| Fehlerfall | Erkennung | Öffentlicher Fehler | Nebenwirkungen | Wiederherstellung |
| ---------- | --------- | ------------------- | -------------- | ----------------- |

## Ereignisse, Webhooks und E-Mails

<Auslöser, Scope, Payload, Transaktionsbezug, Zustellung, Retry und Deduplizierung; ausdrücklich festhalten, wenn keine dieser Folgen entstehen.>

## Konfiguration, Runtimes und Provider

| Einstellung oder Fähigkeit | Geltungsbereich | Standard | Validierung | Auswirkung |
| -------------------------- | --------------- | -------- | ----------- | ---------- |

<Benötigte Laufzeitfähigkeiten und austauschbare Provider semantisch beschreiben; keine Geheimwerte veröffentlichen.>

## Betrieb und Beobachtbarkeit

<Logs, Metriken, Traces, Korrelation, Health, Ressourcenlimits, Timeouts, Retention, Alarmierung und sichere Diagnose.>

## Versionierung, Migration und Rollback

<Kompatibilitätsrichtungen, historische Zustände, Migrationsreihenfolge, Koexistenz, Abbruch, Rollback und Entfernung alter Pfade.>

## Implementierungsabbildung in Symphony

| Verantwortung | Aktueller Pfad oder Symbol | Beleg |
| ------------- | -------------------------- | ----- |

<Diese Abbildung lokalisiert die Umsetzung, ersetzt aber keine semantische Beschreibung.>

## Verifikation und Akzeptanzkriterien

- <Beobachtbare positive Garantie>
- <Negativer oder verweigerter Fall ohne unerlaubte Nebenwirkung>
- <Konflikt-, Retry-, Migrations- oder Wiederherstellungsfall>
- <Architekturgrenze oder verbotener Bypass>

## Offene Entscheidungen

- <Nur echte, für eine sichere Umsetzung relevante Entscheidung; Eigentümer und Auswirkung nennen.>

## Verwandte Dokumentation

- [Fachliches Feature](../../project/<feature>/README.md)
```

## Schreibregeln für Übertragbarkeit

- Ein exakter Symphony-Pfad beantwortet die Frage „Wo liegt es heute?“, nicht „Was muss implementiert werden?“. Beantworte immer beide Fragen getrennt.
- Ein fremdes Projekt darf andere Frameworks verwenden. Beschreibe deshalb zuerst Verantwortungen und Garantien und danach die derzeitige technische Projektion.
- Ein Verweis auf Archipel, Mosaik, Stripe, Redis, PostgreSQL oder einen anderen Provider muss den konsumierten Vertrag und das erwartete Fehlerverhalten erklären.
- Verwende normative Aussagen für echte Invarianten. Formuliere aktuelle Implementierungsdetails als solche, wenn sie austauschbar sind.
- Gib keine Pseudogenauigkeit vor. Unbekannte Grenzwerte, Versionen, Gründe oder Rollback-Garantien bleiben als offene Entscheidung sichtbar.
- Akzeptanzkriterien beschreiben beobachtbares Verhalten und Architekturgrenzen. Sie schreiben keine privaten Klassen, Dateinamen oder Testimplementierungen fest.

## Qualitätsprobe

Die Seite ist übertragbar, wenn eine neue Codex-Instanz ohne Repositoryzugriff:

1. Eigentümer, Abhängigkeiten und Vertrauensgrenzen bestimmen kann,
2. öffentliche und persistierte Verträge ohne materielle Annahmen rekonstruieren kann,
3. Erfolgs-, Ablehnungs-, Fehler- und Wiederherstellungswege implementieren kann,
4. Migration, Betrieb und Sicherheitsgrenzen korrekt berücksichtigen kann,
5. und mit den Akzeptanzkriterien beweisen kann, dass die neue Umsetzung denselben Vertrag erfüllt.
