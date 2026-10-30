# FLAMOX365 frontend reference

## 2026-10-30 modular feature composition and feature-owned state

**Adopt — explicit contributions and public owners.** The inspected FLAMOX365
`libs/frontend/core/src/features/{FeatureTypes,createFeature,composeProviders,validateFeatures}.ts`
and `libs/frontend/core/src/navigation/provider/{provideNavigation,withNavigationItems}.ts`
define the typed contribution, provider composition and conflict contracts.
Symphony adopts these semantics in Frontend Core and reuses its existing
navigation registry and multi token. Duplicate IDs, conflicting exclusive kinds
and incompatible contributions fail before provider creation; ordered multi
contributions remain additive. Mobile's existing direct navigation registration
uses that same registry.

**Adapt — helper naming on case-insensitive filesystems.** Symphony splits public
symbols into matching files. The branded `FeatureKind` type and the
`createFeatureKind` factory have distinct filenames on macOS. Angular
`EnvironmentProviders`, including native Mosaik slots and application
initializers, remain siblings of the kernel's ordinary `Provider[]` output.
There is no dynamic product-plugin loader or second slot engine.

**Adopt — complete horizontal feature ownership.** The reference composition
roots are FLAMOX365's `apps/frontend/portal/src/configuration/ShellConfig.ts` and
`libs/frontend/features/task/src/lib/provider/provideTaskFeature.ts`.
Symphony's fifteen product features live directly under
`libs/frontend/features/<owner>/src/lib/`; each public `provide*Feature` registers
its actual state, commands and contributed surfaces together.

| Feature    | Public provider            | Actual owned behavior and contributions                                                                                                       |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Home       | `provideHomeFeature`       | Overview/Orbit routes, Orbit selection/camera state, native widget host and search/navigation                                                 |
| Work       | `provideWorkFeature`       | Board, Setup and Stages bookmark, work mutations/selection/filters, source connections, source editors, search, quick-create and work widgets |
| Delivery   | `provideDeliveryFeature`   | Pull requests and publication, repositories/destinations, their editors/deep links, search, quick-create and delivery widgets                 |
| CI         | `provideCiFeature`         | Actions routes/drawer/logs, CI runs/local execution/usage, machine and local-CI settings, search/navigation and widgets                       |
| Skills     | `provideSkillsFeature`     | Catalog/assignments, built-in role drafts, import editor/System header action, startup and search                                             |
| Execution  | `provideExecutionFeature`  | Execution commands, Run drawer/projections, event subscription, reconciliation and the sole freshness owner                                   |
| Workflow   | `provideWorkflowFeature`   | Process drawer, process reads and human-decision commands with one workflow-busy owner                                                        |
| Workspace  | `provideWorkspaceFeature`  | Workspace management/scope, repository preparation/verification, directory/administration/editor and the Services card host                   |
| AI         | `provideAiFeature`         | Isolated AI account login/status, model/intelligence/usage state, account editor and Services account/connection fragments                    |
| Team       | `provideTeamFeature`       | Agent/position/team/routing configuration, organization/removal policies, agent editor/card and agent bookmark initializer                    |
| Feedback   | `provideFeedbackFeature`   | Feedback-intake test lifecycle, Teams editor and contents-only Services expander                                                              |
| Automation | `provideAutomationFeature` | One route-session runtime-policy draft, policy/Storage safety cards and repository-preparation warnings                                       |
| Platform   | `providePlatformFeature`   | Native tool inspection/install activity, Appearance/theme lifecycle and the confirmed incident poll                                           |
| Mobile     | `provideMobileFeature`     | Desktop access/pairing state and card; the separate `/browser` entry owns companion transport/state/theme                                     |
| Arcade     | `provideArcadeFeature`     | Games, saved preference/god-mode lifecycle, conditional navigation/search and its Appearance card                                             |

The static `ApplicationProductComposition.ts` list contains exactly fifteen
business definitions and selects each feature's providers and routes together.
`ShellConfig` appends the generic `settingsRoutes` from `frontend/setting` once;
Settings has no separate business-feature definition. `ShellConfig` provides
Navigation, Search, QuickCreate, Widget and Setting infrastructure once. Feature-specific contributions are inside their owning
feature providers. Publication and the optional CI-to-Automation root projection
are explicit product-composition bindings.

**Adapt — foundation and integration boundaries.** Core owns typed consumed
ports, the authoritative transport snapshot, readonly application projections,
bootstrap and the one `ConfigurationStore` settings writer. Features own their
actual mutable state and default adapters; the former `OrchestrationStore`
facade and Core `Legacy*Environment` implementations are removed. UI, Setting,
Search, QuickCreate, Widget, Notification, Update and Interaction remain reusable
capabilities and do not import business-feature implementations. Presentation
is the optional desktop/mobile integration composition: it may connect public
CI/Execution drawer and projection entries, and Mobile's browser entry, while
consuming optional operations through bounded ports. It does not become a new
aggregate business-state owner.

**Adopt — Mosaik owns Settings composition.** Exact inspected sources are
FLAMOX365's `libs/frontend/setting/src/views/SettingsView.{ts,html,scss}`,
`libs/frontend/setting/src/provider/provideSettingsViewSlotFrom.ts`,
`libs/frontend/features/edge/src/lib/provider/provideEdgeFeature.ts` and its
`view-presenters/cards/EdgeSettingsCardViewPresenter.ts`, plus Mosaik's
`libs/mosaik-elements-angular/src/cdk/view-slots/{provideViewSlot.ts,services/ViewSlotRegistry.ts,components/view-slot-outlet/ViewSlotOutletComponent.ts}`.
The general host now resides entirely in `libs/frontend/setting/src`.
`SettingsCatalog`, `SettingsHostSession` and the generic editor registry/service
compose native slots, validate requests before lazy loading, retain one drawer
and sequence follow-up requests. They contain no business-editor kind switch or
feature-owned form fields.

| Existing Settings surface                                                     | Canonical owner                   |
| ----------------------------------------------------------------------------- | --------------------------------- |
| Workspaces directory, workspace editor and Administration                     | Workspace                         |
| Automation machine card / workspace Local GitHub Actions                      | CI                                |
| Automation policy / System Storage safety                                     | Automation                        |
| System Developer tools / Appearance                                           | Platform                          |
| System Updates / Sleep                                                        | Update / Interaction capabilities |
| Built-in Skills cards / import editor and System import action                | Skills                            |
| Local phone access, pairing/approval and QR card                              | Mobile                            |
| Appearance game preference/card and shortcut lifecycle                        | Arcade                            |
| Workspace Team card, agent/profile/position/route/backup editor               | Team                              |
| One workspace Connected services card/header/group structure                  | Workspace                         |
| Boards, GitHub/Azure account rows, available Azure row and two source editors | Work                              |
| AI account rows, available runtime rows and account/login editor              | AI                                |
| Feedback expander contents and Teams channel editor                           | Feedback                          |
| Repositories / Delivery destinations and both editors                         | Delivery                          |

**Adapt — preserve one Services card and route-local drafts.** The original
`workspace-card-<id>` header/content geometry remains one Workspace-owned card.
Native nested slots project Work's Boards block, each configured account in its
original mixed order, Feedback's expander, then AI/Work's available connections.
Repository-managed accounts remain excluded, and the existing divider appears
once between Feedback and Add a service. Contents-only Angular hosts use layout
`contents`; they introduce no extra cards or visual tokens. This was checked
against Mosaik's `CellGroupElementTemplate.ts` and
`themes/_CellGroupElement.scss` in
`libs/mosaik-elements-foundation/src/controls/components/cells/`.

Selected workspace context is independent of active execution scope. Runtime,
Appearance, Skills and CI drafts retain their existing section-switch behavior
within one `SettingsHostSession`, reset on a new route, and reconcile saved
configuration through the same writer. Native route initializers keep Delivery's
seven-parameter deduplication and Team's agent bookmark sequencing; they are
scoped Angular effects, not hidden components or another registry. Shared draft
tracking and upsert helpers live once in Setting. Whole-settings validation,
provisional AI-account rollback, authentication secret clearing, column mappings,
confirmation gates, polling delays and disposal remain with their actual owners.

**Adopt — public form labels and event values.** Setup's Workspace, Exact
version input, Environment input and Operation ID input use the public
`mosaik-select` `[label]` input. The exact FLAMOX365 examples are
`libs/frontend/features/edge/src/lib/views/dialogs/ExtensionInstallationDialogView.html`
and `libs/frontend/features/edge/src/lib/components/EdgeSchemaFormComponent.html`.
Mosaik's Angular `components/select/SelectComponent.ts` forwards that label through
`SelectElementTemplate.ts` to `TextBoxElementTemplate.ts`, whose internal label
and input share one shadow root. The values, copy and test IDs remain the same.
The generic event-value helper retains explicit value/detail/selection and native
target-value precedence before primitive detail fallback; native input event
counters cannot replace account names. Adjacent regressions and the real
workspace-account journeys cover this behavior.

**Adapt — omitted features remove their affordances.** Removing a product feature
removes its routes, navigation, search, quick-create, widgets, settings editors
and native fragments together. Existing primary route order, query activation,
`navigation-<key>` and `workspace-menu-<key>` IDs are retained for included
features. Arcade visibility follows its saved preference. Omitted Work removes
Setup and the Stages bookmark; omitted Skills removes its import header action.
A missing publication, runtime, account or execution capability cannot construct
the absent feature as a side effect. For example, Team consumes optional AI
operations and disables its account-dependent edit/add/save actions when AI is
absent; Work's GitHub account row disables its repository editor if Delivery is
absent. Omitted Workflow removes both Board process menu entries and rejects
`process=true` bookmarks before selection or lazy drawer loading. AI and Team
installation controls consume actual optional Platform availability rather than
inferring an installer from a cached Homebrew/tool-health snapshot; the existing
confirmation command is unavailable without that owner. The complete product
retains its existing card anatomy, content order, copy, public Mosaik inputs and
acceptance IDs.

**Differ — desktop product scopes and workflows.** FLAMOX365's organization,
account and platform settings remain the reference composition, while Symphony
keeps installation/workspace selection, local account isolation, repository
preparation and the accepted phone-pairing workflow. Existing Symphony section
labels and controls remain in place; FLAMOX365-only tenant APIs, permission
models and service backends are not introduced. Typed validated desktop IPC
continues to supply these local operations.

**Adopt — browser-library test resolution.** The inspected FLAMOX365 Portal Vitest
configuration and Mosaik Angular starter bundle browser ESM dependencies through
Vite. Renderer tests use that supported resolution contract and the existing
Mobile clipboard-event setup through Core's reusable testing entry. Specs use
the real native slot registry and actual DI/product omissions; the registry is
not replaced by a stub.

**Verification — 2026-10-30.** The integrated source passed `yarn verify`,
including instruction/UI/design checks, formatting/lint, 110 strict project
typechecks, 51 test projects and four application builds. The complete actual
Electron and companion run passed with 47 journeys and two existing skips;
`yarn forge:package` then passed the macOS arm64 packaging/ASAR smoke check.
The existing skips cover hidden-window macOS activation and external interactive
OpenCode authentication. These fixture-backed results do not certify live
external account login. See [the completed verification matrix](dependency-model.md#source-completion-and-verification-status).

**Actual Electron reference review.** The final-source review opened 26 fresh
captures from the complete run and compared the affected routes with the exact
FLAMOX365/Mosaik owners above. Settled foregrounds cover Actions graph/logs,
Board/task and execution surfaces, PR authoring, workspace directory,
Services connection order, Team/model/appearance, Skills import, Overview/Orbit
and Arcade navigation. The
native Services-slot assertion follows stable descendant test IDs because native
slots introduce their own DOM wrappers; it still checks the configured account,
one group per role and the exact Codex, Claude Code, OpenCode, Azure order.

The audit found no confirmed visual regression caused by the owner extraction.
Existing empty PR/Actions widget frames remain deliberate empty states; the
compact live-progress tile shows tightly wrapped text within its fixed geometry. Moving
Orbit overlays, scroll continuation and drawer backdrop blur are interpreted
through their actual lifecycle rather than as static content loss. The captures
prove the reviewed states and viewports, not every possible data combination or
literal pixel identity with FLAMOX365 business pages. Earlier dated evidence
below remains attached to its original change.

The supplementary two-scenario Electron probe recorded the editor foregrounds
after their relevant controls became actionable and entered the viewport. It
used only test-owned configuration/runtime directories and a bounded read-only
GitHub CLI fixture; no external login or network operation was performed. The
application was closed in `finally`. Its scripts and captures were local,
ignored artifacts under `output/playwright/modular-visual-probe/`; they are not
distributed with a checkout or required by CI. The optional filenames below
identify that historical review, not downloadable or reproducible archived proof.

| Reviewed surface           | Optional local capture filenames and recorded observation                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI account/login forms     | `ai-account-codex-login.png`, `ai-account-claude-login.png`: native form, login controls and footer remained readable.                                               |
| Work source editors        | `work-azure-source-editor.png`, `work-azure-source-fields.png`, `work-github-source-editor.png`: source fields stayed inside their native drawer/scroll composition. |
| Delivery repository editor | `repository-editor.png`: repository name/selection controls and footer fit.                                                                                          |
| Public Setup labels        | `setup-workspace-label.png`, `setup-workflow-input-labels.png`: the four Select labels were visible through the public Mosaik label API.                             |
| Search and nested menu     | `expanded-contextual-search.png`, `actions-nested-status-menu.png`: settled search width, labels and submenu commands were readable.                                 |

To repeat the current reference review, install the locked dependencies, run
`yarn build`, then `yarn e2e:visible` on a supported graphical Electron host. The
tracked [Playwright configuration](../../apps/renderer-e2e/playwright.config.ts)
owns the isolated runtime fixtures, serial execution and capture policy. Start
from the [desktop shell journey](../../apps/renderer-e2e/src/desktop.spec.ts),
[workspace organization journey](../../apps/renderer-e2e/src/workspace-organization-settings.spec.ts),
[repository editor journey](../../apps/renderer-e2e/src/repository-settings.spec.ts),
[contextual search journey](../../apps/renderer-e2e/src/contextual-search.spec.ts)
and [Actions journey](../../apps/renderer-e2e/src/actions-workflows.spec.ts).
Use their explicit fixture states, test IDs and screenshot calls to review the
corresponding settled surfaces. Additional captures must use test-owned data
and remain local unless separately reviewed for publication. These journeys
produce their current artifact names; they do not recreate the untracked
supplementary script or certify that the historical PNGs are present.

**Follow-up cleanup — 2026-10-30.** The remaining Core execution transition
interface was removed while retaining the same eighteen consumed command
signatures directly on `IWorkOperations`. The active Work execution port remains.
Five internal Settings contribution IDs now match their actual View names;
route/section order, content, test IDs and native slots remain unchanged. The 32
unimported historical renderer override sheets were deleted after checking Sass
imports and the installed design-document generator. Only `app`, `app-header`
and `technical-value` remain, with identical contents and the same three `@use`
entries. This adopts the reference's canonical public owners without changing the
active Mosaik theme or view composition.

## 2026-10-29 board completion and overlapping snapshot refreshes

**Adopt — authoritative state drives columns.** FLAMOX365's
`libs/frontend/features/task/src/lib/view-presenters/TaskListViewPresenter.ts`
projects tasks with `columnKey: (item) => item.status`. Symphony retains its
provider-neutral work-item/column projection and Mosaik's controlled FlowBoard:
the consumer supplies current column keys and items instead of moving DOM cards
as a second state owner. The exact Mosaik references inspected are
`../mosaik/libs/mosaik-elements-foundation/src/controls/components/layouts/flow-board/FlowBoardElement.ts`
(`mutationMode` and accepted move events) and `IFlowBoardColumnElementProps.ts`
in the same directory (`columnKey`).

**Adapt — reconcile desktop snapshots after completion details.** The observed
race starts a full `snapshot.refresh` before analysis completes: its work-item
projection still contains Qualified while the combined read waits for CI. A newer
`analysis.completed` detail read applies Ready, then the older full snapshot
overwrites that card with Qualified. `ExecutionSynchronizer.refreshWorkItemOf`
now captures the existing `repeatAfterActiveRefresh` callback before reading
`work-items.detail` and invokes it in `finally`, matching
`WorkItemStore.moveWorkItem` and `mutateWorkItem`. The existing refresh coalescer
therefore queues a fresh full snapshot after an already active refresh. It adds
no competing state owner or UI primitive.

FLAMOX365's same presenter subscribes to task/reconcile SSE invalidations and
cancels its previous API load before replacement; `replaceVisibleTask` also
cancels that load before applying a changed task. Symphony adapts this protection
to typed desktop IPC full snapshots and coalesced execution events. The adjacent
deterministic regressions cover the overtaking read and the completion without an
active refresh. The focused Electron desktop journey passes, including the Ready
transition and subsequent implementation; its Board screenshot retains the same
Mosaik composition.

## 2026-10-10 route consolidation and readable Overview tiles

**Adopt.** Workspace navigation and AI team editing follow FLAMOX365's
`libs/frontend/setting/src/views/SettingsView.html` and
`libs/frontend/presentation/src/lib/views/PresenterView.html`. Overview keeps
explicit value/label pairs and wrapping from
`libs/frontend/ui/src/lib/components/widget-summary/WidgetSummaryComponent.html`
and `libs/frontend/features/reporting/src/lib/views/widgets/DashboardKpiWidgetView.html`.
The bounded public Scroll composition follows
`libs/frontend/ui/src/lib/components/navigation/NavigationComponent.html`.
Mosaik's exact public `ICardElementProps.ts`, `CardElementTemplate.ts`,
`Themes/_CardElement.scss`, `Themes/_CardContentElement.scss` and
`Themes/CardElement.Soho.scss` under
`libs/mosaik-elements-foundation/src/Controls/Components/Grouping/Card/` were
inspected. Cards, Text and public typography continue to own the Soho visuals;
no Mosaik internals or source checkout change.

**Adapt.** Overview's small square cells grow from seven to nine rem. Card's
public `inset="none"` and ordinary layout padding make room for full wrapped
labels, counts and actual progress, without an empty status row. Labels use
body2 typography. A bounded full-height Mosaik Scroll keeps every category
reachable at laptop heights and native zoom; auto margins retain vertical centering
when it fits. The category panorama, existing routes, counts, animations and
hover/focus protection remain intact. Native checks inspect both visible bounds
and the Card's actual clipping containers, so hidden text cannot pass as fitting.

**Differ (explicit product decision).** The dedicated Stages and Employees routes,
workspace menu entries, duplicate local tabs and their scene/presenter code are
retired. Existing `/main/stages` bookmarks redirect to Board; `/main/team` redirects
to Settings. Agent identity, appearance and assignment remain in workspace settings
and established ticket workflows. A successful setup analysis opens its selected
Board ticket's process drawer. Orbit remains focused on tickets and confirmed
delivery destinations; Mobile employee surfaces remain intact. No second workflow,
configuration or execution store is introduced.

## 2026-10-10 employee identities in AI team avatars

**Adopt.** The AI team retains the existing Mosaik Cell Group, Avatar Group,
provider/fallback avatars and Edit/Remove controls. The exact read-only references
are FLAMOX365's `libs/frontend/setting/src/views/SettingsView.html` and image-backed
Avatar in `libs/frontend/presentation/src/lib/views/PresenterView.html`, plus
Mosaik's `AvatarElement.ts`, `AvatarElementTemplate.ts` and `AvatarElement.Soho.ts`
under `libs/mosaik-elements-foundation/src/Controls/Components/Media/Avatar/`.
The public Avatar `src`, `text`, size, appearance and tooltip inputs own image
loading, fallback, accessible naming and the Soho frame. No Mosaik source or
internal styles change.

**Adapt.** Symphony's employee identity replaces the generic bot icon with a
transparent 48 × 48 export of the chosen catalogue figure. A pure shared pipe
uses the full figure's existing colour-to-character resolver and stable ID default;
the workspace organization projection carries the saved appearance rather than
creating another configuration or state store. The medium figure avatar stands
beside the small account-avatar group in the Cell's start slot, so routing icons
cannot cover the employee's face; layout uses ordinary Tailwind spacing only.
Account and backup icons continue
to describe CLI routing separately. Existing legacy image references remain
readable; the editor offers only the six bundled characters, with no upload action.
Native Electron journeys check all six decoded images, saved selection and a
cancelled edit; packaging checks all six on Desktop and Mobile.

## 2026-09-11 board-card action and submenu semantics

**Adopt — nested card actions project a complete Mosaik Menu.** The Board card's `Move to`,
`Assign to`, and Pull request entries now follow FLAMOX365's profile-status submenu and Mosaik's
hierarchical-menu contract exactly: each popover Menu Item owns one
`<mosaik-menu slot="submenu">`, and that Menu owns the leaf Menu Items. This restores the shared
floating-menu surface, padding, item spacing, and divider styling to nested popovers instead of
projecting ungrouped leaf items into the portal. Assignment rows retain their Avatar start slot and
move rows retain their checked current-column marker.

**Adopt — positive decisions use an independently coloured success icon.** An advancing human-gate
decision such as `Accept` is projected as `success`, and the action icon uses the Menu Item's public
icon slot with its own matching Mosaik Icon variant. The label therefore keeps the normal menu
foreground while the checkmark communicates success rather than inheriting Symphony's red primary
accent. Destructive decisions remain `danger`. The checked current `Move to` destination stays
enabled: selecting it is the presenter's established no-op, so the marker remains without implying
that the destination is unavailable. The exact read-only references were FLAMOX365's
`PresenterView.html` presence-status submenu and Mosaik's `MenuItemElementTemplate`, `MenuElement`
hierarchical-menu example, and Joy Icon variant contract.

## 2026-09-07 installer-only update availability

**Adopt — a detected version becomes one actionable Mosaik update state.** The existing Settings
card, Presenter header, and menu-bar panel continue to share `DesktopUpdateStore`. An
installer-only channel result now projects as `available`: Settings names the target version and
adds one solid-primary Download button, while an icon-only solid-info action in the header's
trailing action group and the menu-bar item expose the same command. Busy state remains on the
Mosaik action that initiated the handoff. This extends FLAMOX365's `UpdateSettingsCardView` check
action, result notification, and ViewPresenter command boundary without adding a second renderer
client or a decorative status.

**Adapt — availability and readiness are separate desktop decisions.** FLAMOX365 prepares a web
service-worker version after detection, whereas Symphony's current ARM64 release surface provides
manual DMG and EXE installers. Symphony therefore keeps `available` distinct from the native
updater's `downloading` and `ready` states: Download opens the Main-retained installer URL, while
Restart and update remains exclusive to a payload Electron has actually downloaded. Neither URL
nor release-provider detail crosses into the sandboxed renderer. The exact read-only references
were FLAMOX365's `UpdateSettingsCardView`, `UpdateSettingsCardViewPresenter`, and
`DefaultUpdateHandlerStrategy`, plus Symphony's already adopted Presenter update action and
Mosaik's public Button busy-state contract.

## 2026-09-07 workspace menu settings destination

**Adopt — the workspace menu ends with a separated Settings action.** The Presenter header now
groups its workspace choices and the Settings destination in the existing Avatar-triggered Mosaik
Dropdown Button. A horizontal `mosaik-divider` follows every workspace item, and one plain Mosaik
Menu Item labelled `Settings` is always the final entry. Activating it closes the menu through the
same public Dropdown Button proxy used by workspace selection and navigates through the existing
Presenter command; no second settings route or state owner is introduced.

This supersedes the separate icon-only Settings button in the trailing header actions documented
below. The trailing group now contains only Search and the workspace-rail toggle, while Settings is
also reachable at Mosaik's narrow breakpoint because the workspace menu remains present there. The
exact read-only references were FLAMOX365's `PresenterView` profile-navigation menu, where
navigation groups are separated with Mosaik Dividers, and Mosaik's public Menu, Menu Item, Divider,
and Dropdown Button contracts. Symphony **adapts** that profile-navigation composition to its
provider-neutral workspace selector because FLAMOX365 has no equivalent global workspace scope.

## 2026-09-05 compact desktop window and responsive shell

**Adopt — the narrow workspace rail is a bottom Sheet.** Below Mosaik's `lt-md` breakpoint, the
split keeps the route surface at full width and the existing rail action opens the same Runs
content in a modal, full-width `mosaik-sheet` with a drag handle, 90dvh snap, backdrop, Escape and
outside-click dismissal. The Sheet now follows FLAMOX365's exact connected-element contract: a
dedicated directive opens it after `updateComplete`, while the overlay and root use the reference
enter/leave motion. Desktop keeps the resizable right-hand split and its persisted open state.

**Adapt — Symphony's header segment becomes an icon segment.** Symphony has no FLAMOX365-style
side-navigation drawer; its five primary routes live in the centred header Segment. At `lt-md`, the
same Segment therefore moves back into the App Header's residual flex layout, drops its labels and
restores the former registered navigation glyphs: Home, Board, Pull Requests, Actions and Arcade.
Every item retains its route, checked state, accessible name and mobile-only tooltip. The workspace
avatar and rail toggle remain available, while Settings, global Search and the transient update
action leave the narrow header so they cannot overlap navigation. At 960px and above, the exact
labelled, window-centred desktop segment and all trailing actions return.

**Adapt — the native window accepts editor-sized bounds.** Electron's minimum changes from
1040x700 to 400x270, matching the constants verified in the installed Visual Studio Code desktop
bundle. The change makes the already established Mosaik breakpoint behavior reachable in a desktop
window; route content keeps its existing scroll, responsive grid and horizontal-board ownership
rather than being scaled. The exact read-only references were FLAMOX365's `PresenterView` and
`PresenterRailSheetDirective`, Mosaik's Breakpoint, Segment, App Header and Sheet contracts, the
former Symphony navigation implementation for icon identity, and Visual Studio Code's packaged
Electron window bounds.

## 2026-09-05 Actions workflow selection and dispatch hierarchy

**Adopt — workflow scope is one centred Mosaik Select.** The Actions route replaces the persistent
workflow sidebar documented on 2026-08-20 with a soft `mosaik-select` above the run collection. It
contains `All workflows` and every discovered workflow definition, keeps the provider's name order,
and enables Mosaik's built-in filter for a long option set. The control and primary navigation share
the same explicit responsive 40rem measure, so their centred edges stay aligned instead of merely
using similar maximum widths. Each active definition that supports manual dispatch carries a tiny
soft-highlight `mosaik-chip` in the Select Item's public `end` slot; the selected value remains the
workflow name, while the dropdown makes trigger capability scannable. The shared collection remains
the sole owner of run-list headings, menus, empty content, and vertical scrolling. Selection still
crosses the View to ViewPresenter boundary through the existing `Command`, so the layout change
creates no second workflow-state owner.

**Adopt — hydration preserves the loaded page anatomy.** The Actions title and Toolbar remain in
place while loading, with two button-sized Mosaik Skeletons occupying the eventual filter and
refresh positions. The content skeleton repeats the final centred selector measure, the shared
collection header's responsive geometry, and run-shaped rows with status, three-line content,
right-aligned time, and reserved hover-menu space. This follows FLAMOX365's content-shaped loading
states and Symphony's Pull Requests collection skeleton rather than presenting unrelated full-width
placeholder slabs that move every boundary when hydration completes.

**Adapt — manual dispatch is contextual, with one primary action.** When the selected active
workflow supports `workflow_dispatch` and already has history, its actions sit directly beneath the
selector. When it has no recorded run, the same actions move into the public `actions` slot of
`mosaik-empty-state`, where they explain how the first run is created. `Run locally` is the solid
primary action and `Run on GitHub` is its outline alternative; both retain their existing busy,
disabled, tooltip, and presenter-command behavior. A filtered-empty run list does not masquerade as
a never-run workflow: the presenter derives history before applying status, author, search, and sort
filters.

**Differ — the Git ref is provider-owned rather than operator-entered.** Symphony removes the
visible ref field and always dispatches the workflow's discovered `defaultBranch` through both the
GitHub and managed-local paths. This differs from an arbitrary GitHub API client that exposes a ref
picker, because this route operates on provider-discovered workflow definitions and has no branch
selection workflow of its own. It also differs from FLAMOX365, which has no GitHub workflow browser;
the local-runner peer action is Symphony-specific. The exact read-only references were FLAMOX365's
standalone Mosaik Select compositions and empty-state action projections, plus Mosaik's public
`SelectComponent`, `SelectItemComponent`, `ChipComponent`, `EmptyStateComponent`, and Button
appearance contracts.

## 2026-09-04 desktop version watermark and ready-update action

**Adopt — update work uses a Mosaik busy action.** The Presenter shell reuses the same
`DesktopUpdateStore` as Settings and the menu-bar panel. Once Electron has found and completely
downloaded an update, an icon-only solid-info Mosaik Button with the registered Reicon download
glyph appears in the header, receives Mosaik's `isBusy` state while the install request runs, and
invokes the existing safe restart coordinator. Its Mosaik Tooltip names the target version before
activation and changes to the truthful indeterminate installation phase while busy; Electron's
built-in updater does not expose numeric installation progress.
This adopts FLAMOX365's `UpdateSettingsCardView` busy-button composition and its ViewPresenter
command boundary; it does not create another update client or expose GitHub details to the
renderer.

**Adapt — ready state joins the trailing header actions.** FLAMOX365's Presenter header has one
centred `brand` surface. Symphony already uses that positioned Mosaik slot for its window-centred
route segment, so the transient Update button joins the trailing action group immediately before
Search and the rail toggle. This keeps every action in the toolbar's normal hit-testing and flex
layout while leaving the route segment centred; between the mobile collapse and the next wider
desktop breakpoint, the segment contracts by six rem so its final item cannot overlap the
transient action. The action is absent for `idle`, `checking`, `downloading`, `failed`, and
`disabled`; Settings remains the place for manual checks and failure details.

**Differ — the desktop version remains visible at the window edge.** A compact Mosaik Hint now
shows the running `app.getVersion()` projection at the absolute lower-left content edge. FLAMOX365
does not expose a persistent build watermark, but Symphony needs it to identify an installed
desktop artifact when comparing GitHub Releases and diagnosing update delivery. The exact
read-only references were FLAMOX365's `PresenterView` and `UpdateSettingsCardView`, plus Mosaik's
public Hint, Button, Tooltip, and Reicon contracts.

## 2026-09-03 ViewPresenter command-surface completion

The renderer now **adopts** FLAMOX365's public ViewPresenter boundary across every desktop and
mobile route: externally invoked actions are exposed as `Command` objects, externally consumed
projections are read-only computed signals, and implementation-only methods are private. The final
404 public methods were classified from their actual template and TypeScript references before the
AST rewrite; the result is 250 Commands, 131 signal projections, and 23 private helpers. Lifecycle
and documented behaviour extension points remain public.

`MenuBarViewPresenter` remains the canonical fully declarative example. Existing compound template
interactions that also close a menu, stop a native event, or guard router activation **adapt** the
reference by invoking `Command.execute` within that compound interaction; standalone bindings can
continue to use `CommandDirective`. This preserves the established visible interaction while still
removing direct application-method calls from the ViewPresenter surface. Mobile imports the same
`Command` implementation through the mobile frontend-core entry point so the mobile dependency
graph does not evaluate desktop Mosaik services. Mutable settings-editor drafts additionally feed a
presenter-local revision signal, so validation and choice projections retain the live behavior that
their former query methods had. The change is architectural and introduces no intentional visible
difference. The exact read-only references were FLAMOX365's
`patterns-and-practices` `Command`, `AsyncCommand`, and `ViewPresenter` implementations,
`frontend/core`'s `CommandDirective`, and the Task dialog and Search presenter/view pairs.

## 2026-09-03 unified toolbar: centred navigation band, launcher search, route title rows

**Adopt — the shell is a header band again.** This reverses the 2026-08-23 _floating shell_ entry
below. FLAMOX365 composes its shell as a persistent header band, and Symphony now does the same:
`mosaik-app-header` sits in the flow at the top of the window, spans the full width, and carries the
workspace picker, the primary navigation and the search on one 78px strip. The vibrancy that used to
sit on three floating pills sits on the band. `--presenter-chrome-inset-top` drops from 64px to 0
because the content no longer has to reserve room under a floating strip; the property stays as the
single seam between shell chrome and route content.

Three declarations survive from the floating variant and are still load-bearing.
`AppHeaderElement` wires `addHideOnScrollController({ hideOnScroll: true })` in a field initialiser
with no property to switch it off, and the Joy theme parks the hidden state on
`:host(:not([data-visible]))` as `top: -64px; opacity: 0; visibility: hidden`. A band that carries the
navigation must not vanish when the board scrolls, so `top` / `opacity` / `visibility` keep
neutralising that controller from `overrides/app-header.scss`. `height: auto` also stays: the
component hard-codes 64px on its `:host` with no custom property behind it, and letting the host hug
its toolbar is what makes the band exactly `--toolbar-height` tall.

**Adopt — navigation is a centred `mosaik-segment`.** The floating dock is gone, and with it
`overrides/dock.scss`. The five primary routes are `mosaik-segment-item`s that keep the dock's
`routerLink` and `routerLinkActive` wiring, and they carry labels only — the icons the dock needed to
stay compact are not what a centred, labelled segment is for. Arcade stays a peer route inside the
segment; Settings sits in the trailing `actions` slot as a plain `mosaik-button`.

The band reads left to right as workspace picker, navigation, search, rail toggle. The picker fills
the header's `menu` slot (the toolbar's left-aligned `start` slot, which also retires the fallback
navigation toggle that slot renders when empty), the segment fills `brand`, and the three trailing
controls fill `actions`.

Centring the segment intentionally differs from the slot's default flex behaviour. `brand` maps to
the toolbar's `[part=main]`, which centres its children only inside the residual space left by the
two edge groups; expanding the search therefore moved the navigation. Symphony positions the
slotted segment absolutely at 50% of Mosaik's positioned Toolbar host instead. The Toolbar spans the
complete band and becomes the segment's containing block, so the primary navigation remains on the
window centre independently of workspace or action widths. Electron E2E measures the same centre in
the compact, expanded and collapsed search states.

**Adapt — the band is a compact desktop chrome strip.** `--toolbar-height` is 78px, one quarter less
than the preceding 104px redesign band: the band is the window's own title bar and carries the
primary navigation, so it remains taller than a single content toolbar. macOS places its window
buttons against its own title-bar height, so
`trafficLightPosition` in `apps/desktop/src/main.ts` puts them on the band's optical centre instead;
`titleBarStyle: 'hiddenInset'` alone leaves them riding high against a band this tall.

**Adapt — the search rests as a launcher.** A permanently open search field is what made the band
run out of width: it is the one control with no natural size, and at full width it left nothing for a
centred navigation. It now follows the macOS toolbar pattern — a search button that becomes the field
on activation. The rendered Mosaik Search Box receives focus immediately and returns to the launcher
as soon as focus leaves the complete search surface. It grows in the trailing action group's flow,
but the absolutely centred navigation no longer participates in that width trade. The width
transition lives in `PresenterView.scss` as host-local structure: no Mosaik input expresses it and
Tailwind's transition utilities are excluded. The field reaches 360px on wide windows and contracts
continuously on narrower desktop widths before the trailing actions can collide with the fixed-centre
navigation. At Mosaik's `lt-lg` breakpoint, the five-route Symphony segment cannot coexist with the
expanded field and the native macOS title-bar insets. Symphony therefore adopts FLAMOX365's
breakpoint-driven header replacement pattern: the centred segment is hidden only while the focused
search field is open, then returns in the same centred position when search collapses. This adapts
FLAMOX365's smaller-screen search-route replacement to Symphony's inline search interaction and
keeps both controls usable instead of allowing them to overlap.

**Adopt — Mosaik's Reicon system aliases are registered by the shell.** Like FLAMOX365, Symphony
registers `ReiconAliases` as the named `reicon` set and selects it as the default before applying its
product-specific aliases through `provideIcons()`. Built-in Mosaik controls can therefore resolve
their own semantic names — including carets, dismiss buttons, sort indicators and overflow actions —
without Symphony duplicating those aliases or embedding icon data.

**Adapt — navigation is driven by `checked`, not by the click.** `SegmentElement` binds Enter and the
arrow keys in a capture-phase `KeyboardController` that calls `item.check()` and then
`preventDefault()` plus `stopPropagation()`. A keyboard activation therefore never becomes a click
and never reaches the `routerLink` on the item host, and the host is not focusable in the first place
(the element does not set `delegatesFocus`; the focusable node is the `<button role="tab">` in its
shadow root). `checked` is the only signal both activation paths share, so it drives a
`navigateToRouteCommand` on the presenter. It fires on programmatic checks too — `routerLinkActive`
writing `isChecked` back after a global search would re-navigate to the bare route and drop its query
parameters — so the binding is guarded by the item's own `isActive`. `routerLink` stays for the
pointer path and to give `routerLinkActive` something to report on. `showScrollButtons` must be bound
as a property: left on, the overflow affordance renders Mosaik's kebab-case icon names, which are not
in Symphony's registry and resolve to nothing.

**Adopt — one title line per route.** `mosaik-page-header` was styled in `overrides/page.scss` but no
route rendered one. It stays a single line: the height of the shell's band is what carries the
redesign, and a second tall band under it would push the content down twice. Board, Pull Requests, Actions and Skills now do: route name on the leading edge,
`symphony-page-toolbar` on the trailing edge, a hairline below, content beneath. The toolbar keeps
its component, its two Mosaik Toolbar groups and the rule that hides an empty leading group; it loses
the fixed bottom-left placement, the 28px radius, the border and the elevation. `overrides/glass.scss`
had no other consumer and is removed with it. The four toolbar dropdowns flip from `top-start` to
`bottom-end` because the group no longer sits on the window floor.

**Adapt — two page-header facts the component does not advertise well.** It has no `actions` slot;
the trailing slot is `suffix`. And its padding comes from the `inset` attribute plus
`--page-header-inset` — the `--page-header-padding-*` properties the theme declares are never read by
a rule, exactly like `--searchbox-shadow`. `[part=heading]` and `[part=suffix]` also need
`min-width: 0` from the override sheet: both are flex children whose default floor stops a long route
title from truncating and pushes the action group off the trailing edge.

**Adopt — FLAMOX365's shared Mosaik typography and layout tokens.** `fontFamily` and every typography
role in `ApplicationThemeOverrides.ts` use `Inter, sans-serif`, while `layout.radius`,
`layout.space`, and `layout.thickness` use the same 8px, 6px, and 1px values as FLAMOX365.
Monospace survives on identifiers, branch names and run names through one shared `.technical-value` class in
`overrides/technical-value.scss`, following the precedent `.glass` set for a shared override class.
The class sets both `font-family` and the per-element `--*-font-family` properties, because themed
Mosaik elements resolve their text against their own property and never read the inherited value.
The desktop and mobile surfaces still share one theme: `mobile-pairing.spec.ts` asserts the mobile
companion receives exactly these tokens.

**Adopt — compact badges and Polaris-inspired floating menus.** The shared renderer overrides now
match FLAMOX365 for generic Mosaik badges, avatars, dropdown and split-button popovers, floating menu
surfaces, menu item states, grouped menu labels, dividers, responsive message boxes, and responsive
toasts. Symphony keeps its existing inline navigation appearance because the menu rules target only
Mosaik floating popup and popover hosts. The FLAMOX365 `feedback.scss` file remains unported because
it contains only FLAMOX365-owned `.flamox-*` feature classes rather than reusable Mosaik component
overrides. Symphony's Electron shell, board virtualization, page composition, and coarse-pointer
tooltip adaptations remain in their owning override files.

**Adopt — the board reads as lanes.** `mosaik-flow-board` keeps virtual scroll, drop lists, selection
and grouping untouched. The column loses its surface, border, radius, body padding and item gap, and
gains a hairline on the trailing edge. The virtual entry host contributes no bottom padding, so rows
meet directly. Every row and grouped row loses its outer border, radius and elevation and gains only
an inset separator; semantic variants may retain their meaningful fill. The separator is an inset
shadow rather than a border because the column is virtualized and a real border adds to every row's box.
Selection is styled through `[aria-selected='true']`: `Selectable` sets that attribute and removes it
again, and there is no reflected `is-selected` attribute to match on. The run-state chip stays a
`mosaik-badge` with `appearance="plain"` rather than becoming a `mosaik-hint`: it reads as a sentence
either way, but `mosaik-hint` takes only `text`, `textOverflow` and `alignment`, so a hint would have
dropped the variant that distinguishes a failed run from a finished one. Column width stays at
420/480px, which is what a Symphony row's title, repository, labels and run state actually need.

**Fix — the last tickets in a dense column were unreachable.** Symphony's own
`DynamicSizeVirtualScrollStrategy` costs unmeasured entries at the average of the measured ones, so
the content size is an estimate that moves as entries are measured. While it disagrees with the real
scroller, the offset that maps to the last entry sits beyond the scroller's maximum, the final
entries never render, and never being rendered they are never measured, so the estimate never
corrects itself. The rendered range now decides its end against the scrollport's actual extent rather
than against the estimate, so resting at the bottom always renders to the end of the data. The
geometry change surfaced this; the defect predates it, and the exact index the board-scroll spec
reached was a function of viewport height.

## 2026-09-02 frontend core architecture baseline

`libs/frontend/core` now **adopts** FLAMOX365's foundational frontend patterns: Views forward their
lifecycle to an injected ViewPresenter; ViewPresenters own initialization, disposal, cancellation,
loading state, and tracked subscriptions; synchronous and asynchronous Commands expose reactive
`canExecute` state; and the standalone `CommandDirective` / `CommandNameDirective` pair binds DOM
or custom events to direct or named Commands without calling presenter methods. The exact read-only
references were FLAMOX365's `patterns-and-practices` implementations of `View`, `ViewPresenter`,
`Command`, and `AsyncCommand`, plus `frontend/core`'s `CommandDirective`, `CommandNameDirective`,
and `CommandProxy`.

Symphony **adapts** the Command construction API into one exported class per file because its
binding repository convention requires one public export whose file has the same name. It also
adapts FLAMOX365's web-service-oriented state ownership to Symphony's local desktop boundary: the
former monolithic orchestration store is now a stable facade over focused state, synchronization,
configuration, CI, work-item, pull-request, skill, workspace, selection, mobile-access, and theme
collaborators. Browser, preload, storage, mobile transport, and operation-ID access enter those
collaborators through typed injectable adapters. This introduces no FLAMOX365 runtime dependency
and no intentional user-visible difference.

## 2026-09-02 linked storage segment legend

The storage breakdown **adopts** FLAMOX365's separation between the presenter-owned storage
projection, the Mosaik Segment Bar, and the human-readable detail entries. The planned adaptation
to the reusable Mosaik Segment Legend and Segment Legend Item remains staged in Mosaik `0.1.97`:
a legend item owns its marker, text, value, and tooltip template and can link its `for` property to
a concrete Segment Bar Item or Segment Ring Item ID. Until that package is published, Symphony
keeps its existing composition of public Mosaik `0.1.96` Dot, Text, and Tooltip components while
retaining stable Segment Bar Item IDs for the later association.

This **differs** from FLAMOX365's Tenant Storage Usage card, which renders the details as a separate
Mosaik List without interaction between a detail row and its segment. Symphony also avoids a shared
segment-item interface and an application-level event bus: the Mosaik legend item resolves one of
the two concrete segment item elements and manages concurrent emphasis sources internally. The
exact read-only references were FLAMOX365's
`TenantStorageUsageCardView.{html,ts}` and `TenantStorageUsageCardViewPresenter.ts`, Mosaik's public
Segment Bar and Segment Ring implementations, and the supplied capture for visual intent only. The
Symfony package version must be advanced only after the Mosaik release containing the generated
Angular legend wrappers is published; the registry currently exposes only `0.1.96`.

## 2026-09-02 ticket drawer header and work-item findings

The ticket drawer header now **adopts** the close-action composition used by FLAMOX365's
`TaskDialogView`, `UserDialogView`, and `FeedbackDetailDialogView`: a small, plain
`mosaik-button` with the `dismiss` icon invokes the presenter's close command from the drawer
header suffix. It no longer substitutes Mosaik's separate `Dismiss` primitive for that button.
The whole ticket drawer header is an Electron no-drag region so its close action and provider
link remain interactive when the underlying desktop app header is the native window drag region;
this is an **Adapt** required by Symphony's frameless resizable desktop shell.

Work-item findings now render as one soft Mosaik Banner per issue, following FLAMOX365's
header-and-explanation banner composition while retaining Symphony's provider-neutral inspection
model. Each banner presents the short problem, its complete explanation, and a labelled next step
without a nested height limit. The banner list is ordinary drawer content: it scrolls away with the
ticket instead of remaining sticky, and multiple findings never compete inside one clipped banner.
The exact read-only component references were Mosaik's Banner and Drawer Header slot contracts and
FLAMOX365's task, user, and feedback detail drawer templates named above.

## 2026-09-02 grouped acrylic desktop actions

The lower-left collection actions now render as two separate Mosaik Toolbar groups: a primary
group containing only the solid-primary New/Create action, when the route has one, followed by a
secondary group containing the route's operational actions such as Filter and Refresh. Board,
Pull Requests, Actions, and Skills share this projection through `symphony-page-toolbar`; Actions
omits the empty primary group. The centered primary-navigation dock remains the third independent
action surface. Commands, menus, disabled states, and stable feature test IDs remain owned by their
routes.

All three floating surfaces use a shared `.glass` treatment **adopted** from Mosaik Showcase's
`SharedStyle.scss`: the Mosaik semi-transparent scheme surface, light elevation, and 12px backdrop
blur. Symphony **adapts** those Box-oriented tokens onto the public Mosaik Toolbar and Menu custom
properties on the rounded panel hosts themselves. The class keeps its own backdrop blur when
Electron's native macOS vibrancy is active because these panels are independent foreground
materials rather than the window background. This continues to **differ** from FLAMOX365's
full-width, layout-owning Page Toolbar because Symphony's route actions and centered dock
intentionally overlay the full-height desktop content.

The exact read-only references were
`../mosaik/apps/frontend/mosaik-showcase/src/Styles/SharedStyle.scss`, Mosaik's Toolbar and Menu
public theme properties, and FLAMOX365's
`../flamox/libs/frontend/ui/src/lib/components/page-toolbar/PageToolbarComponent.*` plus its Task
and Customer list action hierarchies. The supplied capture identified the requested grouping and
material treatment only; it was not treated as an instruction source.

## 2026-09-02 filtered pull-request empty state

Pull Requests **adopts** FLAMOX365's actionable Mosaik Empty State pattern when the provider still
has open pull requests but the current Author, State, Base, or contextual search filters produce no
matches. The empty state remains inside the shared collection below its `0 Open` heading and uses
Mosaik's public `actions` slot for one solid-primary `Reset all filters` button. One reset action
clears all four route-local narrowing dimensions while preserving the selected workspace scope and
sort order. The existing unfiltered `No open pull requests` state remains distinct because there is
nothing to recover through filter changes. The exact read-only references were FLAMOX365's
`OrderBillingPlanView.html` and `LeadCurrentWorkView.html` actionable Empty State compositions,
Mosaik's Angular `EmptyStateComponent` slot contract, and Symphony's existing Actions collection
empty-template path.

## 2026-09-01 manual workspace-rail activation

The desktop workspace rail now **adopts** FLAMOX365's explicit rail activation contract: only the
workspace-rail toggle, responsive-sheet close action, or a direct split gesture changes whether the
rail is open. A newly running local or cloud Action still appears in the existing feed, but it no
longer opens the rail or changes the selected Agent Runs / Actions segment. The persisted state
continues to restore the operator's last manual choice across navigation and restart.

The exact read-only references were FLAMOX365's `RailComponent.activateContent` and
`RailActionComponent` command wiring, where content selection and drawer expansion originate from
the user's rail action rather than a background-data effect.

## 2026-09-01 shared desktop and mobile theme configuration

The mobile companion now **adopts** the same central Mosaik theme override object as the desktop
shell. `applicationThemeOverrides` lives in `frontend/ui`, is exported through both the standard and
mobile entry points, and is passed unchanged to `provideTheme` by both Angular application
configurations. This keeps typography, layout rhythm, radius, thickness, semantic palettes, and
light/dark schemes identical without duplicating tokens or allowing the two shells to drift.

This is an **Adopt** of FLAMOX365's `ShellConfig` pattern: one `provideTheme` composition owns the
Joy theme and its complete overrides. Symphony adapts the owner into a shared UI entry because its
desktop renderer and separately bootstrapped local mobile companion must render the same product
theme. The exact read-only references were FLAMOX365's
`apps/frontend/portal/src/configuration/ShellConfig.ts`, Mosaik's public `provideTheme` deep-merge
implementation and `ThemeService` CSS-variable projection, plus Symphony's existing desktop
`ShellConfig.ts` and former renderer-local override definition.

## 2026-09-01 desktop dock overlay and full-height route content

The desktop route scrollport reaches the lower edge of the App content on every route, while the
floating navigation dock remains a viewport overlay. This is a **Differ** from FLAMOX365 and
Mosaik's persistent navigation geometry, which consumes layout space directly: Symphony's dock is
intentionally superimposed on the page and therefore does not shorten the shared content surface or
shift full-height board and collection surfaces. Document routes whose final control can otherwise
rest behind the dock add a scrollable tail inside the route; Settings uses this space so its final
Expander can be moved clear of the overlay without changing the shared Presenter geometry.

The exact read-only references were FLAMOX365's full-height Presenter route scroll container and
Mosaik's App content/navigation geometry. The supplied desktop capture identified the regression
only; it was not treated as an instruction source.

## 2026-09-01 desktop mobile-pairing QR composition

The desktop Mobile access card **adopts** FLAMOX365's two-factor setup hierarchy: the QR code owns a
centered block, while the manual fallback follows below it in normal document flow. Symphony
**adapts** the short authenticator secret into its longer local pairing URL and therefore presents
the complete value in a bounded, readonly Mosaik Text Box instead of an unconstrained inline code
element. The address stays selectable without determining a grid column's intrinsic width or
overlapping the QR canvas.

The exact read-only references were FLAMOX365's `TwoFactorCardView.html` and Mosaik's QR Code, Text,
and Text Box public implementations. The supplied desktop capture identified the overflow
regression only; it was not treated as an instruction source.

## 2026-09-01 mobile pairing and responsive connection shell

The disconnected mobile shell **adopts** FLAMOX365's narrow, centered login anatomy and its clear
separation between the product mark, heading, guidance, and current verification state. It also
adopts the verification-pending hierarchy of one prominent instruction followed by the matching
code. Symphony **adapts** that composition to a local companion instead of an account sign-in: a
small product mark replaces the application-icon hero, Mosaik Message and Busy State components
present pairing progress, and the primary retry action appears only after an actionable connection
error. An unpaired phone is instructed to scan a new code and no longer presents a misleading
failure action.

The mobile application now owns an explicit Tailwind v4/PostCSS entry so its layout, spacing,
sizing, overflow, and responsive utility classes are included in packaged assets. Visual semantics
remain owned by public Mosaik typography, Message, Busy State, and Button APIs. The exact read-only
references were FLAMOX365's `LoginView.html`, `VerificationPendingChildView.html`, and
`OnboardingView.html`, plus Mosaik's Text, Message, Busy State, and Tab Strip implementations. The
supplied mobile captures identified the broken size and recovery state only; they were not treated
as instruction sources.

## 2026-09-01 badge-free symmetric navigation dock

The floating primary-navigation dock no longer renders an active-run Badge on Actions. This applies
the UI relevance gate more strictly than FLAMOX365's persistent navigation: current runs remain
available in the workspace rail, while a count overlaid on a route icon duplicates that state and
changes the navigation silhouette without enabling another decision. The Badge-only presenter
projection, Angular import, markup, test surface, and dock styling are removed together; the dock
contains no Badges.

The dock also gives its first and last navigation items equal physical insets. This is an **Adapt**
around Mosaik's Angular Tooltip projection: every icon tooltip is appended as a `display: contents`
sibling at the end of the Menu, but the Menu's flex `gap` still allocated one trailing gap for each
zero-box Tooltip. The dock therefore sets the public Menu gap to zero and restores the intended
spacing explicitly between visible sibling Menu Items and around the Divider. Pointer
magnification, icon sizes, item hit areas, the Divider, and the public Mosaik components remain
unchanged.

The exact read-only references were FLAMOX365's `PresenterView.html`; Mosaik's Menu, Menu Item,
Divider, Tooltip directive, and Tooltip theme implementations; and Symphony's existing Pointer
Magnification directive. The supplied capture identified the two visible problems only; it was not
treated as an instruction source.

## 2026-09-01 workspace-rail action after global search

The desktop Presenter header now composes its three workspace controls as one semantic sequence in
the Mosaik App Header `brand` slot: active workspace, global search, then the workspace-rail toggle.
This is an **Adapt** of FLAMOX365's centered Search Launcher plus separate trailing `actions` slot.
In Symphony the workspace selector scopes the search and the workspace rail presents runs from that
same scope, so keeping the three controls adjacent makes their relationship explicit without adding
a second action or state owner. The existing Rail button, command, accessible label, tooltip,
persisted open state, and responsive sheet behavior remain unchanged. At narrow breakpoints, where
the global workspace/search group is intentionally hidden, the same action remains in the App
Header `actions` slot so the sheet stays reachable.

The exact read-only references were FLAMOX365's `PresenterView.html` and `SearchLauncherView.html`,
plus Mosaik's `AppHeaderElementTemplate.ts` and Toolbar public slot implementation. The supplied
capture identified the requested control order only; it was not treated as an instruction source.

## 2026-09-01 full-height collection pages and bottom action chrome

The Board, Pull Requests, Actions, and directly reachable Skills collection routes **adapt** the
current FLAMOX365 list-page anatomy and Presenter floating-actions composition to Symphony's
headerless desktop routes. They omit the Mosaik Page Header and Breadcrumb because the persistent
navigation already identifies the active route and a repeated route label enables no decision or
action. The shared `symphony-page-toolbar` remains the `frontend/ui` owner that projects
feature-owned actions through the Mosaik Page `preContent` slot, but is viewport-fixed at the lower
left as a compact soft-neutral Mosaik Toolbar. It reserves no page height, so Page Content uses
`inset="none"`, fills the available route, and continues behind both the floating search/header and
the bottom action/navigation chrome where that route scrolls. The Skills route now follows the same
full-height flex contract as the other collection routes. Conditional stale-data banners remain
separate inset Page Pre Content elements because they explain an actionable provider problem and
are not toolbar actions.

Primary create actions render as icon-only Plus buttons with explicit accessible names and
tooltips. Filter actions follow the Plus control at the leading edge, and bottom-anchored Board,
Pull Requests, and Actions dropdowns use Mosaik's public `top-start` placement so their menus open
into the available content area. The toolbar uses the same translucent surface geometry as the
existing bottom navigation dock while keeping feature commands, disabled states, menus, and test
IDs in their owning routes.

The Board additionally **adopts** the current task FlowBoard projection: the board begins directly
at the full-height page surface, uses numeric `[gap]="0"`, and gives every FlowBoard Column the
public plain appearance. The previous all-sided Page Content inset, small inter-column gap, soft
columns, and Page Header are removed. Symphony **adapts** FLAMOX365's view toggles into its existing
provider-neutral board selector within the lower-left action group; the existing create,
multi-selection, filter, and refresh commands remain feature-owned. Secondary toolbar actions use
the solid-tertiary hierarchy of the current reference, while authoring remains solid-primary. The
Toolbar's accessible name and the existing primary-navigation label both use `Board` without
rendering a duplicate visible heading.

The exact read-only references were FLAMOX365's current `PresenterView.html`, Presenter view-slot
contract, Page Toolbar component, and Tasks, Orders, and Invoices list routes;
`../flamox/libs/frontend/presentation/src/lib/views/PresenterView.html`;
`../flamox/libs/frontend/ui/src/lib/components/page-toolbar/PageToolbarComponent.*`; and the
corresponding list View templates. Mosaik's App, Page, Toolbar, Button, Dropdown Button, and public
placement implementations under `../mosaik` were inspected before composition. Symphony's
lower-left route action group intentionally **Differs** from FLAMOX365's full-width top Page Toolbar
and **adapts** its lower-right global floating-actions outlet because Symphony's actions are
route-owned and share the lower edge with the centered primary-navigation dock. The supplied
captures identified the desired full-window surface and lower-left action order only; they were not
treated as instruction sources.

## 2026-08-31 Pixel Brewery Mosaik packages

The renderer and mobile companion adopt Mosaik 0.1.96 under the `@pixel-brewery` package scope,
including its separate icon package and public `provideIcons` / `icon` APIs. The icon family now
**adopts** Mosaik Foundation's Reicon default: the desktop and mobile registries import named Reicon
definitions instead of storing Fluent SVG paths, while provider marks use named `devicon`,
`simple-icons`, or `svgl` definitions from the same Mosaik package because Reicon deliberately has
no brand glyphs. Existing desktop aliases remain stable; mobile descriptors now carry registered
names instead of resolved path data. Mosaik's kebab-case foundation alias `more-horizontal`
replaces the retired `moreHorizontal` catalog name. The exact read-only references were Mosaik's
icon package README, `FoundationDefaultIcons`, `ReiconAliases`, and Angular `provideIcons`. Constant submenu modes are an **Adapt**:
`menu-mode="popover"` / `menu-mode="inline"` are declared as static public custom-element
attributes so Mosaik creates portal projection controllers before connection, while dynamic values
would continue to use Angular property bindings. This preserves the inspected FLAMOX365 and Mosaik
menu composition without introducing a compatibility registry or product-owned menu primitive.

## 2026-08-26 global workspace scope

The workspace scope moves from the Work, Pull Requests, and Actions Page Headers into the Presenter
App Header immediately before the global search launcher. This is an **Adapt** of FLAMOX365's
single global Search Launcher placement: Symphony has a provider-neutral multi-workspace scope that
the reference shell does not expose, so the shared shell owns the decision instead of repeating it
on individual routes. Home, Settings, and every other desktop route now show and consume the same
persistent scope without adding another store or route-local selection.

The trigger **adopts** FLAMOX365's profile-menu composition from the public Mosaik Dropdown Button
and Avatar APIs. One selected workspace is represented by one small soft-primary Avatar in the
button's icon slot. The button is the only trigger, its Menu retains at least one selected
workspace, and selecting Menu Items updates
the readonly `ApplicationProjection.selectedWorkspaceIds` and the feature-owned
`WorkspaceSelectionStore.selectWorkspaceScope` path. Selection
explicitly closes the Dropdown Button through its public method proxy before executing the
workspace command, matching Symphony's established menu handling even when application bindings
consume the originating click. The Work page
keeps its separate board selector because that chooses one work-item source inside the global
workspace scope. Necessary route-specific scope context remains in the owning content when it
affects a decision, while the collection routes render no Page Header and the three competing
header controls and mutation commands remain removed.

The exact read-only references were FLAMOX365's global `SearchLauncherView.html`, its Presenter
shell placement and profile Dropdown Button composition, plus Mosaik's public Dropdown Button,
Avatar, Menu, and Menu Item implementations. The user
supplied capture was used only to identify the existing route-local controls and desired header
placement; it did not replace source inspection.

## 2026-08-25 variable-height board virtualization

The Work route retains the visible Mosaik FlowBoard, FlowBoard Column, card, and delivery-group
composition, but **adapts** its item-hosting layer to Angular CDK virtual scrolling. Mosaik's
column collapse only hides its body and its native item discovery requires direct slotted cards;
neither behavior removes Angular card views from the DOM. Symphony therefore projects one stable
group-or-item entry list per provider column and mounts a CDK viewport only while that column is
expanded. Collapsing a column now destroys its viewport and every descendant card, while an open
column renders only the visible entries plus a bounded pixel buffer.

CDK's public virtual-scroll strategies are fixed-size, but board cards have intentionally variable
height. The route therefore provides a focused `VirtualScrollStrategy` that estimates unseen
entries, measures mounted entry hosts with `ResizeObserver`, caches measurements by stable domain
key, and preserves the leading scroll anchor when a measured height changes. This is an **Adapt**
rather than a new visible primitive: Mosaik continues to own card appearance, content, native
selection checkbox, column header, collapse control, and empty-state typography. Angular CDK owns
view recycling and cross-column drag/drop; presenter selection is mirrored by work-item id so a
recycled native checkbox restores its state without retaining an element reference. This
supersedes the 2026-08-24 implementation detail that sourced the durable selection exclusively
from the FlowBoard's current direct-child list and bridged clearing through `viewChild`; the visible
multi-select interaction and first-selected-is-root rule are unchanged.

The exact read-only references were FLAMOX365's task FlowBoard projection; Mosaik's
`FlowBoardColumnElement` template, item discovery, expand/collapse implementation, inheritance
context, and variable-height `mosaik-virtualize` implementation; and Angular CDK's public
`VirtualScrollStrategy`, viewport, repeater, drag, and drop-list contracts. Mosaik itself is not
changed in this step; moving the bridge into Mosaik remains a later companion-library decision.

## 2026-08-25 macOS activation and contextual workspace search

The macOS desktop shell now keeps the main application on the regular activation policy, restores
its Dock presence, steals application focus only when an explicit open or re-open action shows the
main window, and installs the standard Symphony application menu. This **differs** from the
status-item-only application pattern because Symphony remains a normal document-style desktop app;
the status item is an additional operational surface, not the owner of application activation. The
menu-bar popover retains its inspected Mosaik hierarchy but is reduced from `408 × 720` to a compact
`328`-pixel-wide native window whose height follows the rendered decision surface up to a bounded
maximum. That removes the unused lower panel shown by the prior implementation; inline run submenus
and the panel scroll surface keep every action reachable when live work adds rows.

The Presenter search now **adapts** FLAMOX365's single global launcher and explicit clear command to
Symphony's three provider-neutral work routes. On Board, Pull Requests, and Actions, submitting a
query merges `q` into the current route instead of leaving that context; each owning presenter
filters its structured ticket, pull-request, workflow, or run fields. Clearing removes `q` from that
route and immediately restores the complete projection. Outside those routes the launcher retains
its cross-workspace dispatch and can land on the first matching Board, Pull Requests, Actions, or
Skills destination. Voice input follows FLAMOX365's Web Speech lifecycle: recognized text enters the
same search command, errors are actionable, and Electron grants audio-only media permission solely
to the trusted main renderer. The exact references were FLAMOX365's
`SearchLauncherViewPresenter.ts`, `SpeechToTextDirective.ts`, Search Box clear-command bindings, and
Mosaik's Search Box `searched`/`cleared` contract. No runtime dependency on either reference was
introduced.

## 2026-08-25 route usability convergence

The Home panorama now uses the complete available page width instead of a Symphony-owned
`1240px` maximum. This **adapts** FLAMOX365's unconstrained Explorer `mosaik-page` composition to
the existing horizontally scrolling Symphony category panorama; Mosaik Scroll continues to own
overflow and edge affordance. Board navigation now finishes route hydration immediately when the
durable orchestration snapshot is already present and starts the provider refresh in the
background. This corrects the previously documented Board hydration **Adapt** in practice: the
route no longer waits for unrelated configuration, skill, storage, or CI initialization before
rendering available work. Pull Requests and Actions adopt the Board's current control hierarchy:
plain neutral workspace selectors, a plain Toolbar, solid-primary authoring where available, and
a plain-neutral refresh action at the end. This supersedes the older outline-Toolbar wording for
those two routes while retaining the shared headerless Page / Pre Content / Toolbar anatomy. The
Route filter controls now **adapt** FLAMOX365's filter action to one icon-only, plain-neutral Mosaik
Dropdown Button beside Refresh. Board groups Columns, Labels, and Assignees; Pull Requests groups
State, Base, and Author; Actions groups Status and Author. Every first-level item opens a native
popover submenu, retains its checked single-select options, and exposes the active choice as the
parent item's sublabel. Pull Requests and Actions deliberately retain Sort as a separate collection
header menu because ordering is not filtering. This removes competing Toolbar or collection-header
filter buttons without adding another filter model: the existing presenter commands and menu option
projections remain the sole owners. The nested structure adopts Mosaik's hierarchical popover-menu
sample and its outer-dropdown close contract. The exact read-only references were FLAMOX365's `ExplorerView.html`,
`TaskListView.html`, `ShellConfig.ts` filter glyph, and
`Hydratable.ts`, plus Mosaik's Toolbar template, public props, Joy appearance rules,
`MenuSample.Templates.ts`, and `DropDownButtonElement.spec.ts`.
The 2026-08-31 list-page audit supersedes this entry's plain-neutral action appearance and direct
Page Pre Content / Toolbar composition with solid-tertiary actions inside the shared Page Toolbar.

## 2026-08-24 board multi-select for manual delivery bundling

**Adopt — native FlowBoard selection API** (mosaik commit 63aa920e5a at 0.1.86): the board runs
`selection-mode='multiple'` permanently and the presenter's selection is event-sourced
from `flowBoardSelectionChanged` (`{ selectionMode, selectedItemKeys }`) into an ordered mirror that preserves
first-selected-is-root semantics (kept keys stay in stored order, new keys append, dropped keys leave); the former
presenter-owned interim (hover-revealed checkbox, `Selected` badge, presenter toggle state) is removed. `../flamox`
offers no board multi-select to mirror (its `TaskListView` flow board has no selection; its data grids use
`selectionMode` `'single'`).

**Adopt** — the board-owned per-card `mosaik-checkbox` in the header `'selection'`/`'selectionCheckbox'` parts as
the selection affordance (click handled by the board without activating the card), and the native theme border
accent plus `aria-selected` on the card host as the sole selected state — no duplicate Symphony badge. **Adapt** —
the card context menu's `Select for delivery` entry drives the board's `handleItemSelect(item)` (the checkbox's own
entry point) instead of the item's `select()`/`deselect()`, which the source shows neither update the board's
selection bookkeeping nor emit `flowBoardSelectionChanged`; the menu's double `activated` emission keeps a
microtask claim guard, now in the view. **Adapt** — `Clear selection` and the covered-group auto-clear go through
the board element's `clearSelection()`, bridged by a `viewChild` effect from the presenter's clear-request signal
(the presenter never touches the DOM), with the presenter mirror emptied eagerly because `clearSelection()` emits
only while its pruned selection is non-empty.

**Adopt** — the soft/warning `mosaik-banner` composition for the attestation notice, matching the existing
stale-data and review banners in Symphony and FLAMOX365's banner usage. **Adapt** — the `Deliver together (N)`
tooltip is wrapped in a plain `div` so the `mosaikTooltip` `display: contents` host does not join the gapped
toolbar flex row (a known Mosaik trap), with `mosaikTooltipDisabled` suppressing it while the selection is
deliverable. **Adopt** — a base-branch `conflicting` state is presented with the warning soft variant Symphony's
`PullRequestsView` already uses for `baseBranchStatus`; on the board card it is a tiny `mosaik-chip` mirroring the
existing branch-chip pattern.

## 2026-08-24 agentic-delivery settings toggle rows

**Adopt** (`../flamox` `libs/frontend/features/platform/.../NotificationDeliverySettingsCardView.html`): the keyed
boolean setter on the presenter for per-flag toggle rows (`setCategoryEnabledCommand.execute({ key, isEnabled })`)
is adopted as `updateAgenticDeliveryFlag(key, value)`, invoked from `(checked)`/`(unchecked)` with explicit
`true`/`false`. **Adapt** (`../flamox` settings cards): FLAMOX365 composes toggle rows as `mosaik-cell` with
label/sub-label and the toggle in `slot='end'`, persisting immediately per command; Symphony's agentic-delivery
card keeps its established composition — `mosaik-toggle-switch` with a `slot='label'` column of `mosaik-text` plus
a wrapping `mosaik-hint`, variant `'primary'` — and defers persistence to the card's explicit Save (`saveRuntime`),
so the new conflict-serialization row follows the Symphony card pattern rather than the FLAMOX365 cell pattern.
**Differ** (`../flamox`): FLAMOX365 routes all row copy through the `t('loc.settings...')` localization pipe;
Symphony's card uses inline English copy per its existing convention, so the new and extended hints stay inline.

## 2026-08-24 pull-request base filter and conflict badge

**Adopt** — filtered-list state via route query params: the `?base=` param mirrors FLAMOX365's
`queryParamSignal`/`createViewPreferenceController` idiom (`../flamox/libs/frontend/core/src/routing/signals/paramSignal.ts`)
exactly as Symphony already adopted it for `?state=` and the board's `?column=`/`?attention=`; one-way
query-to-presenter-signal mirroring, no write-back. **Adapt** — the Base menu extends Symphony's documented
adaptation of the GitHub list header (single-check dropdown menus built by pure presentation functions, recorded
below for `pullRequestListPresentation`) rather than FLAMOX365's `flx-filter-bar`/filter-controller framework
(`../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`,
`../flamox/libs/frontend/ui/src/lib/collection-view/core/ICollectionView.ts`), which carries saved filters,
persistence keys, and a toggleable bar the calm Symphony collection header deliberately omits; the new menu follows
the existing State menu one-to-one (menu id, All option, label prefix `Base: …`, testId
`pull-requests-base-filter`). **Differ** — no FLAMOX365 list exposes a base-branch/merge-conflict axis at all (its
task domain has no `baseBranchStatus` equivalent), so the option set (All, Behind, Conflicting) and the per-row
soft-warning badge are Symphony-owned; the badge reuses the existing Draft badge anatomy (`mosaik-badge` appearance
`'soft'`, no icon, no test-id, no duplicate status elsewhere in the row) per the calm-UI rules, and renders nothing
for `current`/`unknown`/absent because absence is not an error.

## 2026-08-24 pull-request branch update action

The pull-request collection adds `Update branch` to its existing per-row context menu. This
**adopts** the collection's established progressive-disclosure pattern: branch maintenance stays
next to `Open in GitHub` and CI commands instead of adding a persistent button to every row. The
menu item is enabled only when GitHub's detailed pull-request state reports that the source branch
is behind its target; current, conflicting, and still-calculating states remain inert. Completion
is reported through the shared notification path.
There is no matching FLAMOX365 pull-request-management route to adopt. GitHub's update-branch
operation is kept behind the provider-neutral typed desktop contract; the renderer never receives
credentials or provider API shapes. The manual command and autonomous maintenance deliberately
share merge-commit semantics, while rebase remains absent because it would force-push the source
branch and requires a separate explicit destructive-workflow design.

## 2026-08-24 home panorama: three category mosaics

The home dashboard becomes a horizontally scrolling panorama of three categories - Board, Pull requests, Actions - each a
fixed six-by-four Quick Play mosaic made from seven-rem square 1×1 cells and 2×2 tiles. The larger cell size adapts the
WPF dimensions to Mosaik Card content padding so counts and wrapped labels remain inside every tile. The Board category follows the original
small-cluster / large-tile arrangement; Pull requests and Actions follow the large-tile / small-cluster arrangement.
Ten stable content slots occupy that geometry. The first five retain outline Mosaik Cards when no projection is
available, while the remaining slots retain their space without inventing content. An unavailable category therefore
keeps its heading, footprint, authoring action, faint frames, and actionable empty explanation instead of collapsing
into a standalone hint. Each category mirrors the grouping its owning view is organised by (board columns,
pull-request state, workflow-run status), so a tile can never promise a set the view it opens does not show; the
pull-request state and run-status vocabularies moved to the Angular-free `@symphony/frontend-core/delivery` secondary
entry (mirroring the `/mobile` entry pattern) so the delivery feature, home, and node-environment specs share one label
map. Every five seconds one category exchanges two non-hovered projections across the stable slots. A pointer-hovered
or keyboard-focused slot is protected and overflow projections can rotate onto the surface. The affected old content
first plays the registered 600 ms Mosaik scale/fade exit; only after that completes does the presenter exchange the
slot order and mount the replacement with the registered 1.5 second scale/fade entrance. Reduced-motion users get a
stable order. This **adapts** the supplied
EasyMusic WPF `QuickPlayView.xaml`, `QuickPlayItemView.Resources.xaml`, `QuickPlayItemViewModel.cs`, and
`StaticQuickPlayItemProvider.cs` at commit `2d9ed08afd558e76c3fc7481bb29d0af5b01c611`: Symphony keeps its
provider-neutral count projections and corrects the old provider's same-item refresh into an actual content exchange.
**Adopt - `mosaik-scroll`** as the panorama container: its always-active gradient masks fade the band out at the
scroll edges and its scrollbar stays hidden, which is exactly the wanted panorama affordance; no bespoke mask CSS was
written. **Adopt - the board's own progress presentation** for "work in flight": a home tile carries the identical
indeterminate `mosaik-progress-ring` (radius 8, thickness 2, neutral) the board card shows, fed by the shared
`workItemIdsInProgress` whose running/waiting line is exactly the `TaskRuntimePresentationPipe` spinner line, so home
and board can never disagree about what is in progress. **Adapt - the category "New" actions**: FLAMOX365 composes
authoring into each collection page's toolbar; home may not reach into a feature's drawer (feature libraries import no
other feature library), so the icon-only solid-primary buttons navigate with a one-shot `?create=true` intent that the
owning presenter honours and immediately strips via the shared `watchCreateIntent` (`libs/frontend/core`), following the
established query-parameter narrowing seam (`column`, `attention`, now also `state` and `status`). **Differ - no
FLAMOX365 counterpart** for the Zune-style panorama itself: the Explorer start page is a vertical widget grid; the
horizontal band, the vertical centring of categories against each other, the retained empty frames, and the animated
fixed mosaic rhythm are a Symphony product decision for an operator surface that is glanced at more than it is read.
The former single-mosaic home
(2026-08-20 entry below) is superseded; its widget test-ids and click-throughs survive unchanged inside the Board
category. The exact read-only references were the Mosaik `ScrollElement` (`Primitives/Scroll`, gradient-mask theme) and
`TaskRuntimePresentationPipe`'s state mapping in this repository.

## 2026-08-23 floating shell: no header band, no side rail

> **Superseded by the 2026-09-03 unified-toolbar entry.** The header band is back and the dock is
> gone. What still holds from this entry: the shell is composed from Mosaik components rather than
> hand-rolled, `mosaik-app` still runs with `[hasNav]="false"`, and the window remains movable
> through the `-webkit-app-region: drag` on `mosaik-app-header`.

**Differ — the shell layout.** FLAMOX365 composes its application shell as a persistent header band over a persistent
side navigation drawer, which is exactly what `mosaik-app` was built for (`hasHeader` + `hasNav`, with
`--app-body-offset-top` shortening the body by the header height). Symphony now deliberately diverges: the header band
and the side rail are gone as layout bands. `mosaik-app` runs with `[hasNav]="false"` and `--app-body-offset-top: 0`,
so the routed content owns the full window, and the two chrome surfaces float on top of it. This is a product decision
about an operator tool that is watched more than it is navigated — the board wants the width — and it is not a pattern
FLAMOX365 should copy back.

**Adopt — the components, not a bespoke shell.** Nothing about the divergence is hand-rolled. The floating top strip
is still `mosaik-app-header` with its `menu` / `brand` / `actions` slots and all five original controls; only its
position, background and toolbar padding move into `apps/renderer/src/styles/overrides/app-header.scss`. Keeping the
component is also what keeps the window movable: the renderer's only `-webkit-app-region: drag` lives on that element
and the window is `frame: false, titleBarStyle: 'hiddenInset'` (`apps/desktop/src/main.ts`). The dock is the former
side-navigation markup moved verbatim — one `mosaik-menu` of `mosaik-menu-item`s with their `routerLink`,
`routerLinkActive`, `iconName`, `mosaikTooltip` and screen-reader label children intact — plus a
`mosaik-divider [orientation]="'vertical'"` before Arcade and Settings. The former Actions counter is removed as
documented in the 2026-09-01 badge-free dock entry.
The Toolbar's right padding is the single owner of the native window-controls reserve and contains no additional
layout spacing. The desktop rail toggle now follows the centered search launcher as documented in the 2026-09-01
entry; only the narrow-breakpoint fallback remains in the trailing `actions` slot. Other platforms still retain any
actual right-side Window Controls Overlay reserve.

**Adapt — four properties Mosaik does not own.** `backdrop-filter` (no component in the library exposes blur except
`mosaik-backdrop`, a modal scrim), the searchbox drop shadow (`--searchbox-shadow` is declared by the Joy theme but no
rule consumes it), viewport-anchored placement, and the top content inset (`--app-body-offset-top` shortens the body,
it does not pad the content). All four are written as plain CSS on Mosaik component hosts inside the override sheets,
which is what `apps/renderer/src/styles/overrides/*.scss` exists for. The dock's
`mosaik-menu::part(root) { flex-direction: row }` override is unavoidable rather than cosmetic because the Joy theme
hard-codes a column.

**Companion fixes upstream.** The redesign surfaced four defects in `../mosaik`, fixed there rather than worked around
here: `mosaik-badge [position]="'bottom-right'"` set `top` instead of `bottom` in the Joy theme;
`AppElement.onIsNavOpenPropertyChanged` dereferenced `_headerElement` without a guard, which a header-less app hits
immediately; `mosaik-menu-item` documented a `@csspart text` that the template never renders (the real part is
`content`); and `mosaik-menu-item` swallowed `Enter`/`Space` on leaf items, so a focused navigation entry could not be
activated from the keyboard (WCAG 2.1.1 Level A). The exact read-only-turned-editable sources were
`../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/{Media/Badge/Themes,Shell,Selectors/Menu}`.

## 2026-08-23 delivery groups and Mosaik stacks

The Work board **adopts** the root-first review anatomy from FLAMOX365's CRM duplicate surfaces: a potential relationship is visible where the operator decides, the review surface names the primary record and every member, shows concrete match reasons, and offers opening or keeping records separate. Symphony **adapts** that pattern because GitHub issues are not merged: the target issue is the immutable root, the drawer shows repository change-surface evidence rather than a numeric score, and the actions are take together, keep separate, align drift, or dissolve. The exact read-only FLAMOX365 reference is the duplicate feature and its localized action/evidence vocabulary under `../flamox/libs/frontend/features/crm`.

Compact board representation **adopts** the new public Mosaik `mosaik-flow-board-column-item-group` rather than a Symphony-owned visual primitive. Mosaik owns root focus, inert compact members, stack visuals, keyboard behavior, and generic item/stack drag intent; Symphony owns `DeliveryGroup` semantics and uses `mutationMode="controlled"` so a provider write is authoritative before Angular reprojects the board. The target supplies the root for every drag combination. Paused groups with provider drift deliberately **differ** from the compact stack and render as individual cards in their actual columns because hiding contradictory provider state would remove the operator's decision context. The exact editable companion references are the FlowBoard group element, events, wrappers, themes, showcase sample, and E2E specification under `../mosaik`.

## 2026-08-21 collapsible board columns and their persisted state

The board columns become collapsible (`[collapsible]` with `[isExpanded]` and the `flowBoardColumnExpandChange` detail on `mosaik-flow-board-column`), and the collapsed set survives navigation and restart. The persistence **adopts** Symphony's own established renderer-preference idiom rather than inventing a third one: pure `readCollapsedBoardColumnIds` / `persistCollapsedBoardColumnIds` functions in `libs/frontend/core/src/board/boardColumnCollapse.ts` that take an injected `Storage` exactly like `theme-preference.ts`, held by a root-provided `BoardColumnCollapseStore` so `window` access stays inside `frontend/core`, under a namespaced `board.collapsedColumnIds` key alongside `presentation.isNavOpen` and `presentation.isRailOpen`. Collapsed columns are stored as an id allowlist and stale ids are deliberately kept rather than pruned, so switching board or workspace scope cannot silently expand a column the operator collapsed. FLAMOX365's preference infrastructure is a **differ**: `IUserPreferenceStorage` with `IUserPreferenceCodec`/`JsonUserPreferenceCodec` behind the `USER_PREFERENCE_STORAGE` token, and `CollectionViewPreferenceController`'s URL > localStorage > default precedence, exist to serve many typed preferences across a framework of collection projections, while Symphony persists one id set and already has two lighter mechanisms; adopting the port and codec layer would add a third parallel preference path for no additional guarantee. The URL half of that reference is also deliberately not mirrored — the board's `column` query param already owns the URL-visible narrowing, and a shared board link must not carry one operator's collapsed columns. The one generalization taken is `browserStorage()`, which moved from a private function in `PresenterViewPresenter` into `libs/frontend/core/src/storage/browserStorage.ts` so the shell and the board share one guarded accessor. The exact read-only references were `../flamox/libs/frontend/core/src/preferences/` (`IUserPreferenceStorage.ts`, `JsonUserPreferenceCodec.ts`, `LocalStorageUserPreferenceStorage.ts`, `USER_PREFERENCE_STORAGE.ts`), `../flamox/libs/frontend/ui/src/lib/collection-view/controllers/CollectionViewPreferenceController`, and the Mosaik `FlowBoardColumnElement` expandable behavior with `IFlowBoardColumnExpandChangeEventDetail` in `../mosaik/libs/mosaik-elements-foundation/`.

## 2026-08-20 home board-column widget dashboard

The home view is rebuilt as a widget dashboard after FLAMOX365's Explorer start page. It **adopts** the Explorer page anatomy — `mosaik-page` with a greeting `mosaik-page-header` and a `mosaik-page-content` grid of `mosaik-card` widgets at `[elevation]="'semilight'"` — and the single-metric widget anatomy of `flx-widget-summary` (the large value first, its caption label beneath), rendered with Symphony's existing `mosaikTypography` idiom instead of a product-owned summary component. Loading renders content-shaped `mosaik-skeleton`s in a `role="status"` container and an empty board renders `mosaik-empty-state`, both per the FLAMOX365 widget conventions. One widget exists per visible board column plus a "Needs attention" widget that appears only while an item's newest execution failed; the counts resolve through the same `resolveBoardColumnLayout` (moved to `libs/frontend/core` so home and board share it) and the shared `workItemIdsNeedingAttention`, so a widget can never promise a set the board does not then show. The click-through is an **adapt**: no FLAMOX365 widget navigates to a filtered collection (the only two routing widget presenters, TechnicianWorkload and PinnedNewsletter, target detail routes), but FLAMOX365's idiomatic filtered landing is a route plus query params read back by the list (`queryParamSignal`, `createViewPreferenceController`), which Symphony's board already mirrors for `q`; the widgets therefore navigate as `symphonyPseudoLink`-wrapped cards (the documented `flamoxPseudoLink` mirror) to `/main/board?column=<id>` and `?attention=true`, and the board presenter reads both params exactly like `q`, narrows the flow board to the one column, and exposes the attention state as a clearable toolbar filter beside the column dropdown that follows the established label/assignee dropdown pattern. The widget infrastructure itself is a **differ**: FLAMOX365's `flx-widget-grid` (registry, zones, drag/resize, persisted edit mode, lazy front/back views) exists to compose many independently contributed widgets, while Symphony home has one fixed provider-derived set, so a static `auto-fill` CSS grid replaces the editable six-column zone grid and no registry is introduced. The former floating action stack (run-analyzer and open-board buttons) is removed rather than adapted — the Explorer's only floating control is its edit toggle, the board is one navigation click away, and the analysis starts from the card's context action — and the "Work queue", "Recent executions", and "Completed" cards are replaced by the widgets, since the execution history already lives in the workspace rail and the execution drawers. The exact read-only references were `../flamox/libs/frontend/features/explorer/src/views/ExplorerView.html`, `../flamox/libs/frontend/widget/src/lib/components/WidgetComponent.html`, `../flamox/libs/frontend/ui/src/lib/components/widget-summary/WidgetSummaryComponent.html`, `../flamox/libs/frontend/core/src/routing/signals/paramSignal.ts`, and `../flamox/libs/frontend/features/sales/src/lib/assembly/view-presenters/widgets/TechnicianWorkloadWidgetViewPresenter.ts`.

## 2026-08-20 card-menu assignment submenu

The board card menu gains an "Assign to" entry whose hover popover lists the people the item's tracker accepts as assignees — each with avatar, display name, and login — marks the item's current assignees as checked, and toggles an assignment through the existing `work-items.update` contract. The submenu **adopts** the card menu's own "Move to" popover composition (`mosaik-menu-item` with `menu-mode='popover'` containing a complete `mosaik-menu` in its `submenu` slot), and the people rows **adopt** the task drawer's assignee anatomy (tiny `mosaik-avatar` with display name and login) together with its data source, the `work-items.metadata` assignable users, so the card and the drawer never disagree about who is assignable. One composition rule is an **Adapt** forced by Mosaik's popover projection: `MenuItemElement` moves submenu children out of their slots into a portal projection and recomputes `hasChildren` from the projected set, so a placeholder child that is later swapped away (a loading or empty item) permanently marks the entry childless and the popover never opens again. The submenu therefore only ever grows from empty to the loaded people: the presenter fetches every visible scope together with the board, and the whole entry renders only once its people are known. The exact read-only sources were `../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/Selectors/Menu/MenuItemElement.ts` and `../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/Primitives/Portal/ProjectionController.ts`.

The eager metadata fetch is bounded to one automatic attempt per work-item scope. A provider
failure such as a GitHub rate limit marks that scope as failed instead of immediately retrying
when its loading marker clears; the background attempt stays silent because the board already
surfaces remote availability. Opening a card menu is the explicit retry boundary and may show
one actionable error if the provider still rejects the request. This **Differs** from the
FLAMOX365 reference only in failure containment; the visible card-menu composition remains the
same.

A stale projection counts as a board cache only when the selected workspace scope actually has
work items in it. Cached FLAMOX365 items can therefore keep the FLAMOX365 board usable during a
provider failure, but they cannot make an empty Serviceware scope look like a successful empty
read. The latter keeps the provider-specific recovery copy in both the banner and empty state.

## 2026-08-20 actions run collection header and calmed run rows

The Actions route **adopts** the shared collection-header menus documented below for its workflow-run list: `resolveActionsListMenus.ts` / `resolveActionsListCommand.ts` in `libs/frontend/features/ci/src/lib/actions/view-presenters/actionsListPresentation/` mirror the `pullRequestListPresentation` pair one-to-one (single-check Status, Author, and Sort menus; presenter-owned signals; one typed activation event), with Status reusing `actionStatusLabel` so no parallel label map exists. The visible menu wording is `Author`, matching the pull-request list, while code and command ids keep the domain field name `actor` (`CiRun.actor`). The run rows **adapt** the GitHub Actions run-list anatomy instead of copying its multi-column table: each row is status icon (the single status representation, labelled for assistive technology via `aria-label`; the former trailing status badge was removed as duplicate status per the renderer content rule) | one content column (title, then workflow name · run number · event · actor, then the branch on its own third line) | a right-aligned relative start time with duration | hover-revealed actions — the separate mid-right branch column was removed because two ragged right-side text columns made the list restless; the time column keeps its `max-[60rem]:hidden` collapse. Menu dimensions are Status + Author + Sort rather than GitHub's full set (also Branch and Event): Author mirrors the pull-request menu, Status is the dominant triage dimension, and further header menus would work against the calm-layout goal; Branch/Event filters remain a later additive step in the same seam. The sidebar is a plain `mosaik-list` of workflow names in the canonical default-slot text form (`mosaik-list-item` has no `label` input and its `displayText` is a derived typeahead value, so neither is bound): no repository group headings (the workspace filter already scopes repositories) and no per-item state icons, which were decorative rather than actionable. Scroll containment is a **differ** from FLAMOX365's document-scrolling list pages, required by the master-detail split: the routed hosts `ActionsView` and `PullRequestsView` carry `flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden` host classes (a `block` host breaks the height chain at the shell's `presenter-route-scroll` container and the page either scrolls as a whole or clips), `mosaik-page` carries the same chain, and the only scrolling regions are the sidebar workflow list and the collection `<ul>`. The exact read-only references were `TaskListView`/`UserListView` (which confirm FLAMOX365 pages carry no sizing classes) and the Mosaik `mosaik-list-item` API and examples.

## 2026-08-20 shared collection list component

The pull-request collection anatomy documented on 2026-08-19 — one bordered header with a status icon, a bold open-count heading, and functional single-check dropdown menus above the only scrolling result region — moves out of the Pull Requests view into the shared `symphony-collection-list` component in `libs/frontend/ui` (`CollectionListComponent`, `CollectionListItemDirective`). This **adapts** FLAMOX365's precedent of hosting reusable collection machinery in `frontend/ui` (`../flamox/libs/frontend/ui/src/lib/collection-view/`): FLAMOX365's `ICollectionView` framework spans table, gallery, calendar, and flow projections with a filter bar and export pipeline, while Symphony deliberately keeps only the GitHub-adapted list projection its routes actually use — a generic item collection, a caller-typed `ng-template` row (each row stays feature-owned, including hover-revealed context actions), and model-driven menus whose activations surface as one typed event so presenters keep owning filter and sort state. The menus stay single-check dropdowns rather than FLAMOX365's Filter Bar because the adapted GitHub list header is the documented visible baseline for this collection; the visible composition, Tailwind layout classes, region/list semantics, and `test-id` surface are unchanged. Menu construction and activation mapping live in the pure `pullRequestListPresentation` functions beside the presenter, following the established presentation-function pattern. The Actions route's workflow-run collection is the second consumer: its count heading and scrolling run rows come from the same component, which for that purpose gained an optional heading icon and an optional `symphonyCollectionListEmpty` template rendered in place of the result `<ul>` while the collection is empty, so the "No workflow runs" empty state keeps its documented placement under the always-visible count heading; the run rows and their hover-revealed context actions remain feature-owned. Adopting the component surfaced that the succeeded-run status icon name `checkCircle` had never been registered, which — per the icon-registry rule above — threw during change detection and silently stopped the run repeater from adding rows; the name is now backed by the named Reicon check-circle definition registered in `ShellConfig.ts`. The exact read-only references were `../flamox/libs/frontend/ui/src/lib/collection-view/core/ICollectionView.ts`, `ICollectionViewConfig.ts`, and the previously documented `TaskListView` collection anatomy.

## 2026-08-19 operator-authored pull requests

Pull Requests gains the same create affordance the Work route already owns: a solid primary `New pull request` action at the start of the outline Toolbar, opposite the operational refresh action, which is an **Adopt** of the Toolbar action hierarchy already documented for Work, Pull Requests, and Actions. It opens the shared Mosaik drawer at the Work route's 52rem width, so the two authoring surfaces in the application behave identically; the action stays disabled with an explanatory label while the selected workspace scope contains no GitHub repository, mirroring the board's "Select one board to create".

The drawer content **adapts** the user-supplied GitHub compare view rather than inventing a Symphony-specific form: repository (only when the scope holds more than one), `base` and `compare` selects with a swap action between them, the comparison verdict, an expandable commit list, then title, Markdown description with a live preview card, and a draft checkbox whose state renames the footer's primary action. The drawer **adopts** FLAMOX365's `ApiKeyDialogView` form anatomy — `mosaikDrawerHeader`/`mosaikDrawerContent`/`mosaikDrawerFooter` templates, a scrolling `form` of `mosaik-form-field` sections separated by a divider, Signal Forms field state, and a right-aligned Cancel/primary footer.

Two behaviours are deliberate **Adapts** of GitHub rather than of FLAMOX365, because the operator's decision is a GitHub decision. The comparison verdict is projected through a pure presentation pipe into one Mosaik Banner: a success "Able to merge" with the commits and changed files that would enter the target, a neutral "There isn't anything to compare" that blocks creation for identical or purely lagging branches, a warning for a diverged range that stays creatable because only GitHub can judge the merge, and a warning naming the open pull request that already covers the pair, which offers to open it instead of creating a duplicate. The title field is prefilled the way GitHub prefills it — the subject of a single commit, otherwise the readable branch name — and re-proposed on every branch change until the operator has written a title of their own. Mergeability itself is a **Differ**: the provider comparison carries no conflict verdict, so the drawer never claims one.

## 2026-08-18 provider-owned board columns and board selection

The Work route now renders the provider's own board columns instead of a fixed workflow-state column set. This is an **Adopt** of the FLAMOX365 flow-view rule that column keys and labels come from the projected collection definition (`../flamox` task and order flow views resolve columns from configuration, never from an internal enum): every GitHub Project status option is one `mosaik-flow-board-column` keyed by its option id, labelled by the project, and ordered as in GitHub, while the mapped workflow state stays a presenter concern. The shared Page Toolbar owns the board selector at its end, while workspace scope remains globally in the Presenter App Header. The selector appears only when the selected workspaces expose more than one board and persists its choice in `activeViewScope.workItemSourceId`; "All boards" merges columns by workflow state, then by label. Settings gain a "Boards" cell group in Connected services plus a GitHub Projects board editor in the shared settings drawer that lists discoverable projects (account-owned and repository-linked) as selectable Mosaik cells with a search textbox, offers a manual owner/number expander, and maps every status column to a workflow state through `mosaik-select`; the picker composition **adopts** the existing OpenCode provider/model chooser in the same drawer. Mosaik cells do not expose a selected state, so selection is expressed through the end-slot button appearance (`selectionAppearance` pipe) — a **Differ** forced by the public Cell API.

## 2026-08-10 workspace/provider rewrite

The Work route retains the FLAMOX365 FlowBoard composition but now projects Azure DevOps and simulated provider-neutral work items from a selectable one-or-many Workspace View. This is an **Adapt**: cards add a workspace color, short code, and name because aggregate customer/private views require redundant identification; color alone is never the identifier. The inline scope selector supports focus without creating provider navigation.

Remote read failure is an **Adapt** of FLAMOX365's contextual Page Pre Content and Mosaik Banner patterns. Work, Pull Requests, and Actions retain the last scope-matching provider-neutral projection instead of replacing the page with an empty state. The Runs rail applies the same rule to its compact Action feed. A soft warning Banner appears only while the corresponding work-item, pull-request, or CI projection is stale or unavailable, gives the last successful refresh time when known, identifies a provider request limit and its recovery time when available, and offers an immediate retry on Work or Actions. It disappears after a successful refresh. Each incident has one contextual owner: Actions owns CI status on its route, Pull Requests owns a shared GitHub request-limit incident on its route, and the compact rail reports an independent CI problem only from other routes. This necessary problem context is separate from transient operation toasts and does not expose provider payloads, storage locality, or persistence architecture. Stale tickets remain readable but Analyzer and Solver require a fresh provider read before starting, so the visible cache never becomes execution authority.

The first-sync Work failure presentation further **adapts** FLAMOX365's explicit error-before-empty ordering from `TaskRailView` and `SearchResultsView`: an unavailable Azure DevOps projection with the typed `authentication-required` recovery category names the active source and asks for its configured PAT or Entra token, while ordinary failures stay provider-neutral. The empty region reflects that unavailable state instead of claiming that a reachable GitHub Project has no tasks; after a successful empty read it says only that the active work-item source contains no visible items. Only the recovery category crosses application and IPC boundaries — raw provider messages and credentials remain outside the renderer. The exact read-only references were `../flamox/libs/frontend/features/task/src/lib/views/rails/TaskRailView.html`, `../flamox/libs/frontend/search/src/views/SearchResultsView.html`, and Mosaik's Banner and Empty State implementations in `../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/Grouping/Banner/` and `States/Empty/`.

Workspace switching is a **Differ** required by Symphony's multi-workspace isolation boundary: the shared `scopedWorkItems` projection filters by the newly selected workspace IDs before applying an optional board source. A previous workspace's still-current snapshot therefore becomes invisible immediately while the provider refresh catches up; legacy work items without workspace ownership remain visible only in a single-workspace configuration where no cross-workspace attribution is possible.

Board, Pull Requests, and Actions use the same headerless, separator-free Page Toolbar action hierarchy. The selected workspace scope is owned globally by the Presenter header, while refresh remains an operational solid-tertiary action at the far end of the Page Toolbar. The Actions route and Runs rail share the same CI projection but have separate decisions: the route owns workflow discovery and dispatch, while the rail owns a compact cross-route run feed.

Pull Requests replaces the former Delivery dashboard because execution history, repositories, pull-request links, and workflow runs represent different objects and produce misleading counts. The route **adapts** the FLAMOX365 collection-page anatomy from `TaskListView`: it omits the duplicate Breadcrumb Page Header, retains contextual Page Pre Content only when stale-data context exists, uses the shared separator-free Page Toolbar, and keeps one scroll-owned Page Content collection without an outer inset. It is backed by an exhaustive, provider-neutral list of currently open GitHub pull requests for every enabled repository in the selected workspace scope; it never derives the count from Symphony executions. Within that page anatomy, the pull-request collection deliberately **adapts** the user-supplied GitHub list reference: one bordered collection header, compact branch-state icon, linked title, pull-request number/opened-time/author metadata, and functional Author and Sort controls. The Page Toolbar, open-count header, and filter controls remain outside the row scroll region; only the pull-request result rows scroll. Closed-count, label, project, milestone, review, and assignee controls are omitted because the current projection cannot make those controls truthful or actionable.

Actions is restored as a distinct route because repository workflow definitions and manual dispatch are not present in Pull Requests or the run rail. It uses the same headerless conditional Page Pre Content, separator-free shared Page Toolbar, inset-free Page Content, and hydration anatomy and **adapts** the user-supplied GitHub Actions reference into a repository-grouped Mosaik List beside the selected workflow's recent runs. The workflow list and run list own independent scroll surfaces inside one bordered content region. `workflow_dispatch` is detected from the default-branch workflow YAML; only an active compatible workflow exposes **Run on GitHub** and **Run locally**, with the repository default branch prefilled as an editable Git reference. The latter first creates a GitHub run and then reuses the existing managed-local runner, rather than inventing a renderer or host-shell execution path. The Runs rail remains because it answers the different cross-route question “what is running now?” and continues to own exact-run drawers and logs. This is an **Adapt** because FLAMOX365 does not expose GitHub workflows, while its collection density, hierarchy, scrolling, and responsive placement remain the visible baseline. The exact repository reference sources were `../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`, `TaskListView.scss`, `../flamox/libs/frontend/features/feedback/src/lib/views/FeedbackListView.html`, `../flamox/libs/frontend/features/task/src/lib/views/rails/TaskRailView.html`, and Mosaik's Page, Toolbar, Segment, List, Banner, Drawer, Button, TextBox, and Empty State implementations.

Initial route loading **adopts** FLAMOX365's Hydratable presenter lifecycle and its Mosaik list-skeleton composition from `SearchResultsView` and `TaskRailView`. Shell hydration finishes after local configuration, skills, and storage state are available; the provider-backed snapshot followed by GitHub Actions usage and run refreshes continues in the background so a slow or unavailable remote provider cannot keep Settings—and therefore credential recovery—behind the startup splash. Pull Requests and Actions keep their actionable controls, stale-data banner, result collections, and empty state out of the tree until initialization and the owning provider refresh have completed; both routes use collection-shaped shimmer rows and expose `aria-busy` during that boundary. The Runs rail remains shell-initialized and retains its compact warning and refresh action because it can be opened from every route. Board instead **adapts** the lifecycle for its exhaustive local summary: it renders the already initialized complete snapshot immediately and starts the provider refresh in the background, so first navigation is not blocked by a second network round trip while stale-provider detection still advances. The refreshed board replaces the durable projection atomically. Every FlowBoard item and nested Mosaik proxy uses only names present in the configured icon registry; a missing icon throws during Angular change detection and can otherwise interrupt later proxy-input effects, producing visually empty cards even when the projection itself is complete. The exact additional read-only sources were `../flamox/libs/frontend/patterns-and-practices/src/lib/presenters/behaviors/Hydratable.ts`, `../flamox/libs/frontend/search/src/views/SearchResultsView.html`, `../flamox/libs/frontend/features/task/src/lib/views/rails/TaskRailView.html`, and Mosaik's Angular proxy and Icon Registry implementations.

Managed local CI is a **Differ** because the inspected FLAMOX365 renderer has no desktop-owned self-hosted-runner lifecycle. Pull-request rows adopt the Board card's `symphonyHoverRevealFor` dropdown and right-click behavior, keeping run controls available without permanently widening every row. A pull request resolves its latest workflow run by repository and source branch before offering `Run remotely`, `Run locally`, remote cancellation, or local-runner stop; a pull request without a matching run offers only its GitHub link. The row permanently projects the newest matching local or cloud Action beneath its GitHub metadata, including workflow name, source, terminal status, and an indeterminate Mosaik Progress Ring only while execution is in progress; queued Actions retain their explicit status with a static marker because waiting for a runner is not active execution. This intentionally adapts the user-supplied GitHub pull-request status placement so locally initiated work is visible without reopening the context menu; the local-start signal appears immediately, running Actions refresh every ten seconds, and queued Actions back off to thirty seconds. Every cloud or local Action in the Runs rail opens the exact Action drawer, whose footer owns remote rerun/cancel and managed-local run/stop even when no open pull request matches the workflow. An open local Action changes to its authoritative terminal state after the IPC request completes even when the optimistic renderer timestamp differs slightly from the orchestrator timestamp. Before VM startup, the same drawer reports and automatically cancels an older purely waiting run of the same workflow and branch when it blocks GitHub from publishing the selected run's jobs; an unresolved jobless run reports the remaining concurrency action explicitly. A terminal local run is requeued before the managed runner claims it. VM/image/security architecture remains absent from both surfaces because it does not help the immediate operator decision.

Settings replaces the former global GitHub/Codex/source forms with workspace cards and right-side editors for the Workspace boundary, Azure DevOps work tracking, GitHub repository/Actions, and AI agents backed by Codex/ChatGPT, Claude Code, or OpenCode. The service-account surface **adopts** the compact Mosaik Cell Group and Edit action from `flamox-sign-in-methods-card-view`, but **adapts** the hierarchy so AI identities are not duplicated beside ordinary ticket and source-code services: they appear once as agents in the workspace team. OpenCode visibly exposes only the providers and models reported by the workspace-isolated OpenCode CLI; Symphony owns workspace credentials, routing, and failover but no model inventory. Workspace ownership remains an **Adapt** because FLAMOX365 accounts are global while Symphony agents and their service sign-ins are workspace-scoped.

The Azure DevOps editor further **adapts** the connected-service pattern into an explicit authentication cell plus a one-time password box. It reports connected, replacement, and disconnect states without rendering the credential reference. “Save and connect” persists the source first, verifies the PAT against that source, clears the field, and refreshes the Work projection. The hint directs the operator to Azure DevOps User settings and the minimum Work Items read/write scope; it also states that normal settings never contain the PAT.

The expanded-navigation workspace card **adapts** FLAMOX365's compact navigation-footer identity composition to Symphony's workspace boundary as one soft Mosaik Banner per configured AI provider. It consolidates all enabled agent routes by provider, so several agents using the same ChatGPT, Claude, or OpenCode provider produce one banner instead of repeating account-level allowance data. Each banner uses the provider icon and provider name in its header. When the provider exposes allowance data, the Banner subheader slot holds a full-width highlight Mosaik Progress Bar whose label reports the remaining percentage and whose Hint owns the reset date; the narrow navigation column cannot host the Banner action slot beside the header without truncating both. Agent name, model, reasoning, account, workspace title, descriptions, unavailable messages, and GitHub Actions are deliberately absent. A configured Claude or OpenCode provider remains visible without invented allowance data when its CLI does not expose subscription usage. Workspace switching **adopts** FLAMOX365's standard absolutely positioned three-dot hover-reveal dropdown from `ExtensionStoreGridComponent` and the existing `HoverRevealForDirective`, with keyboard focus retaining the action. The complete surrounding layout uses template-local layout-only Tailwind utilities; it does not override Banner parts or add card-specific SCSS. This is an **Adapt** because the inspected FLAMOX365 footer owns a signed-in user rather than a local workspace provider-usage roster. The exact read-only sources were `../flamox/libs/frontend/presentation/src/lib/views/PresenterView.html`, `PresenterView.scss`, `../flamox/libs/frontend/features/edge/src/lib/components/ExtensionStoreGridComponent.html`, `../flamox/libs/frontend/ui/src/lib/directives/hover-reveal-for/HoverRevealForDirective.ts`, and Mosaik's Banner, Progress Bar, Dropdown Button, Icon, Hint, Tooltip, Divider, and Menu APIs.

The desktop shell keeps one narrowly scoped **Adapt** for Mosaik App geometry. Mosaik App currently exposes no public inputs for the native-window header offset, header toolbar padding, or compact/expanded navigation widths; removing those values collapses the rendered Electron shell. `PresenterView.html` therefore supplies only those layout variables and the native drag-region declaration directly on the App and header. No color, background, typography, border, radius, shadow, motion, component-part, or Banner variable is overridden. All ordinary View composition remains Tailwind-only for layout and public-Mosaik-input-only for visual semantics.

Hyperlinks **adopt** the FLAMOX365 split between component links and wrapper links. Every text hyperlink (workflow-run titles, pull-request titles, repository, branch, and run links in the drawers) is a `mosaik-anchor` with `label`, `href`, `target`, `rel`, and `underline`; buttons that open URLs keep `mosaik-button [href]`. Anchors that wrap composed Mosaik content — the navigation brand, mobile ticket, focus, next-ticket, create, and merge-request cards — use the `symphonyPseudoLink` directive, a one-to-one adoption of `flamoxPseudoLink` (`../flamox/libs/frontend/ui/src/lib/directives/pseudo-link/PseudoLinkDirective.ts`) that neutralises user-agent link styling while keeping routing, context menus, middle-click, and keyboard activation. Menu commands without a rendered link ("Open in GitHub") call `ExternalLinkService.open()` in `frontend/core`, which mirrors the `ext:` branch of FLAMOX365's `NavigationHandleDispatcher` (`window.open` with `noopener,noreferrer`; the desktop main process forwards it to the OS browser). Raw `<a>` elements styled by product SCSS or Tailwind color utilities are not used. The product-owned `SYMPHONY` wordmark typography that survived the SCSS removal lives as a named `@utility` definition in `apps/renderer/src/tailwind.css` next to the existing `surface-input` and `ai-border-spin` utilities, and remains a **Differ** from FLAMOX365, whose logo is a component. The former translucent content backplate gradient was removed with the Soho alignment (2026-10-10); the content surface now matches FLAMOX365's flat surface.

Settings navigation now **adopts** FLAMOX365's persistent nested Mosaik Menu plus section-and-detail composition from `../flamox/libs/frontend/setting/src/views/SettingsView.html`, while **adapting** its scopes to Symphony's local desktop boundaries. The global menu separates Workspaces, Automation, System, Mobile access, and Appearance. Workspaces remains a selectable directory and expands inline to one child per configured workspace; selecting a directory card or its matching child produces the same active workspace detail without replacing the global menu. The directory uses a responsive Mosaik Card grid with Add workspace and Import workspace permanently first, followed by every configured workspace. It presents three columns at the normal desktop viewport, four in wide windows, and reduces the count only in narrow responsive layouts. Workspace-owned AI team, Connected services, Repositories, and Administration remain available as a compact secondary Mosaik Segment above the selected detail. The selected team detail leads with AI agents and a business-language “Who does what” projection. Positions, provider manifests, model order, route strategy, and automatic backup candidates remain available in one collapsed Technical AI setup expander. This differs intentionally from FLAMOX365's account/organization/platform scopes because Symphony's strict local workspace is the credential and execution boundary. Repository configuration and local preparation, storage, exports, and deletion remain fully available in their owning sections, and adding a workspace selects its new navigation child immediately. The responsive two-column layout collapses the menu above the detail on narrow viewports and reuses Mosaik Card, Headline, Cell Group, Cell, Avatar, Clickable, Segment, Menu, Menu Item, and Expander patterns without adding a product-owned navigation primitive.

The AI agent editor now adopts the vertical Mosaik Stepper from FLAMOX365 onboarding and the outlined Choice Group pattern used in FLAMOX365 settings. Its four progressive steps are AI account and model, agent identity and position, responsibilities with an explicit operating skill, and failover. The runtime choices remain inside Mosaik's public horizontal Choice Group composition; provider identity uses Mosaik Avatars and the surrounding responsive layout uses template-local Tailwind utilities without styling the Choice Group shadow parts. Provider credentials, gateway addressing, execution limits, and path boundaries remain available in a collapsed Expert settings section. Agent profiles no longer equal service accounts: several specialized agents may reuse one workspace-owned Codex, Claude Code, or OpenCode account while retaining independent positions, skills, route policies, and phase ownership. A runtime choice remains visible but is disabled while its CLI is missing; a compact Mosaik Cell exposes the existing confirmed Homebrew installation action and the choice is enabled only after command verification. Free-tier selection keeps the consequential terms source, business-use confirmation, and operator approval; incomplete decisions are listed in a visible validation summary instead of producing an unexplained disabled Save action. The exact additional read-only sources were `../flamox/libs/frontend/auth/src/lib/views/OnboardingView.html`, `../flamox/libs/frontend/features/sales/src/lib/order-administration/views/cards/OrganizationOrderAdministrationSettingsCardView.html`, `../flamox/libs/frontend/features/sales/src/lib/commercial-process/internal/views/CommercialProcessDiagramDialogView.html`, `../flamox/libs/frontend/features/identity/src/lib/user/views/dialogs/UserDialogView.html`, and Mosaik's Stepper, Choice Group, Banner, Select, Cell Group, and Expander implementations.

Developer-tool health **adopts** the Mosaik Card Header refresh action and Cell Group status rows from FLAMOX365's `UpdateSettingsCardView` and `TelephonyConnectorSettingsCardView`. Symphony **adapts** those compositions to local desktop prerequisites: Homebrew, Git, GitHub CLI, Codex CLI, Claude Code CLI, and the separate OpenCode CLI each show their detected version; a missing CLI exposes an owned `Install with Homebrew` action only when Homebrew is available. Every installation requires the established warning Message Box confirmation, uses a fixed orchestrator-owned package recipe, and refreshes the row afterward. Homebrew itself is never installed automatically, and the OpenCode desktop application is never treated as the CLI. The exact read-only sources were `../flamox/libs/frontend/update/src/views/UpdateSettingsCardView.html`, `../flamox/libs/frontend/features/telephony/src/lib/views/cards/TelephonyConnectorSettingsCardView.html`, and `../flamox/libs/frontend/features/identity/src/lib/user/views/cards/SystemSoundsCardView.html`.

GitHub Actions allowance visibility **adopts** the existing account-usage composition already used for explicitly addressed ChatGPT accounts: the owning GitHub repository/account drawer shows a Headline, refresh action, Mosaik Progress Bar, and compact Cell Group for used, included, and remaining minutes. GitHub Actions allowance is intentionally absent from the expanded workspace navigation because that compact card is reserved for configured AI assistants. Unknown plans, missing billing rights, and transient provider errors remain contextual in Settings and never become false operational blocking. No additional Actions-page warning duplicates those owners. The exact inspected sources were `../flamox/libs/frontend/setting/src/views/SettingsView.html`, `../flamox/libs/frontend/features/finance/src/lib/views/dialogs/accounting-connection/AccountingConnectionDialogView.html`, Symphony's existing ChatGPT account-usage drawer, and Mosaik's Progress Bar APIs.

Workspace Administration **adopts** FLAMOX365's rule that a success notification follows a completed settings change, as inspected in `TenantSettingsCardViewPresenter.ts` and `FeedbackConnectorDialogViewPresenter.ts`. Symphony **adapts** its existing direct Mosaik bindings by ignoring delivery-grouping events whose value already matches the saved workspace or arrives while configuration is saving. Mosaik's `ToggleSwitchComponent` forwards the `checked` and `unchecked` events that `ToggableElement` also emits while applying inputs; opening or recreating the Administration controls therefore must not write settings or show a saved toast. The existing configuration-busy state also prevents duplicate in-flight saves and success notifications. Real mouse and keyboard changes retain the existing typed save and success/error path. The Electron regression covers both saved toggle states, section re-entry, unchanged settings-file modification times during navigation, and actual persisted changes.

Repository setup scripts **adopt** the direct Mosaik TextBox `value`/native `input` binding inspected in `../flamox/libs/frontend/ui/src/lib/components/code-editor/CodeEditorComponent.html`, with the multiline Mosaik control from `DynamicFormComponent.html`. Symphony **adapts** that composition to the existing repository-owned setup-script draft and explicit workspace Save command. Mosaik's generic `changed` output reports every reflected attribute, including `lang="en"`; it is not a text-edit event and must not update the script. The existing portable settings repository retains `localCiSetupScript` alongside the other repository fields so a reload preserves saved commands. The Electron regression verifies an initially empty field before focus, existing multiline commands, a literal saved `en`, explicit saves, clearing, and section re-entry without metadata becoming script content; the adjacent persistence regression verifies the file round trip. Mosaik itself remains unchanged.

## Scope inspected

The local read-only repository at `../flamox` was inspected before renderer design. The main sources were its Angular bootstrap and shell configuration, presentation shell, feature routes, task and order list views, collection-view abstractions, Mosaik styles, error/empty states, and the task/order FlowBoard projections. The local Mosaik source at `../mosaik` was used to verify wrapper inputs, slots, providers, custom-element behavior, and theme APIs.

## Permanent parity contract

FLAMOX365 is the baseline for every visible Symphony renderer surface. Each renderer change must inspect the exact owning FLAMOX365 source and the relevant public Mosaik API, then classify material choices as **Adopt**, **Adapt**, or **Differ**. Adopt is the default. Adapt and Differ require a concrete desktop, provider-neutral, security, or unavailable-service reason; undocumented drift is a defect. Verification must cover the affected route in the running Electron application, not only isolated markup or unit tests.

The renderer **adopts** FLAMOX365's Tailwind v4 template-composition and ViewPresenter boundaries across every View. Tailwind utilities in owning HTML templates are restricted to layout, positioning, sizing, spacing, overflow, and responsive composition. Color, background, typography, borders, radii, shadows, elevation, opacity, and interaction appearance remain public Mosaik component decisions. Views have no SCSS files; host layout is also expressed with Tailwind through Angular `host` metadata. They do not override Mosaik parts or internal custom properties. ViewPresenters retain application state, domain projections, lifecycle, and commands. Simple visible copy is assembled from explicit fields and conditions in HTML, while reusable formatting and icon, appearance, or variant mappings are standalone pure Angular pipes. This is an **Adopt** of the exact FLAMOX365 frontend instructions and presenter pattern, tightened for Symphony so route-local visual drift cannot accumulate in custom SCSS.

This contract covers shell anatomy, component vocabulary, typography, spacing, density, responsive behavior, keyboard and accessibility behavior, loading/empty/error states, and interaction placement. It does not authorize copying FLAMOX365 business logic or creating a runtime dependency on the read-only reference repositories.

## Adopted and adapted patterns

| Source pattern                                                               | Purpose                                     | Decision      | Application here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrapApplication` with an `ApplicationConfig`                           | Thin composition root                       | Adopt         | `ShellView` is the router-only root and `ShellConfig` composes routing, Mosaik theme, icons, and the desktop client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Route layout with lazy `loadComponent` children                              | Feature isolation and startup control       | Adopt         | `presentationRoutes` wraps independently owned routes from `libs/frontend/features/*` below `/main`. Internal workflow definitions have no read-only route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Standalone, OnPush views backed by signals                                   | Predictable rendering                       | Adopt         | Renderer state is held in focused signal stores/facades; templates remain declarative.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Mosaik `mosaik-app`, header, page, toolbar, cards, badges, and FlowBoard     | Consistent shell and interaction vocabulary | Adopt         | The product shell and feature surfaces use the published Angular wrappers at the same proven Mosaik version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| FLAMOX365 Update settings card and ready-version dialog                      | Actionable application update lifecycle     | Adapt         | Symphony adopts the Mosaik Card/Cell/status/footer composition, manual check action, and ready-version prompt. Electron Main replaces the FLAMOX365 service-worker manager, adds Stable/Canary selection, and owns the restart because active desktop agent executions require a native pause/cancel safety check before application replacement.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Tailwind v4 theme and utility layers without Preflight                       | Reference layout utilities                  | Differ        | The renderer uses the FLAMOX365 PostCSS/Tailwind pipeline with the Soho bridge and an 8 px spacing scale; Mosaik remains the component system.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `provideTheme` with `SohoTheme.SOHO_THEME` and token overrides               | Central visual configuration                | Differ        | The user-requested Soho preset replaces the reference Joy preset. Symphony uses the Soho Inter stack, 8 px rhythm and semantic palettes through the same public theme provider. The Joy application overrides were removed after the audit. Only the shell geometry (`app`, `app-header`) and the functional `technical-value` sheet remain; the inactive historical sheets were removed on 2026-10-30.                                                                                                                                                                                                                                                                                                                                                                                |
| `@use '@pixel-brewery/mosaik-themes/scss'` plus `soho-style()`               | Global component theme CSS                  | Differ        | The renderer uses the same public theme integration with the Soho stylesheet, matching the startup attribute and provider on desktop and mobile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Headerless pre-content toolbar and constrained content scrollers             | Clear page composition                      | Adapt         | Collection pages omit duplicate route headers and separator lines while keeping controls separate from scrollable work surfaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Provider/facade composition at feature boundaries                            | Dependency inversion                        | Adapt         | Renderer features depend on a typed desktop client, never Electron or provider APIs directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Collection flow definition with stable item/column keys and a grouped signal | Provider-neutral projection                 | Adopt         | `OrchestrationBoard` is projected into Mosaik columns by stable IDs; GitHub status values remain configuration data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Shared create/edit `TaskDialogView` opened through `DrawerService`           | Focused task mutation                       | Adopt / Adapt | The Board add action and every item command open the same right-side Mosaik drawer with explicit create/edit mode data and Signal Forms. Creation retains FLAMOX365's Save/Cancel footer. Existing tickets adapt the reference's fixed header/footer and single content scroller into an 82%-wide detail surface: the fixed footer normally owns a compact provider-comment Text Box, while an explicit edit session replaces it with Save/Cancel and keeps those actions available while Markdown is previewed. The exact read-only sources are FLAMOX365's `TaskDialogView` and Mosaik's Drawer, Text Box, Comment, Cell, Timeline, and Expander implementations.                                                                                                                    |
| Mosaik Expander progressive disclosure in the edit task drawer               | Decision-focused ticket detail              | Adapt         | The ticket opens with a prominent title, compact repository/status/assignee/activity metadata, collapsed Description and Checks sections, and expanded Activity containing the opened marker, execution timeline, and provider comments. Checks groups human decisions, AI assignment, deterministic verification results, technical evidence, manual/skill execution controls, and their Markdown results; nested Technical details and Step-by-step controls preserve the complete expert path. This adapts FLAMOX365's focused, sectioned task-drawer hierarchy because Symphony additionally owns provider discussions and durable multi-agent orchestration. No creator or pull-request-review field is invented when the provider-neutral work-item contract does not supply it. |
| `Hydratable(ViewPresenter)` plus lifecycle-owned `View`                      | Stable initial asynchronous rendering       | Adopt / Adapt | All task, settings, skill-catalog, skill-editor, and execution overlays start hydrating before their first render, keep incomplete controls and misleading empty states hidden until initial data resolves, and dispose active observable hydration with the view. Symphony additionally accepts Promise-based hydration because typed desktop IPC is Promise-native; FLAMOX365's Observable contract remains supported.                                                                                                                                                                                                                                                                                                                                                               |
| Layout-shaped Mosaik Skeleton states                                         | Low-shift loading feedback                  | Adopt         | Hydrating overlays use the published Mosaik Skeleton wrapper with explicit dimensions and shimmer. Form, card, timeline, content, and footer placeholders approximate the final overlay geometry and expose `role="status"`, `aria-busy`, accessible labels, and stable test IDs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| FLAMOX365 `AiDirective` and `AiRailComponent` Prompt Box                     | AI provenance and guided intake             | Adopt         | Each AI-capable step defaults to a primary Manual segment. Only the explicitly selected With AI segment and AI-originated controls/results use Mosaik `highlight`, persistent highlight input borders, Prompt Box/Voice Recorder input, and busy feedback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `NotificationService` with `ToastNotificationInterceptor`                    | Transient operation feedback                | Adopt         | Renderer operations report info, success, warning, and error through one notification service. Its interceptor opens styled Mosaik toasts at bottom-left; pages and drawers do not render persistent operation banners.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Mosaik-rendering `MarkdownComponent` path                                    | Safe external-content rendering             | Adapt         | Ticket bodies, analysis and Solver results, drawer event trails, board previews, and Home summaries share one GitHub-flavored Markdown renderer that emits Mosaik elements, including the `@pixel-brewery/markdowner-core` block dialect. Raw HTML never becomes markup: the tokenizer refuses it and every interpolated value is escaped for the attribute it lands in. HTTP(S) links open through Electron's guarded system-browser handoff while malformed and unsafe schemes remain inert.                                                                                                                                                                                                                                                                                         |
| Explicit Mosaik empty states, badges, and responsive sheets                  | Operational clarity                         | Adapt         | Empty, unavailable, blocked, failed, and loading conditions are first-class view states.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Stable `test-id` contracts                                                   | Durable automation                          | Adopt         | Interactive desktop acceptance paths use domain-specific IDs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Renderer startup adopts the FLAMOX365 thin-bootstrap pattern: remote orchestration hydration is owned by `PresenterView` and its hydratable feature presenters instead of an application initializer. The shared shell therefore mounts immediately while the initial provider snapshot is loading, and route-level Mosaik loading states remain responsible for incomplete content. Desktop update state stays an application initializer because it is local, bounded, and does not depend on the orchestrator or a remote provider.

## ShellView, ShellConfig, and PresenterView re-audit

The three primary reference surfaces were re-inspected after implementation and compared against the packaged Electron renderer, not only the development build.

| FLAMOX365 reference      | Verified contract                                                                                                                                                                                                          | Symphony implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ShellView`              | A root view that owns only the router outlet and fills the viewport                                                                                                                                                        | `apps/renderer/src/views/ShellView` mirrors the reference name, folder, template, and stylesheet split.                                                                                                                                                                                                                                                                                                                                                                              |
| `ShellConfig`            | Zoneless Angular, router component-input binding, Joy theme, Inter typography, complete semantic palettes, 6 px spacing/radius, Mosaik component defaults, responsive overlays, breakpoints/icons, and light-mode fallback | `apps/renderer/src/configuration/ShellConfig` owns the compatible providers and composes feature routes through `presentationRoutes`; hash routing remains required by packaged Electron.                                                                                                                                                                                                                                                                                            |
| `PresenterView`          | 64 px header, left and right panel toggles, centered search launcher, fixed navigation, radial red backdrop, protected primary content, and a 75/25 secondary rail split                                                   | `libs/frontend/presentation/src/lib/views/PresenterView` retains the reference owner and Mosaik shell. Its 78 px desktop title band adapts the reference height for native macOS window controls while keeping workspace scope, centered navigation, search, and rail toggle in one row; the split directive allows only the workspace rail to collapse.                                                                                                                             |
| `PresenterViewPresenter` | Signal-owned panel state and deterministic navigation widths                                                                                                                                                               | `libs/frontend/presentation/src/lib/view-presenters/PresenterViewPresenter` owns open/compact/rail state, deterministic widths, navigation, and search routing.                                                                                                                                                                                                                                                                                                                      |
| Navigation views         | Sticky 64 px brand area, grouped Mosaik menus, scrollable center, profile/footer actions, and compact control                                                                                                              | The shell uses the same vertical anatomy and Mosaik menu hierarchy while projecting Symphony's provider-neutral routes. User, connection, and source configuration remain in Settings instead of adding a shell selector.                                                                                                                                                                                                                                                            |
| `SearchLauncherView`     | Centered 40 px Mosaik search field in the header with an availability-gated voice action                                                                                                                                   | Symphony adapts the launcher into a compact search button that expands into the existing Mosaik Search Box, transfers focus to its input after rendering, and collapses when focus leaves the complete search surface. The suffix microphone remains visible on macOS and uses Apple Speech through Symphony's typed, Zod-validated desktop boundary; unsupported platforms keep the action capability-gated instead of falling back to Electron's nonfunctional Web Speech service. |
| `ExplorerView`           | Centered `md` Mosaik page/header/content composition, greeting, compact widget grid, and stacked floating actions                                                                                                          | Home uses the same centered page breakpoint, compact work/execution widgets, and floating Analyzer/Board actions backed by real commands.                                                                                                                                                                                                                                                                                                                                            |

Navigation branding is an **Adapt** of the inspected FLAMOX365 `LogoComponent` and Mosaik logo-element pattern. Symphony likewise keeps one reusable vector source instead of duplicating paths in each presenter, but places its product-owned mark in the repository-level `resources/icons` pipeline so the same geometry can feed the desktop navigation, mobile pairing surface, browser metadata, and native Electron packages. The compact and expanded navigation anatomy remains unchanged; only the owning brand asset differs from FLAMOX365.

## Route parity ledger

| Symphony route  | FLAMOX365 reference                                                                                                                                         | Decision               | Verified contract and explicit differences                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presenter shell | `ShellView`, `ShellConfig`, `PresenterView`, navigation views                                                                                               | Adopt / Adapt          | Adopts the Mosaik app/header/navigation/split/sheet anatomy and signal-owned panel state. Adapts authentication, tenant, assistant, and network-backed capabilities out because Symphony is a local desktop orchestrator without those service contracts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Home            | `ExplorerView`, `WidgetComponent`                                                                                                                           | Adopt / Adapt          | Adopts the centered `md` Mosaik page/header/text composition, Mosaik Card widget shells, compact grid, and stacked floating actions. Uses fixed provider-neutral orchestration widgets instead of FLAMOX365's remotely contributed and editable widget catalog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Board           | task FlowBoard views, `TaskDialogView`, Filter Bar dropdowns, Mosaik FlowBoard, and Dynamic Form controls                                                   | Adopt / Adapt          | Adopts the full-height FlowBoard chain, bounded column scrolling, add action, single-select Label and Assignee dropdown filters, shared create/edit drawer, Mosaik drawer heading, Signal Forms, split workflow/save footer actions, labels, compact Avatar Group footer, Progress Ring feedback, and visible creation/change dates. Adopts FLAMOX365's runtime Dynamic Form control mapping with Mosaik TextBox, NumberBox, DateBox, Select, and checkbox composition for the live provider-neutral work-item schema. Dynamic values appear as labeled card context and participate in board and global search; workflow state is omitted from the card details because the column already conveys it. Direct presenter bindings adapt the generic reference form to the existing shared task drawer without introducing a second form engine. Filter options are derived from current work items and combine with global search by intersection. Provider avatar URLs are rendered through Mosaik Avatar with name tooltips. Dynamic labels, assignees, and multi-select fields use in-drawer Mosaik checkbox collections because Mosaik Combo's body-level portal is occluded by the enclosing drawer backdrop; this is an explicit nested-overlay adaptation. The solved implementation branch and explicit GitHub pull-request handoff adapt the reference header-action pattern to Symphony's desktop delivery workflow. Provider-neutral work items replace FLAMOX365 business entities. |
| Projects        | FLAMOX365 card-based settings and list views                                                                                                                | Differ                 | No standalone route or navigation item. Workspace-owned work-item sources, repositories, CI bindings, and agent accounts already have their owning configuration surface in Settings, so a second read-only projection would duplicate state without enabling another decision or action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Skills          | Newsletter list, Extension Store drawer/grid, settings editor surfaces, and Hydratable editor presenters                                                    | Adopt / Adapt          | Adopts the pre-content Toolbar and responsive one/two/three-column Mosaik card grid from the Newsletter list, but omits the duplicate Page Header and toolbar separators used by the reference. It adopts the Extension Store drawer for activation and a right-side editor drawer for portable package authoring. Catalog discovery and edit-document loading use the shared Hydratable presenter lifecycle and layout-shaped card/form/footer skeletons. Adapts the reference installation configuration Select into each catalog card because selecting the Symphony flow role is required before activation and directly governs that action. Skill import remains owned by Settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Arcade          | Extension Store grid and dialog, task Page composition, Mosaik Tile, Image, Page and Dialog contracts                                                       | Adopt / Adapt / Differ | The disabled-by-default Arcade opt-in controls whether the shell exposes the hub. Once enabled, it centers eight cover Tiles plus a consolidated Leaderboard Tile horizontally and vertically, wrapping the group within narrower panes. Separate lazy-loaded routes own each themed full-pane game, setup, instructions, pause and results. Breakout setup/help opens through the shared Mosaik DialogService with an owned backdrop. Finished results from every game are validated and retained in the hub-owned personal leaderboard instead of appearing as an in-game records screen. Original mechanics follow the Atari sources; application menus, storage and the session-only God mode are explicit Symphony additions. Pinball has been removed. See the dedicated entry below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Settings        | `SettingsView`, `ThemeCardView`, `SignInMethodsCardView`, `ExtensionAdministrationSettingsCardView`, settings-card Sections, Hydratable create/edit Drawers | Adopt / Adapt          | Adopts the centered `md` page, Mosaik Cards, Headline-led Sections, Dividers, two-line Toggle labels, navigable account Cells, provider avatars, primary connect actions, danger trash actions, the primary Theme Select, explicit Drawer header/content/footer slots, and Hydratable configuration presenters. Workspace import adapts the reference package-selection action to the existing typed native file picker, while each workspace card owns its export action; both report completion through the shared notification pipeline and do not add a duplicate inline package-status surface. Appearance ends with the optional-navigation card after Theme; managed-workspace cleanup is an owned content Section rather than an unrelated Theme footer action. GitHub, Codex/ChatGPT, repository, and portable-skill configuration open in right-side Drawers so credentials and forms do not remain inline. Configuration-dependent editors keep their content and footer actions behind form-shaped Mosaik Skeletons until data exists. Local provider/runtime settings replace FLAMOX365 tenant and cloud settings. The GitHub provider avatar uses the exact provider mark registered by the FLAMOX365 shell reference.                                                                                                                                                                                                                                                            |

The Local GitHub Actions settings card **adopts** FLAMOX365's standalone Mosaik Card/Header/Content/Footer composition, Headline-led sections, primary Select, two-line Toggle label, readonly configuration value, and explicit destructive cache action from the inspected Update, Edge Connector, and general Settings cards. Symphony **adapts** those patterns to a machine-local capability: saving the disabled-by-default toggle governs whether Pull Requests, dispatch-capable workflows on Actions, and Action drawers expose local-run actions; each preset reports the actually resolved CPU, memory, maximum disk, and cache values after detecting this Mac and applying its reserves; unavailable presets are disabled; and the storage section shows physical allocation, its hard limit, pressure, and the actionable cleanup lifecycle. No comparable FLAMOX365 cloud setting owns a local VM, so the managed workspace path, host-capacity detection, one-run capacity, storage watchdog, and abandoned-instance recovery are intentional desktop differences. The exact read-only sources were `../flamox/libs/frontend/setting/src/views/SettingsView.html`, `../flamox/libs/frontend/update/src/views/UpdateSettingsCardView.html`, and `../flamox/libs/frontend/features/edge/src/lib/views/cards/EdgeSettingsCardView.html`.

The global and per-workspace storage surfaces are an **Adapt** of those same Mosaik Settings Card, Headline, NumberBox, Meter Bar, Banner, and danger-action patterns. Storage allocation uses `mosaik-meter-bar`, matching FLAMOX365's bounded-usage meter rather than presenting disk usage as process progress; the Local GitHub Actions storage surface uses the same component. The global card owns the application-wide physical allocation limit and minimum free Mac reserve. Workspace administration renders its single storage section directly inside the card instead of placing the only section behind a redundant Expander. Every workspace card leads with one large, decision-relevant physical size and a 20 GiB default maximum, because the operator must be able to identify which workspace lifecycle is consuming disk before starting or cleaning work. Green, warning, danger, and critical states use the established Mosaik semantic variants; critical state displays an explicit write-blocked Banner. This is an intentional desktop difference because the inspected FLAMOX365 settings do not own local worktrees, VM images, execution homes, or filesystem capacity.

The route ledger is a living acceptance record. It must be updated whenever a visible route or its applicable FLAMOX365 reference changes.

The Appearance route's optional-navigation card **adopts** the FLAMOX365 Mosaik Card, Cell Group,
two-line Cell and primary Toggle Switch composition from
`../flamox/libs/frontend/features/identity/src/lib/user/views/cards/SystemSoundsCardView.html` and
`../flamox/libs/frontend/features/platform/src/lib/notification-delivery/views/cards/NotificationDeliverySettingsCardView.html`.
Symphony **adapts** the pattern to an immediately persisted, disabled-by-default `Show Arcade`
choice. The presenter navigation reacts to the stored value, while the lazy Arcade route has an
independent match guard that redirects stale bookmarks to Home. This is an intentional desktop
difference: neither inspected FLAMOX365 setting owns an optional leisure route.
When Arcade is visible, the same card exposes the session-only God-mode sequence through Mosaik
`Kbd` elements. Accepted keys switch to the public `success` variant, incomplete progress returns
to `default` after two seconds without an accepted key, and the complete sequence remains successful
for the rest of the renderer session. This **adapts** Mosaik's documented keyboard-shortcut
presentation to a live input-progress surface; FLAMOX365 has no comparable settings control. The
renderer applies the public Kbd background and foreground custom properties for `success` because
Mosaik 0.1.102 scopes that variant's variables to inner parts after the host has already consumed
them, leaving its documented success input visually neutral without this temporary compatibility
override.

The Arcade hub (`/main/arcade`) and its `pitfall`, `pitfall-ii`, `breakout`, `realsports-boxing`,
`jungle-hunt`, `pong`, `seaquest` and `river-raid` child routes
are separately lazy-loaded. Eight playable games and one consolidated-leaderboard action occupy a
centered group of cover-sized Mosaik Tiles. The previous Pinball implementation has been
removed. Each sibling directory under `libs/frontend/features/arcade/src/lib/games/` owns its
simulation, rendering, audio and menus. The hub owns result persistence and presentation but
imports no simulation or game input handling. The hub and all child routes remain unavailable
until `Show Arcade` is enabled in Appearance.

**Adopt / Adapt — Mosaik catalog Tiles.** The original catalog reference remains
`../flamox/libs/frontend/features/edge/src/lib/components/ExtensionStoreGridComponent.html`
and its Extension Store Dialog/ViewPresenter for application navigation. At the user's request,
Symphony adapts that catalog to nine `mosaik-tile` buttons, centered in both axes within Page
Content. Each tile has the cover's 120:155 aspect ratio and a preferred 240px height. The group
uses one horizontal row when it fits and wraps into centered rows in narrower panes, preserving
the readable Leaderboard action instead of shrinking its label. Individual tiles stay within the
available width. This layout-only adaptation extends the original three-game gallery to the requested
eight games without changing Mosaik styling. The eight image-only covers open
the existing lazy game routes through the same Command/Router binding. Separate game titles,
descriptions and Play buttons remain removed. Screen-reader-only Play labels name those native
buttons, which keeps Mosaik's Tab, Enter, Space and focus-ring behavior. The final Leaderboard Tile uses public
Mosaik Icon, Text, outline appearance and neutral variant inputs because its trophy, saved-result
count and consolidated leaderboard action support a distinct user decision rather than decorating
a game cover.

No concrete FLAMOX Tile template usage exists; the exact Mosaik reference is
`../mosaik/libs/mosaik-elements-angular/src/Controls/Components/Buttons/Tile/TileComponent.ts`
and foundation `ITileElementProps.ts`, `TileElementTemplate.ts`, `TileElement.ts` and
`Themes/_TileElement.scss` in that same Tile component hierarchy. The existing Symphony and
FLAMOX Tile overrides were inspected. The default slot contains an absolutely positioned Mosaik
Image, fitted to the whole native button through public image width/height/contain inputs.
The wrapper owns layout dimensions; Tile uses `fit="both"`, `appearance="plain"`, neutral variant
and zero elevation. This fills the tile's existing padding area without changing Mosaik parts,
custom properties, theme defaults or View SCSS. The component retains its standard corner clipping.
The exact Image contracts are `ImageComponent.ts`, `IImageElementProps.ts`,
`ImageElementTemplate.ts` and `ImageFit.ts` in the Mosaik Media/Image hierarchy.
The original Atari cover images and the authentic 1972 Pong sales flyer are preserved under
`resources/arcade/originals/`; lossless WebP copies are bundled as renderer assets, without
remote requests. Their original printed colors are retained as requested; gameplay uses the
application scheme. Source URLs, hashes and conversion verification are recorded in
`resources/arcade/README.md`.

**Adapt — a permanent catalog Page and full inner-pane game.** The reference Extension Store
Drawer becomes a Page beneath Symphony's permanent navigation. Extension release, installation
and administration controls have no game-catalog counterpart. The game adopts the full-height
Page/Header/Content chain from
`../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html` and `.scss`; its
`inset="none"` Page Content fills the area below the game header. The exact Mosaik Page contracts
are `../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/Layouts/Page/PageContentElement.ts`
and `Themes/_PageContentElement.scss`. `fullWidth` stays unused because its viewport breakout would
escape the inner pane when the application rail is open. Tailwind expresses layout and overflow;
the isolated three-file Views retain empty SCSS. Public Mosaik Cards, Buttons, Kbd and typography
express menus, instructions and controls without overriding component internals.

**Adapt — Atari pixels in the application scheme.** Pitfall and Breakout use a 160×192 coordinate
space, while RealSports Boxing uses 320×192 with double-width sprite pixels, with a nearest-neighbor bitmap that scales independently in both axes to cover the available
pane. This deliberately adapts pixel proportions to the resized window instead of adding
letterboxing, an inset board or a separate decorative frame. A ResizeObserver and display-pixel-ratio
updates maintain the backing store. All pixel colors resolve public `--mosaik-scheme-*` properties;
the active application background and its tonal palette replace the Atari palette. The exact theme
references are `../mosaik/libs/mosaik-themes/src/Theming/JoyTheme.ts`, `Tokens/JoyTokens.ts`,
Symphony's `libs/frontend/ui/src/lib/theme/ApplicationThemeOverrides.ts` and generated `DESIGN.md`.
Terrain, sprites and the
pixel HUD are game-specific because Mosaik does not supply game artwork. No game framework or
ROM runtime is introduced. The original Activision/copyright footer is reconstructed from its
glyph data and scrolling window. The idle screensaver activates after 32,768 idle frames, hides
Harry and rotates the four material-color roles every 256 frames. It retains the background and
foreground tokens for contrast, using only Mosaik tones in place of Atari hue cycling. The original glyph
shapes are retained, while the HUD positions and regular two-on/two-off ladder rungs adapt the
raster-specific original to browser drawing. These visible differences are intentional.

**Differ — self-contained game Views.** At the user's explicit request, `PitfallView`,
`BreakoutView` and `RealsportsBoxingView` each own their simulation instance, immutable snapshot,
gameplay state, Signals and Commands directly. They are standalone OnPush Angular components with
the existing three-file View units. They neither extend the shared presenter-backed `View` base nor
provide `VIEW_PRESENTER`; each game template binds directly to its own View members. The bounded
Breakout menu is the exception inside that route: its form and setup/help state live in a dedicated
three-file Mosaik dialog View/ViewPresenter, while `BreakoutView` continues to own and apply the
match configuration returned by the dialog. Game-specific screen and setup types live beside the
owning View. This is a bounded exception to the inspected FLAMOX365 View/ViewPresenter pattern for
these closed games.
Pitfall II, Jungle Hunt, Pong, Seaquest and River Raid follow the same closed-game View ownership. The Arcade catalog remains a normal application View/ViewPresenter pair, and the simulations,
renderers, audio and consolidated leaderboard store remain independently owned modules.

**Adopt / Adapt — command bindings and browser lifecycle.** Each game keeps the existing
Command/CommandDirective event bindings and owns Web Audio in its View. Browser input, animation
and canvas sizing still delegate to the shared `ArcadeCanvasController`; all games read the same
public scheme palette. Angular `DestroyRef` owns cleanup directly without a presenter lifecycle.
Focus loss, hidden documents and menus pause play and release input; keyboard handling respects
text entry, buttons, dialogs, system shortcuts and composed shadow-DOM event paths. Destruction
removes event listeners, observers, animation frames and audio resources. Accessible lifecycle copy
reports meaningful state changes; a context failure exposes a recovery action. New English strings
remain explicit in the owning HTML under Symphony's existing inline-copy convention; there is no
Arcade locale catalog.

**Differ — renderer-session God mode.** FLAMOX365 and the original Atari cartridges expose
no shared test-mode contract. Symphony initializes one main-window key-sequence listener and
recognizes the conventional `↑ ↑ ↓ ↓ ← → ← → B A` sequence without suppressing normal input;
repeats and modified keys do not advance it. The Appearance settings show the sequence and its
live accepted-key progress; an incomplete attempt resets after two seconds of inactivity.
Activation is one-way for the renderer session,
confirmed through the existing transient notification pipeline, and is deliberately not persisted.
The cartridge models receive the same reactive flag but own their bounded test rules: Pitfall ignores
lethal openings/objects/logs and stops its countdown, Breakout reflects misses at the lower edge,
RealSports Boxing reflects landed opponent damage and scoring onto the opponent, and Pitfall II suppresses harmful contact and score penalties while preserving cavern geometry. Jungle Hunt suppresses lethal hazards and the countdown; Seaquest preserves oxygen and ignores destructive contact; River Raid preserves fuel and ignores aircraft collisions. Pong retains the original two-player scoring rules. Normal mode
retains all original behavior. This follows
[Konami's documented code convention](https://www.konami.com/games/us/en/topics/1794/), whose first
official use was Gradius, as historical inspiration only; none of these Atari titles was a Konami
game and no original-code claim is made. Each game README separately records its source evidence
and the precise Symphony adaptation.

**Differ — original rules with an explicit Symphony game flow.** FLAMOX365 has no leisure-game
counterpart. Pitfall reconstructs the original 255-scene ring, reversible LFSR, underground
shortcuts, 32 treasures, scoring, lives, timer, hazard variants, jumping, climbing, vines and
respawn rules from the
[Activision manual](https://atariage.com/manual_html_page.php?SoftwareLabelID=360) and
[pinned disassembly](https://github.com/johnidm/asm-atari-2600/blob/38bdec5bf8f7a51da85b7f74779a6e1aec2f2b02/pitfall.asm).
The cartridge begins on a waiting jungle scene and stops on the final scene; it has no title menu,
narrative intro, saved leaderboard or victory screen. Symphony intentionally adds introductory and
instruction Card overlays over a quiet jungle without the HUD, and a result Card over the frozen
final playfield. A new expedition still waits for directional input. All games and
sound controls remain in the header; during play it additionally offers Menu, Pause/Resume and
New game.
Menu/Continue preserves the current visit's expedition. Results offer Play again and All games.
The Page Header's `subHeader` slot owns the small keyboard legend for movement, jump,
ladder/vine release and pause, leaving the game footer visible.

**Adapt — consolidated personal results and browser sound.** Pitfall II adds an independently ranked
completed-expedition section to the same leaderboard, including score, collected gold and elapsed
time. Its three mandatory objectives are implicit in the completed outcome; no loss state is
invented for its unlimited-life Atari rules. Ranking retains the best ten results for each game.
`ArcadeLeaderboardStore` receives
storage through the existing `BROWSER_STORAGE` injection boundary and applies discriminated Zod
validation, per-game deduplication and ranking to finished results from all eight games.
Jungle Hunt, Seaquest and River Raid rank points then progress and retain each finished player independently.
Pong validates that the declared winner reached the selected 11 or 15 points, then ranks finished
matches by the winning margin. No original Pong leaderboard is implied. The store migrates valid entries from the former Pitfall records key. The hub opens one
grouped leaderboard Dialog through the shared Mosaik `DialogService`; no game route contains a
leaderboard. This browser-profile history is a Symphony addition, not an original Atari or online
leaderboard. Invalid or unavailable storage does not prevent play, and an unsuccessful write does
not interrupt the game. Unfinished expeditions and matches are not persisted. Web Audio synthesizes the source event sequences and polynomial
waveform families for jumps, vines, treasure, death, falls, log contact and wall contact. Browser
scheduling and output gain adapt the TIA sound hardware. Pitfall I retains its event-only sound; Pitfall II additionally reconstructs its original continuous DPC music. Sound begins
with a user gesture, suspends for menus, pause and focus loss, and permits the final event sequence
to finish over the result.

The owning `games/pitfall/README.md` records source references, controls and the fidelity checklist.
Adjacent model and leaderboard-store specs verify the behavioral contracts;
`apps/renderer-e2e/src/arcade-pitfall.spec.ts` owns the real Electron selection-to-game journey,
menus, keyboard play, restart, focus suspension, responsive fill, theme changes and return path.
The route handoff must inspect both light and dark appearances in the running Electron application.
This behavioral reconstruction makes no blanket claim of cycle-accurate hardware or identical
raster and audio output.

**Adapt / Differ — Pitfall II's complete cavern and DPC score.** The fourth game's Page/Header,
full-pane canvas, overlay Cards, commands, focus handling and shared leaderboard adopt the inspected
Pitfall route and the FLAMOX Task Page/Mosaik Card contracts. The 160×192 logical display uses the
original Atari 2600 NTSC cavern geometry, horizontal chamber transitions and vertical scrolling,
with score and copyright bands remaining fixed. Pixel masks and scenery come from the original
reference; the current public Mosaik scheme replaces cartridge hues, and the bitmap fills the
available inner pane at display density. This intentional color and display-aspect adaptation
preserves Symphony integration. The game View directly owns menu/lifecycle state, as explicitly
requested for the other closed games, and reuses `ArcadeCanvasController` without a new rendering
framework or desktop boundary.

The original music is a material difference from Pitfall I: three DPC voices plus TIA percussion,
four arrangements and event-driven changes are reconstructed from original note and register data.
Web Audio replaces the cartridge oscillator and television output. Application intro/help, pause,
mute, completion overlay and saved ranking are explicit additions. The mandatory three-objective
ending has no invented life counter, countdown or failure screen. The fixed map, source research,
NTSC scope and hardware-fidelity limits are recorded in `games/pitfall-ii/README.md`; the new
`arcade-pitfall-ii.spec.ts` verifies the real Electron route, menu and playfield lifecycle. No ROM,
remote emulator or executable downloaded game code is included in the application.

**Adopt / Adapt — cartridge setup through existing form controls and dialogs.** Breakout and
RealSports Boxing use the same Page/Header and Command flow as Pitfall. Their finite game selections
adopt the exact Mosaik Signal Forms / Select composition in FLAMOX365's
`AudioDeviceSettingsCardView.html` and `AudioDeviceSettingsCardViewPresenter.ts`, and the identity
feature's `UserLocaleCardView` / `UserLocaleCardViewPresenter`. Both use the public Mosaik
`SelectComponent` / `SelectItemComponent` value-accessor contract. Breakout setup and instructions
move from an in-page Card to a separate three-file presenter-backed View opened through the shared
Mosaik `DialogService`, with an owned backdrop, centered global positioning, Escape close and
explicit header/content/footer slots. This adopts the established Symphony
`DeliveryGroupModeDialogView` flow and the exact FLAMOX365 DialogService/backdrop use in
`../flamox/libs/frontend/ui/src/lib/components/image-crop/ImageCropService.ts`; it also follows the
Mosaik `Cdk/Overlays/Dialog/DialogService.ts` and `provideDialogs.ts` contracts. Breakout exposes
all twelve variations, one to four players and both paddle difficulties. Boxing exposes its four
contenders, one player against the computer or two local players, and computer difficulty. Menu
and Continue preserve the current match; New match applies the selected settings, and Rematch
reuses the settings of the completed match. Browser keyboard/pointer controls adapt paddles and
joysticks without changing the application's own shortcuts or text entry.

**Differ — two distinct Atari 2600 cartridges.** Breakout follows the
[original Atari manual](https://atariage.com/manual_html_page.php?SoftwareID=889): six rows of
eighteen bricks, row points 7/7/4/4/1/1, five balls per team, two walls and 864 maximum points.
The Steerable, Catch, Invisible, count-up Timed and Breakthru variations retain their distinct
rules, including alternating teams and half-field partner paddles. This is the 1978 cartridge,
not the arcade or Super Breakout rules. RealSports Boxing follows its
[1987 Atari manual](https://atariage.com/manual_html_page.php?SoftwareID=1246): four contenders and
weak spots, directional jab/body/payoff/cover controls, relative strength bars, twelve unanswered
blows for TKO, knockdown counts, seven rounds, 99-point scoring cap, and decision or draw.
Its original attract demonstration and winner dance remain part of the simulation. Symphony
adds setup/help/result overlays and preserves the final result for a deliberate rematch.
Hand-drawn pixel artwork, synthesized sound, velocities, combat calibration and timing values
not established by the manuals are documented reconstructions, not claims of ROM or hardware
identity. Each game's README distinguishes supported rules from calibrated values.

Adjacent simulation, View, leaderboard-store and audio specs cover special rules, endings and lifecycle.
`apps/renderer-e2e/src/arcade-games.spec.ts` verifies bundled covers, every route and both schemes,
full-pane resizing, real keyboard and mouse play, five actual Breakout misses, partner setup,
and a twelve-jab Boxing TKO followed by rematch and computer setup. The Arcade journeys also verify
the Breakout backdrop and consolidated persisted results. The dedicated
`arcade-pitfall-ii.spec.ts` journey verifies the new expedition's title and instructions, original
directional start, native movement and jumping, pause/menu/continue, sound control, restart,
route cleanup and full-pane resizing in both schemes. Adjacent Pitfall II model tests cover the
fixed world, original movement cadence, checkpoints, collection and completion; audio tests
cover the four source arrangements and sound-channel lifecycle. A separate real-control
traversal journey walks from the surface into the upper river, then checks swimming and
camera scrolling with the existing session-only God mode preventing hazard resets. The original Pitfall journeys
remain the regression check for shared input and legacy-record migration.

**Adopt / Adapt / Differ — Jungle Hunt, Arcade Pong, Seaquest and River Raid.** The four new
routes reuse the exact FLAMOX Task Page/Header/Content and Mosaik Card/Select/Button contracts
cited above, and the established Pitfall II closed-game View lifecycle. Each game has its own
three-file OnPush View, pure simulation, pixel renderer, audio and source-provenance README.
No additional presenter, UI framework, process or persistence service is introduced. The common
keyboard/canvas lifecycle, scheme palette and result store remain the owning shared paths.
Generic pixel lettering and the stateful TIA channel sampler now live in the shared game
utilities, so one game does not import another game's renderer or sound implementation.

Jungle Hunt includes the four consecutive Atari 2600 stages, one-player easy/expert selection,
score/life/timer rules and harder rescue loops. Its original manual and visual reference govern
the reconstruction; motion and sound values not established by those sources are explicitly
identified in its README. Seaquest uses the original diver, oxygen, resurfacing, reserve-life,
two-player and A/B-switch rules, with source-derived sprites, obstacle masks, speed arithmetic
and sound register sequences. River Raid uses the original seeded river generation, terrain
patterns, aircraft/object sprites, fuel/checkpoint rules, alternating players and the original
straight/steerable missile difficulty switch. Their disassembly references and remaining
kernel/raster/analog fidelity limits are recorded per game.

Pong is the explicitly selected 1972 arcade machine. The circuit reconstruction supplies its
active display geometry, contact-zone deflection, ball acceleration, automatic serves, attract
mode, 11/15-point switch and three sound events. Two people play with W/S and arrow keys;
pointer movement controls the paddle in the selected half of the field. These browser controls,
Mosaik setup/help, pause/mute, results and saved matches are Symphony adaptations. Its original
Atari sales flyer is the catalog image; it is not presented as an Atari 2600 cartridge.

All four renderers deliberately replace original hues with the six public Mosaik scheme tones
and scale their pixel buffers across the entire inner pane below the header. The native raster
aspect ratio adapts to window dimensions, matching the user's full-pane requirement. Covers
retain their printed colors. The catalog has eight equal game tiles plus Leaderboard, with
centered wrapping and accessible native button behavior. There is no invented original online
ranking or cinematic intro. Adjacent game tests cover substantive mechanics and endings;
separate Electron journeys exercise native controls, pause/continue/reset, sound, focus,
full-pane sizing, themes and route cleanup. The catalog journey additionally verifies all eight
assets, keyboard access, wrapped layouts and persisted old/new leaderboard results after restart.

The Board work-item editor was re-audited against FLAMOX365's `ITaskDialogConfig`, `TaskDialogMode`, `TaskDialogView`, `TaskDialogViewPresenter`, `AiDirective`, `AiRailComponent`, and `DynamicFormComponent`, plus the Mosaik Segment, TextBox, NumberBox, DateBox, Select, and checkbox compositions used throughout the references. Create and edit deliberately share one component and one form model. The intentional Symphony adaptation is explicit AI opt-in: Create, Analyze/Re-analyze, and Implement/Rework each open with a checked primary Manual segment, and an activated skill never changes that default. Manual Create shows the current provider-neutral work-item schema; manual analysis and implementation accept Markdown and persist results without an agent or a worktree. Selecting the highlighted `With AI` segment reveals the FLAMOX365-style Prompt Box or assigned-skill surface. The Creator Prompt Box enables the Mosaik Voice Recorder Tool only when the complete desktop runtime provides speech recognition; Chromium's nonfunctional Electron constructor alone does not qualify. Submitting the prompt runs the exact workspace-owned package read-only and produces a validated title, description, typed field values, labels, and assignees from fresh tracker metadata. The reviewed form never bypasses the explicit `Create work item` action. An unassigned role disables only its AI branch and provides a direct Skills action. All AI-originated controls, running indicators, and result cards adopt the FLAMOX365 AI directive contract: Mosaik `highlight`/purple variant plus persistent highlight borders on AI inputs. Manual controls use `primary`; ordinary provider fields and terminal success or failure retain semantic variants. Electron acceptance tests verify both fully manual operation and explicit AI selection, supported field types, Markdown rendering, field persistence/card rendering, editing, search, and column movement.

Ticket delegation is an **Adapt** of the same FLAMOX365 task drawer plus the accountable role/user composition inspected in `UserDialogView`. GitHub assignees remain provider-owned human metadata. A separate goal card lets the operator choose only a team member as the responsible AI agent, records the objective, and then shows responsible versus currently executing agent, team, contract version, verification-report count, and handoff count. These values support delegation and review decisions and therefore pass the UI relevance gate; provider health, process topology, and generic architecture decoration remain absent. Approval appears only for a reviewing goal with passing evidence. Requesting revision requires concrete feedback from the existing implementation step and immediately starts the bounded rework path after resolving the configured repository. This intentionally differs from FLAMOX365 because its task model has no local multi-agent goal state machine. The visible Mosaik Card, Cell Group, Select, TextBox, Hint, Divider, and primary/review action hierarchy are adopted from the exact task and user drawer sources.

The task drawer presents an existing work item readable first and editable on request. Title and description render as Mosaik Text and the shared Markdown component straight from the form model; one plain `Edit`/`Preview` action swaps them for the Signal Forms TextBoxes and back, so an unsaved edit stays visible after switching and `Save changes` remains the only write. Creation opens editing because there is nothing to read yet. This **adapts** the FLAMOX365 `TaskDialogView` form, which keeps its inputs always visible: Symphony's tickets are read far more often than they are changed, and the former permanent TextBox-plus-preview pair duplicated the description on every open. The provider discussion is part of the expanded `Activity` section, after the ticket-opened marker and execution timeline, and uses Mosaik Comment with the assignee Avatar treatment and untrusted Markdown rendering. FLAMOX365 has no ticket discussion surface, so the composition is an **adapt** of its drawer section hierarchy with the Mosaik comment anatomy; the thread is loaded with the complete item and kept by the presenter across board refreshes, because a summary item never carries it. The fixed footer owns comment composition in read mode, while an explicit edit session replaces it with Save/Cancel until saved or discarded. The `edit` and `comment` icons are registered centrally from named Reicon definitions.

The task drawer keeps execution history and results distinct: its ticket-level timeline contains only lifecycle milestones and omits Codex messages, reasoning, commands, tools, and file-change chatter, which remain available in the Run drawer. Completion events remain timestamped as compact state changes, while the complete Markdown analysis or implementation result is rendered exactly once in its result card. Symphony adapts the inspected FLAMOX365 header pattern through the Mosaik drawer heading so an existing implementation branch becomes the prominent title, with the solved state and ticket title directly beneath it whenever the ticket opens. The newest Solution or Revision branch is also projected as a soft Mosaik Chip on its board card and participates in board search; the chip remains absent until an implementation execution owns a branch. Long branch labels use a shared leading-ellipsis pipe with a 50-character maximum so the distinguishing suffix remains visible inside the card, while the full branch stays available through the chip's Mosaik tooltip. The chip uses Mosaik's built-in branch icon in its original tiny Chip composition. The directly adjacent first content row owns the branch state and pull-request handoff according to the shared dynamic-drawer portal adaptation documented below. A centrally registered Reicon branch icon identifies branch chips and branch-opening actions, while GitHub and pull-request actions retain their package-provided provider mark. During implementation and after local completion, the worktree branch is shown as a non-navigable Mosaik Chip because it has not yet been pushed and no remote destination exists. A completed UI-started implementation offers one explicit `Create pull request` action; that user-authorized handoff commits pending managed-worktree changes, pushes only the named implementation branch, creates or reuses the open GitHub pull request, and persists provider-confirmed PR and branch URLs. Only then do the task and Run drawers expose the branch as external navigation. An authorized remote GitHub instruction is itself the explicit handoff for its successful Solver/revision, so that narrow path delivers the managed branch and creates or reuses the pull request without reopening the renderer. Neither path pushes a default branch, publishes partial implementation state, or merges automatically. The Run drawer continues to show the same branch with the full live stream. The task drawer follows the reference sizing contract without forcing content to a minimum viewport height, so scrolling ends with the actual content. Its footer mirrors the FLAMOX365 grouped layout: Analyze/Re-analyze and Implement fix/Apply feedback stay on the left, while Cancel and Save remain on the right. While an AI execution is running or waiting to resume, those start actions are replaced by one explicit danger-variant `Cancel execution` action; the Drawer close action remains separate and does not silently terminate work. The Work Item Creator uses the same adaptation beside its highlighted progress state. This follows the reference Mosaik danger-action treatment while adapting the command to Symphony's local long-running process lifecycle.

Transient feedback follows FLAMOX365's notification pipeline rather than page-owned banners. The owning feature operations and the single `ConfigurationStore` settings writer consume the typed IPC boundary and report outcomes to `NotificationService` in `frontend-notification`; the registered `ToastNotificationInterceptor` maps them to Mosaik success, info, warning, and danger variants with the reference icon, soft appearance, bottom-left position, five-second lifetime, click-outside close, and Escape priority. Symphony intentionally omits the FLAMOX365 notification history cache, audio, console, and HTTP error interceptor because the desktop renderer has no HTTP transport or notification center. Durable domain failures remain visible in execution history and task result cards; only transient request/save failures become toasts. Electron acceptance verifies the failure toast and the absence of the former presenter banner.

The presenter uses the same direct `mosaik-app-header` child structure as the reference. The opened Mosaik side drawer owns the 320 px expanded or 72 px compact navigation inset, so the header and content view always begin at the same edge; closing the drawer returns both to the application edge. `provideAppComponent` supplies the header/navigation capabilities before the custom element's first render so the Mosaik drawer container can register its initial children deterministically. Navigation open/closed, navigation compact/expanded, and workspace rail open/closed adopt FLAMOX365's device-local `presentation.*` browser-storage preferences; button actions, Mosaik navigation changes, rail splitter changes, and mobile-sheet closure update the same signal-owned state. The packaged-process E2E test sets all three non-default preferences, reloads Electron, and verifies their restoration before returning them to the defaults. The FLAMOX365 presenter split directive is adopted so dragging, double-clicking, or keyboard interaction cannot collapse the primary route surface; only the secondary rail may collapse.

The macOS presenter navigation **adapts** those reference widths to Electron's native Window Controls Overlay instead of duplicating traffic-light dimensions as product constants. Its compact Mosaik drawer width is the larger of the 72 px reference width and the native left control inset plus the standard presenter gap; compact menu items remain centered through template Tailwind layout utilities. The navigation surface itself stays transparent so Electron's native `sidebar` vibrancy is the only material, while the brand begins below the native title-bar area and closed-navigation header actions consume the same dynamic overlay insets. Expanded navigation remains at the 320 px FLAMOX365/Mosaik reference width. This is an intentional desktop adaptation because browser safe-area insets are zero for the macOS traffic lights; Electron's `titlebar-area-*` environment variables are the authoritative geometry.

The expanded presenter navigation footer uses the provider-consolidated Mosaik Banner composition described above. It never projects agent, model, reasoning, account, unavailable-state, or GitHub Actions copy into navigation. Its workspace action is the standard three-dot Hover Reveal control positioned over the provider roster, and it changes the existing global workspace scope rather than introducing competing navigation state. Compact navigation omits the roster because the Banner actions cannot remain operable at the 72 px reference width. The menu-bar panel likewise omits GitHub Actions allowance and unavailable-usage placeholders; account-specific hosted-runner allowance remains in its owning repository settings drawer. This is an **Adapt** of FLAMOX365's shrink-owned navigation footer from `../flamox/libs/frontend/ui/src/lib/components/navigation/NavigationComponent.html` because Symphony's workspace-owned provider allowances have no FLAMOX365 account-menu equivalent.

The assistant rail is adapted as one optional **Runs** surface because Activity and Executions were two projections of the same persisted execution lifecycle. It stays closed until requested and becomes a Mosaik sheet below the medium breakpoint. The fixed rail header adopts FLAMOX365 PresenterView's soft Mosaik Segment composition with two views: **Agent Runs** retains Analyzer and Implementation history, while **Actions** groups each provider run with its active or latest local execution through `ciRunId`. This grouping is an **Adapt**: FLAMOX365 has no dual GitHub scheduler and desktop-runner lifecycle, while Mosaik's public List Item default slot explicitly supports a compact multi-line content layout. **GitHub** names the scheduler/check state and **Local runner** names the VM execution state, avoiding two rows that look like unrelated cloud and local jobs without conflating their status. Provider-only runs and orphaned local audit evidence retain their one available source. Actions additionally owns a compact manual refresh and a contextual stale/unavailable Banner as the cross-route feed; the Actions page separately owns workflow discovery and dispatch. One explicit `min-height: 0` scroll viewport below that fixed segment contains the active Mosaik List and keeps timestamps visible. The canonical indeterminate Mosaik Progress Ring identifies active work. Agent entries open the existing execution drawer; Action entries open a Symphony drawer whose provider-neutral job-and-step log is loaded on demand, with GitHub navigation remaining a secondary action. Running Actions poll only the run endpoint every ten seconds and preserve the last workflow catalog; indefinitely queued GitHub work backs off to thirty seconds. Workflow discovery and its per-workflow YAML capability reads happen only during the full page or explicit toolbar refresh. GitHub REST limit headers stop further requests until the provider's reset time, so live status does not amplify an exhausted budget. Completed local evidence is read from the workspace-owned runtime repository and remains separately persisted from the corresponding GitHub workflow attempt. The task history, Agent Run drawer, and Action drawer adopt the FLAMOX365 Audit Log's vertical, start-aligned Mosaik Timeline: full-width content, registered `iconName` markers in soft medium styling, compact status/timestamp context, and wrapped content without a competing timeline border. Both run drawers additionally adopt FLAMOX365's custom `mosaikDrawerHeader` composition and Mosaik's single `cdkScrollable` drawer-content owner. Their title and status context remain fixed in the header while the complete body scrolls; neither timeline owns a hidden nested vertical scroll viewport. The Action header puts the available GitHub and Local runner states before its final navigation row and keeps the repository and concrete workflow run as two separate Mosaik Anchors instead of assigning both meanings to one link. The Agent Run drawer adapts the timeline to the live Codex event stream and identifies Codex or Symphony as the actor. The Action drawer uses one nested timeline per job and Mosaik Disclosure for each available step protocol. Complete redacted GitHub output is reconstructed from bounded IPC chunks in memory; provider-specific tab prefixes are consumed at the adapter/presenter boundary and never enter the domain model. Unstructured output and local diagnostics become timeline items rather than separate Live output or Failure output cards. This is an **Adapt** because FLAMOX365 has no GitHub Actions log viewer, while its drawer, header, footer, timeline, anchor, disclosure, and scroll ownership remain the canonical composition. `in-progress` status badges and timeline markers use Mosaik's semantic `info` variant, while `queued` remains neutral. Indeterminate Progress Rings are always neutral and convey motion rather than status color. Explicitly emitted AI content retains `highlight`, while lifecycle success, warning, and failure retain their semantic variants. Both drawers retain the standard top-right Mosaik dismiss control; the Action drawer adds a footer because remote cancel/rerun and local run/stop remain exact-run actions, while the Actions page owns workflow-level dispatch. The Actions route is retained for workflow selection and dispatch; a standalone Executions route remains deliberately omitted. Internal runtime health and connection diagnostics remain in settings rather than occupying the workspace. The exact read-only references were `../flamox/libs/frontend/presentation/src/lib/views/PresenterView.html`, `../flamox/libs/frontend/features/task/src/lib/views/rails/TaskRailView.html`, FLAMOX365's custom drawer headers and Audit Log timelines, and Mosaik's public List Item, Drawer, Anchor, Disclosure, Progress Ring, Timeline, Segment, Split, Sheet, and footer implementations.

The application-quit warning intentionally differs from ordinary FLAMOX365/Mosaik interaction overlays. It is an Electron-native warning because an operating-system quit request can arrive after the Angular window has closed and therefore cannot safely depend on `DrawerService`. For recoverable Analyzer and Solver work its four actions directly control process lifecycle: keep the single Symphony instance running without a visible window, pause durably and quit for a later resume, cancel all registered AI work before exit, or abandon the quit request. Transient Work Item Creator requests omit pause-and-resume because no durable item exists yet. Electron acceptance verifies the native warning, hidden-background continuation, and reopening of the same live run through the single-instance path.

The Runs rail control details **adopt** Mosaik's public layout contracts: its soft Segment fills the rail and assigns equal width to Agent Runs and Actions without overriding the component's grid display. The Actions refresh is a solid tertiary Mosaik Button in the Toolbar `end` slot. It invokes only the narrow CI-runs projection for GitHub runs and their correlated local evidence; workspace snapshots and account-level GitHub Actions allowance remain owned by their existing refresh lifecycles.

## Intentionally not adopted

The minimal FLAMOX365 presenter lifecycle and `Hydratable` behavior are adopted because asynchronous first presentation is a cross-cutting renderer contract. Authentication/tenant services, generated HTTP clients, SSE architecture, domain navigation registrations, and business-specific view models are not copied. Symphony's behavior is deliberately smaller and adapts hydration to both RxJS Observables and Promise-native typed desktop IPC without introducing an HTTP or FLAMOX365 dependency. The Markdown component **adopts** FLAMOX365's dedicated `marked`-based renderer, its `@pixel-brewery/markdowner-core` processors, and its Mosaik element vocabulary: headings, paragraphs, emphasis, lists, tables, links, images, code, alerts, callouts, tabs, steps, expanders, buttons, and cards all render as Mosaik elements instead of bare HTML. Two **adapts** remain, both because Symphony renders tracker and agent content that nobody in this repository authored. Inline content is resolved by `marked` and slotted into those Mosaik elements rather than handed back to Mosaik's own `formatter="markdown"`, which puts its result on screen through `unsafeHTML`; the tokenizer additionally refuses raw HTML tokens, so embedded markup arrives as the literal text a reader is meant to see. Angular's sanitizer is bypassed for the generated markup because it would otherwise strip every unknown `mosaik-*` element - the guard is the escaped generation path, not the sanitizer. Code fences use `mosaik-code`: FLAMOX365 emits `mosaik-code-editor`, which no Mosaik release defines, so the reference renders empty fences - something Symphony's analysis and Solver reports cannot afford. The board card keeps a `plain` mode that renders ordinary HTML through Angular's sanitizer, because a card's progress line is a clipped two-line preview: the Mosaik headline scale, controls, tables and expanders belong on a reading surface, not inside a card summary. Tailwind is used only for the reference-compatible theme/utility layer and does not replace Mosaik controls or introduce a second component vocabulary.

The hydration re-audit inspected FLAMOX365's `patterns-and-practices/presenters/behaviors/Hydratable.ts`, its behavior tests, the lifecycle-owning abstract `View`, and the Task drawer's presenter/template hydration branches. The Mosaik `SkeletonElement` and generated Angular `SkeletonComponent` confirmed the supported width, height, shape, and shimmer contract. Symphony centralizes the corresponding lifecycle in `frontend-core`: presenters start with `isHydrating === true`, initialize once the Angular view lifecycle begins, finish on completion, rejection, synchronous failure, or disposal, and ignore stale Promise completions after a later initialization/disposal generation. Task metadata, missing configuration, missing skill catalogs, skill documents, and missing execution snapshots are the initial operations currently covered. Later save, refresh, execution, and mutation busy states remain separate so initial hydration never masks an already-present interactive view.

The Settings and Board routes now use that same `PresenterView`/`ViewPresenter` lifecycle instead of starting route-owned hydration from a component constructor. Missing configuration, mobile-access state, update state, or the initial orchestration snapshot renders a bounded Mosaik Skeleton surface immediately; already-present state bypasses hydration and remains interactive without a repeated Settings reload. Board projection is computed once per snapshot/filter revision, including latest execution events and work-item field display values, rather than rescanning the complete snapshot for each rendered card. Projected Angular cards remain fully laid out inside the Mosaik column body: browser `content-visibility` containment is not applied because intrinsic height estimation destabilizes dense-lane scroll offsets. The FlowBoard element hierarchy and native Mosaik scroll ownership therefore remain aligned with the FLAMOX365 reference.

The settings surface now adopts the reference's centered page, `ThemeCardView` Select, `SignInMethodsCardView` Cell Group composition, `PlatformAiModelCardView` model-selection composition, shared Headline-led Sections, Dividers, two-line Toggle labels, and primary Mosaik controls. Every Card content area is organized into decision-oriented Headline groups: workspace connections separate configured accounts from available providers; execution separates managed workspaces, GitHub issue control, autonomy, and cleanup; mobile separates network access, pairing, and paired devices; updates and appearance each own one explicit group. Soft information Banners appear only where they explain a consequential choice: workspace scope, workspace-specific provider sign-in, accepted GitHub commands, shared execution capacity, local-network ownership, release-channel risk, and macOS-following appearance. All Mosaik Toggle Switches explicitly bind the `primary` variant, and the repository verification rejects implicit or different variants. Settings-page and Settings-drawer Toggle Switches use the inspected FLAMOX365 two-line label composition with Mosaik Text plus Hint. A shared Symphony Headline component mirrors the reference component's Mosaik typography and disabled behavior without creating a FLAMOX365 runtime dependency. Each workspace-owned AI account drawer adapts the AI-model pattern to its provider: model and model-supported reasoning effort are Mosaik Selects rather than free text. An explicitly addressed Codex account exposes its live limit windows through Mosaik Progress Bars, including used and remaining percentages and reset time, while aggregate token statistics use a Mosaik Cell Group. The drawer deliberately shows only provider-reported values and does not invent a remaining-token ceiling. Claude Code uses its documented moving model aliases and effort ladder; subscription remaining percentages are explained as unavailable because the normal Claude Code account interface does not expose them and Anthropic organization usage requires separate Admin or Analytics credentials. Provider-account status and Connect/Disconnect actions **adopt** `SignInMethodsCardView`'s Cell Group and state-dependent action pattern. Claude's browser authorization code is an **Adapt** of `AccountingConnectionDialogView`'s write-only credential input because the local CLI requires a one-time code before the workspace-specific subscription session is complete. The optional-navigation card follows Theme at the end of Appearance. Connection, source, and runtime settings are wired to typed IPC and versioned JSON persistence; navigation intentionally has no user/profile surface. Existing GitHub, Codex, and Claude account Cells are navigable and reopen their details; display names can be changed, while secrets remain write-only login inputs delegated to provider credential stores. Settings and dynamically attached drawer controls use direct Mosaik value/event bindings because the current Mosaik Angular Signal-Forms host directives can overwrite proxy input signals during dynamic initialization; this explicit adaptation keeps the controls `OnPush`, typed, and free of renderer exceptions. The exact additional reference sources were FLAMOX365's `EdgeSettingsCardView`, `PlatformAiModelCardView`, `ThemeCardView`, `SignInMethodsCardView`, and `AccountingConnectionDialogView` two-line Toggle composition.

Settings initialization and Select controls follow the semantic lifecycle and Mosaik interaction contracts verified in the read-only references. An empty presenter hydration finishes in a microtask so Angular's OnPush control-flow consumer observes the transition and renders the Settings content on the first navigation; the existing RouterLink navigation remains unchanged. Provider, model, reasoning, Git protocol, sign-in method, update-channel, and theme controls consume `selectionChanged.newValue.value`, matching FLAMOX365's Select handling and Mosaik's published selection contract. Projected dynamic model and reasoning items additionally forward their concrete click value because the published wrapper can attach its internal item subscription before Angular finishes projecting those options; the presenter makes the two paths idempotent. Saving then reopening an account verifies that the selected reasoning effort reached versioned settings persistence. The selection contract is an **Adopt** and the dynamic-item fallback is an **Adapt**.

The workspace agent editor now **adopts** FLAMOX365's vertical Mosaik Stepper composition from `../flamox/libs/frontend/auth/src/lib/views/OnboardingView.html` and its outlined horizontal Choice Group pattern from Order Administration. Symphony **adapts** the four steps to a local orchestration decision sequence: AI account and model first, agent identity and position second, responsibilities with one explicit portable skill each third, and account/model failover last. AI accounts and agent profiles are deliberately separate: multiple agents may reuse one authenticated workspace account while keeping independent route policies, positions, skills, and phase ownership. The first choice is explicitly Codex, Claude Code, or OpenCode. Missing runtime choices remain visible but disabled and expose a confirmed Homebrew installation action; successful command verification immediately unlocks the runtime. OpenCode then presents only provider/model identifiers returned by `opencode --pure models` from the workspace-isolated runtime home. Codex continues to use its account-scoped app-server model response. Claude Code exposes its CLI-owned default plus an optional operator-supplied model/alias because the CLI has no supported non-interactive model-list command; Symphony does not manufacture a list. Symphony remains the sole owner of account routing, cost policy, circuit breaking, and failover. Empty CLI results render an explanatory Banner instead of an unexplained empty Select. Expert-only credentials, generic gateway addresses, path boundaries, and execution budgets remain collapsed. This differs from FLAMOX365 because the reference product has neither provider-neutral agent teams nor local multi-provider routing, while the visible Stepper, Choice, Banner, Select, Cell Group, Toggle, and progressive-disclosure composition remain canonical Mosaik patterns.

AI accounts are no longer created inside the agent wizard. OpenCode is the exception to the connect-first rule: its free models run straight from the CLI, so an OpenCode account is saved like any other setting and importing the provider sign-ins stored on the Mac stays an optional action on the same drawer. Codex and Claude Code accounts only persist once their sign-in completed — an abandoned or failed sign-in removes the account again, so no half-connected account can be routed to. Codex, Claude Code, and OpenCode accounts are connected once under **Connected services** through a dedicated `ai-account` drawer that **adopts** `SignInMethodsCardView`'s Cell Group status row with state-dependent Connect/Disconnect actions: the primary action saves the account and immediately starts the provider sign-in (ChatGPT browser flow or API key for Codex, browser plus one-time authorization code for Claude Code, OpenCode sign-in import for OpenCode) instead of deferring sign-in to a "connect after saving" toggle. The agent wizard's first step then **adapts** FLAMOX365's outlined Choice Group into three card groups — connected AI account, model, effort — so nothing is typed by hand: Codex models and efforts come from the account-scoped app-server response, OpenCode models from `opencode --pure models`, and Claude Code offers its documented moving aliases (`opus`, `sonnet`, `haiku`) plus the documented `--effort` ladder with an explicit "Provider default" card. Card groups wrap through a template-local `choice-cards` utility that only sets `flex-wrap` on the Choice Group root part; hints inside cards use Mosaik's `textOverflow: wrap` so long provider status text can never widen the drawer. Usage type (route cost class), credential reference, and gateway address left the wizard: usage type is derived from how the account was connected (subscription vs API key vs gateway; free-tier is never derived because it needs recorded evidence), credential reference and gateway live in the account drawer's Expert settings, and the routing goal moved into the agent's Expert settings with `balanced` as the default. When no account is connected, the wizard shows a Banner with a primary action that closes the wizard and opens the account drawer via the drawer's typed close result.

Row actions use the Mosaik Cell contract directly: `mosaik-cell` declares `start`, `label`, `subLabel`, and `end`, its root is a flex container with `--cell-gap`, and the `end` slot accepts several nodes. Buttons are therefore slotted individually (`slot="end"`) instead of being wrapped in a layout `div` with its own Tailwind gap — that wrapper produced a second, competing spacing system inside a component that already owns it. The same rule applies to single-value labels: a Cell whose label and sub-label are plain text binds the `label` / `subLabel` properties so the component renders its own `label` / `subLabel` parts (including the read-only sub-label styling) instead of hand-rolled `span`s. Composed content keeps its slot: two-line Toggle Switch labels (Text plus Hint) and Cell sub-labels assembled from several values have no matching property. A template audit of every Mosaik slot used by the renderer confirmed that all slot names exist in the installed component templates.

Each agent row states its runtime: the Cell's `start` slot holds a Mosaik Avatar Group with the agent avatar plus a second avatar for the AI provider (ChatGPT, Claude, OpenCode), the sub-label names position, provider, model, and availability, and the provider avatar carries the workspace account name as its tooltip. `maxLength` stays unset because the group's overflow indicator would otherwise count the pair as truncated. Every agent row exposes a labelled Edit action and a danger remove action. Removing an agent is a settings projection (`agent-removal.ts`): the profile goes, its position and route policy go with it when no other agent uses them, and each team assignment it owned moves to an agent whose position allows that role — assignments with no eligible agent are dropped. Removal is refused for the last agent of a workspace and when it would leave an enabled Teams feedback intake without a Work Item Creator, because the settings schema rejects both. The navigation footer states a provider's quota only where the runtime reports one; Claude Code and OpenCode show sign-in state and how many agents run on the account instead of an empty entry.

Theme startup now **adopts** FLAMOX365's synchronous pre-bootstrap preference resolution: `ShellConfig` reads the browser-persisted theme before configuring Mosaik, and the settings store mirrors each successfully loaded or saved preference back to that synchronous cache. Symphony **adapts** the storage key by retaining the established `orchestration.theme-mode` compatibility contract and keeps versioned application settings authoritative after hydration. Remote snapshot, configuration, and skill hydration begin in parallel, and an absent settings response no longer forces an intermediate light theme. This removes the startup flash without moving settings-file access or Node.js APIs into the sandboxed renderer. The exact reference sources were `../flamox/apps/frontend/portal/src/configuration/ShellConfig.ts` and `../flamox/libs/frontend/features/identity/src/lib/user/view-presenters/cards/ThemeCardViewPresenter.ts`.

The destructive managed-workspace cleanup action is adapted into its own Headline-led Section below the storage and retention settings in the owning Managed workspaces card; it is not a card-footer peer of Save and never appears in Theme. Its danger-variant action opens Mosaik `MessageBoxService` with explicit positive and negative choices, while its result is reported through the global notification service rather than an inline banner. Symphony adapts the operation to its local execution model by warning that inactive Solver workspaces can contain uncommitted changes and by reporting removed, missing, active-skipped, and failed counts from typed IPC. Filesystem paths never cross into the renderer.

Workspace deletion is an **Adapt** of the same FLAMOX365 danger-action and Mosaik confirmation pattern. Each workspace card owns a danger-variant footer action with an explicit positive and negative choice; the final remaining workspace cannot be deleted. The orchestrator rejects deletion while that workspace owns an active execution or Work Item Creator request, releases its managed Git worktrees through the workspace provider, removes its execution history, automation state, isolated Codex, Claude, and OpenCode homes, and workspace-specific configuration, and then deletes only the exact Symphony-owned storage directories. A configured repository checkout is a user-owned source and is deliberately retained. The renderer receives only the updated typed settings document and a success or failure notification; filesystem paths and partial cleanup controls do not cross the desktop boundary.

The Actions workflow-dispatch buttons **adopt** FLAMOX365's command-specific busy-state pattern from `../flamox/libs/frontend/auth/src/lib/views/children/SignInChildView.html`: each Mosaik Button binds `isBusy` only to the command it owns, while a broader `disabled` condition prevents competing commands. Symphony **adapts** that distinction to the single managed local runner. A workflow button shows the Mosaik progress ring only while that exact `workflow:<id>` dispatch request is unresolved; an unrelated active local runner merely disables it and explains the occupied capacity in its tooltip. This uses the public, independent `isBusy` and `disabled` inputs confirmed by Mosaik's `ButtonElement` contract and removes the misleading appearance that every workflow has been starting indefinitely.

Form drawers adopt the visible FLAMOX365/Mosaik anatomy: a dedicated template-owned Mosaik header with title, context and dismiss action; a dedicated scroll-owned `mosaikDrawerContent`; and a dedicated `mosaikDrawerFooter` with plain Cancel and solid primary actions. The task editor, Settings editor, portable-skill editor, execution details, action details, and skill catalog compose their visible title and subtext directly in the owning HTML instead of passing pre-concatenated copy through a ViewPresenter or DrawerService configuration. Read-only execution details and the skill catalog intentionally omit a duplicate footer because their only drawer-level action is the standard header close control; catalog activation remains attached to the affected skill card.

Local repository, managed-workspace, skill-import, and skill-export locations use Mosaik FileBox controls backed by a typed native directory dialog. Internal package-relative resource names remain text fields because they do not select a local filesystem object.

The Runtime settings card adopts the inspected Edge Connector configuration pattern from FLAMOX365 for primary Mosaik Toggle Switches with wrapped, decision-oriented labels and the established Mosaik NumberBox pattern for bounded numeric policy. Symphony adapts those patterns to two separate desktop decisions: the disabled-by-default remote control authorizes GitHub updates and `@symphony` comments, while the disabled-by-default autonomy control authorizes scheduled backlog analysis, Ready implementation, failed-work re-analysis, and pull-request status synchronization. Adjacent NumberBoxes expose the independent autonomous interval and the application-wide parallel execution limit instead of hiding consequential scheduling policy. A soft information Banner directly below the remote control adopts FLAMOX365's contextual settings guidance and lists every accepted command. GitHub-backed desktop and mobile tickets show an actionable Banner linked to Settings only while remote automation is disabled. Once enabled, the duplicate command guide disappears and the owning GitHub issue remains available as a compact action. The controls support concrete operator decisions and appear only on their owning settings surface; unrelated text fields deliberately remain unchanged. The exact reference sources were `../flamox/libs/frontend/features/edge/src/lib/views/dialogs/ExtensionInstallationDialogView.html`, `../flamox/libs/frontend/features/edge/src/lib/views/cards/EdgeSettingsCardView.html`, `../flamox/libs/frontend/features/task/src/lib/views/dialogs/TaskDialogView.html`, `../flamox/libs/frontend/features/feedback/src/lib/views/dialogs/FeedbackConfigurationDialogView.html`, and the public Mosaik Angular/Foundation Toggle Switch, NumberBox, Page Header, and Banner implementations.

The workspace Settings card and drawer adopt the FLAMOX365 feedback connector catalog, configuration drawer, contextual tutorial Banner, Mosaik form controls, active Toggle Switch, test action, and destructive disconnect action for Microsoft Teams feedback intake. Symphony adapts the direction from outbound delivery to inbound Microsoft Graph polling and therefore asks for tenant, application, credential reference, team, channel, GitHub Project, and repository instead of a Teams Workflow webhook URL or delivery filters. The source is workspace-owned, initially disabled, and existing messages are baselined. The exact reference sources were `../flamox/libs/frontend/features/feedback/src/lib/views/cards/FeedbackConnectorSettingsCardView.html`, `../flamox/libs/frontend/features/feedback/src/lib/views/dialogs/FeedbackConnectorDialogView.html`, and `../flamox/libs/frontend/features/feedback/src/lib/view-presenters/FeedbackConnectorDialogViewPresenter.ts`.

Multi-repository workspace configuration **adapts** the existing FLAMOX365/Mosaik Settings CellGroup and Add/Edit action hierarchy. The Repositories section owns the single visible Add repository entry, lists every workspace binding, and exposes only local preparation or refresh plus Edit. Repositories with the same workspace-owned GitHub host, account, and protocol reuse one provider connection instead of duplicating service accounts. Adding and enabling a repository is the explicit authorization for AI work, so separate AI-task approval, revoke, and plan-and-run-test actions are intentionally absent. Preparation retains the existing confirmation and explicitly states that it does not execute project code. When remote or autonomous execution is enabled but a configured repository is not locally prepared, the runtime Settings card and menu-bar panel show one actionable preparation warning. This differs from FLAMOX365 because the reference product has no local multi-repository execution runtime; the visible composition reuses Mosaik Cell Group, Cell, Avatar, Button, Banner, and drawer patterns without exposing the underlying execution architecture.

Repository-level assistant configuration was compared separately as part of the same read-only reference audit. Symphony adopts its synchronized agents/skills/provider-adapter structure but replaces FLAMOX365 application-domain and server-stack rules with desktop, renderer, orchestration, IPC, persistence, worktree, Mosaik, and UI-relevance guidance. The full decision ledger is in [repository AI configuration](repository-ai-configuration.md).

## Accessibility and responsive conclusions

The shell preserves semantic navigation and main regions, keyboard-accessible Mosaik controls, explicit status text in addition to color, reduced-motion behavior, visible focus, and scroll containment. The board scrolls horizontally at narrow widths rather than collapsing workflow meaning. Status pills never rely on color alone.

## 2026-08-10 mobile companion reference audit

The mobile companion was compared with FLAMOX365's presenter and navigation registration patterns, the exact `TaskListView` Page/Header/PreContent composition, and Mosaik's `Page`, `PageHeader`, `PagePreContent`, `PageContent`, `SearchBox`, `TabStrip`, `ExpanderGroup`, `Expander`, `Card`, `CellGroup`, `Cell`, `Text`, `Button`, `ProgressBar`, and `ProgressRing` sources. The supplied mobile captures were used only as composition references.

| Decision                                                                                 | Classification | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standalone OnPush views extending `PresenterView<TPresenter>` with `ViewPresenter` state | Adopt          | Every mobile route and the shell retain the existing presenter lifecycle; application policy stays in stores and application services.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Feature-owned multi-provider navigation descriptors                                      | Adopt          | Home, Board, Pull, and Settings register into the `mobile-main` region; the shell sorts and renders those four destinations in the Mosaik TabStrip with registered names backed by the same Reicon home, kanban, branch, and settings definitions used by the desktop shell. The compact Pull label opens the Pull Requests route. Tickets and Processes remain contextual routes reached from Home or Board instead of competing primary destinations.                                                                                                                                                                                                                                                                                                                                               |
| Mosaik Page/Header/PreContent/Content hierarchy                                          | Adopt          | Every routed page uses the standard hierarchy. The contextual Tickets route and primary Pull Requests route place the Mosaik SearchBox in PagePreContent, so title and search remain one sticky header group while results scroll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| FlowBoard columns become a joined, single-open accordion                                 | Adapt          | `ExpanderGroup(mode="single", stacking="joined")` preserves workflow order and counts while rendering readable ticket cards on a phone.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Home route is a compact mobile dashboard                                                 | Adapt          | The supplied loyalty-app capture's greeting, high-emphasis summary, media-card focus, and compact follow-up action hierarchy is adapted to provider-neutral Symphony data. The Mosaik Card, ProgressBar, Cell, and Text composition reports open and completed tickets, prioritizes an active execution or the most relevant unfinished ticket, and links directly to the owning detail route. Visible dashboard copy uses Mosaik Text with Joy typography roles. Long ticket and creation-row copy is projected into bounded Mosaik Cell slots with wrapping or truncation, so it cannot widen the phone viewport. Loyalty points, promotional media, invitations, user identity, and decorative claims are not copied. Board remains the workflow view rather than being replaced by the dashboard. |
| Mobile Pull Requests projection                                                          | Adapt          | The primary mobile route projects the same provider-neutral pull-request summaries owned by the desktop Delivery view into searchable Mosaik Cards. Title, number, author, draft/state, source and target branches support the mobile decision; activating a card opens only its validated public provider URL. Desktop-only CI actions and workspace filters are not duplicated.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Mobile Settings destination                                                              | Adapt          | The former Connection destination is renamed Settings and retains connection recovery as its first actionable group. An Appearance card adopts Symphony's existing Mosaik Select and shared `light`, `dark`, and `system` preference model, but applies and persists the choice immediately for this phone instead of duplicating the desktop save workflow. System continues to follow device appearance changes. Pairing and process routes remain contextual because their state is reached from the owning setup or work-item flow.                                                                                                                                                                                                                                                               |
| Compact phone pairing bootstrap                                                          | Adapt          | FLAMOX365 has no equivalent local-companion pairing page. Symphony composes Mosaik Busy State, Message, Text, and Button for actionable pairing states, keeps the product mark subordinate at 36 px, and applies 24 px safe-area-aware inline spacing. The matching-code decision remains on the desktop Mobile access card, whose QR code uses the public Mosaik QRCode API.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Floating dark bottom navigation from the GitHub capture                                  | Adapt          | The Mosaik TabStrip is absolutely overlaid inside `MobilePresenterView`, uses a scoped dark variable island, and reserves safe-area/scroll space. GitHub colors, Copilot, sharing, and its unsupported-layout notice are not copied.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Mosaik Joy system theme and semantic scheme tokens                                       | Adopt          | The mobile bootstrap resolves the persisted theme preference before Angular starts. Light and Dark remain fixed; System follows device appearance changes. Runtime switching reapplies Joy and browser chrome colors, while routed surfaces continue to use only `--mosaik-scheme-*` tokens for backgrounds, foregrounds, borders, focus, and status colors.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Responsive ticket facts                                                                  | Adapt          | Ticket detail uses Mosaik CellGroup/Cell/Text composition with wrapped slotted Text values. Long bodies, repository names, and assignees remain within the viewport instead of retaining the desktop metadata grid.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Distributed ticket ownership                                                             | Adapt          | The existing Mosaik FlowBoard card metadata and Task detail banner surfaces project a provider-neutral foreign-instance claim only when it affects the available action. Local executions retain their existing runtime status, avoiding a duplicate ownership badge. GitHub assignees remain separate descriptive metadata.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Contextual mobile remote-command guidance                                                | Adopt / Adapt  | GitHub-backed ticket detail adopts the actionable Mosaik Banner used by the inspected Edge Connector settings in FLAMOX365 and task dialog patterns only while remote automation is disabled. Once enabled, the duplicate guide disappears; the validated public issue URL remains a compact Page Header action in both states. Other providers and unrelated mobile inputs remain unchanged.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Mobile work-item creation                                                                | Adopt / Adapt  | Adopts the inspected FLAMOX365 `TaskDialogView` overview hierarchy and Symphony Board editor's single manual/AI form model, Mosaik Segment mode choice, TextBox, NumberBox, DateBox, Select, checkbox, Avatar, and explicit save action. The phone adapts the drawer into a dedicated Page route reached from both a dashboard action group and the Tickets header. Provider metadata remains authoritative, the currently selected single desktop workspace owns creation, and an AI draft must be reviewed before the explicit Create action.                                                                                                                                                                                                                                                       |
| Mobile AI analysis, solution, and revision                                               | Adapt          | Adapts the Board editor's explicit AI Prompt Box workflow to the compact ticket-detail Card. Optional operator guidance is forwarded to analysis and first solution; feedback is required for a later revision. Running work remains owned by the existing Processes route, so the ticket page does not duplicate execution logs or cancellation state. Repository configuration and local preparation remain desktop-owned.                                                                                                                                                                                                                                                                                                                                                                          |
| Mosaik application shell                                                                 | Differ         | Mosaik 0.1.71's headerless `AppComponent` path dereferences an absent header part. The POC therefore uses a semantic presenter-owned shell while retaining Mosaik for all routed pages and navigation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Desktop preload transport                                                                | Differ         | A browser cannot use Electron preload IPC. `MobileCompanionStore` uses only the versioned same-origin mobile HTTP/WebSocket contract and never imports desktop APIs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

The exact read-only sources included `../flamox/apps/frontend/portal/src/configuration/ShellConfig.ts`, its PresenterView and navigation configuration, `../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`, `../flamox/libs/frontend/features/task/src/lib/views/dialogs/TaskDialogView.html`, `../flamox/libs/frontend/features/task/src/lib/view-presenters/TaskDialogViewPresenter.ts`, and the corresponding Page, PageHeader, PagePreContent, Prompt Box, TextBox, NumberBox, DateBox, Select, checkbox, Cell, Text, Busy State, Message, QRCode, and navigation implementations under `../mosaik/libs`. The implementation introduces no runtime dependency on either reference repository.

## Page width and FlowBoard sizing

Home adopts the FLAMOX365 `ExplorerView` page anatomy but uses the complete available width for its horizontal category panorama. Settings adopts the `md` breakpoint from FLAMOX365 `SettingsView` and remains centered by the Mosaik Page component at its native maximum. Skills now follows the current FLAMOX365 list-page anatomy at full route width together with Board, Pull Requests, and Actions. Board intentionally remains full-width because its multi-column FlowBoard is a workspace canvas. Board and Skills have no second search control: the centered Presenter search is the single ticket/skill search entry point and passes its query to the owning route.

The board follows the FLAMOX365 task flow view structurally: its page, page content, fitting Mosaik stack, FlowBoard, and columns form one unbroken flex-height chain. The FlowBoard therefore fills the available Presenter height, while its board viewport owns horizontal scrolling and each bounded column body owns vertical item scrolling. That split is expressed through the FlowBoard's `orientation="horizontal"`: the board lays its columns out in a row and pans horizontally, while each column stacks its items and scrolls vertically. The alternative `vertical` orientation transposes the whole board — columns stack top to bottom, their headers become upright strips on the leading edge, and the items run across each column and scroll horizontally — which is not the Work anatomy. The column's exposed Mosaik `container` and `body` parts bound that scroll boundary, and both the board viewport and the column body delegate the actual scrolling to the Mosaik `mosaik-scroll` primitive, so both axes scroll with the same gradient affordance as every other Mosaik scroll surface and scrolling one lane does not move the surrounding Presenter. A fixed or viewport-capped board height is not used.

Complete-board loading **adopts** the inspected FLAMOX365 `TaskListViewPresenter` projection: the presenter groups the entire provider-neutral item collection into stable workflow columns, and the template renders every grouped item through Mosaik FlowBoard. Symphony **adapts** the backing model into a durable summary projection so a refresh retains the last complete board until every GitHub page has arrived and can be swapped atomically; it never renders a deliberately truncated board. Opening the shared task drawer hydrates that one ticket before the form is populated, keeping bodies and execution-only detail out of the exhaustive board query. GitHub Project V2 has no server-side arbitrary status filter on its item connection, so issuing one full Project query per visible column would reload the same connection and is intentionally not used. The exact inspected sources were `../flamox/libs/frontend/features/task/src/lib/view-presenters/TaskListViewPresenter.ts`, `../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`, and Mosaik's FlowBoard implementations.

Board card context actions **adopt** FLAMOX365's `HoverRevealForDirective` behavior and the card-level plain Mosaik Dropdown Button composition from `ExtensionStoreGridComponent`: the action trigger remains in layout and keyboard focus order, is hidden only through opacity and pointer events, and is revealed while the card is hovered or contains focus. Symphony **adapts** the menu to its provider-neutral workflow stages, and the card offers every step its stage owns rather than a single one, so what an operator can trigger on the opened ticket is what its card lists. A stage that runs the analysis offers it, and names it a re-analysis once a durable analysis exists; a stage that implements offers the implementation, blocked with its reason while no analysis exists and pointing at the drawer for a rework, whose required description cannot be written in a menu; a finished implementation without a pull request offers its publication; a human gate offers its configured decisions with the same hierarchy the drawer gives them, one accented way on and marked closures. An active card offers the cancellation of its run instead of a competing start action, and an externally claimed card offers no step at all. Every card additionally offers **Move forward**, **Move backward**, and a **Move to** popover submenu listing every column of its own board with the current one checked and disabled, so a column change no longer requires opening the ticket; while boards are merged, the visible column is resolved back to the column of the item's own board, which is the only value its provider accepts. A card right-click opens the same dropdown and action resolver instead of introducing a second context-menu implementation. The decorative FlowBoard item ripple is disabled because Mosaik's pointer ripple otherwise remains visible beneath a menu opened by a secondary click. Both paths reuse the task drawer's repository selection and local preparation before entering the existing Analyzer or Solver store commands. Symphony also **adapts** Mosaik's FlowBoard item pinning for active local work: the card for the latest execution is pinned to the top of its column only while that execution is `running` as analysis or solution work, and is automatically unpinned when it queues, waits, or reaches a terminal state. The exact read-only references were `../flamox/libs/frontend/ui/src/lib/directives/hover-reveal-for/HoverRevealForDirective.ts`, its unit specification, `../flamox/libs/frontend/features/edge/src/lib/components/ExtensionStoreGridComponent.html`, FLAMOX365's task FlowBoard in `../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`, and Mosaik's public Dropdown Button, Menu, Menu Item, and FlowBoard Column Item sources.

Workspace agent rows **adapt** FLAMOX365's settings-card Cell/Avatar/trailing-Button composition. The Mosaik Text slots wrap inside a `min-width: 0` region, the redundant long position description is omitted, and the trailing edit/add control is an intrinsic-width icon action with an accessible label. This keeps every line readable without pushing the action outside the Cell Group. A signal-bound follow-up render initializes newly inserted Mosaik slot content after an agent is saved. Following the inspected FLAMOX365 accounting, telephony, and Edge Connector settings cards, each composite sublabel remains visibly assembled from structured fields and explicit conditions in the owning HTML template; the presenter projects lookup results and individual fields but does not hide display decisions in generic pre-concatenated `details` values.

## macOS menu-bar panel

The menu-bar panel **adopts** the compact account-menu hierarchy and nested-submenu composition from FLAMOX365's Presenter together with Mosaik Menu/Menu Item actions and the established Progress Bar, Progress Ring, Toggle Switch, Button, Icon, Hint, Text, Divider, and Tooltip APIs. Capacity appears first because it drives immediate operator decisions. Agent Runs and Actions each own an inline submenu containing at most three active-first entries from the same provider-neutral run projection as the workspace rail; every entry includes explicit state text and an activity or terminal-state icon. Actionable repository preparation follows only when needed, while Open Symphony, update, Settings, and Quit remain one global action group at the bottom. GitHub Actions allowance and unavailable-allowance placeholders remain deliberately absent.

The surface **adapts** those reference compositions into a sandboxed Electron popover owned by the macOS status item. It uses an independent presenter and narrow typed requests instead of the full workspace store, because a hidden secondary renderer must not duplicate the primary route's broad state ownership. The presenter combines the existing execution snapshot with the existing CI-runs refresh response through `buildRailRuns`; it neither creates a second run model nor exposes GitHub API types across the provider boundary. Per-run Pause and Resume remain inline icon actions; an operator pause frees capacity and a resume can wait durably for the next slot. Selecting an Agent Run opens its owning workspace surface, while selecting an Actions entry opens the Actions route. The autonomy switch changes only the existing autonomous-work setting. The panel is intentionally opaque and always uses Symphony's Mosaik dark scheme over the fixed Electron background, which is Soho's dark `background` role (`#0a0a0a`), independent of both the persisted application theme and the macOS appearance. Its height is reported through a bounded typed desktop request. Nested menus expand inline because a Mosaik sidecar popover would be clipped at the edge of the fixed BrowserWindow; this retains the public Menu/Menu Item hierarchy and keyboard semantics while the panel owns overflow.

The native status item and frameless popover **differ** because neither inspected FLAMOX365 nor Mosaik source owns an Electron menu-bar-extra pattern. Electron Main therefore owns Tray lifecycle, panel positioning, visibility, bounded resizing, and three packaged template-image variants. The renderer sends only the semantic `idle`, `running`, or `failed` state: active work takes precedence, and otherwise the newest terminal run determines whether the mark carries a failure badge. All orchestration, CI refresh, persistence, and pause/resume work remains in the Utility Process. The exact read-only UI sources were FLAMOX365's `PresenterView.html` account dropdown and `PresenterAccountMenu.spec.ts`, plus Mosaik's public `MenuElement`, `MenuItemElement`, `MenuItemElementTemplate`, Menu theme tokens, Progress Bar, Progress Ring, Toggle Switch, Button, Icon, Hint, Text, Divider, and Tooltip implementations. No runtime dependency on the reference repositories was introduced.

## Agentic pull-request settings

The agentic-delivery controls **adopt** the exact FLAMOX365 two-line Mosaik Toggle Switch composition inspected in `../flamox/libs/frontend/features/telephony/src/lib/views/dialogs/TelephonyConnectorDialogView.html` and `../flamox/libs/frontend/features/edge/src/lib/views/dialogs/ExtensionInstallationDialogView.html`: a decision label and short consequence hint remain inside the switch label slot. Numeric budgets and limits reuse Symphony's already adopted Mosaik NumberBox grid. Symphony **adapts** this pattern into one global policy group plus one repository-drawer opt-in because a costly or source-mutating action must be authorized at both scopes. No status badge, progress meter, architecture explanation, or duplicate Actions state was added to Settings; the existing Runs/Actions surfaces remain the owners of execution evidence.

## Flow diagrams reference audit (2026-10-21)

**Scope inspected.** Exact FLAMOX365 sources: `../flamox/libs/frontend/features/sales/src/lib/commercial-process/internal/views/CommercialProcessDiagramDialogView.{ts,html,scss}` and its `CommercialProcessEdgePresentationPipe.ts`. Exact Mosaik sources: `libs/mosaik-elements-foundation/src/controls/components/layouts/flow/` node/edge/viewport templates, Soho themes, layout adapters, selection events and public props; published 0.1.173 Angular and Foundation declarations were checked against them. This supersedes the 2026-08-19 Foblex exception in ADR-012 and the later restoration of its stylesheet.

**Adopt — native Flow composition.** Delivery stages in the Board process drawer and workflow jobs in the Actions drawer use `mosaik-flow`, `mosaik-flow-node`, `mosaik-flow-edge`, `mosaik-flow-controls` and `mosaik-flow-minimap`. Like the reference, typed `FLOW_DEFAULT_PROPS` configure automatic measured Dagre layout, orthogonal routes, single selection, one initial fit, and bounded zoom. Mosaik Text, Hint, Badge and registered icons provide node content. Component SCSS stays empty; no internal part or CSS-variable overrides are carried over from the reference. Foblex and the custom CI SVG/resize-observer layout are removed.

**Adapt — provider-neutral data and task details.** Symphony projects its existing workflow graph and revision-specific CI definition/execution records instead of commercial-process APIs. Stage and transition selection retain the existing detail commands. Current/visited/unreachable stages use public node variants, while taken transitions and repeated traversals retain their label badges. Return paths attach on the left with separate offsets. The CI flow reads left to right, matching job dependencies; process stages read top to bottom, matching the reference. Compact CI nodes show status icons and completed duration; selection reveals conditions, target environments and unresolved dependency context outside the canvas. Matrix execution disclosures retain direct access to actual job logs, including zero-execution pending groups. The static inspection surfaces omit the dotted editor grid; process selection keeps other stages fully visible so the operator can continue reading the complete route while its details are open. These differences follow the existing desktop delivery and CI contracts.

**Adapt — large CI workflows.** Up to 24 jobs fit once on load. Larger graphs initially reveal the first definition job at readable scale, because fitting 200 parallel jobs would make their labels unusable. The native minimap, keyboard navigation, zoom and Fit controls keep the remaining graph reachable. Live updates and matrix expansion retain the operator's viewport.

**Adopt — read-only navigation and accessibility.** Mosaik's native selectable controls provide pointer and keyboard selection; nodes cannot be moved and connections cannot be edited. All interactive acceptance surfaces retain domain-specific test IDs. The existing Board process and Actions/job-log journeys own the Electron validation and screenshots.

## Work-item comments

The task drawer's comment thread **adopts** Mosaik's `mosaik-comment` directly: avatar, author, timestamp, Markdown body, and the optional "Open" action each fill the component's public `avatar`, `author`, `at`, `content`, and `actions` slots. FLAMOX365 was searched and does not use the comment component anywhere, so the Mosaik component API itself is the reference for this surface.

Azure DevOps work-item editing **adapts** the same provider-neutral task drawer rather than introducing a second form: repository, label, assignee and board-column controls retain their Mosaik Select, Checkbox, Avatar and FlowBoard composition, while the available work-item types and their default come from the selected Azure backlog. The external action names Azure DevOps instead of GitHub. Azure profile-image endpoints require the provider credential and cannot be used as public renderer URLs; the Avatar therefore deliberately receives identity text without that protected URL and adopts Mosaik's built-in initials fallback. The exact read-only references were FLAMOX365's task surfaces and `../mosaik/libs/mosaik-elements-foundation/src/Controls/Components/Media/Avatar/AvatarElement.ts` plus `AvatarElementTemplate.ts`.

Symphony **adapts** the component's width behavior through the established override seam (`apps/renderer/src/styles/overrides/comment.scss`): the comment's shadow stacks size their flex items by content (`min-width: auto`), so an analysis comment with unbreakable content — fenced code lines, tables, long inline code — propagated its intrinsic width through `part(inner)` and `part(innerStack)` into the drawer and made the whole dialog scrollable. The override pins `min-width: 0` on those parts and lets `part(inner)` fill the available row, so wide Markdown scrolls inside the comment (`pre` and `table` already own `overflow-x: auto` in `symphony-markdown`) instead of widening the dialog. The simulated tracker seeds one such analysis-shaped comment and the ticket-markdown E2E asserts the drawer and the comment stay free of horizontal overflow.

## User-requested Memphis theme (2026-10-06)

**Differ — explicit product choice.** Symphony uses Mosaik Memphis instead of
FLAMOX365's Joy preset on every desktop route, the menu-bar window, and the mobile
companion. The exact reference owners are
`../flamox/apps/frontend/portal/src/configuration/ShellConfig.ts`,
`../flamox/apps/frontend/portal/src/styles/mosaik.scss`, and
`../flamox/apps/frontend/portal/src/styles/tailwind.css`; the Memphis public API
is defined by `../mosaik/libs/mosaik-themes/src/Theming/MemphisTheme.ts`,
`src/themes/memphis/memphis.scss`, and
`tailwind/v4/presets/memphisTailwindPresets.css`. The existing provider, shared
route compositions and light/dark preference handling remain adopted. The
Joy application overrides are removed; Memphis supplies its 10 px layout rhythm
and Space Grotesk stack. Startup HTML, theme providers, the Sass
mixin, Tailwind bridges, design-preview providers, and generated design documents
all select Memphis together.

**Adopt — derived projection state.** The current Mosaik `AppElement` determines
`hasHeader` from projected `AppHeaderElement` children, and `MenuItemElement`
determines `hasChildren` from projected submenu content. Symphony's
`PresenterView` and `SettingsView` leave these derived values to Mosaik instead
of binding inputs absent from the Angular wrappers. Existing header and workspace
submenu composition stays unchanged. The old override stylesheets are not imported;
Memphis supplies the public component styling. Space Grotesk WOFF2 files and their
OFL licence ship locally for Desktop and Mobile. Earlier entries that describe Joy
overrides record historical decisions, superseded by this effective theme.

## Production orbit, employee figures and project setup (2026-10-06)

The exact inspected FLAMOX365 owners are `libs/frontend/features/task/src/lib/views/TaskListView.html`,
`libs/frontend/setting/src/views/SettingsView.html`, and
`libs/frontend/presentation/src/lib/views/PresenterView.html`. The Mosaik owners are
Avatar/Persona, Button’s named `icon`/`label` slots, Page/PageContent, Segment, Select,
Card, Disclosure and the Memphis theme sources.

| Surface                                     | Decision       | Reason and preserved behavior                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell, menu bar and Mobile          | Differ         | The user explicitly chose Memphis. Theme providers, startup attributes, Sass, Tailwind, preview and generated documents switch together. Public small sizing keeps navigation operable at 1040 × 700; no View overrides internal component styles.                                                                                                                                                          |
| Orbit `/main/orbit`                         | Differ / Adapt | Production-centred delivery rings and stable aggregates replace a conventional dashboard as the initial route. Generic scene geometry draws only evidence-backed objects and uses public Mosaik cards/buttons and Symphony's shared figure component. The complete paged list and keyboard pan/zoom keep every ticket reachable.                                                                            |
| Stages `/main/stages`                       | Adopt / Differ | The existing configurable workflow, role gates, provider column mappings, queue, handoffs and process drawer remain authoritative. Connected stations are the requested alternative composition. Drag assignment uses the existing delegation command; a stage move uses its unique provider column or the existing decision drawer.                                                                        |
| Employees `/main/team` and execution drawer | Adapt          | Symphony's shared AgentFigureComponent owns transparent PNG layers and CSS states. Mosaik Avatar/Persona retain their published APIs. Actual immutable bindings drive activity; stale data disables animation. Public Button slots expose the figures. CLI identity remains separate, and feedback opens the established process/revision actions.                                                          |
| Board and old Home                          | Adopt / Adapt  | The Board model and FlowBoard remain the same owner. A shared landscape store holds filters; explicit selection stays in the existing orchestration state. `/main/home` remains the overview. Existing task/process query links remain valid.                                                                                                                                                               |
| Visual setup `/main/setup`                  | Adopt / Differ | Mosaik Page, cards, Selects and explicit Apply follow the settings composition. Connected project cards are the requested build surface. Draft discovery is read-only; Apply saves the validated proposal. Only workflow-eligible tickets can start analysis; otherwise the Board supplies the human decision. Built-in role code supplies unset skill assignments; explicit user packages take precedence. |
| Actions and deployment reviews              | Adopt / Adapt  | Existing workflow catalog, Action drawer, jobs, steps and logs remain owners. A generic provider-neutral graph displays parallel definition jobs and actual matrix executions at the run revision. Dispatch proposals show declared inputs; environment reviews show exact version and comment. Durable journals and rechecks prevent accidental repeat writes.                                             |
| Optional spatial mode                       | Differ / Adapt | Three.js loads after the operator selects Spatial. Orthographic projection moves the same DOM objects and PNG layers, retaining commands, selection and filters. It introduces no second UI framework or runtime process. Free positioning is stored in 2D; spatial drag still resolves the same assignment/stage commands.                                                                                 |

SVG is restricted to graph/orbit geometry and labels; registered Mosaik icons remain the
product icon vocabulary. CSS in the generic diagram and figure components owns only
geometry or public semantic tokens. Transparent-figure styling,
offscreen pause and reduced-motion rules belong exclusively to Symphony's shared
AgentFigureComponent, as explicitly requested by the user. None of the new Views styles
Mosaik parts. The existing typed task, process, Actions and settings commands are reused.

Electron evidence and the final verification results are recorded in
[production orbit architecture](production-orbit.md).

**Adapt — Memphis content bounds and explicit drill-downs.** The shared PageToolbar
uses Tailwind's `empty:hidden` geometry to suppress a projected group with no actions.
An explicit Home attention link replaces a previously selected column/stage; ordinary
Orbit, Stages and Board switches retain the shared filters. The inspected FLAMOX365
`task/src/lib/views/dialogs/TaskDialogView.html` uses Mosaik Comment for discussion.
An independent Symphony-local Comment package patch bounds its nested stacks and inner content so
wide Markdown scrolls in the projected Markdown component. Symphony does not override
Comment parts. Layout checks measure actual content bounds: Memphis's public hard
elevation intentionally extends beyond the layout box.

## Integration into the normal Symphony build (2026-10-09)

The existing Orbit, Stages, Employees, Setup, Board, Actions, task-drawer and mobile
implementation now belongs to the normal Symphony checkout and its `yarn start`
and `yarn package` paths. The route decisions above remain unchanged. The reference
audit re-read FLAMOX365's PresenterView, TaskListView, SettingsView and TaskDialogView,
and Mosaik's Avatar, Page, Segment and Menu owners.

**Adapt — retain the operator's active shell styling.** The already enabled
`app.scss` and `app-header.scss` imports remain active during integration. They keep
the existing edge-to-edge content and fixed header band while the Orbit routes use
the shared Memphis theme and compact public component inputs. The design-document
configuration continues to inventory these stylesheet overrides. This preserves
the operator's current shell changes rather than replacing them with the earlier
development snapshot's disabled imports.

The trailing toolbar padding reserves only actual right-side native controls.
Mirroring the macOS left-side traffic-light inset caused search and update actions
to overlap the centred navigation at 1040 px with Memphis. The fixed header and
leading native-control clearance stay intact. The reference audit also re-read
Mosaik's AppHeader and Toolbar owners; their published padding contract owns this
existing shell geometry seam. The contextual-search and desktop journeys verify
navigation centring and action separation.

## User-requested Soho theme (2026-10-09)

**Differ — explicit product choice.** Soho supersedes the Memphis choice recorded
above across desktop routes, menu bar, Mobile and design previews. The owning
FLAMOX365 references remain `apps/frontend/portal/src/configuration/ShellConfig.ts`,
`src/styles/mosaik.scss` and `src/styles/tailwind.css`. The inspected Mosaik
references are `libs/mosaik-themes/src/Theming/SohoTheme.ts`,
`src/Theming/Tokens/SohoTokens.ts`, `src/themes/soho/soho.scss` and
`tailwind/v4/presets/sohoTailwindPresets.css` in the companion repository.
Symphony adopts the public Soho preset without application token overrides:
Inter, an 8 px spacing unit, a 10 px radius unit, neutral surfaces and 1 px borders.
Startup attributes, providers, Sass, Tailwind and generated documents agree.
At this point, existing shell geometry overrides and disabled legacy overrides remained in
their current state; route compositions and behavior are retained.

## Soho shell and surface alignment (2026-10-10)

**Adopt — Soho owns the chrome.** The exact references are FLAMOX365's
`apps/frontend/portal/src/styles/mosaik.scss` and
`libs/frontend/features/task/src/lib/views/TaskListView.html`, and Mosaik's
`AppHeaderElement.Soho.scss`, `AppElement.Soho.scss`, `ToolbarElement.Soho.scss`,
`ButtonElement.Soho.scss`, `FlowBoardColumnItemElement.Soho.scss`,
`design/soho/DESIGN.soho.md` and `tokens/themes/soho/components/appHeader.json`.
The title bar is Soho's shadcn site header: `bg-background` with the element's own
1px `highlight` rule, no shadow and no backdrop blur. The previous override painted
the band with `--mosaik-scheme-semi-transparent`, which Soho defines as the 50 %
black modal scrim, so the title bar rendered darker than the content. The header
override now sets only geometry (78 px band, native-control reserves, the
hide-on-scroll neutralisation and the compact segment widths) and keeps the 1px
rule explicitly because `app.scss` zeroes the App line. The content backplate
gradient is removed: Soho forbids gradients and primary-tinted page chrome, and
FLAMOX365's content surface is flat.

**Adapt — quiet actions under a coloured `tertiary`.** FLAMOX365 renders secondary
toolbar actions (Filter, Refresh, view switches) and the row "More actions" trigger
as `solid` + `tertiary`, which is a neutral grey under Joy. Soho's `tertiary` is an
orange derivation and a coloured `solid` renders Vega's soft tint, so the same
binding produced orange-tinted chrome. Symphony keeps the reference's placement,
icons, tooltips and menus and maps the intent to Soho's shadcn vocabulary instead:
toolbar actions use `outline` (Board selector, Board/Pull Requests/Actions filters
and Refresh, Skills catalog and Refresh, the rail's Actions refresh) and the
hover-revealed row/card "More actions" triggers use `plain` (ghost). Neither binds a
colour variant. The single `solid` `primary` action per view stays.

**Adapt — Board cards use the Soho card.** FlowBoard items were bound to `soft`,
which Soho renders as a borderless `bg-muted` fill. Board and delivery-group items
now use the default appearance, the Vega card (surface fill, 1px hairline,
`rounded-lg`, `shadow-xs`); columns stay `plain` lanes.

**Functional sheets.** `technical-value.scss` keeps identifiers, branches and paths in the system monospace stack prescribed by Soho. The former Foblex `process-graph.scss` has been removed with the migration to Mosaik Flow; the Flow diagrams reference audit above owns the current graph composition and token behavior.

**Adapt — native window backgrounds.** Windows and Linux paint Soho's `background`
role for the OS appearance (`#ffffff` / `#0a0a0a`) before the renderer's first frame
instead of a dark GitHub blue; macOS keeps its transparent vibrancy window, and the
dark-only menu-bar panel uses Soho's dark background.

The desktop journey asserts the `outline` toolbar actions on Pull Requests, Actions
and Board.

## Loading states that keep the loaded anatomy (2026-10-10)

**Adopt — skeletons mirror the loaded layout.** The exact reference is FLAMOX365's
`libs/frontend/ui/src/lib/components/activity-log/ActivityLogComponent.html`, whose
skeleton entries reuse the loaded entry grid, the marker and line positions, together
with Mosaik's `SkeletonElement`, `CellElement`, `CardHeaderElement`,
`FlowBoardColumnElement`, `FlowBoardColumnItemElement`, `TimelineMarkerElement` and
`CommentElement` slots. Every Symphony loading state now renders the real containers
(page header, FlowBoard columns and cards, collection-list header and row grid, cell
groups, cards, expanders, timelines) and replaces only values that are still loading
with skeleton lines sized to the line box of the text that replaces them. Static
headings, labels and section headers stay readable; controls whose look does not depend
on data (page toolbar actions, the task comment composer, the pull-request form, the
skill editor fields) render disabled instead of as skeleton blocks. The geometry was
verified in Electron by holding orchestration requests in the main process and comparing
the loading and the loaded screenshots of Overview, Board, Pull Requests, Actions,
Settings, the task dialog, the process drawer and the pull-request drawer.

**Fix — Settings showed its skeleton and its content at once.** The content grid was
hidden with the `hidden` attribute while carrying Tailwind's `grid`; without Preflight
the utility's `display` wins over the user-agent rule, so both rendered. The page-level
skeleton is gone: the navigation and every section that reads only settings render
immediately (the shell has loaded them), and developer tools, mobile access and sleep
show skeletons only in the place of their own controls, so no default state such as
"Mobile access is off" flashes before the real one. The voice-search toggle in the
global search uses `@if` for the same reason.

**Fix — Board showed "No work items found" while loading.** Board hydration awaited
only global initialization, which loads configuration but not the cached snapshot.
Without a snapshot the route now joins the cached read and, without a cache, the
provider projection, so the skeleton stays until the work items are known.

**Adapt — shared collection-list loading state.** `symphony-collection-list` gained
`isLoading` and a `symphonyCollectionListLoadingItem` row template, so Pull Requests and
Actions show their skeleton rows inside the same `<ul>`, padding and grid as the loaded
rows and keep the list header and sort menu in place. The Actions toolbar places its
actions directly in the toolbar slot, as Pull Requests does, so both routes align.

## Original OpenDots employee artwork (2026-10-09)

**Differ — explicit artwork correction.** Employee figures now use the four original
OpenDots plush PNGs, including their original accessories, rather than Symphony's
retired geometric Memphis figures and flat accessory overlays. Soho remains the
UI theme. Images and their MIT notice are packaged locally and unchanged on Desktop
and Mobile. `resources/figures/README.md` records the pinned source and hashes.

**Adopt / Adapt — separate renderer and interaction.** The exact additional read-only
FLAMOX365 references are `libs/frontend/pet/src/lib/pet/PetComponent.ts`, `.html`,
`.scss`, `petAnimation.ts`, `petFramePosition.ts`, and
`libs/frontend/ui/src/lib/components/pet/PetComponent.ts`, `.html`, `.scss`.
Symphony adopts the separation of visual state inputs from feature-owned interaction,
cleanup and reduced motion, inside its existing `AgentFigureComponent` and Orbit
presenter. The original PNGs remain catalogue thumbnails and static/custom fallbacks;
the animation extension below ports FLAMOX's multi-row playback into inline employees.
The six preview Choices use Mosaik's public label slot, normal keyboard interaction
and checked state in one Choice Group. Choosing a character remains part of the agent draft until Save;
real execution state remains authoritative and CLI-independent. The feature has no
Pet label, free-chat control or Mosaik Avatar/Persona changes.

**Adopt / Adapt — appearance belongs to agent identity (2026-10-10).** The exact
additional references are FLAMOX365's
`libs/frontend/features/identity/src/lib/user/views/dialogs/UserDialogView.html`
and `AvatarDialogView.html`, with
`view-presenters/dialogs/AvatarDialogViewPresenter.ts`, and Mosaik's public
`Controls/Components/Buttons/Button/ButtonComponent.ts`. Symphony adopts the
identity form's single Save/Cancel owner and the avatar selection's transient
preview. It adapts the human avatar choices to a catalogue of six full employee
figures inside step 2 of the existing workspace AI agent drawer.
Name, role, routing and appearance use the same draft and settings save; there is
no second editor or feature-owned appearance store. Employee details retain actual
work and greeting, and their Edit agent action opens that drawer through
`/main/settings?workspace=<workspaceId>&agent=<agentId>` only when the profile
belongs to that workspace. This intentionally differs from FLAMOX365's separate
human-avatar dialog: an employee's identity is configured together with its job.
The agent editor has no own-image upload or file picker; the employee catalogue is
the only editable appearance source. Legacy image references remain readable.

**Adopt / Adapt — figure preview Choices (2026-10-11).** The exact references are
FLAMOX365's `libs/frontend/features/identity/src/lib/user/views/cards/PetCardView.html`
and `libs/frontend/features/sales/src/lib/order/views/dialogs/OrderDialogView.html`,
plus Mosaik's `Controls/Components/Inputs/Choice/ChoiceGroupComponent.ts`,
`ChoiceComponent.ts` and Foundation `ChoiceGroupElementTemplate.ts`.
The existing agent identity step now uses one public Choice Group value and six
direct Choice children, each with its original PNG and name in the label slot.
The checked Choice is the sole appearance selection and preview; the duplicate
figure above the picker is removed. Selection updates the same agent draft and
retains its Save/Cancel lifecycle, stable identity and CLI independence.
Symphony adapts the reference's wrapping grid to the public vertical orientation
with compact preview rows, so the drawer remains usable at narrow widths without
overriding Mosaik parts, internal properties or source files.

The inspected Mosaik owners are `AvatarElementTemplate.ts`, the Avatar
`Themes/_AvatarElement.scss` portrait mask, the published Angular Avatar inputs,
and Button's public label slot. A full transparent figure stays in the already
authorized Symphony renderer rather than overriding that portrait mask. The new
portable `create-employee-figure` skill records the upstream research and supplies
a reusable plush-art brief, static PNG validator and adapted Codex sprite pipeline.

**Adopt — FLAMOX sprite implementation.** At reference revision
`2fc29a56e37449b4fbbfb1d7027249af652eb28f`, the exact additional owners are
`PET_ATLAS.ts`, `petAnimation.ts`, `petFramePosition.ts`, `petLookFrame.ts`,
`PetAssets.ts` and both Pet component triples. Symphony ports the v2 geometry,
timings, frame positions, clockwise gaze and finite gesture cleanup into
`AgentFigureComponent` and its adjacent sprite helpers. Mosaik Avatar/Persona
remain unchanged; the Button public icon slot owns selection and keyboard greeting.

**Adapt — inline activity and attention.** FLAMOX's fixed, freely placed overlay,
global assistant service, chat/voice composer and pixelated art are adapted to
inline, smooth plush employees on Team, Orbit, Stages, execution details and Mobile.
The existing work/feedback actions own interaction. Idle gaze and bounded greeting
never replace actual work state. Real work/waiting loops outlive finite gestures;
pause/block/failure/stale stop playback. Offscreen, hidden-document, reduced-motion
and destruction gates stop timers. Six cached decoded atlases and one pointer
listener avoid per-employee image decoding and global event listeners. Mobile uses
the same renderer and validated active role, and tapping a working employee opens
its actual leading ticket. Single-PNG/custom fallbacks keep simple CSS motion and
a finite greeting tilt; they do not pretend to contain the generated sprite poses.

**Differ — Symphony artwork production.** The originals remain byte-identical;
new v2 pose art is generated from those approved identities through the adapted
`create-employee-figure` skill. It calls the installed Codex `create-pet` scripts
unchanged, retains their frame/direction/motion acceptance gates and records exact
prompts and hashes. No proprietary toolkit is copied into this repository. A
deterministic shared transform per row fixes independently extracted jump/body
scale while preserving airborne displacement. Packaging checks every original,
atlas and MIT notice byte-for-byte on desktop and mobile. No Pet label or external
Pet lifecycle appears in Symphony.

**Adapt — phone scroll clearance.** The existing `MobilePresenterView` owns the
floating bottom navigation and now reserves safe-area-aware scroll clearance in
its native main viewport once paired. This keeps the final employee figure and
its action fully reachable above the navigation without per-route padding or
Mosaik part overrides. The existing Mobile journey scrolls to the employee,
checks its complete image is above the navigation, and exercises greeting and
reduced motion. This restores the scroll-space contract of the mobile shell
documented above; FLAMOX365 has no equivalent floating phone navigation.

**Differ — six employee identities.** The user's requested expansion adds two
Symphony-authored plush characters, gold Spark with teal forehead goggles and
rose cloud Loop with cream antennae. The four original OpenDots PNGs stay
byte-identical. The same figure component, work projection, six-choice editor,
typed appearance contracts and Mobile renderer own all six. The original default
hash palette is frozen; only an explicit saved selection changes an existing
employee's identity. No new Mosaik component or visual-state owner is introduced.

## Astronomical 3D Orbit in the original project (2026-10-09)

**Adapt — selectable Solar System bodies (2026-10-11).** The Production destination
editor adopts the public Mosaik ChoiceGroup/Choice composition with preview
content in the `label` slot inspected in FLAMOX365's
`libs/frontend/features/identity/src/lib/user/views/cards/PetCardView.html`
and Mosaik's
`libs/mosaik-elements-foundation/src/Controls/Components/Inputs/Choice/ChoiceElementTemplate.ts`,
`ChoiceGroupElement.ts` and their Angular proxies. **Adapt:** the public vertical
orientation keeps all nine labelled previews readable within the desktop drawer
without overriding Mosaik's internal layout parts or styles. Locally bundled,
transparent PNG previews are generated from the existing Orbit renderer; the
editor needs no additional 3D contexts. Previews omit background stars and have
explicit 96 × 64 CSS-pixel bounds to retain their density under Soho's spacing scale.
Its template owns Sun and eight planet labels;
the existing tracked draft and Save/Cancel commands own persistence through the
Zod destination contract. There is no Mosaik source or styling override. **Differ:**
the already requested 3D Orbit now maps the selected body onto its existing
Production object using locally bundled Solar System Scope maps and Saturn's
ring geometry. Natural surface colours are intentional astronomical content;
the page, controls and overlays retain Soho and follow its light/dark mode.
Selected celestial bodies receive a narrow silhouette contour rather than the
old wireframe cage, so the selected surface and Saturn's rings stay legible.
Existing destinations default to the Sun. Multiple Production destinations retain
their individual bodies around the conceptual Sun. Body sizes serve navigation
rather than physical scale; tickets and delivery evidence remain authoritative.
The focused Electron journey checks all nine preview images, pointer and keyboard
selection, local asset loading,
Save/Cancel and process-restart persistence, and captures light/dark surfaces.

**Adapt — Orbit destination configuration and overlay details (2026-10-11).**
The affected routes are `/main/orbit` and `/main/settings`. The exact read-only
references are FLAMOX365's
`libs/frontend/features/finance/src/lib/invoice/views/dialogs/InvoiceDialogView.html`
(header, independently scrolling detail content and close action) and
`libs/frontend/features/finance/src/lib/accounting-connector/views/cards/AccountingConnectionsSettingsCardView.html`
(workspace-owned connection rows and explicit editors), together with Mosaik's
`Controls/Components/Grouping/Card/CardComponent.ts`, `CardContentComponent.ts`,
TextBox, Select and existing Drawer contracts. Symphony **adopts** these public
Mosaik components and its own left Orbit explorer's solid Card composition for
the right details overlay. **Adapt:** a nonmodal, scene-local overlay preserves
the full camera viewport and permits continued exploration; it is not a modal
business-document drawer. One overlay at a time avoids competing panels on narrow
windows. Close and Escape dismiss it; configuration stays reachable below the
scrolling evidence. No Mosaik styles or source files are patched.

**Adapt:** the Production sun supplies project context, actual destination fields,
missing/unconfirmed/stale evidence states and a link into the owning workspace's
Delivery destinations section. That section reuses Settings' Segment, Card, Cell
Group and existing SettingsEditorDrawer, rather than persisting an Orbit-specific
configuration. Workspace/repository/target relationships are checked before opening
an editor; missing Production opens a prefilled draft, multiple Production targets
open the scoped list, and discovered destinations can be adopted explicitly.
Add/Edit/Remove reuse `settings.save` and the existing Zod destination schema.
Optional workflow discovery reuses `setup.repository.inspect` without dispatching.
English copy follows these routes' existing template-owned text; no independent
locale resource exists for the new fields. Configuration and confirmed delivery
remain distinct. Electron verification covers cancellation, saved identity across
restart, project isolation, duplicate prevention, theme-aware overlays, dismissal
and an unchanged scene viewport; existing 1,000-ticket Orbit tests retain the
ticket/process and deployment interaction paths.

The affected routes are `/main/orbit`, `/main/home`, `/main/stages`, `/main/team`
and access to `/main/setup`. The exact read-only references re-audited are
FLAMOX365's `libs/frontend/presentation/src/lib/views/PresenterView.html`,
`libs/frontend/features/explorer/src/views/ExplorerView.html`,
`libs/frontend/features/task/src/lib/views/TaskListView.html` and the Pet owners listed
above. Mosaik's inspected public owners are Page, PageContent, Button, Select,
Segment, MenuItem and Theme2 under `libs/mosaik-elements-foundation/src/Controls/`.
The final detail-copy audit also inspects Mosaik's public Hint component and
`Primitives/Hint/HintElementTemplate.ts`. Informative Orbit hints adopt the same
public `textOverflow: wrap` input as FLAMOX365's TaskList detail hints, keeping
delivery explanations and repair messages readable inside the narrow details.

**Adopt — application and interaction ownership.** The existing Angular
View/Presenter/store boundary, public Mosaik control inputs/slots, native keyboard
activation and the canonical Symphony employee component remain authoritative.
The renderer receives immutable provider-neutral world objects; it owns no
provider calls, assignment policy, configuration or deployment mutation. Existing
typed commands own ticket details, workflow changes and explicit delivery actions.
Orbit, Board and Stages retain shared selection and filters.

**Adapt — distinct primary destinations.** Overview is restored as its own
`/main/home` navigation item and Orbit has a separate `/main/orbit` item. Their
Mosaik Segment activation keeps the established `checked`/active-route guard so
keyboard actions and query-bearing deep links continue to work. The workspace
menu exposes Employees, Stages and setup before the final Settings section.
Orbit removes the local duplicate navigation, project-connection action and
permanent lower ticket grid. The existing Runs rail closes on Orbit entry and
can be opened explicitly. These shell choices preserve FLAMOX365's separation
of destinations and contextual work while adapting its side navigation to the
desktop header composition.

**Differ — explicitly requested astronomical scene.** The former orthographic
DOM transform is replaced by Three.js PerspectiveCamera, WebGL bodies, a shader
sun, actual configured destination orbits, an instanced ticket belt and native
raycasting. The single configured production destination belongs to the central
sun; multiple production destinations remain individually reachable around the
central aggregate. Ticket phase and confirmed deployment relationships are
separate. Every filtered ticket remains in GPU geometry; semantic zoom bounds
DOM labels instead of hiding tickets from the model. The on-demand object
explorer provides a keyboard alternative without a second permanent board.
No equivalent FLAMOX365 solar-system view exists to adopt.

**Adopt / Adapt — page theme (corrected 2026-10-10).** The
viewport inherits the same effective Soho scheme as the page. Its transparent
WebGL canvas has no scoped dark theme. Mosaik's public `ThemeObserver` events
refresh GPU colours from public theme tokens while retaining camera and selection.
Lighting uses the brighter scheme pole in both modes. The exact read-only theme
references are `../mosaik/libs/mosaik-elements-angular/src/Cdk/Theme/ThemeService.ts`,
`../mosaik/libs/mosaik-themes/src/Theming/ThemeObserver.ts`,
`../mosaik/libs/mosaik-themes/src/Theming/Tokens/SohoTokens.ts` and FLAMOX365's
`libs/frontend/ui/src/lib/components/activity-log/ActivityLogComponent.ts`.
The observer adapts inherited CSS colours to GPU materials; no Mosaik API or source
is modified.
Following the 2026-10-10 product decision, Orbit does not project employee work
or offer employee selection. Its explorer and details focus on tickets and delivery
destinations. The later passive spacecraft addition below uses saved identities
without restoring employee work nodes or controls. Actual employee work remains
in the existing work surfaces and workspace settings.
The Fit camera targets the sun and uses actual projected extents; compact labels
and group counts use public Mosaik Small controls and typography. Three.js loads only with the desktop scene; it is
absent from the Mobile entry point. Finite camera transitions, reduced motion,
offscreen pause, cleanup and a useful WebGL fallback remain renderer concerns.

The obsolete `projectSpatialScene` and the retired 2D Orbit projection are
removed; the later route consolidation retires the 2D workflow canvas. Product UI copy
remains English in its owning templates. The current implementation and
verification ownership are recorded in [production orbit](production-orbit.md).

**Differ — Orbit without employees (2026-10-10).** The exact references re-audited
are FLAMOX365's `libs/frontend/features/explorer/src/views/ExplorerView.html` and
`libs/frontend/presentation/src/lib/views/PresenterView.html`, and Mosaik's
`Controls/Components/Buttons/Button/ButtonElementTemplate.ts` and
`Controls/Components/Inputs/Select/SelectElementTemplate.ts` under
`libs/mosaik-elements-foundation/src/`. Page composition, public button label
slots and select interactions remain Adopt. The user's requested solar-system
view remains a product-specific Differ: employees supply no current Orbit action,
so their figures, team aggregates, work/handoff edges, explorer category and
employee details/assignment controls are removed from that route. This is a
projection change; Team/Stages and profile configuration retain their owners.
The shared presenter prevents an employee selected in Team from opening Orbit
details, without creating a second selection store. Native Electron journeys
cover that route change, ongoing analysis, ticket zoom and the six saved identities
in Team. No reference-repository or theme changes are required.

**Differ / Adopt / Adapt — passive project shuttle flights (2026-10-11).** The user
explicitly requested ambient gamification after removing actionable employees.
The exact read-only references re-audited are FLAMOX365's
`libs/frontend/pet/src/lib/pet/PetComponent.ts`, `.html`, `.scss`, its motion-query
cleanup, `libs/frontend/features/explorer/src/views/ExplorerView.html`,
`libs/frontend/presentation/src/lib/views/PresenterView.html`, and Mosaik's
`Controls/Components/Primitives/Text/TextComponent.ts` public text and typography
composition. Lifetime and reduced-motion behavior are Adopt; a bounded inline
scene and passive names are Adapt. No reference solar-system spacecraft exists.
The original procedural Three.js shuttle and finite orbital flight paths are an
explicit product Differ authorized by the gamification request. Saved enabled
profiles from the selected project's workspace provide the pilots and their PNG
appearances; the existing identity resolver is reused. A glass cockpit shows the
pilot, and the shared rocket hull follows Soho palette tokens in both schemes.
The user's follow-up replaces the saucer with a pointed rocket, four fins and an
engine plume. Unlike FLAMOX365's viewport pet with its `zoom` input, this model
and its PNG pilot retain fixed scene units and scale through the Orbit camera,
just like ticket meteors. This is an explicit Adapt to the 3D landscape. The nose
follows the trajectory; the porthole remains visible and the existing public Mosaik
Text caption is anchored below the projected rocket bounds. No View or Mosaik
internal styles are changed. `OrbitFlybyFleet.spec.ts` verifies scale relative to a
nearby meteor across zoom and resize; the visible Electron journey exercises the
same zoom controls and captures the rocket in both Soho schemes.
Random appearances run individually or in small simultaneous waves, without
creating task state or modifying the user's selection. Native meshes and passive
name captions never consume pointer or keyboard input. Reduced motion, hidden
scenes, scope changes and disposal stop the flights; one idle timer replaces an
autonomous idle render loop. This introduces no Mosaik source changes, third-party
model license, extra UI framework, employee panel or provider-specific dependency.
`orbit-flybys.spec.ts` verifies reduced-motion suspension in the default native-hidden run;
`yarn e2e:visible --grep='flies saved project pilots'` additionally exercises real
flights, readable identities, both schemes, finite exits and native hiding.
The Electron harness resolves the primary page with `firstWindow()` and its
native window with `browserWindow(page)`, so startup navigation cannot invalidate
the window identity. Visible journeys wait for the native window to be shown;
the flyby journey checks native hiding through Electron and suspension through
reduced-motion emulation. Playwright keeps captured documents active even when
their native window hides, so document-visibility suspension, resumption and
listener cleanup are verified in `OrbitCanvasComponent.spec.ts`; flight cleanup
remains covered by `OrbitFlybyFleet.spec.ts`.

## Board ticket width and scrolling

**Adopt.** The Board retains FLAMOX365's task FlowBoard, collapsible workflow
columns, variable-height CDK virtualization, wrapped Mosaik Text/Hint inputs,
selection and card-action slots. The inspected sources are
`../flamox/libs/frontend/features/task/src/lib/views/TaskListView.html`, its
`DynamicSizeVirtualScrollDirective.ts` and `DynamicSizeVirtualScrollStrategy.ts`,
and Mosaik's `FlowBoardColumnElement`, `FlowBoardColumnItemElement`, Text and Hint
templates and Soho styles.

**Adapt.** Symphony's expanded desktop columns reserve 24rem for ticket titles,
repository context, project fields and actions. Collapsed columns keep Mosaik's
native strip geometry. The CDK content wrapper and recycled entry hosts fill the
column's available width; the viewport scrolls vertically only. Projected title
and subtitle content contributes zero intrinsic width, then fills the resolved
Mosaik title-group width, so long compound words and identifiers wrap without
forcing the selection or action control outside the card. Long labels use the
public Badge's normal truncation within the available width and expose the full
value through a tooltip. The whole board remains horizontally navigable.
Branch chips shrink within their available row and retain the full-name tooltip.
No Mosaik source, internal part styles or theme tokens are changed.

The native Electron board-scroll journey checks a long German title and unbroken
project-field text, including actual rendered glyph bounds rather than only
hidden overflow. It also verifies action focus, a collapsed neighbour, 125% zoom,
long labels, virtualized vertical scrolling
to both ends and recycling; the collapse, selection/grouping, drag and context
action journeys cover the existing interactions.

## Published Mosaik package portability

**Adopt.** The Linux CI audit uses the published Mosaik family at `0.1.178` and
Markdowner core at `0.1.175`, which correct case-sensitive module resolution in
the earlier package archives. Mosaik's elements, Angular wrappers, foundation,
icons and themes share one exact version because their package dependencies are
also exact. FLAMOX365's
`libs/frontend/ui/src/lib/components/markdown/MarkdownParser.ts` retains the
same public Markdown processor contract used by Symphony.

The read-only Mosaik references are `libs/mosaik-elements/src/Index.ts` and
`libs/mosaik-themes/tokens/themes/soho/components/{formField,kbd}.json`.
Symphony adopts the published Soho form-field tokens (12px gap and zero padding)
and keyboard-label foreground (`scheme-lowlight`). The regenerated `DESIGN.md`
and `COMPONENTS.md` also express equivalent motion durations in seconds. No
product-owned token override, module alias or package patch is introduced.
The existing renderer tests and native Electron journeys remain the acceptance
gates for the package update.

## Execution and Workflow feature ownership

**Adopt — feature providers and drawer ownership.** The exact read-only references are FLAMOX365's `libs/frontend/features/task/src/lib/provider/provideTaskFeature.ts`, `libs/frontend/features/task/src/lib/view-presenters/TaskDialogViewPresenter.ts`, and `libs/frontend/features/task/src/lib/views/dialogs/TaskDialogView.ts` / `.html`. Execution and Workflow register their own stores, consumed ports and Views. Their drawers retain the existing three-file units, OnPush composition, Hydratable presenters, Command contracts, markup and test IDs. The inspected Mosaik owners are `libs/mosaik-elements-angular/src/cdk/overlays/drawer/DrawerService.ts`, `slots/DrawerContentDirective.ts`, and `components/timeline/TimelineComponent.ts` / `TimelineItemComponent.ts`; their public slots, focus and lifetime behavior remain unchanged.

**Adapt — local desktop synchronization.** Symphony uses its validated typed IPC client in place of FLAMOX365's generated HTTP clients. Core retains one transport snapshot behind bounded projection bridges. Execution owns the event subscription, coalesced state timer and freshness signal; Workflow owns human-decision busy state, which Work includes in its existing mutation-busy projection. Core consumes typed feature contracts and initializes the execution subscription before incident and snapshot refresh. Publication retains the existing Delivery command and its single shared busy guard. Workflow's process drawer reads its own feature operations rather than the Work store; Work opens that public drawer through its existing lazy boundary. No visible copy, layout, selection behavior or theme input changes are introduced.

The existing manual-completion and event/reconciliation assertions move beside the new owners. Focused DI regressions cover shared freshness recovery and human-action busy state through reconciliation. Running Electron parity verification remains part of the coordinated integration gate.

## Mobile feature ownership

The reference pass inspected FLAMOX365's `EdgeSettingsCardViewPresenter`,
`EdgeSettingsCardView` and `provideEdgeFeature`, together with Mosaik's public
`ToggleSwitchComponent` and `QRCodeComponent` contracts. **Adopt:** Mobile now
contributes its own lazy Settings card through the native Settings slot and a
feature provider, with a focused View/Presenter three-file unit. The existing
card markup, Mosaik inputs, QR address, approval actions and test IDs are retained.

**Adapt:** local phone access and pairing use Symphony's existing validated
desktop IPC contract; FLAMOX365's organization Edge API is not available here.
`MobileAccessStore` owns the only desktop status, challenge and busy signals.
Desktop consumers use that owner's typed capability without an aggregate Core facade. The same
two-second enabled-only status refresh is now disposed with the mounted Mobile
card rather than running while unrelated Settings sections are open. Initial
loading remains owned by that card.

**Adapt:** `frontend-feature-mobile/browser` owns the existing browser transport,
companion state, pairing/reconnect timers and phone theme store. Browser bootstrap
and routed Work, Delivery and Presentation consumers use that browser entry,
which does not load the desktop provider or preload API. Core's browser-safe
presentation, navigation and shared theme-preference primitives remain generic.
Existing payloads, pairing challenge recovery, request/event validation, timer
delays, cancellation and theme behavior are preserved. Source-adjacent tests
cover shared desktop exclusion, failed-disable recovery, silent refresh failure,
card poll disposal and browser pairing poll cancellation. Actual Electron and
phone route parity remains part of the coordinated integration verification.

## Automation and Platform settings ownership

The reference pass inspected FLAMOX365's native `SettingsView` and
`QuestionnaireSettingsViewSlotProvider`/`QuestionnaireSettingsCardViewPresenter`,
the Edge settings card pattern, and Mosaik's `ViewSlotOutletComponent`, FileBox,
NumberBox, ToggleSwitch and Select public contracts. **Adopt:** each included
feature contributes its actual lazy card and section metadata through the native
Settings registry. Automation's policy card, System Storage safety, Developer
tools and Appearance retain their existing Mosaik markup, copy and test IDs.
Their presenters expose the existing commands and explicit state.

**Adapt:** `AutomationSettingsStore` owns the single editable runtime policy.
Automation and System Storage safety share that signal, retain unsaved edits
when their cards are remounted in the same Settings route, reset once for a new
`SettingsHostSession`, and reconcile authoritative settings changes into the same
signal. Saving continues through the existing validated whole-settings writer.
The CI settings view consumes only a readonly managed-root projection through
Shell composition; it does not create another runtime draft. The CI virtual
machine card remains first in Automation, followed by the unchanged policy
card. System keeps Storage safety before Developer tools, Updates and Sleep.

**Adapt:** Platform owns the native tool inspection and installation busy
signals and the persisted desktop-theme effect. The existing transport snapshot
remains the only health-data owner. Native operations retain their typed IPC
requests, explicit Homebrew confirmation, status updates, failure messages and
exclusion rules. Appearance retains one route draft and applies only the saved
preference; system-theme listeners retain their existing cleanup lifecycle.
The same five-second silent storage measurement refresh now belongs to the
mounted Storage safety card and is disposed with it, rather than polling while
unrelated Settings sections are open. Source-adjacent regressions exercise draft
sharing/reset, whole-policy save inputs, native-operation exclusion/recovery,
storage timer disposal and theme listener cleanup. Coordinated Electron route
verification remains the final parity evidence.

## Work onboarding and remaining platform lifecycle ownership

**Adopt:** the existing reviewable Setup View remains a three-file Work-owned
View/Presenter route. Its `/main/setup` bookmark, proposal fields, inspection,
explicit Apply action, repository preparation and read-only analysis flow keep
the existing Mosaik inputs, markup and test IDs. The reference remains the
inspected FLAMOX365 Settings/ViewPresenter composition and public Mosaik form
contracts. Team creation reuses the public Team-owned `createSetupTeam` policy.

**Adapt:** Setup consumes a bounded projection, the single configuration writer,
application bootstrap, Work refresh and optional repository/execution ports. It
does not instantiate the former aggregate facade. The existing analysis action
is disabled when its required product capabilities are omitted. Workspace now
owns repository preparation and verification state, retaining one exclusion
guard across preparation, planning and execution. Automation owns the existing
unprepared-repository query and deduplicated warning lifecycle; reconciliation
keeps the previous settings-refresh, warning and success order.

**Adapt:** Arcade reads and writes its saved preference through the existing
configuration owner and waits for the public application bootstrap before its
route guard evaluates it. Platform owns the existing confirmed incident list
and single 60-second status-page poll; bootstrap starts it at the original
point after execution event initialization and before snapshot refresh. The
owner cancels its timer on disposal, including preventing a late completed
request from scheduling another poll after disposal. No new visible status or
platform decoration is introduced.

## Feature-owned transport projection adapters

**Adopt:** following the inspected FLAMOX365 feature-provider composition,
Work, Workspace, AI, Automation, CI, Execution, Workflow, Skills and Platform
now own their default consumer contexts and product-specific projection/update
rules. Their existing typed feature ports remain the substitution boundary.
The move does not change View markup, routes, commands or Mosaik inputs.

**Adapt:** Symphony's validated desktop transport delivers one combined
snapshot. The public Core `ApplicationSnapshot` exposes that existing readonly
signal and a typed immutable update callback; it creates no additional state.
Feature adapters preserve the existing field updates, item order, unrelated
snapshot fields, refresh ordering and optional values. Readonly application
projections retain their authoritative computed identities. Configuration
application and measured-storage updates remain on the existing single
`ConfigurationStore`, including response application after validated transactions.

Skills now owns active-team resolution, assignment cloning and built-in
customization directly, preserving the original save-message suppression.
Workflow owns its process projections without importing a concrete Execution
adapter. CI Settings consumes the same configuration writer directly, and Team
composes its own configuration/native-tool context rather than depending on an
AI implementation. The former Core `Legacy*Environment` implementations are
removed after their provider consumers were switched; only legitimate consumed
contracts and tokens remain in Core.

## Static product composition, bootstrap and Skills settings

**Adopt:** feature entrypoints follow the inspected FLAMOX365
`apps/frontend/portal/src/configuration/ShellConfig.ts`, Task feature provider,
Tenant terms card and Chat group drawer patterns. Each selected Symphony
feature registers its own navigation, search, authoring, Settings and widget
contributions. The Shell provides each capability manager once. Mosaik's public
`provideViewSlot` and `ViewSlotRegistry` remain the native composition mechanism;
no product plugin runtime or route reset is introduced.

**Adapt:** `ApplicationProductComposition.ts` selects providers and lazy routes
in one static definition list. Presentation derives its fallbacks from the
first included concrete page, retaining Orbit in the standard product and
remaining valid without Home. Work owns Setup and its former Stages bookmark;
Team owns its former Team bookmark. CI's optional runtime-root bridge reads the
one Automation draft when included and otherwise the persisted readonly
application projection. The original nine search shortcuts retain their
feature ownership, order and alias-before-entity priority.

**Adapt:** the Core `ApplicationBootstrap` owns one shared startup promise.
Optional Execution initialization precedes optional Platform incidents, then
snapshot refresh starts while configuration, Skills and storage hydrate. Shell
initialization does not wait for the remote snapshot or CI; CI usage and runs
start in their existing order after that snapshot resolves. Optional feature
ports do not construct omitted feature state.

**Adapt:** the desktop menu retains its independent request session and isolated
Execution controls. Existing consumed capability tokens determine whether
Execution, CI, Automation and repository preparation are included. Omitted
owners contribute no menu controls, requests or polling; the menu does not
construct desktop bootstrap or snapshot synchronization. With every feature
included, request order, visible copy and stable test IDs remain unchanged.

**Adopt:** Skills owns the existing built-in role cards, native import drawer
and System header action as three-file View units with focused presenters.
Copy, test IDs, Mosaik inputs, layout, native folder selection, import exclusion
and close-only-on-success behavior remain unchanged. The generic Settings host
has no Skills command or business-field switch. The existing role instruction
commands and drafts now follow the native `SettingsHostSession`: section
switches retain edits; a new Settings route resets them. The single Skills
catalog and aggregate configuration writer remain authoritative.

Source-adjacent tests cover bootstrap ordering and in-flight identity, actual
DI and Router feature omissions, the nine search shortcuts, role draft scope,
import completion/failure and the header action. Coordinated Electron route
verification remains the final parity evidence.
