// #region Imports

import {
  BlockquoteProcessor,
  ButtonProcessor,
  CalloutProcessor,
  CardProcessor,
  CodeBlockProcessor,
  DetailsProcessor,
  SplitProcessor,
  StepsProcessor,
  TabProcessor,
  type IBlockquoteToken,
  type IButtonToken,
  type ICalloutToken,
  type ICardToken,
  type ICodeBlockToken,
  type IDetailsToken,
  type ISplitsToken,
  type IStepsToken,
  type ITabsToken,
} from '@pixel-brewery/markdowner-core';
import type { RendererThis, TokenizerAndRendererExtension, Tokens } from 'marked';
import { escapeMarkdownAttribute } from './escapeMarkdownAttribute';
import { escapeMarkdownText } from './escapeMarkdownText';

// #endregion

/**
 * The authored Markdown dialect that `@pixel-brewery/markdowner-core` adds on top of
 * GitHub-flavored Markdown, rendered with the same Mosaik compositions FLAMOX365 uses:
 * `::: splits`, `::: callout`, `> [!TYPE]`, fenced code, `::: tabs`, `::: steps`,
 * `::: details`, `::: button` and `::: card`.
 *
 * @param parseMarkdown - Renders a nested Markdown source with the same configured pipeline.
 */
export function createMarkdownExtensions(
  parseMarkdown: (source: string) => string,
): TokenizerAndRendererExtension[] {
  return [
    {
      ...new SplitProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const splits = token as ISplitsToken;
        return `<mosaik-stack orientation="horizontal" gap="small">${splits.splits
          .map(
            (split) =>
              `<mosaik-box fit="both" inset="all" highlighted="true" cornered="true"><h6>${this.parser.parseInline(
                split.title,
              )}</h6>${this.parser.parse(split.tokens ?? [])}</mosaik-box>`,
          )
          .join('')}</mosaik-stack>`;
      },
    },
    {
      ...new CalloutProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const callout = token as ICalloutToken;
        return `<mosaik-banner appearance="soft" variant="${callout.variant}" header="${escapeMarkdownText(
          callout.title ?? '',
        )}"><div slot="subHeader">${this.parser.parse(callout.tokens ?? [])}</div></mosaik-banner>`;
      },
    },
    {
      ...new BlockquoteProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const blockquote = token as IBlockquoteToken;
        const variant = blockquote.variant ?? 'neutral';
        const header =
          variant === 'neutral'
            ? ''
            : ` header="${variant.charAt(0).toUpperCase()}${variant.slice(1)}"`;
        const content = blockquote.content ?? blockquote.text ?? '';
        // The processor hands back the quote body as Markdown source with the `[!TYPE]` marker
        // removed, so it is rendered through the same pipeline instead of Mosaik's own formatter.
        return `<mosaik-message class="message" appearance="soft" variant="${variant}"${header}><div slot="content">${parseMarkdown(
          content,
        )}</div></mosaik-message>`;
      },
    },
    {
      ...new CodeBlockProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const code = token as ICodeBlockToken;
        const language = code.meta?.lang ?? code.lang ?? '';
        if (language === 'mermaid') {
          return `<div class="code diagram mermaid">${escapeMarkdownAttribute(code.text)}</div>`;
        }
        // FLAMOX365 emits `mosaik-code-editor` here; no Mosaik release defines that element, so
        // the fence would render empty. `mosaik-code` is the Mosaik element that actually shows
        // the code, and the block styling lives in the component stylesheet.
        const fileName = code.meta?.fileName;
        return `<mosaik-code class="code" data-language="${escapeMarkdownAttribute(
          language,
        )}"${fileName ? ` data-file-name="${escapeMarkdownAttribute(fileName)}"` : ''} text="${escapeMarkdownAttribute(
          code.text,
        )}"></mosaik-code>`;
      },
    },
    {
      ...new TabProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const tabs = token as ITabsToken;
        return `<mosaik-tab appearance="soft">${tabs.tabs
          .map(
            (tab) =>
              `<mosaik-tab-item label="${escapeMarkdownText(tab.title)}" variant="${
                tab.variant ?? 'primary'
              }" id="${escapeMarkdownAttribute(tab.id)}">${this.parser.parse(
                tab.tokens ?? [],
              )}</mosaik-tab-item>`,
          )
          .join('')}</mosaik-tab>`;
      },
    },
    {
      ...new StepsProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const steps = token as IStepsToken;
        return `<mosaik-stepper orientation="vertical">${steps.steps
          .map(
            (step) =>
              `<mosaik-stepper-item header="${escapeMarkdownText(
                step.title,
              )}" state="completed" id="${escapeMarkdownAttribute(step.id)}">${this.parser.parse(
                step.tokens ?? [],
              )}</mosaik-stepper-item>`,
          )
          .join('')}</mosaik-stepper>`;
      },
    },
    {
      ...new DetailsProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const details = token as IDetailsToken;
        return `<mosaik-expander header="${escapeMarkdownText(
          details.title,
        )}" appearance="soft">${this.parser.parse(details.tokens ?? [])}</mosaik-expander>`;
      },
    },
    {
      ...new ButtonProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const button = token as IButtonToken;
        return `<mosaik-button label="${escapeMarkdownText(
          button.label,
        )}" href="${escapeMarkdownAttribute(button.href)}" target="_blank" rel="noopener noreferrer" variant="${
          button.variant
        }" appearance="${button.appearance}"></mosaik-button>`;
      },
    },
    {
      ...new CardProcessor().extension,
      renderer(this: RendererThis, token: Tokens.Generic): string {
        const card = token as ICardToken;
        const subHeader = card.subHeader
          ? `<small>${escapeMarkdownAttribute(card.subHeader)}</small>`
          : '';
        return `<mosaik-box fit="auto" inset="all" highlighted="true" cornered="true"><h6>${escapeMarkdownAttribute(
          card.header,
        )}</h6>${subHeader}${this.parser.parse(card.tokens ?? [])}</mosaik-box>`;
      },
    },
  ];
}
