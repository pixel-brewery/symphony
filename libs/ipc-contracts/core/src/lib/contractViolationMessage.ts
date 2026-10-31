// #region Imports

import type { core } from 'zod';

// #endregion

/** Beyond this the notification stops informing and starts scrolling. */
const reportedIssueLimit = 3;

/**
 * Turns a rejected contract into a sentence an operator can act on.
 *
 * A validation failure stringifies to its raw issue array, and that JSON used to travel unchanged
 * from the boundary that rejected it into the operator's notification: a wall of `code`, `origin`
 * and `inclusive` keys that names neither the step that failed nor anything a person could do
 * about it. The issues remain the evidence, but they are reported as the field that was rejected
 * and the reason it was rejected, in the vocabulary of the contract instead of the validator.
 *
 * @public
 * @param issues - Validation issues, in the order the validator produced them.
 * @param scope - What was validated, used as the subject of the sentence.
 */
export function contractViolationMessage(
  issues: readonly core.$ZodIssue[],
  scope = 'The data',
): string {
  const reported = issues.slice(0, reportedIssueLimit).map(describeIssue);
  if (!reported.length) return `${scope} does not match the IPC contract.`;
  const remaining = issues.length - reported.length;
  const overflow = remaining > 0 ? ` (and ${remaining} more)` : '';
  return `${scope} does not match the IPC contract: ${reported.join('; ')}${overflow}.`;
}

function describeIssue(issue: core.$ZodIssue): string {
  return `${fieldName(issue.path)} ${reason(issue)}`;
}

/** Renders the validator's path as the field notation the contract is written in. */
function fieldName(path: readonly PropertyKey[]): string {
  if (!path.length) return 'the payload';
  return path.reduce<string>((name, segment) => {
    if (typeof segment === 'number') return `${name}[${segment}]`;
    return name ? `${name}.${String(segment)}` : String(segment);
  }, '');
}

function reason(issue: core.$ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      // A field the contract requires and the payload never carried is a different problem from a
      // field of the wrong type, and only the validator's own text still tells the two apart.
      return / undefined$/u.test(issue.message)
        ? 'is missing'
        : `must be ${withArticle(issue.expected)}`;
    case 'too_small':
      if (issue.origin === 'array')
        return `needs at least ${issue.minimum} ${entryWord(issue.minimum)}`;
      if (issue.origin === 'string')
        return issue.minimum === 1
          ? 'must not be empty'
          : `must be at least ${issue.minimum} characters`;
      return `must be at least ${issue.minimum}`;
    case 'too_big':
      if (issue.origin === 'array')
        return `allows at most ${issue.maximum} ${entryWord(issue.maximum)}`;
      if (issue.origin === 'string') return `must be at most ${issue.maximum} characters`;
      return `must be at most ${issue.maximum}`;
    case 'invalid_value':
      return `must be one of ${issue.values.map((value) => String(value)).join(', ')}`;
    case 'unrecognized_keys':
      return `carries unknown fields: ${issue.keys.join(', ')}`;
    case 'invalid_format':
      return `is not a valid ${issue.format}`;
    default:
      // Anything the contracts do not use today still reaches the operator as evidence.
      return issue.message;
  }
}

/** Keeps the sentence readable: an operator reads "an object", never "object". */
function withArticle(typeName: string): string {
  return /^[aeiou]/iu.test(typeName) ? `an ${typeName}` : `a ${typeName}`;
}

function entryWord(count: number | bigint): string {
  return count === 1 || count === 1n ? 'entry' : 'entries';
}
