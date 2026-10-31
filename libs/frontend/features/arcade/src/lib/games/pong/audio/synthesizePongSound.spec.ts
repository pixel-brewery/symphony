// #region Imports

import { describe, expect, it } from 'vitest';
import type { IPongSoundEvent } from '../model/IPongSoundEvent';
import { PongRules } from '../model/PongRules';
import { synthesizePongSound } from './synthesizePongSound';

// #endregion

const EVENT: IPongSoundEvent = {
  id: 1,
  kind: 'paddle',
  frame: 1,
  line: 100,
  ballCounter: 252,
  verticalLoad: 7,
};
const RATE = 48_000;
const LINE_RATE = PongRules.clock / PongRules.lineClocks;

describe('synthesizePongSound', () => {
  it('uses the original 242ms score timer and one-field wall gate', () => {
    // arrange
    const scoreEvent = { ...EVENT, kind: 'score' as const };
    // act
    const score = synthesizePongSound(scoreEvent, RATE);
    const wall = synthesizePongSound({ ...EVENT, kind: 'wall' }, RATE);
    const paddle = synthesizePongSound(EVENT, RATE);
    // assert
    expect(score).toHaveLength(11616);
    expect(wall).toHaveLength(Math.ceil((262 / LINE_RATE) * RATE));
    expect(paddle.length).toBeLessThan(wall.length);
    expect(paddle.length / RATE).toBeGreaterThan(0.014);
    for (const samples of [score, wall, paddle])
      expect(samples.every((value) => Math.abs(value) < 0.181)).toBe(true);
  });

  it('takes score pitch from the sixth vertical-counter bit and retains its reset discontinuity', () => {
    // arrange
    const event = { ...EVENT, kind: 'score' as const, line: 0 };
    // act
    const samples = synthesizePongSound(event, RATE);
    const sample = (line: number) => samples[Math.ceil((line / LINE_RATE) * RATE)]!;
    // assert
    expect(sample(0)).toBeLessThan(0);
    expect(sample(32)).toBeGreaterThan(0);
    expect(sample(64)).toBeLessThan(0);
    expect(sample(256)).toBeLessThan(0);
    expect(sample(288)).toBeLessThan(0);
    expect(sample(294)).toBeGreaterThan(0);
  });

  it('retains the ball-counter blanking pause rather than substituting a generic fixed-frequency beep', () => {
    // arrange
    const middle = { ...EVENT, line: 100 };
    const bottom = { ...EVENT, line: 230 };
    // act
    const first = synthesizePongSound(middle, RATE);
    const second = synthesizePongSound(bottom, RATE);
    // assert
    expect(Array.from(first)).not.toEqual(Array.from(second));
    expect(first.some((value) => value < 0)).toBe(true);
    expect(first.some((value) => value > 0)).toBe(true);
  });

  it('rejects invalid sample rates before allocating audio memory', () => {
    // arrange
    const rates = [0, NaN, Infinity, 7999, 192001];
    // act
    const calls = rates.map((rate) => () => synthesizePongSound(EVENT, rate));
    // assert
    for (const call of calls) expect(call).toThrow(RangeError);
  });
});
