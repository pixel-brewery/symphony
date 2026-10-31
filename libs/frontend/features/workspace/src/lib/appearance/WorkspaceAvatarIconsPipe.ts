// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

/**
 * Filters registered glyphs while retaining the reference dialog's initial suggestions.
 *
 * @public
 */
@Pipe({ name: 'workspaceAvatarIcons', pure: true })
export class WorkspaceAvatarIconsPipe implements PipeTransform {
  // #region Fields

  private readonly _suggestions = [
    'person',
    'star',
    'heart',
    'home',
    'folder',
    'code',
    'desktop',
    'database',
    'mobile',
    'tablet',
    'image',
    'video',
    'chat',
    'sparkle',
    'settings',
    'sun',
    'moon',
    'location',
    'compass-northwest',
    'payment',
    'calendar',
    'lock-close',
    'shield-success',
    'glasses',
  ];

  // #endregion

  // #region Methods

  /**
   * Matches aliases against the search text without changing the selected glyph.
   *
   * @param icons - Registered selectable aliases.
   * @param search - Current search text.
   * @returns Suggested or matching aliases.
   * @public
   */
  public transform(icons: readonly string[], search: string): readonly string[] {
    const query = search.trim().toLowerCase();
    return query
      ? icons.filter((icon) => icon.toLowerCase().includes(query))
      : this._suggestions.filter((icon) => icons.includes(icon));
  }

  // #endregion
}
