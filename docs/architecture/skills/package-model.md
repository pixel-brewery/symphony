# Skill model

**Dokumentstatus:** Implementierter Ist-Stand

Symphony uses the open agent skills format shared by ChatGPT and Codex. A portable skill is a directory rather than a product-specific archive:

```text
skill-name/
├── SKILL.md                 # required
├── agents/openai.yaml       # recommended OpenAI metadata and policy
├── scripts/                 # optional executable helpers
├── references/              # optional knowledge loaded on demand
└── assets/                  # optional binary or text assets
```

`SKILL.md` starts with YAML frontmatter containing `name` and `description`. Repository assistant tooling also supports optional `metadata`, including an explicit inherited-skill declaration. Its Markdown body contains the workflow instructions. This preserves progressive disclosure: catalog views and invocation decisions need only the compact metadata; the full body and resources are loaded when the skill is selected.

The repository uses this format for its own assistants under `.agents/skills`. `yarn agents:sync` validates and synchronizes repository guidance, while `yarn skills:package` builds deterministic ZIP-compatible `.skill` archives for external clients such as ChatGPT and Codex. Declared inherited bases are embedded under `dependencies/` and their Markdown links are projected into the archive. `.agents/packages/skills-lock.json` records the source path, archive path, and SHA-256 digest for every portable package. The separate root `skills-lock.json` belongs to the standard Skills CLI and records installed upstream skills with their immutable source revisions and content digests. See [repository AI configuration](../repository-ai-configuration/README.md) for repository-skill derivation and portable dependency bundling.

The desktop Skills UI imports an existing folder and edits a supported subset through typed IPC: `name`, `description`, the Markdown instructions, `agents/openai.yaml`, and files below `scripts/`, `references/` and `assets/`. Extra frontmatter fields produce warnings; import and save serialize only `name` and `description`. Directories such as `dependencies/` are omitted. Consequently, importing an extracted inherited archive through this desktop flow loses its declaration and embedded base, leaving its base links unresolved. Desktop imports currently require self-contained instructions and resources within the supported roots; the external archive's inheritance support does not extend that contract.

The sandboxed renderer never reads or writes local files directly. The background service validates names, frontmatter, YAML, resource roots, traversal attempts, file counts and package size before atomically replacing a shared package. Text resources remain editable; binary assets are transported losslessly as base64. Deleted and renamed user packages are moved into the shared root's recoverable `.trash` directory.

The supported folder representation is also the source of truth for desktop runtime activation. Settings persists explicit package IDs plus explicit flow-role assignments. The Skills route shows only active packages, and its Add drawer projects the discovered catalog as a responsive three-column Mosaik card grid based on the FLAMOX365 Extension Store pattern. Activation remains disabled until the user selects the optional AI role for Issue drafting, Analysis, Implementation and revision, CI diagnosis, CI repair, or pull-request review; active cards expose the same assignment for later correction. Activation makes the corresponding AI capability available but never selects or enables its governing runtime policy automatically. Analyzer, Solver, Agentic Delivery, and the Board drafting action resolve the exact package assigned to their role and pass it to the provider-neutral runtime port only after explicit opt-in. Every durable execution captures a minimal immutable skill snapshot, so restart recovery does not reinterpret work through a later assignment or edited package. `SkillManifest` remains the compact UI/workflow projection and does not introduce ChatGPT- or Codex-specific types into the domain model.
