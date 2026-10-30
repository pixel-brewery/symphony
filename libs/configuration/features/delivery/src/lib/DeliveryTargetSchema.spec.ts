// #region Imports

import { describe, expect, it } from 'vitest';
import { deliveryTargetSchema } from './DeliveryTargetSchema';

// #endregion

describe('deliveryTargetSchema', () => {
  const target = {
    id: 'live',
    workspaceId: 'workspace',
    repositoryBindingId: 'project',
    displayName: 'Production',
    kind: 'environment',
    environment: 'production',
    production: true,
  };

  it('accepts existing destinations without changing their configuration', () => {
    // arrange
    const legacy = { ...target };
    // act
    const result = deliveryTargetSchema.parse(legacy);
    // assert
    expect(result).toEqual(legacy);
  });

  it.each(['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'])(
    'retains the selected %s appearance through the settings contract',
    (celestialBody) => {
      // arrange
      const input = { ...target, celestialBody };
      // act
      const result = deliveryTargetSchema.parse(input);
      // assert
      expect(result).toEqual(input);
    },
  );

  it.each(['pluto', 'https://example.com/planet.png', '../earth.jpg', '', null])(
    'rejects unsupported bodies and arbitrary texture references (%s)',
    (celestialBody) => {
      // arrange
      const input = { ...target, celestialBody };
      // act
      const result = deliveryTargetSchema.safeParse(input);
      // assert
      expect(result.success).toBe(false);
    },
  );
});
