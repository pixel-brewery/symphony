// #region Imports

import type { ICiDispatchInput } from '@symphony/domain-ci';

// #endregion

/** Rejects unknown, missing or incorrectly typed values before a remote mutation. @public */
export function validateDispatchInputs(
  definitions: readonly ICiDispatchInput[],
  values: Readonly<Record<string, string>>,
): void {
  for (const id of Object.keys(values))
    if (!definitions.some((input) => input.id === id))
      throw new Error(`Workflow input no longer exists: ${id}`);
  for (const input of definitions) {
    const value = values[input.id] ?? input.defaultValue;
    if ((value === undefined || value === '') && input.required)
      throw new Error(`Provide workflow input: ${input.id}`);
    if (value === undefined || value === '') continue;
    if (input.type === 'boolean' && value !== 'true' && value !== 'false')
      throw new Error(`Use true or false for ${input.id}.`);
    if (input.type === 'number' && !Number.isFinite(Number(value)))
      throw new Error(`Use a number for ${input.id}.`);
    if (input.type === 'choice' && !input.options?.includes(value))
      throw new Error(`Choose a declared option for ${input.id}.`);
  }
}
