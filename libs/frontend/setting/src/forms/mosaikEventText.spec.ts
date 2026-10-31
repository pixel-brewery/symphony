// #region Imports

import { describe, expect, it } from 'vitest';
import { mosaikEventText } from './mosaikEventText';

// #endregion

describe('mosaikEventText', () => {
  it('reads the text a Mosaik text box reports on its change event', () => {
    // arrange
    const event = { type: 'changed', detail: { value: 'sudo apt-get install -y libvips' } };

    // act
    const actual = mosaikEventText(event);

    // assert
    expect(actual).toBe('sudo apt-get install -y libvips');
  });

  it('reads the value from the emitting element when the detail carries none', () => {
    // arrange
    const event = { type: 'changed', detail: {}, target: { value: 'corepack enable' } };

    // act
    const actual = mosaikEventText(event);

    // assert
    expect(actual).toBe('corepack enable');
  });

  it('reads a detail that is the value itself', () => {
    // act
    const actual = mosaikEventText({ type: 'changed', detail: 'plain text' });

    // assert
    expect(actual).toBe('plain text');
  });

  it('reads the selected option of a Mosaik select', () => {
    // arrange
    const event = { type: 'selectionChanged', detail: { newValue: { value: 'ubuntu24-arm64/1' } } };

    // act
    const actual = mosaikEventText(event);

    // assert
    expect(actual).toBe('ubuntu24-arm64/1');
  });

  it('never coerces the event object itself into text', () => {
    // arrange
    const event = { type: 'changed', detail: {}, target: {} };

    // act
    const actual = mosaikEventText(event);

    // assert
    expect(actual).toBeUndefined();
    expect(String(mosaikEventText(event))).not.toContain('object');
  });

  it('preserves an empty string so clearing a field is not ignored', () => {
    // act
    const actual = mosaikEventText({ detail: { value: '' } });

    // assert
    expect(actual).toBe('');
  });

  it.each(['sudo apt-get install -y libvips', ''])(
    'reads native input text %j instead of the numeric UI-event detail',
    (value) => {
      // arrange
      const event = { type: 'input', detail: 0, target: { value } };

      // act
      const actual = mosaikEventText(event);

      // assert
      expect(actual).toBe(value);
    },
  );
});
