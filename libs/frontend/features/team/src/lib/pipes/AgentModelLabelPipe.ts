// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';

// #endregion

const CLAUDE_MODEL_LABELS: Readonly<Record<string, string>> = {
  fable: 'Fable',
  opus: 'Opus',
  sonnet: 'Sonnet',
  haiku: 'Haiku',
};

/**
 * Names an agent's model as the agent sheet offers it: Claude Code's moving aliases by their name,
 * every other model by its identifier.
 *
 * @public
 */
@Pipe({ name: 'agentModelLabel', standalone: true, pure: true })
export class AgentModelLabelPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms a model identifier into its label.
   *
   * @param model - Model identifier.
   * @public
   */
  public transform(model: string): string {
    return CLAUDE_MODEL_LABELS[model.toLocaleLowerCase()] ?? model;
  }

  // #endregion
}
