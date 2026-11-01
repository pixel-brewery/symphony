---
name: maintain-i18n
description: Audit and synchronize user-visible Symphony copy and localization resources. Use when changing UI text, accessibility text, validation feedback, commands, dialogs, pages, notifications, empty states, or error states.
---

# Maintain internationalization

1. Inventory every changed user-visible string and its owning locale resource.
2. Keep technical identifiers, logs, and developer diagnostics in English.
3. Use concise task language. Do not add decorative implementation claims, generic health copy, or duplicate explanations.
4. Preserve placeholders, interpolation variables, plural behavior, and accessibility meaning across locales.
5. Use public product names only. Describe private references generically and use fictional workspace/repository examples; never publish their names, identities or paths.
6. Run the relevant typecheck, unit tests, and visible UI verification.
