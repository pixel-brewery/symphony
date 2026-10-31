# Deployment and packaging

**Dokumentstatus:** Implementierter Ist-Stand

This page describes the implemented packaging, configured public release infrastructure and evidence required for each desktop publication. The complete update and publication contract is owned by [Desktop updates](README.md).

Nx builds Angular into `dist/apps/renderer/browser`, Electron Main and sandbox-compatible CommonJS preload into `dist/apps/desktop`, and the ESM Utility Process into `dist/apps/orchestrator`. Main resolves both renderer and child relative to its packaged module. Forge packages the repository with ASAR enabled and active platform makers for DMG, Debian, and Squirrel; the ZIP maker remains commented out for a later support expansion. The release pipeline selects ARM64 on every platform and publishes only the DMG, EXE, and DEB installer outputs. Forge accepts CI-provided macOS signing/notarization and Windows signing configuration without storing credential values in the repository.

## Cross-platform consumer build contract

`yarn design:md` and `yarn design:md-check` use the installed public
`mosaik-design-md` CLI from `@pixel-brewery/mosaik-themes` version `0.1.183`.
Its configuration serializes repository-relative source paths into the generated
Markdown headers. The upstream CLI uses native path separators there, making a
Windows check report the committed `DESIGN.md` as stale even when the theme and
component values are unchanged. This CLI version exposes no public path-header
normalizer option.

The native Yarn patch
[@pixel-brewery/mosaik-themes 0.1.183](../../../.yarn/patches/@pixel-brewery-mosaik-themes-npm-0.1.183-c669e27788.patch)
changes only `config.where` in `bin/design-md.mjs`: its relative display path
replaces backslashes with `/` before rendering Markdown. It does not change
filesystem resolution, theme evaluation, component APIs or runtime styling.
The existing generator and stale-output check remain authoritative; committed
`DESIGN.md` and `COMPONENTS.md` must remain byte-for-byte unchanged by this
portability correction.

The committed patch, central [Yarn resolution](../../../package.json) and
[lockfile](../../../yarn.lock) are one dependency contract.
`yarn install --immutable` selects and applies the patch from that contract;
manual edits to `node_modules` and a parallel generator wrapper are not part of
the build. All direct Mosaik family versions remain pinned to `0.1.183`, with
no upstream release or runtime/component patch introduced by this correction.
The [design CLI policy regression](../../../tools/design-md-portability.policy.spec.ts)
invokes the actual installed CLI with native and Windows-style path serialization
and compares its outputs and unchanged document bytes. A simulated separator
check is not evidence of a completed Windows CI run or a desktop release.

Remove this consumer patch only during a coordinated Mosaik upgrade after the
upstream CLI supplies the same platform-independent header behavior. Update the
resolution and lockfile together, and require the actual design checks on both
Windows and a POSIX platform to pass with unchanged reviewed design documents
before accepting removal. A matching package version alone does not establish
that the upstream fix exists.

## Native application assets

The canonical Symphony mark and every generated application-icon format live under the top-level `resources/icons` directory. `yarn icons:generate` derives browser PNGs, menu-bar templates, and the native ICNS and ICO containers from that mark. Renderer and mobile builds copy their icons from the same directory, Electron Main uses its packaged resource copy for the window and macOS Dock icon, and Forge uses the native files for macOS, Windows, Debian, and installer metadata. Windows publication places the ICO beside each version manifest on the update origin so Squirrel can resolve the Control Panel icon without depending on the source repository.

Every macOS launch explicitly sets the Dock image from the active application's resources, including packaged builds. This prevents a same-name local rebuild from relying on an older icon retained by the operating system. Replacing a bundle on disk does not update the image already held by a running process; the new process applies the current image at startup. This image refresh keeps the established bundle identity and does not clear global operating-system caches.

The menu-bar templates use a 24-point canvas with 48-pixel Retina representations. The posthorn uses its full geometry without an additional inset; running and failed badges occupy the free space above its right arm. All three states preserve the same posthorn size and alignment, and badges do not obscure the mark. Native visual acceptance checks the rendered menu-bar size and the packaged Dock image as well as the generated files.

`yarn start` builds and launches the platform's packaged Symphony application so operating-system surfaces use the branded bundle name and icon. `yarn start:unpackaged` and `yarn dev` retain Electron's raw development bundle for diagnostics and live development; macOS identifies that upstream bundle as Electron in the Dock.

`yarn package:smoke` performs a production build, runs `electron-forge package`, then verifies the unpacked application contains the expected executable bundle and renderer assets. The desktop release workflow prepares one semantic Nx Release version for every successful `main` source commit. Verification, all native builds, and publication use the same metadata-only commit, transferred through an internal Git bundle. The workflow applies macOS Developer ID signing/notarization and Windows signing only when each capability's complete credential group is available, and uses a complete ad-hoc macOS bundle signature when Apple credentials are absent. Developer ID builds retain Hardened Runtime; the ad-hoc branch disables it because no stable Team ID exists for library validation of the embedded Electron Framework. The workflow verifies the ARM64 macOS bundle signature, rejects an incompatible ad-hoc runtime flag, verifies its DMG, and whitelists exactly one ARM64 installer per platform before upload. After the final source-revision check, it atomically pushes the version commit, changelog, and tag, then publishes and verifies the GitHub Release and channel manifests. The Debian package remains unsigned and requires no signing credential. Native automatic-update feeds remain unchanged while their commented ZIP and NuGet payloads are disabled; installer-only releases are detected in-app and replaced manually. The complete publication layout, optional GitHub Actions configuration, runtime lifecycle, and recovery policy are defined in [Desktop updates](README.md).

## Repository identity and migration boundary

The workflow and helper contracts bind to immutable repository ID `1440122208`. Renaming that repository and subsequently transferring it to Pixel Brewery preserve its ID; the former repository and forks do not satisfy this guard. A history-free migration retains the approved application source snapshot, including the complete owner-selected design-branch changes, in one parentless initial `main` commit. Source content is integrated without importing the former Git ancestry. Before removing the original repository, verify that every pull request and secondary branch is either represented in the approved snapshot or deliberately deferred under the owner's decision. At cutover, verify the new repository's ID, private visibility, parentless initial `main`, absence of imported tags, Releases, pull requests and pull refs, and inability to resolve former commits within it. Existing clones, independent copies, and platform retention are outside this repository-history boundary; this is not a claim of global erasure.

Uncommitted local modularization work remains preserved locally, outside the published initial snapshot. Keep its working files and recovery basis intact; port that work deliberately onto the new `main` after the cutover and verify it against that baseline. A history reset must not silently discard it or treat it as already integrated. Old Dependabot patches are not copied or merged blindly: Dependabot generates fresh updates against the new baseline, and each proposed update must pass the current checks. The explicit TypeScript exclusion and deliberate maintenance of the Pixel Brewery dependency family remain in effect.

The repository does not inherit the former repository's Git tags, GitHub Releases, pull-request history, workflow runs, Pages configuration, or credential/settings evidence. Do not copy old refs or release assets back into it. The initial source snapshot retained package version `0.1.16` and a concise changelog baseline without old commit, pull-request, or compare links. Without stable tags, the first-release path uses that committed version and prepares its first patch as `0.1.17`, with tag `v0.1.17`. The fresh history requires neither a version reset nor recreation of `v0.1.16`. This preserved history boundary is separate from the evidence for each later publication.

## Public release configuration and acceptance

The repository is public as `pixel-brewery/symphony`, with immutable ID `1440122208` and default branch `main`. Publication validates that exact identity, name and visibility; later changes that violate the contract stop the release. GitHub API and Git writes resolve the current repository name from Actions, while the compiled default update origin is `https://pixel-brewery.github.io/symphony`. The bundle identifier `com.ruederennes.symphony` remains the established application identity for upgrades.

Pages is configured and has built from `gh-pages` at `/` using the legacy branch-based build mode, with its HTTPS URL matching the compiled origin. That branch began as an independent parentless root with only `.nojekyll` and a neutral `index.html`, without former release metadata. A successful hosting build is not a verified installer feed or desktop release. The [update-site bootstrap contract](README.md#cicd-configuration) defines the preserved origin boundary and subsequent manifest publication.

The main-only contribution contract requires human PRs and five successful job contexts: the complete Ubuntu/macOS/Windows source-quality matrix, then the macOS Electron E2E and package-smoke jobs. The native jobs both depend on the entire source matrix, whose `fail-fast: false` setting retains every platform's result. Configure the live PR/check rule with the [five exact context names](README.md#main-protection-and-release-app-prerequisites) and verify it independently; workflow YAML alone does not update a ruleset. Required approving reviews remain zero for sole maintainer `RueDeRennes`, and PR creation remains limited to collaborators. The PR/check exception remains exclusive to release App `5547670`; the separate deletion/non-fast-forward rule retains no bypass. Do not add general administrator, human or all-Actions bypasses, or apply these main rules to `gh-pages`.

Private release App `5547670` is installed for exactly `pixel-brewery/synapse` and `pixel-brewery/symphony`; its installation token's repository selection and Contents write plus implicit Metadata read permissions have been checked. Repository variable `RELEASE_APP_ID` and environment secret `RELEASE_APP_PRIVATE_KEY` are configured in both repositories. The key exists only in `release-main`, whose custom deployment policy allows exactly type `branch`, name `main`, with no required reviewers or wait timer. There is no same-named repository/organization secret. Preserve and verify that scope when rotating keys because YAML cannot identify the resolved secret's origin. The publication job creates a short-lived token for this repository only after all release checks; only the atomic `main`/tag push receives it. Registry access, GitHub Release APIs, Pages and workflow dispatch retain the native `GITHUB_TOKEN`. The [release authority contract](README.md#main-protection-and-release-app-prerequisites) defines the full ordering and credentials boundary. Keep the private key out of local release runners.

Keep token permissions and optional platform-signing configuration consistent with the release contract, and retain personal code owner `@RueDeRennes`. All currently pinned Pixel Brewery dependencies are public registry packages; each platform job must still authenticate and verify its own downloads. Synapse's successful package release has exercised the shared App's protected-main push and registry verification. Each Symphony candidate independently requires a complete successful desktop release, verified public manifests and installer assets. Native installation and state retention need their own acceptance evidence; neither shared App setup nor a built Pages site proves them. Dependency merges and continuous publication remain unattended without a per-release approval.

Install the first Pixel Brewery build manually on machines that still use the previous owner's compiled feed origin. That one-time replacement points later background checks at the public Pixel Brewery feed; a repository transfer alone cannot update an already installed application's origin.
