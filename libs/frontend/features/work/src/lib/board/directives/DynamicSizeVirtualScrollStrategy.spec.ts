// #region Imports

import type { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DynamicSizeVirtualScrollStrategy } from './DynamicSizeVirtualScrollStrategy';

// #endregion

class ResizeObserverStub {
  // #region Fields

  public static latest?: ResizeObserverStub;

  private readonly _callback: ResizeObserverCallback;

  public readonly disconnect = vi.fn();
  public readonly observe = vi.fn();
  public readonly unobserve = vi.fn();

  // #endregion

  // #region Ctor

  public constructor(callback: ResizeObserverCallback) {
    this._callback = callback;
    ResizeObserverStub.latest = this;
  }

  // #endregion

  // #region Methods

  public trigger(entries: readonly ResizeObserverEntry[]): void {
    this._callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }

  // #endregion
}

function element(key: string, index: number, height: number): HTMLElement {
  return {
    dataset: {
      boardVirtualIndex: String(index),
      boardVirtualKey: key,
    },
    getBoundingClientRect: () => ({ height }) as DOMRect,
  } as unknown as HTMLElement;
}

function resizeEntry(target: HTMLElement, height: number): ResizeObserverEntry {
  Object.assign(target, {
    getBoundingClientRect: () => ({ height }) as DOMRect,
  });
  return {
    target,
    contentRect: { height },
  } as unknown as ResizeObserverEntry;
}

function viewportFixture(rendered: readonly HTMLElement[]) {
  let scrollOffset = 0;
  const renderedRanges: Array<{ start: number; end: number }> = [];
  const renderedOffsets: number[] = [];
  const totalSizes: number[] = [];
  const scrollToOffsets: number[] = [];
  const viewport = {
    elementRef: {
      nativeElement: {
        querySelectorAll: () => rendered,
      },
    },
    getDataLength: () => 6,
    getViewportSize: () => 300,
    measureScrollOffset: () => scrollOffset,
    setRenderedRange: (range: { start: number; end: number }) => renderedRanges.push(range),
    setRenderedContentOffset: (offset: number) => renderedOffsets.push(offset),
    setTotalContentSize: (size: number) => totalSizes.push(size),
    scrollToOffset: (offset: number) => {
      scrollOffset = offset;
      scrollToOffsets.push(offset);
    },
  } as unknown as CdkVirtualScrollViewport;
  return {
    viewport,
    renderedRanges,
    renderedOffsets,
    scrollToOffsets,
    totalSizes,
    setScrollOffset: (offset: number) => (scrollOffset = offset),
  };
}

describe('DynamicSizeVirtualScrollStrategy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    ResizeObserverStub.latest = undefined;
  });

  it('measures variable-height entries and keeps a leading resize anchored', () => {
    // arrange
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('getComputedStyle', () => ({
      marginBlockStart: '0',
      marginBlockEnd: '0',
    }));
    const first = element('a', 0, 100);
    const second = element('b', 1, 300);
    const fixture = viewportFixture([first, second]);
    const strategy = new DynamicSizeVirtualScrollStrategy();
    const scrolledIndexes: number[] = [];
    strategy.scrolledIndexChange.subscribe((index) => scrolledIndexes.push(index));

    // act
    strategy.attach(fixture.viewport);
    strategy.update(['a', 'b', 'c', 'd', 'e', 'f'], 240, 0);
    strategy.onDataLengthChanged();
    strategy.onContentRendered();
    fixture.setScrollOffset(650);
    strategy.onContentScrolled();
    ResizeObserverStub.latest?.trigger([resizeEntry(first, 180)]);

    // assert
    expect(fixture.totalSizes).toContain(1_200);
    expect(fixture.totalSizes.at(-1)).toBe(1_440);
    expect(fixture.renderedRanges).toContainEqual({ start: 3, end: 5 });
    expect(fixture.renderedOffsets).toContain(600);
    expect(scrolledIndexes).toContain(3);
    expect(fixture.scrollToOffsets.at(-1)).toBe(730);
  });

  it('retains measurements by stable key when entries are reordered', () => {
    // arrange
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('getComputedStyle', () => ({
      marginBlockStart: '0',
      marginBlockEnd: '0',
    }));
    const first = element('a', 0, 100);
    const second = element('b', 1, 300);
    const fixture = viewportFixture([first, second]);
    const strategy = new DynamicSizeVirtualScrollStrategy();
    strategy.attach(fixture.viewport);
    strategy.update(['a', 'b', 'c', 'd', 'e', 'f'], 240, 0);
    strategy.onContentRendered();

    // act
    strategy.update(['b', 'a', 'c', 'd', 'e', 'f'], 240, 0);
    strategy.scrollToIndex(1, 'auto');

    // assert
    expect(fixture.scrollToOffsets.at(-1)).toBe(300);
    strategy.detach();
    expect(ResizeObserverStub.latest?.disconnect).toHaveBeenCalledOnce();
  });

  it('keeps the viewport pinned to the end while the final estimates settle', () => {
    // arrange
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    vi.stubGlobal('getComputedStyle', () => ({
      marginBlockStart: '0',
      marginBlockEnd: '0',
    }));
    const first = element('a', 0, 100);
    const second = element('b', 1, 300);
    const fixture = viewportFixture([first, second]);
    const strategy = new DynamicSizeVirtualScrollStrategy();
    strategy.attach(fixture.viewport);
    strategy.update(['a', 'b', 'c', 'd', 'e', 'f'], 240, 0);
    strategy.onContentRendered();
    fixture.setScrollOffset(900);
    strategy.onContentScrolled();

    // act
    ResizeObserverStub.latest?.trigger([resizeEntry(second, 400)]);

    // assert
    expect(fixture.totalSizes.at(-1)).toBe(1_500);
    expect(fixture.scrollToOffsets.at(-1)).toBe(1_200);
  });
});
