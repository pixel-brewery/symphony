// #region Imports

import type { ISkillFlowOption } from './ISkillFlowOption';

// #endregion

export const skillFlowOptions: readonly ISkillFlowOption[] = [
  {
    role: 'work-item-creation',
    label: 'Create with AI',
    placement: 'Optional AI prompt → Classified draft',
  },
  {
    role: 'analysis',
    label: 'Analyze with AI',
    placement: 'Optional AI analysis and re-analysis',
  },
  {
    role: 'solution',
    label: 'Implement with AI',
    placement: 'Optional AI implementation and rework',
  },
  {
    role: 'ci-diagnosis',
    label: 'Diagnose CI with AI',
    placement: 'Read-only diagnosis of bounded failed-action evidence',
  },
  {
    role: 'ci-repair',
    label: 'Repair CI with AI',
    placement: 'Optional repair on a retained managed pull-request branch',
  },
  {
    role: 'pull-request-review',
    label: 'Address reviews with AI',
    placement: 'Optional evaluation of actionable pull-request feedback',
  },
];
