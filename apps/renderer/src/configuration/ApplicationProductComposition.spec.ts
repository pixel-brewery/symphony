// @vitest-environment jsdom

// #region Imports
import '@angular/compiler';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router, RouterOutlet, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTheme, ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { SohoTheme } from '@pixel-brewery/mosaik-themes';
import {
  NavigationRegistry,
  ORCHESTRATION_CLIENT,
  provideNavigation,
} from '@symphony/frontend-core';
import {
  ApplicationBootstrap,
  APPLICATION_BOOTSTRAP_CI,
  APPLICATION_BOOTSTRAP_EXECUTION,
  APPLICATION_BOOTSTRAP_PLATFORM,
  APPLICATION_BOOTSTRAP_SKILLS,
} from '@symphony/frontend-core/bootstrap';
import { ApplicationProjection } from '@symphony/frontend-core/projection';
import { AUTOMATION_PREPARATION } from '@symphony/frontend-core/automation';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { OrchestrationSynchronizer } from '@symphony/frontend-core/synchronization';
import { OrchestrationState } from '@symphony/frontend-core/testing/orchestration';
import {
  applicationSettingsSchema,
  createDefaultApplicationSettings,
} from '@symphony/configuration-composition';
import { AutomationSettingsStore } from '@symphony/frontend-feature-automation';
import { CiStore, CI_RUNTIME_WORKSPACE_ROOT } from '@symphony/frontend-feature-ci';
import { NotificationService } from '@symphony/frontend-notification';
import { MenuBarViewPresenter, presentationRoutes } from '@symphony/frontend-presentation';
import { PRESENTATION_CONTEXT } from '@symphony/frontend-presentation/context';
import { provideQuickCreate, QuickCreateManager } from '@symphony/frontend-quick-create';
import { provideSearch, SEARCH_PROVIDERS, SearchManager } from '@symphony/frontend-search';
import {
  provideSettings,
  settingsRoutes,
  SettingsCatalog,
  SettingsViewSlot,
} from '@symphony/frontend-setting';
import { provideWidget, WIDGET_VIEW_SLOT } from '@symphony/frontend-widget';
import { applicationThemeOverrides } from '@symphony/frontend-ui';
import type { IOrchestrationApi } from '@symphony/ipc-contracts-composition';
import type { IDesktopApi } from '@symphony/ipc-contracts-desktop';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { applicationProductComposition } from './ApplicationProductComposition';
import type { IProductFeatureDefinition } from './IProductFeatureDefinition';
// #endregion

@Component({ template: '' })
class IncludedProductPage {}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class ProductLayout {}

function compositionRoutes(features: readonly IProductFeatureDefinition[]): Routes {
  // Keep the actual selected paths and redirects; these tests isolate composition from rendering business pages.
  const pages = [...features.flatMap((feature) => feature.routes), ...settingsRoutes].map(
    (route) => {
      const { loadComponent, component, canActivate, canMatch, ...definition } = route;
      void loadComponent;
      void component;
      void canActivate;
      void canMatch;
      return route.redirectTo === undefined
        ? { ...definition, component: IncludedProductPage }
        : definition;
    },
  );
  return presentationRoutes(pages).map((route) =>
    route.path === 'main' ? { ...route, loadComponent: async () => ProductLayout } : route,
  );
}

function arrange(omitted: string, desktop = true) {
  const selected = applicationProductComposition.filter((feature) => feature.id !== omitted);
  const client: Pick<IOrchestrationApi, 'request' | 'onExecutionEvent' | 'selectPath'> = {
    request: async () => {
      throw new Error('Composition must not issue a provider request.');
    },
    onExecutionEvent: () => () => undefined,
    selectPath: async () => ({ canceled: true, paths: [] }),
  };
  const desktopClient: IDesktopApi = {
    capabilities: { speechRecognition: false },
    request: async () => {
      throw new Error('Composition does not perform native desktop operations.');
    },
    onUpdateState: () => () => undefined,
    onPowerState: () => () => undefined,
    onSpeechRecognitionEvent: () => () => undefined,
    onNavigate: () => () => undefined,
  };
  TestBed.configureTestingModule({
    providers: [
      provideTheme({
        theme: SohoTheme.SOHO_THEME,
        mode: 'light',
        overrides: applicationThemeOverrides,
      }),
      provideRouter(compositionRoutes(selected)),
      provideSettings(),
      provideNavigation(),
      provideSearch(),
      provideQuickCreate(),
      provideWidget(),
      ...selected.flatMap((feature) => feature.providers),
      { provide: ORCHESTRATION_CLIENT, useValue: client },
      { provide: DESKTOP_CLIENT, useValue: desktopClient },
      {
        provide: NotificationService,
        useValue: {
          showSuccess: () => undefined,
          showError: () => undefined,
          showInfo: () => undefined,
          showWarning: () => undefined,
        },
      },
    ],
  });
  if (desktop) {
    expect(TestBed.inject(ApplicationBootstrap)).toBeInstanceOf(ApplicationBootstrap);
    const context = TestBed.inject(PRESENTATION_CONTEXT);
    expect(context.executionAvailable).toBe(omitted !== 'execution');
    expect(context.ciAvailable).toBe(omitted !== 'ci');
    expect(context.workspaceScopeAvailable).toBe(omitted !== 'workspace');
  }
  return selected;
}

describe('applicationProductComposition', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('removes CI operations, bootstrap, routes, navigation, search and widgets together', async () => {
    // arrange
    const selected = arrange('ci');
    const harness = await RouterTestingHarness.create();
    // act
    const navigation = TestBed.inject(NavigationRegistry).byRegion('desktop-main')();
    const search = TestBed.inject(SEARCH_PROVIDERS);
    const widgets = TestBed.inject(ViewSlotRegistry).getViews(WIDGET_VIEW_SLOT)();
    await harness.navigateByUrl('/main/settings');
    await TestBed.inject(SearchManager).search('actions');
    expect(TestBed.inject(Router).url).toBe('/main/settings');
    await harness.navigateByUrl('/main/actions');
    // assert
    expect(
      selected.flatMap((feature) => feature.routes).some((route) => route.path === 'actions'),
    ).toBe(false);
    expect(navigation.some((item) => item.key === 'actions')).toBe(false);
    expect(search.some((provider) => provider.id === 'ci.search')).toBe(false);
    expect(widgets.some((widget) => widget.id === 'actions')).toBe(false);
    expect(TestBed.inject(CiStore, null)).toBeNull();
    expect(TestBed.inject(APPLICATION_BOOTSTRAP_CI, null)).toBeNull();
    expect(TestBed.inject(Router).url).toBe('/main/home');
  });

  it('removes Home routes and contributions and routes every fallback to another selected page', async () => {
    // arrange
    const selected = arrange('home');
    const firstPage = selected
      .flatMap((feature) => feature.routes)
      .find((route) => route.path && route.redirectTo === undefined);
    if (!firstPage?.path) throw new Error('Included fallback page missing');
    const harness = await RouterTestingHarness.create();
    // act
    const navigation = TestBed.inject(NavigationRegistry).byRegion('desktop-main')();
    const search = TestBed.inject(SEARCH_PROVIDERS);
    await harness.navigateByUrl('/main/settings');
    await TestBed.inject(SearchManager).search('board');
    expect(TestBed.inject(Router).url).toBe('/main/board');
    await harness.navigateByUrl('/main/settings');
    await TestBed.inject(SearchManager).search('home');
    expect(TestBed.inject(Router).url).toBe('/main/settings');
    await harness.navigateByUrl('/main/orbit');
    // assert
    expect(navigation.some((item) => item.key === 'home' || item.key === 'orbit')).toBe(false);
    expect(search.some((provider) => provider.id === 'home.search')).toBe(false);
    expect(
      selected
        .flatMap((feature) => feature.routes)
        .some((route) => ['home', 'orbit', 'dashboard'].includes(route.path ?? '')),
    ).toBe(false);
    expect(TestBed.inject(Router).url).toBe(`/main/${firstPage.path}`);
  });

  it('removes Work setup/board paths, navigation, search, authoring and widgets together', async () => {
    // arrange
    const selected = arrange('work');
    const harness = await RouterTestingHarness.create();
    // act
    const registry = TestBed.inject(NavigationRegistry);
    const search = TestBed.inject(SEARCH_PROVIDERS);
    const widgets = TestBed.inject(ViewSlotRegistry).getViews(WIDGET_VIEW_SLOT)();
    const action = TestBed.inject(QuickCreateManager).getItemForNavigation('board');
    await harness.navigateByUrl('/main/board');
    // assert
    expect(
      selected
        .flatMap((feature) => feature.routes)
        .some((route) => ['board', 'stages', 'setup'].includes(route.path ?? '')),
    ).toBe(false);
    expect(
      registry
        .byRegion('desktop-main')()
        .some((item) => item.key === 'board'),
    ).toBe(false);
    expect(
      registry
        .byRegion('workspace-menu')()
        .some((item) => item.key === 'setup'),
    ).toBe(false);
    expect(search.some((provider) => provider.id === 'work.search')).toBe(false);
    expect(action).toBeUndefined();
    expect(widgets.some((widget) => widget.id === 'board')).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/main/home');
  });

  it('omits Automation policy, storage and state while retaining CI cards and its persisted root', () => {
    // arrange
    arrange('automation');
    const defaults = createDefaultApplicationSettings('/persisted');
    TestBed.inject(OrchestrationState).settings.set(
      applicationSettingsSchema.parse({
        ...defaults,
        runtime: { ...defaults.runtime, workspaceRoot: '/persisted/workspaces' },
      }),
    );
    // act
    const catalog = TestBed.inject(SettingsCatalog);
    const projection = TestBed.inject(ApplicationProjection);
    const root = TestBed.inject(CI_RUNTIME_WORKSPACE_ROOT);
    const sections = catalog.globalSections();
    const views = TestBed.inject(ViewSlotRegistry).getViews(SettingsViewSlot.Global)();
    // assert
    // Virtual machines describe this Mac and belong to System, which CI keeps contributing; with
    // Automation omitted nothing else fills an Automation section.
    expect(sections.some((section) => section.id === 'automation')).toBe(false);
    expect(sections.some((section) => section.id === 'system')).toBe(true);
    expect(views.some((view) => view.id === 'virtual-machines-card')).toBe(true);
    expect(views.some((view) => view.id === 'AutomationPolicySettingsView')).toBe(false);
    expect(views.some((view) => view.id === 'StorageSafetySettingsView')).toBe(false);
    expect(TestBed.inject(AutomationSettingsStore, null)).toBeNull();
    expect(TestBed.inject(AUTOMATION_PREPARATION, null)).toBeNull();
    expect(root()).toBe('/persisted/workspaces');
    expect(root()).toBe(projection.settings()?.runtime.workspaceRoot);
    expect(catalog.hasGlobalSection('skills')).toBe(true);
    expect(views.length).toBeGreaterThan(0);
  });

  it('retains all nine existing route shortcuts in their original global priority', () => {
    // arrange
    arrange('none');
    // act
    const aliases = TestBed.inject(SEARCH_PROVIDERS)
      .flatMap((provider) => provider.aliases ?? [])
      .toSorted((left, right) => left.order - right.order);
    // assert
    expect(aliases.map((alias) => alias.term)).toEqual([
      'home',
      'overview',
      'orbit',
      'board',
      'pull requests',
      'actions',
      'skills',
      'arcade',
      'pinball',
    ]);
    expect(aliases.map((alias) => alias.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(aliases.find((alias) => alias.term === 'skills')?.path).toBe('/main/settings');
  });

  it('keeps the real shell and Team Settings composition available when AI is omitted', () => {
    // arrange
    arrange('ai');
    // act
    const context = TestBed.inject(PRESENTATION_CONTEXT);
    const catalog = TestBed.inject(SettingsCatalog);
    // assert
    expect(context.executionAvailable).toBe(true);
    expect(catalog.hasWorkspaceSection('team')).toBe(true);
  });

  it.each(applicationProductComposition.map((feature) => feature.id))(
    'resolves the real startup and Presentation graph with the %s business feature omitted',
    (omitted) => {
      // arrange
      arrange(omitted);
      // act
      const bootstrap = TestBed.inject(ApplicationBootstrap);
      const projection = TestBed.inject(ApplicationProjection);
      const context = TestBed.inject(PRESENTATION_CONTEXT);
      // assert
      expect(bootstrap).toBeInstanceOf(ApplicationBootstrap);
      expect(context.snapshot).toBe(projection.snapshot);
      expect(context.settings).toBe(projection.settings);
      switch (omitted) {
        case 'execution':
          expect(TestBed.inject(APPLICATION_BOOTSTRAP_EXECUTION, null)).toBeNull();
          break;
        case 'skills':
          expect(TestBed.inject(APPLICATION_BOOTSTRAP_SKILLS, null)).toBeNull();
          break;
        case 'platform':
          expect(TestBed.inject(APPLICATION_BOOTSTRAP_PLATFORM, null)).toBeNull();
          break;
      }
    },
  );

  it.each(['none', 'execution', 'ci', 'automation', 'workspace'])(
    'resolves the isolated menu graph with %s omitted without constructing desktop synchronization',
    (omitted) => {
      // arrange
      arrange(omitted, false);
      TestBed.configureTestingModule({
        providers: [
          MenuBarViewPresenter,
          {
            provide: ApplicationBootstrap,
            useFactory: () => {
              throw new Error('The menu owns a separate request session.');
            },
          },
          {
            provide: OrchestrationSynchronizer,
            useFactory: () => {
              throw new Error('The menu must not construct desktop snapshot synchronization.');
            },
          },
        ],
      });
      // act
      const presenter = TestBed.inject(MenuBarViewPresenter);
      // assert
      expect(presenter.executionAvailable).toBe(omitted !== 'execution');
      expect(presenter.ciAvailable).toBe(omitted !== 'ci');
      expect(presenter.autonomyAvailable).toBe(omitted !== 'automation');
    },
  );
});
