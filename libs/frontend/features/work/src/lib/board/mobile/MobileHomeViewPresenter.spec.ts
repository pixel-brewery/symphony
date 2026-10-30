// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileSnapshot } from '@symphony/mobile-contracts';
import { describe, expect, it } from 'vitest';
import { MobileHomeViewPresenter } from './MobileHomeViewPresenter';

// #endregion

describe('MobileHomeViewPresenter', () => {
  it('prioritizes active work and derives the board summary from the mobile snapshot', () => {
    // arrange
    const snapshot = signal<MobileSnapshot | undefined>({
      version: 1,
      desktopName: 'Test desktop',
      remoteAutomationEnabled: true,
      generatedAt: '2026-08-16T07:00:00.000Z',
      boardColumns: [],
      mergeRequests: [],
      tickets: [
        {
          id: 'active-ticket',
          workspaceId: 'workspace-1',
          externalId: 'SYM-1',
          title: 'Active ticket',
          stageId: 'progress',
          stateLabel: 'In progress',
          labels: [],
          assignees: [],
          remoteCommandsAvailable: false,
          actions: [],
          moveTargetColumnIds: [],
        },
        {
          id: 'next-ticket',
          workspaceId: 'workspace-1',
          externalId: 'SYM-2',
          title: 'Next ticket',
          stageId: 'qualified',
          stateLabel: 'Ready',
          labels: [],
          assignees: [],
          remoteCommandsAvailable: false,
          actions: [{ id: 'analyze', kind: 'analyze', label: 'Analyze now' }],
          moveTargetColumnIds: [],
        },
        {
          id: 'completed-ticket',
          workspaceId: 'workspace-1',
          externalId: 'SYM-3',
          title: 'Completed ticket',
          stageId: 'done',
          terminal: true,
          stateLabel: 'Completed',
          labels: [],
          assignees: [],
          remoteCommandsAvailable: false,
          actions: [],
          moveTargetColumnIds: [],
        },
      ],
      executions: [
        {
          id: 'execution-1',
          workItemId: 'active-ticket',
          ticketTitle: 'Active ticket',
          kind: 'solution',
          state: 'running',
          startedAt: '2026-08-16T06:45:00.000Z',
          latestProgress: 'Running verification',
        },
      ],
      executionQueue: [],
    });

    TestBed.configureTestingModule({
      providers: [
        MobileHomeViewPresenter,
        { provide: MobileCompanionStore, useValue: { snapshot: snapshot.asReadonly() } },
      ],
    });

    const presenter = TestBed.inject(MobileHomeViewPresenter);

    // act
    const actual = presenter.openTicketCount();

    // assert
    expect(actual).toBe(2);
    expect(presenter.completedTicketCount()).toBe(1);
    expect(presenter.totalTicketCount()).toBe(3);
    expect(presenter.focusTicket()?.id).toBe('active-ticket');
    expect(presenter.nextTicket()?.id).toBe('next-ticket');
  });
});
