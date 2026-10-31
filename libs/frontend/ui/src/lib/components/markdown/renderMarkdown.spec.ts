// #region Imports

import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './renderMarkdown';

// #endregion

describe('renderMarkdown', () => {
  it('renders headings as Mosaik text on the reference headline scale', () => {
    // act
    const actual = renderMarkdown('## Recovery scope');

    // assert
    expect(actual).toContain('<mosaik-text class="heading heading-4 h4"');
    expect(actual).toContain('font: var(--mosaik-typography-headline4)');
    expect(actual).toContain('<span slot="text">Recovery scope</span>');
  });

  it('renders a paragraph as Mosaik text with Mosaik inline elements', () => {
    // act
    const actual = renderMarkdown('Only **managed workspaces** are in scope.');

    // assert
    expect(actual).toContain('<mosaik-text class="paragraph" wrap="true">');
    expect(actual).toContain('<mosaik-text class="strong" wrap="true">');
    expect(actual).toContain('<span slot="text">managed workspaces</span>');
  });

  it('renders lists as a Mosaik listing', () => {
    // act
    const actual = renderMarkdown('* Detect actionable drift\n* Surface safe recovery guidance');

    // assert
    expect(actual).toContain('<mosaik-listing class="list" type="unordered"');
    expect(actual).toContain(
      '<mosaik-listing-item class="list-item">Detect actionable drift</mosaik-listing-item>',
    );
  });

  it('renders a task list with one Mosaik checkbox per item', () => {
    // act
    const actual = renderMarkdown('- [x] done\n- [ ] open');

    // assert
    expect(actual.match(/<mosaik-checkbox/gu)).toHaveLength(2);
    expect(actual).toContain('is-checked="true"');
    expect(actual).toContain('is-checked="false"');
    expect(actual).not.toContain('[x]');
  });

  it('keeps quotes inside fenced code blocks readable', () => {
    // act
    const actual = renderMarkdown('```json\n{ "feasible": true }\n```');

    // assert
    expect(actual).toBe(
      '<mosaik-code class="code" data-language="json" text="{ &quot;feasible&quot;: true }"></mosaik-code>',
    );
  });

  it('keeps ampersands and angle brackets inside code blocks readable', () => {
    // act
    const actual = renderMarkdown('```\na & b <c>\n```');

    // assert
    expect(actual).toContain('a &amp; b &lt;c&gt;');
    expect(actual).not.toContain('&amp;amp;');
  });

  it('keeps inline code readable in a Mosaik code element', () => {
    // act
    const actual = renderMarkdown('use `--flag="a & b"`');

    // assert
    expect(actual).toContain(
      '<mosaik-code class="codespan" text="--flag=&quot;a &amp; b&quot;"></mosaik-code>',
    );
  });

  it('renders tables as a Mosaik table', () => {
    // act
    const actual = renderMarkdown('| a | b |\n| --- | --- |\n| 1 | 2 |');

    // assert
    expect(actual).toContain('<mosaik-table class="table">');
    expect(actual).toContain('<mosaik-table-header-cell text-overflow="wrap">a');
    expect(actual).toContain('<mosaik-table-body-cell class="table-cell" align="left"');
  });

  it('escapes embedded block-level HTML instead of rendering it', () => {
    // act
    const actual = renderMarkdown('<div onclick="x">hi</div>');

    // assert
    expect(actual).toBe(
      '<mosaik-text class="paragraph" wrap="true"><span slot="text">&lt;div onclick=&quot;x&quot;&gt;hi&lt;/div&gt;</span></mosaik-text>',
    );
  });

  it('escapes embedded inline HTML instead of rendering it', () => {
    // act
    const actual = renderMarkdown('a <img src=x onerror=alert(1)> b');

    // assert
    expect(actual).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(actual).not.toContain('<img');
  });

  it('escapes HTML used as link text', () => {
    // act
    const actual = renderMarkdown('[<b>x</b>](https://example.com)');

    // assert
    expect(actual).toContain('<span slot="label">&lt;b&gt;x&lt;/b&gt;</span>');
  });

  it('opens http(s) links externally through a Mosaik anchor', () => {
    // act
    const actual = renderMarkdown('[docs](https://example.com/a?b=1&c=2)');

    // assert
    expect(actual).toContain(
      '<mosaik-anchor class="link" href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer"',
    );
    expect(actual).toContain('<span slot="label">docs</span>');
  });

  it('drops the anchor for links that are not http(s)', () => {
    // act
    const actual = renderMarkdown('[bad](javascript:alert(1))');

    // assert
    expect(actual).toBe(
      '<mosaik-text class="paragraph" wrap="true"><span slot="text">bad</span></mosaik-text>',
    );
  });

  it('renders a GitHub alert as a Mosaik message with its variant', () => {
    // act
    const actual = renderMarkdown('> [!WARNING]\n> careful with `--force`');

    // assert
    expect(actual).toContain('<mosaik-message class="message" appearance="soft" variant="warning"');
    expect(actual).toContain('header="Warning"');
    expect(actual).toContain('<mosaik-code class="codespan" text="--force"></mosaik-code>');
  });

  it('renders the authored callout block as a Mosaik banner', () => {
    // act
    const actual = renderMarkdown('::: warning Be cautious!\nThis is a warning box.\n:::');

    // assert
    expect(actual).toContain(
      '<mosaik-banner appearance="soft" variant="warning" header="Be cautious!">',
    );
    expect(actual).toContain('<div slot="subHeader">');
  });

  it('renders the authored details block as a Mosaik expander', () => {
    // act
    const actual = renderMarkdown('::: details More\ninner\n::: end-details');

    // assert
    expect(actual).toContain('<mosaik-expander header="More" appearance="soft">');
  });

  it('renders the authored button block as an externally opening Mosaik button', () => {
    // act
    const actual = renderMarkdown(
      '::: button Get Started | https://example.com | primary | soft\n:::',
    );

    // assert
    expect(actual).toContain('<mosaik-button label="Get Started" href="https://example.com"');
    expect(actual).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it('turns single newlines into line breaks when requested', () => {
    // act
    const actual = renderMarkdown('a\nb', true);

    // assert
    expect(actual).toContain('a<br class="br">b');
    expect(renderMarkdown('a\nb')).not.toContain('<br');
  });
});
