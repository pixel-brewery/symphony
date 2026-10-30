# Checkliste für technische Dokumentationsabdeckung

Wende diese Checkliste beim Aufbau, Synchronisieren, Migrieren und Auditieren eines technischen Features an. Halte nicht anwendbare Punkte in den Arbeitsnotizen fest; erzeuge keine leeren Abschnitte in der veröffentlichten Seite.

## Ziel, Umfang und Status

- Ist eindeutig, ob die Seite implementierten Ist-Stand, verbindliche Zielarchitektur oder einen Migrationsvertrag beschreibt?
- Sind technisches Ergebnis, Verbraucher, Inputs, Outputs, Garantien und ausdrücklich ausgeschlossene Verantwortung klar?
- Ist erkennbar, welche Aussagen stabiler Vertrag und welche austauschbare Implementierungsentscheidung sind?

## Eigentum und Abhängigkeiten

- Gibt es genau einen kanonischen Eigentümer für jede Verantwortung?
- Sind öffentliche Nähte, Verbraucher und Abhängigkeitsrichtung beschrieben?
- Sind beteiligte Frontend-, Backend-, Persistenz-, Job-, Provider- und Deployment-Grenzen vollständig?
- Sind Legacy-Pfade, Bypässe und geplante Entfernung berücksichtigt?
- Ist eine generische Archipel-Verantwortung von Symphony-spezifischer Policy getrennt?

## Verträge und Validierung

- Sind API-, Event-, Persistenz-, Datei-, Queue-, Cache- und Providerverträge soweit relevant präzise beschrieben?
- Sind Version, Bedeutung, Pflichtfelder, Grenzen, Defaults, Validierung, Fehler und Kompatibilität eindeutig?
- Sind generierte OpenAPI-Grenzen und getrennte Backend-/Frontend-Laufzeitmodelle berücksichtigt?
- Werden übergroße oder inkompatible Eingaben explizit abgewiesen statt still verändert?

## Kontext, Zugriff und Sicherheit

- Sind Authentifizierung, Berechtigung, Mandanten- und Ressourcenbesitz serverseitig eindeutig?
- Sind Kontextquelle und Vertrauensgrenzen erklärt, insbesondere welche Clientkennungen nicht autoritativ sind?
- Sind Feature-Verfügbarkeit, Entitlement, Quota, Credits und Rate Limits vollständig vor Nebenwirkungen angeordnet?
- Sind Geheimnisse, personenbezogene Daten, Protokollierung, Aufbewahrung, Export und Löschung berücksichtigt?
- Beweisen Ablehnungsfälle die Abwesenheit unerlaubter Provideraufrufe, Gebühren, Writes, Dateien, Events und Jobs?

## Zustand und Konsistenz

- Sind Zustände, Übergänge, Eigentum, Ablauf, Retention, Archivierung und Löschung beschrieben?
- Sind Transaktionsgrenze und Post-Commit-Folgen eindeutig?
- Sind Parallelität, Revisionen, Sperren, Idempotenz, Duplikate, Replays und Reihenfolge geregelt?
- Sind Teilfehler, Reconciliation und Wiederherstellung beschrieben, ohne falsche Atomizität zu versprechen?
- Bleiben GET- und andere Lesewege frei von fachlichen Reparatur- oder Schreibnebenwirkungen?

## Laufzeit und Betrieb

- Sind unterstützte Runtimes, Providerfähigkeiten, Konfigurationsgeltung und Fail-closed-Verhalten beschrieben?
- Sind Initialisierung, Aktivierung, Reconnect, Cleanup, Shutdown und Ressourcenfreigabe vollständig?
- Sind Timeouts, Payload-, Speicher-, Queue-, Parallelitäts-, Retry- und Retention-Grenzen bekannt oder als offene Entscheidung markiert?
- Sind Logs, Metriken, Traces, Korrelation, Health, Alarmierung und sichere Diagnosedaten beschrieben?
- Ist die Doppler-Quelle für neue oder geänderte Konfiguration berücksichtigt, ohne Geheimwerte zu dokumentieren?

## Ereignisse und Integrationen

- Sind Domain Events, SSE-Invalidierungen, Webhooks, Zustellungen, automatische E-Mails und Mailvorlagen auf echte Emissionspfade geprüft?
- Sind Scope, Payload, Version, Transaktionsbezug, Retry, Deduplizierung und Berechtigungen beschrieben?
- Ist ausdrücklich klar, welche Operationen keine dieser Nebenwirkungen auslösen?
- Sind externe Providerfehler, Wiederholung, Idempotenz und Betriebsverantwortung abgedeckt?

## Versionierung und Migration

- Sind Rückwärts-, Vorwärts-, Runtime- und Vertragskompatibilität getrennt entschieden?
- Ist das Verhalten für unbekannte oder neue Versionen eindeutig und zerstörungsfrei?
- Sind Migration, Koexistenzfenster, Reihenfolge, Wiederholbarkeit, Rollback und Entfernung des Altpfads beschrieben?
- Sind Datenbank- und Vertragsmigrationen durch historische Fixtures oder gleichwertige Belege verifizierbar?

## Tests und Durchsetzbarkeit

- Decken Akzeptanzkriterien die wesentlichen positiven, negativen, Konflikt-, Fehler-, Recovery- und Migrationsgarantien ab?
- Prüft jede Testschicht einen eigenen beobachtbaren Fehlerfall oder Vertrag statt dieselbe Aussage zu duplizieren?
- Sind Architekturgrenzen durch öffentliche Exporte, Nx-Regeln, Lint, Vertrags- oder Architekturtests gegen Bypässe abgesichert, wenn nötig?
- Sind Generatoren und ausführbare Validatoren als Eigentümer ihrer Artefakte genannt?

## Portabilitätsprobe

- Kann ein Implementierer ohne Zugriff auf Symphony jede materielle Entscheidung aus dem Dokument ableiten?
- Werden Repositorypfade nur als lokale Implementierungsabbildung verwendet und nicht als Ersatz für Verhalten?
- Sind externe Plattform- und Providerabhängigkeiten durch ihren konsumierten Vertrag beschrieben?
- Sind Beispiele vollständig genug, um Mehrdeutigkeit zu beseitigen, aber frei von Geheimnissen und Kundendaten?
- Sind offene Entscheidungen sichtbar und mit ihrer Auswirkung benannt, statt durch erfundene Defaults verdeckt zu werden?

## Synchronität

- Wurde jede geänderte Behauptung gegen Code, Konfiguration, Schema, Tests oder verifiziertes Laufzeitverhalten geprüft?
- Stimmen technische und fachliche Dokumentation überein, ohne dieselbe Verantwortung doppelt zu pflegen?
- Sind alte Pfade, Begriffe, Garantien und Links aus dem betroffenen Feature entfernt?
- Sind `docs/architecture/README.md`, lokale Links und der Dokumentstatus aktuell?
