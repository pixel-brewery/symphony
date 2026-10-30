// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IAgentRouteTelemetry } from '@symphony/domain-ai';
import type { IAgentRouteTelemetryRepository } from '@symphony/application-ai';
import type { IAgentRuntimePort } from '@symphony/application-execution';
import type { IIssueDraftingPort } from '@symphony/application-work';
import type { SkillFlowRole, ISkillPackageDocument } from '@symphony/domain-skills';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IExecutionContext } from '@symphony/application-execution';
import { AgentAccountCapacityError } from '@symphony/providers-synapse';
import { AgentAccountCoolingDownError } from '@symphony/providers-synapse';
import { AgentAccountCooldowns } from '@symphony/providers-synapse';
import { AgentModelUnavailableError } from '@symphony/providers-synapse';
import { AgentRouteGovernor } from '@symphony/providers-synapse';
import { AgentRoutesCoolingDownError } from '@symphony/providers-synapse';
import { WorkspaceAgentRuntime } from './WorkspaceAgentRuntime';
import { AiError } from '@pixel-brewery/synapse-core';

// #endregion

describe('WorkspaceAgentRuntime', () => {
  it('keeps other signed-in accounts eligible after repeated authentication failures', async () => {
    // arrange
    const unavailable = vi.fn(async () => {
      throw new AiError('auth-required', 'Sign-in required.');
    });
    const healthy = vi.fn(async () => 'healthy account result');
    const first = target(adapter({ analyze: unavailable }), 'primary');
    const second = target(adapter({ analyze: healthy }), 'backup');
    let eligible = [{ ...first, routing: { ...first.routing, providerId: 'codex' } }];
    const runtime = new WorkspaceAgentRuntime({ targets: () => eligible });

    // act
    for (let index = 0; index < 2; index++) {
      await expect(
        runtime.analyze(
          context('analysis'),
          skill(),
          undefined,
          async () => undefined,
          false,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code: 'auth-required' });
    }

    eligible = [{ ...second, routing: { ...second.routing, providerId: 'codex' } }];

    const result = await runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    expect(result).toBe('healthy account result');
    expect(unavailable).toHaveBeenCalledTimes(2);
    expect(healthy).toHaveBeenCalledOnce();
  });

  it('does not replay a writing operation on a backup route after execution starts', async () => {
    // arrange
    const primary = vi.fn(async () => {
      throw new Error('Implementation interrupted.');
    });
    const backup = vi.fn(async () => 'duplicate implementation');
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [
        target(adapter({ solve: primary }), 'primary'),
        target(adapter({ solve: backup }), 'backup'),
      ],
    });

    // act
    // assert
    await expect(
      runtime.solve(
        context('solution'),
        skill(),
        'approved analysis',
        undefined,
        async () => undefined,
        false,
        new AbortController().signal,
      ),
    ).rejects.toThrow('Implementation interrupted.');
    expect(primary).toHaveBeenCalledOnce();
    expect(backup).not.toHaveBeenCalled();
  });

  it('does not fail over or mark the provider unhealthy after native progress persistence fails', async () => {
    // arrange
    const telemetry = new MemoryTelemetryRepository();
    const primary = vi.fn<IAgentRuntimePort['analyze']>(
      async (_context, _skill, _request, report) => {
        await report({ message: 'native event' });

        return 'unreachable';
      },
    );
    const backup = vi.fn(async () => 'duplicate analysis');
    const primaryTarget = target(adapter({ analyze: primary }), 'primary');
    const governor = new AgentRouteGovernor(telemetry);
    const runtime = new WorkspaceAgentRuntime({
      governor,
      targets: () => [primaryTarget, target(adapter({ analyze: backup }), 'backup')],
    });

    // act
    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async (progress) => {
          if (progress.message === 'native event') throw new Error('host storage failed');
        },
        false,
        new AbortController().signal,
      ),
    ).rejects.toThrow('Unable to persist AI route progress.');
    expect(primary).toHaveBeenCalledOnce();
    expect(backup).not.toHaveBeenCalled();
    expect(
      telemetry.load(primaryTarget.routing.workspaceId, primaryTarget.routing.routeCandidateId),
    ).toMatchObject({ failureCount: 0 });
  });

  it('does not replay nonretryable typed result or host failures on another provider', async () => {
    // arrange
    const primary = vi.fn(async () => {
      throw new AiError('result-validation', 'Invalid structured result.');
    });
    const backup = vi.fn(async () => 'duplicate analysis');
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [
        target(adapter({ analyze: primary }), 'primary'),
        target(adapter({ analyze: backup }), 'backup'),
      ],
    });

    // act
    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async () => undefined,
        false,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'result-validation' });
    expect(backup).not.toHaveBeenCalled();
  });

  it('selects the runtime from the exact delivery role carried by the skill manifest', async () => {
    // arrange
    const selectedRoles: SkillFlowRole[] = [];
    const adapter: IAgentRuntimePort & IIssueDraftingPort = {
      async analyze() {
        return 'analyzed';
      },
      async solve() {
        return 'solved';
      },
      async draftIssue() {
        throw new Error('Issue drafting is not used in this test.');
      },
    };
    const runtime = new WorkspaceAgentRuntime({
      targets: (role) => {
        selectedRoles.push(role);

        return [target(adapter, 'primary')];
      },
    });
    const controller = new AbortController();

    await runtime.analyze(
      context('ci-diagnosis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      controller.signal,
    );

    // act
    await runtime.solve(
      context('ci-repair'),
      skill(),
      'analysis',
      undefined,
      async () => undefined,
      false,
      controller.signal,
    );

    // assert
    expect(selectedRoles).toEqual(['ci-diagnosis', 'ci-repair']);
  });

  it('continues with the next provider route without leaking an unbound continuation', async () => {
    // arrange
    const attemptedContinuations: Array<string | undefined> = [];
    const progress: string[] = [];
    const failing = adapter({
      analyze(context) {
        attemptedContinuations.push(context.continuationReference);

        throw new Error('Provider unavailable.');
      },
    });
    const succeeding = adapter({
      analyze(context) {
        attemptedContinuations.push(context.continuationReference);

        return Promise.resolve('fallback analysis');
      },
    });
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [target(failing, 'primary'), target(succeeding, 'fallback')],
    });

    // act
    const executionContext = {
      ...context('analysis'),
      continuationReference: 'provider-specific-session',
    };

    // assert
    await expect(
      runtime.analyze(
        executionContext,
        skill(),
        undefined,
        async (event) => {
          progress.push(event.message);
        },
        false,
        new AbortController().signal,
      ),
    ).resolves.toBe('fallback analysis');

    expect(attemptedContinuations).toEqual([undefined, undefined]);
    expect(progress[0]).toContain('Assigned to primary.');
    expect(progress[0]).toContain('quality 50/100');
    expect(progress[1]).toContain('The previous route failed. Continuing with fallback.');
  });

  it('attributes every run-stream event to the route that actually produced it', async () => {
    // arrange
    const actors: Array<string | undefined> = [];
    const failing = adapter({
      analyze() {
        throw new Error('Provider unavailable.');
      },
    });
    const succeeding = adapter({
      async analyze(_context, _skill, _request, onProgress) {
        await onProgress({ category: 'message', message: 'Inspected the renderer contract.' });

        return 'fallback analysis';
      },
    });

    // act
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [target(failing, 'primary'), target(succeeding, 'fallback')],
    });

    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async (event) => {
          actors.push(event.actor);
        },
        false,
        new AbortController().signal,
      ),
    ).resolves.toBe('fallback analysis');

    expect(actors).toEqual(['runtime-primary', 'runtime-fallback', 'runtime-fallback']);
  });

  it('resumes the exact session-affine route instead of leaking its continuation to the primary route', async () => {
    // act
    // arrange
    const primary = vi.fn(async () => 'primary analysis');

    // assert
    const fallback = vi.fn(async (executionContext: IExecutionContext) => {
      expect(executionContext.continuationReference).toBe('fallback-session');

      return 'continued fallback analysis';
    });
    const primaryTarget = target(adapter({ analyze: primary }), 'primary');
    const fallbackTarget = target(adapter({ analyze: fallback }), 'fallback');
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [primaryTarget, fallbackTarget],
    });
    const executionContext: IExecutionContext = {
      ...context('analysis'),
      continuationReference: 'fallback-session',
      executionBinding: {
        workspaceId: 'personal',
        deliveryContextId: 'delivery',
        workItemSourceId: 'source',
        workTrackingConnectionId: 'tracker',
        repositoryBindingIds: [],
        sourceControlConnectionIds: [],
        ciBindingIds: [],
        skillFlowRole: 'analysis',
        ...fallbackTarget.executionBinding,
      },
    };

    await expect(
      runtime.analyze(
        executionContext,
        skill(),
        undefined,
        async () => undefined,
        false,
        new AbortController().signal,
      ),
    ).resolves.toBe('continued fallback analysis');
    expect(fallback).toHaveBeenCalledOnce();
    expect(primary).not.toHaveBeenCalled();
  });

  it('feeds failures back into the circuit breaker before the next execution', async () => {
    // arrange
    const primary = vi.fn(async () => {
      throw new Error('Primary unavailable.');
    });
    const fallback = vi.fn(async () => 'fallback analysis');

    // act
    const runtime = new WorkspaceAgentRuntime({
      governor: new AgentRouteGovernor(new MemoryTelemetryRepository(), {
        failureThreshold: 2,
        cooldownMilliseconds: 60_000,
      }),
      targets: () => [
        target(adapter({ analyze: primary }), 'primary'),
        target(adapter({ analyze: fallback }), 'fallback'),
      ],
    });

    // assert
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        runtime.analyze(
          context('analysis'),
          skill(),
          undefined,
          async () => undefined,
          false,
          new AbortController().signal,
        ),
      ).resolves.toBe('fallback analysis');
    }

    expect(primary).toHaveBeenCalledTimes(2);
    expect(fallback).toHaveBeenCalledTimes(3);
  });

  it('queues executions at the route-policy limit and starts the next after release', async () => {
    // arrange
    const completions: Array<(value: string) => void> = [];
    const analyze = vi.fn(() => new Promise<string>((resolve) => completions.push(resolve)));
    const route = target(adapter({ analyze }), 'primary', 1);
    const runtime = new WorkspaceAgentRuntime({ targets: () => [route] });
    const secondProgress: string[] = [];

    // act
    const first = runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    await vi.waitFor(() => expect(analyze).toHaveBeenCalledTimes(1));

    const second = runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async (progress) => {
        secondProgress.push(progress.message);
      },
      false,
      new AbortController().signal,
    );

    await vi.waitFor(() => expect(secondProgress).toContain('Waiting for capacity on primary.'));
    expect(analyze).toHaveBeenCalledTimes(1);
    completions.shift()?.('first');
    await expect(first).resolves.toBe('first');
    await vi.waitFor(() => expect(analyze).toHaveBeenCalledTimes(2));
    completions.shift()?.('second');
    await expect(second).resolves.toBe('second');
  });

  it('rechecks the circuit after queue admission and skips a route opened while waiting', async () => {
    // arrange
    let rejectActive: ((cause: Error) => void) | undefined;
    const analyze = vi.fn(() => new Promise<string>((_resolve, reject) => (rejectActive = reject)));
    const route = target(adapter({ analyze }), 'primary', 1);
    const runtime = new WorkspaceAgentRuntime({
      governor: new AgentRouteGovernor(undefined, {
        failureThreshold: 1,
        cooldownMilliseconds: 60_000,
      }),
      targets: () => [route],
    });

    // act
    const first = runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    await vi.waitFor(() => expect(analyze).toHaveBeenCalledOnce());

    const second = runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      new AbortController().signal,
    );

    rejectActive?.(new Error('Provider unavailable.'));
    await expect(first).rejects.toThrow('Provider unavailable.');
    await expect(second).rejects.toBeInstanceOf(AgentRoutesCoolingDownError);
    expect(analyze).toHaveBeenCalledOnce();
  });

  it('locks out a runtime-proven unavailable model without counting a provider attempt', async () => {
    // arrange
    const primary = vi.fn(async () => 'unexpected primary');
    const fallback = vi.fn(async () => 'fallback analysis');
    const unavailable = {
      ...target(adapter({ analyze: primary }), 'primary', 1, 'missing/model'),
      inspectModelAvailability: vi.fn(async () => ({
        state: 'unavailable' as const,
        reason: 'The connected account does not offer this model.',
      })),
    };
    const available = {
      ...target(adapter({ analyze: fallback }), 'fallback', 1, 'free/coder'),
      inspectModelAvailability: vi.fn(async () => ({ state: 'available' as const })),
    };
    const progress: string[] = [];

    // act
    const runtime = new WorkspaceAgentRuntime({ targets: () => [unavailable, available] });

    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async (event) => {
          progress.push(event.message);
        },
        false,
        new AbortController().signal,
      ),
    ).resolves.toBe('fallback analysis');
    expect(primary).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledOnce();
    expect(progress[0]).toContain('cannot use configured model missing/model');
    expect(progress[1]).toContain('Assigned to fallback.');
  });

  it('fails open when a runtime model list cannot be inspected', async () => {
    // arrange
    const analyze = vi.fn(async () => 'analysis');
    const route = {
      ...target(adapter({ analyze }), 'primary', 1, 'provider/model'),
      inspectModelAvailability: vi.fn(async () => {
        throw new Error('Runtime model list unavailable.');
      }),
    };

    // act
    const runtime = new WorkspaceAgentRuntime({ targets: () => [route] });

    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async () => undefined,
        false,
        new AbortController().signal,
      ),
    ).resolves.toBe('analysis');
    expect(analyze).toHaveBeenCalledOnce();
  });

  it('reports the last runtime lockout when every configured route model is unavailable', async () => {
    // arrange
    const analyze = vi.fn(async () => 'unexpected');
    const route = {
      ...target(adapter({ analyze }), 'primary', 1, 'missing/model'),
      inspectModelAvailability: vi.fn(async () => ({ state: 'unavailable' as const })),
    };

    // act
    const runtime = new WorkspaceAgentRuntime({ targets: () => [route] });

    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async () => undefined,
        false,
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(AgentModelUnavailableError);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('cools down every sibling route using an exhausted account and fails over to another account', async () => {
    // arrange
    const exhausted = vi.fn(async () => {
      throw new AgentAccountCapacityError('Account usage quota exhausted. Retry after 1 hour.', {
        reason: 'quota-exhausted',
        retryAt: '2099-08-17T10:00:00.000Z',
      });
    });
    const sibling = vi.fn(async () => 'unexpected sibling');
    const fallback = vi.fn(async () => 'fallback analysis');
    const sharedAccount = 'shared-free-account';
    const primaryTarget = withAccount(
      target(adapter({ analyze: exhausted }), 'primary'),
      sharedAccount,
    );
    const siblingTarget = withAccount(
      target(adapter({ analyze: sibling }), 'sibling'),
      sharedAccount,
    );
    const fallbackTarget = target(adapter({ analyze: fallback }), 'fallback');
    const progress: string[] = [];

    // act
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [primaryTarget, siblingTarget, fallbackTarget],
    });

    // assert
    for (let execution = 0; execution < 2; execution += 1) {
      await expect(
        runtime.analyze(
          context('analysis'),
          skill(),
          undefined,
          async (event) => {
            progress.push(event.message);
          },
          false,
          new AbortController().signal,
        ),
      ).resolves.toBe('fallback analysis');
    }

    expect(exhausted).toHaveBeenCalledOnce();
    expect(sibling).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(2);
    expect(progress.some((message) => message.includes('sibling is unavailable'))).toBe(true);
    expect(progress.some((message) => message.includes('primary is unavailable'))).toBe(true);
  });

  it('waits for the earliest account recovery when every eligible account is cooling down', async () => {
    // arrange
    const cooldowns = new AgentAccountCooldowns(undefined, {
      now: () => new Date('2026-08-16T10:00:00.000Z'),
    });
    const accountA = withAccount(target(adapter(), 'primary'), 'account-a');
    const accountB = withAccount(target(adapter(), 'fallback'), 'account-b');

    cooldowns.recordFailure(
      {
        workspaceId: 'personal',
        aiConnectionId: 'account-a',
        label: 'primary',
      },
      new AgentAccountCapacityError('Quota exhausted.', {
        reason: 'quota-exhausted',
        retryAt: '2026-08-17T11:00:00.000Z',
      }),
    );
    cooldowns.recordFailure(
      {
        workspaceId: 'personal',
        aiConnectionId: 'account-b',
        label: 'fallback',
      },
      new AgentAccountCapacityError('Rate limited.', {
        reason: 'rate-limited',
        retryAt: '2026-08-17T10:30:00.000Z',
      }),
    );

    const runtime = new WorkspaceAgentRuntime({
      accountCooldowns: cooldowns,
      targets: () => [accountA, accountB],
    });

    // act
    const execution = runtime.analyze(
      context('analysis'),
      skill(),
      undefined,
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    await expect(execution).rejects.toBeInstanceOf(AgentAccountCoolingDownError);
    await expect(execution).rejects.toMatchObject({
      retryAt: '2026-08-17T10:30:00.000Z',
    });
  });

  it('does not hide an explicitly simulated failure behind a fallback route', async () => {
    // arrange
    const fallback = vi.fn();

    // act
    const runtime = new WorkspaceAgentRuntime({
      targets: () => [
        target(
          adapter({
            analyze() {
              throw new Error('Requested Analyzer failure.');
            },
          }),
          'primary',
        ),
        target(
          adapter({
            analyze() {
              fallback();

              return Promise.resolve('unexpected');
            },
          }),
          'fallback',
        ),
      ],
    });

    // assert
    await expect(
      runtime.analyze(
        context('analysis'),
        skill(),
        undefined,
        async () => undefined,
        true,
        new AbortController().signal,
      ),
    ).rejects.toThrow('Requested Analyzer failure.');
    expect(fallback).not.toHaveBeenCalled();
  });
});

function target(
  runtime: IAgentRuntimePort & IIssueDraftingPort,
  label: string,
  maxParallelExecutions = 1,
  model: string | null = null,
) {
  return {
    label,
    actor: `runtime-${label}`,
    runtime,
    executionBinding: {
      agentTeamId: 'team',
      positionId: 'position',
      agentRoutePolicyId: 'route',
      agentRouteCandidateId: `candidate-${label}`,
      aiConnectionId: `account-${label}`,
      agentProfileId: `agent-${label}`,
      model,
      reasoningEffort: null,
    },
    routing: {
      workspaceId: 'personal',
      agentProfileId: `agent-${label}`,
      routePolicyId: 'route',
      routeCandidateId: `candidate-${label}`,
      strategy: 'priority' as const,
      costClass: 'unknown' as const,
      priority: label === 'primary' ? 1 : 2,
      sessionAffinity: true,
      maxParallelExecutions,
    },
  };
}

function withAccount<T extends ReturnType<typeof target>>(target: T, aiConnectionId: string): T {
  return {
    ...target,
    executionBinding: { ...target.executionBinding, aiConnectionId },
  };
}

function adapter(
  overrides: Partial<IAgentRuntimePort & IIssueDraftingPort> = {},
): IAgentRuntimePort & IIssueDraftingPort {
  return {
    async analyze() {
      return 'analyzed';
    },
    async solve() {
      return 'solved';
    },
    async draftIssue() {
      throw new Error('Issue drafting is not used in this test.');
    },
    ...overrides,
  };
}

class MemoryTelemetryRepository implements IAgentRouteTelemetryRepository {
  // #region Fields

  private readonly _records = new Map<string, IAgentRouteTelemetry>();

  // #endregion

  // #region Methods

  public initialize(): void {}

  public load(workspaceId: string, routeCandidateId: string): IAgentRouteTelemetry | undefined {
    return this._records.get(`${workspaceId}:${routeCandidateId}`);
  }

  public save(record: IAgentRouteTelemetry): void {
    this._records.set(`${record.workspaceId}:${record.routeCandidateId}`, record);
  }

  public removeWorkspace(workspaceId: string): void {
    for (const [key, record] of this._records) {
      if (record.workspaceId === workspaceId) this._records.delete(key);
    }
  }

  // #endregion
}

function context(role: SkillFlowRole): IExecutionContext {
  return {
    workItem: {
      id: 'work-item-1',
      externalId: 'WI-1',
      title: 'Test routing',
      body: '',
      stageId: 'qualified',
      provider: 'simulated',
      repository: 'repository',
      workspaceId: 'personal',
      labels: [],
      assignees: [],
    },
    workflow: defaultWorkflow,
    skill: {
      id: 'skill',
      name: 'Skill',
      version: '1',
      description: 'Test skill',
      capabilities: [role],
      source: 'workspace',
    },
    workspacePath: '/tmp/workspace',
    instructions: [],
  };
}

function skill(): ISkillPackageDocument {
  return {
    id: 'repository:test',
    name: 'test',
    displayName: 'Test',
    description: 'Test skill',
    source: 'repository',
    location: '/tmp/skill',
    editable: false,
    implicitInvocation: false,
    updatedAt: '2026-08-16T00:00:00.000Z',
    digest: 'digest',
    resourceCount: 0,
    warnings: [],
    instructions: 'Test.',
    openaiYaml: '',
    files: [],
  };
}
