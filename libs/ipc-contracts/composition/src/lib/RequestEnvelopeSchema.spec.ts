// #region Imports
import { describe, expect, it } from 'vitest';
import { requestEnvelopeSchema } from './RequestEnvelopeSchema';
import { requestSchemas } from './RequestSchemas';
import { responseSchemas } from './ResponseSchemas';
// #endregion

describe('RequestEnvelopeSchema', () => {
  it('names exactly the methods the schema maps define', () => {
    // arrange
    const envelopeMethods = new Set(
      requestEnvelopeSchema.shape.method.options as readonly string[],
    );

    // act
    const actual = [...Object.keys(requestSchemas)].filter(
      (method) => !envelopeMethods.has(method),
    );

    // assert
    expect(actual).toEqual([]);
    expect([...envelopeMethods].filter((method) => !(method in responseSchemas))).toEqual([]);
  });
  it('carries the machine overview across the process boundary', () => {
    // arrange
    // act
    const actual = requestEnvelopeSchema.parse({
      correlationId: 'list-machines',
      method: 'local-ci.instances.list',
      payload: {},
    });

    // assert
    expect(actual).toMatchObject({ method: 'local-ci.instances.list' });

    const response = responseSchemas['local-ci.instances.list'].parse({
      runtimeRoot: '/Users/someone/.symphony/workspaces/local-ci',
      instances: [
        {
          name: 'sci-0123456789abcdef',
          purpose: 'workflow-runner',
          status: 'stopped',
          allocatedBytes: 15_032_385_536,
          provisionedDiskGiB: 20,
          createdAt: '2026-08-22T00:49:00.000Z',
          keptWarm: false,
          busy: false,
        },
      ],
    });

    expect(response.instances[0]).toMatchObject({ purpose: 'workflow-runner', keptWarm: false });
  });
});

const expectedEnvelopeMethods = [
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
  'setup.repository.inspect',
  'ci.run.details',
  'ci.run.log',
  'ci.cancel',
  'ci.rerun',
  'ci.local.run',
  'ci.local.cancel',
  'ci.local.cleanup',
  'local-ci.images.list',
  'local-ci.image.select',
  'local-ci.instances.list',
  'local-ci.instances.remove',
  'storage.status.get',
  'settings.get',
  'settings.save',
  'github.projects.list',
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

describe('RequestEnvelopeSchema compatibility', () => {
  it('preserves all 115 method IDs in their existing envelope order', () => {
    // arrange
    // act
    const methods = requestEnvelopeSchema.shape.method.options;
    // assert
    expect(methods).toHaveLength(115);
    expect(methods).toEqual(expectedEnvelopeMethods);
  });

  it('keeps opaque request correlation and method validation unchanged', () => {
    // arrange
    const correlationId = 'opaque-operation-1';
    // act
    const request = requestEnvelopeSchema.parse({
      correlationId,
      method: 'ci.workflow.dispatch',
      payload: { workflowId: 'ci-1:101' },
    });
    // assert
    expect(request.correlationId).toBe(correlationId);
    expect(request.payload).toEqual({ workflowId: 'ci-1:101' });
    expect(() =>
      requestEnvelopeSchema.parse({ correlationId: '', method: 'health.get', payload: {} }),
    ).toThrow();
    expect(() =>
      requestEnvelopeSchema.parse({ correlationId, method: 'invented.method', payload: {} }),
    ).toThrow();
  });
});
