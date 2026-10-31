// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { NotificationService } from '@symphony/frontend-notification';
import { WORK_SELECTION } from '@symphony/frontend-core/work';
import { WORKSPACE_OPERATIONS, WORKSPACE_SCOPE } from '@symphony/frontend-core/workspace';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkspaceSelectionStore } from '../state/WorkspaceSelectionStore';
import { WorkspaceStore } from '../state/WorkspaceStore';
import { provideWorkspaceFeature } from './provideWorkspaceFeature';

// #endregion

describe('provideWorkspaceFeature', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares the feature owners with the facade while resolving the existing aggregate bridges', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideWorkspaceFeature(),
        { provide: WORK_SELECTION, useValue: { ensureDefault: vi.fn(), resetId: vi.fn() } },
        {
          provide: ORCHESTRATION_CLIENT,
          useValue: { request: vi.fn(), onExecutionEvent: () => () => undefined },
        },
        {
          provide: NotificationService,
          useValue: {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showWarning: vi.fn(),
            showInfo: vi.fn(),
          },
        },
      ],
    });

    // act
    const operations = TestBed.inject(WORKSPACE_OPERATIONS);
    const scope = TestBed.inject(WORKSPACE_SCOPE);

    // assert
    expect(operations).toBe(TestBed.inject(WorkspaceStore));
    expect(scope).toBe(TestBed.inject(WorkspaceSelectionStore));
    expect(operations.workspaceCleanupBusy()).toBe(false);
  });
});
