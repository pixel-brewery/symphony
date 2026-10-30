---
name: symphony-docs
description: 'Build, audit, create, and synchronize feature-oriented Symphony product documentation under docs/project from verified implemented behavior. Use when documenting a feature from scratch, refreshing or correcting existing product documentation, auditing documentation coverage, or completing any implementation that changes user-visible behavior, workflows, permissions, configuration, data, statuses, APIs, integrations, automation, or UI. Always perform a documentation-impact check before declaring implementation complete, even when no documentation file needs to change.'
---

# Symphony Docs

Keep `docs/project` as the current, feature-oriented product handbook. Describe what the system does, when it does it, which conditions apply, and which visible or operational consequences follow. Treat documentation work as part of implementation completion.

## Establish the contract

1. Read `AGENTS.md`, `docs/project/documentation-principles.md`, and `docs/project/README.md` before editing product documentation.
2. Treat source code, executable configuration, schemas, generated contracts, tests, and verified UI or runtime behavior as authoritative. Treat existing prose only as an unverified lead.
3. Keep `docs/project` understandable for product owners, support, implementation partners, and customers. Keep engineering architecture and operations material outside this product handbook.
4. Preserve unrelated worktree changes. For normal implementation work, use the task diff as scope. Broaden the investigation only for a requested feature build or documentation audit.

## Select the mode

- **Build:** Use when a feature has no trustworthy handbook entry or the user requests a rebuild. Read [feature-guide.md](references/feature-guide.md) and [coverage-checklist.md](references/coverage-checklist.md), investigate the feature end to end, and write it from verified behavior rather than reshaping old pages.
- **Synchronize:** Use after implementation changes. Identify every affected product feature, inspect its complete observable contract, and update all materially affected pages.
- **Audit:** Use when asked whether a feature or the handbook is complete or current. Apply the coverage checklist to the requested scope and correct or report every confirmed gap.

## Identify the feature

1. Name the feature in product language, based on the user's goal and mental model rather than the repository layout.
2. Trace one behavior across every participating layer. Backend, frontend, database, tasks, jobs, notifications, billing, and integrations can provide evidence for one product feature; they are not separate documentation destinations.
3. Place the canonical explanation with the feature that owns the user's trigger and outcome. Cross-link another feature only when the reader needs its independent behavior.
4. Use `docs/project/<feature>/README.md` as the feature entry point. Add capability pages only when they are independently understandable or the overview would become difficult to scan.
5. Do not create product folders named `backend`, `frontend`, `database`, `apps`, `libs`, `shared`, or after source packages.

## Investigate end to end

1. Start with the user-visible entry points, terminology, actions, and permissions.
2. Follow the request or event through presenters, API contracts, domain services, policies, listeners, jobs, persistence, notifications, and integrations as applicable.
3. Read focused tests as executable examples of business rules and special cases. Verify uncertain or high-impact behavior in the running application when practical.
4. Build a working behavior matrix with:
    - trigger and actor;
    - preconditions and configuration;
    - action or event;
    - automatic side effects;
    - resulting state and visible outcome;
    - exceptional cases and recovery options.
5. Search explicitly for deletion, cancellation, retries, idempotency, reconciliation, denied access, empty states, invalid transitions, downgrade behavior, and cross-feature effects.
6. Distinguish implemented causality from business rationale. Explain why the system takes a branch when the rule is evidenced. If the product reason for a rule is not recorded, report a separate clarification need instead of inventing or publishing a rationale.

## Write the product handbook

- Write new pages in German unless the surrounding product documentation establishes another language.
- Lead with purpose and observable behavior. Use product terminology and visible UI labels.
- Describe actors, prerequisites, triggers, workflows, automatic effects, configuration, permissions, states, decision rules, special cases, limits, and related features when relevant.
- Use decision tables for conditional behavior and state transitions. Keep exceptional behavior next to the workflow it changes.
- State current behavior directly. Keep plans, proposals, implementation reports, and changelog narration out of the handbook.
- Mention routes, permission keys, status identifiers, or payload formats only when they form a user, integration, or support contract.
- Omit class names, dependency injection, repository mechanics, file paths, package boundaries, test implementation, and other source-structure detail from the published narrative.
- Never expose secrets, credentials, private endpoints, real customer data, or environment values.

## Build a feature from scratch

1. Inventory capabilities and user questions before choosing pages.
2. Create the feature folder and overview from the template in [feature-guide.md](references/feature-guide.md).
3. Add capability pages only after their scope and relationship to the overview are clear.
4. Verify every claim independently. Copy no old statement merely because it already exists.
5. Remove or replace superseded product pages and update inbound links once the new feature coverage is complete. Do not retain a published legacy tree; Git preserves history.
6. Add the feature to `docs/project/README.md` only when its entry page is ready to be used.

## Synchronize after implementation

1. Review the task-scoped diff and list all changed observable behavior, including removals and renamed behavior.
2. Search `docs/project` by product terms, UI wording, statuses, permissions, routes, and configuration keys.
3. Update every affected capability page, not only the first search result.
4. Correct directly related stale statements discovered during the check.
5. For a refactor, test-only change, or formatting change with no changed contract, make no artificial documentation edit; record the completed impact check and reason.

## Validate before completion

1. Re-read each changed passage against the authoritative implementation and focused tests or runtime evidence.
2. Apply [coverage-checklist.md](references/coverage-checklist.md) from the perspective of a product owner, support partner, and customer.
3. Search for superseded terms and contradictory claims in the affected feature.
4. Run `node .agents/skills/symphony-docs/scripts/validate-docs.mjs docs`.
5. Run `git diff --check -- <changed-documentation-and-skill-files>`.
6. Report:
    - features and pages created, replaced, or synchronized;
    - important behavior now covered;
    - verification performed;
    - unresolved product rationale or documentation gaps, if any; or
    - the concrete reason no documentation file changed.
