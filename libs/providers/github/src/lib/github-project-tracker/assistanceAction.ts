// #region Imports

import { type AssistanceAction } from '@symphony/domain-work';

// #endregion

export function assistanceAction(value: string | undefined): AssistanceAction | undefined {
  const normalized = value?.trim().toLocaleLowerCase();
  if (normalized === 'none') return 'none';
  if (normalized === 'create') return 'create';
  if (normalized === 'analyze' || normalized === 'analyse') return 'analyze';
  if (normalized === 'solve') return 'solve';
  return undefined;
}
