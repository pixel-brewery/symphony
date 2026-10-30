# macOS redesign handoff

Everything needed to implement the "Symphony Redesign" canvas in the desktop app, without access to the canvas. This is an implementation handoff; its target behavior is not yet implemented.

Start with `START-HERE.md`: how to get the files, the prompt for a new conversation and the implementation slices. `DECISIONS.md` lists every decision from the design conversation.

- `change-request.md` — the work item: current and expected behavior per screen, the decisions taken, acceptance criteria and the remaining open questions. Start here.
- `screens/` — references rendered with the real Mosaik bundle in Soho (1440 × 900; the Settings window 1000 × 760). `Overview.png` is the intended start page; `Overview-dark.png` shows it in dark mode. `Settings-*.png` and `Sheet-*.png` cover every Settings section, sheet and confirmation dialog at full scroll length. `Tray-*.png` show the menu-bar extra with the menu bar. `UpdateStates.png` is a standalone status-bar reference strip without a separate artboard export.
- `artboards/` — the canvas sources: exact copy, spacing and token use. Each `x-import component-from-global-scope="Mosaik.<Name>"` names the Mosaik component an element maps to; `macos-chrome.css` holds the only component overrides the design needs (sidebar, toolbar, status bar, run switch). Images referenced as `/_blob/…` are canvas uploads of the agent figures in `resources/figures/` and the orbit previews in `resources/orbit/previews/`.

The original canvas captures are retained except for `Settings-Automation`, `Sheet-Repository`, `Sheet-SkillEditor` and `Sheet-SkillImport`. These four were rendered again from the checked-in HTML with React 18 and the published Mosaik 0.1.183 artifact after replacing personal absolute paths with portable `~/…` examples. The images are browser captures, with no pixel retouching.

Local references:

- [Artboard sources](artboards/) and [rendered screens](screens/).
- [Symphony design-system sources and build instructions](../../../.design-sync/NOTES.md) for Mosaik 0.1.183 in Soho.

## Implementing locally

1. Use the current repository checkout and install the workspace (`GITHUB_TOKEN` must read the Mosaik packages). The handoff does not require an older branch or the original canvas.
2. Run the repository's `analyze-change-request` skill on `docs/workitems/macos-redesign/change-request.md`.
3. Implement in slices with `solve-change-request`: the window chrome (sidebar, toolbar, status bar, run panel) first, then the screens starting with the `Overview` start page, then the command palette, the new-work-item sheet and the Settings window.
4. Compare each finished screen with its file in `screens/`, in light and dark mode.
