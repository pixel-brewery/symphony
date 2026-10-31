---
name: maintain-documentation
description: Create, audit, and synchronize Symphony architecture, specification, roadmap, and operator documentation from verified implemented behavior. Use whenever contracts, processes, configuration, user workflows, or architectural decisions change.
---

# Maintain documentation

Apply [symphony-docs](../symphony-docs/SKILL.md) for functional documentation under `docs/project` and [symphony-technical-docs](../symphony-technical-docs/SKILL.md) for technical documentation under `docs/architecture`. Use their complete workflows and implementation-impact checks for existing `$maintain-documentation` invocations.

1. Verify behavior in source and executable configuration before editing prose.
2. Update the existing owning document instead of creating a competing overview.
3. Keep the platform generic and distinguish implemented behavior, simulated adapters, planned work, and unverified external integrations.
4. Update diagrams, paths, commands, invariants, and acceptance notes together.
5. Use `FLAMOX365` exactly for the reference product and `Edge Connector` exactly for that product; do not combine the names.
6. Remove stale claims and placeholders. Keep documentation concise enough to remain maintainable.
