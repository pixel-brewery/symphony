// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import english from './lang.en.json';
import { LabelLocalizationBinding } from './LabelLocalizationBinding';
import { translateLabel } from './translateLabel';

// #endregion

describe('translateLabel', () => {
  const parameterizedKey = (Object.keys(english) as Array<keyof typeof english>).find((key) =>
    english[key].includes('{0}'),
  );
  if (!parameterizedKey) throw new Error('The label catalog must include a parameterized message.');
  let dispose: (() => void) | undefined;

  afterEach(() => dispose?.());

  it('preserves absent parameters and formats null as the public Mosaik translator does', () => {
    // arrange
    const source = english[parameterizedKey];

    // act
    const omitted = translateLabel(parameterizedKey);
    const nullable = translateLabel(parameterizedKey, null);

    // assert
    expect(omitted).toBe(source);
    expect(nullable).toBe(source.replaceAll('{0}', 'null'));
  });

  it('delegates known labels and their parameters to the canonical application owner', () => {
    // arrange
    const translate = vi.fn(() => 'Übersetzt');
    dispose = LabelLocalizationBinding.bind({ translate });

    // act
    const result = translateLabel(parameterizedKey, 7);

    // assert
    expect(translate).toHaveBeenCalledWith(parameterizedKey, 7);
    expect(result).toBe('Übersetzt');
  });

  it('rejects keys missing from the authored catalog instead of silently returning English or the key', () => {
    // arrange
    const key = 'loc.symphony.labels.unknown';

    // act
    // assert
    expect(() => {
      // @ts-expect-error Also reject unknown keys supplied by untyped consumers at runtime.
      translateLabel(key);
    }).toThrow('Unknown application label key');
  });
});
