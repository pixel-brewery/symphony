// #region Imports

import { afterEach, describe, expect, it } from 'vitest';
import { WorkItemClaimLostError } from '@symphony/application-work';
import type { IAgenticDeliveryRecord } from '@symphony/domain-automation';
import type {
  IExecutionRecord,
  IImplementationContract,
  IDeliveryGroup,
} from '@symphony/domain-execution';
import type { IWorkItem } from '@symphony/domain-work';
import { executionRecordSchema } from '@symphony/ipc-contracts-execution';
import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { createExecutionFixture as createFixture } from '../testing/createExecutionFixture';
import { cleanupExecutionFixtures } from '../testing/cleanupExecutionFixtures';

// #endregion

/** A position that analyzes but never changes files, like the seeded Solution Architect. */
const readOnlyPositionPolicy = {
  allowedPathPatterns: ['**'],
  forbiddenPathPatterns: ['.git/**'],
  maximumChangedFiles: 0,
  maximumDiffLines: 0,
  maximumIterations: 8,
} as const;

const implementationBudget = { maximumChangedFiles: 40, maximumDiffLines: 8_000 } as const;

/** A goal contract persisted before change budgets were owned by the implementing position. */
const zeroBudgetContract: IImplementationContract = {
  id: 'contract-blocked',
  version: 1,
  createdByExecutionId: 'analysis-goal',
  createdAt: '2026-08-06T00:01:00.000Z',
  instructions: 'Approved analysis.',
  acceptanceCriteria: ['Implement the approved analysis without scope drift.'],
  allowedPathPatterns: ['**'],
  forbiddenPathPatterns: [],
  allowedCommands: [],
  maximumChangedFiles: 0,
  maximumDiffLines: 0,
};

afterEach(cleanupExecutionFixtures);

/** Waits for a best-effort side effect that runs after the terminal execution event. */
async function waitUntil(condition: () => boolean, description: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function activeDeliveryGroup(
  id: string,
  workItemIds: readonly string[],
  overrides: Partial<IDeliveryGroup> = {},
): IDeliveryGroup {
  return {
    id,
    workspaceId: 'workspace-1',
    deliveryContextId: 'source-1',
    repository: 'test/repository',
    rootWorkItemId: workItemIds[0]!,
    workItemIds,
    revisions: Object.fromEntries(workItemIds.map((workItemId) => [workItemId, 0])),
    stageId: 'qualified',
    state: 'active',
    activationSource: 'proposal-confirmed',
    createdAt: '2026-08-07T00:00:00.000Z',
    updatedAt: '2026-08-07T00:00:00.000Z',
    ...overrides,
  };
}

describe('AnalyzerService', () => {
  it('creates a directly attested group without Analyzer evidence', async () => {
    // Arrange
    const fixture = createFixture(false);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'ready',
      revision: 3,
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 7,
    });

    // Act
    const group = await fixture.service.groupDeliveryDirectly(
      ['item-1', 'item-2'],
      'item-1',
      'manual-select',
    );
    const proposal = fixture.repository.listDeliveryGroupProposals().at(-1)!;

    // Assert
    expect(proposal.assessment).toMatchObject({
      relation: 'unrelated',
      sharedChangeSurface: [],
      compatibleAcceptanceCriteria: false,
      compatibleVerification: false,
      hasOpenDecisions: false,
    });
    expect(group).toMatchObject({
      rootWorkItemId: 'item-1',
      workItemIds: ['item-1', 'item-2'],
      activationSource: 'manual-select',
      state: 'active',
      operatorAttestation: { reason: 'Direct grouping selected by the operator.' },
    });
  });

  it('forbids the direct path for automatic grouping', async () => {
    const fixture = createFixture(false);

    await expect(
      fixture.service.assessDeliveryGroup(['item-1', 'item-2'], 'item-1', 'automatic', 'direct'),
    ).rejects.toThrow('Automatic delivery groups always require Analyzer evidence.');
  });

  it('keeps the manual drop target as the proposal root', async () => {
    // Arrange
    const fixture = createFixture(false);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'ready',
      revision: 3,
      title: 'Translation missing in tenant dialog',
      body: 'Update libs/tenant/TenantDialog.de.json.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      boardColumnId: 'progress',
      revision: 7,
      title: 'Translation error in tenant dialog',
      body: 'Update libs/tenant/TenantDialog.de.json.',
    });

    // Act
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-2',
      'manual-drag',
    );

    // Assert
    expect(proposal.rootWorkItemId).toBe('item-2');
    expect(proposal.workItemIds).toEqual(['item-2', 'item-1']);
    expect(proposal.assessment.sharedChangeSurface.length).toBeGreaterThan(0);
  });

  it('classifies a shared file with incompatible semantics as a critical-path collision', async () => {
    // Arrange
    const fixture = createFixture(false);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'ready',
      revision: 1,
      title: 'Tenant dialog authorization rule',
      body: 'Update libs/tenant/TenantDialog.ts.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 1,
      title: 'Tenant dialog animation timing',
      body: 'Update libs/tenant/TenantDialog.ts.',
    });

    // Act
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-drag',
    );

    // Assert
    expect(proposal.assessment).toMatchObject({ relation: 'collision' });
    expect(proposal.assessment.compatibleAcceptanceCriteria).toBe(false);
  });

  it('keeps automatic relationship discovery in proposal mode by default', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      detailState: 'complete',
      revision: 1,
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      detailState: 'complete',
      revision: 2,
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });

    // act
    await fixture.service.reconcileDeliveryGroupProjection(
      (await fixture.remoteProjectionQueries.refresh()).workItems,
      true,
    );

    // assert
    expect(fixture.repository.listDeliveryGroups()).toEqual([]);
    expect(fixture.repository.listDeliveryGroupProposals()).toMatchObject([
      { state: 'open', activationSource: 'automatic' },
    ]);
  });

  it('automatically activates only a fully gated relationship after workspace opt-in', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setAutomaticDeliveryGroupingEnabled(true);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      detailState: 'complete',
      revision: 1,
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      detailState: 'complete',
      revision: 2,
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });

    // act
    await fixture.service.reconcileDeliveryGroupProjection(
      (await fixture.remoteProjectionQueries.refresh()).workItems,
      true,
    );

    // assert
    expect(fixture.repository.listDeliveryGroupProposals()[0]?.assessment).toMatchObject({
      relation: 'joint-delivery',
      compatibleAcceptanceCriteria: true,
      compatibleVerification: true,
      hasOpenDecisions: false,
      hasExistingClaims: false,
      hasPullRequests: false,
    });
    expect(fixture.repository.listDeliveryGroupProposals()).toMatchObject([
      { state: 'confirmed', activationSource: 'automatic' },
    ]);
    expect(fixture.repository.listDeliveryGroups()).toMatchObject([
      {
        rootWorkItemId: 'item-1',
        workItemIds: ['item-1', 'item-2'],
        activationSource: 'automatic',
        state: 'active',
      },
    ]);
  });

  it('extends the overlapping active group instead of creating a second one', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      revision: 1,
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 2,
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-3',
      externalId: '#3',
      boardColumnId: 'progress',
      revision: 3,
      title: 'Broken tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the broken label.',
    });
    const first = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-drag',
    );
    await fixture.service.confirmDeliveryGroup(first.id);
    const second = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-3'],
      'item-1',
      'manual-drag',
    );

    // act
    const extended = await fixture.service.confirmDeliveryGroup(second.id);

    // assert
    expect(fixture.repository.listDeliveryGroups()).toHaveLength(1);
    expect(extended).toMatchObject({
      rootWorkItemId: 'item-1',
      workItemIds: ['item-1', 'item-2', 'item-3'],
      revisions: { 'item-1': 1, 'item-2': 2, 'item-3': 3 },
      state: 'active',
    });
    expect(fixture.columnMoves).toEqual(['item-3:qualified']);
    expect(
      fixture.repository.listDeliveryGroupProposals().map((proposal) => proposal.state),
    ).toEqual(['confirmed', 'confirmed']);
  });

  it('refuses to combine members of two different active groups', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });
    fixture.repository.saveDeliveryGroup(activeDeliveryGroup('group-1', ['item-1', 'item-9']));
    fixture.repository.saveDeliveryGroup(activeDeliveryGroup('group-2', ['item-2', 'item-8']));
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-drag',
    );

    // act
    const confirmAcrossGroups = fixture.service.confirmDeliveryGroup(proposal.id);

    // assert
    await expect(confirmAcrossGroups).rejects.toThrow(
      'The proposed work items already belong to different delivery groups. Dissolve one group before combining them.',
    );
    expect(fixture.repository.listDeliveryGroups()).toHaveLength(2);
  });

  it('refuses to extend a group that already publishes a pull request', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-3',
      externalId: '#3',
      title: 'Broken tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the broken label.',
    });
    fixture.repository.saveDeliveryGroup(
      activeDeliveryGroup('group-1', ['item-1', 'item-2'], {
        pullRequest: {
          number: 17,
          externalUrl: 'https://github.com/test/repository/pull/17',
          branchUrl: 'https://github.com/test/repository/tree/codex%2Fissue-1-test-work',
        },
      }),
    );
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-3'],
      'item-1',
      'manual-drag',
    );

    // act
    const confirmIntoDelivery = fixture.service.confirmDeliveryGroup(proposal.id);

    // assert
    await expect(confirmIntoDelivery).rejects.toThrow(
      'The delivery group already publishes a pull request; new members cannot join mid-delivery.',
    );
    expect(fixture.repository.listDeliveryGroups()[0]?.workItemIds).toEqual(['item-1', 'item-2']);
  });

  it('marks open proposals covered by an activated group as stale', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });
    const confirmedTarget = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-drag',
    );
    const covered = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-2',
      'manual-drag',
    );

    // act
    await fixture.service.confirmDeliveryGroup(confirmedTarget.id);

    // assert
    const states = new Map(
      fixture.repository
        .listDeliveryGroupProposals()
        .map((proposal) => [proposal.id, proposal.state]),
    );
    expect(states.get(confirmedTarget.id)).toBe('confirmed');
    expect(states.get(covered.id)).toBe('stale');
  });

  it('proposes one root-led cluster for every related bucket instead of pairs', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      detailState: 'complete',
      revision: 1,
      createdAt: '2026-08-01T00:00:00.000Z',
      title: 'Missing tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the missing label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      detailState: 'complete',
      revision: 2,
      createdAt: '2026-08-02T00:00:00.000Z',
      title: 'Incorrect tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the incorrect label.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-3',
      externalId: '#3',
      detailState: 'complete',
      revision: 3,
      createdAt: '2026-08-03T00:00:00.000Z',
      title: 'Broken tenant dialog translation',
      body: 'Update libs/tenant/TenantDialog.de.json for the broken label.',
    });

    // act
    await fixture.service.reconcileDeliveryGroupProjection(
      (await fixture.remoteProjectionQueries.refresh()).workItems,
      true,
    );

    // assert
    expect(fixture.repository.listDeliveryGroupProposals()).toMatchObject([
      {
        state: 'open',
        activationSource: 'automatic',
        rootWorkItemId: 'item-1',
        workItemIds: ['item-1', 'item-2', 'item-3'],
      },
    ]);
  });

  it('skips the same-column boundary for a manually selected group', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'ready',
      revision: 1,
      title: 'Translation missing in tenant dialog',
      body: 'Update libs/tenant/TenantDialog.de.json.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      boardColumnId: 'progress',
      revision: 2,
      title: 'Translation error in tenant dialog',
      body: 'Update libs/tenant/TenantDialog.de.json.',
    });

    // act
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-select',
    );

    // assert
    expect(proposal).toMatchObject({
      state: 'open',
      activationSource: 'manual-select',
      rootWorkItemId: 'item-1',
      workItemIds: ['item-1', 'item-2'],
    });
  });

  it('activates an attested manual selection although its evidence gates fail', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      revision: 1,
      title: 'Sidebar collapse regression',
      body: 'Fix libs/tenant/TenantDialog.ts focus loop.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 2,
      title: 'Print layout overflow',
      body: 'Adjust libs/tenant/TenantDialog.ts spacing rules.',
    });
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-select',
    );

    // act
    const group = await fixture.service.confirmDeliveryGroup(proposal.id, {});

    // assert
    expect(proposal.assessment.relation).toBe('collision');
    expect(group).toMatchObject({
      state: 'active',
      activationSource: 'manual-select',
      workItemIds: ['item-1', 'item-2'],
    });
    expect(group.operatorAttestation).toEqual({ attestedAt: '2026-08-07T00:00:00.000Z' });
  });

  it('persists the trimmed operator attestation on the confirmed proposal and group', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      revision: 1,
      title: 'Sidebar collapse regression',
      body: 'Fix libs/tenant/TenantDialog.ts focus loop.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 2,
      title: 'Print layout overflow',
      body: 'Adjust libs/tenant/TenantDialog.ts spacing rules.',
    });
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-select',
    );

    // act
    const group = await fixture.service.confirmDeliveryGroup(proposal.id, {
      reason: '  Deliver together for the release cut.  ',
    });

    // assert
    const attestation = {
      attestedAt: '2026-08-07T00:00:00.000Z',
      reason: 'Deliver together for the release cut.',
    };
    expect(group.operatorAttestation).toEqual(attestation);
    expect(fixture.repository.listDeliveryGroups()[0]?.operatorAttestation).toEqual(attestation);
    expect(
      fixture.repository
        .listDeliveryGroupProposals()
        .find((candidate) => candidate.id === proposal.id),
    ).toMatchObject({ state: 'confirmed', operatorAttestation: attestation });
  });

  it('refuses an attested confirmation when a member already carries an active claim', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      revision: 1,
      title: 'Sidebar collapse regression',
      body: 'Fix libs/tenant/TenantDialog.ts focus loop.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 2,
      title: 'Print layout overflow',
      body: 'Adjust libs/tenant/TenantDialog.ts spacing rules.',
      coordination: {
        state: 'claimed',
        claimId: 'refs/heads/symphony/claims/abc@sha',
        action: 'solve',
      },
    });
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'manual-select',
    );

    // act
    const confirmAttested = fixture.service.confirmDeliveryGroup(proposal.id, {
      reason: 'Deliver together anyway.',
    });

    // assert
    await expect(confirmAttested).rejects.toThrow(
      'The operator attestation cannot bypass a safety gate: a member work item already carries an active claim.',
    );
    expect(fixture.repository.listDeliveryGroups()).toEqual([]);
  });

  it('keeps the evidence gates binding for an automatic proposal despite an attestation', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setHydrateOriginalWorkItemDetails(true);
    fixture.setItem({
      ...fixture.getItem(),
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      boardColumnId: 'qualified',
      revision: 1,
      title: 'Sidebar collapse regression',
      body: 'Fix libs/tenant/TenantDialog.ts focus loop.',
    });
    fixture.addWorkItem({
      ...fixture.getItem(),
      id: 'item-2',
      externalId: '#2',
      revision: 2,
      title: 'Print layout overflow',
      body: 'Adjust libs/tenant/TenantDialog.ts spacing rules.',
    });
    const proposal = await fixture.service.assessDeliveryGroup(
      ['item-1', 'item-2'],
      'item-1',
      'automatic',
    );

    // act
    const confirmAttested = fixture.service.confirmDeliveryGroup(proposal.id, {
      reason: 'Deliver together anyway.',
    });

    // assert
    await expect(confirmAttested).rejects.toThrow(
      'The relationship assessment does not satisfy the delivery-group gates.',
    );
    expect(fixture.repository.listDeliveryGroups()).toEqual([]);
  });

  it('inherits the delivery-group scope from the source execution for a CI repair', async () => {
    // arrange
    const fixture = createFixture(false);
    const rootItem = fixture.getItem();
    const memberSnapshot: IWorkItem = { ...rootItem, id: 'item-2', externalId: '#2' };
    fixture.repository.saveDeliveryGroup(activeDeliveryGroup('group-1', ['item-1', 'item-2']));
    const sourceExecution: IExecutionRecord = {
      id: 'execution-source',
      workItemId: 'item-1',
      deliveryGroupId: 'group-1',
      workItemIds: ['item-1', 'item-2'],
      workItemRevisions: { 'item-1': 1, 'item-2': 2 },
      workItemSnapshots: [rootItem, memberSnapshot],
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      workspacePath: '/managed-workspaces/test',
      workspaceReference: 'codex/issue-1-test-work',
    };
    const diagnosis: IExecutionRecord = {
      id: 'execution-diagnosis',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:10:00.000Z',
      summary: 'The formatter check fails on libs/tenant/TenantDialog.ts.',
    };
    const delivery: IAgenticDeliveryRecord = {
      id: 'agentic-delivery-1',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      ciRunId: 'run-1',
      runAttempt: 1,
      pullRequestNumber: 17,
      workItemId: 'item-1',
      sourceExecutionId: 'execution-source',
      state: 'classified',
      fingerprint: 'fingerprint-1',
      attempt: 1,
      observedAt: '2026-08-06T00:05:00.000Z',
      updatedAt: '2026-08-06T00:05:00.000Z',
    };

    // act
    const repair = await fixture.service.startAgenticDeliveryRepair(
      rootItem,
      sourceExecution,
      diagnosis,
      delivery,
      { runId: 'run-1', jobs: [] },
      { ...defaultAgenticDeliveryPolicy, enabled: true, sourceRepairEnabled: true },
    );

    // assert
    await fixture.terminalEvent;
    await waitUntil(() => fixture.publishedNotes.length > 0, 'the repair delivery note');
    expect(repair).toMatchObject({
      kind: 'revision',
      skillFlowRole: 'ci-repair',
      parentExecutionId: 'execution-diagnosis',
      deliveryGroupId: 'group-1',
      workItemIds: ['item-1', 'item-2'],
      workItemRevisions: { 'item-1': 1, 'item-2': 2 },
      workspacePath: '/managed-workspaces/test',
      workspaceReference: 'codex/issue-1-test-work',
    });
    expect(repair.workItemSnapshots?.map((snapshot) => snapshot.id)).toEqual(['item-1', 'item-2']);
  });

  it('inherits the delivery-group scope from the source execution for a CI diagnosis', async () => {
    // arrange
    const fixture = createFixture(false);
    const rootItem = fixture.getItem();
    const memberSnapshot: IWorkItem = { ...rootItem, id: 'item-2', externalId: '#2' };
    fixture.repository.saveDeliveryGroup(activeDeliveryGroup('group-1', ['item-1', 'item-2']));
    const sourceExecution: IExecutionRecord = {
      id: 'execution-source',
      workItemId: 'item-1',
      deliveryGroupId: 'group-1',
      workItemIds: ['item-1', 'item-2'],
      workItemRevisions: { 'item-1': 1, 'item-2': 2 },
      workItemSnapshots: [rootItem, memberSnapshot],
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      workspacePath: '/managed-workspaces/test',
      workspaceReference: 'codex/issue-1-test-work',
    };
    const delivery: IAgenticDeliveryRecord = {
      id: 'agentic-delivery-1',
      workspaceId: 'workspace-1',
      repositoryBindingId: 'repository-1',
      ciRunId: 'run-1',
      runAttempt: 1,
      pullRequestNumber: 17,
      workItemId: 'item-1',
      sourceExecutionId: 'execution-source',
      state: 'observed',
      fingerprint: 'fingerprint-1',
      attempt: 1,
      observedAt: '2026-08-06T00:05:00.000Z',
      updatedAt: '2026-08-06T00:05:00.000Z',
    };

    // act
    const diagnosis = await fixture.service.startAgenticDeliveryDiagnosis(
      rootItem,
      sourceExecution,
      delivery,
      { runId: 'run-1', jobs: [] },
      { ...defaultAgenticDeliveryPolicy, enabled: true, aiDiagnosisEnabled: true },
    );

    // assert
    await fixture.terminalEvent;
    expect(diagnosis).toMatchObject({
      kind: 'analysis',
      skillFlowRole: 'ci-diagnosis',
      parentExecutionId: 'execution-source',
      deliveryGroupId: 'group-1',
      workItemIds: ['item-1', 'item-2'],
      workItemRevisions: { 'item-1': 1, 'item-2': 2 },
      workspacePath: '/managed-workspaces/test',
      workspaceReference: 'codex/issue-1-test-work',
    });
    expect(diagnosis.workItemSnapshots?.map((snapshot) => snapshot.id)).toEqual([
      'item-1',
      'item-2',
    ]);
  });

  it('reports a foreign instance only when the shared claim is actually contended', async () => {
    // act
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      undefined,
      true,
    );

    // assert
    await expect(fixture.service.start(false)).rejects.toThrow(
      'Work item #1 is claimed by another Symphony instance.',
    );
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(fixture.transitions).toEqual([]);
    expect(fixture.repository.listExecutions()).toEqual([]);
    expect(fixture.coordinationEvents).toEqual(['acquire:analyze']);
  });

  it('persists a successful execution while the claimed item remains ready', async () => {
    // arrange
    const fixture = createFixture(false);
    const started = await fixture.service.start(false);
    // act
    await fixture.terminalEvent;

    // assert
    expect(started.state).toBe('running');
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      summary: 'Plan persisted.',
      workItemClaim: { action: 'solve', owner: 'test-user' },
    });
    expect(fixture.getItem().stageId).toBe('qualified');
    expect(fixture.transitions).toEqual([]);
    expect(fixture.getItem().assignees).toEqual([]);
    expect(fixture.workspacePurposes).toEqual(['analysis']);
    expect(fixture.repository.listEvents().map((event) => event.kind)).toContain(
      'analysis.completed',
    );
    expect(
      fixture.repository.listEvents().find((event) => event.kind === 'agent.progress'),
    ).toMatchObject({ origin: 'agent', category: 'status' });
    expect(fixture.releasedWorkspaces).toEqual(['/managed-workspaces/test']);
    expect(fixture.coordinationEvents).toEqual(['acquire:analyze', 'advance:solve']);
  });

  it('persists an execution that satisfies the renderer contract', async () => {
    // The wire contract is a hand-maintained duplicate of the execution record. Validating what
    // the service really writes catches a contract that drifted stricter than its producer, which
    // otherwise reaches the operator only as a failed execution-state synchronization.
    // arrange
    const fixture = createFixture(false);
    await fixture.service.start(false);
    await fixture.terminalEvent;

    // act
    const parsed = executionRecordSchema.safeParse(fixture.repository.listExecutions()[0]);

    // assert
    expect(parsed.error?.issues ?? []).toEqual([]);
  });

  it('reports an analysis without a Definition of ready as rework rather than a pass', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.');
    await fixture.service.start(false);

    // act
    await fixture.terminalEvent;

    // assert
    const reported = fixture.reportedRunResults.find((result) => result.role === 'analyze');
    expect(reported).toMatchObject({ outcome: 'rework', reasonCode: 'analysis-incomplete' });
    expect(reported?.analysis).toBeUndefined();
    // Claiming a revision for an analysis nobody stored is what makes the readiness guards
    // contradict each other.
    expect(reported?.revisions?.analysisRevision).toBeUndefined();
  });

  it('reports an analysis carrying a Definition of ready as a pass with its artifact', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      [
        '## Problem and evidence',
        '',
        'The renderer drops drafts on restart.',
        '',
        '## Definition of ready',
        '',
        '```json',
        JSON.stringify({
          feasible: true,
          ready_for_solve: true,
          unresolved_questions: [],
          test_strategy: ['unit'],
          acceptance_mapping: [
            {
              criterion: 'Drafts survive a restart',
              implementation_step: 1,
              verification: 'unit test',
            },
          ],
          risk: { class: 'low', reasons: [] },
        }),
        '```',
      ].join('\n'),
    );
    await fixture.service.start(false);

    // act
    await fixture.terminalEvent;

    // assert
    const reported = fixture.reportedRunResults.find((result) => result.role === 'analyze');
    expect(reported?.outcome).toBe('pass');
    expect(reported?.analysis).toMatchObject({ readyForSolve: true, feasible: true });
    expect(reported?.revisions?.analysisRevision).toEqual(expect.any(String));
  });

  it('publishes a completed analysis on the tracked item', async () => {
    // arrange
    const fixture = createFixture(false);
    await fixture.service.start(false);
    await fixture.terminalEvent;
    // act
    await waitUntil(() => fixture.publishedNotes.length > 0, 'the published analysis note');

    // assert
    expect(fixture.publishedNotes).toEqual([
      {
        workItemId: 'item-1',
        note: { kind: 'analysis', heading: 'Symphony analysis', body: 'Plan persisted.' },
      },
    ]);
  });

  it('keeps a succeeded analysis when the work tracker rejects the note', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.setPublishNoteError(new Error('Issue comments are disabled.'));
    await fixture.service.start(false);
    await fixture.terminalEvent;
    // act
    await waitUntil(
      () =>
        fixture.repository
          .listEvents()
          .some((event) => event.message.includes('could not be published')),
      'the publication failure event',
    );

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      summary: 'Plan persisted.',
    });
    // Recorded as a warning on purpose: a failure event marks the whole execution as failed for
    // every reader of the run stream, and this analysis succeeded.
    expect(fixture.repository.listEvents().at(-1)).toMatchObject({
      kind: 'execution.warning',
      message: 'The analysis could not be published on #1: Issue comments are disabled.',
    });
  });

  it('publishes a manually completed analysis on the tracked item', async () => {
    // arrange
    const fixture = createFixture(false);

    // act
    await fixture.service.completeManualAnalysis('item-1', 'Approved analysis.');

    // assert
    expect(fixture.publishedNotes).toEqual([
      {
        workItemId: 'item-1',
        note: { kind: 'analysis', heading: 'Symphony analysis', body: 'Approved analysis.' },
      },
    ]);
  });

  it('persists failure without moving the claimed item out of Ready', async () => {
    // arrange
    const fixture = createFixture(true);
    await fixture.service.start(true);
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'failed',
      error: 'Expected test failure.',
    });
    expect(fixture.getItem().stageId).toBe('qualified');
    expect(fixture.repository.listEvents().at(-1)?.kind).toBe('execution.failed');
    expect(fixture.preservedWorkspaces).toEqual(['/managed-workspaces/test']);
  });

  it('fails an analysis that references a plan document instead of reporting it inline', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'I analyzed issue #85 read-only and wrote the plan to plans/follow-this-skill-for-unified-bee.md.',
    );

    await fixture.service.start(true);
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'failed',
      error: expect.stringContaining('referenced a document instead of reporting the plan'),
    });
    expect(fixture.getItem().stageId).toBe('qualified');
    expect(fixture.repository.listEvents().map((event) => event.kind)).not.toContain(
      'analysis.completed',
    );
  });

  it('releases failed workspaces automatically when retention is disabled', async () => {
    // arrange
    const fixture = createFixture(true, true, 'unused', 'qualified', false, false);

    await fixture.service.start(true, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.releasedWorkspaces).toEqual(['/managed-workspaces/test']);
    expect(fixture.preservedWorkspaces).toEqual([]);
  });

  it('cancels a running AI execution and preserves its workspace without recording a failure', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'qualified', true);
    const started = await fixture.service.start(false, 'item-1');

    const cancelled = await fixture.service.cancelExecution(started.id);
    // act
    await fixture.terminalEvent;

    // assert
    expect(cancelled).toMatchObject({
      id: started.id,
      state: 'cancelled',
    });
    expect(cancelled.error).toBeUndefined();
    expect(fixture.preservedWorkspaces).toEqual(['/managed-workspaces/test']);
    expect(fixture.repository.listEvents().at(-1)).toMatchObject({
      executionId: started.id,
      kind: 'execution.cancelled',
    });
    expect(
      fixture.repository
        .listEvents()
        .some((event) => event.executionId === started.id && event.kind === 'execution.failed'),
    ).toBe(false);
  });

  it('reports and cancels every active execution before application shutdown', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'qualified', true);
    const started = await fixture.service.start(false, 'item-1');

    // act
    const actual = fixture.service.activeExecutionRecords();

    // assert
    expect(actual).toEqual([expect.objectContaining({ id: started.id, state: 'running' })]);

    const cancelled = await fixture.service.cancelActiveExecutions();
    await fixture.terminalEvent;

    expect(cancelled).toEqual([expect.objectContaining({ id: started.id, state: 'cancelled' })]);
    expect(fixture.service.activeExecutionRecords()).toEqual([]);
  });

  it('pauses an active execution durably so a later application start can resume it', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'qualified', true);
    const started = await fixture.service.start(false, 'item-1');

    // act
    const paused = await fixture.service.pauseActiveExecutions();

    // assert
    expect(paused).toEqual([
      expect.objectContaining({
        id: started.id,
        state: 'waiting',
        continuationReference: 'codex-session-1',
        pause: expect.objectContaining({ reason: 'lifecycle' }),
      }),
    ]);
    expect(fixture.repository.listEvents().at(-1)).toMatchObject({
      executionId: started.id,
      kind: 'agent.progress',
      message: expect.stringContaining('available for reactivation'),
    });
    expect(fixture.service.activeExecutionRecords()).toEqual([]);
  });

  it('pauses one execution for the operator, frees its slot, and resumes it explicitly', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'qualified', true);
    const started = await fixture.service.start(false, 'item-1');

    // act
    const paused = await fixture.service.pauseExecution(started.id);

    // assert
    expect(paused).toMatchObject({
      id: started.id,
      state: 'waiting',
      continuationReference: 'codex-session-1',
      pause: { reason: 'operator', pausedAt: '2026-08-07T00:00:00.000Z' },
    });
    expect(fixture.service.executionCapacity()).toEqual({ maximum: 3, active: 0, available: 3 });
    await fixture.service.recoverInterruptedExecutions();
    expect(fixture.service.activeExecutionRecords()).toEqual([]);

    const resumed = await fixture.service.resumeExecution(started.id);

    expect(resumed).toMatchObject({ id: started.id, state: 'waiting' });
    expect(resumed.pause).toBeUndefined();
    expect(fixture.service.executionCapacity()).toEqual({ maximum: 3, active: 1, available: 2 });
    await fixture.service.cancelActiveExecutions();
  });

  it('queues an operator-requested resume and starts it when capacity becomes available', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      true,
      true,
      undefined,
      false,
      1,
    );
    fixture.addWorkItem({ ...fixture.getItem(), id: 'item-2', externalId: '#2' });
    const started = await fixture.service.start(false, 'item-1');
    await fixture.service.pauseExecution(started.id);
    await fixture.service.start(false, 'item-2');

    // act
    const queued = await fixture.service.resumeExecution(started.id);

    // assert
    expect(queued.pause).toMatchObject({
      reason: 'operator',
      resumeRequestedAt: '2026-08-07T00:00:00.000Z',
    });
    expect(fixture.service.executionCapacity()).toEqual({ maximum: 1, active: 1, available: 0 });

    await fixture.service.cancelActiveExecutions();
    await expect
      .poll(() => fixture.service.activeExecutionRecords())
      .toContainEqual(expect.objectContaining({ id: started.id }));
    expect(
      fixture.repository.listExecutions().find(({ id }) => id === started.id)?.pause,
    ).toBeUndefined();
    expect(fixture.service.activeExecutionRecords()).toContainEqual(
      expect.objectContaining({ id: started.id }),
    );
    await fixture.service.cancelActiveExecutions();
  });

  it('resumes a lifecycle-paused execution that still holds the only execution slot', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      true,
      true,
      undefined,
      false,
      1,
    );
    const started = await fixture.service.start(false, 'item-1');
    await fixture.service.pauseActiveExecutions();
    expect(fixture.service.executionCapacity()).toEqual({ maximum: 1, active: 1, available: 0 });

    // act
    const resumed = await fixture.service.resumeExecution(started.id);

    // assert
    expect(resumed).toMatchObject({ id: started.id, state: 'waiting' });
    expect(resumed.pause).toBeUndefined();
    expect(fixture.service.activeExecutionRecords()).toContainEqual(
      expect.objectContaining({ id: started.id }),
    );
    await fixture.service.cancelActiveExecutions();
  });

  it('restarts a live execution from its continuation during lifecycle reconciliation', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'qualified', true);
    const started = await fixture.service.start(false, 'item-1');

    // act
    const reactivated = await fixture.service.reconcileActiveExecutions();

    // assert
    expect(reactivated).toBe(1);
    expect(fixture.service.activeExecutionRecords()).toEqual([
      expect.objectContaining({
        id: started.id,
        state: expect.stringMatching(/^(?:running|waiting)$/u),
        continuationReference: 'codex-session-1',
      }),
    ]);
    // A reactivated execution is live again, so nothing may present it as parked.
    expect(fixture.service.activeExecutionRecords()[0]?.pause).toBeUndefined();
    await fixture.service.cancelActiveExecutions();
  });

  it('classifies a provider result that says analysis did not run as a failure', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Analysis could not start because preflight failed.',
    );
    await fixture.service.start(false);
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'failed',
      error: expect.stringContaining('could not start'),
    });
    expect(fixture.getItem().stageId).toBe('qualified');
  });

  it('reconciles an execution that was interrupted by an application restart', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.repository.saveExecution({
      id: 'execution-interrupted',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      mode: 'ai',
      kind: 'analysis',
      skillId: 'repository:issue-analyzer',
      state: 'running',
      startedAt: '2026-08-07T00:00:00.000Z',
      workspacePath: '/managed-workspaces/interrupted',
      continuationReference: 'codex-session-interrupted',
      workItemSnapshot: fixture.getItem(),
    });

    await fixture.service.recoverInterruptedExecutions();
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      id: 'execution-interrupted',
      state: 'succeeded',
      summary: 'Plan persisted.',
      continuationReference: 'codex-session-1',
    });
    expect(fixture.repository.listEvents().at(-1)).toMatchObject({
      executionId: 'execution-interrupted',
      kind: 'analysis.completed',
    });
    expect(fixture.analysisContinuations).toEqual(['codex-session-interrupted']);
    expect(fixture.releasedWorkspaces).toContain('/managed-workspaces/interrupted');
  });

  it('waits and resumes the same Codex session after a transient interruption', async () => {
    // arrange
    const fixture = createFixture('interrupt-once');

    const started = await fixture.service.start(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      id: started.id,
      state: 'succeeded',
      attempt: 2,
      continuationReference: 'codex-session-1',
    });
    expect(fixture.analysisContinuations).toEqual([undefined, 'codex-session-1']);
    expect(fixture.repository.listEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          executionId: started.id,
          kind: 'agent.progress',
          message: expect.stringContaining('keep reactivating'),
        }),
        expect.objectContaining({
          executionId: started.id,
          kind: 'analysis.completed',
        }),
      ]),
    );
  });

  it('falls back to the same durable workspace when the saved Codex session is unavailable', async () => {
    // arrange
    const fixture = createFixture('continuation-unavailable-once');

    await fixture.service.start(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      attempt: 2,
      continuationReference: 'codex-session-1',
    });
    expect(fixture.analysisContinuations).toEqual([undefined, undefined]);
    expect(fixture.repository.listEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining('durable workspace'),
        }),
      ]),
    );
  });

  it('does not start work for an item the user did not select', async () => {
    // act
    // arrange
    const fixture = createFixture(false);

    // assert
    await expect(fixture.service.start(false, 'missing-item')).rejects.toThrow(
      'Unknown work item: missing-item',
    );
    expect(fixture.repository.listExecutions()).toHaveLength(0);
  });

  it('rejects analysis before workspace preparation when no analysis skill is active', async () => {
    // act
    // arrange
    const fixture = createFixture(false, false);

    // assert
    await expect(fixture.service.start(false, 'item-1')).rejects.toThrow(
      'Activate an analysis skill',
    );
    expect(fixture.repository.listExecutions()).toHaveLength(0);
    expect(fixture.transitions).toEqual([]);
  });

  it('records a manual analysis without a skill, agent request, or workspace', async () => {
    // arrange
    const fixture = createFixture(false, false);

    // act
    const execution = await fixture.service.completeManualAnalysis(
      'item-1',
      '  ## Manual analysis\n\nKeep the renderer boundary intact.  ',
    );

    // assert
    expect(execution).toMatchObject({
      mode: 'manual',
      kind: 'analysis',
      state: 'succeeded',
      summary: '## Manual analysis\n\nKeep the renderer boundary intact.',
    });
    expect(execution).not.toHaveProperty('skillId');
    expect(execution).not.toHaveProperty('workspacePath');
    expect(fixture.analysisRequests).toEqual([]);
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(fixture.transitions).toEqual([]);
    expect(fixture.repository.listEvents().map((event) => event.kind)).toEqual([
      'execution.started',
      'analysis.completed',
    ]);
  });

  it('re-analyzes a selected ready item without changing its board column', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Updated plan.', 'qualified');

    const execution = await fixture.service.start(
      false,
      'item-1',
      'Concentrate on the renderer boundary.',
    );
    // act
    await fixture.terminalEvent;

    // assert
    expect(execution).toMatchObject({
      kind: 'analysis',
      request: 'Concentrate on the renderer boundary.',
    });
    expect(fixture.analysisRequests).toEqual(['Concentrate on the renderer boundary.']);
    // The agent works from the complete item, discussion included: comments carry decisions
    // the body never received.
    expect(fixture.analysisWorkItems).toEqual([
      expect.objectContaining({
        detailState: 'complete',
        comments: [expect.objectContaining({ id: 'comment-1' })],
      }),
    ]);
    expect(fixture.transitions).toEqual([]);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      summary: 'Updated plan.',
    });
  });

  it('starts a Solver revision from a successful analysis and records the feedback', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      workspacePath: '/managed-workspaces/analysis-1',
      summary: 'Approved analysis.',
    });
    fixture.repository.saveExecution({
      id: 'solution-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-solver',
      kind: 'solution',
      parentExecutionId: 'analysis-1',
      state: 'succeeded',
      startedAt: '2026-08-06T01:00:00.000Z',
      finishedAt: '2026-08-06T01:01:00.000Z',
      workspacePath: '/managed-workspaces/solution-1',
      summary: 'Initial implementation.',
    });

    const execution = await fixture.service.startSolution(false, 'item-1', 'Keep the API stable.');
    // act
    await fixture.terminalEvent;

    // assert
    expect(execution).toMatchObject({
      kind: 'revision',
      parentExecutionId: 'solution-1',
      request: 'Keep the API stable.',
      workspaceReference: 'codex/issue-1-test-work',
    });
    expect(fixture.getItem().stageId).toBe('progress');
    expect(fixture.transitions).toEqual([]);
    expect(fixture.workspacePurposes).toEqual(['implementation']);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      summary: 'Revision applied: Keep the API stable.',
    });
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      workItemClaim: { releasedAt: '2026-08-07T00:00:00.000Z' },
    });
    expect(fixture.preservedWorkspaces).toContain('/managed-workspaces/test');
    expect(fixture.releasedWorkspaces).not.toContain('/managed-workspaces/test');
    expect(fixture.coordinationEvents).toEqual(['acquire:solve', 'release']);
  });

  it('repairs a red repository check inside the run instead of failing the implementation', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.setVerificationRepairAttempts(2);
    let verificationRuns = 0;
    fixture.setVerificationChecks(() => {
      verificationRuns += 1;
      return verificationRuns === 1
        ? [
            {
              label: 'yarn test',
              state: 'failed' as const,
              detail: 'yarn test failed (exit 1).',
              output: 'FAIL password.spec.ts - expected 401, received 200',
            },
          ]
        : [{ label: 'yarn test', state: 'passed' as const }];
    });
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    // act
    await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      verificationAttempt: 1,
    });
    // The repair round sees the failing output, not the label - a label cannot be repaired.
    expect(fixture.solutionRequests).toHaveLength(2);
    expect(fixture.solutionRequests[1]).toContain('expected 401, received 200');
    // It also works on the worktree the first round changed, so nothing is implemented twice.
    expect(fixture.solutionWorkspaces).toEqual([
      '/managed-workspaces/test',
      '/managed-workspaces/test',
    ]);
    expect(fixture.preparedWorkspaces).toHaveLength(1);
  });

  it('fails the implementation once the repair budget is spent', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.setVerificationRepairAttempts(1);
    fixture.setVerificationChecks(() => [
      { label: 'yarn test', state: 'failed' as const, detail: 'yarn test failed (exit 1).' },
    ]);
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    // act
    await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    // assert
    expect(fixture.solutionRequests).toHaveLength(2);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'failed',
      verificationAttempt: 1,
      error: 'yarn test failed (exit 1).',
    });
  });

  it('refuses to repair a contract violation, which repeating would only repeat', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.setVerificationRepairAttempts(3);
    fixture.setWorkspaceChanges({ changedFiles: ['.env'], diffLines: 4 });
    fixture.setVerificationChecks(() => [
      { label: 'yarn test', state: 'failed' as const, detail: 'yarn test failed (exit 1).' },
    ]);
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    // act
    await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    // assert
    expect(fixture.solutionRequests).toHaveLength(1);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'failed',
      error: expect.stringContaining('.env'),
    });
  });

  it('continues the retained worktree of a failed run instead of branching again', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });
    fixture.repository.saveExecution({
      id: 'solution-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-solver',
      kind: 'solution',
      parentExecutionId: 'analysis-1',
      state: 'failed',
      startedAt: '2026-08-06T01:00:00.000Z',
      finishedAt: '2026-08-06T01:01:00.000Z',
      workspacePath: '/managed-workspaces/solution-1',
      workspaceReference: 'codex/issue-1-test-work',
      error: 'yarn test failed (exit 1).',
    });

    // act
    const execution = await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    // assert
    expect(execution).toMatchObject({
      kind: 'revision',
      parentExecutionId: 'solution-1',
      workspacePath: '/managed-workspaces/solution-1',
      workspaceReference: 'codex/issue-1-test-work',
    });
    // No second worktree, no second branch: the work that was already accepted stays put.
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(fixture.solutionWorkspaces).toEqual(['/managed-workspaces/solution-1']);
    expect(fixture.solutionRequests[0]).toContain('yarn test failed (exit 1).');
  });

  it('starts clean when the failed run left no workspace to continue', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });
    fixture.repository.saveExecution({
      id: 'solution-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-solver',
      kind: 'solution',
      parentExecutionId: 'analysis-1',
      state: 'failed',
      startedAt: '2026-08-06T01:00:00.000Z',
      finishedAt: '2026-08-06T01:01:00.000Z',
      error: 'The Solver workspace could not be prepared.',
    });

    // act
    const execution = await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    // assert
    expect(execution).toMatchObject({
      kind: 'solution',
      parentExecutionId: 'analysis-1',
      workspacePath: '/managed-workspaces/test',
    });
    expect(fixture.preparedWorkspaces).toHaveLength(1);
  });

  it('keeps a finished analysis when the claim cannot be handed to the next step', async () => {
    // Regression: a tracker failure while advancing the claim discarded an analysis that had just
    // been produced, so hours of work were thrown away and the board only showed the GitHub error.
    // arrange
    const fixture = createFixture(false);
    fixture.setClaimAdvanceError(new Error('GitHub request timed out.'));

    const execution = await fixture.service.start(false, 'item-1');
    await fixture.terminalEvent;

    // act
    const stored = fixture.repository
      .listExecutions()
      .find((candidate) => candidate.id === execution.id);
    // assert
    expect(stored).toMatchObject({ state: 'succeeded' });
    expect(stored?.summary).toBeTruthy();
    // Ownership ends - the next step claims the work item anew - but the result survives.
    expect(stored?.workItemClaim).toMatchObject({ releasedAt: '2026-08-07T00:00:00.000Z' });
    expect(
      fixture.repository
        .listEvents()
        .some((event) => event.message.includes('The result was kept')),
    ).toBe(true);
  });

  it('keeps a running execution alive when the claim lease cannot be renewed', async () => {
    // Regression: every renewal failure ended the run, so a tracker hiccup - or a work item that
    // left the current board listing - killed a long analysis whose ownership was never contested.
    // arrange
    const fixture = createFixture(false);
    fixture.repository.saveExecution(runningExecution());
    fixture.setClaimRenewError(new Error('GitHub request timed out.'));

    // act
    const renewed = await fixture.service.renewActiveClaims();

    // assert
    expect(renewed).toBe(0);
    expect(
      fixture.repository.listExecutions().find((candidate) => candidate.id === 'analysis-running'),
    ).toMatchObject({ state: 'running' });
    expect(
      fixture.repository.listEvents().some((event) => event.message.includes('will be retried')),
    ).toBe(true);
  });

  it('ends a running execution whose work item was taken over elsewhere', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.repository.saveExecution(runningExecution());
    fixture.setClaimRenewError(
      new WorkItemClaimLostError('Work item #1 was taken over by another Symphony instance.', '#1'),
    );

    // act
    await fixture.service.renewActiveClaims();

    // assert
    expect(
      fixture.repository.listExecutions().find((candidate) => candidate.id === 'analysis-running'),
    ).toMatchObject({
      state: 'failed',
      error: 'Work item #1 was taken over by another Symphony instance.',
    });
  });

  it('re-claims a work item whose inherited claim disappeared instead of failing the retry', async () => {
    // arrange
    const fixture = createFixture(false);
    // What a run that died mid-flight leaves behind: a failed analysis that still records the
    // claim, so the retry stays the same owner - except the shared reference is gone by now.
    fixture.repository.saveExecution({
      id: 'analysis-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      skillId: 'repository:issue-analyzer',
      kind: 'analysis',
      state: 'failed',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:10:00.000Z',
      error: 'GitHub request timed out.',
      workItemClaim: {
        id: 'refs/heads/symphony/claims/abc@dead',
        workItemId: 'item-1',
        action: 'analyze',
        owner: 'test-user',
        acquiredAt: '2026-08-06T00:00:00.000Z',
      },
    });
    fixture.setClaimReferenceMissing(true);

    const execution = await fixture.service.start(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(execution).toMatchObject({ kind: 'analysis', state: 'running' });
    // The dead claim is tried once, written off, and replaced - the operator's retry runs, and
    // the result survives the same loss at the finish line instead of being thrown away.
    expect(fixture.coordinationEvents).toEqual([
      'advance:analyze',
      'acquire:analyze',
      'advance:solve',
    ]);
    expect(
      fixture.repository.listExecutions().find((candidate) => candidate.id === 'analysis-1'),
    ).toMatchObject({ workItemClaim: { releasedAt: '2026-08-07T00:00:00.000Z' } });
    expect(execution.workItemClaim).toMatchObject({ id: `claim-${execution.id}` });
    expect(
      fixture.repository.listExecutions().find((candidate) => candidate.id === execution.id),
    ).toMatchObject({
      state: 'succeeded',
      workItemClaim: { releasedAt: '2026-08-07T00:00:00.000Z' },
    });
  });

  it('keeps a running employee binding when responsibility changes for the next phase', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    const goal = await fixture.service.delegateWorkItem(
      'item-1',
      'delivery-team',
      'architect-agent',
      'Implement the ticket.',
    );
    fixture.repository.saveGoal({
      ...goal,
      state: 'implementing',
      currentExecutionId: 'active-execution',
      executingAgentId: 'implementer-agent',
    });
    // act
    const next = await fixture.service.delegateWorkItem(
      'item-1',
      'delivery-team',
      'architect-agent',
      'Review the next phase.',
    );
    // assert
    expect(next).toMatchObject({
      id: goal.id,
      state: 'implementing',
      currentExecutionId: 'active-execution',
      executingAgentId: 'implementer-agent',
      assignment: { responsibleAgentId: 'architect-agent', objective: 'Review the next phase.' },
    });
  });

  it('keeps a delegated goal open until deterministic evidence is reviewed', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    // act
    const delegated = await fixture.service.delegateWorkItem(
      'item-1',
      'delivery-team',
      'architect-agent',
      'Implement the approved ticket without scope drift.',
    );
    // assert
    expect(delegated).toMatchObject({
      state: 'planning',
      assignment: {
        agentTeamId: 'delivery-team',
        responsibleAgentId: 'architect-agent',
      },
    });
    await expect(fixture.service.reviewGoal('item-1', 'approved', 'Looks good.')).rejects.toThrow(
      'passing verification evidence',
    );
    fixture.repository.saveExecution({
      id: 'analysis-goal',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: '# Acceptance criteria\n\n- Preserve the approved scope.',
    });

    await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;

    expect(fixture.service.listGoals()[0]).toMatchObject({
      state: 'reviewing',
      currentRole: 'pull-request-review',
      verificationReports: [
        expect.objectContaining({
          state: 'passed',
          checks: [{ label: 'Implementation contract scope', state: 'passed' }],
        }),
      ],
    });
    await expect(
      fixture.service.reviewGoal('item-1', 'approved', 'Evidence accepted.'),
    ).resolves.toMatchObject({
      state: 'achieved',
      reviewDecisions: [expect.objectContaining({ decision: 'approved' })],
    });
    expect(fixture.publishedNotes.at(-1)).toEqual({
      workItemId: 'item-1',
      note: {
        kind: 'acceptance',
        heading: 'Symphony acceptance',
        body: 'Evidence accepted.',
        details: [{ label: 'Decision', value: 'Approved' }],
      },
    });
  });

  it('rebinds a stale zero-budget goal contract to the implementing position before solving', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'progress',
      false,
      true,
      undefined,
      false,
      3,
      {
        'position-architecture': readOnlyPositionPolicy,
        'position-implementation': { ...readOnlyPositionPolicy, ...implementationBudget },
      },
    );
    await fixture.service.delegateWorkItem(
      'item-1',
      'delivery-team',
      'architect-agent',
      'Implement the approved ticket without scope drift.',
    );
    fixture.repository.saveExecution({
      id: 'analysis-goal',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });
    const goal = fixture.service.listGoals()[0]!;
    fixture.repository.saveGoal({ ...goal, implementationContract: zeroBudgetContract });

    await fixture.service.startSolution(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.solutionRequests).toEqual([undefined]);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      kind: 'solution',
      state: 'succeeded',
    });
    expect(fixture.service.listGoals()[0]?.implementationContract).toMatchObject({
      id: 'contract-blocked',
      instructions: 'Approved analysis.',
      maximumChangedFiles: implementationBudget.maximumChangedFiles,
      maximumDiffLines: implementationBudget.maximumDiffLines,
    });
  });

  it('fails a solution before the agent starts when the implementing position allows no changes', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'progress',
      false,
      true,
      undefined,
      false,
      3,
      {
        'position-architecture': readOnlyPositionPolicy,
        'position-implementation': readOnlyPositionPolicy,
      },
    );
    fixture.repository.saveExecution({
      id: 'analysis-goal',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    await fixture.service.startSolution(false, 'item-1');
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.solutionRequests).toEqual([]);
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      kind: 'solution',
      state: 'failed',
      error: expect.stringContaining('allows no changes'),
    });
  });

  it('never freezes the read-only analysis budget into a new goal contract', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      undefined,
      false,
      3,
      {
        'position-architecture': readOnlyPositionPolicy,
        'position-implementation': { ...readOnlyPositionPolicy, ...implementationBudget },
      },
    );

    await fixture.service.start(false);
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.service.listGoals()[0]?.implementationContract).toMatchObject({
      maximumChangedFiles: 100,
      maximumDiffLines: 20_000,
    });
  });

  it('delivers a remotely authorized implementation branch after the Solver succeeds', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-remote',
      workspaceId: 'personal',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    await fixture.service.startSolutionForWorkItem(
      fixture.getItem(),
      'Run the formatter and update the pull request.',
      { origin: 'remote', signalId: 'github-comment-91', actorLogin: 'octocat' },
    );
    // act
    await fixture.terminalEvent;

    // assert
    expect(fixture.repository.listExecutions()[0]).toMatchObject({
      state: 'succeeded',
      automationOrigin: 'remote',
      automationSignalId: 'github-comment-91',
      triggeredBy: 'octocat',
      pullRequest: { number: 17 },
    });
    expect(fixture.deliveredExecutionIds).toEqual([expect.stringMatching(/^execution-/u)]);
  });

  it('rejects a fourth concurrent AI execution at the configured global capacity', async () => {
    // arrange
    const fixture = createFixture(false);
    // act
    for (const index of [1, 2, 3]) {
      fixture.repository.saveExecution({
        id: `running-${index}`,
        workspaceId: 'personal',
        workItemId: `other-item-${index}`,
        workflowId: defaultWorkflow.id,
        kind: 'analysis',
        state: 'running',
        startedAt: '2026-08-06T00:00:00.000Z',
      });
    }

    // assert
    await expect(fixture.service.start(false, 'item-1')).rejects.toThrow(
      'Execution capacity is full (3 active of 3).',
    );
    expect(fixture.preparedWorkspaces).toEqual([]);
  });

  it('queues a manual analysis instead of refusing it when execution capacity is full', async () => {
    // arrange
    const fixture = createFixture(false);
    for (const index of [1, 2, 3]) {
      fixture.repository.saveExecution({
        id: `running-${index}`,
        workspaceId: 'personal',
        workItemId: `other-item-${index}`,
        workflowId: defaultWorkflow.id,
        kind: 'analysis',
        state: 'running',
        startedAt: '2026-08-06T00:00:00.000Z',
      });
    }

    // act
    const admission = await fixture.service.requestAnalysis(false, 'item-1', 'Focus on the rail.');

    // assert
    expect(admission).toMatchObject({
      outcome: 'queued',
      entry: {
        workItemId: 'item-1',
        workItemExternalId: '#1',
        kind: 'analysis',
        request: 'Focus on the rail.',
        origin: 'operator',
      },
    });
    // Nothing is reserved for a waiting step: no workspace, no claim, no run.
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(fixture.coordinationEvents).toEqual([]);
    expect(
      fixture.repository.listExecutions().filter((execution) => execution.workItemId === 'item-1'),
    ).toEqual([]);
    expect(fixture.service.listExecutionQueue()).toHaveLength(1);
  });

  it('refuses a second waiting step for the same work item', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      undefined,
      false,
      1,
    );
    fixture.repository.saveExecution({
      id: 'running-1',
      workspaceId: 'personal',
      workItemId: 'other-item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'running',
      startedAt: '2026-08-06T00:00:00.000Z',
    });

    // act
    await fixture.service.requestAnalysis(false, 'item-1');

    // assert
    await expect(fixture.service.requestAnalysis(false, 'item-1')).rejects.toThrow(
      'A step for #1 is already waiting for an execution slot.',
    );
    expect(fixture.service.listExecutionQueue()).toHaveLength(1);
  });

  it('starts the oldest waiting step as soon as a slot frees, with autonomy disabled', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      true,
      true,
      undefined,
      false,
      1,
    );
    fixture.addWorkItem({
      id: 'item-2',
      externalId: '#2',
      title: 'Queued work',
      body: 'Waits for a slot.',
      stageId: 'qualified',
      provider: 'test',
      repository: 'test/repository',
      labels: [],
      assignees: [],
      updatedAt: '2026-08-07T00:00:00.000Z',
    });
    const running = await fixture.service.start(false, 'item-1');
    // act
    const admission = await fixture.service.requestAnalysis(false, 'item-2');
    // assert
    expect(admission.outcome).toBe('queued');

    await fixture.service.cancelExecution(running.id);
    await waitUntil(
      () =>
        fixture.repository.listExecutions().some((execution) => execution.workItemId === 'item-2'),
      'the queued analysis to start after the slot was released',
    );

    expect(fixture.service.listExecutionQueue()).toEqual([]);
  });

  it('withdraws a waiting step without touching anything else', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'qualified',
      false,
      true,
      undefined,
      false,
      1,
    );
    fixture.repository.saveExecution({
      id: 'running-1',
      workspaceId: 'personal',
      workItemId: 'other-item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'running',
      startedAt: '2026-08-06T00:00:00.000Z',
    });
    const admission = await fixture.service.requestAnalysis(false, 'item-1');
    if (admission.outcome !== 'queued') throw new Error('The step was not queued.');

    // act
    const removed = fixture.service.removeExecutionQueueEntry(admission.entry.id);

    // assert
    expect(removed.id).toBe(admission.entry.id);
    expect(fixture.service.listExecutionQueue()).toEqual([]);
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(() => fixture.service.removeExecutionQueueEntry(admission.entry.id)).toThrow(
      `Unknown queue entry: ${admission.entry.id}`,
    );
  });

  it('refuses to queue an implementation that has no analysis to build on', async () => {
    // arrange
    const fixture = createFixture(
      false,
      true,
      'Plan persisted.',
      'progress',
      false,
      true,
      undefined,
      false,
      1,
    );
    // act
    fixture.repository.saveExecution({
      id: 'running-1',
      workspaceId: 'personal',
      workItemId: 'other-item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'running',
      startedAt: '2026-08-06T00:00:00.000Z',
    });

    // assert
    await expect(fixture.service.requestSolution(false, 'item-1')).rejects.toThrow(
      'Complete an analysis before starting the Solver.',
    );
    expect(fixture.service.listExecutionQueue()).toEqual([]);
  });

  it('publishes a completed implementation once and persists its pull-request links', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'solution-1',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-07T00:00:00.000Z',
      finishedAt: '2026-08-07T00:01:00.000Z',
      workspacePath: '/managed-workspaces/solution-1',
      workspaceReference: 'codex/issue-1-test-work',
      summary: 'Implementation complete.',
    });

    const delivered = await fixture.service.publishPullRequest('solution-1');
    // act
    const reused = await fixture.service.publishPullRequest('solution-1');

    // assert
    expect(delivered.pullRequest).toEqual({
      number: 17,
      externalUrl: 'https://github.com/test/repository/pull/17',
      branchUrl: 'https://github.com/test/repository/tree/codex%2Fissue-1-test-work',
    });
    expect(reused).toEqual(delivered);
    expect(fixture.deliveredExecutionIds).toEqual(['solution-1']);
    expect(fixture.repository.listEvents().at(-1)).toMatchObject({
      executionId: 'solution-1',
      kind: 'pull-request.created',
    });
    expect(fixture.publishedNotes).toEqual([
      {
        workItemId: 'item-1',
        note: {
          kind: 'delivery',
          heading: 'Symphony pull request',
          body: 'The managed implementation branch was delivered as pull request #17.',
          details: [
            {
              label: 'Pull request',
              value: '#17',
              url: 'https://github.com/test/repository/pull/17',
            },
            {
              label: 'Branch',
              value: 'codex/issue-1-test-work',
              url: 'https://github.com/test/repository/tree/codex%2Fissue-1-test-work',
            },
          ],
        },
      },
    ]);
  });

  it('publishes a completed implementation with its branch on the tracked item', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-implementation',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    await fixture.service.startSolution(false, 'item-1');
    await fixture.terminalEvent;
    // act
    await waitUntil(() => fixture.publishedNotes.length > 0, 'the published implementation note');

    // assert
    expect(fixture.publishedNotes).toEqual([
      {
        workItemId: 'item-1',
        note: {
          kind: 'implementation',
          heading: 'Symphony implementation',
          body: 'Implementation persisted.',
          details: [{ label: 'Branch', value: 'codex/issue-1-test-work' }],
        },
      },
    ]);
  });

  it('publishes a manually recorded implementation without a managed branch', async () => {
    // arrange
    const fixture = createFixture(false, true, 'Plan persisted.', 'progress');
    fixture.repository.saveExecution({
      id: 'analysis-manual-solution',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'succeeded',
      startedAt: '2026-08-06T00:00:00.000Z',
      finishedAt: '2026-08-06T00:01:00.000Z',
      summary: 'Approved analysis.',
    });

    // act
    await fixture.service.completeManualSolution('item-1', 'Fixed by hand.');

    // assert
    expect(fixture.publishedNotes).toEqual([
      {
        workItemId: 'item-1',
        note: {
          kind: 'implementation',
          heading: 'Symphony implementation',
          body: 'Fixed by hand.',
        },
      },
    ]);
  });

  it('clears every inactive recorded workspace while skipping a running execution', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.managedWorkspaces.push('/managed-workspaces/execution-orphaned');
    fixture.repository.saveExecution({
      id: 'execution-solution',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'succeeded',
      startedAt: '2026-08-07T00:00:00.000Z',
      finishedAt: '2026-08-07T00:01:00.000Z',
      workspacePath: '/managed-workspaces/execution-solution',
    });
    fixture.repository.saveExecution({
      id: 'execution-failed',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'failed',
      startedAt: '2026-08-07T01:00:00.000Z',
      finishedAt: '2026-08-07T01:01:00.000Z',
      workspacePath: '/managed-workspaces/execution-failed',
    });
    // act
    fixture.repository.saveExecution({
      id: 'execution-running',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'running',
      startedAt: '2026-08-07T02:00:00.000Z',
      workspacePath: '/managed-workspaces/execution-running',
    });

    // assert
    await expect(fixture.service.clearWorkspaces()).resolves.toEqual({
      removed: 3,
      missing: 0,
      skipped: 1,
      failed: 0,
    });
    expect([...fixture.releasedWorkspaces].sort()).toEqual([
      '/managed-workspaces/execution-failed',
      '/managed-workspaces/execution-orphaned',
      '/managed-workspaces/execution-solution',
    ]);
  });

  it('reclaims failed analysis workspaces without touching implementation evidence', async () => {
    // arrange
    const fixture = createFixture(false);
    fixture.repository.saveExecution({
      id: 'analysis-failed',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'failed',
      startedAt: '2026-08-07T00:00:00.000Z',
      finishedAt: '2026-08-07T00:01:00.000Z',
      workspacePath: '/managed-workspaces/analysis-failed',
    });
    fixture.repository.saveExecution({
      id: 'solution-failed',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'solution',
      state: 'failed',
      startedAt: '2026-08-07T01:00:00.000Z',
      finishedAt: '2026-08-07T01:01:00.000Z',
      workspacePath: '/managed-workspaces/solution-failed',
    });
    fixture.repository.saveExecution({
      id: 'analysis-running',
      workItemId: 'item-1',
      workflowId: defaultWorkflow.id,
      kind: 'analysis',
      state: 'running',
      startedAt: '2026-08-07T02:00:00.000Z',
      workspacePath: '/managed-workspaces/analysis-running',
    });

    // act
    const removed = await fixture.service.cleanupReclaimableAnalysisWorkspaces();

    // assert
    expect(removed).toBe(1);
    expect(fixture.releasedWorkspaces).toEqual(['/managed-workspaces/analysis-failed']);
  });

  it('records manual implementation and rework without a solution skill, agent, or workspace', async () => {
    // arrange
    const fixture = createFixture(false, false, 'unused', 'qualified');
    const analysis = await fixture.service.completeManualAnalysis('item-1', 'Approved analysis.');
    // Recording a manual note never moves the card; a person moves it into the stage that
    // runs the implementation, exactly as they would on the board.
    fixture.service.recordWorkItem({ ...fixture.getItem(), stageId: 'progress' });

    const solution = await fixture.service.completeManualSolution(
      'item-1',
      'Implemented and verified manually.',
    );
    // act
    const revision = await fixture.service.completeManualSolution(
      'item-1',
      'Adjusted regression coverage manually.',
    );

    // assert
    expect(solution).toMatchObject({
      mode: 'manual',
      kind: 'solution',
      parentExecutionId: analysis.id,
      state: 'succeeded',
    });
    expect(revision).toMatchObject({
      mode: 'manual',
      kind: 'revision',
      parentExecutionId: solution.id,
      state: 'succeeded',
    });
    expect(solution).not.toHaveProperty('skillId');
    expect(solution).not.toHaveProperty('workspacePath');
    expect(fixture.solutionRequests).toEqual([]);
    expect(fixture.preparedWorkspaces).toEqual([]);
    expect(fixture.transitions).toEqual([]);
  });
});

function runningExecution() {
  return {
    id: 'analysis-running',
    workItemId: 'item-1',
    workflowId: defaultWorkflow.id,
    skillId: 'repository:issue-analyzer',
    kind: 'analysis' as const,
    state: 'running' as const,
    startedAt: '2026-08-07T00:00:00.000Z',
    workItemClaim: {
      id: 'refs/heads/symphony/claims/abc@sha',
      workItemId: 'item-1',
      action: 'analyze' as const,
      owner: 'test-user',
      acquiredAt: '2026-08-07T00:00:00.000Z',
    },
  };
}
