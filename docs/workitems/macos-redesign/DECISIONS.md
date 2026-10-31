# Decisions from the design conversation (2026-10-30)

In the order they were taken. "Confirmed" means the product owner asked for or approved it. "Proposed" means it came from the redesign and drew no objection. "Open" still needs an answer. Decisions taken after the design conversation carry their date in their heading; a decision they replace stays in place, marked as superseded.

## Foundation

- Confirmed: the Symphony Design System is rebuilt on Mosaik 0.1.183 with the Soho theme, and the canvas uses it.
- Confirmed: the redesign is implemented in a local conversation from this folder, not in the cloud.

## Main window

- Confirmed: `Inbox` is a new feature for decisions and updates.
- Confirmed: `Overview` is the first navigation entry, above `Inbox`, and the screen Symphony opens on. It is redesigned as the start page with quick actions, statistics and reporting.
- Confirmed: the sidebar run panel switches between `Agents` and `Actions`; `Actions` lists the current action runs.
- Confirmed: voice input is removed.
- Confirmed: small notices live in a status bar across the whole bottom of every main view.
- Confirmed: the app-update button sits in the status bar. It is icon-only with the download icon, and a Mosaik `ProgressRing` around it fills on click. When the ring is full it becomes `Restart to update`.
- Confirmed: `Actions` has an overview of the running runs and the history across all workflows (`All runs`).
- Confirmed: macOS keeps its traffic lights, Windows its native buttons at the right and Linux its native controls; the UI is otherwise the same.
- Confirmed: what needs attention (missing CLIs, accounts not signed in, unprepared repositories, pairing requests, storage pressure) is a notification centre. A bell in the status bar opens a popover upwards; it lives on the main window, not in Settings.
- Proposed: work-item decisions stay in the `Inbox`; the bell holds setup and system notices plus the history of today's toasts.

## Tray

- Confirmed: the tray (menu-bar extra) is part of the redesign and drawn on its own canvas page `Tray`.
- Proposed: the tray uses the sidebar's `Agents | Actions` switch with live runs instead of collapsed lists, shows capacity as execution slots, links `Inbox` and `Notifications` with their counts, and lists the commands with shortcuts.

## Settings window

- Superseded on 2026-10-31 by [Settings in the main window](#settings-in-the-main-window-2026-10-31) — Confirmed: Settings is always a separate window, on every platform.
- Confirmed: `Skills` is reachable only through Settings; the installed skill packages of the former Skills page move there.
- Confirmed: every current Settings section, editor and confirmation is part of the redesign and drawn on the canvas page `Settings`, including every configuration inside a workspace.
- Confirmed: Settings opens on the workspace list.
- Confirmed: the `Fix failed checks` levels map to the agentic switches: `Watch` = agentic delivery and observe; `Diagnose` adds AI diagnosis and reruns; `Repair` adds branch updates and both repairs; `Full` adds replacement pull requests.
- Proposed: the workspace sections are nested rows under each workspace in the Settings sidebar, replacing the segment.
- Proposed: `AI team`, `Skills` and `Automation` follow the same five delivery-flow steps (`Create`, `Plan`, `Implement and verify`, `Fix failed checks`, `Address reviews`).
- Proposed: `System` is "this Mac": the single storage picture, developer tools, virtual machines (moved from `Automation`), updates and sleep.
- Proposed: settings apply immediately; the per-card `Save` buttons go away.
- Proposed: editors open as sheets of the Settings window; confirmations open as alert sheets. (Since 2026-10-31 they open over the main window, see [Settings in the main window](#settings-in-the-main-window-2026-10-31).)
- Proposed: the agent sheet shows a live preview; the delivery-destination sheet shows an orbit preview.
- Proposed: search in the Settings sidebar covers every setting.
- Proposed: `Build your project team` becomes a sheet.

## Settings in the main window (2026-10-31)

- Confirmed: Settings opens in the same window; there is no separate Settings window on any platform. This supersedes "Settings is always a separate window, on every platform" above.
- Confirmed: while Settings is open, the whole side navigation switches to the Settings area — `Search settings`, `Workspaces` with each workspace and its nested sections, and `Symphony` with the global sections. The normal navigation entries (workspace switcher, `Overview` to `Arcade`, the run panel and `Settings`) are not shown.
- Confirmed: the only way back is the toolbar's back navigation at the top (`Back`).
- Confirmed: the Settings menu entries are in the left area, the window sidebar; the toolbar shows the section's name, its one-line description and its actions.
- Proposed: `Back` is always available while Settings is open; with no earlier screen it leads to the last remembered screen (see [Reopen the last screen](#reopen-the-last-screen-2026-10-31)), else to `Overview`. Switching sections inside Settings does not add a history entry, so one `Back` leaves Settings; opening a search result does.
- Proposed: every former way into the Settings window — the sidebar, `Manage workspaces…`, `Settings…` (⌘, / Ctrl+,), the tray's `Settings`, `Open AI team`, notification fixes and links to a section — opens Settings in the main window at that place. Sheets and alert sheets open over the main window; the sections, sheets and confirmations themselves are unchanged.
- Confirmed: the Settings column of cards (at most 700 px) is centred in the content area, so a wide window does not leave all of its space to the right (product owner).
- Proposed: the `Settings-*` and `Sheet-*` screens remain the reference for the section content; their 1000 × 760 window frame and the 232 px Settings sidebar are no longer built — the Settings navigation takes the main window's sidebar width.

## Resizable panes and scroll containment (2026-10-31)

- Confirmed: the split between the side navigation and the content, and the splits inside the `Inbox`, an opened work item on the `Board`, `Pull requests`, `Actions` and `Orbit`, are resizable with the Mosaik split element (product owner: "das betrifft alle Elemente").
- Proposed: every split between the sidebar and the content, and between a list and its detail or inspector, can be resized by dragging the hairline the artboards draw or with the keyboard. The line has no grip, a 9 px hit area and turns one neutral step darker on hover and focus.
- Proposed: each split remembers its size on this Mac; the drawn widths are the defaults — sidebar 240 px (200–360 px), `Inbox` list 400 px, `Pull requests` inspector 360 px, `Actions` workflow list 220 px, `Orbit` inspector 340 px, work-item inspector 300 px. The fixed pane keeps its width when the window is resized; a hidden sidebar and a `Pull requests` inspector without a selection take no space.
- Confirmed: only what has to scroll scrolls. In the `Inbox` list only the entry list scrolls (a Mosaik list), the detail pane scrolls on its own, and the detail uses the full width of the window (product owner).
- Proposed: the window chrome never scrolls. Neither scrolling nor a dragged text selection can move the toolbar, the sidebar or the status bar; each pane scrolls on its own. In the `Inbox` the `All · Decisions · Updates` filter stays above the scrolling entries, and the detail pane uses the full remaining width instead of at most 760 px. Sidebar destinations scroll in a short window while the run panel stays.

## Open

- `Reporting` on `Overview` needs history Symphony does not fully record yet. The proposal is to ship the current-state cards with the shell and add `Reporting` in a follow-up slice.

## Reopen the last screen (2026-10-31)

- Confirmed: the app remembers the screen it showed last — `Inbox`, `Board`, `Pull requests` and so on — and reopens it on the next start.
- Confirmed: Settings is never remembered. Quitting while Settings is open reopens the screen that was active before Settings.
- Proposed: only the screen is restored, not transient states opened through the address (the `New work item` sheet, the notifications popover); an opened work item reopens as that work item. A remembered screen the app no longer offers falls back to the start page.
