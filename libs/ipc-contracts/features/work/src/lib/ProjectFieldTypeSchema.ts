// #region Imports

import { z } from 'zod';

// #endregion

export const projectFieldTypeSchema = z.enum([
  'text',
  'number',
  'date',
  'single-select',
  'multi-select',
  'iteration',
]);
