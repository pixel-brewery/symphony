// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { ICiRun } from '@symphony/domain-ci';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { IHomeContext } from '../ports/IHomeContext';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { InboxStore } from './InboxStore';

// #endregion

const run: ICiRun = {
  id: 'run',
  workspaceId: 'workspace',
  ciBindingId: 'ci',
  repositoryBindingId: 'repo',
  name: 'Deploy Dev',
  status: 'failed',
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  finishedAt: new Date(Date.now() - 30_000).toISOString(),
};

describe('InboxStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('hides the decision count while loading and drops snoozed entries from it', () => {
    // arrange
    const snapshot = signal<IOrchestrationSnapshot | undefined>(undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HOME_CONTEXT,
          useValue: {
            snapshot,
            settings: signal(undefined),
            selectedWorkspaceIds: signal(['workspace']),
            scopedWorkItems: computed(() => []),
          } as Partial<IHomeContext>,
        },
      ],
    });
    const store = TestBed.inject(InboxStore);

    // act
    const loading = store.decisionCount();
    snapshot.set({
      workItems: [],
      boardColumns: [],
      executions: [],
      workflow: defaultWorkflow,
      ciRuns: [run],
    } as unknown as IOrchestrationSnapshot);
    const loaded = store.decisionCount();
    store.snoozeUntilTomorrow(store.decisions()[0]!.id);

    // assert
    expect(loading).toBeUndefined();
    expect(loaded).toBe(1);
    expect(store.decisionCount()).toBe(0);
  });
});
