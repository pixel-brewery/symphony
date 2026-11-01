# Read-only reference repositories

- The owner-provided `SYMPHONY_REFERENCE_ROOT` environment variable locates the mandatory private upstream Angular/product-UI reference. Resolve it locally; never record the actual path or repository identity in public source. If unavailable, report that exact missing prerequisite and continue independent work without claiming a reference comparison.
- `../mosaik` is the mandatory Mosaik API and design-system reference.
- Inspect exact source, tests, configuration, tokens, and public APIs before adopting a pattern.
- Never modify, import, package, or create a runtime dependency on either reference.
- Adapt proven architecture and behavior to provider-neutral Symphony concepts; never copy private upstream application business-domain logic.

## Private upstream renderer parity contract

- The private upstream application is the default baseline for renderer structure, Mosaik component choice, typography, spacing, density, interaction, responsive behavior, accessibility, empty/loading/error states, and test surfaces.
- Inspect the exact owning private upstream application and Mosaik source before implementing or reviewing a visible renderer surface. Similar-looking custom markup is not a substitute for the reference component path.
- Classify each material choice as **Adopt**, **Adapt**, or **Differ** in `docs/architecture/frontend-reference/README.md`. Every Adapt or Differ entry must name the concrete desktop, provider-neutral, security, or unavailable-service constraint.
- Re-audit all affected routes in the running Electron application before handoff. No unexplained visual, structural, or behavioral drift from the applicable private upstream application pattern is accepted.
- Keep the references read-only. Parity is achieved by reproducing verified contracts with Symphony-owned code and public Mosaik APIs, never by importing private upstream application runtime code.
