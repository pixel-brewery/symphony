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
Ubuntu, macOS und Windows. Electron E2E und Paket-Smoke-Test laufen nur bei
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
Dependabot-Mergehelfer verlangt weiterhin fünf erfolgreiche schwere Ergebnisse;
Paket- und Workflowupdates fallen niemals unter die Dokumentationsausnahme.

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
`resources/download-page/` ausschließlich auf die tatsächlich eingelesene Datei
`downloads.css`. Ein zusätzliches README startet deshalb keine Seitenerstellung,
Deploymentabnahme oder Veröffentlichung. Die übrigen bestehenden Workflow-,
Icon- und Toolingauslöser sowie manuelle und wiederverwendbare Aufrufe bleiben aktiv.

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
