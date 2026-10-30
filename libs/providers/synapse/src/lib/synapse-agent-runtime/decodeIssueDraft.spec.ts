// #region Imports

import { describe, expect, it } from 'vitest';
import { decodeIssueDraft } from './decodeIssueDraft.js';

// #endregion

const complete = {
  title: '  Requested feature  ',
  body: '  Complete body.  ',
  projectFields: [],
  labels: [' enhancement '],
  assignees: [' synthetic-user '],
};

describe('decodeIssueDraft', () => {
  it('normalizes title/body and all supported field value types without unchecked draft casts', () => {
    // arrange
    const projectFields = [
      { fieldId: 'text', type: 'text', value: '' },
      { fieldId: 'date', type: 'date', value: '2026-10-29' },
      { fieldId: 'number', type: 'number', value: null },
      { fieldId: 'select', type: 'single-select', value: 'native-option' },
      { fieldId: 'iteration', type: 'iteration', value: null },
      { fieldId: 'multi', type: 'multi-select', value: [' native-option '] },
    ];

    // act
    const draft = decodeIssueDraft({ ...complete, projectFields });

    // assert
    expect(draft).toEqual({
      title: 'Requested feature',
      body: 'Complete body.',
      labels: ['enhancement'],
      assignees: ['synthetic-user'],
      projectFields: [
        ...projectFields.slice(0, -1),
        { fieldId: 'multi', type: 'multi-select', value: ['native-option'] },
      ],
    });
  });

  it.each([
    { fieldId: 'number', type: 'number', value: 'wrong-kind' },
    { fieldId: 'number', type: 'number', value: Number.POSITIVE_INFINITY },
    { fieldId: 'multi', type: 'multi-select', value: [42] },
    { fieldId: '', type: 'text', value: 'missing identity' },
    { fieldId: 'unknown', type: 'unsupported-kind', value: 'bad' },
  ])('rejects an invalid discriminated field value $type', (field) => {
    // arrange
    const raw = { ...complete, projectFields: [field] };

    // act
    // assert
    expect(() => decodeIssueDraft(raw)).toThrow();
  });

  it.each([
    { title: '   ' },
    { body: '\n\t' },
    { labels: [42] },
    { assignees: [''] },
    { projectFields: {} },
  ])('rejects invalid required draft data', (patch) => {
    // arrange
    const raw = { ...complete, ...patch };

    // act
    // assert
    expect(() => decodeIssueDraft(raw)).toThrow();
  });
});
