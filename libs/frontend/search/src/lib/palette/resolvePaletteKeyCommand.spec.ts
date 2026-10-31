// #region Imports

import { describe, expect, it } from 'vitest';
import { resolvePaletteKeyCommand } from './resolvePaletteKeyCommand';

// #endregion

describe('resolvePaletteKeyCommand', () => {
  it.each([
    ['ArrowDown', {}, 'next'],
    ['ArrowUp', {}, 'previous'],
    ['Enter', {}, 'open'],
    ['Enter', { metaKey: true }, 'open'],
    ['Escape', {}, 'close'],
    ['Tab', {}, 'stay'],
    ['Tab', { shiftKey: true }, 'stay'],
    ['ArrowDown', { shiftKey: true }, undefined],
    ['Enter', { altKey: true }, undefined],
    ['a', {}, undefined],
    ['Home', {}, undefined],
    ['Enter', { isComposing: true }, undefined],
  ] as const)('maps %s %o to %s', (key, modifiers, expected) => {
    // arrange
    const event = { key, altKey: false, shiftKey: false, isComposing: false, ...modifiers };

    // act
    const command = resolvePaletteKeyCommand(event);

    // assert
    expect(command).toBe(expected);
  });
});
