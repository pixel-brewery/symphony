# Managed local CI

Symphony can execute a queued GitHub Actions workflow on the operator's Mac without consuming GitHub-hosted runner minutes. GitHub remains the workflow scheduler and check reporter; Symphony supplies one repository-scoped self-hosted runner inside a disposable Linux VM.

## Ownership

Symphony owns the runtime. Local GitHub Actions are a Workspace decision: the operator enables them per Workspace under Settings → the Workspace → **Local GitHub Actions**, together with the guest image that Workspace reproduces and the setup script each of its repositories runs. These apply as soon as they change (a setup script when its editor loses focus); a failed save reports `Unable to save settings.` and shows the stored value again. The same switch enables explicit **Run locally** actions and authorizes a running Symphony instance to pick up queued GitHub jobs whose current attempt requests all managed-local labels. Symphony checks for the oldest eligible job at startup and every 30 seconds while its single local-run slot is free; ordinary GitHub-hosted jobs are never claimed. The machine those runs boot is host-owned and configured once under Settings → System → **Virtual machines**, where one bounded resource preset is chosen. On the first local run Symphony downloads the pinned Lima release for the host architecture, verifies its SHA-256 digest, and stores it under `<managed-workspace-root>/local-ci`. Every execution creates a fresh Apple Virtualization VM from a pinned Ubuntu 24.04 cloud image, installs the pinned workflow-scoped GitHub Actions runner, registers it for one repository and one workflow-run label, supervises it until every job in the workflow is terminal, removes its GitHub registration, and deletes the VM. The Ubuntu image, Lima version, runner version, resource policy, and checksums are release-owned Symphony configuration. They do not belong in a target repository.

The three fixed profiles are policy ceilings, not fictional machine capacities: **Compact** is capped at 4 CPUs, 8 GiB memory, a 12 GiB virtual disk, and a 4 GiB action cache; **Balanced** at 6 CPUs, 12 GiB memory, a 20 GiB disk, and an 8 GiB cache; **Performance** at 8 CPUs, 16 GiB memory, a 30 GiB disk, and a 12 GiB cache. **Custom** exposes independent Mosaik sliders for all four values. Selecting it for the first time copies the currently selected fixed profile, so an operator can increase only the resource that constrains a workflow while preserving the other three values.

Symphony detects the Mac's logical CPUs, installed memory, filesystem availability after the protected free-space reserve, and the configured Local GitHub Actions storage limit. It reserves two host CPUs and at least 25 percent or 4 GiB host memory. Fixed profiles are clamped to the remaining real capacity. Custom slider maxima use the same detected capacity, while the VM startup check rejects a saved Custom configuration if the host capacity later falls below it. Disk plus cache share the Local GitHub Actions storage budget and leave 2 GiB for images and tooling; changing either slider therefore changes the maximum of the other. A configuration with fewer than 2 VM CPUs, 8 GiB VM memory, 8 GiB VM disk, or 1 GiB cache is unavailable. Stored Custom configurations from the earlier 2-GiB floor are raised to 8 GiB during settings upgrade before another runner can start. Only one managed local workflow may run at a time, so the selected limits cannot multiply through parallel VMs.

Memory-constrained Custom configurations keep their selected RAM ceiling. When memory is below 12 GiB and the virtual disk exceeds 20 GiB, Symphony provisions only the overlapping headroom as Linux swap, capped at 4 GiB. This lets memory-heavy builds progress more slowly instead of being terminated by the kernel while preserving at least 20 GiB of virtual disk for the image and workspace. The private Actions cache service binds only to `127.0.0.1:65432`, leaving common application ports such as 3000 available to workflow services.

Every Lima-owned path is rooted below `<managed-workspace-root>/local-ci`: `lima` owns instances, `home` replaces the operator HOME, `cache/lima-downloads` is the XDG cache for tools that honor it, and `tmp` replaces the host temporary directory. On macOS, Go's user-cache resolution intentionally ignores XDG and derives Lima's image-download cache as `<managed-workspace-root>/local-ci/home/Library/Caches/lima`; changing HOME is therefore the decisive containment control. A short verified `/tmp/symphony-lima-<digest>` symlink exists only to keep Lima's Unix socket path below the macOS limit; it points back to the managed `lima` directory and owns no storage. Symphony never relies on `~/Library/Caches/lima` or another ambient Lima lifecycle.

Settings › System › **Storage** exposes the physical allocated size of Local GitHub Actions and a separate hard limit, defaulting to 32 GiB; the **Virtual machines** card in the same section owns only the runner resources and machine list ([System settings](system/README.md)). The orchestrator checks that limit and the configured minimum free Mac reserve before startup and every second while a runner is active. Reaching either boundary aborts the runner and destroys its VM. Physical block allocation is used rather than a sparse disk image's advertised virtual capacity.

Storage admission protects delivery before backlog analysis. Starting analysis or implementation must leave the selected VM disk, Actions cache, two-GiB runner overhead, and an eight-GiB implementation-worktree reserve available under the filesystem, application, workspace, and Local GitHub Actions limits. A local run reserves its remaining selected VM and cache growth instead of the former fixed 512-MiB write allowance. The live filesystem-availability check and complete bounded workload reservation remain synchronous; they do not wait for a recursive allocation inventory. Large managed trees are categorized cooperatively in the background, and the last completed physical-block inventory is atomically cached for immediate reuse after restart. On a first launch, configured quota capacity and the live free-space reserve gate admission while that detail pass finishes. The five-second storage watchdog first releases inactive failed or cancelled analysis worktrees, whose durable summaries remain persisted; it never selects implementation or revision worktrees that may contain recoverable source changes. If the reserve still shrinks while analysis is active, only those analysis executions are cancelled. The existing critical-pressure stop remains the final boundary for every writer, including an active build.

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
2. The GitHub adapter resolves the run to its configured repository and exact numeric GitHub run ID and obtains a short-lived repository runner-registration token.
3. Symphony provisions a mount-free Linux VM and transfers the registration token through process standard input. The token is never an argument, renderer value, persisted record, host mount, or log value.
4. The runner registers with `symphony-local-ci` and `symphony-run-<run-id>`. A workflow from another run cannot match that runner.
5. GitHub schedules all matching jobs. A single runner executes matrix jobs sequentially; this costs no hosted-runner minutes but is slower than four hosted runners.
6. At the terminal workflow state, cancellation, application quit, or application update, Symphony stops the runner and deletes the VM. On the next application start it also removes abandoned Symphony-owned instances left by a host crash. The Settings action **Clear runner data** first removes inactive instances, then clears the cached base image and verified runner tooling. It persists only bounded audit evidence: repository binding, workflow-run reference, revision, result, timestamps, labels, architecture, and pinned runtime version.

   A transient connection failure or HTTP 5xx response while reading the active workflow status does not immediately stop its runner. Symphony retries that read up to five times consecutively, with exponential backoff and jitter capped at 30 seconds; a successful status read resets the budget. Runner exit and operator cancellation remain effective during backoff. Authentication, permission, missing-resource, rate-limit, and other non-transient errors are not retried. Exhausting the budget preserves the failure and diagnostics, then performs the existing runner cleanup. This recovery retries only status observation, never workflow dispatch or deployment commands.

7. The shared run projection behind the sidebar run panel groups the provider run and its active or latest local execution into one Action entry; the panel's `Actions` segment lists only entries in progress and the latest failed one. Its **GitHub** state remains the authoritative scheduler/check state, while **Local runner** reports Symphony's VM lifecycle and persisted result; a local setup failure therefore remains visible even while a delayed GitHub snapshot still says queued. Provider-only and orphaned historical local records remain projection entries with their one available source. Opening an Action shows only the latest workflow attempt's live job and step states. The complete redacted `gh run view --log` result crosses IPC as ordered chunks of at most 60,000 characters and is reconstructed only in renderer memory; each GitHub job/step prefix places its protocol directly below the matching step in the nested timeline. Unstructured workflow output and local-runner diagnostics remain timeline entries, so the drawer has no competing Live output or Failure output boxes. If the workflow-jobs REST endpoint is unavailable, Symphony falls back to `gh run view`; job logs use the run-and-job-aware CLI path rather than the expiring REST log redirect. When GitHub temporarily reports more than one step as active, Symphony treats only the latest observed step as current and closes older stale step states. The exact bounded failure output and diagnostics are still persisted with each local execution as terminal audit evidence and are read back into its drawer, so reopening a historical execution cannot silently substitute evidence from a newer attempt of the reused GitHub run ID. An already-open drawer resolves the authoritative terminal execution nearest to its optimistic renderer start, within the bounded IPC startup interval, so the local status changes from **In progress** to its terminal state even when renderer and orchestrator timestamps differ slightly. Before the VM exists, diagnostics report the current preparation phase, an identified concurrency blocker, or the actionable setup failure; after VM startup they report CPU, memory, disk, swap, relevant listeners, and recent kernel OOM evidence. Active details refresh automatically while the Action is running.

The VM has outbound network access because checkout, package installation, GitHub Actions, Playwright browser installation, and job services require it. It has no host filesystem mounts and receives no Symphony AI/provider credentials. Workflow secrets and the per-job GitHub token retain GitHub's normal event and repository policy.

## Required FLAMOX365 repository patch

In the read-only FLAMOX365 reference, `.github/workflows/ci.yml` is the only product-repository file that must change for this integration:

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

## Current constraints

- Managed local CI currently supports macOS with native Apple Virtualization on `arm64` and `x64`.
- The first run downloads Lima and an approximately 600 MB pinned Ubuntu image. Package and browser downloads happen again in each disposable VM unless the workflow's remote caches satisfy them.
- A host-level Lima cache left by an older Symphony version is outside the new lifecycle and is not deleted automatically because it may be shared with unrelated Lima installations.
- One VM contains one workflow-scoped runner that executes dependent and matrix jobs sequentially for the lifetime of one workflow run. Multi-runner matrix parallelism is intentionally unsupported because it would multiply the configured resource ceiling.
- This path executes repository-controlled workflow code only inside the disposable VM. It is separate from host-backed local repository verification.
