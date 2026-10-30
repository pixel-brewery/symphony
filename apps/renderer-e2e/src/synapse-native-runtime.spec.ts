// #region Imports

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { delimiter, resolve, sep } from 'node:path';
import { expect, test, _electron as electron, type ElectronApplication } from '@playwright/test';
import { parseSessionReference } from '@pixel-brewery/synapse-core';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import { installAgentRuntimeFixtures } from './installAgentRuntimeFixtures';
import { prepareMainWindow } from './prepareMainWindow';

// #endregion

interface INativeCliInvocation {
  readonly type: 'exec' | 'stopped' | 'unexpected-command';
  readonly pid: number;
  readonly phase?: 'analysis' | 'implementation' | 'issue';
  readonly args?: readonly string[];
  readonly prompt?: string;
  readonly resumedSession?: string;
  readonly sessionId?: string;
  readonly workingDirectory?: string;
  readonly home?: string;
  readonly codexHome?: string;
  readonly sqliteHome?: string;
  readonly schema?: { readonly required: readonly string[] };
}

function nativeInvocations(logPath: string): readonly INativeCliInvocation[] {
  if (!existsSync(logPath)) return [];

  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as INativeCliInvocation);
}

test('executes native analysis, durable resume, implementation and a structured issue through Synapse', async () => {
  // arrange: reuse the real Electron/typed-IPC setup path from orbit-redesign and execution-queue.
  const testInfo = test.info();
  const configurationRoot = resolve('output/playwright', `synapse-native-runtime-${process.pid}`);
  const repositoryPath = resolve(configurationRoot, 'fixture-repository');
  const logPath = resolve(configurationRoot, 'native-invocations.jsonl');
  rmSync(configurationRoot, { recursive: true, force: true });
  mkdirSync(repositoryPath, { recursive: true });
  const executableDirectory = installAgentRuntimeFixtures(
    resolve(configurationRoot, 'native-cli'),
    { nativeExecutionLog: logPath },
  );
  const launchOptions = {
    args: ['.', `--user-data-dir=${resolve(configurationRoot, 'electron')}`],
    cwd: resolve('.'),
    env: {
      ...process.env,
      PATH: `${executableDirectory}${delimiter}${process.env['PATH'] ?? ''}`,
      SYMPHONY_CONFIG_ROOT: configurationRoot,
      SYMPHONY_DATABASE_PATH: resolve(configurationRoot, 'state.sqlite'),
      SYMPHONY_USER_SKILLS_PATH: resolve(configurationRoot, 'skills'),
      SYMPHONY_LEGACY_SKILLS_PATH: resolve(configurationRoot, 'legacy-skills'),
      SYMPHONY_TRACKER_MODE: 'simulated',
      SYMPHONY_CONNECTION_MODE: 'simulated',
      SYMPHONY_EXTERNAL_LINKS_MODE: 'blocked',
      SYMPHONY_WORKSPACE_MODE: 'simulated',
      // Only tracker/SCM fixtures are simulated. All AI calls use the production Synapse composition.
      SYMPHONY_AGENT_MODE: 'native',
    },
  };
  let app: ElectronApplication | undefined = await electron.launch(launchOptions);

  try {
    let page = await prepareMainWindow(app);
    const rendererErrors: string[] = [];
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    const selected = await page.evaluate(
      async ({ localPath, managedRoot }) => {
        const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
        const settings = await api.request('settings.get', {});
        const workspaceId = settings.workspaces[0]!.id;
        const account = settings.connections.find(
          (connection) => connection.workspaceId === workspaceId && connection.kind === 'codex',
        );
        const employee = settings.agentProfiles.find((agent) => agent.workspaceId === workspaceId);
        const team = settings.agentTeams.find((candidate) => candidate.workspaceId === workspaceId);
        const route = settings.agentRoutePolicies.find(
          (candidate) => candidate.id === employee?.routePolicyId,
        );
        const candidate = route?.candidates.find((entry) => entry.aiConnectionId === account?.id);
        if (!account || account.kind !== 'codex' || !employee || !team || !route || !candidate)
          throw new Error('The default workspace has no native Codex route for this fixture.');

        const analysisSkill = await api.request('skills.save', {
          skill: {
            name: 'native-runtime-analysis',
            description: 'Exercise native analysis and durable continuation.',
            instructions:
              'Analyze the controlled fixture and return the required readiness report.',
            openaiYaml: '',
            files: [],
          },
        });
        const solutionSkill = await api.request('skills.save', {
          skill: {
            name: 'native-runtime-solution',
            description: 'Exercise native implementation inside its prepared workspace.',
            instructions: 'Implement the controlled fixture and return the required report.',
            openaiYaml: '',
            files: [],
          },
        });
        const creator = await api.request('skills.save', {
          skill: {
            name: 'native-runtime-issue-creator',
            description: 'Exercise native structured work item drafting.',
            instructions:
              'Draft the controlled work item using the required schema and provider field identities.',
            openaiYaml: '',
            files: [],
          },
        });

        const github = {
          id: 'native-runtime-github',
          workspaceId,
          kind: 'github' as const,
          displayName: 'Native runtime fixture tracker',
          hostname: 'github.com',
          gitProtocol: 'https' as const,
        };
        const repository = {
          id: 'native-runtime-repository',
          workspaceId,
          sourceControlConnectionId: github.id,
          provider: 'github' as const,
          displayName: 'example/platform',
          host: 'github.com',
          owner: 'example',
          name: 'platform',
          defaultBranch: 'main',
          localPath,
          enabled: true,
        };
        await api.request('settings.save', {
          settings: {
            ...settings,
            runtime: {
              ...settings.runtime,
              workspaceRoot: managedRoot,
              maxParallelExecutions: 1,
              automaticExecutionEnabled: false,
              autonomousExecutionEnabled: false,
              maximumVerificationRepairAttempts: 0,
            },
            connections: [
              ...settings.connections.map((connection) =>
                connection.id === account.id && connection.kind === 'codex'
                  ? {
                      ...connection,
                      credentialSource: 'isolated' as const,
                      credentialRef: undefined,
                    }
                  : connection,
              ),
              github,
            ],
            repositoryBindings: [repository],
            deliveryContexts: [
              {
                id: 'native-runtime-context',
                workspaceId,
                displayName: 'Native runtime fixture',
                workItemSourceIds: settings.workItemSources
                  .filter((source) => source.workspaceId === workspaceId)
                  .map((source) => source.id),
                repositoryBindingIds: [repository.id],
                ciBindingIds: [],
                agentTeamId: team.id,
                defaultRepositoryBindingId: repository.id,
                enabled: true,
              },
            ],
            agentRoutePolicies: settings.agentRoutePolicies.map((policy) =>
              policy.id === route.id
                ? {
                    ...policy,
                    sessionAffinity: true,
                    maxParallelExecutions: 1,
                    candidates: [
                      { ...candidate, model: null, reasoningEffort: null, enabled: true },
                    ],
                  }
                : policy,
            ),
            agentTeams: settings.agentTeams.map((candidateTeam) =>
              candidateTeam.id === team.id
                ? {
                    ...candidateTeam,
                    assignments: candidateTeam.assignments.map((assignment) => ({
                      ...assignment,
                      primaryAgentId: employee.id,
                      fallbackAgentIds: [],
                      skillId:
                        assignment.role === 'analysis'
                          ? analysisSkill.id
                          : assignment.role === 'solution'
                            ? solutionSkill.id
                            : assignment.role === 'work-item-creation'
                              ? creator.id
                              : assignment.skillId,
                    })),
                  }
                : candidateTeam,
            ),
          },
        });
        await api.request('repositories.prepare', { repositoryBindingId: repository.id });
        const snapshot = await api.request('snapshot.refresh', {});
        // The in-memory tracker seeds this item as qualified again after Electron restarts.
        const workItem = snapshot.workItems.find(
          (item) => item.externalId === '#138' && item.stageId === 'qualified',
        );
        if (!workItem) throw new Error('The controlled tracker work item is unavailable.');
        return {
          workItemId: workItem.id,
          workspaceId,
          accountId: account.id,
          candidateId: candidate.id,
        };
      },
      { localPath: repositoryPath, managedRoot: resolve(configurationRoot, 'managed-workspaces') },
    );

    // act: start the real native operation and pause only after its session reaches durable state.
    const admission = await page.evaluate(async (workItemId) => {
      const api = (window as unknown as { orchestration: IOrchestrationApi }).orchestration;
      return api.request('analyzer.start', {
        workItemId,
        simulateFailure: false,
        executionApproval: 'once',
      });
    }, selected.workItemId);
    expect(admission.outcome).toBe('started');
    if (admission.outcome !== 'started') throw new Error('The native analysis was queued.');
    const executionId = admission.execution.id;
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const snapshot = await (
            window as unknown as { orchestration: IOrchestrationApi }
          ).orchestration.request('snapshot.get', {});
          const execution = snapshot.executions.find((entry) => entry.id === id);
          return execution?.state === 'running' && Boolean(execution.continuationReference);
        }, executionId),
      )
      .toBe(true);
    const paused = await page.evaluate(
      async (id) =>
        (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'execution.pause',
          { executionId: id },
        ),
      executionId,
    );

    // assert the critical migration seam before restarting the real application.
    expect(paused).toMatchObject({ state: 'waiting', pause: { reason: 'operator' } });
    const reference = parseSessionReference(paused.continuationReference!);
    expect(reference).toMatchObject({
      driverId: 'codex',
      candidateId: selected.candidateId,
      nativeId: 'native-fixture-analysis-session',
    });
    expect(reference?.authenticationGeneration).toBeDefined();
    await expect
      .poll(() => nativeInvocations(logPath).some((entry) => entry.type === 'stopped'))
      .toBe(true);
    await app.close();
    app = undefined;

    // act: resume through persisted Symphony state, not a direct library/test-only execution path.
    app = await electron.launch(launchOptions);
    page = await prepareMainWindow(app);
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    const restored = await page.evaluate(async (id) => {
      const snapshot = await (
        window as unknown as { orchestration: IOrchestrationApi }
      ).orchestration.request('snapshot.get', {});
      return snapshot.executions.find((entry) => entry.id === id);
    }, executionId);
    expect(restored?.continuationReference).toBe(paused.continuationReference);
    expect(restored?.pause?.reason).toBe('operator');
    await page.evaluate(
      async (id) =>
        (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'execution.resume',
          { executionId: id },
        ),
      executionId,
    );
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const snapshot = await (
            window as unknown as { orchestration: IOrchestrationApi }
          ).orchestration.request('snapshot.get', {});
          return snapshot.executions.find((entry) => entry.id === id)?.state;
        }, executionId),
      )
      .toBe('succeeded');
    const analysis = await page.evaluate(async (id) => {
      const snapshot = await (
        window as unknown as { orchestration: IOrchestrationApi }
      ).orchestration.request('snapshot.get', {});
      return snapshot.executions.find((entry) => entry.id === id);
    }, executionId);
    expect(analysis?.summary).toContain('Native fixture analysis complete.');
    expect(analysis?.bindingSnapshot?.aiConnectionId).toBe(selected.accountId);
    expect(analysis?.bindingSnapshot?.agentRouteCandidateId).toBe(selected.candidateId);
    expect(analysis?.tokenUsage).toEqual({ input: 11, cachedInput: 2, output: 7, total: 18 });
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const snapshot = await (
            window as unknown as { orchestration: IOrchestrationApi }
          ).orchestration.request('snapshot.get', {});
          return snapshot.workItems.find((entry) => entry.id === id)?.stageId;
        }, selected.workItemId),
      )
      .toBe('ready');

    const solutionAdmission = await page.evaluate(
      async (workItemId) =>
        (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'solver.start',
          { workItemId, simulateFailure: false, executionApproval: 'once' },
        ),
      selected.workItemId,
    );
    expect(solutionAdmission.outcome).toBe('started');
    if (solutionAdmission.outcome !== 'started')
      throw new Error('The native implementation was queued.');
    const solutionId = solutionAdmission.execution.id;
    await expect
      .poll(() =>
        page.evaluate(async (id) => {
          const snapshot = await (
            window as unknown as { orchestration: IOrchestrationApi }
          ).orchestration.request('snapshot.get', {});
          return snapshot.executions.find((entry) => entry.id === id)?.state;
        }, solutionId),
      )
      .toBe('succeeded');
    const solution = await page.evaluate(async (id) => {
      const snapshot = await (
        window as unknown as { orchestration: IOrchestrationApi }
      ).orchestration.request('snapshot.get', {});
      return snapshot.executions.find((entry) => entry.id === id);
    }, solutionId);
    expect(solution?.summary).toContain('Native fixture implementation complete.');
    expect(solution?.bindingSnapshot?.aiConnectionId).toBe(selected.accountId);
    expect(solution?.bindingSnapshot?.agentRouteCandidateId).toBe(selected.candidateId);
    expect(readFileSync(resolve(solution!.workspacePath!, 'src/simulated-change.ts'), 'utf8')).toBe(
      'export const nativeFixture = true;\n',
    );

    const draft = await page.evaluate(
      async ({ workspaceId }) =>
        (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'work-items.draft',
          {
            operationId: 'native-runtime-draft',
            workspaceId,
            repository: 'example/platform',
            prompt: 'Draft a controlled native protocol acceptance work item.',
          },
        ),
      selected,
    );

    // assert: the final native schema, sandbox, cwd, profile and resume facts are externally observable.
    expect(draft.title).toBe('Native fixture issue draft');
    expect(draft.body).toContain('real native structured-result boundary');
    const metadata = await page.evaluate(
      async ({ workspaceId }) =>
        (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
          'work-items.metadata',
          { workspaceId, repository: 'example/platform' },
        ),
      selected,
    );
    expect(draft.projectFields.map((field) => field.fieldId).sort()).toEqual(
      metadata.projectFields.map((field) => field.id).sort(),
    );
    const invocations = nativeInvocations(logPath);
    const executions = invocations.filter((entry) => entry.type === 'exec');
    expect(executions.map((entry) => entry.phase)).toEqual([
      'analysis',
      'analysis',
      'implementation',
      'issue',
    ]);
    expect(invocations.filter((entry) => entry.type === 'unexpected-command')).toEqual([]);
    expect(executions[1]?.resumedSession).toBe('native-fixture-analysis-session');
    expect(executions[1]?.pid).not.toBe(executions[0]?.pid);
    expect(executions[1]?.workingDirectory).toBe(executions[0]?.workingDirectory);
    expect(executions[2]?.workingDirectory).not.toBe(executions[0]?.workingDirectory);
    expect(executions[3]?.workingDirectory).toBe(repositoryPath);
    expect(executions[3]?.schema?.required).toEqual(
      expect.arrayContaining(['title', 'body', 'projectFields', 'labels', 'assignees']),
    );
    for (const invocation of executions) {
      expect(invocation.args?.at(-1)).toBe('-');
      expect(invocation.args).not.toContain(invocation.prompt);
      expect(invocation.args).toContain(
        invocation.phase === 'implementation'
          ? 'sandbox_mode="workspace-write"'
          : 'sandbox_mode="read-only"',
      );
      for (const directory of [
        invocation.workingDirectory,
        invocation.home,
        invocation.codexHome,
        invocation.sqliteHome,
      ]) {
        expect(directory).toBeDefined();
        expect(resolve(directory!).startsWith(configurationRoot + sep)).toBe(true);
      }
    }
    expect(rendererErrors).toEqual([]);
    await testInfo.attach('native-synapse-execution-evidence', {
      body: JSON.stringify({ selected, analysis, solution, draft, invocations }, null, 2),
      contentType: 'application/json',
    });
  } finally {
    if (app) {
      const window = app.windows().find((candidate) => !candidate.url().includes('/menu-bar'));
      await window
        ?.evaluate(async () => {
          await (window as unknown as { orchestration: IOrchestrationApi }).orchestration.request(
            'lifecycle.active-operations.cancel',
            {},
          );
        })
        .catch(() => undefined);
      await app.close();
    }
    if (existsSync(logPath))
      await testInfo.attach('native-cli-trace', {
        path: logPath,
        contentType: 'application/x-ndjson',
      });
  }
});
