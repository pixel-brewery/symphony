# Decisions from the design conversation (2026-10-30)

In the order they were taken. "Confirmed" means the product owner asked for or approved it. "Proposed" means it came from the redesign and drew no objection. "Open" still needs an answer.

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

- Confirmed: Settings is always a separate window, on every platform.
- Confirmed: `Skills` is reachable only through Settings; the installed skill packages of the former Skills page move there.
- Confirmed: every current Settings section, editor and confirmation is part of the redesign and drawn on the canvas page `Settings`, including every configuration inside a workspace.
- Confirmed: Settings opens on the workspace list.
- Confirmed: the `Fix failed checks` levels map to the agentic switches: `Watch` = agentic delivery and observe; `Diagnose` adds AI diagnosis and reruns; `Repair` adds branch updates and both repairs; `Full` adds replacement pull requests.
- Proposed: the workspace sections are nested rows under each workspace in the Settings sidebar, replacing the segment.
- Proposed: `AI team`, `Skills` and `Automation` follow the same five delivery-flow steps (`Create`, `Plan`, `Implement and verify`, `Fix failed checks`, `Address reviews`).
- Proposed: `System` is "this Mac": the single storage picture, developer tools, virtual machines (moved from `Automation`), updates and sleep.
- Proposed: settings apply immediately; the per-card `Save` buttons go away.
- Proposed: editors open as sheets of the Settings window; confirmations open as alert sheets.
- Proposed: the agent sheet shows a live preview; the delivery-destination sheet shows an orbit preview.
- Proposed: search in the Settings sidebar covers every setting.
- Proposed: `Build your project team` becomes a sheet.

## Open

- `Reporting` on `Overview` needs history Symphony does not fully record yet. The proposal is to ship the current-state cards with the shell and add `Reporting` in a follow-up slice.
