# Security policy

## Reporting a vulnerability

Report suspected vulnerabilities privately through GitHub's
[private vulnerability reporting](https://github.com/pixel-brewery/symphony/security/advisories/new).
Do not open a public issue for a security problem.

Include the affected Symphony version, your operating system, the reproduction
steps, and the impact you observed. Redact tokens, repository names, and other
credentials from any log excerpt you attach.

Expect an acknowledgement within seven days and a status update at least every
two weeks until the report is resolved. Fixes are shipped as a normal `main`
release and are offered through the Stable installer-manifest channel. Users install
the replacement installer explicitly; native ZIP/NuGet updater feeds remain disabled.
Symphony has no long-lived release branches, so there are no backports: the
supported version is always the latest published release.

## Supported versions

| Version                  | Supported                      |
| ------------------------ | ------------------------------ |
| Latest published release | Yes                            |
| Anything older           | No — update first, then report |

## Security model

Symphony is a local-first desktop application. The trust boundaries that matter
for a report are described in [docs/architecture/security-model.md](docs/architecture/security-model.md)
and [docs/architecture/process-model.md](docs/architecture/process-model.md). In short:

- The Angular renderer is sandboxed, has no Node.js integration, and reaches the
  system only through the Zod-validated IPC surface in `libs/ipc-contracts`.
- Electron Main owns lifecycle, IPC routing, and the update origin. The update
  origin is compiled in and cannot be changed at runtime.
- Git, GitHub, SQLite, and agent CLI execution happen only in the orchestrator
  Utility Process.
- The GitHub CLI and the agent CLIs own their authentication. Explicitly supplied
  Azure DevOps credentials use the Main-process vault backed by Electron `safeStorage`;
  the vault refuses storage when secure operating-system encryption is unavailable.
  Settings retain opaque references, while decrypted credentials are resolved only
  at the native provider boundary. Plaintext credentials in settings, logs or renderer
  projections are security bugs.

Findings that involve a sandbox escape from the renderer, an unvalidated IPC
path, a way to redirect the update feed, or a credential leaking into
plaintext settings or logs are in scope and treated as high severity.

## Out of scope

- Vulnerabilities in agent CLIs, the GitHub CLI, or Git themselves. Report those
  to their maintainers.
- Findings that require an attacker who already has local code execution as the
  user running Symphony.
- Missing hardening on unsigned local development builds (`yarn dev`,
  `yarn start:unpackaged`).
