// #region Imports

import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// #endregion

const executables = {
  codex: `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '%s\n' 'codex-cli 0.99.0'
  exit 0
fi
if [ "$1" = "login" ] && [ "$2" = "status" ]; then
  printf '%s\n' 'Not logged in'
  exit 0
fi
printf '%s\n' "Unexpected Codex fixture command: $*" >&2
exit 64
`,
  claude: `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '%s\n' '2.1.0 (Claude Code)'
  exit 0
fi
if [ "$1" = "auth" ] && [ "$2" = "status" ] && [ "$3" = "--json" ]; then
  printf '%s\n' '{"loggedIn":false}'
  exit 0
fi
if [ "$1" = "auth" ] && [ "$2" = "logout" ]; then
  exit 0
fi
printf '%s\n' "Unexpected Claude fixture command: $*" >&2
exit 64
`,
  opencode: `#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '%s\n' 'opencode 1.2.3'
  exit 0
fi
printf '%s\n' "Unexpected OpenCode fixture command: $*" >&2
exit 64
`,
} as const;

/**
 * Installs deterministic native executables at the existing Electron acceptance-test boundary.
 *
 * @param configurationRoot - Task-owned directory for the generated executable fixtures.
 * @param options - Optional native-execution trace enables the controlled Codex JSONL protocol.
 * @returns The executable directory to prepend to the application's PATH.
 *
 * @public
 */
export function installAgentRuntimeFixtures(
  configurationRoot: string,
  options: { readonly nativeExecutionLog?: string } = {},
): string {
  const executableDirectory = resolve(configurationRoot, 'bin');
  mkdirSync(executableDirectory, { recursive: true });
  for (const [name, source] of Object.entries(executables)) {
    const executable = resolve(executableDirectory, name);
    let contents: string = source;
    if (name === 'codex' && options.nativeExecutionLog) {
      const script = resolve(executableDirectory, 'native-codex.mjs');
      writeFileSync(script, nativeCodexFixture(options.nativeExecutionLog), { mode: 0o600 });
      contents = `#!/bin/sh\nexec ${shellArgument(process.execPath)} ${shellArgument(script)} "$@"\n`;
    }
    writeFileSync(executable, contents, { mode: 0o700 });
    chmodSync(executable, 0o700);
  }
  return executableDirectory;
}

function shellArgument(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function nativeCodexFixture(logPath: string): string {
  const criterion = 'The controlled native CLI persists its analysis and implementation reports.';
  const analysis = [
    '## Problem and evidence',
    'The native CLI fixture must cross the real Symphony and Synapse process boundary.',
    'Native fixture analysis complete.',
    '',
    '## Ownership and existing patterns',
    'Use the existing execution, profile, continuation and report owners.',
    '',
    '## Acceptance criteria',
    `- ${criterion}`,
    '',
    '## Change surface',
    '| Path | Operation | What changes |',
    '| --- | --- | --- |',
    '| src/simulated-change.ts | create | Persist the controlled native implementation marker. |',
    'Collision risk: None',
    '',
    '## Implementation path',
    `1. src/simulated-change.ts: create the native implementation marker to satisfy: ${criterion}`,
    '',
    '## Verification plan',
    'Inspect the native subprocess trace and the persisted execution result.',
    '',
    '## Scope and risks',
    'Only task-owned fixture files are touched. No external inference or account is used.',
    '',
    '## Open decisions',
    'None',
    '',
    '## Definition of ready',
    '```json',
    JSON.stringify({
      feasible: true,
      ready_for_solve: true,
      unresolved_questions: [],
      test_strategy: ['deterministic Electron and native-protocol acceptance'],
      acceptance_mapping: [
        {
          criterion,
          implementation_step: 1,
          verification: 'Persisted execution and controlled native subprocess trace',
        },
      ],
      risk: { class: 'low', reasons: ['Only isolated fixture files are changed.'] },
      affected_components: ['native CLI acceptance fixture'],
      likely_change_surface: ['src/simulated-change.ts'],
      database_migration_required: false,
      collision_risk: 'low',
    }),
    '```',
  ].join('\n');
  const implementation = [
    '## Result',
    'Native fixture implementation complete.',
    '',
    '## Changed files',
    '| Path | Operation | What changed |',
    '| --- | --- | --- |',
    '| src/simulated-change.ts | create | Wrote the controlled native implementation marker. |',
    '',
    '## Implemented behavior',
    'The child process wrote only inside its supplied isolated workspace.',
    '',
    '## Acceptance assessment',
    `- Satisfied: ${criterion}`,
    '',
    '## Deviations from the plan',
    'None',
    '',
    '## Verification',
    'The fixture wrote its marker; the acceptance journey verifies the real persisted result.',
    '',
    '## Documentation and integration consequences',
    'No production documentation or external integration changed.',
    '',
    '## Review notes',
    'This is an explicit deterministic native transport fixture, not external inference.',
  ].join('\n');
  return [
    "import { appendFileSync, mkdirSync, readFileSync, writeFileSync, writeSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "import { createInterface } from 'node:readline';",
    `const logPath = ${JSON.stringify(logPath)};`,
    `const analysis = ${JSON.stringify(analysis)};`,
    `const implementation = ${JSON.stringify(implementation)};`,
    String.raw`
const args = process.argv.slice(2);
const trace = (entry) => appendFileSync(logPath, JSON.stringify({ ...entry, pid: process.pid }) + '\n');
const emit = (entry) => writeSync(1, JSON.stringify(entry) + '\n');

if (args[0] === '--version') {
  writeSync(1, 'codex-cli 0.99.0\n');
} else if (args[0] === 'login' && args[1] === 'status') {
  writeSync(1, 'Logged in using API key\n');
} else if (args[0] === 'app-server') {
  const input = createInterface({ input: process.stdin });
  input.on('line', (line) => {
    const request = JSON.parse(line);
    if (request.id === undefined) return;
    if (request.method === 'initialize') emit({ id: request.id, result: {} });
    else if (request.method === 'model/list') emit({ id: request.id, result: { data: [{ id: 'native-fixture-model', model: 'native-fixture-model', displayName: 'Native fixture model', supportedReasoningEfforts: [] }] } });
    else emit({ id: request.id, error: { code: -32000, message: 'Optional fixture metadata is unavailable.' } });
  });
} else if (args[0] === 'exec') {
  const prompt = readFileSync(0, 'utf8');
  const schemaIndex = args.indexOf('--output-schema');
  const schemaFile = schemaIndex >= 0 ? args[schemaIndex + 1] : undefined;
  const schema = schemaFile ? JSON.parse(readFileSync(schemaFile, 'utf8')) : undefined;
  const writing = args.includes('workspace-write') || args.includes('sandbox_mode="workspace-write"');
  const phase = schema ? 'issue' : writing ? 'implementation' : 'analysis';
  const resumedSession = args[1] === 'resume' ? args.at(-2) : undefined;
  const sessionId = resumedSession ?? 'native-fixture-' + phase + '-session';
  trace({ type: 'exec', phase, args, prompt, resumedSession, sessionId, workingDirectory: process.cwd(), home: process.env.HOME, codexHome: process.env.CODEX_HOME, sqliteHome: process.env.CODEX_SQLITE_HOME, schema });
  emit({ type: 'thread.started', thread_id: sessionId });
  emit({ type: 'turn.started' });

  if (phase === 'analysis' && !resumedSession && prompt.includes('$native-runtime-analysis')) {
    process.on('SIGTERM', () => {
      trace({ type: 'stopped', phase, sessionId, signal: 'SIGTERM' });
      process.exit(143);
    });
    setInterval(() => {}, 1000);
  } else {
    let result = analysis;
    if (phase === 'implementation') {
      mkdirSync(join(process.cwd(), 'src'), { recursive: true });
      writeFileSync(join(process.cwd(), 'src', 'simulated-change.ts'), 'export const nativeFixture = true;\n');
      result = implementation;
      emit({ type: 'item.completed', item: { type: 'file_change', changes: [{ path: 'src/simulated-change.ts' }] } });
    } else if (phase === 'issue') {
      const fields = JSON.parse(/^Provider field schema: (.+)$/m.exec(prompt)?.[1] ?? '[]');
      result = JSON.stringify({
        title: 'Native fixture issue draft',
        body: '## Problem\n\nExercise the real native structured-result boundary.\n\n## Acceptance criteria\n\n- The draft retains provider field identities.\n',
        projectFields: fields.map((field) => ({ fieldId: field.id, type: field.type, value: field.type === 'multi-select' ? [] : field.type === 'number' ? null : field.type === 'single-select' || field.type === 'iteration' ? field.options?.[0]?.id ?? null : '' })),
        labels: [],
        assignees: [],
      });
    }
    emit({ type: 'item.completed', item: { type: 'agent_message', text: result } });
    emit({ type: 'turn.completed', usage: { input_tokens: 11, cached_input_tokens: 2, output_tokens: 7 } });
  }
} else {
  trace({ type: 'unexpected-command', args });
  writeSync(2, 'Unexpected native Codex fixture command.\n');
  process.exitCode = 64;
}
`,
  ].join('\n');
}
