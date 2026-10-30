// #region Imports

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DotComponent,
  SegmentBarComponent,
  SegmentBarItemComponent,
  SkeletonComponent,
  TextComponent,
  TooltipComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import type { StorageUsageDto } from '@symphony/ipc-contracts-platform';
import { StoragePressureLabelPipe } from '../../pipes/StoragePressureLabelPipe';
import { StoragePressureVariantPipe } from '../../pipes/StoragePressureVariantPipe';
import { StorageSizePipe } from '../../pipes/StorageSizePipe';
import { storageBreakdownEntries, storageBreakdownRemainder } from './storageBreakdown';

// #endregion

/**
 * The occupied part of a storage budget, split into the categories that actually fill it, and
 * a legend naming every colour with the space it takes. Used wherever Symphony shows a storage
 * limit - the managed total, the local runner, and a single workspace - so the same colours,
 * the same wording, and the same interaction apply everywhere.
 */
@Component({
  selector: 'symphony-storage-breakdown',
  imports: [
    DotComponent,
    SegmentBarComponent,
    SegmentBarItemComponent,
    SkeletonComponent,
    StoragePressureLabelPipe,
    StoragePressureVariantPipe,
    StorageSizePipe,
    TextComponent,
    TooltipComponent,
    TypographyDirective,
  ],
  templateUrl: './StorageBreakdownComponent.html',
  styleUrl: './StorageBreakdownComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageBreakdownComponent {
  // #region Fields

  /**
   * The usage.
   *
   * @public
   * @readonly
   */
  public readonly usage = input<StorageUsageDto | undefined>(undefined);

  /**
   * Whether a completed measurement backs `usage`. A tree too large to walk inline is counted
   * in the background, and until that finishes the reported allocation is a placeholder, not a
   * fact - the bar and its legend stay empty rather than claiming the disk is empty.
   *
   * @public
   * @readonly
   */
  public readonly measured = input(true);

  /**
   * The limit currently shown in the editor, which can still differ from the saved one.
   *
   * @public
   * @readonly
   */
  public readonly limitGiB = input.required<number>();

  /**
   * The size test ID.
   *
   * @public
   * @readonly
   */
  public readonly sizeTestId = input.required<string>();

  /**
   * The bar test ID.
   *
   * @public
   * @readonly
   */
  public readonly barTestId = input.required<string>();

  /**
   * The limit bytes.
   *
   * @public
   * @readonly
   */
  public readonly limitBytes = computed(() => Math.round(this.limitGiB() * 1024 ** 3));

  /**
   * The pending.
   *
   * @public
   * @readonly
   */
  public readonly pending = computed(() => !this.usage() || !this.measured());

  /**
   * The entries.
   *
   * @public
   * @readonly
   */
  public readonly entries = computed(() => storageBreakdownEntries(this.usage(), this.measured()));

  /**
   * The available.
   *
   * @public
   * @readonly
   */
  public readonly available = computed(() =>
    storageBreakdownRemainder(this.usage(), this.measured(), this.limitGiB()),
  );

  // #endregion
}
