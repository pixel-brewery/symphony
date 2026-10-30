// #region Imports
import { type z } from 'zod';
import { contractViolationMessage } from '@symphony/ipc-contracts-core';
import { type RequestMethod } from '@symphony/ipc-contracts-composition';
import { type IExecutableRequestHandler } from './IExecutableRequestHandler';
// #endregion

/**
 * Binds canonical schemas to a typed command before erasing its executable boundary.
 *
 * @public
 */
export function createOrchestratorRequestHandler<TPayload, TResult>(
  method: RequestMethod,
  requestSchema: z.ZodType<TPayload>,
  responseSchema: z.ZodType,
  handler: (payload: TPayload) => TResult | Promise<TResult>,
): IExecutableRequestHandler {
  return Object.freeze({
    method,
    requestSchema,
    responseSchema,
    async execute(payload: unknown, beforeDispatch: () => void): Promise<unknown> {
      const parsedPayload = requestSchema.safeParse(payload);
      if (!parsedPayload.success) {
        throw new Error(
          contractViolationMessage(parsedPayload.error.issues, `The "${method}" request`),
        );
      }
      beforeDispatch();
      const data = await handler(parsedPayload.data);
      const parsedResponse = responseSchema.safeParse(data);
      if (!parsedResponse.success) {
        throw new Error(
          contractViolationMessage(parsedResponse.error.issues, `The answer to "${method}"`),
        );
      }
      // Validation proves the answer; preserving the original value retains existing serialization.
      return data;
    },
  });
}
