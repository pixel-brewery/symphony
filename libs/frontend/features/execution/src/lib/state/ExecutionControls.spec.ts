// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import type { RequestPayload, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IExecutionClient } from '../ports/IExecutionClient';
import type { ExecutionRequestMethod } from '../ports/ExecutionRequestMethod';
import { provideExecutionFeature } from '../provider/provideExecutionFeature';
import { ExecutionControls } from './ExecutionControls';

// #endregion

describe('ExecutionControls', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('pauses from the menu without constructing desktop execution synchronization', async () => {
    // arrange
    const request =
      vi.fn<
        (method: ExecutionRequestMethod, payload: RequestPayload<ExecutionRequestMethod>) => void
      >();
    const handlers: Partial<{
      [M in ExecutionRequestMethod]: (payload: RequestPayload<M>) => Promise<ResponsePayload<M>>;
    }> = {
      'execution.pause': async () => ({
        id: 'execution-1',
        workItemId: 'work-1',
        workflowId: 'workflow-1',
        state: 'waiting',
        startedAt: '2026-10-29T14:23:11.775Z',
      }),
    };
    const onExecutionEvent = vi.fn<IExecutionClient['onExecutionEvent']>();
    const client: IExecutionClient = {
      async request<M extends ExecutionRequestMethod>(
        method: M,
        payload: RequestPayload<M>,
      ): Promise<ResponsePayload<M>> {
        request(method, payload);
        const handler = handlers[method];
        if (!handler) throw new Error('Unexpected request: ' + method);
        return handler(payload);
      },
      onExecutionEvent,
    };
    TestBed.configureTestingModule({
      providers: [provideExecutionFeature(), { provide: ORCHESTRATION_CLIENT, useValue: client }],
    });
    const controls = TestBed.inject(ExecutionControls);

    // act
    await controls.pauseExecution('execution-1');

    // assert
    expect(request).toHaveBeenCalledExactlyOnceWith('execution.pause', {
      executionId: 'execution-1',
    });
    expect(onExecutionEvent).not.toHaveBeenCalled();
  });
});
