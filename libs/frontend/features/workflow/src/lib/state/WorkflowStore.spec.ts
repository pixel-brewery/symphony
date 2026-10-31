// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationService } from '@symphony/frontend-notification';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import type { IWorkflowClient } from '../ports/IWorkflowClient';
import type { WorkflowRequestMethod } from '../ports/WorkflowRequestMethod';
import { WORKFLOW_CLIENT } from '../ports/WorkflowClientToken';
import { WORKFLOW_REFRESH } from '../ports/WorkflowRefreshToken';
import { WorkflowStore } from './WorkflowStore';

// #endregion

describe('WorkflowStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps a human decision busy until its shared projection reconciliation settles', async () => {
    // arrange
    let finishRefresh: () => void = () => undefined;
    const pendingRefresh = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const request =
      vi.fn<
        (method: WorkflowRequestMethod, payload: RequestPayload<WorkflowRequestMethod>) => void
      >();
    const handlers: Partial<{
      [M in WorkflowRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
    }> = {
      'workflow.decide': async () => ({}),
    };
    const client: IWorkflowClient = {
      async request<M extends WorkflowRequestMethod>(
        method: M,
        payload: RequestPayload<M>,
      ): Promise<ResponsePayload<M>> {
        request(method, payload);
        const handler = handlers[method];
        if (!handler) throw new Error('Unexpected request: ' + method);
        return handler(payload);
      },
    };
    const refresh = vi.fn<() => Promise<void>>().mockReturnValue(pendingRefresh);
    TestBed.configureTestingModule({
      providers: [
        WorkflowStore,
        { provide: WORKFLOW_CLIENT, useValue: client },
        { provide: WORKFLOW_REFRESH, useValue: { refresh } },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
      ],
    });
    const store = TestBed.inject(WorkflowStore);

    // act
    const decision = store.decideWorkflow('item-1', 'approve', 'Reviewed.');
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce());

    // assert
    expect(request).toHaveBeenCalledWith('workflow.decide', {
      workItemId: 'item-1',
      optionId: 'approve',
      note: 'Reviewed.',
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(store.workflowBusy()).toBe(true);
    finishRefresh();
    await decision;
    expect(store.workflowBusy()).toBe(false);
  });

  it('releases human-action busy state and reports a failed answer without refreshing', async () => {
    // arrange
    const client: IWorkflowClient = {
      request: async () => {
        throw new Error('The claim changed.');
      },
    };
    const refresh = vi.fn();
    const showError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        WorkflowStore,
        { provide: WORKFLOW_CLIENT, useValue: client },
        { provide: WORKFLOW_REFRESH, useValue: { refresh } },
        { provide: NotificationService, useValue: { showError } },
      ],
    });
    const store = TestBed.inject(WorkflowStore);

    // act
    await store.answerWorkflowQuestion('item-1', 'question-1');

    // assert
    expect(store.workflowBusy()).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(showError).toHaveBeenCalledWith('Unable to record the answer.', 'The claim changed.');
  });
});
