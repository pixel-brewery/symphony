// #region Imports
import { type RequestMethod } from '@symphony/ipc-contracts-composition';
// #endregion

/**
 * Keeps a method's typed validation and invocation together after registration.
 *
 * @public
 */
export interface IExecutableRequestHandler {
  readonly method: RequestMethod;
  readonly requestSchema: unknown;
  readonly responseSchema: unknown;
  readonly execute: (payload: unknown, beforeDispatch: () => void) => Promise<unknown>;
}
