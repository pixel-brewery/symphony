// #region Imports

import type { OrbitCelestialBody } from '@symphony/domain-delivery';
import { z } from 'zod';

// #endregion

/** Supported Solar System bodies. Texture paths and URLs are never configuration inputs. @public */
export const orbitCelestialBodySchema = z.enum([
  'sun',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]) satisfies z.ZodType<OrbitCelestialBody>;
