// #region Imports

import type { Renderer } from 'marked';

// #endregion

/** The subset of `marked`'s renderer that Symphony overrides with Mosaik markup. */
export type MarkdownRenderer = Partial<Omit<Renderer, 'options' | 'constructor'>>;
