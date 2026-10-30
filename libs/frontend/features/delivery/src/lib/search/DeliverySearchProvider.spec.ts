// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { describe, expect, it } from 'vitest';
import { DeliverySearchProvider } from './DeliverySearchProvider';
import type { IDeliverySearchContext } from './IDeliverySearchContext';

// #endregion

describe('DeliverySearchProvider', () => {
  it.each(['274', 'Release preparation', 'uweber', 'release-candidate', 'production', 'merged'])(
    'keeps the existing pull-request search field %s',
    (query) => {
      // arrange
      const provider = new DeliverySearchProvider({
        snapshot: signal({ pullRequests: [pullRequest()] }),
      });

      // act
      const result = provider.match(query, query.toLocaleLowerCase());

      // assert
      expect(result).toEqual({ path: '/main/pull-requests', queryParams: { q: query } });
    },
  );

  it('retains absent-projection behavior and reads later pull-request updates', () => {
    // arrange
    const snapshot = signal<ReturnType<IDeliverySearchContext['snapshot']>>(undefined);
    const provider = new DeliverySearchProvider({ snapshot });

    // act
    const missing = provider.match('Release', 'release');
    snapshot.set({});
    const absentList = provider.match('Release', 'release');
    snapshot.set({ pullRequests: [pullRequest()] });
    const current = provider.match('Release', 'release');

    // assert
    expect(missing).toBeUndefined();
    expect(absentList).toBeUndefined();
    expect(current).toEqual({ path: '/main/pull-requests', queryParams: { q: 'Release' } });
  });
});

function pullRequest(): IPullRequestSummary {
  return {
    id: 'pull-request:274',
    workspaceId: 'workspace',
    repositoryBindingId: 'repository',
    number: 274,
    title: 'Release preparation',
    state: 'merged',
    draft: false,
    author: 'uweber',
    sourceBranch: 'release-candidate',
    targetBranch: 'production',
    externalUrl: 'https://example.test/pull/274',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  };
}
