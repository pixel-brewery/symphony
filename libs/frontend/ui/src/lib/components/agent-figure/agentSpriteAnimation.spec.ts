// #region Imports

import { describe, expect, it } from 'vitest';
import { agentSpriteAnimation } from './agentSpriteAnimation';

// #endregion

describe('agentSpriteAnimation', () => {
  it('keeps real work and waiting alive while finite success returns to calm idle', () => {
    // arrange
    // act
    const working = agentSpriteAnimation('running', false, false);
    const waiting = agentSpriteAnimation('waiting', false, false);
    const success = agentSpriteAnimation('jumping', false, false);
    // assert
    expect(working.loopStartIndex).toBe(0);
    expect(working.frames.every((frame) => frame.rowIndex === 7)).toBe(true);
    expect(waiting.frames.every((frame) => frame.rowIndex === 6)).toBe(true);
    expect(success.frames[success.loopStartIndex!]!.rowIndex).toBe(0);
    expect(success.loopStartIndex).toBe(15);
  });

  it('holds one state-appropriate frame for reduced motion, unavailable data and offscreen figures', () => {
    // arrange
    // act
    const reduced = agentSpriteAnimation('review', true, false);
    const stationary = agentSpriteAnimation('failed', false, true);
    // assert
    expect(reduced.frames).toHaveLength(1);
    expect(reduced.frames[0]!.rowIndex).toBe(8);
    expect(reduced.loopStartIndex).toBeNull();
    expect(stationary.frames).toHaveLength(1);
    expect(stationary.loopStartIndex).toBeNull();
  });
});
