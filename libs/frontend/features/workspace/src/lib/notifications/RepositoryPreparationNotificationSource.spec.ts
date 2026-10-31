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
import type { ApplicationSettingsDto, ResponsePayload } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { REPOSITORY_RUNTIME_CLIENT } from '../ports/RepositoryRuntimeClientToken';
import { RepositoryRuntimeStore } from '../state/RepositoryRuntimeStore';
import { RepositoryPreparationNotificationSource } from './RepositoryPreparationNotificationSource';

// #endregion

type Status = ResponsePayload<'repositories.runtime.list'>[number];

function status(repositoryBindingId: string, prepared: boolean): Status {
  return {
    repositoryBindingId,
    workspaceId: 'personal',
    displayName: repositoryBindingId,
    repositoryIdentity: `owner/${repositoryBindingId}`,
    preparation: prepared
      ? { state: 'prepared', path: '/repo', revision: 'abc', managed: true }
      : { state: 'unprepared' },
    trust: { state: 'restricted', capabilities: [] },
  };
}

function arrange(automatic: readonly string[] = []) {
  const defaults = applicationSettingsSchema.parse(createDefaultApplicationSettings('/repos'));
  const repository = (id: string, enabled = true) => ({
    id,
    workspaceId: 'personal',
    displayName: id,
    enabled,
  });
  const settings = {
    ...defaults,
    repositoryBindings: [
      repository('flamox'),
      repository('flamox-mobile'),
      repository('archived', false),
    ],
  } as unknown as ApplicationSettingsDto;
  const statuses = signal<readonly Status[]>([]);
  const runtime = {
    repositoryRuntimeStatuses: statuses,
    repositoryRuntimeBusy: signal<string | undefined>(undefined),
    applyRepositoryRuntimeStatuses: vi.fn((next: readonly Status[]) => statuses.set(next)),
    prepareRepository: vi.fn(async () => true),
  };
  const client = {
    request: vi.fn(async () => [
      status('flamox', true),
      status('flamox-mobile', false),
      status('archived', false),
    ]),
  };
  TestBed.configureTestingModule({
    providers: [
      RepositoryPreparationNotificationSource,
      { provide: RepositoryRuntimeStore, useValue: runtime },
      { provide: REPOSITORY_RUNTIME_CLIENT, useValue: client },
      { provide: ConfigurationStore, useValue: { settings: signal(settings) } },
      {
        provide: AUTOMATION_PREPARATION,
        useValue: {
          unpreparedAutomaticRepositories: () => automatic.map((id) => ({ id })),
          notifyUnpreparedAutomaticExecution: vi.fn(),
        },
      },
    ],
  });
  return { source: TestBed.inject(RepositoryPreparationNotificationSource), runtime, client };
}

describe('RepositoryPreparationNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports enabled repositories confirmed as unprepared once their state is read', async () => {
    // arrange
    const { source, client } = arrange(['flamox-mobile']);
    // act
    const before = source.items();
    await source.refresh();
    // assert
    expect(before).toEqual([]);
    expect(client.request).toHaveBeenCalledWith('repositories.runtime.list', {});
    expect(source.items()).toEqual([
      {
        id: 'repository-preparation:flamox-mobile',
        severity: 'warning',
        title: 'flamox-mobile is not prepared locally',
        location: ['Personal', 'Repositories'],
        detail: 'automatic AI work waits for it',
        scope: { kind: 'workspace', workspaceId: 'personal', name: 'Personal' },
        actions: [
          {
            id: 'prepare',
            label: 'Prepare locally',
            emphasis: 'secondary',
            busy: false,
            disabled: false,
          },
        ],
      },
    ]);
  });

  it('prepares the repository with the existing command', async () => {
    // arrange
    const { source, runtime } = arrange();
    await source.refresh();
    // act
    await source.perform('repository-preparation:flamox-mobile', 'prepare');
    runtime.repositoryRuntimeBusy.set('flamox-mobile');
    // assert
    expect(runtime.prepareRepository).toHaveBeenCalledExactlyOnceWith('flamox-mobile');
    expect(source.items()[0]?.detail).toBe('AI work in it waits until it is');
    expect(source.items()[0]?.actions[0]).toMatchObject({ busy: true, disabled: true });
  });

  it('keeps the last state when reading it fails', async () => {
    // arrange
    const { source, client, runtime } = arrange();
    await source.refresh();
    client.request.mockRejectedValueOnce(new Error('offline'));
    // act
    await source.refresh();
    // assert
    expect(runtime.applyRepositoryRuntimeStatuses).toHaveBeenCalledOnce();
    expect(source.items()).toHaveLength(1);
  });
});
