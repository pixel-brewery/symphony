---
name: create-change-request
description: Create a complete, implementation-ready Symphony repository change request from free text, screenshots, URLs, and observed behavior. Use when a user asks to create, formalize, refine, or file an issue without implementing it.
---

# Create a change request

1. Resolve the requested behavior, affected user, current behavior, expected behavior, and exclusions.
2. Inspect supplied screenshots and attachments and record concrete navigation and interaction paths.
3. Search the repository and read-only references only far enough to classify the owning area; do not invent an implementation plan during intake.
4. Write a concise problem statement, functional requirements, acceptance criteria, failure and empty states, security implications, and verification expectations.
5. Separate confirmed evidence from assumptions and list only decisions that truly require user input.
6. Preserve provider neutrality and do not embed target-project business logic into the desktop platform.
7. Create or mutate an external issue only when the user explicitly requested that external action and the repository/target is unambiguous.

## Write the work-item body to the fixed shape

The body is what a human reads and what the later analysis step works from.

1. Use Markdown with exactly these level-two sections, in this order: `Problem`, `Current behavior`, `Expected behavior`, `Navigation and reproduction`, `Functional requirements`, `Failure and empty states`, `Security and data implications`, `Scope and exclusions`, `Dependencies and consequences`, `Acceptance criteria`, `Verification expectations`, `Evidence and open questions`.
2. Keep every section. Write `None` or `Not applicable` where a section genuinely does not apply; never drop one.
3. Write `Acceptance criteria` as a flat bullet list of observable, testable criteria with no sub-headings and no nested lists; later steps read that list directly.
4. Quote existing user-visible text verbatim inside backticks, in its original language.
5. Do not design an implementation, confirm technical feasibility, or name owning files; the analysis step owns that.

## Keep the Markdown readable

The result is rendered as GitHub-flavored Markdown in Symphony and in the work tracker.

1. Start with the first required section heading. No document title, no preamble, no closing summary.
2. Use `##` for the required sections and at most `###` below them; deeper levels render identically and only add noise.
3. Never emit raw HTML. It is escaped and reaches the reader as literal text.
4. Put every path, symbol, command, branch, identifier, and configuration key in backticks, and use fenced code blocks with a language tag for commands, diffs, and payloads.
5. Use a table only where this skill asks for one and keep each cell to a single line; use bullets otherwise, one idea per bullet.
6. Use bold only for the fixed verdict labels. No emoji, no decorative rules, no ASCII art.
