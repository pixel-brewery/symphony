// #region Imports

import type { ProjectFieldValue } from '@symphony/domain-work';
import type { WorkflowStageId } from '@symphony/domain-workflow';
import { simulatedProjectFields } from './SimulatedProjectFields';

// #endregion

export function simulatedFieldValues(
  stage: WorkflowStageId,
  keywords: string,
): readonly ProjectFieldValue[] {
  const status = simulatedProjectFields[0];
  const statusOption =
    status && 'options' in status
      ? status.options.find((option) => option.stageId === stage)?.id
      : undefined;
  return [
    { fieldId: 'field-status', type: 'single-select', value: statusOption ?? null },
    { fieldId: 'field-keywords', type: 'text', value: keywords },
    { fieldId: 'field-estimate', type: 'number', value: null },
    { fieldId: 'field-target-date', type: 'date', value: '' },
    { fieldId: 'field-assistant-phase', type: 'single-select', value: 'assistant-none' },
    { fieldId: 'field-priority', type: 'single-select', value: null },
    { fieldId: 'field-areas', type: 'multi-select', value: [] },
    { fieldId: 'field-iteration', type: 'iteration', value: null },
  ];
}
