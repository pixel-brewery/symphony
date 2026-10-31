## Problem

Symphony now renders Mosaik 0.1.183 in Soho, but its window is still the original shell: a top navigation header, a workspace rail and routed pages. The "Symphony Redesign" canvas defines a macOS-native layout for the desktop app — a source-list sidebar, a unified toolbar, inspector panes, a command palette, a work-item sheet and a redesigned Settings — built only from Mosaik components and `--mosaik-*` tokens. Nothing of that layout exists in the app yet, and the canvas cannot be implemented from a cloud session because it needs the real Electron app, its data and its tests.

## Current behavior

- The shell shows a top header with `Overview`, `Board`, `Pull Requests`, `Actions`, `Orbit` and `Arcade`; the labels collapse to icons below the medium breakpoint.
- The header also carries `Search workspace`, `Settings`, voice input (`Start voice input`) and the update actions (`Download update …`, `Install update … and restart Symphony`).
- A workspace rail (`Open workspace rail`) lists workspaces and a `Runs` panel with `Agent Runs` and `Actions`.
- `Overview` (`/main/home`) greets the user and shows `Work in progress` as count tiles per board column (`Needs attention`, `TODO`, `Ready`, `Backlog`, `Qualified`, `Acceptance`, `Progress`, `Done`, `No column`), a pull-request list and action-run counts (`In progress`, `Queued`, `Failed`, `Succeeded`, `Cancelled`) in one horizontally scrolling row. It has no reporting over time, no quick actions and no decisions; there is no inbox.
- The menu-bar extra (tray, 328 px) shows `Capacity` with a bar and `{n} execution slots are available.`, collapsed `Agent Runs` and `Actions` lists (`No recent runs`, `Latest 3`) that must be expanded, the `Autonomous work` switch, `Repository preparation required` when needed, and `Open Symphony`, `Check for updates`, `Settings`, `Quit Symphony`.
- There is no command palette.
- Work items are created through a dialog on the Board.
- Settings is a routed page (`/main/settings`, setup at `/main/setup`) with a section menu (`Workspaces` with the workspaces nested, `Automation`, `Skills`, `System`, `Mobile access`, `Appearance`). An opened workspace switches its sections with a segment (`AI team`, `Connected services`, `Repositories`, `Delivery destinations`, `Local GitHub Actions`, `Administration`). Editors open as side drawers, removals as message boxes, and most cards save with their own `Save` button.
- Installed skill packages have their own page (`/main/skills`) with `Add skills` and `New skill`.

## Expected behavior

The app matches the artboards in `screens/`: thirteen main-window screens (1440 × 900), the tray (`Tray-*`, 520 px with the menu bar) and Settings with every section, sheet and confirmation dialog (1000 px wide; drawn at full scroll length as a 1000 × 760 window — since the decision of 2026-10-31 Settings opens inside the main window, see `DECISIONS.md`). Light mode as drawn, dark mode through the same tokens; `screens/Overview-dark.png` shows the dark mode of the start page.

### Window chrome (every main screen)

- A 240 px source-list sidebar on `mosaik-color-neutral-100` with a 1 px `mosaik-scheme-highlight` divider: the traffic-light area (macOS only) and `Hide sidebar`, a workspace switcher card (`FLAMOX365`, repository slug, `Switch workspace`), `Overview` as the first entry, the group `Delivery` with `Inbox`, `Board`, `Pull requests`, `Actions`, `Orbit`, the group `More` with `Arcade`, a run panel at the bottom and `Settings` pinned below it.
- `Overview` is the start page: the first sidebar entry, above `Delivery`, and the screen Symphony opens on at launch.
- The run panel switches between `Agents` and `Actions` with a small two-segment switch on a neutral track (`Agents | Actions · 2`, the count being running and queued runs). `Agents` lists each agent with its avatar, name, current activity and status dot, as drawn. `Actions` lists the current action runs — running with an indeterminate `ProgressRing`, queued, and the latest failure — each with workflow, revision and state, as in `screens/ActionsOverview.png`. The panel takes the place of the workspace rail's `Runs` panel.
- A 28 px status bar spans the whole bottom edge of the window in every main view, on `mosaik-color-neutral-100` with a 1 px `mosaik-scheme-highlight` top border, in `mosaik-typography-caption` and `mosaik-scheme-lowlight`. It carries small notices as icons and short texts: on the left the GitHub sync state (`Synced with GitHub 2 min ago`), on the right the notification bell with its count (see `Notifications`), the app version (`Symphony v0.1.16`) and the app-update button. Its controls are 24 px.
- The app-update button appears only while a newer Symphony version is available: icon-only (`download` icon, no text) with an accessible label. A click starts the download, and a Mosaik `ProgressRing` around the icon fills with its progress. Once the update is downloaded, the button turns into a labelled `Restart to update` button; clicking it installs the update and restarts Symphony. `screens/UpdateStates.png` shows the three states.
- Small notices live in the status bar, not in toolbars or page headers; the sync note leaves the `Pull requests` header and the `Board` subtitle.
- The chrome has no voice input.
- Sidebar rows show counts on the right; the inbox count and the failing-actions count use a danger badge, the others a quiet number.
- The selected row uses the soft appearance one neutral step darker than the sidebar (`mosaik-color-neutral-200`); rows and toolbar controls are 32 px high.
- A 52 px unified toolbar: `Back`, `Forward`, the screen title with a one-line subtitle, contextual actions, and a `Search ⌘K` field.

### Screens

- `Notifications` (`screens/Notifications.png`): the bell in the status bar opens a 400 px popover upwards over the current view. Header `Notifications` with the count and `Mark all as read`; `Needs attention` with one row per problem (icon, title, where it lives, fix buttons such as `Install with Homebrew`, `Sign in`, `Prepare locally`, `Reject` / `Approve`, unread dot); `Earlier today` with read notices such as `Repository prepared locally.` and `Guest image updated.`; a footer noting that work-item decisions stay in the `Inbox`, with `Clear read`. Without anything to show it says so.
- `Inbox`: a segment `All 6 · Decisions 4 · Updates 2`, a list grouped into `NEEDS YOUR DECISION` and `UPDATES`, and a detail pane with status chips, the five-stage stepper (`Analysis`, `Solution`, `Implementation`, `Checks`, `Acceptance`), selectable continuation options, `Assign and start`, `Snooze until tomorrow` and the analysis findings with `Open analysis`.
- `Board`: a segment `All · Needs you · Agents running · Mine`, the repository chip, `Filter` and `New work item`; Backlog, Qualified and Done collapse to narrow vertical columns; cards show the id in the technical-value style, the title, a status chip, the agent avatar and a five-step progress bar.
- `Work item`: status and label chips, id and pull-request number, title, description, the stage stepper, the checks table with `View log` and `Stop run`, `Acceptance criteria` with a met count, `Activity`, and a right inspector (`Column`, `Agent`, `Skill`, `Pull request`, `Branch`, `Repository`, `Assignee`, created and changed dates).
- `Pull requests`: a segment `Open · Needs action · Drafts`, `Synced with GitHub …`, `New pull request`, a table (`Pull request`, `Item`, `Checks`, `Merge`, `Agent`, `Updated`) and an inspector with the failing-checks message, the checks list, `Repair with AI`, `Run checks locally` and `Open in GitHub`.
- `Actions`: `All runs` above a `WORKFLOWS` list with status dots. `All runs` is the overview (`screens/ActionsOverview.png`): `Running now` with every running and queued run across workflows (workflow, revision, runner, elapsed time, `View log`, `Stop`, `Cancel`) and `History`, a table of finished runs across all workflows, newest first (`Result`, `Workflow`, `Revision`, `Runner`, `Duration`, `Started`), with `Show older runs`. A selected workflow shows its file path, `Run locally` and `Run on GitHub`, a runs table (`Result`, `Revision`, `Runner`, `Duration`, `Started`), the selected run's steps, a log excerpt and a `Diagnosis` card with `Fix with AI`, `Rerun on GitHub` and `Open in GitHub` (`screens/Actions.png`).
- `Orbit`: a `Production` destination control in the toolbar, the orbit diagram with stage clusters around the destination, zoom controls (`+`, `100 %`, `Fit`) and an inspector for the `Selected cluster` with evidence progress, its work items and `Show on board`.
- `Command palette`: ⌘K opens a centred overlay over the dimmed window with a search field, results grouped into `WORK ITEMS`, `PULL REQUESTS` and `COMMANDS`, shortcuts on the right and the hint row `↑↓ to move · ↵ to open · ⌘↵ to open in a new window`.
- `New work item sheet`: a modal with `Write it myself` / `Draft with AI`, `Title`, `Description` (`Markdown is rendered when the work item is viewed.`), `Repository`, `Column`, `Labels` with `Add label`, `Analyze with Codex after creating`, `Cancel` and `Create work item`.
- `Arcade`: `Choose a game` with the shipped games as cards (cover, player count, `Play`) and `Leaderboard` in the toolbar.
- `Settings`: opens inside the main window on every platform (decision of 2026-10-31, superseding the separate window); see the Settings section below.
- `Overview` (`screens/Overview.png`): the start page that shows the whole delivery at a glance without opening a sub-area. Toolbar title `Overview` with the workspace and the date. A greeting with a one-line summary of what needs attention, and the quick actions `Sync now`, `Run workflow` and `New work item` (primary). Below it three cards, each with an `Open` link to its screen:
  - `Waiting for you`: the four oldest inbox decisions with icon, title, work item and age, and `Open inbox`.
  - `Pull requests`: open pull requests by state — `Waiting for your review`, `Checks failing`, `Ready to merge`, `Checks running`, `Drafts` — with counts.
  - `Production`: the confirmed Production version and its date, the warning for work items not in a confirmed version, and the evidence progress, from Orbit.

  Then `Reporting` with a period segment (`7 days`, `30 days`, `Quarter`) that applies to everything below it, compared with the previous period of the same length:
  - Four stat tiles: `Delivered` (work items moved to Done), `Median lead time` (`Qualified → Done`), `Agent runs` (with how many needed no intervention) and `Workflow success` (succeeded of finished runs). Each has a change badge against the previous period: success for an improvement, danger for a decline, neutral where neither applies.
  - `Board`: a horizontal bar per board column with its count, in one neutral hue, and `Open`.
  - `Delivered per week`: a column chart of work items moved to Done per week over the last eight weeks, the current week emphasised and labelled; a hover tooltip names the week and count.
  - `Workflow runs`: a `SegmentBar` of finished runs by outcome (`Succeeded`, `Failed`, `Cancelled`) with an icon, label and count per outcome, and a one-line insight naming the workflow behind most failures and the runs in progress or queued.

### Tray (menu-bar extra)

The tray uses the main window's language (canvas page `Tray`, `screens/Tray-*.png`), still 328 px wide:

- Header: the Symphony mark, `Symphony`, a status line (`2 running · FLAMOX365`, `Nothing running`, `Latest run failed`) and icon buttons `Open Symphony` and `Settings`.
- Runs: the same `Agents | Actions` switch as the sidebar run panel, with counts, showing the runs at once instead of collapsed lists. Agents appear with their figure, name and activity, a running indicator, and `Pause` / `Resume` where the execution allows it. Actions show workflow, source, state, revision and an open button, and the list ends in `All runs in Symphony`. Empty: `No agent is working` / `Runs appear here as soon as one starts.`
- `Execution slots`: one segment per slot, filled when in use, with `{used} of {total} in use` and the waiting-step line when steps wait.
- `Needs you`: `Inbox` with its decision count and the first decision, and `Notifications` with the count of what needs attention and the first item. Both open the main window at that place; `Repository preparation required` becomes one of the notifications.
- `Autonomous work` with the next-cycle line (`Next cycle in 6m`, `No new autonomous tasks will start.`).
- Update: `Update available` with `Download`, `Update ready` with `Restart to update`, or `Check for updates`.
- Commands with their shortcuts: `Open Symphony ⌘O`, `New work item… ⌘N`, `Settings… ⌘,`, `Quit Symphony ⌘Q`.
- The menu-bar icon keeps its three template images and tooltips: idle (`Symphony`), running (`Symphony — Run in progress`), failed (`Symphony — Latest run failed`). `Actions unavailable` and the waiting-step message are drawn on `Tray-States`.

### Settings

Every current section and dialog of Settings, redesigned (canvas page `Settings`, `screens/Settings-*.png`, `screens/Sheet-*.png`). The canvas draws a separate window; since the decision of 2026-10-31 Settings opens inside the main window instead: while it is open, the whole side navigation switches to the Settings area, the normal navigation entries are not shown, and the toolbar's `Back` is the only way back. Copy is the current app's unless noted; no setting is dropped.

The redesign has one thread: the delivery flow. A work item passes five steps — `Create`, `Plan`, `Implement and verify`, `Fix failed checks`, `Address reviews` — before a person accepts it. The steps follow the board stages and the skill flow roles (`work-item-creation`, `analysis`, `solution`, `ci-diagnosis` and `ci-repair`, `pull-request-review`). `AI team` shows who does each step, `Skills` how each step is done and `Automation` how far each step may run on its own. All three use the same step names and icons, so a step reads the same wherever it appears.

- Window: the main window. The Settings navigation fills the main window's sidebar below its title-bar row, and the main window's 52 px toolbar shows the section name and a one-line description (prefixed with the workspace name for workspace sections) and the section's actions. (Superseded: a separate 1000 × 760 window with a 232 px sidebar.)
- Sidebar: `Search settings`; `Workspaces` (the list, where Settings opens) with each workspace (short-code tile and name) and, under the selected workspace, its six sections as nested rows (`AI team`, `Connected services`, `Repositories`, `Delivery destinations`, `Local GitHub Actions`, `Administration`); the heading `Symphony` with `Automation`, `Skills`, `System`, `Mobile access` and `Appearance`. The workspace segment of the current page goes away.
- Saving: every control applies when it changes (numbers on commit), with the existing `Settings saved.` / `Unable to save settings.` notices; the per-card `Save` buttons go away.
- States that appear only in some situations are drawn in dashed frames labelled with the condition.
- `Workspaces` (`Settings-Workspaces`; Settings opens here, `screens/Settings.png` shows the window at this page): each workspace with a one-line summary (agents, AI accounts, repositories, storage) and its state, `Open`, plus `Import workspace` and `Add workspace`. What needs attention is not shown in Settings; it lives in the notification centre of the main window.
- `AI team` (`Settings-AITeam`): `Delivery flow` shows the five steps and `Acceptance` as a vertical flow with the agent who does each step (figure, name, job title) and the backup after `then`. `Agents` shows each agent as a card with its figure, job title and description, account, model and effort, responsibilities, availability, intelligence and backup; `Add an AI agent` is a card of its own. `Technical AI setup` keeps positions, AI services and the backup order.
- `Skills` (`Settings-Skills`): one block per step with its process roles (`Create`; `Analyze`; `Solve` and `Verify`; `Diagnose CI` and `Repair CI`; `Address reviews`), their version, permissions and whether your additions exist, `Edit instructions` (opens `Sheet-RoleInstructions`), and the skill package attached to that step with `Deactivate`, or `Add skill`. The former Skills page's packages live here; `Import skill`, `Add skills`, `New skill` and refresh sit in the toolbar (`Import skill` moves here from `System`).
- `Automation` (`Settings-Automation`), the policies for every workspace:
  - `Autonomous work` with interval, the application-wide parallel limit and `Serialize overlapping deliveries`.
  - `Fix failed checks` turns the ten agentic switches into a ladder. A `Level` segment (`Off`, `Watch`, `Diagnose`, `Repair`, `Full`, `Custom`) sets the switches in one go. Each switch sits on a rail in dependency order, and a switch whose prerequisite is off is disabled with `Needs “…”`. This replaces the long explanatory banner. Budgets follow below.
  - `Address reviews` holds `Listen for pull-request review feedback`.
  - `GitHub commands` shows the commands as code chips instead of prose.
  - `Execution` holds managed root, board refresh, retained workspaces, verification repair attempts and workspace cleanup.
  - Levels map to switches (confirmed): `Watch` = agentic delivery + observe; `Diagnose` adds AI diagnosis and reruns; `Repair` adds branch updates and both repairs; `Full` adds replacement pull requests.
- `System` (`Settings-System`), this Mac:
  - `Storage` is the single storage picture: the total bar, managed workspaces with each workspace's share and limit, Local GitHub Actions with its breakdown and limit, the managed limit and the free-space reserve. Workspace `Administration` keeps its own storage bar and limit.
  - `Developer tools`.
  - `Virtual machines` (moved from `Automation`, because it describes this Mac): host capacity, resource preset, warm reuse, the machine list, `Clear runner data` and `Refresh machines`.
  - `Updates` and `Sleep`.
- `Search settings` (`Settings-Search`, new): typing in the sidebar search lists matching settings from every section, grouped by breadcrumb, with the match highlighted. Each result can be changed in place or opened.
- `Connected services`, `Repositories`, `Delivery destinations`, `Local GitHub Actions`, `Administration`, `Mobile access`, `Appearance`: as before, in the shared group-and-row layout (see their screens).
- Sheets: the editor drawers become sheets over the window, with `Cancel` / `Save` at the bottom right and a destructive action at the bottom left. Account, model, effort, provider, figure and orbit-body pickers are Mosaik `ChoiceGroup` / `Choice` cards in at most three equal columns, as the app's `choice-cards` utility. On the canvas each sheet sits under the section that opens it.
  - `Sheet-AIAgent` (920 px): the four questions as numbered sections, with a live preview beside them. The preview shows the agent card being built: figure, name, job title, account, model and effort, its steps in the delivery flow, the backup, and a warning when the chosen account cannot run. Responsibilities are check-box cards labelled with their step.
  - `Sheet-DeliveryDestination`: an orbit preview at the top shows the chosen body at the centre and the project's other destinations on their rings. The body picker is a compact grid of the nine planet previews.
  - The others as before: `Sheet-Workspace`, `Sheet-Setup` (`Build your project team`), `Sheet-AIAccount`, `Sheet-GitHubProjects`, `Sheet-AzureDevOps`, `Sheet-TeamsIntake`, `Sheet-RepositoryAdd`, `Sheet-Repository`, `Sheet-DeliveryDestinationAdd`, `Sheet-RoleInstructions`, `Sheet-SkillCatalog`, `Sheet-SkillEditor`, `Sheet-SkillImport`.
- Confirmation dialogs (`Settings-Dialogs`): all sixteen message boxes as alert sheets; destructive confirmations use a danger primary button. The skill package's `Move to trash`, today a browser `window.confirm`, becomes one of them.

## Navigation and reproduction

- Reference: open the [screenshots](screens/) beside this file and their [artboard sources](artboards/). No canvas account or older branch is required.
- Screen names: `Overview` is the start page, `Notifications` the open notification popover, `Main` is `Inbox`, `ActionsOverview` is `Actions` with `All runs` selected, `Palette` the command palette, `NewItem` the new-work-item sheet; `Settings-<Section>` are the Settings sections, `Sheet-<Name>` its sheets and `Settings-Dialogs` its confirmation dialogs; `Settings` is Settings drawn as a window at its former default size; the others carry their screen's name.
- Exact copy, spacing and token use: the artboard sources in `artboards/` (`<Name>.dc.html`); `x-import component-from-global-scope="Mosaik.<Name>"` names the Mosaik component each element maps to, and `macos-chrome.css` holds the only component overrides the design needs.
- Current app: start the desktop app locally, select a workspace and open `/main/home`, `/main/board`, `/main/pull-requests`, `/main/actions`, `/main/orbit`, `/main/arcade` and `/main/settings`.

## Functional requirements

1. Replace the top header navigation with the sidebar and unified toolbar on every main route, keeping every existing destination reachable; `Overview` is the first entry.
2. Show live counts in the sidebar: decisions waiting in `Inbox`, work items on `Board`, open pull requests, failing actions.
3. Show the run panel with a switch between `Agents` (each running or idle agent with its current activity and a status dot) and `Actions` (current action runs with their state), replacing the workspace rail's `Runs` panel.
4. Keep back and forward navigation in the toolbar working against the router history.
5. Provide the `Inbox` as a new screen with decisions and updates for the active workspace.
6. Render Board, Work item, Pull requests, Actions, Orbit and Arcade with the layouts, inspectors and actions listed under Expected behavior, wired to the existing data and commands.
7. Open the command palette with ⌘K (Ctrl+K off macOS) and from the toolbar search field; search work items, pull requests and commands; open with Enter, close with Esc.
8. Open the new-work-item sheet from `New work item`, the palette and ⌘N; validate the title; create the item in the chosen repository and column; optionally start the analysis.
9. Open Settings inside the main window on every platform, from the sidebar and the application menu, on `Workspaces`, with the drawn Settings navigation in place of the sidebar destinations and `Back` as the way out: `Workspaces` with each workspace and its nested sections, then `Automation`, `Skills`, `System`, `Mobile access`, `Appearance`. Every current setting, editor and confirmation stays available. `Skills` leaves the main navigation, and the installed skill packages join Settings › `Skills`.
10. Collapse and restore the sidebar with `Hide sidebar` and persist the choice.
11. Use only Mosaik components and `--mosaik-*` tokens; render correctly in light and dark mode.
12. Keep ids, hashes, branches and paths in the technical-value monospace style.
13. Remove voice input from the shell.
14. Show the status bar across the bottom of every main view with the sync state, the app version and the update button; small notices from any view go there.
15. Show the icon-only update button in the status bar while an update is available; clicking it downloads the update and fills a `ProgressRing` around the icon with the download progress; when the download completes it becomes `Restart to update`, which installs the update and restarts Symphony.
16. Keep the platform's native window controls: the traffic lights on macOS, the minimise, maximise and close buttons at the right of the title area on Windows, and the native controls on Linux; the rest of the UI is identical on every platform.
17. Open `Actions` on `All runs`: the runs in progress across all workflows with their controls, and the run history across all workflows; selecting a workflow narrows to it.
18. Open Symphony on `Overview` and render it as drawn: greeting and summary, the quick actions, `Waiting for you`, `Pull requests`, `Production`, and `Reporting` with the period segment, the four stat tiles and the three charts; every card links to its screen.
19. Compute the reporting figures for the selected period and the previous period of the same length from the workspace's own data; switching the period updates every tile and chart below the segment.
20. Apply each setting when it changes, without per-card `Save` buttons; open editors as sheets and confirmations as alert sheets.
21. Order `AI team`, `Skills` and `Automation` by the five delivery-flow steps; enforce the agentic switch dependencies in the UI (a switch whose prerequisite is off is disabled and says which one it needs) and offer the levels; search all settings from the sidebar.
22. Add the notification centre to the status bar of every main view: a bell with the count of what needs attention opens a popover upwards with `Needs attention` (setup and system problems from every workspace and this Mac, each with where it lives and its fix) and `Earlier today` (the notices the app shows as toasts today, kept as history), with `Mark all as read` and `Clear read`. Work-item decisions and updates stay in the `Inbox`. Register Reicon's bell (`reiconBell`) as the `bell` icon.
23. Redesign the tray as drawn: header with status and open/settings buttons, the `Agents | Actions` switch with live runs (pause and resume for agent executions), execution slots, `Needs you` with Inbox and notification counts, the autonomy switch, the update row and the commands with shortcuts; keep the three menu-bar icon states.

## Failure and empty states

- `Inbox` with nothing to decide shows an empty state instead of the list; on `Overview`, `Waiting for you` then says that nothing waits.
- `Overview` cards whose data is loading show a skeleton; a card whose source failed says so with a retry and leaves the other cards working.
- A reporting figure without enough history for the period or the previous period shows `—` and no change badge, never a misleading zero or percentage.
- Sidebar counts are hidden, not zero, while their data is loading or unavailable.
- `Agents` without a connected agent account shows how to connect one.
- `Actions` in the run panel without a current run says so instead of showing an empty list.
- `Pull requests` and `Actions` show when the GitHub sync is stale or failed, with a retry.
- `Orbit` keeps its existing messages for missing or unconfirmed destinations.
- The command palette shows a no-results state and never runs a command without the same confirmation the command needs elsewhere.
- The new-work-item sheet keeps the entered text when creation fails and shows the error inline.
- A Settings change that fails to save is reported in Settings and leaves the previous value visible.
- A sheet keeps its entered values when saving fails and shows the error in the sheet; the existing loading skeletons stay in place of the controls they stand for.

## Security and data implications

- Settings runs inside the main window and therefore under its security settings and typed IPC boundary; no further Electron window is added (the separate Settings window of the original plan is retired).
- Palette commands and the `… with AI` actions start existing agent and CI flows only; they must respect the current automation policy and permissions.
- No new persistence beyond the sidebar collapse state; no credentials or tokens are shown in the inbox, palette or inspectors.

## Scope and exclusions

- In scope: the desktop renderer shell, the eleven drawn main-window screens including the redesigned `Overview` start page, Settings with every section, sheet and confirmation dialog, light and dark, and removing voice input from the shell.
- Out of scope: the mobile app, new games, new providers or backend capabilities the drawn data implies but Symphony does not have yet (record them as follow-ups), and changes to Mosaik or the design system.
- The work-item ids, names, numbers and times in the artboards are sample data, not requirements.

## Dependencies and consequences

- Depends on Mosaik 0.1.183 in Soho, already installed, and on the Symphony Design System artifact for component contracts.
- Navigation changes (`Pull Requests` → `Pull requests`, `Overview` first and the launch screen, `Inbox` added, `Skills` moved into Settings, voice input removed); end-to-end tests and documentation that name them must move with the change.
- The traffic-light area exists only on macOS; on Windows and Linux the toolbar reserves room for the native window controls at the right. Settings inside the main window applies to every platform.
- Large enough to deliver in slices: shell and navigation first, then the screens, then palette, sheet and Settings.
- `Overview` reuses what `HomeViewPresenter` reads today (`OrchestrationStore`: scoped work items, board columns, executions, pull requests, CI runs). The current-state cards need no new data except `Waiting for your review`, because Symphony never reads `requested_reviewers` from GitHub, and `Ready to merge`, which has no approval data.
- `Reporting` needs history the app keeps only partly:
  - Agent runs are persisted with their outcome (`executions` table) and are sufficient.
  - Stage changes are in the `workflow_audit` table (`stage-changed`), but they track workflow stages, not board columns, can only be read per work item, and are missing before Symphony tracked an item. `Delivered` and `Median lead time` need a bulk query over that audit.
  - Workflow runs come from the latest 50 runs per repository, and each refresh replaces the cache. That covers `7 days` at best, so `30 days` and `Quarter` need recorded run history.

## Acceptance criteria

- Every main route shows the 240 px sidebar, the 52 px toolbar and the status bar as in `screens/Main.png`.
- The sidebar lists `Overview` first, then `Inbox`, `Board`, `Pull requests`, `Actions`, `Orbit`, `Arcade`, the run panel and `Settings`, and every former header destination stays reachable.
- The run panel switches between `Agents` and `Actions`; `Actions` shows the current action runs and a message when there are none.
- No voice input control remains in the app shell.
- Every main view shows the 28 px status bar along the whole bottom edge with the sync state on the left and the version on the right.
- With an update available, an icon-only download button appears in the status bar; clicking it shows a progress ring that fills to 100 %; without an update the button is absent.
- When the download completes, the button reads `Restart to update`, and clicking it installs the update and restarts Symphony.
- On Windows the native window buttons sit at the right of the title area without covering the toolbar's search field; macOS shows the traffic lights in the sidebar; the layout is otherwise the same on every platform.
- No sync note remains in a page header or toolbar.
- `Actions` opens on `All runs`, listing every running and queued run under `Running now` and the finished runs of all workflows under `History`, newest first.
- The run panel's `Actions` segment shows the same running and queued runs as `Running now`, with its count in the segment label.
- The selected sidebar row is visibly darker than the sidebar fill, and rows are 32 px high.
- Sidebar counts match the data behind each screen and are hidden while unavailable.
- Back and forward in the toolbar follow navigation history.
- `Inbox` matches `screens/Main.png` in structure: filter segment, grouped list, detail pane with stepper and decision actions.
- Symphony opens on `Overview`, which matches `screens/Overview.png` in structure and wording, without horizontal scrolling at 1440 × 900.
- The quick actions start the same flows as elsewhere: `New work item` opens the sheet, `Run workflow` the workflow run, `Sync now` the GitHub sync.
- `Waiting for you`, the pull-request states and the Production card show the same items and counts as `Inbox`, `Pull requests` and `Orbit`.
- Switching the reporting period updates every stat tile and chart below it; tiles without enough history show `—` without a badge.
- Every chart has a text alternative and states its values in text or on hover; status colours always come with an icon and a label.
- Board, Work item, Pull requests, Actions, Orbit and Arcade match their screenshots in structure and wording.
- ⌘K (Ctrl+K off macOS) opens the command palette, Esc closes it, arrow keys move, Enter opens the selection.
- `New work item` opens the sheet; an empty title blocks `Create work item`; a created item appears on the board in the chosen column.
- Settings opens inside the main window on macOS, Windows and Linux, its navigation replaces the sidebar destinations, `Back` leads out of it, and it saves changes immediately.
- Every section, sheet and confirmation in `screens/Settings-*.png` and `screens/Sheet-*.png` exists with the same groups, controls and copy; no current setting is lost.
- Opening a workspace in the Settings sidebar shows its six sections as nested rows, and `AI team` is selected first.
- Editors open as sheets and close with `Cancel`, `Save` or Escape; confirmations open as alert sheets.
- The status bar of every main view shows the bell with the number of items that need attention; clicking it opens the notification popover upwards, every item names where it lives and its fix opens or performs it, and read notices move to `Earlier today`.
- Settings opens on `Workspaces`.
- The tray shows running agent and action runs without expanding anything, switches between `Agents` and `Actions` like the sidebar, shows the slots in use, links `Inbox` and `Notifications` with their counts, and keeps the menu-bar icon states and tooltips.
- `AI team` shows the delivery flow with the agent and backup of each step, matching the agents' responsibilities.
- In `Automation` › `Fix failed checks`, choosing a level sets the switches as listed; switching one switch sets the level to `Custom`; a switch whose prerequisite is off is disabled with `Needs “…”`.
- The agent sheet's preview updates as each field changes; the destination sheet's orbit preview shows the chosen body and the project's destinations.
- Typing in `Search settings` lists matching settings from every section with their breadcrumb.
- `Skills` is reachable from Settings and no longer from the main navigation; installed skill packages are managed there.
- `Hide sidebar` collapses the sidebar and the state survives a restart.
- Both light and dark mode render every screen without hard-coded colours.
- No feature code introduces colours, radii or shadows outside Mosaik tokens.

## Verification expectations

- `yarn verify` passes.
- End-to-end tests cover launching on `Overview`, the reporting period switch, sidebar navigation, back and forward, the run panel switch, the command palette keyboard flow, creating a work item from the sheet, and opening Settings with `Skills`.
- Screenshots of each screen at 1440 × 900 in light and dark mode are compared side by side with `screens/` (for Settings, the section content against `Settings-*` and `Sheet-*`).
- `yarn design:md-check` and `yarn ui:check` stay green.

## Evidence and open questions

### Evidence

- Canvas "Symphony Redesign", version `1793372001-d1f9`: preserved in the local [artboard sources](artboards/) and [screenshots](screens/).
- Symphony Design System on Mosaik 0.1.183 in Soho, version `1793339128-b2c8`: [local sources and build instructions](../../../.design-sync/NOTES.md).
- `screens/*.png`: the artboards rendered with the real Mosaik bundle in Soho, without the canvas editor.
- `artboards/*.dc.html` and `artboards/macos-chrome.css`: the canvas sources at that version.
- Confirmed in the current app: the header labels, the workspace rail with `Runs`, the `Overview` layout described above (screenshot from the user, v0.1.15), the board dialog for new work items, and the absence of a command palette.

### Decisions (2026-10-30)

- `Inbox` is a new feature; `Overview` remains a separate screen.
- `Skills` is reachable only through Settings.
- The sidebar panel where the canvas lists the agents also shows the action runs; it switches between `Agents` and `Actions`.
- Voice input is no longer needed.
- Settings is always a separate window. (Superseded on 2026-10-31: Settings opens inside the main window; see `DECISIONS.md`.)
- Every current Settings section and dialog is part of the redesign and drawn on the canvas page `Settings`.
- Settings is organised around the delivery flow: `AI team`, `Skills` and `Automation` follow the same five steps; Settings opens on `Workspaces`; `System` is this Mac and holds the single storage picture and the virtual machines; the agentic switches become a dependency ladder with levels; search covers all settings; the agent and destination sheets preview what they create.
- What needs attention (missing CLIs, accounts that are not signed in, unprepared repositories, pairing requests, storage pressure) is a notification centre behind a bell in the status bar of the main window, not a Settings page.
- The `Fix failed checks` levels map to the agentic switches as `Watch` (agentic delivery, observe), `Diagnose` (+ AI diagnosis, reruns), `Repair` (+ branch updates, both repairs) and `Full` (+ replacement pull requests).
- `Actions` gets an overview of the running runs and the run history across all workflows; the run panel's `Actions` segment lists the current runs.
- Once the update is downloaded, the button says `Restart to update`.
- Windows keeps its native window buttons at the right and Linux its native controls; the UI otherwise stays the same.
- Small notices go into a status bar across the whole bottom of the window, a concept for every view; this includes the app-update button (icon only, a progress ring fills on click) and the sync state.
- `Overview` is the first navigation entry, above `Inbox`, and the start page Symphony opens on; it is redesigned as the at-a-glance page with reporting, statistics and quick actions.

### Open questions

- `Reporting` depends on history Symphony does not fully record yet (see Dependencies). Should it ship with the shell, showing `—` where the history is missing, or as a follow-up slice once workflow-run history and a bulk stage-change query exist? The proposal is a follow-up slice, with the current-state cards of `Overview` shipping with the shell.
