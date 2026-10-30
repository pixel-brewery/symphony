// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { NotificationService } from '@symphony/frontend-notification';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IWorkOnboardingClient } from '../ports/IWorkOnboardingClient';
import type { IWorkOnboardingContext } from '../ports/IWorkOnboardingContext';
import { WORK_ONBOARDING_CLIENT } from '../ports/WorkOnboardingClientToken';
import { WORK_ONBOARDING_CONTEXT } from '../ports/WorkOnboardingContextToken';
import { SetupViewPresenter } from './SetupViewPresenter';

// #endregion

function arrange(
  prepareRepository: NonNullable<IWorkOnboardingContext['prepareRepository']> = async () => true,
) {
  const original = createDefaultApplicationSettings('/tmp/symphony');
  const settings = applicationSettingsSchema.parse({
    ...original,
    connections: [
      ...original.connections,
      {
        id: 'github',
        workspaceId: 'personal',
        kind: 'github',
        displayName: 'GitHub',
        hostname: 'github.com',
        accountLogin: 'operator',
        gitProtocol: 'https',
      },
    ],
    repositoryBindings: [
      {
        id: 'repository-a',
        workspaceId: 'personal',
        sourceControlConnectionId: 'github',
        displayName: 'operator/project',
        provider: 'github',
        host: 'github.com',
        owner: 'operator',
        name: 'project',
        defaultBranch: 'main',
        localPath: '',
        enabled: true,
      },
    ],
    workItemSources: [
      {
        id: 'source-a',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Project',
        ownerType: 'user',
        owner: 'operator',
        projectNumber: 1,
        enabled: true,
      },
    ],
  });
  const saveSettings = vi.fn<IWorkOnboardingContext['saveSettings']>().mockResolvedValue(true);
  const startAnalyzer = vi
    .fn<NonNullable<IWorkOnboardingContext['startAnalyzer']>>()
    .mockResolvedValue(true);
  const context: IWorkOnboardingContext = {
    settings: signal<ApplicationSettingsDto | undefined>(settings),
    selectedWorkspaceIds: signal(['personal']),
    scopedWorkItems: signal([]),
    snapshot: signal(undefined),
    initialize: async () => undefined,
    saveSettings,
    refresh: async () => undefined,
    prepareRepository,
    startAnalyzer,
  };
  const client: IWorkOnboardingClient = {
    request: async () => {
      throw new Error('Unexpected native request.');
    },
  };
  const navigate = vi.fn<Router['navigate']>().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      SetupViewPresenter,
      { provide: WORK_ONBOARDING_CONTEXT, useValue: context },
      { provide: WORK_ONBOARDING_CLIENT, useValue: client },
      { provide: Router, useValue: { navigate } },
      { provide: NotificationService, useValue: { showError: vi.fn() } },
    ],
  });
  const presenter = TestBed.inject(SetupViewPresenter);
  presenter.base.set(settings);
  presenter.workspaceId.set('personal');
  presenter.repositoryId.set('repository-a');
  presenter.cliAccountId.set('personal-codex');
  presenter.sourceId.set('source-a');
  return { presenter, saveSettings, startAnalyzer, navigate };
}

describe('SetupViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps the proposal local when the selected delivery workflow has no immutable-version input', () => {
    // arrange
    const { presenter, saveSettings } = arrange();
    presenter.targetWorkflowId.set('delivery-workflow');

    // act
    presenter.applyCommand.execute();

    // assert
    expect(saveSettings).not.toHaveBeenCalled();
    expect(presenter.applied()).toBe(false);
    expect(presenter.busy()).toBe(false);
    expect(presenter.error()).toBe(
      'Choose the workflow input that accepts the immutable version before applying.',
    );
  });

  it.each([true, false])(
    'starts the read-only analysis only after repository preparation succeeds (%s)',
    async (prepared) => {
      // arrange
      let finish: (value: boolean) => void = () => undefined;
      const pending = new Promise<boolean>((resolve) => {
        finish = resolve;
      });
      const prepare = vi
        .fn<NonNullable<IWorkOnboardingContext['prepareRepository']>>()
        .mockReturnValue(pending);
      const { presenter, startAnalyzer, navigate } = arrange(prepare);
      presenter.applied.set(true);
      presenter.ticketId.set('ticket-a');

      // act
      presenter.analyseCommand.execute();

      // assert
      expect(prepare).toHaveBeenCalledExactlyOnceWith('repository-a');
      expect(startAnalyzer).not.toHaveBeenCalled();
      expect(presenter.busy()).toBe(true);
      finish(prepared);
      await vi.waitFor(() => expect(presenter.busy()).toBe(false));
      if (prepared) {
        expect(startAnalyzer).toHaveBeenCalledExactlyOnceWith(false, 'ticket-a', undefined, 'once');
        expect(navigate).toHaveBeenCalledExactlyOnceWith(['/main/board'], {
          queryParams: { item: 'ticket-a', process: 'true' },
        });
      } else {
        expect(startAnalyzer).not.toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
        expect(presenter.error()).toContain('Repository preparation failed.');
      }
    },
  );
});
