// #region Imports
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import { platformResponseSchemas } from '@symphony/ipc-contracts-platform';
import { executionResponseSchemas } from '@symphony/ipc-contracts-execution';
import { deliveryResponseSchemas } from '@symphony/ipc-contracts-delivery';
import { workResponseSchemas } from '@symphony/ipc-contracts-work';
import { workspaceResponseSchemas } from '@symphony/ipc-contracts-workspace';
import { ciResponseSchemas } from '@symphony/ipc-contracts-ci';
import { automationResponseSchemas } from '@symphony/ipc-contracts-automation';
import { feedbackResponseSchemas } from '@symphony/ipc-contracts-feedback';
import { aiResponseSchemas } from '@symphony/ipc-contracts-ai';
import { skillResponseSchemas } from '@symphony/ipc-contracts-skills';
import { workflowResponseSchemas } from '@symphony/ipc-contracts-workflow';
import { mobileResponseSchemas } from '@symphony/ipc-contracts-mobile';
import { responseSchemas } from './ResponseSchemas';
import type { ResponsePayload } from './ResponsePayload';
// #endregion

const expectedResponseMethods = [
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
  'local-ci.images.list',
  'local-ci.image.select',
  'local-ci.instances.list',
  'local-ci.instances.remove',
  'ci.local.cleanup',
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

describe('ResponseSchemas compatibility', () => {
  it('preserves all 113 method IDs in their existing response-catalog order', () => {
    // arrange
    // act
    const methods = Object.keys(responseSchemas);
    // assert
    expect(methods).toHaveLength(113);
    expect(methods).toEqual(expectedResponseMethods);
  });

  it('composes feature-owned response schemas by identity without rebuilding constraints', () => {
    // arrange
    const catalog = new Map(Object.entries(responseSchemas));
    // act
    // assert
    for (const [method, schema] of Object.entries(platformResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(executionResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(deliveryResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workspaceResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(ciResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(automationResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(feedbackResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(aiResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(skillResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(workflowResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
    for (const [method, schema] of Object.entries(mobileResponseSchemas)) {
      expect(catalog.get(method)).toBe(schema);
    }
  });

  it('retains literal method-to-response type correlation', () => {
    // arrange
    // act
    // assert
    expectTypeOf<ResponsePayload<'ci.workflow.dispatch'>>().toEqualTypeOf<
      z.infer<(typeof ciResponseSchemas)['ci.workflow.dispatch']>
    >();
    expectTypeOf<ResponsePayload<'delivery.preview'>>().toEqualTypeOf<
      z.infer<(typeof deliveryResponseSchemas)['delivery.preview']>
    >();
  });
});
