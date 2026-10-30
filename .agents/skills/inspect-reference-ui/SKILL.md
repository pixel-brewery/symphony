---
name: inspect-reference-ui
description: Compare Symphony renderer architecture and visible behavior with the read-only FLAMOX365 and Mosaik repositories. Use for ShellView, ShellConfig, PresenterView, ViewPresenter, settings, navigation, forms, dialogs, FlowBoard, tokens, responsive behavior, or visual parity work.
---

# Inspect the reference UI

1. Treat `../flamox` and `../mosaik` as read-only.
2. Locate the exact reference implementation, styles, tokens, configuration, tests, and public Mosaik API before changing Symphony.
3. Compare structure, behavior, interaction, density, spacing, typography, states, and responsive rules; do not compare screenshots alone.
4. Reuse the proven pattern with provider-neutral Symphony data and contracts.
5. Apply the UI relevance gate to every visible element. Remove decorative badges, technical architecture claims, duplicate status, and non-actionable diagnostics.
6. Validate the actual Electron renderer with focused Playwright interaction and screenshots at the relevant viewport.
7. Update `docs/architecture/frontend-reference-flamox.md` when a material pattern is adopted or intentionally differs.
