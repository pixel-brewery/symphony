// #region Imports

import { describe, expect, it } from 'vitest';
import { CaliforniaGamesPalette } from './CaliforniaGamesPalette';
import { CaliforniaGamesSurface } from './CaliforniaGamesSurface';

// #endregion

describe('CaliforniaGamesSurface', () => {
  it('clips primitives to the 160 by 102 four-bit surface', () => {
    // arrange
    const surface = new CaliforniaGamesSurface();
    surface.clear(18);

    // act
    surface.fillRect(-4, -3, 7, 6, 7);
    surface.line(-2, 101, 3, 101, 22);

    // assert
    expect(surface.width).toBe(160);
    expect(surface.height).toBe(102);
    expect(surface.getPixel(0, 0)).toBe(7);
    expect(surface.getPixel(159, 101)).toBe(2);
    expect(surface.getPixel(3, 101)).toBe(6);
    expect(surface.getPixel(-1, 0)).toBe(0);
  });

  it('scales mirrors shears and collision-tests indexed sprites', () => {
    // arrange
    const surface = new CaliforniaGamesSurface();
    const mask = surface.createCollisionMask();
    const sprite = ['120', '030'];

    // act
    const firstCollision = surface.drawSprite(sprite, 10, 10, {
      flipX: true,
      scaleX: 2,
      scaleY: 2,
      shear: 1,
      collisionMask: mask,
    });
    const secondCollision = surface.drawSprite(['400'], 12, 10, { collisionMask: mask });

    // assert
    expect(firstCollision).toBe(false);
    expect(secondCollision).toBe(true);
    expect(surface.getPixel(12, 10)).toBe(4);
    expect(surface.getPixel(14, 12)).toBe(3);
  });

  it('converts palette indices to RGBA and rotates a flipped screen', () => {
    // arrange
    const surface = new CaliforniaGamesSurface();
    surface.clear(0);
    surface.setPixel(0, 0, 2);
    const normal = { data: new Uint8ClampedArray(160 * 102 * 4) } as ImageData;
    const flipped = { data: new Uint8ClampedArray(160 * 102 * 4) } as ImageData;

    // act
    surface.writeImageData(normal, CaliforniaGamesPalette);
    surface.writeImageData(flipped, CaliforniaGamesPalette, true);

    // assert
    expect([...normal.data.slice(0, 4)]).toEqual([233, 70, 56, 255]);
    expect([...flipped.data.slice(-4)]).toEqual([233, 70, 56, 255]);
  });
});
