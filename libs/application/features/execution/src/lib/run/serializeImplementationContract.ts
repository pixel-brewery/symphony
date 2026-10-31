// #region Imports

import type { IImplementationContract } from '@symphony/domain-execution';

// #endregion

export function serializeImplementationContract(contract: IImplementationContract): string {
  return [
    'Approved machine-readable implementation contract:',
    '',
    '```json',
    JSON.stringify(contract, null, 2),
    '```',
    '',
    'Follow the contract exactly. Read broadly, write only inside the allowed path patterns, and stop instead of broadening scope.',
    '',
    contract.instructions,
  ].join('\n');
}
