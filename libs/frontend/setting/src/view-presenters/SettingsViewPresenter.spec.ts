// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import type { IFeature } from '@symphony/frontend-core';
import type { SettingsFeatureKind } from '../provider/SettingsFeatureKind';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { BehaviorSubject } from 'rxjs';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { SettingsEditorService } from '../editor/SettingsEditorService';
import { provideSettings } from '../provider/provideSettings';
import { withSettingsRouteInitializer } from '../provider/withSettingsRouteInitializer';
import type { ISettingsRouteContext } from '../routing/ISettingsRouteContext';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import { SettingsViewPresenter } from './SettingsViewPresenter';

// #endregion

function arrange(initializers: readonly IFeature<SettingsFeatureKind>[]) {
  const parameters = new BehaviorSubject(convertToParamMap({ workspace: 'personal' }));
  const settings = signal<ApplicationSettingsDto | undefined>(
    applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp')),
  );
  TestBed.configureTestingModule({
    providers: [
      provideSettings(...initializers),
      SettingsHostSession,
      SettingsViewPresenter,
      { provide: SettingsEditorService, useValue: { open: vi.fn() } },
      {
        provide: ConfigurationStore,
        useValue: {
          settings,
          connections: signal(undefined),
          refreshConfiguration: async () => {},
        },
      },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: parameters, snapshot: { queryParamMap: parameters.value } },
      },
    ],
  });
  return { parameters, settings };
}

describe('SettingsViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('starts each selected feature route initializer once and shares the actual reactive route selection', () => {
    // arrange
    const seen: (string | null)[] = [];
    const initialize = vi.fn((context: ISettingsRouteContext) => {
      effect(() => {
        seen.push(context.parameters().get('workspace'));
      });
    });
    const { parameters } = arrange([
      withSettingsRouteInitializer({ id: 'owner-route', initialize }),
    ]);
    TestBed.inject(SettingsViewPresenter);
    TestBed.tick();

    // act
    parameters.next(convertToParamMap({ workspace: 'changed' }));
    TestBed.tick();

    // assert
    expect(initialize).toHaveBeenCalledOnce();
    expect(seen).toEqual(['personal', 'changed']);
    expect(initialize.mock.calls[0]?.[0].session).toBe(TestBed.inject(SettingsHostSession));
  });

  it('rejects duplicate route initializer identities before any feature callback runs', () => {
    // arrange
    const initialize = vi.fn();
    arrange([]);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SETTINGS_ROUTE_INITIALIZERS,
          multi: true,
          useValue: { id: 'duplicate', initialize },
        },
        {
          provide: SETTINGS_ROUTE_INITIALIZERS,
          multi: true,
          useValue: { id: 'duplicate', initialize },
        },
      ],
    });

    // act / assert
    expect(() => TestBed.inject(SettingsViewPresenter)).toThrow(
      "Duplicate Settings route initializer 'duplicate'.",
    );
    expect(initialize).not.toHaveBeenCalled();
  });
});
