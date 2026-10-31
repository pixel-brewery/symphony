# Dependency model and modular product layout

This document records the implemented canonical owners and the complete folder layout of the modular refactor. The package inventory is backed by current source and manifests. Complete local verification, real-process Electron acceptance and the macOS packaging smoke test passed on 2026-10-30; their scope is recorded at the end.

The former root packages `domain`, `application`, `configuration`, `ipc-contracts`, `persistence`, `providers`, `execution-context`, `skills` and `workflows` have no remaining root package manifests or production entry points. Their implementations live in the explicit owners below. There are fifteen product features, ten frontend capabilities, thirteen Domain packages, thirteen Application packages, twelve Configuration packages, fifteen IPC packages, twelve Persistence packages and thirteen Provider families. A feature has a package in a technical layer only when it has an implemented responsibility there.

Source retirement is complete: the old Settings feature package, Core `OrchestrationStore` facade/spec, frontend `Legacy*` interfaces/tokens and 23 transition forwarders are removed. Settings infrastructure lives in `frontend/setting`; all business cards/forms and default context adapters live in their actual features. Canonical consumed contracts include `CI_OPERATIONS`, `WORK_OPERATIONS`, `WORKSPACE_OPERATIONS`, `WORKSPACE_SCOPE` and `SKILLS_OPERATIONS`.

## Electron processes and application roots

| Application         | Process and responsibility                                                                                                                                                | Composition boundary                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/renderer`     | Sandboxed Angular desktop renderer. `main.ts` bootstraps `ShellView`; the substantial UI lives in `libs/frontend`.                                                        | Selects product providers and lazy routes in `ApplicationProductComposition`; configures Mosaik and capability managers in `ShellConfig`. No Node, filesystem, SQLite or provider SDK access.       |
| `apps/desktop`      | Electron Main plus the sandboxed preload bundle. Main owns windows, OS integration, credentials, update and power lifecycle, IPC routing and Utility Process supervision. | `main.ts` composes desktop adapters. `preload.ts` exposes the validated desktop/orchestration API; it is the intentional CommonJS build exception.                                                  |
| `apps/orchestrator` | Electron Utility Process. Runs application use cases, provider I/O, SQLite, managed execution and the local companion gateway.                                            | `main.ts` constructs the services and adapters. Feature handler factories and the request registry own dispatch; composition owns cross-feature settings, lifecycle, cleanup and snapshot assembly. |
| `apps/mobile`       | Browser-only Angular companion, served as packaged assets by the selected local gateway.                                                                                  | Uses the Mobile browser entry and selected Work/Delivery/Presentation mobile entries through the versioned mobile contract. It cannot access Electron or Node APIs.                                 |
| `apps/renderer-e2e` | Acceptance journeys against the packaged Electron process model and companion browser.                                                                                    | Exercises real preload, Main, Utility Process and renderer boundaries with isolated test state.                                                                                                     |

The desktop request path remains **Renderer → Preload → Electron Main → Orchestrator Utility Process**. Replies and events travel back through the same validated boundary. These are technical application/process roots; the architecture introduces no `backend/` or top-level `shared/` layer. The local mobile gateway remains the bounded ADR-006 exception in the Utility Process.

## Complete canonical folder tree

The tree enumerates every canonical product/context package. `src/index.ts` is each package's deliberate public entry; secondary entries are listed later. Package configuration, adjacent specs and generated build output are omitted from the drawing. The detailed frontend tree below supplies feature internals instead of hiding them behind a generic `features/<context>` placeholder.

```text
symphony/
├── apps/
│   ├── desktop/src/
│   │   ├── main.ts
│   │   ├── preload.ts
│   │   ├── credential-vault/
│   │   ├── keep-awake/
│   │   ├── speech-recognition/
│   │   ├── squirrel-startup/
│   │   └── update-coordinator/
│   ├── renderer/src/
│   │   ├── main.ts
│   │   ├── configuration/
│   │   │   ├── ShellConfig.ts
│   │   │   ├── IProductFeatureDefinition.ts
│   │   │   └── ApplicationProductComposition.ts
│   │   ├── views/                         ShellView three-file unit
│   │   ├── view-presenters/
│   │   └── styles/
│   ├── orchestrator/src/
│   │   ├── main.ts
│   │   ├── composition/                   Cross-feature settings/lifecycle/cleanup wiring
│   │   ├── transport/                     Validated handler registry and request processor
│   │   ├── snapshot/                      OrchestrationSnapshotService
│   │   ├── features/
│   │   │   ├── ai/
│   │   │   ├── automation/
│   │   │   ├── ci/
│   │   │   ├── delivery/
│   │   │   ├── execution/
│   │   │   ├── feedback/
│   │   │   ├── mobile/
│   │   │   ├── platform/
│   │   │   ├── skills/
│   │   │   ├── work/
│   │   │   ├── workflow/
│   │   │   └── workspace/
│   │   ├── mobile-gateway/
│   │   ├── storage-governor/
│   │   ├── settings-background-synchronization/
│   │   ├── github-connection-account/
│   │   ├── local-ci-takeover/
│   │   └── logging/
│   ├── mobile/src/
│   │   ├── main.ts
│   │   └── app/                           Browser bootstrap and selected mobile routes
│   └── renderer-e2e/src/                  Packaged-process acceptance journeys
├── libs/
│   ├── frontend/
│   │   ├── core/
│   │   ├── ui/
│   │   ├── presentation/
│   │   ├── search/
│   │   ├── setting/
│   │   ├── notification/
│   │   ├── quick-create/
│   │   ├── widget/
│   │   ├── update/
│   │   ├── interaction/
│   │   └── features/
│   │       ├── home/
│   │       ├── workspace/
│   │       ├── work/
│   │       ├── team/
│   │       ├── ai/
│   │       ├── skills/
│   │       ├── workflow/
│   │       ├── execution/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── automation/
│   │       ├── feedback/
│   │       ├── mobile/
│   │       ├── platform/
│   │       └── arcade/
│   ├── domain/
│   │   ├── core/                         Remote-data and runner-image values
│   │   └── features/
│   │       ├── ai/
│   │       ├── automation/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── execution/
│   │       ├── feedback/
│   │       ├── platform/
│   │       ├── skills/
│   │       ├── team/
│   │       ├── work/
│   │       ├── workflow/
│   │       └── workspace/
│   ├── application/
│   │   ├── core/                         Clock, IDs, retry and remote-read errors/policies
│   │   ├── composition/                  Work/Delivery/CI remote-query joiner
│   │   └── features/
│   │       ├── ai/
│   │       ├── automation/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── execution/
│   │       ├── feedback/
│   │       ├── mobile/
│   │       ├── skills/
│   │       ├── work/
│   │       ├── workflow/
│   │       └── workspace/
│   ├── configuration/
│   │   ├── core/                         Identifier validation and bootstrap primitives
│   │   ├── composition/                  Complete settings, selection and workspace transfer
│   │   └── features/
│   │       ├── ai/
│   │       ├── automation/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── feedback/
│   │       ├── skills/
│   │       ├── team/
│   │       ├── work/
│   │       ├── workflow/
│   │       └── workspace/
│   ├── ipc-contracts/
│   │   ├── core/                         Channels, envelopes and transport primitives
│   │   ├── desktop/                      Native desktop API and event contracts
│   │   ├── composition/                  Ordered product method catalog and desktop snapshot
│   │   └── features/
│   │       ├── ai/
│   │       ├── automation/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── execution/
│   │       ├── feedback/
│   │       ├── mobile/
│   │       ├── platform/
│   │       ├── skills/
│   │       ├── work/
│   │       ├── workflow/
│   │       └── workspace/
│   ├── persistence/
│   │   ├── core/                         SQLite connection and workspace registry lifecycle
│   │   ├── composition/                  Shared schema order and atomic workspace cleanup
│   │   └── features/
│   │       ├── ai/
│   │       ├── automation/
│   │       ├── ci/
│   │       ├── delivery/
│   │       ├── execution/
│   │       ├── mobile/
│   │       ├── platform/
│   │       ├── work/
│   │       ├── workflow/
│   │       └── workspace/
│   ├── providers/
│   │   ├── core/                         Allowed commands and toolchain environment
│   │   ├── ai/                           Workspace-isolated runtime selection
│   │   ├── artificial-analysis/          External model-intelligence adapter
│   │   ├── azure-devops/                 Azure DevOps work tracking
│   │   ├── ci/                           Verification planner/executor and runner catalog
│   │   ├── filesystem/                   Skill package disk I/O and text digest
│   │   ├── git/                          Repository/worktree/snapshot adapters
│   │   ├── github/                       Projects, cloud CI/PRs, status, login and throttling
│   │   ├── lima/                         Managed VM and GitHub runner lifecycle
│   │   ├── microsoft-teams/              Feedback intake
│   │   ├── simulated/                    Explicit deterministic runtime/query substitutes
│   │   ├── synapse/                      Native AI runtimes, routing and account admission
│   │   └── work/                         Configured tracker router
│   ├── mobile-contracts/                 Versioned companion pairing and browser contract
│   └── logging/                          Bounded logging implementation
├── tools/                                Build, packaging and repository-policy tools
├── resources/                            Packaged icons, fonts, employee figures and games
└── docs/                                 Architecture, specifications and operator documentation
```

### Frontend feature internals

All fifteen product features keep public `src/index.ts`, deliberate secondary entries beside it, and production code below `src/lib`. Home, Delivery, Skills and Arcade now use this layout too: their former direct `src/views`, `src/routing`, `src/games` and similar folders moved with their relative consumers and adjacent specs. Public root/secondary entries and packaged asset paths remain stable. Team, AI, Work and Workspace also own the former Settings cards, services fragments, editors and route initialization shown here.

```text
libs/frontend/features/
├── home/src/lib/
│   ├── provider/                         provideHomeFeature, navigation and search composition
│   ├── ports/                            IHomeContext, IOrbitContext
│   ├── state/                            OrbitStateStore: target/repository/node selection
│   ├── search/
│   ├── pipes/
│   ├── routing/
│   ├── view-presenters/                  Home and Orbit
│   └── views/                            Overview and Orbit three-file Views
├── workspace/src/lib/
│   ├── provider/
│   ├── adapters/                         WorkspaceContext over public Core seams
│   ├── ports/
│   ├── state/                            WorkspaceStore, WorkspaceSelectionStore,
│   │                                     RepositoryRuntimeStore
│   └── settings/                         Directory, administration, services host and editor
├── work/src/lib/
│   ├── provider/
│   ├── adapters/                         WorkSnapshotContext
│   ├── ports/                            Work context/projection and consumed commands
│   ├── state/                            WorkStore, WorkSelectionStore, WorkFilterStore,
│   │                                     SourceConnectionStore
│   ├── board/
│   │   ├── components/
│   │   ├── directives/
│   │   ├── mobile/                       Browser board/ticket/create surfaces
│   │   ├── pipes/
│   │   ├── routing/
│   │   ├── services/                     LocalExecutionApprovalService
│   │   ├── state/                        BoardColumnCollapseStore
│   │   ├── view-presenters/
│   │   └── views/                        Board, task, delivery-group and selection surfaces
│   ├── onboarding/
│   │   ├── ports/
│   │   ├── provider/
│   │   ├── routing/
│   │   ├── view-presenters/
│   │   └── views/                        Existing project Setup flow
│   ├── settings/                         Boards, source connections and source editor
│   ├── search/
│   ├── quick-create/
│   └── widgets/
├── team/src/lib/
│   ├── provider/                         Team settings/context and route initialization
│   ├── ports/
│   ├── configuration/                    Workspace/team synchronization and setup defaults
│   ├── models/
│   ├── pipes/
│   └── settings/
│       ├── agent-removal/
│       ├── model-intelligence/
│       └── workspace-organization/        Positions, teams, employees and fallback order
├── ai/src/lib/
│   ├── provider/
│   ├── adapters/                         AiContext
│   ├── ports/
│   ├── models/
│   ├── state/                            AiStore: catalog, usage, login and connection activity
│   └── settings/                         Account cards, available connections and editor
│       └── ai-account-removal/
├── skills/src/lib/
│   ├── provider/
│   ├── adapters/                         SkillsContext and SkillsAssignments
│   ├── ports/
│   ├── catalog/                          SkillStore and built-in customization
│   ├── settings/                         Route draft, role cards, import editor/header action
│   ├── search/
│   ├── routing/
│   ├── view-presenters/
│   └── views/                            Catalog dialog and skill editor
├── workflow/src/lib/
│   ├── provider/
│   ├── adapters/                         WorkflowSnapshotContext
│   ├── ports/
│   ├── state/                            WorkflowStore and workflow busy state
│   ├── pipes/                            Workflow audit/decision presentation
│   ├── view-presenters/
│   └── views/                            ProcessDrawer
├── execution/src/lib/
│   ├── provider/
│   ├── adapters/                         ExecutionSnapshotContext and runtime factory
│   ├── ports/
│   ├── state/                            ExecutionStore, ExecutionSynchronizer, controls,
│   │                                     one execution-activity signal owner
│   ├── projections/                      Pure run/rail projections
│   ├── pipes/
│   ├── view-presenters/
│   └── views/                            ExecutionDrawer
├── ci/src/lib/
│   ├── provider/
│   ├── adapters/                         CiSnapshotContext
│   ├── ports/
│   ├── state/                            CiStore: usage, runs, logs, images and instances
│   ├── actions/
│   │   ├── view-presenters/
│   │   └── views/                        Actions page and ActionDrawer
│   ├── settings/
│   │   ├── pipes/
│   │   └── views/                        Virtual machines and workspace Local CI cards
│   ├── pipes/
│   ├── routing/
│   ├── search/
│   └── widgets/
├── delivery/src/lib/
│   ├── provider/
│   ├── ports/
│   ├── state/                            PullRequestStore, DeliverySnapshotProjection,
│   │                                     stateless DeliveryLaunchOperations
│   ├── settings/                         Repositories, destinations and editor
│   │   └── repository-removal/
│   ├── mobile/
│   ├── pipes/
│   ├── routing/
│   ├── view-presenters/                  PR list, create, compare and route hydration
│   ├── views/
│   ├── search/
│   ├── quick-create/
│   └── widgets/
├── automation/src/lib/
│   ├── provider/
│   ├── adapters/                         AutomationSettingsContext
│   ├── ports/
│   ├── state/                            AutomationSettingsStore, RepositoryPreparationPolicy
│   ├── pipes/
│   └── settings/                         Automation policy and System storage safety
├── feedback/src/lib/
│   ├── provider/
│   ├── ports/
│   ├── state/                            FeedbackStore and connection-test activity
│   └── settings/                         Intake service fragment and channel editor
├── mobile/src/lib/
│   ├── provider/
│   ├── ports/
│   ├── state/                            Desktop MobileAccessStore
│   ├── pipes/
│   ├── settings/                         Pairing/settings card
│   └── browser/
│       ├── provider/
│       ├── clients/                      BrowserMobileCompanionClient
│       ├── state/                        MobileCompanionStore
│       └── theme/                        MobileThemeStore
├── platform/src/lib/
│   ├── provider/
│   ├── adapters/                         PlatformContext
│   ├── ports/
│   ├── models/
│   ├── state/                            PlatformStore and AppearanceSettingsStore
│   ├── theme/                            DesktopThemeStore
│   ├── pipes/
│   └── settings/                         Developer tools and appearance cards
└── arcade/src/lib/
    ├── provider/
    ├── settings/                         One saved-settings writer context and appearance card
    ├── search/
    ├── god-mode/                         Existing renderer-session unlock state
    ├── leaderboard/                      Scores and leaderboard state
    ├── games/
    │   ├── breakout/
    │   ├── jungle-hunt/
    │   ├── pitfall/
    │   ├── pitfall-ii/
    │   ├── pong/
    │   ├── realsports-boxing/
    │   ├── river-raid/
    │   └── seaquest/
    ├── routing/
    ├── view-presenters/
    └── views/
```

Views retain matching `.ts`, `.html` and `.scss` files, existing markup, routes and `test-id` values. Non-E2E specs stay beside the exact production owner. A subfeature directory is created only for code listed under that owner; the structure does not require empty `state`, `ports` or `services` folders in every feature.

## Feature ownership and collaboration matrix

Frontend contexts implement the fields and commands their consumer actually needs. Default implementations live in the consuming feature, use public Core snapshot/configuration/synchronization APIs, and bind the existing owner with `useExisting` where identity matters. The Core environment implementations, intermediate Skills adapters, compatibility facade and legacy-named consumed contracts are removed; each consumer now uses its bounded canonical contract.

| Feature    | Actual frontend state, services and subfeatures                                                                                                                                                                                                                                                                                                                                                                                       | Consumed ports and collaboration                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home       | Overview widgets, Orbit scene and `OrbitStateStore` selection. `IHomeContext` is limited to snapshot readiness and the relevant external incident; `IOrbitContext` supplies live scope/selection and consumed commands.                                                                                                                                                                                                               | Reads the authoritative projection and optional Work selection/filters, Delivery launch/query operations, CI refresh and Platform incidents. Missing Work or Delivery disables the corresponding controls and calls without constructing a fallback writable store.                                                                           |
| Workspace  | `WorkspaceStore` cleanup/delete/transfer operations; `WorkspaceSelectionStore` changes scope; `RepositoryRuntimeStore` owns the five runtime/verification signals and prepare/plan/run guard. Directory, services host, administration and workspace editor belong here.                                                                                                                                                              | `IWorkspaceContext`, `IWorkspaceProjection`, `IWorkspaceSettingsContext`, `IRepositoryRuntimeOperations`; the same Configuration writer and Synchronizer. Optional Team synchronization, AI reset, CI refresh and workspace-refresh participants reuse their existing owners.                                                                 |
| Work       | `WorkStore` owns metadata, create/update/comment/draft operations and activity; `WorkSelectionStore` owns explicit selection; `WorkFilterStore` owns landscape filters; `BoardColumnCollapseStore` owns collapse preferences. `SourceConnectionStore` owns the six GitHub/Azure authentication/list operations and their transaction/activity path. Board, task forms/discussion, multi-select/groups and Setup are Work subfeatures. | `IWorkContext`, `IWorkProjection`, refresh/client ports and `IWorkOnboardingContext`. `IWorkFilters`/`WORK_FILTERS` exposes the same filters only from the selected Work provider. Execution, Workflow, Skills, CI and Delivery are optional consumed participants; commands and templates gate their own actions.                            |
| Team       | Pure setup/team synchronization plus organization, positions, employees, appearance, route/fallback forms, removal and model/quota projections. Team owns settings route initialization.                                                                                                                                                                                                                                              | `ITeamConfigurationContext` and `ITeamSettingsContext` join the one writer/projection with optional AI/Platform capabilities. Account editing and native installation expose actual availability. Team does not consume a concrete AI context class. Pure Team records reference AI routing and Skills vocabulary.                            |
| AI         | `AiStore` owns model/configuration/usage results, login operations and connection activity. `AiContext` connects settings, saved-account status and optional platform readiness. Account removal, configured/available service fragments and login/editor lifecycle belong here.                                                                                                                                                      | Narrow client/context contracts, the single Configuration writer, optional Platform installation and Team synchronization. Native-install controls and commands require the actual Platform participant. Runtime execution stays behind Execution's `IAgentRuntimePort`; the native Synapse adapter does not own the visible product catalog. |
| Skills     | `SkillStore`, built-in customization, catalog/editor/import/export; `SkillsAssignments` writes assignments through the existing writer; `SkillsSettingsDrafts` owns the route draft and System import header action. Session identity plus per-role draft revisions prevent an older save/reset completion from clearing newer edits.                                                                                                 | Skills client/context/assignment/snapshot-refresh ports. Workspace refresh and Bootstrap reuse the same store. `SkillsContext` resolves the active team from authoritative settings. Filesystem I/O/hashing stay in the filesystem provider; pure role/instruction rules stay in Domain Skills.                                               |
| Workflow   | `WorkflowStore` owns `get`, `decide`, `answer` and workflow busy state. ProcessDrawer, audit/decision pipes and `WorkflowSnapshotContext` belong here.                                                                                                                                                                                                                                                                                | `IWorkflowContext` and typed workflow client. Work consumes Workflow separately from Execution; both process menu entries and bookmarked drawer activation require its availability. The generic graph renderer is a UI capability; outcomes and decisions stay Workflow-owned.                                                               |
| Execution  | `ExecutionStore` commands, `ExecutionSynchronizer`, `ExecutionControls`, ExecutionDrawer and pure rail projections. Event subscription and activity signal have one owner; queue/goals/groups read the same validated snapshot.                                                                                                                                                                                                       | Context/projection/client/refresh/runtime/synchronization ports; consumed `IExecutionOperations` and `IExecutionActivity`. Delivery supplies publication, Workspace supplies repository refresh, and Bootstrap initializes only the registered owner.                                                                                         |
| CI         | `CiStore` owns usage, run refresh/details/logs, local run activity, cleanup, runner-image catalog and instances. Actions page/ActionDrawer, machine specification and workspace Local CI cards are CI-owned.                                                                                                                                                                                                                          | `ICiContext`, `ICiProjection`, `ICiUsageContext`, `ICiActionContext`, settings/client ports. `CiSnapshotContext` applies only CI fields. CI's readonly runtime-root port maps to Automation's draft or persisted settings at composition.                                                                                                     |
| Delivery   | `PullRequestStore` owns create/publish/compare/branch updates and shared busy state. `DeliverySnapshotProjection`, PR page/drawers, repository/destination settings and mobile merge requests live here. Stateless `DeliveryLaunchOperations` owns the five existing evidence/history/preview/start/reconcile RPC dispatches.                                                                                                         | Delivery projection/view/client/settings/runtime/CI contracts. Product composition binds `EXECUTION_PUBLICATION` to the same PR store. `IDeliveryLaunchOperations`/`DELIVERY_LAUNCH_OPERATIONS` supplies Home only when Delivery is selected; no duplicate state/cache or direct Home delivery RPC remains.                                   |
| Automation | `AutomationSettingsStore` owns the full runtime-policy draft shared by Automation and System storage safety. `RepositoryPreparationPolicy` owns one deduplicated warning. One session preserves unsaved edits across sections and resets for a new Settings route or new saved settings.                                                                                                                                              | `IAutomationSettingsContext`, the one writer and optional preparation/cleanup capabilities. Workspace cleanup is hidden and its command unavailable without the real Workspace owner. Exposes a readonly root signal for CI; no copied runtime draft or second writer.                                                                        |
| Feedback   | `FeedbackStore` owns connection-test activity. Feature-owned service fragment and channel editor use the existing settings transaction.                                                                                                                                                                                                                                                                                               | Feedback client/settings ports; Application Feedback consumes Work creation/drafting and receipt/checkpoint persistence. It does not create another database or instantiate Workspace/Execution just to save configuration.                                                                                                                   |
| Mobile     | Desktop `MobileAccessStore` owns access status, challenge and busy state. The card's enabled-only poll is disposed with the card. `/browser` owns companion pairing/request/snapshot polling, cancellation, state and theme.                                                                                                                                                                                                          | `IMobileAccessOperations`, dedicated Mobile IPC and versioned `mobile-contracts`. Browser consumers use browser-safe entries; Utility Process owns gateway/security/repository and selected-interface lifecycle.                                                                                                                              |
| Platform   | `PlatformStore` owns inspection/install activity and the sole incident signal/60-second poll. `AppearanceSettingsStore` owns the route draft; `DesktopThemeStore` applies persisted preference and owns listener cleanup.                                                                                                                                                                                                             | Platform context/health projection and `IPlatformOperations`; same snapshot and settings writer. Bootstrap starts incident polling at its original point. Update and power controls keep their capability owners.                                                                                                                             |
| Arcade     | Eight existing games, audio/rendering/model helpers, route guard, menu, leaderboard and renderer-session God Mode. Appearance reads/writes the same saved settings.                                                                                                                                                                                                                                                                   | Public Configuration and Bootstrap plus navigation/search/settings capabilities. Arcade needs no Domain/Application/Persistence mirror packages or former orchestration facade.                                                                                                                                                               |

Team, AI, Work, Workspace, Delivery, CI, Skills, Automation, Feedback, Mobile and Platform contribute their existing Settings surfaces through the native slots/editor registry. The generic Setting host owns selection/session/routing and contains no business-kind switch or legacy feature implementation.

### Context matrix across technical layers

`—` means no separate implemented responsibility in that layer. It must not receive an empty mirror package. Cross-feature settings and wire snapshots are composed by the explicit composition owners.

| Context    | Domain owner                                                                                        | Application owner                                                                                   | Configuration / feature IPC                                                                  | Persistence or concrete I/O owner                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Workspace  | Workspace, repository bindings/runtime/trust, delivery context, isolation capabilities              | `RepositoryRuntimeService`, acquisition/workspace/source-control/trust ports                        | Workspace/repository/context schemas; 8 feature methods                                      | Trust SQLite/workspace adapters; JSON bundles; Git/Lima acquisition adapters                 |
| Work       | Items/sources, columns/fields, comments/claims, action/health output DTOs                           | `WorkItemService`, claim/tracker/drafting/catalog ports; `WorkTrackingProjectionService`            | Work-source schema; 10 feature methods                                                       | Work projection SQLite; GitHub/Azure through Work tracker router                             |
| Team       | Positions, profiles, teams, authority, appearance, activity/work DTOs                               | —; configuration synchronization is frontend/domain composition                                     | Team/profile/appearance schemas; no dedicated IPC catalog                                    | Settings writer; no Team repository                                                          |
| AI         | Capabilities, routing/cost, token usage, cooldown/telemetry records                                 | Interruption/continuation errors and cooldown/telemetry repository ports                            | Route/candidate/capability schemas; 9 methods; accounts remain composed `ProviderConnection` | Telemetry SQLite/workspace; Synapse/AI adapters and Main credential mediation                |
| Skills     | Roles, manifests/packages, built-ins, result contracts, instruction composition and digest contract | `SkillCatalogService`, package/catalog/configuration ports                                          | Customization schema; 8 methods                                                              | Filesystem package I/O/digest; settings for assignments/customization; no Skills SQL package |
| Workflow   | Definition, graph, readiness, guards, routing, retry and progress                                   | `WorkflowEngineService`, `WorkflowMaintenanceService`, repository/reporter/tracker/trigger ports    | Workflow schema; 3 methods                                                                   | Workflow SQLite/workspace records and audit schema                                           |
| Execution  | Records/events/queue, goals/groups/relationships, bounded activity/health/action projections        | Analyzer composition and focused services below; runtime/context/tracking/recovery/repository ports | No separate settings schema; 17 methods                                                      | Runs, events, groups, proposals, goals and queue SQLite/workspace adapters                   |
| CI         | Workflows/runs/jobs/logs/approvals, verification, local-CI resources/images                         | Projection service, external-write service and verification/usage/repository ports                  | Binding/resources/image schemas; 19 methods                                                  | Verification/local-CI/projection SQLite, external-write JSON; GitHub/CI/Lima providers       |
| Delivery   | PRs, branches/comparison, destinations/evidence, launch/operations                                  | `DeliveryService`, `PullRequestProjectionService`, authoring/collection/launch/repository ports     | Destination/Orbit schemas; 10 methods                                                        | PR projection SQLite, operation JSON; GitHub adapter                                         |
| Automation | Signals, receipts, checkpoints, delivery policy and recovery records                                | `AutomationService`; narrow tracking/delivery/execution/trigger and repository ports                | Agentic-delivery policy schema; 2 methods                                                    | Automation receipts/checkpoints/recovery SQLite/workspace journals                           |
| Feedback   | Intake sources/signals                                                                              | `FeedbackIntakeService`; intake/tracking/settings/receipt contracts                                 | Intake-source schema; 1 method                                                               | Teams adapter and existing receipt/checkpoint store; no duplicate repository package         |
| Mobile     | —; the companion contract is its explicit boundary                                                  | `MobileAccessService`, repository/security ports                                                    | No separate settings package; 8 desktop feature methods plus `mobile-contracts`              | Access JSON; bounded gateway/security in orchestrator                                        |
| Platform   | Runtime health, connection status and incident DTOs                                                 | —; native composition stays at process/adapter boundary                                             | No mirror settings package; 8 feature methods plus native desktop contract                   | Settings JSON, remote cache SQLite; Main vault/OS/update/power and command-health helpers    |
| Home       | —; composes existing domain projections                                                             | —                                                                                                   | Saved view/Orbit configuration through composition                                           | —; frontend view state                                                                       |
| Arcade     | —; existing game models remain frontend-owned                                                       | —                                                                                                   | Existing preference through composition; no feature IPC catalog                              | Existing browser-local scores/session state and settings writer                              |

### Actual domain dependency direction

These are production imports, not a requirement for every context to depend on Core. Leaf contexts remain independent where they need no shared value.

| Domain package                         | Direct Domain dependencies                             |
| -------------------------------------- | ------------------------------------------------------ |
| Core, AI, Feedback, Platform, Workflow | None                                                   |
| Workspace                              | Core                                                   |
| CI                                     | Core, Workspace                                        |
| Delivery                               | CI                                                     |
| Skills                                 | Workflow                                               |
| Work                                   | Workflow, Skills                                       |
| Team                                   | AI, Skills                                             |
| Automation                             | CI, Work                                               |
| Execution                              | AI, Automation, Delivery, Skills, Team, Work, Workflow |

Domain stays framework-, Node- and provider-neutral. SHA-256 skill-text implementation lives in the filesystem provider; Domain accepts its callable digest contract. Node `computeProgressFingerprint` stays in Application Workflow while pure progress/guard/routing/retry rules live in Domain Workflow. `IAgentRuntimePort` and execution context belong to Application Execution, avoiding an AI ↔ Execution cycle.

### Application services and cross-feature joins

Application features depend on consumed ports and direct Domain owners, not a former aggregate back-barrel. Workflow consumes its own execution-trigger port, Automation its own start-analysis/start-solution trigger, and Execution only three remote Work queries: operational reads, detail reads and confirmed mutation feedback.

Execution's decomposition is a real ownership split:

| Execution collaborator                        | Owned responsibility                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ExecutionLifecycleService`                   | Sole active-task/pausing maps, AbortControllers, pause/resume/cancel and interrupted-run recovery                           |
| `ExecutionAdmissionService`                   | Sole pending-start reservation counter, queue-drain promise/flags/suspension and admission/capacity decisions               |
| `ExecutionStartService`                       | Analysis/solution start and continuation setup                                                                              |
| `ExecutionRunService`                         | Run driver, result/contract checks and verification/repair progression                                                      |
| `ExecutionGoalService`                        | Durable goal transitions and review                                                                                         |
| `DeliveryGroupService`                        | Durable proposal/group transitions, relationships and drift reconciliation                                                  |
| `ExecutionClaimService`                       | Acquisition, ownership checks, heartbeat/release and group admission                                                        |
| `ExecutionWorkspaceService`                   | Prepared workspace acquisition and execution scope                                                                          |
| `ExecutionWorkflowService`                    | Run-start/result/claim reporting through the exact consumed reporter methods                                                |
| `ExecutionPublicationService`                 | Best-effort notes/publication and failure normalization                                                                     |
| `ExecutionEventService`                       | Durable events and notification ordering                                                                                    |
| `ManualExecutionService`                      | Existing explicit manual-completion behavior                                                                                |
| `createExecutionServices` / `AnalyzerService` | Constructor composition and public execution API; no duplicate lifecycle/reservation maps or full product snapshot assembly |

Reservation-before-await, release-in-finally, operator-resume priority, bulk queue-drain suspension, pause capacity and recovery semantics remain with these owners. They are not replaced by independent counters in the public entry class.

`application/composition/RemoteProjectionService` joins independent Work, Pull Request and CI projection services. `apps/orchestrator/src/snapshot/OrchestrationSnapshotService` combines them with Execution's pure `IExecutionStateProjection`, workflow readiness/records, catalog, health and local CI. It preserves workflow capture before asynchronous reads and delivery-group drift reconciliation → relationship-proposal refresh order. Execution and Domain do not import the complete IPC snapshot to conceal a composition dependency.

## Frontend capabilities, providers and product omission

Capabilities supply reusable composition infrastructure; product features supply business implementations and contributions.

| Capability   | Owned infrastructure and public pattern                                                                                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core         | Validated clients, Commands/ViewPresenter/Hydratable, feature validation/composition, navigation registry, Bootstrap and bounded snapshot/configuration/synchronization APIs; consumer tokens rather than feature implementations |
| UI           | Mosaik-based components, directives, pure formatting/icon pipes, theme overrides and generic process graph; no feature runtime policy                                                                                             |
| Presentation | Shell/presenter/menu-bar, rail and route framing; consumed context and optional command capabilities; selected feature pages supplied by the application                                                                          |
| Search       | `SearchManager`, provider contracts and `withSearchProviders`; contextual results and explicit owned shortcuts                                                                                                                    |
| Setting      | `SettingsCatalog`, selection/session/context, native Mosaik slots, editor registry/service, lazy contributions and the generic route host                                                                                         |
| Notification | Notification service/interception/error formatting and providers                                                                                                                                                                  |
| Quick Create | Action registration, contextual selection and dispatch                                                                                                                                                                            |
| Widget       | Registry, category geometry/projections and native slots; Work/Delivery/CI data sources stay feature-owned                                                                                                                        |
| Update       | Desktop update state, native controls and System settings contribution                                                                                                                                                            |
| Interaction  | Speech/interaction helpers and native power settings contribution                                                                                                                                                                 |

The Core kernel's `IFeature<TKind>` is the existing `{ id, kind, options, provide(): readonly Provider[] }` contract. `composeProviders(base, features, rules)` validates duplicates, multiplicity and incompatibilities before materializing providers. Angular initializers and native slot `EnvironmentProviders` remain beside that plain-provider composition inside `makeEnvironmentProviders`; the kernel is not widened into another plugin runtime.

Product selection uses the current renderer API:

```ts
interface IProductFeatureDefinition {
  readonly id: string;
  readonly providers: readonly (Provider | EnvironmentProviders)[];
  readonly routes: Routes;
}
```

`applicationProductComposition` contains exactly fifteen business definitions. `ShellConfig` flattens selected providers/routes once, appends generic `settingsRoutes` from `frontend/setting` once, and registers Search, Quick Create, Widget, Navigation and Setting managers once. There is no separate Settings product definition. A `provideXFeature()` bundles its navigation/search/settings/actions/widgets with state/context registration; removing that definition removes its contributions and lazy routes together.

| Product feature | Navigation and owned page routes                                           | Search / Quick Create / widgets                         | Settings, lifecycle and collaboration                                                               |
| --------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Home            | Overview/Orbit, order 10; `home`, `orbit`, `dashboard` redirect            | Home search/shortcuts; consumes registered categories   | Selected Orbit state; no settings writer/eager feature operations                                   |
| Workspace       | No separate page; directory/administration/services in Settings            | —                                                       | Directory/administration/services/editor, scope/refresh participants and repository-runtime port    |
| Work            | Board, order 30; workspace-menu Setup; `setup`, `board`, `stages` redirect | Work search; create Work Item; Board category, order 10 | Source/board/connection contributions; consumed Execution/Workflow/CI/Delivery commands             |
| Team            | `team` bookmark redirects to Settings                                      | —                                                       | Workspace team card/editor and route initializer; explicit AI/Platform capability reads             |
| AI              | No standalone page                                                         | —                                                       | Configured/available accounts, editor and login lifecycle                                           |
| Skills          | Existing `skills` page; shortcut preserves `/main/settings` destination    | Skills search                                           | Global role cards, import editor, System header action, Bootstrap/workspace refresh                 |
| Workflow        | Feature-owned ProcessDrawer, no standalone page                            | —                                                       | Process actions and one busy owner; consuming actions unavailable when omitted                      |
| Execution       | Feature-owned ExecutionDrawer/controls, no standalone page                 | —                                                       | Bootstrap/event/activity participant; publication supplied by Delivery                              |
| CI              | Actions, order 50; `actions`                                               | CI search; Actions category, order 30                   | Automation VM order 0, workspace Local CI; Bootstrap usage/runs and readonly root binding           |
| Delivery        | PRs, order 40; `pull-requests`, `delivery` redirect                        | Delivery search; create PR; PR category, order 20       | Repository/destination cards/editors/route initializer; one publication store                       |
| Automation      | No standalone page                                                         | —                                                       | Automation policy order 10, System storage order 10; shared route runtime draft/preparation warning |
| Feedback        | No standalone page                                                         | —                                                       | Services intake slot/channel editor; no unrelated startup participant                               |
| Mobile          | No standalone desktop page                                                 | —                                                       | Global card; access owner; browser entry's separate lifecycle                                       |
| Platform        | No standalone page                                                         | —                                                       | System tools order 11, Appearance; theme and incident initialization                                |
| Arcade          | Arcade, order 60; menu and eight games                                     | Arcade search/game shortcuts                            | Appearance slot, enabled-route guard and session unlock                                             |

System card order remains Automation storage 10, Platform tools 11, Update 20 and Power 30; Skills supplies the import header action. CI's VM card precedes Automation policy in Automation. Shared section metadata is derived from the remaining contributed cards: omitting Automation removes its policy/storage cards but retains CI's VM card and its Automation section. Settings contribution IDs name their owning Views; section order, acceptance test IDs and registration ownership remain unchanged.

Omission has two boundaries. The renderer removes a definition's providers/routes/contributions; optional consuming commands become unavailable without constructing replacement state. The Utility Process has its own fixed feature catalog and explicit omitted-feature list. `OrchestratorRequestRegistry` rejects duplicate/foreign/missing handlers, requires canonical schema identities, seals before readiness and returns unavailable for intentionally omitted handlers. Renderer omission does not silently mutate the wire catalog or authorize an unregistered operation.

The renderer composition specs now parameterize all fifteen business omissions and construct the actual Bootstrap, Projection and Presentation context. Focused cases also exercise route/search/widget removal, shared Settings sections, optional Home Delivery/Work participants, Work process/Skills actions, native-install availability, workspace cleanup and stale Skills-save completion. The combined renderer cases passed in the full local verification recorded below; the separate packaged-process Electron acceptance run also passed.

`presentationRoutes(selectedRoutes)` derives default/wildcard redirects from an included concrete page. It rejects a composition with no selected page instead of retaining a hardcoded omitted destination. Original global search shortcut priority remains `home`, `overview`, `orbit`, `board`, `pull requests`, `actions`, `skills`, `arcade`, `pinball` at positions 0–8.

## One snapshot and one settings writer

Private Core transport state keeps one snapshot and one authoritative validated settings signal. Public consumers use these existing identities:

| Public Core entry                                | Boundary                                                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/projection` → `ApplicationProjection`          | Readonly snapshot/settings/loading, scope, board/repository/creation and runtime-health projections; no feature-store construction                          |
| `/snapshot` → `ApplicationSnapshot`              | Same readonly snapshot plus typed immutable `update(current => next)` for bounded feature projections; no second signal, raw State export or feature policy |
| `/configuration` → `ConfigurationStore`          | Single validated settings save/refresh path, readonly settings/account/storage results and applying validated responses; feature drafts submit here         |
| `/synchronization` → `OrchestrationSynchronizer` | Existing snapshot refresh, replay and refresh/cache lifecycle; adapters use this public owner instead of private Core source                                |
| `/bootstrap` → `ApplicationBootstrap`            | One cached initialization promise and four optional consumed participant contracts: Execution, Platform, Skills and CI                                      |

Work, Workspace, AI, Automation, CI, Execution, Workflow, Skills and Platform own their contexts/adapters. Delivery owns `DeliverySnapshotProjection`; Team owns its settings/context factory. They preserve bounded merges and the settings transaction; no compatibility facade or Core business adapter remains. `ConfigurationStore.configurationBusy` combines its writer flag with the actual AI and Work connection owners through readonly projections. Readonly derived signals may project the same data; writable activity, selection, drafts, claims, reservations and timers have one feature owner.

Startup order remains Execution initialization → Platform incident initialization → start snapshot refresh. Configuration, included Skills and silent storage hydration are awaited together. After snapshot refresh settles, optional CI usage/run refresh begins without blocking the Shell. Repeated callers share Bootstrap's promise. Owner migration does not create another timer: Execution owns its event lifecycle, Platform the 60-second incident poll, Mobile its enabled card/browser polls, and mounted storage/CI settings owners dispose their existing polls.

## Public packages and import direction

```text
renderer → public frontend features/capabilities + typed IPC/domain entries
mobile   → browser-safe feature entries + mobile-contracts
desktop  → desktop/process contracts + native Main adapters
orchestrator → application + configuration composition + provider/persistence adapters
provider/persistence adapters → consumed application ports + direct domain owners
application features → consumed ports + direct application/domain dependencies
configuration/IPC composition → explicit feature schemas and complete product shapes
domain features → explicit acyclic Domain graph above
```

Internal libraries are private Yarn workspaces with explicit source exports and direct workspace dependencies. Bundlers consume those TypeScript entries; Forge packages bundles instead of another external workspace runtime. Public package imports replace aggregate back-barrels and source-path imports. Nx boundaries, process/type tags, ESLint, manifest dependencies and exports must agree on that graph.

The workspace contains 105 private library packages. The final graph contains 111 projects, including fifteen frontend features, and 737 internal edges without a cycle. Root `package.json` and `yarn.lock` remain shared inputs; renderer tests include dependency test sources through `^default` rather than a global frontend source glob. Installed Nx 23.2.1's root dependency-diff helper compares scoped package names with unscoped project IDs and emits a warning despite correct package metadata, links and graph edges. The shared-input affected locator conservatively selects all projects for root dependency/lockfile changes; individual package/source changes resolve through their owning roots. Keep these inputs when changing the tooling configuration.

Logging has an explicit strict Node typecheck and infrastructure tag because its implementation writes to process stdout/stderr. The mobile contract remains a separate strict ESM, Node-free protocol package with its own adjacent contract tests and Nx targets.

Deliberate secondary entries keep consumers bounded: Core's APIs above and consumed operation contracts; Execution `/projections`; CI `/presentation`; Work `/filters` and `/mobile`; Delivery `/mobile`; Mobile `/browser`; Presentation `/context` and `/mobile`; UI `/process-graph` and `/mobile`. Testing entries stay test-only and do not expose writable State through a production entry. Wildcard aliases and old slash-style feature imports have been removed; canonical imports resolve through exact package exports and explicit public secondary entries.

## Provider families and native boundaries

| Family              | Actual implementation and boundary                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core                | Allowed-command health/install, bounded `execFileAsync`, executable/toolchain environment and sandbox temporary directories; no Work/CI/AI business policy                 |
| AI                  | `WorkspaceAgentRuntime` selects workspace-isolated runtime implementations through Execution's runtime port                                                                |
| Artificial Analysis | External model-intelligence request/report adapter; visible catalog/routing remain Symphony-owned                                                                          |
| Azure DevOps        | Work tracker and credential references; provider API shapes stop here                                                                                                      |
| CI                  | Manifest verification planner, local executor and runner-image parsers/catalog; Domain CI DTOs                                                                             |
| Filesystem          | Portable `SkillPackageService`, disk validation/import/export and `sha256SkillText`; no filesystem import in Domain instruction rules                                      |
| Git                 | Managed repository acquisition, execution worktrees, identity and snapshot/path/hash validation; Analyzer production access stays read-only for target source              |
| GitHub              | Projects, cloud PR/CI/source control, request governor/rate limits, service status and saved-host/account login/token operations                                           |
| Lima                | Managed environment/runner session lifecycle, checked assets, mounts, cleanup and bounded resources; Lima-only seams do not become generic application contracts           |
| Microsoft Teams     | Feedback intake/test-connection adapter emitting provider-neutral signals                                                                                                  |
| Simulated           | Explicit simulated runtime/tracker/workspace/delivery/query adapters and fixture configuration; distinguishable from production integrations                               |
| Synapse             | Native AI service/runtime, progress/errors, route governor/admission/model lockout/account cooldown and routing store; scoped host/account/workspace identity/cancellation |
| Work                | Configured `WorkTrackerRouter` and provider-neutral composite tracker port; no duplicate GitHub/Azure implementation                                                       |

Credentials keep the existing Main vault/broker and provider/runtime-home boundaries. The refactor does not move token values into settings, snapshots, logs, Domain or renderer state, or merge workspace/account runtime identities. Providers remain replaceable behind application ports.

## Contracts and persistence compatibility

IPC composition preserves **113 orchestration method IDs**, ordered request/response catalogs, envelope order, Zod schema identity, defaults/transforms and method/payload correlation. Feature catalogs own 103 methods; composition owns the ten snapshot/lifecycle/settings/connections/setup joins. The independent desktop contract retains fourteen native methods. Compatibility assertions are adjacent to their seven actual schema owners: composition `RequestSchemas`, `ResponseSchemas` and `RequestEnvelopeSchema`; desktop `DesktopRequestSchemas`, `DesktopResponseSchemas` and `DesktopRequestEnvelopeSchema`; Core `ResponseEnvelopeSchema`. The former aggregate compatibility spec is removed; all historical catalog arrays and assertions remain with these owners.

Persistence splits SQL/JSON responsibilities while shared connections/transactions remain explicit. `SqliteOperationalRepositories` composes Execution, Workflow and Automation on one connection with unchanged schema order and atomic cross-feature cleanup. `SqliteRuntimeRepositories` does the same for trust, verification and local-CI evidence. Workspace-routed variants share `WorkspaceDatabaseRegistry` and retain immutable ownership, legacy reads, cleanup ordering and disposal. A feature repository does not close a connection borrowed from composition.

The extraction keeps SQLite tables, serialized payloads, migrations/legacy reads, settings/machine separation, JSON formats, permissions, atomic writes and transaction bodies. Settings and machine paths remain their authoritative sources; the package split is not a storage migration or new database. See [persistence model](persistence-model.md), [IPC model](ipc-model.md), [process model](process-model.md) and [frontend reference parity](frontend-reference-flamox.md) for detailed behavioral contracts.

## Source completion and verification status

The package extraction, state/service decomposition, Settings-host/facade retirement, canonical contract names and uniform feature layout are applied. Home/Delivery/Skills/Arcade normalization moved 305 files and adjusted 38 relative module references; the static audit preserved all 618 relative targets, 19 View units and 57 adjacent specs.

The subsequent local cleanup removed 24 unconsumed internal Domain/Provider export barrels, the remaining Core `IWorkExecution` transition contract, 32 inactive renderer override stylesheets and six empty directories. `IWorkOperations` directly retains the same eighteen consumed command signatures; the separate active Work execution port remains. Five internal Settings contribution IDs now name their actual Views. The three imported renderer overrides (`app`, `app-header`, `technical-value`) remain byte-for-byte unchanged. Active settings/database/credential/skill compatibility readers remain because current startup and persisted data still consume them.

**`yarn verify` passed on 2026-10-30 with exit code 0.** Its configured agent, instruction, UI, design, formatting and lint checks passed; instruction compliance reported zero violations. Strict typechecks passed for 110 projects, tests passed for 51 projects, and all four application builds passed. This includes the 25 independent strict frontend source targets, Logging's strict Node/ESM infrastructure target and the separate Node-free Mobile contract targets.

The integrated renderer result includes the feature-composition and omission regressions, native input-event value precedence, route-local drafts and actual native-slot integration. The Mobile application passed its thirteen cases; the Mobile contract's seven adjacent spec files are also covered. Nx reused valid cached task results where available; the completed aggregate result includes the current renderer and Mobile runs.

| Evidence or gate                     | Status              | Scope and remaining evidence                                                                                                                                                                                                   |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canonical source ownership           | Applied             | Nine former root packages, old Settings package, facade/spec, legacy contracts and 23 forwarders removed. All fifteen product definitions and ten capabilities have actual owners and strict source targets.                   |
| Package graph and public APIs        | Checked             | 105 private library packages; 111 projects, 737 internal edges and zero cycles. Canonical exports and strict package checks passed; no compatibility import layer remains.                                                     |
| Static layout/import checks          | Passed              | No old direct feature source folders, retired relative references, cross-package relative source imports or Core → concrete feature imports in the scoped audit. Public root/secondary entries and assets preserved.           |
| Complete local verification          | Passed — 2026-10-30 | `yarn verify`: policy/format/lint checks, 110 project typechecks, 51 test projects and four builds. The integrated renderer fixture and omission cases passed.                                                                 |
| Clean build and native launch        | Passed — 2026-10-30 | Removed the generated `dist` tree, reran all four builds with `yarn nx run-many -t build --skipNxCache`, packaged macOS arm64 and verified the running app from its ASAR-backed Board route with existing workspace data.      |
| Real Electron and companion journeys | Passed — 2026-10-30 | `yarn e2e`: 47 passed, two existing skips. Actual preload/Main/Utility Process, workspace/account isolation, settings, source/repository flows, Board, Actions, delivery, Orbit, navigation and mobile pairing were exercised. |
| Packaging smoke test                 | Passed — 2026-10-30 | `yarn forge:package`: packaged the macOS arm64 application and passed the packaged ASAR smoke check.                                                                                                                           |

The complete local verification, Electron acceptance and packaging gates passed for the integrated source. The two existing Electron skips cover macOS activation in hidden-window mode and external interactive OpenCode login; the existing dedicated Arcade-spec exclusion remains unchanged. No live external authentication is certified by these fixture-backed journeys. Visual reference decisions and actual Electron captures are recorded in [frontend reference parity](frontend-reference-flamox.md).
