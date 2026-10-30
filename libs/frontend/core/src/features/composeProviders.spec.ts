// #region Imports

import { InjectionToken, Injector } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { composeProviders } from './composeProviders';
import { createFeature } from './createFeature';
import { createFeatureKind } from './createFeatureKind';
import type { IFeature } from './IFeature';

// #endregion

describe('composeProviders', () => {
  it('resolves multi providers in base and deliberate feature registration order', () => {
    // arrange
    const contributions = new InjectionToken<readonly string[]>('contributions');
    const kind = createFeatureKind('search');
    const base = [{ provide: contributions, useValue: 'base', multi: true }];
    const features = [
      createFeature('work', kind, [{ provide: contributions, useValue: 'work', multi: true }], {
        multi: true,
      }),
      createFeature('ci', kind, [{ provide: contributions, useValue: 'ci', multi: true }], {
        multi: true,
      }),
    ];

    // act
    const injector = Injector.create({ providers: composeProviders(base, features) });
    const actual = injector.get(contributions);

    // assert
    expect(actual).toEqual(['base', 'work', 'ci']);
    injector.destroy();
  });

  it('lets a validated feature replace its capability default through Angular provider order', () => {
    // arrange
    const strategy = new InjectionToken<string>('strategy');
    const base = [{ provide: strategy, useValue: 'default' }];
    const feature = createFeature('custom', createFeatureKind('ranking'), [
      { provide: strategy, useValue: 'custom' },
    ]);

    // act
    const injector = Injector.create({ providers: composeProviders(base, [feature]) });
    const actual = injector.get(strategy);

    // assert
    expect(actual).toBe('custom');
    injector.destroy();
  });

  it('rejects conflicting registrations before materializing any contributed providers', () => {
    // arrange
    const kind = createFeatureKind('search');
    const firstProvide = vi.fn<IFeature<'search'>['provide']>(() => []);
    const secondProvide = vi.fn<IFeature<'search'>['provide']>(() => []);
    const features: readonly IFeature<'search'>[] = [
      { id: 'work', kind, options: { multi: true }, provide: firstProvide },
      { id: 'work', kind, options: { multi: true }, provide: secondProvide },
    ];

    // act
    const compose = () => composeProviders([], features);

    // assert
    expect(compose).toThrow("duplicate id 'work' within kind 'search'");
    expect(firstProvide).not.toHaveBeenCalled();
    expect(secondProvide).not.toHaveBeenCalled();
  });

  it('rejects a capability incompatibility before materializing contributed providers', () => {
    // arrange
    const kind = createFeatureKind('ranking');
    const provide = vi.fn<IFeature<'ranking'>['provide']>(() => []);
    const features: readonly IFeature<'ranking'>[] = [{ id: 'custom', kind, options: {}, provide }];
    const rule = {
      id: 'supported-ranking',
      message: 'Custom ranking is unavailable.',
      isViolated: () => true,
    };

    // act
    const compose = () => composeProviders([], features, [rule]);

    // assert
    expect(compose).toThrow('Feature incompatibility [supported-ranking]');
    expect(provide).not.toHaveBeenCalled();
  });
});
