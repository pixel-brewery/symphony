// #region Imports

import type { Renderer, Tokens } from 'marked';
import { escapeMarkdownAttribute } from './escapeMarkdownAttribute';
import { escapeMarkdownText } from './escapeMarkdownText';
import type { IMarkdownRendererOptions } from './IMarkdownRendererOptions';
import type { MarkdownRenderer } from './MarkdownRenderer';

// #endregion

const DEFAULT_OPTIONS: IMarkdownRendererOptions = {
  wrapText: true,
  variant: 'primary',
  appearance: 'default',
};

/**
 * Wraps already rendered inline markup for a Mosaik element's named slot. Mosaik puts a plain
 * `text` value on screen through `unsafeHTML`; slotting the markup instead keeps untrusted
 * content on the escaped path this renderer controls.
 */
function slot(name: string, content: string): string {
  return `<span slot="${name}">${content}</span>`;
}

/**
 * Renders an image token, honouring the `=WxH` size suffix the reference renderer supports.
 */
function renderImage(token: Tokens.Image): string {
  const dimensions = /\s*=\s*(?:(\d*)x(\d*)|x(\d+)|(\d+)x)\s*$/u.exec(token.href);
  const width = dimensions?.[1] ?? dimensions?.[4] ?? '';
  const height = dimensions?.[2] ?? dimensions?.[3] ?? '';
  const source = cleanUrl(token.href.replace(/\s*=\s*(?:\d*x\d*|x\d+|\d+x)\s*$/u, ''));
  if (source === null) return escapeMarkdownAttribute(token.text);
  const legend = token.title ?? token.text;
  return `<mosaik-image class="image" src="${escapeMarkdownAttribute(source)}"${
    width ? ` width="${width}px"` : ''
  }${height ? ` height="${height}px"` : ''}${
    legend ? ` legend="${escapeMarkdownText(legend)}" legend-position="bottom"` : ''
  }${token.text ? ` alt="${escapeMarkdownAttribute(token.text)}"` : ''}></mosaik-image>`;
}

/**
 * Keeps navigable targets to http(s). Everything else — `javascript:`, malformed hrefs, relative
 * paths that mean nothing in a packaged renderer — stays inert instead of becoming a link.
 */
function cleanUrl(href: string): string | null {
  try {
    const url = new URL(href.replaceAll('&amp;', '&'));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Creates the `marked` renderer that emits Mosaik elements instead of bare HTML, mirroring
 * FLAMOX365's `createMarkedRenderer` element for element. Inline content is resolved by `marked`
 * and slotted into those elements rather than handed back to Mosaik's own Markdown formatter,
 * because Symphony renders tracker and agent output that nobody in this repository authored.
 */
export function createMarkedRenderer(
  options?: Partial<IMarkdownRendererOptions>,
): MarkdownRenderer {
  const resolved: IMarkdownRendererOptions = { ...DEFAULT_OPTIONS, ...options };

  /**
   * Renders one list item. A task list carries its own `checkbox` token, which reaches the
   * checkbox renderer below.
   */
  function renderListItem(this: Renderer, item: Tokens.ListItem): string {
    return `<mosaik-listing-item class="list-item">${this.parser.parse(
      item.tokens,
    )}</mosaik-listing-item>`;
  }

  return {
    heading(this: Renderer, token: Tokens.Heading): string {
      // Embedded content must not out-shout the surface hosting it, so the reference renderer
      // starts its scale at headline 4 and never goes larger.
      const depth = Math.max(token.depth, 4);
      return `<mosaik-text class="heading heading-${depth} h${depth}" style="font: var(--mosaik-typography-headline${depth}); letter-spacing: var(--mosaik-typography-headline${depth}-letter-spacing);" wrap="${resolved.wrapText}">${slot(
        'text',
        this.parser.parseInline(token.tokens),
      )}</mosaik-text>`;
    },

    hr(): string {
      return '<div class="divider" role="separator"><span></span><span></span><span></span></div>';
    },

    table(this: Renderer, token: Tokens.Table): string {
      const header = token.header
        .map(
          (cell) =>
            `<mosaik-table-header-cell text-overflow="wrap">${this.parser.parseInline(
              cell.tokens,
            )}</mosaik-table-header-cell>`,
        )
        .join('');
      const body = token.rows
        .map(
          (row) =>
            `<mosaik-table-body-row class="table-row">${row
              .map(
                (cell) =>
                  `<mosaik-table-body-cell class="table-cell" align="${cell.align ?? 'left'}" text-overflow="wrap">${this.parser.parseInline(
                    cell.tokens,
                  )}</mosaik-table-body-cell>`,
              )
              .join('')}</mosaik-table-body-row>`,
        )
        .join('');
      return `<mosaik-table class="table"><mosaik-table-header><mosaik-table-header-row>${header}</mosaik-table-header-row></mosaik-table-header><mosaik-table-body>${body}</mosaik-table-body></mosaik-table>`;
    },

    link(this: Renderer, token: Tokens.Link): string {
      const label = this.parser.parseInline(token.tokens ?? []);
      const href = cleanUrl(token.href);
      if (href === null) return label;
      const title = token.title ? ` title="${escapeMarkdownAttribute(token.title)}"` : '';
      // `target`/`rel` route the click into Electron's guarded system-browser handoff instead of
      // navigating the renderer window away from the application.
      return `<mosaik-anchor class="link" href="${escapeMarkdownAttribute(href)}" target="_blank" rel="noopener noreferrer" variant="${resolved.variant}" appearance="${resolved.appearance}"${title}>${slot(
        'label',
        label,
      )}</mosaik-anchor>`;
    },

    code(token: Tokens.Code): string {
      const language = token.lang?.toLowerCase().split(/\s+/u)[0] ?? '';
      return `<mosaik-code class="code" data-language="${escapeMarkdownAttribute(language)}" text="${escapeMarkdownAttribute(token.text)}"></mosaik-code>`;
    },

    blockquote(this: Renderer, token: Tokens.Blockquote): string {
      return `<div class="blockquote">${this.parser.parse(token.tokens)}</div>`;
    },

    paragraph(this: Renderer, token: Tokens.Paragraph): string {
      const image = token.tokens.find((child) => child.type === 'image');
      if (image) return renderImage(image as Tokens.Image);
      return `<mosaik-text class="paragraph" wrap="${resolved.wrapText}">${slot(
        'text',
        this.parser.parseInline(token.tokens),
      )}</mosaik-text>`;
    },

    br(): string {
      return '<br class="br">';
    },

    image(token: Tokens.Image): string {
      return renderImage(token);
    },

    codespan(token: Tokens.Codespan): string {
      return `<mosaik-code class="codespan" text="${escapeMarkdownAttribute(token.text)}"></mosaik-code>`;
    },

    del(this: Renderer, token: Tokens.Del): string {
      return `<del>${this.parser.parseInline(token.tokens)}</del>`;
    },

    strong(this: Renderer, token: Tokens.Strong): string {
      return `<mosaik-text class="strong" wrap="${resolved.wrapText}">${slot(
        'text',
        this.parser.parseInline(token.tokens),
      )}</mosaik-text>`;
    },

    em(this: Renderer, token: Tokens.Em): string {
      return `<mosaik-text class="emphasis" wrap="${resolved.wrapText}">${slot(
        'text',
        this.parser.parseInline(token.tokens),
      )}</mosaik-text>`;
    },

    checkbox(token: Tokens.Checkbox): string {
      return `<mosaik-checkbox class="checkbox" is-checked="${token.checked}" appearance="soft" variant="${resolved.variant}" style="display: inline-block;"></mosaik-checkbox>`;
    },

    list(this: Renderer, token: Tokens.List): string {
      const type = token.ordered ? 'ordered' : 'unordered';
      const appearance = token.ordered ? 'soft' : 'plain';
      const start = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
      const body = token.items.map((item) => renderListItem.call(this, item)).join('');
      return `<mosaik-listing class="list" type="${type}"${start} variant="${resolved.variant}" appearance="${appearance}">${body}</mosaik-listing>`;
    },

    listitem(this: Renderer, item: Tokens.ListItem): string {
      return renderListItem.call(this, item);
    },
  };
}
