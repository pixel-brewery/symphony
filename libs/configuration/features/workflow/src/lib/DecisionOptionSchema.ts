// #region Imports

import { z } from 'zod';
import {
  closureReasonCodes,
  humanDecisionEffects,
  workflowArtifactKinds,
} from '@symphony/domain-workflow';
import { identifierSchema } from '@symphony/configuration-core';
import { labelSchema } from './LabelSchema';
import { stageIdSchema } from './StageIdSchema';

// #endregion

export const decisionOptionSchema = z
  .object({
    id: identifierSchema.max(64),
    label: labelSchema,
    description: z.string().trim().max(300).optional(),
    effect: z.enum(humanDecisionEffects),
    targetStageId: stageIdSchema.optional(),
    closureReason: z.enum(closureReasonCodes).optional(),
    invalidates: z.array(z.enum(workflowArtifactKinds)).readonly().optional(),
  })
  .strict()
  .refine(
    (option) =>
      (option.effect !== 'advance' && option.effect !== 'route') ||
      option.targetStageId !== undefined,
    { message: 'Choose the stage this decision moves the work item to.', path: ['targetStageId'] },
  );
