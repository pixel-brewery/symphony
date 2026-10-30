// @vitest-environment jsdom

// #region Imports

import { inject, InjectionToken, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NavigationEnd, Router } from '@angular/router';
import { DrawerService, THEME } from '@pixel-brewery/mosaik-elements-angular';
import type { IOrchestrationSnapshot } from '@symphony/ipc-contracts-composition';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';
import { NotificationService } from '@symphony/frontend-notification';
import { DesktopUpdateStore } from '@symphony/frontend-update';
import { DesktopSpeechRecognitionService } from '@symphony/frontend-interaction';
import { SearchManager } from '@symphony/frontend-search';
import { provideNavigation, withNavigationItems } from '@symphony/frontend-core/navigation';
import { Subject } from 'rxjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenterViewPresenter } from './PresenterViewPresenter';

vi.mock('@pixel-brewery/mosaik-elements-angular', async () => {
  const { InjectionToken } = await import('@angular/core');
  return {
    DrawerService: class DrawerService {},
    THEME: new InjectionToken('THEME'),
  };
});

vi.mock('@symphony/frontend-core', async () => {
  const { NavigationRegistry } = await vi.importActual<
    typeof import('@symphony/frontend-core/navigation')
  >('@symphony/frontend-core/navigation');
  return {
    NavigationRegistry,
    browserStorage: () => window.localStorage,
    Command: class Command<TParameter> {
      // #region Fields

      private readonly _executeHandler: (parameter: TParameter) => void;
      private readonly _canExecute: Signal<boolean>;

      // #endregion

      // #region Ctor

      public constructor(
        executeHandler: (parameter: TParameter) => void,
        canExecute: Signal<boolean> = signal(true),
      ) {
        this._executeHandler = executeHandler;
        this._canExecute = canExecute;
      }

      // #endregion

      // #region Properties

      public readonly canExecute = (): boolean => this._canExecute();

      // #endregion

      // #region Methods

      public execute(parameter: TParameter): void {
        if (this._canExecute()) this._executeHandler(parameter);
      }

      // #endregion
    },
  };
});

vi.mock('@symphony/frontend-update', () => ({
  DesktopUpdateStore: class DesktopUpdateStore {},
}));

vi.mock('@symphony/frontend-interaction', () => ({
  DesktopSpeechRecognitionService: class DesktopSpeechRecognitionService {},
}));

vi.mock('@symphony/frontend-search', () => ({
  SearchManager: class SearchManager {},
}));

vi.mock('@symphony/frontend-feature-ci/presentation', () => ({
  ActionDrawerView: class ActionDrawerView {},
}));

vi.mock('@symphony/frontend-feature-execution', () => ({
  ExecutionDrawerView: class ExecutionDrawerView {},
}));

// #endregion

describe('PresenterViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));

  afterAll(() => TestBed.resetTestEnvironment());

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        setItem: vi.fn(),
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(() => null),
        length: 0,
      },
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideNavigation(), { provide: SearchManager, useValue: { search: vi.fn() } }],
    });
  });

  it.each(['/main/home', '/main/orbit'])(
    'opens Orbit with the rail closed from %s while keeping explicit rail interaction',
    (initialUrl) => {
      // arrange
      vi.mocked(window.localStorage.getItem).mockReturnValue('true');
      const events = new Subject<NavigationEnd>();
      const router = { url: initialUrl, events };
      TestBed.configureTestingModule({
        providers: [
          PresenterViewPresenter,
          { provide: Router, useValue: router },
          { provide: DrawerService, useValue: {} },
          { provide: THEME, useValue: signal(undefined) },
          {
            provide: DesktopSpeechRecognitionService,
            useValue: { available: false, cancel: vi.fn() },
          },
          {
            provide: DesktopUpdateStore,
            useValue: { state: signal(undefined), busy: signal(false), install: vi.fn() },
          },
          { provide: NotificationService, useValue: { showError: vi.fn() } },
          {
            provide: PRESENTATION_CONTEXT,
            useValue: {
              executionAvailable: true,
              ciAvailable: true,
              workspaceScopeAvailable: true,
              snapshot: signal(undefined),
              settings: signal(undefined),
              activeWorkspace: signal(undefined),
              localCiRunningRunId: signal(undefined),
              localCiStartedAt: signal(undefined),
              skillCatalog: signal(undefined),
            },
          },
        ],
      });
      const presenter = TestBed.inject(PresenterViewPresenter);
      const initiallyOpen = presenter.isRailOpen();

      // act
      router.url = '/main/orbit';
      events.next(new NavigationEnd(1, router.url, router.url));
      const openOnEntry = presenter.isRailOpen();
      presenter.toggleRailCommand.execute();
      router.url = '/main/orbit?q=selected';
      events.next(new NavigationEnd(2, router.url, router.url));

      // assert
      expect(initiallyOpen).toBe(initialUrl === '/main/home');
      expect(openOnEntry).toBe(false);
      expect(presenter.isRailOpen()).toBe(true);
      expect(presenter.searchQuery()).toBe('selected');
      expect(window.localStorage.setItem).toHaveBeenCalledExactlyOnceWith(
        'presentation.isRailOpen',
        'true',
      );
    },
  );

  it('keeps a closed rail untouched when a background Action starts', () => {
    // arrange
    const snapshot = signal({ ciRuns: [] } as unknown as IOrchestrationSnapshot);
    TestBed.configureTestingModule({
      providers: [
        PresenterViewPresenter,
        { provide: Router, useValue: { url: '/main/home', events: new Subject() } },
        { provide: DrawerService, useValue: {} },
        { provide: THEME, useValue: signal(undefined) },
        {
          provide: DesktopSpeechRecognitionService,
          useValue: { available: false, cancel: vi.fn() },
        },
        {
          provide: DesktopUpdateStore,
          useValue: { state: signal(undefined), busy: signal(false), install: vi.fn() },
        },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: PRESENTATION_CONTEXT,
          useValue: {
            executionAvailable: true,
            ciAvailable: true,
            workspaceScopeAvailable: true,
            snapshot,
            settings: signal(undefined),
            activeWorkspace: signal(undefined),
            localCiRunningRunId: signal(undefined),
            localCiStartedAt: signal(undefined),
            skillCatalog: signal(undefined),
          },
        },
      ],
    });
    const presenter = TestBed.inject(PresenterViewPresenter);

    // act
    snapshot.set({
      ciRuns: [
        {
          id: 'ci:running',
          workspaceId: 'workspace',
          ciBindingId: 'ci',
          repositoryBindingId: 'repository',
          name: 'Deploy Dev',
          status: 'in-progress',
        },
      ],
    } as unknown as IOrchestrationSnapshot);
    TestBed.flushEffects();

    // assert
    expect(presenter.isRailOpen()).toBe(false);
    expect(presenter.selectedRailView()).toBe('agent-runs');
    expect(window.localStorage.getItem('presentation.isRailOpen')).toBeNull();
  });

  it('reopens the same Action deep link after returning through Orbit', () => {
    // arrange
    const events = new Subject<NavigationEnd>();
    const closed = new Subject<void>();
    const show = vi.fn(() => ({ closed, requestAttention: vi.fn() }));
    const router = { url: '/main/actions?run=ci%3Adeploy', events };
    TestBed.configureTestingModule({
      providers: [
        PresenterViewPresenter,
        { provide: Router, useValue: router },
        { provide: DrawerService, useValue: { show, isShown: vi.fn(() => false) } },
        { provide: THEME, useValue: signal(undefined) },
        {
          provide: DesktopSpeechRecognitionService,
          useValue: { available: false, cancel: vi.fn() },
        },
        {
          provide: DesktopUpdateStore,
          useValue: { state: signal(undefined), busy: signal(false), install: vi.fn() },
        },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: PRESENTATION_CONTEXT,
          useValue: {
            executionAvailable: true,
            ciAvailable: true,
            workspaceScopeAvailable: true,
            snapshot: signal({
              ciRuns: [
                {
                  id: 'ci:deploy',
                  workspaceId: 'personal',
                  ciBindingId: 'ci',
                  repositoryBindingId: 'repository',
                  name: 'Deploy',
                  status: 'succeeded',
                },
              ],
            }),
            settings: signal(undefined),
            activeWorkspace: signal(undefined),
            localCiRunningRunId: signal(undefined),
            localCiStartedAt: signal(undefined),
            skillCatalog: signal(undefined),
          },
        },
      ],
    });
    TestBed.inject(PresenterViewPresenter);
    TestBed.flushEffects();
    const initialOpens = show.mock.calls.length;
    closed.next();

    // act
    router.url = '/main/orbit';
    events.next(new NavigationEnd(1, router.url, router.url));
    TestBed.flushEffects();
    router.url = '/main/actions?run=ci%3Adeploy';
    events.next(new NavigationEnd(2, router.url, router.url));
    TestBed.flushEffects();

    // assert
    expect(initialOpens).toBe(1);
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ data: { run: expect.objectContaining({ ciRunId: 'ci:deploy' }) } }),
    );
  });

  it('advertises the native desktop speech-recognition service', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        PresenterViewPresenter,
        { provide: Router, useValue: { url: '/main/home', events: new Subject() } },
        { provide: DrawerService, useValue: {} },
        { provide: THEME, useValue: signal(undefined) },
        {
          provide: DesktopSpeechRecognitionService,
          useValue: { available: true, cancel: vi.fn() },
        },
        {
          provide: DesktopUpdateStore,
          useValue: { state: signal(undefined), busy: signal(false), install: vi.fn() },
        },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: PRESENTATION_CONTEXT,
          useValue: {
            executionAvailable: true,
            ciAvailable: true,
            workspaceScopeAvailable: true,
            snapshot: signal(undefined),
            settings: signal(undefined),
            activeWorkspace: signal(undefined),
            localCiRunningRunId: signal(undefined),
            localCiStartedAt: signal(undefined),
            skillCatalog: signal(undefined),
          },
        },
      ],
    });

    // act
    const presenter = TestBed.inject(PresenterViewPresenter);

    // assert
    expect(presenter.voiceInputAvailable).toBe(true);
  });

  describe('feature navigation', () => {
    const navigateByUrl = vi.fn(async () => true);

    beforeEach(() => {
      navigateByUrl.mockClear();
      TestBed.configureTestingModule({
        providers: [
          PresenterViewPresenter,
          {
            provide: Router,
            useValue: {
              url: '/main/pull-requests?q=review&pullRequest=42',
              events: new Subject(),
              navigateByUrl,
            },
          },
          { provide: DrawerService, useValue: {} },
          { provide: THEME, useValue: signal(undefined) },
          {
            provide: DesktopSpeechRecognitionService,
            useValue: { available: false, cancel: vi.fn() },
          },
          {
            provide: DesktopUpdateStore,
            useValue: { state: signal(undefined), busy: signal(false), install: vi.fn() },
          },
          { provide: NotificationService, useValue: { showError: vi.fn() } },
          {
            provide: PRESENTATION_CONTEXT,
            useValue: {
              executionAvailable: true,
              ciAvailable: true,
              workspaceScopeAvailable: true,
              snapshot: signal(undefined),
              settings: signal(undefined),
              activeWorkspace: signal(undefined),
              localCiRunningRunId: signal(undefined),
              localCiStartedAt: signal(undefined),
            },
          },
        ],
      });
    });

    it('delegates the toolbar query without changing its input state or navigation selection', () => {
      // arrange
      const search = vi.fn(async () => undefined);
      TestBed.configureTestingModule({
        providers: [{ provide: SearchManager, useValue: { search } }],
      });
      const presenter = TestBed.inject(PresenterViewPresenter);
      presenter.searchQuery.set('  Match  ');

      // act
      presenter.searchCommand.execute(presenter.searchQuery());

      // assert
      expect(search).toHaveBeenCalledExactlyOnceWith('  Match  ');
      expect(presenter.searchQuery()).toBe('  Match  ');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('projects registered desktop contributions and their reactive visibility without changing the route', () => {
      // arrange
      const enabled = signal(false);
      const preference = new InjectionToken<Signal<boolean>>('optional-feature-preference');
      TestBed.configureTestingModule({
        providers: [
          { provide: preference, useValue: enabled },
          provideNavigation(
            withNavigationItems({
              id: 'optional-navigation',
              items: () => {
                const isEnabled = inject(preference);
                return {
                  key: 'optional',
                  label: 'Optional destination',
                  icon: 'games',
                  route: '/main/optional',
                  order: 20,
                  region: 'desktop-main',
                  isVisible: () => isEnabled(),
                };
              },
            }),
            withNavigationItems({
              id: 'work-navigation',
              items: [
                {
                  key: 'work',
                  label: 'Work',
                  icon: 'board',
                  route: '/main/board',
                  order: 10,
                  region: 'desktop-main',
                },
                {
                  key: 'mobile-work',
                  label: 'Work',
                  icon: 'board',
                  route: '/mobile/work',
                  order: 10,
                  region: 'mobile-main',
                },
              ],
            }),
          ),
        ],
      });
      const presenter = TestBed.inject(PresenterViewPresenter);
      const initialKeys = presenter.navigationItems().map((item) => item.key);

      // act
      enabled.set(true);
      const enabledKeys = presenter.navigationItems().map((item) => item.key);
      enabled.set(false);

      // assert
      expect(initialKeys).toEqual(['work']);
      expect(enabledKeys).toEqual(['work', 'optional']);
      expect(presenter.navigationItems().map((item) => item.key)).toEqual(initialKeys);
      expect(presenter.searchQuery()).toBe('review');
      expect(navigateByUrl).not.toHaveBeenCalled();
    });

    it('keeps the navigation empty when no feature contributes destinations', () => {
      // arrange
      TestBed.configureTestingModule({ providers: [provideNavigation()] });

      // act
      const items = TestBed.inject(PresenterViewPresenter).navigationItems();

      // assert
      expect(items).toEqual([]);
      expect(navigateByUrl).not.toHaveBeenCalled();
    });
  });

  it('installs an update only after it is ready', () => {
    // arrange
    const install = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        PresenterViewPresenter,
        { provide: Router, useValue: { url: '/main/home', events: new Subject() } },
        { provide: DrawerService, useValue: {} },
        { provide: THEME, useValue: signal(undefined) },
        {
          provide: DesktopSpeechRecognitionService,
          useValue: { available: false, cancel: vi.fn() },
        },
        {
          provide: DesktopUpdateStore,
          useValue: {
            state: signal({
              kind: 'ready',
              currentVersion: '0.1.2',
              targetVersion: '0.1.3',
              channel: 'stable',
              downloadedAt: '2026-09-04T20:00:00.000Z',
            }),
            busy: signal(false),
            install,
          },
        },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: PRESENTATION_CONTEXT,
          useValue: {
            executionAvailable: true,
            ciAvailable: true,
            workspaceScopeAvailable: true,
            snapshot: signal(undefined),
            settings: signal(undefined),
            activeWorkspace: signal(undefined),
            localCiRunningRunId: signal(undefined),
            localCiStartedAt: signal(undefined),
            skillCatalog: signal(undefined),
          },
        },
      ],
    });
    const presenter = TestBed.inject(PresenterViewPresenter);

    // act
    presenter.installUpdateCommand.execute();

    // assert
    expect(install).toHaveBeenCalledOnce();
  });

  it('blocks update installation while the update store is busy', () => {
    // arrange
    const install = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        PresenterViewPresenter,
        { provide: Router, useValue: { url: '/main/home', events: new Subject() } },
        { provide: DrawerService, useValue: {} },
        { provide: THEME, useValue: signal(undefined) },
        {
          provide: DesktopSpeechRecognitionService,
          useValue: { available: false, cancel: vi.fn() },
        },
        {
          provide: DesktopUpdateStore,
          useValue: {
            state: signal({
              kind: 'ready',
              currentVersion: '0.1.2',
              targetVersion: '0.1.3',
              channel: 'stable',
              downloadedAt: '2026-09-04T20:00:00.000Z',
            }),
            busy: signal(true),
            install,
          },
        },
        { provide: NotificationService, useValue: { showError: vi.fn() } },
        {
          provide: PRESENTATION_CONTEXT,
          useValue: {
            executionAvailable: true,
            ciAvailable: true,
            workspaceScopeAvailable: true,
            snapshot: signal(undefined),
            settings: signal(undefined),
            activeWorkspace: signal(undefined),
            localCiRunningRunId: signal(undefined),
            localCiStartedAt: signal(undefined),
            skillCatalog: signal(undefined),
          },
        },
      ],
    });
    const presenter = TestBed.inject(PresenterViewPresenter);

    // act
    presenter.installUpdateCommand.execute();

    // assert
    expect(presenter.installUpdateCommand.canExecute()).toBe(false);
    expect(install).not.toHaveBeenCalled();
  });
});
