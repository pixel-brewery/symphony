// #region Imports

import type {
  IDeliveryEvidence,
  IDeliverySnapshot,
  IDeliveryTarget,
} from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import type { IProductionSummaryInput } from './IProductionSummaryInput';
import { projectProductionSummary } from './projectProductionSummary';

// #endregion

const production: IDeliveryTarget = {
  id: 'production',
  workspaceId: 'workspace',
  repositoryBindingId: 'repo',
  displayName: 'Production',
  kind: 'environment',
  environment: 'production',
  production: true,
};

function evidence(overrides: Partial<IDeliveryEvidence>): IDeliveryEvidence {
  return {
    id: 'evidence',
    targetId: 'production',
    workspaceId: 'workspace',
    repositoryBindingId: 'repo',
    kind: 'deployment',
    revision: 'abcdef123',
    version: 'v2026.10.3',
    state: 'succeeded',
    deployedAt: '2026-10-24T10:00:00.000Z',
    observedAt: '2026-10-24T10:05:00.000Z',
    workItemIds: ['1'],
    ...overrides,
  };
}

function input(
  delivery: Partial<IDeliverySnapshot>,
  overrides: Partial<IProductionSummaryInput> = {},
): IProductionSummaryInput {
  return {
    delivery: { targets: [], evidence: [], errors: [], refreshedAt: '', ...delivery },
    configuredTargets: [],
    workspaceIds: ['workspace'],
    repositoryBindingId: 'repo',
    clusterItemIds: ['1', '2', '3'],
    ...overrides,
  };
}

describe('projectProductionSummary', () => {
  it('confirms the newest Production version and counts the cluster as Orbit does', () => {
    // arrange
    const projection = input({
      targets: [production, { ...production, id: 'staging', production: false }],
      evidence: [
        evidence({}),
        evidence({ id: 'staging', targetId: 'staging', workItemIds: ['2'] }),
        evidence({ id: 'failed', targetId: 'staging', state: 'failed', workItemIds: ['3'] }),
        evidence({ id: 'foreign', repositoryBindingId: 'other', workItemIds: ['3'] }),
      ],
    });

    // act
    const summary = projectProductionSummary(projection);

    // assert
    expect(summary).toEqual({
      state: 'confirmed',
      version: 'v2026.10.3',
      revision: 'abcdef123',
      confirmedAt: '2026-10-24T10:00:00.000Z',
      clusterSize: 3,
      notInProduction: 2,
      evidenceCollected: 2,
    });
  });

  it('keeps Orbit states for missing, unconfirmed and unverifiable Production', () => {
    // arrange
    const unassigned = input({});
    const unconfirmed = input({}, { configuredTargets: [production] });
    const stale = input({
      targets: [production],
      evidence: [evidence({})],
      errors: [{ targetId: 'production', message: 'Unavailable' }],
    });

    // act
    const states = [unassigned, unconfirmed, stale].map((value) => projectProductionSummary(value));

    // assert
    expect(states.map((summary) => summary.state)).toEqual(['unassigned', 'unconfirmed', 'stale']);
    expect(states[1]?.notInProduction).toBe(3);
    expect(states[2]?.notInProduction).toBe(3);
  });
});
