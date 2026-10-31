// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  IconNameDirective,
  DividerComponent,
  DropDownButtonComponent,
  MenuComponent,
  MenuItemComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { WindowSidebar } from '@symphony/frontend-core';
import { PresenterViewPresenter } from '../view-presenters/PresenterViewPresenter';
import { RunPanelView } from './RunPanelView';

// #endregion

/**
 * The main window's source list: workspace switcher, grouped destinations with their counts, the
 * run panel and `Settings`.
 *
 * @public
 */
@Component({
  selector: 'symphony-window-sidebar',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    IconNameDirective,
    DividerComponent,
    DropDownButtonComponent,
    MenuComponent,
    MenuItemComponent,
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    RunPanelView,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  templateUrl: './WindowSidebarView.html',
  styleUrl: './WindowSidebarView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindowSidebarView {
  // #region Fields

  protected readonly presenter = inject(PresenterViewPresenter);

  /** Navigation of the open screen that replaces the destinations, such as Settings. */
  protected readonly navigationOverride = inject(WindowSidebar).content;

  /** Shows the workspace short code itself instead of initials derived from it. */
  protected readonly shortCodeAccessor = (value: string): string => value.slice(0, 2).toUpperCase();

  // #endregion
}
