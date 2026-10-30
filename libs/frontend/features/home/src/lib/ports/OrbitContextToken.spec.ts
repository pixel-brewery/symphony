// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ORCHESTRATION_CLIENT } from '@symphony/frontend-core';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DELIVERY_LAUNCH_OPERATIONS } from '@symphony/frontend-core/delivery-operations';
import { WORK_FILTERS } from '@symphony/frontend-core/work';
import { provideDeliveryFeature } from '@symphony/frontend-feature-delivery';
import { provideWorkFeature } from '@symphony/frontend-feature-work';
import { WorkFilterStore } from '@symphony/frontend-feature-work/filters';
import { NotificationService } from '@symphony/frontend-notification';
import type { IDeliveryLaunchPlan } from '@symphony/domain-delivery';
import { BehaviorSubject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { provideHomeFeature } from '../provider/provideHomeFeature';
import { OrbitViewPresenter } from '../view-presenters/OrbitViewPresenter';
import { ORBIT_CONTEXT } from './OrbitContextToken';

// #endregion

describe('ORBIT_CONTEXT', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps configured targets readable without constructing Work filters or calling omitted Delivery operations', async () => {
    // arrange
    const { presenter, request, navigate } = arrange();
    presenter.initialize();
    await settle();
    presenter.selectCommand.execute('production');
    presenter.changeLaunchRefCommand.execute('revision');
    presenter.launchPlan.set(plan());

    // act
    presenter.refreshDeliveryCommand.execute();
    presenter.previewLaunchCommand.execute();
    presenter.startLaunchCommand.execute();
    presenter.reconcileCommand.execute('operation');
    presenter.configureDeliveryCommand.execute();
    presenter.searchCommand.execute('ticket');
    presenter.clearFiltersCommand.execute();
    await settle();

    // assert
    expect(TestBed.inject(WORK_FILTERS, null)).toBeNull();
    expect(TestBed.inject(WorkFilterStore, null)).toBeNull();
    expect(TestBed.inject(DELIVERY_LAUNCH_OPERATIONS, null)).toBeNull();
    expect(presenter.workFiltersAvailable).toBe(false);
    expect(presenter.landscape).toBeNull();
    expect(presenter.deliveryAvailable).toBe(false);
    expect(presenter.targets().map((target) => target.id)).toEqual(['production']);
    expect(presenter.selectedTarget()?.id).toBe('production');
    expect(request).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses exactly the existing Work filter owner when Work is selected', async () => {
    // arrange
    const { presenter } = arrange({ work: true });
    const owner = TestBed.inject(WorkFilterStore);

    // act
    presenter.searchCommand.execute('#123');
    owner.setStageId('review');

    // assert
    expect(TestBed.inject(WORK_FILTERS)).toBe(owner);
    expect(TestBed.inject(ORBIT_CONTEXT).workFilters).toBe(owner);
    expect(presenter.landscape?.query()).toBe('#123');
    expect(presenter.landscape?.stageId()).toBe('review');
    expect(owner.query()).toBe('#123');
  });

  it('dispatches the same two evidence reads through the actual selected Delivery adapter', async () => {
    // arrange
    const { presenter, request } = arrange({ delivery: true });

    // act
    presenter.initialize();
    await settle();

    // assert
    expect(presenter.deliveryAvailable).toBe(true);
    expect(TestBed.inject(ORBIT_CONTEXT).delivery).toBe(TestBed.inject(DELIVERY_LAUNCH_OPERATIONS));
    expect(request.mock.calls.map(([method]) => method)).toEqual([
      'delivery.refresh',
      'delivery.operations',
    ]);
    expect(presenter.deliveryBusy()).toBe(false);
    expect(presenter.deliveryError()).toBe('');
    expect(presenter.delivery()?.targets.map((target) => target.id)).toEqual(['production']);
  });
});

function arrange(options: { work?: boolean; delivery?: boolean } = {}) {
  const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
  settings.connections.push({
    id: 'github',
    workspaceId: 'personal',
    kind: 'github',
    displayName: 'GitHub',
    hostname: 'github.com',
    gitProtocol: 'https',
  });
  settings.repositoryBindings = [
    {
      id: 'repository',
      workspaceId: 'personal',
      sourceControlConnectionId: 'github',
      displayName: 'Repository',
      provider: 'github',
      host: 'github.com',
      owner: 'example',
      name: 'repository',
      defaultBranch: 'main',
      localPath: '',
      enabled: true,
    },
  ];
  settings.deliveryTargets = [
    {
      id: 'production',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
      displayName: 'Production',
      kind: 'environment',
      environment: 'production',
      production: true,
      celestialBody: 'sun',
      workflowId: 'deploy',
    },
  ];
  const request = vi.fn(async (...args: [method: string, payload?: unknown]): Promise<unknown> => {
    const [method] = args;
    if (method === 'delivery.refresh')
      return {
        targets: settings.deliveryTargets,
        evidence: [],
        refreshedAt: '2026-10-09T12:00:00Z',
        errors: [],
      };
    if (method === 'delivery.operations') return [];
    throw new Error(`Unexpected request: ${method}`);
  });
  const navigate = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHomeFeature(),
      ...(options.work ? [provideWorkFeature()] : []),
      ...(options.delivery ? [provideDeliveryFeature()] : []),
      OrbitViewPresenter,
      {
        provide: ApplicationBootstrap,
        useValue: { initialize: vi.fn(async (): Promise<void> => undefined) },
      },
      { provide: ORCHESTRATION_CLIENT, useValue: { request } },
      {
        provide: NotificationService,
        useValue: {
          showWarning: vi.fn(),
          showError: vi.fn(),
          showSuccess: vi.fn(),
          showInfo: vi.fn(),
        },
      },
      { provide: Router, useValue: { navigate } },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: new BehaviorSubject(convertToParamMap({})) },
      },
    ],
  });
  TestBed.inject(ConfigurationStore).applySettings(settings);
  return { presenter: TestBed.inject(OrbitViewPresenter), request, navigate };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  TestBed.tick();
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
}

function plan(): IDeliveryLaunchPlan {
  return {
    targetId: 'production',
    targetName: 'Production',
    repositoryBindingId: 'repository',
    ref: 'revision',
    revision: 'revision',
    workflowId: 'deploy',
    workflowPath: '.github/workflows/deploy.yml',
    inputs: {},
    definitionHash: 'definition',
  };
}
