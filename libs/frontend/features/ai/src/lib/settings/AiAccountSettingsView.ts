// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  CellComponent,
  TextComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { ConnectionIconPipe } from '@symphony/frontend-ui';
import { AiConnectionsSettingsViewPresenter } from './AiConnectionsSettingsViewPresenter';
// #endregion
/** Contents-only feature contribution to the existing Services card. @public */
@Component({
  selector: 'symphony-ai-account-settings-view',
  host: { class: 'contents' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    CellComponent,
    TextComponent,
    ConnectionIconPipe,
    IconNameDirective,
  ],
  providers: [AiConnectionsSettingsViewPresenter],
  templateUrl: './AiAccountSettingsView.html',
  styleUrl: './AiAccountSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAccountSettingsView {
  // #region Fields
  /** Actual feature-owned projections and commands. @protected @readonly */
  protected readonly presenter = inject(AiConnectionsSettingsViewPresenter);
  // #endregion
}
