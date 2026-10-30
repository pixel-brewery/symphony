# Read-only reference repositories

- `../flamox` is the mandatory FLAMOX365 Angular and product-UI reference.
- `../mosaik` is the mandatory Mosaik API and design-system reference.
- Inspect exact source, tests, configuration, tokens, and public APIs before adopting a pattern.
- Never modify, import, package, or create a runtime dependency on either reference.
- Adapt proven architecture and behavior to provider-neutral Symphony concepts; never copy FLAMOX365 business-domain logic.

## FLAMOX365 renderer parity contract

- FLAMOX365 is the default baseline for renderer structure, Mosaik component choice, typography, spacing, density, interaction, responsive behavior, accessibility, empty/loading/error states, and test surfaces.
- Inspect the exact owning FLAMOX365 and Mosaik source before implementing or reviewing a visible renderer surface. Similar-looking custom markup is not a substitute for the reference component path.
- Classify each material choice as **Adopt**, **Adapt**, or **Differ** in `docs/architecture/frontend-reference-flamox.md`. Every Adapt or Differ entry must name the concrete desktop, provider-neutral, security, or unavailable-service constraint.
- Re-audit all affected routes in the running Electron application before handoff. No unexplained visual, structural, or behavioral drift from the applicable FLAMOX365 pattern is accepted.
- Keep the references read-only. Parity is achieved by reproducing verified contracts with Symphony-owned code and public Mosaik APIs, never by importing FLAMOX365 runtime code.
