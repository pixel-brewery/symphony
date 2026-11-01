# macOS redesign handoff

Everything needed to implement the "Symphony Redesign" canvas in the desktop app, without access to the canvas. This is an implementation handoff; its target behavior is not yet implemented.

Start with `START-HERE.md`: how to get the files, the prompt for a new conversation and the implementation slices. `DECISIONS.md` lists every decision from the design conversation.

- `change-request.md` — the work item: current and expected behavior per screen, the decisions taken, acceptance criteria and the remaining open questions. Start here.
- `artboards/` — editable canvas sources with the accepted copy, spacing and token use. Each `x-import component-from-global-scope="Mosaik.<Name>"` names the public component an element maps to; `macos-chrome.css` holds the approved shell geometry. Figure references map to `resources/figures/` and orbit references to `resources/orbit/previews/`.

Historical raster captures and the composited README screenshot were removed because they embedded a private application's identity. The retained HTML uses fictional workspace and repository examples. It preserves the layout and interaction contract; no replacement screenshot or runtime verification is claimed. `Overview.dc.html` also defines the dark-mode reference through the active theme; Settings opens inside the main window as decided on 2026-10-31. The status-bar/update states remain specified in `change-request.md` and the main-window artboard.

Local references:

- [Editable artboard sources](artboards/).
- [Symphony design-system sources and build instructions](../../../.design-sync/NOTES.md) for Mosaik 0.1.183 in Soho.

## Implementing locally

1. Use the current repository checkout and install the workspace (`GITHUB_TOKEN` must read the Mosaik packages). The handoff does not require an older branch or the original canvas.
2. Run the repository's `analyze-change-request` skill on `docs/workitems/macos-redesign/change-request.md`.
3. Implement in slices with `solve-change-request`: the window chrome (sidebar, toolbar, status bar, run panel) first, then the screens starting with the `Overview` start page, then the command palette, the new-work-item sheet and Settings (inside the main window since 2026-10-31).
4. Compare each finished screen with its editable artboard in `artboards/`, in light and dark mode.
