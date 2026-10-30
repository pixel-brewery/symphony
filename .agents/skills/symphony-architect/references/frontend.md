# Angular, Mosaik and renderer integration

Use with common Frontend and Frontend patterns. Read [renderer architecture](../../../../.github/instructions/renderer-architecture.instructions.md), [inspect-reference-ui](../../inspect-reference-ui/SKILL.md), the affected Symphony owner and the exact FLAMOX365/Mosaik source.

## Reference and ownership contract

- FLAMOX365 is the permanent visible-behavior/composition baseline. Inspect the exact corresponding route, `ShellView`, `ShellConfig`, `PresenterView`, `ViewPresenter`, form/dialog/settings or FlowBoard source. Adopt the proven pattern unless an evidenced desktop/product constraint requires adaptation.
- Keep `../flamox` read-only. `../mosaik` is editable only for explicitly required coordinated Mosaik API work; Mosaik stays a package dependency and is never copied into Symphony. Use the installed public API and tokens before inventing product primitives or workarounds for library-owned behavior.
- Record every material Adopt, Adapt or Differ decision in [frontend reference parity](../../../../docs/architecture/frontend-reference-flamox.md). Product-neutral data, desktop boundaries and unavailable FLAMOX365 services justify explicit adaptations, not unexplained drift. Verify every affected route in the real running Electron application.
- Renderer and shared mobile frontend source stay sandboxed and free of Node.js APIs. Access application operations through the typed frontend client and desktop/mobile contract. Derive board projections from the provider-neutral workflow model, never hard-coded GitHub values.

## Components, presenters and forms

- Use Angular standalone components, Signals, OnPush, route-level lazy loading and Signal Forms where appropriate to the existing owner. Keep Views in matching `.ts`, `.html` and `.scss` units; retain the current PresenterView/ViewPresenter/ShellConfig composition and lifecycle.
- ViewPresenters own application state, domain projections, lifecycle and commands. Put simple conditional copy in the owning HTML template; use standalone pure pipes for reusable formatting, labels, icons, appearances and variants. Avoid opaque `details`, `summary`, `subtitle` or pre-concatenated display strings that hide presentation decisions.
- Keep loading/error/empty/retry state explicit, mounted controls and scroll stable, and subscriptions/effects scoped to the owning lifecycle. Preserve real Mosaik slots, events, form-state/command integration, focus, keyboard and accessibility contracts rather than duplicating them.
- Use typed form state, schema/reusable cross-field validators and actual Command enabled-state ownership. Validate before mutation and provide actionable feedback. Do not import a FLAMOX365 generated API client, SaaS state or push service absent from Symphony; use its actual validated IPC events and scoped refresh/invalidation owner.

## Styling and relevance

- Before styling, read [DESIGN.md](../../../../DESIGN.md) and [COMPONENTS.md](../../../../COMPONENTS.md). Resolve the effective theme from the configured Mosaik baseline and `ApplicationThemeOverrides.ts`; the generated `ds-bundle/` contracts/previews follow `.design-sync/NOTES.md`.
- Use Tailwind v4 directly in templates only for layout, position, size, spacing, overflow and responsive composition. Do not introduce semantic product classes or Tailwind color/background/border/radius/shadow/typography/opacity/transition/animation/filter utilities.
- Express visual semantics through public Mosaik inputs, slots, typography and theme configuration. Keep View SCSS empty when those mechanisms suffice; otherwise limit it to necessary host-local structure. Never override Mosaik parts or internal custom properties from a View. The sole shell exception is layout-only App header/navigation geometry in the App template where no public input exists; document it as Adapt and set no visual tokens.
- Use registered named icons through the existing `ShellConfig.ts` vocabulary; prefer `@pixel-brewery/mosaik-icons/reicon` for generic icons. Never embed raw SVG/path data. Register provider marks from another named icon set only where Reicon has no brand glyph.
- Add a visible element only for a user decision/action, problem resolution or necessary task context. Avoid duplicate page/rail information, decorative badges, generic health copy and architecture/security/storage claims used as filler.
- Apply [maintain-i18n](../../maintain-i18n/SKILL.md) to visible and accessibility copy. Add stable domain-specific `test-id` values to acceptance surfaces; component accessibility remains behavior to verify. Rebuild design projections with `yarn design:md` when theme/icon/style inputs or Mosaik versions change.
