// #region Imports
import { type StorageGovernor } from './StorageGovernor';
// #endregion

/**
 * Consumes admission without requiring callers to interpret the storage report.
 *
 * @public
 */
export interface IStorageWriteAdmission {
  /**
   * Refuses a write that the existing governor cannot admit.
   *
   * @public
   */
  readonly assertWritable: (...options: Parameters<StorageGovernor['assertWritable']>) => void;
}
