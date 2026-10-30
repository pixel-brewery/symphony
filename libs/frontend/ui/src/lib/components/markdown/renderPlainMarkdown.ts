// #region Imports

import { Marked, Renderer, type Tokens } from 'marked';
import { escapeMarkdownAttribute } from './escapeMarkdownAttribute';
import { TextOnlyHtmlTokenizer } from './TextOnlyHtmlTokenizer';

// #endregion

/** Emits links as external, and drops anything that is not http(s). */
class ExternalLinkRenderer extends Renderer {
  // #region Methods

  /**
   * Returns the link.
   *
   * @param token - Token.
   * @public
   */
  public override link(token: Tokens.Link): string {
    const text = this.parser.parseInline(token.tokens ?? []);
    let href: string;
    try {
      const url = new URL(token.href.replaceAll('&amp;', '&'));
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return text;
      href = url.toString();
    } catch {
      return text;
    }
    const title = token.title ? ` title="${escapeMarkdownAttribute(token.title)}"` : '';
    return `<a href="${escapeMarkdownAttribute(href)}" target="_blank" rel="noopener noreferrer"${title}>${text}</a>`;
  }

  // #endregion
}

const tokenizer = new TextOnlyHtmlTokenizer();
const renderer = new ExternalLinkRenderer();
// Renderer and tokenizer travel as parse options: `Marked.use` copies renderer members with
// `for...in`, which never sees the non-enumerable methods of a class instance.
const parser = new Marked();

/**
 * Renders untrusted GitHub-flavored Markdown to plain HTML. A dense preview - the board card's
 * progress line - wants a few clipped lines of text, not the Mosaik controls, tables and expanders
 * the default renderer builds, and Angular's own sanitizer stays active on this path.
 */
export function renderPlainMarkdown(text: string, breaks = false): string {
  return parser.parse(text, { async: false, breaks, gfm: true, renderer, tokenizer });
}
