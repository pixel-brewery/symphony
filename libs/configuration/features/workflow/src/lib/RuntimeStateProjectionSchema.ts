// #region Imports

import { z } from 'zod';
import { workflowRuntimeStates } from '@symphony/domain-workflow';
import { identifierSchema } from '@symphony/configuration-core';

// #endregion

/**
 * Optional projection of the internal runtime state into a provider field, so the technical
 * state is visible on the board. Symphony always keeps the authoritative state locally; a
 * provider field is written, never read back as truth.
 */
export const runtimeStateProjectionSchema = z
  .object({
    fieldId: identifierSchema,
    valueMappings: z
      .array(
        z
          .object({
            runtimeState: z.enum(workflowRuntimeStates),
            value: identifierSchema.max(64),
          })
          .strict(),
      )
      .max(workflowRuntimeStates.length)
      .default([]),
  })
  .strict();
