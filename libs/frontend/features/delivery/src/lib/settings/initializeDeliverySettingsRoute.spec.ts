// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { convertToParamMap, DefaultUrlSerializer, Router, type UrlTree } from '@angular/router';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { SettingsHostSession } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DELIVERY_SETTINGS_CONTEXT } from '../ports/DeliverySettingsContextToken';
import { deliverySettingsDraftFor } from './deliverySettingsDraftFor';
import { initializeDeliverySettingsRoute } from './initializeDeliverySettingsRoute';

// #endregion

describe('initializeDeliverySettingsRoute', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('preserves the seven-parameter deduplication and explicit workspace-before-editor sequence', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
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
    const session = new SettingsHostSession();
    const parameters = signal(
      convertToParamMap({
        section: 'delivery',
        workspace: 'personal',
        repository: 'repository',
        target: 'new',
        production: 'true',
        environment: 'production',
        name: 'Production',
        kind: 'installation',
      }),
    );
    const openEditor = vi.fn(() => {
      expect(session.workspaceId()).toBe('personal');
      expect(session.workspaceSection()).toBe('delivery');
    });
    TestBed.configureTestingModule({
      providers: [{ provide: DELIVERY_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } }],
    });
    TestBed.runInInjectionContext(() =>
      initializeDeliverySettingsRoute({ session, parameters, openEditor }),
    );

    // act
    TestBed.tick();
    parameters.set(
      convertToParamMap({
        section: 'delivery',
        workspace: 'personal',
        repository: 'repository',
        target: 'new',
        production: 'true',
        environment: 'production',
        name: 'Production',
        kind: 'installation',
      }),
    );
    TestBed.tick();

    // assert
    expect(openEditor).toHaveBeenCalledExactlyOnceWith({
      kind: 'delivery-target',
      workspaceId: 'personal',
      repositoryBindingId: 'repository',
      targetId: undefined,
      production: true,
      environment: 'production',
      displayName: 'Production',
      targetKind: 'installation',
    });
    expect(deliverySettingsDraftFor(session).deliveryRepositoryId()).toBe('repository');
  });

  it('does not open a destination editor for a repository outside the requested workspace', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
    settings.repositoryBindings = [
      {
        id: 'other',
        workspaceId: 'outside',
        sourceControlConnectionId: 'github',
        displayName: 'Other repository',
        provider: 'github',
        host: 'github.com',
        owner: 'example',
        name: 'other',
        defaultBranch: 'main',
        localPath: '',
        enabled: true,
      },
    ];
    const session = new SettingsHostSession();
    const parameters = signal(
      convertToParamMap({
        section: 'delivery',
        workspace: 'personal',
        repository: 'other',
        target: 'new',
      }),
    );
    const openEditor = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DELIVERY_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } }],
    });
    TestBed.runInInjectionContext(() =>
      initializeDeliverySettingsRoute({ session, parameters, openEditor }),
    );

    // act
    TestBed.tick();

    // assert
    expect(openEditor).not.toHaveBeenCalled();
    expect(session.workspaceId()).toBe('personal');
    expect(deliverySettingsDraftFor(session).deliveryRepositoryId()).toBe('');
  });

  it('removes the destination keys once the sheet is open so the same request opens it again', () => {
    // arrange
    const settings = applicationSettingsSchema.parse(createDefaultApplicationSettings());
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
    const request = {
      section: 'delivery',
      workspace: 'personal',
      repository: 'repository',
      target: 'new',
      production: 'true',
    };
    const session = new SettingsHostSession();
    const parameters = signal(convertToParamMap(request));
    const openEditor = vi.fn();
    const navigateByUrl = vi.fn<(url: UrlTree) => Promise<boolean>>(async () => true);
    const router = {
      url: '/settings?workspace=personal&section=delivery&repository=repository&target=new&production=true',
      parseUrl: (url: string) => new DefaultUrlSerializer().parse(url),
      navigateByUrl,
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DELIVERY_SETTINGS_CONTEXT, useValue: { settings: signal(settings) } },
        { provide: Router, useValue: router },
      ],
    });
    TestBed.runInInjectionContext(() =>
      initializeDeliverySettingsRoute({ session, parameters, openEditor }),
    );

    // act
    TestBed.tick();
    parameters.set(convertToParamMap({ section: 'delivery', workspace: 'personal' }));
    TestBed.tick();
    parameters.set(convertToParamMap(request));
    TestBed.tick();

    // assert
    expect(navigateByUrl.mock.calls[0]![0].toString()).toBe(
      '/settings?workspace=personal&section=delivery',
    );
    expect(openEditor).toHaveBeenCalledTimes(2);
    expect(deliverySettingsDraftFor(session).deliveryRepositoryId()).toBe('repository');
  });
});
