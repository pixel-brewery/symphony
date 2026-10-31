// #region Imports

import { ApplicationRef, computed, effect, inject, Injectable, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type Params } from '@angular/router';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { SettingsEditorService } from '../editor/SettingsEditorService';
import type { ISettingsEditorRequest } from '../editor/ISettingsEditorRequest';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { GlobalSettingsSectionIds } from '../models/GlobalSettingsSectionIds';
import { WorkspaceSettingsSectionIds } from '../models/WorkspaceSettingsSectionIds';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import type { GlobalSettingsSection } from '../models/GlobalSettingsSection';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';
import type { ISettingsSearchResult } from '../search/ISettingsSearchResult';
import { SettingsSearchIndex } from '../search/SettingsSearchIndex';

// #endregion

/**
 * Owns the Settings window's selection: the section and workspace being configured, the
 * `?workspace=&section=` location, `Search settings`, generic feature outlets and the shared
 * configuration hydration.
 *
 * @public
 */
@Injectable()
export class SettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _configuration = inject(ConfigurationStore);
  private readonly _settingsHost = inject(SettingsHostSession);
  private readonly _settingsEditors = inject(SettingsEditorService);
  private readonly _searchIndex = inject(SettingsSearchIndex);
  private readonly _application = inject(ApplicationRef);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });
  private _appliedLocation: string | undefined;

  /** Native-registry section metadata supplied by included features. @public @readonly */
  public readonly catalog = inject(SettingsCatalog);

  /**
   * The workspaces in their configured order.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(() => this._configuration.settings()?.workspaces ?? []);

  /** Workspace being configured, separate from active execution scope. @public @readonly */
  public readonly settingsWorkspaceId = this._settingsHost.workspaceId;

  /** Current installation section from the route-scoped host. @public @readonly */
  public readonly globalSettingsSection = this._settingsHost.globalSection;

  /** Current independently contributed workspace section. @public @readonly */
  public readonly workspaceSettingsSection = this._settingsHost.workspaceSection;

  /** Text typed into `Search settings`. @public @readonly */
  public readonly searchQuery = this._settingsHost.searchQuery;

  /**
   * Whether the window lists search results instead of a section.
   *
   * @public
   * @readonly
   */
  public readonly searching = computed(() => this.searchQuery().trim().length > 0);

  /**
   * The workspace being configured.
   *
   * @public
   * @readonly
   */
  public readonly settingsWorkspace = computed(() => {
    const workspaceId = this.settingsWorkspaceId();
    return this.workspaces().find((workspace) => workspace.id === workspaceId);
  });

  /**
   * The workspace whose sections the sidebar shows as nested rows: the one being configured,
   * otherwise the active workspace of the main window.
   *
   * @public
   * @readonly
   */
  public readonly expandedWorkspaceId = computed(() => {
    const configured = this.settingsWorkspace()?.id;
    if (configured) return configured;
    const active = this._configuration.settings()?.activeViewScope.workspaceIds[0];
    const workspaces = this.workspaces();
    return workspaces.find((workspace) => workspace.id === active)?.id ?? workspaces[0]?.id;
  });

  /** Explicit metadata for the currently selected section. @public @readonly */
  public readonly selectedSection = computed(() =>
    this.settingsWorkspace()
      ? this.catalog
          .workspaceSections()
          .find((section) => section.id === this.workspaceSettingsSection())
      : this.catalog
          .globalSections()
          .find((section) => section.id === this.globalSettingsSection()),
  );

  /**
   * The global sections listed under the `Symphony` heading, below `Workspaces`.
   *
   * @public
   * @readonly
   */
  public readonly symphonySections = computed(() =>
    this.catalog.globalSections().filter((section) => section.id !== 'workspaces'),
  );

  /**
   * The `Workspaces` section, when an included feature contributes it.
   *
   * @public
   * @readonly
   */
  public readonly workspacesSection = computed(() =>
    this.catalog.globalSections().find((section) => section.id === 'workspaces'),
  );

  /**
   * Settings matching the search query, grouped by breadcrumb.
   *
   * @public
   * @readonly
   */
  public readonly searchGroups = computed(() => this._searchIndex.search(this.searchQuery()));

  /**
   * Number of matching settings.
   *
   * @public
   * @readonly
   */
  public readonly searchResultCount = computed(() =>
    this.searchGroups().reduce((count, group) => count + group.results.length, 0),
  );

  /**
   * Opens a workspace on its first section.
   *
   * @public
   * @readonly
   */
  public readonly openSettingsWorkspaceCommand = new Command<string>((workspaceId) =>
    this.openWorkspaceSection(workspaceId, 'team'),
  );

  /**
   * Opens one section of a workspace.
   *
   * @public
   * @readonly
   */
  public readonly openWorkspaceSectionCommand = new Command<
    readonly [workspaceId: string, section: WorkspaceSettingsSection]
  >(([workspaceId, section]) => this.openWorkspaceSection(workspaceId, section));

  /**
   * Selects a global section.
   *
   * @public
   * @readonly
   */
  public readonly selectGlobalSettingsSectionCommand = new Command<GlobalSettingsSection>(
    (section) => this._settingsHost.selectGlobal(section),
  );

  /**
   * Selects a section of the workspace being configured.
   *
   * @public
   * @readonly
   */
  public readonly selectWorkspaceSettingsSectionCommand = new Command<WorkspaceSettingsSection>(
    (section) => {
      const workspaceId = this.settingsWorkspaceId();
      if (workspaceId) this.openWorkspaceSection(workspaceId, section);
      else this._settingsHost.selectWorkspaceSection(section);
    },
  );

  /**
   * Changes the `Search settings` query.
   *
   * @public
   * @readonly
   */
  public readonly searchCommand = new Command<string>((query) => this._settingsHost.search(query));

  /**
   * Opens the section a search result lives in, with the result's own route keys.
   *
   * @public
   * @readonly
   */
  public readonly openSearchResultCommand = new Command<ISettingsSearchResult>((result) => {
    const parameters = result.entry.parameters ?? {};
    if (result.section.scope === 'workspace' && result.workspaceId) {
      this._settingsHost.openWorkspace(result.workspaceId, result.section.id);
      this.writeLocation(
        { workspace: result.workspaceId, section: result.section.id, ...parameters },
        false,
      );
    } else if (result.section.scope === 'global') {
      this._settingsHost.selectGlobal(result.section.id);
      this.writeLocation({ section: result.section.id, ...parameters }, false);
    }
  });

  // #endregion

  // #region Ctor

  /** Connects the selected features' route initializers within this route's lifetime. @public */
  public constructor() {
    super();
    const routeInitializers = inject(SETTINGS_ROUTE_INITIALIZERS, { optional: true }) ?? [];

    const routeInitializerIds = new Set<string>();

    for (const initializer of routeInitializers) {
      if (routeInitializerIds.has(initializer.id))
        throw new Error(`Duplicate Settings route initializer '${initializer.id}'.`);
      routeInitializerIds.add(initializer.id);
    }

    for (const initializer of routeInitializers)
      initializer.initialize({
        parameters: this._queryParamMap,
        session: this._settingsHost,
        openEditor: (request) => this.openEditor(request),
      });

    effect(() =>
      this._settingsHost.reconcileSections(
        this.catalog.globalSections().map((section) => section.id),
        this.catalog.workspaceSections().map((section) => section.id),
      ),
    );

    effect(() => {
      const settings = this._configuration.settings();
      if (settings)
        this._settingsHost.reconcileWorkspaces(
          settings.workspaces.map((workspace) => workspace.id),
        );
    });

    // `?workspace=&section=` opens that place once per distinct location, after the
    // configuration that names the workspaces has loaded. The opposite direction mirrors every
    // selection, also one a feature makes through the session, back into the location, so a later
    // request for the same place (for example from the main window) is a real navigation again.
    effect(() => {
      const parameters = this._queryParamMap();
      const workspaces = this._configuration.settings()?.workspaces;
      if (!workspaces) return;
      const workspaceId = parameters.get('workspace');
      const section = parameters.get('section');
      const location = `${workspaceId ?? ''}|${section ?? ''}`;
      if (location === this._appliedLocation) return;
      this._appliedLocation = location;
      untracked(() => {
        const globalSection = GlobalSettingsSectionIds.find((id) => id === section);
        const workspaceSection = WorkspaceSettingsSectionIds.find((id) => id === section);
        if (globalSection) this._settingsHost.selectGlobal(globalSection);
        else if (workspaceId && workspaces.some((workspace) => workspace.id === workspaceId))
          this._settingsHost.openWorkspace(workspaceId, workspaceSection ?? 'team');
      });
    });

    effect(() => {
      const workspaceId = this._settingsHost.workspaceId();
      const section = workspaceId
        ? this._settingsHost.workspaceSection()
        : this._settingsHost.globalSection();
      if (this._appliedLocation === undefined) return;
      if (`${workspaceId ?? ''}|${section}` === this._appliedLocation) return;
      untracked(() =>
        this.writeLocation(workspaceId ? { workspace: workspaceId, section } : { section }),
      );
    });
  }

  // #endregion

  // #region Methods

  /**
   * Handles hydrate.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    const hydration: Promise<unknown>[] = [];
    if (!this._configuration.settings() || !this._configuration.connections()) {
      hydration.push(this._configuration.refreshConfiguration());
    }
    const refreshView = (): void => {
      window.requestAnimationFrame(() => {
        this._application.tick();
      });
    };
    if (!hydration.length) {
      refreshView();
      return undefined;
    }
    return Promise.all(hydration)
      .then(() => undefined)
      .finally(refreshView);
  }

  private openWorkspaceSection(workspaceId: string, section: WorkspaceSettingsSection): void {
    if (this.workspaces().some((workspace) => workspace.id === workspaceId))
      this._settingsHost.openWorkspace(workspaceId, section);
  }

  /** Writes a location without opening it again. */
  private writeLocation(queryParams: Params, replaceUrl = true): void {
    const workspace = typeof queryParams['workspace'] === 'string' ? queryParams['workspace'] : '';
    const section = typeof queryParams['section'] === 'string' ? queryParams['section'] : '';
    this._appliedLocation = `${workspace}|${section}`;
    void this._router.navigate([], { relativeTo: this._route, queryParams, replaceUrl });
  }

  private openEditor<TRequest extends ISettingsEditorRequest>(data: TRequest): void {
    void this._settingsEditors.open(data, (workspaceId, section) => {
      if (workspaceId) this._settingsHost.openWorkspace(workspaceId, section);
      else this._settingsHost.selectWorkspaceSection(section);
    });
  }

  // #endregion
}
