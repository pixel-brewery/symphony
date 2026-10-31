// #region Imports
import { requestEnvelopeSchema } from '@symphony/ipc-contracts-composition';
import { type ResponseEnvelope } from '@symphony/ipc-contracts-core';
import { type IOrchestratorRequestProcessorDependencies } from './IOrchestratorRequestProcessorDependencies';
// #endregion

/**
 * Owns envelope correlation and failure projection for the Utility Process transport.
 *
 * @public
 */
export class OrchestratorRequestProcessor {
  // #region Fields
  private readonly _dependencies: IOrchestratorRequestProcessorDependencies;
  // #endregion
  // #region Ctor
  /**
   * Connects the sealed registry to the existing process message channel.
   *
   * @public
   */
  public constructor(dependencies: IOrchestratorRequestProcessorDependencies) {
    this._dependencies = dependencies;
  }
  // #endregion
  // #region Methods
  /**
   * Validates an envelope and posts the correlated existing response shape.
   *
   * @public
   */
  public async handleMessage(raw: unknown): Promise<void> {
    const envelope = requestEnvelopeSchema.safeParse(raw);
    if (!envelope.success) return;
    const { correlationId, method, payload } = envelope.data;
    this._dependencies.logger.info({ event: 'request.received', correlationId, method });
    let response: ResponseEnvelope;
    try {
      const data = await this._dependencies.registry.execute(method, payload, () =>
        this._dependencies.beforeDispatch(method),
      );
      response = { correlationId, ok: true, data };
    } catch (cause) {
      this._dependencies.logger.error({
        event: 'request.failed',
        correlationId,
        method,
        error: cause instanceof Error ? cause.message : 'Unknown orchestration failure',
      });
      response = {
        correlationId,
        ok: false,
        error: {
          code: 'ORCHESTRATION_REQUEST_FAILED',
          message: cause instanceof Error ? cause.message : 'Unknown orchestration failure',
        },
      };
    }
    this._dependencies.postMessage(response);
  }
  // #endregion
}
