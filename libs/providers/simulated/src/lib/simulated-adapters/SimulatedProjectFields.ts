// #region Imports

import type { ProjectFieldDefinition } from '@symphony/domain-work';

// #endregion

export const simulatedProjectFields: readonly ProjectFieldDefinition[] = [
  {
    id: 'field-status',
    name: 'Status',
    type: 'single-select',
    role: 'workflow-state',
    options: [
      { id: 'status-backlog', label: 'Backlog', stageId: 'backlog' },
      { id: 'status-qualified', label: 'Qualified', stageId: 'qualified' },
      { id: 'status-ready', label: 'Ready', stageId: 'ready' },
      { id: 'status-progress', label: 'Progress', stageId: 'progress' },
      { id: 'status-acceptance', label: 'Acceptance', stageId: 'acceptance' },
      { id: 'status-done', label: 'Done', stageId: 'done' },
    ],
  },
  { id: 'field-keywords', name: 'Keywords', type: 'text', role: 'custom' },
  { id: 'field-estimate', name: 'Estimate', type: 'number', role: 'custom' },
  { id: 'field-target-date', name: 'Target date', type: 'date', role: 'custom' },
  {
    id: 'field-assistant-phase',
    name: 'Assistant phase',
    type: 'single-select',
    role: 'assistance-action',
    options: [
      { id: 'assistant-none', label: 'None', assistanceAction: 'none' },
      { id: 'assistant-create', label: 'Create', assistanceAction: 'create' },
      { id: 'assistant-analyze', label: 'Analyze', assistanceAction: 'analyze' },
      { id: 'assistant-solve', label: 'Solve', assistanceAction: 'solve' },
    ],
  },
  {
    id: 'field-priority',
    name: 'Priority',
    type: 'single-select',
    role: 'custom',
    options: [
      { id: 'priority-low', label: 'Low' },
      { id: 'priority-high', label: 'High' },
    ],
  },
  {
    id: 'field-areas',
    name: 'Areas',
    type: 'multi-select',
    role: 'custom',
    options: [
      { id: 'area-desktop', label: 'Desktop' },
      { id: 'area-projects', label: 'Projects' },
    ],
  },
  {
    id: 'field-iteration',
    name: 'Iteration',
    type: 'iteration',
    role: 'custom',
    options: [
      {
        id: 'iteration-august',
        label: 'August 2026',
        startDate: '2026-08-01',
        duration: 14,
      },
    ],
  },
];
