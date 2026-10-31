# Skills-Einstellungen

**Dokumentstatus:** Implementierter Ist-Stand

## Ziel und Garantien

Der globale Bereich **Skills** des Einstellungsfensters ordnet die eingebauten Prozessrollen und die zugeordneten Skill-Pakete den fünf Schritten des Lieferablaufs zu. Er besitzt das Ergänzen der Rollenanweisungen, das Zuordnen und Lösen von Skill-Paketen sowie Anlegen, Bearbeiten, Importieren, Exportieren und Verwerfen gemeinsam genutzter Pakete. Er ersetzt die frühere Seite `/main/skills` des Hauptfensters. Das funktionale Verhalten steht unter [Skills](../../project/skills/README.md); Paketformat und Auflösung beschreiben [Skill-Modell](../skill-model.md) und [Skill-Auflösung](../skill-resolution.md).

Garantien:

- Ergänzungen einer Rolle werden unter die eingebauten Anweisungen gehängt und können die Rechte und den Ergebnisvertrag der Rolle nicht erweitern; Rechte setzt die Laufzeit unabhängig von Anweisungstexten durch.
- Jede Skill-Flow-Rolle eines Lieferteams trägt höchstens ein Paket, und ein Paket ist höchstens einer Rolle zugeordnet. Eine neue Zuordnung zu einer belegten Rolle löst die vorige, statt eine Rangfolge einzuführen.
- Eine Zuordnung schaltet keine Automatisierung ein; ob ein AI-Schritt selbstständig läuft, entscheidet die Richtlinie unter [Automation](../automation/README.md).
- Der Renderer liest oder schreibt keine Dateien. Pakete werden über benannte, schemavalidierte Orchestrator-Anfragen gelesen und geändert; nur gemeinsam genutzte Pakete sind schreibbar, verworfene landen in einem wiederherstellbaren Papierkorb.
- Ein Paket wird nur nach ausdrücklicher Bestätigung verworfen.

## Geltungsbereich und Nicht-Ziele

- Enthalten: Abschnittsbeitrag `skills`, Suchbeiträge, Werkzeugleistenaktionen, Schrittprojektion, die Sheets für Rollenanweisungen, Katalog, Paketdetails und Import, Lösen einer Zuordnung, Weiterleitung von `/main/skills`, Paletten- und Kontextsuchtreffer.
- Nicht enthalten: Paketformat, Wurzeln, Validierung und Ausführungsschnappschüsse ([Skill-Modell](../skill-model.md), [Skill-Auflösung](../skill-resolution.md)); wer einen Schritt erledigt ([AI-Team-Einstellungen](../ai-team/README.md)); Sheet-, Rückfrage- und Suchmechanik des Fensters ([Einstellungsfenster](../window-and-navigation/settings-window.md)).

## Verantwortungsgrenzen

| Verantwortung                         | Kanonischer Eigentümer                                                     | Öffentlicher Vertrag                                                                                                                                                                                                                   | Verbraucher                      |
| ------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Schrittdefinition                     | UI-Bibliothek (`deliveryFlowSteps`, `deliveryFlowStepOf`)                  | siehe [AI-Team-Einstellungen](../ai-team/README.md#schritte-des-lieferablaufs)                                                                                                                                                         | Schrittprojektion, Rollen-Sheet  |
| Zustand und Operationen               | `SkillStore` im Skills-Feature                                             | `skillCatalog`, `builtinSkills`, `activeSkill`, `skillsBusy`; `refreshSkills`, `customizeBuiltinSkill`, `activateSkill`, `assignSkillToFlow`, `deactivateSkill`, `loadSkill`, `saveSkill`, `importSkill`, `exportSkill`, `deleteSkill` | Presenter, Sheets, Suche         |
| Workspace-Teams                       | `SkillsContext`                                                            | `workspaceTeams: { workspaceId, workspaceName, team }[]` – das AI-Team jedes eingeschalteten Workspace, je Team einmal                                                                                                                 | `SkillStore`                     |
| Zuordnungen und Ergänzungen schreiben | `SkillsAssignments`                                                        | `saveAssignments(changes: { teamId, assignments }[])` in einem Schreibvorgang über den einzigen Settings-Schreiber; `customizeBuiltinSkill(role, text)`                                                                                | `SkillStore`                     |
| Schrittprojektion                     | `projectSkillSteps`                                                        | reine Funktion                                                                                                                                                                                                                         | `SkillsSettingsViewPresenter`    |
| Werkzeugleiste                        | `SkillsSettingsHeaderActionView`                                           | Slot `SettingsViewSlot.HeaderActions` bei `workspaceId === null` und `sectionId === 'skills'`                                                                                                                                          | Werkzeugleiste der Einstellungen |
| Paketkatalog, Pakete, Rollen          | Orchestrator (Skills-Feature, `SkillCatalogService`, Dateisystem-Provider) | Anfragen `skills.list`, `skills.builtin.list`, `skills.builtin.customize`, `skills.get`, `skills.save`, `skills.import`, `skills.export`, `skills.delete`                                                                              | `SkillStore`                     |
| Ordnerauswahl                         | Desktop über den Orchestrierungsclient                                     | `selectPath({ kind: 'directory', title, defaultPath })`                                                                                                                                                                                | Import-Sheet, Paket-Sheet        |

## Verträge

### Orchestrator-Anfragen

| Methode                    | Eingabe                                                          | Ergebnis                             |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `skills.list`              | `{}`                                                             | Katalog mit Paketzusammenfassungen   |
| `skills.builtin.list`      | `{}`                                                             | `{ skills: BuiltinSkill[] }`         |
| `skills.builtin.customize` | `{ role: ProcessRole, additionalInstructions: string ≤ 20 000 }` | vollständiger Settings-Schnappschuss |
| `skills.get`               | `{ id }`                                                         | Paketdokument                        |
| `skills.save`              | `{ skill: EditableSkillPackage }`                                | gespeichertes Paketdokument          |
| `skills.import`            | `{ sourcePath }`                                                 | importiertes Paketdokument           |
| `skills.export`            | `{ id, destinationRoot }`                                        | `{ message }`                        |
| `skills.delete`            | `{ name ≤ 64 Zeichen }`                                          | `{ message }`                        |

- **Paketzusammenfassung:** `id` (aus Herkunft und Name), `name`, `displayName`, `description`, `source` (`user` \| `repository` \| `legacy` \| `bundled`), `location`, `editable`, `implicitInvocation`, `updatedAt`, `digest`, `resourceCount`, `warnings`.
- **Eingebaute Rolle:** `role` (`create`, `analyze`, `solve`, `verify`, `ci-diagnosis`, `ci-repair`, `pull-request-review`), `displayName`, `description`, `version`, `promptVersion`, `instructions`, `mutatesWorkspace`, `publishesPullRequest`, `additionalInstructions`.
- **Bearbeitbares Paket:** `originalName?`, `name` (1–64), `description` (1–2 000), `instructions` (1–500 000), `openaiYaml` (≤ 100 000), `files` (≤ 250; je `path` ≤ 500, `kind` `metadata` \| `script` \| `reference` \| `asset`, `encoding` `utf8` \| `base64`, `content`, `size`).

`skills.list` und `skills.get` ohne Workspace lesen die Projektpakete aus `.agents/skills` des Standard-Repositorys des Lieferkontexts des primären Workspace (erster gewählter, sonst erster aktivierter). Nur Pakete der Herkunft `user` sind `editable`; Projekt- und Legacy-Pakete sind nur lesbar.

### Ergänzungen einer Rolle

Der Orchestrator speichert die getrimmte Ergänzung je Rolle in `skillCustomizations: { role, additionalInstructions }[]` des Anwendungs-Settings; eine leere Ergänzung entfernt den Eintrag. Die Ergänzungen gelten für alle Workspaces. Bei der Zusammensetzung der wirksamen Anweisungen folgt eine nicht leere Ergänzung den eingebauten Anweisungen unter der Überschrift `## Additional instructions for this installation` mit dem Satz, dass sie verfeinern, aber keine Rechte gewähren und den Ergebnisvertrag nicht übersteuern; zusätzlich wird ein Hash der Ergänzung mitgeführt. Version und Prompt-Version bleiben die der eingebauten Rolle.

### Zuordnung eines Pakets

Zuordnungen sind `skillId` der Zuständigkeiten (`assignments[].role`, Skill-Flow-Rolle) eines AI-Teams. Der Orchestrator nimmt die Skills eines Work Items aus dem Team seines Workspace (`agentTeamFor(settings, workspaceId)`: Team des eingeschalteten Lieferkontexts des Workspace, sonst das Team mit dieser `workspaceId`). Weil der Bereich global ist, schreibt er in genau diese Teams: `SkillsContext.workspaceTeams` löst sie für jeden eingeschalteten Workspace in Konfigurationsreihenfolge auf die gleiche Weise auf und führt jedes Team einmal (Workspaces ohne Team entfallen; deaktivierte Workspaces werden nicht geändert).

Lesen: Ein Paket ist aktiv, wenn irgendein Workspace-Team es einer Zuständigkeit zuordnet; `skillFlowRole(id)` und `skillIdForFlowRole(role)` liefern den ersten Treffer in Workspace-Reihenfolge (eine Rolle nur mit gesetzter `skillId`). Der Bereich zeigt daher je Rolle das Paket des ersten Workspace, der dort eines hat.

| Operation                                               | Wirkung                                                                                                                                                                                                                                | Meldung                                                                                                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activateSkill(id, role)`                               | Zielteams sind alle Workspace-Teams mit einer Zuständigkeit für `role`. Dort `skillId = id` für `role`; in allen Workspace-Teams wird jede andere Zuständigkeit mit `skillId === id` → `null`. Nur geänderte Teams werden gespeichert. | Erfolg: `Skill activated and assigned to the selected flow step.`; wurde eine andere `skillId` ersetzt: `Skill assigned to the selected flow step. The previous skill was deactivated.`                                               |
| `assignSkillToFlow(id, role)`                           | nur für ein Paket, das irgendwo aktiv ist (sonst `false`); sonst wie `activateSkill`                                                                                                                                                   | `Skill flow assignment updated.` bzw. wie oben                                                                                                                                                                                        |
| `deactivateSkill(id)`                                   | in jedem Workspace-Team jede Zuständigkeit mit `skillId === id` → `null`; ohne Treffer kein Schreibvorgang und `true`                                                                                                                  | `Skill deactivated.`                                                                                                                                                                                                                  |
| keine Zuständigkeit für `role` in keinem Workspace-Team | keine Änderung, kein Schreibvorgang, Ergebnis `false`                                                                                                                                                                                  | Warnung `Nobody works on <Schritt>` mit `No AI team has someone on <Schritt>. Assign an agent to it under AI team, then attach the skill.`; ohne jedes Workspace-Team `Add a workspace with an AI team first, then attach the skill.` |

`<Schritt>` ist die Bezeichnung des Schritts aus `deliveryFlowSteps`, der die Rolle enthält. Fehlt die Zuständigkeit nur in einigen Workspace-Teams, ergänzt die Erfolgsmeldung `Not attached in <Workspace-Namen>: nobody works on <Schritt> there.` Ändert sich nichts (das Paket steht in allen Zielteams schon an `role` und nirgends sonst), liefert die Operation `true` ohne Schreibvorgang und ohne Meldung. Alle geänderten Teams werden in einem Schreibvorgang ohne eigene Erfolgsmeldung des Schreibers gespeichert; danach aktualisiert der Store den Anwendungsschnappschuss. Eine abgelehnte Speicherung ändert kein Team und lädt nicht neu.

## Schrittprojektion

`projectSkillSteps(builtinSkills, packages, assignedSkillId)` liefert je Schritt in Definitionsreihenfolge:

- `roles`: die eingebauten Rollen des Schritts in der Reihenfolge seiner `processRoles`;
- `packages`: die zugeordneten Pakete seiner Skill-Flow-Rollen, dedupliziert; ein zugeordnetes Paket, das der Katalog nicht mehr kennt, entfällt;
- `openOptions`: die optionalen AI-Schritte (Skill-Flow-Rollen) ohne bekanntes Paket.

| Skill-Flow-Rolle      | Bezeichnung               | Platzierung                                                 |
| --------------------- | ------------------------- | ----------------------------------------------------------- |
| `work-item-creation`  | `Create with AI`          | `Optional AI prompt → Classified draft`                     |
| `analysis`            | `Analyze with AI`         | `Optional AI analysis and re-analysis`                      |
| `solution`            | `Implement with AI`       | `Optional AI implementation and rework`                     |
| `ci-diagnosis`        | `Diagnose CI with AI`     | `Read-only diagnosis of bounded failed-action evidence`     |
| `ci-repair`           | `Repair CI with AI`       | `Optional repair on a retained managed pull-request branch` |
| `pull-request-review` | `Address reviews with AI` | `Optional evaluation of actionable pull-request feedback`   |

Darstellung je Rolle: `displayName`, Abzeichen `v<version>`, `Changes files` oder `Reads only`, bei `publishesPullRequest` `Publishes pull requests`, Beschreibung und `Built-in instructions only` oder `Built-in instructions · your additions: <n> line(s) added` (nicht leere Zeilen). Je Paket: Anzeigename als Verweis auf **Skill details**, Herkunft (`user` → `Shared`, `repository` → `Project`, `legacy` → `Legacy`, `bundled` → `Built-in`), technischer Name, Ressourcen, `automatic + explicit` oder `explicit only`, **Deactivate** (gesperrt während Skill- oder Settings-Operationen). Je Schritt mit `openOptions` eine Zeile `No skill package` mit **Add skill**, die den Katalog mit der ersten offenen Rolle öffnet. Leerzustände: `No installed skills`, wenn kein Schritt ein Paket hat; `No roles loaded`, wenn keine eingebaute Rolle geladen ist.

Beim Einblenden lädt der Bereich Katalog und Rollen, sofern einer davon fehlt; **Refresh installed skills** lädt beide erneut.

## Sheets

Alle Sheets öffnet `SettingsEditorService` über die registrierten Editoren; es ist höchstens eines offen.

| Editor-`kind`             | Anfrage                                               | Breite | Titel                            |
| ------------------------- | ----------------------------------------------------- | ------ | -------------------------------- |
| `skill-role-instructions` | `{ role: ProcessRole }`                               | 680 px | `<Rolle> · instructions`         |
| `skill-catalog`           | `{ role?: SkillFlowRole }`                            | 720 px | `Add skills`                     |
| `skill-editor`            | `{ mode: 'create' }` oder `{ mode: 'edit', skillId }` | 720 px | `New skill` bzw. `Skill details` |
| `skill-import`            | `{}`                                                  | 600 px | `Import skill`                   |

**Rollenanweisungen.** Untertitel `Process role of the <Schritt> step · v<version> · <Rechte>`. Segment `Built-in instructions` (nur lesbar) und `Your additions` (Start). `Save` speichert den Text, `Reset` speichert eine leere Ergänzung und ist nur bei gespeicherter Ergänzung aktiv. Das Sheet schließt nur, wenn die gespeicherte Ergänzung danach dem gesendeten Text entspricht; sonst bleibt es mit dem Text offen. Meldungen: `Instructions saved.` mit `The role uses them on its next run.`, Fehler `Unable to save the additional instructions.`

**Katalog.** Zeigt Katalogpakete, die in keiner Zuständigkeit eines Workspace-Teams zugeordnet sind, gefiltert nach Name, Anzeigename, Beschreibung und Herkunft (verzögerte Suche, 150 ms). Je Karte ein Pflicht-Select `Use in flow` (Vorbelegung aus der Anfrage), der Hinweis `Replaces <Paket> in this flow step.` bei belegter Rolle und `Activate`, gesperrt ohne Rolle oder während Operationen. Das Sheet bleibt nach `Activate` offen. Leer: `No matching skills` mit Suchtext, sonst `All discovered skills are active`. Beim Laden erscheinen Suchfeld und zwei Kartenplatzhalter in der Anatomie des geladenen Sheets.

**Paketdetails und neues Skill.** Bei `edit` lädt das Sheet das Dokument; während des Ladens bleiben die Felder gesperrt. Bei zugeordnetem Paket steht oben `Use in flow` (ruft `assignSkillToFlow`). Felder: `Name`, `Description and trigger conditions`, `Markdown instructions`, `OpenAI metadata YAML`, Ressourcen mit `Package path`, `Kind` (`Script`, `Reference`, `Asset`) und bei UTF-8 `Resource content`; Base64-Ressourcen bleiben unverändert. `Add text resource` fügt `references/reference-<n>.md` mit eindeutiger Nummer hinzu. Nicht `editable` → alle Felder nur lesbar und statt `Save skill` die Aktion `Install shared copy` (`skills.import` mit dem Paketort). Nur bei Herkunft `user` gibt es `Portable package` mit `Destination root` (Ordnerauswahl), `Export folder` und `Move to trash`. Speichern trimmt Beschreibung und Anweisungen, setzt bei neuen Paketen einen unveränderten `display_name: New skill` auf den gewählten Namen und berechnet Dateigrößen; `create` startet mit `new-skill` und einer Vorlage. Erfolg schließt das Sheet und lädt den Katalog neu.

**Import.** `Skill folder path` ist nur über die Ordnerauswahl (`Choose portable skill folder`) belegbar; `Import skill` ist ohne Pfad, während eines Imports oder bei gesetzter Editor-Sperre gesperrt, importiert den getrimmten Pfad einmal und schließt nur bei Erfolg.

## Rückfrage

| Id                    | Titel                     | Art        | Schaltflächen             | Folge bei Bestätigung                                                                                                      |
| --------------------- | ------------------------- | ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `move-skill-to-trash` | `Move “<Name>” to trash?` | destruktiv | `Move to trash`, `Cancel` | `skills.delete`; der Provider verschiebt das Paket in `.trash` der gemeinsamen Wurzel, Meldung mit Zielort; Sheet schließt |

**Deactivate** fragt nicht nach, weil das Paket installiert bleibt und jederzeit wieder zugeordnet werden kann.

## Einstiege und Adressparameter

| Einstieg                             | Verhalten                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route `/main/skills` im Hauptfenster | `redirectTo: '/main/settings?section=skills'`; die Einstellungen öffnen sich im Hauptfenster bei `section=skills`                                               |
| `section=skills` in `/settings`      | wählt den globalen Bereich                                                                                                                                      |
| Kontextsuche                         | passt ein Paket (Name, Anzeigename, Beschreibung, Herkunft) zum Suchtext, ist das Ziel `/main/settings?section=skills`                                          |
| Befehlspalette                       | höchstens drei Paket-Treffer `Open <Skill> in Settings`, nur mit Eingabe, Ziel `/main/settings?section=skills` ([Befehlspalette](../command-palette/README.md)) |
| Suche in den Einstellungen           | Einträge `Edit instructions`, `Add skills`, `New skill`, `Import skill`                                                                                         |

Das Hauptfenster hat keinen Navigationsbeitrag `skills`.

## Fehler und Wiederherstellung

| Fehlerfall                       | Erkennung                      | Öffentlicher Fehler                           | Nebenwirkungen                        | Wiederherstellung            |
| -------------------------------- | ------------------------------ | --------------------------------------------- | ------------------------------------- | ---------------------------- |
| Katalog oder Rollen nicht ladbar | Anfragefehler                  | `Unable to load skills.`                      | bisheriger Zustand bleibt             | **Refresh installed skills** |
| Ergänzung nicht speicherbar      | Anfragefehler                  | `Unable to save the additional instructions.` | keine; Sheet bleibt mit Text offen    | erneut speichern             |
| Zuordnung abgelehnt              | `saveSettings` liefert `false` | `Unable to save settings.` des Schreibers     | Zuordnungen unverändert, kein Refresh | erneut zuordnen              |
| Paket nicht ladbar               | Anfragefehler                  | `Unable to open skill.`                       | zuletzt geladenes Dokument bleibt     | Sheet neu öffnen             |
| Paket nicht speicherbar          | Validierung im Orchestrator    | `Unable to save skill.` mit Grund             | keine; Sheet bleibt offen             | korrigieren                  |
| Import scheitert                 | Validierung im Orchestrator    | `Unable to import skill.` mit Grund           | keine; Sheet bleibt offen             | anderen Ordner wählen        |
| Export oder Verwerfen scheitert  | Anfragefehler                  | `Unable to update skill.`                     | keine                                 | erneut versuchen             |

## Implementierungsabbildung in Symphony

| Verantwortung                      | Aktueller Pfad oder Symbol                                                                                                                                                                                        | Beleg                                                                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Beitrag, Editoren, Werkzeugleiste  | `libs/frontend/features/skills/src/lib/provider/{provideSkillsFeature,withSkillsSettings,withSkillsSearch}.ts`                                                                                                    | `apps/renderer/src/configuration/ApplicationProductComposition.spec.ts`                                                                                                 |
| Weiterleitung                      | `libs/frontend/features/skills/src/lib/routing/SkillsRoutes.ts`                                                                                                                                                   | `apps/renderer-e2e/src/skills-settings.spec.ts`                                                                                                                         |
| Bereich und Projektion             | `settings/SkillsSettingsView.{ts,html}`, `settings/SkillsSettingsViewPresenter.ts`, `settings/skill-steps/projectSkillSteps.ts`                                                                                   | `projectSkillSteps.spec.ts`, `skills-settings.spec.ts`                                                                                                                  |
| Werkzeugleiste                     | `settings/SkillsSettingsHeaderActionView.{ts,html}`, `SkillsSettingsHeaderActionViewPresenter.ts`                                                                                                                 | `SkillsSettingsHeaderActionViewPresenter.spec.ts`                                                                                                                       |
| Sheets                             | `settings/SkillRoleInstructionsEditorView*`, `settings/SkillImportEditorView*`, `views/dialogs/{SkillCatalogDialogView,SkillEditorDialogView}*`, `view-presenters/*`                                              | `SkillRoleInstructionsEditorViewPresenter.spec.ts`, `SkillImportEditorViewPresenter.spec.ts`, `SkillEditorDialogViewPresenter.spec.ts`, `isSkill*EditorRequest.spec.ts` |
| Store, Kontext, Schreiber          | `catalog/SkillStore.ts`, `adapters/{SkillsContext,SkillsAssignments}.ts`, `ports/{ISkillsWorkspaceTeam,ISkillsTeamAssignments}.ts`                                                                                | `SkillStore.spec.ts`, `SkillsContext.spec.ts`, `SkillsAssignments.spec.ts`                                                                                              |
| Optionale AI-Schritte              | `view-presenters/skillFlowPresentation/SkillFlowOptions.ts`                                                                                                                                                       | `skillFlowRoleFromEvent.spec.ts`                                                                                                                                        |
| Suche                              | `search/{SkillsSearchProvider,projectSkillsPaletteResults}.ts`                                                                                                                                                    | `SkillsSearchProvider.spec.ts`, `projectSkillsPaletteResults.spec.ts`                                                                                                   |
| Orchestrator                       | `apps/orchestrator/src/features/skills/provideSkillsOrchestratorFeature.ts`, `libs/application/features/skills/src/lib/SkillCatalogService.ts`, `libs/providers/filesystem/src/lib/skills/SkillPackageService.ts` | `SkillRequestSchemas.spec.ts`, `SkillResponseSchemas.spec.ts`                                                                                                           |
| Eingebaute Rollen, Zusammensetzung | `libs/domain/features/skills/src/lib/builtin-skills/BuiltinSkills.ts`, `skill-composition/composeSkillInstructions.ts`                                                                                            | Domänentests                                                                                                                                                            |

## Verifikation und Akzeptanzkriterien

- Der Bereich zeigt genau fünf Schrittblöcke in der Reihenfolge `create`, `plan`, `implement`, `fix-checks`, `address-reviews`; `implement` enthält `Solve` und `Verify`.
- Die Werkzeugleiste zeigt Aktualisieren, `Import skill`, `Add skills` und `New skill`.
- Gespeicherte Ergänzungen erscheinen in `skillCustomizations` und als `your additions: 1 line added`; `Reset` entfernt sie.
- `Add skill` eines Schritts öffnet `Add skills` mit vorbelegter Rolle; Escape schließt das Sheet.
- `Activate` für eine belegte Rolle löst das vorige Paket; ein Paket steht danach nur noch im Block seiner Rolle und nicht mehr im Katalog.
- `Deactivate` setzt in allen Workspace-Teams nur die betroffene `skillId` auf `null` und lädt danach den Schnappschuss neu; eine abgelehnte Speicherung ändert nichts und lädt nicht neu.
- `Activate` ordnet das Paket in jedem eingeschalteten Workspace zu, dessen Team die Rolle besetzt hat (ein Schreibvorgang); die Erfolgsmeldung nennt Workspaces ohne Zuständigen.
- `Activate` für eine Rolle, die in keinem Workspace-Team besetzt ist, schreibt nichts, lädt nicht neu und warnt `Nobody works on <Schritt>` statt Erfolg zu melden.
- `Move to trash` verwirft erst nach Bestätigung; abgebrochen bleibt das Paket bestehen.
- Das Import-Sheet ist ohne gewählten Ordner gesperrt und schließt nur nach erfolgreichem Import.
- `#/main/skills` im Hauptfenster leitet in die Einstellungen um, deren Werkzeugleiste den Titel `Skills` zeigt; das Hauptfenster hat keinen Eintrag `navigation-skills`.

## Verwandte Dokumentation

- [Skills](../../project/skills/README.md)
- [Skill-Modell](../skill-model.md)
- [Skill-Auflösung](../skill-resolution.md)
- [AI-Team-Einstellungen](../ai-team/README.md)
- [Automation](../automation/README.md)
- [Einstellungen im Hauptfenster](../window-and-navigation/settings.md)
- [Befehlspalette](../command-palette/README.md)
