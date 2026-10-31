---
name: manage-portable-skills
description: Create, update, validate, package, import, and audit repository-local portable skills compatible with ChatGPT and Codex. Use for work under .agents/skills, .skill archives, skill metadata, skill catalogs, or skill synchronization.
---

# Manage portable skills

1. Treat `.agents/skills/<name>/` as the editable source of truth.
2. Require `SKILL.md` with frontmatter containing `name` and `description`, with supported `metadata` for explicit skill derivation; keep the directory and name aligned.
3. Add `agents/openai.yaml` with quoted display metadata and a default prompt that explicitly invokes `$<name>`.
4. Add only resources required by the workflow: `scripts/`, `references/`, or `assets/`.
5. Keep instructions imperative, concise, provider-neutral where possible, and free of secrets or absolute developer paths.
6. Validate every skill with the repository validation command.
7. Build deterministic `.skill` ZIP archives with one top-level directory matching the skill name, and refresh `.agents/packages/skills-lock.json`.
8. Never edit a packaged archive as the source; regenerate it from the directory.

Imported skills are installed through the Skills CLI and tracked in root `skills-lock.json` with an immutable `ref` and content digest. Keep that standard lock separate from the generated portable-package catalog. A derived skill declares `metadata.inherits`, explicitly reads the sibling base, and retains its local rules. Packaging embeds declared bases and projects their links inside the derived archive.
