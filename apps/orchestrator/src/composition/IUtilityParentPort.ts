/**
 * Describes the existing Electron Utility Process message channel.
 *
 * @public
 */
export interface IUtilityParentPort {
  on(event: 'message', listener: (event: { data: unknown }) => void): void;
  postMessage(message: unknown): void;
}
