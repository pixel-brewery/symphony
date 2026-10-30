// #region Imports

import { isActiveExecution } from '../model/isActiveExecution';
import { isCompletedAnalysis } from '../model/isCompletedAnalysis';
import type { IWorkItem, ProjectFieldValue } from '@symphony/domain-work';
import {
  type ClosureReasonCode,
  findStage,
  stageExecutesRole,
  stageForRole,
} from '@symphony/domain-workflow';
import type { IWorkItemHealth } from '@symphony/domain-work';
import type { IWorkItemInspectionContext } from './IWorkItemInspectionContext';
import type { IWorkItemIssue } from '@symphony/domain-work';
import type { IWorkItemReadiness } from '@symphony/domain-workflow';

// #endregion

/**
 * Reports everything that stops the item from moving, plus the data a person still owes it.
 *
 * The function is deliberately total and side-effect free: the board renders it per card on
 * every snapshot, and the task drawer renders the same result in full, so both surfaces can
 * never disagree about what is wrong with an item.
 */
export function inspectWorkItem(
  item: IWorkItem,
  context: IWorkItemInspectionContext,
): IWorkItemHealth {
  const issues: IWorkItemIssue[] = [];
  const stage = findStage(context.stages, item.stageId);
  const column = context.boardColumnLabel ?? 'its board column';
  const implementsHere = stageExecutesRole(context.stages, item.stageId, 'solve');

  if (!item.stageId) {
    issues.push({
      id: 'stage-unmapped',
      severity: 'blocker',
      summary: 'Board column is not mapped to a workflow stage',
      detail: `Symphony does not know which workflow stage ${column} represents, so it cannot tell whether this item is waiting for a decision, an analysis or an implementation. Every action that depends on the stage stays disabled, including analysis, implementation and the human-gate decisions.`,
      remedy:
        'Open Settings, pick this workspace, switch to Connected services and edit the board under Boards. Assign a workflow stage to every column and save. The suggested mapping is filled in for you, but it is only stored once you save.',
    });
  }

  if (!item.repositoryBindingIds?.length) {
    // Only implementation needs the binding. Reporting a blocker while the item still waits
    // for a decision or an analysis would paint every early-stage card red for a problem that
    // is not in its way yet.
    issues.push({
      id: 'repository-unbound',
      severity: implementsHere ? 'blocker' : 'incomplete',
      summary: 'No repository is bound to this item',
      detail: `The item names "${item.repository || 'no repository'}", but that does not resolve to a repository configured in this workspace. An implementation run needs a bound repository to create its worktree and branch${implementsHere ? ', so it cannot start' : '; this item is not there yet, so nothing is blocked right now'}.`,
      remedy:
        'Add the repository under Settings, this workspace, Repositories, then reopen the item so the binding is picked up. If the repository is already configured, correct the repository name on the item so both spellings match.',
    });
  }

  // An implementation is always started from the stored analysis, and the analysis only ever
  // runs in the stage that owns it. An item resting in an implementing stage without a usable
  // one is therefore stuck in both directions: the implementation refuses to start, and the
  // analysis cannot be started from here. Nothing else notices, which is why it is reported
  // here. The supervisor record decides wherever it is loaded, because it holds the very
  // evidence the stage guards read; the run history is only a fallback for callers without it.
  const readiness = context.readiness;
  const history = context.executions?.filter((execution) => execution.workItemId === item.id);
  const running = readiness ? readiness.running : history?.some(isActiveExecution);
  // A recorded implementation means the analysis existed when it mattered; whether its run is
  // still on file is a housekeeping question, not a reason to stop the item now.
  const implemented = history?.some(
    (execution) =>
      (execution.kind === 'solution' || execution.kind === 'revision') &&
      execution.state === 'succeeded',
  );
  if (
    (readiness || history) &&
    !running &&
    !implemented &&
    implementsHere &&
    !stageExecutesRole(context.stages, item.stageId, 'analyze')
  ) {
    const analysisStage = findStage(context.stages, stageForRole(context.stages, 'analyze'));
    const stateField = context.fields.find((field) => field.role === 'workflow-state');
    const stageLabel = stage?.label ?? column;
    const returnRemedy = analysisStage
      ? `Move the item back to ${analysisStage.label}${stateField ? ` with the "${stateField.name}" field under Fields below` : ''}. The analysis runs there, and a passing analysis returns the item to ${stageLabel} on its own.`
      : `Give one automated stage the analysis role under Settings, Delivery process, then move the item into it. Without an analysis stage, ${stageLabel} can never be reached legitimately.`;

    if (readiness ? !readiness.analysisStored : !history?.some(isCompletedAnalysis)) {
      issues.push({
        id: 'analysis-missing-in-implementation-stage',
        severity: 'blocker',
        summary: `Waiting to be implemented in ${stageLabel} without a completed analysis`,
        detail: `${stageLabel} is where this item is implemented, and every implementation starts from the stored analysis — this item has none${history?.length ? ' that produced one' : ' on record'}. ${
          analysisStage
            ? `${stageLabel} does not run the analysis either, so it cannot be produced from here: ${analysisStage.label} is the stage that produces it.`
            : 'No stage in this workflow runs the analysis, so it cannot be produced at all.'
        } Automation skips the item in both directions, so it rests here for as long as nobody moves it.`,
        remedy: analysisStage
          ? `${returnRemedy} Record the analysis manually in ${analysisStage.label} instead if this item genuinely needs no run.`
          : returnRemedy,
      });
    }
    issues.push(...unmetReadiness(readiness, stageLabel, returnRemedy));
  }

  if (item.coordination?.expired) {
    issues.push({
      id: 'claim-expired',
      severity: 'blocker',
      summary: 'A lease from another Symphony instance expired here',
      detail:
        'Another instance claimed this item and never released it; its lease has since run out. The item is workable again, but whatever that instance started was never finished or reported back, so any result recorded on it may be incomplete.',
      remedy:
        'Check the analysis and implementation results below before continuing. If they look truncated, start the step again from here — taking the item over is safe now that the lease has elapsed.',
    });
  }

  const closingLabel = item.labels.find((label) => closingLabelReasons[label.toLowerCase()]);
  if (closingLabel && stage && stage.kind !== 'terminal') {
    const reason = closureReasonLabels[closingLabelReasons[closingLabel.toLowerCase()]!];
    issues.push({
      id: 'closing-label-in-active-stage',
      severity: 'blocker',
      summary: `Labelled "${closingLabel}" but still in ${stage.label}`,
      detail: `The label "${closingLabel}" declares this item ${reason}, while the board still keeps it in ${stage.label}, where work is expected to continue. Automation follows the stage and would happily pick this item up despite the label.`,
      remedy: `Decide which of the two is right: remove the "${closingLabel}" label if the item is still wanted, or close the item through the human gate so the board and the label agree.`,
    });
  }

  // Only fields Symphony itself acts on are reported here. An empty board field such as a
  // priority, a size or a target date is a planning gap owned by the people who run the board,
  // never something the workflow trips over, so it stays out of the card indicator and the
  // drawer banner entirely instead of dressing an optional value up as a finding.
  for (const field of context.fields) {
    if (field.role !== 'assistance-action' || field.type !== 'single-select') continue;
    if (hasContent(fieldValue(item, field.id))) continue;

    const neutral = field.options.find((option) => option.assistanceAction === 'none');
    issues.push({
      id: `field-missing:${field.id}`,
      severity: 'incomplete',
      summary: `"${field.name}" is not set`,
      detail: `"${field.name}" tells every Symphony instance which step this item is reserved for. It is empty, so the item carries no reservation. Nothing is blocked by this — an empty value is read as "no restriction" — but a shared board cannot show intent that was never recorded.`,
      remedy: neutral
        ? `Set "${field.name}" to "${neutral.label}" to record that no step is reserved, or pick the step you want this item held for.`
        : `Set "${field.name}" to the step this item should be reserved for.`,
      ...(neutral
        ? {
            repair: {
              fieldId: field.id,
              fieldName: field.name,
              valueLabel: neutral.label,
              value: { fieldId: field.id, type: 'single-select', value: neutral.id },
            },
          }
        : {}),
    });
  }

  const severity = issues.some((issue) => issue.severity === 'blocker')
    ? 'blocker'
    : issues.length
      ? 'incomplete'
      : undefined;

  return {
    ...(severity ? { severity } : {}),
    issues,
    repairs: issues.flatMap((issue) => (issue.repair ? [issue.repair] : [])),
  };
}

/**
 * What the readiness guards of the implementing stage would reject, in the terms they use.
 *
 * The supervisor evaluates exactly these conditions on every attempt to start the step, and it
 * refuses without ever changing how the card looks. Reporting them here is what lets a person
 * read the answer off the board instead of discovering it by pressing the action.
 */
function unmetReadiness(
  readiness: IWorkItemReadiness | undefined,
  stageLabel: string,
  returnRemedy: string,
): readonly IWorkItemIssue[] {
  if (!readiness?.analysisStored) return [];
  const issues: IWorkItemIssue[] = [];

  if (!readiness.readyForSolve) {
    const open = readiness.openDecisions;
    issues.push({
      id: 'analysis-not-ready-for-solve',
      severity: 'blocker',
      summary: open.length
        ? `Analysis left ${open.length} open decision${open.length === 1 ? '' : 's'} unanswered`
        : 'Analysis is not marked ready for implementation',
      detail: `The stored analysis does not declare this item ready to implement, so ${stageLabel} refuses to start the step.${
        open.length
          ? ` It is waiting on: ${open.map((question) => `"${question}"`).join(' ')}`
          : ' It records no open decision either, so the analysis stopped short of a verdict.'
      }`,
      remedy: `Answer the open decisions on the work item, then re-analyze so the answers reach the stored analysis. ${returnRemedy}`,
    });
  }

  if (readiness.riskClass === 'critical') {
    issues.push({
      id: 'risk-class-critical',
      // The analysis already reported the item ready for implementation, so this informs a
      // person rather than stopping them: the step starts, and whoever watches it knows why
      // it deserves a closer look.
      severity: 'incomplete',
      summary: 'Analysis classifies the risk of this change as critical',
      detail: `The analysis weighed the risk and still reported the item ready, so ${stageLabel} starts the step - but it named this change the riskiest class it has.`,
      remedy:
        'Watch this run rather than leaving it unattended, and review its pull request before accepting it. Re-analyze once the change is split small enough to lower the class if you would rather not run it as one step.',
    });
  }

  const hard = readiness.hardDependencyIds;
  if (hard.length) {
    issues.push({
      id: 'hard-dependency-open',
      // Symphony has no dependency-resolution source, so it cannot prove the named work landed.
      // The analysis reported the item ready in full knowledge of the dependency, so this is
      // reported as something to check rather than something that stops the step.
      severity: 'incomplete',
      summary: `Depends on ${hard.length} other work item${hard.length === 1 ? '' : 's'}`,
      detail: `The analysis declares work that has to land first and Symphony cannot prove it did: ${hard.join(', ')}. It still reported the item ready, so the step starts.`,
      remedy: `Confirm ${hard.join(', ')} really landed before accepting the result. Re-analyze if the dependency no longer applies, so it drops out of the stored analysis.`,
    });
  }

  return issues;
}

/**
 * Labels that assert the item will not be worked on, mapped onto the closure vocabulary the
 * workflow already speaks. A provider cannot express "closed" through a label, so an item
 * carrying one of these while resting in a stage that still runs work is contradictory: the
 * board says continue, the label says stop.
 */
const closingLabelReasons: Readonly<Record<string, ClosureReasonCode>> = {
  wontfix: 'not-planned',
  'wont-fix': 'not-planned',
  invalid: 'not-feasible',
  duplicate: 'duplicate',
  superseded: 'superseded',
  obsolete: 'superseded',
};

const closureReasonLabels: Readonly<Record<ClosureReasonCode, string>> = {
  completed: 'completed',
  'not-planned': 'not planned',
  duplicate: 'a duplicate',
  superseded: 'superseded',
  'not-feasible': 'not feasible',
  cancelled: 'cancelled',
};

function fieldValue(item: IWorkItem, fieldId: string): ProjectFieldValue | undefined {
  return item.projectFields?.find((value) => value.fieldId === fieldId);
}

/** Whether the stored value carries actual content rather than an empty provider placeholder. */
function hasContent(value: ProjectFieldValue | undefined): boolean {
  if (!value) return false;
  switch (value.type) {
    case 'text':
    case 'date':
      return value.value.trim().length > 0;
    case 'number':
      return value.value !== null;
    case 'single-select':
    case 'iteration':
      return Boolean(value.value);
    case 'multi-select':
      return value.value.length > 0;
  }
}
