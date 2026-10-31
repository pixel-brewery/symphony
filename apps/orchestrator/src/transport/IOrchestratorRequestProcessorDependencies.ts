// #region Imports
import { type RequestMethod } from '@symphony/ipc-contracts-composition';
import { type StructuredLogger } from '@symphony/logging';
import { type OrchestratorRequestRegistry } from './OrchestratorRequestRegistry';
// #endregion

/**
 * Consumes only transport routing, logging, preflight and posting capabilities.
 *
 * @public
 */
export interface IOrchestratorRequestProcessorDependencies {
  readonly registry: Pick<OrchestratorRequestRegistry, 'execute'>;
  readonly logger: Pick<StructuredLogger, 'info' | 'error'>;
  readonly beforeDispatch: (method: RequestMethod) => void;
  readonly postMessage: (message: unknown) => void;
}
