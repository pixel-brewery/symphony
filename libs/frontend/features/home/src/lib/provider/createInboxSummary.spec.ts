// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Clock, ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { defaultWorkflow } from '@symphony/domain-workflow';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createInboxSummary } from './createInboxSummary';

// #endregion

describe('createInboxSummary', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('stays unknown until the panel refreshes, then reads its own snapshot and settings', async () => {
    // arrange
    const request = vi.fn(async (method: string) =>
      method === 'snapshot.get'
        ? {
            workItems: [],
            boardColumns: [],
            executions: [],
            events: [],
            workflow: defaultWorkflow,
            skills: [],
          }
        : {
            workspaces: [{ id: 'workspace-1' }],
            activeViewScope: { workspaceIds: ['workspace-1'] },
            agentProfiles: [],
            agentTeams: [],
          },
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: ORCHESTRATION_CLIENT, useValue: { request } },
        { provide: Clock, useValue: { now: signal(Date.parse('2026-10-30T12:00:00Z')) } },
      ],
    });
    const summary = TestBed.runInInjectionContext(() => createInboxSummary());
    const before = summary.decisionCount();

    // act
    await summary.refresh();

    // assert
    expect(before).toBeUndefined();
    expect(request.mock.calls.map(([method]) => method).sort()).toEqual([
      'settings.get',
      'snapshot.get',
    ]);
    expect(summary.decisionCount()).toBe(0);
    expect(summary.firstDecisionTitle()).toBeUndefined();
  });
});
