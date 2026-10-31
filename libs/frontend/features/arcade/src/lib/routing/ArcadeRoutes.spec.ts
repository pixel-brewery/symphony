// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router, type CanMatchFn } from '@angular/router';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { arcadeRoutes } from './ArcadeRoutes';

// #endregion

describe('arcadeRoutes', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('waits for application hydration before evaluating the saved Arcade preference', async () => {
    // arrange
    let complete: () => void = () => undefined;
    const hydration = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const settings = signal<ApplicationSettingsDto | undefined>(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ApplicationBootstrap,
          useValue: { initialize: () => hydration } satisfies Pick<
            ApplicationBootstrap,
            'initialize'
          >,
        },
        {
          provide: ConfigurationStore,
          useValue: { settings } satisfies Pick<ConfigurationStore, 'settings'>,
        },
      ],
    });
    const route = arcadeRoutes[0];
    const guard = route?.canMatch?.find(
      (candidate): candidate is CanMatchFn => typeof candidate === 'function',
    );
    if (!route || !guard) throw new Error('Arcade route must own its availability guard.');
    const currentSnapshot = TestBed.inject(Router).routerState.snapshot.root;
    let settled = false;

    // act
    const pending = TestBed.runInInjectionContext(() => guard(route, [], currentSnapshot));
    void Promise.resolve(pending).then(() => {
      settled = true;
    });
    await Promise.resolve();

    // assert
    expect(settled).toBe(false);
    const initial = applicationSettingsSchema.parse(
      createDefaultApplicationSettings('/tmp/symphony'),
    );
    settings.set({ ...initial, user: { ...initial.user, arcadeEnabled: true } });
    complete();
    expect(await pending).toBe(true);
  });
});
