// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { CI_OPERATIONS } from '@symphony/frontend-core/ci';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HOME_CONTEXT } from './HomeContextToken';

// #endregion

function projection() {
  return {
    provide: ApplicationProjection,
    useValue: {
      snapshot: signal(undefined),
      settings: signal(undefined),
      activeWorkspace: signal(undefined),
      selectedWorkspaceIds: signal([]),
      scopedRepositories: signal([]),
      scopedWorkItems: signal([]),
      activeBoard: signal(undefined),
    },
  };
}

describe('HOME_CONTEXT', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('reads the recorded stage changes and workflow runs of the active scope', async () => {
    // arrange
    const request = vi.fn(async (method: string) =>
      method === 'workflow.stage-changes.list'
        ? { changes: [], truncated: false }
        : { runs: [], recordedSince: '2026-09-01T00:00:00.000Z', truncated: false },
    );
    TestBed.configureTestingModule({
      providers: [
        projection(),
        { provide: ApplicationBootstrap, useValue: { initialize: async () => undefined } },
        { provide: OrchestrationSynchronizer, useValue: { refresh: async () => undefined } },
        { provide: ORCHESTRATION_CLIENT, useValue: { request } },
      ],
    });
    const context = TestBed.inject(HOME_CONTEXT);

    // act
    const stages = await context.listStageChanges('2026-09-07T00:00:00.000Z');
    const runs = await context.listRunHistory('2026-09-07T00:00:00.000Z');

    // assert
    expect(request.mock.calls).toEqual([
      ['workflow.stage-changes.list', { since: '2026-09-07T00:00:00.000Z' }],
      ['ci.runs.history.list', { since: '2026-09-07T00:00:00.000Z' }],
    ]);
    expect(stages).toEqual({ changes: [], truncated: false });
    expect(runs.recordedSince).toBe('2026-09-01T00:00:00.000Z');
  });

  it('syncs the snapshot first and the fresher Actions runs after it', async () => {
    // arrange
    const calls: string[] = [];
    let finishSnapshot: () => void = () => undefined;
    TestBed.configureTestingModule({
      providers: [
        projection(),
        { provide: ORCHESTRATION_CLIENT, useValue: { request: vi.fn() } },
        { provide: ApplicationBootstrap, useValue: { initialize: async () => undefined } },
        {
          provide: OrchestrationSynchronizer,
          useValue: {
            refresh: () =>
              new Promise<void>((resolve) => {
                calls.push('snapshot');
                finishSnapshot = resolve;
              }),
          },
        },
        {
          provide: CI_OPERATIONS,
          useValue: {
            continuousIntegrationRunsBusy: signal(false),
            refreshContinuousIntegrationRuns: async () => {
              calls.push('ci');
            },
          },
        },
      ],
    });
    const context = TestBed.inject(HOME_CONTEXT);

    // act
    const sync = context.sync();
    const beforeSnapshot = [...calls];
    finishSnapshot();
    await sync;

    // assert
    expect(beforeSnapshot).toEqual(['snapshot']);
    expect(calls).toEqual(['snapshot', 'ci']);
  });
});
