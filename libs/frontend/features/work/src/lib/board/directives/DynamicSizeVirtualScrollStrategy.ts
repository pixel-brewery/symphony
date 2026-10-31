// #region Imports

import type { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { Subject, type Observable } from 'rxjs';

// #endregion

/**
 * CDK virtual-scroll strategy for naturally sized board entries.
 *
 * The strategy estimates unseen entries, measures rendered entries through `ResizeObserver`, and
 * keeps the first visible entry anchored when an entry in the leading buffer changes height.
 *
 * @public
 */
export class DynamicSizeVirtualScrollStrategy implements VirtualScrollStrategy {
  // #region Fields

  private readonly _scrolledIndex = new Subject<number>();
  private readonly _sizeByKey = new Map<string, number>();
  private readonly _observedElements = new Map<HTMLElement, string>();
  private readonly _resizeObserver: ResizeObserver;
  private _viewport?: CdkVirtualScrollViewport;
  private _keys: readonly string[] = [];
  private _estimatedItemSize = 240;
  private _bufferSize = 720;
  private _firstVisibleIndex = 0;

  // #endregion

  // #region Ctor

  public constructor() {
    this._resizeObserver = new ResizeObserver((entries) => this.recordObservedSizes(entries));
  }

  // #endregion

  // #region Properties

  /**
   * First visible logical index.
   *
   * @public
   * @readonly
   */
  public readonly scrolledIndexChange: Observable<number> = this._scrolledIndex.asObservable();

  // #endregion

  // #region Methods

  /**
   * Updates the logical keys and sizing configuration.
   *
   * @param keys - Stable entry keys in display order.
   * @param estimatedItemSize - Initial height used until an entry has been measured.
   * @param bufferSize - Rendered overscan before and after the viewport.
   * @public
   */
  public update(keys: readonly string[], estimatedItemSize: number, bufferSize: number): void {
    this._keys = keys;
    this._estimatedItemSize = Math.max(1, estimatedItemSize);
    this._bufferSize = Math.max(0, bufferSize);
    this.updateViewport();
  }

  /**
   * @inheritdoc
   * @public
   */
  public attach(viewport: CdkVirtualScrollViewport): void {
    this._viewport = viewport;
    this.updateViewport();
  }

  /**
   * @inheritdoc
   * @public
   */
  public detach(): void {
    this._resizeObserver.disconnect();
    this._observedElements.clear();
    this._viewport = undefined;
  }

  /**
   * @inheritdoc
   * @public
   */
  public onContentScrolled(): void {
    this.updateViewport();
  }

  /**
   * @inheritdoc
   * @public
   */
  public onDataLengthChanged(): void {
    this.updateViewport();
  }

  /**
   * @inheritdoc
   * @public
   */
  public onContentRendered(): void {
    this.observeRenderedEntries();
    this.measureRenderedEntries();
  }

  /**
   * @inheritdoc
   * @public
   */
  public onRenderedOffsetChanged(): void {}

  /**
   * @inheritdoc
   * @public
   */
  public scrollToIndex(index: number, behavior: ScrollBehavior): void {
    this._viewport?.scrollToOffset(this.offsetForIndex(index), behavior);
  }

  private entrySize(index: number): number {
    const key = this._keys[index];
    return key ? (this._sizeByKey.get(key) ?? this.averageMeasuredSize()) : this._estimatedItemSize;
  }

  private averageMeasuredSize(): number {
    if (!this._sizeByKey.size) return this._estimatedItemSize;
    let total = 0;
    for (const size of this._sizeByKey.values()) total += size;
    return total / this._sizeByKey.size;
  }

  private offsetForIndex(index: number): number {
    let offset = 0;
    const boundedIndex = Math.max(0, Math.min(index, this._keys.length));
    for (let current = 0; current < boundedIndex; current += 1) {
      offset += this.entrySize(current);
    }
    return offset;
  }

  private indexForOffset(offset: number): number {
    const boundedOffset = Math.max(0, offset);
    let currentOffset = 0;
    for (let index = 0; index < this._keys.length; index += 1) {
      currentOffset += this.entrySize(index);
      if (currentOffset > boundedOffset) return index;
    }
    return Math.max(0, this._keys.length - 1);
  }

  private totalContentSize(): number {
    return this.offsetForIndex(this._keys.length);
  }

  private updateViewport(): void {
    if (!this._viewport) return;
    const dataLength = this._viewport.getDataLength();
    if (!dataLength) {
      this._viewport.setTotalContentSize(0);
      this._viewport.setRenderedRange({ start: 0, end: 0 });
      this._viewport.setRenderedContentOffset(0);
      return;
    }

    const scrollOffset = this._viewport.measureScrollOffset();
    const viewportSize = this._viewport.getViewportSize();
    const totalContentSize = this.totalContentSize();
    const firstVisibleIndex = this.indexForOffset(scrollOffset);
    const start = this.indexForOffset(Math.max(0, scrollOffset - this._bufferSize));
    // Unmeasured entries are costed at the average of the measured ones, so the content size is
    // only ever an estimate, and it moves as entries are measured. While it disagrees with the
    // real scroller, the offset that maps to the last entry sits beyond the scroller's own maximum,
    // so the final entries never render - and never being rendered, they are never measured, and
    // the estimate never corrects itself. The end of the range is therefore decided against the
    // scrollport's actual extent rather than against the estimate: whenever the viewport is resting
    // at the bottom, the range runs to the end of the data and the last entry is always reachable.
    const scrollExtent = this._viewport.elementRef.nativeElement.scrollHeight;
    const isAtEnd = scrollOffset >= Math.max(0, scrollExtent - viewportSize) - 1;
    const end = isAtEnd
      ? dataLength
      : Math.min(
          dataLength,
          this.indexForOffset(scrollOffset + viewportSize + this._bufferSize) + 1,
        );

    this._viewport.setTotalContentSize(totalContentSize);
    this._viewport.setRenderedRange({ start, end: Math.max(start + 1, end) });
    this._viewport.setRenderedContentOffset(this.offsetForIndex(start));
    if (firstVisibleIndex !== this._firstVisibleIndex) {
      this._firstVisibleIndex = firstVisibleIndex;
      this._scrolledIndex.next(firstVisibleIndex);
    }
  }

  private observeRenderedEntries(): void {
    if (!this._viewport) return;
    const rendered = new Set(
      this._viewport.elementRef.nativeElement.querySelectorAll<HTMLElement>(
        '[data-board-virtual-index]',
      ),
    );
    for (const element of this._observedElements.keys()) {
      if (rendered.has(element)) continue;
      this._resizeObserver.unobserve(element);
      this._observedElements.delete(element);
    }
    for (const element of rendered) {
      const key = element.dataset['boardVirtualKey'];
      if (!key || this._observedElements.get(element) === key) continue;
      this._observedElements.set(element, key);
      this._resizeObserver.observe(element);
    }
  }

  private measureRenderedEntries(): void {
    const measurements = [...this._observedElements.keys()].map((target) => ({ target }));
    this.recordSizes(measurements);
  }

  private recordObservedSizes(entries: readonly ResizeObserverEntry[]): void {
    this.recordSizes(entries);
  }

  private recordSizes(entries: readonly { readonly target: Element }[]): void {
    if (!this._viewport || !entries.length) return;
    const previousTotalSize = this.totalContentSize();
    const wasAtEnd =
      this._viewport.measureScrollOffset() + this._viewport.getViewportSize() >=
      previousTotalSize - 1;
    let changed = false;
    let leadingDelta = 0;
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const key = element.dataset['boardVirtualKey'];
      const index = Number(element.dataset['boardVirtualIndex']);
      if (!key || !Number.isInteger(index)) continue;
      const style = getComputedStyle(element);
      const size =
        element.getBoundingClientRect().height +
        Number.parseFloat(style.marginBlockStart || '0') +
        Number.parseFloat(style.marginBlockEnd || '0');
      if (!Number.isFinite(size) || size <= 0) continue;
      const previous = this._sizeByKey.get(key) ?? this.averageMeasuredSize();
      if (Math.abs(previous - size) < 0.5) continue;
      this._sizeByKey.set(key, size);
      changed = true;
      if (index < this._firstVisibleIndex) leadingDelta += size - previous;
    }
    if (!changed) return;
    if (wasAtEnd) {
      this.updateViewport();
      this._viewport.scrollToOffset(
        Math.max(0, this.totalContentSize() - this._viewport.getViewportSize()),
      );
      this.updateViewport();
      return;
    }
    if (leadingDelta) {
      this._viewport.scrollToOffset(
        Math.max(0, this._viewport.measureScrollOffset() + leadingDelta),
      );
    }
    this.updateViewport();
  }

  // #endregion
}
