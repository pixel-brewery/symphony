// #region Imports

import { describe, expect, it } from 'vitest';
import { mobileSnapshotSchema } from '@symphony/mobile-contracts';

// #endregion

describe('MobileSnapshotSchema', () => {
  it('rejects provider payloads that do not match the mobile projection', () => {
    // assert
    expect(
      mobileSnapshotSchema.safeParse({
        version: 1,
        desktopName: 'Symphony',
        generatedAt: '2026-08-10T10:00:00.000Z',
        boardColumns: [],
        tickets: [],
        executions: [],
        credentials: { token: 'secret' },
      }).success,
    ).toBe(false);
    expect(mobileSnapshotSchema.keyof().options).not.toContain('credentials');
  });

  it('allows only public web links in the remote-command ticket projection', () => {
    // act
    // arrange
    const result = mobileSnapshotSchema.safeParse({
      version: 1,
      desktopName: 'Symphony',
      remoteAutomationEnabled: true,
      generatedAt: '2026-08-10T10:00:00.000Z',
      boardColumns: [],
      tickets: [
        {
          id: 'ticket-1',
          workspaceId: 'workspace-1',
          externalId: '#1',
          externalUrl: 'not-an-http-url',
          remoteCommandsAvailable: true,
          title: 'Unsafe link',
          stageId: 'backlog',
          stateLabel: 'Backlog',
          labels: [],
          assignees: [],
        },
      ],
      executions: [],
    });

    // assert
    expect(result.success).toBe(false);
  });

  it('carries the steps and move targets the desktop resolved, and nothing it did not', () => {
    // act
    // arrange
    const result = mobileSnapshotSchema.safeParse({
      version: 1,
      desktopName: 'Symphony',
      generatedAt: '2026-08-10T10:00:00.000Z',
      boardColumns: [],
      tickets: [
        {
          id: 'ticket-1',
          workspaceId: 'workspace-1',
          externalId: '#1',
          remoteCommandsAvailable: false,
          title: 'Steps arrive from the desktop',
          stageId: 'backlog',
          stateLabel: 'Backlog',
          labels: [],
          assignees: [],
          actions: [
            {
              id: 'decide-approve',
              kind: 'decide',
              label: 'Approve',
              effect: 'advance',
              optionId: 'approve',
            },
          ],
          moveTargetColumnIds: ['opt-backlog', 'opt-qualified'],
        },
      ],
      executions: [],
    });

    // assert
    expect(result.success).toBe(true);
    // A ticket without resolved steps offers none rather than defaulting to some.
    expect(
      mobileSnapshotSchema.parse({
        version: 1,
        desktopName: 'Symphony',
        generatedAt: '2026-08-10T10:00:00.000Z',
        boardColumns: [],
        tickets: [
          {
            id: 'ticket-1',
            workspaceId: 'workspace-1',
            externalId: '#1',
            remoteCommandsAvailable: false,
            title: 'No steps',
            stateLabel: 'Backlog',
            labels: [],
            assignees: [],
          },
        ],
        executions: [],
      }).tickets[0],
    ).toMatchObject({ actions: [], moveTargetColumnIds: [] });
  });

  it('allows only public web links in the merge-request projection', () => {
    // act
    // arrange
    const result = mobileSnapshotSchema.safeParse({
      version: 1,
      desktopName: 'Symphony',
      generatedAt: '2026-08-10T10:00:00.000Z',
      boardColumns: [],
      tickets: [],
      mergeRequests: [
        {
          id: 'pull-request-1',
          workspaceId: 'workspace-1',
          number: 1,
          title: 'Unsafe link',
          state: 'open',
          draft: false,
          sourceBranch: 'feature',
          targetBranch: 'main',
          externalUrl: 'javascript:alert(1)',
          createdAt: '2026-08-10T09:00:00.000Z',
          updatedAt: '2026-08-10T10:00:00.000Z',
        },
      ],
      executions: [],
    });

    // assert
    expect(result.success).toBe(false);
  });
});
