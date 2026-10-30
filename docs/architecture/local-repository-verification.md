# Local repository verification

Local repository verification is disabled by default and separates repository configuration from later verification execution:

1. An enabled repository binding identifies one source identity as `host/owner/name` and authorizes AI work for that repository in its Workspace Definition.
2. **Prepare locally** may clone or fetch that identity without checking out executable filters, initializing submodules, running Git hooks, installing dependencies, or executing project code.
3. Verification execution requires either a one-time local approval or a persisted machine-local capability grant for the reviewed plan.

Portable workspace configuration carries repository bindings but never carries verification trust. Verification grants live in the SQLite database owned by the Workspace Definition, are matched against both repository binding ID and normalized repository identity, and are removed with the workspace. Changing a binding to another owner, repository, or host invalidates the existing grant. Remote GitHub automation, Microsoft Teams intake, autonomous scheduling, AI output, and imported workspace bundles cannot create verification approvals.

## Managed repositories and worktrees

`ManagedGitRepository` owns clone and fetch. GitHub credentials are available only to the bounded `gh`/Git subprocess, Git prompts are disabled, LFS smudging is skipped, submodules are not initialized, checkout is deferred, and hooks point at an empty application-owned directory. The verified clone path is persisted only in machine-local settings. A configured existing checkout remains supported, but a mismatching `origin` is rejected.

Execution continues to use one Git worktree per owner. Analyzer uses a detached read-only worktree, Solver/revision uses its existing named branch worktree, and verification uses a separate detached worktree pinned to the plan's commit. A plan is invalid when the repository identity or revision changes before execution.

## Planning and capabilities

`ManifestVerificationPlanner` inspects files without executing them. The first supported detector set is:

- Node.js through `package.json` and npm, pnpm, or Yarn lock/package-manager evidence.
- .NET through solutions and project files.
- Python through `pyproject.toml`, uv, Poetry, or pip.
- Java through Maven or Gradle, preferring checked-in wrappers.
- Go modules and Cargo packages.

The planner emits immutable typed steps for restore, build, lint, unit test, and E2E test. Node package scripts are shown in the approval dialog. The renderer submits only a server-owned plan ID and `once` or `repository`; it never supplies an executable, arguments, working directory, environment, or path.

Verification capabilities are additive and purpose-specific. Dependency/test network, container, browser, native UI, and credential capabilities remain separate. A stored grant can satisfy only the exact subset it contains; expanding a later plan requires another approval. Repository configuration, rather than a verification capability grant, authorizes Codex, Claude, or OpenCode work.

## Host executor boundary

`LocalVerificationExecutor` uses `spawn` without a shell and validates executable-specific argument shapes. It rejects paths outside the managed worktree, bounds timeout and output, runs one step at a time, stops after failure, redacts common credential forms, and terminates the complete process group on cancellation. Its runtime home and package caches are application-owned, and provider/AI credentials are absent from the environment. `HOME` points to that private home and `TMPDIR` to the run-owned temporary directory. Native Windows children additionally receive `USERPROFILE` pointing to the same home, `APPDATA` and `LOCALAPPDATA` beneath its `AppData/Roaming` and `AppData/Local` directories, and `TEMP`/`TMP` pointing to the same private temporary directory. These paths are derived from the executor's managed roots rather than inherited from the operator's profile.

An installed Symphony is started by the desktop environment and therefore receives the operating system's default PATH rather than the user's shell environment. Allowed executables are resolved to an absolute path through `toolchain-environment`, which recovers the login shell's PATH only on POSIX when the inherited path contains only system directories, caches that result per orchestrator process, and keeps well-known installation directories as a fallback. Windows does not invoke that POSIX shell; every provider subprocess receives the resolved platform toolchain PATH. A step whose executable cannot be resolved, or whose process cannot be started, produces a failed step result naming the missing toolchain instead of an exception, so a missing tool never discards a completed run.

The package-manager, Corepack, and toolchain caches live in an application-owned `cacheRoot` under the configuration root that survives a run, while the run directory stays ephemeral. Yarn, npm, pnpm, Nx, pip, uv, Poetry, Cargo, Go, Gradle, Maven, NuGet, and browser-download caches are redirected there, and agent runtimes receive the same locations, so one installation downloads a dependency once for every repository, worktree, and run instead of once per run. Yarn additionally links `node_modules` against that shared cache rather than copying it. Without it, every verification would re-download the package manager declared by the repository, and a step declared as network-free would perform network work. The cache is shared across repositories of the same installation; dependency restore therefore runs with the package manager's script-free mode.

The current host backend is not a containment boundary. Approved repository scripts can use ordinary host APIs, including filesystem and network APIs available to the user. Network capabilities currently communicate required risk and approval scope; enforcement requires the planned container/VM backend. Users should choose one-time execution for unfamiliar repositories and grant persistent trust only when they trust the authors and reviewed plan.

AI execution uses the configured AI session and remains distinct from local verification. It receives the existing narrow environment and provider sandbox for Codex, Claude, or OpenCode, but it must not be described as credential-free or equivalent to VM isolation.

## Lifecycle and recovery

Verification is non-resumable. It appears in the desktop active-operation check, blocks an update restart or quit until the operator keeps the app open or cancels it, and cancellation waits for the process group to exit. Plans, trust grants, and completed run summaries are durable; transient execution worktrees are released after every terminal result.

The next increments are a structured artifact browser, service/readiness orchestration for multi-process E2E suites, AI refinement of the deterministic plan from bounded manifest evidence, dependency-install-script capabilities, and container/VM enforcement for filesystem and network isolation.
