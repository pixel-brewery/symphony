// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { provideExecutionFeature } from '@symphony/frontend-feature-execution';
import { WORK_OPERATIONS, WORK_SELECTION } from '@symphony/frontend-core/work';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkSelectionStore } from '../state/WorkSelectionStore';
import { WorkStore } from '../state/WorkStore';
import { provideWorkFeature } from './provideWorkFeature';

// #endregion

const { provideWorkflowFeature } = await vi.importActual<
  typeof import('@symphony/frontend-feature-workflow')
>('@symphony/frontend-feature-workflow');

describe('provideWorkFeature', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('connects the real aggregate and execution bridges without a DI cycle or a second Work owner', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideWorkFeature(),
        provideExecutionFeature(),
        provideWorkflowFeature(),
        {
          provide: ORCHESTRATION_CLIENT,
          useValue: { request: vi.fn(), onExecutionEvent: () => () => undefined },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showInfo: vi.fn(),
            showWarning: vi.fn(),
          },
        },
      ],
    });
    const store = TestBed.inject(WorkStore);
    const selection = TestBed.inject(WORK_SELECTION);

    // act
    store.selectWorkItem('selected');

    // assert
    expect(TestBed.inject(WORK_OPERATIONS)).toBe(store);
    expect(selection).toBe(TestBed.inject(WorkSelectionStore));
    expect(selection.selectedWorkItemId()).toBe('selected');
    expect(selection.selectionExplicit()).toBe(true);
  });
  it('resolves ordinary Work without Execution or Workflow and never reports an unavailable command as successful', async () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideWorkFeature(),
        {
          provide: ORCHESTRATION_CLIENT,
          useValue: { request: vi.fn(), onExecutionEvent: () => () => undefined },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showInfo: vi.fn(),
            showWarning: vi.fn(),
          },
        },
      ],
    });
    const store = TestBed.inject(WorkStore);

    // act
    store.selectWorkItem('selected');
    const started = await store.startAnalyzer(false, 'selected');
    const process = await store.loadWorkflowProcess('selected');

    // assert
    expect(store.executionAvailable).toBe(false);
    expect(store.workflowAvailable).toBe(false);
    expect(store.publicationAvailable).toBe(false);
    expect(store.selectedWorkItem()).toBeUndefined();
    expect(TestBed.inject(WORK_SELECTION).selectedWorkItemId()).toBe('selected');
    expect(started).toBe(false);
    expect(process).toBeUndefined();
    await expect(store.decideWorkflow('selected', 'option')).rejects.toThrow(
      'Workflow feature is not available.',
    );
  });
});
