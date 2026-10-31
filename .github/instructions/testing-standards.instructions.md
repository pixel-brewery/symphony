---
applyTo: '**/*.spec.ts,**/*.test.ts'
name: 'Testing Standards'
description: 'Risk-based unit, integration, IPC, persistence, component, and regression testing rules.'
---

# Testing standards

- Test meaningful observable behavior, decisions, validation, state transitions, permissions, side effects, contracts, recovery, or a proven regression.
- Do not add tests only to pin labels, CSS, spacing, icons, Mosaik variants, internal calls, or changed lines.
- Keep domain tests deterministic and infrastructure-free. Use isolated temporary databases and workspaces for adapter integration tests.
- Exercise Zod validation on both sides of every IPC and process boundary.
- Prove renderer isolation and the absence of Node.js access through the packaged-process model.
- Avoid duplicating the same behavior at multiple layers unless each test catches a distinct failure mode.
- Keep every non-E2E spec beside the exact production file it tests (`ProductionFile.ts` -> adjacent `ProductionFile.spec.ts`) and split suites that cover multiple production files.
- Keep end-to-end journey specs and repository-policy specs behavior-named because their subject is a cross-file user or enforcement contract.
