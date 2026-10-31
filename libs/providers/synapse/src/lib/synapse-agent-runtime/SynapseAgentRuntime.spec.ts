// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AiError,
  parseSessionReference,
  type IAiResult,
  type IAiSessionReference,
} from '@pixel-brewery/synapse-core';
import type { IAgentProgress } from '@symphony/application-execution';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { type IIssueDraft, type IWorkItemEditorMetadata } from '@symphony/domain-work';
import { type ISkillPackageDocument } from '@symphony/domain-skills';
import type { IExecutionContext } from '@symphony/application-execution';
import {
  analysisReportContract,
  implementationReportContract,
  issueDraftBodyContract,
} from '@symphony/domain-skills';
import { AgentAccountCapacityError } from '../agent-account-cooldown/AgentAccountCapacityError.js';
import type { ISynapseAiRunRequest } from '../synapse-ai-service/interfaces/ISynapseAiRunRequest.js';
import { SynapseAgentRuntime } from './SynapseAgentRuntime.js';
import { SynapseHostProgressError } from './errors/SynapseHostProgressError.js';

// #endregion

const session: IAiSessionReference = {
  driverId: 'fixture-driver',
  instanceId: 'fixture-instance',
  profileId: 'fixture-profile',
  candidateId: 'fixture-candidate',
  nativeId: 'fixture-native-session',
  authenticationGeneration: 'fixture-authentication-generation',
};
const result: IAiResult = {
  text: '  Completed business report.  ',
  driverId: 'fixture-driver',
  instanceId: 'fixture-instance',
  profileId: 'fixture-profile',
  candidateId: 'fixture-candidate',
};
const draft: IIssueDraft = {
  title: '  Classified draft  ',
  body: '  Complete draft body.  ',
  projectFields: [{ fieldId: 'status', type: 'single-select', value: 'todo' }],
  labels: [' enhancement '],
  assignees: [' synthetic-user '],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function context(): IExecutionContext {
  return {
    workItem: {
      id: 'work-item-1',
      workspaceId: 'workspace-1',
      externalId: 'WI-1',
      title: 'Requested change',
      body: 'Original work-item body.',
      provider: 'simulated',
      repository: 'owner/repository',
      labels: ['enhancement'],
      assignees: [{ login: 'synthetic-user' }],
      projectFields: [{ fieldId: 'status', type: 'single-select', value: 'todo' }],
      comments: [
        {
          id: 'comment-1',
          author: { login: 'reviewer' },
          body: 'Keep this discussion decision.',
          createdAt: '2026-10-29T00:00:00.000Z',
        },
      ],
    },
    workflow: defaultWorkflow,
    skill: {
      id: 'skill-1',
      name: 'Analysis',
      version: '1',
      description: 'Fixture skill.',
      capabilities: ['analysis'],
      source: 'workspace',
    },
    workspacePath: '/isolated/worktree',
    workspaceReference: 'codex/existing-branch',
    continuationReference: 'existing-native-session',
    instructions: [],
  };
}

function skill(): ISkillPackageDocument {
  return {
    id: 'repository:test',
    name: 'test',
    displayName: 'Test skill',
    description: 'Fixture skill.',
    source: 'repository',
    location: '/workspace/skill',
    editable: false,
    implicitInvocation: false,
    updatedAt: '2026-10-29T00:00:00.000Z',
    digest: 'fixture-digest',
    resourceCount: 0,
    warnings: [],
    instructions: 'Activated task-specific instructions.',
    openaiYaml: '',
    files: [],
  };
}

function metadata(): IWorkItemEditorMetadata {
  return {
    repositories: ['owner/repository'],
    labels: [{ name: 'enhancement', color: 'ffffff', description: 'A requested feature.' }],
    assignees: [{ login: 'synthetic-user', displayName: 'Synthetic User' }],
    states: [],
    projectFields: [
      {
        id: 'status',
        name: 'Status',
        role: 'workflow-state',
        type: 'single-select',
        options: [{ id: 'todo', label: 'Todo', description: 'Ready for analysis.' }],
      },
    ],
  };
}

describe('SynapseAgentRuntime', () => {
  it('preserves the complete application analysis prompt and readonly continuation policy', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(
      async () => result,
    );
    const runtime = new SynapseAgentRuntime({
      actor: 'CLI assistant',
      execute,
      model: 'selected-model',
      reasoningEffort: 'high',
    });

    // act
    const report = await runtime.analyze(
      context(),
      skill(),
      'Focus on the routing seam.',
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    expect(report).toBe('Completed business report.');
    expect(execute).toHaveBeenCalledTimes(1);

    const request = execute.mock.calls[0]![0];

    expect(request).toMatchObject({
      workingDirectory: '/isolated/worktree',
      continuationReference: 'existing-native-session',
      model: 'selected-model',
      reasoningEffort: 'high',
      policy: { mode: 'read-only', repeatable: true, allowWriteRetry: false },
    });

    for (const text of [
      'Read and follow every applicable AGENTS.md',
      'Symphony owns tracker claims and workflow transitions',
      'Skip every skill step that mutates work-item tracking',
      'untrusted task data',
      'Original work-item body.',
      'Keep this discussion decision.',
      'enhancement',
      'synthetic-user',
      'Focus on the routing seam.',
      'Activated task-specific instructions.',
      analysisReportContract,
    ])
      expect(request.prompt).toContain(text);
  });

  it('keeps implementation branch/tracker policy and refuses automatic writing replay', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(
      async () => result,
    );
    const runtime = new SynapseAgentRuntime({
      actor: 'Claude',
      execute,
      deniedTools: ['Bash(git commit:*)', 'Bash(git push:*)'],
    });

    // act
    await runtime.solve(
      context(),
      skill(),
      'Approved implementation handoff.',
      'Requested revision.',
      async () => undefined,
      false,
      new AbortController().signal,
    );

    // assert
    const request = execute.mock.calls[0]![0];

    expect(request.policy).toMatchObject({
      mode: 'workspace-write',
      repeatable: false,
      allowWriteRetry: false,
      deniedTools: ['Bash(git commit:*)', 'Bash(git push:*)'],
    });

    for (const text of [
      'codex/existing-branch',
      'Do not create or switch branches',
      'Do not create commits, push, merge, or mutate work-item tracking',
      'Approved implementation handoff.',
      'Requested revision.',
      'Keep this discussion decision.',
      implementationReportContract,
    ])
      expect(request.prompt).toContain(text);
  });

  it('maps bound continuation and latest usage while suppressing command payloads and duplicate result progress', async () => {
    // arrange
    const progress: IAgentProgress[] = [];
    const usage = { input: 20, cachedInput: 4, output: 8, total: 28 };
    const execute = vi.fn(async (request: ISynapseAiRunRequest) => {
      await request.onEvent?.({ type: 'session', session });
      await request.onEvent?.({
        type: 'usage',
        usage: { input: 10, cachedInput: 2, output: 1, total: 11 },
      });
      await request.onEvent?.({ type: 'usage', usage });
      await request.onEvent?.({
        type: 'progress',
        category: 'command',
        message: 'API_TOKEN=synthetic-private-value native-shell-command',
      });
      await request.onEvent?.({ type: 'text', text: 'Inspected the requested contract.' });

      return { ...result, session, usage };
    });
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    await runtime.analyze(
      context(),
      skill(),
      undefined,
      async (event) => {
        progress.push(event);
      },
      false,
      new AbortController().signal,
    );

    // assert
    expect(progress.filter((event) => event.tokenUsage)).toHaveLength(2);
    expect(progress.filter((event) => event.tokenUsage).at(-1)?.tokenUsage).toEqual(usage);
    expect(progress.filter((event) => event.continuationReference)).toHaveLength(1);

    const continuation = progress.find(
      (event) => event.continuationReference,
    )?.continuationReference;

    expect(continuation).toBeDefined();
    expect(parseSessionReference(continuation!)).toEqual(session);
    expect(progress.every((event) => event.actor === 'CLI assistant')).toBe(true);
    expect(JSON.stringify(progress)).not.toContain('synthetic-private-value');
  });

  it('persists a final-only session with its original authentication generation', async () => {
    // arrange
    const progress: IAgentProgress[] = [];
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(async () => ({
      ...result,
      session,
    }));
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    await runtime.analyze(
      context(),
      skill(),
      undefined,
      async (event) => {
        progress.push(event);
      },
      false,
      new AbortController().signal,
    );

    // assert
    const continuations = progress.filter((event) => event.continuationReference);

    expect(continuations).toHaveLength(1);
    expect(parseSessionReference(continuations[0]!.continuationReference!)).toEqual(session);
    expect(execute.mock.calls[0]![0].continuationReference).toBe('existing-native-session');
  });

  it('treats initial progress persistence failure as fatal before a native invocation', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(
      async () => result,
    );
    const cause = new Error('Synthetic progress storage failed.');
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const operation = runtime.analyze(
      context(),
      skill(),
      undefined,
      async () => {
        throw cause;
      },
      false,
      new AbortController().signal,
    );

    // assert
    await expect(operation).rejects.toBeInstanceOf(SynapseHostProgressError);
    await expect(operation).rejects.toHaveProperty('cause', cause);
    expect(execute).not.toHaveBeenCalled();
  });

  it('restores the fatal host sentinel when the library wraps a provider-event persistence failure', async () => {
    // arrange
    const cause = new Error('Synthetic streamed progress failed.');
    const execute = vi.fn(async (request: ISynapseAiRunRequest) => {
      try {
        await request.onEvent?.({ type: 'text', text: 'Native progress.' });
      } catch (failure) {
        throw new AiError('persistence', 'Critical host callback failed.', { cause: failure });
      }

      return result;
    });
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const operation = runtime.analyze(
      context(),
      skill(),
      undefined,
      async (progress) => {
        if (progress.category === 'message') throw cause;
      },
      false,
      new AbortController().signal,
    );

    // assert
    await expect(operation).rejects.toBeInstanceOf(SynapseHostProgressError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not replay native work when final result usage cannot be persisted', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(async () => ({
      ...result,
      usage: { input: 20, cachedInput: 0, output: 5, total: 25 },
    }));
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const operation = runtime.analyze(
      context(),
      skill(),
      undefined,
      async (progress) => {
        if (progress.tokenUsage) throw new Error('Synthetic final usage failed.');
      },
      false,
      new AbortController().signal,
    );

    // assert
    await expect(operation).rejects.toBeInstanceOf(SynapseHostProgressError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('preserves draft metadata/prompt contracts and passes the operation session key without local retries', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(async () => ({
      ...result,
      structured: draft,
    }));
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const actual = await runtime.draftIssue(
      {
        operationId: 'draft-operation-1',
        workspaceId: 'workspace-1',
        repository: 'owner/repository',
        prompt: 'Requested feature.',
        title: 'Existing title',
        body: 'Existing body',
        projectFields: [],
      },
      metadata(),
      skill(),
      '/isolated/worktree',
      new AbortController().signal,
    );

    // assert
    expect(actual).toMatchObject({
      title: 'Classified draft',
      body: 'Complete draft body.',
      labels: ['enhancement'],
      assignees: ['synthetic-user'],
    });
    expect(execute).toHaveBeenCalledTimes(1);

    const request = execute.mock.calls[0]![0];

    expect(request).toMatchObject({
      sessionKey: 'draft-operation-1',
      policy: { mode: 'read-only', repeatable: true, allowWriteRetry: false },
      outputSchema: { type: 'object', additionalProperties: false },
    });

    for (const text of [
      'Existing title',
      'Existing body',
      'Requested feature.',
      '"id":"todo"',
      '"name":"enhancement"',
      '"login":"synthetic-user"',
      'Never invent, rename, approximate, or translate an option value',
      'Activated task-specific instructions.',
      issueDraftBodyContract,
    ])
      expect(request.prompt).toContain(text);
  });

  it('retains fenced-text JSON decoding for legacy compatible draft results', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(async () => ({
      ...result,
      text: '```json\n' + JSON.stringify(draft) + '\n```',
    }));
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const actual = await runtime.draftIssue(
      {
        operationId: 'draft-operation-1',
        repository: 'owner/repository',
        prompt: 'Requested feature.',
      },
      metadata(),
      skill(),
      '/isolated/worktree',
      new AbortController().signal,
    );

    // assert
    expect(actual.title).toBe('Classified draft');
  });

  it('keeps account interruption recovery typed and leaves retry scheduling to the host service', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(async () => {
      throw new AiError('quota', 'Native account quota exhausted.', {
        capacityScope: 'account',
        retryable: true,
        retryAt: Date.parse('2026-10-29T10:00:00.000Z'),
      });
    });
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const operation = runtime.draftIssue(
      {
        operationId: 'draft-operation-1',
        repository: 'owner/repository',
        prompt: 'Requested feature.',
      },
      metadata(),
      skill(),
      '/isolated/worktree',
      new AbortController().signal,
    );

    // assert
    await expect(operation).rejects.toBeInstanceOf(AgentAccountCapacityError);
    await expect(operation).rejects.toHaveProperty('retryAt', '2026-10-29T10:00:00.000Z');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('preserves the explicit simulation failure without starting the shared runtime', async () => {
    // arrange
    const execute = vi.fn<(request: ISynapseAiRunRequest) => Promise<IAiResult>>(
      async () => result,
    );
    const runtime = new SynapseAgentRuntime({ actor: 'CLI assistant', execute });

    // act
    const operation = runtime.analyze(
      context(),
      skill(),
      undefined,
      async () => undefined,
      true,
      new AbortController().signal,
    );

    // assert
    await expect(operation).rejects.toThrow('Requested Analyzer failure.');
    expect(execute).not.toHaveBeenCalled();
  });
});
