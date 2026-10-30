# Architect origin and Symphony translations

The shared foundations and `architect-core` workflow block were copied from the local `../archipel/.agents/skills/archipel-architect` on 2026-10-30 and compared with `../flamox/.agents/skills/flamox-architect` and `../synapse/.agents/skills/synapse-architect`.

All 13 common modules are retained byte for byte: `architecture.md`, `oop.md`, `workflow.md`, `backend.md`, `backend-contracts.md`, `backend-safety.md`, `api.md`, `platform.md`, `frontend.md`, `frontend-patterns.md`, `date-time.md`, `testing.md` and `e2e.md`. The shared entrypoint block is also unchanged. No general foundation was removed or summarized away. Ordinary skill use is independent of the reference checkouts.

Symphony-specific translations live in the local project references:

- Archipel/Nest module, abstract-base and configuration examples become Symphony's existing constructor-injected application ports, provider adapters and configuration owners. Existing `I*Port` contracts are retained; no NestJS, Prisma or Archipel runtime dependency is introduced.
- Backend request/response principles become typed Zod desktop/process contracts in `libs/ipc-contracts`; HTTP/OpenAPI/envelope examples do not turn local IPC into REST. Actual HTTP rules apply to the explicitly accepted, versioned ADR-006 mobile companion.
- Shared-main-PostgreSQL fixture examples become Symphony's configured isolated temporary SQLite/workspace tests. Production application data and credential homes remain protected user state.
- Chrome-only reference environment rules become real Playwright Electron journeys for the desktop process boundary. Ordinary web inspection still follows the actual user/browser context.
- Product frontend guidance applies to sandboxed Angular and the permanent FLAMOX365/Mosaik reference contract, including three-file Views, presenter responsibilities, layout-only Tailwind, public visual inputs, localization and documented Adopt/Adapt/Differ decisions.
- Public library/runtime examples respect installed Synapse and Mosaik ownership. Symphony retains product/workspace policy and does not copy library source into the application.
- The previous `architect-desktop-platform` responsibilities remain in the complete skill: user outcome/owner, process path, neutral domain, explicit state, validated secret-safe boundaries, isolated worktrees/read-only Analyzer, Mosaik/presenter/FlowBoard reuse and documented migration/operational/verification consequences.

The peer comparison helper is adapted only to recognize Symphony/Synapse and keep differently scoped peer helper scripts local; it compares and optionally synchronizes the common content. Retained core files and the shared entrypoint are excluded from source formatting to preserve exact equality. Run `yarn exec python3 .agents/scripts/sync_architect_core.py --peer ../archipel --check` and the equivalent check for each available peer after deliberate shared changes. This proves shared-content equality, not product/runtime behavior or another repository's wider workflow parity.
