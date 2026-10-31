// #region Imports
import { type SynapseAiService } from '@symphony/providers-synapse';
// #endregion
/**
 * Disposes the shared native host before completing the existing process shutdown.
 *
 * @public
 */
export function createNativeAiShutdown(synapseAi: Pick<SynapseAiService, 'dispose'>): () => void {
  return (): void => {
    void synapseAi.dispose().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  };
}
