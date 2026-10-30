// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { CiSearchProvider } from './CiSearchProvider';

// #endregion

describe('CiSearchProvider', () => {
  it.each([
    'Deployment',
    'Prepare publication',
    'rweber',
    'push',
    'trunk',
    'abc123',
    'failed',
    '87',
  ])('keeps the existing CI run search field %s', (query) => {
    // arrange
    const runs = signal<readonly ICiRun[]>([
      {
        id: 'run:87',
        workspaceId: 'workspace',
        ciBindingId: 'ci',
        repositoryBindingId: 'repository',
        name: 'Deployment',
        title: 'Prepare publication',
        actor: 'rweber',
        event: 'push',
        branch: 'trunk',
        revision: 'abc123',
        status: 'failed',
        runNumber: 87,
      },
    ]);
    const provider = new CiSearchProvider({ runs });

    // act
    const present = provider.match(query, query.toLocaleLowerCase());
    runs.set([]);
    const removed = provider.match(query, query.toLocaleLowerCase());

    // assert
    expect(present).toEqual({ path: '/main/actions', queryParams: { q: query } });
    expect(removed).toBeUndefined();
  });
});
