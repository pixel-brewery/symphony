// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { ICiRun } from '@symphony/domain-ci';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { CiSnapshotContext } from './CiSnapshotContext';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';

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
    pullRequests: [],
    workflow: defaultWorkflow,
    remoteData: { workItems: { state: 'stale' }, pullRequests: { state: 'current' } },
  };
}

describe('CiSnapshotContext', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());
  it('applies CI results to the existing snapshot while preserving unrelated projections', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        CiSnapshotContext,
        {
          provide: ConfigurationStore,
          useValue: { updateStorageStatus: () => undefined } satisfies Pick<
            ConfigurationStore,
            'updateStorageStatus'
          >,
        },
      ],
    });
    const state = TestBed.inject(ApplicationSnapshot);
    const original = snapshot();
    state.update(() => original);
    const environment = TestBed.inject(CiSnapshotContext);
    const run: ICiRun = {
      id: 'run',
      workspaceId: 'workspace',
      ciBindingId: 'ci',
      repositoryBindingId: 'repo',
      name: 'Build',
      status: 'succeeded',
    };

    // act
    environment.applyRefresh({
      ciWorkflows: [],
      ciRuns: [run],
      localCiExecutions: [],
      remoteData: { state: 'current' },
    });

    // assert
    expect(environment.runs()).toEqual([run]);
    expect(state.snapshot()?.workItems).toBe(original.workItems);
    expect(state.snapshot()?.pullRequests).toBe(original.pullRequests);
    expect(state.snapshot()?.workflow).toBe(original.workflow);
    expect(state.snapshot()?.remoteData?.workItems).toBe(original.remoteData?.workItems);
    expect(state.snapshot()?.remoteData?.pullRequests).toBe(original.remoteData?.pullRequests);
    expect(environment.remoteData()?.state).toBe('current');
  });
});
