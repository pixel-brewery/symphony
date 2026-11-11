# Managed local CI

**Dokumentstatus:** Implementierter Ist-Stand

Symphony can execute a queued GitHub Actions workflow on the operator's Mac without consuming GitHub-hosted runner minutes. GitHub remains the workflow scheduler and check reporter; Symphony supplies one repository-scoped self-hosted runner inside a disposable Linux VM.

## Ownership

Symphony owns the runtime. Local GitHub Actions are a Workspace decision: the operator enables them per Workspace under Settings → the Workspace → **Local GitHub Actions**, together with the guest image that Workspace reproduces and the setup script each of its repositories runs. These apply as soon as they change (a setup script when its editor loses focus); a failed save reports `Unable to save settings.` and shows the stored value again. The same switch enables explicit **Run locally** actions and authorizes a running Symphony instance to pick up queued GitHub jobs whose current attempt requests all managed-local labels. Symphony checks for the oldest eligible job at startup and every 30 seconds while its single local-run slot is free; ordinary GitHub-hosted jobs are never claimed. The machine those runs boot is host-owned and configured once under Settings → System → **Virtual machines**, where one bounded resource preset is chosen. On the first local run Symphony downloads the pinned Lima release for the host architecture, verifies its SHA-256 digest, and stores it under `<managed-workspace-root>/local-ci`. Every execution creates a fresh Apple Virtualization VM from a pinned Ubuntu 24.04 cloud image, installs the pinned workflow-scoped GitHub Actions runner, registers it for one repository and one workflow-run label, supervises it until every job in the workflow is terminal, removes its GitHub registration, and deletes the VM. The Ubuntu image, Lima version, runner version, resource policy, and checksums are release-owned Symphony configuration. They do not belong in a target repository.

### Workspace authorization and automatic takeover

The visible workspace selection is a manual-command boundary, not the lifetime
of a saved local-CI approval. Explicit local starts use the selected scope by
default. They may resolve only runs whose enabled GitHub Actions binding belongs
to a currently selected workspace. Background takeover uses a separate internal
operational scope: both candidate discovery and the eventual start require an
enabled workspace with `localCiEnabled: true`, regardless of the current view.
Changing the selected workspace must not strand an already approved queued run.

Both scopes require an enabled repository, an enabled `github-actions` CI binding,
and its GitHub connection to belong to that same workspace. The run identifier
must carry that binding's prefix and an exact numeric provider-run suffix. A
disabled workspace or one without local-CI approval is not eligible for an
operational start. These checks precede runner registration and VM provisioning;
invalid ownership or scope must cause no token request or runner start. The
operational flag is supplied only by the background takeover composition, never
accepted as an extra renderer IPC input. The application still applies its shared
single-run slot, storage admission, abort supervision and normal run/job checks.

A handled GitHub run and attempt remains handled even when local setup failed.
Fixing settings or restarting the application does not erase that audit evidence
or automatically replay the same attempt. The operator can select the owning
workspace and explicitly request **Rerun locally** after correcting the cause;
this creates a new local execution through the existing manual path. Enabling
local CI does not rewrite a workflow's `runs-on` declaration, grant runner
permissions, or convert a hosted-runner budget failure into a local run.

### Runtime resources

The three fixed profiles are policy ceilings, not fictional machine capacities: **Compact** is capped at 4 CPUs, 8 GiB memory, a 12 GiB virtual disk, and a 4 GiB action cache; **Balanced** at 6 CPUs, 12 GiB memory, a 20 GiB disk, and an 8 GiB cache; **Performance** at 8 CPUs, 16 GiB memory, a 30 GiB disk, and a 12 GiB cache. **Custom** exposes independent Mosaik sliders for all four values. Selecting it for the first time copies the currently selected fixed profile, so an operator can increase only the resource that constrains a workflow while preserving the other three values.

Symphony detects the Mac's logical CPUs, installed memory, filesystem availability after the protected free-space reserve, and the configured Local GitHub Actions storage limit. It reserves two host CPUs and at least 25 percent or 4 GiB host memory. Fixed profiles are clamped to the remaining real capacity; a profile clamped to 4 GiB memory can remain supported when its other resource minima are met. Their 8/12/16-GiB memory ceilings remain unchanged. Custom slider maxima use the same detected capacity, while the VM startup check rejects a saved Custom configuration if the host capacity later falls below it. Disk plus cache share the Local GitHub Actions storage budget and leave 2 GiB for images and tooling; changing either slider therefore changes the maximum of the other. A configuration with fewer than 2 VM CPUs, 4 GiB VM memory, 8 GiB VM disk, or 1 GiB cache is unavailable. Stored Custom configurations below the shared 4-GiB floor are raised to 4 GiB during settings upgrade before another runner can start; valid values such as 4 GiB or 8 GiB remain unchanged. Only one managed local workflow may run at a time, so the selected limits cannot multiply through parallel VMs.

Memory-constrained Custom configurations keep their selected RAM ceiling. When memory is below 12 GiB and the virtual disk exceeds 20 GiB, Symphony provisions only the overlapping headroom as Linux swap, capped at 4 GiB. This lets memory-heavy builds progress more slowly instead of being terminated by the kernel while preserving at least 20 GiB of virtual disk for the image and workspace. The private Actions cache service binds only to `127.0.0.1:65432`, leaving common application ports such as 3000 available to workflow services.

Every Lima-owned path is rooted below `<managed-workspace-root>/local-ci`: `lima` owns instances, `home` replaces the operator HOME, `cache/lima-downloads` is the XDG cache for tools that honor it, and `tmp` replaces the host temporary directory. On macOS, Go's user-cache resolution intentionally ignores XDG and derives Lima's image-download cache as `<managed-workspace-root>/local-ci/home/Library/Caches/lima`; changing HOME is therefore the decisive containment control. A short verified `/tmp/symphony-lima-<digest>` symlink exists only to keep Lima's Unix socket path below the macOS limit; it points back to the managed `lima` directory and owns no storage. Symphony never relies on `~/Library/Caches/lima` or another ambient Lima lifecycle.

Settings › System › **Storage** exposes the physical allocated size of Local GitHub Actions and a separate hard limit, defaulting to 32 GiB; the **Virtual machines** card in the same section owns only the runner resources and machine list ([System settings](../system/README.md)). The orchestrator checks that limit and the configured minimum free Mac reserve before startup and every second while a runner is active. Reaching either boundary aborts the runner and destroys its VM. Physical block allocation is used rather than a sparse disk image's advertised virtual capacity.

Storage admission protects delivery before backlog analysis. Starting analysis or implementation must leave the selected VM disk, Actions cache, two-GiB runner overhead, and an eight-GiB implementation-worktree reserve available under the filesystem, application, workspace, and Local GitHub Actions limits. A local run reserves its remaining selected VM and cache growth instead of the former fixed 512-MiB write allowance. The live filesystem-availability check and complete bounded workload reservation remain synchronous; they do not wait for a recursive allocation inventory. Large managed trees are categorized cooperatively in the background, and the last completed physical-block inventory is atomically cached for immediate reuse after restart. On a first launch, configured quota capacity and the live free-space reserve gate admission while that detail pass finishes. The five-second storage watchdog first releases inactive failed or cancelled analysis worktrees, whose durable summaries remain persisted; it never selects implementation or revision worktrees that may contain recoverable source changes. If the reserve still shrinks while analysis is active, only those analysis executions are cancelled. The existing critical-pressure stop remains the final boundary for every writer, including an active build.

## Storage refusal and retry

Before claiming or preparing a local run, the orchestrator applies the same governor-owned storage decision exposed by `storage.status.get.localCiAdmission`. The exact permitted/blocked/unknown union, remaining-growth budget, reserve-first failure priority and pending-inventory semantics are defined in [System storage admission](../system/README.md#lokale-ci-speicherfreigabe). The projection is read-only and preserves the configured reserve, including a saved value such as 200 GiB. It never lowers that value to make a run start.

A storage refusal occurs before a local execution ID, active runner, setup diagnostics or terminal execution record is created. It neither claims a runner nor consumes the GitHub run attempt, and it does not turn a queued GitHub check into a local failure or success. Automatic takeover can therefore select that same still-eligible queued attempt again on its next 30-second reconciliation after space becomes available and the local slot is free. This differs from a terminal setup failure after admission, whose recorded execution prevents repeated handling of the same attempt. The existing [notification centre](../notifications-and-tray/README.md) owns the actionable explanation and the route to storage settings.

## CI polling failure isolation

Operational polling and automatic managed-run discovery isolate ordinary read failures per enabled CI binding. Each read obtains the latest 50 provider runs and their job projection. Fresh results from healthy bindings remain eligible for observation and oldest-first local takeover; failed bindings contribute no cached candidates. An empty successful read counts as success. A binding without a matching repository or GitHub connection causes no provider read and does not count as a successful read. If every attempted read fails, polling rejects with the first original failure in binding order instead of reporting a successful empty result. No applicable bindings is a legitimate empty result. Each subsequent poll reads the current configuration, so correcting a repository binding restores it without recreating the provider.

Rate-limit, projection-scope-change and cancellation failures interrupt the whole read even when another binding succeeds. Classification follows nested error causes with cycle protection; the same rule applies while reconciling queued jobs. Ordinary binding diagnostics contain only workspace, CI-binding and repository-binding identifiers plus a new generic failure message with an optional HTTP status. Raw CLI output and its cause chain are not passed to the structured logger. The exact internal error classifications and observation contract are defined in [Actions background polling](README.md#hintergrundabfrage-mehrerer-ci-anbindungen). Existing account request governance remains authoritative; already-started reads settle through the existing transport, without a new cancellation or retry mechanism.

Selected-view CI refreshes remain strict: any failed selected binding rejects the complete read, allowing the existing projection owner to retain matching cached evidence and mark it stale or unavailable. Partial operational results never replace that display projection or mark it current.

## Guest image configuration

Symphony owns the _mechanism_, never the guest _contents_. A GitHub-hosted `ubuntu-latest` runner is not a bare Ubuntu image: it is the `actions/runner-images` build, preprovisioned with Node.js, Docker, browser system libraries, fonts, locale, and dozens of tools. A workflow that runs unchanged there fails on a bare cloud image for reasons unrelated to the product under test. Microsoft publishes no downloadable image — each release ships only a machine-readable software report and an SBOM — so Symphony reproduces the declared contents instead of downloading the image.

Each workspace selects one published runner image release. Symphony reads the release's software report and resolves it into a pinned definition: the Ubuntu cloud image and its SHA-256 digest, the declared apt package set, the declared Node.js runtime and its digest, and the environment variables the image exports. That definition is persisted on the workspace, so a later upstream change cannot silently alter a run. The catalog is cached below the local CI runtime root and served from cache when GitHub is unreachable, so image selection keeps working offline.

Provisioning installs the small package set Symphony itself needs — a container engine for service containers plus the transport and archive tools it uses — and then the image's declared packages best effort, so one renamed upstream package cannot fail an otherwise healthy run. It settles the host-runtime concerns a GitHub-hosted image also settles before any job step: `en_US.UTF-8`, UTC, raised inotify watcher limits, and a shared-memory segment large enough for Chromium. The Node.js runtime is mounted read only, checksum-verified in the guest, and linked into `PATH` before any repository script runs — the same guarantee `ubuntu-latest` provides and the reason a repository script may execute before `actions/setup-node`.

Anything a repository needs beyond the image is the repository's own concern. Each repository binding carries a setup script, executed in the guest after the image baseline and before any workflow step or workspace preparation. This is where a product declares its Yarn release, its browser installation, or any other system requirement. Symphony ships none of them: no product-specific package list exists in Symphony source.

## The target repository's own contract

The target repository owns only its GitHub Actions job contract: jobs intended for managed local execution must request the two stable labels plus the current workflow-run label. It does not ship a VM image, a runner installer, a Symphony script, or a long-lived registration token.

```yaml
runs-on:
  - self-hosted
  - Linux
  - symphony-local-ci
  - symphony-run-${{ github.run_id }}
```

The existing job `name` remains unchanged, so a required branch-protection context continues to receive its result from GitHub. This is not a manual bypass or a locally asserted status: the original GitHub workflow and exact pull-request revision execute on the self-hosted runner, and GitHub publishes the check result normally.

## Execution sequence

1. The operator enables Local GitHub Actions for a Workspace. Only for that Workspace's runs do **Run locally** actions then appear on Pull requests, the Actions workflow page, and Action drawers opened from the sidebar run panel. Starting a dispatch-capable workflow locally first asks GitHub to create its `workflow_dispatch` run on the selected reference, then hands that exact run to this same execution path. A workflow dispatched in GitHub with its Symphony-local input reaches the same path automatically: while idle, Symphony lists operational runs, accepts only a queued current attempt whose every pending job requests `self-hosted`, `Linux`, `symphony-local-ci`, and `symphony-run-<run-id>`, and records the handled run attempt so a failed setup is not retried forever. Symphony reuses an untouched queued attempt only while at least one current-attempt job exists and every current-attempt job is still waiting. A selected run that is pending without jobs triggers a search for an older, purely waiting run of the same workflow and branch. Symphony reports the blocking run and waiting job names, cancels that blocker, escalates to GitHub's force-cancel endpoint when required, and then waits for GitHub to publish the selected run's jobs. If any job of the selected attempt has already started or completed, Symphony instead cancels that partial attempt, waits up to five minutes for GitHub's terminal state while reporting the latest status and elapsed time, asks GitHub for a fresh attempt of the same workflow-run ID, and waits for only that attempt's new jobs.
2. The GitHub adapter checks the pinned runner version's registration and runtime cutoff with GitHub.com before a local dispatch and again before preparing an existing run. A past cutoff stops preparation before any cancellation, registration or VM startup and reports the version, cutoff and update action. A future cutoff appears in runner diagnostics. The check is skipped on GitHub Enterprise Server and when the schedule endpoint is unavailable with HTTP 403 or 404. A transient read gets one retry. If the schedule remains unavailable, preparation can continue with a diagnostic. Authentication and rate-limit failures are surfaced. The adapter then resolves the configured repository and exact numeric run ID and obtains a short-lived runner-registration token.
3. Symphony provisions a mount-free Linux VM and transfers the registration token through process standard input. The token is never an argument, renderer value, persisted record, host mount, or log value.
4. The runner registers with `symphony-local-ci` and `symphony-run-<run-id>`. A workflow from another run cannot match that runner.
5. GitHub schedules all matching jobs. A single runner executes matrix jobs sequentially; this costs no hosted-runner minutes but is slower than four hosted runners.

   If GitHub returns HTTP 409 while cancelling an older blocker or incomplete attempt, Symphony reads that run again. It continues only if the same run and known attempt are terminal. An unresolved conflict remains a setup failure. If the runner listener exits before GitHub reports a terminal state, Symphony includes the process exit status and a bounded, redacted output excerpt in the failure evidence, including when the listener exits with code zero.

6. At the terminal workflow state, cancellation, application quit, or application update, Symphony stops the runner and deletes the VM. On the next application start it also removes abandoned Symphony-owned instances left by a host crash. The Settings action **Clear runner data** first removes inactive instances, then clears the cached base image and verified runner tooling. It persists only bounded audit evidence: repository binding, workflow-run reference, revision, result, timestamps, labels, architecture, and pinned runtime version.

   A transient connection failure, HTTP 5xx response, or the 30-second `gh` subprocess deadline while reading the active workflow status does not immediately stop its runner. The subprocess deadline is recognized by the exact error fields `code: null`, `killed: true`, and `signal: 'SIGTERM'`. Symphony retries that read up to five times consecutively, with exponential backoff and jitter capped at 30 seconds; a successful status read resets the budget. Runner exit and operator cancellation remain effective during backoff. Authentication, permission, missing-resource, rate-limit, and other non-transient errors are not retried. Exhausting the budget preserves the failure and diagnostics, then performs the existing runner cleanup. This recovery retries only status observation, never workflow dispatch or deployment commands.

7. The shared run projection behind the sidebar run panel groups the provider run and its active or latest local execution into one Action entry; the panel's `Actions` segment lists only entries in progress and the latest failed one. Its **GitHub** state remains the authoritative scheduler/check state, while **Local runner** reports Symphony's VM lifecycle and persisted result; a local setup failure therefore remains visible even while a delayed GitHub snapshot still says queued. Provider-only and orphaned historical local records remain projection entries with their one available source. Opening an Action shows only the latest workflow attempt's live job and step states. The complete redacted `gh run view --log` result crosses IPC as ordered chunks of at most 60,000 characters and is reconstructed only in renderer memory; each GitHub job/step prefix places its protocol directly below the matching step in the nested timeline. Unstructured workflow output and local-runner diagnostics remain timeline entries, so the drawer has no competing Live output or Failure output boxes. If the workflow-jobs REST endpoint is unavailable, Symphony falls back to `gh run view`; job logs use the run-and-job-aware CLI path rather than the expiring REST log redirect. When GitHub temporarily reports more than one step as active, Symphony treats only the latest observed step as current and closes older stale step states. The exact bounded failure output and diagnostics are still persisted with each local execution as terminal audit evidence and are read back into its drawer, so reopening a historical execution cannot silently substitute evidence from a newer attempt of the reused GitHub run ID. An already-open drawer resolves the authoritative terminal execution nearest to its optimistic renderer start, within the bounded IPC startup interval, so the local status changes from **In progress** to its terminal state even when renderer and orchestrator timestamps differ slightly. Before the VM exists, diagnostics report the current preparation phase, an identified concurrency blocker, or the actionable setup failure; after VM startup they report CPU, memory, disk, swap, relevant listeners, and recent kernel OOM evidence. Active details refresh automatically while the Action is running.

The VM has outbound network access because checkout, package installation, GitHub Actions, Playwright browser installation, and job services require it. It has no host filesystem mounts and receives no Symphony AI/provider credentials. Workflow secrets and the per-job GitHub token retain GitHub's normal event and repository policy.

## Required private upstream application repository patch

In the read-only private upstream application reference, `.github/workflows/ci.yml` is the only product-repository file that must change for this integration:

- Replace `runs-on: ubuntu-latest` on `ci`, `e2e`, and `e2e-result` with the four-label block above. Keep `name: Format, Lint, Typecheck & Test` unchanged because branch protection requires that exact check.
- Make the actionlint download architecture-aware. Map `x86_64` to `amd64` with SHA-256 `8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8`, and `aarch64`/`arm64` to `arm64` with SHA-256 `325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6`.
- Decide separately whether the non-required `cleanup-cache` job should use the local runner. If changed, a closed pull request creates a new workflow run and therefore requires a separate explicit local start. Leaving only this maintenance job on `ubuntu-latest` does not affect the required quality check.
- Do not add a runner binary, VM image, persistent token, repository secret, status-forging script, or deployment integration.

The existing actionlint step can use this bounded architecture selection:

```bash
version=1.7.12
case "$(uname -m)" in
    x86_64)
        actionlint_arch=amd64
        actionlint_sha256=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8
        ;;
    aarch64 | arm64)
        actionlint_arch=arm64
        actionlint_sha256=325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6
        ;;
    *)
        echo "Unsupported actionlint architecture: $(uname -m)" >&2
        exit 1
        ;;
esac
archive="actionlint_${version}_linux_${actionlint_arch}.tar.gz"
curl --fail --silent --show-error --location --output "$archive" \
    "https://github.com/rhysd/actionlint/releases/download/v${version}/${archive}"
echo "${actionlint_sha256}  ${archive}" | sha256sum --check
tar -xzf "$archive" actionlint
./actionlint
```

The GitHub credential connected to Symphony must be allowed to create and remove repository self-hosted runners in addition to reading and rerunning Actions workflows. Branch protection requires no exception and should not be weakened.

## Implementation and acceptance

| Responsibility                                                                          | Current owner                                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Oldest eligible attempt, single-slot admission and handled-attempt suppression          | `apps/orchestrator/src/local-ci-takeover/LocalCiTakeoverService.ts`          |
| Explicit operational scope for automatic starts                                         | `apps/orchestrator/src/main.ts`                                              |
| Shared start, persistence, storage and abort lifecycle                                  | `apps/orchestrator/src/features/ci/createManagedLocalCiRequests.ts`          |
| Provider-neutral optional `selected` or `operational` execution scope                   | `libs/application/features/ci/src/lib/ports/IContinuousIntegrationPort.ts`   |
| Candidate filtering, matching repository/account ownership, scope and job authorization | `libs/providers/github/src/lib/github-cloud-provider/GitHubCloudProvider.ts` |

The adjacent provider, request and takeover specifications must prove that an
approved non-selected workspace can be taken over automatically while a manual
start outside the selected scope is refused. Disabled workspaces, missing
local-CI approval, disabled bindings and mismatched repository or account ownership
must remain refused before registration. A historical failed setup for the same
run and attempt must remain suppressed by the automatic loop. Existing runner
labels, terminal cleanup and explicit retry semantics remain unchanged.

The optional internal scope parameter defaults to `selected`, so existing manual
callers retain their contract. This change requires no configuration or database
migration and must preserve recorded local executions. Rolling it back restores
the former view-dependent takeover limitation; it does not undo a provider run or
delete its audit evidence.

## Current constraints

- Managed local CI currently supports macOS with native Apple Virtualization on `arm64` and `x64`.
- The first run downloads Lima and an approximately 600 MB pinned Ubuntu image. Package and browser downloads happen again in each disposable VM unless the workflow's remote caches satisfy them.
- A host-level Lima cache left by an older Symphony version is outside the new lifecycle and is not deleted automatically because it may be shared with unrelated Lima installations.
- One VM contains one workflow-scoped runner that executes dependent and matrix jobs sequentially for the lifetime of one workflow run. Multi-runner matrix parallelism is intentionally unsupported because it would multiply the configured resource ceiling.
- This path executes repository-controlled workflow code only inside the disposable VM. It is separate from host-backed local repository verification.
