// #region Imports

import '@angular/compiler';

// #endregion

class TestClipboardEvent extends Event {
  // #region Fields

  /**
   * Clipboard data supplied by the test event.
   *
   * @public
   * @readonly
   */
  public readonly clipboardData: DataTransfer | null;

  // #endregion

  // #region Ctor

  /**
   * Creates a clipboard event for environments without the browser constructor.
   *
   * @public
   */
  public constructor(type: string, eventInitDict?: ClipboardEventInit) {
    super(type, eventInitDict);
    this.clipboardData = eventInitDict?.clipboardData ?? null;
  }

  // #endregion
}

/**
 * Initializes Angular compilation and the browser event missing from the DOM test runtime.
 *
 * @public
 */
export function initializeBrowserTestEnvironment(): void {
  if (typeof globalThis.ClipboardEvent === 'undefined') {
    globalThis.ClipboardEvent = TestClipboardEvent;
  }
}
