// #region Imports

import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MobileCompanionStore } from '@symphony/frontend-feature-mobile/browser';
import type { MobileSnapshot, MobileTicket } from '@symphony/mobile-contracts';
import { describe, expect, it, vi } from 'vitest';
import { MobileTicketDetailViewPresenter } from './MobileTicketDetailViewPresenter';

// #endregion

function ticket(overrides: Partial<MobileTicket> = {}): MobileTicket {
  return {
    id: 'ticket-1',
    workspaceId: 'workspace-1',
    externalId: '#138',
    remoteCommandsAvailable: false,
    title: 'Expose execution diagnostics',
    stageId: 'progress',
    boardColumnId: 'progress',
    stateLabel: 'Progress',
    labels: [],
    assignees: [],
    actions: [],
    moveTargetColumnIds: ['qualified', 'ready', 'progress', 'acceptance'],
    ...overrides,
  };
}

function createFixture(overrides: Partial<MobileTicket> = {}) {
  const snapshot = signal<MobileSnapshot | undefined>({
    version: 1,
    desktopName: 'Test desktop',
    remoteAutomationEnabled: false,
    generatedAt: '2026-08-19T18:00:00.000Z',
    boardColumns: [
      { id: 'qualified', label: 'Qualified', ticketCount: 0, tickets: [] },
      { id: 'ready', label: 'Ready', ticketCount: 0, tickets: [] },
      { id: 'progress', label: 'Progress', ticketCount: 1, tickets: [] },
      { id: 'acceptance', label: 'Acceptance', ticketCount: 0, tickets: [] },
      // Not a target: the column belongs to another board.
      { id: 'other-done', label: 'Done', ticketCount: 0, tickets: [] },
    ],
    tickets: [ticket(overrides)],
    mergeRequests: [],
    executions: [],
    executionQueue: [],
  });
  const runCommand = vi.fn(async () => 'execution-1');
  const navigate = vi.fn(async () => true);

  TestBed.configureTestingModule({
    providers: [
      MobileTicketDetailViewPresenter,
      {
        provide: MobileCompanionStore,
        useValue: { snapshot: snapshot.asReadonly(), loading: signal(false), runCommand },
      },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'ticket-1' } } } },
      { provide: Router, useValue: { navigate } },
      { provide: Location, useValue: { back: vi.fn() } },
    ],
  });

  return { presenter: TestBed.inject(MobileTicketDetailViewPresenter), runCommand, navigate };
}

describe('MobileTicketDetailViewPresenter', () => {
  it('groups the steps the desktop offers and starts a run with its own prompt', async () => {
    // arrange
    const { presenter, runCommand, navigate } = createFixture({
      actions: [
        { id: 'analyze', kind: 'analyze', label: 'Re-analyze', repeat: true },
        {
          id: 'publish-pull-request',
          kind: 'publish-pull-request',
          label: 'Create pull request',
          executionId: 'execution-9',
        },
      ],
    });

    // act
    const actual = presenter.runActions().map((action) => action.id);

    // assert
    expect(actual).toEqual(['analyze']);
    expect(presenter.directActions().map((action) => action.id)).toEqual(['publish-pull-request']);
    expect(presenter.decisions()).toEqual([]);

    const analyze = presenter.runActions()[0]!;
    presenter.updatePromptCommand.execute([analyze, 'Focus on the process view.']);
    await presenter.runCommand.execute(analyze);

    expect(runCommand).toHaveBeenCalledWith({
      action: 'analyze',
      workItemId: 'ticket-1',
      prompt: 'Focus on the process view.',
    });
    expect(navigate).toHaveBeenCalledWith(['/processes'], {
      queryParams: { execution: 'execution-1' },
    });
  });

  it('keeps a rework unstartable until the requested change is described', async () => {
    // arrange
    const { presenter, runCommand } = createFixture({
      actions: [
        {
          id: 'solve',
          kind: 'solve',
          label: 'Rework implementation',
          repeat: true,
          requiresFeedback: true,
        },
      ],
    });

    const rework = presenter.runActions()[0]!;
    // act
    const actual = presenter.canRun()(rework);

    // assert
    expect(actual).toBe(false);
    await presenter.runCommand.execute(rework);
    expect(runCommand).not.toHaveBeenCalled();

    presenter.updatePromptCommand.execute([rework, 'Restore the cancelled verification step.']);
    expect(presenter.canRun()(rework)).toBe(true);
    await presenter.runCommand.execute(rework);
    expect(runCommand).toHaveBeenCalledWith({
      action: 'solve',
      workItemId: 'ticket-1',
      feedback: 'Restore the cancelled verification step.',
    });
  });

  it('never starts a step the desktop reports as blocked', async () => {
    // arrange
    const { presenter, runCommand } = createFixture({
      actions: [
        {
          id: 'solve',
          kind: 'solve',
          label: 'Implement now',
          blockedReason: 'No completed analysis. Move the item back to Qualified first.',
        },
      ],
    });

    // act
    await presenter.runCommand.execute(presenter.runActions()[0]!);
    // assert
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('records a gate decision', async () => {
    // arrange
    const { presenter, runCommand } = createFixture({
      actions: [
        {
          id: 'decide-approve',
          kind: 'decide',
          label: 'Approve',
          effect: 'advance',
          optionId: 'approve',
        },
      ],
    });

    // act
    await presenter.runCommand.execute(presenter.decisions()[0]!);
    // assert
    expect(runCommand).toHaveBeenCalledWith({
      action: 'decide',
      workItemId: 'ticket-1',
      optionId: 'approve',
    });
  });

  it('moves only inside the columns of its own board', async () => {
    // arrange
    const { presenter, runCommand } = createFixture();

    // act
    const actual = presenter.moveTargets().map((target) => target.id);

    // assert
    expect(actual).toEqual(['qualified', 'ready', 'progress', 'acceptance']);
    expect(presenter.currentColumnId()).toBe('progress');
    expect(presenter.forwardLabel()).toBe('Forward · Acceptance');
    expect(presenter.backwardLabel()).toBe('Back · Ready');

    await presenter.moveByOffsetCommand.execute(1);
    expect(runCommand).toHaveBeenCalledWith({
      action: 'move',
      workItemId: 'ticket-1',
      boardColumnId: 'acceptance',
    });

    // The column of another board is refused, and so is the column it already rests in.
    await presenter.moveToCommand.execute('other-done');
    await presenter.moveToCommand.execute('progress');
    expect(runCommand).toHaveBeenCalledTimes(1);
  });

  it('keeps the prompt a prompt box reports while it is typed', () => {
    // arrange
    const { presenter } = createFixture({
      actions: [{ id: 'analyze', kind: 'analyze', label: 'Re-analyze', repeat: true }],
    });
    const analyze = presenter.runActions()[0]!;

    // act
    presenter.updatePromptCommand.execute([
      analyze,
      { detail: 0, target: { value: 'Focus on the process view.' } },
    ]);

    // assert
    expect(presenter.prompt()(analyze)).toBe('Focus on the process view.');
  });

  it('moves to the column chosen in the move select', () => {
    // arrange
    const { presenter, runCommand } = createFixture();

    // act
    presenter.moveToSelectionCommand.execute({ oldValue: null, newValue: { value: 'acceptance' } });

    // assert
    expect(runCommand).toHaveBeenCalledWith({
      action: 'move',
      workItemId: 'ticket-1',
      boardColumnId: 'acceptance',
    });
  });
});
