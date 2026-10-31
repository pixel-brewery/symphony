// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import type { IDeliveryProjectionValue } from '../ports/IDeliveryProjectionValue';
import { NotificationService } from '@symphony/frontend-notification';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type { PullRequestSummaryDto } from '@symphony/ipc-contracts-delivery';
import type { IExecutionRecord } from '@symphony/domain-execution';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IDeliveryProjection } from '../ports/IDeliveryProjection';
import { DELIVERY_CLIENT } from '../ports/DeliveryClientToken';
import { DELIVERY_PROJECTION } from '../ports/DeliveryProjectionToken';
import { PullRequestStore } from './PullRequestStore';

// #endregion

describe('PullRequestStore', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('shares creation exclusion with execution publication and prepends a created request without duplication', async () => {
    // arrange
    const created = pullRequest('created', 9);
    const untouched = pullRequest('untouched', 10);
    const { store, request, projection } = arrange({
      executions: [],
      pullRequests: [created, untouched],
    });
    let finish: ((result: PullRequestSummaryDto) => void) | undefined;
    request.mockImplementationOnce(
      () =>
        new Promise<PullRequestSummaryDto>((resolve) => {
          finish = resolve;
        }),
    );
    const draft: RequestPayload<'pull-request.create'> = {
      repositoryBindingId: 'repository',
      targetBranch: 'main',
      sourceBranch: 'feature',
      title: 'Title',
      body: '',
      draft: false,
    };

    // act
    const pending = store.createPullRequest(draft);
    const busy = store.pullRequestBusy();
    const publishing = await store.publishPullRequest('execution');
    const secondCreation = await store.createPullRequest(draft);
    finish?.(created);
    const result = await pending;

    // assert
    expect(busy).toBe(true);
    expect(publishing).toBe(false);
    expect(secondCreation).toBeUndefined();
    expect(request).toHaveBeenCalledExactlyOnceWith('pull-request.create', draft);
    expect(result).toBe(created);
    expect(store.pullRequestBusy()).toBe(false);
    expect(projection()?.pullRequests).toEqual([created, untouched]);
  });

  it('applies execution publication only to its existing execution and preserves the pull-request projection', async () => {
    // arrange
    const original = execution('execution');
    const untouched = execution('untouched');
    const published: IExecutionRecord = {
      ...original,
      pullRequest: {
        number: 9,
        externalUrl: 'https://example.test/pull/9',
        branchUrl: 'https://example.test/tree/feature',
      },
    };
    const pullRequests = [pullRequest('visible', 7)];
    const { store, request, projection, notifications } = arrange({
      executions: [original, untouched],
      pullRequests,
    });
    request.mockResolvedValueOnce(published);

    // act
    const result = await store.publishPullRequest('execution');

    // assert
    expect(result).toBe(true);
    expect(request).toHaveBeenCalledExactlyOnceWith('pull-request.publish', {
      executionId: 'execution',
    });
    expect(projection()?.executions).toEqual([published, untouched]);
    expect(projection()?.pullRequests).toBe(pullRequests);
    expect(store.pullRequestBusy()).toBe(false);
    expect(notifications.showSuccess).toHaveBeenCalledWith(
      'Pull request created.',
      'PR #9 is ready on GitHub.',
    );
  });

  it('releases branch-update exclusion on failure and keeps the original safe error context', async () => {
    // arrange
    const visible = pullRequest('visible', 7);
    const { store, request, projection, notifications } = arrange({
      executions: [],
      pullRequests: [visible],
    });
    request.mockRejectedValueOnce(new Error('Unavailable'));

    // act
    const result = await store.updatePullRequestBranch(visible);

    // assert
    expect(result).toBe(false);
    expect(store.pullRequestBranchUpdatingId()).toBeUndefined();
    expect(projection()?.pullRequests).toEqual([visible]);
    expect(notifications.showError).toHaveBeenCalledWith(
      'Unable to update the pull-request branch.',
      'Unavailable',
    );
  });
});

function arrange(initial: IDeliveryProjectionValue) {
  const projection = signal<IDeliveryProjectionValue | undefined>(initial);
  const projectionPort: IDeliveryProjection = { update: (update) => projection.update(update) };
  const request = vi.fn();
  const notifications = { showSuccess: vi.fn(), showError: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      PullRequestStore,
      { provide: DELIVERY_CLIENT, useValue: { request } },
      { provide: DELIVERY_PROJECTION, useValue: projectionPort },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { store: TestBed.inject(PullRequestStore), request, projection, notifications };
}

function execution(id: string): IExecutionRecord {
  return {
    id,
    workItemId: 'work',
    workflowId: 'workflow',
    state: 'succeeded',
    startedAt: '2026-10-01T09:00:00Z',
  };
}

function pullRequest(id: string, number: number): PullRequestSummaryDto {
  return {
    id,
    workspaceId: 'workspace',
    repositoryBindingId: 'repository',
    number,
    title: id,
    state: 'open',
    draft: false,
    author: 'author',
    sourceBranch: 'feature',
    targetBranch: 'main',
    externalUrl: `https://example.test/pull/${number}`,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  };
}
