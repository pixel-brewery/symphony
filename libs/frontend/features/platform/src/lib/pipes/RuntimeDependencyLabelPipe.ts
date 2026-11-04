// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

@Pipe({ name: 'runtimeDependencyLabel', standalone: true, pure: false })
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
        return translateLabel('loc.symphony.labels.github.cli.44ba6c9');
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
