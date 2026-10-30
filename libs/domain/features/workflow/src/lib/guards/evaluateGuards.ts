// #region Imports

import type { IGuardEvaluation } from '../workflow/IGuardEvaluation';
import type { IGuardFailure } from '../workflow/IGuardFailure';
import type { WorkflowGuardId } from '../workflow/WorkflowGuardId';
import type { GuardPredicate } from './GuardPredicate';
import type { IGuardFacts } from './IGuardFacts';
import { analysisProvesReadiness } from './analysisProvesReadiness';
import { failure } from './failure';
import { noAnalysisStored } from './NoAnalysisStored';

// #endregion

/** Evaluates the guards of one transition and reports every unmet condition by name. */
export function evaluateGuards(
  guards: readonly WorkflowGuardId[],
  facts: IGuardFacts,
): IGuardEvaluation {
  const failed = guards
    .map((guard) => predicates[guard](facts))
    .filter((result): result is IGuardFailure => result !== undefined);
  return { satisfied: failed.length === 0, failed };
}

const predicates: Readonly<Record<WorkflowGuardId, GuardPredicate>> = {
  'authorized-human-approval': (facts) =>
    facts.decision === undefined
      ? failure('authorized-human-approval', 'No human decision is attached to this transition.')
      : undefined,

  'required-fields-complete': (facts) =>
    facts.workItem.title.trim().length > 0 && facts.workItem.body.trim().length > 0
      ? undefined
      : failure('required-fields-complete', 'The work item needs a title and a description.'),

  'no-open-question': (facts) =>
    facts.record.humanRequest === undefined &&
    (facts.analysis?.unresolvedQuestions.length ?? 0) === 0
      ? undefined
      : failure('no-open-question', 'An unanswered question is still attached to this work item.'),

  'not-duplicate': (facts) =>
    facts.workItem.duplicateOfId === undefined
      ? undefined
      : failure(
          'not-duplicate',
          `The work item is marked as a duplicate of ${facts.workItem.duplicateOfId}.`,
        ),

  'not-cancelled': (facts) =>
    facts.record.routing.closureReason === undefined && !facts.workItem.closed
      ? undefined
      : failure('not-cancelled', 'The work item is already closed.'),

  'analysis-complete': (facts) => {
    if (facts.analysis === undefined) return failure('analysis-complete', noAnalysisStored);
    return analysisProvesReadiness(facts.analysis)
      ? undefined
      : failure('analysis-complete', 'The stored analysis is not marked ready for implementation.');
  },

  'analysis-feasible': (facts) =>
    facts.analysis?.feasible === true
      ? undefined
      : failure('analysis-feasible', 'The analysis did not confirm technical feasibility.'),

  'analysis-revision-current': (facts) =>
    facts.record.revisions.analysisRevision !== undefined
      ? undefined
      : failure('analysis-revision-current', 'The stored analysis revision is missing.'),

  'test-strategy-present': (facts) =>
    (facts.analysis?.testStrategy.length ?? 0) > 0
      ? undefined
      : failure('test-strategy-present', 'The analysis defines no test strategy.'),

  'acceptance-mapping-complete': (facts) =>
    (facts.analysis?.acceptanceMapping.length ?? 0) > 0
      ? undefined
      : failure(
          'acceptance-mapping-complete',
          'No acceptance criterion is mapped to an implementation step.',
        ),

  'claim-acquired': (facts) =>
    facts.record.claim !== undefined
      ? undefined
      : failure('claim-acquired', 'The work item is not claimed by this orchestrator.'),

  'lease-active': (facts) => {
    const claim = facts.record.claim;
    if (!claim) return failure('lease-active', 'The work item is not claimed.');
    return new Date(claim.leaseUntil).getTime() > facts.now.getTime()
      ? undefined
      : failure('lease-active', 'The claim lease expired.');
  },

  'fencing-token-current': (facts) => {
    const claim = facts.record.claim;
    if (!claim) return failure('fencing-token-current', 'The work item is not claimed.');
    if (claim.owner !== facts.owner) {
      return failure('fencing-token-current', `The active claim belongs to ${claim.owner}.`);
    }
    if (facts.claimVersion === undefined) {
      return failure('fencing-token-current', 'The worker presented no fencing token.');
    }
    return facts.claimVersion === claim.claimVersion
      ? undefined
      : failure(
          'fencing-token-current',
          `The worker holds fencing token ${facts.claimVersion}; the current claim is at ${claim.claimVersion}.`,
        );
  },

  // A declared dependency is not a second veto. The analysis lists what it depends on and then
  // states, in `readyForSolve`, whether that stops implementation - it is the only party that
  // saw both. Overruling a ready verdict here made the guard unsatisfiable: nothing an operator
  // can do resolves a dependency Symphony has no source for, so the item stayed stuck for good.
  'dependencies-satisfied': (facts) => {
    if (facts.analysis === undefined) return failure('dependencies-satisfied', noAnalysisStored);
    if (analysisProvesReadiness(facts.analysis)) return undefined;
    return facts.dependenciesSatisfied
      ? undefined
      : failure('dependencies-satisfied', 'A hard dependency of this work item is still open.');
  },

  'no-hard-collision': (facts) =>
    facts.collidingWorkItemIds.length === 0
      ? undefined
      : failure(
          'no-hard-collision',
          `The change surface collides with ${facts.collidingWorkItemIds.join(', ')}.`,
        ),

  'capacity-available': (facts) =>
    facts.capacityAvailable
      ? undefined
      : failure('capacity-available', 'No execution slot is free.'),

  // The risk class describes the change, not the urgency of the defect, and it informs rather
  // than decides: an analysis that classifies the risk as critical and still reports
  // `readyForSolve` has weighed exactly that and said to go ahead. Vetoing it here left no way
  // through at all - and a critical defect is the one a team most wants to fix.
  'risk-policy-satisfied': (facts) => {
    if (facts.analysis === undefined) return failure('risk-policy-satisfied', noAnalysisStored);
    if (analysisProvesReadiness(facts.analysis)) return undefined;
    return facts.riskPolicySatisfied
      ? undefined
      : failure(
          'risk-policy-satisfied',
          'The analysis classifies the risk as critical and does not report the work item ready for implementation.',
        );
  },

  'pull-request-exists': (facts) =>
    facts.pullRequest !== undefined
      ? undefined
      : failure('pull-request-exists', 'No pull request is linked to this work item.'),

  'continuous-integration-passed': (facts) =>
    facts.pullRequest?.checksPassed === true
      ? undefined
      : failure('continuous-integration-passed', 'Required checks did not pass.'),

  'verification-passed': (facts) =>
    facts.verification?.passed === true
      ? undefined
      : failure('verification-passed', 'No passing verification report is stored.'),

  'verified-commit-current': (facts) => {
    const head = facts.pullRequest?.headCommitSha;
    const verified = facts.record.revisions.verifiedCommitSha;
    if (!head || !verified) {
      return failure('verified-commit-current', 'The verified commit is unknown.');
    }
    return head === verified
      ? undefined
      : failure('verified-commit-current', 'A newer commit invalidated the verification.');
  },

  'issue-revision-current': (facts) => {
    const analyzed = facts.record.revisions.issueRevision;
    const current = facts.workItem.revision;
    if (analyzed === undefined || current === undefined) return undefined;
    return analyzed === current
      ? undefined
      : failure('issue-revision-current', 'The work item changed after it was analyzed.');
  },

  'no-open-findings': (facts) =>
    (facts.verification?.findings.filter((finding) => finding.severity === 'blocker').length ??
      0) === 0
      ? undefined
      : failure('no-open-findings', 'The verification reported unresolved blocking findings.'),

  'authorized-human-acceptance': (facts) =>
    facts.decision !== undefined && facts.decision.effect === 'advance'
      ? undefined
      : failure(
          'authorized-human-acceptance',
          'No human acceptance is attached to this transition.',
        ),

  'accepted-commit-current': (facts) => {
    const accepted = facts.decision?.commitSha ?? facts.record.revisions.acceptedCommitSha;
    const head = facts.pullRequest?.headCommitSha;
    if (!accepted || !head)
      return failure('accepted-commit-current', 'The accepted commit is unknown.');
    return accepted === head
      ? undefined
      : failure('accepted-commit-current', 'The pull request advanced after the acceptance.');
  },

  'merge-successful': (facts) =>
    facts.pullRequest?.merged === true
      ? undefined
      : failure('merge-successful', 'The pull request is not merged.'),

  'target-branch-contains-commit': (facts) =>
    facts.pullRequest?.targetBranchContainsCommit === true
      ? undefined
      : failure(
          'target-branch-contains-commit',
          'The target branch does not contain the merge commit.',
        ),

  'post-merge-checks-passed': (facts) =>
    facts.postMergeChecksPassed !== false
      ? undefined
      : failure('post-merge-checks-passed', 'Post-merge checks failed.'),

  'audit-complete': (facts) =>
    facts.auditComplete
      ? undefined
      : failure('audit-complete', 'The audit trail for this work item is incomplete.'),
};
