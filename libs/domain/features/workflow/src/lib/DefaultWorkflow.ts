// #region Imports

import type { IWorkflowDefinition } from './workflow';

// #endregion

/**
 * Shipped default: the recommended FLAMOX365 delivery process.
 *
 * Six human-visible stages, two mandatory human gates, and one automated stage per
 * executing role. This value is only a starting point - installations edit stages,
 * transitions, and policies in settings, so nothing in the engine may assume these
 * identifiers exist.
 */
export const defaultWorkflow: IWorkflowDefinition = {
  id: 'flamox365-delivery',
  name: 'FLAMOX365 delivery',
  // Raise the version whenever this definition changes: an installation that still runs the
  // shipped process (same id, older version) adopts the new definition on settings load.
  version: 5,
  initialStageId: 'backlog',
  stages: [
    {
      id: 'backlog',
      label: 'Backlog',
      description: 'Captured or returned for a requirement change. Waits for human review.',
      kind: 'human-gate',
      decisions: [
        {
          id: 'approve',
          label: 'Approve',
          description: 'Release the request for technical analysis.',
          effect: 'advance',
          targetStageId: 'qualified',
        },
        {
          id: 'hold',
          label: 'Ask a question',
          description: 'Keep the request here until the open question is answered.',
          effect: 'hold',
        },
        {
          id: 'split',
          label: 'Split',
          description: 'Create linked follow-up requests.',
          effect: 'split',
        },
        {
          id: 'duplicate',
          label: 'Close as duplicate',
          effect: 'close',
          closureReason: 'duplicate',
        },
        {
          id: 'reject',
          label: 'Close as not planned',
          effect: 'close',
          closureReason: 'not-planned',
        },
      ],
    },
    {
      id: 'qualified',
      label: 'Qualified',
      description: 'Approved by a person and queued for technical analysis.',
      kind: 'automated',
      roles: ['analyze'],
      autoStart: true,
    },
    {
      id: 'ready',
      label: 'Ready',
      description: 'Analysis is complete, current, and implementable. Waits for a free worker.',
      kind: 'automated',
      roles: ['solve'],
      autoStart: true,
    },
    {
      id: 'progress',
      label: 'Progress',
      description:
        'Claimed exclusively. Implementation, pull request, checks, and verification run here.',
      kind: 'automated',
      roles: ['solve', 'verify'],
      autoStart: true,
    },
    {
      id: 'acceptance',
      label: 'Acceptance',
      description: 'Independently verified. Waits for human acceptance.',
      kind: 'human-gate',
      decisions: [
        {
          id: 'accept',
          label: 'Accept',
          description: 'Accept the result, merge the pull request, and close the request.',
          effect: 'advance',
          targetStageId: 'done',
        },
        {
          id: 'reject-implementation',
          label: 'Implementation is wrong',
          effect: 'route',
          targetStageId: 'progress',
          invalidates: ['verification', 'acceptance'],
        },
        {
          id: 'reject-analysis',
          label: 'Technical approach is wrong',
          effect: 'route',
          targetStageId: 'qualified',
          invalidates: ['analysis', 'implementation', 'verification', 'acceptance'],
        },
        {
          id: 'reject-requirement',
          label: 'Requirement must change',
          effect: 'route',
          targetStageId: 'backlog',
          invalidates: ['analysis', 'implementation', 'verification', 'acceptance'],
        },
        {
          id: 'hold',
          label: 'Ask a question',
          effect: 'hold',
        },
        {
          id: 'obsolete',
          label: 'Close as superseded',
          effect: 'close',
          closureReason: 'superseded',
        },
      ],
    },
    {
      id: 'done',
      label: 'Done',
      description: 'Accepted by a person, merged, and audited.',
      kind: 'terminal',
    },
  ],
  transitions: [
    {
      id: 'backlog-to-qualified',
      from: 'backlog',
      to: 'qualified',
      trigger: { kind: 'decision', optionId: 'approve' },
      guards: [
        'authorized-human-approval',
        'required-fields-complete',
        'no-open-question',
        'not-duplicate',
        'not-cancelled',
      ],
    },
    {
      id: 'qualified-to-ready',
      from: 'qualified',
      to: 'ready',
      trigger: { kind: 'outcome', role: 'analyze', outcome: 'pass' },
      // Provable since the analyze reporting contract requires the machine-readable
      // "Definition of ready" block and the analyzer stores it on the workflow record.
      guards: [
        'analysis-complete',
        'analysis-feasible',
        'no-open-question',
        'issue-revision-current',
        'test-strategy-present',
        'acceptance-mapping-complete',
      ],
    },
    {
      id: 'ready-to-progress',
      from: 'ready',
      to: 'progress',
      trigger: { kind: 'claim', role: 'solve' },
      // 'analysis-complete' is required here and not only on the way into `ready`: a stage
      // adopted from the provider board never passed that transition, so this is the only
      // place where an item that reached `ready` outside Symphony is still asked to prove
      // its analysis - and to say so instead of failing closed on derived facts.
      guards: [
        'claim-acquired',
        'lease-active',
        'fencing-token-current',
        'analysis-complete',
        'analysis-revision-current',
        'dependencies-satisfied',
        'no-hard-collision',
        'capacity-available',
        'risk-policy-satisfied',
      ],
    },
    {
      id: 'progress-to-acceptance',
      from: 'progress',
      to: 'acceptance',
      trigger: { kind: 'outcome', role: 'verify', outcome: 'pass' },
      // Provable since the pull-request synchronization reports verify outcomes with
      // pull-request facts and a commit-bound verification verdict. Add
      // 'continuous-integration-passed' once check-run facts flow into the report.
      guards: [
        'pull-request-exists',
        'verification-passed',
        'verified-commit-current',
        'no-open-findings',
        'issue-revision-current',
      ],
    },
    {
      id: 'acceptance-to-done',
      from: 'acceptance',
      to: 'done',
      trigger: { kind: 'decision', optionId: 'accept' },
      // Add 'accepted-commit-current', 'merge-successful', 'target-branch-contains-commit'
      // and 'post-merge-checks-passed' once Symphony performs the merge after acceptance.
      guards: ['authorized-human-acceptance', 'audit-complete'],
    },
    {
      id: 'acceptance-to-progress',
      from: 'acceptance',
      to: 'progress',
      trigger: { kind: 'decision', optionId: 'reject-implementation' },
      guards: ['authorized-human-approval'],
      invalidates: ['verification', 'acceptance'],
    },
    {
      id: 'acceptance-to-qualified',
      from: 'acceptance',
      to: 'qualified',
      trigger: { kind: 'decision', optionId: 'reject-analysis' },
      guards: ['authorized-human-approval'],
      invalidates: ['analysis', 'implementation', 'verification', 'acceptance'],
    },
    {
      id: 'acceptance-to-backlog',
      from: 'acceptance',
      to: 'backlog',
      trigger: { kind: 'decision', optionId: 'reject-requirement' },
      guards: ['authorized-human-approval'],
      invalidates: ['analysis', 'implementation', 'verification', 'acceptance'],
    },
    {
      id: 'progress-rework-to-qualified',
      from: 'progress',
      to: 'qualified',
      trigger: { kind: 'outcome', role: 'verify', outcome: 'rework' },
      guards: [],
      invalidates: ['analysis', 'implementation', 'verification'],
    },
    {
      id: 'ready-rework-to-qualified',
      from: 'ready',
      to: 'qualified',
      trigger: { kind: 'outcome', role: 'solve', outcome: 'rework' },
      guards: [],
      invalidates: ['analysis'],
    },
    {
      id: 'qualified-rework-to-backlog',
      from: 'qualified',
      to: 'backlog',
      trigger: { kind: 'outcome', role: 'analyze', outcome: 'rework' },
      guards: [],
      invalidates: ['analysis'],
    },
  ],
  policies: {
    retry: {
      backoffMinutes: [1, 5, 30],
      jitterRatio: 0.2,
      maxAttemptsPerReason: 3,
    },
    loopLimits: {
      maxReworkPerRoute: 3,
      maxReworkTotal: 5,
      maxIdenticalFailures: 3,
      maxDurationHours: 168,
    },
    merge: {
      mode: 'symphony',
      strategy: 'squash',
      deleteBranchAfterMerge: true,
      requirePostMergeChecks: true,
    },
    humanRequired: {
      reminderHours: 48,
      escalationHours: 120,
      decisionHours: 336,
    },
    claim: {
      leaseMinutes: 30,
      heartbeatSeconds: 60,
    },
  },
};
