---
name: reuse-existing-patterns
description: Find and reuse the owning Symphony implementation path and the closest canonical end-to-end pattern. Use before and after every implementation, feature extension, bug fix, or refactor in this repository to prevent duplicate services, components, contracts, persistence paths, and UI primitives.
---

# Reuse existing patterns

## Initial pass

1. Read the nearest `AGENTS.md` and applicable repository guidance.
2. Search the actual workspace before designing. Locate the exact owner or the closest complete path from domain model through application service, IPC, persistence, and renderer.
3. Inspect the read-only `../flamox` and `../mosaik` references when renderer, shell, presenter, Mosaik, or FlowBoard behavior is involved.
4. Name the principal references and extend them by default. Introduce a new abstraction only when no existing owner can accept the responsibility without violating a boundary.
5. Keep the renderer sandboxed and keep provider-specific shapes at adapter boundaries.

## Completion pass

1. Review every task-scoped change for semantic duplication, bypassed shared behavior, competing state, and unnecessary visible UI.
2. Verify that a user-facing element supports a decision, action, problem resolution, or necessary task context.
3. Correct unexplained drift and report the principal patterns followed plus any justified exception.
