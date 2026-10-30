// #region Imports

import { describe, expect, it } from 'vitest';
import { agentSpriteLookFrame } from './agentSpriteLookFrame';

// #endregion

describe('agentSpriteLookFrame', () => {
  it('registers viewer-relative cardinals clockwise across both look rows', () => {
    // arrange
    const bounds = { left: 0, top: 0, width: 100, height: 100 };
    // act
    const frames = [
      { x: 50, y: -50 },
      { x: 150, y: 50 },
      { x: 50, y: 150 },
      { x: -50, y: 50 },
    ].map((target) => agentSpriteLookFrame(bounds, target));
    // assert
    expect(frames.map((frame) => [frame?.rowIndex, frame?.columnIndex])).toEqual([
      [9, 0],
      [9, 4],
      [10, 0],
      [10, 4],
    ]);
    expect(agentSpriteLookFrame(bounds, { x: 50, y: 50 })).toBeNull();
  });
});
