// #region Imports

import { computed, Inject, inject, Injectable } from '@angular/core';
import { ViewSlotRegistry } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsViewSlot } from '../constants/SettingsViewSlot';
import type { ISettingsSelection } from '../models/ISettingsSelection';
import type { ISettingsViewDefinition } from '../models/ISettingsViewDefinition';
import type { SettingsSection } from '../models/SettingsSection';
import { isSettingsViewDefinition } from './isSettingsViewDefinition';

// #endregion

/**
 * Projects contributed navigation metadata from the existing Mosaik view registry.
 *
 * @public
 */
@Injectable()
export class SettingsCatalog {
  // #region Fields

  /**
   * Sections whose cards are registered in the global settings slot.
   *
   * @public
   * @readonly
   */
  public readonly globalSections;
  /**
   * Sections whose cards are registered in the selected workspace slot.
   *
   * @public
   * @readonly
   */
  public readonly workspaceSections;

  // #endregion

  // #region Ctor

  /**
   * Connects section projections to the native registry.
   *
   * @public
   */
  public constructor(
    @Inject(ViewSlotRegistry) registry: ViewSlotRegistry = inject(ViewSlotRegistry),
  ) {
    const globalViews = registry.getViews<ISettingsSelection>(SettingsViewSlot.Global);
    const workspaceViews = registry.getViews<ISettingsSelection>(SettingsViewSlot.Workspace);
    this.globalSections = computed(() =>
      this.sections(globalViews().filter(isSettingsViewDefinition)).filter(
        (section) => section.scope === 'global',
      ),
    );
    this.workspaceSections = computed(() =>
      this.sections(workspaceViews().filter(isSettingsViewDefinition)).filter(
        (section) => section.scope === 'workspace',
      ),
    );
  }

  // #endregion

  // #region Methods

  /**
   * Whether an included feature contributes a workspace section.
   *
   * @public
   */
  public hasWorkspaceSection(sectionId: string): boolean {
    return this.workspaceSections().some((section) => section.id === sectionId);
  }
  /**
   * Whether an included feature contributes a global section.
   *
   * @public
   */
  public hasGlobalSection(sectionId: string): boolean {
    return this.globalSections().some((section) => section.id === sectionId);
  }

  private sections(views: readonly ISettingsViewDefinition[]): SettingsSection[] {
    const sections = new Map<string, SettingsSection>();
    for (const view of views) {
      const previous = sections.get(view.section.id);
      if (
        previous &&
        (previous.scope !== view.section.scope ||
          previous.label !== view.section.label ||
          previous.description !== view.section.description ||
          previous.order !== view.section.order)
      ) {
        throw new Error(`Conflicting settings section metadata '${view.section.id}'.`);
      }
      sections.set(view.section.id, view.section);
    }
    return [...sections.values()].toSorted(
      (left, right) => left.order - right.order || left.id.localeCompare(right.id),
    );
  }

  // #endregion
}
