/**
 * Document-owned browser APIs supplied to the product adapter.
 *
 * @public
 */
export interface IMobileBrowserWindow extends Window {
  /**
   * Browser WebSocket constructor bound to this document environment.
   *
   * @public
   */
  readonly WebSocket: typeof WebSocket;
}
