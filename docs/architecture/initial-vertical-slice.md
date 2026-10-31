# Initial Issue Analyzer vertical slice

The executable slice proves the full local process path with explicit test doubles:

1. Electron launches a sandboxed Angular window and a Utility Process.
2. The Utility Process validates bootstrap project configuration and opens SQLite.
3. Settings detects Git and Codex through allowed diagnostic commands.
4. Home requests a typed snapshot and displays eligible simulated items.
5. The Skills catalog activates an exact portable analysis package before “Run Analyzer” prepares an isolated path, persists a running execution, composes typed context, and streams progress.
6. An Analyzer claim moves Backlog to Ready, keeps the card visible there, and uses the execution record to render Analyzing, Analyzed, or Analysis failed.
7. “Simulate failure” uses a second item, preserves its workspace, and persists the error without inventing a provider board column.
8. A completed item can start a new analysis without rewriting its earlier execution.
9. A successful analysis can start a Solver run; a completed solution exposes a feedback field whose revision creates another execution.
10. Each execution opens its persistent, live Codex event stream plus Markdown result in a right-side Mosaik drawer. The slice originally listed executions in a Runs rail; the main window's [sidebar run panel](window-and-navigation/README.md#laufpanel) has replaced it and opens that drawer from the agent working on the execution. There is no duplicate Activity projection or standalone Executions route.

The Playwright Electron test verifies window/title, Mosaik shadow rendering, stable navigation and sidebar layout, visible Activity/Execution timestamps, process-backed data loading, absence of `window.process`, analysis, re-analysis, Solver implementation, feedback revision, both terminal outcomes, and drawer-based execution details. Vitest separately proves persistence and transitions against temporary SQLite databases.

The deterministic E2E suite explicitly selects simulated tracker, workspace, agent, and work-item coordination adapters. Normal application composition loads the activated skill instructions, acquires the atomic GitHub ref claim, projects `Assistant phase`, verifies GitHub Status changes, and invokes the Codex JSONL adapter in a read-only managed workspace for analysis. Issue workpad mutation remains outside this slice; pull-request handoff and distributed GitHub ownership are now production paths.
