# Production orbit and employees

Symphony's initial route is Overview (`/main/home`). Overview and Orbit have
separate sidebar entries: Overview leads the sidebar, Orbit closes its `Delivery`
group after Inbox, Board, Pull requests and Actions
([window chrome and navigation](window-and-navigation/README.md)). The product
behaviour of the Orbit screen is described in [Orbit](../project/orbit/README.md).
Settings is a route of the main window whose navigation replaces the sidebar destinations
while it is open; project setup has no sidebar entry, and `/main/setup` opens the
`Build your project team` sheet in Settings
([Settings in the main window](window-and-navigation/settings.md#einrichtung-als-sheet)). Dedicated Stages and
Employees views are retired: `/main/stages` redirects to Board and `/main/team`
redirects to `/main/settings`. Orbit has
no duplicate route toolbar, setup control or lower ticket catalogue. The former
Runs rail is replaced by the sidebar run panel, which belongs to the sidebar on
every main route. Existing bookmarks, task/process links and Actions drawers remain valid. These surfaces reuse the
existing orchestration, queue, workflow and CLI execution services.

## Theme and employee identity

Desktop, menu bar, Mobile and component previews use the original project's
current Mosaik Soho theme. Application theme overrides are empty; the theme owns
palettes, surfaces, geometry and typography. `DESIGN.md`, `COMPONENTS.md` and
`.design-sync` project this same effective theme. Integrating the employee figures
preserves this theme and the original project's Mosaik package versions.

Symphony's shared Angular `AgentFigureComponent` owns complete transparent PNG
figures, v2 sprite playback and pointer attention gestures. Desktop and Mobile use
the same component, including offscreen/hidden-document pause, finite greetings
and completion, and live reduced-motion handling. This is
an explicit product-owned component; Mosaik Avatar and Persona keep their
published APIs and portrait behavior. No Avatar/Persona package patch is required.
A separate Symphony-local Foundation patch bounds Comment's inner content to its
available width; wide code and tables scroll inside the established Markdown
renderer. That layout fix does not change Mosaik's source checkout or figure APIs.

`resources/figures` contains the four original OpenDots plush PNGs, unchanged on
their transparent 512 × 512 canvases, plus the upstream MIT notice. Source revision
and hashes are recorded in its README. There is no OpenDots runtime dependency.
Two Symphony-authored plush identities extend that family: sunny gold Spark with
teal forehead goggles, and rose cloud Loop with two cream antennae. Both use the
same validated animation contract and local asset path as the original four.
The workspace's existing Add/Edit AI agent drawer owns appearance in its identity
step, alongside name and job title. A Mosaik Choice Group offers six Choices, each with
its figure preview and name. The checked Choice identifies the active figure; there
is no separate selected-figure preview. Profiles persist appearance independently
of the CLI account. The original four-colour default hash remains frozen so
catalogue additions cannot change existing employees; Spark and Loop are explicit
persisted appearance choices.
Legacy shape/accessory fields remain readable; coral resolves to orange and violet
to purple. Selecting a character saves `figure: dot` and no overlay accessories.
The editor only offers the six bundled figures; it has no own-image upload or file picker.
Legacy image references remain readable for existing profiles.
Catalogue choices share the agent draft: Save persists name, responsibilities,
execution route and appearance together; Cancel discards them. The Choice Group
reads the draft's selected colour, and a new agent's default uses the same stable
profile ID that will be saved. The workspace's
AI team list opens this same editor; there is no separate employee view or appearance
persistence command.

FLAMOX365's `libs/frontend/pet` renderer is now ported into Symphony's existing
employee component: frame timing, CSS atlas registration, sixteen clockwise look
directions, decoded-image checks, finite gestures and cleanup. The exact reference
revision is `2fc29a56e37449b4fbbfb1d7027249af652eb28f`. Symphony adapts the fixed overlay
to inline employees in the existing product surfaces and Mobile; smooth
plush rendering replaces pixelated sampling. A shared decoded-image cache and one
frame-throttled pointer listener serve all employees. There is no FLAMOX runtime
dependency, floating global assistant or Mosaik change.

The original PNGs remain unchanged as catalogue thumbnails, startup/error fallbacks
and canonical artwork references. Symphony-generated `<character>-v2.png` atlases
provide nine distinct states plus sixteen looks in the Codex/FLAMOX 1536 × 2288
layout. Custom single PNGs keep the static-image path. The surrounding UI remains
Soho; employee artwork retains the OpenDots plush material and construction.

Actual working analysis/diagnosis/review roles use inspection poses; implementation
uses active processing poses. Queues and input requests use patient/asking poses.
Pause, block, failure and stale data freeze. Greetings and success finish after
three cycles; success then stays calm for the same result. Pointer gaze applies
only to idle employees. Greeting, gaze and selecting a character never create an
execution or change its status. Employee selection and answer/review commands
reuse the existing work surfaces; Mobile tapping opens the leading actual ticket
or greets an idle employee. Free conversation remains a later capability.

No upstream artwork generator or prompts were published at the pinned revision.
The repository-local `create-employee-figure` skill adapts the installed Codex
`create-pet` production pipeline to local Symphony assets. Its adapter discovers
and executes the bundled generation, extraction, atlas and quality tools unchanged;
the proprietary toolkit is neither copied nor modified. New visual jobs use
built-in imagegen, approved identity references and one strip per state. Shared
row registration preserves body size and jump height. Exact prompts, source and
final hashes, frame/direction reports and state/transition/look GIFs plus MP4 remain
in the creation run. Only accepted atlases and the MIT artwork notice are shipped.
There is no ChatGPT Pet upload, selection, activation or runtime dependency.

`projectAgentActivity` derives activity from actual execution bindings, the
queue, goal decisions and snapshot freshness. A next-phase assignment never
replaces a running CLI process. Parallel jobs remain separate work entries.
Historical terminal results are reduced to the most recent result per employee
when no live assignment remains. Unpaused cancellations do not create paused
employees. Execution history remains available in the existing run surfaces.
Paused, blocked, failed and awaiting-input entries retain their cause and the
existing process/revision action. Stale data disables working motion. Completed
motion runs once; offscreen figures stop animation, and reduced motion disables
it. Mobile receives a bounded validated projection without CLI accounts or
credentials and uses these same images and states, including the active role.

## Setup and configuration version 6

Discovery reads existing accounts, repository bindings and declared workflows.
Repository, work source, one CLI account and optional delivery destinations form
a draft. Nothing is saved until Apply. Missing prerequisites link to the owning
account, source or repository action; advanced settings remain accessible.

One account creates a generalist employee and a reviewable team proposal. Existing
teams retain their IDs and appearances. Unset role-package assignments resolve
the shipped built-in role instructions through the existing immutable execution
snapshot; an explicitly assigned portable package takes precedence. This works
through the existing Codex, Claude Code and OpenCode adapters and does not create
a new model catalog or an OpenDots runtime.

After Apply, repository preparation and the existing workflow eligibility rules
select a ticket for a read-only analysis. A ticket awaiting qualification links
to the Board's decision surface. A delivery target is not required for analysis.
Schema migration accepts configuration versions 2–5, produces version 6 and
preserves profile/workflow IDs, custom workflows and execution records. Missing
delivery targets become an empty list.

Existing projects configure targets under **Settings → Workspaces → workspace →
Delivery destinations**. The project selector scopes the list and every editor to
one repository. Add/Edit open the destination sheet of Settings and
save the destination name, evidence kind and Production assignment together. While the
draft represents Production, an orbit preview at the top of the sheet shows the chosen body
at the centre and the project's other destinations on two rings; the body picker is a compact
three-column grid of the nine planet previews. An optional deployment
workflow is selected from the repository's manually dispatchable workflows and
requires its exact-version input. Destination and operation inputs remain optional.
Cancel discards the draft; removing a destination removes its configuration, not
the deployment or provider history.
Removing a repository or workspace also removes its owned destination configuration.

Orbit's window toolbar shows the title `Orbit`, a subtitle and the destination control.
The subtitle reports one destination (`toolbarDestination`): the destination selected in
the scene or the destination menu, otherwise the first Production destination in menu
order (Production destinations sorted by display name). Without either it is
`No production destination`; otherwise it is `<name> · <state>`, where `<name>` is that
destination's display name and `<state>` comes from its scene node
(`toolbarDestinationNode`, the node whose `targetId` is the destination: the centre node
for a single Production destination, the `target:<id>` node otherwise): the confirmed
version, `Not verified` (stale evidence) or `No confirmed version`. With several
Production destinations the subtitle therefore names the selected (or first) one's
confirmed version. The destination control is an outline dropdown labelled with the
single Production destination's display name, or `Production` when there are none or
several. Its menu lists every in-scope destination, Production destinations first and
then by display name, each with the sub-label `Production · ` (when applicable) followed
by `Environment`, `Release channel` or `Installation`; without destinations it shows the
disabled item `No delivery destinations are configured for this project.` When the
Delivery participant is part of the product, the menu adds `Refresh evidence` (disabled
while a refresh runs) and `Delivery destinations in Settings`, which opens
`/main/settings?workspace=…&section=delivery&repository=…` without a target and is
disabled without a selected workspace. With several repositories a `Project` selector
precedes the control. Choosing a destination selects its scene node and focuses the
camera on it.

A 340 px inspector pane beside the diagram always shows exactly one state, in this
order of precedence: a selected destination, the selected Production centre, a selected
stage cluster, the selected work item, otherwise the default cluster (`Needs attention`
when anything needs attention, else the first cluster); without work items it says that
no tickets exist or that none match the filters, with `Clear filters`. Selecting the
Production body or another destination exposes its project, configuration and evidence
state; its configuration button opens Settings › Delivery destinations
(`/main/settings?workspace=…&section=delivery&repository=…&target=…`, Settings in the
main window) with the matching editor; unconfigured Production opens a prefilled,
unsaved Production draft. With multiple Production destinations, the button opens the
scoped list so the operator chooses which target to edit. Selecting the single
Production destination (centre or menu) shows its destination state; the separate
Production state appears only when no or several Production destinations exist and lists
one button per Production destination plus `Configure production`. Destination,
Production and work-item states carry a close action; it and Escape clear the
destination, node and cluster selection, hide work-item details until the next explicit
selection and leave the shared Board selection intact, so the inspector returns to the
default cluster. The inspector never shrinks the WebGL viewport or resets the camera.
Configuring a target never confirms a delivery.

The work-item state shows title, identifier, Board column, `Work stage: <label>`
(`Unmapped` outside the workflow), `Review / answer / next stage`
(`/main/board?item=<id>&process=true`, the Board's process view), `Open ticket details`
(`/main/board?item=<id>`, which the Board turns into the work-item screen), one line
`<destination> · <version> · <kind>` per destination whose current evidence names the
item (otherwise `No delivery of this ticket is currently confirmed.`), the pull requests
of its executions as external links and the CI runs on their head or merge revisions (or
on a revision whose evidence names the item) as `/main/actions?run=<id>` links; a run
matches only through a pull request of the same repository binding, never through another
repository's pull request with the same number. As soon as the application is hydrated,
each new Orbit presenter clears destination, node and cluster selection, resets the
cluster page and refreshes the evidence; an explicit Board selection inside the project
therefore opens in the work-item state.

## Three-dimensional production orbit

The provider-neutral Board and workflow remain authoritative. The landscape
store holds shared text/stage/column/label filters and explicit selection. The
pure `projectOrbitScene` function produces world positions, bodies, rings and
relationships from the repository's actual tickets and delivery
evidence. The orbit camera is retained separately for each workspace/repository
scope.

Work items form stage clusters around the destination. The pure
`projectOrbitClusters` function applies the Board's own rules: the active board's
column layout (`resolveBoardColumnLayout`, including `No column`) and the Board's
attention judgement (`workItemIdsNeedingAttention`). An item that needs attention
belongs to the `Needs attention` cluster instead of its column, so every item is in
exactly one cluster and that cluster equals the Board's attention filter. Clusters are
the non-empty columns in board order followed by `Needs attention`; their tone is danger
for attention, success for a column mapped to a terminal stage and neutral otherwise.
`projectOrbitScene` gives each cluster one sector of a flat belt, clockwise from the top,
and lays its members out as evenly spaced arcs (large clusters pack tighter and add outer
rows) with a cluster label node outside the arc. Ticket bodies take the cluster tone.
Positions depend on cluster membership, so filtering re-lays the surviving tickets inside
their clusters. The inspector of a cluster shows its name, how many of its work items
are not in the confirmed Production version, `Evidence collected` (items named by any
destination's succeeded evidence, `—` while evidence is loading or failed) with a progress
bar, its work items newest first (six per page with `Previous` / `Next`; each row shows
title, identifier and column label and selects the item) and `Show on board`, which opens
`/main/board?column=<id>` or `/main/board?attention=true`. The summary is
`No production destination is configured for this project.` without Production, only the
item count while evidence is unknown, `All n work items are in the confirmed Production
version.` (or `This work item is …`) when nothing is missing, and otherwise `n work items
are …` or `k of n work items are not in a confirmed Production version.` Only a
`confirmed` centre contributes members; an unconfirmed or stale centre counts every item
as missing. Selecting a cluster resets its page to the first one. Items that no cluster
claims are drawn as one extra `Work items` sector, so the scene never drops a ticket.

Search, stage, column and label filters are the Work feature's shared filter state, not
Orbit's own: a filter set on the Board narrows Orbit and vice versa. `Show on board` for a
column sets that shared column filter through the Board's `column` parameter, so Orbit
shows only that cluster afterwards until `Clear filters`; the Board's attention drill-down
clears the shared column (unless `column` is given), query (unless `q` is given), stage and
label filters. Selecting a work item that the filters hide clears them first. The `q`
query parameter sets the shared search on entry and whenever it changes.

`OrbitCanvasComponent` owns a lazy Three.js WebGL renderer, perspective camera,
lit destination bodies, a shader sun, tilted orbital rings and an instanced
ticket belt. Its transparent canvas and public Mosaik labels inherit the page's
effective Soho scheme, including live system appearance changes. There is no
scoped dark theme. Public `ThemeObserver` events repaint GPU colours without
resetting selection or camera. Physical lighting uses the brighter scheme pole
so dark text in the light scheme cannot extinguish illumination.
Fit targets the central sun from a steep view above the belt, so the belt reads as the
near-circle the diagram draws, and calculates the required distance
from projected horizontal, vertical and depth bounds, viewport aspect and label
margins. Destination orbits are dashed neutral guides; the work-item belt is a solid
one. Every filtered ticket remains a pickable GPU instance. Bodies and cluster labels are
always labelled where there is room; only ticket labels share a zoom-dependent budget
instead of removing ticket geometry. The zoom level follows the camera distance: `system`
(48 units or more) labels no ticket except the selected or keyboard-focused one, `groups`
(below 48) at most 14 tickets and `tickets` (below 18) at most 18. A cluster label is a
Mosaik Badge (`Label · count`; soft danger with `errorCircle`, soft success, or outline
default) on a surface pill, placed on the side facing away from the centre; destinations
show a name card with `<version> · confirmed <MMM d>`, `No destination configured` or
`No confirmed version`. Native drag, wheel and pinch move the camera. Selection and focus
are distinct actions: selecting a cluster, the centre or another destination in the scene
keeps the camera; selecting a work item (in the scene, the cluster list, an evidence chip
or by search) and choosing a destination from the toolbar menu also focus it; a
double-click or Ctrl/⌘+Enter on any label focuses that object. The floating zoom card
offers `+` (zoom in by a factor of 1.2), the current scale as fitted distance divided by
current distance, rounded to whole per cent (`100 %`; clicking it returns to the fitted
distance along the current direction) and `Fit`. While the camera is fitted, scene changes
and viewport resizes re-fit it; any manual zoom, wheel, drag, focus or restored camera
ends that until the next `Fit`. A floating find
card, present only with the Work filter participant, holds the shared text search
(`Find a work item`, matching identifier, title and labels; Enter selects the exact
identifier match or the only result), the stage filter (`All stages` or one workflow
stage) and `Clear filters` while any shared filter is active. Each explicit focus command
has a revision, so selecting the same ticket again can refocus it after manual camera
movement.

Production uses the Sun by default. In Settings → Workspaces → Delivery destinations,
edit the Production destination and choose **Body at the centre of the orbit**:
the Mosaik Choice Group shows Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn,
Uranus and Neptune with a transparent preview on each Choice. The packaged PNGs
are rendered from the same Orbit world, surfaces and rings by
`yarn node tools/render-orbit-previews.mjs`; opening the editor starts no extra
WebGL scenes. Click a preview or use the keyboard to select a body. Save persists
the choice per destination; Cancel leaves it unchanged. Existing version-6
configurations without `celestialBody` retain the Sun, with no migration or changes
to target identities. With several Production destinations, the conceptual centre
remains the Sun and each separate Production body retains its own selection.

Planets use locally packaged 2K surface maps from Solar System Scope / INOVE
([CC BY 4.0](https://www.solarsystemscope.com/textures/)); Saturn has a textured
ring mesh. Attribution is included in `resources/orbit/ATTRIBUTION.md` and the
packaged `orbit/` assets, with a source link beside the choices. Only selected
3D maps load, and the renderer owns their bounded cache and disposal. Natural planet
colours are separate from the surrounding Soho light/dark UI. Sizes are comparable
for navigation, rather than astronomical scale. Appearance changes neither ticket
positions nor delivery evidence; an older evidence response cannot overwrite the
current configured appearance. Fit includes Saturn's rings.

Only configured delivery targets become
destination bodies: environments, release channels and installations retain
their distinct types. Missing configuration, unconfirmed delivery and stale
evidence are distinct states. A ticket has one work position and separate links
to all confirmed destinations; its stage never implies a deployment. Target
selection opens the existing evidence and explicit deployment commands.

Orbit's selectable objects are production, delivery targets, tickets and stage clusters.
There are no employee work nodes, team groups, handoff edges, employee explorer
category or employee detail/assignment controls. Workspace settings and Mobile retain
actual employee identities and work states.
Scene objects retain stable identities, and camera changes project accessible
Angular ticket and delivery labels over the WebGL scene.

The 2026-10-11 product request adds occasional, passive spacecraft flights using
the selected repository's enabled workspace profiles. `OrbitFlybyFleet` owns
finite 14–19 second paths: a shuttle enters from outside the screen, circles once
and exits. Random waves contain one to three distinct pilots, and every pilot
gets a turn before the pool repeats. The first wave starts after 2.2–4.8 seconds;
later waves pause for 9–25 seconds after the last shuttle leaves.
All pilots use Symphony's original procedural Three.js rocket, with a pointed nose,
four fins, an engine plume and the saved PNG identity inside a glazed porthole.
The rocket is about 2.8 scene units long; the pilot is about 0.51 units wide, comparable
to ticket meteors' 0.30–0.62 unit diameters. Both retain a fixed world scale: camera zoom,
perspective depth and viewport changes affect them exactly as other scene geometry.
The nose follows the flight trajectory while the cockpit faces the viewer. A passive
Mosaik name caption follows the projected model bounds instead of a fixed pixel offset.
The existing `agentFigureSource` and stable default appearance resolver select
the same identity shown in AI team settings. These flights never represent work
or change assignments, executions, tickets, deployment evidence or selection.
Their meshes are excluded from raycasting and camera fitting; captions do not
capture input or announce constantly to assistive technology.
Flights stop and release their meshes when hidden, offscreen, reduced motion is
enabled, a project changes, WebGL is lost or the route is destroyed. Idle gaps
use one cancellable timer; active flights render at about 30 frames per second.
Unchanged ticket labels are reused between flight frames, so a 1,000-ticket
world is not reprojected merely because a rocket moves. Pilot textures share
the renderer's bounded asset cache, and there is no added framework or runtime.

Evidence reads are invalidated on workspace/repository changes and destruction.
Configured settings targets remain visible when a query fails; last-known
evidence is marked stale. Late responses cannot replace the active project's
state. Scene rendering settles between interaction and finite flights, pauses out of view, respects
reduced motion and disposes its resources on destruction. Failure to create or
restore WebGL replaces the scene with `3D is unavailable` or `3D was interrupted`, the
line `Choose a destination or a cluster of work items here instead.`, one button per
non-ticket node (the centre, every destination and every cluster as `Label · count`) and
`Retry`, which recreates the canvas and renderer; the inspector's cluster list keeps every
work item reachable.

Visible failure texts of the screen: a failed evidence refresh sets the inspector hint
`Delivery evidence could not be refreshed. Check the GitHub account and retry.` and marks
the centre and destinations stale; per-destination provider errors appear as their own
hints; a failed operations read only warns `Delivery operations could not be refreshed.
Retry before starting another deployment.`; preview, start and reconcile failures show
`Unable to prepare delivery.`, `Delivery was not started.` and `Unable to reconcile
delivery.`; a plan whose scope, target or ref no longer matches at start is discarded with
`The delivery target or version changed. Prepare a new delivery.` and nothing is
dispatched.

The dedicated Stage and Employees scenes are removed. Board owns workflow work,
while workspace settings own the AI team and appearance. Successful setup analysis
opens its selected Board ticket's process drawer. Existing Stage/Team bookmarks
redirect to their owning routes. Shared search, source filters and ticket selection
remain available between Board and Orbit. The obsolete fixed-size Stage canvas,
free-position drag and disconnected ticket grid are retired. The Three.js runtime
remains confined to Orbit and is not added to the Mobile entry point.

## Delivery evidence and GitHub workflows

The first delivery adapter reads GitHub Deployments/statuses, releases and
configured channel pointers. Environment deployment, release publication and
installation are different evidence kinds. An installation requires a successful
deployment receipt with `payload.symphony.kind: installation`; publishing a
release alone is insufficient.

Ticket inclusion requires a recorded ticket-to-PR relationship and the PR's
actual head or merged revision. Exact SHA equality or GitHub's ancestor comparison
proves inclusion. Branch names, ticket text and timestamps do not prove delivery.
The latest successful evidence remains current after a failed attempt; explicit
inactive evidence retires it. Older versions delivered again are new receipts.
Reads are bounded and report unavailable provider evidence.

For release channels, `.symphony/release-channels.json` at the repository's default
revision explicitly maps channel names to published tags:

```json
{ "channels": { "canary": { "tag": "v1.2.0" } } }
```

The `stable` channel uses GitHub's latest published release. Moving a channel
back to an older published tag changes its current evidence; it is not inferred
from the newest release date.

Actions read the workflow definition at the run's recorded `path` and `head_sha`.
The neutral graph retains dependencies, parallel definition jobs, actual matrix
executions, conditions and environment names. Dynamic or ambiguous dependencies
and execution associations stay unresolved. Mosaik Flow lays out compact status nodes and dependency connections with native navigation controls and a minimap. Selecting a job reveals its conditions and environment outside the diagram; actual matrix executions remain expandable and link to the existing steps/logs.

## Explicit writes and recovery

A delivery target binds a workflow and its declared immutable version input.
Optional environment and operation inputs are validated against that definition.
For recoverable lost responses, the workflow's `run-name` must include the
configured operation input. The workflow must check out and deploy the supplied
immutable SHA rather than its mutable dispatch branch. Preview shows the exact
target, SHA and workflow. Start rechecks settings, declared inputs, SHA and the
definition hash immediately before dispatch.

GitHub dispatch refs are not atomic with the precheck. If a ref changes between
the check and POST, the journal retains the exact returned run and warns about
its different/unconfirmed revision. A dispatch acceptance never confirms delivery;
only resulting destination evidence does. Approval rechecks the actual run SHA,
pending environments, wait timers and current account permission before POST.

Durable delivery and provider-write journals persist intent before a mutation,
serialize competing writes and prevent a second active run. Duplicate clicks and
restart do not cause a resend. GitHub.com's versioned dispatch API returns the
exact workflow run ID; providers without that response need an explicit operation
marker for correlation. Delivery Reconcile performs only reads and uses that
marker. Without proof it remains uncertain and blocks another start. Manual dispatches support the declared string input `symphony_operation_id`
(or their bound delivery target's operation input) when `run-name` includes it.
Before another requested start, the journal reads the exact unique marker.
Approval comments include a unique operation marker, and a subsequent review
reads GitHub's review history for that marker and every requested environment.
A proven previous approval returns without another POST. Missing or ambiguous
proof remains blocked; no timestamp/branch heuristic or automatic retry clears
the journal. Workflows without a marker cannot recover a lost response by guessing.
The provider APIs follow [GitHub's workflow-run contract](https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2026-03-10).

All new operations cross the typed Zod-validated desktop contract. Provider/Git/
persistence work stays in the orchestrator Utility Process or provider libraries.
The Angular renderer uses no Node APIs. Existing target-worktree isolation and
analyzer read-only rules remain in force.

## Verification ownership

Adjacent domain/provider/service specs cover migration, actual activity, stable
projection, multi-environment evidence, release channel changes, installation
receipts, revision-specific workflow graphs, declared inputs, changed approval
conditions, duplicate prevention and restart recovery. The Electron journey
`orbit-redesign.spec.ts` owns the 1,000-ticket scene with 25 configured employees, actual WebGL
interaction, bounded labels, shared selection/filtering, 200 definition jobs,
matrix logs, saved appearance across restart/account replacement and first-analysis
setup journeys. Component and Mobile journeys cover transparent animated figures
and reduced motion. Adjacent projection
specs own deterministic geometry and multi-destination
relationships: `projectOrbitClusters.spec.ts` (board column order, skipped empty columns,
attention items last, empty input), `projectOrbitScene.spec.ts` (clusters as clockwise arcs
with outer labels, re-laying a filtered subset, distinct evidence states) and
`OrbitViewPresenter.spec.ts` (`Needs attention` as the default cluster, `Show on board`
targets, evidence and unconfirmed counts, returning from a selected cluster, opening
Delivery destinations in Settings, late-evidence invalidation and an omitted Delivery
participant). `OrbitCanvasComponent.spec.ts` covers camera restore per scope,
repeated focus, theme repaint and visibility, `projectOrbitLabels.spec.ts` the label
budgets and outer cluster labels, and `fitOrbitCamera.spec.ts` fitting; the WebGL fallback
with `Retry` is exercised by `orbit-redesign.spec.ts`. The shell journey also checks contextual search on Orbit and
the separate Overview destination. `orbit-appearance.spec.ts` checks that all six
employee identities remain available in workspace settings, retired routes redirect, the inspector opens on a stage cluster with `Show on board`, the canvas sits on the neutral-50 diagram surface, and live Soho
scheme changes preserve the scene and camera. A running analysis remains active
when switching from its Board process drawer to Orbit without employee figures.

Electron journeys use deterministic provider/CLI fixtures. They verify the
packaged process boundary and UI behavior, not a live external production deploy
or a real-account five-minute onboarding benchmark. The required handoff gates
are `yarn agents:check`, `yarn verify`, `yarn e2e` and `yarn forge:package`.
Intentional reference differences are recorded in
[the FLAMOX365 reference contract](frontend-reference-flamox.md).

The original-project integration passed those four gates on 2026-10-09. That full
Electron suite reported 38 passed and two existing skips: native activation in
hidden-window mode and the external interactive OpenCode login. The Orbit journey
also verified two native WebGL context losses/retries and a real running fixture
analysis with the same employee figure in Stages and Orbit before the later
decision to remove employees from Orbit.

That packaged `out/Symphony-darwin-arm64/Symphony.app` was launched separately
with isolated fixture configuration. Its WebGL2 scene retained all 1,000 tickets
and 25 employees, preserved filter/selection through Overview, and remained
contained at 125% and 200% native WebContents zoom in a 1,040 × 700 window.
The historical local acceptance recorded visually inspected native Retina
screenshots and a byte-for-byte match of 37 packaged renderer scripts with that
build. Its optional local filenames were
`output/playwright/orbit-packaged/report.json` and
`output/orbit-research/orbit-integration-check.json`. These ignored reports and
the ad hoc probe that produced them are not shipped in the repository; a clean
checkout neither contains them nor independently proves their recorded result.
No external production deployment or comparative frame-rate result is implied.

For a current repeatable acceptance run, install the locked dependencies, run
`yarn build`, then `yarn e2e` and `yarn forge:package`. The tracked
[Orbit redesign journey](../../apps/renderer-e2e/src/orbit-redesign.spec.ts) and
[appearance journey](../../apps/renderer-e2e/src/orbit-appearance.spec.ts) define
the actual deterministic scene, interactions and screenshot outputs; the
[Playwright configuration](../../apps/renderer-e2e/playwright.config.ts) owns the
isolated runtime fixtures. Review the newly generated captures and the current
packaged application using the stated viewport/zoom criteria, with test-owned
configuration. Keep optional reports local unless separately reviewed for
publication. The maintained commands do not regenerate those historical report
filenames or turn a past acceptance into evidence for a new revision.
