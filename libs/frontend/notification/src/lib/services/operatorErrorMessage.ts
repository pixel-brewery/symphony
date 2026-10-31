// #region Imports

import { contractViolationMessage } from '@symphony/ipc-contracts-core';
import type { core } from 'zod';

// #endregion

/** Provider command-line tools the orchestrator runs, by the prefix they put on their failures. */
const providerNames: Readonly<Record<string, string>> = {
  claude: 'Claude',
  codex: 'Codex',
  gh: 'GitHub',
  git: 'Git',
  opencode: 'OpenCode',
};

/**
 * Turns a failure into the detail line of a notification.
 *
 * Failures reach the renderer as the text the failing tool wrote, and a provider CLI writes in
 * its own transport vocabulary: `gh: Not Found (HTTP 404)` names neither the work item nor
 * anything a person can act on, yet it used to be the loudest line of the message. The
 * notification title already says which step failed, so the detail keeps the evidence but
 * attributes it to the provider instead of repeating a command name nobody invoked.
 */
export function operatorErrorMessage(cause: unknown): string {
  const message =
    cause instanceof Error ? cause.message.trim() : typeof cause === 'string' ? cause.trim() : '';
  if (!message) return '';
  const issues = validationIssues(message);
  if (issues) return contractViolationMessage(issues);
  const [, tool, detail] = /^([a-z]+):\s+([\s\S]+)$/u.exec(message) ?? [];
  const provider = tool ? providerNames[tool] : undefined;
  return provider && detail ? `${provider} answered: ${detail}` : message;
}

/**
 * Recognizes a validator rejection that reached the renderer as raw evidence.
 *
 * The boundaries that validate an exchange phrase their own rejections, so this is the last line
 * of defence: any validation that is not routed through one of them would otherwise put a JSON
 * issue array in front of the operator, which is the one failure shape nobody can act on.
 */
function validationIssues(message: string): readonly core.$ZodIssue[] | undefined {
  if (!message.startsWith('[')) return undefined;
  try {
    const parsed: unknown = JSON.parse(message);
    if (!Array.isArray(parsed) || !parsed.length) return undefined;
    return parsed.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { code?: unknown }).code === 'string' &&
        Array.isArray((entry as { path?: unknown }).path),
    )
      ? (parsed as readonly core.$ZodIssue[])
      : undefined;
  } catch {
    return undefined;
  }
}
