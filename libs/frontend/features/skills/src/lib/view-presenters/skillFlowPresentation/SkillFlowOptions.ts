// #region Imports

import type { ISkillFlowOption } from './ISkillFlowOption';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

export const skillFlowOptions: readonly ISkillFlowOption[] = [
  {
    role: 'work-item-creation',
    get label() {
      return translateLabel('loc.symphony.labels.create.with.ai.1c19341');
    },
    get placement() {
      return translateLabel('loc.symphony.labels.optional.ai.prompt.classified.draft.4136f5c');
    },
  },
  {
    role: 'analysis',
    get label() {
      return translateLabel('loc.symphony.labels.analyze.with.ai.e57b064');
    },
    get placement() {
      return translateLabel('loc.symphony.labels.optional.ai.analysis.and.re.analysis.c89af62');
    },
  },
  {
    role: 'solution',
    get label() {
      return translateLabel('loc.symphony.labels.implement.with.ai.47bdcf5');
    },
    get placement() {
      return translateLabel('loc.symphony.labels.optional.ai.implementation.and.rework.0c3670e');
    },
  },
  {
    role: 'ci-diagnosis',
    get label() {
      return translateLabel('loc.symphony.labels.diagnose.ci.with.ai.7119d60');
    },
    get placement() {
      return translateLabel(
        'loc.symphony.labels.read.only.diagnosis.of.bounded.failed.action.evidenc.dbe241c',
      );
    },
  },
  {
    role: 'ci-repair',
    get label() {
      return translateLabel('loc.symphony.labels.repair.ci.with.ai.23ccfbc');
    },
    get placement() {
      return translateLabel(
        'loc.symphony.labels.optional.repair.on.a.retained.managed.pull.request.b.1dceff8',
      );
    },
  },
  {
    role: 'pull-request-review',
    get label() {
      return translateLabel('loc.symphony.labels.address.reviews.with.ai.1532332');
    },
    get placement() {
      return translateLabel(
        'loc.symphony.labels.optional.evaluation.of.actionable.pull.request.feedb.f8aea2e',
      );
    },
  },
];
