// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CellComponent,
  CellGroupComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { PseudoLinkDirective } from '@symphony/frontend-ui/mobile';

// #endregion

@Component({
  selector: 'symphony-mobile-work-item-create-group',
  host: { class: 'block' },
  imports: [
    CellComponent,
    CellGroupComponent,
    PseudoLinkDirective,
    RouterLink,
    TextComponent,
    TypographyDirective,
  ],
  templateUrl: './MobileWorkItemCreateGroupView.html',
  styleUrl: './MobileWorkItemCreateGroupView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileWorkItemCreateGroupView {}
