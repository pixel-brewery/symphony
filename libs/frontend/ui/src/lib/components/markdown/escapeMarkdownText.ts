// #region Imports

import { escapeMarkdownAttribute } from './escapeMarkdownAttribute';

// #endregion

/**
 * Escapes untrusted Markdown source for a Mosaik `text` attribute. Mosaik renders those values
 * through `unsafeHTML`, and the HTML parser already consumes one level of escaping while parsing
 * the attribute, so a single pass would hand live markup to the element. Escaping twice makes
 * embedded HTML arrive as the literal characters a reader is supposed to see.
 */
export function escapeMarkdownText(value: string): string {
  return escapeMarkdownAttribute(escapeMarkdownAttribute(value));
}
