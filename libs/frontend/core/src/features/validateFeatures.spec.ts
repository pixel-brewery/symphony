// #region Imports

import { describe, expect, it } from 'vitest';
import { createFeature } from './createFeature';
import { createFeatureKind } from './createFeatureKind';
import { validateFeatures } from './validateFeatures';

// #endregion

describe('validateFeatures', () => {
  it('rejects multiple registrations of a kind that is exclusive by default', () => {
    // arrange
    const kind = createFeatureKind('ranking');
    const features = [createFeature('default', kind, []), createFeature('custom', kind, [])];

    // act
    const validate = () => validateFeatures(features);

    // assert
    expect(validate).toThrow("multiple features of non-multi kind 'ranking'");
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    'rejects mixed multiplicity policies in either registration order (%s, %s)',
    (first, second) => {
      // arrange
      const kind = createFeatureKind('search');
      const features = [
        createFeature('work', kind, [], { multi: first }),
        createFeature('delivery', kind, [], { multi: second }),
      ];

      // act
      const validate = () => validateFeatures(features);

      // assert
      expect(validate).toThrow("multiple features of non-multi kind 'search'");
    },
  );

  it('rejects duplicate identifiers even when the kind accepts multiple registrations', () => {
    // arrange
    const kind = createFeatureKind('search');
    const features = [
      createFeature('work-search', kind, [], { multi: true }),
      createFeature('work-search', kind, [], { multi: true }),
    ];

    // act
    const validate = () => validateFeatures(features);

    // assert
    expect(validate).toThrow("duplicate id 'work-search' within kind 'search'");
  });

  it('allows the same identifier in distinct contribution kinds', () => {
    // arrange
    const features = [
      createFeature('work', createFeatureKind('search'), []),
      createFeature('work', createFeatureKind('navigation'), []),
    ];

    // act
    const validate = () => validateFeatures(features);

    // assert
    expect(validate).not.toThrow();
  });

  it('rejects an incompatible composition with the capability-owned rule diagnostic', () => {
    // arrange
    const kind = createFeatureKind('ranking');
    const features = [createFeature('custom', kind, [])];
    const rule = {
      id: 'supported-ranking',
      message: 'Register the supported ranking strategy.',
      isViolated: (contributions: ReadonlyArray<(typeof features)[number]>) =>
        contributions.some((feature) => feature.id === 'custom'),
    };

    // act
    const validate = () => validateFeatures(features, [rule]);

    // assert
    expect(validate).toThrow(
      'Feature incompatibility [supported-ranking]: Register the supported ranking strategy.',
    );
  });

  it('accepts a composition that satisfies its capability-owned rule', () => {
    // arrange
    const kind = createFeatureKind('ranking');
    const features = [createFeature('supported', kind, [])];
    const rule = {
      id: 'supported-ranking',
      message: 'Register the supported ranking strategy.',
      isViolated: (contributions: ReadonlyArray<(typeof features)[number]>) =>
        contributions.some((feature) => feature.id === 'custom'),
    };

    // act
    const validate = () => validateFeatures(features, [rule]);

    // assert
    expect(validate).not.toThrow();
  });
});
