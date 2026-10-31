// #region Imports

import type { ProjectFieldDefinition, IWorkItem } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import { toggleAssigneeMutation } from './toggleAssigneeMutation';

// #endregion

const boardFields: readonly ProjectFieldDefinition[] = [
  { id: 'field-1', name: 'Notes', role: 'custom', type: 'text' },
];

const workItem: IWorkItem = {
  id: 'work-1',
  workspaceId: 'workspace-1',
  sourceId: 'source-1',
  externalId: '#1',
  title: 'Assign from the card',
  body: 'The complete body.',
  detailState: 'complete',
  provider: 'simulated',
  repository: 'owner/repository',
  repositoryBindingIds: ['binding-1'],
  projectFields: [{ fieldId: 'field-1', type: 'text', value: 'Value' }],
  labels: ['bug'],
  assignees: [{ login: 'octo-operator', displayName: 'Octo Operator' }],
};

describe('toggleAssigneeMutation', () => {
  it('adds a person the item does not carry and writes the other fields back unchanged', () => {
    // act
    const actual = toggleAssigneeMutation(workItem, 'workspace-owner', boardFields);

    // assert
    expect(actual).toEqual({
      workspaceId: 'workspace-1',
      sourceId: 'source-1',
      title: 'Assign from the card',
      body: 'The complete body.',
      repository: 'owner/repository',
      repositoryBindingIds: ['binding-1'],
      projectFields: [{ fieldId: 'field-1', type: 'text', value: 'Value' }],
      labels: ['bug'],
      assignees: ['octo-operator', 'workspace-owner'],
    });
  });

  it('removes a person the item already carries', () => {
    // assert
    expect(toggleAssigneeMutation(workItem, 'octo-operator', boardFields).assignees).toEqual([]);
  });

  it('leaves out the field values of another board, which the tracker rejects as unknown', () => {
    // act
    // arrange
    const mutation = toggleAssigneeMutation(
      {
        ...workItem,
        projectFields: [
          { fieldId: 'field-1', type: 'text', value: 'Value' },
          { fieldId: 'PVTF_foreign-board-field', type: 'single-select', value: 'option-1' },
        ],
      },
      'workspace-owner',
      boardFields,
    );
    // assert
    expect(mutation.projectFields).toEqual([{ fieldId: 'field-1', type: 'text', value: 'Value' }]);
  });

  it('leaves out a value whose type no longer matches its field definition', () => {
    // act
    // arrange
    const mutation = toggleAssigneeMutation(
      { ...workItem, projectFields: [{ fieldId: 'field-1', type: 'number', value: 4 }] },
      'workspace-owner',
      boardFields,
    );
    // assert
    expect(mutation.projectFields).toEqual([]);
  });

  it('leaves out the scope fields an item without them cannot name', () => {
    // act
    // arrange
    const mutation = toggleAssigneeMutation(
      {
        ...workItem,
        workspaceId: undefined,
        sourceId: undefined,
        repositoryBindingIds: undefined,
        projectFields: undefined,
      },
      'workspace-owner',
      boardFields,
    );
    // assert
    expect(mutation).not.toHaveProperty('workspaceId');
    expect(mutation).not.toHaveProperty('sourceId');
    expect(mutation).not.toHaveProperty('repositoryBindingIds');
    expect(mutation.projectFields).toEqual([]);
  });
});
