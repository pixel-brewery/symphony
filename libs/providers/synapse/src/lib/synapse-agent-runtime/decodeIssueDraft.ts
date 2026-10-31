// #region Imports

import type { IIssueDraft, ProjectFieldValue } from '@symphony/domain-work';

// #endregion

/**
 * Decodes the draft's structural types; WorkItemService owns final provider-option validation.
 *
 * @param value - Actual native structured result, or parsed JSON text.
 * @returns A normalized draft with nonempty title/body and typed provider field values.
 * @throws An Error for invalid shapes, empty required text or invalid discriminated field values.
 *
 * @public
 */
export function decodeIssueDraft(value: unknown): IIssueDraft {
  const draft = record(value);

  if (
    !draft ||
    typeof draft['title'] !== 'string' ||
    typeof draft['body'] !== 'string' ||
    !Array.isArray(draft['projectFields'])
  )
    throw new Error('Work Item Creator returned an incomplete classified draft.');

  const title = draft['title'].trim();
  const body = draft['body'].trim();

  if (!title || !body) throw new Error('Work Item Creator returned an empty title or body.');

  return {
    title,
    body,
    projectFields: draft['projectFields'].map((field: unknown) => projectField(field)),
    labels: strings(draft['labels'], 'labels'),
    assignees: strings(draft['assignees'], 'assignees'),
  };
}

function projectField(value: unknown): ProjectFieldValue {
  const field = record(value);
  const fieldId = field?.['fieldId'];

  if (!field || typeof fieldId !== 'string' || !fieldId.trim())
    throw new Error('Work Item Creator returned an invalid field value.');

  const selected = field['value'];

  switch (field['type']) {
    case 'text':
    case 'date':
      if (typeof selected === 'string') return { fieldId, type: field['type'], value: selected };

      break;
    case 'number':
      if (selected === null || (typeof selected === 'number' && Number.isFinite(selected)))
        return { fieldId, type: 'number', value: selected };

      break;
    case 'single-select':
    case 'iteration':
      if (selected === null || typeof selected === 'string')
        return { fieldId, type: field['type'], value: selected };

      break;
    case 'multi-select':
      return { fieldId, type: 'multi-select', value: strings(selected, 'field options') };
  }

  throw new Error('Work Item Creator returned an invalid typed field value.');
}

function strings(value: unknown, property: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`Work Item Creator returned invalid ${property}.`);

  return value.map((item: unknown) => {
    if (typeof item !== 'string' || !item.trim())
      throw new Error(`Work Item Creator returned invalid ${property}.`);

    return item.trim();
  });
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
