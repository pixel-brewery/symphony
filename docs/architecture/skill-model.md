# Skill model

Symphony uses the open agent skills format shared by ChatGPT and Codex. A portable skill is a directory rather than a product-specific archive:

```text
skill-name/
├── SKILL.md                 # required
├── agents/openai.yaml       # recommended OpenAI metadata and policy
├── scripts/                 # optional executable helpers
├── references/              # optional knowledge loaded on demand
└── assets/                  # optional binary or text assets
```

`SKILL.md` starts with YAML frontmatter containing only `name` and `description`. Its Markdown body contains the workflow instructions. This preserves progressive disclosure: catalog views and invocation decisions need only the compact metadata; the full body and resources are loaded when the skill is selected.

The repository now uses this format for its own assistants under `.agents/skills`. `yarn agents:sync` validates and synchronizes repository guidance, while `yarn skills:package` builds deterministic ZIP-compatible `.skill` archives for import into ChatGPT or another compatible client. `skills-lock.json` records the source path, archive path, and SHA-256 digest for every portable package.

The desktop UI edits the complete package through typed IPC. The sandboxed renderer never reads or writes local files directly. The background service validates names, frontmatter, YAML, resource roots, traversal attempts, file counts and package size before atomically replacing a shared package. Text resources remain editable; binary assets are transported losslessly as base64. Deleted and renamed user packages are moved into the shared root's recoverable `.trash` directory.

Portable packages are also the source of truth for runtime activation. Settings persists explicit package IDs plus explicit flow-role assignments. The Skills route shows only active packages, and its Add drawer projects the discovered catalog as a responsive three-column Mosaik card grid based on the FLAMOX365 Extension Store pattern. Activation remains disabled until the user selects the optional AI role for Issue drafting, Analysis, Implementation and revision, CI diagnosis, CI repair, or pull-request review; active cards expose the same assignment for later correction. Activation makes the corresponding AI capability available but never selects or enables its governing runtime policy automatically. Analyzer, Solver, Agentic Delivery, and the Board drafting action resolve the exact package assigned to their role and pass it to the provider-neutral runtime port only after explicit opt-in. Every durable execution captures a minimal immutable skill snapshot, so restart recovery does not reinterpret work through a later assignment or edited package. `SkillManifest` remains the compact UI/workflow projection and does not introduce ChatGPT- or Codex-specific types into the domain model.
