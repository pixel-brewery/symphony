// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

@Pipe({ name: 'runtimeDependencyLabel', standalone: true, pure: true })
export class RuntimeDependencyLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param id - Id.
   * @public
   */
  public transform(id: string): string {
    switch (id) {
      case 'homebrew':
        return 'Homebrew';
      case 'git':
        return 'Git';
      case 'github-cli':
        return 'GitHub CLI';
      case 'codex':
        return 'Codex CLI';
      case 'claude':
        return 'Claude Code CLI';
      case 'opencode':
        return 'OpenCode CLI';
      default:
        return id;
    }
  }

  // #endregion
}
