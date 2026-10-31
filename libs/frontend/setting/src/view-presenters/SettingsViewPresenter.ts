// #region Imports

import { ApplicationRef, computed, effect, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { SettingsEditorService } from '../editor/SettingsEditorService';
import type { ISettingsEditorRequest } from '../editor/ISettingsEditorRequest';
import { SettingsHostSession } from '../context/SettingsHostSession';
import { SETTINGS_ROUTE_INITIALIZERS } from '../routing/SettingsRouteInitializersToken';
import type { GlobalSettingsSection } from '../models/GlobalSettingsSection';
import type { WorkspaceSettingsSection } from '../models/WorkspaceSettingsSection';

// #endregion

/** Hosts only route selection, generic feature outlets and the shared configuration hydration. @public */
@Injectable()
export class SettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields
  private readonly _configuration = inject(ConfigurationStore);

  private readonly _settingsHost = inject(SettingsHostSession);

  private readonly _settingsEditors = inject(SettingsEditorService);

  /** Native-registry section metadata supplied by included features. @public @readonly */
  public readonly catalog = inject(SettingsCatalog);

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

  private readonly _application = inject(ApplicationRef);

  /**
   * The workspaces.
   *
   * @public
   * @readonly
   */
  public readonly workspaces = computed(() => this._configuration.settings()?.workspaces ?? []);

  /** Workspace being configured, separate from active execution scope. @public @readonly */
  public readonly settingsWorkspaceId = this._settingsHost.workspaceId;

  /** Current installation section from the route-scoped host. @public @readonly */
  public readonly globalSettingsSection = this._settingsHost.globalSection;

  /** Current directory expansion from the route-scoped host. @public @readonly */
  public readonly workspaceNavigationExpanded = this._settingsHost.workspaceNavigationExpanded;

  /** Current independently contributed workspace section. @public @readonly */
  public readonly workspaceSettingsSection = this._settingsHost.workspaceSection;

  /**
   * The settings workspace.
   *
   * @public
   * @readonly
   */
  public readonly settingsWorkspace = computed(() => {
    const workspaceId = this.settingsWorkspaceId();
    return this.workspaces().find((workspace) => workspace.id === workspaceId);
  });

  private readonly _route = inject(ActivatedRoute);

  private readonly _queryParamMap = toSignal(this._route.queryParamMap, {
    initialValue: this._route.snapshot.queryParamMap,
  });

  private readonly _openSettingsWorkspaceCommand: Command<string> = new Command(
    (workspaceId) => void this.onExecuteOpenSettingsWorkspaceCommand(workspaceId),
  );

  private readonly _selectGlobalSettingsSectionCommand: Command<GlobalSettingsSection> =
    new Command((section) => void this.onExecuteSelectGlobalSettingsSectionCommand(section));

  private readonly _selectWorkspaceSettingsSectionCommand: Command<WorkspaceSettingsSection> =
    new Command((section) => void this.onExecuteSelectWorkspaceSettingsSectionCommand(section));
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
  }
  // #endregion
  // #region Properties

  /**
   * The openSettingsWorkspace command.
   *
   * @public
   * @readonly
   */
  public get openSettingsWorkspaceCommand(): Command<string> {
    return this._openSettingsWorkspaceCommand;
  }

  /**
   * The selectGlobalSettingsSection command.
   *
   * @public
   * @readonly
   */
  public get selectGlobalSettingsSectionCommand(): Command<GlobalSettingsSection> {
    return this._selectGlobalSettingsSectionCommand;
  }

  /**
   * The selectWorkspaceSettingsSection command.
   *
   * @public
   * @readonly
   */
  public get selectWorkspaceSettingsSectionCommand(): Command<WorkspaceSettingsSection> {
    return this._selectWorkspaceSettingsSectionCommand;
  }
  // #endregion
  // #region Methods

  /** Opens a known workspace's settings without changing active application scope. @private */
  private onExecuteOpenSettingsWorkspaceCommand(workspaceId: string): void {
    if (this.workspaces().some((workspace) => workspace.id === workspaceId))
      this._settingsHost.openWorkspace(workspaceId);
  }

  /** Selects the host's global section with its existing directory toggle behavior. @private */
  private onExecuteSelectGlobalSettingsSectionCommand(section: GlobalSettingsSection): void {
    this._settingsHost.selectGlobal(section);
  }

  /** Selects the host's workspace section. @private */
  private onExecuteSelectWorkspaceSettingsSectionCommand(section: WorkspaceSettingsSection): void {
    this._settingsHost.selectWorkspaceSection(section);
  }

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

  private openEditor<TRequest extends ISettingsEditorRequest>(data: TRequest): void {
    void this._settingsEditors.open(data, (workspaceId, section) => {
      if (workspaceId) this._settingsHost.openWorkspace(workspaceId, section);
      else this._settingsHost.selectWorkspaceSection(section);
    });
  }
  // #endregion
}
