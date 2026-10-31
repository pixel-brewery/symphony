// #region Imports
import { describe, expect, expectTypeOf, it } from 'vitest';
import { requestEnvelopeSchema } from './RequestEnvelopeSchema';
import { requestSchemas } from './RequestSchemas';
import { responseSchemas } from './ResponseSchemas';
import type { z } from 'zod';
import { platformRequestSchemas } from '@symphony/ipc-contracts-platform';
import { executionRequestSchemas } from '@symphony/ipc-contracts-execution';
import { deliveryRequestSchemas } from '@symphony/ipc-contracts-delivery';
import { workRequestSchemas } from '@symphony/ipc-contracts-work';
import { workspaceRequestSchemas } from '@symphony/ipc-contracts-workspace';
import { ciRequestSchemas } from '@symphony/ipc-contracts-ci';
import { automationRequestSchemas } from '@symphony/ipc-contracts-automation';
import { feedbackRequestSchemas } from '@symphony/ipc-contracts-feedback';
import { aiRequestSchemas } from '@symphony/ipc-contracts-ai';
import { skillRequestSchemas } from '@symphony/ipc-contracts-skills';
import { workflowRequestSchemas } from '@symphony/ipc-contracts-workflow';
import { mobileRequestSchemas } from '@symphony/ipc-contracts-mobile';
import type { RequestPayload } from './RequestPayload';
// #endregion

describe('RequestSchemas', () => {
  it('allows only fixed developer-tool installation recipes across IPC', () => {
    // arrange
    // act
    const actual = requestEnvelopeSchema.parse({
      correlationId: 'install-opencode-cli',
      method: 'runtime-dependencies.install',
      payload: { command: 'opencode' },
    });

    // assert
    expect(actual).toMatchObject({ method: 'runtime-dependencies.install' });
    expect(() =>
      requestSchemas['runtime-dependencies.install'].parse({
        command: 'brew install --cask anything',
      }),
    ).toThrow();
    expect(
      responseSchemas['health.get'].parse({
        status: 'ready',
        utilityProcess: true,
        database: true,
        homebrew: { available: true, version: 'Homebrew 6.0.8' },
        git: { available: true, version: 'git version 2.50.1' },
        githubCli: { available: true, version: 'gh version 2.80.0' },
        agents: {
          codex: { available: true, version: 'codex-cli 0.1.0' },
          claude: { available: false },
          opencode: { available: false },
        },
      }),
    ).toMatchObject({ homebrew: { available: true }, agents: { opencode: { available: false } } });
  });

  it('accepts a bounded repository reference for persistent AI execution approval', () => {
    // arrange
    // act
    const actual = requestSchemas['repositories.trust.grant-agent'].parse({
      repositoryBindingId: 'repository-1',
    });

    // assert
    expect(actual).toEqual({ repositoryBindingId: 'repository-1' });
    expect(() =>
      requestSchemas['repositories.trust.grant-agent'].parse({ repositoryBindingId: '' }),
    ).toThrow();
  });

  it('accepts only a server-owned plan reference for local execution requests', () => {
    // act
    // arrange
    const parsed = requestSchemas['verification.run'].parse({
      repositoryBindingId: 'repository-1',
      planId: 'plan-1',
      approval: 'once',
      executable: 'sh',
      arguments: ['-c', 'anything'],
    });

    // assert
    expect(parsed).toEqual({
      repositoryBindingId: 'repository-1',
      planId: 'plan-1',
      approval: 'once',
    });
    expect(() =>
      requestSchemas['verification.run'].parse({
        repositoryBindingId: 'repository-1',
        planId: 'plan-1',
        approval: 'always',
      }),
    ).toThrow();
  });

  it('validates bounded typed verification plans before they cross to the renderer', () => {
    // arrange
    // act
    // assert
    expect(() =>
      responseSchemas['verification.plan'].parse({
        id: 'plan-1',
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        repositoryIdentity: 'github.com/example/platform',
        revision: 'abc',
        createdAt: '2026-08-13T10:00:00.000Z',
        technologies: ['Node.js'],
        evidence: [],
        capabilities: ['host-execution'],
        steps: [
          {
            id: 'unsafe',
            kind: 'unit-test',
            label: 'Unsafe',
            executable: 'sh',
            arguments: ['-c', 'anything'],
            workingDirectory: '.',
            timeoutSeconds: 0,
            network: 'none',
            artifactPaths: [],
          },
        ],
      }),
    ).toThrow();
  });

  it('exposes only a workflow reference and typed local CI evidence across IPC', () => {
    // arrange
    // act
    const actual = requestSchemas['ci.local.run'].parse({ runId: 'ci-1:203' });

    // assert
    expect(actual).toEqual({
      runId: 'ci-1:203',
    });
    expect(
      responseSchemas['ci.local.run'].parse({
        id: 'local-ci-1',
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        ciRunId: 'ci-1:203',
        runAttempt: 2,
        revision: 'abc123',
        state: 'succeeded',
        startedAt: '2026-08-14T10:00:00.000Z',
        finishedAt: '2026-08-14T10:10:00.000Z',
        runner: {
          kind: 'managed-linux-vm',
          os: 'linux',
          architecture: 'arm64',
          label: 'symphony-run-203',
          imageVersion: 'lima-2.2.0/ubuntu-lts/actions-runner-2.336.0',
        },
      }),
    ).toMatchObject({ state: 'succeeded', revision: 'abc123', runAttempt: 2 });
    expect(() =>
      responseSchemas['ci.local.run'].parse({
        id: 'local-ci-1',
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        ciRunId: 'ci-1:203',
        state: 'succeeded',
        startedAt: 'not-a-date',
        finishedAt: '2026-08-14T10:10:00.000Z',
        runner: {
          kind: 'host-shell',
          os: 'darwin',
          architecture: 'arm64',
          label: 'unbounded',
          imageVersion: 'unknown',
        },
      }),
    ).toThrow();
    expect(() =>
      responseSchemas['ci.local.run'].parse({
        id: 'local-ci-1',
        workspaceId: 'workspace-1',
        repositoryBindingId: 'repository-1',
        ciRunId: 'ci-1:203',
        runAttempt: 0,
        state: 'failed',
        startedAt: '2026-08-14T10:00:00.000Z',
        finishedAt: '2026-08-14T10:00:01.000Z',
      }),
    ).toThrow();
  });

  it('validates narrow and workflow-catalog CI refreshes independently from the workspace snapshot', () => {
    // arrange
    // act
    const actual = requestSchemas['ci.runs.refresh'].parse({});
    const catalogRefresh = requestSchemas['ci.runs.refresh'].parse({
      includeWorkflowCatalog: true,
    });

    // assert
    expect(actual).toEqual({});
    expect(catalogRefresh).toEqual({ includeWorkflowCatalog: true });
    expect(
      requestEnvelopeSchema.parse({
        correlationId: 'renderer-ci-runs-refresh',
        method: 'ci.runs.refresh',
        payload: {},
      }),
    ).toEqual({
      correlationId: 'renderer-ci-runs-refresh',
      method: 'ci.runs.refresh',
      payload: {},
    });
    expect(
      responseSchemas['ci.runs.refresh'].parse({
        ciWorkflows: [
          {
            id: 'ci-1:101',
            workspaceId: 'workspace-1',
            ciBindingId: 'ci-1',
            repositoryBindingId: 'repository-1',
            name: 'PR Quality',
            path: '.github/workflows/ci.yml',
            state: 'active',
            defaultBranch: 'main',
            supportsManualDispatch: true,
          },
        ],
        ciRuns: [
          {
            id: 'ci-1:203',
            workspaceId: 'workspace-1',
            ciBindingId: 'ci-1',
            repositoryBindingId: 'repository-1',
            workflowId: 'ci-1:101',
            name: 'PR Quality',
            status: 'in-progress',
          },
        ],
        localCiExecutions: [],
        activeLocalCiRun: {
          runId: 'ci-1:203',
          startedAt: '2026-08-15T10:01:00.000Z',
        },
        remoteData: {
          state: 'current',
          lastSuccessfulRefreshAt: '2026-08-15T10:00:00.000Z',
        },
      }),
    ).toMatchObject({
      ciWorkflows: [{ supportsManualDispatch: true }],
      ciRuns: [{ status: 'in-progress' }],
      activeLocalCiRun: { runId: 'ci-1:203' },
      remoteData: { state: 'current' },
    });
    expect(() =>
      responseSchemas['ci.runs.refresh'].parse({
        ciRuns: [{ id: 'missing-bindings', status: 'running' }],
        localCiExecutions: [],
        remoteData: { state: 'current' },
      }),
    ).toThrow();
  });

  it('validates a safe provider request-limit recovery time', () => {
    // arrange
    // act
    const actual = responseSchemas['ci.runs.refresh'].parse({
      ciWorkflows: [],
      ciRuns: [],
      localCiExecutions: [],
      remoteData: {
        state: 'stale',
        lastSuccessfulRefreshAt: '2026-08-15T10:00:00.000Z',
        reason: 'rate-limited',
        retryAt: '2026-08-15T11:00:00.000Z',
      },
    });

    // assert
    expect(actual.remoteData).toEqual({
      state: 'stale',
      lastSuccessfulRefreshAt: '2026-08-15T10:00:00.000Z',
      reason: 'rate-limited',
      retryAt: '2026-08-15T11:00:00.000Z',
    });
  });

  it('validates remote and local workflow dispatch without exposing GitHub request shapes', () => {
    // arrange
    // act
    const actual = requestSchemas['ci.workflow.dispatch'].parse({
      workflowId: 'ci-1:101',
      ref: 'main',
    });

    // assert
    expect(actual).toEqual({ workflowId: 'ci-1:101', ref: 'main' });
    expect(
      requestSchemas['ci.workflow.local.run'].parse({
        workflowId: 'ci-1:101',
        ref: 'release/preview',
      }),
    ).toEqual({ workflowId: 'ci-1:101', ref: 'release/preview' });
    expect(
      responseSchemas['ci.workflow.dispatch'].parse({
        id: 'ci-1:703',
        workspaceId: 'workspace-1',
        ciBindingId: 'ci-1',
        repositoryBindingId: 'repository-1',
        workflowId: 'ci-1:101',
        name: 'PR Quality',
        event: 'workflow_dispatch',
        status: 'queued',
      }),
    ).toMatchObject({ workflowId: 'ci-1:101', event: 'workflow_dispatch' });
  });

  it('validates provider-neutral Action job and step logs across the desktop boundary', () => {
    // arrange
    // act
    const actual = requestSchemas['ci.run.details'].parse({ runId: 'ci-1:203' });

    // assert
    expect(actual).toEqual({
      runId: 'ci-1:203',
    });
    expect(
      requestEnvelopeSchema.parse({
        correlationId: 'renderer-ci-run-details',
        method: 'ci.run.details',
        payload: { runId: 'ci-1:203' },
      }),
    ).toMatchObject({ method: 'ci.run.details' });
    expect(
      responseSchemas['ci.run.details'].parse({
        runId: 'ci-1:203',
        jobs: [
          {
            id: 'ci-1:203:job:44',
            name: 'Quality',
            status: 'in-progress',
            startedAt: '2026-08-15T08:00:00.000Z',
            steps: [
              {
                id: 'ci-1:203:job:44:step:1',
                name: 'Install dependencies',
                status: 'succeeded',
              },
            ],
          },
        ],
      }),
    ).toMatchObject({ jobs: [{ steps: [{ status: 'succeeded' }] }] });
    expect(() =>
      responseSchemas['ci.run.details'].parse({
        runId: 'ci-1:203',
        jobs: [{ id: 'job-1', name: 'Quality', status: 'unknown', steps: [] }],
      }),
    ).toThrow();
  });
});

const expectedRequestMethods = [
  'health.get',
  'runtime-dependencies.install',
  'snapshot.get',
  'snapshot.refresh',
  'external-services.incidents.get',
  'execution-state.get',
  'analyzer.start',
  'analysis.complete-manually',
  'solver.start',
  'work-items.delegate',
  'goals.review',
  'delivery-groups.assess',
  'delivery-groups.create-direct',
  'delivery-groups.confirm',
  'delivery-groups.reject',
  'delivery-groups.dissolve',
  'delivery-groups.align',
  'solution.complete-manually',
  'execution-queue.remove',
  'execution.cancel',
  'execution.pause',
  'execution.resume',
  'pull-request.publish',
  'pull-request.branches',
  'pull-request.compare',
  'pull-request.create',
  'pull-request.update-branch',
  'lifecycle.reconcile',
  'lifecycle.active-operations.get',
  'lifecycle.active-operations.pause',
  'lifecycle.active-operations.cancel',
  'work-items.metadata',
  'work-items.detail',
  'work-items.create',
  'work-items.update',
  'work-items.move',
  'work-items.comment',
  'work-items.draft',
  'work-items.draft.cancel',
  'workspaces.clear',
  'workspaces.delete',
  'workspaces.export',
  'workspaces.import',
  'repositories.runtime.list',
  'repositories.prepare',
  'repositories.trust.grant-agent',
  'repositories.trust.revoke',
  'verification.plan',
  'verification.run',
  'verification.cancel',
  'ci.usage.get',
  'ci.runs.refresh',
  'ci.runs.history.list',
  'ci.workflow.dispatch',
  'ci.workflow.local.run',
  'delivery.refresh',
  'delivery.preview',
  'delivery.start',
  'delivery.operations',
  'delivery.reconcile',
  'ci.approval.review',
  'ci.run.details',
  'ci.run.log',
  'ci.cancel',
  'ci.rerun',
  'ci.local.run',
  'ci.local.cancel',
  'ci.local.cleanup',
  'local-ci.images.list',
  'local-ci.instances.list',
  'local-ci.instances.remove',
  'local-ci.image.select',
  'storage.status.get',
  'settings.get',
  'settings.save',
  'github.projects.list',
  'setup.repository.inspect',
  'work-item-sources.columns',
  'autonomy.status.get',
  'autonomy.set-enabled',
  'feedback-intake.test',
  'connections.get',
  'codex.configuration.get',
  'ai.models.get',
  'ai.intelligence.get',
  'opencode.credentials.import',
  'azure-devops.login.start',
  'azure-devops.logout',
  'github.login.start',
  'github.logout',
  'codex.login.start',
  'codex.logout',
  'claude.login.start',
  'claude.login.complete',
  'claude.logout',
  'skills.list',
  'workflow.get',
  'workflow.decide',
  'workflow.answer',
  'workflow.stage-changes.list',
  'skills.builtin.list',
  'skills.builtin.customize',
  'skills.get',
  'skills.save',
  'skills.import',
  'skills.export',
  'skills.delete',
  'mobile-access.status.get',
  'mobile-access.enable',
  'mobile-access.disable',
  'mobile-access.pairing.create',
  'mobile-access.pairing.approve',
  'mobile-access.pairing.reject',
  'mobile-access.device.revoke',
  'mobile-access.devices.revoke-all',
];

describe('RequestSchemas compatibility', () => {
  it('preserves all 115 method IDs in their existing request-catalog order', () => {
    // arrange
    // act
    const methods = Object.keys(requestSchemas);
    // assert
    expect(methods).toHaveLength(115);
    expect(methods).toEqual(expectedRequestMethods);
  });

  it('composes feature-owned request schemas by identity without rebuilding constraints', () => {
    // arrange
    const catalog = new Map(Object.entries(requestSchemas));
    // act
    // assert
    for (const [method, schema] of Object.entries(platformRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(executionRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(deliveryRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workspaceRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(ciRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(automationRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(feedbackRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(aiRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(skillRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workflowRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(mobileRequestSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
  });

  it('preserves request defaults, transforms and saved-account scope restrictions', () => {
    // arrange
    const goal = { workItemId: 'work-1', decision: 'approved' };
    // act
    const analysis = requestSchemas['analyzer.start'].parse({});
    const reviewed = requestSchemas['goals.review'].parse(goal);
    const preview = requestSchemas['delivery.preview'].parse({
      targetId: 'target-1',
      ref: '  main  ',
    });
    const images = requestSchemas['local-ci.images.list'].parse({});
    // assert
    expect(analysis).toEqual({ simulateFailure: false });
    expect(reviewed).toEqual({ ...goal, message: '' });
    expect(preview).toEqual({ targetId: 'target-1', ref: 'main' });
    expect(images).toEqual({ refresh: false });
    expect(() =>
      requestSchemas['ai.models.get'].parse({
        runtime: 'opencode',
        workspaceId: 'workspace-1',
        connectionId: 'account-1',
        credentialRef: 'env:DRAFT_KEY',
      }),
    ).toThrow();
  });

  it('retains literal method-to-request type correlation', () => {
    // arrange
    // act
    // assert
    expectTypeOf<RequestPayload<'verification.run'>>().toEqualTypeOf<
      z.infer<(typeof ciRequestSchemas)['verification.run']>
    >();
  });
});
