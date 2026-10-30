// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { WorkspaceSettingsViewPresenter } from './WorkspaceSettingsViewPresenter';

// #endregion

/**
 * Feature-owned Workspace settings card.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-directory-card',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    CardFooterComponent,
    CardHeaderComponent,
    HeadlineComponent,
    IconNameDirective,
  ],
  providers: [WorkspaceSettingsViewPresenter],
  templateUrl: './WorkspaceDirectoryCardView.html',
  styleUrl: './WorkspaceDirectoryCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceDirectoryCardView {
  // #region Fields

  /**
   * Workspace-owned state and actions.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(WorkspaceSettingsViewPresenter);

  // #endregion
}
