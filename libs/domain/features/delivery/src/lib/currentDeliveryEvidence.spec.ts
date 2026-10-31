// #region Imports

import { describe, expect, it } from 'vitest';
import { currentDeliveryEvidence } from './currentDeliveryEvidence';
import type { IDeliveryEvidence } from './IDeliveryEvidence';

// #endregion

const base: IDeliveryEvidence = {
  id: 'one',
  targetId: 'staging',
  workspaceId: 'w',
  repositoryBindingId: 'repo',
  kind: 'deployment',
  revision: 'new-version',
  state: 'succeeded',
  observedAt: '2026-10-06T09:00:00.000Z',
  deployedAt: '2026-10-06T08:00:00.000Z',
  workItemIds: ['ticket-new'],
};
describe('currentDeliveryEvidence', () => {
  it('treats a later redeployment of an older revision as the current delivery', () => {
    // arrange
    const rollback = {
      ...base,
      id: 'two',
      revision: 'older-version',
      workItemIds: ['ticket-old'],
      deployedAt: '2026-10-06T10:00:00.000Z',
      observedAt: '2026-10-06T10:05:00.000Z',
    };
    // act
    const current = currentDeliveryEvidence([base, rollback], 'staging');
    // assert
    expect(current?.revision).toBe('older-version');
    expect(current?.workItemIds).toEqual(['ticket-old']);
  });
  it('keeps the active version while the next deployment is pending and excludes inactive proofs', () => {
    // arrange
    const pending = {
      ...base,
      id: 'pending',
      state: 'in-progress' as const,
      deployedAt: '2026-10-06T12:00:00.000Z',
    };
    // act
    const current = currentDeliveryEvidence([base, pending], 'staging');
    // assert
    expect(current?.id).toBe('one');
    expect(currentDeliveryEvidence([{ ...base, state: 'inactive' }], 'staging')).toBeUndefined();
  });
  it('does not let a delayed old status replace a newer deployment', () => {
    // arrange
    const next = { ...base, id: 'next', revision: 'next', deployedAt: '2026-10-06T11:00:00.000Z' };
    const delayed = { ...base, observedAt: '2026-10-06T12:00:00.000Z' };
    // act
    const current = currentDeliveryEvidence([delayed, next], 'staging');
    // assert
    expect(current?.id).toBe('next');
  });
});
