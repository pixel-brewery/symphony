// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  DotComponent,
  IconNameDirective,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { StorageSizePipe } from '@symphony/frontend-ui';
import { WorkspaceDirectoryViewPresenter } from './WorkspaceDirectoryViewPresenter';

// #endregion

/**
 * Settings `Workspaces`: every workspace with its summary, state and `Open`, plus
 * `Import workspace` and `Add workspace`; disabled workspaces sit in their own frame.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-directory-card',
  host: { class: 'flex min-w-0 flex-col gap-3' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    DotComponent,
    IconNameDirective,
    NgTemplateOutlet,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    StorageSizePipe,
    TextComponent,
    TypographyDirective,
  ],
  providers: [WorkspaceDirectoryViewPresenter],
  templateUrl: './WorkspaceDirectoryCardView.html',
  styleUrl: './WorkspaceDirectoryCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDirectoryCardView {
  // #region Fields

  /**
   * Workspace list state and actions.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(WorkspaceDirectoryViewPresenter);

  /** Shows the workspace short code itself instead of initials derived from it. */
  protected readonly shortCodeAccessor = (value: string): string => value.slice(0, 2).toUpperCase();

  // #endregion
}
