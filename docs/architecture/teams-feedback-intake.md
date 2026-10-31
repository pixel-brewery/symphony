# Microsoft Teams feedback intake

Symphony can turn explicitly requested FLAMOX365 feedback in one Microsoft Teams channel into a GitHub work item without an open renderer. The workspace owner configures a Microsoft Teams feedback intake source with Microsoft Entra tenant and application identifiers, an environment-backed client-secret reference, the team and channel identifiers, and one existing GitHub Project and repository target.

The FLAMOX365 Teams Workflow URL is an incoming write-only endpoint: FLAMOX365 posts an Adaptive Card to it, while Symphony reads the resulting channel conversation through Microsoft Graph. The application uses the team-scoped `ChannelMessage.Read.Group` resource-specific consent permission. The Teams application must be installed and consented in the selected team. Tokens, client secrets, Graph response shapes, and provider errors remain in the orchestrator/provider boundary.

## Intake lifecycle

The Utility Process runs one single-flight intake synchronization at startup, after settings activation, and at the board refresh interval, which defaults to 15 minutes. It lists the configured channel's top-level messages and replies with bounded Graph pagination and retries. A candidate requires both:

- an Adaptive Card matching the FLAMOX365 feedback shape; and
- a structured `Symphony` mention or a standalone case-insensitive `@Symphony` token in the root message or one of its replies.

The adapter projects only a provider-neutral feedback signal containing the source and target identifiers, bounded untrusted feedback text, source links, actor display name, and a deterministic source marker. The application passes that input through the workspace's assigned Work Item Creator, validates the draft against live GitHub Project metadata, creates the GitHub Issue, adds it to the configured Project, and records it in the board projection.

The first synchronization of a source stores every existing candidate as a baseline and creates nothing. Later candidates receive durable workspace-local receipts. The GitHub Issue body also carries a stable HTML marker derived from tenant, team, channel, and root message IDs. Before creation, Symphony searches all enabled work-item sources for that marker, so a restart after GitHub creation but before receipt persistence completes the receipt instead of duplicating the Issue.

## Authority and failure behavior

The Teams mention authorizes only work-item creation. Analysis, implementation, branch delivery, and pull-request synchronization retain their existing independent authorization and autonomy settings.

Authentication failures, missing RSC consent, invalid payloads, and Work Item Creator classification failures do not create partial Issues. Rate limits, server failures, timeouts, and temporary network failures remain deferred for a later interval. Logs and renderer errors use bounded provider-neutral messages and never include access tokens, client secrets, response bodies, or full channel payloads. Removing a workspace removes its intake configuration and workspace-local receipts; exported workspace bundles omit credential references and import intake sources disabled.
