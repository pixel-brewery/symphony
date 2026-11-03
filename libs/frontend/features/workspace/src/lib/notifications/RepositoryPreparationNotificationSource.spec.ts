// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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

function arrange(
  automatic: readonly string[] = [],
  repositoryId = 'example',
  workspaceId = 'personal',
) {
  const defaults = applicationSettingsSchema.parse(createDefaultApplicationSettings('/repos'));
  const repository = (id: string, enabled = true) => ({
    id,
    workspaceId,
    displayName: id,
    enabled,
  });
  const settings = {
    ...defaults,
    workspaces: defaults.workspaces.map((workspace) =>
      workspace.id === 'personal' ? { ...workspace, id: workspaceId } : workspace,
    ),
    repositoryBindings: [
      repository(repositoryId),
      repository('example-mobile'),
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
      status(repositoryId, true),
      status('example-mobile', false),
      status('archived', false),
    ]),
  };
  const router = { navigate: vi.fn(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      RepositoryPreparationNotificationSource,
      { provide: RepositoryRuntimeStore, useValue: runtime },
      { provide: REPOSITORY_RUNTIME_CLIENT, useValue: client },
      { provide: Router, useValue: router },
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
  return {
    source: TestBed.inject(RepositoryPreparationNotificationSource),
    runtime,
    client,
    router,
  };
}

describe('RepositoryPreparationNotificationSource', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('reports enabled repositories confirmed as unprepared once their state is read', async () => {
    // arrange
    const { source, client } = arrange(['example-mobile']);
    // act
    const before = source.items();
    await source.refresh();
    // assert
    expect(before).toEqual([]);
    expect(client.request).toHaveBeenCalledWith('repositories.runtime.list', {});
    expect(source.items()).toEqual([
      {
        id: 'repository-preparation:example-mobile',
        severity: 'warning',
        title: 'example-mobile is not prepared locally',
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
    await source.perform('repository-preparation:example-mobile', 'prepare');
    runtime.repositoryRuntimeBusy.set('example-mobile');
    // assert
    expect(runtime.prepareRepository).toHaveBeenCalledExactlyOnceWith('example-mobile');
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

  it('keeps a failed inspection actionable in its workspace instead of attempting preparation', async () => {
    // arrange
    const { source, runtime, router } = arrange();
    runtime.applyRepositoryRuntimeStatuses([
      {
        ...status('example', false),
        preparation: { state: 'unprepared', inspectionError: 'fatal: not a git repository' },
      },
      status('example-mobile', true),
    ]);

    // act
    const items = source.items();
    await source.perform('repository-preparation:example', 'prepare');
    await source.perform('repository-preparation:example', 'open-repository');

    // assert
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      severity: 'error',
      title: 'example cannot be inspected locally',
      location: ['Personal', 'Repositories'],
      scope: { kind: 'workspace', workspaceId: 'personal', name: 'Personal' },
      detail: expect.stringContaining('fatal: not a git repository'),
      actions: [expect.objectContaining({ id: 'open-repository' })],
    });
    expect(runtime.prepareRepository).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/main/settings'], {
      queryParams: { workspace: 'personal', section: 'repositories', repository: 'example' },
    });

    // act
    runtime.applyRepositoryRuntimeStatuses([status('example', true)]);

    // assert
    expect(source.items()).toEqual([]);
  });

  it('opens valid domain identifiers containing separators without native parameter narrowing', async () => {
    // arrange
    const { source, runtime, router } = arrange([], 'repository:example', 'workspace:example');
    runtime.applyRepositoryRuntimeStatuses([
      {
        ...status('repository:example', false),
        workspaceId: 'workspace:example',
        preparation: { state: 'unprepared', inspectionError: 'invalid Git' },
      },
    ]);

    // act
    await source.perform('repository-preparation:repository:example', 'open-repository');

    // assert
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/main/settings'], {
      queryParams: {
        workspace: 'workspace:example',
        section: 'repositories',
        repository: 'repository:example',
      },
    });
  });
});
