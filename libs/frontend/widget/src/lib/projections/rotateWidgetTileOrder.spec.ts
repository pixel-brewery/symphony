// #region Imports

import { describe, expect, it } from 'vitest';
import { rotateWidgetTileOrder } from './rotateWidgetTileOrder';

// #endregion

describe('rotateWidgetTileOrder', () => {
  it('exchanges two visible tiles when no slot is hovered', () => {
    // arrange
    const order = ['backlog', 'ready', 'active'];
    const randomValues = [0, 0];

    // act
    const rotated = rotateWidgetTileOrder(order, new Set(), () => randomValues.shift() ?? 0);

    // assert
    expect(rotated).toEqual(['ready', 'backlog', 'active']);
    expect(rotated).not.toBe(order);
  });

  it('does not move a hovered slot', () => {
    // arrange
    const order = ['backlog', 'ready', 'active'];

    // act
    const rotated = rotateWidgetTileOrder(order, new Set([0]), () => 0);

    // assert
    expect(rotated[0]).toBe('backlog');
    expect(rotated).toEqual(['backlog', 'active', 'ready']);
  });

  it('brings overflow content into one of the ten visible slots', () => {
    // arrange
    const order = [...Array(11).keys()].map((index) => `tile-${index}`);

    // act
    const rotated = rotateWidgetTileOrder(order, new Set(), () => 0.999);

    // assert
    expect(rotated.slice(0, 10)).toContain('tile-10');
    expect(rotated[10]).toBe('tile-9');
  });

  it('keeps the original order when every visible tile is hovered', () => {
    // arrange
    const order = ['backlog', 'ready'];

    // act
    const rotated = rotateWidgetTileOrder(order, new Set([0, 1]), () => 0);

    // assert
    expect(rotated).toBe(order);
  });
});
