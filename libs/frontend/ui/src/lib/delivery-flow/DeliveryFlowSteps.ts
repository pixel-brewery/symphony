// #region Imports

import type { IDeliveryFlowStep } from './IDeliveryFlowStep';
import { translateLabel } from '@symphony/frontend-intl/labels';

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
    get label() {
      return translateLabel('loc.symphony.labels.create.4759498');
    },
    get description() {
      return translateLabel('loc.symphony.labels.a.request.becomes.a.work.item.dfdfabd');
    },
    icon: 'edit',
    skillFlowRoles: ['work-item-creation'],
    processRoles: ['create'],
  },
  {
    id: 'plan',
    get label() {
      return translateLabel('loc.symphony.labels.plan.fa8ed0b');
    },
    get description() {
      return translateLabel('loc.symphony.labels.qualified.technical.analysis.c6a03fe');
    },
    icon: 'clipboardTask',
    skillFlowRoles: ['analysis'],
    processRoles: ['analyze'],
  },
  {
    id: 'implement',
    get label() {
      return translateLabel('loc.symphony.labels.implement.and.verify.c3f4032');
    },
    get description() {
      return translateLabel(
        'loc.symphony.labels.ready.progress.branch.pull.request.checks.068b4af',
      );
    },
    icon: 'branch',
    skillFlowRoles: ['solution'],
    processRoles: ['solve', 'verify'],
  },
  {
    id: 'fix-checks',
    get label() {
      return translateLabel('loc.symphony.labels.fix.failed.checks.3e89220');
    },
    get description() {
      return translateLabel('loc.symphony.labels.a.check.fails.on.a.symphony.pull.request.780f072');
    },
    icon: 'executionOutline',
    skillFlowRoles: ['ci-diagnosis', 'ci-repair'],
    processRoles: ['ci-diagnosis', 'ci-repair'],
  },
  {
    id: 'address-reviews',
    get label() {
      return translateLabel('loc.symphony.labels.address.reviews.9686886');
    },
    get description() {
      return translateLabel('loc.symphony.labels.a.reviewer.comments.on.the.pull.request.e9dfd14');
    },
    icon: 'comment',
    skillFlowRoles: ['pull-request-review'],
    processRoles: ['pull-request-review'],
  },
];
