// #region Imports

import { describe, expect, it } from 'vitest';
import { renderPlainMarkdown } from './renderPlainMarkdown';

// #endregion

describe('renderPlainMarkdown', () => {
  it('keeps quotes inside fenced code blocks readable', () => {
    // act
    const actual = renderPlainMarkdown('```json\n{ "feasible": true }\n```');

    // assert
    expect(actual).toContain('<code class="language-json">{ &quot;feasible&quot;: true }');
    expect(actual).not.toContain('&amp;quot;');
  });

  it('keeps inline code readable', () => {
    // act
    const actual = renderPlainMarkdown('use `--flag="a & b"`');

    // assert
    expect(actual).toContain('<code>--flag=&quot;a &amp; b&quot;</code>');
  });

  it('renders block structure around a code fence', () => {
    // act
    const actual = renderPlainMarkdown(
      '* first\n* second\n\nDefinition of ready\n\n```json\n[]\n```',
    );

    // assert
    expect(actual).toContain('<li>first</li>');
    expect(actual).toContain('<p>Definition of ready</p>');
    expect(actual).toContain('<pre><code class="language-json">[]');
  });

  it('escapes embedded block-level HTML instead of rendering it', () => {
    // act
    const actual = renderPlainMarkdown('<div onclick="x">hi</div>');

    // assert
    expect(actual).toBe('<p>&lt;div onclick=&quot;x&quot;&gt;hi&lt;/div&gt;</p>\n');
  });

  it('opens http(s) links externally', () => {
    // act
    const actual = renderPlainMarkdown('[docs](https://example.com/a?b=1&c=2)');

    // assert
    expect(actual).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">docs</a></p>\n',
    );
  });

  it('drops the anchor for links that are not http(s)', () => {
    // act
    const actual = renderPlainMarkdown('[bad](javascript:alert(1))');

    // assert
    expect(actual).toBe('<p>bad</p>\n');
  });

  it('emits no Mosaik element', () => {
    // act
    const actual = renderPlainMarkdown('# Problem and solution\n\n* one\n\n| a |\n| --- |\n| 1 |');

    // assert
    expect(actual).not.toContain('<mosaik-');
    expect(actual).toContain('<h1>Problem and solution</h1>');
  });
});
