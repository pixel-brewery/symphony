// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IWorkItem } from '@symphony/domain-work';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WorkSnapshotContext } from './WorkSnapshotContext';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';

// #endregion

function snapshot(): IOrchestrationSnapshot {
  return {
    health: {
      status: 'ready',
      utilityProcess: true,
      database: true,
      homebrew: { available: false },
      git: { available: false },
      githubCli: { available: false },
      agents: {
        codex: { available: false },
        claude: { available: false },
        opencode: { available: false },
      },
    },
    workItems: [],
    boardColumns: [],
    executions: [],
    events: [],
    skills: [],
    workflow: defaultWorkflow,
  };
}

function item(id: string): IWorkItem {
  return {
    id,
    workspaceId: 'workspace',
    sourceId: 'source',
    externalId: id,
    title: id,
    body: '',
    detailState: 'summary',
    stageId: 'ready',
    boardColumnId: 'ready',
    provider: 'tracker',
    repository: 'example/platform',
    labels: [],
    assignees: [],
  };
}

describe('WorkSnapshotContext', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('preserves card order on update and appends newly created cards to the same aggregate', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [WorkSnapshotContext, { provide: OrchestrationSynchronizer, useValue: {} }],
    });
    const state = TestBed.inject(ApplicationSnapshot);
    const original = { ...snapshot(), workItems: [item('first'), item('second')] };
    state.update(() => original);
    const environment = TestBed.inject(WorkSnapshotContext);

    // act
    environment.upsertItem({ ...item('first'), title: 'Updated' });
    environment.upsertItem(item('third'));

    // assert
    expect(environment.items().map((entry) => entry.id)).toEqual(['first', 'second', 'third']);
    expect(environment.items()[0]?.title).toBe('Updated');
    expect(state.snapshot()?.executions).toBe(original.executions);
    expect(state.snapshot()?.workflow).toBe(original.workflow);
  });

  it('does not append an absent item when replacing a focused detail result', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [WorkSnapshotContext, { provide: OrchestrationSynchronizer, useValue: {} }],
    });
    TestBed.inject(ApplicationSnapshot).update(() => ({
      ...snapshot(),
      workItems: [item('visible')],
    }));
    const environment = TestBed.inject(WorkSnapshotContext);

    // act
    environment.replaceItem(item('absent'));

    // assert
    expect(environment.items().map((entry) => entry.id)).toEqual(['visible']);
  });
});
