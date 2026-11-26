# Repository-Prüfung bei Dokumentationsänderungen

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Verantwortungen

Die Repository-CI klassifiziert den vollständigen Änderungsumfang vor der
Installation von Abhängigkeiten. Ausschließlich dokumentarische Änderungen
benötigen keine Betriebssystemmatrix, Anwendungstests, Electron-Abnahme oder
Paketierung. Gemischte Änderungen, ausführbare Dateien, Konfiguration und
unbekannte Pfade behalten alle Prüfungen. Ein manuell gestarteter Lauf prüft immer
vollständig.

Ein gemeinsamer Klassifizierer besitzt die Pfadregeln und den Git-Vergleich.
Der Qualitätsworkflow besitzt die Auswahl der Prüfungen und den abschließenden
`Quality Gate`. Der Releaseworkflow nutzt dieselbe Klassifizierung vor der
Vorbereitung einer Releaseversion. Die Entscheidung erzeugt keine Dateischreibungen,
Versionen oder externen Veröffentlichungen; der CLI-Einstieg schreibt nur seine
beiden booleschen Jobausgaben und eine Diagnose.

## Dokumentationsumfang

Eine Änderung gilt nur dann als dokumentarisch, wenn **jeder** betroffene Pfad
einer der folgenden Regeln entspricht:

- Prosa mit `.md`, `.mdx`, `.markdown`, `.rst`, `.adoc` oder `.asciidoc`.
- `LICENSE`, `NOTICE` oder `COPYING` an der Repositorywurzel, auch mit `.txt`.
- `.txt` unter `docs/` oder eine Datei `README*.txt`.
- Statische `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` oder `.svg` unter `docs/`
  beziehungsweise `.github/assets/`. Letzterer Ordner ist für README- und
  Dokumentationsgrafiken reserviert.

Die Ausnahmen haben Vorrang: `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`
und `SKILL.md` sowie die Pfadsegmente
`.agents`, `.claude`, `.codex`, `.opencode`, `.vscode`, `.design-sync`, `.ds-sync`,
`prompt`, `prompts`, `skill` und `skills` sind operative
Eingaben und verlangen vollständige Prüfung. Verschachtelte `.github/`-Ordner
bleiben ebenfalls operative Eingaben.
Unter `.github/` sind ausschließlich
die genannten Grafiken in `assets/` dokumentarisch. JavaScript, TypeScript, HTML,
JSON, YAML, gewöhnliche Textdateien und unbekannte Erweiterungen werden auch unter
`docs/` vollständig geprüft. Das verhindert, dass ausführbare Beispiele oder
Workflowänderungen über ihren Ablageort aus der Prüfung fallen.

## Ereignis- und Vergleichsvertrag

Die Eingabe besteht aus dem GitHub-Ereignisnamen und der unverändert gelesenen
JSON-Ereignisdatei. Der Checkout enthält die vollständige Historie.

| Ereignis                                 | Vergleich                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pull_request`                           | Gemeinsamer Vorfahr von `base.sha` und `head.sha` bis `head.sha`; fremde Änderungen im inzwischen fortgeschrittenen Zielzweig gehören nicht zum PR. |
| `merge_group`                            | `merge_group.base_sha` bis `merge_group.head_sha`, einschließlich aller Änderungen der Gruppe.                                                      |
| `push`                                   | `before` bis `after`, einschließlich sämtlicher Commits des Pushs.                                                                                  |
| Manuell, wiederverwendbar oder unbekannt | Vollständige Prüfung.                                                                                                                               |

Beide Revisionen müssen vollständige, von Null verschiedene Commit-SHAs sein.
Fehlende, ungültige oder nicht vorhandene Historie und ein leerer Vergleich wählen
die vollständige Prüfung. Der Vergleich nutzt `git diff --no-renames --name-only -z`:
Eine Umbenennung enthält den entfernten und den neuen Pfad. So bleibt eine
Umbenennung von Quellcode in eine Markdown-Datei prüfpflichtig. Nullbyte-Trennung
bewahrt Leerzeichen, Anführungszeichen und Zeilenumbrüche in Dateinamen.
Ein fehlgeschlagener eigentlicher Diff oder eine nicht lesbare Ereignisdatei
schlagen den Klassifizierungsjob fehl.

Die Ausgaben `documentation_only` und `documentation_changed` sind ausschließlich
`true` oder `false`. Die zweite Ausgabe bezeichnet Änderungen unter `docs/`;
bei nicht bestimmbarer Historie oder manuellen Läufen ist sie vorsorglich `true`.

## Qualitätsworkflow und Fehlerbehandlung

Der Klassifizierungsjob benötigt nur Git und Node.js, keine Pakete oder Tests.
Ein separater kleiner Dokumentationsjob prüft bei verändertem `docs/` dessen
Struktur, lokale Links und Überschriftenziele mit dem vorhandenen Validator.
Bei Änderungen außerhalb von `docs/` hat dieser Job keine ausführbaren Schritte
und ist erfolgreich. Die drei Matrixinstanzen behalten ihre erforderlichen,
betriebssystemspezifischen Checknamen. Bei Dokumentationsänderungen laufen alle drei
als kleine Linuxjobs mit einer Erklärung; Checkout, Paketinstallation und sämtliche
Verifikationsschritte bleiben aus. Bei Codeänderungen verwenden sie wie bisher
Ubuntu, macOS und Windows. Electron E2E und Paket-Smoke-Test können nach
erfolgreicher Klassifizierung parallel zur Matrix starten. Beide laufen nur bei
`documentation_only != 'true'`.

Der mit `always()` ausgeführte `Quality Gate` verlangt erfolgreiche Klassifizierung
und einen erfolgreichen Dokumentationsjob sowie erfolgreiche Matrixinstanzen.
Bei explizitem `true` müssen Electron E2E und Paket-Smoke-Test `skipped` sein;
bei `false` müssen auch beide erfolgreich sein.
Fehlende oder ungültige Ausgaben, fehlgeschlagene oder abgebrochene Klassifizierung,
fehlgeschlagene Dokumentation und unerwartet übersprungene Tests schlagen das Gate
fehl. Es gibt keinen Filter am Workflowauslöser, der einen erforderlichen Check
offenlassen könnte.

Die Main-Regel verlangt `Quality Gate` zusätzlich zu den fünf vorhandenen
Matrix-/Abnahme-Kontexten. Die Workflowdatei verändert selbst keine Repositoryeinstellung; die
erforderlichen Kontexte müssen zusätzlich in der Main-Regel konfiguriert sein. Der privilegierte
Dependabot-Mergehelfer prüft alle acht erfolgreichen Jobs des auslösenden Laufs. Dazu gehören
Klassifizierung, Dokumentation, die drei Plattform-Jobs, Electron E2E, der Paket-Smoke-Test
und das Quality Gate. Paket- und Workflowupdates durchlaufen die vollständige Prüfung.

## Automatische Abhängigkeitsaktualisierung

Dependabot prüft npm-Pakete und GitHub Actions wöchentlich. Alle Updatearten,
einschließlich Major-Versionen, TypeScript und veröffentlichter Pixel-Brewery-Pakete,
nehmen am selben Verfahren teil. Zusammengehörige Angular-, Nx-, Test- und
Pixel-Brewery-Paketfamilien werden gruppiert; eine Major-Version setzt die
Prüfanforderungen nicht herab. Der GitHub-Paketdienst verwendet die vorhandenen
Paketfreigaben für das Repository; Zugangsdaten liegen nicht in der Konfiguration.

Der privilegierte Controller läuft nach abgeschlossenen Qualitätsläufen,
stündlich und auf ausdrückliche Workflowanforderung. Er lädt ausschließlich den
vertrauenswürdigen Standardbranch, installiert keine Pakete und führt keinen
PR-Code aus. Unveränderliche Repository-ID und bestätigte API-Metadaten begrenzen
seinen Zielbereich. Die Inventur umfasst höchstens 500 offene PRs und bearbeitet
höchstens 30 bot-eigene Requests je Lauf. Beiträge anderer Autoren, Forks,
Entwürfe, geschlossene PRs und andere Zielbranches werden nicht verändert.

Ist ein Dependabot-Branch hinter dem aktuellen Zielbranch, fordert der Controller
`update-branch` mit `expected_head_sha` an. Er wartet höchstens 16 begrenzte
Intervalle auf den neuen Head. Danach fordert er `ci.yml` auf genau diesem Branch
mit `expected_head_sha` an. Der Qualitätsworkflow vergleicht die Eingabe vor der
Klassifizierung mit `GITHUB_SHA`; eine inzwischen verschobene Revision schlägt
fehl. Manuelle Läufe durchlaufen immer sämtliche Prüfungen. Bereits angeforderte
Läufe derselben Revision werden beibehalten, einschließlich fehlgeschlagener
Versuche; die Automatik wiederholt keine roten Tests blind. Ein auf Freigabe
wartender PR-Lauf verhindert die ausdrückliche Verifikationsanforderung nicht.
Ein Konflikt oder API-Fehler blockiert nur den betreffenden PR und wird mit einem
festen, zugangsdatenfreien Ergebnis gemeldet. Der nächste periodische Lauf prüft
den Bestand erneut.

Ein erfolgreicher Qualitätslauf darf einen PR nur freigeben, wenn genau ein
aktueller, offener Dependabot-PR aus demselben Repository zur geprüften Head-SHA
gehört. Bei `workflow_dispatch` ohne direkte PR-Zuordnung löst der Controller die
Zuordnung über die mit dem Commit verbundenen PRs auf und verlangt zusätzlich
den identischen `dependabot/`-Branch. Mehrdeutige Zuordnungen bleiben gesperrt.
Alle acht Jobs müssen im aktuellen Versuch erfolgreich sein; fehlende,
übersprungene, abgebrochene, doppelte oder rote Jobs genügen nicht. Der Controller
liest PR, Workflowversuch und Zielbranch vor dem Merge erneut und verlangt einen
aktuellen gemeinsamen Vorfahren. Der normale Squash-Merge übergibt die geprüfte
Head-SHA atomar an GitHub. GitHubs aktive PR- und erforderliche Checkregeln bleiben
zusätzlich verbindlich; die Automatik erteilt keine Freigaben und nutzt keinen
Bypass. Für den Zielbranch bietet der Merge-Endpunkt keinen atomaren
Expected-Base-Parameter; verschiebt er sich zwischen letzter Prüfung und Merge,
entscheidet die strikte GitHub-Branchregel.

Ein mit `GITHUB_TOKEN` ausgeführter Merge startet keine gewöhnlichen Push-Workflows.
Deshalb fordert die erfolgreiche Mergefortsetzung zunächst vollständige
Hauptbranch-CI und danach die bestehende Patch-Releasepipeline ausdrücklich an.
Beide Anforderungen sind an die bestätigte Merge-SHA gebunden, prüfen den aktuellen
Hauptbranch vor und unmittelbar vor dem Dispatch und erkennen vorhandene
Push-/Dispatch-Läufe derselben Quelle. Ein bereits gestarteter oder gescheiterter
Versuch wird erhalten; eine überholte Quelle erzeugt keinen neuen Lauf. Die
CI-Eingabe heißt `expected_head_sha`, die Releaseeingabe weiterhin `source_sha`.
Eine Major-Version einer Abhängigkeit ändert den bestehenden Patch-Releasevertrag
für Symphony nicht.

Die Implementierung gehört zum lokalen Nx-Plugin
`tools/nx-plugins/repository-tasks`, dessen nicht cachebares Ziel
`repository-tasks:dependabot` die Modi `merge`, `reconcile` und `continue` besitzt.
Die typisierte Executor-Schnittstelle, das JSON-Schema und die unmittelbar
benachbarten Tests sind die kanonischen Eigentümer. Im privilegierten Workflow
startet Node dieselbe Implementierung über `runDependabotAutomation.mjs` direkt:
Dies ist die bewusste Sicherheitsanpassung an das Verbot, mit Schreibrechten
Workspace-Abhängigkeiten zu installieren. Es gibt keine zweite CLI-Implementierung
außerhalb des Plugins. Offlinefälle prüfen veraltete Heads, asynchrone Updates,
mehrdeutige Zuordnung, fehlende Jobs, einen während der Prüfung veränderten PR,
Dispatch-Deduplizierung und überholte Hauptbranchquellen.

## Releasefolgen

Ein dokumentarischer automatischer Push auf `main` beendet den Releasepfad vor
Versionsermittlung, Paketinstallation, vollständiger Verifikation, nativen Builds
und Veröffentlichung. Er erzeugt weder Releasecommit noch Tag, Installer oder
Kanaländerung. Explizite `workflow_dispatch`-Anforderungen behalten die vollständige
Pipeline und die bestehenden Herkunfts-, Metadaten-, Signierungs- und
Veröffentlichungsprüfungen. Ein fehlgeschlagener Klassifizierungsjob kann keine
Releasevorbereitung freigeben. Details der Veröffentlichung stehen unter
[Desktop updates](../application-updates/README.md).

Die automatische Veröffentlichung der Downloadseite reagiert im Ordner
`resources/download-page/` ausschließlich auf die tatsächlich eingelesenen Dateien
`downloads.css` und `hero.webp`. Als Icon-Ressourcen lösen ausschließlich
`resources/icons/png/app/symphony-32.png` und
`resources/icons/png/app/symphony-192.png` die Veröffentlichung aus. Ein zusätzliches
README startet deshalb keine Seitenerstellung, Deploymentabnahme oder
Veröffentlichung. Die übrigen bestehenden Workflow- und Toolingauslöser sowie
manuelle und wiederverwendbare Aufrufe bleiben aktiv.

## Implementierung und Verifikation

Die aktuelle Umsetzung liegt in `tools/ClassifyCiChanges.mjs`,
`.github/workflows/ci.yml` und `.github/workflows/release.yml`.
`tools/ClassifyCiChanges.spec.ts` prüft echte isolierte Git-Repositories mit
mehrteiligen Pushs, fortgeschrittenen PR-Zielzweigen, Mergegruppen, Umbenennungen,
ungewöhnlichen Dateinamen und unbekannter Historie.
`tools/ci-documentation-scope.policy.spec.ts` prüft die Workflowabhängigkeiten und
führt das tatsächliche Gate-Shellskript für erfolgreiche, fehlgeschlagene,
abgebrochene und unerwartet übersprungene Jobzustände aus. Beide gehören zum
vorhandenen Nx-Testziel `desktop:test`.

Akzeptanz verlangt einen leichten Dokumentationspfad ohne Paketinstallation oder
Tests, vollständige Verifikation für Code und gemischte Änderungen, ein erfolgreiches
Gate ausschließlich für den korrekt ausgewählten Pfad und keine automatische
Releasevorbereitung bei einem rein dokumentarischen Push.
