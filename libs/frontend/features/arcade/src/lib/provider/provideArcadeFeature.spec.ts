// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { NotificationService } from '@symphony/frontend-notification';
import { provideSettings, SettingsViewSlot } from '@symphony/frontend-setting';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArcadeGodModeStore } from '../god-mode/ArcadeGodModeStore';
import { ARCADE_GOD_MODE_STATE } from '../god-mode/ArcadeGodModeStateToken';
import { provideArcadeFeature } from './provideArcadeFeature';

// #endregion

describe('provideArcadeFeature', () => {
  let originalHash = '';

  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));

  beforeEach(() => {
    originalHash = globalThis.location.hash;
    globalThis.location.hash = '#/main/settings';
    TestBed.configureTestingModule({
      providers: [
        provideSettings(),
        provideArcadeFeature(),
        { provide: NotificationService, useValue: { showSuccess: vi.fn() } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    globalThis.location.hash = originalHash;
  });

  afterAll(() => TestBed.resetTestEnvironment());

  it('registers one card and shares the initialized session state with its contribution', async () => {
    // arrange
    const initialization = TestBed.inject(ApplicationInitStatus);

    // act
    await initialization.donePromise;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
    const state = TestBed.inject(ARCADE_GOD_MODE_STATE);
    const cards = TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.Appearance)();

    // assert
    expect(state).toBe(TestBed.inject(ArcadeGodModeStore));
    expect(state.progress()).toBe(1);
    expect(cards.map((card) => card.id)).toEqual(['arcade-settings']);
  });

  it('stops observing keyboard input when the owning application injector is destroyed', async () => {
    // arrange
    const initialization = TestBed.inject(ApplicationInitStatus);
    await initialization.donePromise;
    const state = TestBed.inject(ARCADE_GOD_MODE_STATE);
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));

    // act
    TestBed.resetTestingModule();
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));

    // assert
    expect(state.progress()).toBe(0);
    expect(state.enabled()).toBe(false);
  });

  it('preserves the menu-bar exclusion when application initializers run', async () => {
    // arrange
    globalThis.location.hash = '#/menu-bar';
    const initialization = TestBed.inject(ApplicationInitStatus);

    // act
    await initialization.donePromise;
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));

    // assert
    expect(TestBed.inject(ARCADE_GOD_MODE_STATE).progress()).toBe(0);
  });
});
