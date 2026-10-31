# Start the redesign implementation

Everything needed to implement the "Symphony Redesign" canvas lives in this folder. A new conversation needs nothing else from the design conversation.

## 1. Get the files

Use the current Symphony repository checkout. The complete handoff is committed under `docs/workitems/macos-redesign/`; no older branch, archive or canvas access is required. The screens describe the intended redesign, not features already implemented in the app.

## 2. Start a new local Claude Code conversation in the repository and paste

```text
Implement the macOS redesign of Symphony described in docs/workitems/macos-redesign/.
Read START-HERE.md, DECISIONS.md and change-request.md first; screens/ shows every
screen as drawn (1440 × 900 main window, Settings window 1000 px wide at full length),
artboards/ holds the exact copy, spacing and Mosaik components of each screen.

Work in the slices listed in START-HERE.md, one slice at a time: run the
analyze-change-request skill on change-request.md for the slice, then
solve-change-request, then compare the result with its screens in light and dark
mode before moving on. Keep every current setting and destination reachable,
use only Mosaik components and --mosaik-* tokens, and run yarn verify before each
handoff. Start with slice 1.
```

## 3. Slices

1. **Window chrome**: 240 px sidebar (Overview first, then Inbox, Board, Pull requests, Actions, Orbit, More › Arcade, run panel with the `Agents | Actions` switch, Settings), 52 px toolbar, 28 px status bar (sync state, notification bell, version, update button with progress ring and `Restart to update`), native window controls per platform, no voice input, launch on `Overview`. Screens: `Main`, `Overview`, `UpdateStates`.
2. **Overview start page**: greeting, quick actions, `Waiting for you`, `Pull requests`, `Production`. `Reporting` follows in slice 9 (see the open question). Screens: `Overview`, `Overview-dark`.
3. **Inbox** (new): decisions and updates with the detail pane. Screen: `Main`.
4. **Screens**: Board, Work item, Pull requests, Actions (`All runs` overview and workflow detail), Orbit, Arcade. Screens: `Board`, `WorkItem`, `PullRequests`, `ActionsOverview`, `Actions`, `Orbit`, `Arcade`.
5. **Command palette and new-work-item sheet**. Screens: `Palette`, `NewItem`.
6. **Notification centre**: bell with count in the status bar, popover upwards with `Needs attention` and `Earlier today`; register `reiconBell` as `bell`. Screen: `Notifications`.
7. **Tray**: header, `Agents | Actions` switch with live runs, execution slots, `Needs you`, autonomy, update row and commands with shortcuts. Screens: `Tray-Agents`, `Tray-Actions`, `Tray-Quiet`, `Tray-States`.
8. **Settings window**: separate Electron window on every platform, sidebar with the workspaces and their nested sections, every section, sheet and confirmation dialog, search, the automation level ladder, immediate saving. Screens: `Settings`, `Settings-*`, `Sheet-*`.
9. **Reporting** on `Overview`, once the history it needs is recorded (see the dependencies in `change-request.md`).

## 4. What else is in this folder

- `change-request.md` — the work item: current and expected behaviour, requirements, acceptance criteria, dependencies, the one open question.
- `DECISIONS.md` — every decision taken in the design conversation, in order.
- `README.md` — what `screens/` and `artboards/` contain.
- `screens/` — every screen rendered with the real Mosaik bundle in Soho; `README.md` records the four locally regenerated captures.
- `artboards/` — the canvas sources; `x-import component-from-global-scope="Mosaik.<Name>"` names the Mosaik component, and `macos-chrome.css` holds the only overrides.

Local design-system references and build instructions are in [`.design-sync/NOTES.md`](../../../.design-sync/NOTES.md). The [artboards](artboards/) and [screens](screens/) preserve the `Overview`, `Settings` and `Tray` designs.
