// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillsSettingsViewPresenter } from './SkillsSettingsViewPresenter';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  EmptyStateComponent,
  HintComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextBoxComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';

// #endregion

/**
 * Feature-owned built-in role settings composed by the native Settings host.
 *
 * @public
 */
@Component({
  selector: 'symphony-skills-settings-view',
  host: { class: 'contents' },
  imports: [
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    EmptyStateComponent,
    HeadlineComponent,
    HintComponent,
    SegmentComponent,
    SegmentItemComponent,
    TextBoxComponent,
    IconNameDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillsSettingsViewPresenter }],
  templateUrl: './SkillsSettingsView.html',
  styleUrl: './SkillsSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSettingsView extends View<SkillsSettingsViewPresenter> {}
