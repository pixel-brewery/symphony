/**
 * Native structured-output schema for a Symphony draft's structural contract.
 *
 * @remarks Exact field IDs, option membership, cardinality and deduplication remain owned by WorkItemService.
 *
 * @public
 */
export const IssueDraftSchema: Readonly<Record<string, unknown>> = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'body', 'projectFields', 'labels', 'assignees'],
  properties: {
    title: { type: 'string', minLength: 1 },
    body: { type: 'string', minLength: 1 },
    labels: { type: 'array', items: { type: 'string', minLength: 1 } },
    assignees: { type: 'array', items: { type: 'string', minLength: 1 } },
    projectFields: {
      type: 'array',
      items: {
        anyOf: [
          ...['text', 'date'].map((type) => ({
            type: 'object',
            additionalProperties: false,
            required: ['fieldId', 'type', 'value'],
            properties: {
              fieldId: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: [type] },
              value: { type: 'string' },
            },
          })),
          {
            type: 'object',
            additionalProperties: false,
            required: ['fieldId', 'type', 'value'],
            properties: {
              fieldId: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ['number'] },
              value: { type: ['number', 'null'] },
            },
          },
          ...['single-select', 'iteration'].map((type) => ({
            type: 'object',
            additionalProperties: false,
            required: ['fieldId', 'type', 'value'],
            properties: {
              fieldId: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: [type] },
              value: { type: ['string', 'null'] },
            },
          })),
          {
            type: 'object',
            additionalProperties: false,
            required: ['fieldId', 'type', 'value'],
            properties: {
              fieldId: { type: 'string', minLength: 1 },
              type: { type: 'string', enum: ['multi-select'] },
              value: { type: 'array', items: { type: 'string', minLength: 1 } },
            },
          },
        ],
      },
    },
  },
};
