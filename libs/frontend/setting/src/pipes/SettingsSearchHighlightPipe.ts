// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ISettingsSearchTextPart } from '../search/ISettingsSearchTextPart';
import { settingsSearchTerms } from '../search/settingsSearchTerms';

// #endregion

/**
 * Splits a text into the pieces that match the words of a search query and the rest, so the
 * template can highlight the matches.
 *
 * @public
 */
@Pipe({ name: 'settingsSearchHighlight' })
export class SettingsSearchHighlightPipe implements PipeTransform {
  // #region Methods

  /**
   * Splits a text by the query's words, case-insensitively.
   *
   * @param text - Text to split.
   * @param query - Search query.
   * @returns The pieces in order; a single unmarked piece when nothing matches.
   * @public
   */
  public transform(text: string, query: string): readonly ISettingsSearchTextPart[] {
    const lower = text.toLocaleLowerCase();
    const terms = settingsSearchTerms(query);
    const parts: ISettingsSearchTextPart[] = [];
    let plainStart = 0;
    let position = 0;
    while (position < text.length) {
      const term = terms.find((candidate) => lower.startsWith(candidate, position));
      if (!term) {
        position += 1;
        continue;
      }
      if (position > plainStart)
        parts.push({ text: text.slice(plainStart, position), match: false });
      parts.push({ text: text.slice(position, position + term.length), match: true });
      position += term.length;
      plainStart = position;
    }
    if (plainStart < text.length) parts.push({ text: text.slice(plainStart), match: false });
    return parts;
  }

  // #endregion
}
