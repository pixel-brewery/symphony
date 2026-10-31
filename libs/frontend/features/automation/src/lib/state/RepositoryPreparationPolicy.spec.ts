// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { REPOSITORY_RUNTIME_OPERATIONS } from '@symphony/frontend-core/workspace';
import { NotificationService } from '@symphony/frontend-notification';
import {
  RepositoryRuntimeStore,
  REPOSITORY_RUNTIME_CLIENT,
  type IRepositoryRuntimeClient,
} from '@symphony/frontend-feature-workspace';
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RepositoryPreparationPolicy } from './RepositoryPreparationPolicy';

// #endregion

function arrange(includeRepositories = true) {
  const base = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp/symphony'));
  const repository = (
    id: string,
    enabled = true,
    workspaceId = 'personal',
  ): ApplicationSettingsDto['repositoryBindings'][number] => ({
    id,
    workspaceId,
    sourceControlConnectionId: 'github',
    displayName: id,
    provider: 'github',
    host: 'github.com',
    owner: 'operator',
    name: id,
    defaultBranch: 'main',
    localPath: '',
    enabled,
  });
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...base,
    runtime: { ...base.runtime, automaticExecutionEnabled: true },
    workItemSources: [
      {
        id: 'source-a',
        workspaceId: 'personal',
        connectionId: 'github',
        provider: 'github-projects',
        displayName: 'Board',
        ownerType: 'user',
        owner: 'operator',
        projectNumber: 1,
        enabled: true,
      },
    ],
    repositoryBindings: [
      repository('repository-a'),
      repository('repository-b'),
      repository('disabled', false),
      repository('outside', true, 'other'),
    ],
  });
  const notifications = { showWarning: vi.fn(), showSuccess: vi.fn(), showError: vi.fn() };
  const client: IRepositoryRuntimeClient = {
    request: async () => {
      throw new Error('Unexpected native request.');
    },
  };
  TestBed.configureTestingModule({
    providers: [
      RepositoryPreparationPolicy,
      { provide: AUTOMATION_PREPARATION, useExisting: RepositoryPreparationPolicy },
      ...(includeRepositories
        ? [
            RepositoryRuntimeStore,
            { provide: REPOSITORY_RUNTIME_OPERATIONS, useExisting: RepositoryRuntimeStore },
            { provide: REPOSITORY_RUNTIME_CLIENT, useValue: client },
          ]
        : []),
      {
        provide: ConfigurationStore,
        useValue: { settings, refreshSettings: async () => undefined } satisfies Pick<
          ConfigurationStore,
          'settings' | 'refreshSettings'
        >,
      },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { policy: TestBed.inject(RepositoryPreparationPolicy), notifications };
}

function prepared(id: string): ResponsePayload<'repositories.prepare'> {
  return {
    repositoryBindingId: id,
    workspaceId: 'personal',
    displayName: id,
    repositoryIdentity: id,
    preparation: {
      state: 'prepared',
      path: '/managed/' + id,
      revision: 'revision-1',
      managed: true,
    },
    trust: { state: 'trusted', capabilities: [] },
  };
}

describe('RepositoryPreparationPolicy', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('uses the real repository owner and warns once per unprepared set until readiness is restored', () => {
    // arrange
    const { policy, notifications } = arrange();
    const repositories = TestBed.inject(RepositoryRuntimeStore);
    repositories.applyRepositoryRuntimeStatuses([prepared('repository-a')]);

    // act
    policy.notifyUnpreparedAutomaticExecution();
    policy.notifyUnpreparedAutomaticExecution();

    // assert
    expect(policy.unpreparedAutomaticRepositories().map((repository) => repository.id)).toEqual([
      'repository-b',
    ]);
    expect(notifications.showWarning).toHaveBeenCalledOnce();
    repositories.applyRepositoryRuntimeStatuses([
      prepared('repository-a'),
      prepared('repository-b'),
    ]);
    policy.notifyUnpreparedAutomaticExecution();
    repositories.applyRepositoryRuntimeStatuses([prepared('repository-a')]);
    policy.notifyUnpreparedAutomaticExecution();
    expect(notifications.showWarning).toHaveBeenCalledTimes(2);
  });

  it('does not require or fabricate repository readiness when the Workspace capability is omitted', () => {
    // arrange
    const { policy, notifications } = arrange(false);

    // act
    policy.notifyUnpreparedAutomaticExecution();

    // assert
    expect(policy.unpreparedAutomaticRepositories()).toEqual([]);
    expect(notifications.showWarning).not.toHaveBeenCalled();
  });
});
