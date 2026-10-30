// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IWidgetDefinition } from '../models/IWidgetDefinition';
import type { IWidgetTile } from '../models/IWidgetTile';
import { SmallFirstWidgetPlacements } from '../models/SmallFirstWidgetPlacements';
import { LargeFirstWidgetPlacements } from '../models/LargeFirstWidgetPlacements';
import { WidgetMosaicSession } from './WidgetMosaicSession';

// #endregion

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

describe('WidgetMosaicSession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  it('projects all three final mosaic geometries before a snapshot is available', () => {
    // arrange
    const fixture = createFixture(categories(), true);

    // act
    const result = fixture.session.categories();

    // assert
    expect(result.map((category) => category.label)).toEqual(['Board', 'Pull requests', 'Actions']);
    expect(result.every((category) => category.slots.length === 10)).toBe(true);
    expect(
      result[0]?.slots.map(({ column, row, columns, rows }) => ({ column, row, columns, rows })),
    ).toEqual([
      { column: 1, row: 1, columns: 1, rows: 1 },
      { column: 2, row: 1, columns: 1, rows: 1 },
      { column: 1, row: 2, columns: 1, rows: 1 },
      { column: 2, row: 2, columns: 1, rows: 1 },
      { column: 3, row: 1, columns: 2, rows: 2 },
      { column: 3, row: 3, columns: 1, rows: 1 },
      { column: 4, row: 3, columns: 1, rows: 1 },
      { column: 3, row: 4, columns: 1, rows: 1 },
      { column: 4, row: 4, columns: 1, rows: 1 },
      { column: 5, row: 3, columns: 2, rows: 2 },
    ]);
    for (const category of result.slice(1)) {
      expect(category.slots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ column: 1, row: 1, columns: 2, rows: 2 }),
          expect.objectContaining({ column: 3, row: 3, columns: 2, rows: 2 }),
        ]),
      );
    }
    expect(
      result.every(
        (category) => category.slots.filter((slot) => slot.showsEmptyFrame).length === 5,
      ),
    ).toBe(true);
  });

  it('protects hovered and focused slots, then waits for every exit before replacing content', () => {
    // arrange
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const tiles = signal<readonly IWidgetTile[]>([tile('a'), tile('b'), tile('c')]);
    const fixture = createFixture([{ ...categories()[0]!, tiles }]);
    fixture.session.hoveredTileSlot.set('board:0');
    fixture.session.focusedTileSlot.set('board:1');

    // act
    vi.advanceTimersByTime(5_000);
    const protectedSlots = fixture.session.categories()[0]!.slots;
    fixture.session.focusedTileSlot.set(undefined);
    vi.advanceTimersByTime(5_000);
    const exits = fixture.session.categories()[0]!.slots.filter((slot) => slot.isExiting);
    vi.advanceTimersByTime(5_000);
    exits[0]!.animation.onFinished?.();
    const waiting = fixture.session.categories()[0]!.slots.map((slot) => slot.tile?.id);
    exits[1]!.animation.onFinished?.();
    const completed = fixture.session.categories()[0]!.slots;
    fixture.destroy();

    // assert
    expect(protectedSlots.some((slot) => slot.isExiting)).toBe(false);
    expect(exits.map((slot) => slot.index)).toEqual([1, 2]);
    expect(waiting.slice(0, 3)).toEqual(['a', 'b', 'c']);
    expect(completed.slice(0, 3).map((slot) => slot.tile?.id)).toEqual(['a', 'c', 'b']);
    expect(
      completed.every((slot) => !slot.isExiting && slot.animation.name === 'homeTileEnter'),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains the five-second round robin across included categories', () => {
    // arrange
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fixture = createFixture(
      categories().map((category) => ({
        ...category,
        tiles: signal([tile(`${category.id}-a`), tile(`${category.id}-b`)]),
      })),
    );
    const rotated: string[] = [];

    // act
    for (let turn = 0; turn < 3; turn += 1) {
      vi.advanceTimersByTime(5_000);
      const category = fixture.session
        .categories()
        .find((candidate) => candidate.slots.some((slot) => slot.isExiting))!;
      rotated.push(category.id);
      category.slots.forEach((slot) => slot.animation.onFinished?.());
    }
    fixture.destroy();

    // assert
    expect(rotated).toEqual(['board', 'pull-requests', 'actions']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reconciles retained order with removed and newly projected tiles', () => {
    // arrange
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const tiles = signal<readonly IWidgetTile[]>([tile('a'), tile('b'), tile('c')]);
    const fixture = createFixture([{ ...categories()[0]!, tiles }]);

    // act
    vi.advanceTimersByTime(5_000);
    fixture.session.categories()[0]!.slots.forEach((slot) => slot.animation.onFinished?.());
    tiles.set([tile('a'), tile('c'), tile('d')]);
    const current = fixture.session.categories()[0]!.slots;
    fixture.destroy();

    // assert
    expect(current.slice(0, 3).map((slot) => slot.tile?.id)).toEqual(['a', 'c', 'd']);
  });

  it('keeps reduced-motion ordering stable and owns no rotation timer', () => {
    // arrange
    const fixture = createFixture(categories(), true);

    // act
    vi.advanceTimersByTime(30_000);
    const current = fixture.session.categories();
    fixture.destroy();

    // assert
    expect(current.every((category) => category.slots.every((slot) => !slot.isExiting))).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

function createFixture(definitions: readonly IWidgetDefinition[], reducedMotion = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({ matches: reducedMotion })),
  });
  const callbacks = new Set<() => void>();
  let destroyed = false;
  const session = new WidgetMosaicSession(
    { getViews: () => signal([...definitions]) },
    {
      get destroyed() {
        return destroyed;
      },
      onDestroy: (callback) => {
        callbacks.add(callback);
        return () => {
          callbacks.delete(callback);
        };
      },
    },
    { getItemForNavigation: () => undefined },
  );
  return {
    session,
    destroy: () => {
      destroyed = true;
      callbacks.forEach((callback) => callback());
      callbacks.clear();
    },
  };
}

function categories(): IWidgetDefinition[] {
  return [
    { id: 'board', label: 'Board', placements: SmallFirstWidgetPlacements },
    { id: 'pull-requests', label: 'Pull requests', placements: LargeFirstWidgetPlacements },
    { id: 'actions', label: 'Actions', placements: LargeFirstWidgetPlacements },
  ].map((category, index) => ({
    ...category,
    order: (index + 1) * 10,
    testId: `home-category-${category.id}`,
    tilesTestId: `home-${category.id}-tiles`,
    empty: '',
    tiles: signal<readonly IWidgetTile[]>([]),
  }));
}

function tile(id: string): IWidgetTile {
  return {
    id,
    testId: id,
    label: id,
    count: 1,
    route: '/main/board',
    queryParams: {},
    ariaLabel: id,
    live: false,
    attention: false,
  };
}
