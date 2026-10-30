// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import type { IWorkSearchContext } from './IWorkSearchContext';
import { WorkSearchProvider } from './WorkSearchProvider';

// #endregion

describe('WorkSearchProvider', () => {
  it.each([
    'TASK-901',
    'Visible card title',
    'Detailed statement',
    'sample/engineering',
    'Department',
    'Operations',
    'customer',
    'mweber',
    'Marie Weber',
  ])('keeps the existing Work search field %s', (query) => {
    // arrange
    const provider = new WorkSearchProvider({
      snapshot: signal<ReturnType<IWorkSearchContext['snapshot']>>({
        workItems: [workItem()],
        projectFields: [{ id: 'department', name: 'Department', role: 'custom', type: 'text' }],
      }),
    });

    // act
    const result = provider.match(query, query.toLocaleLowerCase());

    // assert
    expect(result).toEqual({ path: '/main/board', queryParams: { q: query } });
  });

  it('reads the current projection without adding internal identifiers to the searchable fields', () => {
    // arrange
    const snapshot = signal<ReturnType<IWorkSearchContext['snapshot']>>(undefined);
    const provider = new WorkSearchProvider({ snapshot });

    // act
    const before = provider.match('Operations', 'operations');
    snapshot.set({ workItems: [workItem()] });
    const internalId = provider.match('local-id-unsearchable', 'local-id-unsearchable');
    const body = provider.match('Detailed statement', 'detailed statement');

    // assert
    expect(before).toBeUndefined();
    expect(internalId).toBeUndefined();
    expect(body).toEqual({ path: '/main/board', queryParams: { q: 'Detailed statement' } });
  });
});

function workItem(): IWorkItem {
  return {
    id: 'local-id-unsearchable',
    externalId: 'TASK-901',
    title: 'Visible card title',
    body: 'Detailed statement',
    provider: 'local',
    repository: 'sample/engineering',
    projectFields: [{ fieldId: 'department', type: 'text', value: 'Operations' }],
    labels: ['customer'],
    assignees: [{ login: 'mweber', displayName: 'Marie Weber' }],
  };
}
