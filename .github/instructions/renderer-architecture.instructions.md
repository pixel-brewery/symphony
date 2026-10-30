---
applyTo: 'apps/renderer/**,libs/frontend/**'
name: 'Renderer Architecture'
description: 'Angular, Mosaik, presenter, shell, state, forms, and visible UI rules for the sandboxed renderer.'
---

# Renderer architecture

- Use standalone Angular components, Signals, Signal Forms where appropriate, route-level lazy loading, and `ChangeDetectionStrategy.OnPush`.
- Follow the inspected FLAMOX365 ShellView, ShellConfig, PresenterView, ViewPresenter, settings, and FlowBoard patterns when they fit the desktop product.
- Treat FLAMOX365 as the visible renderer baseline. Inspect the exact reference source for every affected route, prefer its Mosaik composition over parallel custom primitives, and record every intentional Adapt or Differ decision in `docs/architecture/frontend-reference-flamox.md`.
- Use Mosaik components, icons, tokens, slots, parts, and theme configuration before creating product-owned UI primitives.
- Use Tailwind v4 utilities directly in View templates only for layout, positioning, sizing, spacing, overflow, and responsive composition. View markup must not introduce semantic product class names.
- Never use Tailwind utilities for color, background, border styling, radii, shadows, typography, opacity, transitions, animations, or filters. Drive those decisions through public Mosaik `appearance`, `variant`, `elevation`, typography, slot, and theme inputs.
- Keep every View as an isolated three-file unit with matching `.ts`, `.html`, and `.scss` files. Keep View SCSS empty when Mosaik inputs and Tailwind layout utilities fully express the view; use it only for host-local structure that cannot be expressed through those public mechanisms. Never override Mosaik parts or internal CSS custom properties from a View. The only exception is the layout-only Mosaik App geometry contract for header and navigation sizing when the App exposes no equivalent public input; keep it in the App template, never use it for visual tokens, and document it as an Adapt.
- ViewPresenters own application state, domain projections, lifecycle, and commands only. Put simple conditional copy in the HTML template and move reusable formatting, labels, icons, appearances, and variants into standalone pure Angular pipes.
- Source generic product icons from named `@pixel-brewery/mosaik-icons/reicon` exports, matching Mosaik's current default icon family. Register application aliases directly in the `provideIcons` call in `apps/renderer/src/configuration/ShellConfig.ts`; never embed raw SVG markup or path data in Symphony source. Source provider marks from the closest named export in another `@pixel-brewery/mosaik-icons` set only when Reicon intentionally has no brand glyph.
- Keep presenters focused on view state and commands. Cross the desktop boundary only through the typed application API.
- Derive board columns and items from the provider-neutral workflow model; never hard-code GitHub field values as domain state.
- Add stable domain-specific `test-id` attributes to interactive acceptance surfaces.
- Add visible content only when it supports a user decision or action, explains a user-facing problem, or supplies necessary task context. Avoid decorative badges, architecture claims, generic health copy, and duplicate status.
- Verify affected routes in the running Electron application and leave no unexplained visual, structural, interaction, responsive, or state-handling drift from the applicable FLAMOX365 pattern.
