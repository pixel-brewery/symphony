// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import type { ISettingsEditorDefinition } from './ISettingsEditorDefinition';
import type { ISettingsEditorRequest } from './ISettingsEditorRequest';
import { SETTINGS_EDITORS } from './SettingsEditorsToken';

// #endregion

/**
 * Resolves explicitly registered editors without a product-business switch in the host.
 *
 * @public
 */
@Injectable()
export class SettingsEditorRegistry {
  // #region Fields

  private readonly _editors = new Map<string, ISettingsEditorDefinition>();

  // #endregion

  // #region Ctor

  /**
   * Validates unique identifiers and kinds for all included editors.
   *
   * @public
   */
  public constructor(
    @Inject(SETTINGS_EDITORS)
    @Optional()
    editors: readonly ISettingsEditorDefinition[] | null = inject(SETTINGS_EDITORS, {
      optional: true,
    }),
  ) {
    const ids = new Set<string>();
    for (const editor of editors ?? []) {
      if (ids.has(editor.id)) throw new Error(`Duplicate settings editor '${editor.id}'.`);
      if (this._editors.has(editor.kind))
        throw new Error(`Multiple settings editors for kind '${editor.kind}'.`);
      ids.add(editor.id);
      this._editors.set(editor.kind, editor);
    }
  }

  // #endregion

  // #region Methods

  /**
   * Reports whether an optional feature contributes the requested editor kind.
   *
   * @public
   */
  public has(kind: string): boolean {
    return this._editors.has(kind);
  }

  /**
   * Resolves and validates a request before any view is loaded.
   *
   * @public
   */
  public resolve(request: ISettingsEditorRequest): ISettingsEditorDefinition {
    const editor = this._editors.get(request.kind);
    if (!editor) throw new Error(`No settings editor is registered for '${request.kind}'.`);
    if (!editor.isRequest(request))
      throw new Error(`Invalid settings editor request for '${request.kind}'.`);
    return editor;
  }

  // #endregion
}
