// #region Imports

import { describe, expect, it } from 'vitest';
import { SimulatedTracker } from './SimulatedTracker';

// #endregion

describe('SimulatedTracker', () => {
  it('projects seeded items into the current provider scope after configuration changes', async () => {
    // arrange
    const context: {
      workspaceId: string;
      sourceId: string;
      repositoryBindingId?: string;
    } = { workspaceId: 'personal', sourceId: 'simulated' };
    const tracker = new SimulatedTracker(0, () => context);
    Object.assign(context, {
      workspaceId: 'configured-workspace',
      sourceId: 'configured-source',
      repositoryBindingId: 'configured-repository',
    });

    // act
    const items = await tracker.listWorkItems();
    const detail = await tracker.loadWorkItemDetails(items[0]!);
    const columns = await tracker.listBoardColumns();

    // assert
    expect(items).not.toHaveLength(0);
    expect(items.every((item) => item.workspaceId === context.workspaceId)).toBe(true);
    expect(items.every((item) => item.sourceId === context.sourceId)).toBe(true);
    expect(
      items.every((item) => item.repositoryBindingIds?.[0] === context.repositoryBindingId),
    ).toBe(true);
    expect(detail).toMatchObject({
      workspaceId: context.workspaceId,
      sourceId: context.sourceId,
      repositoryBindingIds: [context.repositoryBindingId],
    });
    expect(columns.every((column) => column.sourceId === context.sourceId)).toBe(true);
  });
});
