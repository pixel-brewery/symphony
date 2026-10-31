// #region Imports

import type { IGoalRecord } from '@symphony/domain-execution';
import type { IWorkItemAcceptanceCriterion } from './IWorkItemAcceptanceCriterion';

// #endregion

/**
 * Resolves the acceptance criteria of a work item from its implementation plan.
 *
 * A criterion counts as met when the newest verification report passed a check of the same
 * wording, or when a person accepted the goal. Nothing else marks it met: a criterion the
 * verification never named stays open rather than appearing fulfilled.
 *
 * @param workItemId - The work item.
 * @param goal - Its goal, when one was delegated.
 * @returns The criteria in plan order; empty while no plan exists.
 * @public
 */
export function resolveAcceptanceCriteria(
  workItemId: string,
  goal: IGoalRecord | undefined,
): readonly IWorkItemAcceptanceCriterion[] {
  const contract = goal?.implementationContract;
  if (!contract) return [];
  const criteria =
    contract.acceptanceCriteriaByWorkItem?.[workItemId] ?? contract.acceptanceCriteria;
  const accepted = goal.state === 'achieved';
  const passed = new Set(
    (goal.verificationReports.at(-1)?.checks ?? [])
      .filter((check) => check.state === 'passed')
      .map((check) => check.label.trim().toLocaleLowerCase()),
  );
  return criteria.map((text) => ({
    text,
    met: accepted || passed.has(text.trim().toLocaleLowerCase()),
  }));
}
