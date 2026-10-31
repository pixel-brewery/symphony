# Architect origin and Symphony translations

The architecture foundation is inherited from the public [Pixel Brewery Skills](https://github.com/pixel-brewery/skills) repository, skill `architecture`. The root `skills-lock.json` records its full immutable commit in `ref`, source path and installed-folder SHA-256. The canonical installed base is `../../architecture`; this local skill declares `metadata.inherits: architecture` and reads [its entrypoint](../../architecture/SKILL.md) before applying Symphony-specific rules.

The foundation originated from the 13 common modules shared by Archipel, FLAMOX365, Mosaik, Synapse and Symphony. These modules are maintained centrally rather than copied into this local skill. Relevant modules are loaded through the routing table; ordinary skill use remains independent of other project checkouts.

Symphony-specific translations live in the local project references:

- Archipel/Nest module, abstract-base and configuration examples become Symphony's existing constructor-injected application ports, provider adapters and configuration owners. Existing `I*Port` contracts are retained; no NestJS, Prisma or Archipel runtime dependency is introduced.
- Backend request/response principles become typed Zod desktop/process contracts in `libs/ipc-contracts`; HTTP/OpenAPI/envelope examples do not turn local IPC into REST. Actual HTTP rules apply to the explicitly accepted, versioned ADR-006 mobile companion.
- Shared-main-PostgreSQL fixture examples become Symphony's configured isolated temporary SQLite/workspace tests. Production application data and credential homes remain protected user state.
- Chrome-only reference environment rules become real Playwright Electron journeys for the desktop process boundary. Ordinary web inspection still follows the actual user/browser context.
- Product frontend guidance applies to sandboxed Angular and the permanent FLAMOX365/Mosaik reference contract, including three-file Views, presenter responsibilities, layout-only Tailwind, public visual inputs, localization and documented Adopt/Adapt/Differ decisions.
- Public library/runtime examples respect installed Synapse and Mosaik ownership. Symphony retains product/workspace policy and does not copy library source into the application.
- The previous `architect-desktop-platform` responsibilities remain in the complete skill: user outcome/owner, process path, neutral domain, explicit state, validated secret-safe boundaries, isolated worktrees/read-only Analyzer, Mosaik/presenter/FlowBoard reuse and documented migration/operational/verification consequences.

Validate installed-source integrity and derivation with `python3 .agents/scripts/sync_architect_core.py --check`. Update shared foundations upstream, deliberately select a new immutable revision through the Skills CLI, and regenerate the provider mirrors and portable packages. Local project rules are retained during a base update. This proves skill integrity and generation consistency; it does not establish product/runtime behavior.
