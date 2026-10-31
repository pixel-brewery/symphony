# Feature coverage checklist

Apply this checklist when building, synchronizing, or auditing a feature. Mark non-applicable topics deliberately; do not create empty sections.

## Purpose and scope

- Is the user or business problem clear?
- Is the feature boundary expressed in product language?
- Are capabilities and explicit limitations covered?

## Actors and access

- Which roles, permissions, subscriptions, or tenant settings control access?
- Does behavior differ by actor, plan, tenant, or environment?
- What does a denied user see or experience?

## Triggers and workflows

- Which user actions, API calls, imports, webhooks, schedules, or events start behavior?
- What are the preconditions?
- What happens synchronously and what happens later?
- Which records, tasks, messages, documents, or notifications are created or changed automatically?
- Which related features receive follow-up work?

## Rules, state, and configuration

- Which input, state, outcome, or setting selects each branch?
- Which defaults and scopes apply to configuration?
- When does a configuration change become effective?
- Which states and transitions are valid, terminal, reversible, or forbidden?
- Are retries, idempotency, reconciliation, and duplicate prevention visible in the resulting behavior?

## Special cases

- What happens for missing data, empty results, invalid input, stale state, concurrent actions, deletion, cancellation, or downgrade?
- What happens after partial success or an external-system failure?
- Can users recover, retry, resume, restore, or only contact support?

## Evidence

- UI routes, labels, forms, commands, and visible states checked.
- API contracts, permission guards, and errors checked.
- Domain services, policies, listeners, jobs, and integrations checked.
- Schema relations, defaults, and lifecycle states checked.
- Focused tests and relevant runtime behavior checked.
- Old prose treated only as a search aid and every retained claim reverified.

## Audience review

- Can a product owner validate the described rule?
- Can support explain the result and next action?
- Can a customer or implementation partner understand the page without source-code knowledge?
- Are technical identifiers included only where they are part of a contract?
- Are unverified product reasons kept out of the published page and reported as clarification needs?
