// #region Imports

import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  AppComponent,
  AppHeaderComponent,
  AvatarComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  BreakpointDirective,
  ButtonComponent,
  DividerComponent,
  DropDownButtonComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
  ListComponent,
  ListItemComponent,
  MenuComponent,
  MenuItemComponent,
  PopupComponent,
  ProgressRingComponent,
  SearchBoxComponent,
  SegmentComponent,
  SegmentItemComponent,
  SheetComponent,
  SheetContentComponent,
  SplitComponent,
  TextComponent,
  ToggleButtonComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';
import { BooleanIconPipe, CompactTextPipe } from '@symphony/frontend-ui';
import { PresenterRailSheetDirective } from '../directives/PresenterRailSheetDirective';
import { PresenterRailSplitDirective } from '../directives/PresenterRailSplitDirective';
import { PresenterViewPresenter } from '../view-presenters/PresenterViewPresenter';
import { RailRunStatePresentationPipe } from '../pipes/RailRunStatePresentationPipe';
import { ActionStateLabelPipe } from '@symphony/frontend-feature-ci/presentation';

// #endregion

@Component({
  selector: 'symphony-presenter-view',
  host: { class: 'block' },
  imports: [
    AppComponent,
    ActionStateLabelPipe,
    AppHeaderComponent,
    AvatarComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BooleanIconPipe,
    BreakpointDirective,
    ButtonComponent,
    CompactTextPipe,
    DatePipe,
    DividerComponent,
    DropDownButtonComponent,
    HintComponent,
    IconComponent,
    IconNameDirective,
    ListComponent,
    ListItemComponent,
    MenuComponent,
    MenuItemComponent,
    NgTemplateOutlet,
    PopupComponent,
    ProgressRingComponent,
    PresenterRailSheetDirective,
    RailRunStatePresentationPipe,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SearchBoxComponent,
    SegmentComponent,
    SegmentItemComponent,
    SheetComponent,
    SheetContentComponent,
    SplitComponent,
    TextComponent,
    ToggleButtonComponent,
    TooltipDirective,
    TypographyDirective,
    PresenterRailSplitDirective,
  ],
  providers: [PresenterViewPresenter],
  templateUrl: './PresenterView.html',
  styleUrl: './PresenterView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresenterView {
  // #region Fields

  protected readonly store = inject(PRESENTATION_CONTEXT);
  protected readonly presenter = inject(PresenterViewPresenter);

  private readonly _injector = inject(Injector);
  private readonly _searchControl = viewChild<SearchBoxComponent>('searchControl');
  private _searchFocusPending = false;

  // #endregion

  // #region Ctor

  public constructor() {
    void this.store.initialize();
  }

  // #endregion

  // #region Methods

  protected search(event: unknown): void {
    const detail = event as { query?: unknown; target?: HTMLElement & { value?: string } } | null;
    const query =
      typeof detail?.query === 'string'
        ? detail.query
        : typeof detail?.target?.value === 'string'
          ? detail.target.value
          : '';
    this.presenter.searchQuery.set(query);
    void this.presenter.searchCommand.execute(query);
  }

  protected clearSearch(): void {
    this.presenter.searchQuery.set('');
    void this.presenter.searchCommand.execute('');
  }

  /**
   * Opens the search field and puts the caret in it.
   *
   * The field replaces the launcher button in the same slot, so it does not exist yet when this
   * runs; focus is taken on the next render instead.
   */
  protected expandSearch(): void {
    this._searchFocusPending = true;
    this.presenter.isSearchExpanded.set(true);
    afterNextRender(
      () => {
        const control = this._searchControl()?.elementRef.nativeElement;
        if (!control) {
          this._searchFocusPending = false;
          return;
        }
        void control.updateComplete.finally(() => {
          control.focus();
          this._searchFocusPending = false;
        });
      },
      { injector: this._injector },
    );
  }

  /** Collapses the launcher once focus has left every control inside the search surface. */
  protected collapseSearchOnFocusLoss(event: FocusEvent): void {
    if (this._searchFocusPending) return;
    const surface = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (
      surface instanceof HTMLElement &&
      nextTarget instanceof Node &&
      surface.contains(nextTarget)
    ) {
      return;
    }
    this.collapseSearch();
  }

  protected collapseSearch(): void {
    this.presenter.stopVoiceInputCommand.execute();
    this.presenter.isSearchExpanded.set(false);
  }

  // #endregion
}
