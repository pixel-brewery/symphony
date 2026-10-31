// #region Imports

import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  IconComponent,
  IconNameDirective,
  SkeletonComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER, WindowToolbarDirective } from '@symphony/frontend-core';
import { RelativeTimePipe } from '@symphony/frontend-ui';
import { InboxAcceptOptionPipe } from '../pipes/InboxAcceptOptionPipe';
import { InboxEntryIconPipe } from '../pipes/InboxEntryIconPipe';
import { InboxEntrySubtitlePipe } from '../pipes/InboxEntrySubtitlePipe';
import { InboxEntryTitlePipe } from '../pipes/InboxEntryTitlePipe';
import { InboxEntryVariantPipe } from '../pipes/InboxEntryVariantPipe';
import { InboxViewPresenter } from '../view-presenters/InboxViewPresenter';

// #endregion

/**
 * The Inbox: decisions and updates for the active workspace, with a detail pane that shows the
 * delivery stages and how a decision can continue.
 *
 * @public
 */
@Component({
  selector: 'symphony-inbox-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    DatePipe,
    EmptyStateComponent,
    FormsModule,
    IconComponent,
    IconNameDirective,
    InboxAcceptOptionPipe,
    InboxEntryIconPipe,
    InboxEntrySubtitlePipe,
    InboxEntryTitlePipe,
    InboxEntryVariantPipe,
    NgTemplateOutlet,
    RelativeTimePipe,
    SkeletonComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
    WindowToolbarDirective,
  ],
  providers: [InboxViewPresenter, { provide: VIEW_PRESENTER, useExisting: InboxViewPresenter }],
  templateUrl: './InboxView.html',
  styleUrl: './InboxView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxView extends View<InboxViewPresenter> {}
