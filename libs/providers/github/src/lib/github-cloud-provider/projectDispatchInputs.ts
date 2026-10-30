// #region Imports

import type { ICiDispatchInput } from '@symphony/domain-ci';

// #endregion

/** Parses explicit workflow_dispatch inputs; expressions are not executed. @public */
export function projectDispatchInputs(document: unknown): readonly ICiDispatchInput[] {
  if (typeof document !== 'object' || document === null) return [];
  const on = (document as Record<string, unknown>)['on'];
  if (typeof on !== 'object' || on === null) return [];
  const dispatch = (on as Record<string, unknown>)['workflow_dispatch'];
  if (typeof dispatch !== 'object' || dispatch === null) return [];
  const inputs = (dispatch as Record<string, unknown>)['inputs'];
  if (typeof inputs !== 'object' || inputs === null) return [];
  return Object.entries(inputs).map(([id, value]) => {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Record<
      string,
      unknown
    >;
    const type = input['type'];
    return {
      id,
      description: typeof input['description'] === 'string' ? input['description'] : '',
      type:
        type === 'boolean' || type === 'number' || type === 'choice' || type === 'environment'
          ? type
          : 'string',
      required: input['required'] === true,
      ...(input['default'] !== undefined ? { defaultValue: String(input['default']) } : {}),
      ...(Array.isArray(input['options'])
        ? {
            options: input['options'].filter(
              (option): option is string => typeof option === 'string',
            ),
          }
        : {}),
    };
  });
}
