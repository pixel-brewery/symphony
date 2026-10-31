// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonComponent, ToggleSwitchComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { KeepAwakeToggleViewPresenter } from '../view-presenters/KeepAwakeToggleViewPresenter';

// #endregion

/**
 * The `Keep this Mac awake while tasks run` switch, in the Sleep group and in search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-keep-awake-toggle',
  host: { class: 'flex flex-none items-center' },
  imports: [SkeletonComponent, ToggleSwitchComponent],
  providers: [{ provide: VIEW_PRESENTER, useClass: KeepAwakeToggleViewPresenter }],
  templateUrl: './KeepAwakeToggleView.html',
  styleUrl: './KeepAwakeToggleView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeepAwakeToggleView extends View<KeepAwakeToggleViewPresenter> {}
