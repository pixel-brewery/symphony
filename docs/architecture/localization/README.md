# Anwendungssprache und Katalogprüfung

**Dokumentstatus:** Implementierter Ist-Stand

## Eigentum und Grenzen

Die Anwendung besitzt ihre statischen Bedienbeschriftungen in englischen und deutschen JSON-Katalogen. Jede Sprache enthält dieselben Schlüssel. Die Übersetzung verändert ausschließlich anwendungseigenen Text: Repository- und Workspace-Namen, Kommentare, benutzereigenes Markdown, Providerantworten, Quellcode und technische Bezeichner behalten ihren Ursprung. Das Locale ändert weder gespeicherte Work Items noch Provideranfragen oder deren Sprache.

Der Renderer registriert die Kataloge über die öffentlichen Mosaik-APIs vor der ersten Darstellung. Mosaik besitzt die Auflösung der Texte, die Formatierung und die Lokalisierung seiner eigenen Controls. Die unabhängige Frontend-Capability `@symphony/frontend-intl` besitzt die unterstützte Sprache und die fensterübergreifende Aktualisierung. Die Anwendungskomposition reicht ihren bestehenden Browserprofil-Speicher über einen schmalen Port an diese Capability weiter; Lokalisierung importiert weder Core noch Mitteilungszentrale. Es gibt keinen weiteren Übersetzungsdienst im Orchestrator und keinen HTTP-Endpunkt.

## Sprache und Lebenszyklus

Unterstützt sind `en` und `de`; die Vorgabe ist Englisch. Beim Start wird ausschließlich der Schlüssel `symphony.language` aus dem aktuellen Browserprofil gelesen. Unbekannte Werte und unzugänglicher Speicher ergeben `en`. Die Einstellung wird nicht aus dem Inhalt eines Workspace abgeleitet und ist kein Teil seines Exports.

Die Auswahl unter Appearance setzt die Mosaik-Sprache, das reaktive Sprachsignal und `document.documentElement.lang` im aktuellen Fenster sofort. Anschließend wird die Präferenz gespeichert. Ein Speicherfehler lässt die aktuelle Auswahl bestehen; lediglich die Wiederherstellung nach dem nächsten Start entfällt. Andere Desktop-Fenster desselben Origins erhalten die Änderung über ein `storage`-Ereignis, ohne sie erneut zu schreiben. Das Entfernen der Präferenz setzt Englisch. Der Ereignisbeobachter endet mit dem Angular-Anwendungskontext. Mobile Browser besitzen ihre eigene Präferenz; eine Kopplung überträgt keine Sprachwahl. Native Menüs und Systemdialoge behalten die Betriebssystemsprache; die eigenen nativen Dialogtexte stammen aus einem separaten JSON-Katalog mit denselben unterstützten Sprachen.

## Vorlagen und Platzhalter

Vorlagen verwenden Mosaiks strukturelle Übersetzungsdirektive mit einer lokalen Funktion `tr`. Beim Sprachwechsel aktualisiert Mosaik diese Funktion im bestehenden View-Kontext. Texte und Zugänglichkeitsbeschriftungen werden dadurch gemeinsam aktualisiert; fokussierte Controls und ihre Daten bleiben bestehen.

Ein vollständiger interpolierter Satz gehört in einen Katalogwert. Veränderliche Teile werden als positionelle Platzhalter `{0}`, `{1}` und so weiter geführt und als Array an `tr` übergeben. Die deutsche Übersetzung darf ihre Reihenfolge ändern, aber keinen Platzhalter hinzufügen oder entfernen. Wenn sich der Satzbau mit der Anzahl ändert, wählt die Vorlage einen vollständigen Katalogwert für Singular oder Plural. Mosaik ersetzt Platzhalter wörtlich. Erforderliche Wortabstände stehen im Katalogwert. Optionale Satzteile führen ihr Trennzeichen samt Leerzeichen mit. Technische Vergleiche, Routen, IDs, Iconnamen, Varianten und Eventparameter sind keine übersetzbaren Texte. Code- und Tastaturbeispiele bleiben außerhalb der Textextraktion.

Die JSON-Dateien sind die tatsächliche Runtime-Quelle und werden direkt in den Browser-Build eingebunden. Es gibt keinen unbenutzten Katalog und keine separat gepflegte generierte TypeScript-Kopie. Neue statische Texte erhalten einen stabilen Schlüssel im Namensraum `loc.symphony.*` und Werte in beiden Sprachen.

Reine Projektionen verwenden den DOM-unabhängigen öffentlichen Einstieg `@symphony/frontend-intl/labels`; der Haupteinstieg besitzt die Browser- und Angular-Registrierung. Metadaten, Beschriftungspipes und reine Projektionen verwenden einen typisierten Labeladapter, der während der Anwendung an denselben Spracheigentümer gebunden ist. Ein Aufruf liest dessen Sprachsignal; Getter und reaktive Projektionen werden deshalb beim Wechsel neu ausgewertet. Die Bindung endet mit ihrem Anwendungskontext, ohne die Bindung einer neueren Instanz löschen zu können. Außerhalb einer gestarteten Anwendung dürfen reine Projektionen bekannte englische Katalogeinträge verwenden. Ein unbekannter Schlüssel ist ein Fehler und wird nicht durch beliebigen Ersatztext kaschiert. Routen, Berechtigungen, Providerarten und andere Entscheidungswerte bleiben unabhängig von übersetzten Labels.

Module und wiederverwendete Menüobjekte lösen übersetzte Tabellenwerte erst beim Lesen auf. Berechnete Menübesitzer beobachten die Sprache ausdrücklich. Pipes, die lokalisierte Labels zu einem Text zusammenfügen, werten auch bei unveränderten Eingaben erneut aus. Die öffentlichen Anbieternamen zur Vorbelegung persistierter Kontonamen bleiben kanonische Literale. Modell- und Anbieterkennungen werden unabhängig von ihren sichtbaren Beschriftungen geführt. Solveranfragen stammen aus ihrem fachlichen Eigentümer und werden nicht aus Darstellungskatalogen erzeugt.

Angular-Datum- und Zahlenpipes behalten die vorhandenen Format-, Zeitzonen- und Dezimalstellenargumente und lesen zusätzlich das aktuelle Sprachsignal. Dafür ist deutsches Angular-Locale-Datenmaterial registriert; explizit übergebene Locales haben weiterhin Vorrang. Die Umstellung ändert nur Darstellung, Monatsnamen und Trennzeichen. Zeitpunkte, Sortierwerte, Kalenderregeln und die bisherige Zeitzonenbedeutung bleiben beim jeweiligen fachlichen Eigentümer.

## Ausführbare Qualitätsprüfung

Die öffentlichen Pakete `@pixel-brewery/wortlaut-nx-tasks` und `@pixel-brewery/wortlaut-eslint-rules` sind auf `0.2.4` gepinnt. Die Installation läuft mit Yarn und dem Node-Modules-Linker gegen GitHub Packages und benötigt dessen Registry-Authentifizierung. Eine normale Analyse und Sortierung benötigen keinen AI-Anbieter.

`yarn intl:analyze` prüft zuerst, dass jeder Katalogbereich die deklarierten Sprachen als vorhandene, nicht leere JSON-Objekte enthält. Diese Vorprüfung verhindert, dass fehlende oder leere Dateien vor der eigentlichen Analyse unbemerkt entfallen. Anschließend führt der Befehl den echten öffentlichen Nx-Executor aus. Der Target `frontend-intl:intl:analyze` übernimmt die vollständigen Optionen aus `nx.json`: Angular-Preset, JSON-Eingabe, englische Basissprache und die tatsächlichen Katalogwurzeln. Analyse läuft als Dry-run und schreibt keine Übersetzungen. Leere Werte, doppelte Schlüssel und unterschiedliche Schlüsselmengen sind Fehler. Gleiche Werte zur Basissprache bleiben Hinweise, weil Produktnamen und Fachbegriffe zulässig identisch sein können.

Der mit `wortlaut.lock.json` und Inhaltshash gepinnte offizielle Rule-Pack `wortlaut:message-checks` ergänzt blockierende Prüfungen für Platzhalter und ungültige ICU-Nachrichten. Längenwachstum und abweichende Satzzeichen sind Hinweise. Ein abweichender Packinhalt wird verweigert. Der Lock und der deklarative Packinhalt werden gemeinsam versioniert.

`yarn intl:lint` führt die öffentlichen ESLint-Katalogregeln auf den JSON-Ressourcen mit einer tatsächlichen JSON-Sprache aus. `yarn intl:references` verweigert statische `tr`-Verweise aus Vorlagen, deren Schlüssel in einem der Runtime-Kataloge fehlt. `yarn intl:sort` sortiert die kanonischen Dateien ausdrücklich. `yarn verify` enthält Analyse, Kataloglint und Referenzprüfung vor den bisherigen Quellcodeprüfungen. Es gibt keine AI-Übersetzung und keinen Schreibbefehl im CI-Gate.

## Implementierungsabbildung

| Verantwortung                                 | Eigentümer                                                              |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Kataloge                                      | `libs/frontend/intl/src/lib/resources/lang.{en,de}.json`                |
| Beschriftungen aus TypeScript-Projektionen    | `libs/frontend/intl/src/lib/labels/lang.{en,de}.json`, `translateLabel` |
| Native Menüs und Dialogtexte                  | `apps/desktop/src/intl/resources/lang.{en,de}.json`, `nativeText`       |
| Präferenz und Laufzeitsprache                 | `ApplicationLocalization`, `readApplicationLanguage`                    |
| Mosaik-Registrierung und Storage-Lebenszyklus | `provideApplicationLocalization`                                        |
| Angular-Datum- und Zahlenformatierung         | `ApplicationDatePipe`, `ApplicationDecimalPipe`                         |
| Desktop- und Mobile-Start                     | `ShellConfig` und Mobile `appConfig`                                    |
| Sprachwahl                                    | Appearance-Einstellungen und deren Presenter                            |
| Nx- und ESLint-Gates                          | `nx.json`, `frontend-intl`-Targets und `eslint.config.mjs`              |

## Verifikation und Migration

Bestehende Browserprofile ohne Präferenz starten weiterhin auf Englisch. Der Rückbau benötigt keine Änderung an Geschäfts- oder Providerdaten; ein unbekannter alter Präferenzwert wird ignoriert. Alte Quellcodebeschriftungen werden durch Katalogverweise ersetzt, ohne Bedingungen, Ereignisse oder Providerwerte zu übersetzen.

Der kontrollierte Electron-Test `application-language.spec.ts` prüft den laufenden Wechsel unter Appearance, die Synchronisierung mit dem Menüleisten-Renderer, die Wiederherstellung nach einem Neustart und die Rückkehr zu Englisch. Er prüft auch, dass vorhandene Einstellungen und relative Zeitbeschriftungen ihre Sprache wechseln. Ein eigener Renderingtest hält Uhrzeit und Pipe-Eingaben fest und wechselt nur die Sprache; damit kann ein späterer Uhrtick keine veraltete Übersetzung verdecken. Laufzeit- und Adaptertests decken blockierten Browserspeicher, Präferenzwerte, Bindungsabbau, mehrere Satzparameter sowie Datum- und Zahlenformatierung ab. Kontrollierte Katalogfixtures mit fehlendem Schlüssel oder verlorenem Platzhalter werden mit einem Fehlercode zurückgewiesen.

Renderer-, Mobile-, Desktop- und Orchestrator-Builds wurden geprüft. Der Electron-Test und die sichtbare Appearance-Aufnahme belegen den beschriebenen Desktop-Ablauf; sie belegen keine Abnahme sämtlicher migrierter Routen oder eines nativen Installationspakets. Die genaue private Referenz war für diese Änderung nicht verfügbar; die dokumentierte Adaption stützt sich auf die vorhandenen Symphony-Views und die öffentlichen Mosaik-Verträge. Private Referenzparität und die visuelle Gesamtprüfung bleiben eigene Verifikationsgrenzen.

Das sichtbare Verhalten beschreibt [Appearance](../../project/system/appearance.md).
