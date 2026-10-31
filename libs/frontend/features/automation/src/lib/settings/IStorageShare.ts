/**
 * One part of a storage picture: a workspace with its limit, or a category of runner data.
 *
 * @public
 */
export interface IStorageShare {
  /**
   * Name of the part.
   *
   * @public
   * @readonly
   */
  readonly label: string;
  /**
   * Measured physical allocation, `undefined` until a measurement completed.
   *
   * @public
   * @readonly
   */
  readonly allocatedBytes: number | undefined;
  /**
   * Hard limit of the part, when it has one of its own.
   *
   * @public
   * @readonly
   */
  readonly limitGiB?: number;
}
