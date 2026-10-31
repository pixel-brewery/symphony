// #region Imports

import type { IExecutionContext } from '../context/IExecutionContext';
import type { ISkillPackageDocument } from '@symphony/domain-skills';
import type { IAgentProgress } from './IAgentProgress';

// #endregion

export interface IAgentRuntimePort {
  analyze(
    context: IExecutionContext,
    skill: ISkillPackageDocument,
    request: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string>;
  solve(
    context: IExecutionContext,
    skill: ISkillPackageDocument,
    analysis: string,
    feedback: string | undefined,
    onProgress: (progress: IAgentProgress) => Promise<void>,
    simulateFailure: boolean,
    signal: AbortSignal,
  ): Promise<string>;
}
