// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import { defaultAgentAppearance, type IAgentAppearance } from '@symphony/domain-team';
import { agentFigureSource } from '../components/agent-figure/agentFigureSource';

// #endregion

@Pipe({ name: 'agentAvatarSource', standalone: true, pure: true })
export class AgentAvatarSourcePipe implements PipeTransform {
  // #region Methods

  /** Resolves the compact image using the same identity as the full figure. @public */
  public transform(agentId: string, appearance?: IAgentAppearance): string {
    return agentFigureSource(appearance ?? defaultAgentAppearance(agentId), 'avatar');
  }

  // #endregion
}
