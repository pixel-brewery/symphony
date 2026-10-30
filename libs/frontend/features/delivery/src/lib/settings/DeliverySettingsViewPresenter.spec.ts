// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import {
  SETTINGS_WORKSPACE_CONTEXT,
  SettingsEditorService,
  SettingsHostSession,
} from '@symphony/frontend-setting';
import { Subject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DELIVERY_REPOSITORY_RUNTIME } from '../ports/DeliveryRepositoryRuntimeToken';
import { DELIVERY_SETTINGS_CONFIGURATION } from '../ports/DeliverySettingsConfigurationToken';
import type { IDeliverySettingsConfiguration } from '../ports/IDeliverySettingsConfiguration';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { DeliverySettingsViewPresenter } from './DeliverySettingsViewPresenter';

// #endregion

describe('DeliverySettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('retains the chosen project when native cards remount within the same Settings session', () => {
    // arrange
    const { presenter, session } = arrange();
    presenter.selectDeliveryRepositoryCommand.execute('second');

    // act
    session.selectWorkspaceSection('repositories');
    const remounted = TestBed.runInInjectionContext(() => new DeliverySettingsViewPresenter());
    session.selectWorkspaceSection('delivery');

    // assert
    expect(remounted.deliveryRepositoryId).toBe(presenter.deliveryRepositoryId);
    expect(remounted.deliveryRepository()?.id).toBe('second');
    expect(remounted.deliveryTargets().map((target) => target.id)).toEqual(['second-target']);
    expect(remounted.repositoryRuntimeAvailable).toBe(false);
  });

  it('requires a positive confirmation and preserves destinations of the other project', () => {
    // arrange
    const { presenter, decisions, saveSettings } = arrange();

    // act
    presenter.removeDeliveryTargetCommand.execute('first-target');
    decisions[0]!.next({ reason: 'negative' });
    decisions[0]!.complete();
    presenter.removeDeliveryTargetCommand.execute('first-target');
    decisions[1]!.next({ reason: 'positive' });
    decisions[1]!.complete();

    // assert
    expect(saveSettings).toHaveBeenCalledOnce();
    expect(saveSettings.mock.calls[0]![0].deliveryTargets.map((target) => target.id)).toEqual([
      'second-target',
    ]);
  });
});

function arrange() {
  const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
  settings.repositoryBindings = ['first', 'second'].map((id) => ({
    id,
    workspaceId: 'personal',
    sourceControlConnectionId: 'github',
    displayName: id,
    provider: 'github',
    host: 'github.com',
    owner: 'example',
    name: id,
    defaultBranch: 'main',
    localPath: '',
    enabled: true,
  }));
  settings.deliveryTargets = settings.repositoryBindings.map((repository) => ({
    id: `${repository.id}-target`,
    workspaceId: 'personal',
    repositoryBindingId: repository.id,
    displayName: 'Production',
    kind: 'environment',
    environment: 'production',
    production: true,
    celestialBody: 'sun',
  }));
  const session = new SettingsHostSession();
  session.openWorkspace('personal', 'delivery');
  const decisions: Subject<{ readonly reason: string }>[] = [];
  const saveSettings = vi.fn<IDeliverySettingsConfiguration['saveSettings']>(async () => true);
  TestBed.configureTestingModule({
    providers: [
      DeliverySettingsViewPresenter,
      { provide: SettingsHostSession, useValue: session },
      { provide: SettingsEditorService, useValue: { open: vi.fn() } },
      {
        provide: SETTINGS_WORKSPACE_CONTEXT,
        useValue: { workspaceId: session.workspaceId, sectionId: session.workspaceSection },
      },
      { provide: DELIVERY_REPOSITORY_RUNTIME, useValue: null },
      {
        provide: DELIVERY_SETTINGS_CONFIGURATION,
        useValue: { saveSettings, refreshConfiguration: vi.fn() },
      },
      {
        provide: DELIVERY_SETTINGS_CONTEXT,
        useValue: { settings: signal(settings), configurationBusy: signal(false) },
      },
      {
        provide: MessageBoxService,
        useValue: {
          show: vi.fn(() => {
            const closed = new Subject<{ readonly reason: string }>();
            decisions.push(closed);
            return { closed };
          }),
        },
      },
    ],
  });
  return {
    presenter: TestBed.inject(DeliverySettingsViewPresenter),
    session,
    saveSettings,
    decisions,
  };
}
