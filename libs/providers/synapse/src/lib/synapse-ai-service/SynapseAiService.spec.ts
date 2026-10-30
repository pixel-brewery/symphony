// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import type {
  IProcessRequest,
  IProcessResult,
  ProcessRunnerBase,
} from '@pixel-brewery/synapse-runtime';
import { AiError, encodeSessionReference } from '@pixel-brewery/synapse-core';
import { SynapseAiService } from './SynapseAiService.js';
import type { ISynapseAiInstanceConfiguration } from './interfaces/ISynapseAiInstanceConfiguration.js';

// #endregion

const roots: string[] = [];
const services: SynapseAiService[] = [];

afterEach(async () => {
  await Promise.all(services.splice(0).map((service) => service.dispose()));

  const temporaries = new Set<string>();

  for (const root of roots) await ownedTemporaries(root, temporaries);

  for (const directory of temporaries) await rm(directory, { recursive: true, force: true });

  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });

  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('SynapseAiService', () => {
  it('blocks execution and credential changes after metadata cannot confirm native cleanup', async () => {
    // arrange
    const root = await fixture();
    const run = vi.fn(async (): Promise<IProcessResult> => {
      throw new AiError('host', 'Synthetic unconfirmed metadata process cleanup.', {
        cleanupIncomplete: true,
      });
    });
    const service = createService(root, run);
    const config = { ...configuration(root), provider: 'opencode' as const };

    // act
    const inspection = service.inspect(config);

    // assert
    await expect(inspection).rejects.toMatchObject({ code: 'host', cleanupIncomplete: true });
    await expect(service.status(config)).rejects.toMatchObject({ cleanupIncomplete: true });
    await expect(service.logout(config)).rejects.toMatchObject({ cleanupIncomplete: true });
    await expect(
      service.execute(config, { prompt: 'synthetic input', policy: { mode: 'read-only' } }),
    ).rejects.toMatchObject({ cleanupIncomplete: true });
    expect(run).toHaveBeenCalledOnce();
    await expect(service.dispose()).rejects.toMatchObject({ cleanupIncomplete: true });
    services.splice(services.indexOf(service), 1);
  });

  it('awaits authentication cleanup before reporting a separate runtime teardown failure', async () => {
    // arrange
    const root = await fixture();
    const started = deferred();
    const cleanup = deferred();
    const service = createService(
      root,
      async (request) => {
        started.resolve();
        await aborted(request.signal);
        await cleanup.promise;
        request.signal?.throwIfAborted();

        return result();
      },
      async () => {
        throw new AiError('host', 'Synthetic unconfirmed runtime teardown.', {
          cleanupIncomplete: true,
        });
      },
    );
    const status = service.status(configuration(root));

    await started.promise;

    let settled = false;

    // act
    const disposal = service.dispose().finally(() => {
      settled = true;
    });
    const observed = disposal.catch((error: unknown) => error);

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    cleanup.resolve();

    // assert
    await expect(status).rejects.toMatchObject({ code: 'cancelled' });
    expect(await observed).toMatchObject({ code: 'host', cleanupIncomplete: true });
    expect(settled).toBe(true);
    services.splice(services.indexOf(service), 1);
  });

  it('rejects cancellation before profile preparation or native launch', async () => {
    // arrange
    const root = await fixture();
    const run = vi.fn(async (): Promise<IProcessResult> => result());
    const service = createService(root, run);
    const controller = new AbortController();

    controller.abort();

    // act
    const execution = service.execute(configuration(root), {
      prompt: 'synthetic input',
      policy: { mode: 'read-only' },
      signal: controller.signal,
    });

    // assert
    await expect(execution).rejects.toMatchObject({ code: 'cancelled' });
    expect(run).not.toHaveBeenCalled();
    expect(await readdir(root)).toEqual([]);
  });

  it('preserves legacy Codex paths and binds continuations to workspace account and candidate', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      return turn(request);
    });
    const firstConfiguration = configuration(root);
    const secondConfiguration = {
      ...configuration(root),
      workspaceId: 'another-workspace',
      root: join(root, 'other-account'),
    };

    // act
    const first = await service.execute(firstConfiguration, {
      prompt: 'first prompt',
      policy: { mode: 'read-only' },
      candidateId: 'candidate-a',
      workingDirectory: root,
    });
    const resumed = await service.execute(firstConfiguration, {
      prompt: 'continued prompt',
      policy: { mode: 'read-only' },
      candidateId: 'candidate-a',
      continuationReference: first.session?.nativeId,
      workingDirectory: root,
    });
    const second = await service.execute(secondConfiguration, {
      prompt: 'other prompt',
      policy: { mode: 'read-only' },
      candidateId: 'candidate-b',
      workingDirectory: root,
    });

    // assert
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.profileId).not.toBe(second.profileId);
    expect(resumed.session).toMatchObject({
      driverId: 'codex',
      instanceId: first.instanceId,
      profileId: first.profileId,
      candidateId: 'candidate-a',
      nativeId: 'native-session',
    });
    expect(requests[0]?.environment['CODEX_HOME']).toBe(
      join(firstConfiguration.root, 'execution', 'codex'),
    );
    expect(requests[0]?.environment['HOME']).toBe(
      join(firstConfiguration.root, 'execution', 'home'),
    );
    expect(requests[0]?.environment['CODEX_SQLITE_HOME']).toBe(
      join(firstConfiguration.root, 'execution', 'sqlite'),
    );
    expect(requests[1]?.args).toContain('resume');
    expect(requests[1]?.args).toContain('native-session');
    expect(requests[1]?.input).toBe('continued prompt');
  });

  it('retains draft continuation only across a retryable native interruption and clears it on success', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      if (requests.length === 1) {
        await request.onStdout?.(
          `${JSON.stringify({ type: 'thread.started', thread_id: 'native-session' })}\n`,
        );

        return result('', 1, 'connection reset by peer');
      }

      return turn(request);
    });
    const request = {
      prompt: 'draft issue from synthetic text',
      policy: { mode: 'read-only' as const, repeatable: true },
      workingDirectory: root,
      candidateId: 'candidate',
      sessionKey: 'draft-operation',
    };

    // act
    await expect(service.execute(configuration(root), request)).rejects.toMatchObject({
      code: 'provider',
      retryable: true,
    });
    await service.execute(configuration(root), request);
    await service.execute(configuration(root), request);

    // assert
    expect(requests).toHaveLength(3);
    expect(requests[1]?.args).toContain('resume');
    expect(requests[2]?.args).not.toContain('resume');
  });

  it('does not rerun native inference or retain draft continuation after progress persistence failure', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      return turn(request);
    });
    const request = {
      prompt: 'synthetic issue draft',
      policy: { mode: 'read-only' as const, repeatable: true },
      workingDirectory: root,
      sessionKey: 'operation',
    };

    // act
    await expect(
      service.execute(configuration(root), {
        ...request,
        onEvent: async () => {
          throw new Error('synthetic persistence failure');
        },
      }),
    ).rejects.toMatchObject({ code: 'persistence' });

    // assert
    expect(requests).toHaveLength(1);
    await service.execute(configuration(root), request);
    expect(requests[1]?.args).not.toContain('resume');
  });

  it('rejects duplicate active draft operations without starting another provider turn', async () => {
    // arrange
    const root = await fixture();
    const started = deferred();
    const finish = deferred();
    let launches = 0;
    const service = createService(root, async (request) => {
      launches++;
      started.resolve();
      await finish.promise;

      return turn(request);
    });
    const request = {
      prompt: 'synthetic draft',
      policy: { mode: 'read-only' as const },
      workingDirectory: root,
      sessionKey: 'active-operation',
    };
    const first = service.execute(configuration(root), request);

    await started.promise;

    // act
    try {
      await expect(service.execute(configuration(root), request)).rejects.toMatchObject({
        code: 'host',
      });
    } finally {
      finish.resolve();
    }

    await first;

    // assert
    expect(launches).toBe(1);
  });

  it('expires inactive draft continuations instead of resuming an old native session', async () => {
    // arrange
    vi.useFakeTimers();

    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      if (requests.length === 1) {
        await request.onStdout?.(
          `${JSON.stringify({ type: 'thread.started', thread_id: 'native-session' })}\n`,
        );

        return result('', 1, 'connection reset by peer');
      }

      return turn(request);
    });
    const request = {
      prompt: 'synthetic draft',
      policy: { mode: 'read-only' as const },
      workingDirectory: root,
      sessionKey: 'old-operation',
    };

    await expect(service.execute(configuration(root), request)).rejects.toMatchObject({
      code: 'provider',
    });
    vi.setSystemTime(Date.now() + 3600001);

    // act
    await service.execute(configuration(root), request);

    // assert
    expect(requests[1]?.args).not.toContain('resume');
  });

  it('drains a native browser login before logout and preserves existing native session files', async () => {
    // arrange
    const root = await fixture();
    const trace: string[] = [];
    const config = configuration(root);
    const history = join(config.root, 'execution', 'codex', 'sessions', 'existing-session');

    await mkdir(join(config.root, 'execution', 'codex', 'sessions'), { recursive: true });
    await writeFile(history, 'synthetic persisted session');

    const service = createService(root, async (request) => {
      if (request.args[0] === 'login' && request.args.length === 1) {
        trace.push('login-start');
        await request.onStdout?.('https://auth.openai.com/oauth/authorize?state=synthetic\n');
        await aborted(request.signal);
        trace.push('login-drained');
        request.signal?.throwIfAborted();
      }

      if (request.args[0] === 'logout') trace.push('logout');

      return result('', request.args[0] === 'login' && request.args[1] === 'status' ? 1 : 0);
    });

    // act
    const url = await service.startBrowserLogin(config, 'chatgpt-browser');

    await service.logout(config);

    // assert
    expect(url).toBe('https://auth.openai.com/oauth/authorize?state=synthetic');
    expect(trace).toEqual(['login-start', 'login-drained', 'logout']);
    expect(await readFile(history, 'utf8')).toBe('synthetic persisted session');
  });

  it('uses the native stdin credential flow and verifies status without exposing raw CLI messages', async () => {
    // arrange
    const root = await fixture();
    let authenticated = false;
    const inputs: string[] = [];
    const service = createService(root, async (request) => {
      if (request.args.includes('--with-api-key')) {
        inputs.push(request.input ?? '');
        authenticated = true;
      }

      if (request.args[0] === 'login' && request.args[1] === 'status')
        return result(authenticated ? 'Logged in using API key' : '', authenticated ? 0 : 1);

      return result();
    });

    // act
    await service.loginWithCredential(configuration(root), 'api-key', 'apiKey', 'SYNTHETIC-KEY');

    const status = await service.status(configuration(root));

    // assert
    expect(inputs).toEqual(['SYNTHETIC-KEY\n']);
    expect(status).toMatchObject({ authenticated: true, method: 'api-key' });
    expect(JSON.stringify(status)).not.toContain('SYNTHETIC-KEY');
  });

  it('discovers OpenCode metadata through read-only native commands without inference or login', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      return result(request.args.includes('models') ? 'vendor/model-a\nvendor/model-b\n' : '');
    });
    const config = { ...configuration(root), provider: 'opencode' as const };

    // act
    const snapshot = await service.inspect(config);

    // assert
    expect(snapshot.models?.map((model) => model.id)).toEqual(['vendor/model-a', 'vendor/model-b']);
    expect(requests.map((request) => request.args)).toEqual([
      ['--pure', 'auth', 'list'],
      ['--pure', 'models'],
    ]);
    expect(requests.every((request) => request.environment['HOME'] === config.root)).toBe(true);
  });

  it('drains and removes an explicit Claude environment credential before verifying logout', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);

      const authenticated = Boolean(request.environment['ANTHROPIC_API_KEY']);

      return result(
        JSON.stringify({ loggedIn: authenticated, authMethod: authenticated ? 'api_key' : null }),
      );
    });
    const connected = {
      ...configuration(root),
      provider: 'claude' as const,
      environment: { ANTHROPIC_API_KEY: 'SYNTHETIC-KEY' },
    };

    expect((await service.status(connected)).authenticated).toBe(true);

    const disconnected = { ...connected, environment: {} };

    // act
    await service.logout(disconnected);

    const status = await service.status(disconnected);

    // assert
    expect(status.authenticated).toBe(false);
    expect(requests.filter((request) => request.args.includes('logout'))).toHaveLength(1);
    expect(
      requests.slice(1).every((request) => request.environment['ANTHROPIC_API_KEY'] === undefined),
    ).toBe(true);
  });

  it('verifies a Claude subscription switch without the previous API credential or a second login', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const inputs: string[] = [];
    const submitted = deferred();
    let subscription = false;
    const service = createService(root, async (request) => {
      requests.push(request);

      if (request.args[1] === 'login') {
        request.onStart?.({
          write: (value) => {
            inputs.push(value);
            submitted.resolve();
          },
          end: () => undefined,
          stop: async () => submitted.resolve(),
        });
        await request.onStdout?.('https://claude.com/cai/oauth/authorize?state=synthetic\n');
        await submitted.promise;
        request.signal?.throwIfAborted();
        subscription = true;

        return result();
      }

      const apiKey = Boolean(request.environment['ANTHROPIC_API_KEY']);

      return result(
        JSON.stringify({
          loggedIn: apiKey || subscription,
          authMethod: apiKey ? 'api_key' : subscription ? 'claude.ai' : null,
        }),
      );
    });
    const connected = {
      ...configuration(root),
      provider: 'claude' as const,
      environment: { ANTHROPIC_API_KEY: 'SYNTHETIC-KEY' },
    };

    expect((await service.status(connected)).method).toBe('api-key');

    const subscriptionConfiguration = { ...connected, environment: {} };

    // act
    await service.startBrowserLogin(subscriptionConfiguration, 'subscription');

    const verified = service.waitForLogin(subscriptionConfiguration);

    await service.completeLogin(subscriptionConfiguration, 'authorizationCode', 'SYNTHETIC-CODE');

    const status = await verified;

    // assert
    expect(status).toMatchObject({ authenticated: true, method: 'subscription' });
    expect(inputs).toEqual(['SYNTHETIC-CODE\n']);
    expect(requests.filter((request) => request.args[1] === 'login')).toHaveLength(1);
    expect(
      requests.slice(1).every((request) => request.environment['ANTHROPIC_API_KEY'] === undefined),
    ).toBe(true);
    expect(JSON.stringify(status)).not.toContain('SYNTHETIC-CODE');
  });

  it('keeps the actual failed login result instead of blessing pre-existing native credentials', async () => {
    // arrange
    const root = await fixture();
    const finish = deferred();
    const service = createService(root, async (request) => {
      if (request.args[1] === 'login') {
        await request.onStdout?.('https://claude.com/cai/oauth/authorize?state=synthetic\n');
        await finish.promise;

        return result('', 1, 'Synthetic native login failure.');
      }

      return result(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' }));
    });
    const config = { ...configuration(root), provider: 'claude' as const };

    await service.startBrowserLogin(config, 'subscription');

    const initialObservation = service.waitForLogin(config);

    // act
    finish.resolve();

    // assert
    await expect(initialObservation).rejects.toMatchObject({ code: 'provider' });
    await expect(service.waitForLogin(config)).rejects.toMatchObject({ code: 'provider' });
    expect((await service.status(config)).authenticated).toBe(true);
  });

  it('rejects old references after credential changes and resumes full current-generation references after restart', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const run = async (request: IProcessRequest): Promise<IProcessResult> => {
      requests.push(request);

      if (request.args[0] === 'exec') return turn(request);

      return result('Logged in using API key');
    };
    const service = createService(root, run);
    const config = configuration(root);
    const request = {
      prompt: 'synthetic analysis',
      policy: { mode: 'read-only' as const },
      workingDirectory: root,
    };
    const previous = await service.execute(config, request);

    expect(previous.session).toBeDefined();

    // act
    await service.loginWithCredential(config, 'api-key', 'apiKey', 'SYNTHETIC-KEY');
    await expect(
      service.execute(config, {
        ...request,
        continuationReference: encodeSessionReference(previous.session!),
      }),
    ).rejects.toMatchObject({ code: 'session-unavailable' });
    await expect(
      service.execute(config, { ...request, continuationReference: previous.session?.nativeId }),
    ).rejects.toMatchObject({ code: 'session-unavailable' });

    const current = await service.execute(config, request);

    await service.dispose();

    const restarted = createService(root, run);
    const resumed = await restarted.execute(config, {
      ...request,
      continuationReference: encodeSessionReference(current.session!),
    });

    // assert
    expect(typeof current.session?.authenticationGeneration).toBe('string');
    expect(resumed.session?.authenticationGeneration).toBe(
      current.session?.authenticationGeneration,
    );

    const executions = requests.filter((request) => request.args[0] === 'exec');

    expect(executions).toHaveLength(3);
    expect(executions[2]?.args).toContain('resume');
    expect(executions[2]?.args).toContain('native-session');
  });

  it('invalidates prior OpenCode sessions before an explicit credential import', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const service = createService(root, async (request) => {
      requests.push(request);
      await request.onStdout?.(
        `${JSON.stringify({ type: 'text', sessionID: 'native-session', part: { text: 'Synthetic OpenCode result' } })}\n`,
      );

      return result();
    });
    const config = { ...configuration(root), provider: 'opencode' as const };
    const request = {
      prompt: 'synthetic input',
      policy: { mode: 'read-only' as const },
      workingDirectory: root,
    };
    const first = await service.execute(config, request);
    const source = join(root, 'explicit-auth-import.json');

    await writeFile(source, JSON.stringify({ vendor: { type: 'api', key: 'SYNTHETIC-TOKEN' } }));

    // act
    await service.importOpenCodeCredentials(config, source);

    const resumed = service.execute(config, {
      ...request,
      continuationReference: encodeSessionReference(first.session!),
    });

    // assert
    await expect(resumed).rejects.toMatchObject({ code: 'session-unavailable' });
    expect(requests).toHaveLength(1);
    expect(
      await readFile(join(config.root, '.local', 'share', 'opencode', 'auth.json'), 'utf8'),
    ).toContain('SYNTHETIC-TOKEN');
  });

  it('rejects a persisted Claude continuation when an explicit credential binding changes across restart', async () => {
    // arrange
    const root = await fixture();
    const requests: IProcessRequest[] = [];
    const run = async (request: IProcessRequest): Promise<IProcessResult> => {
      requests.push(request);
      await request.onStdout?.(
        `${JSON.stringify({ type: 'result', subtype: 'success', session_id: 'native-session', is_error: false, result: 'Synthetic Claude result' })}\n`,
      );

      return result();
    };
    const service = createService(root, run);
    const previousConfiguration = {
      ...configuration(root),
      provider: 'claude' as const,
      environment: { ANTHROPIC_API_KEY: 'SYNTHETIC-OLD-KEY' },
    };
    const request = {
      prompt: 'synthetic analysis',
      policy: { mode: 'read-only' as const },
      workingDirectory: root,
    };
    const previous = await service.execute(previousConfiguration, request);

    await service.dispose();

    const restarted = createService(root, run);
    const nextConfiguration = {
      ...previousConfiguration,
      environment: { ANTHROPIC_API_KEY: 'SYNTHETIC-NEW-KEY' },
    };

    // act
    const resumed = restarted.execute(nextConfiguration, {
      ...request,
      continuationReference: encodeSessionReference(previous.session!),
    });

    // assert
    await expect(resumed).rejects.toMatchObject({ code: 'session-unavailable' });
    expect(requests).toHaveLength(1);

    const marker = await readFile(
      join(previousConfiguration.root, '.synapse-session-generation.json'),
      'utf8',
    );

    expect(marker).not.toContain('SYNTHETIC-OLD-KEY');
    expect(marker).not.toContain('SYNTHETIC-NEW-KEY');
  });
});

async function fixture(): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'symphony-synapse-')));

  roots.push(root);

  return root;
}

function createService(
  root: string,
  run: (request: IProcessRequest) => Promise<IProcessResult>,
  dispose: () => Promise<void> = async () => undefined,
): SynapseAiService {
  const runner: ProcessRunnerBase = { run, dispose };
  const service = new SynapseAiService({ profileStoreRoot: join(root, 'profiles'), runner });

  services.push(service);

  return service;
}

function configuration(root: string): ISynapseAiInstanceConfiguration {
  return {
    id: 'same-legacy-connection',
    workspaceId: 'workspace',
    provider: 'codex',
    root: join(root, 'existing-account'),
  };
}

async function turn(request: IProcessRequest): Promise<IProcessResult> {
  const frames = [
    { type: 'thread.started', thread_id: 'native-session' },
    { type: 'item.completed', item: { type: 'agent_message', text: 'Synthetic native result' } },
    {
      type: 'turn.completed',
      usage: { input_tokens: 3, output_tokens: 4, cached_input_tokens: 1 },
    },
  ];

  for (const frame of frames) await request.onStdout?.(`${JSON.stringify(frame)}\n`);

  return result();
}

function result(stdout = '', exitCode = 0, stderr = ''): IProcessResult {
  return { stdout, stderr, exitCode, signal: null };
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });

  return { promise, resolve };
}

async function aborted(signal?: AbortSignal): Promise<void> {
  if (!signal || signal.aborted) return;

  await new Promise<void>((resolve) =>
    signal.addEventListener('abort', () => resolve(), { once: true }),
  );
}

async function ownedTemporaries(root: string, output: Set<string>): Promise<void> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = join(root, entry.name);

    if (entry.isDirectory()) await ownedTemporaries(file, output);
    else if (entry.name === '.synapse-profile.json') {
      const marker: unknown = JSON.parse(await readFile(file, 'utf8'));

      if (
        marker &&
        typeof marker === 'object' &&
        'paths' in marker &&
        marker.paths &&
        typeof marker.paths === 'object' &&
        'temporary' in marker.paths &&
        typeof marker.paths.temporary === 'string' &&
        /^synapse-[a-f0-9]{24}$/u.test(basename(marker.paths.temporary))
      )
        output.add(marker.paths.temporary);
    }
  }
}
