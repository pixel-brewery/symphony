---
applyTo: 'apps/renderer-e2e/**'
name: 'Electron E2E Writing Guidelines'
description: 'Playwright rules for the real Electron process, Mosaik UI, and stable interaction contracts.'
---

# Electron E2E writing guidelines

- Launch the real built Electron application and exercise the typed process model.
- Locate interactions with `getByTestId()` and stable domain-specific `test-id` values.
- Do not use translated text, labels, placeholders, CSS, XPath, layout indexes, implementation classes, or component tags as substitutes for a missing test ID.
- Assert material domain results and user-resolvable failure states, not decorative copy or styling.
- Inspect screenshots for changes where layout, shell, dialogs, settings, board behavior, or responsive structure is material.
- Keep output and databases isolated per run and close Electron cleanly.
