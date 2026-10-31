// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import {
  DropDownButtonComponent,
  IconComponent,
  MenuComponent,
  MenuItemComponent,
  SkeletonComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { NgTemplateOutlet } from '@angular/common';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';
import { CollectionListItemDirective } from './CollectionListItemDirective';
import { type ICollectionListItemContext } from './ICollectionListItemContext';
import { CollectionListEmptyDirective } from './CollectionListEmptyDirective';
import { CollectionListLoadingItemDirective } from './CollectionListLoadingItemDirective';
import type { ICollectionListMenu } from './ICollectionListMenu';
import type { ICollectionListMenuSelection } from './ICollectionListMenuSelection';

// #endregion

/**
 * Collection page anatomy shared by list routes: one bordered header with an icon, a bold
 * summary heading, and dynamic single-check dropdown menus, above the only scrolling region,
 * a `<ul>` of caller-templated rows. Rows come from a `symphonyCollectionListItem` template.
 * Non-template projected content renders between the header and the list, so side-by-side
 * collection lists keep their headers on one line even when one of them carries extra controls.
 * Without a row template only the projected content renders — for list widgets whose rows
 * require their own container (for example `mosaik-list`, whose items refuse other ancestors).
 * While `isLoading` is set the heading becomes a skeleton line and the list repeats the
 * `symphonyCollectionListLoadingItem` template, so the loading state keeps the header, the menus
 * and the row geometry of the loaded list.
 */
@Component({
  selector: 'symphony-collection-list',
  host: {
    class: 'flex min-h-0 w-full flex-1 flex-col',
    role: 'region',
    '[attr.aria-busy]': 'isLoading()',
  },
  imports: [
    DropDownButtonComponent,
    IconComponent,
    MenuComponent,
    MenuItemComponent,
    NgTemplateOutlet,
    SkeletonComponent,
  ],
  templateUrl: './CollectionListComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionListComponent<T> {
  // #region Fields

  /**
   * The items.
   *
   * @public
   * @readonly
   */
  public readonly items = input.required<readonly T[]>();

  /**
   * Stable row identity for the `@for`; items stay otherwise opaque to the component.
   *
   * @public
   * @readonly
   */
  public readonly itemKey = input.required<(item: T) => string | number>();

  /**
   * The heading.
   *
   * @public
   * @readonly
   */
  public readonly heading = input.required<string>();

  /**
   * Registered Mosaik icon name or raw icon data; omit for a text-only heading.
   *
   * @public
   * @readonly
   */
  public readonly headingIcon = input<string>();

  /**
   * The heading icon variant.
   *
   * @public
   * @readonly
   */
  public readonly headingIconVariant = input<Variant>('neutral');

  /**
   * The menus.
   *
   * @public
   * @readonly
   */
  public readonly menus = input<readonly ICollectionListMenu[]>([]);

  /**
   * Accessible name of the scrolling result list.
   *
   * @public
   * @readonly
   */
  public readonly listLabel = input.required<string>();

  /**
   * Whether the collection is still loading; the heading and the rows render as skeletons.
   *
   * @public
   * @readonly
   */
  public readonly isLoading = input(false);

  /**
   * Number of skeleton rows the list shows while it loads.
   *
   * @public
   * @readonly
   */
  public readonly loadingRowCount = input(6);

  /**
   * The menu option activated.
   *
   * @public
   * @readonly
   */
  public readonly menuOptionActivated = output<ICollectionListMenuSelection>();

  protected readonly itemTemplate = contentChild<
    CollectionListItemDirective<T>,
    TemplateRef<ICollectionListItemContext<T>>
  >(CollectionListItemDirective, { read: TemplateRef });

  protected readonly emptyTemplate = contentChild(CollectionListEmptyDirective, {
    read: TemplateRef,
  });

  protected readonly loadingItemTemplate = contentChild(CollectionListLoadingItemDirective, {
    read: TemplateRef,
  });

  protected readonly loadingRows = computed(() => [...Array(this.loadingRowCount()).keys()]);

  // #endregion
}
