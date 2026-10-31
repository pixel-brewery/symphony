---
applyTo: 'apps/desktop/**,libs/ipc-contracts/**'
name: 'Desktop Boundaries'
description: 'Mandatory Electron lifecycle, preload, IPC, credential, and Utility Process boundaries.'
---

# Desktop boundaries

- Keep every renderer window sandboxed with Node integration disabled, context isolation and web security enabled.
- Expose only the narrow typed preload API. Never expose `ipcRenderer`, arbitrary channels, shell execution, filesystem access, database handles, or credentials.
- Define method-specific Zod request and response schemas with correlation IDs and secret-safe failures in `libs/ipc-contracts`.
- Keep Electron Main limited to lifecycle, window and operating-system integration, credential mediation, IPC routing, Utility Process supervision, and graceful shutdown.
- Run orchestration, GitHub, Git, Codex, workspace, and SQLite work in the Utility Process or provider libraries.
- Do not add HTTP, REST, NestJS, Express, or long-running orchestration logic to Electron Main.
