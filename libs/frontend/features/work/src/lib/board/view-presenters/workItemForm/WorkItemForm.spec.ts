// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IWorkItem } from '@symphony/domain-work';
import type { WorkItemEditorMetadataDto } from '@symphony/ipc-contracts-work';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IWorkTaskContext } from '../../../ports/IWorkTaskContext';
import type { WorkStore } from '../../../state/WorkStore';
import { WorkItemForm } from './WorkItemForm';

// #endregion

const metadata: WorkItemEditorMetadataDto = {
  repositories: ['example/platform', 'example/docs'],
  workItemTypes: ['Issue', 'Bug'],
  defaultWorkItemType: 'Issue',
  labels: [{ name: 'bug', color: 'ff0000' }],
  assignees: [{ login: 'octo-operator' }],
  states: [],
  projectFields: [
    {
      id: 'field-status',
      name: 'Status',
      type: 'single-select',
      role: 'workflow-state',
      options: [
        { id: 'status-backlog', label: 'Backlog', stageId: 'backlog' },
        { id: 'status-ready', label: 'Ready', stageId: 'ready' },
      ],
    },
    { id: 'field-keywords', name: 'Keywords', type: 'text', role: 'custom' },
    { id: 'field-estimate', name: 'Estimate', type: 'number', role: 'custom' },
    {
      id: 'field-areas',
      name: 'Areas',
      type: 'multi-select',
      role: 'custom',
      options: [{ id: 'area-desktop', label: 'Desktop' }],
    },
  ],
} as WorkItemEditorMetadataDto;

function createForm() {
  const loaded = signal<WorkItemEditorMetadataDto | undefined>(undefined);
  const work = {
    workItemMetadata: loaded.asReadonly(),
    loadWorkItemMetadata: vi.fn(async () => {
      loaded.set(metadata);
      return true;
    }),
  } as unknown as WorkStore;
  const context = {
    snapshot: signal({ workflow: { initialStageId: 'backlog' } }),
    settings: signal({
      agentTeams: [],
      agentProfiles: [],
      workItemSources: [{ id: 'source-1', workspaceId: 'personal', enabled: true }],
      deliveryContexts: [],
      repositoryBindings: [
        {
          id: 'repository-1',
          workspaceId: 'personal',
          enabled: true,
          displayName: 'example/platform',
          owner: 'example',
          name: 'platform',
        },
      ],
    }),
    selectedWorkspaceIds: signal(['personal']),
    activeWorkspace: signal({ id: 'personal' }),
    creationBoard: signal(undefined),
  } as unknown as IWorkTaskContext;
  const form = TestBed.runInInjectionContext(() => new WorkItemForm(work, context));
  return { form, work };
}

describe('WorkItemForm', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('fills the creation defaults from the metadata and writes a mutation for the board', async () => {
    // arrange
    const { form, work } = createForm();

    // act
    await form.loadMetadata();
    form.form.title().value.set('  Rotate the backup key  ');

    // assert
    expect(work.loadWorkItemMetadata).toHaveBeenCalledWith(undefined, 'personal', undefined);
    expect(form.model()).toMatchObject({ repository: 'example/platform', workItemType: 'Issue' });
    expect(form.workflowStageId()).toBe('backlog');
    expect(form.hasRequiredValues()).toBe(true);
    expect(form.toMutation()).toMatchObject({
      workspaceId: 'personal',
      sourceId: 'source-1',
      workItemType: 'Issue',
      title: 'Rotate the backup key',
      repository: 'example/platform',
      repositoryBindingIds: ['repository-1'],
      projectFields: expect.arrayContaining([
        { fieldId: 'field-status', type: 'single-select', value: 'status-backlog' },
        { fieldId: 'field-keywords', type: 'text', value: '' },
      ]),
    });
  });

  it('points the workflow-state field at the column of a chosen stage', async () => {
    // arrange
    const { form } = createForm();
    await form.loadMetadata();

    // act
    const selected = form.selectWorkflowStage('ready');
    const unknown = form.selectWorkflowStage('done');

    // assert
    expect(selected).toBe(true);
    expect(unknown).toBe(false);
    expect(form.workflowStageId()).toBe('ready');
    expect(form.projectFieldSelection()('field-status')).toBe('status-ready');
  });

  it('writes field, label and option controls and restores a stored item', async () => {
    // arrange
    const { form } = createForm();
    await form.loadMetadata();
    const keywords = metadata.projectFields[1]!;
    const estimate = metadata.projectFields[2]!;

    // act
    form.updateProjectFieldCommand.execute([keywords, { detail: { value: 'backups' } }]);
    form.updateProjectFieldCommand.execute([estimate, '5']);
    form.toggleProjectFieldOptionCommand.execute(['field-areas', 'area-desktop']);
    form.toggleLabelCommand.execute('bug');
    form.toggleAssigneeCommand.execute('octo-operator');

    // assert
    expect(form.projectFieldText()('field-keywords')).toBe('backups');
    expect(form.projectFieldNumber()('field-estimate')).toBe(5);
    expect(form.isProjectFieldOptionSelected()('field-areas', 'area-desktop')).toBe(true);
    expect(form.isLabelSelected()('bug')).toBe(true);
    expect(form.isAssigneeSelected()('octo-operator')).toBe(true);

    form.reset({
      id: 'work-1',
      externalId: '#1',
      title: 'Stored',
      body: 'Body',
      provider: 'github-projects',
      repository: 'example/docs',
      labels: [],
      assignees: [],
    } as IWorkItem);
    expect(form.model()).toMatchObject({
      title: 'Stored',
      repository: 'example/docs',
      labels: [],
      projectFields: [],
    });
  });

  it('loads the metadata of another repository once it is chosen', async () => {
    // arrange
    const { form, work } = createForm();
    await form.loadMetadata();

    // act
    await form.selectRepository('example/docs');
    await form.selectRepository('example/docs');

    // assert
    expect(form.model().repository).toBe('example/docs');
    expect(work.loadWorkItemMetadata).toHaveBeenCalledTimes(2);
    expect(work.loadWorkItemMetadata).toHaveBeenLastCalledWith(
      'example/docs',
      'personal',
      undefined,
    );
  });
});
