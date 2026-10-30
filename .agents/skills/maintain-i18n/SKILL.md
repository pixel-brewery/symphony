---
name: maintain-i18n
description: Audit and synchronize user-visible Symphony copy and localization resources. Use when changing UI text, accessibility text, validation feedback, commands, dialogs, pages, notifications, empty states, or error states.
---

# Maintain internationalization

1. Inventory every changed user-visible string and its owning locale resource.
2. Keep technical identifiers, logs, and developer diagnostics in English.
3. Use concise task language. Do not add decorative implementation claims, generic health copy, or duplicate explanations.
4. Preserve placeholders, interpolation variables, plural behavior, and accessibility meaning across locales.
5. Use `FLAMOX365` and `Edge Connector` exactly where those external product names appear.
6. Run the relevant typecheck, unit tests, and visible UI verification.
