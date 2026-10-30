// #region Imports

import { BlockquoteProcessor, CodeBlockProcessor } from '@pixel-brewery/markdowner-core';
import { Marked, type Token } from 'marked';
import { createMarkdownExtensions } from './createMarkdownExtensions';
import { createMarkedRenderer } from './createMarkedRenderer';
import { TextOnlyHtmlTokenizer } from './TextOnlyHtmlTokenizer';

// #endregion

const tokenizer = new TextOnlyHtmlTokenizer();
const blockquoteProcessor = new BlockquoteProcessor();
const codeBlockProcessor = new CodeBlockProcessor();

// One configured instance, built once. Registering the extensions on the shared `marked` export
// would stack another copy of every extension each time a component is constructed.
const renderer = new Marked({
  renderer: createMarkedRenderer(),
  extensions: createMarkdownExtensions((source: string) => renderMarkdown(source)),
  walkTokens: (token: Token): void => {
    blockquoteProcessor.walkTokens(token);
    codeBlockProcessor.walkTokens(token);
  },
});

/**
 * Renders untrusted GitHub-flavored Markdown into the Mosaik markup FLAMOX365 uses, without raw
 * HTML pass-through.
 */
export function renderMarkdown(text: string, breaks = false): string {
  return renderer.parse(text, { async: false, breaks, gfm: true, tokenizer });
}
