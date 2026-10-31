// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import type { IPullRequestSummary } from '@symphony/domain-delivery';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DeliverySnapshotProjection } from './DeliverySnapshotProjection';
import { ApplicationSnapshot } from '@symphony/frontend-core/snapshot';
import { signal } from '@angular/core';

// #endregion

describe('DeliverySnapshotProjection', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('preserves unrelated transport fields and an omitted pull-request field during execution updates', () => {
    // arrange
    const state = { snapshot: signal<IOrchestrationSnapshot | undefined>(undefined) };
    TestBed.configureTestingModule({
      providers: [
        DeliverySnapshotProjection,
        {
          provide: ApplicationSnapshot,
          useValue: {
            update: (update: Parameters<ApplicationSnapshot['update']>[0]) =>
              state.snapshot.update(update),
          },
        },
      ],
    });
    const original = snapshot();
    state.snapshot.set(original);
    const adapter = TestBed.inject(DeliverySnapshotProjection);

    // act
    adapter.update((value) => (value ? { ...value, executions: [] } : value));
    const current = state.snapshot();

    // assert
    expect(current?.workItems).toBe(original.workItems);
    expect(current?.workflow).toBe(original.workflow);
    expect(current?.health).toBe(original.health);
    expect(Object.prototype.hasOwnProperty.call(current, 'pullRequests')).toBe(false);
  });

  it('keeps an absent snapshot absent and applies only the owned fields after hydration', () => {
    // arrange
    const state = { snapshot: signal<IOrchestrationSnapshot | undefined>(undefined) };
    TestBed.configureTestingModule({
      providers: [
        DeliverySnapshotProjection,
        {
          provide: ApplicationSnapshot,
          useValue: {
            update: (update: Parameters<ApplicationSnapshot['update']>[0]) =>
              state.snapshot.update(update),
          },
        },
      ],
    });
    const adapter = TestBed.inject(DeliverySnapshotProjection);
    const request: IPullRequestSummary = {
      id: 'request',
      workspaceId: 'workspace',
      repositoryBindingId: 'repository',
      number: 1,
      title: 'Request',
      state: 'open',
      draft: false,
      sourceBranch: 'feature',
      targetBranch: 'main',
      externalUrl: 'https://example.test/pull/1',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    };

    // act
    adapter.update((value) => (value ? { ...value, pullRequests: [request] } : value));
    const missing = state.snapshot();
    const original = snapshot();
    state.snapshot.set(original);
    adapter.update((value) => (value ? { ...value, pullRequests: [request] } : value));

    // assert
    expect(missing).toBeUndefined();
    expect(state.snapshot()?.pullRequests).toEqual([request]);
    expect(state.snapshot()?.executions).toBe(original.executions);
    expect(state.snapshot()?.events).toBe(original.events);
  });
});

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
