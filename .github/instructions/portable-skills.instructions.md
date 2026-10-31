---
applyTo: '.agents/**,.codex/**,.opencode/**,.claude/skills/**,.claude/agents/**,skills-lock.json,opencode.json,.mcp.json'
name: 'Portable Skills'
description: 'Source ownership, portability, packaging, generation, and secret-safety rules for repository assistants.'
---

# Portable skills

- Treat `.agents/skills` as the editable portable source and `.agents/packages` as generated archives.
- Keep `SKILL.md` frontmatter limited to `name`, `description` and supported `metadata`; align the name with the directory.
- Keep `agents/openai.yaml` synchronized and include a default prompt with the literal `$skill-name`.
- Add only resources required by the workflow. Do not add skill READMEs, change logs, installation guides, secrets, or absolute paths.
- Treat `.codex`, `.opencode`, `opencode.json`, `.claude/skills`, `.claude/agents`, `.mcp.json`, package archives, and `.agents/packages/skills-lock.json` as generated output.
- Run `yarn agents:sync` after source changes and `yarn agents:check` before handoff.

Imported skills are installed through the Skills CLI and tracked in root `skills-lock.json` with an immutable `ref` and content digest. Keep that standard lock separate from the generated portable-package catalog. A derived skill declares `metadata.inherits`, explicitly reads the sibling base, and retains its local rules. Packaging embeds declared bases and projects their links inside the derived archive.
