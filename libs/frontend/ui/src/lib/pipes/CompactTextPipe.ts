// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'compactText', standalone: true, pure: true })
export class CompactTextPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param markdown - Markdown.
   * @param fallback - Fallback.
   * @param maximumLength - Maximum length.
   * @public
   */
  public transform(markdown: string | undefined, fallback: string, maximumLength = 96): string {
    const line = (markdown ?? '')
      .split(/\r?\n/u)
      .map((candidate) => candidate.trim())
      .find(Boolean);
    const plain = (line ?? fallback)
      .replace(/^#{1,6}\s+/u, '')
      .replace(/^[-*+]\s+/u, '')
      .replace(/\[(.+?)\]\([^)]*\)/gu, '$1')
      .replace(/[*_`~]/gu, '')
      .trim();
    return plain.length > maximumLength
      ? `${plain.slice(0, Math.max(0, maximumLength - 3)).trimEnd()}…`
      : plain;
  }

  // #endregion
}
