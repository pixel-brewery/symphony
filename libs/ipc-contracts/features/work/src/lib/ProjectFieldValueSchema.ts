// #region Imports

import { z } from 'zod';

// #endregion

export const projectFieldValueSchema = z.discriminatedUnion('type', [
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('text'),
    value: z.string().max(10_000),
  }),
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('date'),
    value: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)]),
  }),
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('number'),
    value: z.number().finite().nullable(),
  }),
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('single-select'),
    value: z.string().min(1).max(500).nullable(),
  }),
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('iteration'),
    value: z.string().min(1).max(500).nullable(),
  }),
  z.object({
    fieldId: z.string().min(1).max(500),
    type: z.literal('multi-select'),
    value: z.array(z.string().min(1).max(500)).max(500).readonly(),
  }),
]);
