// #region Imports

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { TextComponent, TypographyDirective } from '@pixel-brewery/mosaik-elements-angular';
import { renderMarkdown } from './renderMarkdown';
import { renderPlainMarkdown } from './renderPlainMarkdown';

// #endregion

/**
 * Renders untrusted GitHub-flavored Markdown as Mosaik elements, mirroring FLAMOX365's
 * `MarkdownComponent`. Embedded raw HTML is shown as text.
 */
@Component({
  selector: 'symphony-markdown',
  host: { '[class.compact]': 'compact()', '[class.plain]': 'plain()' },
  templateUrl: './MarkdownComponent.html',
  styleUrl: './MarkdownComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [TextComponent, TypographyDirective],
})
export class MarkdownComponent {
  // #region Fields

  /**
   * The text.
   *
   * @public
   * @readonly
   */
  public readonly text = input<string>('');

  /**
   * The breaks.
   *
   * @public
   * @readonly
   */
  public readonly breaks = input(false);

  /**
   * The compact.
   *
   * @public
   * @readonly
   */
  public readonly compact = input(false);

  /**
   * Renders plain HTML instead of Mosaik elements. A dense preview - the board card's progress
   * line - wants a few clipped lines of text, not controls, tables and expanders.
   *
   * @public
   * @readonly
   */
  public readonly plain = input(false);

  /**
   * Renders standard Markdown through Mosaik's own text formatter instead of the full
   * `marked` pipeline.
   *
   * @public
   * @readonly
   */
  public readonly sanitize = input(false);

  /**
   * Markdown source with raw HTML escaped before Mosaik formats the supported syntax.
   *
   * @public
   * @readonly
   */
  public readonly safeMarkdownText = computed<string>(() =>
    this.text()
      .replace(/&/gu, '&amp;')
      .replace(/</gu, '&lt;')
      .replace(/>/gu, '&gt;')
      .replace(/"/gu, '&quot;')
      .replace(/'/gu, '&#39;'),
  );

  protected readonly renderedHtml = computed<SafeHtml | string>(() => {
    const text = this.text();
    if (!text) return '';
    // The plain renderer emits ordinary HTML, so Angular's own sanitizer stays in the path.
    if (this.plain()) return renderPlainMarkdown(text, this.breaks());
    // Mosaik elements are unknown to that sanitizer and would be stripped entirely. Raw HTML never
    // survives tokenizing and every interpolated value is escaped for the attribute it lands in,
    // so the bypass only trusts markup this renderer wrote itself.
    return this._sanitizer.bypassSecurityTrustHtml(renderMarkdown(text, this.breaks()));
  });

  private readonly _sanitizer: DomSanitizer = inject(DomSanitizer);

  // #endregion
}
