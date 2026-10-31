// #region Imports

import type { IApplicationSettings } from '@symphony/configuration-composition';
import type { IWorkItem, IWorkItemClaim, WorkItemClaimAcquisition } from '@symphony/domain-work';
import { describe, expect, it } from 'vitest';
import type { IWorkItemCoordinationPort } from '@symphony/application-work';
import type { IWorkTrackingPort } from '../IWorkTrackingPort';
import { WorkTrackerRouter } from './WorkTrackerRouter';

// #endregion

const workItem: IWorkItem = {
  id: 'PVTI_item-1',
  externalId: '#24',
  sourceId: 'source-1',
  workspaceId: 'personal',
  provider: 'github-projects',
  repository: 'ruederennes/flamox',
  title: 'CR-0010',
  state: 'qualified',
  url: 'https://github.com/ruederennes/flamox/issues/24',
} as unknown as IWorkItem;

describe('WorkTrackerRouter', () => {
  it('renews the claim of a work item the current board listing no longer returns', async () => {
    // Regression: the provider registry is rebuilt from every listing, so an item that leaves the
    // board - a changed view scope, a disabled source, a query that stops matching - used to make
    // the lease renewal of its running execution report "no coordination support", which ended a
    // run whose ownership had not changed at all.
    // arrange
    const renewed: string[] = [];
    let listed: readonly IWorkItem[] = [workItem];
    const provider = {
      listWorkItems: async () => listed,
      coordinatesWorkItem: () => true,
      acquireWorkItemClaim: async (item: IWorkItem): Promise<WorkItemClaimAcquisition> => ({
        status: 'acquired',
        claim: claimFor(item),
      }),
      advanceWorkItemClaim: async (claim: IWorkItemClaim) => claim,
      renewWorkItemClaim: async (claim: IWorkItemClaim) => {
        renewed.push(claim.workItemId);
        return claim;
      },
      releaseWorkItemClaim: async () => undefined,
    };
    const router = routerFor(provider);

    await router.listWorkItems();
    const acquisition = await router.acquireWorkItemClaim(workItem, 'analyze', 'execution-1');
    listed = [];
    // act
    await router.listWorkItems();

    // assert
    expect(acquisition.status).toBe('acquired');
    await expect(router.renewWorkItemClaim(claimFor(workItem))).resolves.toMatchObject({
      workItemId: workItem.id,
    });
    expect(renewed).toEqual([workItem.id]);
  });

  it('names an unclaimed work item as stale rather than blaming the provider', async () => {
    // act
    // arrange
    const router = routerFor({
      listWorkItems: async () => [],
      coordinatesWorkItem: () => true,
      acquireWorkItemClaim: async (item: IWorkItem): Promise<WorkItemClaimAcquisition> => ({
        status: 'acquired',
        claim: claimFor(item),
      }),
      advanceWorkItemClaim: async (claim: IWorkItemClaim) => claim,
      renewWorkItemClaim: async (claim: IWorkItemClaim) => claim,
      releaseWorkItemClaim: async () => undefined,
    });

    // assert
    await expect(router.renewWorkItemClaim(claimFor(workItem))).rejects.toThrow(
      `Refresh the claimed work item first: ${workItem.id}`,
    );
  });

  it('stops routing a work item once its claim was released', async () => {
    // arrange
    let listed: readonly IWorkItem[] = [workItem];
    const router = routerFor({
      listWorkItems: async () => listed,
      coordinatesWorkItem: () => true,
      acquireWorkItemClaim: async (item: IWorkItem): Promise<WorkItemClaimAcquisition> => ({
        status: 'acquired',
        claim: claimFor(item),
      }),
      advanceWorkItemClaim: async (claim: IWorkItemClaim) => claim,
      renewWorkItemClaim: async (claim: IWorkItemClaim) => claim,
      releaseWorkItemClaim: async () => undefined,
    });

    await router.listWorkItems();
    await router.acquireWorkItemClaim(workItem, 'analyze', 'execution-1');
    await router.releaseWorkItemClaim(claimFor(workItem));
    listed = [];
    // act
    await router.listWorkItems();

    // assert
    await expect(router.renewWorkItemClaim(claimFor(workItem))).rejects.toThrow(
      'Refresh the claimed work item first',
    );
  });

  it('routes an operator comment to the owning provider', async () => {
    // arrange
    const written: { workItemId: string; body: string }[] = [];
    const router = routerFor({
      listWorkItems: async () => [workItem],
      createWorkItemComment: async (workItemId: string, body: string) => {
        written.push({ workItemId, body });
        return {
          id: 'comment-24-1',
          body,
          bodyFormat: 'markdown',
          createdAt: '2026-08-20T10:00:00.000Z',
        };
      },
    });

    await router.listWorkItems();
    // act
    const comment = await router.createWorkItemComment(workItem.id, 'Answer in the thread.');

    // assert
    expect(written).toEqual([{ workItemId: workItem.id, body: 'Answer in the thread.' }]);
    expect(comment).toMatchObject({ id: 'comment-24-1', body: 'Answer in the thread.' });
  });

  it('reports a provider without a discussion instead of losing the comment', async () => {
    // arrange
    const router = routerFor({ listWorkItems: async () => [workItem] });

    await router.listWorkItems();
    // act
    const refused = () => router.createWorkItemComment(workItem.id, 'Answer in the thread.');

    // assert
    expect(refused).toThrow('does not carry comments');
  });
});

function claimFor(item: IWorkItem): IWorkItemClaim {
  return {
    id: 'refs/heads/symphony/claims/abc@sha',
    workItemId: item.id,
    action: 'analyze',
    owner: 'test-user',
    acquiredAt: '2026-08-20T00:00:00.000Z',
  };
}

function routerFor(
  provider: Partial<IWorkTrackingPort & IWorkItemCoordinationPort>,
): WorkTrackerRouter {
  const typed = provider as unknown as IWorkTrackingPort & Partial<IWorkItemCoordinationPort>;
  return new WorkTrackerRouter({
    settings: () =>
      ({
        activeViewScope: { workspaceIds: ['personal'], boardLayout: 'mixed' },
        workItemSources: [
          {
            id: 'source-1',
            workspaceId: 'personal',
            connectionId: 'connection-1',
            provider: 'github-projects',
            displayName: 'FLAMOX365',
            ownerType: 'user',
            owner: 'ruederennes',
            projectNumber: 1,
            enabled: true,
          },
        ],
      }) as unknown as IApplicationSettings,
    providers: { 'github-projects': typed, 'azure-devops': typed },
  });
}
