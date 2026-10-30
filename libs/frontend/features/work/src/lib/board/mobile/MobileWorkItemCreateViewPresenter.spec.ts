// #region Imports

import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileWorkItemCreationContext } from '@symphony/mobile-contracts';
import { describe, expect, it, vi } from 'vitest';
import { MobileWorkItemCreateViewPresenter } from './MobileWorkItemCreateViewPresenter';

// #endregion

describe('MobileWorkItemCreateViewPresenter', () => {
  it('reviews an AI draft before creating a work item with the selected project values', async () => {
    // arrange
    const context = signal<MobileWorkItemCreationContext | undefined>(undefined);
    const busy = signal(false);
    const drafting = signal(false);
    const creationContext: MobileWorkItemCreationContext = {
      version: 1,
      workspaceId: 'workspace-1',
      workspaceName: 'Mobile workspace',
      repositories: ['example/symphony'],
      labels: [{ name: 'mobile', color: '7524d8' }],
      assignees: [{ login: 'ada', displayName: 'Ada' }],
      projectFields: [
        {
          id: 'status',
          name: 'Status',
          role: 'workflow-state',
          type: 'single-select',
          options: [{ id: 'backlog', label: 'Backlog', stageId: 'backlog' }],
        },
      ],
      issueCreatorSkill: {
        id: 'create-change-request',
        name: 'Create change request',
        description: 'Drafts work items.',
      },
    };
    const loadWorkItemCreationContext = vi.fn(async () => {
      context.set(creationContext);
      return true;
    });
    const draftIssue = vi.fn(async () => ({
      title: 'AI-created work item',
      body: 'Reviewed description',
      projectFields: [{ fieldId: 'status', type: 'single-select' as const, value: 'backlog' }],
      labels: ['mobile'],
      assignees: ['ada'],
    }));
    const createWorkItem = vi.fn(async () => 'ticket-created');
    const navigate = vi.fn(async () => true);

    TestBed.configureTestingModule({
      providers: [
        MobileWorkItemCreateViewPresenter,
        {
          provide: MobileCompanionStore,
          useValue: {
            workItemCreationContext: context.asReadonly(),
            workItemCreationBusy: busy.asReadonly(),
            issueDraftBusy: drafting.asReadonly(),
            loadWorkItemCreationContext,
            draftIssue,
            createWorkItem,
            cancelIssueDraft: vi.fn(async () => true),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'ai' } } },
        },
        { provide: Router, useValue: { navigate } },
        { provide: Location, useValue: { back: vi.fn() } },
      ],
    });

    const presenter = TestBed.inject(MobileWorkItemCreateViewPresenter);
    // act
    presenter.initialize();
    // assert
    await vi.waitFor(() => expect(presenter.isHydrating()).toBe(false));

    presenter.updateDraftPromptCommand.execute('Create a complete mobile work item for the board.');
    presenter.draftWithAiCommand.execute();

    await vi.waitFor(() => expect(presenter.isAiDraft()).toBe(true));
    expect(presenter.title()).toBe('AI-created work item');
    presenter.createWorkItemCommand.execute();
    await vi.waitFor(() =>
      expect(createWorkItem).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          repository: 'example/symphony',
          labels: ['mobile'],
          assignees: ['ada'],
        }),
      ),
    );
    expect(navigate).toHaveBeenCalledWith(['/tickets', 'ticket-created']);
  });
});
