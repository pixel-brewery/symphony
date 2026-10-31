// #region Imports

import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  IconNameDirective,
  SearchBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { WorkspaceAvatarSourcePipe } from '@symphony/frontend-ui';
import { mosaikEventText } from '../forms/mosaikEventText';
import { SettingsSectionIconPipe } from '../pipes/SettingsSectionIconPipe';
import { SettingsViewPresenter } from '../view-presenters/SettingsViewPresenter';

// #endregion

/**
 * The Settings window's source list: `Search settings`, `Workspaces` with each workspace and the
 * nested sections of the open one, and the Symphony-wide sections.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-sidebar-view',
  host: { class: 'block' },
  imports: [
    AsyncPipe,
    AvatarComponent,
    ButtonComponent,
    IconNameDirective,
    SearchBoxComponent,
    SettingsSectionIconPipe,
    TextComponent,
    TypographyDirective,
    WorkspaceAvatarSourcePipe,
  ],
  templateUrl: './SettingsSidebarView.html',
  styleUrl: './SettingsSidebarView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSidebarView {
  // #region Fields

  /**
   * The Settings window's selection.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(SettingsViewPresenter);

  /** Shows the workspace short code itself instead of initials derived from it. */
  protected readonly shortCodeAccessor = (value: string): string => value.slice(0, 2).toUpperCase();

  /** Reads the searchbox text from its native or Mosaik event. */
  protected readonly eventText = (event: unknown): string => mosaikEventText(event) ?? '';

  // #endregion
}
