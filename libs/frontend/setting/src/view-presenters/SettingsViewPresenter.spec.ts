// @vitest-environment jsdom

// #region Imports

import '@angular/compiler';
import { effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
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
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import { withSettingsViews } from '../provider/withSettingsViews';
import { SettingsSearchIndex } from '../search/SettingsSearchIndex';
import { provideSettings } from '../provider/provideSettings';
import { withSettingsRouteInitializer } from '../provider/withSettingsRouteInitializer';
import type { ISettingsRouteContext } from '../routing/ISettingsRouteContext';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import { SettingsViewPresenter } from './SettingsViewPresenter';

// #endregion

const sectionViews = [
  withSettingsViews({
    id: 'global-cards',
    slot: SettingsViewSlot.Global,
    views: [
      {
        id: 'workspaces-card',
        section: {
          scope: 'global',
          id: 'workspaces',
          label: 'Workspaces',
          description: 'Open or add a separate company workspace.',
          order: 10,
        },
      },
      {
        id: 'skills-card',
        section: {
          scope: 'global',
          id: 'skills',
          label: 'Skills',
          description: 'Refine how each step works.',
          order: 30,
        },
        search: [{ id: 'trash', label: 'Move to trash' }],
      },
    ],
  }),
  withSettingsViews({
    id: 'workspace-cards',
    slot: SettingsViewSlot.Workspace,
    views: [
      {
        id: 'team-card',
        section: {
          scope: 'workspace',
          id: 'team',
          label: 'AI team',
          description: 'Agents.',
          order: 10,
        },
      },
      {
        id: 'administration-card',
        section: {
          scope: 'workspace',
          id: 'administration',
          label: 'Administration',
          description: 'Storage.',
          order: 60,
        },
        search: [{ id: 'limit', label: 'Storage limit', parameters: { focus: 'limit' } }],
      },
    ],
  }),
];

function arrange(
  initializers: readonly IFeature<SettingsFeatureKind>[],
  query: Record<string, string> = { workspace: 'personal' },
) {
  const parameters = new BehaviorSubject(convertToParamMap(query));
  const defaults = applicationSettingsSchema.parse(createDefaultApplicationSettings('/tmp'));
  const settings = signal<ApplicationSettingsDto | undefined>({
    ...defaults,
    workspaces: [
      { ...defaults.workspaces[0]!, id: 'flamox', displayName: 'FLAMOX365' },
      { ...defaults.workspaces[0]!, id: 'personal', displayName: 'Personal' },
    ],
  });
  const navigate = vi.fn(async () => true);
  TestBed.configureTestingModule({
    providers: [
      provideSettings(...initializers, ...sectionViews),
      SettingsHostSession,
      SettingsSearchIndex,
      SettingsViewPresenter,
      { provide: SettingsEditorService, useValue: { open: vi.fn() } },
      { provide: Router, useValue: { navigate } },
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
  return { parameters, settings, navigate };
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

  it('opens the location named by ?workspace=&section= once the workspaces are known', () => {
    // arrange
    const { parameters } = arrange([], { workspace: 'flamox', section: 'administration' });
    const presenter = TestBed.inject(SettingsViewPresenter);
    TestBed.tick();
    const opened = [presenter.settingsWorkspaceId(), presenter.workspaceSettingsSection()];

    // act
    parameters.next(convertToParamMap({ section: 'skills' }));
    TestBed.tick();

    // assert
    expect(opened).toEqual(['flamox', 'administration']);
    expect(presenter.settingsWorkspaceId()).toBeNull();
    expect(presenter.globalSettingsSection()).toBe('skills');
    expect(presenter.selectedSection()?.label).toBe('Skills');
  });

  it('opens a workspace on AI team and mirrors the selection into the location', () => {
    // arrange
    const { navigate } = arrange([], {});
    const presenter = TestBed.inject(SettingsViewPresenter);
    TestBed.tick();

    // act
    presenter.openSettingsWorkspaceCommand.execute('personal');
    TestBed.tick();

    // assert
    expect(presenter.settingsWorkspaceId()).toBe('personal');
    expect(presenter.workspaceSettingsSection()).toBe('team');
    expect(presenter.expandedWorkspaceId()).toBe('personal');
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { workspace: 'personal', section: 'team' },
        replaceUrl: true,
      }),
    );
  });

  it('lists matching settings while searching and opens a result with its own route keys', () => {
    // arrange
    const { navigate } = arrange([], {});
    const presenter = TestBed.inject(SettingsViewPresenter);
    TestBed.tick();

    // act
    presenter.searchCommand.execute('storage limit');
    const searching = presenter.searching();
    const groups = presenter.searchGroups().map((group) => group.breadcrumb.join(' › '));
    const result = presenter.searchGroups()[1]!.results[0]!;
    presenter.openSearchResultCommand.execute(result);

    // assert
    expect(searching).toBe(true);
    expect(groups).toEqual(['FLAMOX365 › Administration', 'Personal › Administration']);
    expect(presenter.searching()).toBe(false);
    expect(presenter.settingsWorkspaceId()).toBe('personal');
    expect(presenter.workspaceSettingsSection()).toBe('administration');
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { workspace: 'personal', section: 'administration', focus: 'limit' },
      }),
    );
  });
});
