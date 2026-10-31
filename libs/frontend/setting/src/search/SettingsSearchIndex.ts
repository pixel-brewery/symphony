// #region Imports

import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
  type Signal,
  untracked,
} from '@angular/core';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { SettingsCatalog } from '../catalog/SettingsCatalog';
import { isSettingsViewDefinition } from '../catalog/isSettingsViewDefinition';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import type { ISettingsSelection } from '../models/ISettingsSelection';
import type { ISettingsViewDefinition } from '../models/ISettingsViewDefinition';
import type { SettingsSection } from '../models/SettingsSection';
import { SETTINGS_SEARCH_CONTRIBUTIONS } from '../provider/SettingsSearchContributionsToken';
import type { ISettingsSearchEntry } from './ISettingsSearchEntry';
import type { ISettingsSearchGroup } from './ISettingsSearchGroup';
import type { ISettingsSearchResult } from './ISettingsSearchResult';
import { searchSettings } from './searchSettings';

// #endregion

/**
 * Indexes every setting the included features contribute to the Settings sections: each section
 * itself, the entries its cards declare (`search`, `searchEntries`) and the data-dependent entries
 * other features add to it (`withSettingsSearch`), with workspace sections listed once for every
 * workspace.
 *
 * @public
 */
@Injectable()
export class SettingsSearchIndex {
  // #region Fields

  private readonly _catalog = inject(SettingsCatalog);
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _views: Signal<readonly ISettingsViewDefinition[]>;
  private readonly _appearanceViews: Signal<
    readonly { readonly id: string; readonly search?: unknown }[]
  >;
  private readonly _dynamicEntries = new Map<string, Signal<readonly ISettingsSearchEntry[]>>();
  private readonly _contributedEntries: readonly {
    readonly id: string;
    readonly sectionId: string;
    readonly entries: Signal<readonly ISettingsSearchEntry[]>;
  }[];

  /**
   * Every searchable setting in section order.
   *
   * @public
   * @readonly
   */
  public readonly entries: Signal<readonly ISettingsSearchResult[]> = computed(() =>
    this.buildEntries(),
  );

  // #endregion

  // #region Ctor

  /**
   * Reads the contributed cards from the native view registry and connects their data-dependent
   * entries once, in this injection context.
   *
   * @public
   */
  public constructor() {
    const registry = inject(ViewSlotRegistry);
    const injector = inject(Injector);
    const global = registry.getViews<ISettingsSelection>(SettingsViewSlot.Global);
    const workspace = registry.getViews<ISettingsSelection>(SettingsViewSlot.Workspace);
    this._views = computed(() => [...global(), ...workspace()].filter(isSettingsViewDefinition));
    // Cards that optional features add to Appearance live in their own slot; their `search`
    // entries belong to Appearance.
    this._appearanceViews = registry.getViews(SettingsViewSlot.Appearance);
    for (const view of untracked(this._views)) {
      const factory = view.searchEntries;
      if (factory) this._dynamicEntries.set(view.id, runInInjectionContext(injector, factory));
    }
    // Features that draw fragments into another feature's section (the AI accounts, boards and
    // feedback intakes in `Connected services`) add their entries to that section.
    this._contributedEntries = (
      inject(SETTINGS_SEARCH_CONTRIBUTIONS, { optional: true }) ?? []
    ).map((contribution) => ({
      id: contribution.id,
      sectionId: contribution.sectionId,
      entries: runInInjectionContext(injector, contribution.searchEntries),
    }));
  }

  // #endregion

  // #region Methods

  /**
   * Finds the settings matching a query, grouped by breadcrumb.
   *
   * @param query - The text typed into `Search settings`.
   * @returns The matching groups; empty for a blank query.
   * @public
   */
  public search(query: string): readonly ISettingsSearchGroup[] {
    return searchSettings(this.entries(), query);
  }

  private buildEntries(): readonly ISettingsSearchResult[] {
    const workspaces = this._configuration.settings()?.workspaces ?? [];
    const sections = [...this._catalog.globalSections(), ...this._catalog.workspaceSections()];
    const views = this._views();
    const results: ISettingsSearchResult[] = [];
    for (const section of sections) {
      const sectionViews = views.filter((view) => view.section.id === section.id);
      const entries: { view: { readonly id: string }; entry: ISettingsSearchEntry }[] =
        sectionViews.flatMap((view) =>
          [...(view.search ?? []), ...(this._dynamicEntries.get(view.id)?.() ?? [])].map(
            (entry) => ({ view, entry }),
          ),
        );
      for (const contribution of this._contributedEntries)
        if (contribution.sectionId === section.id)
          for (const entry of contribution.entries())
            entries.push({ view: { id: contribution.id }, entry });
      if (section.id === 'appearance')
        for (const view of this._appearanceViews())
          if (Array.isArray(view.search))
            for (const entry of view.search as readonly ISettingsSearchEntry[])
              entries.push({ view: { id: view.id }, entry });
      const sectionEntry: ISettingsSearchEntry = {
        id: `section-${section.id}`,
        label: section.label,
        description: section.description,
      };
      if (section.scope === 'global') {
        results.push(this.result(section, null, [], 'section', sectionEntry));
        for (const { view, entry } of entries)
          results.push(this.result(section, null, [], view.id, entry));
        continue;
      }
      for (const workspace of workspaces) {
        const prefix = [workspace.displayName];
        results.push(this.result(section, workspace.id, prefix, 'section', sectionEntry));
        for (const { view, entry } of entries)
          if (!entry.workspaceId || entry.workspaceId === workspace.id)
            results.push(this.result(section, workspace.id, prefix, view.id, entry));
      }
    }
    return results;
  }

  private result(
    section: SettingsSection,
    workspaceId: string | null,
    prefix: readonly string[],
    viewId: string,
    entry: ISettingsSearchEntry,
  ): ISettingsSearchResult {
    return {
      key: `${workspaceId ?? ''}:${section.id}:${viewId}:${entry.id}`,
      entry,
      section,
      workspaceId,
      breadcrumb: [...prefix, section.label, ...(entry.group ? [entry.group] : [])],
    };
  }

  // #endregion
}
