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

Der privilegierte Controller läuft nach abgeschlossenen Qualitäts- und Releaseläufen,
stündlich und auf ausdrückliche Workflowanforderung ausschließlich aus `main`.
Er lädt den vertrauenswürdigen Standardbranch, installiert keine Pakete und führt
keinen PR-Code aus. Repository-ID `1440122208`, öffentlicher Nicht-Fork-Status und
bestätigte API-Metadaten begrenzen den Zielbereich. Die Inventur liest höchstens
500 offene PRs und bearbeitet höchstens 30 bot-eigene Requests je Lauf. Andere
Autoren, Forks, Entwürfe, geschlossene PRs und andere Zielbranches bleiben unberührt.

Die Schreibrechte sind auf drei unterschiedliche Aufgaben verteilt. `merge` liest
Actions und PRs und darf den geprüften Head über den normalen Merge-Endpunkt
integrieren. `reconcile` besitzt die Rechte zum Aktualisieren bot-eigener Branches
und zum selben geschützten Merge, liest Actions aber nur. Der getrennte Job
`authorize` besitzt ausschließlich `actions: write`, `contents: read` und
`pull-requests: read`: Er darf den tatsächlichen Originalrun freigeben, weder
Branches verändern noch PRs mergen. Die Main-Fortsetzung hat ebenfalls nur
Contents-/PR-Leserechte und Actions-Schreibrecht. Kein Job erteilt PR-Reviews,
ersetzt Statuschecks oder verändert Schutzregeln.

Ein veralteter Bot-Branch wird durch `update-branch` mit `expected_head_sha`
aktualisiert. Der Controller wartet höchstens 16 Intervalle von jeweils 750 ms
auf einen anderen Head. Danach liest er die tatsächlichen nativen
`pull_request`-Läufe dieser Revision. Fehlt ein solcher Lauf, bleibt der PR
wartend; der Controller erzeugt keinen Ersatznachweis durch Dispatch. Manuelle
`ci.yml`-Läufe bleiben diagnostisch möglich und prüfen `expected_head_sha` gegen
`GITHUB_SHA`, zählen aber niemals als PR-Mergeproof. Rote, abgebrochene oder
laufende Originalversuche werden erhalten und nicht blind wiederholt.

Die Laufwahl trennt native PR-Läufe von Diagnose-Dispatches. Eine größere Run-ID
eines Dispatches verdeckt den älteren nativen Originalrun nicht. Nach der Auswahl
wird dessen aktueller `run_attempt` erneut geladen, da eine Workflowfreigabe die
Run-ID beibehält und einen neueren Versuch erzeugen kann. Ein Cron- oder manueller
Controller darf einen bereits vollständig grünen Originalrun nur über den
vollständigen Merger fortsetzen; er überspringt keine Source-, Job- oder
Schutzprüfung.

Eine Originalrun-Freigabe verlangt `action_required`, genau einen eigenen,
offenen Dependabot-PR und unveränderliche Serviceidentitäten für sowohl Actor als
auch Triggering Actor. Andere erfolgreiche native CI-Läufe dürfen von einem
regulären Maintainer stammen; ihre Mergeprüfung ist unabhängig von dieser engen
Freigabeberechtigung. Die isolierte Freigabestufe läuft mit `needs: reconcile`
und `always()` nach Abschluss der Reconcile-Stufe. Nach einem eigenen CI- oder
Release-Abschluss sowie bei Cron und manuellem Aufruf lädt sie die begrenzte
offene Bot-Inventur neu. Das frühere Ereignis bestimmt nicht den aktuellen Head
oder Versuch: Jeder aktuelle native Originalrun durchläuft weiterhin dieselbe
vollständige Source-, Actor-, Attempt-, Ref- und Schutzprüfung.
API- oder Freigabefehler werden ohne Wiederholung und mit festen, zugangsdatenfreien
Ergebnissen gemeldet.

Jede Freigabe und jeder Merge bindet den Sourceproof an drei vollständige SHAs:
`M` ist der aktuelle Hauptbranch, `B` der Bot-Head und `C` die tatsächliche
`refs/pull/N/merge`-Revision. `M` muss Vorfahr von `B` sein; beide Live-Refs müssen
die erwarteten Commits bezeichnen. `C` muss genau die Eltern `[M, B]` in dieser
Reihenfolge und denselben Tree wie `B` besitzen. Der aktuelle vollständige PR muss
Nummer, Identität, Head, Basis und Mergefähigkeit bestätigen. Die CI-Dateien aus
`M` und `B` werden anhand ihrer echten Git-Blob-Hashes geprüft.

Die CI-Autorität stammt aus einer positiv geprüften Baseline: Der feste
`reviewedCiSha256` im vertrauenswürdigen Main-Policyowner ist SHA256 der exakt
pin-normalisierten, ausdrücklich überprüften CI-Datei. Der zur Laufzeit geladene
Main-Blob muss diesen Wert erfüllen; die normalisierte PR-Datei muss exakt mit
Main übereinstimmen. Normalisierung ersetzt ausschließlich vollständige
40-stellige Actionpins und erlaubte Versionskommentare bei identischem
Action-Owner und Pfad. Andere CI-Logik, Schreibrechte, Secretverwendung oder
YAML-Darstellungen werden dadurch nicht automatisch autorisiert. Eine absichtliche
CI-Logikänderung benötigt eine neue Main-Prüfung samt bewusst aktualisiertem
Policywert. Weder PR, Event, API-Antwort noch Laufzeitlernen wählen die Baseline.

Der Merger verlangt den aktuellen erfolgreichen `pull_request`-Versuch des
aktiven Workflows `Repository Quality` mit genau einem zugeordneten PR. Zulässige
Workflowpfade sind die kanonische Datei, ihr exakter Bot-Branch-Ref oder der exakt
passende `refs/pull/N/merge`-Suffix. Alle acht Jobnamen und eindeutigen Job-IDs
müssen zu Head, Run und Versuch gehören und erfolgreich abgeschlossen sein:
Klassifizierung, Dokumentationsprüfung, drei OS-Prüfungen, Electron E2E, Package
smoke test und Quality Gate. Zusätzlich liest der Controller GitHubs tatsächlich
erzwungene PR-Regel und die sechs strikten Actions-Kontexte der drei OS-Jobs,
Electron E2E, Package smoke test und Quality Gate. Er verändert diese Regeln nicht.
Unmittelbar vor einem einzigen SHA-gesicherten Squash-Merge werden neuester
Originalrun, Workflow, PR und alle Live-Refs erneut geprüft. Die abschließende
vollständige PR-Antwort muss `merged === true` und die bestätigte Merge-SHA
enthalten. GitHubs Merge-Endpunkt hat keinen atomaren Expected-Base-Parameter;
eine inzwischen verschobene Basis bleibt zusätzlich durch die strikte
Branchregel geschützt.

Ein `GITHUB_TOKEN`-Merge startet keine gewöhnlichen Push-Workflows. Der separate
Fortsetzungsjob übernimmt deshalb die bestätigte Merge-SHA entweder vom direkten
Mergejob oder von der periodischen vollständigen Nachprüfung. Ging ein Joboutput
verloren, liest die Automatik nur die mit dem tatsächlichen aktuellen Maincommit
verbundenen PRs. Eine einfache REST-Zuordnung darf das Feld `merged` auslassen;
die zusätzlich geladene vollständige Antwort muss denselben PR mit
`merged === true`, passendem Bot und exakter Merge-SHA bestätigen. Mehrdeutige,
unbestätigte oder inzwischen überholte Zuordnungen starten keine neue Quelle.

Die Fortsetzung fordert vollständige Main-CI, gegebenenfalls die Downloadseite
und die vorhandene Patch-Releasepipeline an. Alle drei festen Profile prüfen die
bestätigte aktuelle Quelle erneut und deduplizieren vollständige, kanonische
Push- oder Dispatch-Läufe genau dieses Maincommits. Ein gescheiterter oder
abgebrochener Versuch wird erhalten. Andere Workflowpfade, beliebige Ref-Suffixe,
PR- oder Branch-Läufe werden bei gültiger Run-ID und positivem Attempt ignoriert;
unvollständige Inventare sowie ungültige IDs oder Attempts brechen vor einem Dispatch ab. CI und Pages verwenden
`expected_head_sha`, das Release weiterhin `source_sha`; eine Major-Version einer
Abhängigkeit ändert den Patch-Releasevertrag nicht.

Die Pages-Fortsetzung übernimmt unverändert die bestehenden Push-Pfadfilter:
Pages-Workflow, registrierte Downloadseiten- und Icondateien, unmittelbar unter
`tools` liegende Download-/Pages-Werkzeuge und Releaseasset-Prüfung. Bei
Umbenennungen zählt auch der vorherige Pfad. Eine reine Lockdateiänderung erzeugt
keine zusätzliche Seitenauslieferung. Ungültige Pfade oder ein möglicherweise
abgeschnittenes Commit-Dateiinventar mit mindestens 100 Einträgen brechen vor
jedem Dispatch ab. Bestehende Stable-/Canary-Auswahlen bleiben erhalten.

Der bestehende Nx-Owner `tools/nx-plugins/repository-tasks` besitzt das nicht
cachebare Ziel `repository-tasks:dependabot` mit `merge`, `reconcile`, `authorize`
und `continue`. Das typisierte Optionsinterface, JSON-Schema, die fachlich
getrennten Helper und kolokalen Tests gehören zu diesem Owner. Der privilegierte
Workflow startet dieselbe Implementierung über `runDependabotAutomation.mjs`
direkt mit Node, damit er mit Schreibrechten keine Workspace-Abhängigkeiten
installieren muss. Dies bleibt eine einzige Nx-eigene Implementierung und kein
paralleler CLI-Pfad. Offlineprüfungen ersetzen keine ausgeführten GitHub-Läufe.

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
