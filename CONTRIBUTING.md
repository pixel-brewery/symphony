# Contributing to Symphony

Symphony is maintained under Pixel Brewery. Issues, pull requests, release downloads and
security reports use [pixel-brewery/symphony](https://github.com/pixel-brewery/symphony).
Contributions are accepted under the [MIT License](LICENSE) and the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Building from source

Requirements:

- Node.js 24.15 or newer and Corepack; the root manifest pins the Yarn version.
- Python 3 for repository agent configuration.
- Git and an authenticated GitHub CLI for GitHub integration.
- An installed agent CLI for execution features.
- GitHub Packages read access for the pinned `@pixel-brewery` dependencies.

Mosaik, Markdowner and Synapse are installed from GitHub Packages. A sibling source
checkout is not required. Public GitHub npm packages still require registry
authentication. Supply an existing token with `read:packages` through `GITHUB_TOKEN`;
never commit a token or put one in a pull request, log or screenshot. The registry and
environment reference are configured in [.yarnrc.yml](.yarnrc.yml).

```bash
corepack enable
export GITHUB_TOKEN="$(gh auth token --hostname github.com)"
yarn install --immutable
yarn dev
```

The active GitHub CLI credential must already have the required package-read access.
Installation does not authenticate an AI provider. The release workflow uses its
native short-lived token for registry, Release APIs, Pages and dispatch; only its final
atomic main/tag push uses the separately configured release App.

`yarn dev` serves the renderer on `127.0.0.1:4200` and starts Electron. `yarn start`
packages and launches the application. Runtime state under `~/.symphony/` belongs to
the user; use isolated test fixtures when verifying changes.

## Making a change

Read [AGENTS.md](AGENTS.md) and the local `symphony-architect` skill first.

- Keep Renderer → typed Preload API → Electron Main → Orchestrator Utility Process.
  The renderer remains sandboxed; orchestration, Git and persistence belong behind
  validated desktop contracts.
- Follow the actual Nx project boundaries and explicit workspace dependencies.
  See [dependency model](docs/architecture/dependency-model.md).
- Keep one named public declaration per source file, imports in the required region,
  and source-adjacent specs. Backend tests belong beside their production owner.
- Use Mosaik components and the documented reference patterns for renderer changes.
  Preserve the View/ViewPresenter boundary and the three-file View convention.
- Generated agent and design outputs are maintained through their owning generators.
  Never edit generated projections directly.

IPC changes must update the feature schemas, composed contracts, actual dispatch and
caller together. Inspect the current owner rather than copying a historical aggregate
file path. Documentation must describe the implemented behavior.

## Verification

```bash
yarn verify
yarn e2e
yarn forge:package
```

`verify` covers agent/configuration drift, source instructions, UI and design rules,
formatting, lint, types, unit tests and builds. `e2e` exercises the real Electron
processes with isolated simulated state. `forge:package` verifies the packaged app.
Use `yarn nx show project <project> --json` to discover the actual focused target.
Coordinate heavy checks with other work in the checkout.

Before a pull request, run the repository's local Ship-it review when available and
resolve blocking findings. Do not claim a review or test that did not run.

## Pull requests and dependency updates

Branch from `main`, use conventional commit subjects and keep changes focused. Follow
the pull request template and update the owning documentation when a contract or
workflow changes. The complete `Repository Quality` run must pass: repository checks,
Electron E2E and the package smoke test.

Pull-request creation is restricted to collaborators. The intended main-only rule
requires human changes to use a PR with successful `Agents, Format, Lint, Typecheck,
Test and Build`, `Electron E2E`, and `Package smoke test` checks. Required approving
reviews are zero because `RueDeRennes` is the sole maintainer. PR/check protection and
the dedicated release App still require separate owner setup; private organization
repositories on GitHub Free cannot enforce these rules before public activation.
Force-push and deletion prevention belong in a separate main-only rule without
bypasses. No general administrator, human or all-Actions exception is intended.

Dependabot checks npm packages and GitHub Actions weekly. TypeScript and the coordinated
`@pixel-brewery` dependency family remain deliberate maintainer updates. Existing
major-version exclusions for Angular, Nx and Electron remain in place. Other eligible
updates may merge only after all three checks succeed for the current revision and
current main. An updated bot branch must pass the checks again.

The dependency workflows execute their privileged helpers from the trusted default
branch. They do not install dependencies from a pull request with write credentials.
After main changes, the refresh workflow requests a deduplicated Dependabot rebase.
Bot merges explicitly request the release and refresh workflows because a push made
with `GITHUB_TOKEN` does not start ordinary push workflows. No open bot pull request
is itself evidence that this path has completed a live merge.

## How a change ships

After the Pixel Brewery transfer and public activation, a main change requests a
patch release. Explicit `patch`, `minor` and `major` dispatches use the same workflow:

```bash
yarn release:patch
yarn release:minor
yarn release:major
yarn release:dry-run
```

Nx owns the version and changelog. The complete verification and native ARM64 build
matrix must succeed before the source commit, tag, installers and update metadata are
published. Supported installers remain the macOS DMG, Windows EXE and Linux DEB.
Installer manifests make updates discoverable in the app; installation remains manual.
Native ZIP/NuGet updater payloads and x64 builds remain disabled.

The owner must configure the private release App, its two-repository installation,
repository variable `RELEASE_APP_ID`, and its specific main PR/check-rule exception
before publication can use the protected branch. `RELEASE_APP_PRIVATE_KEY` belongs
only in the `release-main` environment, restricted to branch `main`, without required
reviewers or a wait timer. Both repositories have that environment and branch policy,
but no App credentials. Live gate enforcement on private Symphony remains to be
verified. No repository/organization-secret fallback is allowed.
The App token is requested after all checks and used only for the final atomic
main/tag push. Real releases use CI/dispatch; direct human main pushes are incompatible
with the intended policy. Local dry runs remain previews. Do not copy the App key
into a local runner.
See the [release authority prerequisites](docs/architecture/application-updates/README.md#main-protection-and-release-app-prerequisites).

The root `package.json` retains `private: true` because the application is not published
as an npm package. This flag does not determine GitHub repository visibility.
The [release and handover guide](docs/architecture/application-updates/packaging.md) records
live prerequisites and the [desktop update model](docs/architecture/application-updates/README.md)
records channel, feed and recovery behavior.

## Security and reference repositories

Report vulnerabilities through [SECURITY.md](SECURITY.md), never in a public issue.

The FLAMOX365 and Mosaik source checkouts are reference material for maintainers, not
installation dependencies. Contributors without access should describe the intended
behavior in their pull request; a maintainer can perform the required reference review.
Copyright, upstream provenance and third-party license notices remain part of the source.
