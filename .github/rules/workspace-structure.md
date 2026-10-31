# Symphony workspace structure

The repository root is the Nx workspace. `package.json`, `nx.json`, project-level `project.json`, `tsconfig.base.json`, and ESLint boundaries are authoritative.

- `apps/desktop`: thin Electron lifecycle and process broker.
- `apps/renderer`: sandboxed Angular composition root.
- `apps/orchestrator`: independently runnable Utility Process entrypoint.
- `apps/renderer-e2e`: real Electron Playwright tests.
- `libs/domain/{core,features}`: provider- and framework-neutral models and policy.
- `libs/application/{core,features,composition}`: use cases, consumed ports and cross-feature joins.
- `libs/configuration/{core,features,composition}`: versioned settings schemas, defaults and one aggregate composition.
- `libs/providers/<family>`: replaceable external integration adapters.
- `libs/persistence/{core,features,composition}`: existing durable stores and their shared connection/lifecycle composition.
- `libs/ipc-contracts/{core,features,composition,desktop}`: method-specific Zod schemas, orchestration composition and separate native desktop methods.
- `libs/frontend/core`: typed renderer client, configuration writer, transport synchronization, readonly projections, bootstrap and consumed feature contracts.
- `libs/frontend/presentation`: the FLAMOX365-aligned `PresenterView`, its presenter, and presentation routing.
- `libs/frontend/features/<feature>/src/lib`: fifteen horizontal feature owners with public exports and cohesive `provideXFeature` composition. Optional cross-feature operations use consumed ports; public helper/view imports remain acyclic.
- `libs/frontend/{ui,search,setting,notification,quick-create,widget,update,interaction}`: product capabilities composed once and extended by selected features. Setting owns the generic host, selection, slots and editor registry.
- `libs/mobile-contracts` and `libs/logging`: the dedicated mobile protocol and structured logging.

See `docs/architecture/dependency-model.md` for the complete folder tree and ownership matrix. Do not recreate the retired aggregate packages or introduce `backend` or `shared` folders. Nx enforces inward layer dependencies and public cross-package imports. Foundation capabilities cannot import feature implementations; Presentation composes the optional feature-owned desktop/mobile surfaces. Source-adjacent feature specs participate in the renderer test hash through dependency inputs rather than a workspace-wide frontend source glob.

Run tasks through Yarn and Nx. Do not create libraries solely for folder symmetry.
