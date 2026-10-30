// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ApplicationBootstrap } from '@symphony/frontend-core/bootstrap';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ShellViewPresenter } from './ShellViewPresenter';

// #endregion

describe('ShellViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));

  afterAll(() => TestBed.resetTestEnvironment());

  afterEach(() => {
    TestBed.resetTestingModule();
    window.location.hash = '';
    vi.restoreAllMocks();
  });

  it('keeps the main shell hydrating until the complete store initialization resolves', async () => {
    // arrange
    window.location.hash = '#/main/home';
    let completeInitialization: (() => void) | undefined;
    const initialization = new Promise<void>((resolve) => {
      completeInitialization = resolve;
    });
    TestBed.configureTestingModule({
      providers: [
        ShellViewPresenter,
        { provide: ApplicationBootstrap, useValue: { initialize: vi.fn(() => initialization) } },
      ],
    });

    // act
    const presenter = TestBed.inject(ShellViewPresenter);

    // assert
    expect(presenter.isHydrating()).toBe(true);
    completeInitialization?.();
    await initialization;
    await Promise.resolve();
    expect(presenter.isHydrating()).toBe(false);
  });

  it('does not initialize the broad workspace store for the menu bar route', () => {
    // arrange
    window.location.hash = '#/menu-bar';
    const initialize = vi.fn();
    TestBed.configureTestingModule({
      providers: [ShellViewPresenter, { provide: ApplicationBootstrap, useValue: { initialize } }],
    });

    // act
    const presenter = TestBed.inject(ShellViewPresenter);

    // assert
    expect(presenter.isHydrating()).toBe(false);
    expect(initialize).not.toHaveBeenCalled();
  });
});
