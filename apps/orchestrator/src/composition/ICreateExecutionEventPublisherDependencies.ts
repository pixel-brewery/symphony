// #region Imports
import { type IUtilityParentPort } from './IUtilityParentPort';
import { type LocalMobileGateway } from '../mobile-gateway';
// #endregion

/**
 * Consumes only the capabilities required by events orchestration.
 *
 * @public
 */
export interface ICreateExecutionEventPublisherDependencies {
  readonly parentPort: IUtilityParentPort | undefined;
  readonly mobileGateway: Pick<LocalMobileGateway, 'broadcastSnapshotInvalidated'>;
}
