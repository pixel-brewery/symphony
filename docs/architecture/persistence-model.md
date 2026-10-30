# Persistence model

Symphony separates portable configuration, machine paths, workspace operational state, runtime identities, and managed worktrees.

```text
configuration-root/
├── settings.json                 # portable current-schema settings, no secrets or absolute paths
├── machine.json                  # workspace root, local CI machine specification, and local repository paths
├── state.sqlite                  # scoped remote projections and pre-workspace execution records
├── storage-allocation-v1.json   # last complete physical-block inventory for startup admission
├── update-channel.json           # Main-owned release channel
├── keep-awake.json               # Main-owned sleep-prevention preference
└── workspaces/
    ├── local-ci/                 # pinned Lima/image cache and disposable VM state
    └── <workspace-id-hash>/
        ├── state.sqlite          # executions, events, automation checkpoints/receipts for one workspace
        ├── runtimes/
        │   ├── codex/<account-hash>/
        │   └── claude/<account-hash>/
        └── executions/           # execution-owned Git worktrees
```

`settings.json` stores Workspace definitions, provider connections, work-item sources, repository and CI bindings, agent profiles, Delivery Contexts, and saved aggregate views. Credential values are prohibited; only references such as `env:ADO_PAT_CUSTOMER_A` are portable. `machine.json` owns absolute paths plus the local CI machine specification — selected resource preset and optional Custom CPU, memory, disk, and cache limits — because those choices size execution on one physical machine. Whether a Workspace may run GitHub Actions locally is a workspace decision, disabled by default, and is stored with the Workspace definition in `settings.json` so it travels with a workspace transfer. Both files use atomic replacement and mode `0600`.

`update-channel.json` and `keep-awake.json` are Electron Main's own operating-system preferences, not application settings: Main reads them before the Utility Process exists and writes them atomically at mode `0600`. They stay outside the settings schema and outside a workspace transfer because a release channel and a sleep assertion belong to one installation on one machine.

`storage-allocation-v1.json` is a replaceable, credential-free performance cache. It stores only the last complete allocated-byte total and provider-neutral storage-segment totals, never paths. Startup may use it for immediate quota admission while a cooperative inventory refreshes it; the live filesystem-free-space reserve remains authoritative before every managed write even when this cache is absent or stale.

`settings.json` and `machine.json` are the only application-settings source. Startup validates them against the current strict schema and does not read, infer, or upgrade settings from `state.sqlite`; outdated versions, obsolete fields, and incomplete records fail validation instead of being silently migrated. `state.sqlite` remains available only for scoped remote projections and pre-workspace execution records.

An explicit workspace export is a separate `symphony.workspace` version-one JSON bundle, not a copy of either settings file. It contains exactly one Workspace Definition and its provider connections, work-item sources, repository and CI bindings, agent profiles, Delivery Contexts, model/effort choices, skill assignments, and the complete content of referenced shared `user:` skills. Repository-owned skills remain references because the repository supplies them after checkout. Embedded shared-skill instructions and resources are exported verbatim and, like every portable skill package, must not contain credentials. Saved aggregate views, user/theme settings, application runtime policy, executions, events, claims, automation receipts, remote projections, managed worktrees, mobile pairings, and caches are not workspace configuration and are excluded.

Before writing the private mode-`0600` bundle, export removes every credential reference, GitHub account login, repository checkout path, workspace root, and runtime-home identity. Codex connections import as fresh isolated identities. Import validates the complete bounded bundle before mutation, rejects cross-workspace references and conflicting shared-skill content, replaces only configuration owned by the matching workspace ID, and preserves all unrelated workspaces plus target-machine user/runtime settings. Existing local repository paths for the same binding IDs are retained; new bindings receive target-machine defaults. Provider sign-in remains an explicit target-machine action.

`WorkspaceExecutionRepository` routes new execution records, events, Delivery Groups and proposals, remote-automation source checkpoints, signal receipts, and agentic-delivery journals by the immutable `workspaceId` into a workspace-specific SQLite database. Delivery-group membership is normalized into root and member rows; a partial unique index prevents one work item from belonging to two non-terminal groups. The JSON payload remains the forward-compatible aggregate record, while the membership rows enforce the invariant transactionally. An operator's explicit joint-delivery attestation — the attestation timestamp plus an optional reason — travels inside that JSON payload column on the confirmed proposal and on a group the confirmation newly activates, as audit evidence; the field is optional, so legacy rows written before manual bundling remain readable without one. Each agentic journal identifies one provider run attempt, managed pull-request branch, failure fingerprint, source execution, diagnosis/repair executions, rerun intent, and recovery state. Legacy records without a workspace ID remain readable from the former database but new records cannot fall back silently. Database files are mode `0600`; their parent workspace directory is mode `0700`.

Managed local CI terminal evidence is routed to the same workspace-owned runtime repository. A `local_ci_executions` record contains only the bound repository and workflow-run references, exact revision, terminal result, timestamps, run-scoped label, architecture, and pinned image/tool version. The newest 100 records across configured workspaces are available to the orchestration snapshot and filtered to the active workspace scope for the Runs rail. Registration tokens, workflow secrets, guest files, process output, and VM disks are not persisted evidence. The checksum-verified Lima binary and pinned base image are cached under `<managed-workspace-root>/local-ci`; VM instance state and its generated configuration are deleted after each run, and abandoned owned instances are reconciled at startup. An explicit Settings action can remove the complete inactive cache.

`SqliteRemoteProjectionRepository` stores versioned, provider-neutral Work Tracking, Pull Request, and CI read projections in the configuration-root database. Each key fingerprints the selected workspace IDs and only the source, connection, repository, and CI configuration that determines that remote view. A successful complete provider read atomically replaces its projection. A failed refresh cannot overwrite it: the orchestrator combines the last matching projection with fresh local executions, events, health, workflow, and skills and marks that remote portion `stale`. Before the first successful read it returns the local state with an `unavailable` remote marker instead of failing the complete snapshot. Cached work items are display state only; Analyzer and Solver must obtain an operational provider read before starting work. Pull-request counts always come from the repository projection and never from execution history. Deleting a workspace removes every cached scope containing that workspace.

Every execution records an `ExecutionBindingSnapshot` containing the exact work tracker, source control, repository, CI, AI connection, and agent profile IDs selected at start. This is audit evidence and prevents a settings or view change from reinterpreting a running task. Remotely triggered executions additionally retain the provider-neutral signal ID and actor handle; a processing receipt can therefore recover the already-created execution after a crash instead of duplicating it.

AI executions additionally persist an opaque provider-neutral `WorkItemClaim`. The shared claim itself lives in the configured GitHub repository, not SQLite, so independent contributor machines observe the same exclusive owner. SQLite retains the matching token for ownership validation, restart recovery, Analyzer-to-Solver handoff, and safe release. A missing local database never grants permission to steal or expire a remote claim.

Provider payloads are reduced to domain records before persistence. Secrets, raw AI events, hidden reasoning, provider response documents, and provider tokens are never persisted.
