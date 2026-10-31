// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DIALOG_REF, DIALOG_REF_DATA } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ICiWorkflow } from '@symphony/domain-ci';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DELIVERY_CI_OPERATIONS } from '../ports/DeliveryCiOperationsToken';
import { DELIVERY_SETTINGS_CLIENT } from '../ports/DeliverySettingsClientToken';
import { DELIVERY_SETTINGS_CONFIGURATION } from '../ports/DeliverySettingsConfigurationToken';
import type { IDeliverySettingsConfiguration } from '../ports/IDeliverySettingsConfiguration';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import type { DeliverySettingsEditorRequest } from './DeliverySettingsEditorRequest';
import { DeliverySettingsEditorViewPresenter } from './DeliverySettingsEditorViewPresenter';

// #endregion

describe('DeliverySettingsEditorViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('splits a changed shared source account while retaining the other repository and CI identity', async () => {
    // arrange
    const { presenter, saveSettings, synchronizeDeliveryContext, connectGitHub, close } = arrange({
      kind: 'repository',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
    });
    presenter.repository.accountLogin = 'new-login';
    presenter.repository.gitProtocol = 'ssh';
    presenter.repository.authenticate = true;
    presenter.repository.displayName = '  Edited repository  ';

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    const saved = saveSettings.mock.calls[0]![0];
    const edited = saved.repositoryBindings.find((item) => item.id === 'repository')!;
    expect(
      saved.repositoryBindings.find((item) => item.id === 'other')?.sourceControlConnectionId,
    ).toBe('shared');
    expect(edited.sourceControlConnectionId).not.toBe('shared');
    expect(edited.displayName).toBe('Edited repository');
    expect(saved.connections.find((item) => item.id === 'shared')).toMatchObject({
      gitProtocol: 'https',
      accountLogin: 'original',
    });
    expect(saved.ciBindings[0]).toMatchObject({
      id: 'existing-ci',
      repositoryBindingId: 'repository',
      sourceControlConnectionId: edited.sourceControlConnectionId,
    });
    expect(synchronizeDeliveryContext).toHaveBeenCalledExactlyOnceWith(
      expect.any(Object),
      'personal',
    );
    expect(connectGitHub).toHaveBeenCalledExactlyOnceWith({
      mode: 'browser',
      hostname: 'github.com',
      gitProtocol: 'ssh',
    });
    expect(close).toHaveBeenCalledOnce();
    expect(applicationSettingsSchema.safeParse(saved).success).toBe(true);
  });

  it('reuses an unchanged shared account and keeps a failed save open without authenticating', async () => {
    // arrange
    const { presenter, saveSettings, connectGitHub, close } = arrange({
      kind: 'repository',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
    });
    presenter.repository.authenticate = true;
    saveSettings.mockResolvedValue(false);

    // act
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(saveSettings.mock.calls[0]![0].repositoryBindings[0]?.sourceControlConnectionId).toBe(
      'shared',
    );
    expect(
      saveSettings.mock.calls[0]![0].connections.filter(
        (connection) => connection.kind === 'github',
      ),
    ).toHaveLength(1);
    expect(connectGitHub).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps Save disabled and names the missing repository details until they are entered', () => {
    // arrange
    const { presenter } = arrange({ kind: 'repository', workspaceId: 'personal' });

    // act
    const before = {
      canSave: presenter.canSave(),
      issues: presenter.repositoryValidationIssues(),
    };
    presenter.repository.displayName = 'Symphony';
    presenter.repository.owner = 'example';
    presenter.repository.name = 'symphony';

    // assert
    expect(before).toEqual({ canSave: false, issues: ['display-name', 'owner', 'name'] });
    expect(presenter.repositoryValidationIssues()).toEqual([]);
    expect(presenter.canSave()).toBe(true);
  });

  it('validates duplicate destinations within their exact workspace and repository before saving', async () => {
    // arrange
    const { presenter, settings, saveSettings, close } = arrange({
      kind: 'delivery-target',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
      production: true,
    });
    settings.update((current) => ({
      ...current,
      deliveryTargets: [
        {
          id: 'existing-target',
          workspaceId: 'personal',
          repositoryBindingId: 'repository',
          displayName: 'Production',
          kind: 'environment',
          environment: 'production',
          production: true,
          celestialBody: 'sun',
        },
      ],
    }));

    // act
    const duplicate = presenter.canSave();
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));
    presenter.deliveryTarget.environment = '  staging  ';
    presenter.deliveryTarget.displayName = '  Staging  ';
    presenter.deliveryTarget.workflowId = '';
    presenter.deliveryTarget.versionInput = 'ignored-without-workflow';
    presenter.saveCommand.execute();
    await vi.waitFor(() => expect(presenter.busy()).toBe(false));

    // assert
    expect(duplicate).toBe(false);
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(saveSettings.mock.calls[0]![0].deliveryTargets.at(-1)).toMatchObject({
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
      displayName: 'Staging',
      environment: 'staging',
      versionInput: undefined,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('loads only active manual workflows of the edited repository and clears mapped inputs when selection changes', async () => {
    // arrange
    const { presenter, request } = arrange({
      kind: 'delivery-target',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
    });
    request.mockResolvedValue({
      workflows: [
        workflow('allowed'),
        workflow('other', { repositoryBindingId: 'other' }),
        workflow('automatic', { supportsManualDispatch: false }),
        workflow('disabled', { state: 'disabled' }),
      ],
    });
    presenter.deliveryTarget.versionInput = 'old-version';
    presenter.deliveryTarget.environmentInput = 'old-environment';
    presenter.deliveryTarget.operationInput = 'old-operation';

    // act
    presenter.refreshDeliveryWorkflowsCommand.execute();
    await vi.waitFor(() => expect(presenter.deliveryWorkflowsBusy()).toBe(false));
    presenter.selectDeliveryWorkflowCommand.execute('allowed');

    // assert
    expect(request).toHaveBeenCalledWith('setup.repository.inspect', {
      settings: expect.any(Object),
      repositoryBindingId: 'repository',
    });
    expect(presenter.deliveryWorkflows().map((item) => item.id)).toEqual(['allowed']);
    expect(presenter.deliveryTarget).toMatchObject({
      workflowId: 'allowed',
      versionInput: '',
      environmentInput: '',
      operationInput: '',
    });
  });
});

function arrange(data: DeliverySettingsEditorRequest) {
  const initial = applicationSettingsSchema.parse(createDefaultApplicationSettings());
  initial.connections = [
    ...initial.connections,
    {
      id: 'shared',
      workspaceId: 'personal',
      kind: 'github',
      displayName: 'Original',
      hostname: 'github.com',
      accountLogin: 'original',
      gitProtocol: 'https',
    },
  ];
  initial.repositoryBindings = ['repository', 'other'].map((id) => ({
    id,
    workspaceId: 'personal',
    sourceControlConnectionId: 'shared',
    provider: 'github',
    displayName: id,
    host: 'github.com',
    owner: 'example',
    name: id,
    defaultBranch: 'main',
    localPath: '',
    enabled: true,
  }));
  initial.ciBindings = [
    {
      id: 'existing-ci',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
      sourceControlConnectionId: 'shared',
      provider: 'github-actions',
      displayName: 'Actions',
      enabled: true,
      agenticDeliveryEnabled: false,
    },
  ];
  const settings = signal<ApplicationSettingsDto>(initial);
  const saveSettings = vi.fn<IDeliverySettingsConfiguration['saveSettings']>(async () => true);
  const synchronizeDeliveryContext = vi.fn<
    IDeliverySettingsConfiguration['synchronizeDeliveryContext']
  >((current) => current);
  const connectGitHub = vi.fn(async () => true);
  const close = vi.fn();
  const request = vi.fn<
    (method: string, payload: unknown) => Promise<{ workflows: readonly ICiWorkflow[] }>
  >(async () => ({ workflows: [] }));
  TestBed.configureTestingModule({
    providers: [
      DeliverySettingsEditorViewPresenter,
      { provide: ChangeDetectorRef, useValue: { detectChanges: vi.fn() } },
      { provide: DIALOG_REF, useValue: { close } },
      { provide: DIALOG_REF_DATA, useValue: data },
      { provide: DELIVERY_CI_OPERATIONS, useValue: null },
      {
        provide: DELIVERY_SETTINGS_CONTEXT,
        useValue: {
          settings,
          snapshot: signal(undefined),
          configurationBusy: signal(false),
          editorBusy: signal(false),
        },
      },
      {
        provide: DELIVERY_SETTINGS_CONFIGURATION,
        useValue: {
          sourceConnectionsAvailable: true,
          saveSettings,
          synchronizeDeliveryContext,
          connectGitHub,
          refreshConfiguration: vi.fn(),
        },
      },
      { provide: DELIVERY_SETTINGS_CLIENT, useValue: { request, selectPath: vi.fn() } },
    ],
  });
  return {
    presenter: TestBed.inject(DeliverySettingsEditorViewPresenter),
    settings,
    saveSettings,
    synchronizeDeliveryContext,
    connectGitHub,
    close,
    request,
  };
}

function workflow(id: string, overrides: Partial<ICiWorkflow> = {}): ICiWorkflow {
  return {
    id,
    workspaceId: 'personal',
    repositoryBindingId: 'repository',
    ciBindingId: 'existing-ci',
    name: id,
    path: '.github/workflows/test.yml',
    defaultBranch: 'main',
    state: 'active',
    supportsManualDispatch: true,
    ...overrides,
  };
}
