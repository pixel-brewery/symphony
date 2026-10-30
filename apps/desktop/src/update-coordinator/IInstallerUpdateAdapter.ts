/**
 * Reads installer-only update availability without exposing its URL to the renderer.
 *
 * @public
 */
export interface IInstallerUpdateAdapter {
  /**
   * Checks one trusted platform channel.
   *
   * @param feed - Channel URL and expected runtime target.
   * @public
   */
  check(feed: {
    readonly url: string;
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
  }): Promise<
    | {
        readonly version: string;
        readonly downloadUrl: string;
      }
    | undefined
  >;
}
