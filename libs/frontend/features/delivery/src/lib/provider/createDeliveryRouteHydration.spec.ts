// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import { hydratePullRequestsRoute } from '../view-presenters/routeHydration/hydratePullRequestsRoute';
import { createDeliveryRouteHydration } from './createDeliveryRouteHydration';

// #endregion

describe('createDeliveryRouteHydration', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('hydrates pull requests through the existing owners when CI is omitted', async () => {
    // arrange
    const calls: string[] = [];
    const initialize = vi.fn(async () => {
      calls.push('initialize');
    });
    const refresh = vi.fn(async () => {
      calls.push('refresh');
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: ApplicationBootstrap, useValue: { initialize } },
        { provide: OrchestrationSynchronizer, useValue: { refresh } },
        { provide: DELIVERY_CI_OPERATIONS, useValue: null },
      ],
    });
    const context = TestBed.runInInjectionContext(createDeliveryRouteHydration);

    // act
    await hydratePullRequestsRoute(context);

    // assert
    expect(calls).toEqual(['initialize', 'refresh']);
    expect(initialize).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
