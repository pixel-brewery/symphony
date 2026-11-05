# Symphony Design System

[Download the Symphony token archive](design-system-public/symphony-design-system.varynth.zip) to use its light and dark tokens in Varynth. The archive contains the three token sets and their theme resolver from the saved Symphony snapshot. It is a portable reference; it does not change Symphony's runtime theme.

1. Open **Importieren** in Varynth and select **Varynth Projekt-ZIP**.
2. Choose the downloaded ZIP and select **Importvorschau prüfen**.
3. Review the detected tokens, then confirm the import.

The full **Symphony Design System** project, including its original design files, is stored in the local Varynth workspace. Its **Projekt-Einstellungen → Projektordner** card shows the path and last written revision. The `design-system/` folder in the bound checkout updates when a revision is saved. The local projection stays out of Git because its source material includes private references. The public ZIP does not contain that material.

Symphony's [theme configuration](tools/design-md.config.json) and its generated [design reference](DESIGN.md) and [component reference](COMPONENTS.md) describe the theme the app renders. Use those sources to change the running application.
