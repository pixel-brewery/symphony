// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DRAWER_REF, DRAWER_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import type { ICiRun } from '@symphony/domain-ci';
import { CI_CLIENT } from '../../ports/CiClientToken';
import { CI_ACTION_CONTEXT } from '../../ports/CiActionContextToken';
import type { ICiActionContext } from '../../ports/ICiActionContext';
import { CiStore } from '../../state/CiStore';
import { NotificationService } from '@symphony/frontend-notification';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ActionDrawerViewPresenter } from './ActionDrawerViewPresenter';

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  return {
    DRAWER_REF: new InjectionToken('DRAWER_REF'),
    DRAWER_REF_DATA: new InjectionToken('DRAWER_REF_DATA'),
  };
});

vi.mock('@symphony/frontend-core', async () => {
  class CommandStub<TParameter = void> {
    private readonly _execute: (parameter: TParameter) => void;

    public constructor(execute: (parameter: TParameter) => void) {
      this._execute = execute;
    }

    public execute(parameter?: TParameter): void {
      this._execute(parameter as TParameter);
    }
  }
  class ViewPresenterStub {}
  return {
    NotificationService: class NotificationServiceStub {},
    Command: CommandStub,
    Hydratable: () => ViewPresenterStub,
    ViewPresenter: ViewPresenterStub,
  };
});

// #endregion

function ciRun(status: ICiRun['status']): ICiRun {
  return {
    id: 'ci:400',
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name: 'Deploy Dev',
    status,
  };
}

describe('ActionDrawerViewPresenter log polling', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());

  it('waits for a queued cloud run to finish before requesting its complete log', async () => {
    // arrange
    const snapshot = signal<ReturnType<ICiActionContext['snapshot']>>({
      ciRuns: [ciRun('queued')],
    });
    const loadDetails = vi.fn(async () => ({ runId: 'ci:400', jobs: [] }));
    const loadLog = vi.fn(async () => ({
      runId: 'ci:400',
      kind: 'output' as const,
      offset: 0,
      content: 'complete log',
      nextOffset: 12,
      complete: true,
    }));
    const setTimeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation(() => 1 as unknown as number);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ActionDrawerViewPresenter,
        { provide: CI_CLIENT, useValue: { request: vi.fn() } },
        { provide: CI_ACTION_CONTEXT, useValue: { snapshot, settings: signal(undefined) } },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: CiStore,
          useValue: {
            localCiRunningRunId: signal(undefined),
            localCiEnabledFor: () => true,
            loadContinuousIntegrationRunDetails: loadDetails,
            loadContinuousIntegrationRunLog: loadLog,
          },
        },
        { provide: DRAWER_REF, useValue: { close: vi.fn() } },
        {
          provide: DRAWER_REF_DATA,
          useValue: {
            run: {
              id: 'cloud-action:ci:400',
              kind: 'cloud-action',
              sourceLabel: 'GitHub',
              sources: [{ kind: 'github', label: 'GitHub', state: 'queued' }],
              title: 'Deploy Dev',
              message: 'dev',
              state: 'queued',
              statusLabel: 'Queued',
              startedAt: '2026-08-26T15:00:00.000Z',
              active: false,
              ciRunId: 'ci:400',
            },
          },
        },
      ],
    });
    const presenter = TestBed.inject(ActionDrawerViewPresenter);

    // act
    await presenter.onHydrate();

    // assert
    expect(loadDetails).toHaveBeenCalledOnce();
    expect(loadLog).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5_000);

    // arrange
    snapshot.set({ ciRuns: [ciRun('succeeded')] });

    // act
    await presenter.onHydrate();

    // assert
    expect(loadLog).toHaveBeenCalledOnce();
    expect(presenter.fullLog()).toBe('complete log');
    expect(presenter.run().sources).toEqual([
      { kind: 'github', label: 'GitHub', state: 'succeeded' },
    ]);
    setTimeoutSpy.mockRestore();
  });
});
