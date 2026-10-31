/**
 * Capabilities implemented by the complete desktop runtime rather than merely exposed by Chromium.
 *
 * @public
 */
export interface IDesktopCapabilities {
  /** Whether the desktop runtime provides a working speech-recognition service. */
  readonly speechRecognition: boolean;
}
