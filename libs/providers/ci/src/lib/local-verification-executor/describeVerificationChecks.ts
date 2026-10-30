// #region Imports

import type { IVerificationStep, IVerificationStepResult } from '@symphony/domain-ci';
import { MAX_CHECK_DETAIL_CHARACTERS } from './MaxCheckDetailCharacters';
import { MAX_CHECK_OUTPUT_CHARACTERS } from './MaxCheckOutputCharacters';

// #endregion

/**
 * Projects executor results onto operator-facing checks. Execution stops at the first failed
 * step, so later steps have no result; they must stay visibly unverified without claiming a
 * failure that never ran. A step that did fail carries the tail of its output, because "yarn
 * dependencies failed" without the actual error leaves a blocked run undiagnosable.
 *
 * `detail` is the short tail a card can show. `output` is the much longer tail an agent needs to
 * repair the step, and no surface renders it - a build runner's summary footer fits in the short
 * tail, the failing assertion above it does not.
 */
export function describeVerificationChecks(
  steps: readonly IVerificationStep[],
  results: readonly IVerificationStepResult[],
): readonly {
  readonly label: string;
  readonly state: 'passed' | 'failed';
  readonly detail?: string;
  readonly output?: string;
}[] {
  return steps.map((step) => {
    const result = results.find((candidate) => candidate.stepId === step.id);
    if (!result) {
      return {
        label: step.label,
        state: 'failed' as const,
        detail: `${step.label} was not run because an earlier verification step failed.`,
      };
    }
    if (result.state === 'succeeded') return { label: step.label, state: 'passed' as const };
    if (result.state === 'cancelled') {
      return {
        label: step.label,
        state: 'failed' as const,
        detail: `${step.label} was cancelled.`,
      };
    }
    const tail = outputTail(result.output, MAX_CHECK_DETAIL_CHARACTERS);
    const output = outputTail(result.output, MAX_CHECK_OUTPUT_CHARACTERS);
    return {
      label: step.label,
      state: 'failed' as const,
      detail:
        result.exitCode === undefined
          ? `${step.label} could not run. ${tail}`.trim()
          : `${step.label} failed (exit ${result.exitCode}).${tail ? ` ${tail}` : ''}`,
      ...(output ? { output } : {}),
    };
  });
}

function outputTail(output: string, limit: number): string {
  const trimmed = output.trim();
  return trimmed.length > limit ? `… ${trimmed.slice(-limit)}` : trimmed;
}
