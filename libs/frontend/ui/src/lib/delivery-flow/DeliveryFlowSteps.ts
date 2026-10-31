// #region Imports

import type { IDeliveryFlowStep } from './IDeliveryFlowStep';

// #endregion

/**
 * The five delivery-flow steps in order. They follow the board stages and the skill flow roles, so
 * `AI team` (who does a step), `Skills` (how it works) and `Automation` (how far it runs on its
 * own) name and draw every step the same way.
 *
 * @public
 */
export const deliveryFlowSteps: readonly IDeliveryFlowStep[] = [
  {
    id: 'create',
    label: 'Create',
    description: 'A request becomes a work item',
    icon: 'edit',
    skillFlowRoles: ['work-item-creation'],
    processRoles: ['create'],
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Qualified · technical analysis',
    icon: 'clipboardTask',
    skillFlowRoles: ['analysis'],
    processRoles: ['analyze'],
  },
  {
    id: 'implement',
    label: 'Implement and verify',
    description: 'Ready → Progress · branch, pull request, checks',
    icon: 'branch',
    skillFlowRoles: ['solution'],
    processRoles: ['solve', 'verify'],
  },
  {
    id: 'fix-checks',
    label: 'Fix failed checks',
    description: 'A check fails on a Symphony pull request',
    icon: 'executionOutline',
    skillFlowRoles: ['ci-diagnosis', 'ci-repair'],
    processRoles: ['ci-diagnosis', 'ci-repair'],
  },
  {
    id: 'address-reviews',
    label: 'Address reviews',
    description: 'A reviewer comments on the pull request',
    icon: 'comment',
    skillFlowRoles: ['pull-request-review'],
    processRoles: ['pull-request-review'],
  },
];
