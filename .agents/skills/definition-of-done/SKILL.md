---
name: definition-of-done
description: Run the complete local Symphony release-candidate verification only when the user explicitly asks for Definition of Done or names this skill. Use to validate the whole candidate rather than a focused change.
---

# Run Definition of Done

1. Freeze the candidate scope and list unverified external integrations.
2. Complete the `$symphony-docs` and `$symphony-technical-docs` impact passes, review documentation for contradictions, and perform the repository naming audit.
3. Run `yarn agents:check`.
4. Run `yarn verify` for format, lint, typecheck, tests, builds, and boundary checks.
5. Run `yarn e2e` against the real Electron process and inspect material visible states.
6. Run `yarn forge:package` as the final executable packaging gate.
7. Report `PASS` only when every configured gate succeeds. Otherwise report `FAIL` or `BLOCKED` with the exact failing command and evidence.

Do not perform external deployment, GitHub mutation, legal review, commit, push, or release approval unless separately requested.
