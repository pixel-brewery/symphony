# FLAMOX365-Zielworkflow – Konsolidierungsplan für Symphony

**Status:** Planungsentwurf (Schritt 1, keine Produktcode-Änderung)  
**Stand:** 2026-08-18  
**Quelle Sollzustand:** `FLAMOX365_Empfohlener_Gesamtworkflow.md` (Version 1.0, Board `Backlog → Qualified → Ready → Progress → Acceptance → Done`)  
**Quelle Istzustand:** aktueller `main` inklusive Working-Tree (provider-eigene Spalten, `columnMappings`, `columnId`)

Dieser Entwurf dokumentiert den Stand vom 18. August 2026. Seine damaligen Dateipfade und Migrationsoptionen sind historische Ausgangspunkte. Die aktuelle modulare Struktur, implementierten Zuständigkeiten und verbindlichen Paketgrenzen stehen im [Dependency Model](../architecture/dependency-model.md).

---

## 1. Ziel in einem Satz

Symphony wird vom „Skill-Package-Launcher mit neun internen Workflow-States“ zum **Supervisor/Orchestrator des FLAMOX365-Zielprozesses**: fünf fest eingebaute Prozessrollen (Create, Analyze, Solve, Verify, Supervisor), sechs Board-Status, orthogonaler technischer Workflow-State, atomare Claims mit Lease/Heartbeat/Fencing, Transition Guards, strukturierte Skill-Outcomes, Retry-/Rework-/Blocked-/Human-Required-/Fatal-Routing, Reconciliation und lückenlose Traceability. Skills sind keine importierbaren Pakete mehr, sondern eingebauter Code mit versionierten Prompts; einzige Anpassung durch den Anwender ist eine zusätzliche Prompt-Box je Rolle in den Settings.

---

## 2. Ist-Zustand (verkürzt, mit Fundstellen)

| Bereich         | Heute                                                                                                                                                                                                                                                | Fundstelle                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow-States | 9 Stufen `backlog, ready, analyzing, planned, executing, review, blocked, completed, failed`; `allowedNext` nur deskriptiv, nirgends erzwungen                                                                                                       | `libs/domain/src/lib/model.ts:2-14`, `libs/workflows/src/lib/default-workflow.ts`                                                                                                                       |
| Board-Spalten   | provider-eigen, Mapping Spalte→Workflow-State ausschließlich über `workItemSources[].columnMappings` (`columnId`), keine Heuristik zur Laufzeit (Working-Tree)                                                                                       | `libs/configuration/src/lib/application-settings.ts:158-187`, `libs/providers/src/lib/github-project-tracker.ts:714-742`, `azure-devops-work-tracker.ts:253-288`                                        |
| Skills          | drei portable Pakete `create/analyze/solve-change-request` unter `.agents/skills`, Discovery über drei Roots, Aktivierung = Rollen-Zuweisung in `agentTeams[].assignments`, eigene Hauptnavigation `/main/skills` mit Katalog, Editor, Import/Export | `libs/skills/src/lib/package-service.ts`, `apps/orchestrator/src/main.ts:154-157, 1864-1892`, `libs/frontend/features/skills/**`, `libs/frontend/presentation/src/lib/views/PresenterView.html:204-218` |
| Rollen          | `work-item-creation`, `analysis`, `solution`, `ci-diagnosis`, `ci-repair`, `pull-request-review`; **kein Verify**                                                                                                                                    | `libs/ipc-contracts/src/lib/contracts.ts:32`, `skillFlowPresentation.ts`                                                                                                                                |
| Ausführung      | `AnalyzerService` startet Analyse/Solution, setzt `→ready`/`→executing` selbst, `ExecutionRecord` mit `queued/running/waiting/succeeded/failed/cancelled`, Retry über `recoverInterruptedExecutions`, kein Outcome-Modell, keine Reason Codes        | `libs/application/src/lib/analyzer-service.ts:482-520, 704-1010`                                                                                                                                        |
| Claims          | `WorkItemClaim {action: analyze\|solve, owner, acquiredAt}` als GitHub-Git-Ref-Lock (ADR-008); **kein Lease, kein Heartbeat, kein Fencing Token**                                                                                                    | `model.ts:316-327`, `github-project-tracker.ts:744-838`                                                                                                                                                 |
| Human Gates     | Gate 1 existiert nur implizit (Board-Spalte); Gate 2 = `goals.review` (`approved/revision-required/blocked`) am Goal, nicht am Board-Status                                                                                                          | `TaskDialogViewPresenter.ts:475`, `model.ts:1226-1311`                                                                                                                                                  |
| Loops/Limits    | Goal-Loop mit `maximumIterations`; keine Retry-Staffelung nach Reason, keine Rework-Routen, kein No-Progress-Fingerprint                                                                                                                             | `analyzer-service.ts:955-963`                                                                                                                                                                           |
| Reconciliation  | `synchronizePullRequests` schreibt `→review/→completed`; `reconcileActiveExecutions` = pause+reactivate; 30-s-Scheduler                                                                                                                              | `automation-service.ts:270-302`, `main.ts:2656-2820`                                                                                                                                                    |
| Persistenz      | `executions`, `execution_events`, `goals`, `agentic_deliveries` als JSON-Payload-Tabellen; **keine Workflow-State-Tabelle**, keine Migrations-Infrastruktur                                                                                          | `libs/persistence/src/lib/sqlite-execution-repository.ts:20-83`                                                                                                                                         |
| Settings        | v3, keine Prompt-/Skill-Texte, Skills nur als IDs in Teams                                                                                                                                                                                           | `application-settings.ts:303-316, 383+`                                                                                                                                                                 |
| Toter Code      | `libs/skills/src/lib/catalog.ts` (`issue-analyzer`/`issue-solver`, `resolveSkill`) ohne Produktionsaufrufer                                                                                                                                          | –                                                                                                                                                                                                       |

Delta zum Soll ist damit klar: Board-Semantik, Rollenmodell, Outcome-Modell, Claim-Robustheit, Guards, Loops, Reconciliation-Breite, Persistenz und die gesamte Skill-UI müssen umgebaut werden. Erhalten bleiben: Prozessgrenzen (Renderer/Preload/Main/Utility), typisierte IPC, provider-eigene Spalten + `columnMappings`, GitHub-natives Claim-Ref als Distributed-Lock, Worktree-Isolation, Agent-Runtime-Adapter (Claude/Codex/OpenCode), Snapshot-Mechanik.

---

## 3. Zielarchitektur

### 3.1 Drei Ebenen (Soll §3)

1. **Board-Status** (`BoardStatus`): `backlog | qualified | ready | progress | acceptance | done` – ersetzt `WorkflowState`. Provider-Spalten werden weiterhin per `columnMappings` auf genau diese sechs Werte gemappt. Unmapped bleibt sichtbar, neutral, nicht automatisierbar.
2. **Prozessrollen** als eingebaute Skills: `create`, `analyze`, `solve`, `verify` (LLM-getrieben) + `supervisor` (deterministischer Code, kein Prompt). Zusätzliche eingebaute Rollen bleiben erlaubt (`ci-diagnosis`, `ci-repair`, `pull-request-review` heute; künftige nach demselben Muster).
3. **Technischer Workflow-State** (`WorkflowRecord` pro Work Item, lokal in SQLite): `workflowState` (`awaiting_human_review | idle | claimed | running | retry_wait | blocked | human_required | quarantined | verification_running | merge_pending | closed`), aktiver Run, Claim (mit Lease/Heartbeat/`claimVersion`), Revisionen, Zähler, Routing, Artefakte.

### 3.2 Neue/umgebaute Bausteine (Lib-Zuordnung)

| Baustein                                                                                                                                                                            | Ort                                                                                                                                                                                                                                                                                                                                                                                                                    | Inhalt                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `BoardStatus`, `WorkflowState`, `RunOutcome`, `ReasonCode`, `Route`, `WorkflowRecord`, `Claim`, `Revisions`, `AnalysisArtifact`, `VerificationReport`, `RunResult`, `HumanDecision` | `libs/domain/src/lib/model.ts` (+ evtl. Split in `workflow.ts`)                                                                                                                                                                                                                                                                                                                                                        | reine Typen/Enums/Guards                                                                                                                       |
| Transition Guards, Routing-Tabelle, Loop-Limits, Backoff-Staffelung, No-Progress-Fingerprint                                                                                        | `libs/workflows` (heute nur `default-workflow.ts`)                                                                                                                                                                                                                                                                                                                                                                     | pure Funktionen, keine I/O                                                                                                                     |
| `WorkflowEngineService` (Supervisor)                                                                                                                                                | `libs/application/src/lib/workflow-engine-service.ts` (neu)                                                                                                                                                                                                                                                                                                                                                            | Claim/Lease/Fencing, Guard-Auswertung, Routing der `RunResult`s, Retry-Scheduling, Loop-Limits, Eskalation, Reconciliation-Zyklus              |
| Rollen-Runner                                                                                                                                                                       | `libs/application/src/lib/analyzer-service.ts` wird zu Rollen-spezifischen Runnern (`analysis-runner`, `solution-runner`, `verification-runner`, `creation-runner`) oder bleibt eine Fassade, die den Engine-Entscheidungen folgt                                                                                                                                                                                      | Ausführung, Worktree, Kontext, Snapshot                                                                                                        |
| Built-in Skill Registry                                                                                                                                                             | `libs/skills/src/lib/builtin/*.ts` (ersetzt `catalog.ts`; `package-service.ts` entfällt)                                                                                                                                                                                                                                                                                                                               | je Rolle: `id`, `version`, `promptVersion`, `instructions`, `outputSchema` (Zod), `permissions` (read-only/edit), `defaultAgentPermissionMode` |
| Prompt-Customizing                                                                                                                                                                  | `application-settings.ts` v4: `skillCustomizations: Record<BuiltinSkillRole, { additionalInstructions: string; enabled: true }>`                                                                                                                                                                                                                                                                                       | einzige Anpassmöglichkeit                                                                                                                      |
| Persistenz                                                                                                                                                                          | `libs/persistence`: neue Tabellen `work_item_workflow` (id = work item id, payload JSON, `claim_version` INTEGER, `updated_at`), `workflow_audit` (append-only, `sequence`, `payload`), `run_results` (id = run id)                                                                                                                                                                                                    | plus minimale Migrations-Infrastruktur (`schema_migrations`, wie ADR-002 vorsieht)                                                             |
| IPC                                                                                                                                                                                 | `contracts.ts`: neue Methoden `workflow.get`, `workflow.decide` (Human Gate 1/2 + Acceptance-Loops), `workflow.resume` (nach Human Required), `workflow.close` (cancelled/duplicate/…), `workflow.reconcile`; Snapshot um `workflow`-Projektion je Work Item erweitert; Skill-CRUD/Import/Export entfällt, stattdessen `skills.builtin.list` + Settings                                                                | + Timeouts, `dispatch`-Cases                                                                                                                   |
| Renderer                                                                                                                                                                            | Board: Spalten weiterhin provider-eigen, Karte zeigt Workflow-State-Badge (Retry-Wartezeit, Blocked, Human Required, Verifying, Merge Pending); Task-Drawer: Panel „Workflow“ (Board-Status, State, Run, Claim/Lease, Revisionen, Zähler, Artefakte, Human-Required-Frage), Gate-Entscheidungen als Buttons; Settings: neuer Global-Abschnitt „Skills“ mit fünf Rollenkarten + Prompt-Box; Hauptnavigation ohne Skills | `libs/frontend/features/board`, `.../settings`, `libs/frontend/presentation`                                                                   |
| Mobile                                                                                                                                                                              | Snapshot-Erweiterung um `workflowState` + Human-Required-Frage; Kommandos für Gate-Entscheidungen optional Phase 2                                                                                                                                                                                                                                                                                                     | `libs/mobile-contracts`                                                                                                                        |

### 3.3 Skill-Ausführung (Prompt-Vertrag)

Für jede LLM-Rolle wird der Prompt deterministisch zusammengesetzt (`composeExecutionContext` erweitern):

```text
[Symphony System-Header: Rolle, Verbote (Governance-Matrix §6), Untrusted-Content-Regel]
[Eingebaute Skill-Instruktion vX.Y (versioniert)]
[Anwender-Zusatz aus Settings (klar als "Additional instructions" markiert, nachrangig)]
[Work-Item-Daten als Daten, nicht als Anweisung]
[Analyse-Artefakt / PR / Commit-SHA je Rolle]
[Output-Vertrag: JSON gemäß Zod-Schema der Rolle]
```

Jeder Run schreibt `execution: {skillId, skillVersion, promptVersion, policyVersion, customizationHash, model, inputRevision, outputHash}` (Soll §24). Der Anwender-Zusatz kann Governance nicht erweitern: Berechtigungen (Permission-Mode, Tool-Allowlist, Worktree, Tracker-Mutationen) werden weiterhin außerhalb des Prompts erzwungen.

### 3.4 Skill-Outcome-Routing (Supervisor)

`RunResult {outcome, reasonCode, recommendedRoute, summary, evidence[], issueRevision, analysisRevision, commitSha, artifacts[], retryable, humanDecisionRequired}` – Routing-Tabelle (rein):

| Outcome          | Wirkung                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PASS`           | Guard des nächsten Übergangs prüfen; bei Erfolg Board-Status setzen (`transition`), sonst `human_required` mit Guard-Report                                                                                                   |
| `RETRY`          | gleicher Status, `retry_wait` mit Backoff 1/5/30 min + Jitter, `retryCountByReason++`, nach 3 → `HUMAN_REQUIRED`                                                                                                              |
| `REWORK`         | Route nach Reason: Requirement-Loop → `backlog` (invalidiert alles), Re-Analysis-Loop → `qualified`, Implementation-Loop → bleibt `progress` (Solve erneut), `reworkCountByRoute++`, 3/Route bzw. 5 gesamt → `HUMAN_REQUIRED` |
| `BLOCKED`        | Status bleibt, `blocked` mit Grund + Dependency-Referenz, automatische Wiederaufnahme durch Reconciliation                                                                                                                    |
| `HUMAN_REQUIRED` | Status bleibt, Claim kontrolliert freigeben, Frage/Optionen/Auswirkungen persistieren, Erinnerung 48 h / Eskalation 5 d / 14 d                                                                                                |
| `FATAL`          | `quarantined`, kein Retry, Evidence sichern, Benachrichtigung                                                                                                                                                                 |
| `CANCELLED`      | `closed` mit Abschlussgrund, Worker stoppen, PR/Branch-Strategie                                                                                                                                                              |

### 3.5 Human Gates

- **Gate 1** (`backlog → qualified`): Entscheidung im Task-Drawer (Freigeben / Rückfrage / Überarbeiten / Duplikat / Ablehnen / Aufteilen / Zurückstellen) **oder** manueller Spaltenwechsel im Provider-Board (Reconciliation erkennt „Mensch hat Spalte geändert“ und schreibt eine `HumanDecision` mit `source: 'tracker'`). Guard prüft Pflichtfelder, offene Fragen, Duplikat, Cancelled.
- **Gate 2** (`acceptance → done`): Entscheidung im Task-Drawer (Akzeptieren / zurück Progress / zurück Qualified / zurück Backlog / nicht mehr erforderlich / Rückfrage). Guard: `acceptedCommitSha = prHeadSha`, Merge erfolgreich, Zielbranch enthält Commit, Post-Merge-Checks, Audit vollständig.
- Ein Skill kann keinen Gate-Übergang auslösen: `transition()` in beide Gate-Ziele ist nur über `workflow.decide` mit menschlicher Quelle erreichbar (Engine verweigert es sonst, nicht nur der Prompt).

### 3.6 Merge nach Gate 2 – Entscheidungsbedarf

`AGENTS.md:24` verbietet automatisches Mergen. Der Sollprozess sieht Merge **nach** menschlicher Akzeptanz durch den Supervisor vor. Vorschlag: „Akzeptieren“ im Task-Drawer ist die explizite menschliche Merge-Anweisung; Symphony führt den Merge über `gh pr merge` aus (kein Auto-Merge, weil vom Menschen je PR ausgelöst), Post-Merge-Checks laufen, dann `done`. Alternative: Merge bleibt manuell in GitHub, Reconciliation erkennt den Merge und setzt `done`. Beide Varianten müssen im Plan-Review entschieden und als ADR-012 festgehalten werden; der Plan geht von Variante 1 mit Opt-out-Setting aus.

---

## 4. Umsetzungsphasen (mapping auf Soll §32)

Jede Phase endet mit `yarn verify`, betroffenen E2E-Tests und Doku-Sync; jede Phase ist eigenständig releasebar.

### Phase 0 – Vorbereitung und Aufräumen

- Working-Tree-Änderungen (Spalten/`columnId`/Azure-Parität) committen; sie sind Voraussetzung.
- `libs/skills/src/lib/catalog.ts` entfernen, Spec anpassen.
- ADR-012 „FLAMOX365-Zielworkflow als Symphony-Prozessmodell“ (Board-Semantik, eingebaute Skills, Merge-Entscheidung, Claim/Lease/Fencing) und `docs/architecture/delivery-workflow.md` als normative Kurzfassung des Sollprozesses anlegen; `workflow-model.md`, `skill-model.md`, `skill-resolution.md`, `frontend-architecture.md`, `roadmap.md` als „wird durch Phase X ersetzt“ markieren.
- Minimale Migrations-Infrastruktur in `libs/persistence` (`schema_migrations`, geordnete Migrations-Funktionen), damit spätere Phasen Tabellen/Spalten sicher ergänzen.

### Phase 1 – Prozessgrundlage (Board, Rollen, Outcomes, Guards)

1. **Domain**: `BoardStatus` (6) ersetzt `WorkflowState`; `WorkflowState` wird zum technischen State; `RunOutcome`, `ReasonCode`, `Route`, `RunResult`, `HumanDecision`, `AnalysisArtifact` (Definition of Ready, Soll §8), `VerificationReport`. Alte Stufen entfallen ersatzlos (`analyzing/planned/executing/review/blocked/completed/failed`).
2. **Settings v4** + Migration v3→v4: `columnMappings` alte Werte übersetzen (`backlog→backlog`, `ready→ready`, `analyzing/planned→qualified`, `executing→progress`, `review→acceptance`, `completed→done`, `blocked/failed→ nicht gemappt + Hinweis`); `agentTeams[].assignments[].skillId` entfällt, Rolle bleibt (Agent-Routing bleibt); neu `skillCustomizations`. `suggestWorkflowState`-Heuristik auf die 6 Status umstellen (nur Editor-Vorbelegung).
3. **Built-in Skill Registry** (`libs/skills`): fünf Rollen mit versionierten Instruktionen (Basis: bestehende `.agents/skills/*-change-request/SKILL.md` + Soll §5), Zod-Output-Schemas, Berechtigungsprofil. `RuntimeCatalog.skill(role)` liefert eingebaute Definition + Customizing. `SkillPackageService`, Discovery-Roots, `skills.*`-CRUD-IPC, Import/Export, `workspace-transfer` Skill-Einbettung entfernen; `.agents/skills` bleibt als Contributor-Werkzeug (Codex/Claude Code) unangetastet, ist aber nicht mehr Laufzeitquelle.
4. **Guards** (`libs/workflows`): fünf Guard-Funktionen aus Soll §9 als pure Prädikate über `WorkflowRecord` + Tracker-/PR-Fakten; Ergebnis mit benannten fehlgeschlagenen Bedingungen (für UI/Audit).
5. **Engine (Kern)**: `WorkflowEngineService` mit `WorkflowRecord`-Repository, `applyRunResult()`, `decide(HumanDecision)`, `transitionWithGuard()`; `AnalyzerService` ruft nach jedem Run `applyRunResult` statt selbst Status zu setzen. Analyse liefert strukturiertes Artefakt (Definition of Ready) – kein Freitext mehr als Vertrag.
6. **Tracker**: `transition(id, BoardStatus)`; Gate-Zielstatus nur mit `HumanDecision`-Beleg erlaubt.
7. **Renderer**: Board-Spalten-Mapping auf 6 Status; Task-Drawer „Workflow“-Panel (lesend) + Gate-1/Gate-2-Entscheidungen; Skills aus Hauptnavigation entfernen; Settings-Abschnitt „Skills“ (fünf Karten: Name, Version, Beschreibung, Berechtigungsprofil, Prompt-Box „Zusätzliche Anweisungen“, Reset); `libs/frontend/features/skills` auf diesen Settings-Baustein reduzieren oder in `features/settings` überführen; Global-Suche und Deep-Links anpassen.
8. **Tests**: Guard-/Routing-Tabellen als Tabellentests; Settings-Migration; E2E: Navigation ohne Skills, Settings-Skills-Abschnitt, Gate-Entscheidungen im simulierten Modus.

### Phase 2 – Zuverlässigkeit (Claims, Leases, Fencing, Idempotenz, Reconciliation)

1. `Claim` um `runId`, `leaseUntil`, `heartbeatAt`, `claimVersion` erweitern; GitHub-Claim-Ref trägt diese Felder im Ref-Payload (ADR-008 fortschreiben), lokal gespiegelt in `work_item_workflow`. Azure-Tracker: Claim über Work-Item-Feld/Tag oder lokal-only mit Hinweis (Entscheidung im Review).
2. Heartbeat-Loop pro aktivem Run (bestehendes `lastHeartbeatAt` an Lease binden); Lease-Ablauf → Run stale, `claimVersion++`, Reconciliation, sicherer Retry oder Human Required.
3. Fencing: jede schreibende Engine-Operation (Tracker-Transition, Artefakt, Kommentar, PR) prüft `claimVersion`; veralteter Worker wird abgewiesen und protokolliert.
4. Idempotency Keys (Soll §14.1) für create/analyze/solve/verify/merge; Vorab-Prüfungen (Branch/PR/Kommentar/Artefakt existiert?).
5. Reconciliation-Worker (ersetzt/erweitert `synchronizePullRequests`): Board vs. WorkflowRecord vs. Branch vs. PR vs. Head-SHA vs. Checks vs. Verify vs. Merge; Beispiele aus Soll §14.3 als Regeln; manuelle Spaltenwechsel als `HumanDecision(source: tracker)` oder als Run-Invalidierung.
6. Supervisor-Robustheit: `work_item_workflow` ist Wahrheit, Wiederanlauf aus Persistenz, Watchdog-Timer im Main-Prozess (Utility-Process-Health), keine Claims nur im Speicher.
7. Audit-Tabelle append-only, jede Transition/Entscheidung/Run/Claim-Änderung.

### Phase 3 – Qualität (Verify, Acceptance Mapping, Commit-Bindung, Merge)

1. **Verify-Rolle**: eigener Runner, read-only Worktree auf PR-Head-SHA, eigene Agent-Route/Permission-Mode, prüft ACs gegen Verhalten, Plan gegen Diff, CI-Ergebnisse, Nebenänderungen, Security, Tests; liefert `VerificationReport` (Evidence je AC, Findings, Fehlerursache-Klassifikation). Nur Verify darf `verifyOutcome=PASS` schreiben; Solve-Runner hat keinen Zugriff auf dieses Feld.
2. Verify-Invalidierung bei neuem Commit/Rebase/Force-Push (Reconciliation vergleicht `verifiedCommitSha` mit PR-Head).
3. Acceptance Mapping im Analyse-Artefakt verpflichtend; Guard `qualified→ready` prüft es; PR-Body-Template mit Run-ID, Revisionen, Mapping, Testnachweisen, Risiko/Rollback (Soll §16.2); Branch-Schema `issue/<id>/<slug>/run-<n>`.
4. Merge nach Gate 2 gemäß Entscheidung aus §3.6, Post-Merge-Checks (konfigurierbar: CI auf Zielbranch), Merge-Randfälle (Soll §16.4) als Routing-Regeln.
5. Renderer: Verify-Report im Task-Drawer, Evidence je AC, „Akzeptieren“ zeigt Commit-SHA und Merge-Konsequenz.

### Phase 4 – Loops und Eskalation

1. Retry-Staffelung mit Jitter, `retryCountByReason`; `RETRY`-Reason-Codes vollständig (Soll §10.3) und Klassifikation in Agent-Adaptern (`AgentInterruptionError`, Rate-Limit, Timeout → RETRY; Semantik-Fehler → REWORK/FATAL).
2. Rework-Routen inkl. Invalidierungskaskade (Requirement-Loop invalidiert Analyse/Solve/Verify/Acceptance).
3. Loop-Limits + No-Progress-Fingerprint (Issue-Revision, Analyse, Diff, Testergebnis, Fehlerursache, Abhängigkeit); Ping-Pong-Erkennung.
4. Human Required vollständig: Frage-Objekt (Soll §17), Zuweisung, Erinnerung/Eskalation, Wiedereinstieg mit Revisions-Update.
5. Fatal/Quarantäne; Cancelled/Duplicate/Obsolete/Not Feasible mit Abschlussgründen und Aufräumstrategie (Soll §19).
6. Blocked + Dependency Graph: `dependencies` aus Analyse, transitive/zyklische Prüfung, automatische Reaktivierung, Zyklus → Human Required.
7. Renderer: State-Badges, Zähler, Countdown bis nächster Retry, Human-Required-Antwortformular, Blocker-Anzeige; Benachrichtigungen (Toast + bestehender Runs-Rail; Mobile-Push optional).

### Phase 5 – Skalierung und Governance

1. Scheduling für `ready`: Priorität, Alter, Abhängigkeiten, Risiko, WIP-Limit (bestehendes `maxParallelExecutions`), Change-Surface/Collision (High-Collision nie parallel).
2. Risikoklassen LOW/MEDIUM/HIGH/CRITICAL mit Zusatzregeln (Pflicht-Review, zusätzlicher Security-Verify, kein automatischer Merge, zweiter Abnehmer).
3. Metriken (Lead Time, Queue Time, First Pass Yield, Reworks, Retries, Blocked Time …) aus Audit ableiten; Anzeige im Home-Dashboard.
4. Prompt-Injection-Härtung: Issue-/Kommentar-/Repo-Inhalte als Daten markiert, Tool-/Pfad-Allowlists je Rolle, Secret-Redaction in Logs/Artefakten (bestehende Redaction erweitern).
5. Skill-/Prompt-/Policy-Versionierung in Runs sichtbar; Reproduzierbarkeit.

---

## 5. Migration und Kompatibilität

- Settings v3→v4 einmalig, verlustfrei bis auf Skill-Paket-Zuweisungen (werden durch eingebaute Rollen ersetzt; vorhandene Aktivierungen protokolliert, nicht übernommen).
- Laufende Executions bei Update: `recoverInterruptedExecutions` erzeugt `WorkflowRecord`s aus vorhandenen `ExecutionRecord`s + aktuellem Board-Status; unklare Fälle → `human_required` statt Raten.
- Bestehende Goal-Schleife (`GoalRecord`, `ImplementationContract`, ADR-011): Implementation-Loop und Contract-Enforcement werden in den Solve-Runner + Engine integriert; `goals.review` geht in `workflow.decide` auf. `GoalRecord` bleibt übergangsweise als Projektion, wird in Phase 3 entfernt.
- Simulierte Adapter (`SYMPHONY_*_MODE=simulated`) müssen alle Outcomes und Gate-Wege abbilden, damit E2E ohne Provider läuft.

---

## 6. Offene Entscheidungen (vor Phase 1 klären)

1. Merge-Ausführung nach Gate 2 durch Symphony (Vorschlag) vs. manuell in GitHub (siehe §3.6, ADR-012).
2. Azure-DevOps-Claim-Mechanik ohne Git-Ref (Feld/Tag vs. lokal-only).
3. Ob Gate-Entscheidungen auch über manuelle Provider-Spaltenwechsel gelten (Vorschlag: ja, mit Audit `source: tracker`, aber Guard-Verletzung → Rücksetzung + Hinweis).
4. Verbleib von `libs/frontend/features/skills` (reduzieren auf Settings-Komponenten vs. löschen und in `features/settings` neu bauen; Vorschlag: löschen, Prompt-Box-Pattern aus `SkillEditorDrawerView` übernehmen).
5. Standard für Post-Merge-Checks (nur Zielbranch-CI vs. zusätzlicher Verify-Lauf).
6. Umfang der Mobile-Kommandos für Gates in Phase 1 (Vorschlag: nur Anzeige, Entscheidungen ab Phase 4).

---

## 7. Abnahme (aus Soll §33, auf Repo gemappt)

Phase 1 gilt als fertig, wenn: sechs Board-Status exakt im Domain-Modell, Migration v4 grün, fünf eingebaute Rollen mit Prompt-Box, Skills nicht mehr in der Hauptnavigation, Guards als Tabellentests, `RunResult` für Create/Analyze/Solve, Gate 1/2 aus dem Task-Drawer, kein Skill kann Gate-Übergang auslösen (Engine-Test), Docs/ADR aktualisiert, `yarn verify` + E2E grün. Phasen 2–5 übernehmen die restlichen Checkboxen aus §33 in derselben Reihenfolge.
