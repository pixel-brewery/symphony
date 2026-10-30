// #region Imports

import { Tokenizer } from 'marked';

// #endregion

/**
 * Drops raw HTML tokens so embedded markup falls back to plain text. Symphony renders tracker
 * bodies, comments and agent output that nobody in this repository authored, and the Mosaik
 * elements the default renderer emits put their `text` on screen through `unsafeHTML`. Refusing
 * the tokens is what keeps that path inert; escaping the Markdown source instead would corrupt
 * code fences, where the escapes are literal content.
 */
export class TextOnlyHtmlTokenizer extends Tokenizer {
  // #region Methods

  /**
   * Returns the html.
   *
   * @public
   */
  public override html(): undefined {
    return undefined;
  }

  /**
   * Returns the tag.
   *
   * @public
   */
  public override tag(): undefined {
    return undefined;
  }

  // #endregion
}
