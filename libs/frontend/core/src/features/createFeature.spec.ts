// #region Imports

import type { Provider } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { createFeature } from './createFeature';
import { createFeatureKind } from './createFeatureKind';
import { validateFeatures } from './validateFeatures';

// #endregion

describe('createFeature', () => {
  it('captures registrations so later caller changes cannot silently add providers', () => {
    // arrange
    const original = { provide: 'search-source', useValue: 'work' };
    const providers: Provider[] = [original];
    const feature = createFeature('work', createFeatureKind('search'), providers, { multi: true });

    // act
    providers.push({ provide: 'search-source', useValue: 'unregistered' });
    const actual = feature.provide();

    // assert
    expect(actual).toEqual([original]);
  });

  it('retains its captured multiplicity when the caller changes the original options', () => {
    // arrange
    const kind = createFeatureKind('search');
    const options = { multi: true };
    const feature = createFeature('work', kind, [], options);
    const other = createFeature('ci', kind, [], { multi: true });

    // act
    options.multi = false;
    const validate = () => validateFeatures([feature, other]);

    // assert
    expect(validate).not.toThrow();
  });
});
