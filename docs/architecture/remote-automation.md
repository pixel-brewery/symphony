# Remote GitHub automation

Symphony can keep a Mac-hosted orchestrator responsive to GitHub while no renderer window is open. The operator explicitly enables **Allow authorized GitHub updates and @symphony comments to run tasks and deliver implementation branches** in Runtime settings. The Utility Process then polls every enabled GitHub Project source at the configured refresh interval; the current renderer view does not limit the monitored workspaces.

The Runtime settings card lists the supported comment commands next to that authorization control. An existing GitHub work item also shows the same contextual command guide in its desktop drawer and mobile ticket detail. The desktop drawer links to Settings while automation is disabled and to the GitHub issue after activation. Mobile ticket detail reports the current activation state, explains the Mac-side prerequisite, and always offers the public issue link so the operator can continue in GitHub or the GitHub mobile app. The guidance is intentionally not repeated in unrelated inputs because Symphony consumes these commands only from configured GitHub issue comments.

## Inputs and decisions

`GitHubProjectTracker` translates GitHub shapes into provider-neutral `AutomationSignal` values. The application service never receives GraphQL or REST response types.

| Remote input                                                  | Provider-neutral action | Application decision                                                                                                                                                                                   |
| ------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authorized issue title/body or Project Status changes         | `synchronize`           | Backlog/Ready or missing analysis starts analysis. A later Executing/Review update with a successful analysis starts implementation or rework and delivers its branch/PR. Completed items are ignored. |
| `@symphony <feedback>` or `/symphony <feedback>`              | `synchronize`           | Uses the same state/history decision and passes the bounded text as agent focus or feedback.                                                                                                           |
| `/symphony analyze [focus]`                                   | `analyze`               | Starts a new analysis for the current issue snapshot.                                                                                                                                                  |
| `/symphony solve [feedback]`, `fix`, `revise`, or `implement` | `solve`                 | Starts implementation/rework when a successful analysis exists.                                                                                                                                        |
| `/symphony retry [feedback]`                                  | `retry`                 | Repeats the newest failed Analyzer or Solver kind.                                                                                                                                                     |
| `/symphony rerun-ci`                                          | `rerun-ci`              | Reruns the newest failed bound GitHub Actions run, preferring the latest managed implementation branch.                                                                                                |

German `analyse`, `analysiere`, `nochmal`, `erneut`, and `ci erneut` aliases are accepted. Command text is capped at 8,000 characters and is passed only as agent context; it is never parsed into an executable or shell argument. A rocket reaction acknowledges a started/completed comment command, eyes marks a deferred command, and confused marks a failed command. Reactions are best-effort; the local receipt is authoritative.

## Authorization and trust

Automatic execution is disabled by default. Comment commands are accepted only when the comment author exactly matches the `accountLogin` on the workspace-owned GitHub connection. Issue content signals require the configured account to be the issue creator or latest content editor. The issue must also remain an item in an enabled configured GitHub Project. Project field changes use that Project as their authorization boundary; repository and Project permissions must therefore remain least-privilege.

The adapter passes the connection-specific token through a minimal GitHub CLI environment. Credentials, raw comments, GitHub types, and API errors never cross into the renderer. Existing execution policy still requires an isolated worktree, immutable workspace/binding snapshot, assigned skill, and valid workflow transition. A remote instruction that reaches a successful Solver/revision is the explicit authorization to commit pending changes, push only its managed non-default branch, and create or reuse the open pull request. UI-started implementations retain the separate pull-request action. Remote automation never pushes a default branch or merges automatically.

## Delivery and recovery

Every workspace database contains source checkpoints and signal receipts. Enabling a source for the first time records all existing issue revisions and command comments as `baselined`, including an explicit checkpoint for an empty Project. Nothing historical executes retroactively. Later signals pass through `processing`, then become `started`, `completed`, `deferred`, `ignored`, or `failed`.

Executions persist the triggering signal ID and actor. If Symphony stops after saving an execution but before updating the receipt, the next synchronization recovers that execution by trigger ID instead of starting a duplicate. Deferred signals are retried after the active execution clears. Signals received while the Mac is asleep or Symphony is stopped are discovered on the next startup or lifecycle reconciliation. Startup, resume/unlock reconciliation, settings activation, and the configured background interval all invoke the same single-flight synchronization path.

An agent execution that later fails remains a terminal result of the accepted signal rather than silently looping. The operator can edit the command or post `/symphony retry`, producing a new auditable signal.
